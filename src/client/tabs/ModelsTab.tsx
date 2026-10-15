/** 按模型：`provider + model` 聚合的用量与估算成本（数据来自宿主会话事件折叠）。 */
import { useMemo, useState, type ReactNode } from 'react'
import { failureReasonOf } from '../api.ts'
import { channelColorOf, channelOf, costCellOf } from '../channels.ts'
import { fmtCalls, fmtDateTime, fmtRelative, fmtTokens } from '../format.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../export.ts'
import { dropEmptyRows, hiddenEmptyRowsText } from '../rows.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { COST_SOURCE_LABELS } from '../pricing.ts'
import type { Channel, ModelAggregateRow, ModelsResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'
import exportStyles from '../styles/export.module.css'
import { t, useT } from '../i18n.ts'

const MODELS_PATH = '/dsh-key-usage/models'

type SortKey = 'tokensDesc' | 'callsDesc' | 'costDesc' | 'recent'

/** 导出列：取原始数值（金额、命中率不带单位），方便直接进表格做计算。 */
const EXPORT_COLUMNS: Array<ExportColumn<ModelAggregateRow>> = [
  { key: 'provider', label: t('m.channelId'), value: (row) => row.provider },
  { key: 'providerLabel', label: t('common.channel'), value: (row) => row.providerLabel },
  { key: 'model', label: t('m.model'), value: (row) => row.model },
  { key: 'calls', label: t('common.calls'), value: (row) => row.calls },
  { key: 'tokens', label: 'Tokens', value: (row) => row.tokens },
  { key: 'inputTokens', label: t('c.input'), value: (row) => row.buckets.inputTokens },
  { key: 'outputTokens', label: t('c.output'), value: (row) => row.buckets.outputTokens },
  { key: 'cacheReadTokens', label: t('c.cacheRead'), value: (row) => row.buckets.cacheReadTokens },
  { key: 'cacheHitRate', label: t('c.hitRate'), value: (row) => row.cacheHitRate },
  { key: 'cost', label: t('c.costNative'), value: (row) => row.cost },
  { key: 'costSource', label: t('s.costSource'), value: (row) => row.costSource === undefined ? null : t(COST_SOURCE_LABELS[row.costSource]) },
  { key: 'costMode', label: t('d.costMode'), value: (row) => row.costMode },
  { key: 'sessionCount', label: t('m.sessions'), value: (row) => row.sessionCount },
  { key: 'lastTime', label: t('m.lastActive'), value: (row) => fmtDateTime(row.lastTime) },
]

export function ModelsTab(props: { data: ModelsResponse | null; channels: Channel[] }): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('tokensDesc')
  const [nowMs] = useState(() => Date.now())
  const rows = props.data?.rows ?? []

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
      const haystack = (row.model + ' ' + row.provider + ' ' + row.providerLabel).toLowerCase()
      const matchesQuery = keyword === '' || haystack.includes(keyword)
      const matchesChannel = channelFilter === 'ALL' || row.provider === channelFilter
      return matchesQuery && matchesChannel
    })
    const sorters: Record<SortKey, (first: ModelAggregateRow, second: ModelAggregateRow) => number> = {
      tokensDesc: (first, second) => second.tokens - first.tokens,
      callsDesc: (first, second) => second.calls - first.calls,
      costDesc: (first, second) => (second.cost ?? 0) - (first.cost ?? 0),
      recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
    }
    return [...filtered].sort(sorters[sortKey])
  }, [rows, query, channelFilter, sortKey])

  const totalTokens = rows.reduce((total, row) => total + row.tokens, 0)
  const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden

  /** 导出当前筛选与排序后的行（JSON 取整行，CSV 按固定列映射）。 */
  const exportRows = (format: 'csv' | 'json'): void => {
    if (format === 'csv') downloadFile(exportFileName('models', 'csv'), toCsv(visible, EXPORT_COLUMNS), CSV_MIME)
    else downloadFile(exportFileName('models', 'json'), toJson(visible), JSON_MIME)
  }

  if (props.data === null) {
    const reason = failureReasonOf(MODELS_PATH)
    return <div className={styles.empty}>{reason === null ? t('m.loading') : t('m.unavailable') + reason}</div>
  }

  return (
    <div>
      {props.data.coverage.status !== 'complete' && (
        <div className={styles.warning}>{coverageText(props.data.coverage.status, props.data.coverage.skippedSessions)}</div>
      )}
      <div className={listStyles.filterBar}>
        <input className={listStyles.searchInput} placeholder={t('m.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className={listStyles.filterSelect} value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
          <option value="ALL">全部通道</option>
          {props.channels.map((channel) => <option key={channel.provider} value={channel.provider}>{channel.displayName}</option>)}
        </select>
        <select className={listStyles.filterSelect} value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
          <option value="tokensDesc">Tokens 最多</option>
          <option value="callsDesc">调用最多</option>
          <option value="costDesc">成本最高</option>
          <option value="recent">最近活跃</option>
        </select>
        <span className={exportStyles.exportGroup}>
          <button className={exportStyles.exportBtn} disabled={visible.length === 0} onClick={() => exportRows('csv')}>导出 CSV</button>
          <button className={exportStyles.exportBtn} disabled={visible.length === 0} onClick={() => exportRows('json')}>导出 JSON</button>
        </span>
      </div>

      <table className={styles.table + ' ' + listStyles.modelTable}>
        <thead>
          <tr><th>模型</th><th>调用</th><th>Tokens</th><th>占比</th><th>命中率</th><th>成本</th><th>最近活跃</th></tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0
            const channel = channelOf(props.channels, row.provider)
            const costCell = costCellOf(channel, row)
            return (
              <tr key={row.provider + '|' + row.model}>
                <td>
                  <div className={listStyles.listTitle}>
                    <div>
                      <div className={listStyles.listMain}>{row.model}</div>
                      <div className={listStyles.listSub}>
                        <span
                          className={styles.statusDot}
                          style={{ background: channelColorOf(props.channels, row.provider), marginRight: 4 }}
                        />
                        {row.providerLabel} · {row.sessionCount} 个会话
                      </div>
                    </div>
                  </div>
                </td>
                <td>{fmtCalls(row.calls)}</td>
                <td>{fmtTokens(row.tokens)}</td>
                <td>
                  <span className={listStyles.listBar}>
                    <i style={{ width: Math.max(2, percent) + '%', background: channelColorOf(props.channels, row.provider) }} />
                  </span> {percent}%
                </td>
                <td>{row.cacheHitRate === null ? '—' : row.cacheHitRate.toFixed(1) + '%'}</td>
                <td>{row.cost === null || channel?.costMode !== 'perToken'
                  ? <span className={styles.dim}>{costCell.text}</span>
                  : <>{costCell.text}{costCell.amount && <CostSourceChip source={row.costSource} partial={row.partial} />}</>}</td>
                <td>{fmtRelative(row.lastTime, nowMs)}</td>
              </tr>
            )
          })}
          {visible.length === 0 && <tr><td colSpan={7} className={styles.empty}>没有符合条件的模型</td></tr>}
        </tbody>
      </table>
      {hiddenEmpty > 0 && <div className={styles.statExtra}>{hiddenEmptyRowsText(hiddenEmpty)}</div>}
      <div className={styles.statExtra}>
        模型用量按宿主会话事件折叠（每个结算样本计一次调用）；成本按三层价目自动估算
        {props.data.priced ? '' : t('s.noCost')}；命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）
      </div>
    </div>
  )
}

function coverageText(status: string, skipped: number): string {
  if (status === 'unavailable') return t('s.unavailable')
  return t('s.partial') + String(skipped) + t('s.partialTail')
}
