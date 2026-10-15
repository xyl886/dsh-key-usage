/**
 * 统一快照（`$DSH_HOME/dsh-key-usage/snapshot.json`）：6 个 tab 的**唯一数据来源**。
 *
 * 为什么要有它：此前每个 Tab 各自现算，同一条通道的数字会走不同路径（最典型的是「总览的窗口百分比」
 * 读宿主快照 + 60 秒内存缓存，「余额与配额」页读插件自己的快照）—— 两页显示不同值，且旧值没有时间标注。
 * 现在只物化一份：本地段（总览 / 使用明细 / 热力图 / 按模型 / 项目 / 会话）由 5 分钟定时器重算，
 * **配额段只在首次构建（还没有快照）与用户手动刷新时联网**，之后沿用上一次结果并带 `capturedAt`。
 *
 * 构建顺序（冻结）：本地段 → 配额（仅 initial / manual）→ **用新配额结果重建 channels 段** → 原子写盘。
 * 定时重建（scheduled）不碰配额，但会按当前配额结果刷新 channels 段。
 *
 * 范围口径：快照存**默认范围**（近 30 天 / 全部通道）；参数化端点保留，但走同一套聚合函数与同一份
 * 本地 mtime 缓存，不存在快照之外的独立数据源。
 *
 * 配额 TTL：`GET /snapshot`（页面打开）时若配额段已超过 10 分钟未更新，就**后台异步**补查一次
 * （不阻塞首屏、同一时刻只跑一个、失败静默），补完写盘并在下一次请求里体现；定时重建与其它端点都不碰配额。
 *
 * 读写约定：只有本文件是快照来源；构建失败**不覆盖**上一份好快照；写盘走写目标守卫 + tmp + rename。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

/** 快照文件名（`$DSH_HOME/dsh-key-usage/` 下，唯一的快照目标）。 */
export const SNAPSHOT_FILE = 'snapshot.json'
/** 本地段默认重算周期：5 分钟（只算本地数据，不联网）。 */
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000
/** 构建耗时超过这个值就记一条 issue（便于判断 5 分钟周期是否合适）。 */
export const SNAPSHOT_SLOW_BUILD_MS = 2000
/** `POST /refresh` 等待正在进行的构建的上限。 */
export const SNAPSHOT_REFRESH_WAIT_MS = 10000
/** 配额段的新鲜度：超过这个时间，页面打开时后台补查一次（不阻塞返回）。 */
export const SNAPSHOT_QUOTA_TTL_MS = 10 * 60 * 1000

export type SnapshotBuildSource = 'scheduled' | 'manual' | 'initial'

/** 一个通道的配额查询结果（供界面标「实时 / 本机快照 + 数据时间 + 本次失败原因」）。 */
export interface SnapshotQuotaProvider {
  provider: string
  /** 本次是否查到了实时值。 */
  ok: boolean
  /** 本次失败原因（ok=true 时为 null）。 */
  error: string | null
  /** 当前展示值是什么时候取到的（ISO）；没有值时为 null。 */
  capturedAt: string | null
  /** 展示的不是本次实时值（沿用旧快照）→ true。 */
  stale: boolean
}

export interface SnapshotQuotaOutcome {
  /** 上一次配额联网尝试的时间（ISO）；从未查过为 null。 */
  refreshedAt: string | null
  providers: SnapshotQuotaProvider[]
}

export interface SnapshotIssue {
  /** 机器可读分类：`build-failed` / `build-duration` / `quota-failed` / `write-failed` 等。 */
  kind: string
  message: string
}

export interface SnapshotSections {
  /** 总览表（形状 = `/summary` 响应）。 */
  overview: unknown
  /** 通道清单（形状 = `/channels` 响应；余额 / 窗口留在 `quota`）。 */
  channels: unknown
  /** 使用明细：默认范围（近 30 天 / 全部通道，形状 = `/usage` 响应）。 */
  usage: unknown
  heatmap: unknown
  models: unknown
  projects: unknown
  sessions: unknown
  quota: unknown
}

export interface SnapshotDocument {
  version: number
  updatedAt: string
  buildSource: SnapshotBuildSource
  sections: SnapshotSections
  quotaOutcome: SnapshotQuotaOutcome
  issues: SnapshotIssue[]
}

export interface SnapshotView extends SnapshotDocument {
  ok: true
  /** 此刻是否有一次重建在进行（真时，返回的是上一份**完整**内容，不是半成品）。 */
  building: boolean
}

/** 本地段构建结果（不含依赖配额的 channels，也不含 quota 本身）。 */
export interface SnapshotLocalBuild {
  sections: Omit<SnapshotSections, 'quota' | 'channels'>
  issues: SnapshotIssue[]
}

export interface SnapshotQuotaBuild {
  quota: unknown
  outcome: SnapshotQuotaOutcome
  issues: SnapshotIssue[]
}

export interface SnapshotChannelsBuild {
  channels: unknown
  issues: SnapshotIssue[]
}

export interface SnapshotBuilders {
  /** 只用本地数据（台账 / 会话），可拿到上一次的配额结果用于成本 / 状态判定。 */
  local(input: { quota: unknown; outcome: SnapshotQuotaOutcome }): Promise<SnapshotLocalBuild>
  /**
   * 联网查一次配额（余额与订阅窗口）。失败通道的第一回落源是**上一份快照的配额段**
   * （`previous`），其次才是旧版 `quota-snapshots.json`（仅首次构建）与宿主快照。
   */
  quota(input: { seedLegacy: boolean; previous: unknown }): Promise<SnapshotQuotaBuild>
  /** 用**最新**配额结果重建通道清单（定时重建也要跑这一步）。 */
  channels(input: { quota: unknown; outcome: SnapshotQuotaOutcome }): Promise<SnapshotChannelsBuild>
}

export interface SnapshotServiceOptions {
  builders: SnapshotBuilders
  path?: string
  /** 0 = 不开定时器（测试用）。 */
  intervalMs?: number
  /** `/refresh` 等待在跑构建的上限（测试可调小）。 */
  refreshWaitMs?: number
  /** 配额段新鲜度：页面打开时后台补查的阈值（测试可调）。 */
  quotaTtlMs?: number
  setIntervalImpl?: (handler: () => void, milliseconds: number) => unknown
  clearIntervalImpl?: (handle: unknown) => void
  now?: () => number
}

export interface SnapshotService {
  /**
   * 读快照：没有就现算一次（`initial`，含配额联网）并写盘；构建中返回上一份 + `building:true`。
   * `backgroundQuota: true`（只有 `GET /snapshot` 传）时，若配额段超过 TTL 就**后台**补查一次，不阻塞返回。
   */
  view(options?: { backgroundQuota?: boolean }): Promise<SnapshotView>
  /** 手动刷新：本地段 + 配额段全部重算，写盘并返回（同一时刻只允许一个构建）。 */
  refresh(): Promise<{ ok: true; view: SnapshotView } | { ok: false; error: string }>
  /** 只重查配额（`/quota?fresh=1` 用），本地段沿用现值。 */
  refreshQuota(): Promise<{ ok: true; view: SnapshotView } | { ok: false; error: string }>
  start(): void
  stop(): void
}

export function snapshotPath(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-key-usage', SNAPSHOT_FILE)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function emptyOutcome(): SnapshotQuotaOutcome {
  return { refreshedAt: null, providers: [] }
}

function emptySections(): SnapshotSections {
  return {
    overview: null, channels: null, usage: null, heatmap: null,
    models: null, projects: null, sessions: null, quota: null,
  }
}

/** 读快照文件：文件缺失（还没建过）返回 `document: null`，坏了额外给出 problem。 */
export function readSnapshotFile(path: string = snapshotPath()): { document: SnapshotDocument | null; problem: string | null } {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return { document: null, problem: null }
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { document: null, problem: '快照文件不是合法 JSON，已忽略：' + path }
  }
  if (!isObject(raw) || !isObject(raw.sections) || typeof raw.updatedAt !== 'string') {
    return { document: null, problem: '快照文件结构不符，已忽略：' + path }
  }
  const outcome = isObject(raw.quotaOutcome) ? raw.quotaOutcome as unknown as SnapshotQuotaOutcome : emptyOutcome()
  return {
    document: {
      version: typeof raw.version === 'number' ? raw.version : 1,
      updatedAt: raw.updatedAt,
      buildSource: raw.buildSource === 'manual' || raw.buildSource === 'scheduled' ? raw.buildSource : 'initial',
      sections: { ...emptySections(), ...(raw.sections as Partial<SnapshotSections>) },
      quotaOutcome: {
        refreshedAt: typeof outcome.refreshedAt === 'string' ? outcome.refreshedAt : null,
        providers: Array.isArray(outcome.providers) ? outcome.providers : [],
      },
      issues: Array.isArray(raw.issues) ? raw.issues as SnapshotIssue[] : [],
    },
    problem: null,
  }
}

/** 写目标守卫：文件名 + 绝对路径都要对得上（Windows 路径大小写不敏感）。 */
function writableTargetProblem(path: string): string | null {
  if (basename(path) !== SNAPSHOT_FILE) return '只允许写 ' + SNAPSHOT_FILE + '（当前目标：' + path + '）'
  if (resolve(path).toLowerCase() !== resolve(snapshotPath()).toLowerCase()) {
    return '只允许写 $DSH_HOME/dsh-key-usage/' + SNAPSHOT_FILE + '（当前目标：' + path + '）'
  }
  return null
}

/** 原子写：同目录临时文件 + rename；失败只返回原因，绝不抛错。 */
export function writeSnapshotFile(
  document: SnapshotDocument,
  path: string = snapshotPath(),
): { ok: true; path: string } | { ok: false; error: string } {
  const problem = writableTargetProblem(path)
  if (problem !== null) return { ok: false, error: problem }
  try {
    mkdirSync(dirname(path), { recursive: true })
    const temporaryPath = path + '.tmp'
    writeFileSync(temporaryPath, JSON.stringify(document, null, 2) + '\n', 'utf8')
    renameSync(temporaryPath, path)
  } catch (error) {
    return { ok: false, error: '写入快照失败：' + (error instanceof Error ? error.message : String(error)) }
  }
  return { ok: true, path }
}

export function createSnapshotService(options: SnapshotServiceOptions): SnapshotService {
  const path = options.path ?? snapshotPath()
  const now = options.now ?? (() => Date.now())
  const intervalMs = options.intervalMs ?? SNAPSHOT_INTERVAL_MS
  const refreshWaitMs = options.refreshWaitMs ?? SNAPSHOT_REFRESH_WAIT_MS
  const quotaTtlMs = options.quotaTtlMs ?? SNAPSHOT_QUOTA_TTL_MS
  const startTimer = options.setIntervalImpl ?? ((handler: () => void, milliseconds: number) => setInterval(handler, milliseconds))
  const stopTimer = options.clearIntervalImpl ?? ((handle: unknown) => { clearInterval(handle as ReturnType<typeof setInterval>) })

  /** 内存里的当前快照：进程内唯一事实（文件只是它的持久化）。 */
  let current: SnapshotDocument | null = null
  let timer: unknown = null
  /**
   * 是否有一次重建在跑。用**同步布尔**而不是「看 inFlight 是否为空」：`refresh()` 是 async 函数，
   * 靠 promise 判断会让两个并发调用都以为自己是第一个（check-then-act 之间隔着 await）。
   */
  let building = false
  /** 等这次构建结束的等待者（`/refresh` 的串行化语义）。 */
  let idleWaiters: Array<() => void> = []
  /** 后台配额补查是否在跑（同一时刻只允许一个）。 */
  let quotaRefreshInFlight = false

  const view = (building: boolean): SnapshotView => {
    const document = current ?? {
      version: 1,
      updatedAt: new Date(now()).toISOString(),
      buildSource: 'initial' as SnapshotBuildSource,
      sections: emptySections(),
      quotaOutcome: emptyOutcome(),
      issues: [],
    }
    return { ok: true, building, ...document }
  }

  const loadFromDisk = (): SnapshotDocument | null => {
    const { document } = readSnapshotFile(path)
    if (document !== null) current = document
    return document
  }

  /**
   * 一次重建。`mode`：`initial`（首次，含配额）/ `manual`（手动，含配额）/ `local`（定时，不碰配额）。
   * 任何一步失败都返回 `{ok:false}`，**磁盘上仍是上一份好快照**（不写半成品）。
   */
  const rebuild = async (mode: 'initial' | 'manual' | 'local'): Promise<{ ok: true; view: SnapshotView } | { ok: false; error: string }> => {
    const startedAt = now()
    const previous = current ?? loadFromDisk()
    const previousQuota = previous?.sections.quota ?? null
    const previousOutcome = previous?.quotaOutcome ?? emptyOutcome()
    const issues: SnapshotIssue[] = []
    let quotaSection: unknown = previous?.sections.quota ?? null
    let outcome = previousOutcome

    let local: SnapshotLocalBuild
    try {
      local = await options.builders.local({ quota: quotaSection, outcome })
    } catch (error) {
      return { ok: false, error: '重建本地数据失败：' + (error instanceof Error ? error.message : String(error)) }
    }

    if (mode !== 'local') {
      try {
        const built = await options.builders.quota({ seedLegacy: mode === 'initial', previous: previousQuota })
        quotaSection = built.quota
        outcome = built.outcome
        for (const issue of built.issues) issues.push(issue)
        const failed = built.outcome.providers.filter((entry) => !entry.ok).length
        if (failed > 0) {
          issues.push({ kind: 'quota-failed', message: '配额查询失败 ' + String(failed) + ' 个通道，已沿用本机快照并标注数据时间与原因' })
        }
      } catch (error) {
        // 配额失败不影响本地段：沿用上一份，并把每个通道标成 stale（界面照旧显示旧值 + 数据时间 + 原因）
        issues.push({ kind: 'quota-failed', message: '配额查询异常：' + (error instanceof Error ? error.message : String(error)) })
        outcome = {
          refreshedAt: new Date(now()).toISOString(),
          providers: previousOutcome.providers.map((entry) => ({ ...entry, ok: false, error: entry.error ?? 'query-failed', stale: true })),
        }
      }
    }
    for (const issue of local.issues) issues.push(issue)

    let channels: unknown = previous?.sections.channels ?? null
    try {
      const built = await options.builders.channels({ quota: quotaSection, outcome })
      channels = built.channels
      for (const issue of built.issues) issues.push(issue)
    } catch (error) {
      issues.push({ kind: 'channels-failed', message: '重建通道清单失败：' + (error instanceof Error ? error.message : String(error)) })
    }

    const durationMs = Math.round(now() - startedAt)
    issues.push({
      kind: 'build-duration',
      message: '本次构建用时 ' + String(durationMs) + ' ms（buildSource=' + mode + '）'
        + (durationMs >= SNAPSHOT_SLOW_BUILD_MS ? '，超过 ' + String(SNAPSHOT_SLOW_BUILD_MS) + ' ms 阈值' : ''),
    })
    const document: SnapshotDocument = {
      version: 1,
      updatedAt: new Date(now()).toISOString(),
      buildSource: mode === 'local' ? 'scheduled' : mode,
      sections: { ...local.sections, channels, quota: quotaSection },
      quotaOutcome: outcome,
      issues,
    }
    const written = writeSnapshotFile(document, path)
    if (!written.ok) issues.push({ kind: 'write-failed', message: written.error })
    current = document
    return { ok: true, view: view(false) }
  }

  /** 启动一次构建并同步置位 `building`；调用点必须在第一个 await 之前调用它。 */
  const beginBuild = (mode: 'initial' | 'manual' | 'local'): Promise<{ ok: true; view: SnapshotView } | { ok: false; error: string }> => {
    building = true
    return rebuild(mode).finally(() => {
      building = false
      const waiters = idleWaiters
      idleWaiters = []
      for (const waiter of waiters) waiter()
    })
  }

  /** 等正在跑的构建结束；超时返回 false（`/refresh` 的串行化语义）。 */
  const waitForIdle = async (): Promise<boolean> => {
    if (!building) return true
    return await new Promise<boolean>((settle) => {
      let done = false
      // 不 unref：等待期间要让定时器把事件循环撑住，否则构建没结束进程就先退了
      const timerHandle = setTimeout(() => {
        if (done) return
        done = true
        idleWaiters = idleWaiters.filter((waiter) => waiter !== notify)
        settle(false)
      }, refreshWaitMs)
      const notify = (): void => {
        if (done) return
        done = true
        clearTimeout(timerHandle)
        settle(true)
      }
      idleWaiters.push(notify)
    })
  }

  /**
   * 只重查配额：本地段沿用现值，用最新配额重建 channels 段，然后把整个快照原子写回。
   * `extraIssue` 用来记一条可读原因（后台补查用）。
   */
  const applyQuotaRefresh = async (extraIssue: SnapshotIssue | null): Promise<{ ok: true; view: SnapshotView } | { ok: false; error: string }> => {
    const local = current ?? loadFromDisk()
    let built: SnapshotQuotaBuild
    try {
      built = await options.builders.quota({ seedLegacy: false, previous: local?.sections.quota ?? null })
    } catch (error) {
      return { ok: false, error: '配额查询异常：' + (error instanceof Error ? error.message : String(error)) }
    }
    let channels: unknown = local?.sections.channels ?? null
    try {
      channels = (await options.builders.channels({ quota: built.quota, outcome: built.outcome })).channels
    } catch {
      // 通道清单重建失败不影响配额结果
    }
    const issues = extraIssue === null ? built.issues : [...built.issues, extraIssue]
    const document: SnapshotDocument = {
      version: 1,
      updatedAt: local?.updatedAt ?? new Date(now()).toISOString(),
      buildSource: local?.buildSource ?? 'initial',
      sections: { ...(local?.sections ?? emptySections()), channels, quota: built.quota },
      quotaOutcome: built.outcome,
      issues,
    }
    const written = writeSnapshotFile(document, path)
    if (!written.ok) return { ok: false, error: written.error }
    current = document
    return { ok: true, view: view(false) }
  }

  /**
   * 页面打开时的配额补查：配额段超过 TTL 才做，**后台异步**（不阻塞返回、同一时刻只跑一个、失败静默）。
   * 只有 `GET /snapshot` 会走到这里；定时重建与其它端点都不碰配额。
   */
  const maybeRefreshQuotaInBackground = (): void => {
    if (building || quotaRefreshInFlight) return
    const refreshedAt = (current ?? loadFromDisk())?.quotaOutcome.refreshedAt ?? null
    const stamp = refreshedAt === null ? Number.NaN : Date.parse(refreshedAt)
    if (Number.isFinite(stamp) && now() - stamp < quotaTtlMs) return
    quotaRefreshInFlight = true
    void applyQuotaRefresh({ kind: 'quota-refresh', message: '页面打开时配额超过 ' + String(Math.round(quotaTtlMs / 60000)) + ' 分钟，已后台补查一次' })
      .then((result) => {
        if (result.ok) return
        // 补查失败静默：只把原因留在上一份快照的 issues 里，不抛错、不影响请求
        if (current !== null) {
          current.issues.push({ kind: 'quota-refresh', message: '页面打开时的后台配额补查失败：' + result.error })
        }
      })
      .catch(() => { /* 后台补查绝不影响任何请求 */ })
      .finally(() => { quotaRefreshInFlight = false })
  }

  return {
    async view(options?: { backgroundQuota?: boolean }): Promise<SnapshotView> {
      // 首次没有快照：现算一次（含配额联网）→ 写盘 → 返回，这一次算 initial。
      // 这一段的判断到 beginBuild 之间没有 await，两个并发调用不会都去构建。
      if (current === null && !building) {
        if (loadFromDisk() !== null) {
          if (options?.backgroundQuota === true) maybeRefreshQuotaInBackground()
          return view(false)
        }
        const result = await beginBuild('initial')
        if (result.ok) return result.view
        current = {
          version: 1,
          updatedAt: new Date(now()).toISOString(),
          buildSource: 'initial',
          sections: emptySections(),
          quotaOutcome: emptyOutcome(),
          issues: [{ kind: 'build-failed', message: result.error }],
        }
        return view(false)
      }
      if (building) {
        await waitForIdle()
        return view(building)
      }
      if (options?.backgroundQuota === true) maybeRefreshQuotaInBackground()
      return view(false)
    },
    async refresh() {
      if (building) {
        const idle = await waitForIdle()
        if (!idle) return { ok: false, error: '正在重建数据，请稍后重试' }
      }
      if (building) return { ok: false, error: '正在重建数据，请稍后重试' }
      return await beginBuild('manual')
    },
    async refreshQuota() {
      if (building) {
        const idle = await waitForIdle()
        if (!idle) return { ok: false, error: '正在重建数据，请稍后重试' }
        return { ok: true, view: view(false) }
      }
      return await applyQuotaRefresh(null)
    },
    start() {
      if (intervalMs <= 0 || timer !== null) return
      // 回调返回 Promise：setInterval 会忽略它，测试里可以 await 这次 tick 跑完
      const handle = startTimer(() => (building ? Promise.resolve() : beginBuild('local')), intervalMs)
      // 定时器不该拖住宿主进程退出
      const unrefable = handle as { unref?: () => void }
      if (typeof unrefable?.unref === 'function') unrefable.unref()
      timer = handle
    },
    stop() {
      if (timer === null) return
      stopTimer(timer)
      timer = null
    },
  }
}
