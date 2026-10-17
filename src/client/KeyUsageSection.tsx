/** 「使用情况」页外壳：Tab 路由、筛选状态与取数（会话类数据切到对应 Tab 时才首次拉取）。 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadChannels, loadHeatmap, loadModels, loadPricing, loadProjects, loadQuota, loadSessions, loadSnapshot, loadSummary, loadUsage, refreshAll, REFRESH_PATH } from './core/api.ts'
import { useCurrencyDisplay } from './core/currency.ts'
import { isoDate, shiftedIsoDate } from './core/format.ts'
import { t, useT } from './core/i18n.ts'
import { PLUGIN_VERSION } from './core/version.ts'
import { hydrateLog, logInfo, logWarn, subscribeOpenLog } from './core/log.ts'
import { PLUGIN_REPO_URL } from './core/pricing.ts'
import { TooltipView, useTooltip } from './core/tooltip.tsx'
import { Button } from './components/ui/Button.tsx'
import { LogPanel } from './components/LogPanel.tsx'
import { Dialog } from './components/ui/Dialog.tsx'
import { SettingsDialog } from './components/SettingsDialog.tsx'
import { OverviewTab } from './tabs/OverviewTab.tsx'
import { DetailTab, type RangeKey } from './tabs/DetailTab.tsx'
import { DistributionTab } from './tabs/DistributionTab.tsx'
import { QuotaTab } from './tabs/QuotaTab.tsx'
import { SessionsTab } from './tabs/SessionsTab.tsx'
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
} from './core/types.ts'
import styles from './styles/shared.module.css'

type TabId = 'overview' | 'detail' | 'distribution' | 'sessions' | 'quota'

const TABS: Array<[TabId, string]> = [
  ['overview', 'tab.overview'],
  ['detail', 'tab.detail'],
  ['distribution', 'tab.distribution'],
  ['sessions', 'tab.sessions'],
]

export function KeyUsageSection() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [range, setRange] = useState<RangeKey>('month')
  const [customFrom, setCustomFrom] = useState(() => shiftedIsoDate(-29))
  const [customTo, setCustomTo] = useState(() => isoDate(new Date()))
  const [channelFilter, setChannelFilter] = useState('ALL')
  /** 跨 Tab 联动：从「会话用量」点工作目录进来时只看那一个项目（不做全局路由） */
  const [projectFilter, setProjectFilter] = useState<string | null>(null)

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
  /** 口径说明放进弹窗：内容可以写长，但不再占版面。 */
  const [showCaliber, setShowCaliber] = useState(false)
  /** 设置弹窗：币种、汇率、价目的来源与刷新都收在这里，页面里只留结论。 */
  const [showSettings, setShowSettings] = useState(false)
  /** 总览的通道行点击：余额/配额 + 单价表放进弹窗（原来的「余额与配额」Tab 已移除） */
  const [quotaDialog, setQuotaDialog] = useState<string | null>(null)
  const [showLog, setShowLog] = useState(false)
  /** 取词函数：宿主切语言时 useT 触发重渲染，文案跟着切 */
  const t = useT()
  const lastSnapshotAt = useRef(0)
  const tooltip = useTooltip()

  /** 订阅显示币种：金额随它重渲染（币种与汇率本身在设置弹窗里改）。 */
  useCurrencyDisplay()

  /**
   * 快照段按当前页取：总览要的三段是底座，其余段切到对应 Tab 时才要（会话段近 200 KB）。
   * 服务端只裁剪下发，构建仍是全量一份，所以不可能出现「两个数据源」。
   */
  const sectionsForTab = useCallback((tab: TabId): string[] => {
    const base = ['channels', 'overview', 'heatmap', 'quota']
    if (tab === 'sessions') return [...base, 'sessions']
    if (tab === 'distribution') return [...base, 'projects', 'models']
    return base
  }, [])

  /** 用户是否还在看默认范围（近 30 天 / 全部通道）：是才采用快照里的 usage，否则会覆盖他自己的选择。 */
  const usageIsDefaultRef = useRef(true)
  usageIsDefaultRef.current = range === 'month' && channelFilter === 'ALL'

  /** 把一份快照落到各 Tab 的状态上（快照是 6 个 Tab 的唯一数据来源）。 */
  const applySnapshot = useCallback((snapshot: SnapshotResponse) => {
    const sections = snapshot.sections
    setQuotaOutcome(snapshot.quotaOutcome)
    if (sections.channels !== undefined && sections.channels !== null) setChannels(sections.channels.channels ?? [])
    if (sections.quota !== undefined && sections.quota !== null) setQuotas(sections.quota.providers ?? [])
    if (sections.overview !== undefined) setSummary(sections.overview)
    if (sections.heatmap !== undefined && sections.heatmap !== null) setHeatmap(sections.heatmap.days ?? [])
    if (sections.sessions !== undefined) setSessions(sections.sessions)
    if (sections.projects !== undefined) setProjects(sections.projects)
    if (sections.models !== undefined) setModels(sections.models)
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
      logWarn('snapshot', t('log.issue') + '：' + issue.kind, issue.message)
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
      // 打开页面就要最新：服务端先保证本地段重算过（超过防抖下限才重算），配额段后台补查
      const snapshot = await loadSnapshot(true, sectionsForTab(activeTab))
      if (cancelled) return
      if (snapshot !== null) applySnapshot(snapshot)
      else await reloadFromEndpoints(false, false)
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [activeTab, applySnapshot, reloadFromEndpoints, sectionsForTab])

  /**
   * 打开页面时服务端可能还在重建（`building`）或后台补查配额（`quotaRefreshing`）：
   * 隔一会儿追取几次，拿到新数据就换上，用户不用手动刷新。最多追 6 次（约 12 秒）就放弃。
   */
  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const chase = async (): Promise<void> => {
      const snapshot = await loadSnapshot(false, sectionsForTab(activeTab))
      if (cancelled || snapshot === null) return
      applySnapshot(snapshot)
      if (snapshot.building === true || snapshot.quotaRefreshing === true) {
        attempts += 1
        if (attempts < 6) timer = setTimeout(() => { void chase() }, 2000)
      }
    }
    timer = setTimeout(() => { void chase() }, 1500)
    return () => { cancelled = true; if (timer !== null) clearTimeout(timer) }
  }, [activeTab, applySnapshot, sectionsForTab])

  // 磁盘上的历史日志读回内存（刷新页面后还能看到上次为什么失败），并允许页面里任何组件请求打开日志窗
  useEffect(() => { void hydrateLog() }, [])
  useEffect(() => subscribeOpenLog(() => setShowLog(true)), [])

  // 5 分钟本地刷新：服务端每 5 分钟重建一次快照，这里跟着取最新那份；页面隐藏时暂停，切回且已超期立刻补一次
  useEffect(() => {
    const pollMs = 5 * 60 * 1000
    const tick = (): void => {
      if (document.visibilityState === 'hidden') return
      if (Date.now() - lastSnapshotAt.current < pollMs) return
      void loadSnapshot(false, sectionsForTab(activeTab)).then((snapshot) => { if (snapshot !== null) applySnapshot(snapshot) })
    }
    const timer = setInterval(tick, pollMs)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [activeTab, applySnapshot, sectionsForTab])

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
    if (activeTab === 'distribution') {
      if (projects === null) void loadProjects().then(setProjects)
      if (models === null) void loadModels().then(setModels)
    }
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
      if (snapshot !== null) {
        applySnapshot(snapshot)
        logInfo('snapshot', t('action.refresh'), t('quota.snapshotAt', { time: snapshot.updatedAt }) + snapshot.buildSource)
      } else {
        logWarn('snapshot', t('action.refresh') + ' · ' + t('api.requestFailed'), REFRESH_PATH)
        await reloadFromEndpoints(sessions !== null || projects !== null || models !== null, true)
      }
      const usageResult = await loadUsage(bounds.from, bounds.to, channelFilter)
      if (usageResult !== null) setUsage(usageResult)
      setLoading(false)
    })()
  }, [applySnapshot, reloadFromEndpoints, sessions, projects, models, bounds.from, bounds.to, channelFilter, t])

  return (
    <div className={styles.section}>
      <div className={styles.title}>
        <span>{t('app.title')}</span>
        <span className={styles.titleActions}>
          <Button size="sm" ariaLabel={t('log.title')} title={t('log.title')} onClick={() => setShowLog(true)}>
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
              <rect x="1.6" y="2.2" width="12.8" height="11.6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <rect x="3.6" y="4.6" width="5.2" height="1.4" rx="0.7" fill="currentColor" />
              <rect x="3.6" y="7.4" width="8.8" height="1.4" rx="0.7" fill="currentColor" />
              <rect x="3.6" y="10.2" width="6.6" height="1.4" rx="0.7" fill="currentColor" />
            </svg>
          </Button>
          <Button size="sm" onClick={() => setShowCaliber(true)} ariaLabel={t('action.caliber')} title={t('action.caliber')}>
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
              <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="8" cy="4.9" r="0.85" fill="currentColor" />
              <rect x="7.15" y="6.9" width="1.7" height="5" rx="0.85" fill="currentColor" />
            </svg>
          </Button>
          <Button size="sm" onClick={() => setShowSettings(true)} ariaLabel={t('action.settings')} title={t('action.settings')}>
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
              <circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path fill="none" stroke="currentColor" strokeWidth="1.3" stroke-linecap="round" d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" />
            </svg>
          </Button>
          <a className={styles.ghLink} href={PLUGIN_REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub">
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
</a>
          <button
            className={styles.refreshBtn}
            disabled={loading}
            onClick={refresh}
            aria-label={loading ? t('action.refreshing') : t('action.refresh')}
            aria-busy={loading}
          >
            <span className={loading ? styles.refreshIconSpin : styles.refreshIcon} aria-hidden="true">↻</span>
          </button>
        </span>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(([tabId, labelKey]) => (
          <button key={tabId} className={activeTab === tabId ? styles.active : ''} onClick={() => setActiveTab(tabId)}>{t(labelKey)}</button>
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
          onOpenChannel={setQuotaDialog}
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
          bounds={bounds}
          tooltip={tooltip}
          pricingRevision={pricingRevision}
        />
      )}
      {activeTab === 'distribution' && (
        <DistributionTab
          projects={projects}
          models={models}
          channels={channels}
          tooltip={tooltip}
          focusWorkspace={projectFilter}
          onClearFocus={() => setProjectFilter(null)}
        />
      )}
      {activeTab === 'sessions' && (
        <SessionsTab
          data={sessions}
          channels={channels}
          tooltip={tooltip}
          onOpenProject={(workspace) => { setProjectFilter(workspace); setActiveTab('distribution') }}
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

      {showCaliber && (
      <Dialog title={t('caliber.title')} closeLabel={t('action.close')} onClose={() => setShowCaliber(false)}>
        <div className={styles.caliberVersion}>{t('caliber.version', { version: PLUGIN_VERSION })}</div>
        <ul className={styles.footnoteList}>
          <li>
            {t('caliber.source', {
              days: summary !== null && summary.todaySource === 'session'
                ? t('caliber.sourceDays', { count: summary.sessionDates.length })
                : '',
            })}
          </li>
          <li>{t('caliber.cost')}</li>
        <li>{t('caliber.costHint')}</li>
        <li>{t('caliber.pricingInfo')}</li>
          <li>{t('caliber.sessionSource')}</li>
          <li>{t('caliber.refresh')}</li>
        </ul>
      </Dialog>)}

      {showSettings && (
        <Dialog title={t('settings.title')} closeLabel={t('action.close')} onClose={() => setShowSettings(false)}>
          <SettingsDialog onPricingReload={() => setPricingRevision((previous) => previous + 1)} />
        </Dialog>)}

      {showLog && (
      <Dialog title={t('log.title')} closeLabel={t('action.close')} onClose={() => setShowLog(false)}>
        <LogPanel />
      </Dialog>)}

      {quotaDialog !== null && (
        <Dialog title={t('nav.quota')} closeLabel={t('action.close')} onClose={() => setQuotaDialog(null)}>
          <QuotaTab
            onlyProvider={quotaDialog}
          channels={channels}
          quotas={quotas}
          pricing={pricing}
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


