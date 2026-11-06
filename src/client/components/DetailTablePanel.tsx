/** 使用明细表格：维度切换、列排序、行展开模型构成、合计行与环比 / 成本来源列。 */
import { Fragment, type ReactNode } from 'react'
import { displayNameOf } from '../core/channels.ts'
import { fmtCalls, fmtShortDate, fmtTokens } from '../core/format.ts'
import { t } from '../core/i18n.ts'
import { costSourceLabelOf } from '../core/pricing.ts'
import { costTextOf } from '../core/usage-scope.ts'
import type { Channel, UsageTotals } from '../core/types.ts'
import type { DetailRow, SortKey } from '../tabs/DetailTab.tsx'
import detailStyles from '../styles/detail.module.css'
import styles from '../styles/shared.module.css'

export function deltaCellOf(delta: number | null): ReactNode {
  if (delta === null) return '—'
  const tone = delta > 0 ? detailStyles.deltaUp : delta < 0 ? detailStyles.deltaDown : ''
  return <span className={tone}>{delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}{Math.abs(delta).toFixed(1)}%</span>
}

export function DetailTablePanel(props: {
  dimensions: Array<[string, string]>
  dimension: string
  onDimension: (key: string) => void
  sortedRows: DetailRow[]
  tableColumns: Array<[SortKey, string]>
  sortKey: SortKey
  sortDirection: 'asc' | 'desc'
  onToggleSort: (key: SortKey) => void
  expanded: Record<string, boolean>
  onToggleExpanded: (key: string) => void
  hourlyTable: boolean
  groupCount: number
  safeTotals: UsageTotals
  totalCostText: string
  totalDeltaCell: ReactNode
  rightAligned: Set<SortKey>
  channels: Channel[]
}): ReactNode {
  return (
        <div className={detailStyles.panel}>
          <div className={detailStyles.panelHead}>
            <span className={detailStyles.panelTitle}>{t('detail.dailyDetail')}</span>
            <div className={detailStyles.metricTabs}>
              {props.dimensions.map(([key, labelKey]) => (
                <button
                  key={key}
                  type="button"
                  className={props.dimension === key ? detailStyles.metricTab + ' ' + detailStyles.metricTabOn : detailStyles.metricTab}
                  aria-pressed={props.dimension === key}
                  onClick={() => props.onDimension(key)}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <span className={detailStyles.panelMore}>{t('detail.rows', { count: props.sortedRows.length })}</span>
          </div>
          {props.sortedRows.length === 0
            ? <div className={styles.empty}>{t('empty.noUsage')}</div>
            : (
              <div className={detailStyles.tableScroll}>
                <table className={detailStyles.detailTable}>
                  <thead>
                    <tr>
                      <th scope="col" />
                      {props.tableColumns.map(([key, labelKey]) => {
                        const active = props.sortKey === key
                        return (
                          <th
                            key={key}
                            scope="col"
                            aria-sort={active ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            className={props.rightAligned.has(key) ? detailStyles.alignRight : detailStyles.alignLeft}
                          >
                            <button type="button" className={detailStyles.sortBtn} onClick={() => props.onToggleSort(key)}>
                              {t(labelKey)}
                              {active && <span className={detailStyles.sortDir} aria-hidden="true">{props.sortDirection === 'asc' ? '↑' : '↓'}</span>}
                            </button>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {props.sortedRows.map((row) => {
                      const open = props.expanded[row.key] === true
                      return (
                        <Fragment key={row.key}>
                          <tr>
                            <td>
                              {row.models.length === 0
                                // 没有更细的模型构成就不给展开入口，但留出同宽箭头位，避免各行文字错位
                                ? <span className={detailStyles.expandSpacer} aria-hidden="true" />
                                : (
                                  <button
                                    type="button"
                                    className={detailStyles.expandBtn}
                                    aria-expanded={open}
                                    aria-label={open ? t('detail.collapse') : t('detail.expand')}
                                    onClick={() => props.onToggleExpanded(row.key)}
                                  >
                                    <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                                  </button>
                                )}
                            </td>
                            <td className={detailStyles.alignLeft}>{row.date === '' ? '' : fmtShortDate(row.date)}</td>
                            <td className={detailStyles.alignLeft}>
                              {row.label}
                              {row.labelDim !== null && <span className={styles.dim}> {row.labelDim}</span>}
                            </td>
                            <td className={detailStyles.alignRight}>{fmtCalls(row.calls)}</td>
                            <td className={detailStyles.alignRight}>{fmtTokens(row.input)}</td>
                            <td className={detailStyles.alignRight}>{fmtTokens(row.output)}</td>
                            <td className={detailStyles.alignRight}>{fmtTokens(row.cacheRead)}</td>
                            <td className={detailStyles.alignRight}>{row.sessions === null ? '—' : fmtCalls(row.sessions)}</td>
                            <td className={detailStyles.alignRight + ' ' + detailStyles.costCell} title={row.costText === '—' ? t('cost.noBasis') : undefined}>{row.costText}</td>
                            {!props.hourlyTable && <td className={detailStyles.alignRight}>{deltaCellOf(row.delta)}</td>}
                            {!props.hourlyTable && <td className={detailStyles.alignRight}>{costSourceLabelOf(row.source, t)}</td>}
                          </tr>
                          {open && (
                            <tr>
                              <td className={detailStyles.subCell} colSpan={props.tableColumns.length + 1}>
                                <table className={detailStyles.subTable}>
                                  <thead>
                                    <tr>
                                      <th scope="col" className={detailStyles.alignLeft}>{t('detail.model')}</th>
                                      <th scope="col" className={detailStyles.alignRight}>{t('c.calls')}</th>
                                      <th scope="col" className={detailStyles.alignRight}>Tokens</th>
                                      <th scope="col" className={detailStyles.alignRight}>{t('c.cost')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.models.map((model) => (
                                      <tr key={model.provider + '|' + model.model}>
                                        <td className={detailStyles.alignLeft}>
                                          {model.model}
                                          <span className={styles.dim}> · {displayNameOf(props.channels, model.provider)}</span>
                                        </td>
                                        <td className={detailStyles.alignRight}>{fmtCalls(model.calls)}</td>
                                        <td className={detailStyles.alignRight}>{fmtTokens(model.inputTokens + model.outputTokens + model.cacheReadTokens)}</td>
                                        <td className={detailStyles.alignRight}>{costTextOf(model, model.costSource ?? null)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                    <tr className={detailStyles.totalRow}>
                      <td />
                      <td className={detailStyles.alignLeft}>{t('detail.total')}</td>
                      <td className={detailStyles.alignLeft}>{t('detail.groupCount', { count: props.groupCount })}</td>
                      <td className={detailStyles.alignRight}>{fmtCalls(props.safeTotals.calls)}</td>
                      <td className={detailStyles.alignRight}>{fmtTokens(props.safeTotals.inputTokens)}</td>
                      <td className={detailStyles.alignRight}>{fmtTokens(props.safeTotals.outputTokens)}</td>
                      <td className={detailStyles.alignRight}>{fmtTokens(props.safeTotals.cacheReadTokens)}</td>
                      <td className={detailStyles.alignRight}>{props.totalCostText}</td>
                      <td className={detailStyles.alignRight}>{props.totalDeltaCell}</td>
                      <td className={detailStyles.alignRight}>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
      </div>
  )
}
