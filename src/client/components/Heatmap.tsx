/**
 * 活跃热力图：约 9 个月的滚动窗口，强度按活跃日五分位分档（阈值随可见区间变化）。
 * 格子固定方形 + 横向滚动，保证三类格子（有数据 / 无数据 / 无用量）等大。
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { channelColorOf, displayNameOf } from '../channels.ts'
import { fmtTokens, isoDate } from '../format.ts'
import type { Channel, HeatmapDay } from '../types.ts'
import { TipBar, TipRow, TipSub, TipTitle, type TooltipApi } from '../tooltip.tsx'
import styles from '../styles/overview.module.css'
import shared from '../styles/shared.module.css'
import { t, useT } from '../i18n.ts'

/** 9 个月 ≈ 39 周；配合 18px 方形格子，窄窗口下横向滚动。 */
const WEEK_COUNT = 39
const DAY_MS = 86400000

interface HeatCell {
  date: string
  state: 'future' | 'empty' | 'idle' | 'active'
  level: number
}

function levelThresholds(days: HeatmapDay[]): number[] {
  const active = days.map((day) => day.totalTokens).filter((tokens) => tokens > 0).sort((first, second) => first - second)
  if (active.length < 5) return [1e7, 3e7, 6e7, 1.5e8]
  const pick = (fraction: number): number => active[Math.min(active.length - 1, Math.floor(active.length * fraction))]
  return [pick(0.2), pick(0.4), pick(0.6), pick(0.8)]
}

function levelOf(tokens: number, thresholds: number[]): number {
  if (tokens <= 0) return 0
  let level = 1
  for (const threshold of thresholds) {
    if (tokens >= threshold) level += 1
  }
  return level
}

/** 五档由浅到深（首档为「无用量」的灰）。 */
const LEVEL_COLORS = [
  'var(--dsw-alias-fill-l2, rgba(128,128,140,.22))',
  'var(--dsw-alias-state-business-tertiary, rgba(91,140,255,.24))',
  'var(--dsw-alias-state-business-secondary, rgba(91,140,255,.42))',
  'var(--dsw-alias-state-business-primary, rgba(91,140,255,.66))',
  'var(--dsw-alias-state-business-primary, rgba(91,140,255,.85))',
  'var(--dsw-alias-state-business-primary, #5b8cff)',
]

export function Heatmap(props: { days: HeatmapDay[]; channels: Channel[]; tooltip: TooltipApi }): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const { days, channels, tooltip } = props
  const heatmapByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days])
  const thresholds = useMemo(() => levelThresholds(days), [days])

  const { columns, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endSaturday = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS)
    const start = new Date(endSaturday.getTime() - (WEEK_COUNT * 7 - 1) * DAY_MS)
    const dataStart = days.length > 0 ? days[0].date : null
    const cells: HeatCell[] = []
    for (let offset = 0; offset < WEEK_COUNT * 7; offset += 1) {
      const date = new Date(start.getTime() + offset * DAY_MS)
      const dateKey = isoDate(date)
      if (date.getTime() > today.getTime()) {
        cells.push({ date: dateKey, state: 'future', level: 0 })
        continue
      }
      // 台账覆盖之前的日子用 ghost 占位，与「无用量」的灰区分开
      if (dataStart === null || dateKey < dataStart) {
        cells.push({ date: dateKey, state: 'empty', level: 0 })
        continue
      }
      const day = heatmapByDate.get(dateKey)
      if (day === undefined || day.totalTokens <= 0) {
        cells.push({ date: dateKey, state: 'idle', level: 0 })
        continue
      }
      cells.push({ date: dateKey, state: 'active', level: levelOf(day.totalTokens, thresholds) })
    }
    const weeks: HeatCell[][] = []
    for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
    const labels: string[] = []
    let previousMonth = -1
    for (const week of weeks) {
      const month = Number(week[0].date.slice(5, 7))
      labels.push(month !== previousMonth ? month + t('h.month') : '')
      previousMonth = month
    }
    return { columns: weeks, monthLabels: labels }
  }, [days, heatmapByDate])

  // aria-label 的活跃日数只数画在图上的格子：接口给的 days 最多覆盖 364 天，
  // 而图只画 39 周，直接数 days 会把更早的日子算进去，和「近 9 个月」的说法对不上。
  const activeDays = columns.reduce((count, week) => count + week.filter((cell) => cell.state === 'active').length, 0)

  // 默认贴最右侧：右边是最新的日期，左边是 9 个月前的历史（每次筛选都跳回去反而烦人，所以只在挂载时定位一次）
  const scrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const node = scrollRef.current
    if (node === null) return
    node.scrollLeft = node.scrollWidth - node.clientWidth
  }, [])

  return (
    <div
      className={styles.heatmapCard}
      role="img"
      aria-label={
        t('h.summaryPrefix') + String(activeDays) + String(activeDays) + t('h.summarySuffix')
        + ''
      }
    >
      <div className={styles.heatmapHead}>
        <span className={styles.heatmapTitle}>活跃热力图 · 近 9 个月 · 按当日 Tokens 总量 · 悬停查看当日各模型占比</span>
        <span className={shared.legend}>
          <span><i className={styles.ghost} />无数据</span>
          <span><i style={{ background: LEVEL_COLORS[0] }} />无用量</span>
          <span><i style={{ background: LEVEL_COLORS[1] }} />少</span>
          <span><i style={{ background: LEVEL_COLORS[2] }} />较少</span>
          <span><i style={{ background: LEVEL_COLORS[3] }} />中</span>
          <span><i style={{ background: LEVEL_COLORS[4] }} />较多</span>
          <span><i style={{ background: LEVEL_COLORS[5] }} />多</span>
        </span>
      </div>
      <div className={styles.heatmapScroll} ref={scrollRef}>
        <div className={styles.heatmapBody}>
          <div className={styles.heatWeekdays}>
            <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
          </div>
          <div className={styles.heatGridCol}>
            <div className={styles.heatGrid}>
              {columns.map((week, weekIndex) => (
                <div className={styles.heatWeek} key={weekIndex}>
                  {week.map((cell) => {
                    const day = cell.state === 'active' ? heatmapByDate.get(cell.date) : undefined
                    const className = cell.state === 'active'
                      ? styles.heatCell
                      : cell.state === 'idle' ? styles.heatCell + ' ' + styles.idle : styles.heatCell + ' ' + styles.empty
                    return (
                      <div
                        key={cell.date}
                        className={className}
                        style={cell.state === 'active' ? { background: LEVEL_COLORS[cell.level] } : undefined}
                        onMouseMove={(event) => tooltip.show(event, tipOf(cell, day, channels))}
                        onMouseLeave={tooltip.hide}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
            <div className={styles.heatMonths}>
              {monthLabels.map((label, index) => <span key={index}>{label}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function tipOf(cell: HeatCell, day: HeatmapDay | undefined, channels: Channel[]): ReactNode {
  if (cell.state !== 'active' || day === undefined) {
    return (
      <>
        <TipTitle>{cell.date}</TipTitle>
        <TipSub>{cell.state === 'idle' ? t('h.noUsage') : t('h.noLedger')}</TipSub>
      </>
    )
  }
  return (
    <>
      <TipTitle>{cell.date}</TipTitle>
      <TipSub>合计 <b>{fmtTokens(day.totalTokens)}</b> tokens</TipSub>
      {day.models.map((model) => {
        const percent = day.totalTokens > 0 ? Math.round(model.totalTokens / day.totalTokens * 100) : 0
        const color = channelColorOf(channels, model.provider)
        return (
          <div key={model.provider + '|' + model.model}>
            <TipRow
              color={color}
              label={<>{model.model}<span className={shared.dim}> · {displayNameOf(channels, model.provider)}</span></>}
              amount={fmtTokens(model.totalTokens)}
              rate={percent + '%'}
            />
            <TipBar percent={percent} color={color} />
          </div>
        )
      })}
    </>
  )
}
