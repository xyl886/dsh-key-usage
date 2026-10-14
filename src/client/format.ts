/** 展示层格式化：全部与统计口径无关，只负责把数字变成界面文本。 */

/** 本地日历 `YYYY-MM-DD`。 */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function shiftedIsoDate(offsetDays: number): string {
  return isoDate(new Date(Date.now() + offsetDays * 86400000))
}

export function fmtTokens(count: number): string {
  if (count >= 1e9) return (count / 1e9).toFixed(2) + 'B'
  if (count >= 1e6) return (count / 1e6).toFixed(1) + 'M'
  if (count >= 1e3) return (count / 1e3).toFixed(0) + 'K'
  return String(count)
}

export function fmtCalls(count: number): string {
  return count.toLocaleString('en-US').replace(/,/g, ' ')
}

/** `MM-DD`（图表坐标轴与范围文案用）。 */
export function fmtShortDate(dateKey: string): string {
  return dateKey.slice(5)
}

/** 毫秒时间戳 → `YYYY-MM-DD HH:mm`（本地时区）。 */
export function fmtDateTime(timeMs: number | null): string {
  if (timeMs === null) return '—'
  const date = new Date(timeMs)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${isoDate(date)} ${hours}:${minutes}`
}

/** 毫秒时间戳 → `HH:mm`。 */
export function fmtTime(timeMs: number | null): string {
  if (timeMs === null) return '—'
  const date = new Date(timeMs)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** ISO 时间戳 → 本地 `YYYY-MM-DD HH:mm`；解析不出来返回 null（ISO 之外的写法一律不猜）。 */
export function localTimeTextOf(timestamp: unknown): string | null {
  if (typeof timestamp !== 'string' || timestamp.trim() === '') return null
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return null
  return fmtDateTime(parsed.getTime())
}

/** 时长（毫秒）→ `2h 15m` / `43m` / `—`。 */
export function fmtDuration(milliseconds: number | null): string {
  if (milliseconds === null || milliseconds <= 0) return '—'
  const minutes = Math.max(1, Math.round(milliseconds / 60000))
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** 最近活跃：刚刚 / N 分钟前 / N 小时前 / N 天前。 */
export function fmtRelative(timeMs: number | null, nowMs: number): string {
  if (timeMs === null) return '—'
  const minutes = Math.round((nowMs - timeMs) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} 小时前`
  return `${Math.round(minutes / (60 * 24))} 天前`
}

/** 命中率：一位小数百分数，无提示侧 token 时返回 —。 */
export function fmtHitRate(cacheReadTokens: number, promptTokens: number): string {
  if (promptTokens <= 0) return '—'
  return (cacheReadTokens / promptTokens * 100).toFixed(1) + '%'
}
