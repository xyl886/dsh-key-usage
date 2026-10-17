/**
 * HTTP 路由：14 个只读 `GET` + 3 个写 `POST`（快照刷新、价目刷新、系统日志）；非本机回环一律 403。
 * 成本逐格取值：台账官方账单 > 通道内价目（内置价目 / 聚合价按通道别名）> 同模型官方价目 > 无依据（另有 `costSource` / `partial`
 * / `costsByCurrency` 三个并列字段）；台账缺的日期由会话事件补位（见 merge.ts）。
 * 外网只有三处、都由用户动作触发：余额查询（live-quota.ts）、价目刷新（model-prices.ts）、汇率（fx-rate.ts）。
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  aggregateRange,
  readLedger,
  type ChannelDailySummary,
  type ModelSummary,
  type UsageLedger,
} from './data/ledger.js'
import {
  classifyChannels,
  costModeLabel,
  extractChannels,
  quotaWindowLabel,
  readProviderSnapshots,
  type ChannelInfo,
  type ProviderSnapshot,
} from './data/collect.js'
import { schemeIdOf, type LiveQuota, type LiveQuotaService, type LiveWindow } from './quota/live-quota.js'
import {
  emptySessionDetail,
  hoursOfDate,
  modelRowsOf,
  projectRowsOf,
  sessionDetailOf,
  sessionRowsOf,
  type AttributedModel,
  type SessionCollection,
  type SessionLookup,
  type SessionMetaOptions,
  type SessionRow,
} from './data/sessions.js'
import { createArchiveSource, createSessionProjectionSource, createTitleSource, createWorkspaceSource, normalizeSessionId } from './data/session-meta.js'
import { appendLogRecords, clearLogFile, logFilePath, readLogRecords } from './data/log-file.js'
import { readQuotaSnapshots } from './quota/quota-snapshots.js'
import {
  mergeDailySeries,
  sessionDayRows,
  summarizeMergedByProvider,
  totalsOfMerged,
} from './data/merge.js'
import {
  alignMoneyWithCost,
  costsByCurrencyOf,
  displayTokensOf,
  matchPricedRule,
  priceRowsOf,
  ratesAt,
  rowCostsOf,
  summarizeCoverage,
  sumMoneyByCurrency,
  weakestOf,
  UNIT_LABELS,
  type CostSource,
  type MoneyByCurrency,
  type PricedRuleHit,
  type PricingUsageRow,
  type RowCost,
} from './pricing/pricing.js'
import {
  catalogCurrency,
  catalogEntryCount,
  catalogFileInfo,
  catalogIssues,
  catalogProviderCurrency,
  catalogRuleList,
  catalogSources,
} from './pricing/pricing-catalog.js'
import { aggregateStatus, refreshModelPrices } from './pricing/model-prices.js'
import { resolveFxRate } from './quota/fx-rate.js'
import {
  SNAPSHOT_FILE,
  createSnapshotService,
  type SnapshotQuotaBuild,
  type SnapshotQuotaOutcome,
  type SnapshotSections,
  type SnapshotView,
} from './snapshot/snapshot.js'

/** 挂载选项：定时器周期（0 = 关闭，测试用）。 */
export interface KeyUsageMountOptions {
  snapshotIntervalMs?: number
}

interface WebServer {
  register(route: { kind: string; path: string; handler: (request: IncomingMessage, response: ServerResponse) => Promise<void> | void }): void
}

/** 会话数据源（由 index.ts 注入，服务缺失时仍返回空结果）。 */
export interface SessionSource {
  collect(): Promise<SessionCollection>
  /** 单会话详情；旧的外部注入方可能没有这个能力，缺失时 `/session` 按「找不到」处理。 */
  detail?(id: string): Promise<SessionLookup>
  /** 上一次整表折叠的耗时明细（可选：外部注入方可能没有）。 */
  stats?(): { sessions: number; cached: number; read: number; listMs: number; readMs: number; totalMs: number }
}

/** 无会话服务时的兜底数据源，保证台账相关端点照常工作。 */
export const unavailableSessionSource: SessionSource = {
  collect: async () => ({
    records: [],
    coverage: { status: 'unavailable', totalSessions: 0, countedSessions: 0, skippedSessions: 0 },
  }),
  detail: async (id) => ({
    status: 'unavailable',
    id,
    title: null,
    workspace: null,
    reason: '宿主未提供会话服务，无法读取该会话',
    record: null,
  }),
}

/** 关闭实时查询时的空实现（离线测试与降级用）。 */
export const disabledLiveQuota: LiveQuotaService = {
  cached: () => new Map<string, LiveQuota>(),
  refreshIfStale: async () => new Map<string, LiveQuota>(),
}

const EMPTY_LEDGER: UsageLedger = { version: 0, days: {} }

type AnnotatedModelSummary = ModelSummary & {
  costSource: CostSource
  partial: boolean
  costsByCurrency: MoneyByCurrency
}
type AnnotatedDaySummary = ChannelDailySummary & {
  costSource: CostSource
  partial: boolean
  costsByCurrency: MoneyByCurrency
  models: AnnotatedModelSummary[]
}

/** 快照配额段里的一行（`/quota` 响应体的 providers[]）。 */
interface QuotaProviderRow {
  provider: string
  displayName: string | null
  credential: string | null
  supported: boolean
  source: 'live' | 'snapshot'
  /** 旧值来自插件自己的快照还是宿主那份（仅用于如实标注）。 */
  snapshotOrigin: 'own' | 'host' | null
  fetchedAt: number | null
  updatedAt: number | null
  error: string | null
  balance: Record<string, unknown> | null
  plan: { windows: LiveWindow[] } | null
}

/** 一天里最弱的那一格决定整天的角标：宁可标弱，也不把估算冒充成官方价。 */
export function weakestSource(sources: CostSource[]): CostSource {
  if (sources.length === 0) return 'none'
  return sources.reduce(weakestOf, sources[0])
}

export function pricingRowOf(model: { provider: string; model: string; tokens: number; calls: number; buckets: Record<string, number> }): PricingUsageRow {
  return {
    provider: model.provider,
    model: model.model,
    calls: model.calls,
    tokens: model.tokens,
    inputTokens: model.buckets.inputTokens ?? 0,
    outputTokens: model.buckets.outputTokens ?? 0,
    cacheReadTokens: model.buckets.cacheReadTokens ?? 0,
    cacheWriteTokens: model.buckets.cacheWriteTokens ?? 0,
  }
}

/** 台账模型行 → 计费行：分桶在顶层字段上，不是 `buckets`。 */
export function dayModelPricingRow(model: ModelSummary): PricingUsageRow {
  return {
    provider: model.provider,
    model: model.model,
    calls: model.calls,
    tokens: model.inputTokens + model.outputTokens + model.cacheReadTokens,
    inputTokens: model.inputTokens,
    outputTokens: model.outputTokens,
    cacheReadTokens: model.cacheReadTokens,
    cacheWriteTokens: model.cacheWriteTokens ?? 0,
  }
}

export function hoursAsPricingRows(hours: Array<{ calls: number; buckets: Record<string, number> }> | null): PricingUsageRow[] | null {
  if (hours === null) return null
  return hours.map((slot) => ({
    provider: '',
    model: '',
    calls: slot.calls,
    inputTokens: slot.buckets.inputTokens ?? 0,
    outputTokens: slot.buckets.outputTokens ?? 0,
    cacheReadTokens: slot.buckets.cacheReadTokens ?? 0,
    cacheWriteTokens: slot.buckets.cacheWriteTokens ?? 0,
  }))
}

/** 逐行求和；全为 null（无依据）时返回 null，界面显示 —。 */
export function sumOrNull(costs: Array<{ cost: number | null }>): number | null {
  let total = 0
  let matched = false
  for (const entry of costs) {
    if (entry.cost === null) continue
    total += entry.cost
    matched = true
  }
  return matched ? Math.round(total * 100) / 100 : null
}

/**
 * 会话列表行里的模型构成：只保留前若干个（已按 tokens 降序），其余合并成一行「其它」。
 * 长尾模型一个个列出来只会把响应撑大 —— 逐模型成本仍然按**全量**算，合并行只影响展示。
 */
export const SESSION_MODEL_ROWS = 5

export function cappedModelRows(
  row: SessionRow,
  costs: RowCost[],
): Array<AttributedModel & { sharePercent: number; cost: number | null; costSource: CostSource; partial: boolean; costsByCurrency: MoneyByCurrency }> {
  const total = row.tokens
  const all = row.models.map((model, index) => {
    const cost = costs[index]?.cost ?? null
    const currency = costs[index]?.currency ?? null
    return {
      ...model,
      sharePercent: total > 0 ? Math.round(model.tokens / total * 1000) / 10 : 0,
      cost,
      costSource: costs[index]?.source ?? ('none' as CostSource),
      partial: costs[index]?.partial === true,
      costsByCurrency: costsByCurrencyOf([{ cost, currency }]),
    }
  })
  if (all.length <= SESSION_MODEL_ROWS) return all
  const head = all.slice(0, SESSION_MODEL_ROWS)
  const rest = all.slice(SESSION_MODEL_ROWS)
  const restCost = sumOrNull(rest)
  head.push({
    provider: '',
    model: '',
    tokens: rest.reduce((sum, model) => sum + model.tokens, 0),
    calls: rest.reduce((sum, model) => sum + model.calls, 0),
    sharePercent: Math.round(rest.reduce((sum, model) => sum + model.sharePercent, 0) * 10) / 10,
    buckets: {},
    cost: restCost,
    costSource: weakestSource(rest.map((model) => model.costSource)),
    partial: rest.some((model) => model.partial),
    costsByCurrency: alignMoneyWithCost(sumMoneyByCurrency(rest.map((model) => model.costsByCurrency)), restCost),
  })
  return head
}

/** 某个通道在指定范围内的成本来源：取该通道所有模型行里最弱的那一格。 */
export function sourceOfProvider(days: AnnotatedDaySummary[], provider: string, from: string, to: string): CostSource {
  const sources: CostSource[] = []
  for (const day of days) {
    if (day.date < from || day.date > to) continue
    for (const model of day.models) if (model.provider === provider) sources.push(model.costSource)
  }
  return sources.length === 0 ? 'none' : weakestSource(sources)
}

/** 某个通道在指定范围内是否有「部分收录」的聚合价目（缺一档缓存价、按未命中价代）。 */
export function partialOfProvider(days: AnnotatedDaySummary[], provider: string, from: string, to: string): boolean {
  for (const day of days) {
    if (day.date < from || day.date > to) continue
    for (const model of day.models) {
      if (model.provider === provider && model.partial) return true
    }
  }
  return false
}

/** 某个通道在指定范围内的按币种小计（取自该通道各模型行的拆分，不跨币种合计）。 */
export function moneyOfProvider(days: AnnotatedDaySummary[], provider: string, from: string, to: string): MoneyByCurrency {
  const parts: MoneyByCurrency[] = []
  for (const day of days) {
    if (day.date < from || day.date > to) continue
    for (const model of day.models) {
      if (model.provider === provider) parts.push(model.costsByCurrency)
    }
  }
  return sumMoneyByCurrency(parts)
}

/**
 * 空金额格子补一个零：`cost` 已知为 0、拆分里却一个币种都没有（该通道近 30 天没有用量）时，
 * 按台账币种记 0，保证「有金额就有币种」的形状一致。
 */
function moneyOrZero(money: MoneyByCurrency, cost: number | null, currency: string): MoneyByCurrency {
  if (cost !== 0 || Object.keys(money).length > 0) return money
  return { [currency]: 0 }
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' })
  response.end(payload)
}

function isLoopback(request: IncomingMessage): boolean {
  const remoteAddress = request.socket.remoteAddress ?? ''
  return remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1'
}

/** dsh 家目录：与宿主一致地优先 DSH_HOME。 */
export function dshHomePath(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

function dayKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function shiftedDayKey(offsetDays: number): string {
  return dayKeyOf(new Date(Date.now() + offsetDays * 86400000))
}

function channelPayload(channel: ChannelInfo): Record<string, unknown> {
  return {
    ...channel,
    costLabel: costModeLabel(channel.costMode),
    quotaWindowLabel: channel.quotaWindowKey === null ? null : quotaWindowLabel(channel.quotaWindowKey),
  }
}

/** `/rates` 默认与上限：days 与合并序列同为 400，limit 上限 50。 */
export const RATES_DEFAULT_DAYS = 30
export const RATES_MAX_DAYS = 400
export const RATES_DEFAULT_LIMIT = 20
export const RATES_MAX_LIMIT = 50

/** 单价表里一个模型在范围内的累计用量。 */
interface RateUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/**
 * 单价表的 `note`：命中价目就用价目自己的口径说明（附带非「每百万 tokens」的单位提示）；
 * 两层价目都没命中时给一句可读说明（不允许空 note）。
 */
function ratesNoteOf(hit: PricedRuleHit | null): string {
  if (hit !== null) {
    const unitHint = hit.rule.unit === 'perMillionTokens' ? '' : '（计价单位：' + UNIT_LABELS[hit.rule.unit] + '）'
    return hit.rule.note + unitHint
  }
  return '暂无价格依据'
}

function minKey(first: string | undefined, second: string | undefined): string | undefined {
  if (first === undefined) return second
  if (second === undefined) return first
  return first < second ? first : second
}

function maxKey(first: string | undefined, second: string | undefined): string | undefined {
  if (first === undefined) return second
  if (second === undefined) return first
  return first > second ? first : second
}

function parseLimit(raw: string | null, fallback: number): number {
  if (raw === null) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, 1000)
}

export function parseDays(raw: string | null): number {
  if (raw === null) return RATES_DEFAULT_DAYS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return RATES_DEFAULT_DAYS
  return Math.min(parsed, RATES_MAX_DAYS)
}

export function parseRatesLimit(raw: string | null): number {
  if (raw === null) return RATES_DEFAULT_LIMIT
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return RATES_DEFAULT_LIMIT
  return Math.min(parsed, RATES_MAX_LIMIT)
}

/** `/snapshot` 可以按需下发的段（= `sections` 的键）；顶层其余字段一律原样保留。 */
export const SNAPSHOT_SECTION_NAMES = ['overview', 'channels', 'usage', 'heatmap', 'models', 'projects', 'sessions', 'quota'] as const

/**
 * `?sections=a,b,c` → 要下发的段名集合；trim + 小写比对，未知名字忽略。
 * 不传、或裁剪后一个合法段都不剩时返回 null（= 全量下发）：客户端拼错段名不该拿到空壳响应，也不该报错。
 */
export function parseSections(raw: string | null): Set<string> | null {
  if (raw === null) return null
  const names = new Set<string>()
  for (const piece of raw.split(',')) {
    const name = piece.trim().toLowerCase()
    if ((SNAPSHOT_SECTION_NAMES as readonly string[]).includes(name)) names.add(name)
  }
  return names.size === 0 ? null : names
}

/** 只裁剪下发的 `sections`；`building` / `buildSource` / `quotaRefreshing` / `updatedAt` / `version` / `issues` / `quotaOutcome` 全部保留。 */
export function trimSnapshotSections(view: SnapshotView, names: Set<string> | null): SnapshotView {
  if (names === null) return view
  const source = view.sections as unknown as Record<string, unknown>
  const sections: Record<string, unknown> = {}
  for (const name of SNAPSHOT_SECTION_NAMES) {
    if (names.has(name)) sections[name] = source[name]
  }
  return { ...view, sections: sections as unknown as SnapshotSections }
}

function requireLoopback(request: IncomingMessage, response: ServerResponse): boolean {
  if (isLoopback(request)) return true
  sendJson(response, 403, { error: 'loopback only' })
  return false
}

function readTextFile(path: string): string | null {
  try { return readFileSync(path, 'utf8') } catch { return null }
}

/** 「未归入工作区」那一行需要的字段（其余字段沿用被合并行的首行）。 */
interface CollapsibleProjectRow {
  workspace: string
  workspaceTitle: string | null
  paths: string[]
  registered: boolean
  calls: number
  tokens: number
  sessionCount: number
  archivedSessionCount: number
  lastTime: number | null
  providers: Record<string, number>
  models: Array<{ provider: string; model: string; tokens: number; calls: number }>
  cost: number | null
  costsByCurrency: Record<string, number>
  costSource: string
  partial?: boolean
  dominantProvider: string | null
}

/**
 * 项目页与侧边栏对齐：只有宿主工作区各占一行。
 *
 * 历史会话里会出现「曾经用过、但已不在工作区表里」的目录（旧项目、子目录），它们各占一行会让项目数与
 * 侧边栏对不上；这里把它们合并成一行（`workspace` 置空、`paths` 保留全部目录），用量与归档数照旧累加。
 */
export function collapseOrphanProjects<Row extends CollapsibleProjectRow>(rows: Row[]): Row[] {
  const orphans = rows.filter((row) => !row.registered)
  if (orphans.length === 0) return rows
  const providers: Record<string, number> = {}
  for (const row of orphans) {
    for (const [provider, tokens] of Object.entries(row.providers)) providers[provider] = (providers[provider] ?? 0) + tokens
  }
  const costs = orphans.map((row) => row.cost)
  const cost = costs.some((value) => value === null) ? null : costs.reduce<number>((sum, value) => sum + (value ?? 0), 0)
  const merged = {
    ...orphans[0],
    workspace: '',
    workspaceTitle: null,
    paths: orphans.flatMap((row) => row.paths),
    registered: false,
    calls: orphans.reduce((sum, row) => sum + row.calls, 0),
    tokens: orphans.reduce((sum, row) => sum + row.tokens, 0),
    sessionCount: orphans.reduce((sum, row) => sum + row.sessionCount, 0),
    archivedSessionCount: orphans.reduce((sum, row) => sum + row.archivedSessionCount, 0),
    lastTime: orphans.reduce<number | null>(
      (latest, row) => row.lastTime === null ? latest : (latest === null ? row.lastTime : Math.max(latest, row.lastTime)),
      null,
    ),
    providers,
    models: [],
    dominantProvider: Object.entries(providers).sort((first, second) => second[1] - first[1])[0]?.[0] ?? null,
    cost,
    costsByCurrency: sumMoneyByCurrency(orphans.map((row) => row.costsByCurrency)),
    costSource: weakestSource(orphans.map((row) => row.costSource as CostSource)),
    partial: orphans.some((row) => row.partial === true),
  }
  return [...rows.filter((row) => row.registered), merged as unknown as Row]
}

/**
 * 读 POST 请求体并当 JSON 解析：上限 128 KiB（日志批量远小于这个数），
 * 超限或解析失败一律返回 null —— 端点回 `{ok:false}`，不抛错、不缓冲整个响应体。
 * 走异步迭代（真实 `IncomingMessage` 与测试夹具都支持），避免依赖事件式读取。
 */
async function readJsonBody(request: IncomingMessage, limitBytes = 128 * 1024): Promise<unknown | null> {
  let text = ''
  try {
    for await (const chunk of request) {
      text += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
      if (text.length > limitBytes) return null
    }
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export function mountKeyUsageRoutes(
  webServer: WebServer,
  sessionSource: SessionSource = unavailableSessionSource,
  liveQuota: LiveQuotaService = disabledLiveQuota,
  hostServices: { get(name: string): unknown } = { get: () => undefined },
  options: KeyUsageMountOptions = {},
): void {
  const ledgerPath = join(dshHomePath(), 'dsh-usage', 'usage-ledger.json')
  const snapshotPath = join(dshHomePath(), 'dsh-usage', 'provider-snapshots.json')
  const titleSource = createTitleSource(join(dshHomePath(), 'storages', 'session_projcache.json'))
  /** 会话投影（一会话一文件）：侧边栏显示名与「是不是真子代理」的权威来源。 */
  const projectionSource = createSessionProjectionSource(join(dshHomePath(), 'storages', 'session_projcache', 'sessions'))
  const archiveSource = createArchiveSource(hostServices, join(dshHomePath(), 'storages', 'workspace.json'))
  /** 宿主工作区表（path → 侧边栏显示名）：项目页要靠它把「目录」对齐成侧边栏里的「工作区」。 */
  const workspaceSource = createWorkspaceSource(hostServices, join(dshHomePath(), 'storages', 'workspace.json'))
  const quotaSnapshotPath = join(dshHomePath(), 'dsh-key-usage', 'quota-snapshots.json')
  /**
   * 会话标题、子代理判定与归档状态：宿主服务/缓存文件都拿不到时返回空集合，界面自行回落。
   * 投影按 id 惰性读（只读这次要用到的会话），所以调用方要把 ids 传进来。
   */
  const sessionMeta = (ids: string[]): SessionMetaOptions => {
    const facts = projectionSource.facts(ids)
    const titles = new Map(titleSource.titles())
    for (const [id, fact] of facts) if (fact.title !== null) titles.set(id, fact.title)
    return { titles, facts, archived: archiveSource.archived() }
  }

  const loadLedger = (): UsageLedger => readLedger(ledgerPath, (path) => {
    try { return readFileSync(path, 'utf8') } catch { return null }
  }) ?? EMPTY_LEDGER

  const readSnapshots = (): ProviderSnapshot[] => readProviderSnapshots(snapshotPath).providers

  /**
   * 台账金额的币种：台账只记金额、不记币种（宿主 `usage-ledger.json` 没有 currency 字段），
   * 按该通道在内置价目里的币种推断（DeepSeek / Kimi → CNY，Z.ai / OpenRouter → USD），
   * 价目里没有这个通道时回落到价目基准币种 —— 这是**推断**而不是台账自带的事实，界面要注明。
   */
  const ledgerCurrencyOf = (provider: string): string => catalogProviderCurrency(provider) ?? catalogCurrency()

  /**
   * 给合并序列补成本与来源：台账天保留官方成本（official，不重算），
   * 会话补位天逐模型按价目算（通道内价目 → 同模型官方价目），两层都不命中就是 none。
   * @param offPeakHours - 单日范围才有的小时槽；给了就按错峰占比加权
   */
  const annotateCosts = (
    days: ChannelDailySummary[],
    sessionDates: string[],
    offPeakHours: PricingUsageRow[] | null,
  ): AnnotatedDaySummary[] => {
    const sessionSet = new Set(sessionDates)
    return days.map((day) => {
      if (!sessionSet.has(day.date)) {
        // 台账天带官方账单金额：原样保留，不按价目重算
        const models = day.models.map((model) => ({
          ...model,
          costSource: 'official' as CostSource,
          partial: false,
          costsByCurrency: costsByCurrencyOf([{ cost: model.cost, currency: ledgerCurrencyOf(model.provider) }]),
        }))
        return {
          ...day,
          costSource: 'official' as CostSource,
          partial: false,
          models,
          costsByCurrency: alignMoneyWithCost(sumMoneyByCurrency(models.map((model) => model.costsByCurrency)), day.cost),
        }
      }
      const models = day.models.map((model) => {
        const row = dayModelPricingRow(model)
        const priced = priceRowsOf([row], { hours: offPeakHours })[0]
        const priced0 = priced.cost !== null && priced.rule !== null
        // 价目没命中就是「无依据」：金额记 0 只是为了合计不炸，来源会标 none，界面显示 —
        const cost = priced0 ? Math.round((priced.cost ?? 0) * 100) / 100 : 0
        const currency = priced.rule !== null ? priced.rule.currency : ledgerCurrencyOf(model.provider)
        const source: CostSource = priced0 ? priced.source : 'none'
        return {
          ...model,
          cost,
          costSource: source,
          partial: priced0 ? priced.partial : false,
          // 只有真有依据的格子才进币种小计：`none` 的 0 元不是金额，混进去会凭空造出一个币种
          costsByCurrency: source === 'none' ? {} : costsByCurrencyOf([{ cost, currency }]),
        }
      })
      const dayCost = Math.round(models.reduce((total, model) => total + model.cost, 0) * 100) / 100
      return {
        ...day,
        cost: dayCost,
        costSource: weakestSource(models.map((model) => model.costSource)),
        partial: models.some((model) => model.partial),
        models,
        costsByCurrency: alignMoneyWithCost(sumMoneyByCurrency(models.map((model) => model.costsByCurrency)), dayCost),
      }
    })
  }

  /** 通道配置：cordis.yml 优先、空模板时回退 cordis.patch.yml（两个文件都含 !!js，只做文本提取）。 */
  const readChannelConfig = (): ChannelInfo[] => {
    const profileDir = join(dshHomePath(), 'profiles', 'desktop')
    const composed = readTextFile(join(profileDir, 'cordis.yml'))
    if (composed !== null) {
      const channels = extractChannels(composed)
      if (channels.length > 0) return channels
    }
    const patch = readTextFile(join(profileDir, 'cordis.patch.yml'))
    return patch === null ? [] : extractChannels(patch)
  }
  const knownProviders = (): string[] => readChannelConfig().map((channel) => channel.provider)

  /** 快照里的配额段（`/quota` 响应体）。 */
  const quotaRowsOf = (quota: unknown): QuotaProviderRow[] => {
    if (typeof quota !== 'object' || quota === null) return []
    const providers = (quota as { providers?: unknown }).providers
    return Array.isArray(providers) ? providers as QuotaProviderRow[] : []
  }

  /** 通道清单（形状 = `/channels` 响应）：窗口 / 余额取自快照的配额段，并带上「数据时间 + 是否陈旧 + 本次失败原因」。 */
  const channelsPayloadOf = (quota: unknown, outcome: SnapshotQuotaOutcome): { channels: Record<string, unknown>[] } => {
    const rows = quotaRowsOf(quota)
    const snapshots: ProviderSnapshot[] = rows.map((row) => ({
      provider: row.provider,
      displayName: row.displayName,
      credential: row.credential,
      updatedAt: row.updatedAt,
      balance: row.balance,
      plan: row.plan,
    }))
    const stateOf = new Map(outcome.providers.map((entry) => [entry.provider, entry]))
    return {
      channels: classifyChannels(readChannelConfig(), snapshots).map((channel) => {
        const state = stateOf.get(channel.provider) ?? null
        const row = rows.find((entry) => entry.provider === channel.provider) ?? null
        return {
          ...channelPayload(channel),
          // 旧值必须能被界面标出来（数据时间 · 本机快照 · 本次失败原因），不许静默当成最新
          quotaCapturedAt: state?.capturedAt ?? null,
          quotaStale: state?.stale === true,
          quotaError: state?.error ?? null,
          quotaSnapshotOrigin: row?.snapshotOrigin ?? null,
        }
      }),
    }
  }

  /** 使用明细：默认范围由快照物化；参数化请求走同一函数、同一份本地缓存，不另算一份。 */
  const usagePayload = async (from: string, to: string, providerFilter: string[] | null): Promise<Record<string, unknown>> => {
    const ledger = loadLedger()
    const collection = await sessionSource.collect()
    const sessionRows = sessionDayRows(collection.records, knownProviders())
      .filter((row) => providerFilter === null || providerFilter.includes(row.provider))
    const sessionDates = [...new Set(sessionRows.map((row) => row.date))].sort()
    const dayKeys = Object.keys(ledger.days).sort()
    const availableFrom = minKey(dayKeys[0], sessionDates[0]) ?? null
    const availableTo = maxKey(dayKeys[dayKeys.length - 1], sessionDates[sessionDates.length - 1]) ?? null
    const merged = mergeDailySeries(aggregateRange(ledger, from, to, providerFilter).days, sessionRows, from, to)
    // 单日范围才提供小时细分（来自会话事件，口径与台账不同，见页脚口径说明）
    const hours = from !== '' && from === to ? hoursOfDate(collection.records, from) : null
    // 单日有小时槽时按错峰占比加权；跨天拿不到小时分布，只能按标准价（不猜折扣）
    const days = annotateCosts(merged.days, merged.sessionDates, hoursAsPricingRows(hours))
    const rawTotals = days.length > 0 ? totalsOfMerged(days) : null
    const totalsCost = rawTotals === null ? null : Math.round(rawTotals.cost * 100) / 100
    return {
      days,
      totals: rawTotals === null ? null : {
        ...rawTotals,
        cost: totalsCost,
        costSource: weakestSource(days.map((day) => day.costSource)),
        partial: days.some((day) => day.partial),
        costsByCurrency: alignMoneyWithCost(sumMoneyByCurrency(days.map((day) => day.costsByCurrency)), totalsCost),
      },
      sessionDates: merged.sessionDates,
      availableFrom,
      availableTo,
      hours,
    }
  }

  /** 热力图：近 364 天，与使用明细同一口径（会话补位天按价目/均价估算，台账天保留官方成本）。 */
  const heatmapPayload = async (): Promise<Record<string, unknown>> => {
    const ledger = loadLedger()
    const collection = await sessionSource.collect()
    const sessionRows = sessionDayRows(collection.records, knownProviders())
    const dayKeys = Object.keys(ledger.days).sort()
    const sessionDates = [...new Set(sessionRows.map((row) => row.date))].sort()
    const yearAgo = new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10)
    const earliest = minKey(dayKeys[0], sessionDates[0]) ?? yearAgo
    const from = earliest > yearAgo ? earliest : yearAgo
    const to = maxKey(dayKeys[dayKeys.length - 1], sessionDates[sessionDates.length - 1]) ?? from
    const merged = mergeDailySeries(aggregateRange(ledger, from, to, null).days, sessionRows, from, to)
    const days = annotateCosts(merged.days, merged.sessionDates, null)
    return {
      days: days
        .map((day) => ({
          date: day.date,
          totalTokens: day.inputTokens + day.outputTokens + day.cacheReadTokens,
          models: day.models
            .map((model) => ({
              provider: model.provider,
              model: model.model,
              totalTokens: model.inputTokens + model.outputTokens + model.cacheReadTokens,
            }))
            .filter((model) => model.totalTokens > 0)
            .sort((first, second) => second.totalTokens - first.totalTokens),
        }))
        .filter((day) => day.totalTokens > 0),
      sessionDates: merged.sessionDates,
    }
  }

  /** 总览表：今日 / 近 30 天两列（与使用明细同一口径，否则两页数字对不上）。 */
  const summaryPayload = async (): Promise<Record<string, unknown>> => {
    const today = dayKeyOf(new Date())
    const monthFrom = shiftedDayKey(-29)
    const ledger = loadLedger()
    const collection = await sessionSource.collect()
    const channels = classifyChannels(readChannelConfig(), [])
    const sessionRows = sessionDayRows(collection.records, channels.map((channel) => channel.provider))
    const merged = mergeDailySeries(aggregateRange(ledger, monthFrom, today, null).days, sessionRows, monthFrom, today)
    const days = annotateCosts(merged.days, merged.sessionDates, null)
    const todaySummary = summarizeMergedByProvider(days, today, today)
    const monthSummary = summarizeMergedByProvider(days, monthFrom, today)
    const rows = channels.map((channel) => {
      const todayRow = todaySummary.find((row) => row.provider === channel.provider)
      const monthRow = monthSummary.find((row) => row.provider === channel.provider)
      const todayCost = todayRow === undefined ? 0 : Math.round(todayRow.cost * 100) / 100
      const monthCost = monthRow === undefined ? 0 : Math.round(monthRow.cost * 100) / 100
      const currency = ledgerCurrencyOf(channel.provider)
      return {
        provider: channel.provider,
        today: {
          ...todayRow ?? { provider: channel.provider, calls: 0, tokens: 0, cost: 0 },
          cost: todayCost,
          costSource: sourceOfProvider(days, channel.provider, today, today),
          partial: partialOfProvider(days, channel.provider, today, today),
          costsByCurrency: moneyOrZero(moneyOfProvider(days, channel.provider, today, today), todayCost, currency),
        },
        month: {
          ...monthRow ?? { provider: channel.provider, calls: 0, tokens: 0, cost: 0 },
          cost: monthCost,
          costSource: sourceOfProvider(days, channel.provider, monthFrom, today),
          partial: partialOfProvider(days, channel.provider, monthFrom, today),
          costsByCurrency: moneyOrZero(moneyOfProvider(days, channel.provider, monthFrom, today), monthCost, currency),
        },
      }
    })
    return {
      channels: rows,
      range: { today, monthFrom },
      todaySource: merged.sessionDates.includes(today) ? 'session' : 'ledger',
      sessionDates: merged.sessionDates,
    }
  }

  /** 会话用量列表（`limit` 只影响展示条数；快照段用大 limit 物化全量）。 */
  const sessionsPayload = async (limit: number, quota: unknown, collection?: SessionCollection): Promise<Record<string, unknown>> => {
    const channels = classifyChannels(readChannelConfig(), quotaRowsOf(quota))
    const known = channels.map((channel) => channel.provider)
    const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]))
    const { records, coverage } = collection ?? await sessionSource.collect()
    const meta = sessionMeta(records.map((record) => record.id))
    const rows = sessionRowsOf(records, known, meta).slice(0, limit).map((row) => {
      const costs = rowCostsOf(row.models.map(pricingRowOf))
      const cost = costs.length === 0 ? null : sumOrNull(costs)
      return {
        ...row,
        providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
        costMode: row.provider === null ? null : costModeOf.get(row.provider) ?? null,
        cost,
        costsByCurrency: alignMoneyWithCost(
          costsByCurrencyOf(costs.map((entry) => ({ cost: entry.cost, currency: entry.currency }))),
          cost,
        ),
        costSource: costs.length === 0 ? 'none' : weakestSource(costs.map((entry) => entry.source)),
        partial: costs.some((entry) => entry.partial),
        // 行内展开的模型构成：全量算成本（总额不受截断影响），只把长尾合并成「其它」
        models: cappedModelRows(row, costs),
      }
    })
    // priced = 这份数据里至少有一行真的命中了价目（界面据此决定要不要提示「无价目依据」）
    return { rows, coverage, priced: rows.some((row) => row.cost !== null) }
  }

  /** 项目用量列表。 */
  const projectsPayload = async (limit: number, collection?: SessionCollection): Promise<Record<string, unknown>> => {
    const known = knownProviders()
    const { records, coverage } = collection ?? await sessionSource.collect()
    const titles = workspaceSource.titles()
    const priced = projectRowsOf(records, known, sessionMeta(records.map((record) => record.id))).map((row) => {
      const costs = rowCostsOf(row.models.map(pricingRowOf))
      const cost = costs.length === 0 ? null : sumOrNull(costs)
      const title = titles.get(row.workspace.toLowerCase()) ?? null
      return {
        ...row,
        /** 宿主工作区名（侧边栏显示名）；目录不在工作区表里时为 null。 */
        workspaceTitle: title,
        /** 这一行覆盖的目录（工作区行 = 1 个；「未归入工作区」行 = 多个）。 */
        paths: [row.workspace],
        registered: title !== null,
        dominantProvider: Object.entries(row.providers).sort((first, second) => second[1] - first[1])[0]?.[0] ?? null,
        cost,
        costsByCurrency: alignMoneyWithCost(
          costsByCurrencyOf(costs.map((entry) => ({ cost: entry.cost, currency: entry.currency }))),
          cost,
        ),
        costSource: costs.length === 0 ? 'none' : weakestSource(costs.map((entry) => entry.source)),
        partial: costs.some((entry) => entry.partial),
      }
    })
    // 项目页与侧边栏对齐：工作区各占一行，不在工作区里的历史目录合并成一行（否则会出现侧边栏里没有的「项目」）
    const rows = collapseOrphanProjects(priced).slice(0, limit)
    // priced = 这份数据里至少有一行真的命中了价目（界面据此决定要不要提示「无价目依据」）
    return { rows, coverage, priced: rows.some((row) => row.cost !== null) }
  }

  /** 按模型用量列表。 */
  const modelsPayload = async (limit: number, quota: unknown, collection?: SessionCollection): Promise<Record<string, unknown>> => {
    const channels = classifyChannels(readChannelConfig(), quotaRowsOf(quota))
    const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]))
    const { records, coverage } = collection ?? await sessionSource.collect()
    const rows = modelRowsOf(records, channels.map((channel) => channel.provider)).slice(0, limit).map((row) => {
      const costs = rowCostsOf([pricingRowOf(row)])
      const cost = sumOrNull(costs)
      return {
        ...row,
        providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
        costMode: costModeOf.get(row.provider) ?? null,
        // 与 /sessions 同一口径：内置官方价目 → 聚合价（通道别名）→ 同模型官方价目 → 无依据
        cost,
        costsByCurrency: alignMoneyWithCost(
          costsByCurrencyOf(costs.map((entry) => ({ cost: entry.cost, currency: entry.currency }))),
          cost,
        ),
        costSource: costs[0]?.source ?? 'none',
        partial: costs[0]?.partial === true,
      }
    })
    // priced = 这份数据里至少有一行真的命中了价目（界面据此决定要不要提示「无价目依据」）
    return { rows, coverage, priced: rows.some((row) => row.cost !== null) }
  }

  /**
   * 配额段（余额与订阅窗口）：**唯一会联网取余额的地方**，只在首次构建、手动刷新、/quota?fresh=1
   * 与页面打开的后台补查（orce: false，由 live-quota 的 60 秒缓存把关）时调用。
   * 实时成功的通道标 `source: 'live'`；失败的通道回落本机快照（插件自己的 snapshot.json，
   * 首次构建时兼容读一次旧版 `quota-snapshots.json` 当种子），并给出 `capturedAt`（数据时间）、
   * `stale`（正在展示旧值）与 `error`（本次失败原因）—— 界面据此标注，绝不静默当最新。
   */
  const quotaPayload = async (seedLegacy: boolean, previousSection: unknown, force = true): Promise<SnapshotQuotaBuild> => {
    const channels = classifyChannels(readChannelConfig(), [])
    const live = await liveQuota.refreshIfStale(channels, force)
    const seeded = seedLegacy ? readQuotaSnapshots(quotaSnapshotPath) : []
    const hostSnapshots = readSnapshots()
    // 回落优先级：上一份快照的配额段（插件自己最近一次成功值）> 旧版 quota-snapshots.json（仅首次构建）> 宿主快照
    const previousRows = quotaRowsOf(previousSection)
    const fallbackOf = (provider: string): { updatedAt: number | null; balance: Record<string, unknown> | null; plan: QuotaProviderRow['plan']; origin: 'own' | 'host' | null } => {
      const previous = previousRows.find((row) => row.provider === provider && row.updatedAt !== null)
      if (previous !== undefined) {
        return { updatedAt: previous.updatedAt, balance: previous.balance, plan: previous.plan, origin: 'own' }
      }
      const own = seeded.find((entry) => entry.provider === provider) ?? null
      const hostEntry = hostSnapshots.find((entry) => entry.provider === provider) ?? null
      const useOwn = own !== null && (hostEntry === null || own.updatedAt >= (hostEntry.updatedAt ?? 0))
      if (useOwn) {
        return {
          updatedAt: own.updatedAt,
          balance: own.balance,
          plan: own.windows === null ? null : { windows: own.windows },
          origin: 'own',
        }
      }
      return {
        updatedAt: hostEntry?.updatedAt ?? null,
        balance: hostEntry?.balance ?? null,
        plan: (hostEntry?.plan as QuotaProviderRow['plan']) ?? null,
        origin: hostEntry === null ? null : 'host',
      }
    }
    const providers: QuotaProviderRow[] = channels.map((channel) => {
      const liveEntry = live.get(channel.provider)
      const supported = schemeIdOf(channel.provider) !== null
      const liveOk = liveEntry !== undefined && liveEntry.ok
      const hostEntry = hostSnapshots.find((entry) => entry.provider === channel.provider) ?? null
      if (liveOk) {
        return {
          provider: channel.provider,
          displayName: channel.displayName,
          credential: channel.apiKeyEnv,
          supported,
          source: 'live',
          snapshotOrigin: null,
          fetchedAt: liveEntry.fetchedAt,
          updatedAt: liveEntry.fetchedAt,
          error: null,
          balance: liveEntry.balance,
          plan: liveEntry.windows === null ? null : { windows: liveEntry.windows },
        }
      }
      const fallback = fallbackOf(channel.provider)
      return {
        provider: channel.provider,
        displayName: hostEntry?.displayName ?? channel.displayName,
        credential: hostEntry?.credential ?? channel.apiKeyEnv,
        supported,
        source: 'snapshot',
        snapshotOrigin: fallback.origin,
        fetchedAt: null,
        updatedAt: fallback.updatedAt,
        // 实时失败的原因要透出（未配置凭据 / 网络 / 鉴权），界面据此提示
        error: liveEntry?.error ?? (fallback.updatedAt === null ? 'no-snapshot' : null),
        balance: fallback.balance,
        plan: fallback.plan,
      }
    })
    const outcome: SnapshotQuotaOutcome = {
      refreshedAt: new Date().toISOString(),
      providers: providers.map((row) => {
        const capturedAt = row.updatedAt === null ? null : new Date(row.updatedAt).toISOString()
        return {
          provider: row.provider,
          ok: row.source === 'live',
          error: row.error,
          capturedAt,
          // 「陈旧」= 正在展示的不是本次实时值，而是确实有值可展示的旧快照
          stale: row.supported && row.source !== 'live' && capturedAt !== null,
        }
      }),
    }
    return { quota: { providers }, outcome, issues: [] }
  }

  /**
   * 统一快照：6 个 tab 的唯一数据来源（`$DSH_HOME/dsh-key-usage/snapshot.json`）。
   * 本地段由定时器每 5 分钟重算（不联网）；配额段只在首次构建与手动刷新时联网。
   */
  const snapshotService = createSnapshotService({
    path: join(dshHomePath(), 'dsh-key-usage', SNAPSHOT_FILE),
    intervalMs: options.snapshotIntervalMs,
    builders: {
      local: async ({ quota }) => {
        /**
         * 整表折叠一次、三个段共用：以前 models / projects / sessions 各自 `collect()`，
         * 同一次构建把宿主会话列表与变更会话读了三遍（实测 p50 3.3 s、最高 13.8 s）。
         * `collect()` 内部只做「并发去重」，串行调用就是三次真实读取 —— 这里显式只取一次。
         */
        const collection = await sessionSource.collect()
        const stats = sessionSource.stats?.() ?? null
        // 耗时明细直接落盘（info）：这是排查信息，不是「快照问题」，不进 issues（界面就不会弹警告）
        if (stats !== null) {
          appendLogRecords([{
            time: new Date().toISOString(),
            level: 'info',
            source: 'snapshot',
            message: '本地重建：会话读取明细',
            detail: '共 ' + String(stats.sessions) + ' 个，缓存命中 ' + String(stats.cached)
              + '，本次读取 ' + String(stats.read) + '；宿主列表 ' + String(stats.listMs)
              + ' ms，折叠 ' + String(stats.readMs) + ' ms，合计 ' + String(stats.totalMs) + ' ms',
          }], logFilePath())
        }
        return {
          sections: {
            overview: await summaryPayload(),
            // 快照存默认范围：近 30 天 / 全部通道
            usage: await usagePayload(shiftedDayKey(-29), dayKeyOf(new Date()), null),
            heatmap: await heatmapPayload(),
            models: await modelsPayload(Number.MAX_SAFE_INTEGER, quota, collection),
            projects: await projectsPayload(Number.MAX_SAFE_INTEGER, collection),
            sessions: await sessionsPayload(Number.MAX_SAFE_INTEGER, quota, collection),
          },
          issues: [],
        }
      },
      quota: async (input) => quotaPayload(input.seedLegacy, input.previous, input.force !== false),
      channels: async ({ quota, outcome }) => ({ channels: channelsPayloadOf(quota, outcome), issues: [] }),
    },
  })
  snapshotService.start()

  /** 通道清单（含配额判定）：与快照同源，供 /session、/rates 这类按需端点复用。 */
  const channelsWithQuota = async (): Promise<ChannelInfo[]> =>
    classifyChannels(readChannelConfig(), quotaRowsOf((await snapshotService.view()).sections.quota))

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/snapshot',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      // 打开页面（?fresh=1）：本地段超过防抖下限就阻塞重算一次、配额段超时就后台补查；
      // 构建中返回上一份完整内容 + building:true，客户端按 building / quotaRefreshing 追取
      const url = new URL(request.url ?? '/', 'http://localhost')
      const view = await snapshotService.view({ fresh: url.searchParams.get('fresh') === '1' })
      // ?sections=a,b,c 只裁剪下发（构建照旧全量），界面按 Tab 只取自己要的那几段
      sendJson(response, 200, trimSnapshotSections(view, parseSections(url.searchParams.get('sections'))))
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/refresh',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      if (request.method !== 'POST') {
        sendJson(response, 200, { ok: false, error: '该端点只支持 POST（面板右上角「刷新」按钮会发 POST）' })
        return
      }
      const result = await snapshotService.refresh()
      sendJson(response, 200, result.ok ? result.view : { ok: false, error: result.error })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/channels',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      // 与快照同源：不再单独读宿主快照 + 内存缓存（那正是「总览显示 14 天前 76%」的来源）
      const view = await snapshotService.view()
      sendJson(response, 200, view.sections.channels ?? { channels: [] })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/usage',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const view = await snapshotService.view()
      const available = view.sections.usage as { availableFrom?: string | null; availableTo?: string | null } | null
      const from = url.searchParams.get('from') ?? available?.availableFrom ?? ''
      const to = url.searchParams.get('to') ?? available?.availableTo ?? ''
      const providerParam = url.searchParams.get('provider')
      const providerFilter = providerParam !== null && providerParam !== '' ? providerParam.split(',').filter(Boolean) : null
      // 参数化请求与快照同源：同一套聚合函数、同一份本地 mtime 缓存
      sendJson(response, 200, await usagePayload(from, to, providerFilter))
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/heatmap',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      sendJson(response, 200, await heatmapPayload())
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/quota',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      // fresh=1 语义并入快照的手动刷新（只重查配额）；否则直接给快照里的配额段
      const result = url.searchParams.get('fresh') === '1'
        ? await snapshotService.refreshQuota()
        : { ok: true as const, view: await snapshotService.view() }
      if (!result.ok) {
        sendJson(response, 200, { error: result.error, providers: [] })
        return
      }
      sendJson(response, 200, result.view.sections.quota ?? { providers: [] })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/summary',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const view = await snapshotService.view()
      sendJson(response, 200, view.sections.overview ?? { channels: [], range: null, todaySource: 'ledger', sessionDates: [] })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/sessions',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const view = await snapshotService.view()
      sendJson(response, 200, await sessionsPayload(parseLimit(url.searchParams.get('limit'), 200), view.sections.quota))
    },
  })

  /**
   * 单会话详情：抽屉用。只折叠这一个会话（缓存命中时零 I/O），
   * 因此不会像 `/sessions` 那样为一次点击重折全部会话。
   */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/session',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const id = (url.searchParams.get('id') ?? '').trim()
      if (id === '') {
        sendJson(response, 400, { error: '缺少会话 id：请用 ?id=<sessionId>' })
        return
      }
      if (sessionSource.detail === undefined) {
        sendJson(response, 404, { error: '会话详情不可用', id, reason: '当前注入的会话数据源不支持单会话查询' })
        return
      }
      const lookup = await sessionSource.detail(id)
      if (lookup.status === 'not-found') {
        sendJson(response, 404, { error: '会话不存在', id: lookup.id, reason: lookup.reason ?? '宿主会话列表里没有这个 id' })
        return
      }
      const channels = await channelsWithQuota()
      const knownProviders = channels.map((channel) => channel.provider)
      const meta = sessionMeta([lookup.id])
      const detail = lookup.record === null
        // 降级时只有会话头字段，但投影缓存里的标题仍然可用，优先级与列表保持一致
        ? emptySessionDetail(
          lookup.id,
          (meta.titles ?? new Map<string, string>()).get(normalizeSessionId(lookup.id)) ?? lookup.title,
          lookup.workspace,
          (meta.archived ?? new Set<string>()).has(normalizeSessionId(lookup.id)),
        )
        : sessionDetailOf(lookup.record, knownProviders, meta)
      const costs = rowCostsOf(detail.models.map(pricingRowOf))
      const models = detail.models.map((model, index) => {
        const cost = costs[index]?.cost ?? null
        return {
          ...model,
          providerLabel: channels.find((channel) => channel.provider === model.provider)?.displayName ?? model.provider,
          cost,
          costSource: costs[index]?.source ?? 'none',
          partial: costs[index]?.partial === true,
          costsByCurrency: costsByCurrencyOf([{ cost, currency: costs[index]?.currency ?? null }]),
        }
      })
      const detailCost = costs.length === 0 ? null : sumOrNull(costs)
      sendJson(response, 200, {
        session: {
          ...detail,
          models,
          providerLabel: detail.provider === null ? null : channels.find((channel) => channel.provider === detail.provider)?.displayName ?? detail.provider,
          costMode: detail.provider === null ? null : channels.find((channel) => channel.provider === detail.provider)?.costMode ?? null,
          cost: detailCost,
          costsByCurrency: alignMoneyWithCost(sumMoneyByCurrency(models.map((model) => model.costsByCurrency)), detailCost),
          costSource: costs.length === 0 ? 'none' : weakestSource(costs.map((entry) => entry.source)),
          partial: costs.some((entry) => entry.partial),
        },
        coverage: {
          status: lookup.status === 'ok' ? 'complete' : lookup.status === 'degraded' ? 'partial' : 'unavailable',
          reason: lookup.reason,
        },
        priced: costs.some((entry) => entry.cost !== null),
      })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/projects',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      sendJson(response, 200, await projectsPayload(parseLimit(url.searchParams.get('limit'), 200)))
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/models',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const view = await snapshotService.view()
      sendJson(response, 200, await modelsPayload(parseLimit(url.searchParams.get('limit'), 200), view.sections.quota))
    },
  })

  /**
   * 每通道单价表：`rates` 与成本计算走同一套匹配（通道内价目 → 同模型官方价目），给的是**此刻生效**的单价
   * （错峰时是错峰价 + `offPeak: true`）；两层都没命中标 `none`（`rates: null`）。
   */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/rates',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const days = parseDays(url.searchParams.get('days'))
      const limit = parseRatesLimit(url.searchParams.get('limit'))
      const today = dayKeyOf(new Date())
      const from = shiftedDayKey(-(days - 1))
      const ledger = loadLedger()
      const channels = await channelsWithQuota()
      const knownProviders = channels.map((channel) => channel.provider)
      const collection = await sessionSource.collect()
      const merged = mergeDailySeries(
        aggregateRange(ledger, from, today, null).days,
        sessionDayRows(collection.records, knownProviders),
        from,
        today,
      )
      const now = new Date()
      // 模型集合 = 范围内（台账 + 会话合并口径）出现过的模型
      const usageByProvider = new Map<string, Map<string, RateUsage>>()
      for (const day of merged.days) {
        for (const model of day.models) {
          let models = usageByProvider.get(model.provider)
          if (models === undefined) {
            models = new Map<string, RateUsage>()
            usageByProvider.set(model.provider, models)
          }
          let bucket = models.get(model.model)
          if (bucket === undefined) {
            bucket = { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
            models.set(model.model, bucket)
          }
          bucket.calls += model.calls
          bucket.inputTokens += model.inputTokens
          bucket.outputTokens += model.outputTokens
          bucket.cacheReadTokens += model.cacheReadTokens
          bucket.cacheWriteTokens += model.cacheWriteTokens ?? 0
        }
      }
      const channelRows = [...usageByProvider.entries()].map(([provider, models]) => {
        const displayName = channels.find((channel) => channel.provider === provider)?.displayName ?? ''
        // 未配置 / 未命名的通道用 raw provider id 兜底；provider 本身为空时给一句可读说明
        const label = displayName !== '' ? displayName : provider !== '' ? provider : '未知通道'
        const rankedModels = [...models.entries()]
          .map(([model, usage]) => ({ model, usage, tokens: usage.inputTokens + usage.outputTokens + usage.cacheReadTokens }))
          .sort((first, second) => second.tokens - first.tokens)
          .slice(0, limit)
          .map(({ model, usage, tokens }) => {
            const hit = matchPricedRule(provider, model)
            const effective = hit === null ? null : ratesAt(hit.rule, now)
            // 该行这段用量的成本：用表里同一份「此刻单价」算，成本列与单价列永远对得上
            const pricedRow = rowCostsOf([pricingRowOf({
              provider,
              model,
              tokens,
              calls: usage.calls,
              buckets: {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                cacheReadTokens: usage.cacheReadTokens,
                cacheWriteTokens: usage.cacheWriteTokens,
              },
            })], { at: now })[0]
            return {
              model,
              cost: pricedRow === undefined ? null : pricedRow.cost,
              costCurrency: pricedRow === undefined ? null : pricedRow.currency,
              tokens,
              calls: usage.calls,
              source: hit !== null ? hit.source : 'none' as const,
              currency: hit === null ? null : hit.rule.currency,
              partial: hit !== null && hit.partial,
              offPeak: effective !== null && effective.offPeak,
              rates: effective === null ? null : {
                input: effective.rates.input,
                cacheRead: effective.rates.cacheRead,
                cacheWrite: effective.rates.cacheWrite,
                output: effective.rates.output,
              },
              note: ratesNoteOf(hit),
      noteEn: hit === null || hit.rule.noteEn === undefined ? null : hit.rule.noteEn,
            }
          })
        const currencies = new Set(rankedModels.map((row) => row.currency).filter((value): value is string => value !== null))
        return {
          provider,
          label,
          // 该通道**展示出来的**模型币种一致时给出，混合（如官方价 CNY + 聚合价 USD）时为 null —— 不猜
          currency: currencies.size === 1 ? [...currencies][0] : null,
          models: rankedModels,
          totalTokens: rankedModels.reduce((total, row) => total + row.tokens, 0),
        }
      }).sort((first, second) => second.totalTokens - first.totalTokens)
      sendJson(response, 200, {
        from,
        to: today,
        channels: channelRows.map(({ totalTokens, ...channel }) => channel),
      })
    },
  })

  /** 价目装载状态：内置价目（随包 YAML）+ 聚合价（随包 JSON 或本机刷新副本）+ 近 30 天覆盖度 + 解析问题。 */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/pricing',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const ledger = loadLedger()
      const channels = classifyChannels(readChannelConfig(), [])
      const knownProviders = channels.map((channel) => channel.provider)
      const collection = await sessionSource.collect()
      const today = dayKeyOf(new Date())
      const monthFrom = shiftedDayKey(-29)
      const merged = mergeDailySeries(
        aggregateRange(ledger, monthFrom, today, null).days,
        sessionDayRows(collection.records, knownProviders),
        monthFrom,
        today,
      )
      // 覆盖度按「近 30 天出现过的 provider|model」统计，与使用明细的口径一致
      const usageRows: PricingUsageRow[] = merged.days.flatMap((day) => day.models.map(dayModelPricingRow))
      const coverage = summarizeCoverage(usageRows)
      // 覆盖度统计会顺带做聚合价匹配，装载问题与「定不了通道」的提示要在这之后再取，才能一起下发
      const aggregate = aggregateStatus()
      sendJson(response, 200, {
        currency: catalogCurrency(),
        // 内置官方价目：自动生效、无需用户维护；条数 / 来源给摘要，rules 给逐条数值
        catalog: {
          entries: catalogEntryCount(),
          sources: catalogSources(),
          rules: catalogRuleList(),
        },
        // LiteLLM 聚合价目（第三方、USD）：随包快照 + 本地刷新文件；刷新走下面的 POST /pricing/refresh
        aggregate,
        coverage: {
          from: monthFrom,
          to: today,
          catalogModels: coverage.catalogModels,
          aggregateModels: coverage.aggregateModels,
          partialModels: coverage.partialModels,
          modelModels: coverage.modelModels,
          unpricedModels: coverage.unpricedModels,
          // 只作参照：界面上的成本按「官方账单 > 内置价目 > 聚合价 > 均价」逐格取值，与这个总额不一定相等
          costByCurrency: coverage.costByCurrency,
          savingsByCurrency: coverage.savingsByCurrency,
          savingsDetail: coverage.savingsDetail,
        },
        files: { catalog: catalogFileInfo() },
        issues: catalogIssues().map((issue) => ({ file: 'catalog' as const, line: issue.line, message: issue.message })),
      })
    },
  })

  /** 实时汇率（USD → CNY）：只在用户动作时请求，12 小时 TTL 内吃缓存不联网；失败也恒 200 + `ok:true`。 */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/fx',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const view = await resolveFxRate({ refresh: url.searchParams.get('refresh') === '1' })
      sendJson(response, 200, view)
    },
  })

  /**
   * 聚合价目刷新：只在用户点面板「刷新价目」按钮时触发。
   * 先 raw 再 jsDelivr 镜像，总超时 20 秒、响应上限 12 MiB；校验不过不覆盖已有本地文件。
   * 与写入端点同样一律 HTTP 200 + `{ok:false,error}`（客户端只看 ok）。
   */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/pricing/refresh',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      if (request.method !== undefined && request.method !== 'POST') {
        sendJson(response, 200, { ok: false, error: '该端点只支持 POST（面板的「刷新价目」按钮会发 POST）' })
        return
      }
      const result = await refreshModelPrices()
      sendJson(response, 200, result)
    },
  })

  /**
   * 系统日志：`GET` 回读（刷新页面后日志还在）、`POST` 批量追加 / 清空。
   * 客户端攒约 1 秒发一批；写失败只回 `{ok:false}`，界面不因此报错（日志本身不该打断使用）。
   */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/log',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      if (request.method === 'POST') {
        const body = await readJsonBody(request)
        if (body === null) {
          sendJson(response, 200, { ok: false, error: '请求体不是合法 JSON（日志端点只收 {records:[…]} 或 {clear:true}）' })
          return
        }
        if ((body as { clear?: unknown }).clear === true) {
          sendJson(response, 200, clearLogFile())
          return
        }
        const records = (body as { records?: unknown }).records
        sendJson(response, 200, appendLogRecords(Array.isArray(records) ? records : []))
        return
      }
      const url = new URL(request.url ?? '/', 'http://localhost')
      sendJson(response, 200, { ok: true, records: readLogRecords(parseLimit(url.searchParams.get('limit'), 500)) })
    },
  })
}
