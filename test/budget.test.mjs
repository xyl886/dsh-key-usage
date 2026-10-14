/**
 * 预算与告警离线测试：ok / near（80% 边界）/ over、阈值缺省与 0、多币种不换算、
 * 日与月同时配置取更严重者、除零，以及设置值取段（命名空间根对象 / volatile 引用）。
 * 运行：node test/budget.test.mjs（依赖 lib/budget.js，改 src 后要先 tsc -p tsconfig.server.json）
 */
import assert from 'node:assert/strict'
import { EMPTY_BUDGET, NEAR_PERCENT, evaluateBudget, normalizeBudget } from '../lib/budget.js'
import { normalizePricing, settingsSectionOf } from '../lib/pricing.js'

/** 造阈值，只写关心的字段。 */
function thresholds(overrides) {
  return { dailyTokens: 0, monthlyTokens: 0, monthlyCost: [], ...overrides }
}

/** 造读数，只写关心的字段。 */
function usage(overrides) {
  return { todayTokens: 0, monthTokens: 0, monthCostByCurrency: {}, ...overrides }
}

/** 取指定项（kind + 可选币种）；没有返回 null，便于断言「不启用时不该出现」。 */
function entryOf(evaluation, kind, currency) {
  return evaluation.entries.find((entry) => (
    entry.kind === kind && (currency === undefined || entry.currency === currency)
  )) ?? null
}

// ===== 1. 没配任何阈值：完全不启用（界面据此不渲染任何东西） =====
{
  const result = evaluateBudget(EMPTY_BUDGET, usage({ todayTokens: 9e9, monthTokens: 9e9, monthCostByCurrency: { CNY: 999 } }))
  assert.equal(result.enabled, false)
  assert.equal(result.level, 'ok')
  assert.deepEqual(result.entries, [])
}

// ===== 2. 阈值显式写 0 / 非法值 = 该项不启用（不是「上限 0」） =====
{
  const result = evaluateBudget(
    thresholds({ dailyTokens: 0, monthlyTokens: 0, monthlyCost: [{ currency: 'CNY', amount: 0 }] }),
    usage({ todayTokens: 1234, monthTokens: 5678, monthCostByCurrency: { CNY: 12 } }),
  )
  assert.equal(result.enabled, false)
  assert.deepEqual(result.entries, [])
}

// ===== 3. near 边界：79.9 仍是 ok，80.0 起算「接近」 =====
{
  const underLine = evaluateBudget(thresholds({ dailyTokens: 1000 }), usage({ todayTokens: 799 }))
  assert.equal(entryOf(underLine, 'dailyTokens').percent, 79.9)
  assert.equal(underLine.level, 'ok', '79.9% 不该报「接近上限」')

  const atLine = evaluateBudget(thresholds({ dailyTokens: 1000 }), usage({ todayTokens: 800 }))
  assert.equal(entryOf(atLine, 'dailyTokens').percent, 80)
  assert.equal(atLine.level, 'near', '80.0% 起算接近')
  assert.equal(NEAR_PERCENT, 80)

  const aboveLine = evaluateBudget(thresholds({ dailyTokens: 1000 }), usage({ todayTokens: 805 }))
  assert.equal(entryOf(aboveLine, 'dailyTokens').percent, 80.5)
  assert.equal(aboveLine.level, 'near')

  // 判定用的是**四舍五入到 1 位后**的百分数，与界面显示的数字必须一致
  const justUnder = evaluateBudget(thresholds({ dailyTokens: 10000 }), usage({ todayTokens: 7994 }))
  assert.equal(entryOf(justUnder, 'dailyTokens').percent, 79.9)
  assert.equal(justUnder.level, 'ok')
  const roundsUp = evaluateBudget(thresholds({ dailyTokens: 1000000 }), usage({ todayTokens: 799999 }))
  assert.equal(entryOf(roundsUp, 'dailyTokens').percent, 80, '79.9999% 四舍五入到 80.0 → 接近')
  assert.equal(roundsUp.level, 'near')
}

// ===== 4. over：超过上限，以及「刚好用满」 =====
{
  const exceeded = evaluateBudget(thresholds({ monthlyTokens: 1000 }), usage({ monthTokens: 1124 }))
  assert.equal(entryOf(exceeded, 'monthlyTokens').percent, 112.4, 'percent 不封顶，超了多少要看得出来')
  assert.equal(exceeded.level, 'over')

  const exactly = evaluateBudget(thresholds({ monthlyTokens: 1000 }), usage({ monthTokens: 1000 }))
  assert.equal(entryOf(exactly, 'monthlyTokens').percent, 100)
  assert.equal(exactly.level, 'over', '刚好用满即视为超限')
}

// ===== 5. 除零：limit 为 0 的项直接跳过，percent 始终是有限数 =====
{
  const result = evaluateBudget(
    thresholds({ dailyTokens: 0, monthlyTokens: 500, monthlyCost: [{ currency: 'USD', amount: 0 }] }),
    usage({ todayTokens: 100, monthTokens: 0 }),
  )
  assert.equal(entryOf(result, 'dailyTokens'), null, '0 上限不产生条目')
  assert.equal(entryOf(result, 'monthlyCost', 'USD'), null)
  assert.equal(result.entries.length, 1)
  assert.equal(entryOf(result, 'monthlyTokens').percent, 0)
  for (const entry of result.entries) assert.ok(Number.isFinite(entry.percent), 'percent 必须是有限数')
}

// ===== 6. 多币种：逐币种独立比较，不做汇率换算、不跨币种合计 =====
{
  const limits = [
    { currency: 'CNY', amount: 100 },
    { currency: 'USD', amount: 20 },
  ]
  const both = evaluateBudget(
    thresholds({ monthlyCost: limits }),
    usage({ monthCostByCurrency: { CNY: 150, USD: 5 } }),
  )
  assert.equal(both.entries.length, 2)
  assert.equal(entryOf(both, 'monthlyCost', 'CNY').percent, 150, 'CNY 只看 CNY 的花费')
  assert.equal(entryOf(both, 'monthlyCost', 'USD').percent, 25, 'USD 不会被 CNY 的金额影响')
  assert.equal(both.entries[0].currency, 'CNY', '条目顺序与配置顺序一致')
  assert.equal(both.level, 'over', '整体取最严重的那一项')

  // 本月没花这个币种：按 0 处理，不是缺项
  const idle = evaluateBudget(thresholds({ monthlyCost: limits }), usage({ monthCostByCurrency: { CNY: 10 } }))
  assert.equal(entryOf(idle, 'monthlyCost', 'USD').used, 0)
  assert.equal(entryOf(idle, 'monthlyCost', 'USD').percent, 0)
  assert.equal(idle.level, 'ok')

  // 不同币种各自达标互不掩盖：一个 ok 一个 near 时整体是 near
  const oneNear = evaluateBudget(
    thresholds({ monthlyCost: limits }),
    usage({ monthCostByCurrency: { CNY: 10, USD: 18 } }),
  )
  assert.equal(entryOf(oneNear, 'monthlyCost', 'CNY').percent, 10)
  assert.equal(entryOf(oneNear, 'monthlyCost', 'USD').percent, 90)
  assert.equal(oneNear.level, 'near')
}

// ===== 7. 日与月同时配置：取更严重者，不互相掩盖 =====
{
  const nearDaily = evaluateBudget(
    thresholds({ dailyTokens: 1000, monthlyTokens: 100000 }),
    usage({ todayTokens: 800, monthTokens: 10000 }),
  )
  assert.equal(entryOf(nearDaily, 'dailyTokens').percent, 80)
  assert.equal(entryOf(nearDaily, 'monthlyTokens').percent, 10)
  assert.equal(nearDaily.level, 'near', '日接近、月正常 → 报接近')

  const overMonthly = evaluateBudget(
    thresholds({ dailyTokens: 1000, monthlyTokens: 10000 }),
    usage({ todayTokens: 100, monthTokens: 12000 }),
  )
  assert.equal(entryOf(overMonthly, 'dailyTokens').percent, 10)
  assert.equal(overMonthly.level, 'over', '月超限、日正常 → 报超限')
}

// ===== 8. percent 保留 1 位小数 =====
{
  const result = evaluateBudget(thresholds({ monthlyTokens: 3 }), usage({ monthTokens: 1 }))
  assert.equal(entryOf(result, 'monthlyTokens').percent, 33.3)
}

// ===== 9. 设置值取段：命名空间根对象（宿主 describe / configForms 的实际形状） =====
{
  const rule = {
    provider: 'deepseek-official', model: 'deepseek-flash', unit: 'perMillionTokens', currency: 'CNY',
    input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8, note: '',
  }
  // 宿主给的是根对象 `{pricing, budget}`：读规则要取 `pricing`，读阈值要取 `budget`
  const namespaceRoot = { pricing: { version: 1, currency: 'CNY', rules: [rule] }, budget: { dailyTokens: 500 } }
  assert.equal(normalizePricing(namespaceRoot).rules.length, 1, '根对象里的规则要能读出来')
  assert.equal(normalizeBudget(namespaceRoot).dailyTokens, 500)
  // 直接传一段值（旧形状 / 单测直传）也必须照常工作
  assert.equal(normalizePricing(namespaceRoot.pricing).rules.length, 1)
  assert.equal(normalizeBudget(namespaceRoot.budget).dailyTokens, 500)
  // volatile 字段可能是 `{ get() }` 引用
  assert.equal(normalizeBudget({ get: () => namespaceRoot }).dailyTokens, 500)
  assert.deepEqual(settingsSectionOf(namespaceRoot, 'budget'), namespaceRoot.budget)
  assert.equal(settingsSectionOf(undefined, 'budget'), undefined)
}

// ===== 10. normalizeBudget：非法值一律折算成「不启用」，不猜数值 =====
{
  assert.deepEqual(normalizeBudget(undefined), EMPTY_BUDGET)
  assert.deepEqual(normalizeBudget('budget'), EMPTY_BUDGET)
  assert.deepEqual(normalizeBudget({ budget: null }), EMPTY_BUDGET)
  const messy = normalizeBudget({
    budget: {
      dailyTokens: -5,
      monthlyTokens: Number.NaN,
      monthlyCost: [
        { currency: 'CNY', amount: 12.5 },
        { currency: '  ', amount: 3 },
        { currency: 'USD', amount: 0 },
        { currency: 'JPY', amount: '10' },
        null,
        'CNY',
      ],
    },
  })
  assert.equal(messy.dailyTokens, 0, '负数 = 不启用')
  assert.equal(messy.monthlyTokens, 0, 'NaN = 不启用')
  assert.deepEqual(messy.monthlyCost, [{ currency: 'CNY', amount: 12.5 }], '空币种 / 0 金额 / 非对象条目全部丢弃')
}

console.log('budget.test: 全部通过')
