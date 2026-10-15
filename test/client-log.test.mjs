/**
 * 客户端系统日志测试：攒批落盘、去重累加、磁盘回读 / 重复刷新不虚增、清空、导出文本、
 * 落盘失败不抛错、打开日志窗的订阅。
 * 用 Node 的类型擦除直接加载 `src/client/core/log.ts`（Node ≥ 22.18 默认开启）。
 * 运行：node test/client-log.test.mjs
 */
import assert from 'node:assert/strict'

const diskRecords = [
  { time: '2026-10-15T10:00:00.000Z', level: 'warn', source: 'fx', message: '回落默认汇率', detail: 'https://example.test/fx' },
  { time: '2026-10-15T10:05:00.000Z', level: 'error', source: 'pricing', message: '刷新价目失败', detail: 'HTTP 502' },
  { time: '2026-10-15T10:05:00.000Z', level: 'error', source: 'pricing', message: '刷新价目失败', detail: 'HTTP 502' },
]

const calls = []
let failNext = false
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, init })
  if (failNext) throw new Error('网络不可用')
  if (init.method === 'POST') return { ok: true, json: async () => ({ ok: true, written: 1 }) }
  return { ok: true, json: async () => ({ ok: true, records: diskRecords }) }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const postBodies = () => calls.filter((call) => call.init?.method === 'POST').map((call) => JSON.parse(call.init.body))

const log = await import('../src/client/core/log.ts')

let passed = 0
async function check(name, run) {
  await run()
  passed += 1
  console.log('  ✓ ' + name)
}

await check('磁盘历史读回：按时间排序、详情保留、重复记录合并计数', async () => {
  await log.hydrateLog()
  const entries = log.logEntries()
  assert.deepEqual(entries.map((entry) => entry.source), ['fx', 'pricing'])
  assert.equal(entries[0].detail, 'https://example.test/fx')
  assert.equal(entries[1].count, 2, '磁盘上同一条出现两次 → 折叠成 ×2')
  assert.ok(entries[0].time < entries[1].time)
})

await check('重复刷新磁盘不虚增计数（日志窗「刷新」幂等）', async () => {
  await log.refreshLog()
  await log.refreshLog()
  assert.deepEqual(log.logEntries().map((entry) => entry.count), [1, 2])
})

await check('同来源同消息去重累加，攒批只发一次 POST', async () => {
  calls.length = 0
  const before = log.logEntries().length
  log.logError('quota', '实时查询未成功 · local', '未配置 API Key')
  log.logError('quota', '实时查询未成功 · local', '未配置 API Key')
  log.logInfo('pricing', '刷新价目')
  assert.equal(log.logEntries().length, before + 2, '两条相同合成一条 + 一条新的')
  await sleep(1300)
  const bodies = postBodies()
  assert.equal(bodies.length, 1, '1 秒内的三条合成一批')
  assert.equal(bodies[0].records.length, 2, '去重后只写两条')
  const quotaRecord = bodies[0].records.find((record) => record.source === 'quota')
  assert.equal(quotaRecord.message, '实时查询未成功 · local')
  assert.equal(quotaRecord.detail, '未配置 API Key')
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(quotaRecord.time), '落盘时间用 ISO 串')
})

await check('已发送的条目不会重复写盘', async () => {
  calls.length = 0
  await log.flushLog()
  assert.equal(postBodies().length, 0)
})

await check('导出文本：带时间 / 级别 / 来源，详情缩进一行，重复标 ×N', async () => {
  const text = log.logText()
  assert.match(text, /\[error\] pricing · 刷新价目失败 ×2/)
  assert.match(text, /\n {4}HTTP 502/)
  assert.match(text, /\[error\] quota · 实时查询未成功 · local ×2/)
})

await check('落盘失败被吞掉，不影响内存日志', async () => {
  calls.length = 0
  failNext = true
  log.logWarn('api', '请求失败 · /dsh-key-usage/usage', 'HTTP 500')
  await sleep(1300)
  failNext = false
  assert.equal(postBodies().length, 1, '确实尝试过一次')
  assert.ok(log.logEntries().some((entry) => entry.message === '请求失败 · /dsh-key-usage/usage'))
})

await check('清空：内存清掉，并向磁盘发 clear', async () => {
  calls.length = 0
  log.clearLog()
  await sleep(200)
  assert.deepEqual(log.logEntries(), [])
  assert.ok(postBodies().some((body) => body.clear === true))
})

await check('页面请求打开日志窗时通知订阅者', async () => {
  let opened = 0
  const unsubscribe = log.subscribeOpenLog(() => { opened += 1 })
  log.requestOpenLog()
  log.requestOpenLog()
  unsubscribe()
  log.requestOpenLog()
  assert.equal(opened, 2)
})

await check('空消息不记（避免写入只有来源没有内容的白条）', async () => {
  log.logInfo('ui', '')
  assert.equal(log.logEntries().length, 0)
})

console.log('client-log: ' + String(passed) + ' 项通过')
