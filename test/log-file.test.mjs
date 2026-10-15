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
  LOG_MAX_BYTES,
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

check('默认路径落在 $DSH_HOME/dsh-key-usage/plugin.log', () => {
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
  assert.equal(readFileSync(path, 'utf8'), '')
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

check('单行坏 JSON 被跳过，好行照读', () => {
  writeFileSync(path, '{"time":"2026-10-15T10:00:00.000Z","level":"warn","source":"fx","message":"好行"}\n不是 JSON\n\n', 'utf8')
  assert.deepEqual(readLogRecords(10).map((item) => item.message), ['好行'])
})

check('写目标守卫：换文件名 / 换目录都被拒', () => {
  const wrongName = appendLogRecords([record('x')], join(home, 'dsh-key-usage', 'other.log'))
  assert.equal(wrongName.ok, false)
  assert.match(wrongName.error, /只允许写 plugin\.log/)
  const wrongDir = appendLogRecords([record('x')], join(home, 'elsewhere', LOG_FILE))
  assert.equal(wrongDir.ok, false)
  assert.match(wrongDir.error, /只允许写 \$DSH_HOME\/dsh-key-usage\/plugin\.log/)
  assert.equal(clearLogFile(join(home, 'elsewhere', LOG_FILE)).ok, false)
})

check('超过上限只保留后半段', () => {
  const filler = 'z'.repeat(100)
  const total = Math.ceil((LOG_MAX_BYTES + 4096) / (filler.length + 75))
  const batch = Array.from({ length: total }, (unused, index) => record(filler + '-' + String(index)))
  // 一次批量最多 200 条，分批灌到超过上限
  for (let index = 0; index < batch.length; index += 100) {
    assert.equal(appendLogRecords(batch.slice(index, index + 100)).ok, true)
  }
  const records = readLogRecords(2000)
  assert.ok(records.length < total, '轮转后条数必须变少')
  assert.ok(readFileSync(path, 'utf8').length <= LOG_MAX_BYTES, '轮转后文件不该还超上限')
  assert.equal(records[records.length - 1].message.endsWith('-' + String(total - 1)), true, '最新一条必须留住')
})

console.log('log-file: ' + String(passed) + ' 项通过')
