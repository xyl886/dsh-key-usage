/**
 * 「使用情况」设置页外壳：Tab 路由、范围 / 通道筛选状态与取数。
 * 台账类数据（通道 / 台账 / 热力图 / 汇总 / 快照）来自本地文件端点；
 * 项目与会话数据来自宿主会话事件折叠，切到对应 Tab 时才首次拉取。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadChannels, loadHeatmap, loadProjects, loadQuota, loadSessions, loadSummary, loadUsage } from './api.ts'
import { isoDate, shiftedIsoDate } from './format.ts'
import { TooltipView, useTooltip } from './tooltip.tsx'
import { OverviewTab } from './tabs/OverviewTab.tsx'
import { DetailTab, type RangeKey } from './tabs/DetailTab.tsx'
import { ProjectsTab } from './tabs/ProjectsTab.tsx'
import { QuotaTab } from './tabs/QuotaTab.tsx'
import { SessionsTab } from './tabs/SessionsTab.tsx'
import type { DetailSortState } from './components/DailyDetailTable.tsx'
import type {
  Channel,
  HeatmapDay,
  ProjectsResponse,
  QuotaProvider,
  SessionsResponse,
  SummaryResponse,
  UsageResponse,
} from './types.ts'
import styles from './styles/shared.module.css'

type TabId = 'overview' | 'detail' | 'projects' | 'sessions' | 'quota'

const TABS: Array<[TabId, string]> = [
  ['overview', '总览'],
  ['detail', '使用明细'],
  ['projects', '项目用量'],
  ['sessions', '会话用量'],
  ['quota', '余额与配额'],
]

export function KeyUsageSection() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [range, setRange] = useState<RangeKey>('month')
  const [customFrom, setCustomFrom] = useState(() => shiftedIsoDate(-29))
  const [customTo, setCustomTo] = useState(() => isoDate(new Date()))
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({})
  const [detailSort, setDetailSort] = useState<DetailSortState>({ key: 'period', dir: 'desc' })

  const [channels, setChannels] = useState<Channel[]>([])
  const [quotas, setQuotas] = useState<QuotaProvider[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([])
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [sessions, setSessions] = useState<SessionsResponse | null>(null)
  const [projects, setProjects] = useState<ProjectsResponse | null>(null)
  const [available, setAvailable] = useState<{ from: string; to: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const tooltip = useTooltip()

  const reload = useCallback(async (includeSessionData: boolean) => {
    setLoading(true)
    const [channelResult, quotaResult, summaryResult, heatmapResult] = await Promise.all([
      loadChannels(), loadQuota(), loadSummary(), loadHeatmap(),
    ])
    setChannels(channelResult ?? [])
    setQuotas(quotaResult ?? [])
    setSummary(summaryResult)
    setHeatmap(heatmapResult ?? [])
    if (includeSessionData) {
      const [sessionResult, projectResult] = await Promise.all([loadSessions(), loadProjects()])
      setSessions(sessionResult)
      setProjects(projectResult)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void reload(false) }, [reload])

  // 项目 / 会话数据按需加载（首次切到对应 Tab 时）
  useEffect(() => {
    if (activeTab === 'sessions' && sessions === null) void loadSessions().then(setSessions)
    if (activeTab === 'projects' && projects === null) void loadProjects().then(setProjects)
  }, [activeTab, sessions, projects])

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
  }, [bounds.from, bounds.to, channelFilter])

  const refresh = useCallback(() => {
    void reload(activeTab === 'sessions' || activeTab === 'projects' || sessions !== null || projects !== null)
    void loadUsage(bounds.from, bounds.to, channelFilter).then((result) => { if (result !== null) setUsage(result) })
  }, [reload, activeTab, sessions, projects, bounds.from, bounds.to, channelFilter])

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
        />
      )}
      {activeTab === 'projects' && <ProjectsTab data={projects} channels={channels} />}
      {activeTab === 'sessions' && <SessionsTab data={sessions} channels={channels} />}
      {activeTab === 'quota' && <QuotaTab channels={channels} quotas={quotas} />}

      <div className={styles.footnote}>
        <b>口径说明</b>：按天数据优先取宿主用量台账（有官方成本）；台账没有记录的日期回退到本地会话事件折叠
        （那些天没有官方成本，界面上会标注来源）—— 两套来源按天取舍、不相加，避免重复计数；
        项目用量与会话用量全部来自会话事件，每个结算样本计一次调用，单日「按小时」视图同理（不含成本）；
        命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）；余额与订阅窗口原样展示官方接口返回的数据，不做换算与建议。
      </div>

      <TooltipView tooltip={tooltip.tooltip} />
    </div>
  )
}
