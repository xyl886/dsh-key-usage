/**
 * 客户端计费规则视图模型：类型、文案、编辑器用的规则构造与导入解析。
 *
 * 规则本体存在宿主设置服务里（命名空间 = profile 条目 id），客户端只经 `configForms` 读写；
 * 定价算法在服务端（src/server/pricing.ts），界面不重复实现，只做展示与编辑。
 */

export type PricingUnit = 'perMillionTokens' | 'perThousandTokens' | 'perCall'

/** 成本来源角标：与服务端 `costSource` 字段一一对应。 */
export type CostSource = 'official' | 'rule' | 'catalog' | 'estimate' | 'none'

export interface OffPeakWindow {
  from: string
  to: string
  /** ISO 星期 1=周一 … 7=周日；缺省 = 每天都适用（与服务端同义）。 */
  days?: number[]
}

export interface PricingRates {
  input: number
  cacheRead: number
  cacheWrite: number
  output: number
}

export interface OffPeakPricing extends PricingRates {
  windows: OffPeakWindow[]
}

export interface PricingRule extends PricingRates {
  provider: string
  model: string
  unit: PricingUnit
  currency: string
  offPeak: OffPeakPricing | null
  note: string
}

export interface PricingConfig {
  version: number
  currency: string
  rules: PricingRule[]
}

export interface PricingTemplate {
  id: string
  label: string
  note: string
  rules: PricingRule[]
}

/** 内置官方价目的一个来源（计费面板展示「已内置 N 条，来源见 …」）。 */
export interface CatalogSourceSummary {
  source: string
  fetchedAt: string
  providers: string[]
  count: number
}

export interface PricingCoverage {
  from: string
  to: string
  ruleModels: number
  /** 命中内置官方价目的模型数（未配规则时自动生效的那一层）。 */
  catalogModels: number
  averagedModels: number
  unpricedModels: number
  /** 近 30 天按规则口径算出的金额（仅作参照，界面成本按「官方 > 规则 > 内置 > 均价」逐格取值）。 */
  ruleCostByCurrency: Record<string, number>
  savingsByCurrency: Record<string, number>
  savingsDetail: Array<{ provider: string; model: string; currency: string; cacheReadTokens: number; amount: number }>
}

export interface PricingResponse {
  rules: PricingRule[]
  currency: string
  /** 宿主设置服务是否可用：false 时只能导入 / 导出，保存会失败。 */
  writable: boolean
  revision: number | null
  templates: PricingTemplate[]
  /** 内置官方价目：条数 + 各来源（含抓取日期），无需用户套用即自动生效。 */
  catalog: { entries: number; sources: CatalogSourceSummary[] }
  /** 与 rules 等长：该条规则此刻是否处于错峰时段（按本地时间判定，服务端算）。 */
  offPeakNow: boolean[]
  coverage: PricingCoverage
}

export const COST_SOURCE_LABELS: Record<CostSource, string> = {
  official: '官方',
  rule: '自定',
  catalog: '官方价',
  estimate: '估算',
  none: '—',
}

/** 角标的悬浮说明：让「估算」不会被当成账单金额用。 */
export const COST_SOURCE_HINTS: Record<CostSource, string> = {
  official: '官方：台账记录的厂商账单金额',
  rule: '自定：按你维护的计费规则算出',
  catalog: '官方价：按插件内置的厂商官方价目算出（可查来源；你的规则优先于它）',
  estimate: '估算：按台账反推的均价推算',
  none: '没有价格依据（未配置规则，台账也无成本数据）',
}

export const UNIT_LABELS: Record<PricingUnit, string> = {
  perMillionTokens: '每百万 tokens',
  perThousandTokens: '每千 tokens',
  perCall: '每次调用',
}

export const UNIT_OPTIONS: PricingUnit[] = ['perMillionTokens', 'perThousandTokens', 'perCall']
export const CURRENCY_OPTIONS = ['CNY', 'USD']

export const EMPTY_CONFIG: PricingConfig = { version: 1, currency: 'CNY', rules: [] }

/** 币种符号；未知币种保留代码前缀，避免把 USD 当 CNY 渲染。 */
export function currencySymbolOf(currency: string): string {
  if (currency === 'CNY') return '¥'
  if (currency === 'USD') return '$'
  return currency + ' '
}

/** 金额一律两位小数；服务端给的 4 位是计算精度，不是展示精度。 */
const AMOUNT_DIGITS = 2

/** 金额文本：币种符号 + 两位小数（规则面板与预算都用它，避免两处精度不一致）。 */
export function moneyTextOf(currency: string, amount: number): string {
  return currencySymbolOf(currency) + amount.toFixed(AMOUNT_DIGITS)
}

/**
 * 取设置服务里的一段：宿主 `configForms` / `describe()` 给的是**命名空间根对象**
 * （`{ pricing: …, budget: … }`），字段在它下面；没有该键时整份值就是这一段（两种形状都能读）。
 * 与服务端 pricing.ts 的 `settingsSectionOf` 同一判定。
 */
export function settingsSectionOf(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  return key in record ? record[key] : value
}

/** 内置价目的更新提醒线：超过这些天就提示按官方文档复核（价目是静态数据，厂商调价后要人工改）。 */
export const CATALOG_STALE_DAYS = 90

/** 抓取日期（`YYYY-MM-DD`，本地日历日）距今天数；解析不出返回 null。 */
export function fetchedDaysAgo(fetchedAt: string, now: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fetchedAt.trim())
  if (match === null) return null
  const fetched = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
  if (!Number.isFinite(fetched)) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  // 按本地日历日相减：跨夏令时那天可能差 23/25 小时，四舍五入回到整天
  return Math.max(0, Math.round((today - fetched) / 86400000))
}

/** 最新一次抓取距今的天数；没有可解析的日期、或还没超过阈值时返回 null。 */
export function catalogStaleDays(sources: Array<{ fetchedAt: string }>, now: Date = new Date()): number | null {
  const days = sources
    .map((entry) => fetchedDaysAgo(entry.fetchedAt, now))
    .filter((day): day is number => day !== null)
  if (days.length === 0) return null
  const newest = Math.min(...days)
  return newest > CATALOG_STALE_DAYS ? newest : null
}

export function ruleKeyOf(rule: PricingRule): string {
  return rule.provider + '|' + rule.model
}

export function ruleLabelOf(rule: PricingRule): string {
  const model = rule.model === '*' ? '全部模型' : rule.model
  return (rule.provider === '*' ? '任意通道' : rule.provider) + ' · ' + model
}

/** 错峰窗口文案：`09:00–12:00、14:00–18:00`；带 `days` 的窗口补一个「（工作日）」之类的后缀。 */
export function offPeakWindowsText(rule: PricingRule): string {
  if (rule.offPeak === null || rule.offPeak.windows.length === 0) return ''
  return rule.offPeak.windows.map((window) => {
    const base = window.from + '–' + window.to
    const suffix = dayScopeSuffixOf(window.days)
    return suffix === '' ? base : base + '（' + suffix + '）'
  }).join('、')
}

/** 编辑器里的星期范围三选一；与服务端 `days` 的映射见 DAY_SCOPE_DAYS。 */
export type DayScope = 'every' | 'weekday' | 'weekend'

export const DAY_SCOPE_OPTIONS: DayScope[] = ['every', 'weekday', 'weekend']

export const DAY_SCOPE_LABELS: Record<DayScope, string> = {
  every: '每天',
  weekday: '仅工作日',
  weekend: '仅周末',
}

/** 「每天」刻意映射成 `days` 缺省（而不是 [1..7]），保证升级前的规则原样往返。 */
export const DAY_SCOPE_DAYS: Record<DayScope, number[] | undefined> = {
  every: undefined,
  weekday: [1, 2, 3, 4, 5],
  weekend: [6, 7],
}

/** 已保存的 `days` → 编辑器取值；非法值一律当「每天」（与服务端容错口径一致）。 */
export function dayScopeOf(days: number[] | undefined): DayScope {
  const normalized = normalizeDays(days)
  if (normalized === undefined) return 'every'
  const key = normalized.join(',')
  if (key === '1,2,3,4,5') return 'weekday'
  if (key === '6,7') return 'weekend'
  // 三选一表达不了自定义组合（手改 JSON 才可能出现）：保守显示「每天」，不改写数值
  return 'every'
}

/** `days` 的简短说明；缺省或非三名组合返回空串（表示「每天」）。 */
export function dayScopeSuffixOf(days: number[] | undefined): string {
  const scope = dayScopeOf(days)
  return scope === 'every' ? '' : DAY_SCOPE_LABELS[scope]
}

/**
 * `days` 归一：只接受 1–7 的整数、去重排序；非法值返回 undefined = 每天适用。
 * 与服务端 normalizeDays 同一口径：非法值不整段作废，避免金额突然变高。
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

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

function ratesOf(raw: Record<string, unknown>, fallback: PricingRates): PricingRates {
  return {
    input: toNumber(raw.input, fallback.input),
    cacheRead: toNumber(raw.cacheRead, fallback.cacheRead),
    cacheWrite: toNumber(raw.cacheWrite, fallback.cacheWrite),
    output: toNumber(raw.output, fallback.output),
  }
}

function windowsOf(raw: unknown): OffPeakWindow[] {
  if (!Array.isArray(raw)) return []
  const windows: OffPeakWindow[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const from = (entry as { from?: unknown }).from
    const to = (entry as { to?: unknown }).to
    if (typeof from !== 'string' || typeof to !== 'string') continue
    if (!/^\d{1,2}:\d{2}$/.test(from.trim()) || !/^\d{1,2}:\d{2}$/.test(to.trim())) continue
    const days = normalizeDays((entry as { days?: unknown }).days)
    windows.push({ from: from.trim(), to: to.trim(), ...(days === undefined ? {} : { days }) })
  }
  return windows
}

/**
 * 设置服务返回的值做一次防御式归一：
 * 宿主 schema 会把缺省的 `offPeak` 补成 `{windows: [], …}`，那种空壳要还原成「无错峰」。
 */
export function normalizeClientPricing(value: unknown): PricingConfig {
  const section = settingsSectionOf(value, 'pricing')
  if (typeof section !== 'object' || section === null) return EMPTY_CONFIG
  const record = section as Record<string, unknown>
  const currency = toText(record.currency, EMPTY_CONFIG.currency)
  const rules: PricingRule[] = []
  for (const entry of Array.isArray(record.rules) ? record.rules : []) {
    if (typeof entry !== 'object' || entry === null) continue
    const raw = entry as Record<string, unknown>
    const base = ratesOf(raw, { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 })
    let offPeak: OffPeakPricing | null = null
    if (typeof raw.offPeak === 'object' && raw.offPeak !== null) {
      const offPeakRaw = raw.offPeak as Record<string, unknown>
      const windows = windowsOf(offPeakRaw.windows)
      if (windows.length > 0) offPeak = { ...ratesOf(offPeakRaw, base), windows }
    }
    rules.push({
      provider: toText(raw.provider, '*'),
      model: toText(raw.model, '*'),
      unit: UNIT_OPTIONS.includes(raw.unit as PricingUnit) ? raw.unit as PricingUnit : 'perMillionTokens',
      currency: toText(raw.currency, currency),
      ...base,
      offPeak,
      note: typeof raw.note === 'string' ? raw.note : '',
    })
  }
  return {
    version: typeof record.version === 'number' ? record.version : 1,
    currency,
    rules,
  }
}

/** 编辑器产出的规则必须只含 JSON 形状：写盘走宿主，`undefined` 会被拒绝。 */
export function cleanRuleForWrite(rule: PricingRule): Record<string, unknown> {
  const values: Record<string, unknown> = {
    provider: rule.provider.trim() === '' ? '*' : rule.provider.trim(),
    model: rule.model.trim() === '' ? '*' : rule.model.trim(),
    unit: rule.unit,
    currency: rule.currency,
    input: rule.input,
    cacheRead: rule.cacheRead,
    cacheWrite: rule.cacheWrite,
    output: rule.output,
    note: rule.note,
  }
  if (rule.offPeak !== null && rule.offPeak.windows.length > 0) {
    values.offPeak = {
      // `days` 缺省时**不写这个字段**：保持与升级前的 JSON 形状一致，旧版本读到也还是「每天」
      windows: rule.offPeak.windows.map((window) => {
        const days = normalizeDays(window.days)
        return days === undefined
          ? { from: window.from, to: window.to }
          : { from: window.from, to: window.to, days }
      }),
      input: rule.offPeak.input,
      cacheRead: rule.offPeak.cacheRead,
      cacheWrite: rule.offPeak.cacheWrite,
      output: rule.offPeak.output,
    }
  }
  return values
}

export function configForWrite(config: PricingConfig): Record<string, unknown> {
  return {
    version: config.version,
    currency: config.currency,
    rules: config.rules.map(cleanRuleForWrite),
  }
}

/** 新增规则的初始值：全 0 单价会算成免费，因此先挡在保存之前（见编辑器校验）。 */
export function blankRule(config: PricingConfig): PricingRule {
  return {
    provider: '*', model: '*', unit: 'perMillionTokens', currency: config.currency,
    input: 0, cacheRead: 0, cacheWrite: 0, output: 0, offPeak: null, note: '',
  }
}

export interface ImportResult {
  config: PricingConfig | null
  error: string | null
}

/** 导入：接受整份配置（`{version,currency,rules}`）或裸规则数组；解析失败给出中文原因。 */
export function parseImportedPricing(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { config: null, error: '不是合法 JSON：' + (error instanceof Error ? error.message : String(error)) }
  }
  const candidate = Array.isArray(parsed) ? { version: 1, currency: EMPTY_CONFIG.currency, rules: parsed } : parsed
  if (typeof candidate !== 'object' || candidate === null) {
    return { config: null, error: '顶层必须是对象或规则数组' }
  }
  const config = normalizeClientPricing(candidate)
  if (config.rules.length === 0) return { config: null, error: '没有解析出任何规则（检查 provider / model / 单价字段）' }
  return { config, error: null }
}

/** 单价全为 0 的规则会把成本算成免费，保存前必须拦住。 */
export function ruleProblemOf(rule: PricingRule): string | null {
  const values = [rule.input, rule.cacheRead, rule.cacheWrite, rule.output]
  if (values.every((value) => value === 0)) return '四档单价全为 0 会算成免费，至少填一个'
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return '单价必须是不小于 0 的数字'
  if (rule.offPeak !== null && rule.offPeak.windows.length === 0) return '错峰时段至少要有一个窗口，或整段留空'
  return null
}
