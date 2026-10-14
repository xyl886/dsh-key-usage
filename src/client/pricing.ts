/**
 * 客户端计费规则视图模型：响应类型、文案、表单校验与 YAML 文本生成。
 *
 * 规则的唯一事实来源是用户 YAML 文件（路径见 `/pricing` 的 `files.user.path`）：客户端只读 `/pricing`、
 * 只经 `POST /pricing/rules` 整批提交，**不自己写文件**（服务端写盘时会按 provider|model 继承旧条目的
 * unit / offPeak / note，客户端拼 YAML 反而会把这三项丢掉）。
 *
 * 面板表单只编辑 通道 / 模型 / 币种 / 四档单价；unit（计价单位）、offPeak（错峰窗口）、note（备注）
 * 只由用户在 YAML 里维护。这里另外负责生成给人 / agent 看的 YAML 文本（规则模板、单条片段）
 * 与「让 DSH 帮我配」的提示词 —— 生成物必须是服务端受限 YAML 子集能读回的写法。
 * 定价算法在服务端（src/server/pricing.ts），界面不重复实现。
 */
import { fmtTokens } from './format.ts'

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

/** 内置官方价目的一个来源（计费面板展示「已内置 N 条，来源见 …」）。 */
export interface CatalogSourceSummary {
  source: string
  fetchedAt: string
  providers: string[]
  count: number
}

/** 内置官方价目：条数 + 各来源（含抓取日期）+ 逐条规则（下载规则模板时按用户用到的模型取交集）。 */
export interface CatalogSummary {
  entries: number
  sources: CatalogSourceSummary[]
  rules: PricingRule[]
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

/** 规则来自哪里：file = 用户 YAML 文件（正常）；legacy = 旧设置服务里的历史值；none = 还没有规则。 */
export type RulesOrigin = 'file' | 'legacy' | 'none'

/** 一个 YAML 文件的位置与状态（`entries` 是文件里解析出的规则条数）。 */
export interface PricingFileInfo {
  path: string
  exists: boolean
  entries: number
}

export interface PricingFiles {
  /** 插件内置的厂商官方价目（随包发布，只读）。 */
  catalog: PricingFileInfo
  /** 用户维护的规则文件：面板保存写的就是它。 */
  user: PricingFileInfo
}

/** 解析问题：`file` 指出是哪个文件，`line` 是 1 基行号（拿不到行号时为 null）。 */
export interface PricingIssue {
  file: 'catalog' | 'user'
  line: number | null
  message: string
}

export interface PricingResponse {
  rules: PricingRule[]
  rulesOrigin: RulesOrigin
  currency: string
  /** 面板能否写盘：服务端只接受回环写入，正常部署恒为 true。 */
  writable: boolean
  revision: number | null
  /** 内置官方价目：条数 + 各来源（含抓取日期）+ 逐条规则，无需用户维护即自动生效。 */
  catalog: CatalogSummary
  /** 与 rules 等长：该条规则此刻是否处于错峰时段（按本地时间判定，服务端算）。 */
  offPeakNow: boolean[]
  coverage: PricingCoverage
  /** 两个 YAML 文件的位置与状态；缺省按「未知」处理（服务端未升级时不至于整块报错）。 */
  files?: PricingFiles
  /** YAML 语法 / 条目问题，带行号；缺省为空数组。 */
  issues?: PricingIssue[]
}

/** 保存接口的返回：服务端一律 HTTP 200，失败原因在 `error` 里（中文，可直接展示）。 */
export type PricingSaveResult =
  | { ok: true; path: string; entries: number; issues: PricingIssue[] }
  | { ok: false; error: string }

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

export const RULES_ORIGIN_TEXT: Record<RulesOrigin, string> = {
  file: '规则来自你的 YAML 文件',
  legacy: '规则还是旧设置服务里的历史值，还没落盘成 YAML —— 在面板上保存一次就会写进文件',
  none: '还没有用户规则：成本按内置官方价目与台账均价算',
}

/** 表单外的三个字段只能在 YAML 里维护，界面上必须有一句明示，否则用户以为保存会把它们清掉。 */
export const FORM_EXTRAS_HINT = '错峰价、计价单位、备注由 YAML 维护；在这里保存不会清掉它们。'

/** 改通道 / 模型等于换主键：服务端按 provider|model 继承旧值，换键后旧条的附加项不会跟过来。 */
export const FORM_KEY_CHANGE_HINT = '改通道或模型等于换一条规则：原条目的错峰价 / 单位 / 备注不会跟过来，需要在 YAML 里补。'

/** 表单缺省单位：列表里只有「非缺省」才提示单位设置，避免每行都挂一句。 */
export const DEFAULT_UNIT: PricingUnit = 'perMillionTokens'

/** 币种符号；未知币种保留代码前缀，避免把 USD 当 CNY 渲染。 */
export function currencySymbolOf(currency: string): string {
  if (currency === 'CNY') return '¥'
  if (currency === 'USD') return '$'
  return currency + ' '
}

/** 金额一律两位小数；服务端给的 4 位是计算精度，不是展示精度。 */
const AMOUNT_DIGITS = 2

/** 金额文本：币种符号 + 两位小数（多处展示共用，避免精度不一致）。 */
export function moneyTextOf(currency: string, amount: number): string {
  return currencySymbolOf(currency) + amount.toFixed(AMOUNT_DIGITS)
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

/** 星期范围三选一的取值；`dayScopeOf` 用它把已保存的 `days` 反解成编辑器可读的三档。 */
export type DayScope = 'every' | 'weekday' | 'weekend'

export const DAY_SCOPE_LABELS: Record<DayScope, string> = {
  every: '每天',
  weekday: '仅工作日',
  weekend: '仅周末',
}

/** 已保存的 `days` → 展示取值；非法值一律当「每天」（与服务端容错口径一致）。 */
export function dayScopeOf(days: number[] | undefined): DayScope {
  const normalized = normalizeDays(days)
  if (normalized === undefined) return 'every'
  const key = normalized.join(',')
  if (key === '1,2,3,4,5') return 'weekday'
  if (key === '6,7') return 'weekend'
  // 三选一表达不了自定义组合（手写 YAML 才可能出现）：保守显示「每天」，不改写数值
  return 'every'
}

/** `days` 的简短说明；缺省或非三名组合返回空串（表示「每天」）。 */
export function dayScopeSuffixOf(days: number[] | undefined): string {
  const scope = dayScopeOf(days)
  return scope === 'every' ? '' : DAY_SCOPE_LABELS[scope]
}

/**
 * `days` 归一：只接受 1–7 的整数、去重排序；非法值返回 undefined = 每天适用。
 * 与服务端同一口径：非法值不整段作废，避免金额突然变高。
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

/**
 * 列表里的「只在 YAML 里维护」提示：表单只改 通道 / 模型 / 币种 / 四档单价，
 * 但已有规则的错峰与单位仍然生效 —— 必须显式标出来，否则用户会以为这些数据丢了。
 */
export function ruleExtrasTextOf(rule: PricingRule): string {
  const extras: string[] = []
  if (rule.offPeak !== null) extras.push('含错峰窗口 ' + offPeakWindowsText(rule))
  if (rule.unit !== DEFAULT_UNIT) extras.push('含单位设置：' + UNIT_LABELS[rule.unit])
  return extras.length === 0 ? '' : extras.join(' · ') + ' —— 只在 YAML 里编辑'
}

/** 模型 id 归一：去掉 `vendor/` 前缀并转小写（与服务端内置价目的保守匹配同一口径）。 */
function normalizeModelId(model: string): string {
  const trimmed = model.trim()
  const slash = trimmed.lastIndexOf('/')
  return (slash >= 0 ? trimmed.slice(slash + 1) : trimmed).toLowerCase()
}

/**
 * 内置价目匹配（顺序与服务端一致）：
 * 精确 → 忽略大小写 → 去 `vendor/` 前缀 → 该通道通配；不做模糊匹配。
 */
export function catalogRuleFor(catalogRules: PricingRule[], provider: string, model: string): PricingRule | null {
  const wantedProvider = normalizeModelId(provider)
  const wantedModel = normalizeModelId(model)
  const tiers: Array<(rule: PricingRule) => boolean> = [
    (rule) => rule.provider === provider && rule.model === model,
    (rule) => normalizeModelId(rule.provider) === wantedProvider && normalizeModelId(rule.model) === wantedModel,
    (rule) => normalizeModelId(rule.provider) === wantedProvider && rule.model === '*',
  ]
  for (const matches of tiers) {
    const hit = catalogRules.find(matches)
    if (hit !== undefined) return hit
  }
  return null
}

/** 与服务端 matchPricingRule 同序的粗判：精确 → 通道通配 → 模型通配 → 全通配。 */
export function matchesAnyRule(rules: PricingRule[], provider: string, model: string): boolean {
  const patterns = [
    (rule: PricingRule) => rule.provider === provider && rule.model === model,
    (rule: PricingRule) => rule.provider === provider && rule.model === '*',
    (rule: PricingRule) => rule.provider === '*' && rule.model === model,
    (rule: PricingRule) => rule.provider === '*' && rule.model === '*',
  ]
  return patterns.some((matches) => rules.some(matches))
}

/** 判定「缺口模型」只需要这几个字段（`/models` 行的结构子集，避免与 types.ts 循环引用）。 */
export interface ModelUsageRowLike {
  provider: string
  model: string
  tokens: number
  costSource?: CostSource
}

export interface UnpricedModel {
  provider: string
  model: string
  tokens: number
  /** 占全部缺口模型的 tokens 比例（用于排序说明与提示词）。 */
  share: number
  /** true = 台账反推均价在兜底（估算）；false = 完全无价格依据。 */
  estimated: boolean
}

/**
 * 「没有价格依据」的模型：用户的模型 − 用户规则 − 内置价目。
 * 逐模型判定优先用 `/models` 的 `costSource`（就是成本单元格上那个角标，口径一致），
 * 角标缺失（旧响应）时退回本地规则匹配，避免整块不显示。
 */
export function unpricedModelsOf(
  rows: ModelUsageRowLike[] | null | undefined,
  rules: PricingRule[],
  catalogRules: PricingRule[],
): UnpricedModel[] {
  const used = (rows ?? []).filter((row) => row.tokens > 0)
  if (used.length === 0) return []
  const uncovered = used.filter((row) => {
    if (row.costSource === 'rule' || row.costSource === 'official' || row.costSource === 'catalog') return false
    return row.costSource === 'estimate' || row.costSource === 'none'
      || !matchesAnyRule(rules, row.provider, row.model) && catalogRuleFor(catalogRules, row.provider, row.model) === null
  })
  const total = uncovered.reduce((sum, row) => sum + row.tokens, 0)
  if (total <= 0) return []
  return uncovered
    .map((row) => ({
      provider: row.provider,
      model: row.model,
      tokens: row.tokens,
      share: row.tokens / total,
      // 只有明确标了「估算」才算均价兜底；角标缺失时按「无依据」说，不替服务端下结论
      estimated: row.costSource === 'estimate',
    }))
    .sort((first, second) => second.tokens - first.tokens)
}

/** 单价全为 0 的规则会把成本算成免费，保存前必须拦住。 */
export function ruleProblemOf(rule: PricingRule): string | null {
  const values = [rule.input, rule.cacheRead, rule.cacheWrite, rule.output]
  if (values.every((value) => value === 0)) return '四档单价全为 0 会算成免费，至少填一个'
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return '单价必须是不小于 0 的数字'
  if (rule.provider.trim() === '') return '通道 id 不能为空（要匹配任意通道请填 *）'
  if (rule.model.trim() === '') return '模型 id 不能为空（要匹配该通道全部模型请填 *）'
  return null
}

/** 新增规则的初始值：全 0 单价会算成免费，因此先挡在保存之前（见 `ruleProblemOf`）。 */
export function blankRule(currency: string): PricingRule {
  return {
    provider: '*', model: '*', unit: DEFAULT_UNIT, currency,
    input: 0, cacheRead: 0, cacheWrite: 0, output: 0, offPeak: null, note: '',
  }
}

/**
 * 提交给 `POST /pricing/rules` 的那 7 个字段。
 * 不带 unit / offPeak / note：服务端写盘时按 provider|model 从文件旧值继承，客户端传了反而可能覆盖掉。
 */
export function submittableRuleOf(rule: PricingRule): Record<string, string | number> {
  return {
    provider: rule.provider.trim(),
    model: rule.model.trim(),
    currency: rule.currency,
    input: rule.input,
    cacheRead: rule.cacheRead,
    cacheWrite: rule.cacheWrite,
    output: rule.output,
  }
}

/* ===== YAML 文本生成（模板 / 单条片段 / 提示词）=====
 *
 * 生成物必须能被服务端的受限 YAML 子集解析器读回，所以只用：
 * 2 空格缩进的块映射、`- ` 块序列、单行 `key: value`、单引号字符串、行内短数组 `[1, 2]`。
 * 禁止 flow 映射 `{}`、锚点 `&` / 别名 `*`、块标量 `|` / `>`、`---`、tab 缩进。
 */

/** YAML 标量：字符串一律单引号（裸 `*` 会被当成别名报错），内部单引号翻倍转义。 */
function yamlText(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'"
}

/** 数字不加引号；非有限值按 0 兜底（表单已经拦过，这里只保证不生成非法文本）。 */
function yamlNumberText(value: number): string {
  return Number.isFinite(value) && value >= 0 ? String(value) : '0'
}

function padOf(indent: number): string {
  return ' '.repeat(Math.max(0, indent))
}

/** 一条规则的块映射行（不含 `- ` 前缀）；`indent` 是第一个键的缩进。 */
function ruleFieldLines(rule: PricingRule, indent: number): string[] {
  const pad = padOf(indent)
  const lines = [
    pad + 'provider: ' + yamlText(rule.provider),
    pad + 'model: ' + yamlText(rule.model),
    pad + 'unit: ' + yamlText(rule.unit),
    pad + 'currency: ' + yamlText(rule.currency),
    pad + 'input: ' + yamlNumberText(rule.input),
    pad + 'cacheRead: ' + yamlNumberText(rule.cacheRead),
    pad + 'cacheWrite: ' + yamlNumberText(rule.cacheWrite),
    pad + 'output: ' + yamlNumberText(rule.output),
  ]
  if (rule.note.trim() !== '') lines.push(pad + 'note: ' + yamlText(rule.note))
  if (rule.offPeak !== null && rule.offPeak.windows.length > 0) {
    lines.push(pad + 'offPeak:')
    lines.push(pad + '  windows:')
    for (const window of rule.offPeak.windows) {
      lines.push(pad + '    - from: ' + yamlText(window.from))
      lines.push(pad + '      to: ' + yamlText(window.to))
      const days = normalizeDays(window.days)
      // `days` 缺省 = 每天适用：不写这个键，比写空数组更不容易被误读
      if (days !== undefined) lines.push(pad + '      days: [' + days.join(', ') + ']')
    }
    lines.push(pad + '  input: ' + yamlNumberText(rule.offPeak.input))
    lines.push(pad + '  cacheRead: ' + yamlNumberText(rule.offPeak.cacheRead))
    lines.push(pad + '  cacheWrite: ' + yamlNumberText(rule.offPeak.cacheWrite))
    lines.push(pad + '  output: ' + yamlNumberText(rule.offPeak.output))
  }
  return lines
}

/** 规则作为 `rules:` 下的一项：`- provider: …`，后续键与首键内容对齐（服务端按 2 空格层级解析）。 */
function ruleBlockLines(rule: PricingRule, indent: number): string[] {
  const [first, ...rest] = ruleFieldLines(rule, indent + 2)
  return [padOf(indent) + '- ' + first.trimStart(), ...rest]
}

/** 把若干行整段注释掉（注释行会被解析器丢弃，因此不会影响文档结构）。 */
function commentOut(lines: string[]): string[] {
  return lines.map((line) => (line.trim() === '' ? '#' : '# ' + line))
}

/** 下载用的文件名里不能带空格与路径分隔符：通道 / 模型 id（如 openrouter 的 `vendor/model`）要压平。 */
export function fileSafeOf(text: string): string {
  return text.trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'rule'
}

/** 「用到的模型」一行（来自 `/models`）。 */
export interface UsedModelRef {
  provider: string
  model: string
}

export interface RulesTemplateText {
  /** 可直接下载的 YAML 文本（整份文档）。 */
  text: string
  /** 已按内置官方价目预填的条数。 */
  prefilledCount: number
  /** 注释占位的「待填」条数（没有价格依据的模型）。 */
  pendingCount: number
}

/** 模板 / 片段的公共注释头：讲清文件的作用与能用的写法，避免用户写出解析器不认的语法。 */
function headerComments(extra: string[]): string[] {
  return [
    '# dsh-key-usage 计费规则（YAML 是唯一事实来源）',
    '# 作用：这份文本用于手改或交给 agent 填价，改完保存到面板上显示的「用户规则文件」路径即可。',
    '# 允许的写法：2 空格缩进的块映射、`- ` 块序列、单行 `key: value`、短数组 `[1, 2]`；',
    '#            不要用 tab、花括号 `{}`、锚点 `&` / 别名 `*`、块标量 `|` / `>`、`---`。',
    '# 四档单价顺序：输入 / 缓存读 / 缓存写 / 输出；单位缺省是每百万 tokens（unit: perMillionTokens）。',
    '# 错峰窗口（面板表单不提供，只能在 YAML 里改）写法：',
    '#   offPeak:',
    '#     windows:',
    "#       - from: '00:30'",
    "#         to: '08:30'",
    '#     input: 0.5',
    '#     cacheRead: 0.05',
    '#     cacheWrite: 0.5',
    '#     output: 1',
    ...extra,
  ]
}

/**
 * 「下载规则模板」：注释头 + 用户近期用到的模型 ∩ 内置官方价目（价格预填）+ 没有价格依据的待填条目。
 *
 * 待填条目整段注释掉：写 0 会把这批用量算成免费（比「没有依据」更糟），写成 null 会被解析器判为缺字段，
 * 所以注释占位、填好单价后删掉行首的 `# ` 才是安全路径。
 */
export function buildRulesTemplateYaml(
  catalog: CatalogSummary | null,
  usedModels: UsedModelRef[],
  userRules: PricingRule[],
  uncovered: UnpricedModel[],
  currency: string,
): RulesTemplateText {
  const catalogRules = catalog?.rules ?? []
  const prefilled: PricingRule[] = []
  const seen = new Set<string>()
  for (const used of usedModels) {
    // 已经有用户规则的模型不算缺口：模板只负责「还没有价格的」
    if (matchesAnyRule(userRules, used.provider, used.model)) continue
    const hit = catalogRuleFor(catalogRules, used.provider, used.model)
    if (hit === null) continue
    const key = ruleKeyOf(hit)
    if (seen.has(key)) continue
    seen.add(key)
    prefilled.push(hit)
  }

  const body: string[] = ['version: 1', 'currency: ' + yamlText(currency)]
  if (prefilled.length === 0) {
    // 空 rules 必须写成行内 `[]`：裸 `rules:` 后面没有内容会被解析成 null，服务端只能报「不是列表」
    body.push('rules: []')
  } else {
    body.push('rules:')
    for (const rule of prefilled) body.push(...ruleBlockLines(rule, 2))
  }

  const pending: string[] = []
  if (uncovered.length > 0) {
    pending.push('', '# ---- 以下模型还没有价格依据（近 30 天用到，但既没有规则也没命中内置价目）----')
    pending.push('# 填好四档单价后，把每条开头的「# 」删掉即可；不要用 0 占位 —— 0 会把这批用量算成免费。')
    for (const model of uncovered) {
      pending.push('#')
      pending.push('# ' + model.provider + ' | ' + model.model + ' —— 近 30 天 ' + fmtTokens(model.tokens)
        + ' tokens' + (model.estimated ? '（当前按台账均价估算）' : '（当前无价格依据）'))
      pending.push(...commentOut(ruleBlockLines(
        { ...blankRule(currency), provider: model.provider, model: model.model },
        2,
      )))
    }
  }

  const text = [
    ...headerComments([
      '# 注意：这是整份文档。已有规则文件时不要直接覆盖，只把需要的条目粘进 rules 下（或先备份原文件）。',
    ]),
    '',
    ...body,
    ...pending,
    '',
  ].join('\n')

  return { text, prefilledCount: prefilled.length, pendingCount: uncovered.length }
}

/**
 * 「单条片段」：一条规则的 YAML，缩进按 `rules:` 下的位置排好，可直接粘进用户文件。
 * `placeholder = true` 表示这是一条还没有价格的模型（四档单价先按 0 占位，必须填完再粘）。
 *
 * 注意这是**片段**不是完整文档：服务端的解析器不接受「文档第一行带缩进」，
 * 所以片段必须粘到已有文件的 `rules:` 下面，不能单独当整份规则文件用。
 */
export function buildRuleSnippetYaml(rule: PricingRule, placeholder = false): string {
  const header = placeholder
    ? [
      '# 单条规则片段（该模型还没有价格依据）：把四档单价换成厂商官方价后再粘到 rules 下。',
      '# 现在四档都是 0，直接粘进去会把这批用量算成免费。',
      commonSnippetNotice(),
    ]
    : [
      '# 单条规则片段：unit / offPeak / note 由 YAML 维护，面板保存不会改动它们。',
      commonSnippetNotice(),
    ]
  return [...header, ...ruleBlockLines(rule, 2), ''].join('\n')
}

/** 片段的用法说明：它不是完整文档，必须粘进 rules 下（解析器不接受首行缩进的文档）。 */
function commonSnippetNotice(): string {
  return '# 这是片段、不是完整文档：粘到规则文件的 rules: 下面即可（缩进已按 2 空格排好）；'
    + '若文件里还是 rules: []，先换成 rules: 再粘。'
}

export interface AgentPromptInput {
  /** 用户规则文件的绝对路径（来自 `/pricing` 的 `files.user.path`，不硬编码）。 */
  filePath: string | null
  currency: string
  rulesCount: number
  catalogEntries: number
  uncovered: UnpricedModel[]
}

/**
 * 「让 DSH 帮我配」的提示词：带上目标文件绝对路径与缺口模型清单，
 * 并明确要求核对厂商官方定价页、不要编造价格、改完刷新页面即生效。
 */
export function buildAgentPrompt(input: AgentPromptInput): string {
  const lines = [
    '请帮我配置 dsh-key-usage 插件（DSH 侧边栏「使用情况」→「余额与配额」）的计费规则。',
    '',
    '目标文件（唯一事实来源，请直接改它）：',
    '  ' + (input.filePath ?? '(面板还没读到路径，请先确认插件服务端已重启)'),
    '',
    '改完刷新 DSH 页面即生效（不需要重启宿主）。面板上的「保存规则」写的也是这个文件，',
    '所以不要另建规则文件，也不要改插件目录里的内置官方价目。',
    '当前状态：用户规则 ' + String(input.rulesCount) + ' 条，内置官方价目 ' + String(input.catalogEntries) + ' 条。',
  ]

  lines.push('', '现在缺价格依据的模型（近 30 天用量，按 tokens 降序，共 ' + String(input.uncovered.length) + ' 个）：')
  if (input.uncovered.length === 0) {
    lines.push('  （没有缺口：你用到的模型都已有规则或命中内置价目。可以直接结束，或复核现有价格是否过期。）')
  } else {
    for (const model of input.uncovered) {
      lines.push('  - ' + model.provider + ' | ' + model.model + ' —— ' + fmtTokens(model.tokens) + ' tokens'
        + '（占缺口 ' + (model.share * 100).toFixed(1) + '%）'
        + (model.estimated ? '｜当前按台账均价估算' : '｜当前无价格依据'))
    }
  }

  lines.push(
    '',
    '请按这些要求做：',
    '1. 逐个去厂商**官方定价页**核对四档单价（输入 / 缓存读 / 缓存写 / 输出），并在回复里给出出处链接；',
    '   查不到官方价的模型就明确说「查不到」，保持原样，**不要凭记忆或推测编造价格**，',
    '   也不要用 0 占位 —— 0 会把这批用量算成免费。',
    '2. 币种按官方页面原币种写（CNY / USD）；本插件不换算、不合计，金额按币种分行显示。',
    '3. 计价单位缺省是每百万 tokens（unit: perMillionTokens）；按次计费的通道写 perCall。',
    '4. 文件格式：顶层只有 version / currency / rules 三个键；rules 用 `- provider: ...` 的块序列，',
    '   每个字段一行、2 空格缩进、字符串加引号；不要用 tab、花括号、锚点或 `---`。',
    '   已存在条目的 unit / offPeak / note 不要动（错峰窗口与备注只在 YAML 里维护）。',
    '5. 改完告诉我：新增 / 修改了哪几条、价格出处，以及仍然查不到价格的模型。',
    '',
  )
  return lines.join('\n')
}
