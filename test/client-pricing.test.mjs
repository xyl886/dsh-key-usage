/**
 * 客户端计费规则视图模型测试：
 * - 表单只编辑五类字段：提交体**不含** unit / offPeak / note（`submittableRuleOf`），
 *   服务端按 `provider|model` 从文件旧值继承（`mergeRulesForWrite`）—— 保存不会清空用户数据；
 * - 列表的「含错峰窗口 / 含单位设置 —— 只在 YAML 里编辑」提示（`ruleExtrasTextOf`）；
 * - 模板 / 片段 / 提示词文本生成，且生成的 YAML 必须能被服务端受限解析器读回（往返校验）；
 * - 内置价目匹配口径（精确 → 忽略大小写 → 去 `vendor/` 前缀 → 该通道通配）。
 *
 * 用 Node 的类型擦除直接加载 `src/client/pricing.ts`（Node ≥ 22.18 默认开启）：该模块没有 import，是纯函数。
 * 运行：node test/client-pricing.test.mjs（依赖 lib/yaml-lite.js 与 lib/pricing-store.js，改 src 后要先 build）
 */
import assert from 'node:assert/strict'
import { mergeRulesForWrite } from '../lib/pricing-store.js'
import { parseYamlLite, yamlField, yamlItems, yamlNumber, yamlText } from '../lib/yaml-lite.js'

let clientPricing = null
try {
  clientPricing = await import('../src/client/pricing.ts')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/Unknown file extension|strip-types|ERR_UNKNOWN_FILE_EXTENSION|TypeScript/i.test(message)) {
    console.log('client-pricing.test: 当前 Node 不支持直接加载 .ts（需要 ≥ 22.18），已跳过')
  } else {
    throw error
  }
}

if (clientPricing !== null) {
  const {
    DEFAULT_UNIT, blankRule, buildAgentPrompt, buildRuleSnippetYaml, buildRulesTemplateYaml,
    catalogRuleFor, ruleExtrasTextOf, ruleProblemOf, submittableRuleOf,
  } = clientPricing

  /** 造一条规则：只写关心的字段。 */
  const rule = (overrides) => ({
    provider: 'p', model: 'm', unit: DEFAULT_UNIT, currency: 'CNY',
    input: 1, cacheRead: 0, cacheWrite: 0, output: 2, offPeak: null, note: '', ...overrides,
  })

  const deepseekOffPeak = {
    windows: [
      { from: '00:00', to: '09:00', days: [1, 2, 3, 4, 5] },
      { from: '12:00', to: '14:00', days: [1, 2, 3, 4, 5] },
      { from: '18:00', to: '00:00', days: [1, 2, 3, 4, 5] },
      { from: '00:00', to: '00:00', days: [6, 7] },
    ],
    input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4,
  }

  // 与 /pricing 的 catalog 同形：sources 给来源，rules 给逐条数值
  const catalog = {
    entries: 3,
    sources: [
      { source: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing', fetchedAt: '2026-10-13', providers: ['deepseek-official'], count: 1 },
      { source: 'https://docs.z.ai/guides/overview/pricing', fetchedAt: '2026-10-13', providers: ['zai'], count: 2 },
    ],
    rules: [
      rule({ provider: 'deepseek-official', model: 'deepseek-flash', input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8, offPeak: deepseekOffPeak }),
      rule({ provider: 'zai', model: 'glm-5.3', currency: 'USD', input: 1.4, cacheRead: 0.26, cacheWrite: 0, output: 4.4 }),
      rule({ provider: 'zai', model: 'glm-5.3-flash', currency: 'USD', input: 0.15, cacheRead: 0.03, cacheWrite: 0, output: 0.5 }),
    ],
  }

  /** 解析整份模板文本：顶层必须是 map，且没有解析问题。 */
  const parseDocument = (text) => {
    const { root, issues } = parseYamlLite(text)
    assert.deepEqual(issues, [], '生成的 YAML 不该有解析问题：' + JSON.stringify(issues))
    assert.equal(root?.kind, 'map', '顶层应是映射')
    return root
  }

  /** 取 `rules:` 下的规则项（每项是一个映射节点）。 */
  const ruleNodesOf = (root) => {
    const items = yamlItems(yamlField(root, 'rules'))
    assert.notEqual(items, null, 'rules 应是列表')
    return items.map((item) => item.value)
  }

  // ===== 1. 提交体只有七个字段：unit / offPeak / note 不提交（服务端从文件旧值继承） =====
  {
    const submitted = submittableRuleOf(rule({
      provider: ' deepseek-official ', model: 'deepseek-flash', unit: 'perThousandTokens',
      offPeak: deepseekOffPeak, note: '来源：api-docs.deepseek.com',
    }))
    assert.deepEqual(Object.keys(submitted).sort(), ['cacheRead', 'cacheWrite', 'currency', 'input', 'model', 'output', 'provider'])
    assert.equal(submitted.provider, 'deepseek-official', '通道 id 去空白')
    assert.equal(submitted.unit, undefined, 'unit 不提交（只在 YAML 里维护）')
    assert.equal(submitted.offPeak, undefined, 'offPeak 不提交')
    assert.equal(submitted.note, undefined, 'note 不提交')
  }

  // ===== 2. 保存不清空：服务端合并时按 provider|model 继承旧的 unit / offPeak / note =====
  {
    const previous = [rule({
      provider: 'deepseek-official', model: 'deepseek-flash', unit: 'perThousandTokens',
      input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8,
      offPeak: deepseekOffPeak, note: '来源：api-docs.deepseek.com（2026-10-13）',
    })]
    // 表单只改了 input，其余七字段照提交
    const incoming = [{ ...submittableRuleOf(previous[0]), input: 3 }]
    const merged = mergeRulesForWrite(previous, incoming)
    assert.equal(merged.length, 1)
    assert.equal(merged[0].input, 3, '改过的价格写下去')
    assert.equal(merged[0].unit, 'perThousandTokens', '单位没被清掉')
    assert.equal(merged[0].note, '来源：api-docs.deepseek.com（2026-10-13）', '备注没被清掉')
    assert.equal(merged[0].offPeak.input, 1, '错峰价没被清掉')
    assert.deepEqual(
      merged[0].offPeak.windows.map((window) => window.days),
      [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [6, 7]],
      '错峰窗口与 days 没被清掉',
    )

    // 新条目（文件里没有同键）按缺省补：unit 每百万、offPeak 空、note 空
    // 注意合并语义是「以请求为准」：提交几条就写几条，面板每次提交的是全部规则
    const added = mergeRulesForWrite(previous, [
      { ...submittableRuleOf(previous[0]) },
      { ...submittableRuleOf(rule({ provider: 'zai', model: 'glm-5.3' })) },
    ])
    assert.equal(added.length, 2, '提交几条写几条（整份替换语义）')
    assert.equal(added[0].note, '来源：api-docs.deepseek.com（2026-10-13）', '同键旧条目仍然继承')
    assert.equal(added[1].unit, DEFAULT_UNIT)
    assert.equal(added[1].offPeak, null)
    assert.equal(added[1].note, '')
  }

  // ===== 3. 「只在 YAML 里编辑」提示：含错峰 / 非缺省单位才出现 =====
  {
    assert.equal(ruleExtrasTextOf(rule({})), '', '默认规则不挂提示')
    assert.equal(ruleExtrasTextOf(rule({ note: '只是备注' })), '', '备注本身显示在列表里，不再重复提示')

    const withOffPeak = ruleExtrasTextOf(rule({ offPeak: deepseekOffPeak }))
    assert.ok(withOffPeak.includes('含错峰窗口'), withOffPeak)
    assert.ok(withOffPeak.includes('00:00–09:00'), '带上窗口时间：' + withOffPeak)
    assert.ok(withOffPeak.includes('仅工作日') && withOffPeak.includes('仅周末'), '带上生效星期：' + withOffPeak)
    assert.ok(withOffPeak.includes('只在 YAML 里编辑'), withOffPeak)

    const withUnit = ruleExtrasTextOf(rule({ unit: 'perThousandTokens' }))
    assert.ok(withUnit.includes('含单位设置') && withUnit.includes('每千 tokens'), withUnit)

    const both = ruleExtrasTextOf(rule({ unit: 'perCall', offPeak: deepseekOffPeak }))
    assert.ok(both.includes('含错峰窗口') && both.includes('含单位设置'), both)
  }

  // ===== 4. 模板：内置价目 ∩ 用到的模型（价格预填），并带错峰写法与缺口占位 =====
  {
    const used = [
      { provider: 'deepseek-official', model: 'deepseek-flash' },
      { provider: 'zai', model: 'glm-5.3' },
      { provider: 'my-local', model: 'qwen3' },
    ]
    const uncovered = [{ provider: 'my-local', model: 'qwen3', tokens: 1234, share: 1, estimated: false }]
    const template = buildRulesTemplateYaml(catalog, used, [], uncovered, 'CNY')
    assert.equal(template.prefilledCount, 2, '两条命中内置价目')
    assert.equal(template.pendingCount, 1, '一条没有价格依据')
    assert.ok(template.text.includes('单位缺省是每百万 tokens'), '注释头写清单位')
    assert.ok(template.text.includes('offPeak:'), '注释头给出错峰写法示例')
    assert.ok(template.text.includes('不要用 0 占位'), '缺口占位说明不能写 0')

    const root = parseDocument(template.text)
    assert.equal(yamlNumber(yamlField(root, 'version')), 1)
    assert.equal(yamlText(yamlField(root, 'currency')), 'CNY')
    const nodes = ruleNodesOf(root)
    assert.equal(nodes.length, 2, '只放预填的两条（缺口那条被注释掉）')
    assert.equal(yamlText(yamlField(nodes[0], 'provider')), 'deepseek-official')
    assert.equal(yamlText(yamlField(nodes[0], 'model')), 'deepseek-flash')
    assert.equal(yamlNumber(yamlField(nodes[0], 'input')), 2, '价格 = 内置价目现值')
    assert.equal(yamlNumber(yamlField(nodes[0], 'cacheRead')), 0.04)
    assert.equal(yamlText(yamlField(nodes[0], 'unit')), 'perMillionTokens')
    // 错峰段（含 days）必须原样生成，否则用户照抄会丢掉错峰价
    const offPeak = yamlField(nodes[0], 'offPeak')
    assert.notEqual(offPeak, null, '内置价目的错峰段要写进模板')
    assert.equal(yamlNumber(yamlField(offPeak, 'input')), 1)
    const windows = yamlItems(yamlField(offPeak, 'windows'))
    assert.equal(windows.length, 4)
    assert.equal(yamlText(yamlField(windows[3].value, 'from')), '00:00')
    assert.equal(yamlText(yamlField(windows[3].value, 'to')), '00:00', '周末全天窗口')
    assert.equal(yamlNumber(yamlField(nodes[1], 'input')), 1.4, '第二条是 GLM')
    // 缺口条目整段注释：不能被解析成规则，也不能写 0 占位
    const placeholderLine = template.text.split('\n').find((line) => line.includes("provider: 'my-local'"))
    assert.ok(placeholderLine !== undefined, '缺口模型要出现在模板里（注释占位）')
    assert.ok(placeholderLine.trimStart().startsWith('#'), '缺口条目必须是注释：' + placeholderLine)
  }

  // ===== 5. 已经有用户规则的模型不进模板；全都没命中时 rules 写成行内 [] =====
  {
    const withRule = buildRulesTemplateYaml(
      catalog,
      [{ provider: 'deepseek-official', model: 'deepseek-flash' }],
      [rule({ provider: 'deepseek-official', model: 'deepseek-flash' })],
      [],
      'CNY',
    )
    assert.equal(withRule.prefilledCount, 0, '已有规则的模型不算缺口')
    const emptyRoot = parseDocument(withRule.text)
    assert.deepEqual(yamlItems(yamlField(emptyRoot, 'rules')), [], '空 rules 必须能解析成空列表')
  }

  // ===== 6. 单条片段：缩进按 rules: 下的一层（片段本身不是整份文档，粘进去才解析） =====
  {
    const snippet = buildRuleSnippetYaml(rule({
      provider: 'deepseek-official', model: 'deepseek-v4-pro', input: 9, cacheRead: 0.3, cacheWrite: 9, output: 27,
      offPeak: deepseekOffPeak, note: '高峰价；缓存写沿用未命中价',
    }))
    // 片段单独解析会被判「第一行不应有缩进」—— 这是设计：它是粘到 rules: 下面的一段
    assert.ok(parseYamlLite(snippet).issues.length > 0, '片段本身不是整份文档')
    const body = snippet.split('\n').filter((line) => line.trim() !== '')
    assert.ok(body[2].startsWith('  - provider:'), '第一条规则行按 2 空格缩进：' + body[2])
    for (const line of body.slice(2)) assert.ok(line.startsWith('  '), '规则行统一 2 空格缩进：' + line)

    // 粘到 rules: 下面之后必须能解析成一条完整规则（含错峰与备注）
    const merged = ['version: 1', "currency: 'CNY'", 'rules:', ...body].join('\n')
    const { root, issues } = parseYamlLite(merged)
    assert.deepEqual(issues, [], '粘进 rules 下不该有解析问题：' + JSON.stringify(issues))
    const nodes = ruleNodesOf(root)
    assert.equal(nodes.length, 1)
    assert.equal(yamlText(yamlField(nodes[0], 'note')), '高峰价；缓存写沿用未命中价')
    assert.equal(yamlItems(yamlField(yamlField(nodes[0], 'offPeak'), 'windows')).length, 4)
    assert.equal(yamlNumber(yamlField(nodes[0], 'input')), 9)

    const placeholder = buildRuleSnippetYaml(blankRule('CNY'), true)
    assert.ok(placeholder.includes('会把这批用量算成免费'), '占位片段必须警告四档为 0 的后果')
    assert.equal(parseYamlLite(['rules:', ...placeholder.split('\n').filter((line) => line.trim() !== '')].join('\n')).issues.length, 0)
  }

  // ===== 7. 表单校验：四档全 0 / 通道或模型为空都要拦住 =====
  {
    assert.ok(ruleProblemOf(rule({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0 })).includes('算成免费'))
    assert.ok(ruleProblemOf(rule({ provider: '  ' })).includes('通道 id'))
    assert.ok(ruleProblemOf(rule({ model: '' })).includes('模型 id'))
    assert.equal(ruleProblemOf(rule({})), null)
  }

  // ===== 8. 提示词：带目标文件路径与缺口模型清单，并要求核对官方价、不编造 =====
  {
    const prompt = buildAgentPrompt({
      filePath: 'C:\\Users\\me\\.dsh\\dsh-key-usage\\pricing-rules.yml',
      currency: 'CNY',
      rulesCount: 2,
      catalogEntries: 18,
      uncovered: [{ provider: 'my-local', model: 'qwen3', tokens: 1234, share: 1, estimated: true }],
    })
    assert.ok(prompt.includes('pricing-rules.yml'), '带目标文件绝对路径')
    assert.ok(prompt.includes('my-local | qwen3'), '带缺口模型清单')
    assert.ok(prompt.includes('官方定价页'), '要求核对官方价')
    assert.ok(prompt.includes('不要凭记忆或推测编造价格'), '明确不许编造价格')
  }

  // ===== 9. 内置价目匹配口径（与服务端 catalogRuleFor 一致） =====
  {
    const rules = catalog.rules
    assert.equal(catalogRuleFor(rules, 'deepseek-official', 'deepseek-flash').model, 'deepseek-flash')
    assert.equal(catalogRuleFor(rules, 'deepseek-official', 'DeepSeek-Flash').model, 'deepseek-flash', '忽略大小写')
    assert.equal(catalogRuleFor(rules, 'zai', 'glm-5.3').model, 'glm-5.3')
    assert.equal(catalogRuleFor(rules, 'zai', 'zai/glm-5.3').model, 'glm-5.3', '去 vendor/ 前缀')
    assert.equal(catalogRuleFor(rules, 'opencode-go', 'GLM-5.3-Flash'), null, '不做模糊匹配：通道不同就是没命中')
  }

  console.log('client-pricing.test: 全部通过')
}
