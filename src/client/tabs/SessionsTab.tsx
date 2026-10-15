/** 会话用量：按会话列出 tokens / 命中率 / 时长；点行开详情，行内可展开模型构成。 */
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { channelColorOf, channelOf, costCellOf, displayNameOf } from '../core/channels.ts'
import { fmtDateTime, fmtDuration, fmtTime, fmtTokens, isoDate } from '../core/format.ts'
import { moneyTotalsTextOf } from '../core/currency.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../core/export.ts'
import { dropEmptyRows, hiddenEmptyRowsText } from '../core/rows.ts'
import { t, useT } from '../core/i18n.ts'
import { serverText } from '../core/serverText.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { SessionDetailDrawer } from '../components/SessionDetailDrawer.tsx'
import { Button } from '../components/ui/Button.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { Select } from '../components/ui/Select.tsx'
import { COST_SOURCE_LABELS, costSourceHintOf } from '../core/pricing.ts'
import { TipRow, TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import type { Channel, SessionRow, SessionsResponse } from '../core/types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'
import uiStyles from '../styles/ui.module.css'
import exportStyles from '../styles/export.module.css'

type SortKey = 'recent' | 'tokensDesc' | 'tokensAsc' | 'durationDesc' | 'costDesc' | 'hitDesc' | 'callsDesc'
/** 会话归档筛选：与宿主原生「筛选会话」菜单同三档。 */
type ArchiveFilter = 'hide' | 'all' | 'only'

/** 首屏渲染 50 个：本机有 ~130 个会话，一次全渲染会明显卡顿；「加载更多」每次再加这么多。 */
const PAGE_SIZE = 50

/** 导出列：标题可能带逗号或换行，由 toCsv 统一转义。 */
const EXPORT_COLUMNS: Array<ExportColumn<SessionRow>> = [
  { key: 'id', labelKey: 's.id', value: (row) => row.id },
  { key: 'title', labelKey: 's.title', value: (row) => row.title },
  { key: 'prompt', labelKey: 's.prompt', value: (row) => row.prompt },
  { key: 'workspace', labelKey: 'common.workspace', value: (row) => row.workspace },
  { key: 'provider', labelKey: 'common.channel', value: (row) => row.provider },
  { key: 'firstTime', labelKey: 's.first', value: (row) => fmtDateTime(row.firstTime) },
  { key: 'lastTime', labelKey: 's.last', value: (row) => fmtDateTime(row.lastTime) },
  { key: 'crossDays', labelKey: 's.crossDays', value: (row) => row.crossDays },
  { key: 'calls', labelKey: 'common.calls', value: (row) => row.calls },
  { key: 'tokens', label: 'Tokens', value: (row) => row.tokens },
  { key: 'cacheHitRate', labelKey: 's.hitRate', value: (row) => row.cacheHitRate },
  { key: 'cost', labelKey: 's.costNative', value: (row) => row.cost },
  { key: 'costSource', labelKey: 's.costSource', value: (row) => row.costSource === undefined ? null : t(COST_SOURCE_LABELS[row.costSource]) },
  { key: 'archived', labelKey: 's.archived', value: (row) => row.archived ? t('s.yes') : t('s.no') },
]

export function SessionsTab(props: {
  data: SessionsResponse | null
  channels: Channel[]
  tooltip: TooltipApi
  /** 点工作目录：切到「项目用量」并只看这个项目（筛选状态提升在 KeyUsageSection） */
  onOpenProject: (workspace: string) => void
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
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
  const subagentCount = rows.filter((row) => row.origin === 'subagent' || (row.parentSessionId ?? null) !== null).length
  const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden

  // 换了筛选 / 搜索 / 排序就回到第一页：否则用户改了条件还停在第 N 屏，看着像没生效
  useEffect(() => { setPageSize(PAGE_SIZE) }, [query, channelFilter, daysFilter, sortKey, archiveFilter, subagentFilter, parentFocus])

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const maxAgeDays = Number(daysFilter)
    // 没有人类提问的会话（标题与首条提问都空）不显示：那是 teammate / 系统会话，列出来只是噪音
    const filtered = rows.filter((row) => (row.title ?? '') !== '' || (row.prompt ?? '') !== '').filter((row) => {
      // 首条提问正文也参与搜索：系统注入文本已在服务端被跳过，这里拿到的是真实提问
      const haystack = (row.title ?? '') + ' ' + row.id + ' ' + (row.workspace ?? '') + ' ' + (row.prompt ?? '')
      const matchesQuery = keyword === '' || haystack.toLowerCase().includes(keyword)
      const matchesChannel = channelFilter === 'ALL' || row.provider === channelFilter
      const matchesAge = maxAgeDays === 0 || row.lastTime === null
        || (nowMs - row.lastTime) <= maxAgeDays * 86400000
      const matchesArchive = archiveFilter === 'all' || (archiveFilter === 'only' ? row.archived : !row.archived)
      // 判定子会话：origin 优先，缺字段时看父会话 id（服务端旧版本 / header 没带 origin 也要能隐藏）
      const isSubagent = row.origin === 'subagent' || (row.parentSessionId ?? null) !== null
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

  if (props.data === null) return <EmptyState title={t('s.loading')} />

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
            ? t('s.unavailable')
            : t('s.partial') + ' ' + String(props.data.coverage.skippedSessions) + t('s.partialTail')}
        </div>
      )}
      <div className={listStyles.filterBar}>
        <input className={listStyles.searchInput} placeholder={t('s.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select
          ariaLabel={t('s.filterChannel')}
          value={channelFilter}
          onChange={setChannelFilter}
          options={[{ value: 'ALL', labelKey: 's.allChannels' }, ...props.channels.map((channel) => ({ value: channel.provider, label: channel.displayName }))]}
        />
        <Select
          ariaLabel={t('s.filterRange')}
          value={daysFilter}
          onChange={setDaysFilter}
          options={[{ value: '7', labelKey: 's.days7' }, { value: '30', labelKey: 's.days30' }, { value: '0', labelKey: 's.rangeAll' }]}
        />
        <Select
          ariaLabel={t('s.sort')}
          value={sortKey}
          onChange={(value) => setSortKey(value as SortKey)}
          options={[
            { value: 'recent', labelKey: 's.sortRecent' },
            { value: 'tokensDesc', labelKey: 's.sortTokensDesc' },
            { value: 'tokensAsc', labelKey: 's.sortTokensAsc' },
            { value: 'durationDesc', labelKey: 's.sortDuration' },
            { value: 'costDesc', labelKey: 's.sortCost' },
            { value: 'hitDesc', labelKey: 's.sortHit' },
            { value: 'callsDesc', labelKey: 's.sortCalls' },
          ]}
        />
        <Select
          ariaLabel={t('s.filterArchive')}
          value={archiveFilter}
          onChange={(value) => setArchiveFilter(value as ArchiveFilter)}
          options={[
            { value: 'hide', labelKey: 's.archiveHide' },
            { value: 'all', labelKey: 's.archiveAll' },
            { value: 'only', labelKey: 's.archiveOnly' },
          ]}
        />
        <Select
          ariaLabel={t('s.filterSubagent')}
          value={subagentFilter}
          onChange={(value) => setSubagentFilter(value as 'hide' | 'all' | 'only')}
          options={[
            { value: 'hide', labelKey: 's.subagentHide' },
            { value: 'all', labelKey: 's.subagentAll' },
            { value: 'only', labelKey: 's.subagentOnly' },
          ]}
        />
        <span className={exportStyles.exportGroup}>
          <Button size="sm" disabled={visible.length === 0} onClick={() => exportRows('csv')}>{t('export.csv')}</Button>
          <Button size="sm" disabled={visible.length === 0} onClick={() => exportRows('json')}>{t('export.json')}</Button>
        </span>
      </div>
      {parentFocus !== null && (
        <div className={styles.statExtra}>
          只看该会话及其子会话（含父会话行）·
          <button className={listStyles.linkBtn} onClick={() => setParentFocus(null)}>{t('p.clearFilter')}</button>
        </div>
      )}
      {subagentFilter !== 'only' && subagentCount > 0 && (
        <div className={styles.statExtra}>
          {t('s.subagentOther', { count: subagentCount })}{subagentFilter === 'hide' ? t('s.subagentHidden') : t('s.subagentShown')}：子会话各自计入统计，不并入父会话
        </div>
      )}
      {archiveFilter === 'hide' && archivedCount > 0 && (
        <div className={styles.statExtra}>
          {t('s.archivedOther', { count: archivedCount })}
        </div>
      )}

      <div className={uiStyles.tableScroll}><table className={styles.table + ' ' + listStyles.sessionTable}>
        <thead>
          <tr><th>{t('s.id')}</th><th>{t('common.channel')}</th><th>{t('s.timeDuration')}</th><th>Tokens</th><th>{t('d.hitRate')}</th><th>{t('c.cost')}</th></tr>
        </thead>
        <tbody>
          {sortKey === 'recent' && shownGroups.map((group) => (
            <Fragment key={'group-' + group.label}>
              <tr className={listStyles.sessionDay}>
                <td colSpan={6}>
                  {group.label}
                  <span className={listStyles.dayCount}>
                    {group.rows.length < group.total ? t('s.showPrefix') + String(group.rows.length) + ' / ' + String(group.total) + t('s.showSuffix') : String(group.total) + t('s.showSuffix')}
                    {' · '}{fmtTokens(group.tokens)}
                  </span>
                </td>
              </tr>
              {group.rows.map((row) => sessionRowOf(row, rowOptions))}
            </Fragment>
          ))}
          {sortKey !== 'recent' && shownRows.map((row) => sessionRowOf(row, rowOptions))}
          {visible.length === 0 && <tr><td colSpan={6} className={styles.empty}>{t('s.empty')}</td></tr>}
        </tbody>
      </table></div>
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
        {props.data.priced ? '' : t('s.noCost')}
      </div>

      {detailId !== null && (
        <SessionDetailDrawer
          sessionId={detailId}
          fallbackTitle={detailRow?.title ?? null}
          channels={props.channels}
          // 子会话在列表里默认隐藏，所以弹窗里给出逐个点开的入口（不并进本会话总量）
          subagents={detailRow === null ? [] : rows.filter((row) => row.parentSessionId === detailRow.id)}
          onOpenSession={setDetailId}
          parentId={detailRow?.parentSessionId ?? null}
          parentTitle={detailRow === null || detailRow.parentSessionId == null ? null : (rows.find((row) => row.id === detailRow.parentSessionId)?.title ?? null)}
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
                  aria-label={isOpen ? t('s.collapseModels') : t('s.expandModels')}
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
              onClick={(event) => {
                event.stopPropagation()
                options.onOpenDetail(row.id)
              }}
            >
              {row.title ?? t('s.noPrompt') + ' · ' + shortIdOf(row.id)}
            </button>
            {row.archived && <span className={listStyles.archivedTag}>{t('s.archived')}</span>}
            {row.origin === 'subagent' && (
              <button
                type="button"
                className={listStyles.subagentTagBtn}
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
              ? t('s.noWorkspace')
              : (
                <button
                  type="button"
                  className={listStyles.linkBtn}
                  title={t('s.gotoProject') + workspace}
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
                title={t('s.focusChildren') + String(row.subagentCount) + t('s.focusChildrenTail')}
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
              ? <div className={styles.empty}>{t('empty.noUsage')}</div>
              : (
                <>
                  <div className={listStyles.composeRow + ' ' + listStyles.composeHead}>
                    <span>{t('m.model')}</span>
                    <span className={listStyles.composeNumber}>Tokens</span>
                    <span className={listStyles.composeNumber}>{t('m.share')}</span>
                    <span className={listStyles.composeNumber}>{t('c.cost')}</span>
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
      <TipTitle>{t('s.sessionCost')}</TipTitle>
      <TipSub>{costSourceHintOf(source, row.partial)}</TipSub>
      <TipRow
        label={t('s.amount')}
        amount={row.cost === null ? '—' : moneyTotalsTextOf(row)}
        rate={t(COST_SOURCE_LABELS[source])}
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
  if (timeMs === null) return t('s.unknownDate')
  const dateKey = isoDate(new Date(timeMs))
  if (dateKey === isoDate(new Date(nowMs))) return t('r.today')
  if (dateKey === isoDate(new Date(nowMs - 86400000))) return t('r.yesterday')
  return dateKey
}
