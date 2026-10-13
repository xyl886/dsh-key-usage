/** 客户端计费规则视图模型里的成本来源（与 src/client/pricing.ts 同一套取值）。 */
import type { CostSource } from './pricing.ts'

/** 计费规则相关的响应类型定义在 pricing.ts（视图模型与响应同源），这里只做转出。 */
export type { CostSource, PricingConfig, PricingResponse, PricingRule, PricingTemplate } from './pricing.ts'

/** 客户端使用的宿主上下文最小面（与 dsh-plugin / dsh-context 的 slots 契约一致）。 */
export interface SlotRegistration {
  name: string
  /** 面板标识：`sidebar.panellist` / `conversation.view` 等用 `id`。 */
  id?: string
  /** 面板标识：`main` 用 `key`，取值与 `sidebar.panellist` 的 `id` 相同。 */
  key?: string
  order?: number
  /** 宿主渲染行标签时调用（`sidebar.panellist` 由宿主自持整行）。 */
  label?: () => string
  /** 追加给组件的 props；宿主还会传入自己的 props（如 `size`、locale 绑定的 `t`）。 */
  inject?: () => Record<string, unknown>
  /** 绑定的语言包命名空间（本插件未使用）。 */
  locale?: string
}

/**
 * 宿主设置插件的配置表单服务（`@deepseek-ai/dsh-client-ui-settings` 提供，服务名 `configForms`）。
 * 命名空间就是 profile 条目 id：本插件在 cordis.patch.yml 里插入的 `dsh-key-usage`。
 */
export interface ConfigFormSnapshot {
  status?: string
  value?: unknown
  revision?: number
  writable?: boolean
}

export interface ConfigFormBinding {
  getSnapshot(): ConfigFormSnapshot
  subscribe(listener: () => void): () => void
  mutate(ops: Array<{ op: 'set' | 'unset'; path: string[]; value?: unknown }>, expectedRevision?: number): Promise<boolean>
}

export interface ConfigFormsService {
  get(entryId: string): ConfigFormBinding
  /** 命名空间被宿主服务时才注册（返回值即注销器）。 */
  whileServed(namespaces: string[], register: (served: Set<string>) => unknown): () => void
}

/** cordis 作用域：`inject` 等服务都是可选的，宿主版本差异下缺了要能降级运行。 */
export interface SectionContext {
  slots: {
    /** 在宿主 slot 容器登记一个渲染工厂；返回注销器（宿主版本差异下可能不返回）。 */
    inject(slot: string, register: () => unknown): unknown
    register<TProps>(registration: SlotRegistration, render: (props: TProps) => unknown): unknown
  }
  /** 取服务：服务就绪后回调子作用域；服务缺失时回调不会触发。 */
  inject?: (services: string[], callback: (scope: SectionContext) => void) => void
  /** 把清理函数绑定到插件作用域。 */
  effect?: (callback: () => unknown, label?: string) => void
  /** 宿主配置表单服务（只有组配了 ui-settings 的部署才有）。 */
  configForms?: ConfigFormsService
}

/** 服务端 /dsh-key-usage/* 端点的响应类型。 */
export interface ChannelModel {
  id: string
  name: string
  contextWindow: number | null
}

export type ChannelCostMode = 'sub' | 'perToken' | 'free' | 'none' | 'unknown'
export type ChannelStatus = 'ok' | 'warn' | 'danger' | 'off'

export interface Channel {
  provider: string
  displayName: string
  apiKeyEnv: string | null
  baseURL: string | null
  models: ChannelModel[]
  costMode: ChannelCostMode
  /** 计费模式中文标签（服务端给出，避免两侧各维护一份映射）。 */
  costLabel: string
  status: ChannelStatus
  quotaPercent: number | null
  quotaWindowKey: string | null
  quotaWindowLabel: string | null
  balanceText: string | null
  snapshotUpdatedAt: number | null
}

export interface DaySummary {
  date: string
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  /** 计费要算、展示口径不算的缓存写 tokens。 */
  cacheWriteTokens: number
  reasoningTokens: number
  cost: number
  /** 成本来源角标：官方账单 / 用户规则 / 台账均价 / 无依据。 */
  costSource?: CostSource
}

export interface ModelSummary extends DaySummary {
  provider: string
  model: string
}

export interface ChannelDailySummary extends DaySummary {
  provider: string
  models: ModelSummary[]
}

export interface HourBucket {
  calls: number
  buckets: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
  }
}

export interface UsageResponse {
  totals: DaySummary | null
  days: ChannelDailySummary[]
  availableFrom: string | null
  availableTo: string | null
  /** 仅单日范围返回：来自会话事件的 24 小时分桶。 */
  hours: HourBucket[] | null
  /** 由会话事件补齐的日期（台账停更后的那些天，界面据此标注来源）。 */
  sessionDates: string[]
}

export interface HeatmapDay {
  date: string
  totalTokens: number
  models: Array<{ provider: string; model: string; totalTokens: number }>
}

export interface QuotaProvider {
  provider: string
  displayName: string | null
  credential: string | null
  updatedAt: number | null
  /** 该通道是否有官方余额 / 窗口查询方案：false 表示没有接口可查（如免费额度、本地端点）。 */
  supported: boolean
  /** live = 刚从官方接口查到；snapshot = 实时失败后回落到本机快照。 */
  source: 'live' | 'snapshot'
  /** 实时查询完成时间（source=live 时有效）。 */
  fetchedAt: number | null
  /** 实时失败原因：no-key / network / timeout / unauthorized / http-<code> / bad-json / no-snapshot。 */
  error: string | null
  balance: Record<string, unknown> | null
  plan: Record<string, unknown> | null
}

export interface RangeSummaryRow {
  provider: string
  calls: number
  tokens: number
  cost: number
  /** 该通道该范围的成本来源角标。 */
  costSource?: CostSource
}

export interface SummaryResponse {
  channels: Array<{ provider: string; today: RangeSummaryRow; month: RangeSummaryRow }>
  range: { today: string; monthFrom: string }
  /** 今日数据的来源：台账或会话事件（台账停更时会话事件会补位）。 */
  todaySource: 'ledger' | 'session'
  /** 由会话事件补齐的日期。 */
  sessionDates: string[]
}

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
}

export interface SessionRow {
  id: string
  title: string | null
  /** 已归档（宿主侧标记）：列表默认隐藏，显示时淡化，用量照常计入。 */
  archived: boolean
  workspace: string | null
  provider: string | null
  providerLabel: string | null
  firstTime: number | null
  lastTime: number | null
  calls: number
  tokens: number
  cacheHitRate: number | null
  days: number
  models: UsageModelRow[]
  costMode: ChannelCostMode | null
  cost: number | null
  /** 该行成本的来源角标。 */
  costSource?: CostSource
}

export interface SessionsResponse {
  rows: SessionRow[]
  coverage: SessionCoverage
  priced: boolean
}

export interface ProjectRow {
  workspace: string
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
  /** 该行成本的来源角标。 */
  costSource?: CostSource
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
  /** 估算成本（用户规则优先，没有规则时按台账均价），无成本数据时为 null。 */
  cost: number | null
  costMode: ChannelCostMode | null
  sessionCount: number
  /** 用到该模型的最晚会话时间（会话事件只有会话级时间戳，是近似值）。 */
  lastTime: number | null
  buckets: ModelBuckets
  /** 该行成本的来源角标。 */
  costSource?: CostSource
}

export interface ModelsResponse {
  rows: ModelAggregateRow[]
  coverage: SessionCoverage
  priced: boolean
}
