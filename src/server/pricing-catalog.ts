/**
 * 内置官方价目：**唯一事实来源是随包发布的仓库根 `pricing-catalog.yml`**（本模块只读、不写、不联网）。
 * 导出 catalogRuleList / catalogEntryCount / catalogSources / catalogRuleFor / catalogEntries。
 * 容错：文件缺失 / 写法不支持 / 条目非法，都带行号报 issue 并跳过该条，绝不抛错、绝不猜单价。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { OffPeakWindow, PricingFileInfo, PricingRates, PricingRule, PricingUnit } from './pricing.js'
import { PRICING_UNITS } from './pricing.js'
import {
  parseYamlLite,
  yamlField,
  yamlItems,
  yamlKindLabel,
  yamlLine,
  yamlNumber,
  yamlText,
  type YamlIssue,
  type YamlNode,
} from './yaml-lite.js'

/** 一条内置价目：四档价可缺档（文档没写就留空，绝不用同类模型顶替）。 */
export interface CatalogEntry extends Partial<PricingRates> {
  /** 通道 id，与台账 / 事件里的 provider 对齐。 */
  provider: string
  /** 模型 id；`*` 表示该通道兜底（只有文档明确给出通道统一价时才写）。 */
  model: string
  unit: PricingUnit
  currency: string
  /** 错峰价（可选）；有价目就必须给 `windows`。 */
  offPeak?: Partial<PricingRates> & { windows: OffPeakWindow[] }
  /** 官方文档精确 URL。 */
  source: string
  /** 抓取日期 YYYY-MM-DD。 */
  fetchedAt: string
  /** 口径与来源说明（时间段换算依据、缺档原因等）。 */
  note: string
}

/** 内置价目的覆盖摘要（计费面板展示「已内置 N 条，来源见 …」）。 */
export interface CatalogSourceSummary {
  fetchedAt: string
  /** 该来源下收录的通道集合。 */
  providers: string[]
  /** 该来源收录的条数。 */
  count: number
  source: string
}

/** YAML 与编译产物同包：`lib/pricing-catalog.js` 的上一级就是包根。 */
const CATALOG_PATH = fileURLToPath(new URL('../pricing-catalog.yml', import.meta.url))

interface LoadedCatalog {
  path: string
  exists: boolean
  entries: CatalogEntry[]
  issues: YamlIssue[]
}

let loaded: LoadedCatalog | null = null

/** 随包发布的静态数据：进程内只读一次（文件内容不随运行变化）。 */
function catalogLoad(): LoadedCatalog {
  if (loaded !== null) return loaded
  let text: string | null = null
  try {
    text = readFileSync(CATALOG_PATH, 'utf8')
  } catch {
    text = null
  }
  if (text === null) {
    loaded = {
      path: CATALOG_PATH,
      exists: false,
      entries: [],
      issues: [{ line: null, message: '内置价目文件缺失：' + CATALOG_PATH }],
    }
    return loaded
  }
  const parsed = parseCatalogText(text)
  loaded = { path: CATALOG_PATH, exists: true, entries: parsed.entries, issues: parsed.issues }
  return loaded
}

export function catalogEntries(): CatalogEntry[] {
  return catalogLoad().entries
}

export function catalogIssues(): YamlIssue[] {
  return catalogLoad().issues
}

export function catalogFileInfo(): PricingFileInfo {
  const current = catalogLoad()
  return { path: current.path, exists: current.exists, entries: current.entries.length }
}

export function catalogEntryCount(): number {
  return catalogLoad().entries.length
}

/**
 * 内置价目的**基准币种**：取第一条价目的 currency（文件里统一是 CNY），读不到条目时回落 'CNY'。
 * 用途：`GET /pricing` 的 `currency` 字段，以及「台账反推均价」这类没有自带币种的金额。
 */
export function catalogCurrency(): string {
  return catalogLoad().entries[0]?.currency ?? 'CNY'
}

/**
 * 某个通道在内置价目里用到的**唯一**币种；通道没收录或收录了多种币种时返回 null（不猜）。
 * 用途：台账只记金额不记币种，按该通道的官方价目币种推断它（DeepSeek/Kimi → CNY，Z.ai/OpenRouter → USD）。
 */
export function catalogProviderCurrency(provider: string): string | null {
  const wanted = normalizeProviderId(provider)
  if (wanted === '') return null
  const currencies = new Set<string>()
  for (const entry of catalogLoad().entries) {
    if (normalizeProviderId(entry.provider) !== wanted) continue
    currencies.add(entry.currency)
  }
  return currencies.size === 1 ? [...currencies][0] : null
}

export function catalogSources(): CatalogSourceSummary[] {
  const bySource = new Map<string, CatalogSourceSummary>()
  for (const entry of catalogLoad().entries) {
    const existing = bySource.get(entry.source)
    if (existing === undefined) {
      bySource.set(entry.source, { source: entry.source, fetchedAt: entry.fetchedAt, providers: [entry.provider], count: 1 })
      continue
    }
    existing.count += 1
    if (!existing.providers.includes(entry.provider)) {
      existing.providers.push(entry.provider)
      existing.providers.sort((first, second) => first.localeCompare(second))
    }
  }
  return [...bySource.values()]
}

/** 逐条价目（去掉长 note）：来源与抓取日期由 `catalogSources()` 单独给出。 */
export function catalogRuleList(): PricingRule[] {
  return catalogLoad().entries.map((entry) => ({ ...toPricingRule(entry), note: '' }))
}

/**
 * 模型 id 归一：去掉路由前缀（`vendor/model` → `model`）并转小写。
 * 只做保守的两步（原样 → 忽略大小写 → 去 `vendor/` 前缀），**不做**模糊 / 近似匹配 ——
 * 宁可继续显示「估算」，也不要给出错误金额。
 */
export function normalizeModelId(model: string): string {
  const trimmed = model.trim()
  const slash = trimmed.lastIndexOf('/')
  const tail = slash >= 0 ? trimmed.slice(slash + 1) : trimmed
  return tail.toLowerCase()
}

export function normalizeProviderId(provider: string): string {
  return normalizeModelId(provider)
}

/**
 * 按「通道 + 模型」查内置价目：
 * 1. 通道与模型都精确匹配；
 * 2. 忽略大小写匹配；
 * 3. 去掉 `vendor/` 前缀后再匹配（`deepseek/deepseek-v4.1-flash` → `deepseek-v4.1-flash`）；
 * 4. 该通道的通配兜底（`provider + '*'`），**只在文档给出通道统一价时才会存在**。
 * 找不到返回 null，由调用方继续回落台账均价。
 */
export function catalogRuleFor(provider: string, model: string): PricingRule | null {
  const wantedProvider = normalizeProviderId(provider)
  const wantedModel = normalizeModelId(model)
  const candidates: Array<(entry: CatalogEntry) => boolean> = [
    (entry) => entry.provider === provider && entry.model === model,
    (entry) => normalizeProviderId(entry.provider) === wantedProvider && normalizeModelId(entry.model) === wantedModel,
    (entry) => normalizeProviderId(entry.provider) === wantedProvider && entry.model === '*',
  ]
  for (const matches of candidates) {
    const hit = catalogLoad().entries.find(matches)
    if (hit !== undefined) return toPricingRule(hit)
  }
  return null
}

/** 内置价目 → 计费规则：缺档一律按 0（相当于该档不产生费用，而不是用别的档顶替）。 */
function toPricingRule(entry: CatalogEntry): PricingRule {
  const rates: PricingRates = {
    input: entry.input ?? 0,
    cacheRead: entry.cacheRead ?? 0,
    cacheWrite: entry.cacheWrite ?? 0,
    output: entry.output ?? 0,
  }
  return {
    provider: entry.provider,
    model: entry.model,
    unit: entry.unit,
    currency: entry.currency,
    ...rates,
    offPeak: entry.offPeak === undefined ? null : {
      input: entry.offPeak.input ?? rates.input,
      cacheRead: entry.offPeak.cacheRead ?? rates.cacheRead,
      cacheWrite: entry.offPeak.cacheWrite ?? rates.cacheWrite,
      output: entry.offPeak.output ?? rates.output,
      windows: entry.offPeak.windows,
    },
    note: entry.note + '（来源：' + entry.source + '，抓取 ' + entry.fetchedAt + '）',
  }
}

/* ------------------------------------------------------------------ YAML → 价目 的容错解析 ------------------------------------------------------------------ */

const RATE_KEYS = ['input', 'cacheRead', 'cacheWrite', 'output'] as const

/** 条目级 / offPeak 级允许的键；其余键报 issue 但继续解析（手写改价时打错键名不能静默失效）。 */
const ENTRY_KEYS = ['provider', 'model', 'unit', 'currency', ...RATE_KEYS, 'source', 'fetchedAt', 'note', 'offPeak']
const OFFPEAK_KEYS = [...RATE_KEYS, 'windows']

function describeNode(node: YamlNode): string {
  return node.kind === 'scalar' ? (node.text === '' ? '空值' : node.text.slice(0, 40)) : yamlKindLabel(node)
}

/**
 * `HH:MM` / `24:00` 判定，与 `pricing.ts: clockMinutes` 同一口径。
 * 这里本地判定是为避免 pricing ↔ pricing-catalog 互相导入（一致性由 test/pricing.test.mjs 交叉校验）。
 */
function isClockText(text: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (match === null) return false
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (minutes > 59) return false
  if (hours === 24) return minutes === 0
  return hours <= 23
}

/**
 * 解析价目文件文本（测试与工具用）：坏条目跳过并给出带行号的 issue，绝不抛错。
 * 生产路径由 `catalogLoad()` 用同一个函数读 `pricing-catalog.yml`。
 */
export function parseCatalogText(text: string): { entries: CatalogEntry[]; issues: YamlIssue[] } {
  const { root, issues } = parseYamlLite(text)
  const entries: CatalogEntry[] = []
  if (root === null) {
    issues.push({ line: null, message: '内置价目文件是空的' })
    return { entries, issues }
  }
  const rulesNode = yamlField(root, 'rules')
  if (rulesNode === null) {
    issues.push({ line: yamlLine(root), message: '缺少顶层 rules 列表（每条价目一项）' })
    return { entries, issues }
  }
  const items = yamlItems(rulesNode)
  if (items === null) {
    issues.push({ line: yamlLine(rulesNode), message: 'rules 必须是列表，当前是' + yamlKindLabel(rulesNode) })
    return { entries, issues }
  }
  for (const item of items) {
    const entry = parseCatalogEntry(item.value, item.line, issues)
    if (entry !== null) entries.push(entry)
  }
  return { entries, issues }
}

function parseCatalogEntry(node: YamlNode, line: number, issues: YamlIssue[]): CatalogEntry | null {
  if (node.kind !== 'map') {
    issues.push({ line, message: '价目条目必须是映射（key: value 缩进列表），当前是' + yamlKindLabel(node) })
    return null
  }
  const provider = yamlText(yamlField(node, 'provider'))
  const model = yamlText(yamlField(node, 'model'))
  if (provider === null || provider === '') {
    issues.push({ line, message: '价目条目缺少 provider，整条跳过' })
    return null
  }
  if (model === null || model === '') {
    issues.push({ line, message: provider + ' 缺少 model，整条跳过' })
    return null
  }
  const label = provider + '|' + model
  for (const field of node.fields) {
    if (ENTRY_KEYS.includes(field.key)) continue
    issues.push({
      line: field.line,
      message: label + ' 有未知字段 ' + field.key + '（已忽略；条目只认 ' + ENTRY_KEYS.join(' / ') + '）',
    })
  }

  const unitText = yamlText(yamlField(node, 'unit'))
  if (unitText === null || !PRICING_UNITS.includes(unitText as PricingUnit)) {
    issues.push({ line, message: label + ' 的 unit 必须是 ' + PRICING_UNITS.join(' / ') + '，整条跳过' })
    return null
  }
  const currency = yamlText(yamlField(node, 'currency'))
  if (currency === null || currency === '') {
    issues.push({ line, message: label + ' 缺少 currency，整条跳过' })
    return null
  }
  const source = yamlText(yamlField(node, 'source'))
  if (source === null || source === '') {
    issues.push({ line, message: label + ' 缺少 source（官方文档 URL），整条跳过' })
    return null
  }
  const fetchedAt = yamlText(yamlField(node, 'fetchedAt'))
  if (fetchedAt === null || fetchedAt === '') {
    issues.push({ line, message: label + ' 缺少 fetchedAt（抓取日期），整条跳过' })
    return null
  }
  const note = yamlText(yamlField(node, 'note'))
  if (note === null || note === '') {
    issues.push({ line, message: label + ' 缺少 note（口径说明），整条跳过' })
    return null
  }

  const rates: Partial<PricingRates> = {}
  for (const key of RATE_KEYS) {
    const field = yamlField(node, key)
    if (field === null) continue
    const value = yamlNumber(field)
    if (value === null || value < 0) {
      issues.push({ line: yamlLine(field) ?? line, message: label + ' 的 ' + key + ' 必须是非负数字（当前：' + describeNode(field) + '）' })
      continue
    }
    rates[key] = value
  }
  // 未命中输入价与输出价是每条价目的底线；缺任一项则整条跳过，宁可回落台账均价也不猜
  if (rates.input === undefined || rates.output === undefined) {
    issues.push({ line, message: label + ' 缺少有效的 input / output 价，整条跳过' })
    return null
  }

  const entry: CatalogEntry = {
    provider,
    model,
    unit: unitText as PricingUnit,
    currency,
    ...rates,
    source,
    fetchedAt,
    note,
  }
  const offPeakNode = yamlField(node, 'offPeak')
  if (offPeakNode !== null) {
    if (offPeakNode.kind !== 'map') {
      issues.push({ line: yamlLine(offPeakNode) ?? line, message: label + ' 的 offPeak 必须是映射，已按无错峰处理' })
    } else {
      for (const field of offPeakNode.fields) {
        if (OFFPEAK_KEYS.includes(field.key)) continue
        issues.push({
          line: field.line,
          message: label + ' 的 offPeak 有未知字段 ' + field.key + '（已忽略；只认 ' + OFFPEAK_KEYS.join(' / ') + '）',
        })
      }
      const windows = parseCatalogWindows(yamlField(offPeakNode, 'windows'), line, label, issues)
      if (windows.length === 0) {
        issues.push({ line: yamlLine(offPeakNode) ?? line, message: label + ' 的 offPeak 没有可用窗口（windows），已按无错峰处理' })
      } else {
        const offPeak: Partial<PricingRates> & { windows: OffPeakWindow[] } = { windows }
        for (const key of RATE_KEYS) {
          const field = yamlField(offPeakNode, key)
          if (field === null) continue
          const value = yamlNumber(field)
          if (value === null || value < 0) {
            issues.push({ line: yamlLine(field) ?? line, message: label + ' 的 offPeak.' + key + ' 必须是非负数字（当前：' + describeNode(field) + '）' })
            continue
          }
          offPeak[key] = value
        }
        entry.offPeak = offPeak
      }
    }
  }
  return entry
}

function parseCatalogWindows(node: YamlNode | null, line: number, label: string, issues: YamlIssue[]): OffPeakWindow[] {
  if (node === null) return []
  const items = yamlItems(node)
  if (items === null) {
    issues.push({ line: yamlLine(node) ?? line, message: label + ' 的 offPeak.windows 必须是列表' })
    return []
  }
  const windows: OffPeakWindow[] = []
  for (const item of items) {
    if (item.value.kind !== 'map') {
      issues.push({ line: item.line, message: label + ' 的错峰窗口必须是映射（from / to / days）' })
      continue
    }
    const from = yamlText(yamlField(item.value, 'from'))
    const to = yamlText(yamlField(item.value, 'to'))
    if (from === null || to === null || !isClockText(from) || !isClockText(to)) {
      issues.push({ line: item.line, message: label + ' 的错峰窗口 from / to 必须是 HH:MM 本地时间（24:00 表示当天末尾）' })
      continue
    }
    const daysField = yamlField(item.value, 'days')
    const days = daysField === null ? null : parseCatalogDays(daysField, item.line, label, issues)
    windows.push({ from: from.trim(), to: to.trim(), ...(days === null ? {} : { days }) })
  }
  return windows
}

/** days 缺省 = 每天适用；`days: []` 同样按「每天」理解（冻结形状用它表示缺省），不报 issue。 */
function parseCatalogDays(node: YamlNode, line: number, label: string, issues: YamlIssue[]): number[] | null {
  const items = yamlItems(node)
  if (items === null) {
    issues.push({ line: yamlLine(node) ?? line, message: label + ' 的 days 必须是行内列表，如 [1, 2, 3, 4, 5]' })
    return null
  }
  const days: number[] = []
  for (const item of items) {
    const day = yamlNumber(item.value)
    if (day === null || !Number.isInteger(day) || day < 1 || day > 7) {
      issues.push({ line: item.line, message: label + ' 的 days 只允许 1–7 的整数（当前：' + describeNode(item.value) + '）' })
      continue
    }
    if (!days.includes(day)) days.push(day)
  }
  if (days.length === 0 && items.length > 0) {
    issues.push({ line: yamlLine(node) ?? line, message: label + ' 的 days 全部非法，已按「每天适用」处理' })
    return null
  }
  return days.length === 0 ? null : days.sort((first, second) => first - second)
}
