/**
 * 会话 / 项目 / 模型 / 汇率 / 额度段的数据类型（从 types.ts 拆出）。
 * 只放 type / interface，由 types.ts 统一再导出，导入方仍然只认 types.ts。
 */
import type { ChannelCostMode, CostsByCurrency } from './types.ts'
import type { CostSource } from './pricing.ts'

export interface SessionCoverage {
  status: 'complete' | 'partial' | 'unavailable'
  totalSessions: number
  countedSessions: number
  skippedSessions: number
}

export interface UsageModelRow {
  provider: string
  model: string
  tokens: number
  calls: number
  buckets: Record<string, number>
  /** 通道显示名（会话详情的逐模型表用；列表行不带）。 */
  providerLabel?: string
  /** 占该会话 tokens 的百分比（一位小数）：`/sessions` 行内展开与 `/session` 详情用。 */
  sharePercent?: number
  /** 该模型这一格的金额与来源（内置官方价目 / 聚合价目 / 跨通道厂商官方价 / 无依据）。 */
  cost?: number | null
  /** 该模型这一格的逐币种小计。 */
  costsByCurrency?: CostsByCurrency
  costSource?: CostSource
  /** 该模型的聚合价目条目缺一个缓存价（按未命中价代）。 */
  partial?: boolean
}

export interface SessionRow {
  id: string
  title: string | null
  /** 已归档（宿主侧标记）：列表默认隐藏，显示时淡化，用量照常计入。 */
  archived: boolean
  workspace: string | null
  provider: string | null
  providerLabel: string | null
  /** 该会话出现过的模型个数（列表只展示前几个）；服务端旧版本可能没有这个字段。 */
  modelCount?: number
  /** 子代理会话指向的父会话 id；普通会话为 null。 */
  parentSessionId?: string | null
  /** 会话来源；`subagent` = 子代理会话。 */
  origin?: string | null
  /** 挂在这个会话下的子代理会话数。 */
  subagentCount?: number
  /** 这些子会话的 tokens 小计（只用于父行标注，不并入父会话总计）。 */
  subagentTokens?: number
  firstTime: number | null
  lastTime: number | null
  calls: number
  tokens: number
  cacheHitRate: number | null
  days: number
  /** 首次与最近不在同一天时跨过的天数（0 = 同一天或时间缺失）。 */
  crossDays: number
  /** 首条真实提问的片段（标题兜底之外，搜索也用它）。 */
  prompt: string | null
  models: UsageModelRow[]
  costMode: ChannelCostMode | null
  cost: number | null
  /** 该行的逐币种小计（合计按它折算后相加）。 */
  costsByCurrency?: CostsByCurrency
  /** 该行成本的来源角标。 */
  costSource?: CostSource
  /** 该行成本里至少有一条聚合价目是 partial。 */
  partial?: boolean
}

export interface SessionsResponse {
  rows: SessionRow[]
  coverage: SessionCoverage
  priced: boolean
}

/** 24 小时迷你图的一个小时槽：该小时（跨天会话按小时累加）的调用数与展示口径 tokens。 */
export interface SessionDetailHour {
  calls: number
  tokens: number
}

export interface SessionDetailModel extends UsageModelRow {
  providerLabel: string
  sharePercent: number
  cost: number | null
  costSource: CostSource
}

export interface SessionDetail {
  id: string
  title: string | null
  archived: boolean
  workspace: string | null
  provider: string | null
  providerLabel: string | null
  costMode: ChannelCostMode | null
  firstTime: number | null
  lastTime: number | null
  durationMs: number
  crossDays: number
  days: number
  calls: number
  tokens: number
  buckets: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }
  cacheHitRate: number | null
  /** 首条真实提问全文（超长时服务端已截断），没有则 null。 */
  prompt: string | null
  models: SessionDetailModel[]
  /** 只要会话有结算样本就给 24 个槽；没有样本时为 null。 */
  hours: SessionDetailHour[] | null
  cost: number | null
  /** 逐币种小计（合计按它折算后相加）。 */
  costsByCurrency?: CostsByCurrency
  costSource: CostSource
  /** 会话成本里至少有一条聚合价目是 partial。 */
  partial?: boolean
}

export interface SessionDetailResponse {
  session: SessionDetail
  /** partial = 会话存在但读不出来（只有头部字段）；unavailable = 宿主没提供会话服务。 */
  coverage: { status: 'complete' | 'partial' | 'unavailable'; reason: string | null }
  priced: boolean
}

export interface ProjectRow {
  workspace: string
  /** 宿主工作区名（侧边栏显示名）；`workspace` 为空（未归入工作区）时为 null。 */
  workspaceTitle?: string | null
  /** 这一行覆盖的目录；「未归入工作区」行是多条。 */
  paths?: string[]
  /** 该行是不是宿主工作区；false 表示所有非工作区目录已并成一行。 */
  registered?: boolean
  calls: number
  tokens: number
  cacheHitRate: number | null
  sessionCount: number
  /** 其中已归档的会话数（归档仍计入统计，仅作标注）。 */
  archivedSessionCount: number
  lastTime: number | null
  providers: Record<string, number>
  dominantProvider: string | null
  models: UsageModelRow[]
  cost: number | null
  /** 逐币种小计（合计按它折算后相加）。 */
  costsByCurrency?: CostsByCurrency
  /** 该行成本的来源角标。 */
  costSource?: CostSource
  /** 该项目成本里至少有一条聚合价目是 partial。 */
  partial?: boolean
}

export interface ProjectsResponse {
  rows: ProjectRow[]
  coverage: SessionCoverage
  priced: boolean
}

/** 模型聚合行的 token 分桶（展示口径，不含 cacheWrite / reasoning）。 */
export interface ModelBuckets {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  /** 只参与计费，不计入展示口径 tokens。 */
  cacheWriteTokens?: number
}

export interface ModelAggregateRow {
  provider: string
  providerLabel: string
  model: string
  calls: number
  /** 展示口径 tokens：输入 + 输出 + 缓存读。 */
  tokens: number
  cacheHitRate: number | null
  /** 估算成本（三层价目），无成本数据时为 null。 */
  cost: number | null
  /** 逐币种小计（合计按它折算后相加）。 */
  costsByCurrency?: CostsByCurrency
  costMode: ChannelCostMode | null
  sessionCount: number
  /** 用到该模型的最晚会话时间（会话事件只有会话级时间戳，是近似值）。 */
  lastTime: number | null
  buckets: ModelBuckets
  /** 该行成本的来源角标。 */
  costSource?: CostSource
  /** 该模型的聚合价目条目缺一个缓存价（按未命中价代）。 */
  partial?: boolean
}

export interface ModelsResponse {
  rows: ModelAggregateRow[]
  coverage: SessionCoverage
  priced: boolean
}

/** `/rates` 一行：近 N 天用到的某个模型在这条通道上的单价依据。 */
export interface ModelRateRow {
  model: string
  /** 近 N 天的展示口径 tokens。 */
  tokens: number
  calls: number
  /** 该行这段用量的成本（按表里同一份「此刻单价」算）；无价目依据时为 null。 */
  cost: number | null
  /** 成本的币种；`cost: null` 时为 null。 */
  costCurrency: string | null
  /** 单价来自哪一层：catalog = 内置官方价目；aggregate = LiteLLM 聚合价（通道别名）；model = 跨通道厂商官方价（同名唯一，含厂商兜底）；none = 无依据。 */
  source: CostSource
  /** 价目的原币种；`source: 'none'` 时服务端给 null（不知道币种，不猜）。 */
  currency: string | null
  /** 聚合价目缺一个缓存价（按未命中价代）。 */
  partial: boolean
  /** 该模型此刻是否处于错峰时段（服务端按本地时间判定）。 */
  offPeak: boolean
  /** 四档单价（每百万 tokens）；`source: 'none'` 或只有均价时为 null。 */
  rates: { input: number; cacheRead: number; cacheWrite: number; output: number } | null
  /** 来源说明（口径、近似、未命中原因等）。 */
  note: string | null
}

export interface ChannelRates {
  provider: string
  /** 通道显示名（服务端给，避免两侧各维护一份映射）。 */
  label: string
  /** 该通道所有模型币种一致时给出，混合（官方价 CNY + 聚合价 USD）时为 null —— 不猜。 */
  currency: string | null
  models: ModelRateRow[]
}

/** `/rates`：近 N 天每个通道用到的模型单价表。 */
export interface RatesResponse {
  from: string
  to: string
  channels: ChannelRates[]
}

/** `/fx`：人民币对美元汇率（服务端 12 小时内走缓存，`?refresh=1` 强制刷新）。 */
export interface FxResponse {
  /** 说明文案的词典键（服务端下发；给了就优先按它渲染，便于双语） */
  noteCode?: string | null
  noteParams?: Record<string, string | number> | null
  ok?: boolean
  base?: string
  quote?: string
  rate?: number
  fetchedAt?: string
  source?: 'upstream' | 'cache' | 'default'
  stale?: boolean
  upstream?: string | null
  ttlHours?: number
  note?: string | null
}

/** 某个通道这次配额查询的结果：查到没、展示值的时间、失败原因（界面据此标「本机快照 + 数据时间」）。 */
export interface SnapshotQuotaProvider {
  provider: string
  ok: boolean
  error: string | null
  capturedAt: string | null
  stale: boolean
}

export interface SnapshotQuotaOutcome {
  refreshedAt: string | null
  providers: SnapshotQuotaProvider[]
}

/** 快照里的 6 个 Tab 数据段，每段形状与对应端点一致（null = 该段这次没构建成功）。 */
/**
 * 提问词云：服务端已聚合好的 top 词（只下发词与频次，不下发提问原文）。
 * 快照 `prompts` 段与 `GET /prompts` 参数化端点共用这个形状：前者固定近 30 天，后者回显筛选后的窗口。
 */
