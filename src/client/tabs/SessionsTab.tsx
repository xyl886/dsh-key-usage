/** 会话用量：按会话列出 tokens / 命中率 / 时长；点行开详情，行内可展开模型构成。 */
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { channelColorOf, channelOf, costCellOf, displayNameOf } from '../channels.ts'
import { fmtDateTime, fmtDuration, fmtTime, fmtTokens, isoDate } from '../format.ts'
import { moneyTotalsTextOf } from '../currency.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../export.ts'
import { dropEmptyRows, hiddenEmptyRowsText } from '../rows.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { SessionDetailDrawer } from '../components/SessionDetailDrawer.tsx'
import { COST_SOURCE_LABELS, costSourceHintOf } from '../pricing.ts'
import { TipRow, TipSub, TipTitle, type TooltipApi } from '../tooltip.tsx'
import type { Channel, SessionRow, SessionsResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'
import exportStyles from '../styles/export.module.css'

type SortKey = 'recent' | 'tokensDesc' | 'tokensAsc' | 'durationDesc' | 'costDesc' | 'hitDesc' | 'callsDesc'
/** 会话归档筛选：与宿主原生「筛选会话」菜单同三档。 */
type ArchiveFilter = 'hide' | 'all' | 'only'

/** 首屏渲染 50 个：本机有 ~130 个会话，一次全渲染会明显卡顿；「加载更多」每次再加这么多。 */
const PAGE_SIZE = 50

/** 导出列：标题可能带逗号或换行，由 toCsv 统一转义。 */
const EXPORT_COLUMNS: Array<ExportColumn<SessionRow>> = [
  { key: 'id', label: '会话 id', value: (row) => row.id },
  { key: 'title', label: '标题', value: (row) => row.title },
  { key: 'prompt', label: '首条提问', value: (row) => row.prompt },
  { key: 'workspace', label: '工作区', value: (row) => row.workspace },
  { key: 'provider', label: '通道', value: (row) => row.provider },
  { key: 'firstTime', label: '首次时间', value: (row) => fmtDateTime(row.firstTime) },
  { key: 'lastTime', label: '最近时间', value: (row) => fmtDateTime(row.lastTime) },
  { key: 'crossDays', label: '跨天', value: (row) => row.crossDays },
  { key: 'calls', label: '调用', value: (row) => row.calls },
  { key: 'tokens', label: 'Tokens', value: (row) => row.tokens },
  { key: 'cacheHitRate', label: '命中率(%)', value: (row) => row.cacheHitRate },
  { key: 'cost', label: '成本(原币种合计)', value: (row) => row.cost },
  { key: 'costSource', label: '成本来源', value: (row) => row.costSource === undefined ? null : COST_SOURCE_LABELS[row.costSource] },
  { key: 'archived', label: '已归档', value: (row) => row.archived ? '是' : '否' },
]

export function SessionsTab(props: {
  data: SessionsResponse | null
  channels: Channel[]
  tooltip: TooltipApi
  /** 点工作目录：切到「项目用量」并只看这个项目（筛选状态提升在 KeyUsageSection） */
  onOpenProject: (workspace: string) => void
}): ReactNode {
  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [daysFilter, setDaysFilter] = useState('30')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('hide')
  /** 子代理会话默认隐藏（它们是子会话，单独成行会淹没主会话）；可切换显示或只看。 */
  const [subagentFilter, setSubagentFilter] = useState<'hide' | 'all' | 'only'>('hide')
  /** 只看某个会话及其子会话（点子会话上的「子代理」标签或父行上的「N 个子会话」时设置）。 */
  const [parentFocus, setParentFocus] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [detailId, setDetailId] = useState<string | null>(null)
  const [nowMs] = useState(() => Date.now())
  const rows = props.data?.rows ?? []
  const archivedCount = rows.filter((row) => row.archived).length
  const subagentCount = rows.filter((row) => row.origin === 'subagent').length
  const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden

  // 换了筛选 / 搜索 / 排序就回到第一页：否则用户改了条件还停在第 N 屏，看着像没生效
  useEffect(() => { setPageSize(PAGE_SIZE) }, [query, channelFilter, daysFilter, sortKey, archiveFilter, subagentFilter, parentFocus])

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const maxAgeDays = Number(daysFilter)
    const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
      // 首条提问正文也参与搜索：系统注入文本已在服务端被跳过，这里拿到的是真实提问
      const haystack = (row.title ?? '') + ' ' + row.id + ' ' + (row.workspace ?? '') + ' ' + (row.prompt ?? '')
      const matchesQuery = keyword === '' || haystack.toLowerCase().includes(keyword)
      const matchesChannel = channelFilter === 'ALL' || row.provider === channelFilter
      const matchesAge = maxAgeDays === 0 || row.lastTime === null
        || (nowMs - row.lastTime) <= maxAgeDays * 86400000
      const matchesArchive = archiveFilter === 'all' || (archiveFilter === 'only' ? row.archived : !row.archived)
      const isSubagent = row.origin === 'subagent'
      const matchesSubagent = subagentFilter === 'all' || (subagentFilter === 'only' ? isSubagent : !isSubagent)
      // 聚焦某个会话时只留它自己和它的子会话（从子会话标签或父行的小计按钮进来）
      const matchesFocus = parentFocus === null || row.id === parentFocus || row.parentSessionId === parentFocus
      return matchesQuery && matchesChannel && matchesAge && matchesArchive && matchesSubagent && matchesFocus
    })
    const sorters: Record<SortKey, (first: SessionRow, second: SessionRow) => number> = {
      recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
      tokensDesc: (first, second) => second.tokens - first.tokens,
      tokensAsc: (first, second) => first.tokens - second.tokens,
      durationDesc: (first, second) => durationOf(second) - durationOf(first),
      // 成本 / 命中率为 null 的行排在最后：排序是给人找「最贵 / 最省缓存」用的，缺失值不参与比较
      costDesc: (first, second) => (second.cost ?? -1) - (first.cost ?? -1),
      hitDesc: (first, second) => (second.cacheHitRate ?? -1) - (first.cacheHitRate ?? -1),
      callsDesc: (first, second) => second.calls - first.calls,
    }
    return [...filtered].sort(sorters[sortKey])
  }, [rows, query, channelFilter, daysFilter, sortKey, nowMs, archiveFilter, subagentFilter, parentFocus])

  /** 只导当前筛选后的会话行（归档筛选、时间窗口、搜索都算数）；分页不影响导出。 */
  const exportRows = (format: 'csv' | 'json'): void => {
    if (format === 'csv') downloadFile(exportFileName('sessions', 'csv'), toCsv(visible, EXPORT_COLUMNS), CSV_MIME)
    else downloadFile(exportFileName('sessions', 'json'), toJson(visible), JSON_MIME)
  }

  if (props.data === null) return <div className={styles.empty}>会话数据读取中或不可用…</div>

  // 分组在「最新会话」排序下才有意义（其它排序是全局榜单，日期头会重复出现）
  const groups: Array<{ label: string; rows: SessionRow[]; tokens: number }> = []
  if (sortKey === 'recent') {
    for (const row of visible) {
      const label = dayLabelOf(row.lastTime, nowMs)
      const last = groups[groups.length - 1]
      if (last === undefined || last.label !== label) groups.push({ label, rows: [row], tokens: row.tokens })
      else {
        last.rows.push(row)
        last.tokens += row.tokens
      }
    }
  }
  // 分页沿分组顺序截断：日期头报的仍是当天全量（条数与 Tokens），被截断的那天另外写明「显示 x / y」
  let remaining = pageSize
  const shownGroups = groups.map((group) => {
    const shown = remaining <= 0 ? [] : group.rows.slice(0, remaining)
    remaining -= shown.length
    return { label: group.label, rows: shown, total: group.rows.length, tokens: group.tokens }
  }).filter((group) => group.rows.length > 0)
  const shownRows = sortKey === 'recent' ? [] : visible.slice(0, pageSize)
  const shownCount = sortKey === 'recent'
    ? shownGroups.reduce((count, group) => count + group.rows.length, 0)
    : shownRows.length
  const detailRow = detailId === null ? null : rows.find((row) => row.id === detailId) ?? null

  const rowOptions = {
    channels: props.channels,
    tooltip: props.tooltip,
    expandedIds,
    nowMs,
    onToggleModels: (id: string) => setExpandedIds((previous) => ({ ...previous, [id]: previous[id] !== true })),
    onOpenDetail: (id: string) => setDetailId(id),
    onOpenProject: props.onOpenProject,
    onFocusSession: (id: string) => {
      setParentFocus(id)
      setSubagentFilter('all')
    },
  }

  return (
    <div>
      {props.data.coverage.status !== 'complete' && (
        <div className={styles.warning}>
          {props.data.coverage.status === 'unavailable'
            ? '会话数据不可用（宿主未提供会话服务或全部读取失败）'
            : '会话数据不完整：' + String(props.data.coverage.skippedSessions) + ' 个会话读取失败，未计入统计'}
        </div>
      )}
      <div className={listStyles.filterBar}>
        <input className={listStyles.searchInput} placeholder="搜索会话标题、首条提问、session id、工作区…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className={listStyles.filterSelect} value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
          <option value="ALL">全部通道</option>
          {props.channels.map((channel) => <option key={channel.provider} value={channel.provider}>{channel.displayName}</option>)}
        </select>
        <select className={listStyles.filterSelect} value={daysFilter} onChange={(event) => setDaysFilter(event.target.value)}>
          <option value="7">近 7 天</option>
          <option value="30">近 30 天</option>
          <option value="0">全部</option>
        </select>
        <select className={listStyles.filterSelect} value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
          <option value="recent">最新会话</option>
          <option value="tokensDesc">Tokens 最多</option>
          <option value="tokensAsc">Tokens 最少</option>
          <option value="durationDesc">时长最长</option>
          <option value="costDesc">成本最高</option>
          <option value="hitDesc">命中率最高</option>
          <option value="callsDesc">调用最多</option>
        </select>
        <select
          className={listStyles.filterSelect}
          value={archiveFilter}
          onChange={(event) => setArchiveFilter(event.target.value as ArchiveFilter)}
          title="已归档会话只做标记，仍然计入统计"
        >
          <option value="hide">隐藏已归档</option>
          <option value="all">全部对话（显示已归档）</option>
          <option value="only">仅显示已归档</option>
        </select>
        <select
          className={listStyles.filterSelect}
          value={subagentFilter}
          onChange={(event) => setSubagentFilter(event.target.value as 'hide' | 'all' | 'only')}
          title="子代理跑在自己的子会话里，单独成行会淹没主会话；子会话单独计入统计，不并进父会话"
        >
          <option value="hide">隐藏子会话</option>
          <option value="all">显示子会话</option>
          <option value="only">仅显示子会话</option>
        </select>
        <span className={exportStyles.exportGroup}>
          <button className={exportStyles.exportBtn} disabled={visible.length === 0} onClick={() => exportRows('csv')}>导出 CSV</button>
          <button className={exportStyles.exportBtn} disabled={visible.length === 0} onClick={() => exportRows('json')}>导出 JSON</button>
        </span>
      </div>
      {parentFocus !== null && (
        <div className={styles.statExtra}>
          只看该会话及其子会话（含父会话行）·
          <button className={listStyles.linkBtn} onClick={() => setParentFocus(null)}>清除筛选</button>
        </div>
      )}
      {subagentFilter !== 'only' && subagentCount > 0 && (
        <div className={styles.statExtra}>
          另有 {subagentCount} 个子代理会话{subagentFilter === 'hide' ? '未显示' : '（已显示）'}：子会话各自计入统计，不并入父会话
        </div>
      )}
      {archiveFilter === 'hide' && archivedCount > 0 && (
        <div className={styles.statExtra}>
          另有 {archivedCount} 个已归档会话未显示（归档只是标记，用量仍计入上方统计）
        </div>
      )}

      <table className={styles.table + ' ' + listStyles.sessionTable}>
        <thead>
          <tr><th>会话</th><th>通道</th><th>时间 / 时长</th><th>Tokens</th><th>命中率</th><th>成本</th></tr>
        </thead>
        <tbody>
          {sortKey === 'recent' && shownGroups.map((group) => (
            <Fragment key={'group-' + group.label}>
              <tr className={listStyles.sessionDay}>
                <td colSpan={6}>
                  {group.label}
                  <span className={listStyles.dayCount}>
                    {group.rows.length < group.total ? '显示 ' + String(group.rows.length) + ' / ' + String(group.total) + ' 个会话' : String(group.total) + ' 个会话'}
                    {' · '}{fmtTokens(group.tokens)}
                  </span>
                </td>
              </tr>
              {group.rows.map((row) => sessionRowOf(row, rowOptions))}
            </Fragment>
          ))}
          {sortKey !== 'recent' && shownRows.map((row) => sessionRowOf(row, rowOptions))}
          {visible.length === 0 && <tr><td colSpan={6} className={styles.empty}>没有符合条件的会话</td></tr>}
        </tbody>
      </table>
      {visible.length > shownCount && (
        <div className={listStyles.moreRow}>
          <button type="button" className={listStyles.moreBtn} onClick={() => setPageSize(pageSize + PAGE_SIZE)}>
            加载更多（+{PAGE_SIZE}）
          </button>
          <span className={listStyles.moreText}>已显示 {shownCount} / {visible.length} 个会话</span>
        </div>
      )}
      {hiddenEmpty > 0 && <div className={styles.statExtra}>{hiddenEmptyRowsText(hiddenEmpty)}</div>}
      <div className={styles.statExtra}>
        会话用量按宿主会话事件折叠（每个结算样本计一次调用）；成本按三层价目自动估算
        {props.data.priced ? '' : '（台账无成本数据，暂不可估）'}
      </div>

      {detailId !== null && (
        <SessionDetailDrawer
          sessionId={detailId}
          fallbackTitle={detailRow?.title ?? null}
          channels={props.channels}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}

interface RowOptions {
  channels: Channel[]
  tooltip: TooltipApi
  expandedIds: Record<string, boolean>
  nowMs: number
  onToggleModels: (id: string) => void
  onOpenDetail: (id: string) => void
  onOpenProject: (workspace: string) => void
  /** 聚焦到某个会话及其子会话（父行点「N 个子会话」、子行点「子代理」都用它）。 */
  onFocusSession: (id: string) => void
}

function sessionRowOf(row: SessionRow, options: RowOptions): ReactNode {
  const channel = channelOf(options.channels, row.provider)
  const costCell = costCellOf(channel, row)
  const isOpen = options.expandedIds[row.id] === true
  const workspace = row.workspace
  return (
    <Fragment key={row.id}>
      <tr
        className={(row.archived ? listStyles.rowArchived + ' ' : '') + styles.clickable}
        onClick={() => options.onOpenDetail(row.id)}
      >
        <td>
          <div className={listStyles.listTitle}>
            {/* 行点击只方便鼠标；展开与查看详情各给一个真按钮，键盘都能到 */}
            {row.models.length === 0
              // 没有模型构成就不给展开入口，但留出同宽的箭头位，避免各行标题左右错位
              ? <span className={listStyles.sessionToggleArrow} aria-hidden="true" />
              : (
                <button
                  type="button"
                  className={listStyles.sessionToggle}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? '收起模型构成' : '展开模型构成'}
                  onClick={(event) => {
                    event.stopPropagation()
                    options.onToggleModels(row.id)
                  }}
                >
                  <span className={listStyles.sessionToggleArrow} aria-hidden="true">{isOpen ? '▼' : '▶'}</span>
                </button>
              )}
            <button
              type="button"
              className={listStyles.sessionTitleBtn}
              title="查看会话详情"
              onClick={(event) => {
                event.stopPropagation()
                options.onOpenDetail(row.id)
              }}
            >
              {row.title ?? '（无提问）· ' + shortIdOf(row.id)}
            </button>
            {row.archived && <span className={listStyles.archivedTag}>已归档</span>}
            {row.origin === 'subagent' && (
              <button
                type="button"
                className={listStyles.subagentTagBtn}
                title="子代理跑的独立子会话；点这里只看它所属的父会话"
                onClick={(event) => {
                  event.stopPropagation()
                  if (row.parentSessionId !== null && row.parentSessionId !== undefined) options.onFocusSession(row.parentSessionId)
                }}
              >
                子代理
              </button>
            )}
          </div>
          <div className={listStyles.listSub}>
            {workspace === null
              ? '未归属工作区'
              : (
                <button
                  type="button"
                  className={listStyles.linkBtn}
                  title={'在「项目用量」里只看 ' + workspace}
                  onClick={(event) => {
                    event.stopPropagation()
                    options.onOpenProject(workspace)
                  }}
                >
                  {workspace}
                </button>
              )}
            {row.modelCount !== undefined && row.modelCount > 1 && (
              <span className={listStyles.sessionMeta}>{row.modelCount} 个模型</span>
            )}
            {row.subagentCount !== undefined && row.subagentCount > 0 && (
              <button
                type="button"
                className={listStyles.sessionMetaBtn}
                title={'只看这个会话与它的 ' + String(row.subagentCount) + ' 个子会话（子会话 tokens 只是小计，不并入本行）'}
                onClick={(event) => {
                  event.stopPropagation()
                  options.onFocusSession(row.id)
                }}
              >
                {row.subagentCount} 个子会话
                {row.subagentTokens !== undefined && row.subagentTokens > 0 ? ' · ' + fmtTokens(row.subagentTokens) : ''}
              </button>
            )}
          </div>
        </td>
        <td>{row.providerLabel ?? displayNameOf(options.channels, row.provider ?? '')}</td>
        <td>
          <div>{row.lastTime === null ? '—' : dayLabelOf(row.lastTime, options.nowMs) + ' ' + fmtTime(row.lastTime)}</div>
          <div className={listStyles.listSub}>
            时长 {fmtDuration(durationOf(row))}
            {row.crossDays >= 1 && <span className={listStyles.crossDayTag}>跨 {row.crossDays} 天</span>}
          </div>
        </td>
        <td>{fmtTokens(row.tokens)}</td>
        <td>{row.cacheHitRate === null ? '—' : row.cacheHitRate.toFixed(1) + '%'}</td>
        <td
          onMouseEnter={(event) => options.tooltip.show(event, costTipOf(row))}
          onMouseMove={(event) => options.tooltip.show(event, costTipOf(row))}
          onMouseLeave={options.tooltip.hide}
        >
          {row.cost === null || channel === null || channel.costMode !== 'perToken'
            ? <span className={styles.dim}>{costCell.text}</span>
            : <>{costCell.text}{costCell.amount && <CostSourceChip source={row.costSource} partial={row.partial} />}</>}
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td className={listStyles.composeCell} colSpan={6}>
            {row.models.length === 0
              ? <div className={styles.empty}>没有按模型的用量记录</div>
              : (
                <>
                  <div className={listStyles.composeRow + ' ' + listStyles.composeHead}>
                    <span>模型</span>
                    <span className={listStyles.composeNumber}>Tokens</span>
                    <span className={listStyles.composeNumber}>占比</span>
                    <span className={listStyles.composeNumber}>成本</span>
                  </div>
                  {row.models.map((model) => {
                    const percent = model.sharePercent ?? 0
                    const modelCost = model.cost ?? null
                    // 「其它」是服务端把长尾模型合并出来的行，没有自己的通道
                    const color = model.provider === '' ? 'var(--dsw-alias-label-tertiary, #67676f)' : channelColorOf(options.channels, model.provider)
                    return (
                      <div className={listStyles.composeRow} key={model.provider + '|' + model.model}>
                        <span className={listStyles.composeName}>
                          {model.model}
                          {model.provider !== '' && (
                            <span className={listStyles.composeChannel}>{model.providerLabel ?? displayNameOf(options.channels, model.provider)}</span>
                          )}
                        </span>
                        <span className={listStyles.composeNumber}>{fmtTokens(model.tokens)}</span>
                        <span className={listStyles.composeNumber}>
                          <span className={listStyles.listBar}><i style={{ width: Math.max(2, percent) + '%', background: color }} /></span>
                          {' '}{percent}%
                        </span>
                        <span className={listStyles.composeNumber}>
                          {modelCost === null
                            ? <span className={styles.dim}>—</span>
                            : <>{moneyTotalsTextOf(model)}<CostSourceChip source={model.costSource} partial={model.partial} compact /></>}
                        </span>
                      </div>
                    )
                  })}
                </>
              )}
          </td>
        </tr>
      )}
    </Fragment>
  )
}

/** 成本单元格的悬停说明：这一格钱是怎么来的（角标只写得下两个字）。 */
function costTipOf(row: SessionRow): ReactNode {
  const source = row.costSource ?? 'none'
  return (
    <>
      <TipTitle>会话成本</TipTitle>
      <TipSub>{costSourceHintOf(source, row.partial)}</TipSub>
      <TipRow
        label="金额"
        amount={row.cost === null ? '—' : moneyTotalsTextOf(row)}
        rate={COST_SOURCE_LABELS[source]}
      />
    </>
  )
}

function durationOf(row: SessionRow): number {
  if (row.firstTime === null || row.lastTime === null) return 0
  return Math.max(0, row.lastTime - row.firstTime)
}

/** 会话头通常不带标题，用 id 的短片段做可读标识。 */
function shortIdOf(id: string): string {
  const stripped = id.replace(/^session-/, '')
  return stripped.slice(0, 8)
}

function dayLabelOf(timeMs: number | null, nowMs: number): string {
  if (timeMs === null) return '未知日期'
  const dateKey = isoDate(new Date(timeMs))
  if (dateKey === isoDate(new Date(nowMs))) return '今日'
  if (dateKey === isoDate(new Date(nowMs - 86400000))) return '昨日'
  return dateKey
}
