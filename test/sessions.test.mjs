/**
 * sessions 数据源离线测试：0.2 read handle 适配、按 revision 缓存、失败降级，
 * 以及会话行 / 项目行 / 单日小时分桶的聚合。
 * 运行：node test/sessions.test.mjs
 */
import assert from 'node:assert/strict'
import { createSessionSource, hoursOfDate, projectRowsOf, sessionRowsOf } from '../lib/sessions.js'

const morning = new Date(2026, 9, 13, 9, 15, 0).getTime()
const afternoon = new Date(2026, 9, 13, 15, 40, 0).getTime()

function usageChunk(seq, time, turn, step, usage) {
  return { seq, time, type: 'assistant/chunk', data: { turn, step, chunk: { type: 'usage', usage } } }
}

const sessionLog = [
  { seq: 0, time: morning, type: 'request/header', data: { header: { config: { provider: 'pi-ai/opencode-go', model: 'GLM-5.3-Flash' } } } },
  usageChunk(1, morning, 1, 1, { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 8000 }),
  usageChunk(2, afternoon, 1, 2, { inputTokens: 500, outputTokens: 100, cacheReadTokens: 4000 }),
]

/** 0.2 形态的假持久化服务：list / open('read') / read(0) / close，并记录 open→read 的并发窗口。 */
function createFakePersistence(entries) {
  const records = new Map(entries)
  const stats = { reads: [], closes: 0, opens: [], openWindows: [] }
  // 「处于 open 与 read 之间」的会话集合：宿主后端的解析 memo 就是按这个窗口大小复用的
  const active = new Set()
  return {
    stats,
    records,
    service: {
      identity: Symbol('fixture'),
      list: async () => [...records.entries()].map(([id, record]) => ({ header: record.header, revision: record.revision, eventCount: record.events.length, sizeBytes: record.sizeBytes })),
      open: async (id, access) => {
        stats.opens.push([id, access])
        const record = records.get(id)
        if (record.failOpen === true) throw new Error('fixture open failure')
        const window = { id, peak: active.size + 1 }
        for (const holder of active) holder.peak = Math.max(holder.peak, active.size + 1)
        active.add(window)
        stats.openWindows.push(window)
        return {
          inheritedEventCount: record.inherited ?? 0,
          read: async (offset) => {
            // 读之前等一会儿，让并发的另一个会话有机会进入同一个窗口
            await new Promise((resolve) => setTimeout(resolve, 20))
            stats.reads.push([id, offset])
            active.delete(window)
            return { events: record.events.slice(offset) }
          },
          close: async () => { stats.closes += 1; active.delete(window) },
        }
      },
    },
  }
}

// 1. 正常折叠 + 元数据提取 + 继承前缀不计入
const fake = createFakePersistence([
  ['session-a', { header: { id: 'session-a', title: '开发 DSH Key 用量插件', cwd: 'D:\\EasyJob', updatedAt: afternoon }, revision: Symbol('r1'), events: sessionLog }],
  ['session-b', { header: { id: 'session-b', cwd: 'D:\\EasyJob', updatedAt: morning }, revision: Symbol('r1'), inherited: 2, events: [...sessionLog, usageChunk(3, afternoon, 2, 1, { inputTokens: 99, outputTokens: 1, cacheReadTokens: 0 })] }],
])
const source = createSessionSource({ get: (name) => (name === 'sessionPersistence' ? fake.service : undefined) })
const first = await source.collect()
assert.equal(first.coverage.status, 'complete')
assert.equal(first.records.length, 2)
const recordA = first.records.find((record) => record.id === 'session-a')
assert.equal(recordA.title, '开发 DSH Key 用量插件')
assert.equal(recordA.workspace, 'D:\\EasyJob')
assert.equal(recordA.summary.calls, 2, 'session-a 两次结算')
assert.equal(recordA.summary.tokens, 13800, 'tokens 含 cacheRead')
const recordB = first.records.find((record) => record.id === 'session-b')
assert.equal(recordB.summary.calls, 2, '继承的 2 个事件不计入，仅算新增样本')
assert.equal(recordB.summary.tokens, 4700, '只累加新增样本的用量')
assert.equal(recordB.summary.models[0].key, 'pi-ai/opencode-go/GLM-5.3-Flash', '继承前缀里的 request/header 仍用于模型归属')
assert.equal(fake.stats.closes, 2, '每个 handle 都必须关闭')

// 2. revision 未变化时不重复读
const readsAfterFirst = fake.stats.reads.length
await source.collect()
assert.equal(fake.stats.reads.length, readsAfterFirst, 'revision 未变则命中缓存，不再读事件')

// 3. revision 变化后重折
fake.records.get('session-a').revision = Symbol('r2')
fake.records.get('session-a').events = [...sessionLog, usageChunk(4, afternoon, 1, 3, { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0 })]
const third = await source.collect()
assert.equal(third.records.find((record) => record.id === 'session-a').summary.calls, 3, 'revision 变化触发重折')

// 4. 单个会话读取失败：跳过并标 partial，不影响其它会话
fake.records.get('session-b').failOpen = true
fake.records.get('session-a').revision = Symbol('r3')
fake.records.get('session-b').revision = Symbol('r3')
const fourth = await source.collect()
assert.equal(fourth.coverage.status, 'partial')
assert.equal(fourth.coverage.skippedSessions, 1)
assert.equal(fourth.records.length, 1, '失败会话不计入但仍保留其它会话')

// 5. 服务缺失 → unavailable 且不抛错
const missing = createSessionSource({ get: () => undefined })
const missingResult = await missing.collect()
assert.equal(missingResult.coverage.status, 'unavailable')
assert.deepEqual(missingResult.records, [])

// 6. 会话行 / 项目行 / 小时分桶
const rows = sessionRowsOf(first.records, ['opencode-go', 'deepseek-official'])
assert.equal(rows.length, 2)
const rowA = rows.find((row) => row.id === 'session-a')
assert.equal(rowA.provider, 'opencode-go', 'pi-ai 路由归一到已知通道')
assert.equal(rowA.models[0].provider, 'opencode-go')
assert.equal(rowA.models[0].model, 'GLM-5.3-Flash')
assert.equal(rowA.cacheHitRate, 87, '命中率 = cacheRead / (input + output + cacheRead) = 12000 / 13800')
const projects = projectRowsOf(first.records, ['opencode-go'])
assert.equal(projects.length, 1, '同一工作目录合并为一个项目')
assert.equal(projects[0].workspace, 'D:\\EasyJob')
assert.equal(projects[0].sessionCount, 2)
assert.equal(projects[0].tokens, 13800 + 4700)
assert.deepEqual(projects[0].providers, { 'opencode-go': 13800 + 4700 })
const hours = hoursOfDate(first.records, '2026-10-13')
assert.equal(hours[9].calls, 1, '9 点只有 session-a 的首个样本')
assert.equal(hours[15].calls, 3, '15 点两次（session-a 第二个）+ 一次（session-b 新增）')
assert.equal(hours[9].buckets.cacheReadTokens, 8000)
assert.equal(hours.filter((slot) => slot.calls > 0).length, 2)

// 7. 无工作目录的会话归到「未归属工作区」
const orphan = sessionRowsOf([{ id: 'session-c', title: null, workspace: null, summary: { calls: 0, tokens: 0, buckets: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, cacheHitRate: null, firstTime: null, lastTime: null, primaryModelKey: null, days: [], models: [] } }], [])
assert.equal(orphan.length, 1)
assert.equal(projectRowsOf([{ id: 'session-c', title: null, workspace: null, summary: { calls: 0, tokens: 0, buckets: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, cacheHitRate: null, firstTime: null, lastTime: null, primaryModelKey: null, days: [], models: [] } }], [])[0].workspace, '未归属工作区')

// 8. 有界并发：小会话两路、大会话串行；不漏会话、不重复读、顺序仍按 updatedAt 倒序
const oneMegabyte = 1024 * 1024
const concurrencyFixture = createFakePersistence([
  ['small-a', { header: { id: 'small-a', cwd: 'D:\\EasyJob', updatedAt: morning + 5 }, revision: Symbol('c1'), sizeBytes: 4 * 1024, events: sessionLog }],
  ['small-b', { header: { id: 'small-b', cwd: 'D:\\EasyJob', updatedAt: morning + 4 }, revision: Symbol('c1'), sizeBytes: 4 * 1024, events: sessionLog }],
  ['small-c', { header: { id: 'small-c', cwd: 'D:\\EasyJob', updatedAt: morning + 3 }, revision: Symbol('c1'), sizeBytes: 4 * 1024, events: sessionLog }],
  ['large-a', { header: { id: 'large-a', cwd: 'D:\\EasyJob', updatedAt: morning + 2 }, revision: Symbol('c1'), sizeBytes: 8 * oneMegabyte, events: sessionLog }],
  ['large-b', { header: { id: 'large-b', cwd: 'D:\\EasyJob', updatedAt: morning + 1 }, revision: Symbol('c1'), sizeBytes: 8 * oneMegabyte, events: sessionLog }],
])
const concurrencySource = createSessionSource({ get: (name) => (name === 'sessionPersistence' ? concurrencyFixture.service : undefined) })
const concurrent = await concurrencySource.collect()
assert.equal(concurrent.coverage.status, 'complete')
assert.equal(concurrent.coverage.countedSessions, 5, '并发读取不漏会话')
assert.equal(concurrencyFixture.stats.opens.length, 5, '每个会话只 open 一次')
assert.equal(concurrencyFixture.stats.reads.length, 5, '每个会话只 read 一次（没有半成品/重复折叠）')
assert.equal(concurrencyFixture.stats.closes, 5, '每个 handle 都必须关闭')
assert.deepEqual(
  concurrent.records.map((record) => record.id),
  ['small-a', 'small-b', 'small-c', 'large-a', 'large-b'],
  '并发不改变记录顺序（仍按 updatedAt 倒序）',
)
const windowPeakOf = (id) => concurrencyFixture.stats.openWindows.find((window) => window.id === id).peak
assert.equal(Math.max(windowPeakOf('small-a'), windowPeakOf('small-b'), windowPeakOf('small-c')), 2, '小会话两路并发')
assert.equal(Math.max(windowPeakOf('large-a'), windowPeakOf('large-b')), 1, '大会话串行（不放大解析 memo 被挤掉的代价）')
// 缺 sizeBytes 时按串行处理，行为与优化前一致
const unknownSize = createFakePersistence([
  ['u-1', { header: { id: 'u-1', updatedAt: morning }, revision: Symbol('c1'), events: sessionLog }],
  ['u-2', { header: { id: 'u-2', updatedAt: afternoon }, revision: Symbol('c1'), events: sessionLog }],
])
const unknownSizeSource = createSessionSource({ get: (name) => (name === 'sessionPersistence' ? unknownSize.service : undefined) })
assert.equal((await unknownSizeSource.collect()).records.length, 2)
assert.equal(Math.max(...unknownSize.stats.openWindows.map((window) => window.peak)), 1, '拿不到体积信息时退回串行')

// 9. 并发读取中单个会话失败：只跳过它，其余照常返回
const partialFixture = createFakePersistence([
  ['ok-a', { header: { id: 'ok-a', updatedAt: morning + 2 }, revision: Symbol('c1'), sizeBytes: 4 * 1024, events: sessionLog }],
  ['bad', { header: { id: 'bad', updatedAt: morning + 1 }, revision: Symbol('c1'), sizeBytes: 4 * 1024, events: sessionLog, failOpen: true }],
  ['ok-b', { header: { id: 'ok-b', updatedAt: morning }, revision: Symbol('c1'), sizeBytes: 4 * 1024, events: sessionLog }],
])
const partialSource = createSessionSource({ get: (name) => (name === 'sessionPersistence' ? partialFixture.service : undefined) })
const partial = await partialSource.collect()
assert.equal(partial.coverage.status, 'partial')
assert.equal(partial.coverage.skippedSessions, 1)
assert.deepEqual(partial.records.map((record) => record.id), ['ok-a', 'ok-b'], '并发下一个会话失败不影响其它会话')

console.log('sessions.test: 全部通过')
