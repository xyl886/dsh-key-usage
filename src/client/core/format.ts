import { t } from './i18n.ts'
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

/** 空格千分位：不用 toLocaleString（结果跟随浏览器区域设置，导出与截图会不一致）。 */
export function fmtCount(count: number): string {
  if (!Number.isFinite(count)) return '—'
  return String(Math.round(count)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** 大数按 B / M / K 缩写；四舍五入到 1000 就降级显示（999 999 显示 999 999，不显示 1000K）。 */
export function fmtTokens(count: number): string {
  if (!Number.isFinite(count)) return '—'
  const units: Array<[number, string]> = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]
  for (const [base, suffix] of units) {
    if (Math.abs(count) < base) continue
    const value = count / base
    const text = value.toFixed(Math.abs(value) >= 100 ? 0 : 1)
    if (Number(text) < 1000) return text + suffix
  }
  return fmtCount(count)
}

export function fmtCalls(count: number): string {
  return fmtCount(count)
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
  const hours = Math.floor(minutes / 60)
  // 跨天会话（例如 243h）显示成「10 天 3h」，否则一列都读不出量级
  if (hours >= 24) return t('fmt.dayHour', { days: Math.floor(hours / 24), hours: hours % 24 })
  return `${hours}h ${minutes % 60}m`
}

/** 最近活跃：确定性的本地时间（今天给 HH:mm，更早给 MM-DD HH:mm）—— 相对时间词（刚刚 / N 分钟前）用户明确不要。 */
export function fmtRelative(timeMs: number | null, nowMs: number): string {
  if (timeMs === null) return '—'
  const time = new Date(timeMs)
  const pad = (value: number): string => String(value).padStart(2, '0')
  const clock = pad(time.getHours()) + ':' + pad(time.getMinutes())
  const now = new Date(nowMs)
  const sameDay = time.getFullYear() === now.getFullYear() && time.getMonth() === now.getMonth() && time.getDate() === now.getDate()
  return sameDay ? clock : pad(time.getMonth() + 1) + '-' + pad(time.getDate()) + ' ' + clock
}

/** 命中率：一位小数百分数，无提示侧 token 时返回 —。 */
export function fmtHitRate(cacheReadTokens: number, promptTokens: number): string {
  if (promptTokens <= 0) return '—'
  return (cacheReadTokens / promptTokens * 100).toFixed(1) + '%'
}
