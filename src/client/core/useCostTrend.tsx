/**
 * 上期成本环比：只给「卡片右上角涨跌 + 数值上方上期值」两个数据，不再渲染单独的对比区块。
 *
 * 复用 /usage 按上一段等长范围再请求一次（纯客户端，无新端点）；「累计」范围没有上一段，返回 null。
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loadUsage } from '../core/api.ts'
import { comparableMoneyAmountOf, rowMoneyViewOf } from '../core/currency.ts'
import { isoDate } from '../core/format.ts'
import { t } from '../core/i18n.ts'
import type { Channel, UsageResponse } from '../core/types.ts'

const DAY_MS = 86400000

export interface CostTrend {
  /** 右上角角标：涨跌百分比（中性色 + 箭头） */
  badge: ReactNode
  /** 数值上方：上期金额（缩小淡化） */
  above: ReactNode
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

export function useCostTrend(props: {
  usage: UsageResponse | null
  from: string
  to: string
  range: string
  channelFilter: string
  channels: Channel[]
  pricingRevision: number
}): CostTrend | null {
  const { usage, from, to, channelFilter, channels } = props
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
    if (!comparable || usage === null) return null
    const totals = usage.totals
    if (totals === null) return null
    const previousTotals = previousUsage?.totals ?? null
    const currentAmount = comparableMoneyAmountOf(totals)
    const previousAmount = previousTotals === null ? null : comparableMoneyAmountOf(previousTotals)
    const previousView = previousAmount === null ? null : rowMoneyViewOf({ cost: previousAmount })
    const above = previousAmount === null || previousView === null
      ? undefined
      : <>{t('t.previousShort')}{previousView.text}</>
    if (previousAmount === null || previousAmount === 0) return { badge: <span>{t('t.incomparable')}</span>, above }
    const delta = Math.round((currentAmount - previousAmount) / previousAmount * 1000) / 10
    if (Math.abs(delta) < 0.05) return { badge: <span>{t('t.flat')}</span>, above }
    const arrow = delta > 0 ? '↑' : '↓'
    return { badge: <span>{arrow} {delta > 0 ? '+' : ''}{delta}%</span>, above }
  }, [comparable, usage, previousUsage])
}
