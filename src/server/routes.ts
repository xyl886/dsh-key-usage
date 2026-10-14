/**
 * HTTP 路由：只读 GET 端点，向客户端提供聚合数据。
 * - /dsh-key-usage/channels  通道清单（含状态与计费模式）
 * - /dsh-key-usage/usage     范围聚合（from/to/provider 过滤；单日附带按小时）
 * - /dsh-key-usage/heatmap   年度热力图序列
 * - /dsh-key-usage/quota     余额与订阅窗口原样快照
 * - /dsh-key-usage/summary   总览表用的「今日 / 近 30 天」按通道汇总
 * - /dsh-key-usage/sessions  会话用量（来自宿主会话事件折叠）
 * - /dsh-key-usage/session   单个会话详情（?id=<sessionId>；只折叠这一个会话）
 * - /dsh-key-usage/projects  项目（工作目录）用量
 * - /dsh-key-usage/models    模型（provider + model）用量与估算成本
 * - /dsh-key-usage/budget    预算与告警（今日 / 本月用量对阈值，纯提示、不阻断）
 * - /dsh-key-usage/pricing   计费规则的服务端对照（内置价目 / 错峰 / 覆盖度）
 *
 * 台账已停更时（本机停在 2026-09-30），按天序列会用会话事件补齐缺的日期（见 merge.ts），
 * 并在响应里用 `sessionDates` 标出来源。非本机回环请求一律 403。
 *
 * 成本口径（四处一致）：台账当天的官方成本 > 用户计费规则 > 台账反推均价 > 无依据（界面显示 —）。
 * 每个成本单元格都带 `costSource`（official / rule / estimate / none），界面据此打来源角标。
 * 规则与成本算法见 pricing.ts，规则本体存在宿主设置服务里（本插件不写文件）。
 *
 * 网络：只有「余额与订阅窗口」会访问各通道**官方**接口（见 live-quota.ts），
 * 失败即回落本地快照；其余端点零外网。
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  aggregateRange,
  buildPriceTable,
  estimateCost,
  readLedger,
  type ChannelDailySummary,
  type ModelSummary,
  type PriceEntry,
  type UsageLedger,
} from './ledger.js'
import {
  classifyChannels,
  costModeLabel,
  extractChannels,
  quotaWindowLabel,
  readProviderSnapshots,
  type ChannelInfo,
  type ProviderSnapshot,
} from './collect.js'
import { schemeIdOf, type LiveQuota, type LiveQuotaService } from './live-quota.js'
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
} from './sessions.js'
import { createArchiveSource, createTitleSource, normalizeSessionId } from './session-meta.js'
import { readQuotaSnapshots, writeQuotaSnapshots, type QuotaSnapshotEntry } from './quota-snapshots.js'
import {
  mergeDailySeries,
  sessionDayRows,
  summarizeMergedByProvider,
  totalsOfMerged,
} from './merge.js'
import {
  EMPTY_PRICING_VIEW,
  PRICING_TEMPLATES,
  addMoney,
  displayTokensOf,
  isOffPeakNow,
  matchPricedRule,
  priceRowsByRules,
  rowCostsOf,
  summarizeCoverage,
  type CostSource,
  type MoneyByCurrency,
  type PricingConfig,
  type PricingUsageRow,
  type PricingView,
} from './pricing.js'
import {
  EMPTY_BUDGET,
  evaluateBudget,
  normalizeBudget,
  type BudgetThresholds,
  type BudgetUsage,
} from './budget.js'
import { catalogEntryCount, catalogSources } from './pricing-catalog.js'

interface WebServer {
  register(route: { kind: string; path: string; handler: (request: IncomingMessage, response: ServerResponse) => Promise<void> | void }): void
}

/** 会话数据源（由 index.ts 注入，服务缺失时仍返回空结果）。 */
export interface SessionSource {
  collect(): Promise<SessionCollection>
  /** 单会话详情；旧的外部注入方可能没有这个能力，缺失时 `/session` 按「找不到」处理。 */
  detail?(id: string): Promise<SessionLookup>
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

/** 带来源角标的模型行 / 天行（响应里多一个 `costSource`，客户端据此显示 官方 / 自定 / 估算）。 */
type AnnotatedModelSummary = ModelSummary & { costSource: CostSource }
type AnnotatedDaySummary = ChannelDailySummary & { costSource: CostSource; models: AnnotatedModelSummary[] }

const SOURCE_RANK: Record<CostSource, number> = { official: 0, rule: 1, catalog: 2, estimate: 3, none: 4 }

/** 一天里最弱的那一格决定整天的角标：宁可标弱，也不把估算冒充成规则价。 */
export function weakestSource(sources: CostSource[]): CostSource {
  if (sources.length === 0) return 'none'
  return sources.reduce((weakest, current) => (SOURCE_RANK[current] > SOURCE_RANK[weakest] ? current : weakest), sources[0])
}

/** 会话侧的模型行 → 计费行（三种视图的 `models[]` 形状一致，用同一份映射）。 */
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

/** 台账序列里的模型行 → 计费行（分桶在顶层字段上，不是 `buckets`）。 */
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

/** 24 个小时槽 → 计费行（错峰占比只用得上 token 分桶）。 */
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

/** 逐行金额求和；全部为 null（无任何依据）时返回 null，界面据此显示 —。 */
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
  costs: Array<{ cost: number | null; source: CostSource }>,
): Array<AttributedModel & { sharePercent: number; cost: number | null; costSource: CostSource }> {
  const total = row.tokens
  const all = row.models.map((model, index) => ({
    ...model,
    sharePercent: total > 0 ? Math.round(model.tokens / total * 1000) / 10 : 0,
    cost: costs[index]?.cost ?? null,
    costSource: costs[index]?.source ?? ('none' as CostSource),
  }))
  if (all.length <= SESSION_MODEL_ROWS) return all
  const head = all.slice(0, SESSION_MODEL_ROWS)
  const rest = all.slice(SESSION_MODEL_ROWS)
  head.push({
    provider: '',
    model: '其它',
    tokens: rest.reduce((sum, model) => sum + model.tokens, 0),
    calls: rest.reduce((sum, model) => sum + model.calls, 0),
    sharePercent: Math.round(rest.reduce((sum, model) => sum + model.sharePercent, 0) * 10) / 10,
    buckets: {},
    cost: sumOrNull(rest),
    costSource: weakestSource(rest.map((model) => model.costSource)),
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

/** 某一天的展示口径 tokens（输入 + 输出 + 缓存读，不含缓存写）；该天没有记录时返回 0。 */
export function displayTokensOn(days: ChannelDailySummary[], date: string): number {
  const day = days.find((candidate) => candidate.date === date)
  if (day === undefined) return 0
  return day.inputTokens + day.outputTokens + day.cacheReadTokens
}

/**
 * 逐模型成本按币种加总（预算的「每月成本」逐币种比较）。
 * 金额与界面成本是同一份数字（`annotateCosts` 的结果）；币种取该模型命中的价目
 * （你的规则 / 内置官方价目），没命中价目的（台账官方账单、台账均价）记入规则默认币种。
 * 逐币种独立累加，不换算、不合计。
 */
export function costByCurrencyOf(days: AnnotatedDaySummary[], config: PricingConfig): MoneyByCurrency {
  const byCurrency: MoneyByCurrency = {}
  for (const day of days) {
    for (const model of day.models) {
      if (model.cost === 0) continue
      const currency = matchPricedRule(config.rules, model.provider, model.model)?.rule.currency ?? config.currency
      addMoney(byCurrency, currency, model.cost)
    }
  }
  return byCurrency
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

/** 本地日历月的首日：预算里的「月」是自然月，不是滚动 30 天。 */
function monthStartKey(date: Date): string {
  return dayKeyOf(date).slice(0, 8) + '01'
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

/** 计费规则来源（由 index.ts 注入；缺省表示没有规则，一切按台账反推均价）。 */
export interface PricingSource {
  current(): PricingView
}

export const noPricingSource: PricingSource = { current: () => EMPTY_PRICING_VIEW }

/** 预算阈值来源（由 index.ts 注入）；值不可信，一律经 `normalizeBudget` 兜底，缺省 = 未配置。 */
export interface BudgetSource {
  current(): unknown
}

export const noBudgetSource: BudgetSource = { current: () => undefined }

export function mountKeyUsageRoutes(
  webServer: WebServer,
  sessionSource: SessionSource = unavailableSessionSource,
  liveQuota: LiveQuotaService = disabledLiveQuota,
  hostServices: { get(name: string): unknown } = { get: () => undefined },
  pricingSource: PricingSource = noPricingSource,
  budgetSource: BudgetSource = noBudgetSource,
): void {
  const ledgerPath = join(dshHomePath(), 'dsh-usage', 'usage-ledger.json')
  const snapshotPath = join(dshHomePath(), 'dsh-usage', 'provider-snapshots.json')
  const titleSource = createTitleSource(join(dshHomePath(), 'storages', 'session_projcache.json'))
  const archiveSource = createArchiveSource(hostServices, join(dshHomePath(), 'storages', 'workspace.json'))
  const quotaSnapshotPath = join(dshHomePath(), 'dsh-key-usage', 'quota-snapshots.json')
  /** 会话标题与归档状态：宿主服务/缓存文件都拿不到时返回空集合，界面自行回落。 */
  const sessionMeta = (): SessionMetaOptions => ({ titles: titleSource.titles(), archived: archiveSource.archived() })

  const loadLedger = (): UsageLedger => readLedger(ledgerPath, (path) => {
    try { return readFileSync(path, 'utf8') } catch { return null }
  }) ?? EMPTY_LEDGER

  const readSnapshots = (): ProviderSnapshot[] => readProviderSnapshots(snapshotPath).providers

  /** 规则每次请求现取：用户在界面上改完立即生效，不需要重启宿主。 */
  const pricingView = (): PricingView => {
    try {
      return pricingSource.current()
    } catch {
      return EMPTY_PRICING_VIEW
    }
  }

  /** 阈值同样每次请求现取；设置服务缺失 / 值非法 / 取不到一律当未配置，这个端点绝不因此报错。 */
  const budgetThresholds = (): BudgetThresholds => {
    try {
      return normalizeBudget(budgetSource.current())
    } catch {
      return EMPTY_BUDGET
    }
  }

  const averagePriceOf = (priceTable: Map<string, PriceEntry>) =>
    (row: PricingUsageRow): number | null =>
      estimateCost([{ provider: row.provider, model: row.model, tokens: displayTokensOf(row) }], priceTable)

  /**
   * 给合并序列补成本与来源：台账天保留官方成本（official，不重算），
   * 会话补位天逐模型按规则估算，规则没命中再回落台账均价。
   * @param offPeakHours - 单日范围才有的小时槽；给了就按错峰占比加权
   */
  const annotateCosts = (
    days: ChannelDailySummary[],
    sessionDates: string[],
    priceTable: Map<string, PriceEntry>,
    offPeakHours: PricingUsageRow[] | null,
  ): AnnotatedDaySummary[] => {
    const sessionSet = new Set(sessionDates)
    const view = pricingView()
    return days.map((day) => {
      if (!sessionSet.has(day.date)) {
        // 台账天带官方账单金额：原样保留，不按规则重算
        return {
          ...day,
          costSource: 'official' as CostSource,
          models: day.models.map((model) => ({ ...model, costSource: 'official' as CostSource })),
        }
      }
      const models = day.models.map((model) => {
        const row = dayModelPricingRow(model)
        const priced = priceRowsByRules([row], view.config, { hours: offPeakHours })[0]
        const fallback = estimateCost([{ provider: model.provider, model: model.model, tokens: displayTokensOf(row) }], priceTable)
        const cost = priced.cost ?? fallback ?? 0
        const source: CostSource = priced.cost !== null ? priced.source : fallback !== null ? 'estimate' : 'none'
        return { ...model, cost: Math.round(cost * 100) / 100, costSource: source }
      })
      return {
        ...day,
        cost: Math.round(models.reduce((total, model) => total + model.cost, 0) * 100) / 100,
        costSource: weakestSource(models.map((model) => model.costSource)),
        models,
      }
    })
  }

  const loadChannels = (live: Map<string, LiveQuota> = new Map()): ChannelInfo[] => {
    // cordis.yml 是应用按需重写的组合产物：插件集变化期间会短暂变成空模板，
    // 因此先读它，取不到再回退到用户 patch 层 cordis.patch.yml。
    // 两个文件都含 !!js 表达式，只做文本提取，不执行任何表达式。
    const profileDir = join(dshHomePath(), 'profiles', 'desktop')
    const snapshots = mergeLiveSnapshots(readSnapshots(), live)
    const composed = readTextFile(join(profileDir, 'cordis.yml'))
    if (composed !== null) {
      const channels = classifyChannels(extractChannels(composed), snapshots)
      if (channels.length > 0) return channels
    }
    const patch = readTextFile(join(profileDir, 'cordis.patch.yml'))
    return patch === null ? [] : classifyChannels(extractChannels(patch), snapshots)
  }

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/channels',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      // 只用缓存：状态判定不该为了一次刷新去等网络，实时结果由 /quota 预热
      sendJson(response, 200, { channels: loadChannels(liveQuota.cached()).map(channelPayload) })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/usage',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const ledger = loadLedger()
      const collection = await sessionSource.collect()
      const knownProviders = loadChannels().map((channel) => channel.provider)
      const dayKeys = Object.keys(ledger.days).sort()
      const providerParam = url.searchParams.get('provider')
      const providerFilter = providerParam !== null && providerParam !== '' ? providerParam.split(',').filter(Boolean) : null
      const sessionRows = sessionDayRows(collection.records, knownProviders)
        .filter((row) => providerFilter === null || providerFilter.includes(row.provider))
      const sessionDates = [...new Set(sessionRows.map((row) => row.date))].sort()
      const availableFrom = minKey(dayKeys[0], sessionDates[0])
      const availableTo = maxKey(dayKeys[dayKeys.length - 1], sessionDates[sessionDates.length - 1])
      const from = url.searchParams.get('from') ?? availableFrom ?? ''
      const to = url.searchParams.get('to') ?? availableTo ?? ''
      const ledgerResult = aggregateRange(ledger, from, to, providerFilter)
      const merged = mergeDailySeries(ledgerResult.days, sessionRows, from, to)
      // 单日范围才提供小时细分（来自会话事件，口径与台账不同，见页脚口径说明）
      const hours = from !== '' && from === to ? hoursOfDate(collection.records, from) : null
      // 单日有小时槽时按错峰占比加权；跨天拿不到小时分布，只能按标准价（不猜折扣）
      const days = annotateCosts(merged.days, merged.sessionDates, buildPriceTable(ledger), hoursAsPricingRows(hours))
      const totals = days.length > 0 ? totalsOfMerged(days) : null
      sendJson(response, 200, {
        days,
        totals: totals === null ? null : { ...totals, costSource: weakestSource(days.map((day) => day.costSource)) },
        sessionDates: merged.sessionDates,
        availableFrom: availableFrom ?? null,
        availableTo: availableTo ?? null,
        hours,
      })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/heatmap',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const ledger = loadLedger()
      const collection = await sessionSource.collect()
      const knownProviders = loadChannels().map((channel) => channel.provider)
      const sessionRows = sessionDayRows(collection.records, knownProviders)
      const dayKeys = Object.keys(ledger.days).sort()
      const sessionDates = [...new Set(sessionRows.map((row) => row.date))].sort()
      const yearAgo = new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10)
      const earliest = minKey(dayKeys[0], sessionDates[0]) ?? yearAgo
      const from = earliest > yearAgo ? earliest : yearAgo
      const to = maxKey(dayKeys[dayKeys.length - 1], sessionDates[sessionDates.length - 1]) ?? from
      const merged = mergeDailySeries(aggregateRange(ledger, from, to, null).days, sessionRows, from, to)
      // 与「使用明细」同一口径：会话补位天按规则/均价估算，台账天保留官方成本
      const days = annotateCosts(merged.days, merged.sessionDates, buildPriceTable(ledger), null)
      sendJson(response, 200, {
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
      })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/quota',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const channels = loadChannels()
      // 打开「余额与配额」时才等网络：缓存过期就刷新一次，失败一律回落快照
      const live = url.searchParams.get('fresh') === '1'
        ? await liveQuota.refreshIfStale(channels, true)
        : await liveQuota.refreshIfStale(channels)
      // 实时成功立刻落一份自己的快照：下次失败时回落的是「最近一次成功」，而不是宿主那份十几天前的旧值
      const succeeded: QuotaSnapshotEntry[] = []
      for (const entry of live.values()) {
        if (!entry.ok) continue
        succeeded.push({
          provider: entry.provider,
          displayName: channels.find((channel) => channel.provider === entry.provider)?.displayName ?? null,
          updatedAt: entry.fetchedAt,
          balance: entry.balance,
          windows: entry.windows,
        })
      }
      writeQuotaSnapshots(quotaSnapshotPath, succeeded)
      const ownSnapshots = readQuotaSnapshots(quotaSnapshotPath)
      const snapshots = readSnapshots()
      const providers = channels.map((channel) => {
        const liveEntry = live.get(channel.provider)
        const supported = schemeIdOf(channel.provider) !== null
        if (liveEntry !== undefined && liveEntry.ok) {
          return {
            provider: channel.provider,
            displayName: channel.displayName,
            credential: channel.apiKeyEnv,
            supported,
            source: 'live',
            fetchedAt: liveEntry.fetchedAt,
            updatedAt: liveEntry.fetchedAt,
            error: null,
            balance: liveEntry.balance,
            plan: liveEntry.windows === null ? null : { windows: liveEntry.windows },
          }
        }
        // 回落顺序：自己的快照与宿主的快照里，取 updatedAt 更新的那一份
        const own = ownSnapshots.find((entry) => entry.provider === channel.provider) ?? null
        const host = snapshots.find((entry) => entry.provider === channel.provider) ?? null
        const useOwn = own !== null && (host === null || own.updatedAt >= (host.updatedAt ?? 0))
        const updatedAt = useOwn ? own.updatedAt : host?.updatedAt ?? null
        const fallbackBalance = useOwn ? own.balance : host?.balance ?? null
        const fallbackPlan = useOwn
          ? (own.windows === null ? null : { windows: own.windows })
          : host?.plan ?? null
        return {
          provider: channel.provider,
          displayName: host?.displayName ?? channel.displayName,
          credential: host?.credential ?? channel.apiKeyEnv,
          supported,
          source: 'snapshot',
          fetchedAt: null,
          updatedAt,
          // 实时失败的原因要透出（未配置凭据 / 网络 / 鉴权），界面据此提示
          error: liveEntry?.error ?? (updatedAt === null ? 'no-snapshot' : null),
          balance: fallbackBalance,
          plan: fallbackPlan,
        }
      })
      sendJson(response, 200, { providers })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/summary',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const today = dayKeyOf(new Date())
      const monthFrom = shiftedDayKey(-29)
      const ledger = loadLedger()
      const collection = await sessionSource.collect()
      const channels = loadChannels()
      const knownProviders = channels.map((channel) => channel.provider)
      const sessionRows = sessionDayRows(collection.records, knownProviders)
      const merged = mergeDailySeries(aggregateRange(ledger, monthFrom, today, null).days, sessionRows, monthFrom, today)
      // 总览的「今日 / 近 30 天」成本必须与使用明细同一口径，否则两页数字对不上
      const days = annotateCosts(merged.days, merged.sessionDates, buildPriceTable(ledger), null)
      const todaySummary = summarizeMergedByProvider(days, today, today)
      const monthSummary = summarizeMergedByProvider(days, monthFrom, today)
      const rows = channels.map((channel) => {
        const todayRow = todaySummary.find((row) => row.provider === channel.provider)
        const monthRow = monthSummary.find((row) => row.provider === channel.provider)
        return {
          provider: channel.provider,
          today: { ...todayRow ?? { provider: channel.provider, calls: 0, tokens: 0, cost: 0 }, costSource: sourceOfProvider(days, channel.provider, today, today) },
          month: { ...monthRow ?? { provider: channel.provider, calls: 0, tokens: 0, cost: 0 }, costSource: sourceOfProvider(days, channel.provider, monthFrom, today) },
        }
      })
      sendJson(response, 200, {
        channels: rows,
        range: { today, monthFrom },
        todaySource: merged.sessionDates.includes(today) ? 'session' : 'ledger',
        sessionDates: merged.sessionDates,
      })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/sessions',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const limit = parseLimit(url.searchParams.get('limit'), 200)
      const channels = loadChannels()
      const knownProviders = channels.map((channel) => channel.provider)
      const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]))
      const { records, coverage } = await sessionSource.collect()
      const ledger = loadLedger()
      const priceTable = buildPriceTable(ledger)
      const view = pricingView()
      const meta = sessionMeta()
      const rows = sessionRowsOf(records, knownProviders, meta).slice(0, limit).map((row) => {
        const costs = rowCostsOf(row.models.map(pricingRowOf), view.config, averagePriceOf(priceTable))
        return {
          ...row,
          providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
          costMode: row.provider === null ? null : costModeOf.get(row.provider) ?? null,
          cost: costs.length === 0 ? null : sumOrNull(costs),
          costSource: costs.length === 0 ? 'none' : weakestSource(costs.map((entry) => entry.source)),
          // 行内展开的模型构成：全量算成本（总额不受截断影响），只把长尾合并成「其它」
          models: cappedModelRows(row, costs),
        }
      })
      sendJson(response, 200, { rows, coverage, priced: priceTable.size > 0 })
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
      const channels = loadChannels()
      const knownProviders = channels.map((channel) => channel.provider)
      const priceTable = buildPriceTable(loadLedger())
      const view = pricingView()
      const meta = sessionMeta()
      const detail = lookup.record === null
        // 降级时只有会话头字段，但投影缓存里的标题仍然可用，优先级与列表保持一致
        ? emptySessionDetail(
          lookup.id,
          (meta.titles ?? new Map<string, string>()).get(normalizeSessionId(lookup.id)) ?? lookup.title,
          lookup.workspace,
          (meta.archived ?? new Set<string>()).has(normalizeSessionId(lookup.id)),
        )
        : sessionDetailOf(lookup.record, knownProviders, meta)
      const costs = rowCostsOf(detail.models.map(pricingRowOf), view.config, averagePriceOf(priceTable))
      const models = detail.models.map((model, index) => ({
        ...model,
        providerLabel: channels.find((channel) => channel.provider === model.provider)?.displayName ?? model.provider,
        cost: costs[index]?.cost ?? null,
        costSource: costs[index]?.source ?? 'none',
      }))
      sendJson(response, 200, {
        session: {
          ...detail,
          models,
          providerLabel: detail.provider === null ? null : channels.find((channel) => channel.provider === detail.provider)?.displayName ?? detail.provider,
          costMode: detail.provider === null ? null : channels.find((channel) => channel.provider === detail.provider)?.costMode ?? null,
          cost: costs.length === 0 ? null : sumOrNull(costs),
          costSource: costs.length === 0 ? 'none' : weakestSource(costs.map((entry) => entry.source)),
        },
        coverage: {
          status: lookup.status === 'ok' ? 'complete' : lookup.status === 'degraded' ? 'partial' : 'unavailable',
          reason: lookup.reason,
        },
        priced: priceTable.size > 0,
      })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/projects',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const limit = parseLimit(url.searchParams.get('limit'), 200)
      const channels = loadChannels()
      const knownProviders = channels.map((channel) => channel.provider)
      const { records, coverage } = await sessionSource.collect()
      const priceTable = buildPriceTable(loadLedger())
      const view = pricingView()
      const rows = projectRowsOf(records, knownProviders, sessionMeta()).slice(0, limit).map((row) => {
        const costs = rowCostsOf(row.models.map(pricingRowOf), view.config, averagePriceOf(priceTable))
        return {
          ...row,
          dominantProvider: Object.entries(row.providers).sort((first, second) => second[1] - first[1])[0]?.[0] ?? null,
          cost: costs.length === 0 ? null : sumOrNull(costs),
          costSource: costs.length === 0 ? 'none' : weakestSource(costs.map((entry) => entry.source)),
        }
      })
      sendJson(response, 200, { rows, coverage, priced: priceTable.size > 0 })
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/models',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const limit = parseLimit(url.searchParams.get('limit'), 200)
      const channels = loadChannels()
      const knownProviders = channels.map((channel) => channel.provider)
      const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]))
      const { records, coverage } = await sessionSource.collect()
      const priceTable = buildPriceTable(loadLedger())
      const view = pricingView()
      const rows = modelRowsOf(records, knownProviders).slice(0, limit).map((row) => {
        const costs = rowCostsOf([pricingRowOf(row)], view.config, averagePriceOf(priceTable))
        return {
          ...row,
          providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
          costMode: costModeOf.get(row.provider) ?? null,
          // 与 /sessions 同一口径：用户规则优先，没命中再回落台账反推均价
          cost: sumOrNull(costs),
          costSource: costs[0]?.source ?? 'none',
        }
      })
      sendJson(response, 200, { rows, coverage, priced: priceTable.size > 0 })
    },
  })

  /**
   * 计费规则面板：服务端视角的规则、内置模板、设定来源，以及近 30 天的覆盖度与缓存省钱。
   * 规则本体由客户端经宿主设置服务读写，这里只提供「算出来是什么样」的对照。
   */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/pricing',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const view = pricingView()
      const ledger = loadLedger()
      const channels = loadChannels()
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
      const priceTable = buildPriceTable(ledger)
      const usageRows: PricingUsageRow[] = merged.days.flatMap((day) => day.models.map(dayModelPricingRow))
      const coverage = summarizeCoverage(usageRows, view.config, averagePriceOf(priceTable))
      const now = new Date()
      sendJson(response, 200, {
        rules: view.config.rules,
        currency: view.config.currency,
        writable: view.writable,
        revision: view.revision,
        templates: PRICING_TEMPLATES,
        // 内置官方价目：自动生效、无需套用模板；这里只透出「覆盖了哪些通道 / 来源 / 抓取日期」
        catalog: {
          entries: catalogEntryCount(),
          sources: catalogSources(),
        },
        offPeakNow: view.config.rules.map((rule) => isOffPeakNow(rule, now)),
        coverage: {
          from: monthFrom,
          to: today,
          ruleModels: coverage.ruleModels,
          catalogModels: coverage.catalogModels,
          averagedModels: coverage.averagedModels,
          unpricedModels: coverage.unpricedModels,
          // 只作参照：界面上的成本按「官方 > 规则 > 内置 > 均价」逐格取值，与这个总额不一定相等
          ruleCostByCurrency: coverage.costByCurrency,
          savingsByCurrency: coverage.savingsByCurrency,
          savingsDetail: coverage.savingsDetail,
        },
      })
    },
  })

  /**
   * 预算与告警：今日 / 本月用量对阈值，判定在 budget.ts（纯函数，可离线单测）。
   * 「日」「月」按本地日历日 / 日历月切分；用量与成本都走上面同一套台账 × 会话合并，
   * 否则预算里的数字会和总览、使用明细对不上。
   */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/budget',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const now = new Date()
      const today = dayKeyOf(now)
      const monthFrom = monthStartKey(now)
      const ledger = loadLedger()
      const collection = await sessionSource.collect()
      const knownProviders = loadChannels().map((channel) => channel.provider)
      const merged = mergeDailySeries(
        aggregateRange(ledger, monthFrom, today, null).days,
        sessionDayRows(collection.records, knownProviders),
        monthFrom,
        today,
      )
      const days = annotateCosts(merged.days, merged.sessionDates, buildPriceTable(ledger), null)
      const totals = totalsOfMerged(days)
      const usage: BudgetUsage = {
        todayTokens: displayTokensOn(days, today),
        monthTokens: totals.inputTokens + totals.outputTokens + totals.cacheReadTokens,
        monthCostByCurrency: costByCurrencyOf(days, pricingView().config),
      }
      const thresholds = budgetThresholds()
      sendJson(response, 200, {
        ...evaluateBudget(thresholds, usage),
        today: { date: today, tokens: usage.todayTokens },
        month: { from: monthFrom, to: today, tokens: usage.monthTokens, costByCurrency: usage.monthCostByCurrency },
        thresholds,
      })
    },
  })
}

/**
 * 把实时余额 / 窗口合并进快照数组，供通道状态判定（额度百分比、余额文案）使用。
 * 只覆盖查询成功的条目，失败条目保持快照原值。
 */
function mergeLiveSnapshots(snapshots: ProviderSnapshot[], live: Map<string, LiveQuota>): ProviderSnapshot[] {
  if (live.size === 0) return snapshots
  const byProvider = new Map(snapshots.map((entry) => [entry.provider, entry]))
  for (const [provider, result] of live) {
    if (!result.ok) continue
    const existing = byProvider.get(provider)
    byProvider.set(provider, {
      provider,
      displayName: existing?.displayName ?? null,
      credential: existing?.credential ?? null,
      updatedAt: result.fetchedAt,
      balance: result.balance ?? existing?.balance ?? null,
      plan: result.windows === null ? (existing?.plan ?? null) : { windows: result.windows },
    })
  }
  return [...byProvider.values()]
}

function minKey(first: string | undefined, second: string | undefined): string | undefined {  if (first === undefined) return second
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

function requireLoopback(request: IncomingMessage, response: ServerResponse): boolean {
  if (isLoopback(request)) return true
  sendJson(response, 403, { error: 'loopback only' })
  return false
}

function readTextFile(path: string): string | null {
  try { return readFileSync(path, 'utf8') } catch { return null }
}
