/**
 * 通道（key）配置采集：从 profile 的 cordis.yml 提取 llm-pi-ai 供应商清单
 * （displayName、apiKeyEnv、模型列表），从余额快照提取官方接口原样数据。
 * 只读配置与快照文件，绝不读取凭据明文（.credentials.yaml 不打开）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface ChannelModel {
  id: string
  name: string
  contextWindow: number | null
}

/** 计费模式：订阅制 / 按量计费 / 免费额度 / 本地端点 / 无法判定。 */
export type ChannelCostMode = 'sub' | 'perToken' | 'free' | 'none' | 'unknown'

/** 通道状态：正常 / 偏高 / 告警 / 未配置。 */
export type ChannelStatus = 'ok' | 'warn' | 'danger' | 'off'

export interface ChannelInfo {
  provider: string
  displayName: string
  apiKeyEnv: string | null
  baseURL: string | null
  models: ChannelModel[]
  /** 计费模式（classifyChannels 填写；extractChannels 只给默认值） */
  costMode: ChannelCostMode
  /** 状态（classifyChannels 填写） */
  status: ChannelStatus
  /** 订阅窗口最高占用（0–100），无订阅窗口时为 null */
  quotaPercent: number | null
  /** 占用最高的窗口键（5h/week/month/day），无则 null */
  quotaWindowKey: string | null
  balanceText: string | null
  /** 快照更新时间（毫秒），无快照时 null */
  snapshotUpdatedAt: number | null
}

/**
 * 快照判定不出来的通道在此显式登记计费模式（不把 provider 名单硬编码到客户端）。
 * sensenova 为免费额度通道，宿主没有它的余额/配额快照。
 */
const FALLBACK_COST_MODES: Record<string, ChannelCostMode> = {
  sensenova: 'free',
}

const WINDOW_LABELS: Record<string, string> = { '5h': '5 小时', week: '本周', month: '本月', day: '当日' }

export interface ProviderSnapshot {
  provider: string
  displayName: string | null
  credential: string | null
  updatedAt: number | null
  /** 官方余额接口原样返回（DeepSeek /user/balance 等），无则 null */
  balance: Record<string, unknown> | null
  /** 订阅窗口原样数据（opencode-go plan.windows 等），无则 null */
  plan: Record<string, unknown> | null
}

/** 从 cordis.yml 原文提取 LLM 通道清单：
 * - llm-pi-ai 的 providers 块（多通道）
 * - llm-deepseek（DeepSeek 官方插件，独立条目，模型在其 config.models 列表）
 * cordis.yml 含 !!js 表达式，不能用通用 YAML 解析器解析，
 * 这里只做结构化文本提取，避免执行任意表达式。 */
export function extractChannels(cordisYml: string): ChannelInfo[] {
  const channels = extractPiAiChannels(cordisYml)
  const deepseekChannel = extractDeepseekChannel(cordisYml)
  if (deepseekChannel !== null) channels.unshift(deepseekChannel)
  return channels
}

/** llm-deepseek 条目：`- id: llm-deepseek` / `name: …llm-deepseek-api-key`，模型在其 config.models 下（10 空格「- id:」）。 */
function extractDeepseekChannel(cordisYml: string): ChannelInfo | null {
  const entryMatch = cordisYml.match(/^ {0,4}-? ?id: llm-deepseek\s*$(?<entry>[\s\S]*?)(?=^ {0,4}-? ?id: |(?![\s\S]))/m)
  if (entryMatch === null) return null
  const entry = entryMatch.groups?.entry ?? ''
  const models: ChannelModel[] = []
  const modelPattern = /^ {6}- id:\s*([^\n#]+)/gm
  for (const modelMatch of entry.matchAll(modelPattern)) {
    const modelId = modelMatch[1].trim()
    const rest = entry.slice(modelMatch.index)
    const nameMatch = rest.match(new RegExp('- id:\\s*' + escapeRegExp(modelId) + '[\\s\\S]*?\\n\\s*name:\\s*([^\\n#]+)'))
    const contextMatch = rest.match(new RegExp('- id:\\s*' + escapeRegExp(modelId) + '[\\s\\S]*?\\n\\s*contextWindow:\\s*(\\d+)'))
    models.push({
      id: modelId,
      name: nameMatch?.[1] !== undefined ? unquoteYamlScalar(nameMatch[1]) : modelId,
      contextWindow: contextMatch ? Number(contextMatch[1]) : null,
    })
  }
  return {
    provider: 'deepseek-official',
    displayName: 'DeepSeek',
    apiKeyEnv: entry.match(/apiKeyEnv:\s*([^\n#]+)/)?.[1]?.trim() ?? 'DEEPSEEK_API_KEY',
    baseURL: entry.match(/baseURL:\s*([^\n#]+)/)?.[1]?.trim() ?? null,
    models,
    ...unclassifiedChannel(),
  }
}

function extractPiAiChannels(cordisYml: string): ChannelInfo[] {
  const channels: ChannelInfo[] = []
  // llm-pi-ai 条目可能在根列表（0 列「- id:」）或嵌套列表（2~4 空格），providers: 固定在其 config 下 4 空格处
  const providerSectionMatch = cordisYml.match(/^ {0,4}-? ?id: llm-pi-ai[\s\S]*?^ {4}providers:\s*$/m)
  if (providerSectionMatch === null || providerSectionMatch.index === undefined) return channels
  const sectionStart = providerSectionMatch.index + providerSectionMatch[0].length
  const remaining = cordisYml.slice(sectionStart)
  // 段终止：下一个根列表插件条目「- id: 」（0 列）
  const endMatch = remaining.match(/^- id: /m)
  const section = endMatch !== null && endMatch.index !== undefined ? remaining.slice(0, endMatch.index) : remaining
  // provider 块以 6 空格键名开始（providers: 在 4 空格层级之下）；
  // 终止于下一个同层键或字符串末尾（(?![\s\S])，JS 无 \z，\Z 是字面量 Z 不能用）
  const providerPattern = /^ {6}([a-zA-Z0-9_-]+):\s*$(?<body>[\s\S]*?)(?=^ {6}[a-zA-Z0-9_-]+:\s*$|(?![\s\S]))/gm
  for (const match of section.matchAll(providerPattern)) {
    const provider = match[1]
    const body = match.groups?.body ?? ''
    const displayName = body.match(/displayName:\s*([^\n#]+)/)?.[1]?.trim() ?? null
    const apiKeyEnv = body.match(/apiKeyEnv:\s*([^\n#]+)/)?.[1]?.trim() ?? null
    const baseURL = body.match(/baseURL:\s*([^\n#]+)/)?.[1]?.trim() ?? null
    const models: ChannelModel[] = []
    const modelPattern = /^ {10}- id:\s*([^\n#]+)/gm
    for (const modelMatch of body.matchAll(modelPattern)) {
      const modelId = modelMatch[1].trim()
      const rest = body.slice(modelMatch.index)
      const nameMatch = rest.match(new RegExp('- id:\\s*' + escapeRegExp(modelId) + '[\\s\\S]*?\\n\\s*name:\\s*([^\\n#]+)'))
      const contextMatch = rest.match(new RegExp('- id:\\s*' + escapeRegExp(modelId) + '[\\s\\S]*?\\n\\s*contextWindow:\\s*(\\d+)'))
      models.push({
        id: modelId,
        name: nameMatch?.[1] !== undefined ? unquoteYamlScalar(nameMatch[1]) : modelId,
        contextWindow: contextMatch ? Number(contextMatch[1]) : null,
      })
    }
    channels.push({
      provider,
      displayName: displayName !== null ? unquoteYamlScalar(displayName) : provider,
      apiKeyEnv,
      baseURL,
      models,
      ...unclassifiedChannel(),
    })
  }
  return channels
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function unquoteYamlScalar(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length >= 2 && ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"')))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/** 读取余额快照并归一化为原样展示结构（不换算、不建议）。 */
export function readProviderSnapshots(snapshotPath: string): { providers: ProviderSnapshot[] } {
  let parsed: { providers?: Record<string, Record<string, unknown>> } = {}
  try {
    parsed = JSON.parse(readFileSync(snapshotPath, 'utf8'))
  } catch {
    return { providers: [] }
  }
  const providers: ProviderSnapshot[] = []
  for (const [provider, raw] of Object.entries(parsed.providers ?? {})) {
    providers.push({
      provider,
      displayName: typeof raw.displayName === 'string' ? raw.displayName : null,
      credential: typeof raw.credential === 'string' ? raw.credential : null,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : null,
      balance: isPlainObject(raw.balance) ? raw.balance : null,
      plan: isPlainObject(raw.plan) ? raw.plan : null,
    })
  }
  return { providers }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** extractChannels 阶段尚未判定计费模式与状态，先填默认值。 */
function unclassifiedChannel(): Pick<ChannelInfo, 'costMode' | 'status' | 'quotaPercent' | 'quotaWindowKey' | 'balanceText' | 'snapshotUpdatedAt'> {
  return { costMode: 'unknown', status: 'ok', quotaPercent: null, quotaWindowKey: null, balanceText: null, snapshotUpdatedAt: null }
}

function peakWindowOf(plan: Record<string, unknown> | null): { percent: number; key: string } | null {
  if (plan === null || !Array.isArray(plan.windows)) return null
  let peak: { percent: number; key: string } | null = null
  for (const raw of plan.windows as Array<Record<string, unknown>>) {
    const percent = typeof raw.percent === 'number' ? raw.percent : null
    const key = typeof raw.key === 'string' ? raw.key : null
    if (percent === null || key === null) continue
    if (peak === null || percent > peak.percent) peak = { percent, key }
  }
  return peak
}

/** 余额文本：优先总余额，原样拼上币种。 */
function balanceTextOf(balance: Record<string, unknown> | null): string | null {
  if (balance === null) return null
  const value = balance.totalBalance ?? balance.balance
  if (value === undefined || value === null) return null
  const currency = typeof balance.currency === 'string' ? balance.currency + ' ' : ''
  return currency + String(value)
}

/** 数值化余额（用于状态判定）；非数值返回 null。 */
function numericBalanceOf(balance: Record<string, unknown> | null): number | null {
  if (balance === null) return null
  const raw = balance.totalBalance ?? balance.balance
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isLocalEndpoint(channel: ChannelInfo): boolean {
  if (channel.provider === 'local') return true
  const baseURL = channel.baseURL ?? ''
  return baseURL.includes('127.0.0.1') || baseURL.includes('localhost') || baseURL.includes('0.0.0.0')
}

/**
 * 判定通道的计费模式与状态（规则集中在这里，客户端只负责展示）：
 * 未配置 → off；本地端点 → none；有订阅窗口 → sub（占用 ≥90 告警 / ≥60 偏高）；
 * 有余额 → perToken（余额 ≤0 告警 / <10 偏高）；其余按 FALLBACK_COST_MODES → 兜底 unknown。
 */
export function classifyChannels(channels: ChannelInfo[], snapshots: ProviderSnapshot[]): ChannelInfo[] {
  const byProvider = new Map(snapshots.map((snapshot) => [snapshot.provider, snapshot]))
  return channels.map((channel) => {
    const snapshot = byProvider.get(channel.provider) ?? null
    const quota = peakWindowOf(snapshot?.plan ?? null)
    const balanceText = balanceTextOf(snapshot?.balance ?? null)
    const numericBalance = numericBalanceOf(snapshot?.balance ?? null)
    const updatedAt = snapshot?.updatedAt ?? null
    const base = {
      ...channel,
      quotaPercent: quota === null ? null : quota.percent,
      quotaWindowKey: quota === null ? null : quota.key,
      balanceText,
      snapshotUpdatedAt: updatedAt,
    }
    // 本地端点先判：patch 层的 local 通道通常不写 apiKeyEnv，不该被当成「未配置」
    if (isLocalEndpoint(channel)) {
      return { ...base, costMode: 'none', status: 'ok' }
    }
    if (channel.apiKeyEnv === null || channel.apiKeyEnv.trim() === '') {
      return { ...base, costMode: 'unknown', status: 'off' }
    }
    if (quota !== null) {
      const status: ChannelStatus = quota.percent >= 90 ? 'danger' : quota.percent >= 60 ? 'warn' : 'ok'
      return { ...base, costMode: 'sub', status }
    }
    if (numericBalance !== null) {
      const status: ChannelStatus = numericBalance <= 0 ? 'danger' : numericBalance < 10 ? 'warn' : 'ok'
      return { ...base, costMode: 'perToken', status }
    }
    const fallback = FALLBACK_COST_MODES[channel.provider]
    return { ...base, costMode: fallback ?? 'unknown', status: 'ok' }
  })
}

/** 计费模式的中文标签（总览「类型」列、成本列与余额卡副标题共用）。 */
export function costModeLabel(costMode: ChannelCostMode): string {
  if (costMode === 'sub') return '订阅制'
  if (costMode === 'perToken') return '按量计费'
  if (costMode === 'free') return '免费额度'
  if (costMode === 'none') return '本地端点'
  return '未查询'
}

/** 订阅窗口键的中文标签。 */
export function quotaWindowLabel(windowKey: string): string {
  return WINDOW_LABELS[windowKey] ?? windowKey
}
