/** 日期区间纯函数：明细表的横轴、环期窗口与按天遍历。 */
import { isoDate } from './format.ts'

export const DAY_MS = 86400000

/** 横轴最多画多少天（超长范围只画最近这一段）。 */
const MAX_AXIS_DAYS = 366
export function daysBetween(from: string, to: string): number {
  const fromTime = new Date(from + 'T00:00:00').getTime()
  const toTime = new Date(to + 'T00:00:00').getTime()
  return Math.max(1, Math.round((toTime - fromTime) / DAY_MS) + 1)
}

/** 范围内每一天的日期键（无数据的日子也要出现在横轴上，空档才看得出来）；超长范围只画最近的那些天。 */
export function dateKeysOfRange(from: string, to: string): string[] {
  const end = new Date(to + 'T00:00:00').getTime()
  const total = Math.min(daysBetween(from, to), MAX_AXIS_DAYS)
  const start = end - (total - 1) * DAY_MS
  const keys: string[] = []
  for (let offset = 0; offset < total; offset += 1) keys.push(isoDate(new Date(start + offset * DAY_MS)))
  return keys
}

/** 前一个日历日。 */
export function previousDateOf(date: string): string {
  return isoDate(new Date(new Date(date + 'T00:00:00').getTime() - DAY_MS))
}

/** 上一段等长范围（10-07~10-13 → 09-30~10-06）。 */
export function previousWindowOf(from: string, to: string): { from: string; to: string } {
  const startTime = new Date(from + 'T00:00:00').getTime()
  const span = Math.min(daysBetween(from, to), MAX_AXIS_DAYS)
  return { from: isoDate(new Date(startTime - span * DAY_MS)), to: isoDate(new Date(startTime - DAY_MS)) }
}

/**
 * 合计行的上一期：与统计卡同一口径（按上一段等长范围再取一次 `/usage`，纯客户端，无新端点）。
 * 通道 / 模型筛选都在客户端做，所以这里固定取全量（传 `'ALL'`），否则环比会拿「过滤后本期」比「全量上期」。
 * 只用于算一个百分比，取不到就保持 null（界面显示 —），不影响表格本身。
 */
