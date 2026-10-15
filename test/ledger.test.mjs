/**
 * ledger 聚合逻辑离线测试：构造内存台账验证范围聚合、通道过滤与热力图拆分。
 * 运行：node test/ledger.test.mjs
 */
import assert from 'node:assert/strict'
import { readLedger, aggregateRange, buildHeatmap } from '../lib/data/ledger.js'

const ledger = {
  version: 1,
  days: {
    '2026-10-12': {
      'deepseek-official': {
        'deepseek-flash': { inputTokens: 100, outputTokens: 50, cacheReadTokens: 850, cacheWriteTokens: 0, reasoningTokens: 0, calls: 3, cost: 0.5 },
      },
      'sensenova': {
        'glm-5.2': { inputTokens: 200, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, calls: 2, cost: 0 },
      },
    },
    '2026-10-13': {
      'deepseek-official': {
        'deepseek-flash': { inputTokens: 300, outputTokens: 150, cacheReadTokens: 2550, cacheWriteTokens: 0, reasoningTokens: 10, calls: 5, cost: 1.5 },
      },
    },
  },
}

const memoryReader = () => JSON.stringify(ledger)

// 读取与损坏容错
assert.ok(readLedger('unused', memoryReader) !== null, '台账应可读取')
assert.equal(readLedger('unused', () => null), null, '缺失文件应返回 null')
assert.equal(readLedger('unused', () => '{broken'), null, '损坏 JSON 应返回 null')

// 全范围聚合
const all = aggregateRange(ledger, '2026-10-12', '2026-10-13', null)
assert.equal(all.totals.calls, 10)
assert.equal(all.totals.inputTokens, 600)
assert.equal(all.totals.cost, 2)
assert.equal(all.days.length, 2)
assert.equal(all.days[0].models.length, 2, '首日应含两个模型行')

// 通道过滤
const deepseekOnly = aggregateRange(ledger, '2026-10-12', '2026-10-13', ['deepseek-official'])
assert.equal(deepseekOnly.totals.calls, 8)
assert.equal(deepseekOnly.days[0].models.length, 1)
assert.equal(deepseekOnly.days[0].models[0].provider, 'deepseek-official')

// 空范围
const empty = aggregateRange(ledger, '2026-01-01', '2026-01-02', null)
assert.equal(empty.totals.calls, 0)
assert.equal(empty.days.length, 0)

// 热力图：日总量 + 按模型拆分
const heat = buildHeatmap(ledger, '2026-10-12', '2026-10-13')
assert.equal(heat.length, 2)
assert.equal(heat[0].totalTokens, 1220)
assert.equal(heat[0].models.length, 2)
assert.equal(heat[1].models[0].model, 'deepseek-flash')

console.log('ledger.test: 全部通过')
