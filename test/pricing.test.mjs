/**
 * 计费口径离线测试：单位换算 / 错峰 / 回落层级 / 覆盖度 / 按币种拆分，以及内置价目的回归基线。
 * 运行：node test/pricing.test.mjs（依赖 lib/pricing.js，改 src 后要先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SOURCE_RANK,
  alignMoneyWithCost,
  clockMinutes,
  costOfRowAtRates,
  costsByCurrencyOf,
  displayTokensOf,
  isOffPeakAt,
  isoDayOf,
  matchPricedRule,
  normalizeDays,
  offPeakTokenShare,
  priceRowsOf,
  ratesAt,
  rowCostsOf,
  settingsSectionOf,
  summarizeCoverage,
  sumMoneyByCurrency,
  unwrapSettingValue,
  weakestOf,
} from '../lib/pricing.js'
import {
  catalogCurrency,
  catalogEntries,
  catalogEntryCount,
  catalogFileInfo,
  catalogIssues,
  catalogProviderCurrency,
  catalogRuleFor,
  catalogRuleList,
  catalogSources,
  parseCatalogText,
} from '../lib/pricing-catalog.js'

/** 迁移基线：迁移前从 lib/pricing-catalog.js 导出的 18 条原样条目（字段、顺序、数字一字不差）。 */
const GOLDEN_CATALOG = JSON.parse(readFileSync(new URL('./fixtures/pricing-catalog.golden.json', import.meta.url), 'utf8'))

/**
 * 造一个本地日期：`atLocal(hours, minutes, day)` 里 day 用 ISO 编号（1=周一 … 7=周日）。
 * 2026-10-12 是周一，因此 day-1 就是当周的星期 day。
 */
function atLocal(hours, minutes = 0, day = 3) {
  return new Date(2026, 9, 12 + (day - 1), hours, minutes, 0)
}

/** 造一条价目，只写关心的字段（用于直接调纯函数；真实价目走 pricing-catalog）。 */
function rule(overrides) {
  return {
    provider: '*', model: '*', unit: 'perMillionTokens', currency: 'CNY',
    input: 0, cacheRead: 0, cacheWrite: 0, output: 0, offPeak: null, note: '',
    ...overrides,
  }
}

/** 金额比较：单价是十进制小数，浮点误差不该让测试变脆。 */
function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    (message ?? '金额不符') + '（实际 ' + String(actual) + '，期望 ' + String(expected) + '）',
  )
}

// ===== 1. 单位换算：按百万 / 按千 / 按次（价目层只按每百万 tokens 记录，单位分支由纯函数守） =====
{
  const row = {
    provider: 'p', model: 'm', calls: 3,
    inputTokens: 1_000_000, cacheReadTokens: 2_000_000, cacheWriteTokens: 100_000, outputTokens: 500_000,
  }
  const rates = { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8 }
  const manual = 1_000_000 * 2 + 2_000_000 * 0.2 + 100_000 * 2 + 500_000 * 8

  const perMillion = costOfRowAtRates(row, rule({ unit: 'perMillionTokens' }), rates)
  closeTo(perMillion, manual / 1e6, '按百万 tokens：金额 = Σ(tokens × 单价) ÷ 1e6')

  const perThousand = costOfRowAtRates(row, rule({ unit: 'perThousandTokens' }), rates)
  closeTo(perThousand, manual / 1e3, '按千 tokens：同一批 tokens 金额是「按百万」的 1000 倍')

  // 按次计费只用「输入」档当每次调用价，token 数不参与
  const perCall = costOfRowAtRates(row, rule({ unit: 'perCall' }), { input: 0.5, cacheRead: 9, cacheWrite: 9, output: 9 })
  closeTo(perCall, 1.5, '按次计费：calls × 输入档单价')
}

// ===== 2. 缓存省钱 = cacheReadTokens ×（未命中价 − 命中价） =====
{
  const row = { provider: 'p', model: 'm', calls: 1, cacheReadTokens: 2_000_000, inputTokens: 100_000, cacheWriteTokens: 0, outputTokens: 0 }
  const perMillionRule = rule({ provider: 'p', model: 'm', input: 2, cacheRead: 0.2 })
  const full = costOfRowAtRates(row, perMillionRule, { input: 2, cacheRead: 2, cacheWrite: 2, output: 2 })
  const cached = costOfRowAtRates(row, perMillionRule, { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 2 })
  closeTo(full - cached, 3.6, '省下的钱 = 命中 tokens ×（未命中价 − 命中价）')

  const perThousandRule = rule({ provider: 'p', model: 'm', unit: 'perThousandTokens', input: 2, cacheRead: 0.2 })
  const thousandFull = costOfRowAtRates(row, perThousandRule, { input: 2, cacheRead: 2, cacheWrite: 2, output: 2 })
  const thousandCached = costOfRowAtRates(row, perThousandRule, { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 2 })
  closeTo(thousandFull - thousandCached, 3600, '省钱公式同样按单位换算（按千是「按百万」的 1000 倍）')

  // 没有任何价目可命中 → 没有省钱数字
  assert.equal(priceRowsOf([row])[0].cacheSavings, 0)
}

// ===== 3. 成本来源强弱序：官方账单 > 内置价目 > 聚合价 > 均价 > 无 =====
{
  assert.deepEqual(SOURCE_RANK, { official: 0, catalog: 1, aggregate: 2, estimate: 3, none: 4 })
  assert.equal(weakestOf('official', 'catalog'), 'catalog')
  assert.equal(weakestOf('catalog', 'aggregate'), 'aggregate', '官方价目比聚合价可信')
  assert.equal(weakestOf('aggregate', 'estimate'), 'estimate')
  assert.equal(weakestOf('estimate', 'none'), 'none')
  assert.equal(weakestOf('none', 'official'), 'none', '已经最弱就不会被「拉强」')
}

// ===== 4. 错峰判定（按本地时间） =====
{
  const daytime = rule({
    provider: 'p', model: 'm', input: 2, cacheRead: 0.2,
    offPeak: { windows: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }], input: 1, cacheRead: 0.1, cacheWrite: 1, output: 4 },
  })
  assert.equal(isOffPeakAt(daytime, atLocal(9)), true, '窗口起点含在内')
  assert.equal(isOffPeakAt(daytime, atLocal(10, 30)), true)
  assert.equal(isOffPeakAt(daytime, atLocal(12)), false, '窗口终点不含在内')
  assert.equal(isOffPeakAt(daytime, atLocal(13)), false, '两段之间是峰时')
  assert.equal(isOffPeakAt(daytime, atLocal(15)), true, '第二个窗口')
  assert.equal(isOffPeakAt(daytime, atLocal(18)), false)
  assert.equal(isOffPeakAt(rule({ provider: 'p', model: 'm' }), atLocal(10)), false, '没有错峰段的价目永远不是错峰')

  const overnight = rule({ offPeak: { windows: [{ from: '22:00', to: '06:00' }], input: 1, cacheRead: 0, cacheWrite: 0, output: 1 } })
  assert.equal(isOffPeakAt(overnight, atLocal(23)), true, '跨午夜：22:00 之后算错峰')
  assert.equal(isOffPeakAt(overnight, atLocal(2)), true, '跨午夜：次日 06:00 之前算错峰')
  assert.equal(isOffPeakAt(overnight, atLocal(6)), false)
  assert.equal(isOffPeakAt(overnight, atLocal(12)), false)

  const allDay = rule({ offPeak: { windows: [{ from: '00:00', to: '00:00' }], input: 1, cacheRead: 0, cacheWrite: 0, output: 1 } })
  assert.equal(isOffPeakAt(allDay, atLocal(3)), true, '起止相同表示全天')
  assert.equal(isOffPeakAt(allDay, atLocal(23, 59)), true)

  const toMidnight = rule({ offPeak: { windows: [{ from: '18:00', to: '24:00' }], input: 1, cacheRead: 0, cacheWrite: 0, output: 1 } })
  assert.equal(isOffPeakAt(toMidnight, atLocal(18)), true)
  assert.equal(isOffPeakAt(toMidnight, atLocal(23)), true)
  assert.equal(isOffPeakAt(toMidnight, atLocal(17, 59)), false)
  assert.equal(isOffPeakAt(toMidnight, atLocal(0)), false, '24:00 是当天末尾，不跨到次日')

  // 无效窗口整段忽略，不会把整天判成错峰
  const broken = rule({ offPeak: { windows: [{ from: '25:00', to: '09:00' }], input: 1, cacheRead: 0, cacheWrite: 0, output: 1 } })
  assert.equal(isOffPeakAt(broken, atLocal(3)), false, '非法窗口不生效')
}

// ===== 5. 时钟解析 =====
assert.equal(clockMinutes('09:00'), 540)
assert.equal(clockMinutes('9:05'), 545)
assert.equal(clockMinutes('24:00'), 1440, '24:00 归一为一天末尾')
assert.equal(clockMinutes('23:59'), 1439)
assert.equal(clockMinutes('24:30'), null)
assert.equal(clockMinutes('25:00'), null)
assert.equal(clockMinutes('09:60'), null)
assert.equal(clockMinutes('9点'), null)
assert.equal(clockMinutes(900), null)

// ===== 6. 生效单价：给时间点才可能走错峰价 =====
{
  const peaky = rule({
    provider: 'p', model: 'm', input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8,
    offPeak: { windows: [{ from: '00:00', to: '08:00' }], input: 1, cacheRead: 0.1, cacheWrite: 1, output: 4 },
  })
  assert.equal(ratesAt(peaky, null).offPeak, false, '拿不到时间点就按标准价（不猜折扣）')
  assert.equal(ratesAt(peaky, null).rates.input, 2)
  const early = ratesAt(peaky, atLocal(3))
  assert.equal(early.offPeak, true)
  assert.equal(early.rates.input, 1)
  assert.equal(early.rates.output, 4)
}

// ===== 7. 错峰占比：给 24 小时槽就按占比加权 =====
{
  const ruleWithOffPeak = rule({
    provider: 'p', model: 'm', input: 2, cacheRead: 5, cacheWrite: 0, output: 0,
    offPeak: { windows: [{ from: '09:00', to: '12:00' }], input: 1, cacheRead: 5, cacheWrite: 0, output: 0 },
  })
  const hourRow = (inputTokens) => ({ provider: '', model: '', calls: 1, inputTokens, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })
  const hours = Array.from({ length: 24 }, (_, hour) => hourRow(hour >= 9 && hour < 12 ? 100 : hour === 13 ? 100 : 0))

  assert.equal(offPeakTokenShare(ruleWithOffPeak, hours), 0.75, '错峰 3 个小时各 100、峰时 1 个小时 100 → 占比 0.75')
  assert.equal(offPeakTokenShare(ruleWithOffPeak, null), 0, '没有小时数据时占比 0（按标准价）')
  assert.equal(offPeakTokenShare(rule({ offPeak: null }), hours), 0, '没有错峰段的价目占比恒为 0')

  // 占比与两档价一起决定金额：标准价 2、错峰价 1、占比 0.75 → 2×0.25 + 1×0.75 = 1.25
  const share = offPeakTokenShare(ruleWithOffPeak, hours)
  const blended = costOfRowAtRates({ provider: 'p', model: 'm', calls: 1, inputTokens: 1_000_000 }, ruleWithOffPeak, { input: 2, cacheRead: 5, cacheWrite: 0, output: 0 }) * (1 - share)
    + costOfRowAtRates({ provider: 'p', model: 'm', calls: 1, inputTokens: 1_000_000 }, ruleWithOffPeak, { input: 1, cacheRead: 5, cacheWrite: 0, output: 0 }) * share
  closeTo(blended, 1.25, '按错峰占比加权的成本 = 1.25')

  // 真实内置价目（DeepSeek flash）：24 个槽里有 tokens 的槽会命中「周末全天」窗口
  // —— 小时槽拿不到日期，带 days 的窗口按「每天适用」评估，这是有意近似（见 docs/01）
  const flashRowOnly = [{ provider: 'deepseek-official', model: 'deepseek-flash', calls: 1, inputTokens: 1_000_000 }]
  const allOffPeakHours = Array.from({ length: 24 }, (_unused, hour) => ({
    provider: 'deepseek-official', model: 'deepseek-flash', calls: 1,
    inputTokens: hour < 9 ? 1_000_000 : 0,
  }))
  const offPeakOnly = priceRowsOf(flashRowOnly, { hours: allOffPeakHours })[0]
  closeTo(offPeakOnly.cost, 1, '有小时槽时按错峰占比加权：tokens 全在错峰槽 → 整段按错峰价 ¥1')
  assert.equal(offPeakOnly.offPeak, true, '全部落在错峰 → 打「错峰中」角标')
  assert.equal(priceRowsOf(flashRowOnly, { hours: allOffPeakHours.map((slot) => ({ ...slot, inputTokens: 0 })) })[0].cost, 2, '没有 tokens 的槽不参与加权 → 按标准价')
}

// ===== 8. 两层回落：内置价目 → 台账反推均价 → 无 =====
{
  const rows = [
    { provider: 'deepseek-official', model: 'deepseek-flash', calls: 1, inputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
    { provider: 'zzz-unknown', model: 'zzz-model', calls: 1, tokens: 1_000_000, inputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
  ]
  // 用内置价目里一定不存在的通道，避免意外命中干扰「纯均价回落」的断言
  const average = (row) => (row.provider === 'zzz-unknown' ? { cost: 5, currency: 'CNY' } : null)

  const perRow = rowCostsOf(rows, average)
  assert.deepEqual(perRow.map((entry) => entry.source), ['catalog', 'estimate'])
  assert.deepEqual(perRow.map((entry) => entry.cost), [2, 5], '内置价目 2 元 + 均价 5 元')
  assert.deepEqual(perRow.map((entry) => entry.currency), ['CNY', 'CNY'], '每格都带自己的币种')

  const coverage = summarizeCoverage(rows, average)
  assert.equal(coverage.catalogModels, 1)
  assert.equal(coverage.averagedModels, 1)
  assert.equal(coverage.unpricedModels, 0)
  assert.deepEqual(coverage.costByCurrency, { CNY: 2 }, '只有命中价目的行进入价目口径金额')

  const missing = rowCostsOf([rows[1]], () => null)[0]
  assert.equal(missing.source, 'none', '既没价目也没均价 → 界面显示 —')
  assert.equal(missing.cost, null)
  assert.equal(missing.currency, null)
}

// ===== 9. 汇总口径：省钱按命中行统计、金额按币种分组 =====
{
  const rows = [
    { provider: 'deepseek-official', model: 'deepseek-flash', calls: 1, inputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0, outputTokens: 0 },
    { provider: 'zai', model: 'glm-5.3', calls: 1, inputTokens: 0, cacheReadTokens: 1_000_000, cacheWriteTokens: 0, outputTokens: 0 },
    { provider: 'zzz-unknown', model: 'zzz-model', calls: 1, inputTokens: 1_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
  ]
  const coverage = summarizeCoverage(rows, (row) => (row.provider === 'zzz-unknown' ? { cost: 1, currency: 'CNY' } : null))
  assert.equal(coverage.catalogModels, 2, '两个模型命中内置官方价目')
  assert.equal(coverage.aggregateModels, 0)
  assert.equal(coverage.averagedModels, 1, 'zzz-model 由台账均价兜底')
  assert.equal(coverage.unpricedModels, 0)
  assert.deepEqual(Object.keys(coverage.costByCurrency).sort(), ['CNY', 'USD'], '跨币种分组，不合计')
  // DeepSeek：未命中 1M × ¥2 + 命中 1M × ¥0.04 = ¥2.04；Z.ai：命中 1M × $0.26
  closeTo(coverage.costByCurrency.CNY, 2.04, 'CNY：未命中 1M×2 + 命中 1M×0.04')
  closeTo(coverage.costByCurrency.USD, 0.26, 'USD：命中 1M×0.26')
  closeTo(coverage.savingsByCurrency.CNY, 1.96, 'CNY 省：1M×(2−0.04)')
  closeTo(coverage.savingsByCurrency.USD, 1.14, 'USD 省：1M×(1.4−0.26)')
  assert.equal(coverage.savingsDetail.length, 2)
  assert.equal(coverage.savingsDetail[0].model, 'deepseek-flash', '按省钱金额降序')
  assert.equal(coverage.savingsDetail[0].currency, 'CNY')

  const unpriced = summarizeCoverage([rows[2]], () => null)
  assert.equal(unpriced.unpricedModels, 1, '价目与均价都没有 → 无依据')
  assert.deepEqual(unpriced.savingsDetail, [])
}

// ===== 10. 金额按币种拆分（折算的服务端支撑） =====
{
  const money = costsByCurrencyOf([
    { cost: 1.5, currency: 'CNY' },
    { cost: 0.2, currency: 'USD' },
    { cost: 2, currency: 'CNY' },
    { cost: null, currency: 'CNY' },
    { cost: 9, currency: null },
  ])
  assert.deepEqual(money, { CNY: 3.5, USD: 0.2 }, '同币种相加（保留两位）、跨币种不合计；无金额 / 无币种的格子跳过')
  assert.deepEqual(costsByCurrencyOf([]), {})
  assert.deepEqual(costsByCurrencyOf([{ cost: 0, currency: 'CNY' }]), { CNY: 0 }, '0 元也是有依据的金额')

  const summed = sumMoneyByCurrency([{ CNY: 1 }, { USD: 2 }, { CNY: 3 }, {}])
  assert.deepEqual(summed, { CNY: 4, USD: 2 })

  // 单币种时严格取父金额：两者本就是同一个和，这里只抹掉累加顺序带来的浮点尾差
  const aligned = alignMoneyWithCost({ CNY: 0.1 + 0.2 }, 0.3)
  assert.equal(aligned.CNY, 0.3, '单币种时拆分值与 cost 完全相同')
  const mixed = alignMoneyWithCost({ CNY: 30, USD: 0.2 }, 30.2)
  assert.deepEqual(mixed, { CNY: 30, USD: 0.2 }, '多币种不做任何对齐')
  assert.deepEqual(alignMoneyWithCost({}, 0), {}, '没有金额时不凭空造一个币种')
  assert.deepEqual(alignMoneyWithCost({ CNY: 5 }, null), { CNY: 5 })

  // 展示口径 tokens：输入 + 输出 + 缓存读（不含 cacheWrite）
  assert.equal(displayTokensOf({ provider: 'p', model: 'm', tokens: 7, inputTokens: 100 }), 7, '有展示口径 tokens 时优先用它')
  assert.equal(displayTokensOf({ provider: 'p', model: 'm', inputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 }), 6, '否则用输入 + 输出 + 缓存读')
}

// ===== 11. 旧版设置值的防御式读取（链路已退役，读法保留） =====
{
  assert.equal(unwrapSettingValue({ get: () => 42 }), 42, 'volatile 引用要 unwrap 后再读')
  assert.equal(unwrapSettingValue(42), 42)
  assert.deepEqual(settingsSectionOf({ pricing: { currency: 'USD' } }, 'pricing'), { currency: 'USD' }, '命名空间根对象里取那一段')
  assert.equal(settingsSectionOf(42, 'pricing'), 42, '非对象原样返回')
  assert.deepEqual(settingsSectionOf({ currency: 'CNY' }, 'pricing'), { currency: 'CNY' }, '没有命名空间键时用整份值')
}

// ===== 12. 内置价目下发给界面：结构与官方数值 =====
{
  const rules = catalogRuleList()
  assert.equal(rules.length, catalogEntryCount(), '逐条规则与条数一致')
  for (const rule of rules) {
    assert.equal(rule.note, '', '长 note 不下发：来源与抓取日期由 catalogSources() 给')
    assert.ok(rule.unit === 'perMillionTokens', '内置价目统一按每百万 tokens 记录')
  }

  const flash = rules.find((rule) => rule.provider === 'deepseek-official' && rule.model === 'deepseek-flash')
  assert.equal(flash.currency, 'CNY', 'DeepSeek 取中文文档的 CNY 价')
  assert.deepEqual([flash.input, flash.cacheRead, flash.cacheWrite, flash.output], [2, 0.04, 2, 8], 'Flash 高峰价 ¥2 / ¥0.04 / ¥2 / ¥8')
  assert.equal(flash.offPeak.input, flash.input / 2, 'DeepSeek 错峰 = 高峰半价（输入）')
  assert.equal(flash.offPeak.output, flash.output / 2, 'DeepSeek 错峰 = 高峰半价（输出）')
  assert.equal(flash.offPeak.windows.length, 4, '工作日三段 + 周末全天一段')
  assert.deepEqual(
    flash.offPeak.windows.map((window) => window.days),
    [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [6, 7]],
    '每段窗口都限定星期',
  )
  assert.equal(flash.offPeak.windows[2].to, '00:00', '工作日最后一段跨午夜到 00:00')

  const k3 = rules.find((rule) => rule.model === 'kimi-k3')
  assert.deepEqual([k3.input, k3.cacheRead, k3.cacheWrite, k3.output], [20, 2, 20, 100], 'Kimi K3：¥20 / ¥2 / ¥20 / ¥100')
  assert.equal(k3.currency, 'CNY')

  const glm53 = rules.find((rule) => rule.model === 'glm-5.3')
  assert.deepEqual([glm53.input, glm53.cacheRead, glm53.output], [1.4, 0.26, 4.4], 'GLM-5.3：$1.4 / $0.26 / $4.4')
  const glmFlash = rules.find((rule) => rule.model === 'glm-5.3-flash')
  assert.deepEqual([glmFlash.input, glmFlash.cacheRead, glmFlash.output], [0.15, 0.03, 0.50], 'GLM-5.3-Flash：$0.15 / $0.03 / $0.50')

  // 基准币种与「按通道推断台账币种」：通道没收录就返回 null（不猜）
  assert.equal(catalogCurrency(), 'CNY', '基准币种 = 第一条价目的币种')
  assert.equal(catalogProviderCurrency('deepseek-official'), 'CNY')
  assert.equal(catalogProviderCurrency('moonshotai'), 'CNY')
  assert.equal(catalogProviderCurrency('zai'), 'USD')
  assert.equal(catalogProviderCurrency('openrouter'), 'USD')
  assert.equal(catalogProviderCurrency('opencode-go'), null, '没有收录该通道 → null')
  assert.equal(catalogProviderCurrency(''), null)
}

// ===== 13. 内置官方价目自动生效：价目 > 台账均价 =====
{
  // DeepSeek flash 高峰价：未命中 ¥2 / 命中 ¥0.04 / 输出 ¥8（CNY / 百万 tokens）
  const flashRow = {
    provider: 'deepseek-official', model: 'deepseek-flash', calls: 1,
    inputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0,
  }

  const byCatalog = rowCostsOf([flashRow], () => null)[0]
  assert.equal(byCatalog.source, 'catalog', '内置价目自动生效，标「官方价」')
  assert.equal(byCatalog.cost, 2, 'deepseek-flash 未命中 1M tokens = ¥2.00')
  assert.equal(byCatalog.rule.currency, 'CNY', 'DeepSeek 取中文文档的 CNY 价，不做汇率换算')
  assert.equal(byCatalog.rule.provider, 'deepseek-official')
  assert.equal(byCatalog.currency, 'CNY')

  // 内置价目 > 台账反推均价：命中内置时不去问均价
  let askedAverage = false
  const priced = rowCostsOf([flashRow], () => { askedAverage = true; return { cost: 123, currency: 'CNY' } })[0]
  assert.equal(priced.source, 'catalog')
  assert.equal(priced.cost, 2)
  assert.equal(askedAverage, false, '命中内置价目后不再回落台账均价')

  // 内置价目也不认识时，才轮到台账均价
  const unknown = { provider: 'nope', model: 'nothing', calls: 1, inputTokens: 1_000_000 }
  const fallback = rowCostsOf([unknown], () => ({ cost: 42, currency: 'CNY' }))[0]
  assert.equal(fallback.source, 'estimate', '内置没命中才回落台账均价')
  assert.equal(fallback.cost, 42)

  // 两层同时在场：逐层计数各算各的（宁可标弱，也不冒称精确）
  const both = summarizeCoverage([flashRow, unknown], (row) => (row.provider === 'nope' ? { cost: 42, currency: 'CNY' } : null))
  assert.equal(both.catalogModels, 1, '内置价目命中的模型数')
  assert.equal(both.averagedModels, 1, '回落均价的模型数')
  closeTo(both.costByCurrency.CNY, 2, '价目口径金额只算命中价目的行')

  // 缓存省钱按内置价目算：命中价比未命中价低的差价
  const cached = rowCostsOf(
    [{ ...flashRow, inputTokens: 0, cacheReadTokens: 1_000_000 }],
    () => null,
  )[0]
  assert.equal(cached.source, 'catalog')
  closeTo(cached.cacheSavings, 2 - 0.04, '缓存省钱 = 命中 tokens ×（未命中价 − 命中价）')
  assert.equal(cached.partial, false, '内置价目不存在「部分收录」')
}

// ===== 14. 模型 id 匹配保守：精确 → 忽略大小写 → 去 vendor/ 前缀；不做模糊匹配 =====
{
  const row = (provider, model) => ({ provider, model, calls: 1, inputTokens: 1_000_000 })

  assert.equal(rowCostsOf([row('deepseek-official', 'deepseek-flash')], () => null)[0].source, 'catalog', '精确匹配')
  assert.equal(rowCostsOf([row('deepseek-official', 'DeepSeek-Flash')], () => null)[0].source, 'catalog', '忽略大小写')
  assert.equal(rowCostsOf([row('DEEPSEEK-OFFICIAL', 'deepseek-flash')], () => null)[0].source, 'catalog', '通道也忽略大小写')
  // 这是「台账 / 事件里的模型名带 vendor 前缀」的常见形态：通道 `deepseek` 不在内置价目的通道里，
  // 因此即便模型名去掉前缀能对上，也不该按别的通道的价格计费
  assert.equal(rowCostsOf([row('deepseek', 'deepseek/deepseek-v4.1-flash')], () => null)[0].source, 'none', '去前缀后仍要通道也对得上才算命中（否则显示 —）')
  assert.equal(rowCostsOf([row('deepseek', 'deepseek/deepseek-v4.1-flash')], () => ({ cost: 9, currency: 'CNY' }))[0].source, 'estimate', '该行回落台账均价而不是内置价目')
  assert.equal(
    rowCostsOf([row('openrouter', 'deepseek/deepseek-v4.1-flash')], () => null)[0].source,
    'catalog',
    '去 vendor/ 前缀 + 忽略大小写后可命中 OpenRouter 中转价',
  )
  assert.equal(
    rowCostsOf([row('openrouter', 'DEEPSEEK/DeepSeek-V4.1-Flash')], () => null)[0].source,
    'catalog',
    '前缀与大小写同时不同也能命中',
  )

  // 保守：不做模糊 / 近似匹配，宁可继续显示「估算」
  for (const nearMiss of ['deepseek-flash-2', 'deepseekflash', 'xdeepseek-flash', 'deepseek-v4-flash-exp']) {
    const priced = rowCostsOf([row('deepseek-official', nearMiss)], () => ({ cost: 9, currency: 'CNY' }))[0]
    assert.equal(priced.source, 'estimate', '不做模糊匹配：' + nearMiss + ' 应回落均价')
  }
  // 只做首尾空白裁剪（不算模糊匹配）
  assert.equal(
    rowCostsOf([row('deepseek-official', '  deepseek-flash  ')], () => null)[0].source,
    'catalog',
    '首尾空白被裁剪后命中',
  )
  // 内置价目未收录的模型同样回落，不拿同类顶替
  assert.equal(
    rowCostsOf([row('deepseek-official', 'deepseek-v5-unknown')], () => ({ cost: 9, currency: 'CNY' }))[0].source,
    'estimate',
    '文档没收录的型号不用同类模型顶替',
  )
  // 未收录的通道也不会被通配兜底（只有文档给出通道统一价时才会写通配）
  assert.equal(rowCostsOf([row('opencode-go', 'deepseek-flash')], () => ({ cost: 9, currency: 'CNY' }))[0].source, 'estimate', '未覆盖通道回落均价')
  assert.equal(rowCostsOf([row('sensenova', 'any-model')], () => null)[0].source, 'none', '免费额度通道无价目 → 显示 —')

  // matchPricedRule 是唯一的匹配入口：两层都查不到时返回 null
  assert.equal(matchPricedRule('deepseek-official', 'deepseek-flash').source, 'catalog')
  assert.equal(matchPricedRule('zzz-unknown', 'zzz-model'), null)
}

// ===== 15. 错峰窗口命中（含跨午夜、按星期限定）与币种不换算 =====
{
  const flashRule = catalogRuleFor('deepseek-official', 'deepseek-flash')
  assert.notEqual(flashRule, null, 'deepseek-flash 内置价目存在')
  assert.notEqual(flashRule.offPeak, null, 'deepseek-flash 带错峰价')

  // 内置错峰窗口按**本地时间**写，工作日三段 + 周末全天一段；判定点取周三（工作日）
  const offPeakHit = (hours, minutes = 0, day = 3) => isOffPeakAt(flashRule, atLocal(hours, minutes, day))

  assert.equal(offPeakHit(2), true, '凌晨 02:00 落在错峰窗口')
  assert.equal(offPeakHit(0), true, '00:00 是错峰窗口起点（含左端）')
  assert.equal(offPeakHit(8, 59), true, '08:59 仍在错峰窗口内')
  assert.equal(offPeakHit(12, 30), true, '12:30 落在第二个错峰窗口')
  assert.equal(offPeakHit(23, 59), true, '23:59 落在第三个错峰窗口（到 00:00）')

  assert.equal(offPeakHit(9), false, '09:00 是错峰窗口终点（不含右端）→ 官方高峰')
  assert.equal(offPeakHit(10), false, '10:00 是官方高峰时段')
  assert.equal(offPeakHit(14), false, '14:00 是官方高峰时段')
  assert.equal(offPeakHit(17, 59), false, '17:59 仍是官方高峰')
  assert.equal(offPeakHit(18), true, '18:00 是错峰窗口起点（含左端）')

  // 星期维度：工作日窗口只在周一至周五生效，周末窗口只在周六日生效
  assert.equal(offPeakHit(9, 0, 1), false, '周一 09:00 命中高峰（工作日窗口不覆盖）')
  assert.equal(offPeakHit(9, 0, 5), false, '周五 09:00 同样是高峰')
  assert.equal(offPeakHit(9, 0, 6), true, '周六 09:00 落在周末全天窗口 → 空闲')
  assert.equal(offPeakHit(9, 0, 7), true, '周日 09:00 命中周末窗口')
  assert.equal(offPeakHit(14, 0, 6), true, '周六 14:00 也是空闲（官方周末全天 off-peak）')
  assert.equal(offPeakHit(10, 30, 7), true, '周日全天都命中周末窗口')

  // 跨午夜窗口 + days：[18:00–00:00] 仅工作日 → 周五 23:00 命中、周六 23:00 不命中
  assert.equal(offPeakHit(23, 0, 5), true, '周五 23:00 命中工作日的跨午夜窗口')
  assert.equal(offPeakHit(23, 0, 6), true, '周六 23:00 由周末全天窗口覆盖（不是跨午夜窗口）')
  // 用一条只给工作日跨午夜窗口的价目验证「不命中」
  const weekdayOvernight = rule({
    offPeak: { windows: [{ from: '18:00', to: '00:00', days: [1, 2, 3, 4, 5] }], input: 1, cacheRead: 0, cacheWrite: 0, output: 4 },
  })
  assert.equal(isOffPeakAt(weekdayOvernight, atLocal(23, 0, 5)), true, '仅工作日的 18:00–00:00：周五 23:00 命中')
  assert.equal(isOffPeakAt(weekdayOvernight, atLocal(23, 0, 6)), false, '仅工作日的 18:00–00:00：周六 23:00 不命中')
  assert.equal(isOffPeakAt(weekdayOvernight, atLocal(23, 0, 7)), false, '仅工作日的 18:00–00:00：周日 23:00 不命中')
  assert.equal(isOffPeakAt(weekdayOvernight, atLocal(19, 0, 1)), true, '周一 19:00 命中')

  // from === to（全天）+ days: [6,7]：周六凌晨 / 中午 / 深夜都命中
  const weekendAllDay = rule({
    offPeak: { windows: [{ from: '00:00', to: '00:00', days: [6, 7] }], input: 1, cacheRead: 0, cacheWrite: 0, output: 4 },
  })
  assert.equal(isOffPeakAt(weekendAllDay, atLocal(0, 0, 6)), true, '周六 00:00（凌晨）命中全天窗口')
  assert.equal(isOffPeakAt(weekendAllDay, atLocal(12, 0, 6)), true, '周六中午命中')
  assert.equal(isOffPeakAt(weekendAllDay, atLocal(23, 59, 6)), true, '周六深夜命中')
  assert.equal(isOffPeakAt(weekendAllDay, atLocal(12, 0, 7)), true, '周日中午命中')
  assert.equal(isOffPeakAt(weekendAllDay, atLocal(12, 0, 1)), false, '周一中午不命中（只在周末生效）')
  assert.equal(isOffPeakAt(weekendAllDay, atLocal(12, 0, 5)), false, '周五中午不命中')

  // 错峰价本身：半价
  assert.deepEqual(
    [flashRule.offPeak.input, flashRule.offPeak.cacheRead, flashRule.offPeak.cacheWrite, flashRule.offPeak.output],
    [1, 0.02, 1, 4],
    'deepseek-flash 错峰价 = 高峰半价',
  )

  // 真实内置价目在拿不到小时分布时按高峰价算（保守，不猜折扣）
  const flashRowOnly = [{ provider: 'deepseek-official', model: 'deepseek-flash', calls: 1, inputTokens: 1_000_000 }]
  const noHours = priceRowsOf(flashRowOnly, { at: atLocal(3, 0, 6) })[0]
  closeTo(noHours.cost, 2, '拿不到 hours 时即使处在周六凌晨也按高峰价（有意保守）')
  assert.equal(noHours.offPeak, false)

  // 跨午夜窗口：用一条自定义价目验证 from > to 的判定
  const overnight = rule({
    provider: 'p', model: 'm', input: 10,
    offPeak: { windows: [{ from: '22:00', to: '06:00' }], input: 5, cacheRead: 0, cacheWrite: 0, output: 0 },
  })
  assert.equal(isOffPeakAt(overnight, atLocal(23, 0, 1)), true, '跨午夜窗口 22:00–06:00：23:00 命中')
  assert.equal(isOffPeakAt(overnight, atLocal(3, 0, 4)), true, '跨午夜窗口：03:00 命中')
  assert.equal(isOffPeakAt(overnight, atLocal(12, 0, 2)), false, '跨午夜窗口：12:00 不命中')
  assert.equal(isOffPeakAt(overnight, atLocal(6, 0, 3)), false, '跨午夜窗口：06:00 是终点（不含）')
  assert.equal(isOffPeakAt(overnight, atLocal(21, 59, 5)), false, '跨午夜窗口：21:59 不命中')

  // 币种：内置价目按文档原样记，不同通道的币种互不换算
  const flash = rowCostsOf(
    [{ provider: 'deepseek-official', model: 'deepseek-flash', calls: 1, inputTokens: 1_000_000 }],
    () => null,
  )[0]
  assert.equal(flash.rule.currency, 'CNY', 'DeepSeek 取中文文档的 CNY 价')
  const kimi = rowCostsOf([{ provider: 'moonshotai', model: 'kimi-k3', calls: 1, inputTokens: 1_000_000 }], () => null)[0]
  assert.equal(kimi.rule.currency, 'CNY', 'Kimi 文档以 CNY 计价')
  assert.equal(kimi.cost, 20, 'Kimi K3 未命中 ¥20 / MTok')
  assert.equal(flash.cost, 2, 'DeepSeek flash ¥2.00 / MTok —— 两者不做任何汇率换算')

  // z.ai 是 USD：跨币种不合计的口径不能被这轮改动破坏
  const zai = rowCostsOf([{ provider: 'zai', model: 'glm-5.3', calls: 1, inputTokens: 1_000_000 }], () => null)[0]
  assert.equal(zai.rule.currency, 'USD', 'Z.ai 文档只有 USD 价，保持不动')
  assert.equal(zai.cost, 1.4)
  assert.equal(zai.currency, 'USD', '每格都带自己的币种')

  // 覆盖度按币种分组累加，跨币种不合计
  const coverage = summarizeCoverage(
    [
      { provider: 'deepseek-official', model: 'deepseek-flash', calls: 1, inputTokens: 1_000_000 },
      { provider: 'moonshotai', model: 'kimi-k3', calls: 1, inputTokens: 1_000_000 },
      { provider: 'zai', model: 'glm-5.3', calls: 1, inputTokens: 1_000_000 },
    ],
    () => null,
  )
  assert.deepEqual(coverage.costByCurrency, { CNY: 22, USD: 1.4 }, '金额按币种分组，不跨币种合计')
  assert.equal(coverage.catalogModels, 3, '三个模型都由内置价目覆盖')
  assert.equal(coverage.averagedModels, 0)
  assert.equal(coverage.unpricedModels, 0)
  assert.equal(coverage.aggregateModels, 0)
}

// ===== 15b. `days` 语义：缺省 = 每天、三选一映射、非法值容错 =====
{
  // 缺省的价目（字段根本不存在）必须与升级前逐点一致
  const legacy = rule({
    provider: 'p', model: 'm', input: 2,
    offPeak: { windows: [{ from: '00:00', to: '09:00' }, { from: '12:00', to: '14:00' }, { from: '18:00', to: '24:00' }], input: 1, cacheRead: 0, cacheWrite: 1, output: 4 },
  })
  for (let day = 1; day <= 7; day += 1) {
    for (const hour of [2, 9, 10, 13, 14, 17, 19, 23]) {
      const expected = (hour >= 0 && hour < 9) || (hour >= 12 && hour < 14) || (hour >= 18 && hour < 24)
      assert.equal(
        isOffPeakAt(legacy, atLocal(hour, 0, day)),
        expected,
        '缺省 days = 每天：星期 ' + String(day) + ' ' + String(hour) + ':00 判定与升级前一致',
      )
    }
  }

  // 显式 [1..7] 与缺省等价（引擎层面）
  const explicitAll = rule({ offPeak: { windows: [{ from: '09:00', to: '12:00', days: [1, 2, 3, 4, 5, 6, 7] }], input: 1, cacheRead: 0, cacheWrite: 0, output: 1 } })
  for (let day = 1; day <= 7; day += 1) {
    assert.equal(isOffPeakAt(explicitAll, atLocal(10, 0, day)), true, '[1..7] 等于每天（星期 ' + String(day) + '）')
  }

  // 非法 days 的容错：一律当「每天适用」，不整段作废（否则金额会突然变高）
  const brokenVariants = [[], [0], [8], ['1'], [null], [1.5], 'oops', 3, {}, [NaN], [undefined]]
  for (const days of brokenVariants) {
    const broken = rule({
      offPeak: { windows: [{ from: '09:00', to: '12:00', days }], input: 1, cacheRead: 0, cacheWrite: 0, output: 1 },
    })
    for (let day = 1; day <= 7; day += 1) {
      assert.equal(
        isOffPeakAt(broken, atLocal(10, 0, day)),
        true,
        '非法 days ' + JSON.stringify(days) + ' 视为缺省（每天适用），星期 ' + String(day),
      )
    }
    assert.equal(isOffPeakAt(broken, atLocal(13, 0, 3)), false, '容错不会把窗口之外的时段也算成错峰')
  }

  // 部分合法 + 部分非法：合法值保留，非法值丢掉（不会因为一个坏值把整组作废）
  const partial = rule({ offPeak: { windows: [{ from: '09:00', to: '12:00', days: [2, 9, 2, 'x'] }], input: 1, cacheRead: 0, cacheWrite: 0, output: 1 } })
  assert.equal(isOffPeakAt(partial, atLocal(10, 0, 2)), true, '合法项（周二）保留')
  assert.equal(isOffPeakAt(partial, atLocal(10, 0, 3)), false, '非法项不会意外放行其他星期')
  assert.equal(isOffPeakAt(partial, atLocal(10, 0, 1)), false, '周一不在 [2] 里')

  // 空数组整体非法 → 每天（而不是「哪个星期都不生效」）
  const emptyDays = rule({ offPeak: { windows: [{ from: '09:00', to: '12:00', days: [] }], input: 1, cacheRead: 0, cacheWrite: 0, output: 1 } })
  assert.equal(isOffPeakAt(emptyDays, atLocal(10, 0, 6)), true, 'days: [] 是缺省语义（每天），不是「永不生效」')

  // 归一化：resolve 到 Windows 的 0=周日 也要正确映射成 ISO 7
  assert.equal(isoDayOf(new Date(2026, 9, 12)), 1, '2026-10-12 是周一')
  assert.equal(isoDayOf(new Date(2026, 9, 17)), 6, '2026-10-17 是周六')
  assert.equal(isoDayOf(new Date(2026, 9, 18)), 7, '2026-10-18 是周日')

  // normalizeDays：去重 + 排序 + 过滤非法值
  assert.deepEqual(normalizeDays([3, 1, 3, 7, 0, 8, 2.5, '3']), [1, 3, 7], '去重排序并丢弃非法值')
  assert.equal(normalizeDays([]), undefined, '空数组 → 缺省（每天）')
  assert.equal(normalizeDays(undefined), undefined, '缺省 → 每天')
  assert.equal(normalizeDays('1,2'), undefined, '非数组 → 每天')
}

// ===== 16. 没有价目可命中时，行为与升级前完全一致 =====
{
  // 只用内置价目**完全没收录**的通道 / 模型，验证老口径没被改动
  const rows = [
    { provider: 'zzz-unknown', model: 'zzz-model', calls: 1, inputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
  ]
  const average = () => ({ cost: 5, currency: 'CNY' })

  const byAverage = rowCostsOf(rows, average)[0]
  assert.equal(byAverage.source, 'estimate')
  assert.equal(byAverage.cost, 5)
  assert.equal(byAverage.currency, 'CNY', '回落均价的行带调用方给的台账币种')
  assert.equal(byAverage.rule, null, '均价回落的行不带价目对象')
  assert.equal(byAverage.cacheSavings, 0)

  const summary = summarizeCoverage(rows, average)
  assert.equal(summary.averagedModels, 1)
  assert.equal(summary.catalogModels, 0)
  assert.equal(summary.aggregateModels, 0)
  assert.deepEqual(summary.costByCurrency, {}, '均价没有单价表，不进价目口径的金额')

  const noneSummary = summarizeCoverage(rows, () => null)
  assert.equal(noneSummary.unpricedModels, 1, '无均价、无价目 → 无依据')

  const noneRow = rowCostsOf(rows, () => null)[0]
  assert.equal(noneRow.cost, null, '既没价目也没均价 → 界面显示 —')
  assert.equal(noneRow.source, 'none')
  assert.equal(noneRow.currency, null)

  // 空用量：与升级前一致
  const emptySummary = summarizeCoverage([], () => null)
  assert.deepEqual(emptySummary.costByCurrency, {})
  assert.deepEqual(emptySummary.savingsDetail, [])
  assert.equal(emptySummary.unpricedModels, 0)
  assert.equal(emptySummary.catalogModels, 0)
}

// ===== 17. 价目数据本身的自检：来源、抓取日期、单位、缺档不用同类顶替 =====
{
  const entries = catalogEntries()
  assert.ok(entries.length > 0, '内置价目非空')

  // 迁移回归基线：YAML 读出来的 18 条与迁移前 lib 导出的条目**逐字段深度相等**（含顺序）
  assert.deepEqual(entries, GOLDEN_CATALOG, 'pricing-catalog.yml 必须与迁移基线 test/fixtures/pricing-catalog.golden.json 完全一致')

  // 迁移过来的文件本身必须是干净的：一条 issue 都不能有，且文件真的在包根
  assert.deepEqual(catalogIssues(), [], '内置价目文件不该有任何解析 issue')
  const catalogFile = catalogFileInfo()
  assert.equal(catalogFile.exists, true, 'pricing-catalog.yml 必须随包发布（package.json files 已包含）')
  assert.ok(/pricing-catalog\.yml$/.test(catalogFile.path), '价目文件路径：' + catalogFile.path)
  assert.equal(catalogFile.entries, entries.length)

  const seen = new Set()
  for (const entry of entries) {
    const key = entry.provider + '|' + entry.model
    assert.ok(!seen.has(key), '内置价目不得重复：' + key)
    seen.add(key)
    assert.ok(/^https:\/\//.test(entry.source), key + ' 必须带精确来源 URL')
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(entry.fetchedAt), key + ' 必须带抓取日期')
    assert.equal(entry.unit, 'perMillionTokens', key + ' 官方文档都是每百万 tokens 口径')
    assert.ok(['USD', 'CNY'].includes(entry.currency), key + ' 币种只允许文档原样值')
    assert.ok(entry.note.trim() !== '', key + ' 必须有口径说明')
    // 至少要有未命中输入价与输出价，否则这条价目没有意义
    assert.equal(typeof entry.input, 'number', key + ' 必须有未命中输入价')
    assert.equal(typeof entry.output, 'number', key + ' 必须有输出价')
    for (const field of ['input', 'cacheRead', 'cacheWrite', 'output']) {
      if (entry[field] === undefined) continue
      assert.ok(Number.isFinite(entry[field]) && entry[field] >= 0, key + '.' + field + ' 必须是非负有限数')
    }
    if (entry.cacheRead !== undefined) assert.ok(entry.cacheRead <= entry.input, key + ' 缓存命中价不应高于未命中价')
    // 错峰：有价就必须有窗口，窗口能被时钟解析器接受
    if (entry.offPeak !== undefined) {
      assert.ok(entry.offPeak.windows.length > 0, key + ' 错峰必须给出窗口')
      for (const window of entry.offPeak.windows) {
        assert.notEqual(clockMinutes(window.from), null, key + ' 错峰起点可解析')
        assert.notEqual(clockMinutes(window.to), null, key + ' 错峰终点可解析')
        if (window.days === undefined) continue
        assert.ok(window.days.length > 0, key + ' days 若给出就不能是空数组')
        for (const day of window.days) {
          assert.ok(Number.isInteger(day) && day >= 1 && day <= 7, key + ' days 只允许 1–7 的整数')
        }
        assert.equal(new Set(window.days).size, window.days.length, key + ' days 不得重复')
      }
    }
  }

  // 未收录官方「缓存写入」档的条目必须真的留空，而不是被填成输入价
  const kimiK2 = entries.find((entry) => entry.provider === 'moonshotai' && entry.model === 'kimi-k2.7-code')
  assert.equal(kimiK2.cacheWrite, undefined, 'Kimi K2 系列文档没有缓存写入列 → 该档留空（不按输入价顶替）')
  const kimiK2Rule = rowCostsOf([{ provider: 'moonshotai', model: 'kimi-k2.7-code', calls: 1, cacheWriteTokens: 1_000_000 }], () => null)[0]
  assert.equal(kimiK2Rule.cost, 0, '留空的档位按 0 计，不会凭空产生费用')

  // 覆盖摘要：接口拿它渲染「已内置 N 条（来源见 …）」
  const sources = catalogSources()
  assert.ok(sources.length >= 4, '至少覆盖 DeepSeek / Kimi / Z.ai / OpenRouter 四个来源')
  assert.equal(sources.reduce((total, entry) => total + entry.count, 0), entries.length, '来源条数之和等于总条数')
  for (const source of sources) {
    assert.ok(source.providers.length > 0, source.source + ' 必须标出覆盖的通道')
    assert.equal(new Set(source.providers).size, source.providers.length, source.source + ' 通道去重')
    assert.deepEqual([...source.providers].sort(), source.providers, source.source + ' 通道按字典序（界面显示稳定）')
    assert.ok(source.count > 0)
  }
  assert.equal(catalogEntryCount(), entries.length)

  // 文档里的覆盖清单必须与 YAML 一致（docs/05 附录 A.5 写了「18 条」并列了 18 行）
  assert.equal(catalogEntryCount(), 18, '条数变了要同步更新 docs/05 附录 A.5 的清单与条数')
}

// ===== 17b. 内置价目文件的容错：坏条目跳过 + issue 带行号（绝不抛错、绝不猜单价）=====
{
  const parsed = parseCatalogText([
    'version: 1',                              // 1
    'rules:',                                  // 2
    '  - provider: ok',                        // 3
    '    model: kept',                         // 4
    '    unit: perMillionTokens',              // 5
    '    currency: CNY',                       // 6
    '    input: 1',                            // 7
    '    cacheRead: 0.1',                      // 8
    '    cacheWrite: 1',                       // 9
    '    output: 2',                           // 10
    '    source: https://example.com/pricing', // 11
    '    fetchedAt: 2026-10-13',               // 12
    '    note: 测试',                          // 13
    '    offPeak:',                            // 14
    '      windows: []',                       // 15 空窗口 → 按无错峰 + issue
    '  - provider: broken',                    // 16 缺 model
    '    unit: perMillionTokens',              // 17
    '  - provider: broken2',                   // 18
    '    model: bad-unit',                     // 19
    '    unit: perToken',                      // 20 非法 unit
    '  - provider: broken3',                   // 21
    '    model: negative',                     // 22
    '    unit: perMillionTokens',              // 23
    '    currency: CNY',                       // 24
    '    input: -1',                           // 25 负数
    '    output: 2',                           // 26
    '    source: https://example.com',         // 27
    '    fetchedAt: 2026-10-13',               // 28
    '    note: x',                             // 29
    '  - provider: broken4',                   // 30 缺 output
    '    model: no-output',                    // 31
    '    unit: perMillionTokens',              // 32
    '    currency: CNY',                       // 33
    '    input: 1',                            // 34
    '    cacheRead: 0.1',                      // 35
    '    cacheWrite: 1',                       // 36
    '    source: https://example.com',         // 37
    '    fetchedAt: 2026-10-13',               // 38
    '    note: x',                             // 39
    '  - provider: broken5',                   // 40 缺 source
    '    model: no-source',                    // 41
    '    unit: perMillionTokens',              // 42
    '    currency: CNY',                       // 43
    '    input: 1',                            // 44
    '    cacheRead: 0.1',                      // 45
    '    cacheWrite: 1',                       // 46
    '    output: 2',                           // 47
    '    fetchedAt: 2026-10-13',               // 48
    '    note: x',                             // 49
    '  - provider: broken6',                   // 50
    '    model: typo',                         // 51 未知字段不影响条目
    '    unit: perMillionTokens',              // 52
    '    currency: CNY',                       // 53
    '    input: 1',                            // 54
    '    cacheRead: 0.1',                      // 55
    '    cacheWrite: 1',                       // 56
    '    output: 2',                           // 57
    '    source: https://example.com',         // 58
    '    fetchedAt: 2026-10-13',               // 59
    '    note: x',                             // 60
    '    sources: 打错的键',                    // 61
  ].join('\n'))

  assert.deepEqual(
    parsed.entries.map((entry) => entry.provider + '|' + entry.model),
    ['ok|kept', 'broken6|typo'],
    '坏条目跳过，好条目保留',
  )
  assert.equal(parsed.entries[0].offPeak, undefined, '没有可用窗口 → 按无错峰处理')
  assert.deepEqual(Object.keys(parsed.entries[0]).sort(), [
    'cacheRead', 'cacheWrite', 'currency', 'fetchedAt', 'input', 'model', 'note', 'output', 'provider', 'source', 'unit',
  ], '空窗口的条目不该留下 offPeak 键')
  assert.equal(parsed.entries[1].cacheWrite, 1, '打错的 sources 不当成 source')

  const messages = parsed.issues.map((issue) => issue.message)
  assert.equal(messages.some((message) => message.includes('缺少 model')), true)
  assert.equal(messages.some((message) => message.includes('unit 必须是')), true)
  assert.equal(messages.some((message) => message.includes('input 必须是非负数字')), true)
  assert.equal(messages.some((message) => message.includes('缺少有效的 input / output')), true)
  assert.equal(messages.some((message) => message.includes('缺少 source')), true)
  assert.equal(messages.some((message) => message.includes('offPeak 没有可用窗口')), true)
  assert.equal(messages.some((message) => message.includes('未知字段 sources')), true)
  assert.equal(parsed.issues.every((issue) => typeof issue.line === 'number'), true, '每条 issue 都带行号')
  assert.equal(parsed.issues.find((issue) => issue.message.includes('缺少 model')).line, 16)
  assert.equal(parsed.issues.find((issue) => issue.message.includes('input 必须是非负数字')).line, 25)
  assert.equal(parsed.issues.find((issue) => issue.message.includes('未知字段 sources')).line, 61)

  // 语法级不支持（tab 缩进）同样只是 issue，不抛错
  const tabbed = parseCatalogText('version: 1\nrules:\n\t- provider: a\n')
  assert.equal(tabbed.entries.length, 0)
  assert.equal(tabbed.issues.some((issue) => issue.message.includes('tab')), true)
}

// ===== 18. DeepSeek 内置价目：CNY、高峰价数值、错峰半价、四段窗口 =====
{
  const expected = [
    { model: 'deepseek-flash', input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
    { model: 'deepseek-v4-flash', input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
    { model: 'deepseek-v4-flash-vision-exp', input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
    { model: 'deepseek-v4-pro', input: 9, cacheRead: 0.3, cacheWrite: 9, output: 27 },
  ]
  for (const want of expected) {
    const entry = catalogEntries().find((candidate) => candidate.provider === 'deepseek-official' && candidate.model === want.model)
    assert.notEqual(entry, undefined, want.model + ' 必须在内置价目里')
    assert.equal(entry.currency, 'CNY', want.model + ' 取中文文档的 CNY 价（英文页同价不同币种）')
    assert.deepEqual(
      [entry.input, entry.cacheRead, entry.cacheWrite, entry.output],
      [want.input, want.cacheRead, want.cacheWrite, want.output],
      want.model + ' 高峰（基准）价',
    )
    // 错峰 = 高峰半价（flash 1 / 0.02 / 1 / 4；v4-pro 4.5 / 0.15 / 4.5 / 13.5）
    assert.deepEqual(
      [entry.offPeak.input, entry.offPeak.cacheRead, entry.offPeak.cacheWrite, entry.offPeak.output],
      [want.input / 2, want.cacheRead / 2, want.cacheWrite / 2, want.output / 2],
      want.model + ' 错峰价 = 高峰半价',
    )
    // 四段窗口：工作日三段（含跨午夜）+ 周末全天一段
    assert.deepEqual(
      entry.offPeak.windows.map((window) => [window.from, window.to, window.days]),
      [
        ['00:00', '09:00', [1, 2, 3, 4, 5]],
        ['12:00', '14:00', [1, 2, 3, 4, 5]],
        ['18:00', '00:00', [1, 2, 3, 4, 5]],
        ['00:00', '00:00', [6, 7]],
      ],
      want.model + ' 错峰窗口与生效星期',
    )
    assert.ok(entry.note.includes('法定节假日'), want.model + ' 的 note 必须写明节假日无法表达')
  }

  // 官方原文口径：高峰只在周一至周五 9:00–12:00 / 14:00–18:00，其余（含周末）为错峰
  const proRule = catalogRuleFor('deepseek-official', 'deepseek-v4-pro')
  const hit = (hours, minutes, day) => isOffPeakAt(proRule, atLocal(hours, minutes, day))
  assert.equal(hit(10, 0, 1), false, '周一 10:00 = 高峰')
  assert.equal(hit(15, 0, 5), false, '周五 15:00 = 高峰')
  assert.equal(hit(10, 0, 6), true, '周六 10:00 = 空闲（周末全天）')
  assert.equal(hit(15, 0, 7), true, '周日 15:00 = 空闲')
  assert.equal(hit(2, 0, 3), true, '周三 02:00 = 空闲')
  assert.equal(hit(13, 0, 2), true, '周二 13:00 = 空闲（午间空档）')
  assert.equal(hit(19, 0, 4), true, '周四 19:00 = 空闲')

  // 金额：v4-pro 高峰 1M 未命中 = ¥9；拿不到小时分布时按高峰价（保守）
  const proRow = { provider: 'deepseek-official', model: 'deepseek-v4-pro', calls: 1, inputTokens: 1_000_000 }
  assert.equal(priceRowsOf([proRow], { at: atLocal(10, 0, 1) })[0].cost, 9, '周一 10:00 按高峰价 ¥9')
  assert.equal(priceRowsOf([proRow], { at: atLocal(10, 0, 6) })[0].cost, 9, '拿不到小时分布时按高峰价算（有意保守）')
}

console.log('pricing.test: 全部通过')
