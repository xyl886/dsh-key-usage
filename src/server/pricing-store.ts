/**
 * 用户计费规则文件的读写：`$DSH_HOME/dsh-key-usage/pricing-rules.yml`（与 quota-snapshots.json 同目录）。
 *
 * - 读：每次请求都读，按 mtime + size 缓存 → 改完文件**刷新页面即生效**，不需要重启宿主；
 * - 写：只允许写这一个路径（同目录临时文件 + rename 原子替换），请求字段先校验再落盘；
 * - 容错：文件不存在 / YAML 不支持写法 / 条目缺字段或数值非法 → 生成带行号的 issue 并跳过，
 *   绝不抛错、绝不影响其它端点，也**绝不猜单价**（猜错单价 = 算错金额）。
 */
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import {
  PRICING_MAX_RULES,
  PRICING_UNITS,
  clockMinutes,
  normalizeDays,
  ruleKeyOf,
  type OffPeakPricing,
  type OffPeakWindow,
  type PricingIssue,
  type PricingRates,
  type PricingRule,
  type PricingUnit,
} from './pricing.js'
import {
  parseYamlLite,
  yamlField,
  yamlItems,
  yamlKindLabel,
  yamlLine,
  yamlNumber,
  yamlText,
  type YamlNode,
} from './yaml-lite.js'

export const DEFAULT_CURRENCY = 'CNY'

/** 用户规则文件路径（插件目录下，唯一的可写目标）。 */
export function pricingRulesPath(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-key-usage', 'pricing-rules.yml')
}

/** 读取结果：文件状态 + 归一化后的规则 + 解析问题。 */
export interface PricingRulesFile {
  path: string
  exists: boolean
  version: number
  currency: string
  rules: PricingRule[]
  issues: PricingIssue[]
}

export type PricingWriteResult =
  | { ok: true; path: string; entries: number; issues: PricingIssue[] }
  | { ok: false; error: string }

export type RulesRequestResult =
  | { ok: true; rules: PricingRule[]; currency: string | null }
  | { ok: false; error: string }

interface CacheEntry {
  /** `mtimeMs:ctimeMs:size`：文件被改过（时间或长度变了）就重新解析。 */
  stamp: string
  file: PricingRulesFile
}

const READ_CACHE = new Map<string, CacheEntry>()

function emptyRulesFile(path: string, exists: boolean): PricingRulesFile {
  return { path, exists, version: 1, currency: DEFAULT_CURRENCY, rules: [], issues: [] }
}

/**
 * 读用户规则文件：文件不存在返回 exists:false，其它任何异常都降级成 issue（不抛错）。
 * 同一 `mtimeMs:size` 直接复用上次结果，避免每次请求都重新解析。
 */
export function readPricingRulesFile(path: string = pricingRulesPath()): PricingRulesFile {
  let stamp: string
  try {
    const stats = statSync(path)
    // 时间戳带上 ctime：同一毫秒内两次同长度写入（agent / 脚本）也不会读到旧内容
    stamp = stats.mtimeMs + ':' + stats.ctimeMs + ':' + stats.size
  } catch {
    READ_CACHE.delete(path)
    return emptyRulesFile(path, false)
  }
  const cached = READ_CACHE.get(path)
  if (cached !== undefined && cached.stamp === stamp) return cached.file

  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    // 文件在但读不出来（占用 / 权限）：不缓存这种瞬时失败
    return {
      ...emptyRulesFile(path, true),
      issues: [{ file: 'user', line: null, message: '规则文件读取失败（文件存在但读不出来）：' + path }],
    }
  }
  const file = parsePricingRulesText(text, path)
  READ_CACHE.set(path, { stamp, file })
  return file
}

/** 解析规则文件文本；任何写法问题都转成 issue，绝不抛错。 */
export function parsePricingRulesText(text: string, path: string = pricingRulesPath()): PricingRulesFile {
  const issues: PricingIssue[] = []
  const { root, issues: yamlIssues } = parseYamlLite(text)
  for (const issue of yamlIssues) issues.push({ file: 'user', line: issue.line, message: issue.message })
  if (root === null) {
    if (text.trim() !== '') issues.push({ file: 'user', line: null, message: '规则文件没有可解析的内容' })
    return { ...emptyRulesFile(path, true), issues }
  }
  // 顶层允许两种形状：{ version, currency, rules }（本插件写的）或裸列表（手写时省一层）
  const rulesNode = root.kind === 'list' ? root : yamlField(root, 'rules')
  if (rulesNode === null) {
    issues.push({ file: 'user', line: yamlLine(root), message: '缺少顶层 rules 列表（每条规则一项）' })
    return { ...emptyRulesFile(path, true), issues }
  }
  const items = yamlItems(rulesNode)
  if (items === null) {
    issues.push({ file: 'user', line: yamlLine(rulesNode), message: 'rules 必须是列表，当前是' + yamlKindLabel(rulesNode) })
    return { ...emptyRulesFile(path, true), issues }
  }
  const currency = (root.kind === 'map' ? yamlText(yamlField(root, 'currency')) : null) ?? DEFAULT_CURRENCY
  const version = (root.kind === 'map' ? yamlNumber(yamlField(root, 'version')) : null) ?? 1
  // 未知顶层键只报 issue 不中断：agent 手写时打错键名不能静默失效
  if (root.kind === 'map') {
    for (const field of root.fields) {
      if (TOP_LEVEL_KEYS.includes(field.key)) continue
      issues.push({
        file: 'user',
        line: field.line,
        message: '未知的顶层键 ' + field.key + '（已忽略；顶层只认 ' + TOP_LEVEL_KEYS.join(' / ') + '）',
      })
    }
  }
  if (items.length > PRICING_MAX_RULES) {
    issues.push({
      file: 'user',
      line: items[PRICING_MAX_RULES].line,
      message: '规则条数超过上限 ' + PRICING_MAX_RULES + '，只读取前 ' + PRICING_MAX_RULES + ' 条',
    })
  }
  const rules: PricingRule[] = []
  for (const item of items.slice(0, PRICING_MAX_RULES)) {
    const rule = parseUserRule(item.value, item.line, currency, issues)
    if (rule !== null) rules.push(rule)
  }
  return { path, exists: true, version, currency, rules, issues }
}

const RATE_KEYS = ['input', 'cacheRead', 'cacheWrite', 'output'] as const

/** 顶层与规则级允许的键（冻结形状）；其余键报 issue 但继续解析。 */
const TOP_LEVEL_KEYS = ['version', 'currency', 'rules']
const USER_RULE_KEYS = ['provider', 'model', 'unit', 'currency', ...RATE_KEYS, 'note', 'offPeak']
const OFFPEAK_KEYS = [...RATE_KEYS, 'windows']

function describeNode(node: YamlNode): string {
  return node.kind === 'scalar' ? (node.text === '' ? '空值' : node.text.slice(0, 40)) : yamlKindLabel(node)
}

function parseUserRule(node: YamlNode, line: number, fileCurrency: string, issues: PricingIssue[]): PricingRule | null {
  if (node.kind !== 'map') {
    issues.push({ file: 'user', line, message: '规则必须是映射（key: value 缩进列表），当前是' + yamlKindLabel(node) })
    return null
  }
  const provider = yamlText(yamlField(node, 'provider'))
  const model = yamlText(yamlField(node, 'model'))
  if (provider === null || provider === '') {
    issues.push({ file: 'user', line, message: '规则缺少 provider，整条跳过' })
    return null
  }
  if (model === null || model === '') {
    issues.push({ file: 'user', line, message: provider + ' 缺少 model，整条跳过' })
    return null
  }
  const label = provider + '|' + model
  for (const field of node.fields) {
    if (USER_RULE_KEYS.includes(field.key)) continue
    issues.push({
      file: 'user',
      line: field.line,
      message: label + ' 有未知字段 ' + field.key + '（已忽略；规则只认 ' + USER_RULE_KEYS.join(' / ') + '）',
    })
  }
  // unit 缺省 = perMillionTokens（与旧版归一化 / 面板默认一致）；写了但不是合法值必须跳过，
  // 因为 unit 决定数量级，静默按默认值算会差 1000 倍。
  const unitText = yamlText(yamlField(node, 'unit'))
  if (unitText !== null && !PRICING_UNITS.includes(unitText as PricingUnit)) {
    issues.push({ file: 'user', line, message: label + ' 的 unit 必须是 ' + PRICING_UNITS.join(' / ') + '，整条跳过' })
    return null
  }
  const rates: Partial<PricingRates> = {}
  for (const key of RATE_KEYS) {
    const field = yamlField(node, key)
    if (field === null) {
      issues.push({ file: 'user', line, message: label + ' 缺少 ' + key + '（四档单价必填，缺档按 0 会算成免费），整条跳过' })
      return null
    }
    const value = yamlNumber(field)
    if (value === null || value < 0) {
      issues.push({
        file: 'user',
        line: yamlLine(field) ?? line,
        message: label + ' 的 ' + key + ' 必须是非负数字（当前：' + describeNode(field) + '），整条跳过',
      })
      return null
    }
    rates[key] = value
  }
  const currency = yamlText(yamlField(node, 'currency')) ?? fileCurrency
  const rule: PricingRule = {
    provider,
    model,
    unit: (unitText ?? 'perMillionTokens') as PricingUnit,
    currency: currency === '' ? fileCurrency : currency,
    input: rates.input ?? 0,
    cacheRead: rates.cacheRead ?? 0,
    cacheWrite: rates.cacheWrite ?? 0,
    output: rates.output ?? 0,
    offPeak: null,
    note: yamlText(yamlField(node, 'note')) ?? '',
  }
  const offPeakNode = yamlField(node, 'offPeak')
  if (offPeakNode !== null) {
    if (offPeakNode.kind !== 'map') {
      issues.push({ file: 'user', line: yamlLine(offPeakNode) ?? line, message: label + ' 的 offPeak 必须是映射，已按无错峰处理' })
      return rule
    }
    for (const field of offPeakNode.fields) {
      if (OFFPEAK_KEYS.includes(field.key)) continue
      issues.push({
        file: 'user',
        line: field.line,
        message: label + ' 的 offPeak 有未知字段 ' + field.key + '（已忽略；只认 ' + OFFPEAK_KEYS.join(' / ') + '）',
      })
    }
    const windows = parseUserWindows(yamlField(offPeakNode, 'windows'), line, label, issues)
    if (windows.length === 0) {
      issues.push({ file: 'user', line: yamlLine(offPeakNode) ?? line, message: label + ' 的 offPeak 没有可用窗口（windows），已按无错峰处理' })
      return rule
    }
    // 错峰四档缺省 = 沿用标准价（与旧版归一化一致）
    const offPeak: OffPeakPricing = {
      input: rule.input,
      cacheRead: rule.cacheRead,
      cacheWrite: rule.cacheWrite,
      output: rule.output,
      windows,
    }
    for (const key of RATE_KEYS) {
      const field = yamlField(offPeakNode, key)
      if (field === null) continue
      const value = yamlNumber(field)
      if (value === null || value < 0) {
        issues.push({
          file: 'user',
          line: yamlLine(field) ?? line,
          message: label + ' 的 offPeak.' + key + ' 必须是非负数字（当前：' + describeNode(field) + '），该档沿用标准价',
        })
        continue
      }
      offPeak[key] = value
    }
    rule.offPeak = offPeak
  }
  return rule
}

function parseUserWindows(node: YamlNode | null, line: number, label: string, issues: PricingIssue[]): OffPeakWindow[] {
  if (node === null) return []
  const items = yamlItems(node)
  if (items === null) {
    issues.push({ file: 'user', line: yamlLine(node) ?? line, message: label + ' 的 offPeak.windows 必须是列表' })
    return []
  }
  const windows: OffPeakWindow[] = []
  for (const item of items) {
    if (item.value.kind !== 'map') {
      issues.push({ file: 'user', line: item.line, message: label + ' 的错峰窗口必须是映射（from / to / days）' })
      continue
    }
    const from = yamlText(yamlField(item.value, 'from'))
    const to = yamlText(yamlField(item.value, 'to'))
    if (from === null || to === null || clockMinutes(from) === null || clockMinutes(to) === null) {
      issues.push({ file: 'user', line: item.line, message: label + ' 的错峰窗口 from / to 必须是本地时间 HH:MM（24:00 表示当天末尾）' })
      continue
    }
    const daysField = yamlField(item.value, 'days')
    const days = daysField === null ? undefined : parseUserDays(daysField, item.line, label, issues)
    windows.push({ from: from.trim(), to: to.trim(), ...(days === undefined ? {} : { days }) })
  }
  return windows
}

/** days 缺省 = 每天适用；`days: []` 也按「每天」理解（冻结形状用它表示缺省），不报 issue。 */
function parseUserDays(node: YamlNode, line: number, label: string, issues: PricingIssue[]): number[] | undefined {
  const items = yamlItems(node)
  if (items === null) {
    issues.push({ file: 'user', line: yamlLine(node) ?? line, message: label + ' 的 days 必须是行内列表，如 [1, 2, 3, 4, 5]' })
    return undefined
  }
  const values: number[] = []
  for (const item of items) {
    const day = yamlNumber(item.value)
    if (day === null || !Number.isInteger(day) || day < 1 || day > 7) {
      issues.push({ file: 'user', line: item.line, message: label + ' 的 days 只允许 1–7 的整数（当前：' + describeNode(item.value) + '）' })
      continue
    }
    values.push(day)
  }
  const days = normalizeDays(values)
  if (days === undefined && values.length > 0) {
    issues.push({ file: 'user', line: yamlLine(node) ?? line, message: label + ' 的 days 没有有效值，已按「每天适用」处理' })
  }
  return days
}

/**
 * POST 合并语义（冻结契约）：按 `provider|model` 与**现有文件条目**对齐 ——
 * 旧条目的 unit / offPeak / note 保留（面板只有五类字段，这三项只在 YAML 里编辑，保存不能清空），
 * 新条目 unit 默认 perMillionTokens、offPeak null、note ''；其余字段以请求为准，顺序按请求。
 */
export function mergeRulesForWrite(current: PricingRule[], incoming: PricingRule[]): PricingRule[] {
  const existing = new Map(current.map((rule) => [ruleKeyOf(rule), rule]))
  return incoming.map((rule) => {
    const previous = existing.get(ruleKeyOf(rule))
    return {
      ...rule,
      unit: previous?.unit ?? 'perMillionTokens',
      offPeak: previous?.offPeak ?? null,
      note: previous?.note ?? '',
    }
  })
}

/** 请求体解析（POST /dsh-key-usage/pricing/rules）：非法输入一律给可读的 ok:false，不写半份文件。 */
export function parseRulesRequest(payload: unknown): RulesRequestResult {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, error: '请求体必须是 JSON 对象，形如 { rules: [ … ] }' }
  }
  const record = payload as Record<string, unknown>
  const currency = record.currency === undefined ? null : textOf(record.currency)
  if (record.currency !== undefined && (currency === null || currency === '')) {
    return { ok: false, error: 'currency 必须是非空字符串' }
  }
  if (!Array.isArray(record.rules)) return { ok: false, error: 'rules 必须是数组' }
  if (record.rules.length > PRICING_MAX_RULES) {
    return { ok: false, error: '规则条数超过上限 ' + PRICING_MAX_RULES + ' 条' }
  }
  const rules: PricingRule[] = []
  const seen = new Map<string, number>()
  for (let index = 0; index < record.rules.length; index += 1) {
    const rawRule = record.rules[index]
    const position = '第 ' + (index + 1) + ' 条规则'
    if (typeof rawRule !== 'object' || rawRule === null || Array.isArray(rawRule)) {
      return { ok: false, error: position + '必须是对象' }
    }
    const rule = rawRule as Record<string, unknown>
    const provider = textOf(rule.provider)
    const model = textOf(rule.model)
    if (provider === null || provider === '' || provider.length > 200) {
      return { ok: false, error: position + '的 provider 必须是 1–200 字符的字符串' }
    }
    if (model === null || model === '' || model.length > 200) {
      return { ok: false, error: position + '的 model 必须是 1–200 字符的字符串' }
    }
    const ruleCurrency = textOf(rule.currency)
    if (ruleCurrency === null || ruleCurrency === '') return { ok: false, error: position + '的 currency 必须是非空字符串' }
    const rates: Partial<PricingRates> = {}
    for (const key of RATE_KEYS) {
      const value = numberOf(rule[key])
      if (value === null || value < 0) {
        return { ok: false, error: position + '的 ' + key + ' 必须是非负数字（当前：' + describeValue(rule[key]) + '）' }
      }
      rates[key] = value
    }
    const key = provider + '|' + model
    const duplicate = seen.get(key)
    if (duplicate !== undefined) {
      return { ok: false, error: '第 ' + (duplicate + 1) + ' 条与' + position + '的 provider|model 重复（' + key + '）' }
    }
    seen.set(key, index)
    rules.push({
      provider,
      model,
      unit: 'perMillionTokens',
      currency: ruleCurrency,
      input: rates.input ?? 0,
      cacheRead: rates.cacheRead ?? 0,
      cacheWrite: rates.cacheWrite ?? 0,
      output: rates.output ?? 0,
      offPeak: null,
      note: '',
    })
  }
  return { ok: true, rules, currency }
}

function textOf(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null
}

/** 数字字段：接受数字或纯数字字符串（表单里常见），其余一律 null。 */
function numberOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = textOf(value)
  if (text === null || text === '' || !/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(text)) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function describeValue(value: unknown): string {
  if (value === undefined) return '缺失'
  if (value === null) return 'null'
  if (typeof value === 'string') return value === '' ? '空字符串' : value.slice(0, 40)
  return typeof value
}

/**
 * 原子写：同目录临时文件 + rename（避免读到半截文件）。
 * 只允许写 `$DSH_HOME/dsh-key-usage/pricing-rules.yml`，其它路径一律拒绝。
 */
export function writePricingRulesFile(
  path: string,
  rules: PricingRule[],
  currency: string = DEFAULT_CURRENCY,
): PricingWriteResult {
  const problem = writableTargetProblem(path)
  if (problem !== null) return { ok: false, error: problem }
  if (rules.length > PRICING_MAX_RULES) return { ok: false, error: '规则条数超过上限 ' + PRICING_MAX_RULES + ' 条' }
  try {
    const text = serializePricingRules(rules, currency)
    mkdirSync(dirname(path), { recursive: true })
    const temporaryPath = path + '.tmp'
    writeFileSync(temporaryPath, text, 'utf8')
    renameSync(temporaryPath, path)
  } catch (error) {
    return { ok: false, error: '写入规则文件失败：' + (error instanceof Error ? error.message : String(error)) }
  }
  // 立刻失效缓存：下一次读取重新 stat + 解析（写完后同一请求里就能读到新内容）
  READ_CACHE.delete(path)
  const reloaded = readPricingRulesFile(path)
  return { ok: true, path, entries: reloaded.rules.length, issues: reloaded.issues }
}

/** 写目标守卫：文件名 + 目录都要对得上（Windows 路径大小写不敏感）。 */
function writableTargetProblem(path: string): string | null {
  if (basename(path) !== 'pricing-rules.yml') {
    return '只允许写 pricing-rules.yml（当前目标：' + path + '）'
  }
  if (resolve(path).toLowerCase() !== resolve(pricingRulesPath()).toLowerCase()) {
    return '只允许写 $DSH_HOME/dsh-key-usage/pricing-rules.yml（当前目标：' + path + '）'
  }
  return null
}

/** 文件头注释：字段含义、四档单价、unit 取值、错峰 windows 的 days 语义、改完刷新即生效。 */
const RULES_FILE_HEADER = [
  '# dsh-key-usage 计费规则（用户覆盖）',
  '#',
  '# 这是插件自己维护的文件：面板保存时由服务端原子重写；你也可以（或让 agent）直接改它。',
  '# 保存后**刷新页面即生效**，不需要重启 DSH。',
  '#',
  '# 结构：',
  '#   version         文件格式版本（当前固定 1）',
  '#   currency        默认币种；单条规则可用自己的 currency 覆盖。跨币种不换算、不合计。',
  '#   rules           规则列表，按 provider|model 匹配；同一个 provider|model 只保留第一条。',
  '#     provider      通道 id（如 deepseek-official）；"*" 表示任意通道（必须加引号）',
  '#     model         模型 id；"*" 表示该通道全部模型（必须加引号）',
  '#     unit          计价单位：perMillionTokens（每百万 tokens）/ perThousandTokens（每千 tokens）/ perCall（每次调用）',
  '#     input         未命中缓存的输入价；cacheRead 缓存命中价；cacheWrite 缓存写入价；output 输出价',
  '#                   四档都必须给（缺一档就跳过该条：把缺失当 0 会静默算成免费）',
  '#     offPeak       可选错峰价：windows 给时段，其余四档缺省就沿用标准价',
  '#       windows     { from, to, days }：本地时间 HH:MM；起止相同 = 全天，from > to = 跨午夜，24:00 = 当天末尾',
  '#       days        ISO 星期 1=周一 … 7=周日；**缺省 = 每天都适用**（与升级前的规则语义一致）',
  '#     note          备注，界面原样显示',
  '#',
  '# 只支持受限 YAML 子集：注释、缩进映射、"- " 列表、行内 "[a, b]"、引号字符串、数字 / 布尔 / null。',
  '# 不支持 tab 缩进、| / > 块标量、锚点 & / 别名 *、多文档 ---、{…} flow 映射：',
  '# 这些写法会在「计费」面板里报成 issue 并跳过该条，不会静默算错金额。字符串建议一律单引号。',
]

/**
 * 序列化（冻结形状）：块序列 + 每字段一行 + 2 空格缩进；时间用双引号，`days: []` 表示「每天」。
 * 字符串能安全明文写就明文（更贴近手写 YAML），否则单引号转义 —— `*` / 含空格首尾 / 含 `#`、`:` 的值
 * 不加引号会被 YAML 规则改义，必须转义。换行折成空格，避免行式结构被破坏。
 */
export function serializePricingRules(rules: PricingRule[], currency: string = DEFAULT_CURRENCY): string {
  const lines = [...RULES_FILE_HEADER]
  lines.push('')
  lines.push('version: 1')
  lines.push('currency: ' + plainText(currency))
  if (rules.length === 0) {
    lines.push('rules: []')
    return lines.join('\n') + '\n'
  }
  lines.push('rules:')
  for (const rule of rules) {
    lines.push('  - provider: ' + plainText(rule.provider))
    lines.push('    model: ' + plainText(rule.model))
    lines.push('    unit: ' + plainText(rule.unit))
    lines.push('    currency: ' + plainText(rule.currency))
    for (const key of RATE_KEYS) lines.push('    ' + key + ': ' + numberText(rule[key]))
    lines.push('    note: ' + plainText(rule.note))
    if (rule.offPeak === null) continue
    lines.push('    offPeak:')
    if (rule.offPeak.windows.length === 0) {
      lines.push('      windows: []')
    } else {
      lines.push('      windows:')
      for (const window of rule.offPeak.windows) {
        lines.push('        - from: ' + doubleQuoted(window.from))
        lines.push('          to: ' + doubleQuoted(window.to))
        lines.push('          days: [' + (window.days ?? []).join(', ') + ']')
      }
    }
    for (const key of RATE_KEYS) lines.push('      ' + key + ': ' + numberText(rule.offPeak[key]))
  }
  return lines.join('\n') + '\n'
}

/** 明文安全判定：首尾无空白、无连续空格、不含会被 YAML 改义的字符、不是保留字 / 数字。 */
const PLAIN_TEXT = /^[A-Za-z0-9\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff ._/@+-]*$/
const RESERVED_TEXT = /^(true|false|null|yes|no|on|off|~)$/i
const NUMBER_TEXT = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/

function plainText(text: string): string {
  const value = String(text).replace(/\r?\n/g, ' ')
  const safe = PLAIN_TEXT.test(value)
    && value === value.trim()
    && !value.includes('  ')
    && !RESERVED_TEXT.test(value)
    && !NUMBER_TEXT.test(value)
  return safe ? value : quoteText(value)
}

function quoteText(text: string): string {
  return "'" + String(text).replace(/\r?\n/g, ' ').replace(/'/g, "''") + "'"
}

function doubleQuoted(text: string): string {
  return '"' + String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

function numberText(value: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('单价必须是非负有限数字（当前：' + String(value) + '）')
  }
  return String(value)
}
