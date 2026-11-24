/**
 * 每轮费用（`/turns` 的计价层）离线测试：多模型跨轮合并、跨小时错峰、多币种、无价目、messageIds 去重。
 * 直接 import `lib/data/turn-cost.js`，价目与错峰规则由 `pricing` 层提供（与页面同一套）。
 * 运行：node test/turn-cost.test.mjs（依赖 lib/data/turn-cost.js，改 src 后要先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { turnCostsOf } from '../lib/data/turn-cost.js'

// 聚合价目层只读随包快照；把 DSH_HOME 指到空目录，避免本机刷新副本让断言跟着漂
const home = mkdtempSync(join(tmpdir(), 'dsh-key-usage-turn-cost-'))
process.env.DSH_HOME = home

/** 通道清单：`attributeModelKey` 按它把 `provider/model` 原始键归一到某个通道。 */
const KNOWN_PROVIDERS = ['deepseek-official', 'moonshotai', 'zai', 'zzz-unknown']
/** 计费模式表（`/turns` 路由原样透传；纯计价函数不读它，这里只保证签名一致）。 */
const COST_MODE_OF = new Map([
  ['deepseek-official', 'perToken'],
  ['moonshotai', 'perToken'],
  ['zai', 'perToken'],
  ['zzz-unknown', 'perToken'],
])

/** 2026-10-12 是周一：错峰窗口按星期几判定，用固定日期而不是「今天」，断言不随日历漂。 */
const MONDAY = '2026-10-12'
const PEAK_HOUR = 10
const OFF_PEAK_HOUR = 3

function makeBuckets(overrides) {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, ...overrides }
}

/** 造一条用量样本：`key` 是 `turn:step#attempt`（与 `foldSessionEvents` 的生产键一致）。 */
function sample(turn, step, model, hour, buckets, options = {}) {
  return {
    key: String(turn) + ':' + String(step) + '#' + String(options.attempt ?? 0),
    day: options.day ?? MONDAY,
    hour,
    model,
    messageId: options.messageId ?? null,
    buckets: makeBuckets(buckets),
  }
}

/** 金额比较：单价是十进制小数，浮点尾差不该让测试变脆。 */
function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    (message ?? '金额不符') + '（实际 ' + String(actual) + '，期望 ' + String(expected) + '）',
  )
}

let passed = 0
function check(name, run) {
  run()
  passed += 1
  console.log('  ✓ ' + name)
}

check('多模型跨轮：同一轮两个模型各自计费并合并成一行', () => {
  const rows = turnCostsOf(
    [
      // 1M 未命中输入：deepseek-flash 周一 10:00 是高峰价 ¥2
      sample(1, 1, 'deepseek-official/deepseek-flash', PEAK_HOUR, { inputTokens: 1_000_000, outputTokens: 0 }, { messageId: 'msg-1a' }),
      // 1M 未命中输入：kimi-k3 内置价目 ¥20（没有错峰价）
      sample(1, 2, 'moonshotai/kimi-k3', PEAK_HOUR, { inputTokens: 1_000_000 }, { messageId: 'msg-1b' }),
    ],
    KNOWN_PROVIDERS,
    COST_MODE_OF,
  )
  assert.equal(rows.length, 1, '同一轮不同模型合成一行')
  const row = rows[0]
  assert.equal(row.turn, 1)
  assert.equal(row.calls, 2, '两次上报都计入')
  assert.equal(row.tokens, 2_000_000, '展示口径 tokens = 输入 + 输出 + 缓存读')
  assert.deepEqual(
    row.models,
    ['deepseek-official/deepseek-flash', 'moonshotai/kimi-k3'],
    '两个模型各自归属、都列在轮上',
  )
  assert.deepEqual(row.messageIds, ['msg-1a', 'msg-1b'])
  assert.equal(row.source, 'catalog', '两个模型都命中内置官方价目')
  closeTo(row.cost, 22, '合并金额 = ¥2（deepseek-flash）+ ¥20（kimi-k3）')
  assert.equal(row.currency, 'CNY', '两个模型同币种 → 轮上有唯一币种')
  assert.deepEqual(row.costsByCurrency, { CNY: 22 })
  assert.equal(row.unpricedTokens, 0)
  assert.equal(row.partial, false)
})

check('跨小时错峰：错峰小时的金额是高峰小时的一半', () => {
  const rows = turnCostsOf(
    [
      sample(1, 1, 'deepseek-official/deepseek-flash', PEAK_HOUR, { inputTokens: 1_000_000 }),
      sample(2, 1, 'deepseek-official/deepseek-flash', OFF_PEAK_HOUR, { inputTokens: 1_000_000 }),
    ],
    KNOWN_PROVIDERS,
    COST_MODE_OF,
  )
  assert.deepEqual(rows.map((row) => row.turn), [1, 2], '按轮次升序下发')
  assert.equal(rows[0].source, 'catalog')
  assert.equal(rows[1].source, 'catalog')
  closeTo(rows[0].cost, 2, '周一 10:00 属高峰 → 1M 输入按 ¥2 / MTok')
  closeTo(rows[1].cost, 1, '周一 03:00 属错峰 → 同一批 tokens 按半价 ¥1')
  assert.equal(rows[1].cost, rows[0].cost / 2, '错峰小时内金额减半')
  assert.deepEqual(rows[0].costsByCurrency, { CNY: 2 })
  assert.deepEqual(rows[1].costsByCurrency, { CNY: 1 })
  assert.equal(rows[0].currency, 'CNY')
  assert.equal(rows[1].currency, 'CNY')
})

check('多币种：同一轮里 CNY / USD 两个模型各记各的，currency 为 null', () => {
  const rows = turnCostsOf(
    [
      sample(1, 1, 'deepseek-official/deepseek-flash', PEAK_HOUR, { inputTokens: 1_000_000 }),
      sample(1, 2, 'zai/glm-5.3', PEAK_HOUR, { inputTokens: 1_000_000 }),
    ],
    KNOWN_PROVIDERS,
    COST_MODE_OF,
  )
  assert.equal(rows.length, 1)
  const row = rows[0]
  assert.deepEqual(Object.keys(row.costsByCurrency), ['CNY', 'USD'], '两个币种各一个键')
  closeTo(row.costsByCurrency.CNY, 2, 'deepseek-flash：¥2 / MTok')
  closeTo(row.costsByCurrency.USD, 1.4, 'glm-5.3：$1.4 / MTok')
  closeTo(row.cost, 3.4, 'cost 仍按行相加（不换算汇率）')
  assert.equal(row.currency, null, '混币种时轮上不给单一币种')
})

check('无价目：未知模型 cost 为 null、未计价 tokens 等于展示口径、source 为 none', () => {
  const rows = turnCostsOf(
    [
      sample(1, 1, 'zzz-unknown/zzz-model', PEAK_HOUR, {
        inputTokens: 1000,
        outputTokens: 200,
        cacheReadTokens: 300,
        cacheWriteTokens: 400,
      }),
    ],
    KNOWN_PROVIDERS,
    COST_MODE_OF,
  )
  assert.equal(rows.length, 1)
  const row = rows[0]
  assert.equal(row.cost, null, '两层价目都没命中就不给金额')
  assert.equal(row.currency, null)
  assert.deepEqual(row.costsByCurrency, {})
  assert.equal(row.source, 'none')
  assert.equal(row.tokens, 1500, '展示口径 = 输入 1000 + 输出 200 + 缓存读 300')
  assert.equal(row.unpricedTokens, 1500, '未计价 tokens 与展示口径一致（缓存写不算展示口径）')
  assert.equal(row.partial, false)
})

check('messageIds 归并：同一轮多个样本带同一 message.id 时去重', () => {
  const rows = turnCostsOf(
    [
      sample(7, 1, 'deepseek-official/deepseek-flash', PEAK_HOUR, { inputTokens: 1000 }, { messageId: 'msg-a' }),
      sample(7, 1, 'deepseek-official/deepseek-flash', PEAK_HOUR, { inputTokens: 1000 }, { attempt: 1, messageId: 'msg-a' }),
      sample(7, 2, 'deepseek-official/deepseek-flash', PEAK_HOUR, { inputTokens: 1000 }, { messageId: 'msg-b' }),
      sample(7, 2, 'deepseek-official/deepseek-flash', PEAK_HOUR, { inputTokens: 1000 }, { attempt: 1 }),
    ],
    KNOWN_PROVIDERS,
    COST_MODE_OF,
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].calls, 4)
  assert.deepEqual(rows[0].messageIds, ['msg-a', 'msg-b'], '重复的 message.id 只留一份，没有 id 的样本不进列表')
})

check('没有轮次信息的样本（seq: 开头）不参与按轮计价', () => {
  const withoutTurn = {
    key: 'seq:3',
    day: MONDAY,
    hour: PEAK_HOUR,
    model: 'deepseek-official/deepseek-flash',
    messageId: null,
    buckets: makeBuckets({ inputTokens: 999_999 }),
  }
  const rows = turnCostsOf(
    [withoutTurn, sample(2, 1, 'deepseek-official/deepseek-flash', PEAK_HOUR, { inputTokens: 1000 })],
    KNOWN_PROVIDERS,
    COST_MODE_OF,
  )
  assert.equal(rows.length, 1, '只有带轮次的样本成行')
  assert.equal(rows[0].turn, 2)
  assert.equal(rows[0].tokens, 1000, '没有轮次的用量不被摊到任何一轮')
})

rmSync(home, { recursive: true, force: true })
console.log('turn-cost: ' + String(passed) + ' 项通过')
