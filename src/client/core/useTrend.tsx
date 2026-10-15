/**
 * 统计卡的上期对比：每张卡右上角给涨跌角标、数值上方给上期值（缩小淡化）。
 *
 * 复用 /usage 按上一段等长范围再请求一次（纯客户端，无新端点）；「累计」范围没有上一段，整组返回 null。
 * 涨跌只用中性色 + 箭头（成本上升沿用提示色），不引入对错语义。
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loadUsage } from '../core/api.ts'
import { comparableMoneyAmountOf, rowMoneyViewOf } from '../core/currency.ts'
import { fmtCalls, fmtTokens, isoDate } from '../core/format.ts'
import { t } from '../core/i18n.ts'
import type { Channel, UsageResponse } from '../core/types.ts'
import styles from '../styles/shared.module.css'

const DAY_MS = 86400000
/** 小于这个幅度算持平（百分比 / 百分点通用）。 */
const FLAT_EPSILON = 0.05

export interface TrendMetric {
  /** 数值上方：上期值（缩小淡化） */
  above: ReactNode
  /** 右上角：涨跌角标 */
  badge: ReactNode
}

export type TrendMap = Record<
  'calls' | 'tokens' | 'input' | 'output' | 'cacheRead' | 'hitRate' | 'dailyAvg' | 'channels' | 'activeDays' | 'cost',
  TrendMetric
>

interface Metrics {
  calls: number
  tokens: number
  input: number
  output: number
  cacheRead: number
  /** 0~1；没有 tokens 时为 null */
  hitRate: number | null
  dailyAvg: number
  channels: number
  activeDays: number
  cost: number
}

/** 闭区间天数，至少 1。 */
function spanDaysOf(from: string, to: string): number {
  return Math.max(1, Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / DAY_MS) + 1)
}

/** 上一段等长范围（10-07~10-13 → 09-30~10-06）。 */
function previousWindowOf(from: string, to: string): { from: string; to: string } {
  const startTime = new Date(from + 'T00:00:00').getTime()
  return { from: isoDate(new Date(startTime - spanDaysOf(from, to) * DAY_MS)), to: isoDate(new Date(startTime - DAY_MS)) }
}

function metricsOf(usage: UsageResponse | null): Metrics | null {
  if (usage === null) return null
  let calls = 0
  let input = 0
  let output = 0
  let cacheRead = 0
  let activeDays = 0
  const channels = new Set<string>()
  for (const day of usage.days) {
    const dayTokens = day.inputTokens + day.outputTokens + day.cacheReadTokens
    calls += day.calls
    input += day.inputTokens
    output += day.outputTokens
    cacheRead += day.cacheReadTokens
    if (dayTokens > 0) activeDays += 1
    for (const model of day.models) {
      if (model.inputTokens + model.outputTokens + model.cacheReadTokens > 0) channels.add(model.provider)
    }
  }
  const tokens = input + output + cacheRead
  return {
    calls,
    tokens,
    input,
    output,
    cacheRead,
    hitRate: tokens === 0 ? null : cacheRead / tokens,
    dailyAvg: activeDays === 0 ? 0 : tokens / activeDays,
    channels: channels.size,
    activeDays,
    cost: usage.totals === null ? 0 : comparableMoneyAmountOf(usage.totals),
  }
}

/** 百分比涨跌角标。 */
function percentBadge(current: number, previous: number, warnOnUp: boolean): ReactNode {
  if (previous === 0) return <span>{t('t.incomparable')}</span>
  const delta = Math.round((current - previous) / previous * 1000) / 10
  if (Math.abs(delta) < FLAT_EPSILON) return <span>{t('t.flat')}</span>
  const arrow = delta > 0 ? '↑' : '↓'
  const sign = delta > 0 ? '+' : ''
  return <span className={warnOnUp && delta > 0 ? styles.badgeWarn : undefined}>{arrow} {sign}{delta}%</span>
}

/** 百分点变化角标（命中率这类比率指标）。 */
function pointBadge(current: number | null, previous: number | null): ReactNode {
  if (current === null || previous === null) return <span>{t('t.incomparable')}</span>
  const delta = Math.round((current - previous) * 1000) / 10
  if (Math.abs(delta) < FLAT_EPSILON) return <span>{t('t.flat')}</span>
  const arrow = delta > 0 ? '↑' : '↓'
  const sign = delta > 0 ? '+' : ''
  // 命中率是比值，涨跌按百分点（pp）计，避免「96.2% 比 94.0% 涨 2.3%」这类误读（沿用旧 TrendPanel 的写法）
  return <span>{arrow} {sign}{delta}pp</span>
}

export function useTrend(props: {
  usage: UsageResponse | null
  from: string
  to: string
  range: string
  channelFilter: string
  channels: Channel[]
  pricingRevision: number
}): TrendMap | null {
  const { usage, from, to, channelFilter } = props
  const previousWindow = useMemo(() => previousWindowOf(from, to), [from, to])
  const comparable = props.range !== 'total'
  const [previousUsage, setPreviousUsage] = useState<UsageResponse | null>(null)

  useEffect(() => {
    if (!comparable) return
    let cancelled = false
    void loadUsage(previousWindow.from, previousWindow.to, channelFilter).then((result) => {
      if (!cancelled) setPreviousUsage(result)
    })
    return () => { cancelled = true }
  }, [comparable, previousWindow.from, previousWindow.to, channelFilter, props.pricingRevision])

  return useMemo(() => {
    if (!comparable) return null
    const current = metricsOf(usage)
    const previous = metricsOf(previousUsage)
    if (current === null) return null
    const aboveOf = (node: ReactNode): ReactNode => previous === null ? undefined : node
    const points = (value: number | null): string => value === null ? '—' : (value * 100).toFixed(1) + '%'
    return {
      calls: { above: aboveOf(previous === null ? '—' : fmtCalls(previous.calls)), badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.calls, previous.calls, false) },
      tokens: { above: aboveOf(previous === null ? '—' : fmtTokens(previous.tokens)), badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.tokens, previous.tokens, false) },
      input: { above: aboveOf(previous === null ? '—' : fmtTokens(previous.input)), badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.input, previous.input, false) },
      output: { above: aboveOf(previous === null ? '—' : fmtTokens(previous.output)), badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.output, previous.output, false) },
      cacheRead: { above: aboveOf(previous === null ? '—' : fmtTokens(previous.cacheRead)), badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.cacheRead, previous.cacheRead, false) },
      hitRate: { above: aboveOf(points(previous === null ? null : previous.hitRate)), badge: pointBadge(current.hitRate, previous === null ? null : previous.hitRate) },
      dailyAvg: { above: aboveOf(previous === null ? '—' : fmtTokens(Math.round(previous.dailyAvg))), badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.dailyAvg, previous.dailyAvg, false) },
      channels: { above: aboveOf(previous === null ? '—' : String(previous.channels)), badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.channels, previous.channels, false) },
      activeDays: { above: aboveOf(previous === null ? '—' : String(previous.activeDays)), badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.activeDays, previous.activeDays, false) },
      cost: {
        above: aboveOf(previous === null ? '—' : rowMoneyViewOf({ cost: previous.cost }).text),
        badge: previous === null ? <span>{t('t.incomparable')}</span> : percentBadge(current.cost, previous.cost, true),
      },
    }
  }, [comparable, usage, previousUsage])
}
