/**
 * `/usage` 的范围 / 筛选收口：逐日 / 逐模型合并、逐币种金额、最弱成本来源、通道与模型多选过滤。
 * 使用明细、概览、分布、会话四个 Tab 共用同一套口径（DetailTab 之外的调用方也从这里取）。
 */
import { rowMoneyViewOf, type CostRowLike } from './currency.ts'
import { selectionOf } from './filter-selection.ts'
import type { ChannelDailySummary, CostSource, ModelSummary, UsageResponse, UsageTotals } from './types.ts'

export const SOURCE_ORDER: Record<CostSource, number> = { official: 0, catalog: 1, aggregate: 2, model: 3, none: 4 }

/** 逐行金额：`costsByCurrency` 是逐币种小计，`cost` 只在没有小计时兜底。 */
export interface MoneyRow {
  cost: number
  costsByCurrency: Record<string, number>
}

export function moneyRowOf(row: { cost?: number | null; costsByCurrency?: Record<string, number> | null }): MoneyRow {
  const costsByCurrency: Record<string, number> = {}
  for (const [currency, amount] of Object.entries(row.costsByCurrency ?? {})) {
    if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) costsByCurrency[currency] = amount
  }
  return {
    cost: typeof row.cost === 'number' && Number.isFinite(row.cost) ? row.cost : 0,
    costsByCurrency,
  }
}

export function addMoneyInto(target: MoneyRow, source: MoneyRow): void {
  target.cost += source.cost
  for (const [currency, amount] of Object.entries(source.costsByCurrency)) {
    target.costsByCurrency[currency] = (target.costsByCurrency[currency] ?? 0) + amount
  }
}

/** 金额文本：没有价目依据（`none`）或金额为 0 时给 —，不拿 0 元冒充「免费」。 */
export function costTextOf(row: CostRowLike, source: CostSource | null): string {
  if (source === 'none') return '—'
  const view = rowMoneyViewOf(row)
  return view.amount > 0 ? view.text : '—'
}

/** 聚合行取最弱的成本来源。 */
export function weakSourceOf(sources: CostSource[]): CostSource | null {
  let weakest: CostSource | null = null
  for (const source of sources) {
    if (weakest === null || SOURCE_ORDER[source] > SOURCE_ORDER[weakest]) weakest = source
  }
  return weakest
}

/** 把若干模型桶并成一天：调用 / tokens 相加，金额按逐币种小计合并，来源取最弱那一格。 */
export function mergedDayOf(models: ModelSummary[], date: string, provider: string): ChannelDailySummary {
  const costsByCurrency: Record<string, number> = {}
  const sources: CostSource[] = []
  let calls = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  let reasoningTokens = 0
  let cost = 0
  let partial = false
  for (const model of models) {
    calls += model.calls
    inputTokens += model.inputTokens
    outputTokens += model.outputTokens
    cacheReadTokens += model.cacheReadTokens
    cacheWriteTokens += model.cacheWriteTokens
    reasoningTokens += model.reasoningTokens
    if (typeof model.cost === 'number' && Number.isFinite(model.cost)) cost += model.cost
    for (const [currency, amount] of Object.entries(model.costsByCurrency ?? {})) {
      if (typeof amount === 'number' && Number.isFinite(amount)) costsByCurrency[currency] = (costsByCurrency[currency] ?? 0) + amount
    }
    if (model.costSource !== undefined) sources.push(model.costSource)
    if (model.partial === true) partial = true
  }
  const costSource = weakSourceOf(sources)
  return {
    date,
    provider,
    calls,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens,
    cost,
    models,
    ...(Object.keys(costsByCurrency).length > 0 ? { costsByCurrency } : {}),
    ...(costSource === null ? {} : { costSource }),
    ...(partial ? { partial: true } : {}),
  }
}

/** 范围合计：由过滤后的逐日行相加；`cacheSaved` 无法从模型桶反推，不给（界面显示 —，不编）。 */
export function totalsOfDays(days: ChannelDailySummary[], date: string): UsageTotals {
  const costsByCurrency: Record<string, number> = {}
  const sources: CostSource[] = []
  let calls = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  let reasoningTokens = 0
  let cost = 0
  let partial = false
  for (const day of days) {
    calls += day.calls
    inputTokens += day.inputTokens
    outputTokens += day.outputTokens
    cacheReadTokens += day.cacheReadTokens
    cacheWriteTokens += day.cacheWriteTokens
    reasoningTokens += day.reasoningTokens
    cost += day.cost
    for (const [currency, amount] of Object.entries(day.costsByCurrency ?? {})) {
      if (typeof amount === 'number' && Number.isFinite(amount)) costsByCurrency[currency] = (costsByCurrency[currency] ?? 0) + amount
    }
    if (day.costSource !== undefined) sources.push(day.costSource)
    if (day.partial === true) partial = true
  }
  const costSource = weakSourceOf(sources)
  return {
    date,
    calls,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens,
    cost,
    ...(Object.keys(costsByCurrency).length > 0 ? { costsByCurrency } : {}),
    ...(costSource === null ? {} : { costSource }),
    ...(partial ? { partial: true } : {}),
  }
}

/** 多选筛选里「未归入工作区」项目的值：空串被 `selectionOf` 当成「全部」，所以用固定 sentinel 表示。 */
export const ORPHAN_PROJECT_VALUE = '__orphan__'

/**
 * 项目筛选的取值集合：未归入工作区的行（`workspace` 为空）用 sentinel，其余用 workspace + 覆盖目录。
 * 通道 / 模型 / 会话三个 Tab 都用它，保证同一个项目在各处命中同一批行。
 */
export function projectFilterValuesOf(workspace: string | null | undefined, paths: readonly string[] | undefined): string[] {
  const self = workspace === undefined || workspace === null || workspace === '' ? ORPHAN_PROJECT_VALUE : workspace
  return [self, ...(paths ?? [])]
}

/**
 * 按维度过滤 `/usage`：逐日只留命中的模型桶，当天合计与范围合计都按剩下的桶重算（口径一致）。
 * `hours`（按时段）没有模型 / 通道维度，保持原样、不二次聚合。
 */
function filterUsageOf(usage: UsageResponse | null | undefined, keep: (model: ModelSummary) => boolean): UsageResponse | null {
  const raw = usage ?? null
  if (raw === null) return null
  const days: ChannelDailySummary[] = []
  for (const day of raw.days) {
    const models = day.models.filter(keep)
    if (models.length === 0) continue
    days.push(mergedDayOf(models, day.date, day.provider))
  }
  return { ...raw, days, totals: days.length === 0 ? null : totalsOfDays(days, raw.totals?.date ?? '') }
}

/**
 * 按通道多选过滤（值存逗号分隔串，空串 = 全部；通道维度只在模型桶的 `provider` 上）。
 * 页头把整段选中的通道一起下发，服务端 `/usage` 固定取全量，过滤在客户端做。
 */
export function filterUsageByChannels(usage: UsageResponse | null | undefined, channelFilter: string | undefined): UsageResponse | null {
  const raw = usage ?? null
  const selected = selectionOf(channelFilter)
  if (raw === null || selected.length === 0) return raw
  return filterUsageOf(raw, (model) => selected.includes(model.provider))
}

/** 按模型多选过滤（值同上）；多个模型先合并回逐日行再算，合计 / 图表 / 环比一起重算。 */
export function filterUsageByModel(usage: UsageResponse | null | undefined, modelFilter: string | undefined): UsageResponse | null {
  const raw = usage ?? null
  const selected = selectionOf(modelFilter)
  if (raw === null || selected.length === 0) return raw
  return filterUsageOf(raw, (model) => selected.includes(model.model))
}
