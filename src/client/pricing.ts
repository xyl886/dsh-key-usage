/**
 * 客户端价目视图模型：来源角标文案、来源说明与内置 / 聚合价目的装载状态。
 *
 * 价格本身全部由服务端决定（内置官方价目 → LiteLLM 聚合价目 → 台账反推均价三层自动生效），
 * **界面不维护任何价格、也不提供价格表单**：这里只负责把服务端给的来源、覆盖度、文件与解析问题
 * 翻译成给人看的文案。金额渲染见 `currency.ts`（显示币种与汇率折算的唯一收口点）。
 */

/**
 * 成本来源角标：与服务端 `costSource` 字段一一对应。
 * `official` = 台账里的厂商账单；`catalog` = 内置厂商官方价目；`aggregate` = LiteLLM 聚合价目；
 * `estimate` = 台账反推均价；`none` = 没有价格依据。
 */
export type CostSource = 'official' | 'catalog' | 'aggregate' | 'estimate' | 'none'

/** 内置官方价目的一个来源（计费信息里展示「已内置 N 条，来源见 …」）。 */
export interface CatalogSourceSummary {
  source: string
  fetchedAt: string
  providers: string[]
  count: number
}

/** 内置官方价目：条数 + 各来源（含抓取日期）。逐条规则只在服务端用，界面不再需要。 */
export interface CatalogSummary {
  entries: number
  sources: CatalogSourceSummary[]
}

/** 聚合价目的装载来源：shipped = 随包快照；local = 本机刷新下来的文件；none = 两个都读不到。 */
export type AggregateLoaded = 'local' | 'shipped' | 'none'

export const AGGREGATE_LOADED_LABELS: Record<AggregateLoaded, string> = {
  local: '本地刷新文件',
  shipped: '随包快照',
  none: '未装载',
}

/** 装载状态文案；服务端给了没见过的取值时按「未知」显示，不崩。 */
export function aggregateLoadedLabelOf(loaded: string | null | undefined): string {
  if (loaded === 'local' || loaded === 'shipped' || loaded === 'none') return AGGREGATE_LOADED_LABELS[loaded]
  return loaded === undefined || loaded === null || loaded === '' ? '未装载' : '未知（' + loaded + '）'
}

/** 聚合价目装载 / 刷新过程中出现的问题。 */
export interface AggregateIssue {
  kind: string
  message: string
}

/**
 * LiteLLM 聚合价目（第三方维护、美元计价）：随包内置一份快照，点「刷新价目」才联网更新到本机。
 * 优先级低于内置的厂商官方价目；服务端未升级时整块缺省，界面按「读不到」降级。
 */
export interface ModelPriceAggregate {
  loaded: AggregateLoaded
  path: string
  shippedPath: string
  localPath: string
  entries: number
  models: number
  usd: boolean
  fetchedAt: string | null
  bytes: number
  sha256: string | null
  source: string
  license: string
  upstreamCommit: string | null
  issues: AggregateIssue[]
}

/**
 * LiteLLM 仓库地址。这里**不能**写带协议前缀的完整地址字面量：构建后处理
 * （scripts/normalize-client-banner.mjs）按「字母 + 冒号 + 斜杠」的形状扫全文件找「机器相关绝对路径」，
 * 协议前缀正好长成那个形状，会被误判成盘符路径而让 `npm run build:client` 直接失败。
 * 因此拆成三段拼；注意冒号必须在第二段里（`'https' + '//x'` 会少一个冒号）。
 */
export const LITELLM_REPO_URL = ['https', '://github.com', '/BerriAI/litellm'].join('')

/** 字节数 → MB 文本；拿不到合法数字时返回 null，由调用方整段省略（不显示 undefined）。 */
export function megabytesTextOf(bytes: unknown): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return null
  return (bytes / 1048576).toFixed(2) + ' MB'
}

/** URL 里的主机名（刷新回执的「来源」）；解析不出来返回 null。 */
export function hostOf(url: unknown): string | null {
  if (typeof url !== 'string' || url.trim() === '') return null
  try {
    const host = new URL(url).host
    return host === '' ? null : host
  } catch {
    return null
  }
}

/** 上游 commit 的短写法；太短或缺失时返回 null（完整值挂在装载信息的 tooltip 上）。 */
export function shortCommitOf(commit: unknown): string | null {
  if (typeof commit !== 'string' || commit.trim().length < 7) return null
  return commit.trim().slice(0, 7)
}

/**
 * 覆盖度：三层价格各命中多少个模型 + 台账兜底 / 无依据的模型数。
 * 字段全部可选：服务端换了口径也不会让界面渲染出 `undefined`（缺失的整段省略）。
 */
export interface PricingCoverage {
  from?: string
  to?: string
  /** 命中内置官方价目的模型数（自动生效，不需要用户维护）。 */
  catalogModels?: number
  /** 命中 LiteLLM 聚合价目的模型数（第三方、USD）。 */
  aggregateModels?: number
  /** 上面两层里标了 partial 的模型数（缺一个缓存价、按未命中价代）。 */
  partialModels?: number
  /** 按台账反推均价兜底的模型数。 */
  averagedModels?: number
  /** 三层都没命中的模型数。 */
  unpricedModels?: number
}

/** 一个价目文件的位置与状态（`entries` 是文件里解析出的条目数）。 */
export interface PricingFileInfo {
  path: string
  exists: boolean
  entries: number
}

export interface PricingFiles {
  /** 插件内置的厂商官方价目（随包发布，只读）。 */
  catalog: PricingFileInfo
}

/** 解析问题：`file` 指出是哪个文件（用户规则层已移除，只有内置价目），`line` 是 1 基行号（拿不到行号时为 null）。 */
export interface PricingIssue {
  file: 'catalog'
  line: number | null
  message: string
}

export interface PricingResponse {
  /** 内置官方价目：条数 + 各来源（含抓取日期），无需用户维护即自动生效。 */
  catalog: CatalogSummary
  coverage: PricingCoverage
  /** 内置价目文件的位置与状态；缺省按「未知」处理（服务端未升级时不至于整块报错）。 */
  files?: PricingFiles
  /** 价目文件的解析问题，带行号；缺省为空数组。 */
  issues?: PricingIssue[]
  /** LiteLLM 聚合价目（第三方、USD）：随包快照 + 本地刷新文件；服务端未升级时缺省。 */
  aggregate?: ModelPriceAggregate
}

/** 刷新价目接口的返回：服务端一律 HTTP 200，失败原因在 `error` 里（中文，可直接展示）。 */
export type PricingRefreshResult =
  | { ok: true; url: string; bytes: number; entries: number; sha256: string; fetchedAt: string }
  | { ok: false; error: string }

export const COST_SOURCE_LABELS: Record<CostSource, string> = {
  official: '官方',
  catalog: '官方价',
  aggregate: '聚合',
  estimate: '估算',
  none: '—',
}

/** 角标的悬浮说明：让「估算」不会被当成账单金额用。 */
export const COST_SOURCE_HINTS: Record<CostSource, string> = {
  official: '官方：台账记录的厂商账单金额',
  catalog: '官方价：按插件内置的厂商官方价目算出（自动生效，界面上可查来源）',
  aggregate: '聚合：LiteLLM 聚合价目（美元、第三方维护），点「刷新价目」可更新',
  estimate: '估算：按台账反推的均价推算',
  none: '没有价格依据（三层价目都没命中，台账也无成本数据）',
}

/**
 * 聚合价目的「部分」标记：该条目缺一个缓存价（缓存写入价未收录），用未命中价代。
 * 这是口径说明而不是错误，角标旁只写「· 部分」，展开说明放 tooltip。
 */
export const PARTIAL_PRICE_TEXT = ' · 部分'
export const PARTIAL_PRICE_HINT = '缓存写入价未收录，按未命中价计'

/** 角标悬浮说明：带 `partial` 时补一句口径，避免「部分」被读成缺数据 / 报错。 */
export function costSourceHintOf(source: CostSource | null | undefined, partial?: boolean | null): string {
  // 服务端将来加了新档位时，这里不能把 undefined 拼进文案
  const hint = COST_SOURCE_HINTS[source ?? 'none'] ?? '成本来源未识别：' + String(source ?? '')
  return partial === true ? hint + '；' + PARTIAL_PRICE_HINT : hint
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
