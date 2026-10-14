/**
 * 用户规则文件读写离线测试（`$DSH_HOME/dsh-key-usage/pricing-rules.yml`）：
 * 读取容错（缺字段 / 非法数值 / 不支持写法 → issue 且跳过，绝不抛错）、mtime 缓存失效、
 * 序列化形状与往返、原子写与写目标守卫、POST 合并语义（unit/offPeak/note 保留）、请求校验。
 * 运行：node test/pricing-store.test.mjs（依赖 lib/pricing-store.js，改 src 后要先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'dsh-key-usage-store-'))
// DSH_HOME 必须在调用前设置：pricingRulesPath() 在每次调用时才解析
process.env.DSH_HOME = home
const pluginDir = join(home, 'dsh-key-usage')
mkdirSync(pluginDir, { recursive: true })

const {
  DEFAULT_CURRENCY,
  mergeRulesForWrite,
  parsePricingRulesText,
  parseRulesRequest,
  pricingRulesPath,
  readPricingRulesFile,
  serializePricingRules,
  writePricingRulesFile,
} = await import('../lib/pricing-store.js')

const rulesPath = join(pluginDir, 'pricing-rules.yml')
assert.equal(pricingRulesPath(), rulesPath, '路径 = $DSH_HOME/dsh-key-usage/pricing-rules.yml')

/** 造一条完整规则（只覆盖关心的字段）。 */
function rule(overrides) {
  return {
    provider: '*', model: '*', unit: 'perMillionTokens', currency: 'CNY',
    input: 0, cacheRead: 0, cacheWrite: 0, output: 0, offPeak: null, note: '',
    ...overrides,
  }
}

// ===== 1. 文件不存在：exists:false、空规则、无 issue =====
{
  const missing = readPricingRulesFile()
  assert.equal(missing.exists, false)
  assert.equal(missing.path, rulesPath)
  assert.equal(missing.currency, DEFAULT_CURRENCY)
  assert.deepEqual(missing.rules, [])
  assert.deepEqual(missing.issues, [])
}

// ===== 2. 正常文件：冻结形状（含 days: []、双引号时间、明文标量）=====
{
  writeFileSync(rulesPath, [
    'version: 1',
    'currency: CNY',
    'rules:',
    '  - provider: deepseek',
    '    model: deepseek-v4-flash',
    '    unit: perMillionTokens',
    '    currency: CNY',
    '    input: 1',
    '    cacheRead: 0.1',
    '    cacheWrite: 1',
    '    output: 2',
    '    note: 官方定价页 2026-10-13',
    '    offPeak:',
    '      windows:',
    '        - from: "00:30"',
    '          to: "08:30"',
    '          days: []',
    '      input: 0.5',
    '      cacheRead: 0.05',
    '      cacheWrite: 0.5',
    '      output: 1',
    '  - provider: "*"',
    '    model: "*"',
    '    input: 3',
    '    cacheRead: 0.3',
    '    cacheWrite: 3',
    '    output: 6',
  ].join('\n'), 'utf8')
  const parsed = readPricingRulesFile()
  assert.equal(parsed.exists, true)
  assert.equal(parsed.version, 1)
  assert.equal(parsed.currency, 'CNY')
  assert.deepEqual(parsed.issues, [], '正常文件不该有 issue（days: [] 表示每天适用）')
  assert.deepEqual(parsed.rules, [
    {
      provider: 'deepseek', model: 'deepseek-v4-flash', unit: 'perMillionTokens', currency: 'CNY',
      input: 1, cacheRead: 0.1, cacheWrite: 1, output: 2,
      offPeak: {
        input: 0.5, cacheRead: 0.05, cacheWrite: 0.5, output: 1,
        windows: [{ from: '00:30', to: '08:30' }],
      },
      note: '官方定价页 2026-10-13',
    },
    rule({ provider: '*', model: '*', input: 3, cacheRead: 0.3, cacheWrite: 3, output: 6 }),
  ])
}

// ===== 3. mtime/size 缓存：同一次读取不重复解析；文件改完立刻生效 =====
{
  const first = readPricingRulesFile()
  const second = readPricingRulesFile()
  assert.equal(first, second, 'mtime/size 未变时复用同一份结果')

  // 改文件（长度也变）：下一次读取必须看到新内容，不需要重启
  writeFileSync(rulesPath, [
    'version: 1',
    'currency: CNY',
    'rules:',
    '  - provider: zai',
    '    model: glm-5',
    '    input: 1',
    '    cacheRead: 0.2',
    '    cacheWrite: 0',
    '    output: 3.2',
  ].join('\n'), 'utf8')
  const edited = readPricingRulesFile()
  assert.notEqual(edited, first, '文件变了要重新解析')
  assert.equal(edited.rules.length, 1)
  assert.equal(edited.rules[0].provider, 'zai')

  // rules: [] 与空文件都是「存在但没规则」，不该报 issue
  writeFileSync(rulesPath, 'version: 1\ncurrency: CNY\nrules: []\n', 'utf8')
  const emptyList = readPricingRulesFile()
  assert.equal(emptyList.exists, true)
  assert.deepEqual(emptyList.rules, [])
  assert.deepEqual(emptyList.issues, [])

  writeFileSync(rulesPath, '', 'utf8')
  const emptyFile = readPricingRulesFile()
  assert.equal(emptyFile.exists, true)
  assert.deepEqual(emptyFile.rules, [])
  assert.deepEqual(emptyFile.issues, [])
}

// ===== 4. 容错：坏条目跳过 + issue（带行号），好条目照常生效 =====
{
  const text = [
    'version: 1',                                                       // 1
    'currency: CNY',                                                    // 2
    'unknownTop: 1',                                                    // 3 未知顶层键
    'rules:',                                                           // 4
    '  - provider: broken',                                             // 5
    '    model: missing-cacheWrite',                                    // 6
    '    input: 1',                                                     // 7
    '    cacheRead: 0.1',                                               // 8
    '    output: 2',                                                    // 9
    '  - provider: broken',                                             // 10
    '    model: negative',                                              // 11
    '    input: -1',                                                    // 12 负数
    '    cacheRead: 0',                                                 // 13
    '    cacheWrite: 0',                                                // 14
    '    output: 2',                                                    // 15
    '  - provider: broken',                                             // 16
    '    model: bad-unit',                                              // 17
    '    unit: perToken',                                               // 18 非法 unit
    '    input: 1',                                                     // 19
    '    cacheRead: 0',                                                 // 20
    '    cacheWrite: 0',                                                // 21
    '    output: 2',                                                    // 22
    '  - provider: broken',                                             // 23
    '    model: typo',                                                  // 24
    '    input: 1',                                                     // 25
    '    cacheRead: 0',                                                 // 26
    '    cacheWrite: 0',                                                // 27
    '    output: 2',                                                    // 28
    '    cachewrite: 5',                                                // 29 大小写打错的键 → 未知字段
    '  - provider: &anchor broken',                                     // 30 不支持锚点 → 取值置空 → 该条跳过
    '    model: anchored',                                              // 31
    '    input: 1',                                                     // 32
    '    cacheRead: 0',                                                 // 33
    '    cacheWrite: 0',                                                // 34
    '    output: 2',                                                    // 35
    '  - provider: ok',                                                 // 36
    '    model: kept',                                                  // 37
    '    input: 1',                                                     // 38
    '    cacheRead: 0.1',                                               // 39
    '    cacheWrite: 1',                                                // 40
    '    output: 2',                                                    // 41
    '    offPeak:',                                                     // 42
    '      windows:',                                                   // 43
    '        - from: "25:00"',                                          // 44 非法时间 → 窗口丢弃
    '          to: "10:00"',                                            // 45
  ].join('\n')
  const parsed = parsePricingRulesText(text, rulesPath)
  const messages = parsed.issues.map((issue) => issue.message)
  const kept = parsed.rules.map((item) => item.provider + '|' + item.model)
  assert.deepEqual(kept, ['broken|typo', 'ok|kept'], '坏条目跳过，好条目保留')
  assert.equal(parsed.rules[0].cacheWrite, 0, '打错的 cachewrite 不当成 cacheWrite=5')
  assert.equal(parsed.rules[1].offPeak, null, '窗口全非法 → 按无错峰处理')

  assert.equal(parsed.issues.every((issue) => issue.file === 'user'), true, 'issue 都标 file:user')
  assert.equal(messages.some((message) => message.includes('未知的顶层键 unknownTop')), true)
  assert.equal(parsed.issues.find((issue) => issue.message.includes('未知的顶层键')).line, 3)
  assert.equal(messages.some((message) => message.includes('未知字段 cachewrite')), true)
  assert.equal(parsed.issues.find((issue) => issue.message.includes('未知字段 cachewrite')).line, 29)
  assert.equal(messages.some((message) => message.includes('缺少 cacheWrite')), true)
  assert.equal(messages.some((message) => message.includes('input 必须是非负数字')), true)
  assert.equal(parsed.issues.find((issue) => issue.message.includes('input 必须是非负数字')).line, 12)
  assert.equal(messages.some((message) => message.includes('unit 必须是')), true)
  assert.equal(messages.some((message) => message.includes('锚点')), true)
  assert.equal(messages.some((message) => message.includes('from / to 必须是本地时间')), true)
  assert.equal(messages.some((message) => message.includes('没有可用窗口')), true)
}

// ===== 5. 不支持写法：tab / 块标量 → issue（不抛错）=====
{
  const tabbed = parsePricingRulesText('rules:\n\t- provider: a\n', rulesPath)
  assert.equal(tabbed.issues.some((issue) => issue.message.includes('tab')), true)
  assert.equal(tabbed.issues[0].line, 2)

  const block = parsePricingRulesText('rules:\n  - provider: a\n    note: |\n      正文\n    model: b\n', rulesPath)
  assert.equal(block.issues.some((issue) => issue.message.includes('块标量')), true)

  // 垃圾输入不抛错
  for (const text of ['\t', '::::', '{}', '[]', "rules: '", '- - -']) {
    const parsed = parsePricingRulesText(text, rulesPath)
    assert.equal(Array.isArray(parsed.issues), true)
  }
}

// ===== 6. 裸列表顶层（手写兜底形状）=====
{
  const bare = parsePricingRulesText('- provider: a\n  model: b\n  input: 1\n  cacheRead: 0\n  cacheWrite: 0\n  output: 2\n', rulesPath)
  assert.deepEqual(bare.issues, [])
  assert.equal(bare.rules.length, 1)
  assert.equal(bare.rules[0].provider, 'a')
}

// ===== 7. 序列化往返：冻结形状（块序列 / 2 空格 / 时间双引号 / days: [] / `*` 加引号）=====
{
  const rules = [
    rule({ provider: '*', model: '*', unit: 'perThousandTokens', input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8, note: "含 ' 引号、# 井号、: 冒号" }),
    rule({
      provider: 'deepseek-official', model: 'deepseek-v4-pro', input: 9, cacheRead: 0.3, cacheWrite: 9, output: 27,
      offPeak: {
        input: 4.5, cacheRead: 0.15, cacheWrite: 4.5, output: 13.5,
        windows: [{ from: '00:00', to: '09:00', days: [1, 2, 3, 4, 5] }, { from: '00:00', to: '00:00' }],
      },
    }),
  ]
  const text = serializePricingRules(rules, 'CNY')
  assert.ok(text.includes('刷新页面即生效'), '文件头必须说明「改完刷新页面即生效」')
  assert.ok(text.includes("'*'"), '`*` 必须加引号（否则被当别名）')
  assert.ok(text.includes('from: "00:00"'), '时间用双引号')
  assert.ok(text.includes('days: []'), '缺省 days 写成行内空数组')
  assert.ok(text.includes('days: [1, 2, 3, 4, 5]'))
  assert.ok(text.includes('rules:\n  - provider:'), '块序列项在 rules: 下缩进 2 格')
  assert.ok(text.includes('\n    cacheRead:'), '每字段一行、缩进 4 格')

  const reparsed = parsePricingRulesText(text, rulesPath)
  assert.deepEqual(reparsed.issues, [], '自己写出来的文件必须自己能读且无 issue')
  assert.deepEqual(reparsed.rules, rules, '往返保真（含 offPeak / days 缺省 / 引号注释）')

  // 备注里的换行折成空格（行式 YAML 结构不能被破坏）
  const folded = serializePricingRules([rule({ note: '第一行\n第二行' })], 'CNY')
  assert.ok(folded.includes('第一行 第二行'))
  assert.deepEqual(parsePricingRulesText(folded, rulesPath).issues, [])
}

// ===== 8. 原子写：目标合法则落盘 + 无临时文件残留 + 立即能读到 =====
{
  const rules = [rule({ provider: 'opencode-go', model: '*', unit: 'perThousandTokens', input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8, note: '测试' })]
  const written = writePricingRulesFile(rulesPath, rules, 'CNY')
  assert.equal(written.ok, true)
  assert.equal(written.path, rulesPath)
  assert.equal(written.entries, 1)
  assert.deepEqual(written.issues, [])
  assert.equal(existsSync(rulesPath), true)
  assert.equal(existsSync(rulesPath + '.tmp'), false, '临时文件已被 rename，不残留')
  assert.deepEqual(readdirSync(pluginDir), ['pricing-rules.yml'])
  assert.ok(readFileSync(rulesPath, 'utf8').includes('计费规则（用户覆盖）'))
  assert.deepEqual(readPricingRulesFile().rules, rules, '写完立刻读得到（缓存被主动失效）')

  // 空规则也要能写：rules: [] 行内空数组
  const cleared = writePricingRulesFile(rulesPath, [], 'CNY')
  assert.equal(cleared.ok, true)
  assert.equal(cleared.entries, 0)
  assert.equal(readFileSync(rulesPath, 'utf8').includes('rules: []'), true)
}

// ===== 9. 写目标守卫：只允许 $DSH_HOME/dsh-key-usage/pricing-rules.yml =====
{
  const wrongName = writePricingRulesFile(join(pluginDir, 'other.yml'), [], 'CNY')
  assert.equal(wrongName.ok, false)
  assert.ok(wrongName.error.includes('pricing-rules.yml'))
  assert.equal(existsSync(join(pluginDir, 'other.yml')), false)

  const outside = writePricingRulesFile(join(home, 'pricing-rules.yml'), [], 'CNY')
  assert.equal(outside.ok, false)
  assert.ok(outside.error.includes('$DSH_HOME'))
  assert.equal(existsSync(join(home, 'pricing-rules.yml')), false)

  const nested = writePricingRulesFile(join(pluginDir, 'nested', 'pricing-rules.yml'), [], 'CNY')
  assert.equal(nested.ok, false, '不同目录的同名文件也不行')
  assert.equal(existsSync(join(pluginDir, 'nested')), false)
}

// ===== 10. POST 合并语义：unit/offPeak/note 保留文件旧值，其余按请求，顺序按请求 =====
{
  const existing = [rule({
    provider: 'deepseek-official', model: 'deepseek-v4-pro', unit: 'perThousandTokens',
    input: 1, cacheRead: 0.1, cacheWrite: 1, output: 2,
    offPeak: { input: 0.5, cacheRead: 0.05, cacheWrite: 0.5, output: 1, windows: [{ from: '00:00', to: '09:00' }] },
    note: '旧备注',
  })]
  const incoming = [
    rule({ provider: 'zai', model: 'glm-5', currency: 'USD', input: 1, cacheRead: 0.2, cacheWrite: 0, output: 3.2 }),
    rule({ provider: 'deepseek-official', model: 'deepseek-v4-pro', input: 9, cacheRead: 0.3, cacheWrite: 9, output: 27 }),
  ]
  const merged = mergeRulesForWrite(existing, incoming)
  assert.deepEqual(merged.map((item) => item.provider + '|' + item.model), ['zai|glm-5', 'deepseek-official|deepseek-v4-pro'], '顺序按请求')
  assert.deepEqual(merged[0], incoming[0], '新条目用默认 unit / offPeak / note')
  assert.equal(merged[1].unit, 'perThousandTokens', 'unit 保留文件里的旧值')
  assert.deepEqual(merged[1].offPeak, existing[0].offPeak, 'offPeak 保留文件里的旧值')
  assert.equal(merged[1].note, '旧备注', 'note 保留文件里的旧值')
  assert.equal(merged[1].input, 9, '单价以请求为准')
  assert.equal(merged[1].output, 27)
}

// ===== 11. 请求体校验：非法输入给 ok:false（不写半份文件）=====
{
  const accepted = parseRulesRequest({
    rules: [{ provider: 'deepseek-official', model: 'deepseek-flash', currency: 'CNY', input: 2, cacheRead: '0.04', cacheWrite: 2, output: 8 }],
  })
  assert.equal(accepted.ok, true)
  assert.equal(accepted.currency, null)
  assert.deepEqual(accepted.rules, [rule({
    provider: 'deepseek-official', model: 'deepseek-flash', input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8,
  })], '数字字符串按数字收下；unit 默认 perMillionTokens、offPeak null、note 空')

  const empty = parseRulesRequest({ rules: [], currency: 'USD' })
  assert.deepEqual(empty, { ok: true, rules: [], currency: 'USD' })

  const duplicate = [
    { provider: 'a', model: 'b', currency: 'CNY', input: 1, cacheRead: 0, cacheWrite: 0, output: 1 },
    { provider: 'a', model: 'b', currency: 'CNY', input: 2, cacheRead: 0, cacheWrite: 0, output: 2 },
  ]
  const cases = [
    [null, 'JSON 对象'],
    ['x', 'JSON 对象'],
    [{}, 'rules 必须是数组'],
    [{ rules: {} }, 'rules 必须是数组'],
    [{ rules: [{ provider: '', model: 'b', currency: 'CNY', input: 1, cacheRead: 0, cacheWrite: 0, output: 1 }] }, 'provider'],
    [{ rules: [{ provider: 'a', model: '', currency: 'CNY', input: 1, cacheRead: 0, cacheWrite: 0, output: 1 }] }, 'model'],
    [{ rules: [{ provider: 'a', model: 'b', currency: '', input: 1, cacheRead: 0, cacheWrite: 0, output: 1 }] }, 'currency'],
    [{ rules: [{ provider: 'a', model: 'b', currency: 'CNY', input: -1, cacheRead: 0, cacheWrite: 0, output: 1 }] }, 'input'],
    [{ rules: [{ provider: 'a', model: 'b', currency: 'CNY', input: 1, cacheRead: 0, cacheWrite: 0, output: 'x' }] }, 'output'],
    [{ rules: [{ provider: 'a', model: 'b', currency: 'CNY', input: 1, cacheRead: 0, cacheWrite: 0 }] }, 'output'],
    [{ rules: duplicate }, '重复'],
    [{ rules: new Array(201).fill(duplicate[0]) }, '上限'],
    [{ rules: [], currency: '' }, 'currency'],
  ]
  for (const [payload, fragment] of cases) {
    const parsed = parseRulesRequest(payload)
    assert.equal(parsed.ok, false, '必须拒绝：' + JSON.stringify(payload).slice(0, 60))
    assert.ok(parsed.error.includes(fragment), '错误文案要指出问题（期望含「' + fragment + '」，实际：' + parsed.error + '）')
  }
}

console.log('pricing-store.test.mjs 全部通过')
