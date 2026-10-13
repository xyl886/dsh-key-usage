/** 项目用量：按会话工作目录聚合（数据来自宿主会话事件折叠）。 */
import { useMemo, useState, type ReactNode } from 'react'
import { channelColorOf, channelOf, costCellText, displayNameOf, showsAmount } from '../channels.ts'
import { fmtCalls, fmtDateTime, fmtRelative, fmtTokens } from '../format.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../export.ts'
import { dropEmptyRows, hiddenEmptyRowsText } from '../rows.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { COST_SOURCE_LABELS } from '../pricing.ts'
import type { Channel, ProjectRow, ProjectsResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'
import exportStyles from '../styles/export.module.css'

type SortKey = 'recent' | 'tokensDesc' | 'tokensAsc' | 'callsDesc'

/** 导出列：成本与命中率都给原始数值，方便在表格里继续算。 */
const EXPORT_COLUMNS: Array<ExportColumn<ProjectRow>> = [
  { key: 'workspace', label: '项目路径', value: (row) => row.workspace },
  { key: 'dominantProvider', label: '主要通道', value: (row) => row.dominantProvider },
  { key: 'calls', label: '调用', value: (row) => row.calls },
  { key: 'tokens', label: 'Tokens', value: (row) => row.tokens },
  { key: 'cacheHitRate', label: '命中率(%)', value: (row) => row.cacheHitRate },
  { key: 'cost', label: '成本(元)', value: (row) => row.cost },
  { key: 'costSource', label: '成本来源', value: (row) => row.costSource === undefined ? null : COST_SOURCE_LABELS[row.costSource] },
  { key: 'sessionCount', label: '会话数', value: (row) => row.sessionCount },
  { key: 'archivedSessionCount', label: '已归档会话数', value: (row) => row.archivedSessionCount },
  { key: 'lastTime', label: '最近活跃', value: (row) => fmtDateTime(row.lastTime) },
]

export function ProjectsTab(props: { data: ProjectsResponse | null; channels: Channel[] }): ReactNode {
  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [nowMs] = useState(() => Date.now())
  const rows = props.data?.rows ?? []

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
      const matchesQuery = keyword === '' || row.workspace.toLowerCase().includes(keyword)
      const matchesChannel = channelFilter === 'ALL' || row.providers[channelFilter] !== undefined
      return matchesQuery && matchesChannel
    })
    const sorters: Record<SortKey, (first: ProjectRow, second: ProjectRow) => number> = {
      recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
      tokensDesc: (first, second) => second.tokens - first.tokens,
      tokensAsc: (first, second) => first.tokens - second.tokens,
      callsDesc: (first, second) => second.calls - first.calls,
    }
    return [...filtered].sort(sorters[sortKey])
  }, [rows, query, channelFilter, sortKey])

  const totalTokens = rows.reduce((total, row) => total + row.tokens, 0)
  // 零 Token 的项目（多为调用失败）不展示，条数如实告知
  const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden

  /** 导出当前筛选与排序后的项目行（JSON 取整行，CSV 按固定列映射）。 */
  const exportRows = (format: 'csv' | 'json'): void => {
    if (format === 'csv') downloadFile(exportFileName('projects', 'csv'), toCsv(visible, EXPORT_COLUMNS), CSV_MIME)
    else downloadFile(exportFileName('projects', 'json'), toJson(visible), JSON_MIME)
  }

  if (props.data === null) return <div className={styles.empty}>会话数据读取中或不可用…</div>

  return (
    <div>
      {props.data.coverage.status !== 'complete' && (
        <div className={styles.warning}>{coverageText(props.data.coverage.status, props.data.coverage.skippedSessions)}</div>
      )}
      <div className={listStyles.filterBar}>
        <input className={listStyles.searchInput} placeholder="搜索项目路径…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className={listStyles.filterSelect} value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
          <option value="ALL">全部通道</option>
          {props.channels.map((channel) => <option key={channel.provider} value={channel.provider}>{channel.displayName}</option>)}
        </select>
        <select className={listStyles.filterSelect} value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
          <option value="recent">最近活跃</option>
          <option value="tokensDesc">Tokens 最多</option>
          <option value="tokensAsc">Tokens 最少</option>
          <option value="callsDesc">调用最多</option>
        </select>
        <span className={exportStyles.exportGroup}>
          <button className={exportStyles.exportBtn} disabled={visible.length === 0} onClick={() => exportRows('csv')}>导出 CSV</button>
          <button className={exportStyles.exportBtn} disabled={visible.length === 0} onClick={() => exportRows('json')}>导出 JSON</button>
        </span>
      </div>

      <table className={styles.table + ' ' + listStyles.projectTable}>
        <thead>
          <tr><th>项目</th><th>调用</th><th>Tokens</th><th>占比</th><th>成本</th><th>最近活跃</th></tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0
            const dominant = row.dominantProvider
            const channel = channelOf(props.channels, dominant)
            const costCell = costCellText(channel, row.cost ?? 0)
            return (
              <tr key={row.workspace}>
                <td>
                  <div className={listStyles.listTitle}>
                    <div>
                      <div className={listStyles.listMain}>{baseNameOf(row.workspace)}</div>
                      <div className={listStyles.listSub}>
                        {row.workspace} · {row.sessionCount} 个会话
                        {row.archivedSessionCount > 0 ? '（含 ' + row.archivedSessionCount + ' 个已归档，仍计入）' : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{fmtCalls(row.calls)}</td>
                <td>{fmtTokens(row.tokens)}</td>
                <td>
                  <span className={listStyles.listBar}>
                    <i style={{ width: Math.max(2, percent) + '%', background: channelColorOf(props.channels, dominant ?? '') }} />
                  </span> {percent}%
                </td>
                <td>{row.cost === null || channel?.costMode === 'sub' || channel?.costMode === 'free' || channel?.costMode === 'none'
                  ? <span className={styles.dim}>{costCell.text}</span>
                  : <>{costCell.text}{showsAmount(costCell) && <CostSourceChip source={row.costSource} />}</>}</td>
                <td>{fmtRelative(row.lastTime, nowMs)}</td>
              </tr>
            )
          })}
          {visible.length === 0 && <tr><td colSpan={6} className={styles.empty}>没有符合条件的项目</td></tr>}
        </tbody>
      </table>
      {hiddenEmpty > 0 && <div className={styles.statExtra}>{hiddenEmptyRowsText(hiddenEmpty)}</div>}
      <div className={styles.statExtra}>
        成本按台账模型中位均价估算{props.data.priced ? '' : '（台账无成本数据，暂不可估）'}；命中率 = 缓存读 /（输入 + 输出 + 缓存读）
      </div>
    </div>
  )
}

function coverageText(status: string, skipped: number): string {
  if (status === 'unavailable') return '会话数据不可用（宿主未提供会话服务或全部读取失败）'
  return '会话数据不完整：' + String(skipped) + ' 个会话读取失败，未计入统计'
}

export function baseNameOf(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '')
  const parts = normalized.split(/[\\/]/)
  return parts[parts.length - 1] === '' ? path : parts[parts.length - 1]
}

/** 通道显示名（列表里复用）。 */
export { displayNameOf }
