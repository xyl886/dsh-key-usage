/**
 * 会话数据源：把宿主 `sessionPersistence` 服务包装成「按需折叠 + 按 revision 缓存」的
 * 只读数据源，供项目用量、会话用量与单日按小时视图使用。
 *
 * 只走官方 read handle（open("read") → read(0) → close），不自行解压、不改写历史日志。
 * 服务缺失或读取失败时降级为空结果 + coverage 说明，绝不影响台账相关的其它端点。
 */
import {
  attributeModelKey,
  foldSessionEvents,
  promptSnippetOf,
  summarizeSession,
  PROMPT_SNIPPET_CHARS,
  PROMPT_TITLE_CHARS,
  type SessionEvent,
  type SessionSummary,
  type TokenBuckets,
} from './session-usage.js'
import { normalizeSessionId } from './session-meta.js'

/**
 * 折叠结果按 `(id, revision, eventCount)` 缓存：只有首次请求（或会话变化）才重新读取事件。
 * **不再对会话数设上限**（2026-10-16 用户明确）：以前取最近 200 个，超出部分会静默退出
 * 会话 / 项目 / 模型统计，出现「数字凭空变小」；现在有多少折多少，宿主 `list()` 返回多少就处理多少。
 */

/**
 * 同时在读的会话数：宿主的 `open(id,"read")` 与随后的 `read(0)` 共用一条容量 2 的解析
 * memo（后端注释写明「只装处于两步之间的会话」），2 路正好把两次「找路径 + 读文件」的
 * 等待叠起来；3 路会把先到的会话挤出 memo、逼它整段重解压。
 * 本机实测（133 会话 / 119 MB）：串行 7.4~7.9 s，2 路 6.0~6.4 s，3 路反而 7.8~8.2 s。
 */
const READ_CONCURRENCY = 2

/** 超过这个体积的会话改为串行：它们的耗时主要在主线程解压，叠不出等待，却会放大 memo 被第三方挤掉时的重解压代价。 */
const SERIAL_SESSION_BYTES = 1024 * 1024

export interface SessionUsageRecord {
  id: string
  title: string | null
  workspace: string | null
  /** 子代理会话指向的父会话 id（宿主 header 的 `parentSession`）；普通会话为 null。 */
  parentSessionId: string | null
  /** 会话来源（宿主 header 的 `origin`，子代理会话为 `subagent`）；老会话可能没有。 */
  origin: string | null
  summary: SessionSummary
}

export interface SessionCoverage {
  status: 'complete' | 'partial' | 'unavailable'
  totalSessions: number
  countedSessions: number
  skippedSessions: number
}

export interface SessionCollection {
  records: SessionUsageRecord[]
  coverage: SessionCoverage
}

interface SessionHandle {
  read(offset: number): Promise<{ events: SessionEvent[] }>
  close(): Promise<void> | void
  inheritedEventCount?: number
}

interface PersistenceService {
  identity?: unknown
  list(): Promise<Array<{ header: Record<string, unknown>; revision?: unknown; eventCount?: number; sizeBytes?: unknown }>>
  open?(id: string, access: string): Promise<SessionHandle>
  readFrom?(id: string, fromSeq: number): Promise<{ events: SessionEvent[] }>
}

interface PendingSession {
  id: string
  header: Record<string, unknown>
  revision: unknown
  eventCount: number
}

interface LiveSessionsService {
  list(): Array<{
    id: string
    events?: SessionEvent[]
    title?: string
    cwd?: string
    parentSession?: string
    parentSessionId?: string
    origin?: string
  }>
}

interface HostContextLike {
  get(name: string): unknown
}

interface CacheEntry {
  revision: unknown
  eventCount: number
  record: SessionUsageRecord
}

type ReadOutcome = { record: SessionUsageRecord; closeFailed: boolean } | { failure: string }

/**
 * 单会话查询结果。
 * - `ok`：折叠成功；`degraded`：会话存在但读不出来（只有头部字段）；
 * - `not-found`：宿主会话列表里没有这个 id；`unavailable`：宿主没提供会话服务。
 */
export interface SessionLookup {
  status: 'ok' | 'degraded' | 'not-found' | 'unavailable'
  id: string
  title: string | null
  workspace: string | null
  /** 降级 / 找不到的中文说明，直接展示给用户；正常时为 null。 */
  reason: string | null
  record: SessionUsageRecord | null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return null
}

function metadataOf(header: Record<string, unknown>): {
  title: string | null
  workspace: string | null
  parentSessionId: string | null
  origin: string | null
} {
  return {
    title: firstString(header.title, header.name, header.summary, header.label),
    workspace: firstString(header.cwd, header.workspace, header.workspacePath, header.projectPath, header.project),
    // 子代理会话在 header 里带父会话 id 与来源（宿主的 listFields 也按这两个名字下发）
    parentSessionId: firstString(header.parentSession, header.parentSessionId),
    // origin 缺失时用父会话推断：带了 parentSession 的会话一定是子代理起的孩子
    origin: firstString(header.origin) ?? (firstString(header.parentSession, header.parentSessionId) === null ? null : 'subagent'),
  }
}

function sortKeyOf(header: Record<string, unknown>, fallback: number): number {
  const updatedAt = header.updatedAt
  if (typeof updatedAt === 'number') return updatedAt
  const createdAt = header.createdAt
  if (typeof createdAt === 'number') return createdAt
  return fallback
}

/** 一次整表折叠的耗时明细：`listMs` = 宿主列表耗时，`readMs` = 解压折叠耗时，`cached` = 命中缓存的会话数。 */
export interface SessionReadStats {
  sessions: number
  cached: number
  read: number
  listMs: number
  readMs: number
  totalMs: number
}

/**
 * 建立会话数据源（`host.get('sessionPersistence')` 缺失时降级为空态 + coverage 说明）。
 */
export function createSessionSource(host: HostContextLike): {
  collect(): Promise<SessionCollection>
  detail(id: string): Promise<SessionLookup>
  /** 上一次整表折叠的耗时明细（写进快照的构建日志，用来判断慢在哪一步）。 */
  stats(): SessionReadStats
} {
  const cache = new Map<string, CacheEntry>()
  let inFlight: Promise<SessionCollection> | null = null
  let lastStats: SessionReadStats = { sessions: 0, cached: 0, read: 0, listMs: 0, readMs: 0, totalMs: 0 }

  /** 读一个会话并折叠；成功即写缓存，失败返回原因（不抛错），由调用方决定降级口径。 */
  async function readRecord(persistence: PersistenceService, pending: PendingSession): Promise<ReadOutcome> {
    let handle: SessionHandle | undefined
    // 关闭失败也要计入 skipped，而 finally 里改不了已经 return 的值，所以结果先放在盒子里
    const box: { value: ReadOutcome } = { value: { failure: '未读取' } }
    try {
      handle = await persistence.open?.(pending.id, 'read')
      if (handle === undefined) return { failure: '宿主未提供 open("read") 读取接口' }
      const { events } = await handle.read(0)
      const inherited = typeof handle.inheritedEventCount === 'number' ? handle.inheritedEventCount : 0
      if (!Number.isSafeInteger(inherited) || inherited < 0 || inherited > events.length) {
        return { failure: '宿主返回的继承事件数不合法' }
      }
      // 继承前缀只用于建立模型归属，不计入本次用量；无继承时直接用原数组，省一次整段拷贝
      const fold = inherited === 0
        ? foldSessionEvents(events)
        : foldSessionEvents([
          ...events.slice(0, inherited).filter((event) => event.type === 'request/header'),
          ...events.slice(inherited),
        ])
      const metadata = metadataOf(pending.header)
      const record: SessionUsageRecord = {
        id: pending.id,
        title: metadata.title,
        workspace: metadata.workspace,
        parentSessionId: metadata.parentSessionId,
        origin: metadata.origin,
        summary: summarizeSession(fold),
      }
      cache.set(pending.id, { revision: pending.revision, eventCount: pending.eventCount, record })
      box.value = { record, closeFailed: false }
    } catch (error) {
      cache.delete(pending.id)
      box.value = { failure: error instanceof Error ? error.message : String(error) }
    } finally {
      if (handle !== undefined) {
        try { await handle.close() } catch {
          if (!('failure' in box.value)) box.value = { ...box.value, closeFailed: true }
        }
      }
    }
    return box.value
  }

  async function loadModern(persistence: PersistenceService): Promise<SessionCollection> {
    const listStarted = performance.now()
    const snapshots = await persistence.list()
    const listMs = performance.now() - listStarted
    const ordered = snapshots
      .map((snapshot, index) => ({ snapshot, order: sortKeyOf(snapshot.header, index) }))
      .sort((first, second) => second.order - first.order)

    const present = new Set<string>()
    // 小会话两路并发、大会话串行：两条队列都不改变最终 records 的顺序（顺序由 ordered 决定）
    const shared: PendingSession[] = []
    const alone: PendingSession[] = []
    for (const { snapshot } of ordered) {
      const id = firstString(snapshot.header.id)
      if (id === null) continue
      present.add(id)
      const revision = snapshot.revision
      const eventCount = typeof snapshot.eventCount === 'number' ? snapshot.eventCount : -1
      const cached = cache.get(id)
      if (cached !== undefined && cached.revision === revision && cached.eventCount === eventCount) continue
      const size = typeof snapshot.sizeBytes === 'number' ? snapshot.sizeBytes : Number.POSITIVE_INFINITY
      const pending = { id, header: snapshot.header, revision, eventCount }
      if (size <= SERIAL_SESSION_BYTES) shared.push(pending)
      else alone.push(pending)
    }

    let skipped = 0
    const readStarted = performance.now()
    const readSession = async (pending: PendingSession): Promise<void> => {
      const outcome = await readRecord(persistence, pending)
      if ('failure' in outcome || outcome.closeFailed) skipped += 1
    }

    await forEachWithLimit(shared, READ_CONCURRENCY, readSession)
    await forEachWithLimit(alone, 1, readSession)
    lastStats = {
      sessions: ordered.length,
      cached: ordered.length - shared.length - alone.length,
      read: shared.length + alone.length,
      listMs: Math.round(listMs),
      readMs: Math.round(performance.now() - readStarted),
      totalMs: Math.round(performance.now() - listStarted),
    }

    for (const id of [...cache.keys()]) if (!present.has(id)) cache.delete(id)
    const records = ordered
      .map(({ snapshot }) => firstString(snapshot.header.id))
      .filter((id): id is string => id !== null)
      .map((id) => cache.get(id)?.record)
      .filter((record): record is SessionUsageRecord => record !== undefined)
    return { records, coverage: coverageOf(ordered.length, records.length, skipped) }
  }

  async function loadLegacy(persistence: PersistenceService, live: LiveSessionsService | null): Promise<SessionCollection> {
    const merged = new Map<string, SessionUsageRecord>()
    let total = 0
    let skipped = 0
    if (live !== null) {
      for (const session of live.list()) {
        total += 1
        try {
          const fold = foldSessionEvents(session.events ?? [])
          const metadata = {
            title: firstString(session.title),
            workspace: firstString(session.cwd),
            parentSessionId: firstString(session.parentSession, session.parentSessionId),
            origin: firstString(session.origin),
          }
          merged.set(session.id, {
            id: session.id,
            title: metadata.title,
            workspace: metadata.workspace,
            parentSessionId: metadata.parentSessionId,
            origin: metadata.origin,
            summary: summarizeSession(fold),
          })
        } catch {
          skipped += 1
        }
      }
    }
    if (typeof persistence.list === 'function' && typeof persistence.readFrom === 'function') {
      for (const snapshot of await persistence.list()) {
        const id = firstString(snapshot.header.id)
        if (id === null || merged.has(id)) continue
        total += 1
        try {
          const { events } = await persistence.readFrom(id, 0)
          const fold = foldSessionEvents(events)
          const metadata = metadataOf(snapshot.header)
          merged.set(id, {
            id,
            title: metadata.title,
            workspace: metadata.workspace,
            parentSessionId: metadata.parentSessionId,
            origin: metadata.origin,
            summary: summarizeSession(fold),
          })
        } catch {
          skipped += 1
        }
      }
    }
    const records = [...merged.values()]
    return { records, coverage: coverageOf(total, records.length, skipped) }
  }

  async function collect(): Promise<SessionCollection> {
    if (inFlight !== null) return inFlight
    inFlight = (async () => {
      try {
        const persistence = host.get('sessionPersistence') as PersistenceService | undefined
        const live = (host.get('sessions') as LiveSessionsService | undefined) ?? null
        if (persistence === undefined || typeof persistence.list !== 'function') {
          return { records: [], coverage: { status: 'unavailable', totalSessions: 0, countedSessions: 0, skippedSessions: 0 } }
        }
        if (typeof persistence.open === 'function') return await loadModern(persistence)
        return await loadLegacy(persistence, live)
      } catch {
        return { records: [], coverage: { status: 'unavailable', totalSessions: 0, countedSessions: 0, skippedSessions: 0 } }
      } finally {
        inFlight = null
      }
    })()
    return inFlight
  }

  /** 缓存里按原 id / 归一 id 找一个会话（标题与归档集合都用归一 id 比对）。 */
  function cachedEntryOf(id: string): CacheEntry | undefined {
    const direct = cache.get(id)
    if (direct !== undefined) return direct
    const normalized = normalizeSessionId(id)
    for (const entry of cache.values()) {
      if (normalizeSessionId(entry.record.id) === normalized) return entry
    }
    return undefined
  }

  /** 单会话详情：缓存命中零 I/O，未命中才 list + open/read/close（不重折全部会话）。 */
  async function detail(rawId: string): Promise<SessionLookup> {
    const id = rawId.trim()
    const persistence = host.get('sessionPersistence') as PersistenceService | undefined
    if (persistence === undefined || typeof persistence.list !== 'function') {
      return { status: 'unavailable', id, title: null, workspace: null, reason: '宿主未提供会话服务，无法读取该会话', record: null }
    }
    try {
      // 整表折叠正在进行时先等它结束：宿主的解析 memo 只装 2 个会话，抢着 open 会把它挤掉
      if (inFlight !== null) await inFlight
      const cached = cachedEntryOf(id)
      if (cached !== undefined) {
        return { status: 'ok', id: cached.record.id, title: cached.record.title, workspace: cached.record.workspace, reason: null, record: cached.record }
      }
      const snapshot = (await persistence.list()).find((entry) => {
        const headerId = firstString(entry.header.id)
        return headerId !== null && (headerId === id || normalizeSessionId(headerId) === normalizeSessionId(id))
      })
      if (snapshot === undefined) {
        return { status: 'not-found', id, title: null, workspace: null, reason: '宿主会话列表里没有这个 id（可能已被删除）', record: null }
      }
      const sessionId = firstString(snapshot.header.id) ?? id
      const metadata = metadataOf(snapshot.header)
      if (typeof persistence.open !== 'function') {
        if (typeof persistence.readFrom !== 'function') {
          return { status: 'unavailable', id: sessionId, title: metadata.title, workspace: metadata.workspace, reason: '当前宿主只支持旧版会话接口，无法读取单个会话', record: null }
        }
        try {
          const { events } = await persistence.readFrom(sessionId, 0)
          const record: SessionUsageRecord = {
            id: sessionId,
            title: metadata.title,
            workspace: metadata.workspace,
            parentSessionId: metadata.parentSessionId,
            origin: metadata.origin,
            summary: summarizeSession(foldSessionEvents(events)),
          }
          return { status: 'ok', id: sessionId, title: record.title, workspace: record.workspace, reason: null, record }
        } catch (error) {
          return { status: 'degraded', id: sessionId, title: metadata.title, workspace: metadata.workspace, reason: readFailureText(error), record: null }
        }
      }
      const outcome = await readRecord(persistence, {
        id: sessionId,
        header: snapshot.header,
        revision: snapshot.revision,
        eventCount: typeof snapshot.eventCount === 'number' ? snapshot.eventCount : -1,
      })
      if ('failure' in outcome) {
        return { status: 'degraded', id: sessionId, title: metadata.title, workspace: metadata.workspace, reason: readFailureText(outcome.failure), record: null }
      }
      return { status: 'ok', id: sessionId, title: outcome.record.title, workspace: outcome.record.workspace, reason: null, record: outcome.record }
    } catch (error) {
      return { status: 'unavailable', id, title: null, workspace: null, reason: readFailureText(error), record: null }
    }
  }

  return { collect, detail, stats: () => lastStats }
}

function readFailureText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return '会话读取失败（' + message + '），只列出能拿到的会话头字段'
}

/**
 * 有界并发跑任务：worker 数即并发上限，按游标顺序取活，不预先建满 promise 列表。
 * worker 自己吞掉异常（读取失败只影响该会话），所以这里不会提前中断其它会话。
 */
async function forEachWithLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      await worker(items[index])
    }
  })
  await Promise.all(runners)
}

function coverageOf(totalSessions: number, countedSessions: number, skippedSessions: number): SessionCoverage {
  if (countedSessions === 0 && totalSessions > 0) {
    return { status: 'unavailable', totalSessions, countedSessions, skippedSessions }
  }
  return {
    status: skippedSessions > 0 ? 'partial' : 'complete',
    totalSessions,
    countedSessions,
    skippedSessions,
  }
}

/** 会话里的模型行：归属键已归一到通道 + 模型，分桶只用于计费与逐模型展示。 */
export interface AttributedModel {
  provider: string
  model: string
  tokens: number
  calls: number
  buckets: Record<string, number>
}

/** 会话记录 → 会话列表行（按最近活动倒序）。 */
export interface SessionRow {
  id: string
  title: string | null
  /** 是否已在宿主侧归档（归档只做逻辑标记，会话文件仍在，用量照常计入）。 */
  archived: boolean
  workspace: string | null
  provider: string | null
  /** 该会话出现过的模型个数（列表只展示前几个，计数要看这个）。 */
  modelCount: number
  /** 子代理会话指向的父会话 id；普通会话为 null。 */
  parentSessionId: string | null
  /** 会话来源；`subagent` = 子代理会话。 */
  origin: string | null
  /** 挂在这个会话下的子代理会话数（0 = 没有）。 */
  subagentCount: number
  /** 这些子会话的展示口径 tokens 小计；只用于父行标注，**不并入**父会话的 tokens / 成本（避免重复计入）。 */
  subagentTokens: number
  firstTime: number | null
  lastTime: number | null
  calls: number
  tokens: number
  cacheHitRate: number | null
  days: number
  /** 首次与最近不在同一天时跨过的天数（0 = 同一天或时间缺失），行内标「跨 N 天」。 */
  crossDays: number
  /** 首条真实提问的片段（标题兜底之外，搜索也用它；正文全文只在详情里给）。 */
  prompt: string | null
  models: AttributedModel[]
}

/** 标题与归档的来源（缺省表示宿主没提供，界面自行回落）。 */
export interface SessionMetaOptions {
  titles?: Map<string, string>
  archived?: Set<string>
  /**
   * 会话投影里的事实：标题与「是不是子代理」。
   * 为什么需要它：宿主把「父会话链接」也写在被 seed 续接的会话上，只看 header 会把续接会话误判成子代理，
   * 侧边栏却把它当独立会话显示 —— 投影里 `subagent.identity` 存在才算真子代理。
   */
  facts?: Map<string, { title: string | null; subagent: boolean | null }>
}

function attributedModels(
  models: SessionSummary['models'],
  knownProviders: string[],
): AttributedModel[] {
  return models.map((model) => {
    const attribution = attributeModelKey(model.key, knownProviders)
    return {
      provider: attribution.provider,
      model: attribution.model,
      tokens: model.tokens,
      calls: model.calls,
      buckets: { ...model.buckets },
    }
  })
}

export function sessionRowsOf(
  records: SessionUsageRecord[],
  knownProviders: string[],
  meta: SessionMetaOptions = {},
): SessionRow[] {
  const titles = meta.titles ?? new Map<string, string>()
  const archived = meta.archived ?? new Set<string>()
  const facts = meta.facts ?? new Map<string, { title: string | null; subagent: boolean | null }>()
  /** 子代理判定：投影说不是就一定不是（seed 续接的会话在侧边栏里是独立会话）；投影读不到才退回 header 猜测。 */
  const originOf = (record: SessionUsageRecord): string | null => {
    const flag = facts.get(normalizeSessionId(record.id))?.subagent
    if (flag === true) return 'subagent'
    if (flag === false) return null
    return record.origin ?? null
  }
  // 子代理会话数：父会话行标「子会话 N」，子会话行自己标「子代理」；缺字段的老记录按「无父会话」处理
  const subagentCounts = new Map<string, number>()
  const subagentTokens = new Map<string, number>()
  for (const record of records) {
    const parent = originOf(record) === 'subagent' ? (record.parentSessionId ?? null) : null
    if (parent === null || parent === '') continue
    subagentCounts.set(parent, (subagentCounts.get(parent) ?? 0) + 1)
    subagentTokens.set(parent, (subagentTokens.get(parent) ?? 0) + record.summary.tokens)
  }
  return records
    .map((record) => {
      const key = normalizeSessionId(record.id)
      const origin = originOf(record)
      return {
        id: record.id,
        // 标题优先级：会话投影（侧边栏显示名）→ 宿主投影缓存的聚合文件 → 会话头自带字段 → 首条真实提问（截断）
        // 「取文本」那一步（session-usage.ts）已跳过系统注入消息，这里不再过滤。
        title: facts.get(key)?.title ?? titles.get(key) ?? record.title ?? promptSnippetOf(record.summary.firstPrompt, PROMPT_TITLE_CHARS) ?? null,
        archived: archived.has(key),
        workspace: record.workspace,
        provider: record.summary.primaryModelKey === null ? null : attributeModelKey(record.summary.primaryModelKey, knownProviders).provider,
        modelCount: record.summary.models.length,
        // 主会话不带父链接：否则界面会把 seed 续接的会话也归到「某个会话的子会话」里
        parentSessionId: origin === 'subagent' ? (record.parentSessionId ?? null) : null,
        origin,
        subagentCount: subagentCounts.get(record.id) ?? 0,
        subagentTokens: subagentTokens.get(record.id) ?? 0,
      firstTime: record.summary.firstTime,
      lastTime: record.summary.lastTime,
      calls: record.summary.calls,
      tokens: record.summary.tokens,
      cacheHitRate: record.summary.cacheHitRate,
      days: record.summary.days.length,
      crossDays: crossDaysOf(record.summary.firstTime, record.summary.lastTime),
      prompt: promptSnippetOf(record.summary.firstPrompt, PROMPT_SNIPPET_CHARS),
      models: attributedModels(record.summary.models, knownProviders),
      }
    })
    .sort((first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0))
}

/**
 * 首次与最近跨越的天数（0 = 同一天或时间缺失）：按**本地日历日**相减，
 * 因此夏令时切换那天也不会算成 0.96 天。行内「跨 N 天」用它。
 */
export function crossDaysOf(firstTime: number | null, lastTime: number | null): number {
  if (firstTime === null || lastTime === null) return 0
  const first = new Date(firstTime)
  const last = new Date(lastTime)
  const firstMidnight = new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime()
  const lastMidnight = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime()
  const difference = Math.round((lastMidnight - firstMidnight) / 86400000)
  return difference > 0 ? difference : 0
}

/** 单会话详情：成本与通道标签依赖价目，由 routes 侧补齐。 */
export interface SessionDetail {
  id: string
  title: string | null
  archived: boolean
  workspace: string | null
  provider: string | null
  firstTime: number | null
  lastTime: number | null
  durationMs: number
  crossDays: number
  days: number
  calls: number
  tokens: number
  buckets: TokenBuckets
  cacheHitRate: number | null
  /** 首条真实提问全文（超长已在上游截断），没有则 null。 */
  prompt: string | null
  models: Array<AttributedModel & { sharePercent: number }>
  /** 24 个小时槽（跨天会话按小时累加，是「一天里的哪个时段」的分布）；没有样本时为 null。 */
  hours: Array<{ calls: number; tokens: number }> | null
}

/** 取不到用量时的空详情：标题 / 工作区 / 归档仍照常给出，抽屉只多一条降级说明。 */
export function emptySessionDetail(
  id: string,
  title: string | null,
  workspace: string | null,
  archived: boolean,
): SessionDetail {
  return {
    id,
    title,
    archived,
    workspace,
    provider: null,
    firstTime: null,
    lastTime: null,
    durationMs: 0,
    crossDays: 0,
    days: 0,
    calls: 0,
    tokens: 0,
    buckets: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    cacheHitRate: null,
    prompt: null,
    models: [],
    hours: null,
  }
}

export function sessionDetailOf(
  record: SessionUsageRecord,
  knownProviders: string[],
  meta: SessionMetaOptions = {},
): SessionDetail {
  const summary = record.summary
  const total = summary.tokens
  const models = attributedModels(summary.models, knownProviders).map((model) => ({
    ...model,
    sharePercent: total > 0 ? Math.round(model.tokens / total * 1000) / 10 : 0,
  }))
  const hours = Array.from({ length: 24 }, () => ({ calls: 0, tokens: 0 }))
  let hourCalls = 0
  for (const day of summary.days) {
    for (let hour = 0; hour < 24; hour += 1) {
      const slot = day.hours[hour]
      if (slot === undefined) continue
      hours[hour].calls += slot.calls
      hours[hour].tokens += slot.buckets.inputTokens + slot.buckets.outputTokens + slot.buckets.cacheReadTokens
      hourCalls += slot.calls
    }
  }
  return {
    id: record.id,
    // 标题优先级与列表一致，避免抽屉里的标题和刚点的那行不一样
    title: (meta.titles ?? new Map<string, string>()).get(normalizeSessionId(record.id))
      ?? record.title
      ?? promptSnippetOf(summary.firstPrompt, PROMPT_TITLE_CHARS)
      ?? null,
    archived: (meta.archived ?? new Set<string>()).has(normalizeSessionId(record.id)),
    workspace: record.workspace,
    provider: summary.primaryModelKey === null ? null : attributeModelKey(summary.primaryModelKey, knownProviders).provider,
    firstTime: summary.firstTime,
    lastTime: summary.lastTime,
    durationMs: summary.firstTime === null || summary.lastTime === null ? 0 : Math.max(0, summary.lastTime - summary.firstTime),
    crossDays: crossDaysOf(summary.firstTime, summary.lastTime),
    days: summary.days.length,
    calls: summary.calls,
    tokens: total,
    buckets: summary.buckets,
    cacheHitRate: summary.cacheHitRate,
    prompt: summary.firstPrompt,
    models,
    hours: hourCalls > 0 ? hours : null,
  }
}

/** 模型维度聚合行（`provider + model`），供「按模型」视图使用。 */
export interface ModelAggregateRow {
  provider: string
  model: string
  calls: number
  /** 展示口径 tokens：输入 + 输出 + 缓存读（与总览 / 使用明细一致，不含 cacheWrite）。 */
  tokens: number
  cacheHitRate: number | null
  sessionCount: number
  lastTime: number | null
  buckets: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    /** 只参与计费，不计入展示口径 tokens。 */
    cacheWriteTokens: number
  }
}

export function modelRowsOf(records: SessionUsageRecord[], knownProviders: string[]): ModelAggregateRow[] {
  interface Accumulator {
    provider: string
    model: string
    calls: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    sessionCount: number
    lastTime: number | null
  }
  const byModel = new Map<string, Accumulator>()
  for (const record of records) {
    const sessionLastTime = record.summary.lastTime
    for (const model of attributedModels(record.summary.models, knownProviders)) {
      const key = model.provider + '|' + model.model
      let accumulator = byModel.get(key)
      if (accumulator === undefined) {
        accumulator = {
          provider: model.provider, model: model.model, calls: 0,
          inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, sessionCount: 0, lastTime: null,
        }
        byModel.set(key, accumulator)
      }
      accumulator.calls += model.calls
      accumulator.inputTokens += model.buckets.inputTokens
      accumulator.outputTokens += model.buckets.outputTokens
      accumulator.cacheReadTokens += model.buckets.cacheReadTokens
      accumulator.cacheWriteTokens += model.buckets.cacheWriteTokens
      accumulator.sessionCount += 1
      // 会话事件只有会话级时间戳，「最近活跃」只能取用到该模型的最晚会话时间，是近似值
      if (sessionLastTime !== null && (accumulator.lastTime === null || sessionLastTime > accumulator.lastTime)) {
        accumulator.lastTime = sessionLastTime
      }
    }
  }
  return [...byModel.values()]
    .map((accumulator) => {
      const displayTokens = accumulator.inputTokens + accumulator.outputTokens + accumulator.cacheReadTokens
      return {
        provider: accumulator.provider,
        model: accumulator.model,
        calls: accumulator.calls,
        tokens: displayTokens,
        cacheHitRate: displayTokens > 0 ? Math.round(accumulator.cacheReadTokens / displayTokens * 1000) / 10 : null,
        sessionCount: accumulator.sessionCount,
        lastTime: accumulator.lastTime,
        buckets: {
          inputTokens: accumulator.inputTokens,
          outputTokens: accumulator.outputTokens,
          cacheReadTokens: accumulator.cacheReadTokens,
          cacheWriteTokens: accumulator.cacheWriteTokens,
        },
      }
    })
    .sort((first, second) => second.tokens - first.tokens)
}

/** 会话记录 → 项目（工作目录）聚合行（按最近活动倒序）。 */
export interface ProjectRow {
  workspace: string
  calls: number
  tokens: number
  cacheHitRate: number | null
  sessionCount: number
  /** 其中已归档的会话数（归档仍计入统计，仅用于标注）。 */
  archivedSessionCount: number
  lastTime: number | null
  providers: Record<string, number>
  models: Array<{ key: string; provider: string; model: string; tokens: number; calls: number; buckets: Record<string, number> }>
}

export function projectRowsOf(
  records: SessionUsageRecord[],
  knownProviders: string[],
  meta: SessionMetaOptions = {},
): ProjectRow[] {
  const archived = meta.archived ?? new Set<string>()
  interface Accumulator {
    workspace: string
    calls: number
    tokens: number
    cacheReadTokens: number
    inputTokens: number
    outputTokens: number
    cacheWriteTokens: number
    sessionCount: number
    archivedSessionCount: number
    lastTime: number | null
    providers: Map<string, number>
    models: Map<string, { key: string; provider: string; model: string; tokens: number; calls: number; buckets: Record<string, number> }>
  }
  const byWorkspace = new Map<string, Accumulator>()
  for (const record of records) {
    const workspace = record.workspace ?? '未归属工作区'
    let accumulator = byWorkspace.get(workspace)
    if (accumulator === undefined) {
      accumulator = {
        workspace, calls: 0, tokens: 0, cacheReadTokens: 0, inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0,
        sessionCount: 0, archivedSessionCount: 0, lastTime: null, providers: new Map(), models: new Map(),
      }
      byWorkspace.set(workspace, accumulator)
    }
    accumulator.calls += record.summary.calls
    accumulator.tokens += record.summary.tokens
    accumulator.inputTokens += record.summary.buckets.inputTokens
    accumulator.outputTokens += record.summary.buckets.outputTokens
    accumulator.cacheReadTokens += record.summary.buckets.cacheReadTokens
    accumulator.cacheWriteTokens += record.summary.buckets.cacheWriteTokens
    accumulator.sessionCount += 1
    if (archived.has(normalizeSessionId(record.id))) accumulator.archivedSessionCount += 1
    const lastTime = record.summary.lastTime
    if (lastTime !== null && (accumulator.lastTime === null || lastTime > accumulator.lastTime)) accumulator.lastTime = lastTime
    if (record.summary.primaryModelKey !== null) {
      const provider = attributeModelKey(record.summary.primaryModelKey, knownProviders).provider
      accumulator.providers.set(provider, (accumulator.providers.get(provider) ?? 0) + record.summary.tokens)
    }
    for (const model of attributedModels(record.summary.models, knownProviders)) {
      const modelKey = model.provider + '|' + model.model
      let row = accumulator.models.get(modelKey)
      if (row === undefined) {
        row = { key: modelKey, provider: model.provider, model: model.model, tokens: 0, calls: 0, buckets: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 } }
        accumulator.models.set(modelKey, row)
      }
      row.tokens += model.tokens
      row.calls += model.calls
      row.buckets.inputTokens += model.buckets.inputTokens
      row.buckets.outputTokens += model.buckets.outputTokens
      row.buckets.cacheReadTokens += model.buckets.cacheReadTokens
      row.buckets.cacheWriteTokens += model.buckets.cacheWriteTokens
    }
  }
  return [...byWorkspace.values()]
    .map((accumulator) => {
      const displayTokens = accumulator.inputTokens + accumulator.outputTokens + accumulator.cacheReadTokens
      return {
        workspace: accumulator.workspace,
        calls: accumulator.calls,
        tokens: accumulator.tokens,
        cacheHitRate: displayTokens > 0 ? Math.round(accumulator.cacheReadTokens / displayTokens * 1000) / 10 : null,
        sessionCount: accumulator.sessionCount,
        archivedSessionCount: accumulator.archivedSessionCount,
        lastTime: accumulator.lastTime,
        providers: Object.fromEntries(accumulator.providers),
        models: [...accumulator.models.values()].sort((first, second) => second.tokens - first.tokens),
      }
    })
    .sort((first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0))
}

/** 指定日期的 24 小时分桶（跨会话汇总），供「使用明细」单日按小时视图使用。 */
export function hoursOfDate(records: SessionUsageRecord[], date: string): Array<{ calls: number; buckets: Record<string, number> }> {
  const hours = Array.from({ length: 24 }, () => ({ calls: 0, buckets: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 } }))
  for (const record of records) {
    for (const day of record.summary.days) {
      if (day.date !== date) continue
      for (let hour = 0; hour < 24; hour += 1) {
        const source = day.hours[hour]
        if (source === undefined) continue
        hours[hour].calls += source.calls
        hours[hour].buckets.inputTokens += source.buckets.inputTokens
        hours[hour].buckets.outputTokens += source.buckets.outputTokens
        hours[hour].buckets.cacheReadTokens += source.buckets.cacheReadTokens
        hours[hour].buckets.cacheWriteTokens += source.buckets.cacheWriteTokens
      }
    }
  }
  return hours
}
