/** 「使用情况」页外壳：Tab 路由、筛选状态与取数（会话类数据切到对应 Tab 时才首次拉取）。 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadChannels, loadHeatmap, loadModels, loadProjects, loadQuota, loadSessions, loadSnapshot, loadSummary, loadUsage, refreshAll, REFRESH_PATH } from './core/api.ts'
import { useCurrencyDisplay } from './core/currency.ts'
import { isoDate, shiftedIsoDate } from './core/format.ts'
import { selectionOf } from './core/filter-selection.ts'
import { t, useT } from './core/i18n.ts'
import { hydrateLog, logInfo, logWarn, subscribeOpenLog } from './core/log.ts'
import { exportSessionsCsv, exportUsageCsv } from './core/export-csv.ts'
import { PLUGIN_REPO_URL } from './core/pricing.ts'
import { TooltipView, useTooltip } from './core/tooltip.tsx'
import { DateRangePicker } from './components/DateRangePicker.tsx'
import { MultiSelect } from './components/MultiSelect.tsx'
import { Button } from './components/ui/Button.tsx'
import { Dialog } from './components/ui/Dialog.tsx'
import { SettingsDialog, type SettingsTab } from './components/SettingsDialog.tsx'
import { OverviewTab } from './tabs/OverviewTab.tsx'
import { DetailTab, ORPHAN_PROJECT_VALUE, filterUsageByChannels, type RangeKey } from './tabs/DetailTab.tsx'
import { DistributionTab } from './tabs/DistributionTab.tsx'
import { QuotaTab } from './tabs/QuotaTab.tsx'
import { SessionsTab } from './tabs/SessionsTab.tsx'
import { ToolsTab } from './tabs/ToolsTab.tsx'
import { WordsTab } from './tabs/WordsTab.tsx'
import type {
  Channel,
  HeatmapDay,
  ModelsResponse,
  ProjectsResponse,
  PromptsResponse,
  QuotaProvider,
  SessionsResponse,
  SnapshotQuotaOutcome,
  SnapshotResponse,
  SummaryResponse,
  ToolsResponse,
  UsageResponse,
  WeekdayHours,
} from './core/types.ts'
import styles from './styles/shared.module.css'

type TabId = 'quota' | 'overview' | 'detail' | 'distribution' | 'sessions' | 'tools' | 'words'

/** 单页顺序：额度在最前（最先想知道「还剩多少」），其余按「总量 → 明细 → 结构 → 会话」展开。 */
const TABS: Array<[TabId, string]> = [
  ['quota', 'tab.quota'],
  ['overview', 'tab.overview'],
  ['detail', 'tab.detail'],
  ['distribution', 'tab.distribution'],
  ['sessions', 'tab.sessions'],
  ['tools', 'tab.tools'],
  ['words', 'tab.words'],
]

/** 滚动式下要一次性取的段（不取 usage：它按范围单独请求）。 */
const ALL_SECTIONS = ['channels', 'overview', 'heatmap', 'quota', 'sessions', 'projects', 'models', 'prompts', 'tools']

/** 页级范围：与明细同一套 RangeKey（90 天按 90 天算，'total' = 全部）。 */
const RANGES: Array<[RangeKey, string]> = [
  ['today', 'r.today'],
  ['week', 'r.week'],
  ['month', 'r.month'],
  ['quarter', 'r.90days'],
  ['total', 'r.total'],
]

/** 刷新周期选项（秒，0 = 关闭）。 */
const REFRESH_OPTIONS = [0, 10, 30, 60, 300]

export function KeyUsageSection() {
  const [activeTab, setActiveTab] = useState<TabId>('quota')
  /** false = 滚动式（默认，全部区块铺开）；true = 分页（只显示当前区块）。 */
  const [paged, setPaged] = useState(true)
  /** 自动刷新周期（秒）；0 = 关闭。只打本地 /snapshot，不联网。 */
  const [refreshSeconds, setRefreshSeconds] = useState(30)
  const [range, setRange] = useState<RangeKey>('month')
  const [customFrom, setCustomFrom] = useState(() => shiftedIsoDate(-29))
  const [customTo, setCustomTo] = useState(() => isoDate(new Date()))
  /** 三个筛选都存多选值：逗号分隔字符串，空串 = 全部（服务端 /usage 固定取全量，过滤在客户端做）。 */
  const [channelFilter, setChannelFilter] = useState('')
  /** 项目值取 `projects` 段的 workspace（'' = 未归入工作区）；模型值取模型名。 */
  const [projectFilter, setProjectFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')

  const [channels, setChannels] = useState<Channel[]>([])
  const [quotas, setQuotas] = useState<QuotaProvider[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([])
  /** 「按时段」7×24 矩阵：/heatmap 的 hourly（服务端只给调用数）。 */
  const [hourly, setHourly] = useState<WeekdayHours[]>([])
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [sessions, setSessions] = useState<SessionsResponse | null>(null)
  const [prompts, setPrompts] = useState<PromptsResponse | null>(null)
  const [tools, setTools] = useState<ToolsResponse | null>(null)
  const [projects, setProjects] = useState<ProjectsResponse | null>(null)
  const [models, setModels] = useState<ModelsResponse | null>(null)
  const [available, setAvailable] = useState<{ from: string; to: string } | null>(null)
  const [loading, setLoading] = useState(false)
  /** 价目版本号：点「刷新价目」后自增，用来让服务端重算成本并整体重取数据。 */
  const [pricingRevision, setPricingRevision] = useState(0)
  /** 配额执行结果：哪个通道这次查到实时值、展示值的时间与失败原因（界面据此标「本机快照 + 数据时间」）。 */
  const [quotaOutcome, setQuotaOutcome] = useState<SnapshotQuotaOutcome | null>(null)
  /** 口径说明放进弹窗：内容可以写长，但不再占版面。 */
  /** 设置弹窗：币种、汇率、价目的来源与刷新都收在这里，页面里只留结论。 */
  const [showSettings, setShowSettings] = useState(false)
  /** 总览的通道行点击：余额/配额 + 单价表放进弹窗（原来的「余额与配额」Tab 已移除） */
  const [quotaDialog, setQuotaDialog] = useState<string | null>(null)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  /** 取词函数：宿主切语言时 useT 触发重渲染，文案跟着切 */
  const t = useT()
  const lastSnapshotAt = useRef(0)
  const tooltip = useTooltip()

  /** 订阅显示币种：金额随它重渲染（币种与汇率本身在设置弹窗里改）。 */
  useCurrencyDisplay()

  /** 打开那一刻的页决定首屏要哪些段：切 Tab 不该重跑首屏（会闪 loading），后续段按需取。 */
  const initialSectionsRef = useRef<string[]>([])
  /** 滚动式下 activeTab 会随滚动变化：首屏 / 轮询只读 ref，避免每滚一下就重跑一遍取数。 */
  const activeTabRef = useRef<TabId>('quota')

  /**
   * 快照段按当前页取：总览要的三段是底座，其余段切到对应 Tab 时才要（会话段近 200 KB）。
   * 项目 / 模型两段挂在底座上：顶部「全部项目 / 全部模型」下拉要随时有选项可列。
   * 服务端只裁剪下发，构建仍是全量一份，所以不可能出现「两个数据源」。
   */
  const sectionsForTab = useCallback((tab: TabId): string[] => {
    const base = ['channels', 'overview', 'heatmap', 'quota', 'projects', 'models']
    if (tab === 'sessions') return [...base, 'sessions']
    if (tab === 'words') return [...base, 'prompts']
    if (tab === 'tools') return [...base, 'tools']
    return base
  }, [])

  /** 当前要不要加载/渲染某个区块（分页时只留当前那个）。 */
  const wants = useCallback((tab: TabId): boolean => !paged || activeTab === tab, [paged, activeTab])
  /** 布尔化的可见性：effect 依赖它而不是 activeTab，滚动时不会反复重取。 */
  const wantSessions = wants('sessions')
  const wantOverview = wants('overview')
  const wantDistribution = wants('distribution')
  const wantDetail = wants('detail')
  const wantWords = wants('words')
  const wantTools = wants('tools')

  activeTabRef.current = activeTab

  /** 用户是否还在看默认范围（近 30 天 / 未筛通道）：是才采用快照里的 usage，否则会覆盖他自己的选择。 */
  const usageIsDefaultRef = useRef(true)
  usageIsDefaultRef.current = range === 'month' && selectionOf(channelFilter).length === 0

  /** 把一份快照落到各 Tab 的状态上（快照是 6 个 Tab 的唯一数据来源）。 */
  const applySnapshot = useCallback((snapshot: SnapshotResponse) => {
    const sections = snapshot.sections
    setQuotaOutcome(snapshot.quotaOutcome)
    if (sections.channels !== undefined && sections.channels !== null) setChannels(sections.channels.channels ?? [])
    if (sections.quota !== undefined && sections.quota !== null) setQuotas(sections.quota.providers ?? [])
    if (sections.overview !== undefined) setSummary(sections.overview)
    if (sections.heatmap !== undefined && sections.heatmap !== null) {
      setHeatmap(sections.heatmap.days ?? [])
      setHourly(sections.heatmap.hourly ?? [])
    }
    // 段为 null 说明这次构建失败（sections 全置 null）：此时不能覆盖已按需取来的数据
    if (sections.sessions !== undefined && sections.sessions !== null) setSessions(sections.sessions)
    if (sections.projects !== undefined && sections.projects !== null) setProjects(sections.projects)
    if (sections.models !== undefined && sections.models !== null) setModels(sections.models)
    if (sections.prompts !== undefined && sections.prompts !== null) setPrompts(sections.prompts)
    // tools 段用 null 表示「暂无采集」：是合法值，只有裁剪没取（undefined）才不许覆盖
    if (sections.tools !== undefined) setTools(sections.tools)
    const usageSection = sections.usage
    if (usageSection !== undefined && usageIsDefaultRef.current && usageSection !== null) {
      setUsage(usageSection)
      if (usageSection.availableFrom !== null && usageSection.availableTo !== null) {
        setAvailable({ from: usageSection.availableFrom, to: usageSection.availableTo })
      }
    }
    lastSnapshotAt.current = Date.now()
    // 快照问题与「读取不完整」只留一行状态；原因进系统日志，避免页面上摊开一大段
    for (const issue of snapshot.issues ?? []) {
      // 构建耗时每次构建都记一条，属排查信息：走 info，免得把日志面板的「警告」档刷满
      if (issue.kind === 'build-duration') logInfo('snapshot', t('log.issue') + '：' + issue.kind, issue.message)
      else logWarn('snapshot', t('log.issue') + '：' + issue.kind, issue.message)
    }
    const partial: string[] = []
    for (const [name, section] of [['models', sections.models], ['projects', sections.projects], ['sessions', sections.sessions]] as const) {
      if (section === undefined || section === null || section.coverage.status === 'complete') continue
      partial.push(name + '(' + section.coverage.status + '：' + String(section.coverage.countedSessions) + '/' + String(section.coverage.totalSessions) + ')')
    }
    if (partial.length > 0) logWarn('snapshot', t('log.coveragePartial') + '：' + partial.join('、'))
  }, [t])

  /** 逐端点兜底：服务端还是旧版本（没有 /snapshot）时用，语义与升级前一致。 */
  const reloadFromEndpoints = useCallback(async (includeSessionData: boolean, forceQuota: boolean) => {
    const quotaResult = await loadQuota(forceQuota)
    const [channelResult, summaryResult, heatmapResult] = await Promise.all([loadChannels(), loadSummary(), loadHeatmap()])
    setChannels(channelResult ?? [])
    setQuotas(quotaResult ?? [])
    setSummary(summaryResult)
    setHeatmap(heatmapResult?.days ?? [])
    setHourly(heatmapResult?.hourly ?? [])
    if (includeSessionData) {
      const [sessionResult, projectResult, modelResult] = await Promise.all([loadSessions(), loadProjects(), loadModels()])
      setSessions(sessionResult)
      setProjects(projectResult)
      setModels(modelResult)
    }
  }, [])

  // 首屏两段式：先出本机快照（读文件，毫秒级），再让服务端重建并追取 —— 打开页面不干等重建
  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      if (initialSectionsRef.current.length === 0) initialSectionsRef.current = paged ? sectionsForTab(activeTabRef.current) : ALL_SECTIONS
      const cached = await loadSnapshot(false, initialSectionsRef.current)
      if (cancelled) return
      if (cached !== null) {
        applySnapshot(cached)
        setLoading(false)
      }
      // fresh=1：服务端保证本地段重算过（超过防抖下限才重算），配额段后台补查，返回后替换
      const fresh = await loadSnapshot(true, initialSectionsRef.current)
      if (cancelled) return
      if (fresh !== null) applySnapshot(fresh)
      else if (cached === null) await reloadFromEndpoints(false, false)
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [applySnapshot, reloadFromEndpoints, sectionsForTab, paged])

  /**
   * 打开页面时服务端可能还在重建（`building`）或后台补查配额（`quotaRefreshing`）：
   * 隔一会儿追取几次，拿到新数据就换上，用户不用手动刷新。冷启动重建可能十几秒，追到 12 次（约 30 秒）为止。
   */
  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const chase = async (): Promise<void> => {
      const snapshot = await loadSnapshot(false, initialSectionsRef.current)
      if (cancelled || snapshot === null) return
      applySnapshot(snapshot)
      if (snapshot.building === true || snapshot.quotaRefreshing === true) {
        attempts += 1
        if (attempts < 12) timer = setTimeout(() => { void chase() }, 2500)
      }
    }
    timer = setTimeout(() => { void chase() }, 1500)
    return () => { cancelled = true; if (timer !== null) clearTimeout(timer) }
  }, [applySnapshot, sectionsForTab])

  // 磁盘上的历史日志读回内存（刷新页面后还能看到上次为什么失败），并允许页面里任何组件请求打开日志窗
  useEffect(() => { void hydrateLog() }, [])
  useEffect(() => subscribeOpenLog(() => { setSettingsTab('log'); setShowSettings(true) }), [])

  // 自动刷新：按配置周期取本地快照（不联网）；页面隐藏时暂停，切回立刻补一次
  useEffect(() => {
    if (refreshSeconds <= 0) return
    const pollMs = refreshSeconds * 1000
    const tick = (): void => {
      if (document.visibilityState === 'hidden') return
      if (Date.now() - lastSnapshotAt.current < pollMs) return
      const sections = paged ? sectionsForTab(activeTabRef.current) : ALL_SECTIONS
      void loadSnapshot(false, sections).then((snapshot) => { if (snapshot !== null) applySnapshot(snapshot) })
    }
    const timer = setInterval(tick, pollMs)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [refreshSeconds, paged, applySnapshot, sectionsForTab])

  // 价目换了 → 让服务端重算一次（成本按价目算）并取回新快照
  useEffect(() => {
    if (pricingRevision === 0) return
    void refreshAll().then((snapshot) => { if (snapshot !== null) applySnapshot(snapshot) })
  }, [pricingRevision, applySnapshot])

  // 项目 / 会话 / 模型数据按需加载（首次切到对应 Tab；快照已经带了就直接用）
  useEffect(() => {
    if (wantSessions && sessions === null) void loadSessions().then(setSessions)
    if (wantDistribution) {
      if (projects === null) void loadProjects().then(setProjects)
      if (models === null) void loadModels().then(setModels)
    }
    // 词频只在词云页用：切到本页才第一次取（服务端已算好，读快照即可）
    if (wantWords && prompts === null) void loadSnapshot(false, ['prompts']).then((snapshot) => { if (snapshot !== null) applySnapshot(snapshot) })
    if (wantTools && tools === null) void loadSnapshot(false, ['tools']).then((snapshot) => { if (snapshot !== null) applySnapshot(snapshot) })
  }, [wantSessions, wantDistribution, wantWords, wantTools, sessions, projects, models, prompts, tools, applySnapshot])

  const bounds = useMemo(() => {
    const today = isoDate(new Date())
    if (range === 'today') return { from: today, to: today }
    if (range === 'week') return { from: shiftedIsoDate(-6), to: today }
    if (range === 'month') return { from: shiftedIsoDate(-29), to: today }
    if (range === 'quarter') return { from: shiftedIsoDate(-89), to: today }
    if (range === 'custom') return { from: customFrom, to: customTo < customFrom ? customFrom : customTo }
    return { from: available?.from ?? today, to: available?.to ?? today }
  }, [range, customFrom, customTo, available])

  // 明细数据只在切到「使用明细」时才取：概览 / 分布 / 会话都不需要它。
  // 通道多选不能当单值发给服务端 → 这里固定取全量（'ALL'），选中哪些通道在客户端过滤。
  useEffect(() => {
    if (!wantDetail && !wantDistribution && !wantOverview) return
    let cancelled = false
    void loadUsage(bounds.from, bounds.to, 'ALL').then((result) => {
      if (cancelled || result === null) return
      setUsage(result)
      if (result.availableFrom !== null && result.availableTo !== null) {
        setAvailable({ from: result.availableFrom, to: result.availableTo })
      }
    })
    return () => { cancelled = true }
  }, [wantDetail, wantDistribution, wantOverview, bounds.from, bounds.to, pricingRevision])

  /** 通道多选过滤（客户端）：先按通道收窄 `/usage`，各区块再按模型收窄；合计由两次过滤各自重算。 */
  const scopedUsage = useMemo(() => filterUsageByChannels(usage, channelFilter), [usage, channelFilter])

  /** 通道下拉：值取 provider，文案取显示名。 */
  const channelOptions = useMemo(() => channels.map((channel) => ({
    value: channel.provider,
    label: channel.displayName ?? channel.provider,
  })), [channels])

  /** 项目下拉：值取 workspace（未归入工作区的那行用 sentinel），文案取宿主工作区标题。 */
  const projectOptions = useMemo(() => (projects?.rows ?? []).map((row) => ({
    value: row.workspace === '' ? ORPHAN_PROJECT_VALUE : row.workspace,
    label: row.workspace === '' ? t('p.orphan') : (row.workspaceTitle ?? row.workspace),
  })), [projects, t])

  /** 模型下拉：同一个模型跨通道只留一项（筛选按模型名）。 */
  const modelOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: Array<{ value: string; label: string }> = []
    for (const row of models?.rows ?? []) {
      if (seen.has(row.model)) continue
      seen.add(row.model)
      options.push({ value: row.model, label: row.model === '' ? t('m.others') : row.model })
    }
    return options
  }, [models, t])

  /** 刷新周期文案：0 = 关闭。 */
  const refreshLabel = useCallback((seconds: number): string => {
    if (seconds <= 0) return t('refresh.off')
    if (seconds < 60) return t('refresh.seconds', { count: seconds })
    return t('refresh.minutes', { count: Math.round(seconds / 60) })
  }, [t])

  /** 滚到某个区块（滚动式）；分页式直接切过去。 */
  const goSection = useCallback((tab: TabId): void => {
    setActiveTab(tab)
    if (paged) { window.scrollTo({ top: 0 }); return }
    document.getElementById('sec-' + tab)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [paged])

  /** 点导航：分页式切换区块，滚动式滚过去。 */
  const pickSection = useCallback((tab: TabId): void => {
    if (paged) { setActiveTab(tab); window.scrollTo({ top: 0 }); return }
    goSection(tab)
  }, [paged, goSection])

  // 滚动式下跟随滚动高亮当前区块（分页式不监听）
  useEffect(() => {
    if (paged) return
    const sections = TABS.map(([tabId]) => ({ tabId, el: document.getElementById('sec-' + tabId) })).filter((item) => item.el !== null)
    if (sections.length === 0) return
    let ticking = false
    const update = (): void => {
      ticking = false
      const line = 160
      let current = sections[0]
      for (const item of sections) {
        if (item.el !== null && item.el.getBoundingClientRect().top <= line) current = item
      }
      setActiveTab(current.tabId)
    }
    const onScroll = (): void => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(update)
    }
    // 外层容器可能是宿主主区域（不是 window）：两个都挂
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [paged])

  const refresh = useCallback(() => {
    setLoading(true)
    void (async () => {
      const snapshot = await refreshAll()
      if (snapshot !== null) {
        applySnapshot(snapshot)
        logInfo('snapshot', t('action.refresh'), t('quota.snapshotAt', { time: snapshot.updatedAt }) + snapshot.buildSource)
      } else {
        logWarn('snapshot', t('action.refresh') + ' · ' + t('api.requestFailed'), REFRESH_PATH)
        await reloadFromEndpoints(sessions !== null || projects !== null || models !== null, true)
      }
      const usageResult = await loadUsage(bounds.from, bounds.to, 'ALL')
      if (usageResult !== null) setUsage(usageResult)
      setLoading(false)
    })()
  }, [applySnapshot, reloadFromEndpoints, sessions, projects, models, bounds.from, bounds.to, t])

  return (
    <div className={styles.section}>
      <div className={styles.stickyHead}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('app.title')}</h1>
        <span className={styles.rowSpacer} />
        <span className={styles.toolbarGroup}>
          <select
            className={styles.refreshSelect}
            value={refreshSeconds}
            onChange={(event) => setRefreshSeconds(Number(event.target.value))}
            aria-label={t('filter.refreshCycle')}
            title={t('filter.refreshCycle')}
          >
            {REFRESH_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>{refreshLabel(seconds)}</option>
            ))}
          </select>
          <button
            type="button"
            className={styles.iconBtn}
            disabled={loading}
            onClick={refresh}
            aria-label={loading ? t('action.refreshing') : t('action.refresh')}
            aria-busy={loading}
          >
            <span className={loading ? styles.refreshIconSpin : styles.refreshIcon} aria-hidden="true">↻</span>
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => { setSettingsTab('general'); setShowSettings(true) }}
            aria-label={t('action.settings')}
            title={t('action.settings')}
          >
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
              <circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path fill="none" stroke="currentColor" strokeWidth="1.3" stroke-linecap="round" d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" />
            </svg>
          </button>
          <a className={styles.ghLink} href={PLUGIN_REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub">
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
</a>

        </span>
      </div>

      <div className={styles.toolbarRow}>
        <span className={styles.toolbarGroup}>
          <span className={styles.rangeTabs}>
            {RANGES.map(([key, labelKey]) => (
              <button key={key} className={range === key ? styles.rangeTabActive : styles.rangeTab} onClick={() => setRange(key)}>{t(labelKey)}</button>
            ))}
          </span>
          <DateRangePicker
            from={customFrom}
            to={customTo}
            onChange={(from, to) => { setCustomFrom(from); setCustomTo(to); setRange('custom') }}
          />
        </span>
        <span className={styles.toolbarDivider} aria-hidden="true" />
        <MultiSelect
          options={channelOptions}
          selected={selectionOf(channelFilter)}
          onChange={(next) => setChannelFilter(next.join(','))}
          allLabel={t('s.allChannels')}
          ariaLabel={t('filter.channel')}
          searchLabel={t('filter.searchChannel')}
        />
        <MultiSelect
          options={projectOptions}
          selected={selectionOf(projectFilter)}
          onChange={(next) => setProjectFilter(next.join(','))}
          allLabel={t('filter.allProjects')}
          ariaLabel={t('filter.project')}
          searchLabel={t('filter.searchProject')}
        />
        <MultiSelect
          options={modelOptions}
          selected={selectionOf(modelFilter)}
          onChange={(next) => setModelFilter(next.join(','))}
          allLabel={t('filter.allModels')}
          ariaLabel={t('filter.model')}
          searchLabel={t('filter.searchModel')}
        />
      </div>

      <div className={styles.toolbarRow}>
        <div className={styles.tabBar}>
          {TABS.map(([tabId, labelKey]) => (
            <button key={tabId} className={activeTab === tabId ? styles.active : ''} onClick={() => pickSection(tabId)}>{t(labelKey)}</button>
          ))}
        </div>
        <span className={styles.rowSpacer} />
        <Button size="sm" className={styles.headBtn} disabled={scopedUsage === null} onClick={() => { if (scopedUsage !== null) exportUsageCsv(scopedUsage) }} ariaLabel={t('action.exportUsage')} title={t('action.exportUsage')}>
          {t('action.exportUsage')}
        </Button>
        <Button size="sm" className={styles.headBtn} disabled={sessions === null} onClick={() => { if (sessions !== null) exportSessionsCsv(sessions) }} ariaLabel={t('action.exportSessions')} title={t('action.exportSessions')}>
          {t('action.exportSessions')}
        </Button>
        <label className={styles.modeSwitch} title={t('section.modeHint')}>
          <input type="checkbox" checked={!paged} onChange={(event) => setPaged(!event.target.checked)} />
          {paged ? t('section.paged') : t('section.scroll')}
        </label>
      </div>
      </div>

      <div className={styles.sections}>
        {wants('quota') && (
          <section className={styles.pageSection} id="sec-quota">
            <h2 className={styles.pageSectionTitle}>{t('tab.quota')}</h2>
            <QuotaTab
              channels={channels}
              quotas={quotas}
              quotaOutcome={quotaOutcome}
              reloadToken={pricingRevision}
              onPricingReload={() => setPricingRevision((previous) => previous + 1)}
            />
          </section>
        )}
        {wants('overview') && (
          <section className={styles.pageSection} id="sec-overview">
            <h2 className={styles.pageSectionTitle}>{t('tab.overview')}</h2>
            <OverviewTab
              channels={channels}
              summary={summary}
              quotas={quotas}
              heatmap={heatmap}
              hourly={hourly}
              range={range}
              usage={scopedUsage}
              sessions={sessions}
              projects={projects}
              models={models}
              tooltip={tooltip}
              onOpenDetail={(provider) => { setChannelFilter(provider); goSection('detail') }}
              onOpenChannel={setQuotaDialog}
              onPickDay={(date) => { setRange('custom'); setCustomFrom(date); setCustomTo(date); goSection('detail') }}
              projectFilter={projectFilter}
              modelFilter={modelFilter}
            />
          </section>
        )}
        {wants('detail') && (
          <section className={styles.pageSection} id="sec-detail">
            <h2 className={styles.pageSectionTitle}>{t('tab.detail')}</h2>
            <DetailTab
              usage={scopedUsage}
              channels={channels}
              range={range}
              onRange={setRange}
              customFrom={customFrom}
              onCustomFrom={setCustomFrom}
              customTo={customTo}
              onCustomTo={setCustomTo}
              channelFilter={channelFilter}
              onChannelFilter={setChannelFilter}
              bounds={bounds}
              tooltip={tooltip}
              pricingRevision={pricingRevision}
              modelFilter={modelFilter}
            />
          </section>
        )}
        {wants('distribution') && (
          <section className={styles.pageSection} id="sec-distribution">
            <h2 className={styles.pageSectionTitle}>{t('tab.distribution')}</h2>
            <DistributionTab
              projects={projects}
              models={models}
              channels={channels}
              usage={scopedUsage}
              tooltip={tooltip}
              projectFilter={projectFilter}
              modelFilter={modelFilter}
            />
          </section>
        )}
        {wants('sessions') && (
          <section className={styles.pageSection} id="sec-sessions">
            <h2 className={styles.pageSectionTitle}>{t('tab.sessions')}</h2>
            <SessionsTab
              data={sessions}
              channels={channels}
              tooltip={tooltip}
              onOpenProject={(workspace) => { setProjectFilter(workspace === '' ? ORPHAN_PROJECT_VALUE : workspace); goSection('distribution') }}
              projectFilter={projectFilter}
              modelFilter={modelFilter}
            />
          </section>
        )}
        {wants('tools') && (
          <section className={styles.pageSection} id="sec-tools">
            <h2 className={styles.pageSectionTitle}>{t('tab.tools')}</h2>
            <ToolsTab data={tools} />
          </section>
        )}
        {wants('words') && (
          <section className={styles.pageSection} id="sec-words">
            <h2 className={styles.pageSectionTitle}>{t('tab.words')}</h2>
            <WordsTab prompts={prompts} />
          </section>
        )}
      </div>

      {showSettings && (
        <Dialog title={t('settings.title')} closeLabel={t('action.close')} onClose={() => setShowSettings(false)}>
          <SettingsDialog
            onPricingReload={() => setPricingRevision((previous) => previous + 1)}
            initialTab={settingsTab}
            todaySource={summary === null ? null : summary.todaySource}
            sessionDays={summary === null ? 0 : summary.sessionDates.length}
          />
        </Dialog>)}


      {quotaDialog !== null && (
        <Dialog title={t('nav.quota')} closeLabel={t('action.close')} onClose={() => setQuotaDialog(null)}>
          <QuotaTab
            onlyProvider={quotaDialog}
          channels={channels}
          quotas={quotas}
          quotaOutcome={quotaOutcome}
          reloadToken={pricingRevision}
          onPricingReload={() => setPricingRevision((previous) => previous + 1)}
        />
        </Dialog>
      )}

      <TooltipView tooltip={tooltip.tooltip} />
    </div>
  )
}


