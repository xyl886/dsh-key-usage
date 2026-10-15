/**
 * 环比对比：纯客户端实现（复用 /usage 按上期范围再请求一次），涨跌只用中性色 + 箭头，不引入对错语义。
 */
import { useEffect, useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loadUsage } from '../api.ts'
import { channelOf, costCellOf } from '../channels.ts'
import { fmtCalls, fmtTokens, isoDate } from '../format.ts'
import { comparableMoneyAmountOf, rowMoneyViewOf, type CostRowLike } from '../currency.ts'
import { COST_SOURCE_LABELS } from '../pricing.ts'
import type { Channel, DaySummary, UsageResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import trendStyles from '../styles/trend.module.css'
import { t, useT } from '../i18n.ts'

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

const FLAT: ChangeView = { text: t('t.flat'), kind: 'flat', warn: false }
const UNAVAILABLE: ChangeView = { text: '—', kind: 'none', warn: false }

/** 标题文案：折叠控件与「总计范围没有上一段」分支共用。 */
const TITLE_TEXT = t('t.title') + ' · ' + t('t.titleNote')

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
  return totals !== null && (totals.calls > 0 || displayTokensOf(totals) > 0 || comparableMoneyAmountOf(totals) > 0)
}

/** 环比百分比；上期为 0 时不给百分比（Infinity / NaN 不进界面）。 */
function percentChangeOf(current: number, previous: number, warnOnUp: boolean): ChangeView {
  if (previous <= 0) return current <= 0 ? FLAT : { text: t('t.prevZero'), kind: 'none', warn: false }
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

/** 成本文案：订阅 / 免费 / 本地端点为占位文案；其余一律给金额（含 0，否则「降到 0」会丢掉 −100%）。 */
function costTextOf(channel: Channel | null, row: CostRowLike | null): { text: string; dim: boolean; amount: boolean } {
  if (channel !== null && channel.costMode !== 'perToken' && channel.costMode !== 'unknown') {
    const cell = costCellOf(channel, row ?? {})
    return { text: cell.text, dim: cell.dim, amount: false }
  }
  return { text: rowMoneyViewOf(row ?? {}).text, dim: false, amount: true }
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
  /** 价目版本号：价目换了一份两期就不是同一套成本口径，靠它触发上期重取。 */
  pricingRevision: number
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const { usage, bounds, channelFilter } = props
  const comparable = props.range !== 'total'
  const previousWindow = useMemo(() => previousWindowOf(bounds.from, bounds.to), [bounds.from, bounds.to])
  const [previousUsage, setPreviousUsage] = useState<UsageResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  /** 默认折叠，且不记住上次状态：每次进页面都从收起的一行开始（多个实例各自独立）。 */
  const [expanded, setExpanded] = useState(false)
  const instanceId = useId()
  const bodyId = instanceId + '-trend-body'

  const periodText = t('t.currentPrefix') + bounds.from + ' ~ ' + bounds.to
    + (comparable ? t('t.previousPrefix') + previousWindow.from + ' ~ ' + previousWindow.to : '')

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

  if (!comparable) {
    // 没有可对比的上一段时没有可展开的内容，只留一行说明（不给展开控件）
    return (
      <div className={styles.card + ' ' + trendStyles.panel}>
        <div className={trendStyles.head}>
          <span className={styles.statLabel}>{TITLE_TEXT}</span>
          <span className={trendStyles.span}>{periodText}</span>
        </div>
        <div className={trendStyles.placeholder}>总计范围没有可对比的上一段</div>
      </div>
    )
  }

  const currentTotals = usage.totals
  const previousTotals = previousUsage?.totals ?? null
  const previousHasData = status === 'ready' && hasAnyData(previousTotals)
  const currentHasData = hasAnyData(currentTotals)
  const previousPlaceholder = status === 'loading' ? t('t.loading') : previousUsage === null ? t('t.failed') : t('t.prevNoData')

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
  const currentCost = currentTotals === null ? 0 : comparableMoneyAmountOf(currentTotals)
  const previousCost = previousTotals === null ? 0 : comparableMoneyAmountOf(previousTotals)
  const singleChannel = channelFilter === 'ALL' ? null : channelOf(props.channels, channelFilter)
  const currentCostText = costTextOf(singleChannel, currentTotals)
  const previousCostText = costTextOf(singleChannel, previousTotals)
  const costComparable = currentCostText.amount && previousCostText.amount

  const rows: TrendRow[] = [
    {
      key: 'calls',
      label: t('d.callCount'),
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
      label: t('d.hitRateShort'),
      current: currentValue(currentHitRate === null ? '—' : currentHitRate.toFixed(1) + '%'),
      previous: previousValue(previousHitRate === null ? '—' : previousHitRate.toFixed(1) + '%'),
      change: changeValue(currentHitRate !== null && previousHitRate !== null
        ? pointChangeOf(currentHitRate, previousHitRate)
        : UNAVAILABLE),
    },
  ]

  const notes: string[] = []
  if ((usage.sessionDates ?? []).length > 0 || (previousUsage?.sessionDates ?? []).length > 0) {
    notes.push(t('t.notComparableSession'))
  }
  if (previousHasData && costComparable) {
    const currentSource = currentTotals?.costSource ?? 'none'
    const previousSource = previousTotals?.costSource ?? 'none'
    if (currentSource !== previousSource) {
      notes.push(t('t.sourceDiffPrefix') + COST_SOURCE_LABELS[currentSource] + t('t.sourceDiffMiddle') + COST_SOURCE_LABELS[previousSource] + t('t.sourceDiffSuffix'))
    }
  }
  if (status === 'ready' && previousUsage === null) notes.push(t('t.prevLoadFailed'))
  if (!currentHasData) notes.push(t('t.noUsage'))
  notes.push(t('t.ppNote'))

  /** 折叠态摘要：复用表里已算好的值（成本不可比时退到 Tokens），不新增任何计算口径。 */
  const summary = costComparable
    ? { label: t('t.currentCost'), text: currentCostText.text, change: percentChangeOf(currentCost, previousCost, true) }
    : { label: t('t.currentTokens'), text: fmtTokens(currentTokens), change: percentChangeOf(currentTokens, previousTokens, false) }

  const toggle = (
    <button
      type="button"
      className={trendStyles.toggle}
      aria-expanded={expanded}
      aria-controls={bodyId}
      onClick={() => setExpanded((previous) => !previous)}
    >
      <span className={trendStyles.arrow} aria-hidden="true">{expanded ? '▼' : '▶'}</span>
      <span className={styles.statLabel}>{TITLE_TEXT}</span>
    </button>
  )

  return (
    <div className={styles.card + ' ' + trendStyles.panel}>
      <div className={trendStyles.head}>
        {toggle}
        {expanded
          ? <span className={trendStyles.span}>{periodText}</span>
          : (
            <span className={trendStyles.summary}>
              {summary.label} <b>{summary.text}</b>
              {t('t.vs')}
              {previousHasData
                ? changeNodeOf(summary.change)
                : <span className={trendStyles.muted}>{previousPlaceholder}</span>}
            </span>
          )}
      </div>
      <div id={bodyId} className={trendStyles.body}>
        {expanded && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
