/** 会话用量：按会话列出 tokens / 命中率 / 时长，按最近活跃时按日分组。 */
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { channelOf, costCellText, displayNameOf, showsAmount } from '../channels.ts'
import { fmtCalls, fmtDateTime, fmtDuration, fmtTime, fmtTokens, isoDate } from '../format.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../export.ts'
import { dropEmptyRows, hiddenEmptyRowsText } from '../rows.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { COST_SOURCE_LABELS } from '../pricing.ts'
import type { Channel, SessionRow, SessionsResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'
import exportStyles from '../styles/export.module.css'

type SortKey = 'recent' | 'tokensDesc' | 'tokensAsc' | 'durationDesc'
/** 会话归档筛选：与宿主原生「筛选会话」菜单同三档。 */
type ArchiveFilter = 'hide' | 'all' | 'only'

/** 导出列：标题可能带逗号或换行，由 toCsv 统一转义。 */
const EXPORT_COLUMNS: Array<ExportColumn<SessionRow>> = [
  { key: 'id', label: '会话 id', value: (row) => row.id },
  { key: 'title', label: '标题', value: (row) => row.title },
  { key: 'workspace', label: '工作区', value: (row) => row.workspace },
  { key: 'provider', label: '通道', value: (row) => row.provider },
  { key: 'firstTime', label: '首次时间', value: (row) => fmtDateTime(row.firstTime) },
  { key: 'lastTime', label: '最近时间', value: (row) => fmtDateTime(row.lastTime) },
  { key: 'calls', label: '调用', value: (row) => row.calls },
  { key: 'tokens', label: 'Tokens', value: (row) => row.tokens },
  { key: 'cacheHitRate', label: '命中率(%)', value: (row) => row.cacheHitRate },
  { key: 'cost', label: '成本(元)', value: (row) => row.cost },
  { key: 'costSource', label: '成本来源', value: (row) => row.costSource === undefined ? null : COST_SOURCE_LABELS[row.costSource] },
  { key: 'archived', label: '已归档', value: (row) => row.archived ? '是' : '否' },
]

export function SessionsTab(props: { data: SessionsResponse | null; channels: Channel[] }): ReactNode {
  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [daysFilter, setDaysFilter] = useState('30')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('hide')
  const [nowMs] = useState(() => Date.now())
  const rows = props.data?.rows ?? []
  const archivedCount = rows.filter((row) => row.archived).length
  // 零 Token 的会话（调用失败、没产生用量）不展示，条数如实告知
  const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const maxAgeDays = Number(daysFilter)
    const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
      const title = (row.title ?? '') + ' ' + row.id + ' ' + (row.workspace ?? '')
      const matchesQuery = keyword === '' || title.toLowerCase().includes(keyword)
      const matchesChannel = channelFilter === 'ALL' || row.provider === channelFilter
      const matchesAge = maxAgeDays === 0 || row.lastTime === null
        || (nowMs - row.lastTime) <= maxAgeDays * 86400000
      const matchesArchive = archiveFilter === 'all' || (archiveFilter === 'only' ? row.archived : !row.archived)
      return matchesQuery && matchesChannel && matchesAge && matchesArchive
    })
    const sorters: Record<SortKey, (first: SessionRow, second: SessionRow) => number> = {
      recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
      tokensDesc: (first, second) => second.tokens - first.tokens,
      tokensAsc: (first, second) => first.tokens - second.tokens,
      durationDesc: (first, second) => durationOf(second) - durationOf(first),
    }
    return [...filtered].sort(sorters[sortKey])
  }, [rows, query, channelFilter, daysFilter, sortKey, nowMs, archiveFilter])

  /** 只导当前筛选后的会话行（归档筛选、时间窗口、搜索都算数）。 */
  const exportRows = (format: 'csv' | 'json'): void => {
    if (format === 'csv') downloadFile(exportFileName('sessions', 'csv'), toCsv(visible, EXPORT_COLUMNS), CSV_MIME)
    else downloadFile(exportFileName('sessions', 'json'), toJson(visible), JSON_MIME)
  }

  if (props.data === null) return <div className={styles.empty}>会话数据读取中或不可用…</div>

  const groups: Array<{ label: string; rows: SessionRow[] }> = []
  if (sortKey === 'recent') {
    for (const row of visible) {
      const label = dayLabelOf(row.lastTime, nowMs)
      const last = groups[groups.length - 1]
      if (last === undefined || last.label !== label) groups.push({ label, rows: [row] })
      else last.rows.push(row)
    }
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
        <input className={listStyles.searchInput} placeholder="搜索会话标题、session id、工作区…" value={query} onChange={(event) => setQuery(event.target.value)} />
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
        <span className={exportStyles.exportGroup}>
          <button className={exportStyles.exportBtn} disabled={visible.length === 0} onClick={() => exportRows('csv')}>导出 CSV</button>
          <button className={exportStyles.exportBtn} disabled={visible.length === 0} onClick={() => exportRows('json')}>导出 JSON</button>
        </span>
      </div>
      {archiveFilter === 'hide' && archivedCount > 0 && (
        <div className={styles.statExtra}>
          另有 {archivedCount} 个已归档会话未显示（归档只是标记，用量仍计入上方统计）
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr><th>会话</th><th>通道</th><th>时间 / 时长</th><th>Tokens</th><th>命中率</th><th>成本</th></tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const groupTokens = group.rows.reduce((total, row) => total + row.tokens, 0)
            return (
              <Fragment key={'group-' + group.label}>
                <tr className={listStyles.sessionDay}>
                  <td colSpan={6}>
                    {group.label}
                    <span className={listStyles.dayCount}>{group.rows.length} 个会话 · {fmtTokens(groupTokens)}</span>
                  </td>
                </tr>
                {group.rows.map((row) => sessionRowOf(row, props.channels))}
              </Fragment>
            )
          })}
          {sortKey !== 'recent' && visible.map((row) => sessionRowOf(row, props.channels))}
          {visible.length === 0 && <tr><td colSpan={6} className={styles.empty}>没有符合条件的会话</td></tr>}
        </tbody>
      </table>
      {hiddenEmpty > 0 && <div className={styles.statExtra}>{hiddenEmptyRowsText(hiddenEmpty)}</div>}
      <div className={styles.statExtra}>
        会话用量按宿主会话事件折叠（每个结算样本计一次调用）；成本按台账模型均价估算
        {props.data.priced ? '' : '（台账无成本数据，暂不可估）'}
      </div>
    </div>
  )
}

function sessionRowOf(row: SessionRow, channels: Channel[]): ReactNode {
  const channel = channelOf(channels, row.provider)
  const costCell = costCellText(channel, row.cost ?? 0)
  return (
    <tr key={row.id} className={row.archived ? listStyles.rowArchived : undefined}>
      <td>
        <div className={listStyles.listMain}>
          {row.title ?? '会话 ' + shortIdOf(row.id)}
          {row.archived && <span className={listStyles.archivedTag}>已归档</span>}
        </div>
        <div className={listStyles.listSub}>{row.workspace ?? '未归属工作区'}</div>
      </td>
      <td>{row.providerLabel ?? displayNameOf(channels, row.provider ?? '')}</td>
      <td>
        <div>{row.lastTime === null ? '—' : dayLabelOf(row.lastTime, Date.now()) + ' ' + fmtTime(row.lastTime)}</div>
        <div className={listStyles.listSub}>时长 {fmtDuration(durationOf(row))}</div>
      </td>
      <td>{fmtTokens(row.tokens)}</td>
      <td>{row.cacheHitRate === null ? '—' : row.cacheHitRate.toFixed(1) + '%'}</td>
      <td>{row.cost === null || channel === null || channel.costMode !== 'perToken'
        ? <span className={styles.dim}>{costCell.text}</span>
        : <>{costCell.text}{showsAmount(costCell) && <CostSourceChip source={row.costSource} />}</>}</td>
    </tr>
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

/** 保留调用计数格式，避免各 Tab 各写一份。 */
export { fmtCalls }
