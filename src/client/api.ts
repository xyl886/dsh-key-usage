/** 同源只读端点的取数封装：任何失败都返回 null，由调用方决定空态。 */

import type {
  Channel,
  FxResponse,
  HeatmapDay,
  ModelsResponse,
  PricingRefreshResult,
  PricingResponse,
  ProjectsResponse,
  QuotaProvider,
  RatesResponse,
  SessionDetailResponse,
  SessionsResponse,
  SummaryResponse,
  UsageResponse,
} from './types.ts'

/**
 * 最近一次请求失败的原因，按路径记住。
 * 空态文案需要能指向「怎么做」——最常见的失败是新端点 404（服务端代码要重启宿主才生效）。
 */
const failureReasons = new Map<string, string>()

export function failureReasonOf(path: string): string | null {
  return failureReasons.get(path) ?? null
}

/** 404 单独说清「要重启宿主」：刷新页面不会让服务端新端点出现。 */
function failureTextOf(status: number): string {
  return status === 404
    ? 'HTTP 404：宿主没有这个端点 —— 服务端改动需要退出重开 DSH（刷新页面不够）'
    : 'HTTP ' + String(status)
}

async function fetchJson<T>(path: string, failureKey: string = path): Promise<T | null> {
  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      failureReasons.set(failureKey, failureTextOf(response.status))
      return null
    }
    failureReasons.delete(failureKey)
    return await response.json() as T
  } catch (error) {
    failureReasons.set(failureKey, '请求失败：' + (error instanceof Error ? error.message : String(error)))
    return null
  }
}

export async function loadChannels(): Promise<Channel[] | null> {
  const result = await fetchJson<{ channels: Channel[] }>('/dsh-key-usage/channels')
  return result === null ? null : result.channels
}

export async function loadUsage(from: string, to: string, provider: string): Promise<UsageResponse | null> {
  const params = new URLSearchParams({ from, to })
  if (provider !== 'ALL') params.set('provider', provider)
  return fetchJson<UsageResponse>('/dsh-key-usage/usage?' + params.toString())
}

export async function loadHeatmap(): Promise<HeatmapDay[] | null> {
  const result = await fetchJson<{ days: HeatmapDay[] }>('/dsh-key-usage/heatmap')
  return result === null ? null : result.days
}

/**
 * 余额与订阅窗口：服务端实时优先、失败回落本机快照。
 * @param fresh - 用户手动刷新时传 true，强制重新查一次官方接口
 */
export async function loadQuota(fresh = false): Promise<QuotaProvider[] | null> {
  const query = fresh ? '?fresh=1' : ''
  const result = await fetchJson<{ providers: QuotaProvider[] }>('/dsh-key-usage/quota' + query)
  return result === null ? null : result.providers
}

export function loadSummary(): Promise<SummaryResponse | null> {
  return fetchJson<SummaryResponse>('/dsh-key-usage/summary')
}

export function loadSessions(limit = 300): Promise<SessionsResponse | null> {
  return fetchJson<SessionsResponse>('/dsh-key-usage/sessions?limit=' + String(limit))
}

/** 单会话详情的请求路径：界面要按同一串查失败原因，所以路径由这里统一拼。 */
export function sessionDetailPath(id: string): string {
  return '/dsh-key-usage/session?id=' + encodeURIComponent(id)
}

/** 单会话详情：服务端只折叠这一个会话（列表已折叠过时直接吃缓存）。 */
export function loadSessionDetail(id: string): Promise<SessionDetailResponse | null> {
  return fetchJson<SessionDetailResponse>(sessionDetailPath(id))
}

export function loadProjects(limit = 200): Promise<ProjectsResponse | null> {
  return fetchJson<ProjectsResponse>('/dsh-key-usage/projects?limit=' + String(limit))
}

export function loadModels(limit = 200): Promise<ModelsResponse | null> {
  return fetchJson<ModelsResponse>('/dsh-key-usage/models?limit=' + String(limit))
}

/** 价目信息（内置官方价目来源、覆盖度、价目文件与解析问题、聚合价目装载状态）。 */
export function loadPricing(): Promise<PricingResponse | null> {
  return fetchJson<PricingResponse>('/dsh-key-usage/pricing')
}

/** 单价表的请求路径：空态文案要按同一串查失败原因，所以路径由这里统一拼。 */
export const RATES_PATH = '/dsh-key-usage/rates'

/** 汇率的请求路径（`?refresh=1` 强制刷新；失败原因都记在这个基路径上）。 */
export const FX_PATH = '/dsh-key-usage/fx'

/** 近 N 天每个通道用到的模型单价表（展开通道卡片时展示的单价依据）。 */
export function loadRates(days = 30, limit = 20): Promise<RatesResponse | null> {
  const params = new URLSearchParams({ days: String(days), limit: String(limit) })
  return fetchJson<RatesResponse>(RATES_PATH + '?' + params.toString(), RATES_PATH)
}

/**
 * 取人民币对美元汇率：服务端 12 小时内走缓存，所以打开「余额与配额」与切币种时都可以直接调；
 * `force = true` 是用户点「刷新汇率」时的强制刷新。失败返回 null（界面按「没取到汇率」降级显示）。
 */
export function loadFxRate(force = false): Promise<FxResponse | null> {
  return fetchJson<FxResponse>(force ? FX_PATH + '?refresh=1' : FX_PATH, FX_PATH)
}

/** 刷新聚合价目的端点：同样按这个键取失败原因（404 = 服务端还是旧版本）。 */
export const MODEL_PRICE_REFRESH_PATH = '/dsh-key-usage/pricing/refresh'

/**
 * 刷新超时：上游 JSON 约 3 MB，客户端给 30 秒。
 * **必须比服务端自己的 20 秒下载预算更长**：两边同为 20 秒时，客户端会在服务端正准备写盘的那一刻 abort，
 * 于是界面报「超时」而文件其实已经写成功，用户看到的状态与磁盘不一致。
 * 超时仍要落成可读提示，否则用户面对一个不动的按钮只会以为界面卡死。
 */
export const MODEL_PRICE_REFRESH_TIMEOUT_MS = 30000

/**
 * 拉取上游最新聚合价目（全插件唯一会联网的用户动作，只能由「刷新价目」按钮触发）。
 *
 * 返回 null = 请求本身失败（原因记在 `failureReasonOf(MODEL_PRICE_REFRESH_PATH)`）；
 * 返回 `{ok:false, error}` = 服务端拿到响应但刷新失败（中文原因可直接展示）。
 */
export async function refreshModelPrices(): Promise<PricingRefreshResult | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MODEL_PRICE_REFRESH_TIMEOUT_MS)
  try {
    // 没有请求体，因此不设 Content-Type
    const response = await fetch(MODEL_PRICE_REFRESH_PATH, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      failureReasons.set(MODEL_PRICE_REFRESH_PATH, failureTextOf(response.status))
      return null
    }
    failureReasons.delete(MODEL_PRICE_REFRESH_PATH)
    return await response.json() as PricingRefreshResult
  } catch (error) {
    failureReasons.set(MODEL_PRICE_REFRESH_PATH, controller.signal.aborted
      ? '刷新超时：' + String(MODEL_PRICE_REFRESH_TIMEOUT_MS / 1000) + ' 秒内没拿到服务端结果（上游可能不可达）'
      : '请求失败：' + (error instanceof Error ? error.message : String(error)))
    return null
  } finally {
    clearTimeout(timer)
  }
}
