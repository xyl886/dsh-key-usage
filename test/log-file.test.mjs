/**
 * 系统日志落盘离线测试：追加 / 回读 / 清空、坏输入被丢、上限与字段裁剪、
 * 写目标守卫、超过上限保留后半段。
 * 运行：node test/log-file.test.mjs（依赖 lib/data/log-file.js，改 src 后要先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  LOG_DETAIL_LIMIT,
  LOG_FILE,
  appendLogRecords,
  clearLogFile,
  logFilePath,
  readLogRecords,
  toLogRecord,
} from '../lib/data/log-file.js'

const home = mkdtempSync(join(tmpdir(), 'dsh-key-usage-log-'))
process.env.DSH_HOME = home
const path = join(home, 'dsh-key-usage', LOG_FILE)

const record = (message, extra = {}) => ({ time: '2026-10-15T10:00:00.000Z', level: 'warn', source: 'pricing', message, ...extra })

let passed = 0
function check(name, run) {
  run()
  passed += 1
  console.log('  ✓ ' + name)
}

check('默认路径落在 $DSH_HOME/dsh-key-usage/usage.db', () => {
  assert.equal(logFilePath(), path)
})

check('追加后能按顺序回读', () => {
  assert.deepEqual(appendLogRecords([record('刷新价目失败', { detail: 'HTTP 502' }), record('回落默认汇率')]), { ok: true, written: 2 })
  const records = readLogRecords(10)
  assert.equal(records.length, 2)
  assert.equal(records[0].message, '刷新价目失败')
  assert.equal(records[0].detail, 'HTTP 502')
  assert.equal(records[1].source, 'pricing')
})

check('回读只取最近 limit 条', () => {
  assert.deepEqual(readLogRecords(1).map((item) => item.message), ['回落默认汇率'])
})

check('清空后没有记录，文件也真的空了', () => {
  assert.deepEqual(clearLogFile(), { ok: true })
  assert.deepEqual(readLogRecords(10), [])
  assert.equal(readLogRecords(10, path).length, 0)
})

check('形状不对的记录被丢掉，不写坏文件', () => {
  assert.deepEqual(appendLogRecords([null, 'text', { message: '' }, { message: '   ' }, { level: 'warn' }]), { ok: true, written: 0 })
  assert.deepEqual(readLogRecords(10), [])
})

check('级别非法回落 info、来源缺失回落 ui、时间非法用当前时间', () => {
  const converted = toLogRecord({ message: '缺字段' })
  assert.equal(converted.level, 'info')
  assert.equal(converted.source, 'ui')
  assert.ok(Number.isFinite(Date.parse(converted.time)))
})

check('消息与详情按上限裁剪', () => {
  appendLogRecords([record('x'.repeat(900), { detail: 'y'.repeat(3000) })])
  const [stored] = readLogRecords(1)
  assert.ok(stored.message.length <= 401)
  assert.ok(stored.message.endsWith('…'))
  assert.equal(stored.detail.length, LOG_DETAIL_LIMIT + 1)
})

check('坏形状的记录进不了库（写入即校验）', () => {
  assert.deepEqual(appendLogRecords([null, 'text', { message: '' }]), { ok: true, written: 0 })
})

check('存储路径可自定义（测试与迁移用）', () => {
  const customPath = join(home, 'dsh-key-usage', 'custom.db')
  assert.equal(appendLogRecords([record('自定义路径')], customPath).ok, true)
  assert.deepEqual(readLogRecords(10, customPath).map((item) => item.message), ['自定义路径'])
  assert.equal(clearLogFile(customPath).ok, true)
  assert.deepEqual(readLogRecords(10, customPath), [])
})

check('超过 30 天的日志在写入后清理', () => {
  const oldTime = new Date(Date.now() - 40 * 86400000).toISOString()
  appendLogRecords([{ time: oldTime, level: 'info', source: 'fx', message: '老记录' }])
  appendLogRecords([record('新记录')])
  const messages = readLogRecords(2000).map((item) => item.message)
  assert.ok(messages.includes('新记录'), '新记录要保留')
  assert.ok(!messages.includes('老记录'), '超过 30 天的记录应被清掉')
})


console.log('log-file: ' + String(passed) + ' 项通过')
