/**
 * 计费规则面板：并入「余额与配额」页下半部分（不新增 Tab），插件页卡片复用同一份。
 *
 * 层级：默认只显示一行摘要（依据 / 已省 / 口径 + 「配置规则」），细节全部收进抽屉。
 * 目的是让「这一格钱凭什么」一眼可读，同时把矛盾提示合并成一条带优先级的提示。
 * 规则本体存在宿主设置服务里，成本计算全在服务端（src/server/pricing.ts），界面不重复算。
 */
import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CURRENCY_OPTIONS, DAY_SCOPE_DAYS, DAY_SCOPE_LABELS, DAY_SCOPE_OPTIONS, EMPTY_CONFIG,
  UNIT_LABELS, UNIT_OPTIONS,
  blankRule, currencySymbolOf, dayScopeOf, offPeakWindowsText,
  parseImportedPricing, ruleKeyOf, ruleLabelOf, ruleProblemOf,
  type DayScope, type OffPeakWindow, type PricingConfig, type PricingRates, type PricingResponse, type PricingRule,
} from '../pricing.ts'
import type { PricingSettingsState, PricingSettingsStore } from '../pricingSettings.ts'
import { JSON_MIME, downloadFile, exportFileName, toJson } from '../export.ts'
import { fmtTokens } from '../format.ts'
import type { Channel, ModelAggregateRow, ModelsResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import pricingStyles from '../styles/pricing.module.css'
import exportStyles from '../styles/export.module.css'

/** 金额一律两位小数；服务端给的 4 位是计算精度，不是展示精度。 */
const AMOUNT_DIGITS = 2
/** 「最值得补规则」最多列几条 —— 多于一屏就失去「最值得」的意义。 */
const WORTH_RULE_LIMIT = 3

export function PricingRulesPanel(props: {
  settings: PricingSettingsStore
  state: PricingSettingsState
  pricing: PricingResponse | null
  channels: Channel[]
  models?: ModelsResponse | null
}): ReactNode {
  const { settings, state, pricing, channels } = props
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState<PricingRule | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [showAllSavings, setShowAllSavings] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const config = state.config
  const rules = config.rules
  const offPeakNowOf = (rule: PricingRule): boolean => {
    if (pricing === null) return false
    const index = rules.indexOf(rule)
    return index >= 0 && pricing.offPeakNow[index] === true
  }

  const templates = pricing?.templates ?? []
  // 内置官方价目：随插件发布、自动生效；这里只展示条数与来源，用户不需要也不能编辑它
  const catalog = pricing?.catalog ?? null
  const providerOptions = useMemo(() => channels.map((channel) => channel.provider), [channels])
  const modelOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const channel of channels) for (const model of channel.models) ids.add(model.id)
    for (const row of props.models?.rows ?? []) ids.add(row.model)
    return [...ids]
  }, [channels, props.models])

  const save = async (next: PricingConfig, done: string): Promise<void> => {
    const accepted = await settings.save(next)
    if (accepted) {
      setNotice(done)
      setDraft(null)
      setEditingKey(null)
      setEditorError(null)
    }
  }

  const startNew = (): void => {
    setDraft(blankRule(config))
    setEditingKey(null)
    setEditorError(null)
  }

  /** 「为它新增规则」：直接把 provider / model 预填进表单，省掉一次手抄。 */
  const startNewFor = (provider: string, model: string): void => {
    setDraft({ ...blankRule(config), provider, model })
    setEditingKey(null)
    setEditorError(null)
  }

  const startEdit = (rule: PricingRule): void => {
    setDraft(structuredClone(rule))
    setEditingKey(ruleKeyOf(rule))
    setEditorError(null)
  }

  const commitDraft = async (): Promise<void> => {
    if (draft === null) return
    const problem = ruleProblemOf(draft)
    if (problem !== null) {
      setEditorError(problem)
      return
    }
    const nextRules = [...rules]
    const editedIndex = editingKey === null ? -1 : nextRules.findIndex((rule) => ruleKeyOf(rule) === editingKey)
    const duplicateIndex = nextRules.findIndex((rule) => ruleKeyOf(rule) === ruleKeyOf(draft))
    if (editedIndex >= 0) {
      nextRules[editedIndex] = draft
      // 改了通道 / 模型等于改了主键：把同键的旧行删掉，避免留下两行同名规则
      if (duplicateIndex >= 0 && duplicateIndex !== editedIndex) nextRules.splice(duplicateIndex, 1)
    } else if (duplicateIndex >= 0) {
      nextRules[duplicateIndex] = draft
    } else {
      nextRules.push(draft)
    }
    await save({ ...config, rules: nextRules }, '规则已保存')
  }

  const removeRule = async (rule: PricingRule): Promise<void> => {
    await save(
      { ...config, rules: rules.filter((candidate) => candidate !== rule) },
      '规则已删除',
    )
  }

  const applyTemplate = async (): Promise<void> => {
    const template = templates.find((candidate) => candidate.id === templateId)
    if (template === undefined) return
    // 同键覆盖、新键追加：套用模板不会把已有的手工规则冲掉
    const nextRules = [...rules]
    for (const rule of template.rules) {
      const index = nextRules.findIndex((candidate) => ruleKeyOf(candidate) === ruleKeyOf(rule))
      if (index >= 0) nextRules[index] = rule
      else nextRules.push(rule)
    }
    await save({ ...config, rules: nextRules }, '已套用模板「' + template.label + '」，数值请自行核对')
  }

  const exportRules = (): void => {
    downloadFile(exportFileName('pricing-rules', 'json'), toJson(config), JSON_MIME)
  }

  const importRules = async (file: File): Promise<void> => {
    const parsed = parseImportedPricing(await file.text())
    if (parsed.config === null) {
      settings.noteError(parsed.error ?? '导入失败：文件内容无法识别')
      return
    }
    await save(parsed.config, '规则已导入（整份替换）')
  }

  const coverage = pricing?.coverage ?? null
  const savingsEntries = Object.entries(coverage?.savingsByCurrency ?? {}).filter(([, amount]) => amount > 0)
  const savingsDetail = coverage?.savingsDetail ?? []
  const visibleSavings = showAllSavings ? savingsDetail : savingsDetail.slice(0, 3)
  const ruleCostEntries = Object.entries(coverage?.ruleCostByCurrency ?? {}).filter(([, amount]) => amount > 0)
  const worthRules = worthRuleCandidates(props.models, rules)

  return (
    <div className={pricingStyles.panel}>
      <SummaryStrip
        coverage={coverage}
        rulesCount={rules.length}
        loading={state.status === 'loading'}
        savingsEntries={savingsEntries}
        expanded={expanded}
        onToggle={() => setExpanded((previous) => !previous)}
        showExplanation={showExplanation}
        onToggleExplanation={() => setShowExplanation((previous) => !previous)}
      />

      {showExplanation && <ExplanationBlock />}

      {expanded && (
        <div className={pricingStyles.drawer}>
          {/* 状态提示只渲染一条（优先级见 StatusNotice），不与「写入被拒绝」叠加 */}
          <StatusNotice state={state} />

          {notice !== null && <div className={pricingStyles.panelHint}>{notice}</div>}

          {ruleCostEntries.length > 0 && (
            <div className={pricingStyles.statStrip}>
              <div className={pricingStyles.statItem}>
                <div className={pricingStyles.statName}>按当前规则试算（近 30 天，仅参照）</div>
                <div className={pricingStyles.statNum}>
                  {ruleCostEntries.map(([currency, amount]) => moneyText(currency, amount)).join(' / ')}
                </div>
                <div className={pricingStyles.statNote}>
                  不是账单：实际成本按「官方 &gt; 规则 &gt; 官方价 &gt; 均价」逐格取值
                </div>
              </div>
            </div>
          )}

          {catalog !== null && catalog.entries > 0 && (
            <div className={pricingStyles.catalogNote}>
              已内置 <b>{String(catalog.entries)}</b> 条厂商官方价目，<b>无需套用模板即自动生效</b>
              （你的规则优先于它）。来源：
              {catalog.sources.map((entry, index) => (
                <span key={entry.source}>
                  {index > 0 && '；'}
                  <a className={pricingStyles.linkBtn} href={entry.source} target="_blank" rel="noreferrer">
                    {entry.providers.join(' / ')}
                  </a>
                  （{entry.count} 条，{entry.fetchedAt} 抓取）
                </span>
              ))}
            </div>
          )}

          <div className={pricingStyles.toolbar}>
            <select
              className={pricingStyles.actionBtn}
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
            >
              <option value="">选择厂商模板…</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
            </select>
            <button className={pricingStyles.actionBtn} disabled={templateId === ''} onClick={() => void applyTemplate()}>
              套用模板
            </button>
            <button className={pricingStyles.actionBtn + ' ' + pricingStyles.primary} onClick={startNew}>
              ＋ 新增规则
            </button>
            <span className={pricingStyles.toolbarSpacer} />
            <button className={pricingStyles.linkBtn} disabled={rules.length === 0} onClick={exportRules}>导出 JSON</button>
            <button className={pricingStyles.linkBtn} onClick={() => fileInput.current?.click()}>导入 JSON</button>
            <button
              className={pricingStyles.linkBtn}
              disabled={rules.length === 0}
              onClick={() => void save({ ...EMPTY_CONFIG, currency: config.currency }, '已清空规则：成本回到台账反推均价')}
            >
              清空规则
            </button>
            <input
              ref={fileInput}
              className={pricingStyles.hiddenFile}
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file !== undefined) void importRules(file)
              }}
            />
          </div>

          {rules.length === 0
            ? (
              <div className={pricingStyles.empty}>
                还没有规则。点「＋ 新增规则」手填，或从上方的厂商模板起步。
              </div>
            )
            : (
              <table className={pricingStyles.ruleTable}>
                <thead>
                  <tr>
                    <th>通道</th><th>模型</th><th>单位</th><th>输入</th><th>缓存读</th><th>缓存写</th><th>输出</th>
                    <th>币种</th><th>错峰</th><th>备注</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={ruleKeyOf(rule)} className={editingKey === ruleKeyOf(rule) ? pricingStyles.editing : ''}>
                      <td><span className={pricingStyles.ruleName}>{rule.provider}</span></td>
                      <td><span className={pricingStyles.ruleName}>{rule.model}</span></td>
                      <td>{UNIT_LABELS[rule.unit]}</td>
                      <td>{rule.input}</td>
                      <td>{rule.cacheRead}</td>
                      <td>{rule.cacheWrite}</td>
                      <td>{rule.output}</td>
                      <td>{rule.currency}</td>
                      <td>
                        {rule.offPeak === null
                          ? <span className={styles.dim}>—</span>
                          : (
                            <span title={offPeakTooltipOf(rule)}>
                              <span className={pricingStyles.ruleName}>{offPeakWindowsText(rule)}</span>
                              {offPeakNowOf(rule) && <span className={pricingStyles.offPeakChip}>错峰中</span>}
                            </span>
                          )}
                      </td>
                      <td className={pricingStyles.ruleNote}>
                        {rule.note === ''
                          ? <span className={styles.dim}>—</span>
                          : <span title={rule.note}>{rule.note}</span>}
                      </td>
                      <td>
                        <button className={pricingStyles.linkBtn} onClick={() => startEdit(rule)}>编辑</button>
                        <button className={pricingStyles.linkBtn} onClick={() => void removeRule(rule)}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          {draft !== null && (
            <RuleEditor
              draft={draft}
              onChange={setDraft}
              onCancel={() => { setDraft(null); setEditorError(null); setEditingKey(null) }}
              onSave={() => void commitDraft()}
              error={editorError}
              providerOptions={providerOptions}
              modelOptions={modelOptions}
            />
          )}

          {worthRules.length > 0 && (
            <div className={pricingStyles.sectionBlock}>
              <div className={pricingStyles.subLabel}>最值得补规则的模型</div>
              <div className={pricingStyles.panelHint}>
                这些模型要么按台账均价估算、要么没有任何价格依据，但用量占比最高 —— 给它们补规则最能提升准确度。
              </div>
              <ul className={pricingStyles.worthList}>
                {worthRules.map((candidate) => (
                  <li key={candidate.provider + '|' + candidate.model}>
                    <span className={pricingStyles.ruleName}>{candidate.model}</span>
                    <span className={styles.dim}> · {candidate.provider}</span>
                    <span className={pricingStyles.worthMeta}>
                      {fmtTokens(candidate.tokens)} tokens（{percentText(candidate.share)}）
                      {candidate.estimated ? ' · 现为估算' : ' · 无价格依据'}
                    </span>
                    <button
                      className={pricingStyles.linkBtn}
                      onClick={() => startNewFor(candidate.provider, candidate.model)}
                    >
                      为它新增规则
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {savingsDetail.length > 0 && (
            <div className={pricingStyles.sectionBlock}>
              <div className={pricingStyles.subLabel}>
                缓存命中省钱明细{coverage === null ? '' : '（' + coverage.from + ' 起）'}
              </div>
              <ul className={pricingStyles.savingsList}>
                {visibleSavings.map((entry) => (
                  <li key={entry.provider + '|' + entry.model}>
                    <span className={pricingStyles.ruleName}>{entry.model}</span>
                    <span className={styles.dim}> · {entry.provider}</span>
                    <span className={pricingStyles.worthMeta}>
                      命中缓存 {fmtTokens(entry.cacheReadTokens)} tokens
                    </span>
                    <span className={pricingStyles.saving}>
                      省 {moneyText(entry.currency, entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {savingsDetail.length > 3 && (
                <button className={pricingStyles.linkBtn} onClick={() => setShowAllSavings((previous) => !previous)}>
                  {showAllSavings ? '收起' : '展开全部（' + String(savingsDetail.length) + ' 条）'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 摘要行：默认收起的全部内容就这一行。
 * 「依据」用 /pricing 的 coverage 数模型个数，让用户一眼看出哪些模型可信、哪些只是估算。
 */
function SummaryStrip(props: {
  coverage: PricingResponse['coverage'] | null
  rulesCount: number
  loading: boolean
  savingsEntries: Array<[string, number]>
  expanded: boolean
  onToggle: () => void
  showExplanation: boolean
  onToggleExplanation: () => void
}): ReactNode {
  const { coverage } = props
  const days = coverage === null ? null : daysBetween(coverage.from, coverage.to)
  return (
    <div className={pricingStyles.summaryStrip}>
      <div className={pricingStyles.summaryBasis}>
        <div className={pricingStyles.summaryName}>这一格钱的依据</div>
        <div className={pricingStyles.summaryValue}>
          {coverage === null
            ? (props.loading ? '正在读取规则与覆盖度…' : '还没读到服务端覆盖度 —— 稍后自动重试')
            : <>
              官方账单 {days === null ? '—' : String(days)} 天 ·
              你的规则 {String(coverage.ruleModels)} 个模型 ·
              内置官方价 {String(coverage.catalogModels ?? 0)} 个模型 ·
              台账均价估算 {String(coverage.averagedModels)} 个模型
              {coverage.unpricedModels > 0 && ' · 无依据 ' + String(coverage.unpricedModels) + ' 个'}
            </>}
        </div>
      </div>

      <div className={pricingStyles.summarySaving}>
        <div className={pricingStyles.summaryName}>缓存命中已省</div>
        <div className={pricingStyles.summaryValue + (props.savingsEntries.length > 0 ? ' ' + pricingStyles.saving : '')}>
          {props.savingsEntries.length === 0
            ? '—'
            : props.savingsEntries.map(([currency, amount]) => moneyText(currency, amount)).join(' / ')}
        </div>
      </div>

      <div className={pricingStyles.summaryActions}>
        <button
          className={pricingStyles.infoBtn + (props.showExplanation ? ' ' + pricingStyles.infoBtnActive : '')}
          title="来源角标、单位、错峰与多币种口径"
          onClick={props.onToggleExplanation}
        >
          ⓘ
        </button>
        <button className={pricingStyles.actionBtn + ' ' + pricingStyles.primary} onClick={props.onToggle}>
          {props.expanded ? '收起规则 ◂' : '配置规则 ▸'}
        </button>
      </div>
    </div>
  )
}

/** 完整口径说明：默认不占正文，点 ⓘ 才出现。 */
function ExplanationBlock(): ReactNode {
  return (
    <div className={pricingStyles.explanation}>
      <div className={pricingStyles.explanationTitle}>口径说明</div>
      <ul className={pricingStyles.explanationList}>
        <li><b>官方</b>：台账记录的厂商账单金额，是既成事实，不会被规则覆盖。</li>
        <li><b>自定</b>：按你填的规则算出，匹配顺序 精确 → 通道通配 → 模型通配 → 全通配。</li>
        <li><b>官方价</b>：按插件<b>内置的厂商官方价目</b>算出（自动生效，无需套用模板）；你的规则优先于它。匹配只做精确 / 忽略大小写 / 去 <code>vendor/</code> 前缀，不做模糊匹配。</li>
        <li><b>估算</b>：按台账反推的均价推算，仅供参照，不是账单。</li>
        <li><b>—</b>：没有价格依据（规则与内置价目都没命中，台账也没有成本数据）。</li>
        <li>单位与按次计费：规则里显式声明「每百万 / 每千 tokens / 每次调用」；按次计费只用「输入」档当每次调用价。</li>
        <li>错峰：窗口按<b>本地时间</b>判断，起止相同表示全天，<code>from</code> 大于 <code>to</code> 表示跨午夜；每个窗口可按<b>每天 / 仅工作日 / 仅周末</b>限定生效的星期（不选即每天）。跨天范围拿不到小时分布，按标准价算。</li>
        <li>多币种不换算、不合计：规则与内置价目各按文档原币种算（DeepSeek 取中文文档的 CNY，Kimi 为 CNY，OpenRouter / Z.ai 为 USD），金额按币种分行显示。</li>
        <li>规则存在宿主设置服务里（命名空间 <code>dsh-key-usage</code>），插件不写任何文件。</li>
      </ul>
    </div>
  )
}

/**
 * 状态提示：优先级从高到低只渲染一条，避免「写入被拒绝」和「无法保存」同时出现。
 * 1) 命名空间不可写 / 取不到配置表单服务 —— 规则根本存不下去，说清楚「重启 DSH 后可用」；
 * 2) 刚发生的写入失败（如乐观锁冲突）—— 可重试；
 * 3) 正常 —— 不显示任何提示。
 */
function StatusNotice(props: { state: PricingSettingsState }): ReactNode {
  const { state } = props
  if (state.status === 'unavailable' || (state.status === 'ready' && !state.writable)) {
    return (
      <div className={pricingStyles.warning}>
        规则暂不可编辑：宿主还没加载本插件的配置（<b>重启 DSH 后可用</b>）；现在仍可导入 / 导出 JSON。
      </div>
    )
  }
  if (state.error !== null) {
    return <div className={pricingStyles.error}>保存失败：{state.error}，可重试</div>
  }
  return null
}

/** 两位小数 + 币种符号；未知币种保留代码前缀，避免把 USD 当 CNY 渲染。 */
function moneyText(currency: string, amount: number): string {
  return currencySymbolOf(currency) + amount.toFixed(AMOUNT_DIGITS)
}

function percentText(share: number): string {
  return (share * 100).toFixed(1) + '%'
}

/** 覆盖区间的自然天数（含首尾），用作「官方账单 X 天」的口径。 */
function daysBetween(from: string, to: string): number | null {
  const start = new Date(from + 'T00:00:00').getTime()
  const end = new Date(to + 'T00:00:00').getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.round((end - start) / 86400000) + 1
}

/** 错峰说明进 tooltip：规则表因此不被一整列文字撑开。 */
function offPeakTooltipOf(rule: PricingRule): string {
  const windows = offPeakWindowsText(rule)
  if (rule.offPeak === null) return windows
  const peak = '标准价 ' + String(rule.input) + ' / ' + String(rule.cacheRead) + ' / ' + String(rule.cacheWrite) + ' / ' + String(rule.output)
  const offPeak = '错峰价 ' + String(rule.offPeak.input) + ' / ' + String(rule.offPeak.cacheRead) + ' / ' + String(rule.offPeak.cacheWrite) + ' / ' + String(rule.offPeak.output)
  return '错峰时段（本地时间，跨午夜用 from > to 表示；括号内是生效的星期）：' + windows + '\n' + peak + '\n' + offPeak
    + '\n四档顺序：输入 / 缓存读 / 缓存写 / 输出'
}

interface WorthRuleCandidate {
  provider: string
  model: string
  tokens: number
  share: number
  /** true = 台账反推均价在兜底（估算）；false = 完全无价格依据。 */
  estimated: boolean
}

/**
 * 「最值得补规则」的判定：先筛出**没有价格依据**的模型，再按近 30 天 tokens 占比倒序取前 3。
 * 「没有价格依据」用两处数据交叉确认：/pricing 的 coverage 计数只给总数，
 * 逐模型是否命中则用 /models 的 costSource —— 它正是成本单元格上那个角标，口径一致。
 * `catalog`（内置官方价目）已有官方价，不算缺口，因此不列入候选。
 */
function worthRuleCandidates(
  models: ModelsResponse | null | undefined,
  rules: PricingRule[],
): WorthRuleCandidate[] {
  const rows: ModelAggregateRow[] = (models?.rows ?? []).filter((row) => row.tokens > 0)
  if (rows.length === 0) return []
  const unpriced = rows.filter((row) => {
    if (row.costSource === 'rule' || row.costSource === 'official' || row.costSource === 'catalog') return false
    // costSource 缺失（旧响应 / 未标注）时退回本地匹配，避免整块不显示
    return row.costSource === 'estimate' || row.costSource === 'none' || !matchesAnyRule(rules, row.provider, row.model)
  })
  const total = unpriced.reduce((sum, row) => sum + row.tokens, 0)
  if (total <= 0) return []
  return unpriced
    .map((row) => ({
      provider: row.provider,
      model: row.model,
      tokens: row.tokens,
      share: row.tokens / total,
      // 只有明确标了「估算」才算均价兜底；角标缺失时按「无依据」说，不替服务端下结论
      estimated: row.costSource === 'estimate',
    }))
    .sort((first, second) => second.tokens - first.tokens)
    .slice(0, WORTH_RULE_LIMIT)
}

/** 与服务端 matchPricingRule 同序的粗判：精确 → 通道通配 → 模型通配 → 全通配。 */
function matchesAnyRule(rules: PricingRule[], provider: string, model: string): boolean {
  const patterns = [
    (rule: PricingRule) => rule.provider === provider && rule.model === model,
    (rule: PricingRule) => rule.provider === provider && rule.model === '*',
    (rule: PricingRule) => rule.provider === '*' && rule.model === model,
    (rule: PricingRule) => rule.provider === '*' && rule.model === '*',
  ]
  return patterns.some((matches) => rules.some(matches))
}

/** 单条规则的编辑器：单位换算、错峰窗口都在这里显式呈现，避免「按千 / 按百万」填错 1000 倍。 */
function RuleEditor(props: {
  draft: PricingRule
  onChange: (rule: PricingRule) => void
  onCancel: () => void
  onSave: () => void
  error: string | null
  providerOptions: string[]
  modelOptions: string[]
}): ReactNode {
  const { draft, onChange } = props
  const numberField = (
    label: string,
    key: 'input' | 'cacheRead' | 'cacheWrite' | 'output',
    value: number,
    extra?: { onChange?: (value: number) => void },
  ): ReactNode => (
    <div className={pricingStyles.field} key={label}>
      <label>{label}</label>
      <input
        type="number"
        min={0}
        step="any"
        value={String(value)}
        onChange={(event) => {
          const next = Number(event.target.value)
          const safe = Number.isFinite(next) && next >= 0 ? next : 0
          if (extra?.onChange !== undefined) extra.onChange(safe)
          else onChange({ ...draft, [key]: safe })
        }}
      />
    </div>
  )

  const windows = draft.offPeak?.windows ?? []
  const setWindows = (next: OffPeakWindow[]): void => {
    if (next.length === 0) {
      onChange({ ...draft, offPeak: null })
      return
    }
    onChange({
      ...draft,
      offPeak: {
        windows: next,
        input: draft.offPeak?.input ?? draft.input,
        cacheRead: draft.offPeak?.cacheRead ?? draft.cacheRead,
        cacheWrite: draft.offPeak?.cacheWrite ?? draft.cacheWrite,
        output: draft.offPeak?.output ?? draft.output,
      },
    })
  }

  return (
    <div className={pricingStyles.editor}>
      <div className={pricingStyles.editorGrid}>
        <div className={pricingStyles.field}>
          <label>通道 id（* = 任意通道）</label>
          <input list="dsh-ku-providers" value={draft.provider} onChange={(event) => onChange({ ...draft, provider: event.target.value })} />
          <datalist id="dsh-ku-providers">
            {props.providerOptions.map((provider) => <option key={provider} value={provider} />)}
          </datalist>
        </div>
        <div className={pricingStyles.field}>
          <label>模型 id（* = 该通道全部）</label>
          <input list="dsh-ku-models" value={draft.model} onChange={(event) => onChange({ ...draft, model: event.target.value })} />
          <datalist id="dsh-ku-models">
            {props.modelOptions.map((model) => <option key={model} value={model} />)}
          </datalist>
        </div>
        <div className={pricingStyles.field}>
          <label>计价单位</label>
          <select value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value as PricingRule['unit'] })}>
            {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>)}
          </select>
        </div>
        <div className={pricingStyles.field}>
          <label>币种</label>
          <select value={draft.currency} onChange={(event) => onChange({ ...draft, currency: event.target.value })}>
            {CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
        </div>
        {numberField('输入（未命中缓存）', 'input', draft.input)}
        {numberField('缓存读（命中）', 'cacheRead', draft.cacheRead)}
        {numberField('缓存写', 'cacheWrite', draft.cacheWrite)}
        {numberField('输出', 'output', draft.output)}
        <div className={pricingStyles.field + ' ' + pricingStyles.fieldWide}>
          <label>备注（建议写价目来源与日期）</label>
          <input value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} />
        </div>
      </div>

      <div className={pricingStyles.subLabel}>错峰时段（本地时间；留空表示没有错峰价）</div>
      {windows.map((window, index) => (
        <div className={pricingStyles.windowRow} key={index}>
          <input
            value={window.from}
            placeholder="00:00"
            onChange={(event) => setWindows(windows.map((candidate, position) => position === index ? { ...candidate, from: event.target.value } : candidate))}
          />
          <span className={styles.dim}>至</span>
          <input
            value={window.to}
            placeholder="09:00"
            onChange={(event) => setWindows(windows.map((candidate, position) => position === index ? { ...candidate, to: event.target.value } : candidate))}
          />
          {/* 三选一只改 days：改时间不碰它，避免手填的星期组合被顺手抹掉 */}
          <select
            value={dayScopeOf(window.days)}
            onChange={(event) => setWindows(windows.map((candidate, position) => (
              position === index ? withDayScope(candidate, event.target.value as DayScope) : candidate
            )))}
          >
            {DAY_SCOPE_OPTIONS.map((scope) => (
              <option key={scope} value={scope}>{DAY_SCOPE_LABELS[scope]}</option>
            ))}
          </select>
          <button className={pricingStyles.linkBtn} onClick={() => setWindows(windows.filter((_, position) => position !== index))}>移除</button>
        </div>
      ))}
      <button className={pricingStyles.actionBtn} onClick={() => setWindows([...windows, { from: '00:00', to: '08:00' }])}>+ 加时间窗</button>

      {draft.offPeak !== null && (
        <>
          <div className={pricingStyles.subLabel}>错峰价（留空即与标准价相同）</div>
          <div className={pricingStyles.editorGrid}>
            {numberField('错峰输入', 'input', draft.offPeak.input, { onChange: (value) => patchOffPeak(draft, onChange, { input: value }) })}
            {numberField('错峰缓存读', 'cacheRead', draft.offPeak.cacheRead, { onChange: (value) => patchOffPeak(draft, onChange, { cacheRead: value }) })}
            {numberField('错峰缓存写', 'cacheWrite', draft.offPeak.cacheWrite, { onChange: (value) => patchOffPeak(draft, onChange, { cacheWrite: value }) })}
            {numberField('错峰输出', 'output', draft.offPeak.output, { onChange: (value) => patchOffPeak(draft, onChange, { output: value }) })}
          </div>
        </>
      )}

      {props.error !== null && <div className={pricingStyles.editorError}>{props.error}</div>}
      <div className={pricingStyles.editorHint}>
        正在编辑：{ruleLabelOf(draft)} · 单位 {UNIT_LABELS[draft.unit]}
      </div>
      <div className={pricingStyles.editorActions}>
        <button className={pricingStyles.actionBtn + ' ' + pricingStyles.primary} onClick={props.onSave}>保存规则</button>
        <button className={pricingStyles.actionBtn} onClick={props.onCancel}>取消</button>
      </div>
    </div>
  )
}

function patchOffPeak(draft: PricingRule, onChange: (rule: PricingRule) => void, patch: Partial<PricingRates>): void {
  if (draft.offPeak === null) return
  onChange({ ...draft, offPeak: { ...draft.offPeak, ...patch } })
}

/**
 * 单个窗口的星期范围：三选一直接改写 `days`。
 * 「每天」删掉该字段（而不是写 [1..7]），这样升级前保存的规则往返后字节一致；
 * 手改 JSON 得到的自定义组合在下拉里显示为「每天」，但只要用户不碰这个下拉，原值原样保留。
 */
function withDayScope(window: OffPeakWindow, scope: DayScope): OffPeakWindow {
  const days = DAY_SCOPE_DAYS[scope]
  if (days === undefined) {
    const { from, to } = window
    return { from, to }
  }
  return { ...window, days: [...days] }
}
