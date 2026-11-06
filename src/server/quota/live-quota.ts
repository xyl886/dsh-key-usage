/**
 * 实时余额 / 订阅窗口查询：只请求各通道**官方**接口，6 秒超时、64 KiB 上限；
 * 凭据经宿主 `credentials` seam 解析（不落盘、不进日志、不返前端），失败由调用方回落本地快照。
 * 结果按 provider 缓存 60 秒。
 */
import type { ChannelInfo } from '../data/collect.js'

export interface LiveWindow {
  /** 归一后的窗口键：5h / week / month（与界面标签一致）。 */
  key: string
  percent: number
  resetsAt: string | null
  status: string | null
}

export interface LiveQuota {
  provider: string
  ok: boolean
  /** ok=false 时的原因：no-scheme / no-key / network / unauthorized / http-<code> / bad-json / too-large。 */
  error: string | null
  fetchedAt: number
  balance: Record<string, unknown> | null
  windows: LiveWindow[] | null
}

interface Scheme {
  url: (baseURL: string | null) => string
  /** parse 同时拿到已解析的请求 URL：Z.AI 国内站与海外站币种不同，只能按 host 判定。 */
  parse: (body: unknown, requestUrl: string) => { balance: Record<string, unknown> | null; windows: LiveWindow[] | null }
}

const REQUEST_TIMEOUT_MS = 6000
const MAX_RESPONSE_BYTES = 65536
const DEFAULT_TTL_MS = 60000

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textOf(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

/** 金额字段：官方既有字符串（DeepSeek）也有数字（Moonshot），两种都接受，统一输出原样字符串。 */
function amountTextOf(value: unknown): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed !== '' && Number.isFinite(Number(trimmed)) ? trimmed : null
  }
  return null
}

/** 金额 / 百分比的数值形态：接受 number 与数字字符串，其它一律 null。 */
function amountOf(value: unknown): number | null {
  const text = amountTextOf(value)
  if (text === null) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

/** epoch → ISO：13 位按毫秒、10 位按秒；越界返回 null。 */
function isoFromEpoch(value: number): string | null {
  const milliseconds = value >= 1e11 || value < 1e9 ? value : value * 1000
  const date = new Date(milliseconds)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** 重置时间：官方为 ISO 字符串，兼容 epoch 毫秒 / 秒（数字或纯数字字符串）；识别不出时原样保留。 */
function resetAtOf(value: unknown): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? isoFromEpoch(value) : null
  if (typeof value !== 'string' || value === '') return null
  const trimmed = value.trim()
  if (/^\d{9,14}$/.test(trimmed)) return isoFromEpoch(Number(trimmed))
  return value
}

/** 接口没返回币种时的兜底：按站点判定（Z.AI 海外站按美元计价，BigModel / Moonshot 国内站按人民币）。 */
function currencyFromHost(requestUrl: string, fallback: string | null): string | null {
  let host = ''
  try {
    host = new URL(requestUrl).hostname.toLowerCase()
  } catch {
    return fallback
  }
  if (host === 'z.ai' || host.endsWith('.z.ai')) return 'USD'
  if (host === 'bigmodel.cn' || host.endsWith('.bigmodel.cn')) return 'CNY'
  if (host === 'moonshot.cn' || host.endsWith('.moonshot.cn')) return 'CNY'
  return fallback
}

/**
 * OpenCode Go：GET https://opencode.ai/zen/go/v1/usage → usage.rolling / weekly / monthly。
 * 该端点未收录于官方文档（opencode.ai/docs/go 只指向 console），字段结构取自社区实现，见 test/fixtures/providers/opencode-go。
 */
const OPENCODE_GO_SCHEME: Scheme = {
  url: () => 'https://opencode.ai/zen/go/v1/usage',
  parse: (body) => {
    const usage = isObject(body) && isObject(body.usage) ? body.usage : body
    if (!isObject(usage)) return { balance: null, windows: null }
    const mapping: Array<[string, string]> = [['rolling', '5h'], ['weekly', 'week'], ['monthly', 'month']]
    const windows: LiveWindow[] = []
    for (const [sourceKey, windowKey] of mapping) {
      const raw = usage[sourceKey]
      if (!isObject(raw)) continue
      // 社区实现里 percent 可能是字符串、resetsAt 可能是 epoch，两者都按漂移兼容处理
      const percent = amountOf(raw.percent)
      if (percent === null) continue
      windows.push({
        key: windowKey,
        percent,
        resetsAt: resetAtOf(raw.resetsAt),
        status: typeof raw.status === 'string' ? raw.status : null,
      })
    }
    return { balance: null, windows: windows.length > 0 ? windows : null }
  },
}

function balanceScheme(
  path: string,
  parse: (body: Record<string, unknown>, requestUrl: string) => Record<string, unknown> | null,
  fallbackOrigin: string,
): Scheme {
  return {
    url: (baseURL) => new URL(path, baseURL ?? fallbackOrigin).href,
    parse: (body, requestUrl) => ({ balance: isObject(body) ? parse(body, requestUrl) : null, windows: null }),
  }
}

const SCHEMES: Record<string, Scheme> = {
  'opencode-go': OPENCODE_GO_SCHEME,
  // DeepSeek: GET {origin}/user/balance → balance_infos[{currency,total_balance,granted_balance,topped_up_balance}]
  'deepseek-official': balanceScheme('/user/balance', (body) => {
    // 文档 balance_infos[].currency 只可能是 CNY / USD：没有 CNY 项时退回第一项，并如实保留它的币种
    const infos = (Array.isArray(body.balance_infos) ? body.balance_infos : []).filter(isObject)
    const info = infos.find((entry) => (textOf(entry.currency) ?? '').toUpperCase() === 'CNY') ?? infos[0]
    if (info === undefined) return null
    const total = amountTextOf(info.total_balance)
    const granted = amountTextOf(info.granted_balance)
    const toppedUp = amountTextOf(info.topped_up_balance)
    // 三个金额全缺说明结构已经漂移，判 bad-json，不返回「只有币种」的空壳成功
    if (total === null && granted === null && toppedUp === null) return null
    const balance: Record<string, unknown> = {}
    const currency = textOf(info.currency)
    if (currency !== null) balance.currency = currency
    if (total !== null) balance.totalBalance = total
    if (granted !== null) balance.giftBalance = granted
    if (toppedUp !== null) balance.topUpBalance = toppedUp
    return balance
  }, 'https://api.deepseek.com'),
  // OpenRouter: GET {origin}/api/v1/credits（需要 Management Key）
  openrouter: balanceScheme('/api/v1/credits', (body) => {
    const data = isObject(body.data) ? body.data : null
    if (data === null) return null
    const totalCredits = amountOf(data.total_credits)
    const totalUsage = amountOf(data.total_usage)
    if (totalCredits === null || totalUsage === null) return null
    return { currency: 'USD', totalBalance: (totalCredits - totalUsage).toFixed(2) }
  }, 'https://openrouter.ai'),
  // Moonshot / Kimi: GET {origin}/v1/users/me/balance（文档未定义 currency 字段，国内站按人民币计）
  moonshotai: balanceScheme('/v1/users/me/balance', (body, requestUrl) => {
    const data = isObject(body.data) ? body.data : null
    if (data === null) return null
    const available = amountTextOf(data.available_balance)
    const cash = amountTextOf(data.cash_balance)
    const voucher = amountTextOf(data.voucher_balance)
    if (available === null && cash === null && voucher === null) return null
    const balance: Record<string, unknown> = {}
    const currency = textOf(data.currency) ?? currencyFromHost(requestUrl, null)
    if (currency !== null) balance.currency = currency
    if (available !== null) balance.totalBalance = available
    if (voucher !== null) balance.giftBalance = voucher
    if (cash !== null) balance.topUpBalance = cash
    return balance
  }, 'https://api.moonshot.cn'),
  // Z.AI / GLM: GET {origin}/api/paas/v4/balance（官方文档未收录，接口自带 currency 时才采信）
  zai: balanceScheme('/api/paas/v4/balance', (body, requestUrl) => {
    const data = isObject(body.data) ? body.data : null
    if (data === null) return null
    const total = amountTextOf(data.total_balance)
    const available = amountTextOf(data.available_balance)
    if (total === null && available === null) return null
    const balance: Record<string, unknown> = { currency: textOf(data.currency) ?? currencyFromHost(requestUrl, 'CNY') }
    if (total !== null) balance.totalBalance = total
    if (available !== null) balance.availableBalance = available
    return balance
  }, 'https://api.z.ai'),
}

/** provider id → 方案 id（事件里的 provider 可能是路由名，先取末段）。 */
/**
 * 配额方案识别：以 baseURL 端点为准（provider 名只是展示/路由别名）。
 * - 已知官方端点：host + 可选路径前缀 → scheme id；
 * - 只覆盖有官方余额 / 窗口接口的厂商；其余返回 null，界面显示「无」；
 * - baseURL 缺失时才回退到精确 provider 别名（老配置兼容），不做名字模糊/前缀匹配。
 */
interface EndpointRule {
  schemeId: string
  host: string
  /** 路径前缀（空 = 该 host 下都算）；用于区分同一 host 的不同产品线。 */
  pathPrefix: string
}

const ENDPOINT_RULES: EndpointRule[] = [
  // OpenCode Go：内置通道用 /inference/go，社区/自定义通道常见 /zen/go
  { schemeId: 'opencode-go', host: 'opencode.ai', pathPrefix: '/zen/go' },
  { schemeId: 'opencode-go', host: 'opencode.ai', pathPrefix: '/inference/go' },
  { schemeId: 'deepseek-official', host: 'api.deepseek.com', pathPrefix: '' },
  { schemeId: 'openrouter', host: 'openrouter.ai', pathPrefix: '/' },
  { schemeId: 'moonshotai', host: 'api.moonshot.cn', pathPrefix: '' },
  { schemeId: 'moonshotai', host: 'api.moonshot.ai', pathPrefix: '' },
  // Kimi Coding 的余额接口与 Moonshot 同一套路径；未命中时服务端按 bad-json 降级
  { schemeId: 'moonshotai', host: 'api.kimi.com', pathPrefix: '' },
  { schemeId: 'zai', host: 'api.z.ai', pathPrefix: '' },
  { schemeId: 'zai', host: 'open.bigmodel.cn', pathPrefix: '' },
]

/** baseURL 缺失时的精确别名（含历史命名）；不做前缀/模糊匹配。 */
const PROVIDER_ALIASES: Record<string, string> = {
  'opencode-go': 'opencode-go',
  opencode: 'opencode-go',
  'deepseek-official': 'deepseek-official',
  deepseek: 'deepseek-official',
  openrouter: 'openrouter',
  moonshotai: 'moonshotai',
  'moonshotai-cn': 'moonshotai',
  kimi: 'moonshotai',
  'kimi-coding': 'moonshotai',
  zai: 'zai',
  'zai-coding-cn': 'zai',
}

/** 规范化 baseURL：只保留小写 host 与以 / 开头的 path；非法 URL 返回 null。 */
function endpointOf(baseURL: string | null): { host: string; path: string } | null {
  if (baseURL === null || baseURL.trim() === '') return null
  try {
    const url = new URL(baseURL)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const path = url.pathname === '' ? '/' : url.pathname
    return { host: url.hostname.toLowerCase(), path }
  } catch {
    return null
  }
}

function ruleMatches(rule: EndpointRule, endpoint: { host: string; path: string }): boolean {
  if (rule.host !== endpoint.host && !endpoint.host.endsWith('.' + rule.host)) return false
  return rule.pathPrefix === '' || endpoint.path.startsWith(rule.pathPrefix)
}

/**
 * 通道 → 配额方案。
 * 端点命中优先（路径前缀最长优先），其次才是精确 provider 别名（仅 baseURL 缺失时）。
 */
/** 精确别名：先整串，再看路由最后一段（pi-ai/opencode → opencode）；不做模糊匹配。 */
function aliasOf(provider: string): string | null {
  const key = provider.trim().toLowerCase()
  const tail = key.includes('/') ? key.slice(key.lastIndexOf('/') + 1) : key
  return PROVIDER_ALIASES[key] ?? PROVIDER_ALIASES[tail] ?? null
}

export function schemeOf(channel: { provider: string; baseURL: string | null }): string | null {
  const endpoint = endpointOf(channel.baseURL)
  if (endpoint !== null) {
    const matches = ENDPOINT_RULES.filter((rule) => ruleMatches(rule, endpoint))
    matches.sort((first, second) => second.pathPrefix.length - first.pathPrefix.length)
    if (matches.length > 0) return matches[0].schemeId
    // 有 baseURL 但不在已知官方端点：不猜；即使 provider 名叫 opencode-go 也不查（可能指向别处）
    return null
  }
  return aliasOf(channel.provider)
}

/** 兼容旧调用：只按 provider 名（无 baseURL）判定，内部用于 baseURL 缺失的场景。 */
export function schemeIdOf(provider: string): string | null {
  return aliasOf(provider)
}

export interface CredentialResolver {
  /** 传环境变量名，返回明文密钥；取不到返回空串。 */
  resolveCredential: (reference: string) => Promise<string>
}

export interface LiveQuotaService {
  /** 当前缓存快照（不触发网络）。 */
  cached(): Map<string, LiveQuota>
  /** 缓存过期或缺失时刷新（await）；force 时无条件刷新。 */
  refreshIfStale(channels: ChannelInfo[], force?: boolean): Promise<Map<string, LiveQuota>>
}

async function queryOne(
  schemeId: string,
  apiKey: string,
  baseURL: string | null,
  fetchImpl: typeof fetch,
): Promise<{ balance: Record<string, unknown> | null; windows: LiveWindow[] | null; error: string | null }> {
  const scheme = SCHEMES[schemeId]
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const requestUrl = scheme.url(baseURL)
    const response = await fetchImpl(requestUrl, {
      headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' },
      signal: controller.signal,
    })
    if (response.status === 401 || response.status === 403) return { balance: null, windows: null, error: 'unauthorized' }
    if (!response.ok) return { balance: null, windows: null, error: 'http-' + String(response.status) }
    const raw = await response.text()
    // 上限按**字节**算：raw.length 是 UTF-16 码元数，中文响应会因此超限仍被接受
    if (Buffer.byteLength(raw, 'utf8') > MAX_RESPONSE_BYTES) return { balance: null, windows: null, error: 'too-large' }
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return { balance: null, windows: null, error: 'bad-json' }
    }
    const parsed = scheme.parse(body, requestUrl)
    if (parsed.balance === null && parsed.windows === null) return { balance: null, windows: null, error: 'bad-json' }
    return { ...parsed, error: null }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return { balance: null, windows: null, error: aborted ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/** 建立实时查询服务（resolver = 宿主 credentials seam；fetchImpl / ttlMs 供测试注入）。 */
export function createLiveQuotaService(
  resolver: CredentialResolver,
  fetchImpl: typeof fetch = fetch,
  ttlMs: number = DEFAULT_TTL_MS,
): LiveQuotaService {
  let cache = new Map<string, LiveQuota>()
  let inFlight: Promise<Map<string, LiveQuota>> | null = null

  const isStale = (): boolean => {
    const now = Date.now()
    for (const entry of cache.values()) if (now - entry.fetchedAt > ttlMs) return true
    return cache.size === 0
  }

  async function refresh(channels: ChannelInfo[]): Promise<Map<string, LiveQuota>> {
    const targets = channels
      .map((channel) => ({ channel, schemeId: schemeOf(channel) }))
      .filter((entry): entry is { channel: ChannelInfo; schemeId: string } => entry.schemeId !== null)
    const results = await Promise.all(targets.map(async ({ channel, schemeId }) => {
      const apiKey = channel.apiKeyEnv === null ? '' : await resolver.resolveCredential(channel.apiKeyEnv)
      const fetchedAt = Date.now()
      if (apiKey === '') {
        return [channel.provider, { provider: channel.provider, ok: false, error: 'no-key', fetchedAt, balance: null, windows: null }] as const
      }
      const outcome = await queryOne(schemeId, apiKey, channel.baseURL, fetchImpl)
      return [channel.provider, {
        provider: channel.provider,
        ok: outcome.error === null,
        error: outcome.error,
        fetchedAt,
        balance: outcome.balance,
        windows: outcome.windows,
      }] as const
    }))
    // 只保留本次仍然配置了的通道，并保留没有方案可查的旧条目以免频繁抖动
    const next = new Map<string, LiveQuota>()
    for (const [provider, result] of results) next.set(provider, result)
    for (const [provider, entry] of cache) if (!next.has(provider)) next.set(provider, entry)
    cache = next
    return cache
  }

  return {
    cached: () => cache,
    refreshIfStale: async (channels, force = false) => {
      if (isStale() || force) {
        if (inFlight === null) {
          inFlight = refresh(channels).finally(() => { inFlight = null })
        }
        return inFlight
      }
      return cache
    },
  }
}
