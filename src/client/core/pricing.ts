/**
 * 价目视图模型：只把服务端给的三层价目来源、覆盖度与装载状态翻译成文案，**界面不维护任何价格**。
 * 金额渲染见 `currency.ts`（显示币种与汇率折算的唯一收口点）。
 */

/** 成本来源角标，与服务端 `costSource` 一一对应。 */
import { localTimeTextOf } from './format.ts'
import { t } from './i18n.ts'

export type CostSource = 'official' | 'catalog' | 'aggregate' | 'model' | 'none'

export interface CatalogSourceSummary {
  source: string
  fetchedAt: string
  providers: string[]
  count: number
}

/** 内置官方价目：条数 + 各来源（含抓取日期）。 */
export interface CatalogSummary {
  entries: number
  sources: CatalogSourceSummary[]
}

/** 聚合价目装载来源：local = 本机刷新文件；shipped = 随包快照；none = 都读不到。 */
export type AggregateLoaded = 'local' | 'shipped' | 'none'

export const AGGREGATE_LOADED_LABELS: Record<AggregateLoaded, string> = {
  local: t('src.liveFile'),
  shipped: t('src.bundled'),
  none: t('src.notLoaded'),
}

/** 装载状态文案；服务端给了没见过的取值时按「未知」显示，不崩。 */
export function aggregateLoadedLabelOf(loaded: string | null | undefined): string {
  if (loaded === 'local' || loaded === 'shipped' || loaded === 'none') return AGGREGATE_LOADED_LABELS[loaded]
  return loaded === undefined || loaded === null || loaded === '' ? t('src.notLoaded') : t('src.unknown') + '（' + loaded + '）'
}

/** 聚合价目装载 / 刷新过程中出现的问题。 */
export interface AggregateIssue {
  kind: string
  message: string
}

/** LiteLLM 聚合价目（第三方、美元）：随包快照 + 点「刷新价目」下载到本机的副本。 */
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
 * LiteLLM 仓库地址。**不能**写成带协议前缀的完整字面量：构建后处理会把「字母 + 冒号 + 斜杠」误判成
 * 盘符路径而让构建失败，所以拆段拼（冒号必须在第二段里）。
 */
export const LITELLM_REPO_URL = ['https', '://github.com', '/BerriAI/litellm'].join('')

/** 本插件仓库地址：与 LITELLM_REPO_URL 一样运行时拼出来 —— 构建产物里出现 `https://` 字面量会被 banner 校验当成机器路径拦下。 */
export const PLUGIN_REPO_URL = ['https', '://github.com', '/xyl886/dsh-key-usage'].join('')

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

/** 刷新回执：契约只给 `entries`（条目数）不给模型数，所以写「条」而不冒充「个模型」。 */
export function modelPriceRefreshTextOf(result: { entries?: unknown; bytes?: unknown; url?: unknown; fetchedAt?: unknown }): string {
  const parts: string[] = []
  if (typeof result.entries === 'number' && Number.isFinite(result.entries)) {
    parts.push(String(result.entries) + t('q.priceEntriesSuffix'))
  }
  const megabytes = megabytesTextOf(result.bytes)
  if (megabytes !== null) parts.push(megabytes)
  const host = hostOf(result.url)
  if (host !== null) parts.push(t('quota.sourceLabel') + ' ' + host)
  const time = typeof result.fetchedAt === 'string' ? localTimeTextOf(result.fetchedAt) : null
  if (time !== null) parts.push(time)
  return t('quota.updated') + '：' + (parts.length === 0 ? t('quota.recomputed') : parts.join(' · '))
}

/** 覆盖度：两层价格各命中多少个模型 + 无依据的模型数（字段全可选，缺失整段省略）。 */
export interface PricingCoverage {
  from?: string
  to?: string
  /** 命中内置官方价目的模型数。 */
  catalogModels?: number
  /** 命中 LiteLLM 聚合价目的模型数（第三方、USD）。 */
  aggregateModels?: number
  partialModels?: number
  /** 命中「跨通道厂商官方价」（同名唯一）的模型数。 */
  modelModels?: number
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
  catalog: CatalogSummary
  coverage: PricingCoverage
  /** 缺省按「未知」处理：服务端未升级时不至于整块报错。 */
  files?: PricingFiles
  issues?: PricingIssue[]
  aggregate?: ModelPriceAggregate
}

/** 刷新价目接口的返回：服务端一律 HTTP 200，失败原因在 `error` 里（中文，可直接展示）。 */
export type PricingRefreshResult =
  | { ok: true; url: string; bytes: number; entries: number; sha256: string; fetchedAt: string }
  | { ok: false; error: string }

export const COST_SOURCE_LABELS: Partial<Record<CostSource, string>> = {
  official: 'cso.official',
  catalog: 'cso.catalog',
  aggregate: 'cso.aggregate',
  none: '—',
}

/** 来源 → 可见文案：未收录档与语言无关符号（—）不再交给 t()，避免日志里出现缺词告警。 */
export function costSourceLabelOf(source: CostSource | null, translate: (key: string) => string): string {
  if (source === null) return '—'
  const label = COST_SOURCE_LABELS[source]
  if (label === undefined || label === '—') return '—'
  return translate(label)
}

/** 角标的悬浮说明：让「估算」不会被当成账单金额用。 */
export const COST_SOURCE_HINTS: Partial<Record<CostSource, string>> = {
  official: 'csh.official',
  catalog: 'csh.catalog',
  aggregate: 'csh.aggregate',
  none: 'csh.none',
}

/** 聚合价目的「部分」标记：缺缓存写入价、按未命中价代 —— 是口径说明不是错误。 */
export const PARTIAL_PRICE_TEXT = 'part.suffix'
export const PARTIAL_PRICE_HINT = 'part.hint'

/** 角标悬浮说明：带 `partial` 时补一句口径，避免「部分」被读成缺数据 / 报错。 */
export function costSourceHintOf(source: CostSource | null | undefined, partial?: boolean | null): string {
  // 服务端将来加了新档位时，这里不能把 undefined 拼进文案
  const key = COST_SOURCE_HINTS[source ?? 'none']
  // 未知档位（服务端将来加了新枚举）不能把 undefined 拼进文案
  const hint = key === undefined ? t('csh.unknown') + ' ' + String(source ?? '') : t(key)
  return partial === true ? hint + '；' + t(PARTIAL_PRICE_HINT) : hint
}

/** 内置价目超过这些天没抓取就提示按官方文档复核（厂商调价后只能人工改价目）。 */
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
