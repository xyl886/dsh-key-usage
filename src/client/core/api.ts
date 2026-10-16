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
  SnapshotResponse,
  SummaryResponse,
  UsageResponse,
} from './types.ts'
import { t } from './i18n.ts'
import { logWarn } from './log.ts'

/** 最近一次请求失败的原因，按路径记住（空态文案据此指向「要重启宿主」）。 */
const failureReasons = new Map<string, string>()

export function failureReasonOf(path: string): string | null {
  return failureReasons.get(path) ?? null
}

/** 404 单独说清「要重启宿主」：刷新页面不会让服务端新端点出现。 */
function failureTextOf(status: number): string {
  return status === 404
    ? t('api.notFound')
    : 'HTTP ' + String(status)
}

async function fetchJson<T>(path: string, failureKey: string = path): Promise<T | null> {
  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      const text = failureTextOf(response.status)
      failureReasons.set(failureKey, text)
      // 端点失败一律进系统日志：界面只留空态，原因（路径 + HTTP 状态）要能查
      logWarn('api', t('api.requestFailed') + ' · ' + failureKey, text)
      return null
    }
    failureReasons.delete(failureKey)
    return await response.json() as T
  } catch (error) {
    const text = t('api.requestFailed') + (error instanceof Error ? error.message : String(error))
    failureReasons.set(failureKey, text)
    logWarn('api', t('api.requestFailed') + ' · ' + failureKey, text)
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

/** 余额与订阅窗口：服务端实时优先、失败回落本机快照；`fresh` = 用户手动刷新时强制重查官方接口。 */
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

export function loadSessionDetail(id: string): Promise<SessionDetailResponse | null> {
  return fetchJson<SessionDetailResponse>(sessionDetailPath(id))
}

export function loadProjects(limit = 200): Promise<ProjectsResponse | null> {
  return fetchJson<ProjectsResponse>('/dsh-key-usage/projects?limit=' + String(limit))
}

export function loadModels(limit = 200): Promise<ModelsResponse | null> {
  return fetchJson<ModelsResponse>('/dsh-key-usage/models?limit=' + String(limit))
}

export function loadPricing(): Promise<PricingResponse | null> {
  return fetchJson<PricingResponse>('/dsh-key-usage/pricing')
}

export const RATES_PATH = '/dsh-key-usage/rates'

/** 汇率端点：`?refresh=1` 强制走上游。 */
export const FX_PATH = '/dsh-key-usage/fx'

export function loadRates(days = 30, limit = 20): Promise<RatesResponse | null> {
  const params = new URLSearchParams({ days: String(days), limit: String(limit) })
  return fetchJson<RatesResponse>(RATES_PATH + '?' + params.toString(), RATES_PATH)
}

/** 取 USD→CNY 汇率：服务端 12 小时内走缓存；`force` = 用户点「刷新汇率」时强制走上游，失败返回 null。 */
export function loadFxRate(force = false): Promise<FxResponse | null> {
  return fetchJson<FxResponse>(force ? FX_PATH + '?refresh=1' : FX_PATH, FX_PATH)
}

/** 刷新价目端点（404 = 服务端还是旧版本）。 */
export const MODEL_PRICE_REFRESH_PATH = '/dsh-key-usage/pricing/refresh'

/** 刷新超时 30 秒：必须大于服务端 20 秒下载预算，否则会「文件已写成功、界面却报超时」。 */
export const MODEL_PRICE_REFRESH_TIMEOUT_MS = 30000

/**
 * 拉取上游最新聚合价目：`null` = 请求失败，`{ok:false}` = 服务端拒绝（中文原因可直接展示）。
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
      ? t('api.refreshTimeout') + String(MODEL_PRICE_REFRESH_TIMEOUT_MS / 1000) + t('api.refreshTimeoutTail')
      : t('api.requestFailed') + (error instanceof Error ? error.message : String(error)))
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** 统一快照端点：6 个 Tab 的唯一数据来源（服务端每 5 分钟重建本地段）。 */
export const SNAPSHOT_PATH = '/dsh-key-usage/snapshot'

/** 手动刷新端点：重算全部本地段 + 查配额（联网）+ 写快照。 */
export const REFRESH_PATH = '/dsh-key-usage/refresh'

/**
 * 读快照。`fresh: true`（页面打开时用）让服务端先保证数据是最新的：
 * 本地段超过防抖下限就重算一次再返回，配额段超时就**后台**补查（返回体标 `quotaRefreshing`）。
 */
export function loadSnapshot(fresh = false): Promise<SnapshotResponse | null> {
  return fetchJson<SnapshotResponse>(SNAPSHOT_PATH + (fresh ? '?fresh=1' : ''))
}

/** 手动刷新：服务端自己串行化（撞上重建会等，最多 10 秒），超时才回 `{ok:false}`。 */
export async function refreshAll(): Promise<SnapshotResponse | null> {
  try {
    const response = await fetch(REFRESH_PATH, { method: 'POST', headers: { Accept: 'application/json' } })
    if (!response.ok) {
      failureReasons.set(REFRESH_PATH, failureTextOf(response.status))
      return null
    }
    failureReasons.delete(REFRESH_PATH)
    const result = await response.json() as SnapshotResponse & { ok?: boolean; error?: string }
    if (result.ok !== true) {
      failureReasons.set(REFRESH_PATH, typeof result.error === 'string' ? result.error : t('api.refreshRejected'))
      return null
    }
    return result
  } catch (error) {
    failureReasons.set(REFRESH_PATH, t('api.requestFailed') + (error instanceof Error ? error.message : String(error)))
    return null
  }
}
