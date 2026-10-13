/**
 * 内置官方价目（纯静态数据，零外网）：从各厂商**官方文档**抓取，作为「用户规则」之后、
 * 「台账反推均价」之前的第三级依据，让用户不填规则也能拿到接近真实的金额。
 *
 * 写入原则（更新价目时同样遵守）：
 * - 只写文档里**明确给出**的价格；文档没写的档位留空（`undefined`），不用同类模型顶替、不猜测；
 * - 每条都带 `source`（精确 URL）与 `fetchedAt`（抓取日期），界面上可追溯；
 * - 币种按文档原样记录，**不做任何汇率换算**（DeepSeek 取中文文档的 CNY；Kimi 为 CNY；
 *   OpenRouter / Z.ai 文档只有 USD）。
 */
import type { OffPeakWindow, PricingRates, PricingRule, PricingUnit } from './pricing.js'

/** 一条内置价目：四档价可缺档（文档没写就留 undefined，绝不用同类模型顶替）。 */
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

/** 抓取日期：更新价目时统一改这里，避免每条手写导致漂移。 */
const FETCHED_AT = '2026-10-13'

/* ------------------------------------------------------------------ *
 * DeepSeek 官方（CNY / 百万 tokens）
 * 来源：https://api-docs.deepseek.com/zh-cn/quick_start/pricing （英文页同价、不同币种）
 * 取**中文文档的 CNY 价**，不做汇率换算。
 *
 * 错峰换算依据：官方原文「空闲时段价格为高峰时段价格的一半。北京时间周一至周五
 * （不含中国法定节假日）9:00–12:00、14:00–18:00 为高峰时段；其余时段，包括周末及
 * 中国法定节假日全天均为空闲时段」。窗口按**本地时间**判定，且高峰只在周一至周五，
 * 因此每个窗口都带 `days`（1=周一 … 7=周日）：工作日三段 + 周末全天一段。
 * 注意：规则模型表达不了「中国法定节假日」，节假日会被算成高峰价，这是已知近似，
 * 与换算依据一并写进 offPeak 的 note。
 * ------------------------------------------------------------------ */

const DEEPSEEK_SOURCE = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing'
const DEEPSEEK_OFFPEAK_NOTE =
  '错峰 = 高峰半价。高峰为北京时间周一至周五（不含中国法定节假日）9:00–12:00 与 14:00–18:00，'
  + '其余时段（含周末全天）均为空闲时段；窗口按本地时间判定，工作日三段与周末全天各用一条窗口表达。'
  + '限制：插件没有中国法定节假日日历，节假日会按高峰价算 —— 这是已知近似（方向：把空闲当高峰，金额偏高）。'

const deepseekOffPeakWindows: OffPeakWindow[] = [
  { from: '00:00', to: '09:00', days: [1, 2, 3, 4, 5] },
  { from: '12:00', to: '14:00', days: [1, 2, 3, 4, 5] },
  { from: '18:00', to: '00:00', days: [1, 2, 3, 4, 5] },
  { from: '00:00', to: '00:00', days: [6, 7] },
]

const DEEPSEEK_ENTRIES: CatalogEntry[] = [
  {
    provider: 'deepseek-official',
    model: 'deepseek-flash',
    unit: 'perMillionTokens',
    currency: 'CNY',
    // 官方表未单列「缓存写入」：DeepSeek 缓存写按未命中价计（命中价另有专档），此处沿用未命中价
    input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8,
    offPeak: { windows: deepseekOffPeakWindows, input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    source: DEEPSEEK_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'deepseek-flash（模型版本 DeepSeek-V4.1-Flash）高峰价：未命中 ¥2.00 / 命中 ¥0.04 / 输出 ¥8.00；'
      + '缓存写入档文档未单列，沿用未命中价（口径推断，见 docs/05 附录 A.5）。' + DEEPSEEK_OFFPEAK_NOTE,
  },
  {
    // 官方标注：deepseek-v4-flash 与 deepseek-v4-flash-vision-exp 为旧名，请求按 Flash 价计费
    provider: 'deepseek-official',
    model: 'deepseek-v4-flash',
    unit: 'perMillionTokens',
    currency: 'CNY',
    input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8,
    offPeak: { windows: deepseekOffPeakWindows, input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    source: DEEPSEEK_SOURCE,
    fetchedAt: FETCHED_AT,
    note: '旧模型名：官方注明请求由 DeepSeek-V4.1-Flash 提供服务并按 Flash 价计费，故与 deepseek-flash 同价。'
      + DEEPSEEK_OFFPEAK_NOTE,
  },
  {
    provider: 'deepseek-official',
    model: 'deepseek-v4-flash-vision-exp',
    unit: 'perMillionTokens',
    currency: 'CNY',
    input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8,
    offPeak: { windows: deepseekOffPeakWindows, input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    source: DEEPSEEK_SOURCE,
    fetchedAt: FETCHED_AT,
    note: '旧模型名（同 deepseek-v4-flash 的计费说明）：按 Flash 价计费。' + DEEPSEEK_OFFPEAK_NOTE,
  },
  {
    provider: 'deepseek-official',
    model: 'deepseek-v4-pro',
    unit: 'perMillionTokens',
    currency: 'CNY',
    input: 9, cacheRead: 0.3, cacheWrite: 9, output: 27,
    offPeak: { windows: deepseekOffPeakWindows, input: 4.5, cacheRead: 0.15, cacheWrite: 4.5, output: 13.5 },
    source: DEEPSEEK_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'deepseek-v4-pro（DeepSeek-V4-Pro-0813）高峰价：未命中 ¥9.00 / 命中 ¥0.30 / 输出 ¥27.00；'
      + '缓存写入档文档未单列，沿用未命中价。' + DEEPSEEK_OFFPEAK_NOTE,
  },
]

/* ------------------------------------------------------------------ *
 * Moonshot / Kimi（CNY / 百万 tokens）
 * 来源：https://platform.kimi.com/docs/pricing/chat
 * 官方口径：K3 缓存写入按 TTL 分 5min / 1h 两档单独计费，未指定 TTL 默认 5min；
 * 本插件只有一个「缓存写入」档，因此取**默认 5min 档**，1h 档价差写进 note。
 * K2 系列官方表**没有**缓存写入列，故 cacheWrite 留空。
 * ------------------------------------------------------------------ */

const KIMI_SOURCE = 'https://platform.kimi.com/docs/pricing/chat'
const KIMI_TTL_NOTE = '官方缓存写入分 TTL 5min（本插件取此档，为默认档）/ 1h（¥40.00）两档。'

const KIMI_ENTRIES: CatalogEntry[] = [
  {
    provider: 'moonshotai',
    model: 'kimi-k3',
    unit: 'perMillionTokens',
    currency: 'CNY',
    input: 20, cacheRead: 2, cacheWrite: 20, output: 100,
    source: KIMI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'K3 系列（1M tokens 计价，上下文窗口 1,048,576）：未命中 ¥20.00 / 命中 ¥2.00 / 输出 ¥100.00。' + KIMI_TTL_NOTE,
  },
  {
    provider: 'moonshotai',
    model: 'kimi-k2.7-code',
    unit: 'perMillionTokens',
    currency: 'CNY',
    input: 6.5, cacheRead: 1.3, output: 27,
    source: KIMI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'K2.7 Code（上下文窗口 262,144）：未命中 ¥6.50 / 命中 ¥1.30 / 输出 ¥27.00。'
      + '官方 K2 系列价格表没有「缓存写入」列，该档留空（不按输入价顶替）。',
  },
  {
    provider: 'moonshotai',
    model: 'kimi-k2.7-code-highspeed',
    unit: 'perMillionTokens',
    currency: 'CNY',
    input: 13, cacheRead: 2.6, output: 54,
    source: KIMI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'K2.7 Code Highspeed：未命中 ¥13.00 / 命中 ¥2.60 / 输出 ¥54.00。'
      + '官方 K2 系列价格表没有「缓存写入」列，该档留空。',
  },
  {
    provider: 'moonshotai',
    model: 'kimi-k2.6',
    unit: 'perMillionTokens',
    currency: 'CNY',
    input: 6.5, cacheRead: 1.1, output: 27,
    source: KIMI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'K2.6（上下文窗口 262,144）：未命中 ¥6.50 / 命中 ¥1.10 / 输出 ¥27.00。'
      + '官方 K2 系列价格表没有「缓存写入」列，该档留空。',
  },
]

/* ------------------------------------------------------------------ *
 * Z.ai / GLM（USD / 百万 tokens）
 * 来源：https://docs.z.ai/guides/overview/pricing
 * 官方列：Input / Cached Input / Cached Input Storage / Output。
 * 「Cached Input Storage」文档标为 Limited-time Free（限时免费）→ 本插件 cacheWrite 记 0，
 * 属于「文档明确给出的 0」而不是缺档。
 * ------------------------------------------------------------------ */

const ZAI_SOURCE = 'https://docs.z.ai/guides/overview/pricing'
const ZAI_NOTE = '缓存写入档对应官方「Cached Input Storage」，文档标注 Limited-time Free（限时免费），故记 0。'

const ZAI_ENTRIES: CatalogEntry[] = [
  {
    provider: 'zai',
    model: 'glm-5.3',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 1.4, cacheRead: 0.26, cacheWrite: 0, output: 4.4,
    source: ZAI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'GLM-5.3：输入 $1.4 / 缓存命中 $0.26 / 输出 $4.4。' + ZAI_NOTE,
  },
  {
    provider: 'zai',
    model: 'glm-5.3-flash',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 0.15, cacheRead: 0.03, cacheWrite: 0, output: 0.5,
    source: ZAI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'GLM-5.3-Flash：输入 $0.15 / 缓存命中 $0.03 / 输出 $0.50。' + ZAI_NOTE,
  },
  {
    provider: 'zai',
    model: 'glm-5.3-flashx',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 0.37, cacheRead: 0.075, cacheWrite: 0, output: 1.25,
    source: ZAI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'GLM-5.3-FlashX：输入 $0.37 / 缓存命中 $0.075 / 输出 $1.25。' + ZAI_NOTE,
  },
  {
    provider: 'zai',
    model: 'glm-5.2',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 1.4, cacheRead: 0.26, cacheWrite: 0, output: 4.4,
    source: ZAI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'GLM-5.2：输入 $1.4 / 缓存命中 $0.26 / 输出 $4.4。' + ZAI_NOTE,
  },
  {
    provider: 'zai',
    model: 'glm-5',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 1, cacheRead: 0.2, cacheWrite: 0, output: 3.2,
    source: ZAI_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'GLM-5（Text Models 表）：输入 $1 / 缓存命中 $0.2 / 输出 $3.2。' + ZAI_NOTE,
  },
]

/* ------------------------------------------------------------------ *
 * OpenRouter（USD / token → 本插件按 perMillionTokens 记录）
 * 来源：https://openrouter.ai/api/v1/models 的 `pricing` 字段（**per token** 的 USD 字符串）。
 * 换算：per token × 1e6 = 每百万 tokens，即 0.0000000441 → $0.0441 / MTok。
 * 只收录用户实际会用到的四个家族各 1–2 个主流型号；`:batch` 变体价更低，未收录。
 * 注意：这里是 OpenRouter 的中转价，与厂商直连价不同（如 deepseek/deepseek-v4.1-flash
 * 的 $0.0441 是 OpenRouter 侧报价，DeepSeek 官方 flash 未命中价是 $0.30 —— 两者不是一回事）。
 * `overrides`（超长上下文的阶梯价）本插件模型表达不了，未收录，见 note。
 * ------------------------------------------------------------------ */

const OPENROUTER_SOURCE = 'https://openrouter.ai/api/v1/models'
const OPENROUTER_UNIT_NOTE = '官方 pricing 为 USD per token，此处 ×1e6 换算为每百万 tokens。'
const OPENROUTER_OVERRIDE_NOTE = '官方另有 overrides 阶梯价（超长提示按更高单价计），本插件价格模型表达不了，未收录。'

const OPENROUTER_ENTRIES: CatalogEntry[] = [
  {
    provider: 'openrouter',
    model: 'deepseek/deepseek-v4.1-flash',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 0.0441, cacheRead: 0.0054, output: 0.63,
    source: OPENROUTER_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'OpenRouter 中转价（非 DeepSeek 官方直连价）：prompt 0.0000000441 / completion 0.00000063 / '
      + 'input_cache_read 0.0000000054。无 input_cache_write 字段，缓存写入档留空。' + OPENROUTER_UNIT_NOTE,
  },
  {
    provider: 'openrouter',
    model: 'anthropic/claude-sonnet-5.5',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 2, cacheRead: 0.1, cacheWrite: 2.5, output: 10,
    source: OPENROUTER_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'Claude Sonnet 5.5：prompt 0.000002 / completion 0.00001 / cache_read 0.0000001 / cache_write 0.0000025。'
      + '另有 input_cache_write_1h 0.000004（1 小时 TTL），本插件只有一个缓存写入档，取默认档。'
      + OPENROUTER_UNIT_NOTE + OPENROUTER_OVERRIDE_NOTE,
  },
  {
    provider: 'openrouter',
    model: 'anthropic/claude-opus-5.5',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 4, cacheRead: 0.2, cacheWrite: 5, output: 20,
    source: OPENROUTER_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'Claude Opus 5.5：prompt 0.000004 / completion 0.00002 / cache_read 0.0000002 / cache_write 0.000005。'
      + OPENROUTER_UNIT_NOTE,
  },
  {
    provider: 'openrouter',
    model: 'openai/gpt-6.1-sol',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 2, cacheRead: 0.1, cacheWrite: 2.5, output: 10,
    source: OPENROUTER_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'GPT-6.1 Sol：prompt 0.000002 / completion 0.00001 / cache_read 0.0000001 / cache_write 0.0000025。'
      + OPENROUTER_UNIT_NOTE + OPENROUTER_OVERRIDE_NOTE,
  },
  {
    provider: 'openrouter',
    model: 'openai/gpt-6-astra',
    unit: 'perMillionTokens',
    currency: 'USD',
    input: 10, cacheRead: 1, cacheWrite: 12.5, output: 50,
    source: OPENROUTER_SOURCE,
    fetchedAt: FETCHED_AT,
    note: 'GPT-6 Astra：prompt 0.00001 / completion 0.00005 / cache_read 0.000001 / cache_write 0.0000125。'
      + OPENROUTER_UNIT_NOTE + OPENROUTER_OVERRIDE_NOTE,
  },
]

/* ------------------------------------------------------------------ *
 * 汇总：按厂商分组，便于以后整体替换某一家。
 * ------------------------------------------------------------------ */

export const PRICING_CATALOG: CatalogEntry[] = [
  ...DEEPSEEK_ENTRIES,
  ...KIMI_ENTRIES,
  ...ZAI_ENTRIES,
  ...OPENROUTER_ENTRIES,
]

/** 内置价目的覆盖摘要（计费面板展示「已内置 N 条，来源见 …」）。 */
export interface CatalogSourceSummary {
  fetchedAt: string
  /** 该来源下收录的通道集合。 */
  providers: string[]
  /** 该来源收录的条数。 */
  count: number
  source: string
}

export function catalogSources(): CatalogSourceSummary[] {
  const bySource = new Map<string, CatalogSourceSummary>()
  for (const entry of PRICING_CATALOG) {
    const existing = bySource.get(entry.source)
    if (existing === undefined) {
      bySource.set(entry.source, { source: entry.source, fetchedAt: entry.fetchedAt, providers: [entry.provider], count: 1 })
      continue
    }
    existing.count += 1
    if (!existing.providers.includes(entry.provider)) existing.providers.push(entry.provider)
  }
  return [...bySource.values()]
}

/** 价目条数（界面文案用）。 */
export function catalogEntryCount(): number {
  return PRICING_CATALOG.length
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

/** 通道 id 归一：同样取末段（事件里的 provider 可能是路由名）。 */
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
    const hit = PRICING_CATALOG.find(matches)
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
