/**
 * 「使用情况」设置页外壳：Tab 路由、范围 / 通道筛选状态与取数。
 * 台账类数据（通道 / 台账 / 热力图 / 汇总 / 快照）来自本地文件端点；
 * 项目与会话数据来自宿主会话事件折叠，切到对应 Tab 时才首次拉取。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadChannels, loadHeatmap, loadModels, loadPricing, loadProjects, loadQuota, loadSessions, loadSummary, loadUsage } from './api.ts'
import { isoDate, shiftedIsoDate } from './format.ts'
import { TooltipView, useTooltip } from './tooltip.tsx'
import { OverviewTab } from './tabs/OverviewTab.tsx'
import { DetailTab, type RangeKey } from './tabs/DetailTab.tsx'
import { ModelsTab } from './tabs/ModelsTab.tsx'
import { ProjectsTab } from './tabs/ProjectsTab.tsx'
import { QuotaTab } from './tabs/QuotaTab.tsx'
import { SessionsTab } from './tabs/SessionsTab.tsx'
import type { DetailSortState } from './components/DailyDetailTable.tsx'
import type {
  Channel,
  HeatmapDay,
  ModelsResponse,
  PricingResponse,
  ProjectsResponse,
  QuotaProvider,
  SessionsResponse,
  SummaryResponse,
  UsageResponse,
} from './types.ts'
import styles from './styles/shared.module.css'

type TabId = 'overview' | 'detail' | 'projects' | 'models' | 'sessions' | 'quota'

const TABS: Array<[TabId, string]> = [
  ['overview', '总览'],
  ['detail', '使用明细'],
  ['projects', '项目用量'],
  ['models', '按模型'],
  ['sessions', '会话用量'],
  ['quota', '余额与配额'],
]

export function KeyUsageSection() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [range, setRange] = useState<RangeKey>('month')
  const [customFrom, setCustomFrom] = useState(() => shiftedIsoDate(-29))
  const [customTo, setCustomTo] = useState(() => isoDate(new Date()))
  const [channelFilter, setChannelFilter] = useState('ALL')
  /** 跨 Tab 联动：从「会话用量」点工作目录进来时只看那一个项目（不做全局路由） */
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({})
  const [detailSort, setDetailSort] = useState<DetailSortState>({ key: 'period', dir: 'desc' })

  const [channels, setChannels] = useState<Channel[]>([])
  const [quotas, setQuotas] = useState<QuotaProvider[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([])
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [sessions, setSessions] = useState<SessionsResponse | null>(null)
  const [projects, setProjects] = useState<ProjectsResponse | null>(null)
  const [models, setModels] = useState<ModelsResponse | null>(null)
  const [pricing, setPricing] = useState<PricingResponse | null>(null)
  const [available, setAvailable] = useState<{ from: string; to: string } | null>(null)
  const [loading, setLoading] = useState(false)
  /**
   * 计费规则版本号：规则写进 YAML 后成本要整体重算，所有按成本展示的数据都得重取。
   * 规则只从面板保存（POST /pricing/rules）这一个入口变，所以用一个自增计数当失效信号即可。
   */
  const [pricingRevision, setPricingRevision] = useState(0)
  const tooltip = useTooltip()

  const reload = useCallback(async (includeSessionData: boolean, forceQuota = false) => {
    setLoading(true)
    // 先查余额：服务端会借这次调用预热实时结果，随后 /channels 的状态判定就能用上
    const quotaResult = await loadQuota(forceQuota)
    const [channelResult, summaryResult, heatmapResult] = await Promise.all([
      loadChannels(), loadSummary(), loadHeatmap(),
    ])
    setChannels(channelResult ?? [])
    setQuotas(quotaResult ?? [])
    setSummary(summaryResult)
    setHeatmap(heatmapResult ?? [])
    if (includeSessionData) {
      const [sessionResult, projectResult, modelResult] = await Promise.all([loadSessions(), loadProjects(), loadModels()])
      setSessions(sessionResult)
      setProjects(projectResult)
      setModels(modelResult)
    }
    setLoading(false)
    // pricingRevision 不是被用到的值，而是「规则变了」的失效信号：
    // 成本在服务端按规则算，规则一改这里就必须整体重取
  }, [pricingRevision])

  useEffect(() => { void reload(false) }, [reload])

  // 计费规则面板的服务端对照：内置价目来源、缺口覆盖度、两个 YAML 文件与解析问题（规则一变就重取）
  useEffect(() => {
    let cancelled = false
    void loadPricing().then((result) => { if (!cancelled) setPricing(result) })
    return () => { cancelled = true }
  }, [pricingRevision])

  // 项目 / 会话 / 模型数据按需加载（首次切到对应 Tab 时；余额页也需要按模型用量给「最值得补规则」排序）
  useEffect(() => {
    if (activeTab === 'sessions' && sessions === null) void loadSessions().then(setSessions)
    if (activeTab === 'projects' && projects === null) void loadProjects().then(setProjects)
    if ((activeTab === 'models' || activeTab === 'quota') && models === null) void loadModels().then(setModels)
  }, [activeTab, sessions, projects, models])

  const bounds = useMemo(() => {
    const today = isoDate(new Date())
    if (range === 'today') return { from: today, to: today }
    if (range === 'week') return { from: shiftedIsoDate(-6), to: today }
    if (range === 'month') return { from: shiftedIsoDate(-29), to: today }
    if (range === 'custom') return { from: customFrom, to: customTo < customFrom ? customFrom : customTo }
    return { from: available?.from ?? today, to: available?.to ?? today }
  }, [range, customFrom, customTo, available])

  useEffect(() => {
    let cancelled = false
    void loadUsage(bounds.from, bounds.to, channelFilter).then((result) => {
      if (cancelled || result === null) return
      setUsage(result)
      if (result.availableFrom !== null && result.availableTo !== null) {
        setAvailable({ from: result.availableFrom, to: result.availableTo })
      }
    })
    return () => { cancelled = true }
  }, [bounds.from, bounds.to, channelFilter, pricingRevision])

  const refresh = useCallback(() => {
    void reload(
      activeTab === 'sessions' || activeTab === 'projects' || activeTab === 'models'
      || sessions !== null || projects !== null || models !== null,
      true,
    )
    void loadUsage(bounds.from, bounds.to, channelFilter).then((result) => { if (result !== null) setUsage(result) })
  }, [reload, activeTab, sessions, projects, models, bounds.from, bounds.to, channelFilter])

  return (
    <div className={styles.section}>
      <div className={styles.title}>
        <span>使用情况</span>
        <span className={styles.titleActions}>
          <button className={styles.refreshBtn} disabled={loading} onClick={refresh}>
            {loading ? '刷新中…' : '↻ 刷新'}
          </button>
        </span>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(([tabId, label]) => (
          <button key={tabId} className={activeTab === tabId ? styles.active : ''} onClick={() => setActiveTab(tabId)}>{label}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          channels={channels}
          summary={summary}
          quotas={quotas}
          heatmap={heatmap}
          tooltip={tooltip}
          onOpenDetail={(provider) => { setChannelFilter(provider); setActiveTab('detail') }}
        />
      )}
      {activeTab === 'detail' && (
        <DetailTab
          usage={usage}
          channels={channels}
          range={range}
          onRange={setRange}
          customFrom={customFrom}
          onCustomFrom={setCustomFrom}
          customTo={customTo}
          onCustomTo={setCustomTo}
          channelFilter={channelFilter}
          onChannelFilter={setChannelFilter}
          expandedPeriods={expandedPeriods}
          onTogglePeriod={(periodKey) => setExpandedPeriods((previous) => ({ ...previous, [periodKey]: previous[periodKey] !== true }))}
          sort={detailSort}
          onSort={setDetailSort}
          bounds={bounds}
          tooltip={tooltip}
          pricingRevision={pricingRevision}
        />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab
          data={projects}
          channels={channels}
          focusWorkspace={projectFilter}
          onClearFocus={() => setProjectFilter(null)}
        />
      )}
      {activeTab === 'models' && <ModelsTab data={models} channels={channels} />}
      {activeTab === 'sessions' && (
        <SessionsTab
          data={sessions}
          channels={channels}
          tooltip={tooltip}
          onOpenProject={(workspace) => { setProjectFilter(workspace); setActiveTab('projects') }}
        />
      )}
      {activeTab === 'quota' && (
        <QuotaTab
          channels={channels}
          quotas={quotas}
          pricing={pricing}
          models={models}
          onPricingReload={() => setPricingRevision((previous) => previous + 1)}
        />
      )}

      <div className={styles.footnote}>
        <b>口径说明</b>
        <ul className={styles.footnoteList}>
          <li>
            按天数据优先取宿主用量台账（含官方成本）；台账无记录的日期回退本地会话事件折叠，那些天没有官方成本
            {summary !== null && summary.todaySource === 'session' ? '（当前有 ' + summary.sessionDates.length + ' 天由会话补位）' : ''}
            。两套来源按天取舍、不相加。
          </li>
          <li>热力图按可见区间内活跃日的五分位分档（少 / 较少 / 中 / 较多 / 多，即 p20 / p40 / p60 / p80）。</li>
          <li>项目用量、会话用量、按模型与单日「按小时」均来自会话事件，每个结算样本计一次调用（不计成本）。</li>
          <li>已归档会话只是标记：用量照常计入，会话列表默认隐藏、可切换显示（显示时淡化并标注）。</li>
          <li>命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）。</li>
          <li>
            成本来源与优先级见「余额与配额」页计费面板的 <b>成本口径</b>（ⓘ）：角标分 <b>官方</b> / <b>自定</b> / <b>官方价</b> / <b>估算</b>，
            没有价格依据时显示 —；规则以用户 YAML 文件为唯一事实来源（面板保存写的就是它，错峰与计价单位在 YAML 里维护），保存后立即重算。
          </li>
          <li>余额与订阅窗口实时查询官方接口（失败回落本机快照），原样展示，不做换算与建议。</li>
        </ul>
      </div>

      <TooltipView tooltip={tooltip.tooltip} />
    </div>
  )
}
