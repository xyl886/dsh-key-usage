/** 项目用量：按会话工作目录聚合。 */
import { useMemo, useState, type ReactNode } from 'react'
import { channelColorOf, channelOf, costCellOf, displayNameOf } from '../channels.ts'
import { fmtCalls, fmtDateTime, fmtRelative, fmtTokens } from '../format.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../export.ts'
import { dropEmptyRows, hiddenEmptyRowsText } from '../rows.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { COST_SOURCE_LABELS } from '../pricing.ts'
import type { Channel, ProjectRow, ProjectsResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'
import exportStyles from '../styles/export.module.css'
import { t, useT } from '../i18n.ts'

type SortKey = 'recent' | 'tokensDesc' | 'tokensAsc' | 'callsDesc'

/** 导出列：成本与命中率都给原始数值，方便在表格里继续算。 */
const EXPORT_COLUMNS: Array<ExportColumn<ProjectRow>> = [
  { key: 'workspace', label: t('p.path'), value: (row) => row.workspace },
  { key: 'dominantProvider', label: t('p.mainChannel'), value: (row) => row.dominantProvider },
  { key: 'calls', label: t('common.calls'), value: (row) => row.calls },
  { key: 'tokens', label: 'Tokens', value: (row) => row.tokens },
  { key: 'cacheHitRate', label: t('c.hitRate'), value: (row) => row.cacheHitRate },
  { key: 'cost', label: t('c.costNative'), value: (row) => row.cost },
  { key: 'costSource', label: t('s.costSource'), value: (row) => row.costSource === undefined ? null : t(COST_SOURCE_LABELS[row.costSource]) },
  { key: 'sessionCount', label: t('m.sessions'), value: (row) => row.sessionCount },
  { key: 'archivedSessionCount', label: t('p.archivedSessions'), value: (row) => row.archivedSessionCount },
  { key: 'lastTime', label: t('m.lastActive'), value: (row) => fmtDateTime(row.lastTime) },
]

export function ProjectsTab(props: {
  data: ProjectsResponse | null
  channels: Channel[]
  /** 跨 Tab 联动：从「会话用量」点工作目录进来时只看这一个项目（null = 不过滤） */
  focusWorkspace?: string | null
  onClearFocus?: () => void
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [nowMs] = useState(() => Date.now())
  const rows = props.data?.rows ?? []
  const focusWorkspace = props.focusWorkspace ?? null

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
      const matchesQuery = keyword === '' || row.workspace.toLowerCase().includes(keyword)
      const matchesChannel = channelFilter === 'ALL' || row.providers[channelFilter] !== undefined
      const matchesFocus = focusWorkspace === null || row.workspace === focusWorkspace
      return matchesQuery && matchesChannel && matchesFocus
    })
    const sorters: Record<SortKey, (first: ProjectRow, second: ProjectRow) => number> = {
      recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
      tokensDesc: (first, second) => second.tokens - first.tokens,
      tokensAsc: (first, second) => first.tokens - second.tokens,
      callsDesc: (first, second) => second.calls - first.calls,
    }
    return [...filtered].sort(sorters[sortKey])
  }, [rows, query, channelFilter, sortKey, focusWorkspace])

  const totalTokens = rows.reduce((total, row) => total + row.tokens, 0)
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
        <input className={listStyles.searchInput} placeholder={t('p.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
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

      {focusWorkspace !== null && (
        <div className={listStyles.focusChip}>
          仅看项目：{focusWorkspace}
          <button type="button" className={listStyles.focusClear} onClick={() => props.onClearFocus?.()} aria-label={t('p.clearFilter')}>✕</button>
        </div>
      )}
      <table className={styles.table + ' ' + listStyles.projectTable}>
        <thead>
          <tr><th>项目</th><th>调用</th><th>Tokens</th><th>占比</th><th>成本</th><th>最近活跃</th></tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0
            const dominant = row.dominantProvider
            const channel = channelOf(props.channels, dominant)
            const costCell = costCellOf(channel, row)
            return (
              <tr key={row.workspace}>
                <td>
                  <div className={listStyles.listTitle}>
                    <div>
                      <div className={listStyles.listMain}>{baseNameOf(row.workspace)}</div>
                      <div className={listStyles.listSub}>
                        {row.workspace} · {row.sessionCount} 个会话
                        {row.archivedSessionCount > 0 ? t('p.archivePrefix') + row.archivedSessionCount + t('p.archiveSuffix') : ''}
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
                  : <>{costCell.text}{costCell.amount && <CostSourceChip source={row.costSource} partial={row.partial} />}</>}</td>
                <td>{fmtRelative(row.lastTime, nowMs)}</td>
              </tr>
            )
          })}
          {visible.length === 0 && <tr><td colSpan={6} className={styles.empty}>
            {focusWorkspace === null ? t('p.empty') : t('p.noUsage')}
          </td></tr>}
        </tbody>
      </table>
      {hiddenEmpty > 0 && <div className={styles.statExtra}>{hiddenEmptyRowsText(hiddenEmpty)}</div>}
      <div className={styles.statExtra}>
        成本按三层价目自动估算{props.data.priced ? '' : t('s.noCost')}；命中率 = 缓存读 /（输入 + 输出 + 缓存读）
      </div>
    </div>
  )
}

function coverageText(status: string, skipped: number): string {
  if (status === 'unavailable') return t('s.unavailable')
  return t('s.partial') + String(skipped) + t('s.partialTail')
}

export function baseNameOf(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '')
  const parts = normalized.split(/[\\/]/)
  return parts[parts.length - 1] === '' ? path : parts[parts.length - 1]
}

/** 通道显示名（列表里复用）。 */
export { displayNameOf }
