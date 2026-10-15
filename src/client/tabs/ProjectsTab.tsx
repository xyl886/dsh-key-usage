/** 项目用量：按会话工作目录聚合。 */
import { useMemo, useState, type ReactNode } from 'react'
import { channelColorOf, channelOf, costCellOf, displayNameOf } from '../core/channels.ts'
import { fmtCalls, fmtDateTime, fmtRelative, fmtTokens } from '../core/format.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../core/export.ts'
import { dropEmptyRows, hiddenEmptyRowsText } from '../core/rows.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { COST_SOURCE_LABELS } from '../core/pricing.ts'
import type { Channel, ProjectRow, ProjectsResponse } from '../core/types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'
import exportStyles from '../styles/export.module.css'
import { t, useT } from '../core/i18n.ts'
import { Select } from '../components/ui/Select.tsx'
import { Button } from '../components/ui/Button.tsx'
import uiStyles from '../styles/ui.module.css'

type SortKey = 'recent' | 'tokensDesc' | 'tokensAsc' | 'callsDesc'

/** 导出列：成本与命中率都给原始数值，方便在表格里继续算。 */
const EXPORT_COLUMNS: Array<ExportColumn<ProjectRow>> = [
  { key: 'workspace', labelKey: 'p.path', value: (row) => row.workspace },
  { key: 'dominantProvider', labelKey: 'p.mainChannel', value: (row) => row.dominantProvider },
  { key: 'calls', labelKey: 'common.calls', value: (row) => row.calls },
  { key: 'tokens', label: 'Tokens', value: (row) => row.tokens },
  { key: 'cacheHitRate', labelKey: 'c.hitRate', value: (row) => row.cacheHitRate },
  { key: 'cost', labelKey: 'c.costNative', value: (row) => row.cost },
  { key: 'costSource', labelKey: 's.costSource', value: (row) => row.costSource === undefined ? null : t(COST_SOURCE_LABELS[row.costSource]) },
  { key: 'sessionCount', labelKey: 'm.sessions', value: (row) => row.sessionCount },
  { key: 'archivedSessionCount', labelKey: 'p.archivedSessions', value: (row) => row.archivedSessionCount },
  { key: 'lastTime', labelKey: 'm.lastActive', value: (row) => fmtDateTime(row.lastTime) },
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

  if (props.data === null) return <div className={styles.empty}>{t('s.loading')}</div>

  return (
    <div>
      {props.data.coverage.status !== 'complete' && (
        <div className={styles.warning}>{coverageText(props.data.coverage.status, props.data.coverage.skippedSessions)}</div>
      )}
      <div className={listStyles.filterBar}>
        <input className={listStyles.searchInput} placeholder={t('p.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select
          ariaLabel={t('s.filterChannel')}
          value={channelFilter}
          onChange={setChannelFilter}
          options={[{ value: 'ALL', labelKey: 's.allChannels' }, ...props.channels.map((channel) => ({ value: channel.provider, label: channel.displayName }))]}
        />
        <Select
          ariaLabel={t('s.sort')}
          value={sortKey}
          onChange={(next) => setSortKey(next as SortKey)}
          options={[
            { value: 'recent', labelKey: 'm.lastActive' },
            { value: 'tokensDesc', labelKey: 's.sortTokensDesc' },
            { value: 'tokensAsc', labelKey: 's.sortTokensAsc' },
            { value: 'callsDesc', labelKey: 's.sortCalls' },
          ]}
        />
        <span className={exportStyles.exportGroup}>
          <Button size="sm" disabled={visible.length === 0} onClick={() => exportRows('csv')}>{t('export.csv')}</Button>
          <Button size="sm" disabled={visible.length === 0} onClick={() => exportRows('json')}>{t('export.json')}</Button>
        </span>
      </div>

      {focusWorkspace !== null && (
        <div className={listStyles.focusChip}>
          {t('p.focusPrefix')}{focusWorkspace}
          <button type="button" className={listStyles.focusClear} onClick={() => props.onClearFocus?.()} aria-label={t('p.clearFilter')}>✕</button>
        </div>
      )}
      <div className={uiStyles.tableScroll}><table className={styles.table + ' ' + listStyles.projectTable}>
        <thead>
          <tr><th>{t('p.project')}</th><th>{t('common.calls')}</th><th>Tokens</th><th>{t('m.share')}</th><th>{t('c.cost')}</th><th>{t('m.lastActive')}</th></tr>
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
                        {row.workspace} · {row.sessionCount}{t('common.sessionSuffix')}
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
      </table></div>
      <div className={styles.statExtra}>
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
