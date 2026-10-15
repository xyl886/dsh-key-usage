/**
 * 受限 YAML 解析器离线测试：正常写法（嵌套映射 / 列表 / 引号 / 数字 / 布尔 / null / 行内数组 / 注释 / CRLF）
 * 与每种**不支持**写法的报错（必须带行号），确保不会静默错解。
 * 运行：node test/yaml-lite.test.mjs（依赖 lib/yaml-lite.js，改 src 后要先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { parseYamlLite, yamlField, yamlItems, yamlKindLabel, yamlLine, yamlNumber, yamlText } from '../lib/pricing/yaml-lite.js'

/** 取标量节点的原始值（区分「字符串 2」与「数字 2」用）。 */
function scalarValue(node) {
  assert.equal(node.kind, 'scalar', '期望标量节点')
  return node.value
}

// ===== 1. 正常写法：顶层映射 + 块序列 + 标量类型 =====
{
  const text = [
    '# 顶层注释',
    'version: 1',
    "currency: 'CNY'   # 行尾注释",
    'rules:',
    '  - provider: deepseek',
    '    model: "deepseek-v4-flash"',
    '    input: 2',
    '    output: 8.5',
    '    ratio: -0.075',
    '    enabled: true',
    '    nothing: null',
    '    tilde: ~',
    '    days: [1, 2, 3]',
    '    empty: []',
    '',
    '  - provider: moonshotai',
    '    model: kimi-k3',
    '',
  ].join('\n')
  const { root, issues } = parseYamlLite(text)
  assert.deepEqual(issues, [], '正常写法不该有任何 issue')
  assert.equal(yamlKindLabel(root), '映射')
  assert.equal(yamlLine(root), 2, '根映射行号 = 第一行内容')
  assert.equal(yamlNumber(yamlField(root, 'version')), 1)
  assert.equal(yamlText(yamlField(root, 'currency')), 'CNY', '行尾注释不参与取值')
  assert.equal(yamlKindLabel(yamlField(root, 'missing')), '空')

  const items = yamlItems(yamlField(root, 'rules'))
  assert.equal(items.length, 2, '两个列表项')
  assert.equal(items[0].line, 5)
  const first = items[0].value
  assert.equal(yamlKindLabel(first), '映射')
  assert.equal(yamlText(yamlField(first, 'provider')), 'deepseek')
  assert.equal(yamlText(yamlField(first, 'model')), 'deepseek-v4-flash', '双引号字符串')
  assert.equal(scalarValue(yamlField(first, 'input')), 2, '整数解析成数字')
  assert.equal(scalarValue(yamlField(first, 'output')), 8.5, '小数解析成数字')
  assert.equal(scalarValue(yamlField(first, 'ratio')), -0.075, '负小数')
  assert.equal(scalarValue(yamlField(first, 'enabled')), true, '布尔')
  assert.equal(scalarValue(yamlField(first, 'nothing')), null)
  assert.equal(scalarValue(yamlField(first, 'tilde')), null)
  assert.equal(yamlNumber(yamlField(first, 'days')), null, '列表不是标量')
  assert.deepEqual(yamlItems(yamlField(first, 'days')).map((entry) => entry.value.value), [1, 2, 3])
  assert.deepEqual(yamlItems(yamlField(first, 'empty')).map((entry) => entry.value.value), [], '行内空数组')
  assert.equal(yamlKindLabel(yamlField(first, 'days')), '列表')
  assert.equal(yamlText(yamlField(items[1].value, 'model')), 'kimi-k3', '无引号明文')
}

// ===== 2. 裸 `-` + 缩进块、三层嵌套、行尾空白 =====
{
  const text = [
    'rules:   ',
    '  -',
    '    provider: zai',
    '    offPeak:',
    '      windows:',
    '        - from: "00:00"',
    '          to: "09:00"',
    '          days: [1, 2]',
    '        - from: "12:00"',
    '          to: "14:00"',
  ].join('\n')
  const { root, issues } = parseYamlLite(text)
  assert.deepEqual(issues, [])
  const rule = yamlItems(yamlField(root, 'rules'))[0].value
  assert.equal(yamlText(yamlField(rule, 'provider')), 'zai')
  const offPeak = yamlField(rule, 'offPeak')
  const windows = yamlItems(yamlField(offPeak, 'windows'))
  assert.equal(windows.length, 2)
  assert.deepEqual(
    windows.map((entry) => [yamlText(yamlField(entry.value, 'from')), yamlText(yamlField(entry.value, 'to'))]),
    [['00:00', '09:00'], ['12:00', '14:00']],
  )
}

// ===== 3. 引号细节：单引号 '' 转义、引号内 # 不是注释、双引号转义 =====
{
  const text = [
    "a: 'it''s # not a comment'",
    'b: "line\\nnext\\ttab"',
    "c: 'tab\\t不是转义'",
  ].join('\n')
  const { root, issues } = parseYamlLite(text)
  assert.deepEqual(issues, [])
  assert.equal(yamlText(yamlField(root, 'a')), "it's # not a comment")
  assert.equal(yamlText(yamlField(root, 'b')), 'line\nnext\ttab')
  assert.equal(yamlText(yamlField(root, 'c')), 'tab\\t不是转义', '单引号里反斜杠不转义')
}

// ===== 4. CRLF、空文件、只有注释 =====
{
  const { root, issues } = parseYamlLite('a: 1\r\nb: 2\r\n')
  assert.deepEqual(issues, [])
  assert.equal(yamlNumber(yamlField(root, 'b')), 2)

  const empty = parseYamlLite('')
  assert.equal(empty.root, null)
  assert.deepEqual(empty.issues, [])

  const comments = parseYamlLite('# 注释\n\n   # 缩进注释\n')
  assert.equal(comments.root, null)
  assert.deepEqual(comments.issues, [])
}

// ===== 5. 不支持：tab 缩进（带行号，跳过该行） =====
{
  const { root, issues } = parseYamlLite('rules:\n\t- provider: a\n  - provider: b\n')
  assert.equal(issues.length >= 1, true)
  const tabIssue = issues.find((issue) => issue.message.includes('tab'))
  assert.notEqual(tabIssue, undefined, '必须报 tab 缩进')
  assert.equal(tabIssue.line, 2, 'issue 带行号')
  assert.equal(yamlItems(yamlField(root, 'rules')).length, 1, 'tab 行被跳过，另一条照常解析')
}

// ===== 6. 不支持：块标量 | / >（正文整段跳过，只报一次） =====
{
  for (const marker of ['|', '>']) {
    const text = ['note: ' + marker, '  第一行正文', '  第二行正文', 'output: 8'].join('\n')
    const { root, issues } = parseYamlLite(text)
    assert.equal(issues.length, 1, marker + ' 只报一次')
    assert.equal(issues[0].line, 1)
    assert.equal(issues[0].message.includes('块标量'), true)
    assert.equal(yamlNumber(yamlField(root, 'output')), 8, '块标量之后的兄弟键照常解析')
  }
}

// ===== 7. 不支持：锚点 & / 别名 * =====
{
  const anchor = parseYamlLite('base: &anchor 5\ncopy: *anchor\n')
  assert.equal(anchor.issues.some((issue) => issue.message.includes('锚点')), true)
  assert.equal(anchor.issues.find((issue) => issue.message.includes('锚点')).line, 1)
  assert.equal(anchor.issues.some((issue) => issue.message.includes('别名')), true)
}

// ===== 8. 不支持：多文档 --- / ...（行号准确，其余内容照常解析） =====
{
  const { root, issues } = parseYamlLite('version: 1\n---\nversion: 2\n')
  // `---` 被跳过（报多文档），第二份 version 于是成了重复键：两条 issue 都要在，且行号准确
  assert.equal(issues.length, 2)
  assert.equal(issues[0].line, 2)
  assert.equal(issues[0].message.includes('多文档'), true)
  assert.equal(issues[1].line, 3)
  assert.equal(issues[1].message.includes('重复的键'), true)
  assert.equal(yamlNumber(yamlField(root, 'version')), 1)
  const tail = parseYamlLite('version: 1\n...\n')
  assert.equal(tail.issues[0].line, 2)
}

// ===== 9. 不支持：flow 映射 {…} / 跨行 flow 序列 =====
{
  const flowMap = parseYamlLite('rule: {provider: a, model: b}\n')
  assert.equal(flowMap.issues.length, 1)
  assert.equal(flowMap.issues[0].message.includes('行内映射'), true)
  assert.equal(yamlKindLabel(yamlField(flowMap.root, 'rule')), '空值', '不支持的值不猜，置空并报错')

  const brokenFlow = parseYamlLite('days: [1,\n  2]\n')
  assert.equal(brokenFlow.issues.some((issue) => issue.message.includes('跨行')), true)
}

// ===== 10. 引号未闭合 =====
{
  const { issues } = parseYamlLite("note: 'abc\nother: 1\n")
  assert.equal(issues.some((issue) => issue.message.includes('引号未闭合')), true)
  assert.equal(issues[0].line, 1)
}

// ===== 11. 缩进层级不匹配 =====
{
  const deeper = parseYamlLite('  version: 1\n')
  assert.equal(deeper.issues.some((issue) => issue.message.includes('缩进层级不匹配')), true)
  assert.equal(yamlNumber(yamlField(deeper.root, 'version')), 1, '仍按实际缩进解析，不丢内容')

  const orphan = parseYamlLite('a: 1\n    b: 2\n')
  assert.equal(orphan.issues.some((issue) => issue.message.includes('缩进层级不匹配')), true)
}

// ===== 12. 重复键：保留第一条并报错 =====
{
  const { root, issues } = parseYamlLite('a: 1\na: 2\n')
  assert.equal(yamlNumber(yamlField(root, 'a')), 1, '保留第一条')
  assert.equal(issues.length, 1)
  assert.equal(issues[0].line, 2)
  assert.equal(issues[0].message.includes('重复的键'), true)
}

// ===== 13. 不支持：显式键 ? / 合并键 << =====
{
  const explicit = parseYamlLite('? a\n: 1\n')
  assert.equal(explicit.issues.some((issue) => issue.message.includes('显式键')), true)

  const merge = parseYamlLite('<<: base\n')
  assert.equal(merge.issues.some((issue) => issue.message.includes('合并键')), true)
}

// ===== 14. 无法解析的行：`key:value`（冒号后无空格）按 YAML 规则是标量，不是映射 =====
{
  const { issues } = parseYamlLite('a:b\n')
  assert.equal(issues.length, 1)
  assert.equal(issues[0].line, 1)
  assert.equal(issues[0].message.includes('无法解析的行'), true)

  const mixed = parseYamlLite('rules:\n  - provider: a\n    裸标量\n')
  assert.equal(mixed.issues.some((issue) => issue.message.includes('列表项里既有键值又有裸标量')), true)
  assert.equal(mixed.issues.find((issue) => issue.message.includes('裸标量')).line, 3)
}

// ===== 15. 取值助手：类型不符时不猜（返回 null） =====
{
  const { root } = parseYamlLite("num: '2'\nlist: [1]\nmap:\n  a: 1\n")
  assert.equal(yamlNumber(yamlField(root, 'num')), 2, '带引号的数字文本可当数字用')
  assert.equal(yamlNumber(yamlField(root, 'list')), null)
  assert.equal(yamlText(yamlField(root, 'map')), null)
  assert.equal(yamlLine(yamlField(root, 'map')), 3)
  assert.equal(yamlLine(null), null)
  assert.equal(yamlKindLabel(undefined), '空')
}

// ===== 16. 任意垃圾输入都不抛错 =====
{
  const garbage = ['\t\t\t', '::::', '[]', '{}', '- - -', '& & &', '>>>', '???', "'", '"']
  for (const text of garbage) {
    const parsed = parseYamlLite(text)
    assert.equal(typeof parsed.issues.length, 'number', '不抛错即可：' + JSON.stringify(text))
  }
}

console.log('yaml-lite.test.mjs 全部通过')
