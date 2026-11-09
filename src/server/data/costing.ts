/**
 * 统一成本核算：一条用量样本 = 一个「天 × 通道 × 模型」格。
 *
 * 为什么单独一层：以前明细按逐日错峰、分布/会话/模型按高峰价，同一批 token 在两张页面能差一倍；
 * 这里把「按天 + 按模型 + 当天小时曲线」当成唯一输入，所有页面都从这个索引取金额。
 *
 * 金额单位与币种跟着命中的价目走（不做汇率换算），内部保留 6 位小数，展示层再收成两位。
 */
import { hoursByDateOf, type SessionUsageRecord } from './sessions.js'
import { attributeModelKey } from './session-usage.js'
import {
  costsByCurrencyOf,
  isoDayOf,
  priceRowsOf,
  weakestOf,
  type CostSource,
  type MoneyByCurrency,
  type PricingUsageRow,
} from '../pricing/pricing.js'

/** 一个「天 × 模型」格的定价结果；`cost === null` 表示没有价目依据。 */
export interface PricedCell {
  date: string
  provider: string
  model: string
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  /** 展示口径 tokens（输入 + 输出 + 缓存读，不含缓存写）。 */
  tokens: number
  cost: number | null
  currency: string | null
  source: CostSource
  partial: boolean
  cacheSavings: number
  /** 该格没有价目依据的 tokens（有依据时为 0）。 */
  unpricedTokens: number
  /** 该格来自订阅制通道（金额是按量价估算的）。 */
  subEstimate: boolean
}

export interface CostTally {
  /** 逐币种小计（内部 6 位小数）。 */
  costsByCurrency: MoneyByCurrency
  /** 各币种直接相加的兜底数值（语义仅用于兼容旧字段）。 */
  cost: number | null
  source: CostSource
  partial: boolean
  cacheSavings: number
  cacheSavingsByCurrency: MoneyByCurrency
  /** 没有价目依据的 tokens 合计。 */
  unpricedTokens: number
  /** 金额里包含订阅制通道的按量估算。 */
  subEstimate: boolean
  /** 已定价的 tokens（用于「部分未计价」占比）。 */
  pricedTokens: number
}

const ROUND_UNIT = 1e6
const round6 = (value: number): number => Math.round(value * ROUND_UNIT) / ROUND_UNIT

export const emptyTally = (): CostTally => ({
  costsByCurrency: {},
  cost: null,
  source: 'none',
  partial: false,
  cacheSavings: 0,
  cacheSavingsByCurrency: {},
  unpricedTokens: 0,
  subEstimate: false,
  pricedTokens: 0,
})

/** 把若干格合成一组金额；`cost` 仍是混币种相加的旧字段，展示走 `costsByCurrency`。 */
export function tallyOf(cells: Iterable<PricedCell>): CostTally {
  const sources: CostSource[] = []
  let mixedCost: number | null = null
  let partial = false
  let cacheSavings = 0
  let unpricedTokens = 0
  let subEstimate = false
  let pricedTokens = 0
  const costsByCurrency: MoneyByCurrency = {}
  const savingsByCurrency: MoneyByCurrency = {}
  for (const cell of cells) {
    sources.push(cell.source)
    if (cell.cost === null || cell.currency === null) {
      unpricedTokens += cell.unpricedTokens > 0 ? cell.unpricedTokens : cell.tokens
      continue
    }
    costsByCurrency[cell.currency] = round6((costsByCurrency[cell.currency] ?? 0) + cell.cost)
    mixedCost = round6((mixedCost ?? 0) + cell.cost)
    if (cell.cacheSavings > 0) {
      cacheSavings = round6(cacheSavings + cell.cacheSavings)
      savingsByCurrency[cell.currency] = round6((savingsByCurrency[cell.currency] ?? 0) + cell.cacheSavings)
    }
    if (cell.partial) partial = true
    if (cell.subEstimate) subEstimate = true
    pricedTokens += cell.tokens
  }
  const source = sources.length === 0 ? 'none' : sources.reduce(weakestOf, sources[0])
  return {
    costsByCurrency,
    cost: mixedCost,
    source: unpricedTokens > 0 ? weakestOf(source, 'none') : source,
    partial,
    cacheSavings,
    cacheSavingsByCurrency: savingsByCurrency,
    unpricedTokens,
    subEstimate,
    pricedTokens,
  }
}

/** 单格定价：当天 24 小时曲线优先用「该模型自己的」曲线，老数据缺分模型曲线时退回当天整体曲线。 */
function priceCell(
  rows: { date: string; hourRows: PricingUsageRow[] | null; model: PricingUsageRow },
): { cost: number | null; currency: string | null; source: CostSource; partial: boolean; cacheSavings: number } {
  const day = isoDayOf(new Date(rows.date + 'T12:00:00'))
  const priced = priceRowsOf([rows.model], { hours: rows.hourRows, hoursDay: day })[0]
  return {
    cost: priced.cost === null ? null : round6(priced.cost),
    currency: priced.rule === null ? null : priced.rule.currency,
    source: priced.source,
    partial: priced.partial,
    cacheSavings: priced.cacheSavings,
  }
}

const EMPTY_PRICING_ROW = (): PricingUsageRow => ({
  provider: '', model: '', calls: 0, tokens: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
})

interface ModelHourBucket {
  calls: number
  tokens: number
  buckets: Record<string, number>
}

/** 从当天 24 个槽里抽出某个模型的曲线；该模型没有分时数据时返回 null。 */
function modelHourRowsOf(
  day: SessionUsageRecord['summary']['days'][number],
  rawKey: string,
): PricingUsageRow[] | null {
  const rows: PricingUsageRow[] = Array.from({ length: 24 }, EMPTY_PRICING_ROW)
  let found = false
  for (let hour = 0; hour < 24; hour += 1) {
    const slot = day.hours[hour]
    if (slot === undefined || slot.models === undefined) continue
    const bucket: ModelHourBucket | undefined = slot.models.find((entry) => (entry as { key?: string }).key === rawKey) as ModelHourBucket | undefined
    if (bucket === undefined) continue
    found = true
    rows[hour] = {
      provider: '',
      model: '',
      calls: bucket.calls,
      tokens: bucket.tokens,
      inputTokens: bucket.buckets.inputTokens ?? 0,
      outputTokens: bucket.buckets.outputTokens ?? 0,
      cacheReadTokens: bucket.buckets.cacheReadTokens ?? 0,
      cacheWriteTokens: bucket.buckets.cacheWriteTokens ?? 0,
    }
  }
  return found ? rows : null
}

/** 当天整体曲线（所有模型合计），老数据没有分模型小时桶时用它做错峰占比。 */
function dayHourRowsOf(day: SessionUsageRecord['summary']['days'][number]): PricingUsageRow[] | null {
  const rows: PricingUsageRow[] = Array.from({ length: 24 }, EMPTY_PRICING_ROW)
  let found = false
  for (let hour = 0; hour < 24; hour += 1) {
    const slot = day.hours[hour]
    if (slot === undefined || slot.calls === 0) continue
    found = true
    rows[hour] = {
      provider: '',
      model: '',
      calls: slot.calls,
      tokens: slot.buckets.inputTokens + slot.buckets.outputTokens + slot.buckets.cacheReadTokens,
      inputTokens: slot.buckets.inputTokens,
      outputTokens: slot.buckets.outputTokens,
      cacheReadTokens: slot.buckets.cacheReadTokens,
      cacheWriteTokens: slot.buckets.cacheWriteTokens,
    }
  }
  return found ? rows : null
}

export interface CostIndex {
  /** 全部格（按记录、日期顺序）。 */
  cells: PricedCell[]
  /** 记录 id → 该会话的全部格。 */
  byRecord: Map<string, PricedCell[]>
  /** 日期 → 该日全部格。 */
  byDate: Map<string, PricedCell[]>
  /** `日期|provider|model` → 格（明细按天取金额用）。 */
  byDateModel: Map<string, PricedCell>
  /** 会话 id → 工作目录（够过滤项目维度）。 */
  workspaceOf: Map<string, string | null>
}

/**
 * 建索引：每条会话的每一天、每个模型各算一次，错峰按「那一天的星期几 + 该模型当天的小时曲线」加权。
 * @param costModeOf - 通道 → 计费模式（订阅制的金额要标「订阅制估算」）
 */
export function buildCostIndex(
  records: SessionUsageRecord[],
  knownProviders: string[],
  costModeOf: ReadonlyMap<string, string>,
): CostIndex {
  const cells: PricedCell[] = []
  const byRecord = new Map<string, PricedCell[]>()
  const byDate = new Map<string, PricedCell[]>()
  const byDateModel = new Map<string, PricedCell>()
  const workspaceOf = new Map<string, string | null>()
  for (const record of records) {
    workspaceOf.set(record.id, record.workspace)
    const recordCells: PricedCell[] = []
    for (const day of record.summary.days) {
      const fallbackHours = dayHourRowsOf(day)
      for (const model of day.models) {
        const attribution = attributeModelKey(model.key, knownProviders)
        const row: PricingUsageRow = {
          provider: attribution.provider,
          model: attribution.model,
          calls: model.calls,
          tokens: model.tokens,
          inputTokens: model.buckets.inputTokens,
          outputTokens: model.buckets.outputTokens,
          cacheReadTokens: model.buckets.cacheReadTokens,
          cacheWriteTokens: model.buckets.cacheWriteTokens,
        }
        const priced = priceCell({ date: day.date, hourRows: modelHourRowsOf(day, model.key) ?? fallbackHours, model: row })
        const tokens = (row.inputTokens ?? 0) + (row.outputTokens ?? 0) + (row.cacheReadTokens ?? 0)
        const cell: PricedCell = {
          date: day.date,
          provider: attribution.provider,
          model: attribution.model,
          calls: model.calls,
          inputTokens: row.inputTokens ?? 0,
          outputTokens: row.outputTokens ?? 0,
          cacheReadTokens: row.cacheReadTokens ?? 0,
          cacheWriteTokens: row.cacheWriteTokens ?? 0,
          tokens,
          cost: priced.cost,
          currency: priced.currency,
          source: priced.source,
          partial: priced.partial,
          cacheSavings: priced.cacheSavings,
          unpricedTokens: priced.cost === null ? tokens : 0,
          subEstimate: priced.cost !== null && costModeOf.get(attribution.provider) === 'sub',
        }
        cells.push(cell)
        recordCells.push(cell)
        byDateModel.set(cell.date + '|' + cell.provider + '|' + cell.model, cell)
        const forDate = byDate.get(cell.date)
        if (forDate === undefined) byDate.set(cell.date, [cell])
        else forDate.push(cell)
      }
    }
    byRecord.set(record.id, recordCells)
  }
  return { cells, byRecord, byDate, byDateModel, workspaceOf }
}

/** 只保留符合通道 / 模型 / 项目筛选的格。 */
export function filterCells(
  cells: Iterable<PricedCell>,
  filters: { providers?: ReadonlySet<string>; models?: ReadonlySet<string>; workspaceOf?: Map<string, string | null>; projects?: ReadonlySet<string> } = {},
): PricedCell[] {
  const kept: PricedCell[] = []
  for (const cell of cells) {
    if (filters.providers !== undefined && !filters.providers.has(cell.provider)) continue
    if (filters.models !== undefined && !filters.models.has(cell.model)) continue
    kept.push(cell)
  }
  return kept
}

/** 项目维度过滤：只保留属于选定工作区的会话的格。 */
export function cellsOfRecords(
  index: CostIndex,
  recordIds: Iterable<string>,
  filters: { providers?: ReadonlySet<string>; models?: ReadonlySet<string> } = {},
): PricedCell[] {
  const kept: PricedCell[] = []
  for (const id of recordIds) {
    const cells = index.byRecord.get(id)
    if (cells === undefined) continue
    for (const cell of cells) {
      if (filters.providers !== undefined && !filters.providers.has(cell.provider)) continue
      if (filters.models !== undefined && !filters.models.has(cell.model)) continue
      kept.push(cell)
    }
  }
  return kept
}

export interface FilteredHourSlot {
  calls: number
  sessions: number
  buckets: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }
  models: Map<string, { calls: number; tokens: number; buckets: Record<string, number> }>
}

/**
 * 按通道 / 模型筛过的「日期 → 24 小时槽」：
 * 只有筛过的模型桶参与合计；没有筛选时直接复用 hoursByDateOf（少一次全量遍历）。
 */
export function hoursByDateFiltered(
  records: SessionUsageRecord[],
  knownProviders: string[],
  filter: { providers?: ReadonlySet<string> | null; models?: ReadonlySet<string> | null } = {},
): Map<string, FilteredHourSlot[]> {
  const providers = filter.providers ?? null
  const models = filter.models ?? null
  if (providers === null && models === null) {
    return hoursByDateOf(records) as unknown as Map<string, FilteredHourSlot[]>
  }
  const byDate = new Map<string, FilteredHourSlot[]>()
  const empty = (): FilteredHourSlot => ({
    calls: 0,
    sessions: 0,
    buckets: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    models: new Map(),
  })
  for (const record of records) {
    for (const day of record.summary.days) {
      let slots = byDate.get(day.date)
      if (slots === undefined) {
        slots = Array.from({ length: 24 }, empty)
        byDate.set(day.date, slots)
      }
      for (let hour = 0; hour < 24; hour += 1) {
        const source = day.hours[hour]
        if (source === undefined) continue
        const slot = slots[hour]
        let touched = false
        for (const model of source.models ?? []) {
          const attribution = attributeModelKey((model as { key: string }).key, knownProviders)
          if (providers !== null && !providers.has(attribution.provider)) continue
          if (models !== null && !models.has(attribution.model)) continue
          touched = true
          const bucket = model.buckets
          slot.calls += model.calls
          slot.models.set(attribution.provider + '|' + attribution.model, { calls: model.calls, tokens: model.tokens, buckets: { ...bucket } })
          slot.buckets.inputTokens += bucket.inputTokens ?? 0
          slot.buckets.outputTokens += bucket.outputTokens ?? 0
          slot.buckets.cacheReadTokens += bucket.cacheReadTokens ?? 0
          slot.buckets.cacheWriteTokens += bucket.cacheWriteTokens ?? 0
        }
        if (touched) slot.sessions += 1
      }
    }
  }
  return byDate
}

export { costsByCurrencyOf, round6, weakestOf }
