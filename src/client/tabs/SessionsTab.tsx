/**
 * 会话用量：最耗会话 / 会话形态 / 最近会话三块。
 * 口径：服务端只采集结算样本数（calls），消息数与工具调用数没有单独字段，
 * 「会话形态」的消息 / 工具调用两档都按 calls 分档；时长按首末时间差（分钟）分档。
 * 三个列表都只列主会话：子代理不单独占行（判定只认服务端归一的 origin），父行标子会话数。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { channelOf, costCellOf } from '../core/channels.ts'
import { comparableMoneyOf, moneyTotalsTextOf } from '../core/currency.ts'
import { fmtCount, fmtDuration, fmtRelative, fmtTokens } from '../core/format.ts'
import { t, useT } from '../core/i18n.ts'
import { COST_SOURCE_LABELS, costSourceHintOf } from '../core/pricing.ts'
import { TipRow, TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import { SessionDetailDrawer } from '../components/SessionDetailDrawer.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { Select } from '../components/ui/Select.tsx'
import type { Channel, CostSource, SessionRow, SessionsResponse } from '../core/types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'
import sessionsStyles from '../styles/sessions.module.css'

type TopMetric = 'tokens' | 'cost' | 'duration'
type ShapeMetric = 'messages' | 'duration' | 'tools'
/** 范围两档：全部会话 / 隐藏已归档。归档只影响列出与否，统计口径不变。 */
type Scope = 'all' | 'hideArchived'

/** 榜单条数：与「会话形态」的直方图等高。 */
const TOP_LIMIT = 5

/** 形态分布 6 档，与原型一致。 */
const SHAPE_BUCKETS: Array<{ min: number; max: number }> = [
  { min: 1, max: 5 },
  { min: 6, max: 15 },
  { min: 16, max: 30 },
  { min: 31, max: 60 },
  { min: 61, max: 120 },
  { min: 121, max: Number.POSITIVE_INFINITY },
]
const BUCKET_LABELS = ['1-5', '6-15', '16-30', '31-60', '61-120', '121+']

/** 首屏渲染 50 个：本机上百个会话，一次全渲染会明显卡顿。 */
const PAGE_SIZE = 50

/** 价目算出来的金额（内置价目 / 聚合价 / 同模型官方价）不是账单金额，按原型加 ≈ 前缀。 */
const ESTIMATED_COST_SOURCES: CostSource[] = ['catalog', 'aggregate', 'model']

export function SessionsTab(props: {
  data: SessionsResponse | null
  channels: Channel[]
  tooltip: TooltipApi
  /** 点工作目录：切到「项目用量」并只看这个项目（筛选状态提升在 KeyUsageSection） */
  onOpenProject: (workspace: string) => void
  /** 全局项目筛选（`'ALL'` = 不过滤）：按会话行的 workspace 匹配；`''` 表示未归入工作区。 */
  projectFilter?: string
  /** 全局模型筛选（`'ALL'` = 不过滤）：会话行的 `models` 桶里出现该模型才保留。 */
  modelFilter?: string
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const [nowMs] = useState(() => Date.now())
  const [topMetric, setTopMetric] = useState<TopMetric>('tokens')
  const [shapeMetric, setShapeMetric] = useState<ShapeMetric>('messages')
  const [scope, setScope] = useState<Scope>('all')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [detailId, setDetailId] = useState<string | null>(null)
  const projectFilter = props.projectFilter ?? 'ALL'
  const modelFilter = props.modelFilter ?? 'ALL'
  /** 未过滤的全量行：会话详情抽屉里的子会话列表仍按全量找，筛选只作用于列表与榜单 */
  const allRows = props.data?.rows ?? []
  /** 两个筛选都作用在行上：榜单 / 形态 / 计数 / 最近列表全部由过滤后的行重算 */
  const rows = useMemo(() => allRows.filter((row) => {
    if (projectFilter !== 'ALL' && (row.workspace ?? '') !== projectFilter) return false
    if (modelFilter !== 'ALL' && !row.models.some((model) => model.model === modelFilter)) return false
    return true
  }), [allRows, projectFilter, modelFilter])

  // 换了范围 / 搜索 / 全局筛选就回到第一页：否则用户改了条件还停在第 N 屏，看着像没生效
  useEffect(() => { setPageSize(PAGE_SIZE) }, [scope, query, projectFilter, modelFilter])

  /** 只列主会话：子代理不单独占行（详情抽屉里仍可逐个点开）。 */
  const mainRows = useMemo(() => rows.filter((row) => !isSubagentOf(row)), [rows])

  /** 有结算样本的会话才算用量：没有 calls 也没有 tokens 的空壳不进榜单与形态分布。 */
  const pool = useMemo(() => mainRows.filter((row) => row.calls > 0 || row.tokens > 0), [mainRows])

  const topRows = useMemo(() => pool
    .map((row) => ({ row, value: topValueOf(row, topMetric) }))
    // 成本没有价目依据时是 null：宁可这一档空着，也不把「无依据」当 0 排进榜
    .filter((entry) => entry.value > 0)
    .sort((first, second) => second.value - first.value)
    .slice(0, TOP_LIMIT)
    .map((entry) => entry.row), [pool, topMetric])

  const histogram = useMemo(() => SHAPE_BUCKETS.map((bucket) => pool.filter((row) => {
    const value = shapeValueOf(row, shapeMetric)
    return value >= bucket.min && value <= bucket.max
  }).length), [pool, shapeMetric])

  const recentRows = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return mainRows.filter((row) => {
      // 没有人类提问的会话（标题与首条提问都空）是 teammate / 系统会话，列出来只是噪音
      if ((row.title ?? '') === '' && (row.prompt ?? '') === '') return false
      if (keyword === '') return true
      // 首条提问正文也参与搜索：系统注入文本已在服务端被跳过，这里拿到的是真实提问
      const haystack = (row.title ?? '') + ' ' + row.id + ' ' + (row.workspace ?? '') + ' ' + (row.prompt ?? '')
      return haystack.toLowerCase().includes(keyword)
    }).sort((first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0))
  }, [mainRows, query])

  /** 归档只影响列出的行：会话数与用量统计仍按全部会话算（归档只标注、不剔除）。 */
  const visibleRows = useMemo(
    () => (scope === 'hideArchived' ? recentRows.filter((row) => !row.archived) : recentRows),
    [recentRows, scope],
  )

  if (props.data === null) return <EmptyState title={t('s.loading')} />

  const shownRows = visibleRows.slice(0, pageSize)
  const histogramMax = Math.max(1, ...histogram)
  const detailRow = detailId === null ? null : allRows.find((row) => row.id === detailId) ?? null
  const rowOptions: RowOptions = {
    channels: props.channels,
    tooltip: props.tooltip,
    nowMs,
    onOpenDetail: (id: string) => setDetailId(id),
    onOpenProject: props.onOpenProject,
  }

  return (
    <div className={sessionsStyles.page}>
      {props.data.coverage.status !== 'complete' && (
        <div className={styles.warning}>
          {props.data.coverage.status === 'unavailable'
            ? t('s.unavailable')
            : t('s.partial') + ' ' + String(props.data.coverage.skippedSessions) + t('s.partialTail')}
        </div>
      )}

      <div className={sessionsStyles.grid2}>
        <section className={sessionsStyles.panel}>
          <div className={sessionsStyles.panelHead}>
            <b className={sessionsStyles.panelTitle}>{t('sessions.top')}</b>
            <MetricSwitch
              value={topMetric}
              onChange={setTopMetric}
              options={[
                { value: 'tokens', label: t('sessions.metricTokens') },
                { value: 'cost', label: t('sessions.metricCost') },
                { value: 'duration', label: t('sessions.metricDuration') },
              ]}
            />
            <span className={sessionsStyles.panelTotal}>{t('sessions.count', { count: fmtCount(pool.length) })}</span>
          </div>
          {topRows.length === 0
            ? <div className={styles.empty}>{t(topMetric === 'cost' ? 's.noCost' : 'sessions.noData')}</div>
            : topRows.map((row, index) => topRowOf(row, index + 1, topMetric, props.channels, () => setDetailId(row.id)))}
        </section>

        <section className={sessionsStyles.panel}>
          <div className={sessionsStyles.panelHead}>
            <b className={sessionsStyles.panelTitle}>{t('sessions.shape')}</b>
            <MetricSwitch
              value={shapeMetric}
              onChange={setShapeMetric}
              options={[
                { value: 'messages', label: t('sessions.metricMessages'), hint: t('sessions.callsBucket') },
                { value: 'duration', label: t('sessions.metricDuration') },
                { value: 'tools', label: t('sessions.metricTools'), hint: t('sessions.callsBucket') },
              ]}
            />
            <span className={sessionsStyles.panelTotal}>{t('sessions.count', { count: fmtCount(pool.length) })}</span>
          </div>
          {pool.length === 0
            ? <div className={styles.empty}>{t('sessions.noData')}</div>
            : (
              <>
                <div className={sessionsStyles.hist}>
                  {histogram.map((count, index) => (
                    <div
                      className={sessionsStyles.histCol}
                      key={BUCKET_LABELS[index]}
                      title={BUCKET_LABELS[index] + ' · ' + fmtCount(count)}
                    >
                      <span
                        className={sessionsStyles.histBar + (count === histogramMax ? ' ' + sessionsStyles.histBarTop : '')}
                        style={{ height: (count === 0 ? 0 : Math.max(4, count / histogramMax * 100)) + '%' }}
                      />
                    </div>
                  ))}
                </div>
                <div className={sessionsStyles.histX}>
                  {BUCKET_LABELS.map((label) => <span key={label}>{label}</span>)}
                </div>
              </>
            )}
        </section>
      </div>

      <section className={sessionsStyles.panel}>
        <div className={sessionsStyles.panelHead}>
          <b className={sessionsStyles.panelTitle}>{t('sessions.recent')}</b>
          <Select
            ariaLabel={t('sessions.scope')}
            value={scope}
            onChange={(value) => setScope(value as Scope)}
            options={[
              { value: 'all', labelKey: 'sessions.all' },
              { value: 'hideArchived', labelKey: 'sessions.hideArchived' },
            ]}
          />
          <input
            className={listStyles.searchInput + ' ' + sessionsStyles.searchInput}
            placeholder={t('sessions.searchPlaceholder')}
            aria-label={t('sessions.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className={sessionsStyles.panelTotal}>{t('sessions.count', { count: fmtCount(recentRows.length) })}</span>
        </div>
        {visibleRows.length === 0
          ? <div className={styles.empty}>{t('s.empty')}</div>
          : shownRows.map((row) => recentRowOf(row, rowOptions))}
        {visibleRows.length > shownRows.length && (
          <div className={listStyles.moreRow}>
            <button type="button" className={listStyles.moreBtn} onClick={() => setPageSize(pageSize + PAGE_SIZE)}>
              {t('s.loadMore', { count: PAGE_SIZE })}
            </button>
            <span className={listStyles.moreText}>{t('s.shownCount', { shown: shownRows.length, total: visibleRows.length })}</span>
          </div>
        )}
      </section>

      {detailId !== null && (
        <SessionDetailDrawer
          sessionId={detailId}
          fallbackTitle={detailRow?.title ?? null}
          channels={props.channels}
          // 列表只列主会话，子会话的逐个点开入口留在这里（不并进本会话总量）
          subagents={detailRow === null ? [] : allRows.filter((row) => isSubagentOf(row) && row.parentSessionId === detailRow.id)}
          onOpenSession={setDetailId}
          parentId={detailRow?.parentSessionId ?? null}
          parentTitle={detailRow === null || detailRow.parentSessionId == null ? null : (allRows.find((row) => row.id === detailRow.parentSessionId)?.title ?? null)}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}

interface RowOptions {
  channels: Channel[]
  tooltip: TooltipApi
  nowMs: number
  onOpenDetail: (id: string) => void
  onOpenProject: (workspace: string) => void
}

/** 指标切换：三档分段控件，选中档给 aria-pressed；口径有兜底的档给悬停说明。 */
function MetricSwitch<TValue extends string>(props: {
  value: TValue
  options: Array<{ value: TValue; label: string; hint?: string }>
  onChange: (value: TValue) => void
}): ReactNode {
  return (
    <div className={sessionsStyles.metrics} role="group">
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={sessionsStyles.metricBtn + (option.value === props.value ? ' ' + sessionsStyles.metricBtnOn : '')}
          aria-pressed={option.value === props.value}
          title={option.hint}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** 最耗会话的一行：排名 + 标题 / 副标 + 右侧大数字与其下的次要数值。 */
function topRowOf(row: SessionRow, rank: number, metric: TopMetric, channels: Channel[], onOpen: () => void): ReactNode {
  const channel = channelOf(channels, row.provider)
  const value = topTextOf(row, metric, channel)
  const subagentCount = row.subagentCount ?? 0
  const subParts: string[] = [row.workspace === null ? t('s.noWorkspace') : row.workspace]
  subParts.push(t('sessions.calls', { count: fmtCount(row.calls) }))
  // 时长档的大数字已经是时长，副标再写「跨 N 天」就是同一件事说两遍
  if (metric !== 'duration' && row.crossDays > 0) subParts.push(t('sessions.crossDays', { days: row.crossDays }))
  if (subagentCount > 0) subParts.push(t('sessions.subagents', { count: subagentCount }))
  return (
    <button
      key={row.id}
      type="button"
      className={sessionsStyles.topRow + (row.archived ? ' ' + sessionsStyles.archived : '')}
      onClick={onOpen}
    >
      <span className={sessionsStyles.rank}>{rank}</span>
      <span className={sessionsStyles.rowBody}>
        <span className={sessionsStyles.titleLine}>
          <span className={sessionsStyles.rowTitle}>{titleOf(row)}</span>
          {row.archived && <span className={sessionsStyles.tag}>{t('s.archived')}</span>}
        </span>
        <span className={sessionsStyles.rowSub}>{subParts.join(' · ')}</span>
      </span>
      <span className={sessionsStyles.rowValue}>
        <span className={sessionsStyles.rowBig}>{value.big}</span>
        <span className={sessionsStyles.rowSmall}>{value.small}</span>
      </span>
    </button>
  )
}

/** 最近会话的一行：标题 + 副标（项目 · 模型 · 时间）｜ Tokens ｜ 成本 ｜ ›。 */
function recentRowOf(row: SessionRow, options: RowOptions): ReactNode {
  const channel = channelOf(options.channels, row.provider)
  const model = dominantModelOf(row)
  const ioBreakdown = ioBreakdownOf(row)
  return (
    <div
      key={row.id}
      className={sessionsStyles.row + (row.archived ? ' ' + sessionsStyles.archived : '')}
      onClick={() => options.onOpenDetail(row.id)}
    >
      <div className={sessionsStyles.rowBody}>
        <div className={sessionsStyles.titleLine}>
          <button
            type="button"
            className={sessionsStyles.titleBtn}
            onClick={(event) => {
              event.stopPropagation()
              options.onOpenDetail(row.id)
            }}
          >
            {titleOf(row)}
          </button>
          {row.archived && <span className={sessionsStyles.tag}>{t('s.archived')}</span>}
          {(row.subagentCount ?? 0) > 0 && (
            <span
              className={sessionsStyles.tag + ' ' + sessionsStyles.tagChildren}
              title={t('sessions.subagentTokens', { tokens: fmtTokens(row.subagentTokens ?? 0) })}
            >
              {t('sessions.subagents', { count: row.subagentCount ?? 0 })}
            </span>
          )}
        </div>
        <div className={sessionsStyles.rowSub}>
          {row.workspace === null
            ? t('s.noWorkspace')
            : (
              <button
                type="button"
                className={listStyles.linkBtn}
                title={t('s.gotoProject') + row.workspace}
                onClick={(event) => {
                  event.stopPropagation()
                  options.onOpenProject(row.workspace ?? '')
                }}
              >
                {row.workspace}
              </button>
            )}
          {model === null ? '' : ' · ' + model}
          {' · ' + fmtRelative(row.lastTime, options.nowMs)}
        </div>
      </div>
      <div className={sessionsStyles.tokens}>
        <span className={sessionsStyles.tokensValue}>{fmtTokens(row.tokens)}</span>
        {ioBreakdown === null ? null : <span className={sessionsStyles.tokensSub}>{ioBreakdown}</span>}
      </div>
      <div
        className={sessionsStyles.cost}
        onMouseEnter={(event) => options.tooltip.show(event, costTipOf(row))}
        onMouseMove={(event) => options.tooltip.show(event, costTipOf(row))}
        onMouseLeave={options.tooltip.hide}
      >
        {costTextOf(channel, row)}
      </div>
      <span className={sessionsStyles.chev} aria-hidden="true">›</span>
    </div>
  )
}

/** 成本单元格的悬停说明：这一格钱是怎么来的（≈ 只写得下「估算」这一个信号）。 */
function costTipOf(row: SessionRow): ReactNode {
  const source = row.costSource ?? 'none'
  return (
    <>
      <TipTitle>{t('s.sessionCost')}</TipTitle>
      <TipSub>{costSourceHintOf(source, row.partial)}</TipSub>
      <TipRow
        label={t('s.amount')}
        amount={row.cost === null ? '—' : moneyTotalsTextOf(row)}
        rate={t(COST_SOURCE_LABELS[source] ?? source)}
      />
    </>
  )
}

/** 成本文案：价目算出来的金额加 ≈（折算已经带 ≈ 的不重复加）。 */
function costTextOf(channel: Channel | null, row: SessionRow): string {
  const cell = costCellOf(channel, row)
  if (!cell.amount) return cell.text
  const source = row.costSource
  if (source === undefined || !ESTIMATED_COST_SOURCES.includes(source)) return cell.text
  return cell.text.startsWith('≈') ? cell.text : '≈' + cell.text
}

function topValueOf(row: SessionRow, metric: TopMetric): number {
  // 成本按展示币种折算后比较（逐币种小计优先），折算不了才退回原值
  if (metric === 'cost') return comparableMoneyOf(row) ?? row.cost ?? 0
  if (metric === 'duration') return durationOf(row)
  return row.tokens
}

function topTextOf(row: SessionRow, metric: TopMetric, channel: Channel | null): { big: string; small: string } {
  const cost = costTextOf(channel, row)
  if (metric === 'cost') return { big: cost, small: fmtTokens(row.tokens) }
  if (metric === 'duration') return { big: fmtDuration(durationOf(row)), small: cost }
  return { big: fmtTokens(row.tokens), small: cost }
}

/** 形态分档值：消息 / 工具调用都取结算样本数，时长取分钟（不足 1 分钟按 1 算，落进第一档）。 */
function shapeValueOf(row: SessionRow, metric: ShapeMetric): number {
  if (metric === 'duration') return Math.max(1, Math.round(durationOf(row) / 60000))
  return row.calls
}

function durationOf(row: SessionRow): number {
  if (row.firstTime === null || row.lastTime === null) return 0
  return Math.max(0, row.lastTime - row.firstTime)
}

/** 子代理只认服务端归一后的 origin（宿主投影 `subagent.identity`）；父会话链接不作为判定依据。 */
function isSubagentOf(row: SessionRow): boolean {
  return row.origin === 'subagent'
}

function titleOf(row: SessionRow): string {
  return row.title ?? t('s.noPrompt') + ' · ' + shortIdOf(row.id)
}

/** 会话头通常不带标题，用 id 的短片段做可读标识。 */
function shortIdOf(id: string): string {
  return id.replace(/^session-/, '').slice(0, 8)
}

/** 副标只放得下一个模型：取该会话 tokens 最多的那个。 */
function dominantModelOf(row: SessionRow): string | null {
  let best: { model: string; tokens: number } | null = null
  for (const model of row.models) {
    if (best === null || model.tokens > best.tokens) best = { model: model.model, tokens: model.tokens }
  }
  return best === null ? null : best.model
}

/**
 * 最近会话 Tokens 下方的第二行：输入 / 输出 / 缓存读按模型分桶求和。
 * 列表行的 tokens 只有总数，分桶挂在 `models[].buckets` 上；三者全为 0（或老快照没有 buckets）时不显示，
 * 避免出现「输入 0 · 输出 0」这种没有信息量的行。
 */
function ioBreakdownOf(row: SessionRow): string | null {
  let inputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  for (const model of row.models) {
    inputTokens += model.buckets?.inputTokens ?? 0
    outputTokens += model.buckets?.outputTokens ?? 0
    cacheReadTokens += model.buckets?.cacheReadTokens ?? 0
  }
  if (inputTokens === 0 && outputTokens === 0 && cacheReadTokens === 0) return null
  return [
    t('c.input') + ' ' + fmtTokens(inputTokens),
    t('c.output') + ' ' + fmtTokens(outputTokens),
    t('c.cacheRead') + ' ' + fmtTokens(cacheReadTokens),
  ].join(' · ')
}
