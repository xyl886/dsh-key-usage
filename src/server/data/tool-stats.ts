/**
 * 工具 / 技能 / MCP 的统计与运行期索引（从 session-usage.ts 拆出）。
 * 会话折叠只负责产出按天计数，聚合、排行与窗口切片都在这里。
 */
import { MCP_TOP_LIMIT, SKILLS_TOP_LIMIT, TOOL_TREND_DAYS, TOOLS_TOP_LIMIT, attributeModelKey, dayKeyOf, normalizeProvider } from './session-usage.js'
import type { ToolDayStat } from './session-usage.js'

export interface ToolStatsRecord {
  toolCalls?: number
  toolNameCounts?: Map<string, number> | null
  skillNameCounts?: Map<string, number> | null
  mcpServerCounts?: Map<string, number> | null
  toolDayCalls?: Map<string, number> | null
  /** 按天的工具 / 技能 / MCP 明细（`/tools` 窗口切片用）；老数据源没有这个字段。 */
  toolDayStats?: Map<string, ToolDayStat> | null
}

/** 快照 `tools` 段的一行（工具 / 技能共用）。 */
export interface ToolUsageRow {
  name: string
  calls: number
  /** 占同类调用总次数的百分比，一位小数。 */
  sharePercent: number
}

/** 快照 `tools` 段的 MCP server 行。 */
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

/** 快照 `tools` 段：工具 / 技能 / MCP server 调用统计（全部会话、全量历史）。 */
export interface ToolsStat {
  /** 工具调用总次数（`tool/call` 事件数）。 */
  calls: number
  /** 至少调用过一次工具的会话数。 */
  sessions: number
  /** Top 7（调用次数降序，同频按名称升序）。 */
  tools: ToolUsageRow[]
  /** 近 7 个本地日的工具调用次数（含今天，缺失日补 0）。 */
  days: ToolUsageDay[]
  skills: {
    /** 技能调用总次数（`skill` 工具且能解析出 `arguments.name`）。 */
    calls: number
    /** 不同技能个数。 */
    count: number
    /** Top 6。 */
    rows: ToolUsageRow[]
    /** Top 6 之外的技能个数与调用次数合计（界面「其它 N 个」行）。 */
    other: { count: number; calls: number }
  }
  mcp: {
    /** MCP 调用总次数（`mcp_call` + 直连 `mcp__<server>__<tool>` 工具名）。 */
    calls: number
    /** 不同 MCP server 个数。 */
    count: number
    /** Top 8。 */
    rows: McpServerUsageRow[]
  }
}

/** 百分比：调用次数 / 同类总数，一位小数；分母为 0 时给 0。 */
function sharePercentOf(calls: number, total: number): number {
  if (total <= 0 || calls <= 0) return 0
  return Math.round(calls / total * 1000) / 10
}

/** 跨会话累加计数表（兼容旧数据源缺字段 / null）。 */
function mergeCounts(target: Map<string, number>, source: Map<string, number> | null | undefined): void {
  if (!(source instanceof Map)) return
  for (const [key, count] of source) {
    if (typeof key !== 'string' || key === '' || !Number.isFinite(count) || count <= 0) continue
    target.set(key, (target.get(key) ?? 0) + count)
  }
}

/** 计数表 → 榜单行：次数降序、同频按名称升序，取前 limit 个。 */
function countRowsOf(counts: Map<string, number>, limit: number, total: number): Array<{ key: string; calls: number; sharePercent: number }> {
  return [...counts.entries()]
    .filter(([key, calls]) => key !== '' && Number.isFinite(calls) && calls > 0)
    .sort((first, second) => (second[1] !== first[1] ? second[1] - first[1] : first[0] < second[0] ? -1 : first[0] > second[0] ? 1 : 0))
    .slice(0, limit)
    .map(([key, calls]) => ({ key, calls, sharePercent: sharePercentOf(calls, total) }))
}

/** 计数表 → 下发的 `ToolsStat`：两个入口（全量快照段、`/tools` 窗口）共用同一套占比与截断规则。 */
function toolsStatOf(input: {
  calls: number
  sessions: number
  toolCounts: Map<string, number>
  skillCounts: Map<string, number>
  mcpCounts: Map<string, number>
  days: ToolUsageDay[]
}): ToolsStat {
  const skillTotal = [...input.skillCounts.values()].reduce((sum, count) => sum + count, 0)
  const mcpTotal = [...input.mcpCounts.values()].reduce((sum, count) => sum + count, 0)
  // 占比分母：工具用总调用次数（与面板头部的「N 次」同一口径），技能 / MCP 用各自总数
  const toolRows = countRowsOf(input.toolCounts, TOOLS_TOP_LIMIT, input.calls)
  const skillRows = countRowsOf(input.skillCounts, SKILLS_TOP_LIMIT, skillTotal)
  const mcpRows = countRowsOf(input.mcpCounts, MCP_TOP_LIMIT, mcpTotal)
  return {
    calls: input.calls,
    sessions: input.sessions,
    tools: toolRows.map((row) => ({ name: row.key, calls: row.calls, sharePercent: row.sharePercent })),
    days: input.days,
    skills: {
      calls: skillTotal,
      count: input.skillCounts.size,
      rows: skillRows.map((row) => ({ name: row.key, calls: row.calls, sharePercent: row.sharePercent })),
      other: {
        count: Math.max(0, input.skillCounts.size - skillRows.length),
        calls: Math.max(0, skillTotal - skillRows.reduce((sum, row) => sum + row.calls, 0)),
      },
    },
    mcp: {
      calls: mcpTotal,
      count: input.mcpCounts.size,
      rows: mcpRows.map((row) => ({ server: row.key, calls: row.calls, sharePercent: row.sharePercent })),
    },
  }
}

/**
 * 跨会话合并工具 / 技能 / MCP 统计（快照 `tools` 段：全部会话、全量历史）。
 * `null` = 这份数据源没有工具统计（老缓存 / 外部注入的旧数据源 / 没有会话 / 一条工具调用都没有），
 * 界面统一显示「暂无采集」而不是 0；只有真的采集到调用才返回对象。
 */
export function mergeToolStats(records: Iterable<ToolStatsRecord>, options?: { now?: number }): ToolsStat | null {
  const toolCounts = new Map<string, number>()
  const skillCounts = new Map<string, number>()
  const mcpCounts = new Map<string, number>()
  const dayCounts = new Map<string, number>()
  let calls = 0
  let sessions = 0
  let collected = false
  for (const record of records) {
    if (typeof record.toolCalls !== 'number' || !Number.isFinite(record.toolCalls)) continue
    collected = true
    if (record.toolCalls > 0) sessions += 1
    calls += record.toolCalls
    mergeCounts(toolCounts, record.toolNameCounts)
    mergeCounts(skillCounts, record.skillNameCounts)
    mergeCounts(mcpCounts, record.mcpServerCounts)
    mergeCounts(dayCounts, record.toolDayCalls)
  }
  if (!collected || calls <= 0 || toolCounts.size === 0) return null
  const nowMs = options?.now ?? Date.now()
  const days: ToolUsageDay[] = []
  for (let offset = TOOL_TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const date = dayKeyOf(nowMs - offset * 86400000)
    days.push({ date, calls: dayCounts.get(date) ?? 0 })
  }
  return toolsStatOf({ calls, sessions, toolCounts, skillCounts, mcpCounts, days })
}

/** 工具运行期索引里一个会话的维度与计数表（内存态、不落盘，随每次本地重建刷新）。 */
export interface ToolSessionEntry {
  /** 会话工作区；空串 = 未归入工作区。 */
  workspace: string
  /** 会话用到的**展示模型名**（去重，与顶部「模型」筛选的取值同一口径）。 */
  models: string[]
  /** 会话用到的通道（去重）。 */
  providers: string[]
  /** 工具名 → 调用次数（直接引用折叠缓存里的 Map，不复制）。 */
  byTool: Map<string, number> | null
  /** 技能名 → 调用次数。 */
  skills: Map<string, number> | null
  /** MCP server → 调用次数。 */
  mcp: Map<string, number> | null
  /** 本地日期 → 当天工具调用次数。 */
  byDay: Map<string, number> | null
  /** 本地日期 → 当天工具 / 技能 / MCP 明细：窗口切片只能读它。 */
  toolDayStats: Map<string, ToolDayStat> | null
  /** 全量工具调用次数（含没有事件时间、进不了 byDay 的那些）。 */
  total: number
}

/** 工具运行期索引：会话 id → 过滤维度 + 计数表。 */
export type ToolSessionIndex = Map<string, ToolSessionEntry>

/** 建运行期索引所需的会话字段（`SessionUsageRecord` 的结构子集，避免 data 层反向依赖 sessions.ts）。 */
export interface SessionIndexRecord {
  id: string
  workspace?: string | null
  summary?: { models?: ReadonlyArray<{ key: string }> } | null
}

/** 建索引所需的工具统计字段。 */
export interface ToolIndexRecord extends ToolStatsRecord, SessionIndexRecord {}

/** 运行期索引共用的过滤维度：模型名按展示口径拆（`attributeModelKey` 去掉路由前缀），与顶部「模型」筛选一致。 */
export function sessionDimensionsOf(
  record: SessionIndexRecord,
  knownProviders: string[],
): { workspace: string; models: string[]; providers: string[] } {
  const models = new Set<string>()
  const providers = new Set<string>()
  for (const model of record.summary?.models ?? []) {
    if (model === null || typeof model.key !== 'string' || model.key === '') continue
    const attribution = attributeModelKey(model.key, knownProviders)
    if (attribution.model !== '') models.add(attribution.model)
    if (attribution.provider !== '') providers.add(attribution.provider)
  }
  return { workspace: record.workspace ?? '', models: [...models], providers: [...providers] }
}

/**
 * 从同一份会话折叠结果建工具运行期索引：只搬 Map 引用、收集过滤维度，**不读第二遍会话**。
 */
export function buildToolSessionIndex(records: Iterable<ToolIndexRecord>, knownProviders: string[]): ToolSessionIndex {
  const index: ToolSessionIndex = new Map()
  for (const record of records) {
    if (typeof record.id !== 'string' || record.id === '') continue
    index.set(record.id, {
      ...sessionDimensionsOf(record, knownProviders),
      byTool: record.toolNameCounts ?? null,
      skills: record.skillNameCounts ?? null,
      mcp: record.mcpServerCounts ?? null,
      byDay: record.toolDayCalls ?? null,
      toolDayStats: record.toolDayStats ?? null,
      total: typeof record.toolCalls === 'number' && Number.isFinite(record.toolCalls) ? record.toolCalls : 0,
    })
  }
  return index
}

/** 提问运行期索引里一个会话的过滤维度与按天桶（内存态、不落盘，随每次本地重建刷新）。 */
export interface ToolWindowQuery {
  /** 起始本地日期 `YYYY-MM-DD`（含）。 */
  from: string
  /** 结束本地日期 `YYYY-MM-DD`（含）。 */
  to: string
  /** 工作区多选；`''` 匹配「未归入工作区」。 */
  projects?: string[] | null
  /** 展示模型名多选。 */
  models?: string[] | null
}

/** `/tools` 迷你柱最多画的天数：窗口更长时只画最后 N 天，次数仍按完整窗口统计。 */
export const TOOLS_WINDOW_MAX_DAYS = 400

/** 窗口内的日期序列（含首尾）；窗口更长时取最后 N 天。非法日期返回空表。 */
function windowDayKeysOf(from: string, to: string): string[] {
  const startMs = Date.parse(from)
  const endMs = Date.parse(to)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return []
  const span = Math.round((endMs - startMs) / 86400000) + 1
  const length = Math.min(span, TOOLS_WINDOW_MAX_DAYS)
  const days: string[] = []
  for (let offset = span - length; offset < span; offset += 1) {
    days.push(new Date(startMs + offset * 86400000).toISOString().slice(0, 10))
  }
  return days
}

/**
 * 按窗口 + 项目 + 模型聚合工具统计（`GET /tools`）。
 * `null` = 运行期索引还没建好（老版本 / 构建中）：调用方回落快照里的全量段，不报错。
 * 索引存在但窗口内没有调用时返回**全 0 的对象**（界面据此显示空态，而不是拿全量数据冒充）。
 */
export function mergeToolStatsInWindow(index: ToolSessionIndex | null, query: ToolWindowQuery): ToolsStat | null {
  if (index === null) return null
  const projects = query.projects !== undefined && query.projects !== null && query.projects.length > 0 ? new Set(query.projects) : null
  const models = query.models !== undefined && query.models !== null && query.models.length > 0 ? new Set(query.models) : null
  const toolCounts = new Map<string, number>()
  const skillCounts = new Map<string, number>()
  const mcpCounts = new Map<string, number>()
  const dayCounts = new Map<string, number>()
  let calls = 0
  let sessions = 0
  for (const entry of index.values()) {
    if (projects !== null && !projects.has(entry.workspace)) continue
    if (models !== null && !entry.models.some((model) => models.has(model))) continue
    if (entry.toolDayStats === null) continue
    let sessionCalls = 0
    for (const [day, stat] of entry.toolDayStats) {
      if (day < query.from || day > query.to) continue
      sessionCalls += stat.calls
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + stat.calls)
      mergeCounts(toolCounts, stat.tools)
      mergeCounts(skillCounts, stat.skills)
      mergeCounts(mcpCounts, stat.mcp)
    }
    if (sessionCalls <= 0) continue
    sessions += 1
    calls += sessionCalls
  }
  const days = windowDayKeysOf(query.from, query.to).map((date) => ({ date, calls: dayCounts.get(date) ?? 0 }))
  return toolsStatOf({ calls, sessions, toolCounts, skillCounts, mcpCounts, days })
}

/**
 * 把事件里出现的 provider 归一到宿主配置里的通道 id。
 * 事件里的 provider 可能是 pi-ai 路由（如 `pi-ai/opencode-go`）或适配器 id，
 * 只要末段与已知通道同名就归到该通道，否则原样保留。
 */
