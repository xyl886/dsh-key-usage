/** 同源只读端点的取数封装：任何失败都返回 null，由调用方决定空态。 */

import type {
  Channel,
  HeatmapDay,
  ModelsResponse,
  ProjectsResponse,
  QuotaProvider,
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

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      failureReasons.set(path, response.status === 404
        ? 'HTTP 404：宿主没有这个端点 —— 服务端改动需要退出重开 DSH（刷新页面不够）'
        : 'HTTP ' + String(response.status))
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

export function loadProjects(limit = 200): Promise<ProjectsResponse | null> {
  return fetchJson<ProjectsResponse>('/dsh-key-usage/projects?limit=' + String(limit))
}

export function loadModels(limit = 200): Promise<ModelsResponse | null> {
  return fetchJson<ModelsResponse>('/dsh-key-usage/models?limit=' + String(limit))
}
