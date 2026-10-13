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
  summarizeSession,
  type SessionEvent,
  type SessionSummary,
} from './session-usage.js'
import { normalizeSessionId } from './session-meta.js'

/**
 * 一次最多折叠的会话数：按更新时间倒序取，避免首次请求扫全量历史。
 * 本机会话约 120 个 / 143 MB，取 200 覆盖全量；折叠结果按 revision 缓存，
 * 只有首次请求（或会话变化）才重新读取事件。
 */
const MAX_SESSIONS = 200

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

/** 待读取的会话：`revision`/`eventCount` 与 `list()` 快照一一对应，读完直接写进缓存。 */
interface PendingSession {
  id: string
  header: Record<string, unknown>
  revision: unknown
  eventCount: number
}

interface LiveSessionsService {
  list(): Array<{ id: string; events?: SessionEvent[]; title?: string; cwd?: string }>
}

interface HostContextLike {
  get(name: string): unknown
}

interface CacheEntry {
  revision: unknown
  eventCount: number
  record: SessionUsageRecord
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return null
}

function metadataOf(header: Record<string, unknown>): { title: string | null; workspace: string | null } {
  return {
    title: firstString(header.title, header.name, header.summary, header.label),
    workspace: firstString(header.cwd, header.workspace, header.workspacePath, header.projectPath, header.project),
  }
}

function sortKeyOf(header: Record<string, unknown>, fallback: number): number {
  const updatedAt = header.updatedAt
  if (typeof updatedAt === 'number') return updatedAt
  const createdAt = header.createdAt
  if (typeof createdAt === 'number') return createdAt
  return fallback
}

/**
 * 建立会话数据源。`host` 只需提供 cordis 风格的 `get(name)`；
 * `sessionPersistence` 缺失时返回 unavailable，调用方据此显示空态。
 */
export function createSessionSource(host: HostContextLike): { collect(): Promise<SessionCollection> } {
  const cache = new Map<string, CacheEntry>()
  let inFlight: Promise<SessionCollection> | null = null

  async function loadModern(persistence: PersistenceService): Promise<SessionCollection> {
    const snapshots = await persistence.list()
    const ordered = snapshots
      .map((snapshot, index) => ({ snapshot, order: sortKeyOf(snapshot.header, index) }))
      .sort((first, second) => second.order - first.order)
      .slice(0, MAX_SESSIONS)

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
    const readSession = async ({ id, header, revision, eventCount }: PendingSession): Promise<void> => {
      let handle: SessionHandle | undefined
      try {
        handle = await persistence.open?.(id, 'read')
        if (handle === undefined) { skipped += 1; return }
        const { events } = await handle.read(0)
        const inherited = typeof handle.inheritedEventCount === 'number' ? handle.inheritedEventCount : 0
        if (!Number.isSafeInteger(inherited) || inherited < 0 || inherited > events.length) {
          skipped += 1
          return
        }
        // 继承前缀只用于建立模型归属，不计入本次用量；无继承时直接用原数组，省一次整段拷贝
        const fold = inherited === 0
          ? foldSessionEvents(events)
          : foldSessionEvents([
            ...events.slice(0, inherited).filter((event) => event.type === 'request/header'),
            ...events.slice(inherited),
          ])
        const metadata = metadataOf(header)
        cache.set(id, {
          revision,
          eventCount,
          record: { id, title: metadata.title, workspace: metadata.workspace, summary: summarizeSession(fold) },
        })
      } catch {
        cache.delete(id)
        skipped += 1
      } finally {
        if (handle !== undefined) {
          try { await handle.close() } catch { skipped += 1 }
        }
      }
    }

    await forEachWithLimit(shared, READ_CONCURRENCY, readSession)
    await forEachWithLimit(alone, 1, readSession)

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
          const metadata = { title: firstString(session.title), workspace: firstString(session.cwd) }
          merged.set(session.id, { id: session.id, title: metadata.title, workspace: metadata.workspace, summary: summarizeSession(fold) })
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
          merged.set(id, { id, title: metadata.title, workspace: metadata.workspace, summary: summarizeSession(fold) })
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

  return { collect }
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

/** 会话记录 → 会话列表行（按最近活动倒序）。 */
export interface SessionRow {
  id: string
  title: string | null
  /** 是否已在宿主侧归档（归档只做逻辑标记，会话文件仍在，用量照常计入）。 */
  archived: boolean
  workspace: string | null
  provider: string | null
  firstTime: number | null
  lastTime: number | null
  calls: number
  tokens: number
  cacheHitRate: number | null
  days: number
  models: Array<{ provider: string; model: string; tokens: number; calls: number; buckets: Record<string, number> }>
}

/** 标题与归档的来源（缺省表示宿主没提供，界面自行回落）。 */
export interface SessionMetaOptions {
  titles?: Map<string, string>
  archived?: Set<string>
}

function attributedModels(
  models: SessionSummary['models'],
  knownProviders: string[],
): Array<{ provider: string; model: string; tokens: number; calls: number; buckets: Record<string, number> }> {
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
  return records
    .map((record) => ({
      id: record.id,
      // 标题优先级：宿主投影缓存的标题 → 会话头自带字段 → 首条用户提问 → 界面回落成短 id
      title: titles.get(normalizeSessionId(record.id)) ?? record.title ?? record.summary.firstPrompt ?? null,
      archived: archived.has(normalizeSessionId(record.id)),
      workspace: record.workspace,
      provider: record.summary.primaryModelKey === null ? null : attributeModelKey(record.summary.primaryModelKey, knownProviders).provider,
      firstTime: record.summary.firstTime,
      lastTime: record.summary.lastTime,
      calls: record.summary.calls,
      tokens: record.summary.tokens,
      cacheHitRate: record.summary.cacheHitRate,
      days: record.summary.days.length,
      models: attributedModels(record.summary.models, knownProviders),
    }))
    .sort((first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0))
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
