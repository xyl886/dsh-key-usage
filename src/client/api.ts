/** 同源只读端点的取数封装：任何失败都返回 null，由调用方决定空态。 */

import type {
  Channel,
  HeatmapDay,
  ModelsResponse,
  PricingResponse,
  PricingSaveResult,
  ProjectsResponse,
  QuotaProvider,
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

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      failureReasons.set(path, failureTextOf(response.status))
      return null
    }
    failureReasons.delete(path)
    return await response.json() as T
  } catch (error) {
    failureReasons.set(path, '请求失败：' + (error instanceof Error ? error.message : String(error)))
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

/** 计费规则面板的服务端对照：内置价目（含逐条规则）、错峰状态、缺口覆盖度、两个 YAML 文件与解析问题。 */
export function loadPricing(): Promise<PricingResponse | null> {
  return fetchJson<PricingResponse>('/dsh-key-usage/pricing')
}

/** 保存计费规则的端点：界面按这个键取失败原因，所以路径在这里统一。 */
export const PRICING_RULES_PATH = '/dsh-key-usage/pricing/rules'

/**
 * 整批提交规则（规则写盘的唯一入口，服务端只接受回环请求）。
 *
 * 返回 null = 请求本身失败（原因记在 `failureReasonOf(PRICING_RULES_PATH)`）；
 * 返回 `{ok:false, error}` = 服务端拒绝了这次写入（中文原因可直接展示）。
 */
export async function savePricingRules(rules: Array<Record<string, string | number>>): Promise<PricingSaveResult | null> {
  try {
    const response = await fetch(PRICING_RULES_PATH, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    })
    if (!response.ok) {
      failureReasons.set(PRICING_RULES_PATH, failureTextOf(response.status))
      return null
    }
    failureReasons.delete(PRICING_RULES_PATH)
    return await response.json() as PricingSaveResult
  } catch (error) {
    failureReasons.set(PRICING_RULES_PATH, '请求失败：' + (error instanceof Error ? error.message : String(error)))
    return null
  }
}
