/**
 * 计费口径（纯函数，可离线单测）：单价匹配「通道内价目 → 模型官方价目（跨通道同名唯一命中）」，
 * 两层都不命中就是**无依据**（不按台账反推均价猜一个数字），以及错峰判定、单位换算与缓存省钱。
 * 币种按价目原样记（CNY / USD），不做汇率换算；跨币种展示由客户端按 `costsByCurrency` 折算。
 */
import { catalogProvidersOfModel, catalogRuleFor } from './pricing-catalog.js'
import { aggregateRuleFor, recordAggregateAmbiguous } from './model-prices.js'

export type PricingUnit = 'perMillionTokens' | 'perThousandTokens' | 'perCall'

/**
 * 成本来源：官方账单 / 内置官方价目（本通道命中）/ 聚合价目（本通道别名命中）/
 * 同模型官方价目（跨通道同名唯一命中，含「按内置价目的厂商兜底」）/ 无依据。
 */
export type CostSource = 'official' | 'catalog' | 'aggregate' | 'model' | 'none'

/** 命中的价目层：内置官方价目 / 聚合价目（通道别名）/ 同模型官方价目（跨通道唯一）。 */
export type PricingRuleSource = 'catalog' | 'aggregate' | 'model'

export interface OffPeakWindow {
  /** 本地时间 `HH:MM`（`to` < `from` 表示跨午夜，`24:00` 表示当天末尾）。 */
  from: string
  to: string
  /**
   * 该窗口只在哪些星期生效，ISO 编号 1=周一 … 7=周日；**缺省 = 每天都适用**。
   * 缺省必须是「每天」：错峰窗口是官方文档的原始口径，语义不能变。
   */
  days?: number[]
}

export interface PricingRates {
  input: number
  cacheRead: number
  cacheWrite: number
  output: number
}

export interface OffPeakPricing extends PricingRates {
  /** 错峰时段（本地时间）。多个窗口取并集。 */
  windows: OffPeakWindow[]
}

export interface PricingRule extends PricingRates {
  /** 通道 id（价目声明的那一侧，不是查询里的事件通道名）。 */
  provider: string
  /** 模型 id；`*` 表示该通道兜底（只有官方文档给出通道统一价时才会存在）。 */
  model: string
  unit: PricingUnit
  currency: string
  offPeak: OffPeakPricing | null
  note: string
  /** 英文口径说明（英文模式渲染用） */
  noteEn?: string
}

/** 待计费的一行用量；分桶缺失时用 `tokens` 按输入价兜底。 */
export interface PricingUsageRow {
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  calls?: number
  /** 展示口径 tokens（输入 + 输出 + 缓存读）；给了就不再按分桶相加。 */
  tokens?: number
}

export interface PricedRow {
  cost: number | null
  /** 命中的价目层；`none` = 两层都没命中（由调用方回落台账均价）。 */
  source: PricingRuleSource | 'none'
  rule: PricingRule | null
  /** 相邻时间窗内该价目是否处于错峰（`at` 以参数传入时才有意义）。 */
  offPeak: boolean
  /** 命中的聚合价目缺一档缓存价、已按未命中价代（界面标「部分」）。 */
  partial: boolean
  /** 该行因缓存命中而少付的钱（未命中价 − 命中价）；无价目或按次计费时为 0。 */
  cacheSavings: number
}

export const PRICING_UNITS: PricingUnit[] = ['perMillionTokens', 'perThousandTokens', 'perCall']

const UNIT_FACTORS: Record<PricingUnit, number> = {
  perMillionTokens: 1e-6,
  perThousandTokens: 1e-3,
  // 按次计费与 token 数无关，单价字段直接用「输入」档当每次调用价
  perCall: 0,
}

export const UNIT_LABELS: Record<PricingUnit, string> = {
  perMillionTokens: '每百万 tokens',
  perThousandTokens: '每千 tokens',
  perCall: '每次调用',
}

/** 成本来源强弱序：数字越大越弱（官方账单最可信，无依据最弱）。 */
export const SOURCE_RANK: Record<CostSource, number> = { official: 0, catalog: 1, aggregate: 2, model: 3, none: 4 }

/** 两个来源取更弱的那个：整批金额的来源由最弱的一格决定（宁可标弱，也不把估算冒充成官方价）。 */
export function weakestOf(current: CostSource, candidate: CostSource): CostSource {
  return SOURCE_RANK[candidate] > SOURCE_RANK[current] ? candidate : current
}

/** 一个可计费文件的读取状态（存在性 + 条数 + 路径），界面据此显示「文件在哪 / 读到了几条」。 */
export interface PricingFileInfo {
  path: string
  exists: boolean
  entries: number
}

/** 价目文件的解析问题（1 基行号；拿不到行号时为 null）。内置价目是唯一还会报 issue 的文件。 */
export interface PricingIssue {
  file: 'catalog'
  line: number | null
  message: string
}

/**
 * 设置服务里的 volatile 字段是 `{ get() }` 引用而不是裸值；
 * 框架用 `updateVolatile` 原地换内容，所以每次现取即是最新值（旧版 config 形状仍要兼容）。
 */
export function unwrapSettingValue(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && typeof (value as { get?: unknown }).get === 'function') {
    return (value as { get(): unknown }).get()
  }
  return value
}

/**
 * 旧版 entry config 的兼容读法：宿主设置服务当年给的是**命名空间根对象**
 * （`{ pricing: … }`，见宿主 dsh-settings 的 `projectForm(form, plainConfig(config))`），
 * 字段在它下面。没有该键时（直传一段值、或配置里本来就只有这一段）就用整份值，两种形状都能读。
 */
export function settingsSectionOf(raw: unknown, key: string): unknown {
  const value = unwrapSettingValue(raw)
  if (value === null || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  return key in record ? record[key] : value
}

/**
 * `days` 归一：只接受 1–7 的整数并去重排序。
 * 非法值（空数组 / 越界 / 非整数 / 非数组）一律**返回 undefined = 每天适用**：
 * 这些值只会来自手改价目文件，把整段错峰作废会让金额突然变高，
 * 而「每天适用」正是缺省语义，最保守也最接近官方口径（不静默改变已有行为）。
 */
export function normalizeDays(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const days = new Set<number>()
  for (const entry of raw) {
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 1 || entry > 7) continue
    days.add(entry)
  }
  if (days.size === 0) return undefined
  return [...days].sort((first, second) => first - second)
}

/** `HH:MM` → 当天分钟数；`24:00` 归一为 1440。无法解析返回 null。 */
export function clockMinutes(text: unknown): number | null {
  if (typeof text !== 'string') return null
  const match = text.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (match === null) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (minutes > 59) return null
  if (hours === 24) return minutes === 0 ? 1440 : null
  if (hours > 23) return null
  return hours * 60 + minutes
}

/**
 * 找一条可用于该行（通道 + 模型）的价目，两层，顺序固定：
 * 1. **通道内价目**：内置官方价目（CNY / USD，随包）→ LiteLLM 聚合价按**通道别名**命中；
 * 2. **同模型官方价目**：本通道没有时，用该模型名在全库**唯一**命中的那条（LiteLLM 聚合价里
 *    多半就是模型厂商自己的官方价，如 `opencode` + `deepseek-flash` → DeepSeek 官方价）；
 *    同名候选来自多个厂商、定不了是哪一个时，再看内置价目里**同名的模型属于哪个厂商**
 *    （`glm-5.3-flash` → `zai`），以该厂商为通道再查一次 —— 拿到的就是厂商自己的那条键；
 * 3. 都命不中返回 null —— 调用方按「无依据」处理，**不许**用台账反推均价猜一个数字。
 */
export function matchPricedRule(provider: string, model: string): PricedRuleHit | null {
  const catalogRule = catalogRuleFor(provider, model)
  if (catalogRule !== null) return { rule: catalogRule, source: 'catalog', partial: false }
  const aggregate = safeAggregateRule(provider, model)
  if (aggregate !== null && aggregate.ok) return aggregateHitOf(aggregate.hit)
  // 歧义兜底：内置价目知道这个模型名的厂商（同名同型号条目），就用厂商自己的价目 ——
  // 先看内置价目里厂商自己那条（随包、带出处，如 `deepseek-official|deepseek-v4.1-flash`），
  // 再看聚合价里以该厂商为通道查到的键。这一档对外统一算「同模型官方价目」：对用户的通道来说
  // 它就是「本通道没有、用同名模型厂商的官方价」。多个厂商时按名字字典序取第一个（确定性）。
  for (const vendor of catalogProvidersOfModel(model)) {
    const vendorRule = catalogRuleFor(vendor, model)
    if (vendorRule !== null) return { rule: vendorRule, source: 'model', partial: false }
    const vendorHit = safeAggregateRule(vendor, model)
    if (vendorHit !== null && vendorHit.ok) {
      return { rule: vendorHit.hit.rule, source: 'model', partial: vendorHit.hit.partial }
    }
  }
  // 到这里才真的定不下来：记一条 issue 给面板解释「为什么这个模型没价」
  if (aggregate !== null && !aggregate.ok && aggregate.reason === 'ambiguous') {
    recordAggregateAmbiguous(provider, model, aggregate.candidates)
  }
  return null
}

/** 聚合价匹配：这一层坏掉只该让这一层失效，绝不能影响其它端点（上层已保证不抛错，这里再兜一次底）。 */
function safeAggregateRule(provider: string, model: string): ReturnType<typeof aggregateRuleFor> | null {
  try {
    return aggregateRuleFor(provider, model)
  } catch {
    return null
  }
}

/** `alias` = 该通道自己在聚合价里的条目；`unique` = 同名唯一（或同厂商同价多键）→ 算模型厂商的官方价目。 */
function aggregateHitOf(hit: { rule: PricingRule; source: 'alias' | 'unique'; partial: boolean }): PricedRuleHit {
  return { rule: hit.rule, source: hit.source === 'alias' ? 'aggregate' : 'model', partial: hit.partial }
}

export interface PricedRuleHit {
  rule: PricingRule
  source: PricingRuleSource
  /** 聚合价目只收录了一个缓存档，缺的那档按未命中价代。 */
  partial: boolean
}

/**
 * 一个时间点是否落在价目的错峰窗口内（按**本地时间**判断，跨午夜窗口取并集）。
 * 星期几也取本地时间，与时间判定保持同一口径。
 */
export function isOffPeakAt(rule: PricingRule, at: Date): boolean {
  if (rule.offPeak === null) return false
  return isOffPeakAtMinutes(rule, at.getHours() * 60 + at.getMinutes(), isoDayOf(at))
}

/** ISO 星期：1=周一 … 7=周日（`Date.getDay()` 的 0=周日 映射过来）。 */
export function isoDayOf(at: Date): number {
  const day = at.getDay()
  return day === 0 ? 7 : day
}

function isOffPeakAtMinutes(rule: PricingRule, minutes: number, day?: number): boolean {
  if (rule.offPeak === null) return false
  for (const window of rule.offPeak.windows) {
    // days 缺省或非法都当作「每天」；这里再归一一次，防住绕过解析器的调用方
    const days = normalizeDays(window.days)
    if (day !== undefined && days !== undefined && !days.includes(day)) continue
    const from = clockMinutes(window.from)
    const to = clockMinutes(window.to)
    if (from === null || to === null) continue
    // 起止相同视为「全天」：官方写 00:00–00:00 想表达的是一整天
    if (from === to) return true
    if (from < to) {
      if (minutes >= from && minutes < to) return true
    } else if (minutes >= from || minutes < to) {
      return true
    }
  }
  return false
}

/** 价目在某个时间点的生效单价；`at` 为 null（无法定位时间点）时按标准价，不猜折扣。 */
export function ratesAt(rule: PricingRule, at: Date | null): { rates: PricingRates; offPeak: boolean } {
  if (at === null || rule.offPeak === null || !isOffPeakAt(rule, at)) {
    return { rates: rule, offPeak: false }
  }
  return { rates: rule.offPeak, offPeak: true }
}

/** 展示口径 tokens：输入 + 输出 + 缓存读（不含 cacheWrite，与界面口径一致）。 */
export function displayTokensOf(row: PricingUsageRow): number {
  if (typeof row.tokens === 'number') return row.tokens
  return (row.inputTokens ?? 0) + (row.outputTokens ?? 0) + (row.cacheReadTokens ?? 0)
}

/** 一档单价下的金额：`perCall` 用「输入」档当每次调用价，token 数不参与。 */
export function costOfRowAtRates(row: PricingUsageRow, rule: PricingRule, rates: PricingRates): number {
  if (rule.unit === 'perCall') return (row.calls ?? 0) * rates.input
  const factor = UNIT_FACTORS[rule.unit]
  return ((row.inputTokens ?? 0) * rates.input
    + (row.cacheReadTokens ?? 0) * rates.cacheRead
    + (row.cacheWriteTokens ?? 0) * rates.cacheWrite
    + (row.outputTokens ?? 0) * rates.output) * factor
}

/**
 * 错峰权重：一天里落在错峰窗口内的 tokens 占比（按小时槽取样，小时粒度取该小时中点判定）。
 * 小时槽只有整天的分桶、没有「模型 × 小时」的拆分，所以这是近似值；调用方拿不到小时数据时按 0 处理。
 * `isoDay` 是该日的 ISO 星期（1=周一…7=周日）：**必须传**，否则「周末全天」这类带 `days` 的窗口
 * 会按「每天适用」命中，把工作日整天也算成错峰（会把单日成本整体打五折）。不传时按旧行为（每天适用）。
 */
export function offPeakTokenShare(rule: PricingRule, hours: PricingUsageRow[] | null, isoDay?: number): number {
  if (rule.offPeak === null || hours === null || hours.length === 0) return 0
  let total = 0
  let offPeak = 0
  for (let index = 0; index < hours.length; index += 1) {
    const tokens = displayTokensOf(hours[index])
    if (tokens <= 0) continue
    total += tokens
    if (isOffPeakAtMinutes(rule, index * 60 + 30, isoDay)) offPeak += tokens
  }
  return total > 0 ? offPeak / total : 0
}

/**
 * 按命中价目估算一组行的成本（内置官方价目 > 聚合价；两层都没命中时 cost 为 null）。
 * @param at - 时间点；null 表示这段用量跨了峰谷、无法定位，按标准价算（不猜折扣）
 * @param hours - 24 个小时槽（本地时间，索引即小时）；给了就按错峰占比加权
 * @param hoursDay - 这批小时槽所属日期的 ISO 星期（错峰窗口按星期区分，缺了会误判）
 */
export function priceRowsOf(
  rows: PricingUsageRow[],
  options: { at?: Date | null; hours?: PricingUsageRow[] | null; hoursDay?: number } = {},
): PricedRow[] {
  const at = options.at ?? null
  const sharedHours = options.hours ?? null
  const sharedHoursDay = options.hoursDay
  return rows.map((row) => {
    const matched = matchPricedRule(row.provider, row.model)
    if (matched === null) {
      return { cost: null, source: 'none', rule: null, offPeak: false, partial: false, cacheSavings: 0 }
    }
    const rule = matched.rule
    const standard = costOfRowAtRates(row, rule, rule)
    const share = rule.offPeak === null
      ? (at !== null && isOffPeakAt(rule, at) ? 1 : 0)
      : offPeakTokenShare(rule, sharedHours, sharedHoursDay)
    const offPeakCost = rule.offPeak === null ? standard : costOfRowAtRates(row, rule, rule.offPeak)
    const cost = standard * (1 - share) + offPeakCost * share
    return {
      cost,
      source: matched.source,
      rule,
      offPeak: share >= 1,
      partial: matched.partial,
      // 省下的钱 = 命中缓存的 tokens ×（未命中价 − 命中价），按要求只用标准价
      cacheSavings: rule.unit === 'perCall' ? 0 : (row.cacheReadTokens ?? 0) * (rule.input - rule.cacheRead) * UNIT_FACTORS[rule.unit],
    }
  })
}

export interface RowCost {
  cost: number | null
  source: CostSource
  rule: PricingRule | null
  /** 这一格的成本来自「部分收录」的聚合价目（缺一档缓存价，按未命中价代）。 */
  partial: boolean
  cacheSavings: number
  /** 命中价目时是价目币种，回落均价时是调用方给的台账币种；无金额时为 null。 */
  currency: string | null
}

/** 台账反推均价已整层移除：`AveragePrice` / `AveragePriceLookup` 与对应的回落逻辑不再存在。 */

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * 逐行定价：通道内价目 → 同模型官方价目；都不命中就是 `none`（金额为 null，界面显示 —）。
 * 不许用台账反推均价兜底：那是猜出来的数字，会被当成账单读。
 */
export function rowCostsOf(
  rows: PricingUsageRow[],
  options: { at?: Date | null; hours?: PricingUsageRow[] | null } = {},
): RowCost[] {
  const priced = priceRowsOf(rows, options)
  return rows.map((row, index) => {
    const hit = priced[index]
    if (hit.cost !== null && hit.rule !== null) {
      return {
        cost: round2(hit.cost),
        source: hit.source as CostSource,
        rule: hit.rule,
        partial: hit.partial,
        cacheSavings: hit.cacheSavings,
        currency: hit.rule.currency,
      }
    }
    return { cost: null, source: 'none', rule: null, partial: false, cacheSavings: 0, currency: null }
  })
}

/** 按币种分组累加：跨币种不换算、不合计（不同通道币种不同，混加没有意义）。 */
export type MoneyByCurrency = Record<string, number>

export function addMoney(target: MoneyByCurrency, currency: string, amount: number): MoneyByCurrency {
  target[currency] = round4((target[currency] ?? 0) + amount)
  return target
}

/**
 * 把一组金额格按币种分组（金额保留两位小数）。
 * 累加顺序与调用方算 `cost` 的顺序一致，因此**单币种时拆分值与 `cost` 完全相同**（只是同一个和的另一种写法）。
 * 金额为 null（无依据）的格子不参与；没有币种的格子直接跳过（宁可少一行小计，也不硬塞一个币种）。
 */
export function costsByCurrencyOf(cells: Array<{ cost: number | null; currency: string | null }>): MoneyByCurrency {
  const sums: MoneyByCurrency = {}
  for (const cell of cells) {
    if (cell.cost === null || cell.currency === null) continue
    sums[cell.currency] = (sums[cell.currency] ?? 0) + cell.cost
  }
  for (const currency of Object.keys(sums)) sums[currency] = round2(sums[currency])
  return sums
}

/** 合并子行的按币种金额（父行的小计）：单币种时同样等于父行 `cost`。 */
export function sumMoneyByCurrency(parts: MoneyByCurrency[]): MoneyByCurrency {
  const sums: MoneyByCurrency = {}
  for (const part of parts) {
    for (const [currency, amount] of Object.entries(part)) sums[currency] = (sums[currency] ?? 0) + amount
  }
  for (const currency of Object.keys(sums)) sums[currency] = round2(sums[currency])
  return sums
}

/**
 * 把父金额与它的按币种拆分对齐：单币种时拆分值直接取父金额（两者是同一个和，只是累加顺序不同
 * 会带来浮点尾差）；多币种或父金额为 null 时原样返回。保证「单币种时拆分值等于 cost」这条契约。
 */
export function alignMoneyWithCost(money: MoneyByCurrency, cost: number | null): MoneyByCurrency {
  const currencies = Object.keys(money)
  if (cost === null || currencies.length !== 1) return money
  return { [currencies[0]]: cost }
}

/** 覆盖度统计：按 `provider|model` 数出 内置价目 / 聚合价（别名）/ 同模型官方价目 / 无依据，并按币种分组累加金额与缓存省钱。 */
export function summarizeCoverage(
  rows: PricingUsageRow[],
): {
  catalogModels: number
  aggregateModels: number
  modelModels: number
  partialModels: number
  unpricedModels: number
  costByCurrency: MoneyByCurrency
  savingsByCurrency: MoneyByCurrency
  savingsDetail: Array<{ provider: string; model: string; currency: string; cacheReadTokens: number; amount: number }>
} {
  const costByCurrency: MoneyByCurrency = {}
  const savingsByCurrency: MoneyByCurrency = {}
  const savingsByModel = new Map<string, { provider: string; model: string; currency: string; cacheReadTokens: number; amount: number }>()
  const catalogKeys = new Set<string>()
  const aggregateKeys = new Set<string>()
  const modelKeys = new Set<string>()
  const partialKeys = new Set<string>()
  const unpricedKeys = new Set<string>()
  for (const row of rows) {
    const key = row.provider + '|' + row.model
    const priced = priceRowsOf([row])[0]
    if (priced.cost === null || priced.rule === null) {
      unpricedKeys.add(key)
      continue
    }
    if (priced.source === 'catalog') catalogKeys.add(key)
    else if (priced.source === 'aggregate') aggregateKeys.add(key)
    else modelKeys.add(key)
    if (priced.partial) partialKeys.add(key)
    addMoney(costByCurrency, priced.rule.currency, priced.cost)
    if (priced.cacheSavings <= 0) continue
    addMoney(savingsByCurrency, priced.rule.currency, priced.cacheSavings)
    const bucket = savingsByModel.get(key)
    if (bucket === undefined) {
      savingsByModel.set(key, {
        provider: row.provider,
        model: row.model,
        currency: priced.rule.currency,
        cacheReadTokens: row.cacheReadTokens ?? 0,
        amount: priced.cacheSavings,
      })
      continue
    }
    bucket.cacheReadTokens += row.cacheReadTokens ?? 0
    bucket.amount += priced.cacheSavings
  }
  const savingsDetail = [...savingsByModel.values()]
    .map((entry) => ({ ...entry, amount: round4(entry.amount) }))
    .sort((first, second) => second.amount - first.amount)
  return {
    catalogModels: catalogKeys.size,
    aggregateModels: aggregateKeys.size,
    modelModels: modelKeys.size,
    partialModels: partialKeys.size,
    unpricedModels: unpricedKeys.size,
    costByCurrency,
    savingsByCurrency,
    savingsDetail,
  }
}
