/** 「使用情况」页外壳：Tab 路由、筛选状态与取数（会话类数据切到对应 Tab 时才首次拉取）。 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadChannels, loadHeatmap, loadModels, loadPricing, loadProjects, loadQuota, loadSessions, loadSnapshot, loadSummary, loadUsage, refreshAll } from './api.ts'
import { fxSummaryTextOf, useCurrencyDisplay } from './currency.ts'
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
  SnapshotQuotaOutcome,
  SnapshotResponse,
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
  /** 价目版本号：点「刷新价目」后自增，用来让服务端重算成本并整体重取数据。 */
  const [pricingRevision, setPricingRevision] = useState(0)
  /** 配额执行结果：哪个通道这次查到实时值、展示值的时间与失败原因（界面据此标「本机快照 + 数据时间」）。 */
  const [quotaOutcome, setQuotaOutcome] = useState<SnapshotQuotaOutcome | null>(null)
  const lastSnapshotAt = useRef(0)
  const tooltip = useTooltip()
  /** 汇率与显示币种放在模块级 store 里：任意 Tab 的金额都要按它折算，页脚也要显示来源。 */
  const currency = useCurrencyDisplay()

  /** 用户是否还在看默认范围（近 30 天 / 全部通道）：是才采用快照里的 usage，否则会覆盖他自己的选择。 */
  const usageIsDefaultRef = useRef(true)
  usageIsDefaultRef.current = range === 'month' && channelFilter === 'ALL'

  /** 把一份快照落到各 Tab 的状态上（快照是 6 个 Tab 的唯一数据来源）。 */
  const applySnapshot = useCallback((snapshot: SnapshotResponse) => {
    const sections = snapshot.sections
    setQuotaOutcome(snapshot.quotaOutcome)
    if (sections.channels !== null) setChannels(sections.channels.channels ?? [])
    if (sections.quota !== null) setQuotas(sections.quota.providers ?? [])
    setSummary(sections.overview)
    if (sections.heatmap !== null) setHeatmap(sections.heatmap.days ?? [])
    setSessions(sections.sessions)
    setProjects(sections.projects)
    setModels(sections.models)
    const usageSection = sections.usage
    if (usageIsDefaultRef.current && usageSection !== null) {
      setUsage(usageSection)
      if (usageSection.availableFrom !== null && usageSection.availableTo !== null) {
        setAvailable({ from: usageSection.availableFrom, to: usageSection.availableTo })
      }
    }
    lastSnapshotAt.current = Date.now()
  }, [])

  /** 逐端点兜底：服务端还是旧版本（没有 /snapshot）时用，语义与升级前一致。 */
  const reloadFromEndpoints = useCallback(async (includeSessionData: boolean, forceQuota: boolean) => {
    const quotaResult = await loadQuota(forceQuota)
    const [channelResult, summaryResult, heatmapResult] = await Promise.all([loadChannels(), loadSummary(), loadHeatmap()])
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
  }, [])

  // 首次打开：取快照（还没有时服务端会现算一份），失败才退回逐端点
  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const snapshot = await loadSnapshot()
      if (cancelled) return
      if (snapshot !== null) applySnapshot(snapshot)
      else await reloadFromEndpoints(false, false)
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [applySnapshot, reloadFromEndpoints])

  // 5 分钟本地刷新：服务端每 5 分钟重建一次快照，这里跟着取最新那份；页面隐藏时暂停，切回且已超期立刻补一次
  useEffect(() => {
    const pollMs = 5 * 60 * 1000
    const tick = (): void => {
      if (document.visibilityState === 'hidden') return
      if (Date.now() - lastSnapshotAt.current < pollMs) return
      void loadSnapshot().then((snapshot) => { if (snapshot !== null) applySnapshot(snapshot) })
    }
    const timer = setInterval(tick, pollMs)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [applySnapshot])

  // 价目信息：内置官方价目来源、覆盖度、价目文件与解析问题、聚合价目装载状态（刷新价目后重取）
  useEffect(() => {
    let cancelled = false
    void loadPricing().then((result) => { if (!cancelled) setPricing(result) })
    return () => { cancelled = true }
  }, [pricingRevision])

  // 价目换了 → 让服务端重算一次（成本按价目算）并取回新快照
  useEffect(() => {
    if (pricingRevision === 0) return
    void refreshAll().then((snapshot) => { if (snapshot !== null) applySnapshot(snapshot) })
  }, [pricingRevision, applySnapshot])

  // 项目 / 会话 / 模型数据按需加载（首次切到对应 Tab；快照已经带了就直接用）
  useEffect(() => {
    if (activeTab === 'sessions' && sessions === null) void loadSessions().then(setSessions)
    if (activeTab === 'projects' && projects === null) void loadProjects().then(setProjects)
    if (activeTab === 'models' && models === null) void loadModels().then(setModels)
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
    setLoading(true)
    void (async () => {
      const snapshot = await refreshAll()
      if (snapshot !== null) applySnapshot(snapshot)
      else await reloadFromEndpoints(sessions !== null || projects !== null || models !== null, true)
      const usageResult = await loadUsage(bounds.from, bounds.to, channelFilter)
      if (usageResult !== null) setUsage(usageResult)
      setLoading(false)
    })()
  }, [applySnapshot, reloadFromEndpoints, sessions, projects, models, bounds.from, bounds.to, channelFilter])

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
          quotaOutcome={quotaOutcome}
          reloadToken={pricingRevision}
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
            成本三层自动生效，<b>不需要你填任何价格</b>：厂商账单（台账）&gt; 内置厂商官方价目 &gt; LiteLLM 聚合价目 &gt; 台账反推均价兜底；
            角标分 <b>官方</b> / <b>官方价</b> / <b>聚合</b> / <b>估算</b>，没有价格依据时显示 —。
            逐模型单价与来源在「余额与配额」页<b>展开通道卡片</b>查看，「聚合」只有点「刷新价目」才会联网更新，平时完全离线。
          </li>
          <li>
            金额按当前显示币种折算（工具条可切 <b>¥ RMB</b> / <b>$ USD</b>）：换算是把逐币种小计各自折成显示币种后再相加，
            折算值前缀 <code>≈</code>；当前 {currency.fx === null ? '还没取到汇率，跨币种金额按原币种显示' : fxSummaryTextOf(currency.fx)}。
          </li>
          <li>余额与订阅窗口实时查询官方接口（失败回落本机快照），按官方原值 + 币种原样展示（余额不折算、不给建议）；成本金额按上面的显示币种折算。</li>
          <li>
            页面数据来自统一快照：本地段每 5 分钟重建一次；余额与订阅窗口只在你打开页面或点「刷新」时联网，
            查不到的通道沿用上一份快照并标出数据时间与失败原因。
          </li>
        </ul>
      </div>

      <TooltipView tooltip={tooltip.tooltip} />
    </div>
  )
}
