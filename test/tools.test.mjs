/**
 * 工具 / 技能 / MCP 统计测试：会话事件折叠（`tool/call`）+ 跨会话合并（快照 `tools` 段）。
 * 运行：node test/tools.test.mjs（依赖 lib/data/session-usage.js，改 src 后要先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { dayKeyOf, foldSessionEvents } from '../lib/data/session-usage.js'
import { TOOLS_WINDOW_MAX_DAYS, buildToolSessionIndex, mergeToolStats, mergeToolStatsInWindow } from '../lib/data/tool-stats.js'

/** 相对今天偏移 N 天的本地日期键（与折叠口径同一套计算）。 */
function localDayKey(offsetDays) {
  return dayKeyOf(Date.now() + offsetDays * 86400000)
}

const now = Date.now()
const twoDaysAgo = now - 2 * 86400000
const today = now - 60 * 1000

// ===== 1. 折叠：一次 `tool/call` 记一次；assistant/message 的 `tool-call` 内容块不重复计 =====
const events = [
  { seq: 1, time: twoDaysAgo, type: 'tool/call', data: { turn: 1, step: 1, callId: 'c1', name: 'pwsh', arguments: '{"command":"npm run build:server"}' } },
  { seq: 2, time: twoDaysAgo, type: 'tool/call', data: { turn: 1, step: 1, callId: 'c2', name: 'read', arguments: '{"file_path":"a.ts"}' } },
  { seq: 3, time: twoDaysAgo, type: 'tool/call', data: { turn: 1, step: 2, callId: 'c3', name: 'skill', arguments: '{"name":"agent-browser"}' } },
  // 同一调用的消息内容块：不能再计一次（它是 assistant/message 的内容，不是独立调用）
  { seq: 4, time: today, type: 'assistant/message', data: { turn: 2, step: 1, message: { content: [{ type: 'tool-call', id: 'c1', name: 'pwsh', arguments: '{}' }] } } },
  { seq: 5, time: today, type: 'tool/call', data: { turn: 2, step: 1, callId: 'c4', name: 'mcp_call', arguments: '{"server":"playwright","tool":"browser_click","arguments":{}}' } },
  // 部分宿主把 MCP 工具直接暴露成工具名 → 同样按 server 归属
  { seq: 6, time: today, type: 'tool/call', data: { turn: 2, step: 2, callId: 'c5', name: 'mcp__chrome-devtools__take_snapshot', arguments: '{}' } },
  // 技能参数解析失败：工具次数照计，但不知道技能名 → 不进技能榜
  { seq: 7, time: today, type: 'tool/call', data: { turn: 2, step: 2, callId: 'c6', name: 'skill', arguments: '不是 JSON' } },
  // mcp_call 解析不出 server → 归到 unknown（不丢 MCP 次数）
  { seq: 8, time: today, type: 'tool/call', data: { turn: 2, step: 3, callId: 'c7', name: 'mcp_call', arguments: '{}' } },
  // 缺工具名、缺时间：工具次数照计，归到 unknown；不计入每日趋势
  { seq: 9, type: 'tool/call', data: { turn: 2, step: 3, callId: 'c8' } },
  // 与工具无关的事件：不影响统计
  { seq: 10, time: today, type: 'user/message', data: { content: [{ type: 'text', text: '统计一下工具调用' }] } },
]

const fold = foldSessionEvents(events)
assert.equal(fold.toolCalls, 8, '按 tool/call 事件计数；assistant/message 的内容块与 user/message 不算')
assert.deepEqual([...fold.toolNameCounts].sort(), [
  ['mcp__chrome-devtools__take_snapshot', 1],
  ['mcp_call', 2],
  ['pwsh', 1],
  ['read', 1],
  ['skill', 2],
  ['unknown', 1],
], '工具名按事件计数')
assert.deepEqual([...fold.skillNameCounts], [['agent-browser', 1]], '技能名取 arguments.name；解析失败的调用不计入')
assert.deepEqual([...fold.mcpServerCounts].sort(), [
  ['chrome-devtools', 1],
  ['playwright', 1],
  ['unknown', 1],
], 'MCP server 取 mcp_call 的 arguments.server，并兼容 mcp__<server>__<tool>')
assert.deepEqual([...fold.toolDayCalls].sort(), [
  [localDayKey(-2), 3],
  [localDayKey(0), 4],
], '每日工具调用次数按事件时间落到本地日期；缺时间的调用不计')

// 按天的工具 / 技能 / MCP 明细：`/tools` 的窗口切片只能读天级数据（拿会话全量次数摊是猜）
const twoDaysAgoStat = fold.toolDayStats.get(localDayKey(-2))
assert.equal(twoDaysAgoStat.calls, 3)
assert.deepEqual([...twoDaysAgoStat.tools].sort(), [['pwsh', 1], ['read', 1], ['skill', 1]])
assert.deepEqual([...twoDaysAgoStat.skills], [['agent-browser', 1]])
assert.equal(twoDaysAgoStat.mcp, null, '两天前没有 MCP 调用：空表按需不建')
const todayStat = fold.toolDayStats.get(localDayKey(0))
assert.equal(todayStat.calls, 4)
assert.deepEqual([...todayStat.tools].sort(), [
  ['mcp__chrome-devtools__take_snapshot', 1], ['mcp_call', 2], ['skill', 1],
])
assert.equal(todayStat.skills, null, '技能参数解析失败的调用不进技能榜（空表按需不建）')
assert.deepEqual([...todayStat.mcp].sort(), [['chrome-devtools', 1], ['playwright', 1], ['unknown', 1]])

// 没有工具调用的会话：计数为 0、计数表为 null（与「未采集」区分在 merge 那一层）
const emptyFold = foldSessionEvents([
  { seq: 1, time: today, type: 'assistant/chunk', data: { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0 } } } },
])
assert.equal(emptyFold.toolCalls, 0)
assert.equal(emptyFold.toolNameCounts, null)
assert.equal(emptyFold.skillNameCounts, null)
assert.equal(emptyFold.mcpServerCounts, null)
assert.equal(emptyFold.toolDayCalls, null)
assert.equal(emptyFold.toolDayStats, null)

// ===== 2. 合并：跨会话相加、Top N、占比、其它技能、近 7 天趋势 =====
const secondRecord = {
  toolCalls: 2,
  toolNameCounts: new Map([['pwsh', 1], ['edit', 1]]),
  skillNameCounts: new Map([['motion-reel', 1]]),
  mcpServerCounts: new Map([['playwright', 1]]),
  toolDayCalls: new Map([[localDayKey(0), 2]]),
}
const foldedRecord = {
  toolCalls: fold.toolCalls,
  toolNameCounts: fold.toolNameCounts,
  skillNameCounts: fold.skillNameCounts,
  mcpServerCounts: fold.mcpServerCounts,
  toolDayCalls: fold.toolDayCalls,
}
const merged = mergeToolStats([foldedRecord, secondRecord], { now })
assert.ok(merged !== null)
assert.equal(merged.calls, 10, '工具总次数 = 跨会话相加')
assert.equal(merged.sessions, 2, '会话数 = 有工具调用的会话')
assert.equal(merged.tools.length, 7, '工具榜只下发 Top 7')
assert.deepEqual(merged.tools.map((row) => row.name), [
  'mcp_call', 'pwsh', 'skill', 'edit', 'mcp__chrome-devtools__take_snapshot', 'read', 'unknown',
], '次数降序、同频按名称升序')
assert.deepEqual(merged.tools.map((row) => row.calls), [2, 2, 2, 1, 1, 1, 1])
assert.deepEqual(merged.tools.map((row) => row.sharePercent), [20, 20, 20, 10, 10, 10, 10], '占比分母 = 工具调用总次数')
assert.equal(merged.skills.calls, 2)
assert.equal(merged.skills.count, 2)
assert.deepEqual(merged.skills.rows.map((row) => row.name), ['agent-browser', 'motion-reel'])
assert.deepEqual(merged.skills.rows.map((row) => row.sharePercent), [50, 50], '技能占比分母 = 技能调用总次数')
assert.deepEqual(merged.skills.other, { count: 0, calls: 0 })
assert.equal(merged.mcp.calls, 4, 'MCP 次数 = mcp_call + 直连 mcp__ 工具')
assert.equal(merged.mcp.count, 3)
assert.deepEqual(merged.mcp.rows.map((row) => row.server), ['playwright', 'chrome-devtools', 'unknown'])
assert.deepEqual(merged.mcp.rows.map((row) => row.sharePercent), [50, 25, 25])
assert.equal(merged.days.length, 7, '趋势固定 7 天（含今天）')
assert.deepEqual(merged.days.map((day) => day.date), Array.from({ length: 7 }, (_, index) => localDayKey(index - 6)))
assert.equal(merged.days[6].calls, 6, '今天 = 两次折叠的今天次数相加')
assert.equal(merged.days[4].calls, 3, '两天前保留原次数')

// Top N 截断：工具 7 行、技能 6 行 + 其它、MCP 8 行
const manyRecord = {
  toolCalls: 10,
  toolNameCounts: new Map(Array.from({ length: 10 }, (_, index) => ['tool-' + String(index).padStart(2, '0'), 1])),
  skillNameCounts: new Map(Array.from({ length: 8 }, (_, index) => ['skill-' + String(index), 1])),
  mcpServerCounts: new Map(Array.from({ length: 10 }, (_, index) => ['server-' + String(index).padStart(2, '0'), 1])),
  toolDayCalls: new Map(),
}
const many = mergeToolStats([manyRecord], { now })
assert.ok(many !== null)
assert.equal(many.tools.length, 7)
assert.equal(many.skills.rows.length, 6)
assert.deepEqual(many.skills.other, { count: 2, calls: 2 }, 'Top 6 之外的技能合并成「其它」')
assert.equal(many.mcp.rows.length, 8)

// ===== 3. 没有采集到工具统计：该段给 null（界面显示「暂无采集」），不是 0 =====
assert.equal(mergeToolStats([], { now }), null, '没有会话')
assert.equal(mergeToolStats([{ id: 'old-source', summary: {} }], { now }), null, '老数据源没有工具字段')
assert.equal(mergeToolStats([{ toolCalls: 0, toolNameCounts: new Map(), toolDayCalls: new Map() }], { now }), null, '会话里从未调用工具')

// ===== 4. 运行期索引：维度收集 + Map 引用复用（不复制展开，不读第二遍会话） =====
const sessionA = {
  id: 'session-a',
  workspace: 'D:\\EasyJob',
  summary: { models: [{ key: 'pi-ai/opencode-go/GLM-5.3-Flash' }, { key: 'deepseek-official/deepseek-chat' }] },
  toolCalls: fold.toolCalls,
  toolNameCounts: fold.toolNameCounts,
  skillNameCounts: fold.skillNameCounts,
  mcpServerCounts: fold.mcpServerCounts,
  toolDayCalls: fold.toolDayCalls,
  toolDayStats: fold.toolDayStats,
}
const sessionB = {
  id: 'session-b',
  workspace: null,
  summary: { models: [{ key: 'local/Qwen3' }] },
  toolCalls: 2,
  toolNameCounts: new Map([['pwsh', 2]]),
  skillNameCounts: null,
  mcpServerCounts: null,
  toolDayCalls: new Map([[localDayKey(0), 2]]),
  toolDayStats: new Map([[localDayKey(0), { calls: 2, tools: new Map([['pwsh', 2]]), skills: new Map(), mcp: new Map() }]]),
}
const index = buildToolSessionIndex([sessionA, sessionB], ['opencode-go', 'local'])
assert.equal(index.size, 2)
const entryA = index.get('session-a')
assert.equal(entryA.workspace, 'D:\\EasyJob')
assert.deepEqual(entryA.models.sort(), ['GLM-5.3-Flash', 'deepseek-chat'], '模型名按展示口径去掉路由前缀')
assert.deepEqual(entryA.providers.sort(), ['deepseek-official', 'opencode-go'])
assert.equal(entryA.byTool, fold.toolNameCounts, '计数表直接引用折叠缓存里的 Map，不复制')
assert.equal(entryA.byDay, fold.toolDayCalls)
assert.equal(entryA.total, fold.toolCalls)
assert.equal(index.get('session-b').workspace, '', 'null 工作区归一成空串 = 项目筛选的「未归入工作区」')

// ===== 5. 窗口聚合（GET /tools）：按天切、可跨日，空窗口给全 0 而不是回落全量 =====
const windowOf = (fromOffset, toOffset, extra) => ({
  from: localDayKey(fromOffset),
  to: localDayKey(toOffset),
  ...extra,
})
assert.equal(mergeToolStatsInWindow(null, windowOf(-2, 0)), null, '索引缺失 → null（调用方回落快照全量）')

const todayOnly = mergeToolStatsInWindow(index, windowOf(0, 0))
assert.equal(todayOnly.calls, 6, '只算今天：A 的 4 次 + B 的 2 次')
assert.equal(todayOnly.sessions, 2)
assert.deepEqual(todayOnly.tools.map((row) => [row.name, row.calls]), [
  ['mcp_call', 2], ['pwsh', 2], ['mcp__chrome-devtools__take_snapshot', 1], ['skill', 1],
], '工具榜只算窗口内的调用，次数降序、同频按名称升序')
assert.deepEqual(todayOnly.tools.map((row) => row.sharePercent), [33.3, 33.3, 16.7, 16.7])
assert.deepEqual(todayOnly.days, [{ date: localDayKey(0), calls: 6 }], '迷你柱 = 窗口内的日期序列')
assert.equal(todayOnly.skills.calls, 0, '今天没有技能调用')
assert.deepEqual(todayOnly.mcp.rows.map((row) => [row.server, row.calls]), [
  ['chrome-devtools', 1], ['playwright', 1], ['unknown', 1],
])

const twoDaysAgoOnly = mergeToolStatsInWindow(index, windowOf(-2, -2))
assert.equal(twoDaysAgoOnly.calls, 3)
assert.equal(twoDaysAgoOnly.sessions, 1)
assert.deepEqual(twoDaysAgoOnly.tools.map((row) => [row.name, row.calls]), [['pwsh', 1], ['read', 1], ['skill', 1]])
assert.equal(twoDaysAgoOnly.skills.calls, 1)
assert.deepEqual(twoDaysAgoOnly.skills.rows.map((row) => row.name), ['agent-browser'])
assert.equal(twoDaysAgoOnly.mcp.calls, 0)

const spanning = mergeToolStatsInWindow(index, windowOf(-2, 0))
assert.equal(spanning.calls, 9, '跨日窗口：两天相加（A 的 7 次有时间的调用 + B 的 2 次；A 另有 1 次没有事件时间，进不了窗口）')
assert.deepEqual(spanning.days.map((day) => [day.date, day.calls]), [
  [localDayKey(-2), 3], [localDayKey(-1), 0], [localDayKey(0), 6],
], '窗口内逐日补 0')
assert.deepEqual(spanning.tools.map((row) => row.name), [
  'pwsh', 'mcp_call', 'skill', 'mcp__chrome-devtools__take_snapshot', 'read',
])

// 空窗口：索引在、窗口里没有调用 → 全 0 对象（界面据此显示空态，绝不拿全量冒充）
const emptyWindow = mergeToolStatsInWindow(index, windowOf(-5, -4))
assert.equal(emptyWindow.calls, 0)
assert.equal(emptyWindow.sessions, 0)
assert.deepEqual(emptyWindow.tools, [])
assert.deepEqual(emptyWindow.days, [{ date: localDayKey(-5), calls: 0 }, { date: localDayKey(-4), calls: 0 }])
assert.deepEqual(emptyWindow.skills, { calls: 0, count: 0, rows: [], other: { count: 0, calls: 0 } })
assert.deepEqual(emptyWindow.mcp, { calls: 0, count: 0, rows: [] })

// ===== 6. 过滤维度：项目（含「未归入工作区」的空串）、模型、多选与组合 =====
const byProject = mergeToolStatsInWindow(index, windowOf(-2, 0, { projects: ['D:\\EasyJob'] }))
assert.equal(byProject.calls, 7, '只算该工作区的会话（A）')
assert.equal(byProject.sessions, 1)
const byOrphan = mergeToolStatsInWindow(index, windowOf(-2, 0, { projects: [''] }))
assert.equal(byOrphan.calls, 2, '空串 = 「未归入工作区」，匹配 workspace 为空的会话（B）')
assert.deepEqual(byOrphan.tools.map((row) => [row.name, row.calls]), [['pwsh', 2]])
const byUnknownProject = mergeToolStatsInWindow(index, windowOf(-2, 0, { projects: ['D:\\nope'] }))
assert.equal(byUnknownProject.calls, 0)

const byModel = mergeToolStatsInWindow(index, windowOf(-2, 0, { models: ['Qwen3'] }))
assert.equal(byModel.calls, 2, '模型筛选只留用到该模型的会话（B）')
assert.equal(byModel.sessions, 1)
const byTwoModels = mergeToolStatsInWindow(index, windowOf(-2, 0, { models: ['GLM-5.3-Flash', 'Qwen3'] }))
assert.equal(byTwoModels.calls, 9, '多选是「任一命中」')
const byProjectAndModel = mergeToolStatsInWindow(index, windowOf(-2, 0, { projects: ['D:\\EasyJob'], models: ['Qwen3'] }))
assert.equal(byProjectAndModel.calls, 0, '项目与模型同时限制（A 没用 Qwen3）')
assert.deepEqual(mergeToolStatsInWindow(index, windowOf(-2, 0, { projects: [], models: [] })).calls, 9, '空数组 = 不筛')

// 老数据源（有 toolCalls 没有按天明细）：窗口里无法归属 → 0，不拿全量凑数
const legacyIndex = buildToolSessionIndex([{ id: 'legacy', workspace: '', summary: { models: [] }, toolCalls: 9 }], [])
assert.equal(mergeToolStatsInWindow(legacyIndex, windowOf(-2, 0)).calls, 0)

// 超长窗口：迷你柱只画最后 TOOLS_WINDOW_MAX_DAYS 天，次数仍按完整窗口统计
const longWindow = mergeToolStatsInWindow(index, windowOf(-(TOOLS_WINDOW_MAX_DAYS + 100), 0))
assert.equal(longWindow.days.length, TOOLS_WINDOW_MAX_DAYS)
assert.equal(longWindow.days[longWindow.days.length - 1].date, localDayKey(0))
assert.equal(longWindow.days[0].date, localDayKey(-(TOOLS_WINDOW_MAX_DAYS - 1)))
assert.equal(longWindow.calls, 9)

console.log('tools.test.mjs: 全部通过')
