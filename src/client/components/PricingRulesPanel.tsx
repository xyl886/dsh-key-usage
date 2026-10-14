/**
 * 计费规则面板：并入「余额与配额」页下半部分（不新增 Tab）。
 *
 * 层级：默认只显示一行摘要（依据 / 已省 / 口径 + 「配置规则」），细节全部收进抽屉。
 *
 * 事实来源是用户的 `pricing-rules.yml`：面板保存走 `POST /pricing/rules` 整批提交（服务端按
 * provider|model 继承旧条目的 unit / offPeak / note），保存后由页面重取 `/pricing` 与用量。
 * 表单只编辑 通道 / 模型 / 币种 / 四档单价 五个字段；unit / offPeak / note 只在 YAML 里维护，
 * 界面上必须明示这一点（见 FORM_EXTRAS_HINT），否则用户会以为保存把它们清掉了。
 * 规则列表上方的通道过滤只影响展示 —— 保存永远提交全部规则（包括被过滤掉的那些）。
 */
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import {
  CURRENCY_OPTIONS, FORM_EXTRAS_HINT, FORM_KEY_CHANGE_HINT, LITELLM_REPO_URL, RULES_ORIGIN_TEXT,
  UNIT_LABELS, aggregateLoadedLabelOf, blankRule, buildAgentPrompt, buildRuleSnippetYaml,
  buildRulesTemplateYaml, catalogStaleDays, fetchedDaysAgo, fileSafeOf, hostOf, localTimeTextOf,
  megabytesTextOf, moneyTextOf, offPeakWindowsText, ruleExtrasTextOf, ruleKeyOf, ruleLabelOf,
  ruleProblemOf, shortCommitOf, submittableRuleOf, unpricedModelsOf,
  type AggregateIssue, type CatalogSummary, type ModelPriceAggregate, type PricingRefreshResult,
  type PricingResponse, type PricingRule, type UnpricedModel,
} from '../pricing.ts'
import {
  MODEL_PRICE_REFRESH_PATH, PRICING_RULES_PATH, failureReasonOf, refreshModelPrices, savePricingRules,
} from '../api.ts'
import { TEXT_MIME, YAML_MIME, downloadFile, exportFileName } from '../export.ts'
import { fmtTokens } from '../format.ts'
import type { Channel, ModelsResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import pricingStyles from '../styles/pricing.module.css'

/** 解析问题默认只列几条：一屏列不完的清单没人读，展开再看全部。 */
const ISSUE_LIMIT = 5

/** 缺口模型列表默认列几条（按 tokens 倒序），其余折叠。 */
const MODEL_LIST_LIMIT = 8

/** 复制到剪贴板；拿不到剪贴板权限时返回 false，由调用方提示改用「下载」。 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard === undefined) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function PricingRulesPanel(props: {
  pricing: PricingResponse | null
  channels: Channel[]
  models?: ModelsResponse | null
  /** 保存成功后通知页面重取 /pricing 与用量（成本在服务端按规则算，必须整体刷新）。 */
  onSaved: () => void
}): ReactNode {
  const { pricing, channels } = props
  // 抽屉 / datalist 的 id 逐实例唯一：同一面板在两个容器里同时渲染时写死字符串会撞 id，
  // aria-controls 会指到另一个实例上。
  const instanceId = useId()
  const drawerId = instanceId + '-drawer'
  const providersListId = instanceId + '-providers'
  const modelsListId = instanceId + '-models'

  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState<PricingRule | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAllSavings, setShowAllSavings] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showAllIssues, setShowAllIssues] = useState(false)
  const [showAllModels, setShowAllModels] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [refreshingPrices, setRefreshingPrices] = useState(false)
  const [refreshElapsedSeconds, setRefreshElapsedSeconds] = useState(0)
  const [refreshStatus, setRefreshStatus] = useState<PriceRefreshStatus | null>(null)
  /** null = 不过滤（显示全部通道）；数组 = 只显示这些通道的规则。 */
  const [providerFilter, setProviderFilter] = useState<string[] | null>(null)
  /** 默认过滤只设一次初值，之后完全交给用户点的芯片（否则用户取消过滤会被再次覆盖）。 */
  const [filterInitialized, setFilterInitialized] = useState(false)

  const rules = pricing?.rules ?? []
  const catalog: CatalogSummary | null = pricing?.catalog ?? null
  const files = pricing?.files
  const issues = pricing?.issues ?? []
  const currency = pricing?.currency ?? 'CNY'
  // 服务端没升级时整块缺省：按「读不到聚合价目」降级，不影响其余功能
  const aggregate: ModelPriceAggregate | null = pricing?.aggregate ?? null

  // 超过阈值就改成警示样式并提示复核：价目是静态数据，厂商调价后只能人工更新
  const catalogStale = catalog === null ? null : catalogStaleDays(catalog.sources)
  const providerOptions = useMemo(() => channels.map((channel) => channel.provider), [channels])
  const modelOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const channel of channels) for (const model of channel.models) ids.add(model.id)
    for (const row of props.models?.rows ?? []) ids.add(row.model)
    return [...ids]
  }, [channels, props.models])

  /** 「你的通道」= cordis.yml 里配置过的 provider；内置价目的来源按它折叠无关项。 */
  const usedProviders = useMemo(() => new Set(channels.map((channel) => channel.provider)), [channels])
  const catalogRules = catalog?.rules ?? []
  const relatedCatalogCount = catalogRules.filter((rule) => rule.provider === '*' || usedProviders.has(rule.provider)).length
  const visibleSources = (catalog?.sources ?? []).filter(
    (entry) => entry.providers.some((provider) => usedProviders.has(provider)),
  )

  /** 过滤只影响展示：成本照旧按完整规则与内置价目算，保存也提交全部规则。 */
  const visibleRules = providerFilter === null
    ? rules
    : rules.filter((rule) => providerFilter.includes(rule.provider))
  const hiddenRulesCount = rules.length - visibleRules.length

  const uncovered = useMemo(
    () => unpricedModelsOf(props.models?.rows ?? [], rules, catalogRules),
    [props.models, rules, catalogRules],
  )
  const shownUncovered = showAllModels ? uncovered : uncovered.slice(0, MODEL_LIST_LIMIT)

  const providerChips = useMemo(() => chipEntriesOf(rules, channels), [rules, channels])
  const channelLabelOf = (provider: string): string =>
    channels.find((channel) => channel.provider === provider)?.displayName ?? provider

  /**
   * 默认只显示「你的通道」：未配置通道的规则（通道被删掉或改过名）要主动点「显示全部」才看得到。
   * `*` 通配规则对任何通道都生效，因此始终算在默认可见里；channels 是异步到的，所以到齐后才设初值。
   */
  useEffect(() => {
    if (filterInitialized || providerChips.length === 0) return
    setFilterInitialized(true)
    const initial = providerChips
      .filter((chip) => chip.provider === '*' || usedProviders.has(chip.provider))
      .map((chip) => chip.provider)
    if (initial.length < providerChips.length) setProviderFilter(initial)
  }, [filterInitialized, providerChips, usedProviders])

  const maybeRefreshNotice = (message: string): void => {
    setNotice(message)
    setSaveError(null)
  }

  // 刷新期间每秒推进一次「已等 N 秒」：20 秒的超时窗口里用户得看到它在跑，否则会以为界面卡死
  useEffect(() => {
    if (!refreshingPrices) return
    const timer = setInterval(() => setRefreshElapsedSeconds((previous) => previous + 1), 1000)
    return () => clearInterval(timer)
  }, [refreshingPrices])

  /**
   * 「刷新价目」：全插件唯一会联网的用户动作（服务端去上游拉 JSON 并写到本机）。
   * 成功 / 失败都留在面板上（`aria-live` 播报），成功后再走一次 `onSaved` 让页面重取
   * `/pricing` 与用量 —— 价目换了一份，成本口径整体都变了。
   */
  const refreshPrices = async (): Promise<void> => {
    if (refreshingPrices) return
    setRefreshingPrices(true)
    setRefreshElapsedSeconds(0)
    setRefreshStatus(null)
    const outcome = await refreshModelPrices()
    setRefreshingPrices(false)
    if (outcome === null) {
      setRefreshStatus({
        tone: 'bad',
        text: '刷新失败：' + (failureReasonOf(MODEL_PRICE_REFRESH_PATH) ?? '没拿到服务端响应'),
      })
      return
    }
    if (!outcome.ok) {
      setRefreshStatus({ tone: 'bad', text: '刷新失败：' + outcome.error })
      return
    }
    setRefreshStatus({ tone: 'ok', text: modelPriceRefreshTextOf(outcome) })
    props.onSaved()
  }

  /**
   * 唯一的写盘入口：整批提交。
   * 传进来的 `nextRules` 必须是**全部**规则（不是过滤后的子集），删除靠「不在列表里」表达。
   */
  const submit = async (nextRules: PricingRule[], doneText: string): Promise<void> => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    const result = await savePricingRules(nextRules.map(submittableRuleOf))
    setSaving(false)
    if (result === null) {
      setSaveError(failureReasonOf(PRICING_RULES_PATH) ?? '保存请求失败：没拿到服务端响应')
      return
    }
    if (!result.ok) {
      setSaveError(result.error)
      return
    }
    const issueCount = (result.issues ?? []).length
    setNotice(doneText + '：已写入 ' + result.path + '（' + String(result.entries) + ' 条）'
      + (issueCount > 0 ? '；文件里还有 ' + String(issueCount) + ' 处解析问题，见下方列表' : ''))
    setDraft(null)
    setEditingKey(null)
    setEditorError(null)
    props.onSaved()
  }

  const startNew = (): void => {
    setDraft(blankRule(currency))
    setEditingKey(null)
    setEditorError(null)
  }

  const startEdit = (rule: PricingRule): void => {
    // 整条克隆：表单不渲染 unit / offPeak / note，但草稿带着它们，列表与提示里仍要显示
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
    await submit(nextRules, editingKey === null ? '规则已新增' : '规则已保存')
  }

  const removeRule = async (rule: PricingRule): Promise<void> => {
    await submit(rules.filter((candidate) => candidate !== rule), '规则已删除')
  }

  const clearRules = async (): Promise<void> => {
    if (!window.confirm('清空后规则条目会从 YAML 文件里删除，成本回到内置官方价目与台账均价。确定清空吗？')) return
    await submit([], '已清空规则')
  }

  /** 「下载规则模板」：内置价目 ∩ 你实际用到的模型（价格预填）+ 缺价格依据的模型（注释占位待填）。 */
  const downloadTemplate = (): void => {
    const usedModels = (props.models?.rows ?? [])
      .filter((row) => row.tokens > 0)
      .map((row) => ({ provider: row.provider, model: row.model }))
    const template = buildRulesTemplateYaml(catalog, usedModels, rules, uncovered, currency)
    downloadFile(exportFileName('pricing-template', 'yml'), template.text, YAML_MIME)
    maybeRefreshNotice('模板已下载：按内置价目预填 ' + String(template.prefilledCount) + ' 条（只含你用到的模型）'
      + (template.pendingCount > 0
        ? '，另有 ' + String(template.pendingCount) + ' 个缺价格依据的模型以注释占位 —— 填好后删掉行首的「# 」'
        : ''))
  }

  const snippetOf = (rule: PricingRule, placeholder: boolean): string => buildRuleSnippetYaml(rule, placeholder)

  const ruleForModel = (model: UnpricedModel): PricingRule => ({
    ...blankRule(currency), provider: model.provider, model: model.model,
  })

  const downloadSnippet = (rule: PricingRule, placeholder: boolean, label: string): void => {
    downloadFile(exportFileName('pricing-rule-' + fileSafeOf(rule.provider + '-' + rule.model), 'yml'),
      snippetOf(rule, placeholder), YAML_MIME)
    maybeRefreshNotice('已下载片段：' + label + '（粘到规则文件的 rules: 下面即可）')
  }

  const copySnippet = async (rule: PricingRule, placeholder: boolean, label: string): Promise<void> => {
    const copied = await copyText(snippetOf(rule, placeholder))
    maybeRefreshNotice(copied
      ? '已复制片段：' + label
      : '复制失败：浏览器没有把剪贴板权限给这个页面，请改用「下载片段」')
  }

  const promptText = buildAgentPrompt({
    filePath: files?.user.path ?? null,
    currency,
    rulesCount: rules.length,
    catalogEntries: catalog?.entries ?? 0,
    uncovered,
  })

  const copyPrompt = async (): Promise<void> => {
    const copied = await copyText(promptText)
    maybeRefreshNotice(copied
      ? '提示词已复制：粘给 DSH 即可（里面带着目标文件路径与 ' + String(uncovered.length) + ' 个缺口模型）'
      : '复制失败：浏览器没有把剪贴板权限给这个页面，请改用「下载提示词」')
  }

  const coverage = pricing?.coverage ?? null
  const savingsEntries = Object.entries(coverage?.savingsByCurrency ?? {}).filter(([, amount]) => amount > 0)
  const savingsDetail = coverage?.savingsDetail ?? []
  const visibleSavings = showAllSavings ? savingsDetail : savingsDetail.slice(0, 3)
  const ruleCostEntries = Object.entries(coverage?.ruleCostByCurrency ?? {}).filter(([, amount]) => amount > 0)
  const shownIssues = showAllIssues ? issues : issues.slice(0, ISSUE_LIMIT)

  return (
    <div className={pricingStyles.panel}>
      <SummaryStrip
        coverage={coverage}
        rulesCount={rules.length}
        loading={pricing === null}
        savingsEntries={savingsEntries}
        expanded={expanded}
        onToggle={() => setExpanded((previous) => !previous)}
        drawerId={drawerId}
        showExplanation={showExplanation}
        onToggleExplanation={() => setShowExplanation((previous) => !previous)}
      />

      {showExplanation && <ExplanationBlock />}

      {expanded && (
        <div className={pricingStyles.drawer} id={drawerId}>
          {pricing !== null && pricing.rulesOrigin !== 'file' && (
            <div className={pricingStyles.warning}>{RULES_ORIGIN_TEXT[pricing.rulesOrigin]}</div>
          )}
          {pricing !== null && !pricing.writable && (
            <div className={pricingStyles.warning}>
              服务端拒绝写盘（只接受本机回环请求）：规则暂时只能在 YAML 文件里手改，改完刷新页面即生效。
            </div>
          )}
          {saveError !== null && <div className={pricingStyles.error}>保存失败：{saveError}</div>}
          {notice !== null && <div className={pricingStyles.panelHint}>{notice}</div>}

          {/* 手写 YAML 之后的唯一自查入口：文件位置 + 解析问题（带行号） */}
          {files !== undefined && (
            <div className={pricingStyles.fileLine}>
              <span>
                用户规则 <code className={pricingStyles.pathText}>{files.user.path}</code>
                {files.user.exists
                  ? '（' + String(files.user.entries) + ' 条）'
                  : '（还没有这个文件，面板保存后会创建）'}
              </span>
              <span>
                内置价目 <code className={pricingStyles.pathText}>{files.catalog.path}</code>
                {files.catalog.exists ? '（' + String(files.catalog.entries) + ' 条）' : '（读不到，成本会缺一层依据）'}
              </span>
            </div>
          )}

          {issues.length > 0 && (
            <div className={pricingStyles.issueBlock}>
              <div className={pricingStyles.issueHead}>
                <b>{String(issues.length)} 处 YAML 解析问题</b>
                <span className={pricingStyles.issueNote}>
                  —— 这些问题所在的条目已被跳过，成本按内置价目 / 台账均价算
                </span>
                {issues.length > ISSUE_LIMIT && (
                  <button
                    className={pricingStyles.linkBtn}
                    aria-expanded={showAllIssues}
                    onClick={() => setShowAllIssues((previous) => !previous)}
                  >
                    {showAllIssues ? '收起' : '展开全部（' + String(issues.length) + ' 条）'}
                  </button>
                )}
              </div>
              <ul className={pricingStyles.issueList}>
                {shownIssues.map((issue, index) => (
                  <li key={issue.file + '|' + String(issue.line) + '|' + String(index)}>
                    <span className={pricingStyles.issueWhere}>
                      {issue.file === 'user' ? '用户规则' : '内置价目'}
                      {issue.line === null ? '' : ' 第 ' + String(issue.line) + ' 行'}
                    </span>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ruleCostEntries.length > 0 && (
            <div className={pricingStyles.statStrip}>
              <div className={pricingStyles.statItem}>
                <div className={pricingStyles.statName}>按当前规则试算（近 30 天，仅参照）</div>
                <div className={pricingStyles.statNum}>
                  {ruleCostEntries.map(([ruleCurrency, amount]) => moneyTextOf(ruleCurrency, amount)).join(' / ')}
                </div>
                <div className={pricingStyles.statNote}>
                  不是账单：实际成本按「官方 &gt; 规则 &gt; 官方价 &gt; 均价」逐格取值
                </div>
              </div>
            </div>
          )}

          {catalog !== null && catalog.entries > 0 && (
            <div className={pricingStyles.catalogNote + (catalogStale === null ? '' : ' ' + pricingStyles.catalogStale)}>
              已内置 <b>{String(catalog.entries)}</b> 条厂商官方价目，<b>自动生效，不需要你维护</b>
              （你的规则优先于它）
              {catalogRules.length > 0 && relatedCatalogCount < catalogRules.length && (
                <>，其中 <b>{String(relatedCatalogCount)}</b> 条属于你的通道</>
              )}
              。来源：
              {visibleSources.map((entry, index) => {
                const daysAgo = fetchedDaysAgo(entry.fetchedAt)
                return (
                  <span key={entry.source}>
                    {index > 0 && '；'}
                    <a className={pricingStyles.linkBtn} href={entry.source} target="_blank" rel="noreferrer">
                      {entry.providers.join(' / ')}
                    </a>
                    （{entry.count} 条，{entry.fetchedAt} 抓取{daysAgo === null ? '' : '，距今 ' + String(daysAgo) + ' 天'}）
                  </span>
                )
              })}
              {visibleSources.length < catalog.sources.length && '　其余来源属于未配置的通道，已折叠。'}
              {catalogStale !== null && (
                <>　<b>价目最新一次抓取距今 {String(catalogStale)} 天，建议按官方文档复核价目。</b></>
              )}
            </div>
          )}

          <AggregateSourceBlock
            aggregate={aggregate}
            loading={pricing === null}
            refreshing={refreshingPrices}
            elapsedSeconds={refreshElapsedSeconds}
            status={refreshStatus}
            onRefresh={() => void refreshPrices()}
          />

          <div className={pricingStyles.toolbar}>
            <button
              className={pricingStyles.actionBtn}
              disabled={pricing === null}
              title={props.models == null
                ? '还没读到按模型用量：模板里只会给字段说明与空 rules'
                : '按内置价目预填你实际用到的模型，并把缺价格依据的模型注释占位'}
              onClick={downloadTemplate}
            >
              下载规则模板
            </button>
            <button className={pricingStyles.actionBtn + ' ' + pricingStyles.primary} disabled={saving} onClick={startNew}>
              ＋ 新增规则
            </button>
            <button
              className={pricingStyles.actionBtn}
              aria-expanded={showPrompt}
              title="生成一段可以直接交给 DSH 的提示词：带上这个文件的路径与缺价格依据的模型"
              onClick={() => setShowPrompt((previous) => !previous)}
            >
              让 DSH 帮我配
            </button>
            <span className={pricingStyles.toolbarSpacer} />
            <button
              className={pricingStyles.linkBtn}
              disabled={rules.length === 0 || saving}
              onClick={() => void clearRules()}
            >
              清空规则
            </button>
          </div>

          {showPrompt && (
            <div className={pricingStyles.promptBlock}>
              <div className={pricingStyles.promptHead}>
                把这段提示词交给 DSH（也可以复制给别的 agent）：它会按下面这个路径直接改 YAML，
                去厂商官方定价页核对价格 —— 改完刷新本页面即生效。
              </div>
              <div className={pricingStyles.promptActions}>
                <button className={pricingStyles.actionBtn + ' ' + pricingStyles.primary} onClick={() => void copyPrompt()}>
                  复制提示词
                </button>
                <button
                  className={pricingStyles.actionBtn}
                  onClick={() => {
                    downloadFile(exportFileName('pricing-agent-prompt', 'txt'), promptText, TEXT_MIME)
                    maybeRefreshNotice('提示词已下载（.txt）')
                  }}
                >
                  下载提示词
                </button>
                <span className={pricingStyles.panelHint}>
                  缺口模型 {String(uncovered.length)} 个
                  {files === undefined ? '' : '；目标文件 ' + files.user.path}
                </span>
              </div>
              <pre className={pricingStyles.promptText}>{promptText}</pre>
            </div>
          )}

          {rules.length > 0 && (
            <div className={pricingStyles.filterRow}>
              <span className={pricingStyles.filterLabel}>按通道过滤</span>
              {providerChips.map((chip) => {
                const active = providerFilter === null || providerFilter.includes(chip.provider)
                return (
                  <button
                    key={chip.provider}
                    className={pricingStyles.chip + (active ? ' ' + pricingStyles.chipOn : '')}
                    aria-pressed={active}
                    title={'只看 ' + chip.provider + ' 的规则（' + String(chip.count) + ' 条）'}
                    onClick={() => {
                      const current = providerFilter ?? providerChips.map((entry) => entry.provider)
                      const next = current.includes(chip.provider)
                        ? current.filter((provider) => provider !== chip.provider)
                        : [...current, chip.provider]
                      setProviderFilter(next.length === providerChips.length ? null : next)
                    }}
                  >
                    {chip.provider === '*' ? '任意通道（*）' : channelLabelOf(chip.provider)}
                    <b>{String(chip.count)}</b>
                  </button>
                )
              })}
              <button
                className={pricingStyles.linkBtn}
                disabled={providerFilter === null}
                onClick={() => setProviderFilter(null)}
              >
                显示全部
              </button>
            </div>
          )}

          {providerFilter !== null && (
            <div className={pricingStyles.panelHint}>
              过滤只影响这里的显示；保存仍会提交全部 {String(rules.length)} 条规则
              （被过滤掉的 {String(hiddenRulesCount)} 条不会被删掉）。
            </div>
          )}

          {rules.length === 0
            ? (
              <div className={pricingStyles.empty}>
                还没有规则。点「＋ 新增规则」手填，或先「下载规则模板」按内置价目起步。
              </div>
            )
            : visibleRules.length === 0
              ? (
                <div className={pricingStyles.empty}>
                  当前过滤条件下没有规则，点「显示全部」重置（这些规则不会被删除）。
                </div>
              )
              : (
                <table className={pricingStyles.ruleTable}>
                  <thead>
                    <tr>
                      <th>通道</th><th>模型</th><th>输入</th><th>缓存读</th><th>缓存写</th><th>输出</th>
                      <th>币种</th><th>备注 / 附加项（YAML 维护）</th><th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRules.map((rule) => {
                      const extras = ruleExtrasTextOf(rule)
                      const index = rules.indexOf(rule)
                      const offPeakNow = pricing !== null && index >= 0 && pricing.offPeakNow[index] === true
                      return (
                        <tr key={ruleKeyOf(rule)} className={editingKey === ruleKeyOf(rule) ? pricingStyles.editing : ''}>
                          <td><span className={pricingStyles.ruleName}>{rule.provider}</span></td>
                          <td><span className={pricingStyles.ruleName}>{rule.model}</span></td>
                          <td>{rule.input}</td>
                          <td>{rule.cacheRead}</td>
                          <td>{rule.cacheWrite}</td>
                          <td>{rule.output}</td>
                          <td>{rule.currency}</td>
                          <td className={pricingStyles.ruleNote}>
                            {rule.note === ''
                              ? <span className={styles.dim}>—</span>
                              : <span title={rule.note}>{rule.note}</span>}
                            {extras !== '' && (
                              <div
                                className={pricingStyles.ruleExtra}
                                title={rule.offPeak === null ? undefined : offPeakTooltipOf(rule)}
                              >
                                {extras}
                                {offPeakNow && <span className={pricingStyles.offPeakChip}>错峰中</span>}
                              </div>
                            )}
                          </td>
                          <td>
                            <button className={pricingStyles.linkBtn} onClick={() => startEdit(rule)}>编辑</button>
                            <button
                              className={pricingStyles.linkBtn}
                              title="复制这一条规则的 YAML（含 unit / offPeak / note）"
                              onClick={() => void copySnippet(rule, false, ruleLabelOf(rule))}
                            >
                              复制片段
                            </button>
                            <button className={pricingStyles.linkBtn} disabled={saving} onClick={() => void removeRule(rule)}>
                              删除
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

          {hiddenRulesCount > 0 && visibleRules.length > 0 && (
            <div className={pricingStyles.panelHint}>
              另有 {String(hiddenRulesCount)} 条规则被过滤掉（只影响显示，保存时照旧提交）。
            </div>
          )}

          {draft !== null && (
            <RuleEditor
              key={editingKey ?? '__new__'}
              draft={draft}
              onChange={setDraft}
              onCancel={() => { setDraft(null); setEditorError(null); setEditingKey(null) }}
              onSave={() => void commitDraft()}
              error={editorError}
              saving={saving}
              keyChanged={editingKey !== null && ruleKeyOf(draft) !== editingKey}
              providerOptions={providerOptions}
              modelOptions={modelOptions}
              providersListId={providersListId}
              modelsListId={modelsListId}
            />
          )}

          {uncovered.length > 0 && (
            <div className={pricingStyles.sectionBlock}>
              <div className={pricingStyles.subLabel}>
                没有价格依据的模型（{String(uncovered.length)} 个）
              </div>
              <div className={pricingStyles.panelHint}>
                近 30 天用到了、但规则、内置官方价目与聚合价目都没命中：这些用量的成本现在按台账均价估算或显示 —。
                可以下载 / 复制单条片段填好价格后粘进规则文件，或点「让 DSH 帮我配」把清单交给 DSH。
              </div>
              <ul className={pricingStyles.worthList}>
                {shownUncovered.map((model) => {
                  const label = model.provider + ' · ' + model.model
                  return (
                    <li key={model.provider + '|' + model.model}>
                      <span className={pricingStyles.ruleName}>{model.model}</span>
                      <span className={styles.dim}> · {model.provider}</span>
                      <span className={pricingStyles.worthMeta}>
                        {fmtTokens(model.tokens)} tokens（占缺口 {percentText(model.share)}）
                        {model.estimated ? ' · 现为估算' : ' · 无价格依据'}
                      </span>
                      <button
                        className={pricingStyles.linkBtn}
                        onClick={() => downloadSnippet(ruleForModel(model), true, label)}
                      >
                        下载片段
                      </button>
                      <button
                        className={pricingStyles.linkBtn}
                        onClick={() => void copySnippet(ruleForModel(model), true, label)}
                      >
                        复制片段
                      </button>
                    </li>
                  )
                })}
              </ul>
              {uncovered.length > MODEL_LIST_LIMIT && (
                <button className={pricingStyles.linkBtn} onClick={() => setShowAllModels((previous) => !previous)}>
                  {showAllModels ? '收起' : '展开全部（' + String(uncovered.length) + ' 个）'}
                </button>
              )}
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
                      省 {moneyTextOf(entry.currency, entry.amount)}
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

interface ProviderChip {
  provider: string
  count: number
}

/** 刷新价目的结果提示：ok = 成功回执，bad = 服务端原因或请求失败，两种都要留在界面上。 */
interface PriceRefreshStatus {
  tone: 'ok' | 'bad'
  text: string
}

/**
 * 聚合价目（LiteLLM）的来源署名 + 「刷新价目」。
 *
 * 这一块是插件里唯一会联网的地方，因此必须同时说清三件事：数据是谁的（第三方、MIT、USD）、
 * 现在装载的是哪一份（随包快照 / 本地刷新文件 / 读不到）、以及「只在你点刷新时才会访问上游」。
 * 刷新回执与失败原因都放在 `aria-live` 区域里播报，不能只靠颜色或按钮文案。
 */
function AggregateSourceBlock(props: {
  aggregate: ModelPriceAggregate | null
  /** /pricing 还没回来：这时「没有 aggregate 字段」只是还没读到，不能说成服务端旧版本。 */
  loading: boolean
  refreshing: boolean
  elapsedSeconds: number
  status: PriceRefreshStatus | null
  onRefresh: () => void
}): ReactNode {
  const { aggregate } = props
  // issues 是新增字段，老响应可能整块没有；非数组一律当空（不让一条脏数据把面板整块带崩）
  const issues = (Array.isArray(aggregate?.issues) ? aggregate.issues : [])
    .filter((issue): issue is AggregateIssue => issue !== null && typeof issue === 'object')
  const shownIssues = issues.slice(0, ISSUE_LIMIT)
  const fetchedAtText = aggregate === null ? null : localTimeTextOf(aggregate.fetchedAt)
  // 逐段兜底：缺字段 / 空串一律整段省略，不把 undefined 渲染到界面上
  const pathText = typeof aggregate?.path === 'string' && aggregate.path !== '' ? aggregate.path : null
  const commitFull = typeof aggregate?.upstreamCommit === 'string' && aggregate.upstreamCommit.trim() !== ''
    ? aggregate.upstreamCommit.trim()
    : null
  const commitShort = commitFull === null ? null : shortCommitOf(commitFull)
  const licenseText = typeof aggregate?.license === 'string' && aggregate.license.trim() !== ''
    ? aggregate.license
    : 'MIT'
  const entryText = aggregate === null || !Number.isFinite(aggregate.entries)
    ? null
    : '条目 ' + String(aggregate.entries)
  const modelText = aggregate === null || !Number.isFinite(aggregate.models)
    ? null
    : '模型 ' + String(aggregate.models)
  const metaTitle = [
    pathText === null ? null : '当前装载的文件：' + pathText,
    commitFull === null ? null : 'upstream commit：' + commitFull,
  ].filter((part): part is string => part !== null).join('\n')

  return (
    <div className={pricingStyles.aggregateBlock}>
      <div className={pricingStyles.aggregateHead}>
        <span className={pricingStyles.aggregateTitle}>
          价目数据来源：
          <a className={pricingStyles.linkBtn} href={LITELLM_REPO_URL} target="_blank" rel="noreferrer">
            LiteLLM
          </a>
          （{licenseText}，第三方聚合价目，美元计价；优先级低于内置官方价目与你的规则）
        </span>
        <button
          className={pricingStyles.actionBtn}
          disabled={props.refreshing}
          aria-busy={props.refreshing}
          title="从 LiteLLM 上游拉取最新价目并写到本机：这是插件里唯一会联网的操作"
          onClick={props.onRefresh}
        >
          {props.refreshing
            ? '刷新中…' + (props.elapsedSeconds > 0 ? '（已 ' + String(props.elapsedSeconds) + ' 秒）' : '')
            : '刷新价目'}
        </button>
      </div>

      {aggregate === null
        ? (
          <div className={pricingStyles.aggregateMeta}>
            {props.loading
              ? '正在读取服务端价目信息…'
              : '服务端没有返回聚合价目信息，多半是插件服务端还是旧版本 —— 改了服务端要退出重开 DSH 才生效。'}
          </div>
        )
        : (
          <>
            <div className={pricingStyles.aggregateMeta} title={metaTitle === '' ? undefined : metaTitle}>
              当前装载：<b>{aggregateLoadedLabelOf(aggregate.loaded)}</b>
              {entryText !== null && '　' + entryText}
              {modelText !== null && '　' + modelText}
              {fetchedAtText !== null && '　文件时间 ' + fetchedAtText}
              {commitShort !== null && '　upstream ' + commitShort}
            </div>
            <div className={pricingStyles.aggregateMeta}>
              平时不联网：<b>只有你点「刷新价目」时</b>才会访问 LiteLLM 上游地址；刷新失败不影响已装载的那一份。
            </div>
          </>
        )}

      <div
        className={pricingStyles.aggregateStatus + (props.status === null ? '' : ' ' + (props.status.tone === 'ok'
          ? pricingStyles.aggregateStatusOk
          : pricingStyles.aggregateStatusBad))}
        role="status"
        aria-live="polite"
      >
        {props.status === null ? '' : props.status.text}
      </div>

      {issues.length > 0 && (
        <div className={pricingStyles.issueBlock}>
          <div className={pricingStyles.issueHead}>
            <b>{String(issues.length)} 处聚合价目装载问题</b>
            <span className={pricingStyles.issueNote}>
              —— 只影响聚合价目这一层的条目，成本照旧按规则 / 内置官方价目 / 台账均价算
            </span>
          </div>
          <ul className={pricingStyles.issueList}>
            {shownIssues.map((issue, index) => (
              <li key={issue.kind + '|' + String(index)}>
                <span className={pricingStyles.issueWhere}>{issue.kind}</span>
                {issue.message}
              </li>
            ))}
          </ul>
          {issues.length > ISSUE_LIMIT && (
            <div className={pricingStyles.issueNote}>
              还有 {String(issues.length - ISSUE_LIMIT)} 条同类问题已折叠。
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 刷新成功回执：「已更新：… 条价目 · M MB · 来源 host · 时间」。
 * 冻结契约里的刷新回执只给 `entries`（条目数）不给模型数，所以这里写「条」而不冒充「个模型」——
 * 模型数在上一行的装载信息里（随 `/pricing` 重取后刷新）。缺字段时逐段省略，不显示 undefined。
 */
function modelPriceRefreshTextOf(result: Extract<PricingRefreshResult, { ok: true }>): string {
  const parts: string[] = []
  if (typeof result.entries === 'number' && Number.isFinite(result.entries)) {
    parts.push(String(result.entries) + ' 条价目')
  }
  const megabytes = megabytesTextOf(result.bytes)
  if (megabytes !== null) parts.push(megabytes)
  const host = hostOf(result.url)
  if (host !== null) parts.push('来源 ' + host)
  const time = localTimeTextOf(result.fetchedAt)
  if (time !== null) parts.push(time)
  return '已更新：' + (parts.length === 0 ? '服务端没返回明细，已按新价目重算' : parts.join(' · '))
}

/** 过滤芯片：按通道分组计数；配置过的通道排前面，`*` 通配规则永远排最后。 */
function chipEntriesOf(rules: PricingRule[], channels: Channel[]): ProviderChip[] {
  const counts = new Map<string, number>()
  for (const rule of rules) counts.set(rule.provider, (counts.get(rule.provider) ?? 0) + 1)
  const known = channels.map((channel) => channel.provider).filter((provider) => counts.has(provider))
  const rest = [...counts.keys()]
    .filter((provider) => provider !== '*' && !known.includes(provider))
    .sort((first, second) => first.localeCompare(second))
  const ordered = [...known, ...rest, ...(counts.has('*') ? ['*'] : [])]
  return ordered.map((provider) => ({ provider, count: counts.get(provider) ?? 0 }))
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
  drawerId: string
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
              聚合价目 {String(coverage.aggregateModels ?? 0)} 个模型
              {coverage.partialModels !== undefined && coverage.partialModels > 0
                && '（其中部分 ' + String(coverage.partialModels) + ' 个）'} ·
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
            : props.savingsEntries.map(([currency, amount]) => moneyTextOf(currency, amount)).join(' / ')}
        </div>
      </div>

      <div className={pricingStyles.summaryActions}>
        <button
          className={pricingStyles.infoBtn + (props.showExplanation ? ' ' + pricingStyles.infoBtnActive : '')}
          title="来源角标、单位、错峰与多币种口径"
          aria-label="查看成本口径说明"
          aria-expanded={props.showExplanation}
          onClick={props.onToggleExplanation}
        >
          ⓘ
        </button>
        <button
          className={pricingStyles.actionBtn + ' ' + pricingStyles.primary}
          aria-expanded={props.expanded}
          aria-controls={props.drawerId}
          onClick={props.onToggle}
        >
          {props.expanded ? '收起规则 ◂' : '配置规则 ▸'}
        </button>
      </div>
    </div>
  )
}

/** 成本口径说明：默认不占正文，点 ⓘ 才出现。只讲「这一格钱是怎么来的」，数据来源类口径在页面页脚。 */
function ExplanationBlock(): ReactNode {
  return (
    <div className={pricingStyles.explanation}>
      <div className={pricingStyles.explanationTitle}>成本口径</div>
      <ul className={pricingStyles.explanationList}>
        <li><b>官方</b>：台账记录的厂商账单金额，是既成事实，不会被规则覆盖。</li>
        <li><b>自定</b>：按你填的规则算出，匹配顺序 精确 → 通道通配 → 模型通配 → 全通配。</li>
        <li><b>官方价</b>：按插件<b>内置的厂商官方价目</b>算出（自动生效，不需要你维护）；你的规则优先于它。匹配只做精确 / 忽略大小写 / 去 <code>vendor/</code> 前缀，不做模糊匹配。</li>
        <li><b>聚合</b>：按随包内置的 <b>LiteLLM 聚合价目</b>算出（第三方维护、美元计价）；点「刷新价目」可从上游更新，失败不影响已装载的那一份。优先级低于内置官方价目与你的规则 —— 它是比内置官方价目更弱的一层真价格，再往下才是台账均价推算。条目缺缓存写入价时标「部分」：那一格按未命中价计。</li>
        <li><b>估算</b>：按台账反推的均价推算，仅供参照，不是账单。</li>
        <li><b>—</b>：没有价格依据（规则、内置价目、聚合价目都没命中，台账也没有成本数据）。</li>
        <li>单位与按次计费：在 YAML 里写 —— <code>perMillionTokens</code>（每百万，缺省）/ <code>perThousandTokens</code>（每千）/ <code>perCall</code>（每次调用，只用「输入」档当每次调用价）。</li>
        <li>错峰：也在 YAML 里写。窗口按<b>本地时间</b>判断，起止相同表示全天，<code>from</code> 大于 <code>to</code> 表示跨午夜；每个窗口可按<b>每天 / 仅工作日 / 仅周末</b>限定生效的星期（不写即每天）。跨天范围拿不到小时分布，按标准价算。</li>
        <li>多币种不换算、不合计：规则与内置价目各按文档原币种算（DeepSeek 取中文文档的 CNY，Kimi 为 CNY，OpenRouter / Z.ai 为 USD），金额按币种分行显示。</li>
        <li>文件写法：点「<b>下载规则模板</b>」拿一份带注释说明与错峰写法示例的 YAML；面板保存写的是同一个文件。</li>
      </ul>
    </div>
  )
}

/** 单价输入框：用文本态承接输入，避免「0.」在数字态里被吃掉后小数点打不进去。 */
function RateField(props: { label: string; value: number; onChange: (value: number) => void }): ReactNode {
  const [text, setText] = useState(String(props.value))
  // 外部改值（换一条规则 / 取消重开）时同步一次；输入过程中不覆盖，否则小数点会被吞
  useEffect(() => { setText(String(props.value)) }, [props.value])
  return (
    <div className={pricingStyles.field}>
      <label>{props.label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const next = Number(event.target.value)
          props.onChange(Number.isFinite(next) && next >= 0 ? next : 0)
        }}
        onBlur={() => setText(String(props.value))}
      />
    </div>
  )
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

/**
 * 单条规则的编辑器：只暴露 通道 / 模型 / 币种 / 四档单价。
 * unit / offPeak / note 不在这里渲染（只在 YAML 里维护），保存也不提交它们 —— 服务端按
 * provider|model 从文件旧值继承，所以表单变窄不会让用户数据丢。
 */
function RuleEditor(props: {
  draft: PricingRule
  onChange: (rule: PricingRule) => void
  onCancel: () => void
  onSave: () => void
  error: string | null
  saving: boolean
  /** 改过通道 / 模型：等于换了主键，旧条目的附加项不会被继承过来。 */
  keyChanged: boolean
  providerOptions: string[]
  modelOptions: string[]
  providersListId: string
  modelsListId: string
}): ReactNode {
  const { draft, onChange } = props

  return (
    <div className={pricingStyles.editor}>
      <div className={pricingStyles.editorGrid}>
        <div className={pricingStyles.field}>
          <label>通道 id（* = 任意通道）</label>
          <input
            list={props.providersListId}
            value={draft.provider}
            onChange={(event) => onChange({ ...draft, provider: event.target.value })}
          />
          <datalist id={props.providersListId}>
            {props.providerOptions.map((provider) => <option key={provider} value={provider} />)}
          </datalist>
        </div>
        <div className={pricingStyles.field}>
          <label>模型 id（* = 该通道全部）</label>
          <input
            list={props.modelsListId}
            value={draft.model}
            onChange={(event) => onChange({ ...draft, model: event.target.value })}
          />
          <datalist id={props.modelsListId}>
            {props.modelOptions.map((model) => <option key={model} value={model} />)}
          </datalist>
        </div>
        <div className={pricingStyles.field}>
          <label>币种</label>
          <select value={draft.currency} onChange={(event) => onChange({ ...draft, currency: event.target.value })}>
            {CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
        </div>
        <RateField label="输入（未命中缓存）" value={draft.input} onChange={(value) => onChange({ ...draft, input: value })} />
        <RateField label="缓存读（命中）" value={draft.cacheRead} onChange={(value) => onChange({ ...draft, cacheRead: value })} />
        <RateField label="缓存写" value={draft.cacheWrite} onChange={(value) => onChange({ ...draft, cacheWrite: value })} />
        <RateField label="输出" value={draft.output} onChange={(value) => onChange({ ...draft, output: value })} />
      </div>

      {props.error !== null && <div className={pricingStyles.editorError}>{props.error}</div>}
      <div className={pricingStyles.editorHint}>
        正在编辑：{ruleLabelOf(draft)} · 单位 {UNIT_LABELS[draft.unit]}
        {draft.offPeak === null ? '' : ' · 含错峰窗口 ' + offPeakWindowsText(draft)}
        {draft.note === '' ? '' : ' · 备注 ' + draft.note}
      </div>
      <div className={pricingStyles.editorHint}>{FORM_EXTRAS_HINT}</div>
      {props.keyChanged && <div className={pricingStyles.editorHint}>{FORM_KEY_CHANGE_HINT}</div>}
      <div className={pricingStyles.editorActions}>
        <button className={pricingStyles.actionBtn + ' ' + pricingStyles.primary} disabled={props.saving} onClick={props.onSave}>
          {props.saving ? '保存中…' : '保存规则'}
        </button>
        <button className={pricingStyles.actionBtn} disabled={props.saving} onClick={props.onCancel}>取消</button>
      </div>
    </div>
  )
}
