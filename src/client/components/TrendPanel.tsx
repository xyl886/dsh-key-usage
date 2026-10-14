/**
 * 环比对比：当前范围 vs 上一段等长范围。
 * 纯客户端实现 —— 复用同一个 /usage 端点按上期范围再请求一次，服务端不感知「环比」。
 * 涨跌只用中性色 + 上下箭头：用量涨不代表好、成本涨也不代表错，不引入红绿对错语义。
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loadUsage } from '../api.ts'
import { channelOf, costCellText } from '../channels.ts'
import { fmtCalls, fmtCost, fmtTokens, isoDate } from '../format.ts'
import { COST_SOURCE_LABELS } from '../pricing.ts'
import type { Channel, DaySummary, UsageResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import trendStyles from '../styles/trend.module.css'

/** 与 DetailTab 的 `RangeKey` 同形：单独声明，避免两个模块互相 import 类型。 */
export type TrendRangeKey = 'today' | 'week' | 'month' | 'total' | 'custom'

const DAY_MS = 86400000

interface ChangeView {
  text: string
  kind: 'up' | 'down' | 'flat' | 'none'
  /** 成本上升时用中性提示色标注（不是错误语义）。 */
  warn: boolean
}

interface TrendRow {
  key: string
  label: string
  current: ReactNode
  previous: ReactNode
  change: ReactNode
}

const FLAT: ChangeView = { text: '持平', kind: 'flat', warn: false }
const UNAVAILABLE: ChangeView = { text: '—', kind: 'none', warn: false }

/** 闭区间天数，至少 1（日期键按本地日历算，与 DetailTab 的横轴口径一致）。 */
function spanDaysOf(from: string, to: string): number {
  const fromTime = new Date(from + 'T00:00:00').getTime()
  const toTime = new Date(to + 'T00:00:00').getTime()
  return Math.max(1, Math.round((toTime - fromTime) / DAY_MS) + 1)
}

/** 上一段等长范围：本期首日的前一天往前推同样天数（10-07~10-13 → 09-30~10-06）。 */
function previousWindowOf(from: string, to: string): { from: string; to: string } {
  const startTime = new Date(from + 'T00:00:00').getTime()
  const span = spanDaysOf(from, to)
  return { from: isoDate(new Date(startTime - span * DAY_MS)), to: isoDate(new Date(startTime - DAY_MS)) }
}

/** 展示口径 Tokens：输入 + 输出 + 缓存读（与三张统计卡、命中率公式同一口径）。 */
function displayTokensOf(totals: DaySummary): number {
  return totals.inputTokens + totals.outputTokens + totals.cacheReadTokens
}

/** 命中率（%）；分母为 0 时返回 null，界面显示 — 而不是 NaN。 */
function hitRateOf(totals: DaySummary): number | null {
  const total = displayTokensOf(totals)
  return total > 0 ? totals.cacheReadTokens / total * 100 : null
}

/** 该期是否有任何用量：全 0 视为「无数据」，据此显示「上期无数据」而不是 0 与 −100%。 */
function hasAnyData(totals: DaySummary | null): boolean {
  return totals !== null && (totals.calls > 0 || displayTokensOf(totals) > 0 || totals.cost > 0)
}

/** 环比百分比；上期为 0 时不给百分比（Infinity / NaN 不进界面）。 */
function percentChangeOf(current: number, previous: number, warnOnUp: boolean): ChangeView {
  if (previous <= 0) return current <= 0 ? FLAT : { text: '上期为 0', kind: 'none', warn: false }
  const percent = (current - previous) / previous * 100
  if (Math.abs(percent) < 0.05) return FLAT
  return {
    text: (percent > 0 ? '+' : '') + percent.toFixed(1) + '%',
    kind: percent > 0 ? 'up' : 'down',
    warn: warnOnUp && percent > 0,
  }
}

/** 命中率本身是比值，涨跌按百分点（pp）计，避免「96.2% 比 94.0% 涨 2.3%」这类误读。 */
function pointChangeOf(current: number, previous: number): ChangeView {
  const difference = current - previous
  if (Math.abs(difference) < 0.05) return FLAT
  return {
    text: (difference > 0 ? '+' : '') + difference.toFixed(1) + 'pp',
    kind: difference > 0 ? 'up' : 'down',
    warn: false,
  }
}

/**
 * 成本文案：订阅 / 免费 / 本地端点没有可比金额，沿用 `costCellText` 的占位文案；
 * 其余情况一律给金额（含 ¥0.00），否则「本期降到 0」会被当成不可比而丢掉 −100%。
 */
function costTextOf(channel: Channel | null, cost: number): { text: string; dim: boolean; amount: boolean } {
  if (channel !== null && channel.costMode !== 'perToken' && channel.costMode !== 'unknown') {
    const cell = costCellText(channel, cost)
    return { text: cell.text, dim: cell.dim, amount: false }
  }
  return { text: fmtCost(cost), dim: false, amount: true }
}

function changeNodeOf(change: ChangeView): ReactNode {
  if (change.kind === 'none') return <span className={trendStyles.muted}>{change.text}</span>
  const arrow = change.kind === 'up' ? '↑' : change.kind === 'down' ? '↓' : '→'
  const tone = change.warn ? trendStyles.warn : change.kind === 'flat' ? trendStyles.flat : ''
  return <span className={tone === '' ? trendStyles.change : trendStyles.change + ' ' + tone}>{arrow} {change.text}</span>
}

export function TrendPanel(props: {
  usage: UsageResponse
  channels: Channel[]
  range: TrendRangeKey
  bounds: { from: string; to: string }
  channelFilter: string
  /** 计费规则版本号：规则一改两期就不是同一套成本口径，靠它触发上期重取。 */
  pricingRevision: number
}): ReactNode {
  const { usage, bounds, channelFilter } = props
  const comparable = props.range !== 'total'
  const previousWindow = useMemo(() => previousWindowOf(bounds.from, bounds.to), [bounds.from, bounds.to])
  const [previousUsage, setPreviousUsage] = useState<UsageResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  useEffect(() => {
    if (!comparable) return
    let cancelled = false
    setStatus('loading')
    void loadUsage(previousWindow.from, previousWindow.to, channelFilter).then((result) => {
      if (cancelled) return
      setPreviousUsage(result)
      setStatus('ready')
    })
    return () => { cancelled = true }
  }, [comparable, previousWindow.from, previousWindow.to, channelFilter, props.pricingRevision])

  const header = (
    <div className={trendStyles.head}>
      <span className={styles.statLabel}>环比对比 · 与上一段等长范围</span>
      <span className={trendStyles.span}>
        本期 {bounds.from} ~ {bounds.to}
        {comparable ? ' · 上期 ' + previousWindow.from + ' ~ ' + previousWindow.to : ''}
      </span>
    </div>
  )

  if (!comparable) {
    return (
      <div className={styles.card + ' ' + trendStyles.panel}>
        {header}
        <div className={trendStyles.placeholder}>总计范围没有可对比的上一段</div>
      </div>
    )
  }

  const currentTotals = usage.totals
  const previousTotals = previousUsage?.totals ?? null
  const previousHasData = status === 'ready' && hasAnyData(previousTotals)
  const currentHasData = hasAnyData(currentTotals)
  const previousPlaceholder = status === 'loading' ? '读取中…' : previousUsage === null ? '无法获取' : '上期无数据'

  const currentValue = (text: string): ReactNode => <span className={trendStyles.current}>{text}</span>
  const previousValue = (text: string): ReactNode => previousHasData
    ? <span className={trendStyles.previous}>{text}</span>
    : <span className={trendStyles.muted}>{previousPlaceholder}</span>
  const changeValue = (change: ChangeView): ReactNode => previousHasData
    ? changeNodeOf(change)
    : <span className={trendStyles.muted}>—</span>

  const currentCalls = currentTotals?.calls ?? 0
  const previousCalls = previousTotals?.calls ?? 0
  const currentTokens = currentTotals === null ? 0 : displayTokensOf(currentTotals)
  const previousTokens = previousTotals === null ? 0 : displayTokensOf(previousTotals)
  const currentHitRate = currentTotals === null ? null : hitRateOf(currentTotals)
  const previousHitRate = previousTotals === null ? null : hitRateOf(previousTotals)
  const currentCost = currentTotals?.cost ?? 0
  const previousCost = previousTotals?.cost ?? 0
  const singleChannel = channelFilter === 'ALL' ? null : channelOf(props.channels, channelFilter)
  const currentCostText = costTextOf(singleChannel, currentCost)
  const previousCostText = costTextOf(singleChannel, previousCost)
  const costComparable = currentCostText.amount && previousCostText.amount

  const rows: TrendRow[] = [
    {
      key: 'calls',
      label: '调用次数',
      current: currentValue(fmtCalls(currentCalls)),
      previous: previousValue(fmtCalls(previousCalls)),
      change: changeValue(percentChangeOf(currentCalls, previousCalls, false)),
    },
    {
      key: 'tokens',
      label: 'Tokens',
      current: currentValue(fmtTokens(currentTokens)),
      previous: previousValue(fmtTokens(previousTokens)),
      change: changeValue(percentChangeOf(currentTokens, previousTokens, false)),
    },
    {
      key: 'cost',
      label: '成本',
      current: currentCostText.amount
        ? currentValue(currentCostText.text)
        : <span className={trendStyles.muted}>{currentCostText.text}</span>,
      previous: previousValue(previousCostText.text),
      change: costComparable
        ? changeValue(percentChangeOf(currentCost, previousCost, true))
        : <span className={trendStyles.muted}>不可比</span>,
    },
    {
      key: 'hitRate',
      label: '缓存命中率',
      current: currentValue(currentHitRate === null ? '—' : currentHitRate.toFixed(1) + '%'),
      previous: previousValue(previousHitRate === null ? '—' : previousHitRate.toFixed(1) + '%'),
      change: changeValue(currentHitRate !== null && previousHitRate !== null
        ? pointChangeOf(currentHitRate, previousHitRate)
        : UNAVAILABLE),
    },
  ]

  const notes: string[] = []
  if ((usage.sessionDates ?? []).length > 0 || (previousUsage?.sessionDates ?? []).length > 0) {
    notes.push('含会话补位数据，与台账口径不完全可比')
  }
  if (previousHasData && costComparable) {
    const currentSource = currentTotals?.costSource ?? 'none'
    const previousSource = previousTotals?.costSource ?? 'none'
    if (currentSource !== previousSource) {
      notes.push('两期成本来源不同（本期 ' + COST_SOURCE_LABELS[currentSource] + ' / 上期 ' + COST_SOURCE_LABELS[previousSource] + '），口径不完全可比')
    }
  }
  if (status === 'ready' && previousUsage === null) notes.push('上一段范围读取失败，无法对比')
  if (!currentHasData) notes.push('本期范围内无用量记录')
  notes.push('命中率的变化按百分点（pp）计，其余指标为环比百分比')

  return (
    <div className={styles.card + ' ' + trendStyles.panel}>
      {header}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>指标</th>
            <th>本期</th>
            <th>上期</th>
            <th>变化</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.current}</td>
              <td>{row.previous}</td>
              <td>{row.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={trendStyles.notes}>
        {notes.map((note) => <div key={note} className={trendStyles.note}>{note}</div>)}
      </div>
    </div>
  )
}
