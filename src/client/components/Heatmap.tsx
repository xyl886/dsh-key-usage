/**
 * 全年热力图：53 个 ISO 周（周一起）× 7 天，正方形格子；横轴只在每月首次出现的列标月份，
 * 放不下就跳过该月（列位统一用 grid-column / grid-row 精确定位，不靠 margin / 绝对偏移）。
 * 强度值由调用方给（同一套分档吃任意量纲），本组件只管排格、上色与悬停；点击某天交给调用方。
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { isoDate } from '../core/format.ts'
import { useT } from '../core/i18n.ts'
import { buildMonthAxis } from '../core/heatmap-axis.ts'
import type { TooltipApi } from '../core/tooltip.tsx'
import styles from '../styles/overview.module.css'

const WEEK_COUNT = 53
const DAYS_PER_WEEK = 7
/** 周几标签列宽 / 格子列间距 / 横轴字号：与 overview.module.css 的 .yearWrap、.yearAxisLabel 一致。 */
const WEEKDAY_COLUMN_PX = 18
const COLUMN_GAP_PX = 3
const AXIS_FONT_SIZE_PX = 12
const LABEL_MIN_GAP_PX = 4
/** 首帧还没量到面板宽度时的兜底列宽：按窄面板估，宁可少标也不叠字。 */
const FALLBACK_COLUMN_WIDTH_PX = 8
/** 周一到周日的标签键（`h.wd0` 是周日）。 */
const WEEKDAY_KEYS = ['h.wd1', 'h.wd2', 'h.wd3', 'h.wd4', 'h.wd5', 'h.wd6', 'h.wd0']

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

/** 本地日历加法：不用毫秒，夏令时那天也不会把日期推歪。 */
function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
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
  // 末列收在本周周日、首列起于 52 周前的周一：53 列 × 7 天正好盖住一年
  const end = addDays(today, DAYS_PER_WEEK - isoWeekdayOf(today))
  const windowStart = addDays(end, -(WEEK_COUNT * DAYS_PER_WEEK - 1))

  const weekDates: string[][] = []
  const columns: HeatCell[][] = []
  for (let columnIndex = 0; columnIndex < WEEK_COUNT; columnIndex += 1) {
    const dates: string[] = []
    const cells: HeatCell[] = []
    for (let weekdayIndex = 0; weekdayIndex < DAYS_PER_WEEK; weekdayIndex += 1) {
      const dateKey = isoDate(addDays(windowStart, columnIndex * DAYS_PER_WEEK + weekdayIndex))
      const value = props.valuesByDate.get(dateKey) ?? 0
      const state: CellState = dateKey > todayKey
        ? 'future'
        : props.dataStart !== null && dateKey < props.dataStart
          ? 'empty'
          : value > 0 ? 'active' : 'idle'
      dates.push(dateKey)
      cells.push({ date: dateKey, state, level: state === 'active' ? levelOfValue(value, thresholds) : 0 })
    }
    weekDates.push(dates)
    columns.push(cells)
  }

  // 列宽决定标签放不放得下：量一次面板宽度，窄面板自动少标几个月
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapWidth, setWrapWidth] = useState(0)
  useLayoutEffect(() => {
    const element = wrapRef.current
    if (element === null) return
    const measure = (): void => setWrapWidth(element.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const columnWidthPx = wrapWidth > 0
    ? Math.max(1, (wrapWidth - WEEKDAY_COLUMN_PX - WEEK_COUNT * COLUMN_GAP_PX) / WEEK_COUNT)
    : FALLBACK_COLUMN_WIDTH_PX
  /** 行距放不下 12px 字时只标隔行（一 / 三 / 五 / 日），免得周几标签上下叠字。 */
  const weekdayLabelEvery = Math.max(1, Math.ceil(AXIS_FONT_SIZE_PX / (columnWidthPx + COLUMN_GAP_PX)))
  const monthAxis = buildMonthAxis({
    weekDates,
    columnWidthPx,
    columnGapPx: COLUMN_GAP_PX,
    fontSizePx: AXIS_FONT_SIZE_PX,
    minGapPx: LABEL_MIN_GAP_PX,
    labelOf: (month, includeYear, year) => includeYear
      ? t('overview.monthLabelYear', { year, month })
      : t('overview.monthLabel', { month }),
  })

  return (
    <div className={styles.yearWrap} role="group" aria-label={props.ariaLabel} ref={wrapRef}>
      {WEEKDAY_KEYS.map((key, weekdayIndex) => (
        <span
          key={key}
          className={styles.yearWeekday}
          style={{ gridColumn: 1, gridRow: weekdayIndex + 2 }}
        >{weekdayIndex % weekdayLabelEvery === 0 ? t(key) : ''}</span>
      ))}
      {monthAxis.map((mark) => (
        <span
          key={mark.column + '-' + mark.month}
          className={styles.yearAxisLabel}
          style={{ gridColumn: mark.column + 2, gridRow: 1 }}
        >{mark.label}</span>
      ))}
      {columns.map((week, columnIndex) => week.map((cell, weekdayIndex) => (
        <div
          key={cell.date}
          className={[
            styles.yearCell,
            cell.state === 'active' ? styles.yearActive : '',
            cell.state === 'empty' ? styles.yearEmpty : '',
            cell.state === 'future' ? styles.yearFuture : '',
          ].join(' ').trim()}
          style={{
            gridColumn: columnIndex + 2,
            gridRow: weekdayIndex + 2,
            ...(cell.state === 'active' ? { background: levelColorOf(cell.level) } : {}),
          }}
          onMouseMove={(event) => props.tooltip.show(event, props.tipOf(cell.date))}
          onMouseLeave={props.tooltip.hide}
          onClick={cell.state === 'active' ? () => props.onPickDay?.(cell.date) : undefined}
        />
      )))}
    </div>
  )
}
