/**
 * HTTP 路由：12 个只读 `GET` + 1 个写 `POST`（价目刷新）；非本机回环一律 403。
 * 成本逐格取值：台账官方账单 > 内置价目 > 聚合价 > 台账反推均价 > 无依据（另有 `costSource` / `partial`
 * / `costsByCurrency` 三个并列字段）；台账缺的日期由会话事件补位（见 merge.ts）。
 * 外网只有三处、都由用户动作触发：余额查询（live-quota.ts）、价目刷新（model-prices.ts）、汇率（fx-rate.ts）。
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
  type AveragePrice,
  type CostSource,
  type MoneyByCurrency,
  type PricedRuleHit,
  type PricingUsageRow,
  type RowCost,
} from './pricing.js'
import {
  catalogCurrency,
  catalogEntryCount,
  catalogFileInfo,
  catalogIssues,
  catalogProviderCurrency,
  catalogRuleList,
  catalogSources,
} from './pricing-catalog.js'
import { aggregateStatus, refreshModelPrices } from './model-prices.js'
import { resolveFxRate } from './fx-rate.js'

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
    model: '其它',
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
 * 只回落均价 / 完全没依据时给出可读中文说明（不允许空 note）。
 */
function ratesNoteOf(hit: PricedRuleHit | null, average: AveragePrice | null): string {
  if (hit !== null) {
    const unitHint = hit.rule.unit === 'perMillionTokens' ? '' : '（计价单位：' + UNIT_LABELS[hit.rule.unit] + '）'
    return hit.rule.note + unitHint
  }
  if (average !== null) return '没有单价依据：按台账反推均价估算（金额为台账币种）'
  return '没有任何价格依据：内置价目与聚合价都没收录，台账里也没有该模型的成本'
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

function requireLoopback(request: IncomingMessage, response: ServerResponse): boolean {
  if (isLoopback(request)) return true
  sendJson(response, 403, { error: 'loopback only' })
  return false
}

function readTextFile(path: string): string | null {
  try { return readFileSync(path, 'utf8') } catch { return null }
}

export function mountKeyUsageRoutes(
  webServer: WebServer,
  sessionSource: SessionSource = unavailableSessionSource,
  liveQuota: LiveQuotaService = disabledLiveQuota,
  hostServices: { get(name: string): unknown } = { get: () => undefined },
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

  /**
   * 台账金额的币种：台账只记金额、不记币种（宿主 `usage-ledger.json` 没有 currency 字段），
   * 按该通道在内置价目里的币种推断（DeepSeek / Kimi → CNY，Z.ai / OpenRouter → USD），
   * 价目里没有这个通道时回落到价目基准币种 —— 这是**推断**而不是台账自带的事实，界面要注明。
   */
  const ledgerCurrencyOf = (provider: string): string => catalogProviderCurrency(provider) ?? catalogCurrency()

  const averagePriceOf = (priceTable: Map<string, PriceEntry>) =>
    (row: PricingUsageRow): AveragePrice | null => {
      const cost = estimateCost([{ provider: row.provider, model: row.model, tokens: displayTokensOf(row) }], priceTable)
      return cost === null ? null : { cost, currency: ledgerCurrencyOf(row.provider) }
    }

  /**
   * 给合并序列补成本与来源：台账天保留官方成本（official，不重算），
   * 会话补位天逐模型按价目估算，价目没命中再回落台账均价。
   * @param offPeakHours - 单日范围才有的小时槽；给了就按错峰占比加权
   */
  const annotateCosts = (
    days: ChannelDailySummary[],
    sessionDates: string[],
    priceTable: Map<string, PriceEntry>,
    offPeakHours: PricingUsageRow[] | null,
  ): AnnotatedDaySummary[] => {
    const sessionSet = new Set(sessionDates)
    const averageOf = averagePriceOf(priceTable)
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
        const average = averageOf(row)
        const cost = Math.round((priced.cost ?? average?.cost ?? 0) * 100) / 100
        const currency = priced.rule !== null ? priced.rule.currency : average?.currency ?? ledgerCurrencyOf(model.provider)
        const source: CostSource = priced.cost !== null ? priced.source : average !== null ? 'estimate' : 'none'
        return {
          ...model,
          cost,
          costSource: source,
          partial: priced.cost !== null ? priced.partial : false,
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
      const rawTotals = days.length > 0 ? totalsOfMerged(days) : null
      const totalsCost = rawTotals === null ? null : Math.round(rawTotals.cost * 100) / 100
      sendJson(response, 200, {
        days,
        totals: rawTotals === null ? null : {
          ...rawTotals,
          cost: totalsCost,
          costSource: weakestSource(days.map((day) => day.costSource)),
          partial: days.some((day) => day.partial),
          costsByCurrency: alignMoneyWithCost(sumMoneyByCurrency(days.map((day) => day.costsByCurrency)), totalsCost),
        },
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
      // 与「使用明细」同一口径：会话补位天按价目/均价估算，台账天保留官方成本
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
      const averageOf = averagePriceOf(priceTable)
      const meta = sessionMeta()
      const rows = sessionRowsOf(records, knownProviders, meta).slice(0, limit).map((row) => {
        const costs = rowCostsOf(row.models.map(pricingRowOf), averageOf)
        const cost = costs.length === 0 ? null : sumOrNull(costs)
        return {
          ...row,
          providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
          costMode: row.provider === null ? null : costModeOf.get(row.provider) ?? null,
          cost,
          // 无依据的行 cost 为 null，拆分里自然也是空的（0 元不是金额）
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
      const costs = rowCostsOf(detail.models.map(pricingRowOf), averagePriceOf(priceTable))
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
      const averageOf = averagePriceOf(priceTable)
      const rows = projectRowsOf(records, knownProviders, sessionMeta()).slice(0, limit).map((row) => {
        const costs = rowCostsOf(row.models.map(pricingRowOf), averageOf)
        const cost = costs.length === 0 ? null : sumOrNull(costs)
        return {
          ...row,
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
      const averageOf = averagePriceOf(priceTable)
      const rows = modelRowsOf(records, knownProviders).slice(0, limit).map((row) => {
        const costs = rowCostsOf([pricingRowOf(row)], averageOf)
        const cost = sumOrNull(costs)
        return {
          ...row,
          providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
          costMode: costModeOf.get(row.provider) ?? null,
          // 与 /sessions 同一口径：内置官方价目 → 聚合价 → 台账反推均价
          cost,
          costsByCurrency: alignMoneyWithCost(
            costsByCurrencyOf(costs.map((entry) => ({ cost: entry.cost, currency: entry.currency }))),
            cost,
          ),
          costSource: costs[0]?.source ?? 'none',
          partial: costs[0]?.partial === true,
        }
      })
      sendJson(response, 200, { rows, coverage, priced: priceTable.size > 0 })
    },
  })

  /**
   * 每通道单价表：`rates` 与成本计算走同一套匹配（catalog → aggregate），给的是**此刻生效**的单价
   * （错峰时是错峰价 + `offPeak: true`）；只有台账均价时标 `estimate`（`rates: null`），都没有标 `none`。
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
      const channels = loadChannels()
      const knownProviders = channels.map((channel) => channel.provider)
      const collection = await sessionSource.collect()
      const merged = mergeDailySeries(
        aggregateRange(ledger, from, today, null).days,
        sessionDayRows(collection.records, knownProviders),
        from,
        today,
      )
      const averageOf = averagePriceOf(buildPriceTable(ledger))
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
            const average = averageOf({ provider, model, tokens, ...usage })
            const effective = hit === null ? null : ratesAt(hit.rule, now)
            return {
              model,
              tokens,
              calls: usage.calls,
              source: hit !== null ? hit.source : average === null ? 'none' as const : 'estimate' as const,
              currency: hit !== null ? hit.rule.currency : average === null ? null : average.currency,
              partial: hit !== null && hit.partial,
              offPeak: effective !== null && effective.offPeak,
              rates: effective === null ? null : {
                input: effective.rates.input,
                cacheRead: effective.rates.cacheRead,
                cacheWrite: effective.rates.cacheWrite,
                output: effective.rates.output,
              },
              note: ratesNoteOf(hit, average),
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
      const usageRows: PricingUsageRow[] = merged.days.flatMap((day) => day.models.map(dayModelPricingRow))
      const coverage = summarizeCoverage(usageRows, averagePriceOf(buildPriceTable(ledger)))
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
          averagedModels: coverage.averagedModels,
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
}

/** 把实时余额 / 窗口并进快照数组（只覆盖成功的条目，其余保持原值），供通道状态判定用。 */
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
