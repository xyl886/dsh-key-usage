/**
 * 计费规则离线测试：优先级匹配、错峰判定（本地时间 / 跨午夜）、单位换算、
 * 缓存省钱公式与「规则 → 台账均价」两层回落。
 * 运行：node test/pricing.test.mjs（依赖 lib/pricing.js，改 src 后要先 tsc -p tsconfig.server.json）
 */
import assert from 'node:assert/strict'
import {
  PRICING_TEMPLATES,
  clockMinutes,
  costOfUsageRows,
  displayTokensOf,
  isOffPeakAt,
  isOffPeakNow,
  matchPricingRule,
  mergePricingRules,
  normalizePricing,
  offPeakTokenShare,
  priceRowsByRules,
  ratesAt,
  rowCostsOf,
  ruleKeyOf,
  summarizeCoverage,
  unwrapSettingValue,
} from '../lib/pricing.js'

/** 造一条规则，只写关心的字段。 */
function rule(overrides) {
  return {
    provider: '*', model: '*', unit: 'perMillionTokens', currency: 'CNY',
    input: 0, cacheRead: 0, cacheWrite: 0, output: 0, offPeak: null, note: '',
    ...overrides,
  }
}

function config(rules, currency = 'CNY') {
  return { version: 1, currency, rules }
}

/** 判定按本地时区，测试也用本地时间构造，避免在 UTC 机器上误判。 */
function atLocal(hours, minutes = 0) {
  return new Date(2026, 9, 14, hours, minutes, 0)
}

/** 金额比较：单价是十进制小数，浮点误差不该让测试变脆。 */
function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    (message ?? '金额不符') + '（实际 ' + String(actual) + '，期望 ' + String(expected) + '）',
  )
}

// ===== 1. 单位换算：按百万 / 按千 / 按次 =====
{
  const row = {
    provider: 'p', model: 'm', calls: 3,
    inputTokens: 1_000_000, cacheReadTokens: 2_000_000, cacheWriteTokens: 100_000, outputTokens: 500_000,
  }
  const rates = { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8 }
  const manual = 1_000_000 * 2 + 2_000_000 * 0.2 + 100_000 * 2 + 500_000 * 8

  const perMillion = priceRowsByRules([row], config([rule({ provider: 'p', model: 'm', unit: 'perMillionTokens', ...rates })]))[0]
  closeTo(perMillion.cost, manual / 1e6, '按百万 tokens：金额 = Σ(tokens × 单价) ÷ 1e6')

  const perThousand = priceRowsByRules([row], config([rule({ provider: 'p', model: 'm', unit: 'perThousandTokens', ...rates })]))[0]
  closeTo(perThousand.cost, manual / 1e3, '按千 tokens：同一批 tokens 金额是「按百万」的 1000 倍')

  // 按次计费只用「输入」档当每次调用价，token 数不参与
  const perCall = priceRowsByRules([row], config([rule({ provider: 'p', model: 'm', unit: 'perCall', input: 0.5, cacheRead: 9, cacheWrite: 9, output: 9 })]))[0]
  closeTo(perCall.cost, 1.5, '按次计费：calls × 输入档单价')
  assert.equal(perCall.cacheSavings, 0, '按次计费没有缓存命中差价')
}

// ===== 2. 缓存省钱 = cacheReadTokens ×（未命中价 − 命中价） =====
{
  const row = { provider: 'p', model: 'm', calls: 1, cacheReadTokens: 2_000_000, inputTokens: 100_000, cacheWriteTokens: 0, outputTokens: 0 }
  const hit = priceRowsByRules([row], config([rule({ provider: 'p', model: 'm', input: 2, cacheRead: 0.2 })]))[0]
  closeTo(hit.cacheSavings, 3.6, '省下的钱 = 命中 tokens ×（未命中价 − 命中价）')

  const thousand = priceRowsByRules([row], config([rule({ provider: 'p', model: 'm', unit: 'perThousandTokens', input: 2, cacheRead: 0.2 })]))[0]
  closeTo(thousand.cacheSavings, 3600, '省钱公式同样按单位换算（按千是「按百万」的 1000 倍）')

  // 没有规则就没有省钱数字
  assert.equal(priceRowsByRules([row], config([]))[0].cacheSavings, 0)
}

// ===== 3. 优先级：provider+model → provider+* → *+model → *+* =====
{
  const exact = rule({ provider: 'p', model: 'm', input: 1 })
  const providerWild = rule({ provider: 'p', model: '*', input: 2 })
  const modelWild = rule({ provider: '*', model: 'm', input: 3 })
  const allWild = rule({ provider: '*', model: '*', input: 4 })

  // 故意把精确规则放在最后：档位优先于声明顺序
  const all = [allWild, modelWild, providerWild, exact]
  assert.equal(matchPricingRule(all, 'p', 'm').input, 1, '精确匹配优先于任何通配')
  assert.equal(matchPricingRule([allWild, modelWild, providerWild], 'p', 'm').input, 2, '通道通配优先于模型通配')
  assert.equal(matchPricingRule([allWild, modelWild], 'p', 'm').input, 3, '模型通配')
  assert.equal(matchPricingRule([allWild], 'p', 'm').input, 4, '全通配兜底')
  assert.equal(matchPricingRule([], 'p', 'm'), null, '没有规则时返回 null（界面显示 —）')
  assert.equal(matchPricingRule([exact, providerWild], 'other', 'm'), null, '通道与模型都不匹配就不命中')

  // 同一档内按声明顺序取第一条
  const first = rule({ provider: 'p', model: '*', input: 10 })
  const second = rule({ provider: 'p', model: '*', input: 20 })
  assert.equal(matchPricingRule([first, second], 'p', 'x').input, 10, '同档内先声明的优先')
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
  assert.equal(isOffPeakAt(rule({ provider: 'p', model: 'm' }), atLocal(10)), false, '没有错峰段的规则永远不是错峰')

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

  assert.equal(isOffPeakNow(daytime, atLocal(10)), true, 'isOffPeakNow 只是把「现在」传进去')
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

  const row = { provider: 'p', model: 'm', calls: 1, inputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 }
  const blended = priceRowsByRules([row], config([ruleWithOffPeak]), { hours })[0]
  // 标准价 2、错峰价 1，占比 0.75 → 2×0.25 + 1×0.75 = 1.25
  assert.ok(Math.abs(blended.cost - 1.25) < 1e-9, '按错峰占比加权的成本 = 1.25，实际 ' + blended.cost)

  const allOffPeak = priceRowsByRules([row], config([ruleWithOffPeak]), { hours: hours.map((_, hour) => hourRow(hour === 9 ? 100 : 0)) })[0]
  assert.equal(allOffPeak.cost, 1, '占比 1 时整体按错峰价')
}

// ===== 8. 两层回落：规则 → 台账反推均价 → 无 =====
{
  const only = rule({ provider: 'p', model: 'm', input: 2 })
  const rows = [
    { provider: 'p', model: 'm', calls: 1, inputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
    { provider: 'q', model: 'n', calls: 1, tokens: 1_000_000, inputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
  ]
  const average = (row) => (row.provider === 'q' ? 5 : null)

  const mixed = costOfUsageRows(rows, config([only]), average)
  assert.equal(mixed.cost, 7, '规则 2 + 均价 5')
  assert.equal(mixed.source, 'estimate', '只要有一行回落均价，整体就标「估算」')
  assert.equal(mixed.ruleRows, 1)

  const allRule = costOfUsageRows(rows, config([only, rule({ provider: 'q', model: 'n', input: 5 })]), average)
  assert.equal(allRule.cost, 7)
  assert.equal(allRule.source, 'rule', '全部命中规则时标「自定」')

  const none = costOfUsageRows(rows, config([only]), () => null)
  assert.equal(none.cost, 2, '均价拿不到的行直接不计入，不报错')
  assert.equal(none.source, 'rule')

  const nothing = costOfUsageRows([rows[1]], config([]), () => null)
  assert.equal(nothing.cost, null, '既没规则也没均价 → 界面显示 —')
  assert.equal(nothing.source, 'none')

  const perRow = rowCostsOf(rows, config([only]), average)
  assert.deepEqual(perRow.map((entry) => entry.source), ['rule', 'estimate'])
  assert.deepEqual(perRow.map((entry) => entry.cost), [2, 5])

  const missing = rowCostsOf([rows[1]], config([]), () => null)[0]
  assert.equal(missing.source, 'none')
  assert.equal(missing.cost, null)
}

// ===== 9. 汇总口径：省钱按规则行统计、金额按币种分组 =====
{
  const cnyRule = rule({ provider: 'p', model: 'm', currency: 'CNY', input: 2, cacheRead: 0.2 })
  const usdRule = rule({ provider: 'u', model: 'v', currency: 'USD', input: 1.4, cacheRead: 0.26 })
  const rows = [
    { provider: 'p', model: 'm', calls: 1, inputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0, outputTokens: 0 },
    { provider: 'u', model: 'v', calls: 1, inputTokens: 0, cacheReadTokens: 1_000_000, cacheWriteTokens: 0, outputTokens: 0 },
    { provider: 'x', model: 'y', calls: 1, inputTokens: 1_000, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
  ]
  const coverage = summarizeCoverage(rows, config([cnyRule, usdRule]), (row) => (row.provider === 'x' ? 1 : null))
  assert.equal(coverage.ruleModels, 2)
  assert.equal(coverage.averagedModels, 1, 'x|y 由台账均价兜底')
  assert.equal(coverage.unpricedModels, 0)
  assert.deepEqual(Object.keys(coverage.costByCurrency).sort(), ['CNY', 'USD'], '跨币种分组，不合计')
  assert.ok(Math.abs(coverage.costByCurrency.CNY - 2.2) < 1e-9, 'CNY：(未命中 1M×2 + 命中 1M×0.2) = 2.2')
  assert.ok(Math.abs(coverage.savingsByCurrency.CNY - 1.8) < 1e-9, 'CNY 省：1M×(2−0.2)')
  assert.equal(coverage.savingsDetail.length, 2)
  assert.equal(coverage.savingsDetail[0].model, 'm')

  const unpriced = summarizeCoverage([rows[2]], config([]), () => null)
  assert.equal(unpriced.unpricedModels, 1, '规则与均价都没有 → 无依据')
}

// ===== 10. 设置值的防御式解析 =====
{
  assert.deepEqual(normalizePricing(undefined).rules, [], '拿不到值就是空规则')
  assert.deepEqual(normalizePricing('oops').rules, [])
  assert.deepEqual(normalizePricing({ rules: 'oops' }).rules, [])

  assert.equal(unwrapSettingValue({ get: () => 42 }), 42, 'volatile 引用要 unwrap 后再解析')
  assert.equal(unwrapSettingValue(42), 42)
  assert.deepEqual(normalizePricing({ get: () => ({ version: 1, currency: 'USD', rules: [] }) }).currency, 'USD')

  const messy = normalizePricing({
    version: 'x',
    currency: 'USD',
    rules: [
      null,
      'oops',
      { provider: ' p ', model: '', unit: 'perCentury', currency: '', input: -5, cacheRead: 'x', cacheWrite: 1, output: 2 },
      { provider: 'q', model: 'm', offPeak: { windows: [{ from: '09:00', to: '' }], input: 1 } },
      { provider: 'r', model: 'm', offPeak: { windows: [{ from: '09:00', to: '12:00' }], input: 1, cacheRead: 0.1, cacheWrite: 1, output: 2 } },
    ],
  })
  assert.equal(messy.version, 1, '版本号不合法回落 1')
  assert.equal(messy.rules.length, 3, '非对象条目直接丢弃')
  assert.equal(messy.rules[0].provider, 'p', 'provider 去空白')
  assert.equal(messy.rules[0].model, '*', '空 model 回落通配')
  assert.equal(messy.rules[0].unit, 'perMillionTokens', '未知单位回落按百万')
  assert.equal(messy.rules[0].currency, 'USD', '规则币种缺省继承配置币种')
  assert.equal(messy.rules[0].input, 0, '负数单价不接受（回落 0）')
  assert.equal(messy.rules[0].cacheRead, 0, '非数字单价回落 0')
  assert.equal(messy.rules[0].cacheWrite, 1)
  assert.equal(messy.rules[1].offPeak, null, '窗口解析不全时整段错峰作废')
  assert.equal(messy.rules[2].offPeak.windows.length, 1)

  const overflow = normalizePricing({ rules: Array.from({ length: 500 }, (_, index) => ({ provider: 'p' + String(index) })) })
  assert.equal(overflow.rules.length, 200, '规则条数封顶，避免一次请求打满 CPU')
}

// ===== 11. 模板：结构与官方数值 =====
{
  assert.deepEqual(PRICING_TEMPLATES.map((template) => template.id), ['deepseek', 'kimi', 'glm'])

  const deepseek = PRICING_TEMPLATES.find((template) => template.id === 'deepseek')
  assert.equal(deepseek.rules.length, 2)
  const flash = deepseek.rules[1]
  assert.equal(flash.provider, 'deepseek-official')
  assert.equal(flash.model, '*', '通道兜底规则')
  assert.equal(flash.currency, 'USD')
  assert.equal(flash.offPeak.input, flash.input / 2, 'DeepSeek 错峰 = peak 半价（输入）')
  assert.equal(flash.offPeak.output, flash.output / 2, 'DeepSeek 错峰 = peak 半价（输出）')
  assert.equal(flash.offPeak.windows.length, 3, '按 UTC+8 换算后的三段错峰窗口')
  assert.equal(flash.offPeak.windows[2].to, '24:00', '最后一段到当天末尾')
  assert.ok(deepseek.note.includes('api-docs.deepseek.com'), '模板说明里留价目来源与抓取日期')
  assert.ok(flash.note !== '', '每条规则也留备注，便于复核')
  assert.ok(deepseek.note.includes('工作日'), '把「窗口表达不了仅工作日」的限制写在说明里')

  const kimi = PRICING_TEMPLATES.find((template) => template.id === 'kimi')
  const k3 = kimi.rules.find((entry) => entry.model === 'kimi-k3')
  assert.deepEqual([k3.input, k3.cacheRead, k3.cacheWrite, k3.output], [20, 2, 20, 100], 'Kimi K3：¥20 / ¥2 / ¥20 / ¥100')
  assert.equal(k3.currency, 'CNY')

  const glm = PRICING_TEMPLATES.find((template) => template.id === 'glm')
  const glm53 = glm.rules.find((entry) => entry.model === 'glm-5.3')
  assert.deepEqual([glm53.input, glm53.cacheRead, glm53.output], [1.4, 0.26, 4.4], 'GLM-5.3：$1.4 / $0.26 / $4.4')
  const glmFlash = glm.rules.find((entry) => entry.model === 'glm-5.3-flash')
  assert.deepEqual([glmFlash.input, glmFlash.cacheRead, glmFlash.output], [0.15, 0.03, 0.50], 'GLM-5.3-Flash：$0.15 / $0.03 / $0.50')

  // 模板必须能被 normalizePricing 原样接受（否则套用后会被静默改值）
  for (const template of PRICING_TEMPLATES) {
    const normalized = normalizePricing({ version: 1, currency: 'CNY', rules: template.rules })
    assert.equal(normalized.rules.length, template.rules.length, template.id + ' 模板全部通过归一化')
    assert.deepEqual(normalized.rules[0], template.rules[0], template.id + ' 模板第一条数值不被改写')
  }
}

// ===== 12. 规则合并与展示口径 =====
{
  const existing = [rule({ provider: 'a', model: 'b', input: 1 }), rule({ provider: 'c', model: 'd', input: 2 })]
  const merged = mergePricingRules(existing, [rule({ provider: 'a', model: 'b', input: 9 }), rule({ provider: 'e', model: 'f', input: 3 })])
  assert.deepEqual(merged.map(ruleKeyOf), ['a|b', 'c|d', 'e|f'], '同键覆盖、新键追加、顺序保留')
  assert.equal(merged[0].input, 9)

  assert.equal(displayTokensOf({ provider: 'p', model: 'm', tokens: 7, inputTokens: 100 }), 7, '有展示口径 tokens 时优先用它')
  assert.equal(displayTokensOf({ provider: 'p', model: 'm', inputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 }), 6, '否则用输入 + 输出 + 缓存读（不含 cacheWrite）')
}

console.log('pricing.test: 全部通过')
