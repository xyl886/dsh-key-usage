/**
 * 会话标题与归档标记的离线测试：标题来源优先级、归档集合归一、行级标记。
 * 全部用夹具，不读真实用户的 storages。
 * 运行：node test/session-meta.test.mjs
 */
import assert from 'node:assert/strict'
import { createArchiveSource, createTitleSource, normalizeSessionId, parseTitles } from '../lib/data/session-meta.js'
import { foldSessionEvents, promptSnippetOf, summarizeSession, PROMPT_TITLE_CHARS } from '../lib/data/session-usage.js'
import { projectRowsOf, sessionRowsOf } from '../lib/data/sessions.js'

// ---------- 1) 标题解析 ----------
const projection = {
  tables: {
    sessions: {
      'session-aaaa1111-0000-0000-0000-000000000001': { rows: { title: { val: '修复登录接口' } } },
      'aaaa1111-0000-0000-0000-000000000002': { rows: { title: { val: '  带空白的标题  ' } } },
      'session-cccc3333-0000-0000-0000-000000000003': { rows: { title: { val: null } } },
      'session-dddd4444-0000-0000-0000-000000000004': { rows: {} },
    },
  },
}
const titles = parseTitles(projection)
assert.equal(titles.size, 2, '只有非空标题入表')
assert.equal(titles.get('aaaa1111-0000-0000-0000-000000000001'), '修复登录接口', 'id 归一为裸 uuid')
assert.equal(titles.get('aaaa1111-0000-0000-0000-000000000002'), '带空白的标题', '两端空白被裁掉')

assert.equal(parseTitles(null).size, 0, '结构不符返回空表')
assert.equal(parseTitles({ tables: { sessions: 'nope' } }).size, 0)
assert.equal(normalizeSessionId('SESSION-ABC'), 'abc', '大小写与前缀都归一')

// ---------- 2) 标题文件按 mtime 缓存 ----------
let readCount = 0
const titleSource = createTitleSource('/fake/session_projcache.json', () => {
  readCount += 1
  return JSON.stringify(projection)
})
// 用真实存在的文件才能测 mtime；这里退化为「文件不存在 → 空表且不抛错」
assert.equal(titleSource.titles().size, 0, '文件不存在时返回空表')
assert.equal(readCount, 0, '文件不存在就不读内容')

// ---------- 3) 归档集合：优先宿主 getter，回落文件 ----------
const workspaceDocument = JSON.stringify({ global: { archivedSessionIds: ['session-x1', 'Y2'] } })
const hostWithRegistry = { get: () => ({ archivedSessionIds: ['session-HOST1'] }) }
const fromHost = createArchiveSource(hostWithRegistry, '/fake/workspace.json', () => workspaceDocument)
assert.deepEqual([...fromHost.archived()], ['host1'], '有官方 getter 时优先用它')

const hostWithoutRegistry = { get: () => undefined }
const fromFile = createArchiveSource(hostWithoutRegistry, '/fake/workspace.json', () => workspaceDocument)
assert.deepEqual([...fromFile.archived()].sort(), ['x1', 'y2'], '没有 getter 时读 workspace.json')

const hostThrowing = { get: () => { throw new Error('service missing') } }
const fromThrowingHost = createArchiveSource(hostThrowing, '/fake/workspace.json', () => workspaceDocument)
assert.deepEqual([...fromThrowingHost.archived()].sort(), ['x1', 'y2'], 'getter 抛错时回落文件')

const brokenFile = createArchiveSource(hostWithoutRegistry, '/fake/workspace.json', () => '{ not json')
assert.equal(brokenFile.archived().size, 0, '文件损坏时返回空集合')

// ---------- 4) 首条用户提问作为标题兜底 ----------
const morning = new Date(2026, 9, 13, 9, 0, 0).getTime()
const folded = foldSessionEvents([
  // 真实形状：user/message 的正文在 data.content（assistant/message 才用 data.message.content）
  { seq: 0, time: morning, type: 'user/message', data: { content: [{ type: 'text', text: '  帮我   看看\n这个插件的用量  ' }] } },
  { seq: 1, time: morning, type: 'request/header', data: { header: { config: { provider: 'opencode-go', model: 'GLM-5.3-Flash' } } } },
  { seq: 2, time: morning, type: 'user/message', data: { content: [{ type: 'text', text: '第二条不该覆盖' }] } },
  { seq: 3, time: morning, type: 'assistant/chunk', data: { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 2, cacheReadTokens: 0 } } } },
])
assert.equal(folded.firstPrompt, '帮我 看看 这个插件的用量', '空白被压平、只取第一条')

// 兼容分支：assistant 那套 data.message.content、以及裸字符串块
const nestedShape = foldSessionEvents([
  { seq: 0, time: morning, type: 'user/message', data: { message: { content: [{ type: 'text', text: '嵌套形状也要认' }] } } },
])
assert.equal(nestedShape.firstPrompt, '嵌套形状也要认', 'data.message.content 作为兼容分支')
const stringBlocks = foldSessionEvents([
  { seq: 0, time: morning, type: 'user/message', data: { content: ['', '裸字符串提示'] } },
])
assert.equal(stringBlocks.firstPrompt, '裸字符串提示', '裸字符串块也要认')

const longPrompt = foldSessionEvents([
  { seq: 0, time: morning, type: 'user/message', data: { content: [{ type: 'text', text: '一'.repeat(120) }] } },
])
// 折叠保留正文（详情抽屉要全文），列表标题那一层才截断到 60 字 + 省略号
assert.equal(longPrompt.firstPrompt.length, 120, '折叠结果保留提问正文全文')
assert.equal(promptSnippetOf(longPrompt.firstPrompt, PROMPT_TITLE_CHARS).length, 61, '列表标题截断到 60 字 + 省略号')

const noPrompt = foldSessionEvents([
  { seq: 0, time: morning, type: 'assistant/chunk', data: { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0 } } } },
])
assert.equal(noPrompt.firstPrompt, null, '没有用户消息时为 null')

// ---------- 5) 行级标记：标题优先级 + archived ----------
const records = [
  {
    id: 'session-aaaa1111-0000-0000-0000-000000000001',
    title: null,
    workspace: 'D:\\work\\one',
    summary: summarizeSession(folded),
  },
  {
    id: 'session-bbbb2222-0000-0000-0000-000000000002',
    title: '会话头里的标题',
    workspace: 'D:\\work\\one',
    summary: summarizeSession(noPrompt),
  },
]
const archivedSet = new Set(['aaaa1111-0000-0000-0000-000000000001'])
const rows = sessionRowsOf(records, ['opencode-go'], { titles, archived: archivedSet })
const titledRow = rows.find((row) => row.id.endsWith('0001'))
assert.equal(titledRow.title, '修复登录接口', '投影缓存标题优先于首条提问')
assert.equal(titledRow.archived, true, '归档 id 归一后能命中')
const headerRow = rows.find((row) => row.id.endsWith('0002'))
assert.equal(headerRow.title, '会话头里的标题', '没有投影标题时用会话头字段')
assert.equal(headerRow.archived, false)

// 没有投影标题也没有会话头标题时，回落到首条提问
const promptOnly = sessionRowsOf([{ ...records[0], id: 'session-eeee5555-0000-0000-0000-000000000005' }], [], {})
assert.equal(promptOnly[0].title, '帮我 看看 这个插件的用量', '最后回落到首条用户提问')

// 三种来源都没有（无会话头标题、无投影标题、无用户消息）时才为 null，界面回落短 id
const noSource = sessionRowsOf([{ id: 'session-ffff6666-0000-0000-0000-000000000006', title: null, workspace: null, summary: summarizeSession(noPrompt) }], [], {})
assert.equal(noSource[0].title, null, '没有任何来源时为 null')

// ---------- 6) 项目行的归档计数 ----------
const projectRows = projectRowsOf(records, [], { archived: archivedSet })
assert.equal(projectRows.length, 1, '两个会话同属一个工作区')
assert.equal(projectRows[0].sessionCount, 2)
assert.equal(projectRows[0].archivedSessionCount, 1, '归档数单独统计，用量仍全额计入')

console.log('session-meta.test: 全部通过')
