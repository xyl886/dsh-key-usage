/**
 * 显示币种与金额可比性测试（界面金额的唯一收口点 `src/client/core/currency.ts`）：
 * - 单币种行：可比金额就是它自己（展示币种相同，或汇率可用时已折算）；
 * - **混币种 + 没有汇率**：`comparableMoneyOf` 必须返回 null —— 界面文本如实显示 `¥611.55 · $11.63`，
 *   但拿「把美元当人民币相加」的 623.18 去算环比会得到一个没有意义的百分比（2026-10-16 实测踩到 +351.2%）；
 * - 混币种 + 有汇率：折算成展示币种后给数字，文本带 `≈`；
 * - 切展示币种后按新币种重新折算。
 *
 * 运行：node test/client-currency.test.mjs（Node ≥ 22.18 直接加载 .ts）
 */
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const url = pathToFileURL(new URL('../src/client/core/currency.ts', import.meta.url).pathname.replace(/^\//, '')).href
const { comparableMoneyOf, rowMoneyViewOf, setDisplayCurrency, setFxRate } = await import(url)

const fx = {
  base: 'USD',
  quote: 'CNY',
  rate: 6.702985,
  fetchedAt: '2026-10-16T23:50:48.063Z',
  source: 'cache',
  stale: false,
  upstream: null,
  note: null,
}

// 实测快照：近 30 天合计 `{ CNY: 611.55, USD: 11.63 }`，服务端顺手给的 `cost` 是混币种相加 623.18
const mixed = { cost: 623.18, costsByCurrency: { CNY: 611.55, USD: 11.63 } }

// ===== 1. 混币种 + 没有汇率：不给可比数字，文本如实分行 =====
{
  setDisplayCurrency('CNY')
  setFxRate(null)
  assert.equal(comparableMoneyOf(mixed), null, '混币种没汇率 → 不可比（否则会把 11.63 美元当 11.63 人民币加进去）')
  assert.equal(rowMoneyViewOf(mixed).text, '¥611.55 · $11.63', '文本按币种分行显示，不做任何猜测性折算')
  assert.equal(rowMoneyViewOf(mixed).converted, false)
}

// ===== 2. 有汇率：折成展示币种，文本带 ≈ =====
{
  setDisplayCurrency('CNY')
  setFxRate(fx)
  const comparable = comparableMoneyOf(mixed)
  assert.ok(comparable !== null, '有汇率 → 可比')
  assert.equal(Math.round(comparable * 100) / 100, 689.51, '611.55 + 11.63 × 6.702985 = 689.51')
  assert.equal(rowMoneyViewOf(mixed).text, '≈¥689.51', '折算过的金额必须带 ≈')
  assert.equal(rowMoneyViewOf(mixed).converted, true)
}

// ===== 3. 单币种行 =====
{
  setDisplayCurrency('CNY')
  setFxRate(fx)
  assert.equal(comparableMoneyOf({ cost: 611.55, costsByCurrency: { CNY: 611.55 } }), 611.55, '就是展示币种')
  const usdOnly = comparableMoneyOf({ cost: 11.63, costsByCurrency: { USD: 11.63 } })
  assert.equal(Math.round(usdOnly * 100) / 100, 77.96, '单币种美元：折算成展示币种后可比')
  setFxRate(null)
  assert.equal(comparableMoneyOf({ cost: 11.63, costsByCurrency: { USD: 11.63 } }), null, '没汇率就不给展示币种下的数字')
}

// ===== 4. 没有分币种小计的老数据：退回 `cost` 兜底 =====
{
  setDisplayCurrency('CNY')
  setFxRate(null)
  assert.equal(comparableMoneyOf({ cost: 138.13 }), 138.13, '没有 costsByCurrency 时按单值兜底')
  assert.equal(comparableMoneyOf({ cost: Number.NaN }), null, '非数字不给可比值')
}

// ===== 5. 切展示币种后按新币种折算 =====
{
  setDisplayCurrency('USD')
  setFxRate(fx)
  const comparable = comparableMoneyOf(mixed)
  assert.equal(Math.round(comparable * 100) / 100, 102.87, '611.55 / 6.702985 + 11.63 = 102.87')
  assert.equal(rowMoneyViewOf(mixed).text, '≈$102.87')
  setDisplayCurrency('CNY')
}

console.log('client-currency.test: 全部通过')
