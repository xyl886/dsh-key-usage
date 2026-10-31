/** 客户端价目视图模型里的成本来源（与 src/client/pricing.ts 同一套取值）。 */
import type { CostSource } from './pricing.ts'

/** 价目 / 成本来源相关的响应类型定义在 pricing.ts（视图模型与响应同源），这里只做转出。 */
export type {
  AggregateIssue, AggregateLoaded, CatalogSourceSummary, CatalogSummary, CostSource, ModelPriceAggregate,
  PricingCoverage, PricingFileInfo, PricingFiles, PricingIssue, PricingRefreshResult, PricingResponse,
} from './pricing.ts'

/** 逐币种小计：跨币种合计只能按它折算后相加（`cost` 是混币种直接相加，只作兜底）。 */
export type CostsByCurrency = Record<string, number>

/** 客户端使用的宿主上下文最小面（与 dsh-plugin / dsh-context 的 slots 契约一致）。 */
export interface SlotRegistration {
  name: string
  /** 面板标识：`sidebar.panellist` 等用 `id`，`main` 用 `key`（取值与 `id` 相同）。 */
  id?: string
  key?: string
  order?: number
  /** 宿主渲染行标签时调用（`sidebar.panellist` 由宿主自持整行）。 */
  label?: () => string
  /** 追加给组件的 props；宿主还会传入自己的 props（如 `size`、locale 绑定的 `t`）。 */
  inject?: () => Record<string, unknown>
  /** 绑定的语言包命名空间（本插件未使用）。 */
  locale?: string
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
  /** 逐币种小计：合计按它折算后相加（`cost` 是混币种直接相加，只作兜底）。 */
  costsByCurrency?: CostsByCurrency
  /** 成本来源角标：官方账单 / 内置官方价目 / 聚合价目 / 跨通道厂商官方价 / 无依据。 */
  costSource?: CostSource
  /** 该格的聚合价目条目缺一个缓存价（按未命中价代），角标旁标「部分」。 */
  partial?: boolean
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

/**
 * 范围合计：比逐天行多两项「缓存省钱」字段（原型 KPI「缓存读 · 省 ¥X」）。
 * 只由 `/usage` 的 `totals` 下发，逐天 / 逐模型行没有。
 */
export interface UsageTotals extends DaySummary {
  /** 缓存省下的钱：缓存读 tokens ×（标准输入价 − 标准缓存读价），都对不上价目的模型跳过。 */
  cacheSaved?: number | null
  /** 省钱金额的逐币种小计（`cacheSaved` 是混币种直接相加，语义同 `cost`）。 */
  cacheSavedByCurrency?: CostsByCurrency
}

/** 按日期 × 小时的指标桶（/usage 的 hoursByDate）：趋势与明细的分时视图取这里。 */
export interface HourMetricCell {
  calls: number
  tokens: number
  outputTokens: number
  cacheReadTokens: number
  /** 该小时有调用的会话数。 */
  sessions: number
  /** 该小时按价目算出的成本（含错峰）；没有价目依据时为 null。 */
  cost: number | null
  /** 逐币种小计：与按天成本同口径（cost 是混币种直接相加，只作兜底）。 */
  costsByCurrency?: Record<string, number>
}

export interface UsageResponse {
  totals: UsageTotals | null
  days: ChannelDailySummary[]
  availableFrom: string | null
  availableTo: string | null
  /** 仅单日范围返回：来自会话事件的 24 小时分桶。 */
  hours: HourBucket[] | null
  /** 逐日 24 小时桶（趋势按小时 / 按 6 小时取数用）；旧服务端没有这一项时按缺省处理。 */
  hoursByDate?: Record<string, HourMetricCell[]> | null
  /** 由会话事件补齐的日期（台账停更后的那些天，界面据此标注来源）。 */
  sessionDates: string[]
}

export interface HeatmapDay {
  date: string
  totalTokens: number
  models: Array<{ provider: string; model: string; totalTokens: number }>
}

/** 「按时段」热力图的一行：weekday 1=周一 … 7=周日，hours 长度固定 24（每格是该小时累计调用数）。 */
export interface WeekdayHours {
  weekday: number
  /** 每格是该小时的调用数 */
  hours: number[]
}

/** `/heatmap` 与快照 `heatmap` 段：逐日活动 + 一周 × 24 小时的调用数矩阵。 */
export interface HeatmapResponse {
  days: HeatmapDay[]
  /** 旧服务端没有这一项，界面要能只用 `days` 渲染。 */
  hourly?: WeekdayHours[]
  /** 按时段的多指标矩阵（calls / tokens 为真值）；旧服务端没有这一项时回落到 hourly 的调用数。 */
  hourlyMetrics?: Array<{ weekday: number; hours: Array<{ calls: number; tokens: number; sessions: number; cost: number | null }> }>
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
  /** 逐币种小计（同上：合计只按它折算后相加）。 */
  costsByCurrency?: CostsByCurrency
  /** 该通道该范围的成本来源角标。 */
  costSource?: CostSource
  /** 其中至少有一条聚合价目是 partial（缺一个缓存价）。 */
  partial?: boolean
}

export interface SummaryResponse {
  channels: Array<{ provider: string; today: RangeSummaryRow; month: RangeSummaryRow }>
  range: { today: string; monthFrom: string }
  /** 今日数据的来源：台账或会话事件（台账停更时会话事件会补位）。 */
  todaySource: 'ledger' | 'session'
  /** 由会话事件补齐的日期。 */
  sessionDates: string[]
}

export interface PromptsResponse {
  words: Array<{ word: string; count: number }>
  totalPrompts: number
  totalChars: number
  /** 窗口内有提问的会话数（服务端 0.2.5 起下发；旧快照段没有这个字段）。 */
  sessionCount?: number
  /** 当前窗口起点（本地 `YYYY-MM-DD`；快照段 = 近 30 天窗口的起点） */
  from: string | null
  /** 当前窗口终点（本地 `YYYY-MM-DD`；快照段 = 今天） */
  to: string | null
  /** 上期（同长度、紧邻前一窗口）的提问条数；服务端没给（上期无数据 / 旧版本）时为 null，界面不显示环比。 */
  prevTotalPrompts?: number | null
  /** 上期的提问字符数。 */
  prevTotalChars?: number | null
  /** 上期的词表条数（与本期同样取 top 60 后计数）。 */
  prevWordCount?: number | null
  /** 上期最高频词的次数（本期「最常提」的环比基准）。 */
  prevTopWordCount?: number | null
}

/** 工具 / 技能榜单的一行。 */
export interface ToolUsageRow {
  name: string
  calls: number
  /** 占同类调用总次数的百分比，一位小数。 */
  sharePercent: number
}

/** MCP server 榜单的一行。 */
export interface McpServerUsageRow {
  server: string
  calls: number
  sharePercent: number
}

/** 迷你柱的一天。 */
export interface ToolUsageDay {
  /** 本地日期 `YYYY-MM-DD`。 */
  date: string
  calls: number
}

/**
 * 快照 `tools` 段：工具 / 技能 / MCP server 调用统计（全部会话、全量历史）。
 * `null` = 暂无采集（老库 / 读不到会话 / 从未调用工具），界面显示占位。
 */
export interface ToolsResponse {
  /** 工具调用总次数（`tool/call` 事件数）。 */
  calls: number
  /** 至少调用过一次工具的会话数。 */
  sessions: number
  /** 工具 Top 7（次数降序、同频按名称升序）。 */
  tools: ToolUsageRow[]
  /** 近 7 个本地日的工具调用次数（含今天，缺日补 0）。 */
  days: ToolUsageDay[]
  skills: {
    /** 技能调用总次数。 */
    calls: number
    /** 不同技能个数。 */
    count: number
    /** 技能 Top 6。 */
    rows: ToolUsageRow[]
    /** Top 6 之外的技能个数与调用次数合计（界面「其它 N 个」行）。 */
    other: { count: number; calls: number }
  }
  mcp: {
    /** MCP 调用总次数。 */
    calls: number
    /** 不同 MCP server 个数。 */
    count: number
    /** server Top 8。 */
    rows: McpServerUsageRow[]
  }
  /** `/tools` 参数化响应的回显：统计窗口的起止本地日期；快照段没有这两个字段（全量历史）。 */
  from?: string
  to?: string
}

export interface SnapshotSections {
  overview: SummaryResponse | null
  channels: { channels: Channel[] } | null
  usage: UsageResponse | null
  heatmap: HeatmapResponse | null
  models: ModelsResponse | null
  projects: ProjectsResponse | null
  sessions: SessionsResponse | null
  quota: { providers: QuotaProvider[] } | null
  prompts: PromptsResponse | null
  tools: ToolsResponse | null
}

/** `/snapshot` 与 `POST /refresh` 的同一份响应形状。 */
export interface SnapshotResponse {
  ok: true
  updatedAt: string
  /** `open` = 打开页面触发的本地重建（配额段走后台补查）。 */
  buildSource: 'scheduled' | 'manual' | 'initial' | 'open'
  building: boolean
  /** 打开页面时触发的**后台配额补查**是否在进行：真时客户端隔一会儿再取一次。 */
  quotaRefreshing?: boolean
  sections: SnapshotSections
  quotaOutcome: SnapshotQuotaOutcome
  issues: Array<{ kind: string; message: string }>
}

/** GET /update 的响应：只表示「有没有新版本」，不含任何安装动作。 */
export interface UpdateInfo {
  current: string
  latest: string | null
  checkedAt: number | null
  stale: boolean
  hasUpdate: boolean
}

// 数据段类型拆到 types-data.ts，这里统一再导出
import type { ModelAggregateRow, ModelsResponse, ProjectRow, ProjectsResponse, SessionRow, SessionsResponse, SnapshotQuotaOutcome } from './types-data.ts'
export type {
  SessionCoverage,
  UsageModelRow,
  SessionRow,
  SessionsResponse,
  SessionDetailHour,
  SessionDetailModel,
  SessionDetail,
  SessionDetailResponse,
  ProjectRow,
  ProjectsResponse,
  ModelBuckets,
  ModelAggregateRow,
  ModelsResponse,
  ModelRateRow,
  ChannelRates,
  RatesResponse,
  FxResponse,
  SnapshotQuotaProvider,
  SnapshotQuotaOutcome,
} from './types-data.ts'
