/**
 * 全年热力图：53 周 × 7 天，正方形格子（aspect-ratio: 1/1），横轴按月标注（跨年那格标「2027年1月」）。
 * 强度值由调用方给（同一套分档吃任意量纲），本组件只管排格、上色与悬停；点击某天交给调用方。
 */
import type { ReactNode } from 'react'
import { isoDate } from '../core/format.ts'
import type { TooltipApi } from '../core/tooltip.tsx'
import styles from '../styles/overview.module.css'
import { t, useT } from '../core/i18n.ts'

const WEEK_COUNT = 53
const DAY_MS = 86400000

type CellState = 'future' | 'empty' | 'idle' | 'active'

interface HeatCell {
  date: string
  state: CellState
  /** 1..5；非活跃格恒为 0 */
  level: number
}

/**
 * 五档色阶（浅 → 深）。用 color-mix 按比例混出深浅：直接写实心色会让后三档变成同一个颜色，
 * 层次看不出来；兜底值给 rgba，color-mix 不可用时仍能显示。
 */
export const LEVEL_COLORS: string[] = [
  'color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 18%, transparent)',
  'color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 36%, transparent)',
  'color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 56%, transparent)',
  'color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 76%, transparent)',
  'var(--dsw-alias-state-business-primary, #5b8cff)',
]

/** 档位颜色；0 = 无用量，返回 undefined 由样式表给底色。 */
export function levelColorOf(level: number): string | undefined {
  if (level < 1 || level > LEVEL_COLORS.length) return undefined
  return LEVEL_COLORS[level - 1]
}

/** 分档阈值：样本足够按分位，否则按峰值固定比例 —— 任何量纲（tokens / 次数 / 金额）都适用。 */
export function levelThresholds(values: number[]): number[] {
  const active = values.filter((value) => Number.isFinite(value) && value > 0).sort((first, second) => first - second)
  if (active.length === 0) return [1, 2, 3, 4]
  const peak = active[active.length - 1]
  if (active.length < 5) return [0.2, 0.4, 0.6, 0.8].map((fraction) => Math.max(peak * fraction, Number.EPSILON))
  const pick = (fraction: number): number => active[Math.min(active.length - 1, Math.floor(active.length * fraction))]
  return [pick(0.2), pick(0.4), pick(0.6), pick(0.8)]
}

/** 值 → 档位（0 = 无用量，1..5 = 五档由浅到深）。 */
export function levelOfValue(value: number, thresholds: number[]): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  let level = 1
  for (const threshold of thresholds) {
    if (value >= threshold) level += 1
  }
  return Math.min(level, LEVEL_COLORS.length)
}

/** 周一 = 1 … 周日 = 7（JS `getDay()` 是周日 = 0）。 */
function isoWeekdayOf(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1
}

function monthLabelOf(date: Date): string {
  const month = date.getMonth() + 1
  return date.getMonth() === 0
    ? t('overview.monthLabelYear', { year: date.getFullYear(), month })
    : t('overview.monthLabel', { month })
}

export interface YearHeatmapProps {
  /** 日期 → 强度值；缺省 = 当天无用量 */
  valuesByDate: Map<string, number>
  /** 台账覆盖的第一天；更早的格子画成「未覆盖」而不是「无用量」 */
  dataStart: string | null
  tooltip: TooltipApi
  /** 悬停提示内容（日期由调用方决定怎么讲） */
  tipOf: (date: string) => ReactNode
  onPickDay?: (date: string) => void
  ariaLabel: string
}

export function YearHeatmap(props: YearHeatmapProps): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const thresholds = levelThresholds([...props.valuesByDate.values()])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = isoDate(today)
  // 末列收在本周周日、首列起于 52 周前的周一：53 列正好一年，格子按周对齐
  const end = new Date(today.getTime() + (7 - isoWeekdayOf(today)) * DAY_MS)
  const start = new Date(end.getTime() - (WEEK_COUNT * 7 - 1) * DAY_MS)

  const columns: HeatCell[][] = []
  const monthMarks: Array<{ column: number; label: string }> = []
  let previousMonth = ''
  for (let offset = 0; offset < WEEK_COUNT * 7; offset += 1) {
    const date = new Date(start.getTime() + offset * DAY_MS)
    const dateKey = isoDate(date)
    const monthKey = dateKey.slice(0, 7)
    if (monthKey !== previousMonth) {
      monthMarks.push({ column: Math.floor(offset / 7), label: monthLabelOf(date) })
      previousMonth = monthKey
    }
    const value = props.valuesByDate.get(dateKey) ?? 0
    const state: CellState = dateKey > todayKey
      ? 'future'
      : props.dataStart !== null && dateKey < props.dataStart
        ? 'empty'
        : value > 0 ? 'active' : 'idle'
    const column = Math.floor(offset / 7)
    if (columns[column] === undefined) columns[column] = []
    columns[column].push({ date: dateKey, state, level: state === 'active' ? levelOfValue(value, thresholds) : 0 })
  }

  return (
    <div className={styles.yearWrap} role="group" aria-label={props.ariaLabel}>
      <div className={styles.yearWeekdays}>
        {[t('h.wd1'), t('h.wd2'), t('h.wd3'), t('h.wd4'), t('h.wd5'), t('h.wd6'), t('h.wd0')].map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <div className={styles.yearAxis}>
        {monthMarks.map((mark) => (
          <span key={mark.column + '-' + mark.label} style={{ gridColumn: String(mark.column + 1) }}>{mark.label}</span>
        ))}
      </div>
      <div className={styles.yearGrid}>
        {columns.map((week) => week.map((cell) => (
          <div
            key={cell.date}
            className={[
              styles.yearCell,
              cell.state === 'active' ? styles.yearActive : '',
              cell.state === 'empty' ? styles.yearEmpty : '',
              cell.state === 'future' ? styles.yearFuture : '',
            ].join(' ').trim()}
            style={cell.state === 'active' ? { background: levelColorOf(cell.level) } : undefined}
            onMouseMove={(event) => props.tooltip.show(event, props.tipOf(cell.date))}
            onMouseLeave={props.tooltip.hide}
            onClick={cell.state === 'active' ? () => props.onPickDay?.(cell.date) : undefined}
          />
        )))}
      </div>
    </div>
  )
}
