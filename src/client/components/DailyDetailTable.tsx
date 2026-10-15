/** 每日细目：以「天」为折叠单位，展开行显示该天的模型维度。 */
import { Fragment, type ReactNode } from 'react'
import { displayNameOf } from '../channels.ts'
import { fmtCalls, fmtTokens } from '../format.ts'
import { hiddenEmptyRowsText } from '../rows.ts'
import type { Channel, UsageResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import detailStyles from '../styles/detail.module.css'
import { t, useT } from '../i18n.ts'
import uiStyles from '../styles/ui.module.css'

export interface DetailSortState {
  key: string
  dir: 'asc' | 'desc'
}

/** 输入/输出为 0 时不再显示 `0`（全缓存命中或纯输出模型的 0 是噪音），改显示淡化的 `—`。 */
function tokenCellOf(value: number): ReactNode {
  return value === 0 ? <span className={styles.dim}>—</span> : fmtTokens(value)
}

interface ModelRow {
  period: string
  model: string
  provider: string
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cost: number
  totalTokens: number
}

interface PeriodRow {
  period: string
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cost: number
  totalTokens: number
}

function hitRateOf(cacheReadTokens: number, inputTokens: number, outputTokens: number): string {
  const total = inputTokens + outputTokens + cacheReadTokens
  if (total <= 0) return '—'
  return (cacheReadTokens / total * 100).toFixed(1) + '%'
}

const COMPARERS: Record<string, (first: PeriodRow, second: PeriodRow) => number> = {
  period: (first, second) => (first.period < second.period ? -1 : first.period > second.period ? 1 : 0),
  total: (first, second) => first.totalTokens - second.totalTokens,
  calls: (first, second) => first.calls - second.calls,
  input: (first, second) => first.inputTokens - second.inputTokens,
  output: (first, second) => first.outputTokens - second.outputTokens,
  cacheRead: (first, second) => first.cacheReadTokens - second.cacheReadTokens,
  hit: (first, second) => {
    const firstTotal = first.inputTokens + first.outputTokens + first.cacheReadTokens
    const secondTotal = second.inputTokens + second.outputTokens + second.cacheReadTokens
    return (firstTotal > 0 ? first.cacheReadTokens / firstTotal : -1) - (secondTotal > 0 ? second.cacheReadTokens / secondTotal : -1)
  },
  cost: (first, second) => first.cost - second.cost,
}

export function DailyDetailTable(props: {
  usage: UsageResponse
  channels: Channel[]
  channelFilter: string
  expandedPeriods: Record<string, boolean>
  onTogglePeriod: (periodKey: string) => void
  sort: DetailSortState
  onSort: (sort: DetailSortState) => void
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const { usage, channels, channelFilter, expandedPeriods, onTogglePeriod, sort, onSort } = props
  const modelRows: ModelRow[] = []
  for (const day of usage.days) {
    for (const model of day.models) {
      const totalTokens = model.inputTokens + model.outputTokens + model.cacheReadTokens
      modelRows.push({
        period: day.date, model: model.model, provider: model.provider, calls: model.calls,
        inputTokens: model.inputTokens, outputTokens: model.outputTokens, cacheReadTokens: model.cacheReadTokens,
        cost: model.cost, totalTokens,
      })
    }
  }
  const aggregates = new Map<string, PeriodRow>()
  for (const row of modelRows) {
    const bucket = aggregates.get(row.period)
    if (bucket === undefined) {
      aggregates.set(row.period, {
        period: row.period, calls: row.calls, inputTokens: row.inputTokens, outputTokens: row.outputTokens,
        cacheReadTokens: row.cacheReadTokens, cost: row.cost, totalTokens: row.totalTokens,
      })
    } else {
      bucket.calls += row.calls
      bucket.inputTokens += row.inputTokens
      bucket.outputTokens += row.outputTokens
      bucket.cacheReadTokens += row.cacheReadTokens
      bucket.cost += row.cost
      bucket.totalTokens += row.totalTokens
    }
  }
  const comparer = COMPARERS[sort.key] ?? COMPARERS.period
  // 全天零 Token（只有失败调用）的日子不展示：总计划 0、命中率与成本都是空值，只是噪音
  const nonEmpty = [...aggregates.values()].filter((entry) => entry.totalTokens > 0)
  const hiddenEmpty = aggregates.size - nonEmpty.length
  const ordered = nonEmpty.sort((first, second) => {
    const compared = comparer(first, second)
    return sort.dir === 'asc' ? compared : -compared
  })

  const header = (key: string, label: string): ReactNode => {
    const isActive = sort.key === key
    // 表头排序必须是按钮：鼠标可点是副产品，Tab + Enter/Space 才是可达性要求；aria-sort 让读屏知道当前升/降序
    return (
      <th scope="col" aria-sort={isActive ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          className={styles.sortBtn + (isActive ? ' ' + styles.sortActiveBtn : '')}
          onClick={() => onSort(isActive ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })}
        >
          {label}<span className={styles.sortArrow} aria-hidden="true">{isActive ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
        </button>
      </th>
    )
  }

  const totals = usage.totals
  const totalTokens = totals === null ? 0 : totals.inputTokens + totals.outputTokens + totals.cacheReadTokens
  const periodCount = ordered.length

  if (periodCount === 0) {
    return (
      <div>
        <div className={styles.blockLabel}>每日细目</div>
        <div className={styles.empty}>所选范围内无用量记录</div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.blockLabel}>每日细目</div>
      <div className={uiStyles.tableScroll}><table className={styles.table}>
        <thead>
          <tr>
            {header('period', t('c.date'))}
            {header('total', t('r.total'))}
            {header('calls', t('common.calls'))}
            {header('input', t('c.input'))}
            {header('output', t('c.output'))}
            {header('cacheRead', t('c.cacheRead'))}
            {header('hit', t('d.hitRate'))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((period) => {
            const modelsInPeriod = modelRows
              .filter((row) => row.period === period.period)
              .filter((row) => row.totalTokens > 0)
              .sort((first, second) => second.totalTokens - first.totalTokens)
            const expandable = modelsInPeriod.length > 1
            const isOpen = expandable && expandedPeriods[period.period] === true
            return (
              <Fragment key={period.period}>
                <tr
                  className={expandable ? styles.clickable : ''}
                  onClick={expandable ? () => onTogglePeriod(period.period) : undefined}
                >
                  <td>
                    {expandable ? (
                      // 行点击只方便鼠标；键盘用户需要一个真正的按钮（stopPropagation 避免与行点击重复触发）
                      <button
                        type="button"
                        className={detailStyles.rowToggle}
                        aria-expanded={isOpen}
                        onClick={(event) => {
                          event.stopPropagation()
                          onTogglePeriod(period.period)
                        }}
                      >
                        <span className={detailStyles.toggleArrow} aria-hidden="true">{isOpen ? '▼' : '▶'}</span>
                        {period.period}
                      </button>
                    ) : period.period}
                  </td>
                  <td>{fmtTokens(period.totalTokens)}</td>
                  <td>{fmtCalls(period.calls)}</td>
                  <td>{tokenCellOf(period.inputTokens)}</td>
                  <td>{tokenCellOf(period.outputTokens)}</td>
                  <td>{fmtTokens(period.cacheReadTokens)}</td>
                  <td>{hitRateOf(period.cacheReadTokens, period.inputTokens, period.outputTokens)}</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td className={detailStyles.subRowCell} colSpan={7}>
                      <div className={detailStyles.subHead}>
                        <span />
                        <span className={detailStyles.subNumber}>调用</span>
                        <span className={detailStyles.subNumber}>输入</span>
                        <span className={detailStyles.subNumber}>输出</span>
                        <span className={detailStyles.subNumber}>缓存读</span>
                        <span className={detailStyles.subNumber}>命中率</span>
                      </div>
                      {modelsInPeriod.map((row) => (
                        <div className={detailStyles.subRow} key={row.period + '|' + row.model + '|' + row.provider}>
                          <span className={detailStyles.subName}>
                            <span className={detailStyles.subModel}>{row.model}</span>
                            {channelFilter === 'ALL' && <span className={detailStyles.subChannel}>{displayNameOf(channels, row.provider)}</span>}
                          </span>
                          <span className={detailStyles.subNumber}>{fmtCalls(row.calls)}</span>
                          <span className={detailStyles.subNumber}>{tokenCellOf(row.inputTokens)}</span>
                          <span className={detailStyles.subNumber}>{tokenCellOf(row.outputTokens)}</span>
                          <span className={detailStyles.subNumber}>{fmtTokens(row.cacheReadTokens)}</span>
                          <span className={detailStyles.subNumber}>{hitRateOf(row.cacheReadTokens, row.inputTokens, row.outputTokens)}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
          <tr className={styles.total}>
            <td>合计</td>
            <td>{fmtTokens(totalTokens)}</td>
            <td>{fmtCalls(totals?.calls ?? 0)}</td>
            <td>{fmtTokens(totals?.inputTokens ?? 0)}</td>
            <td>{fmtTokens(totals?.outputTokens ?? 0)}</td>
            <td>{fmtTokens(totals?.cacheReadTokens ?? 0)}</td>
            <td>{hitRateOf(totals?.cacheReadTokens ?? 0, totals?.inputTokens ?? 0, totals?.outputTokens ?? 0)}</td>
          </tr>
        </tbody>
      </table></div>
      {hiddenEmpty > 0 && <div className={styles.statExtra}>{hiddenEmptyRowsText(hiddenEmpty)}</div>}
    </div>
  )
}
