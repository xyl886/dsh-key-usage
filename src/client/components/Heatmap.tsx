/**
 * 年度活跃热力图：53 周滚动窗口（含未来格 ghost 占位）。
 * 强度分档取活跃日的三分位（p33 / p67），并在卡片底部标出实际阈值 ——
 * 固定绝对值在低用量下会全暗、高用量下会全亮，分位数能保证三档都有区分度。
 */
import { useMemo, type ReactNode } from 'react'
import { channelColorOf, displayNameOf } from '../channels.ts'
import { fmtTokens, isoDate } from '../format.ts'
import type { Channel, HeatmapDay } from '../types.ts'
import { TipBar, TipRow, TipSub, TipTitle, type TooltipApi } from '../tooltip.tsx'
import styles from '../styles/overview.module.css'
import shared from '../styles/shared.module.css'

const WEEK_COUNT = 53
const DAY_MS = 86400000

interface HeatCell {
  date: string
  state: 'future' | 'empty' | 'idle' | 'active'
  level: number
}

function levelThresholds(days: HeatmapDay[]): [number, number] {
  const active = days.map((day) => day.totalTokens).filter((tokens) => tokens > 0).sort((first, second) => first - second)
  if (active.length < 3) return [5e7, 2e8]
  const pick = (fraction: number): number => active[Math.min(active.length - 1, Math.floor(active.length * fraction))]
  return [pick(0.33), pick(0.67)]
}

function levelOf(tokens: number, thresholds: [number, number]): number {
  if (tokens <= 0) return 0
  if (tokens < thresholds[0]) return 1
  if (tokens < thresholds[1]) return 2
  return 3
}

const LEVEL_COLORS = ['rgba(128,128,140,.22)', 'rgba(91,140,255,.25)', 'rgba(91,140,255,.55)', '#5b8cff']

export function Heatmap(props: { days: HeatmapDay[]; channels: Channel[]; tooltip: TooltipApi }): ReactNode {
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
      labels.push(month !== previousMonth ? month + '月' : '')
      previousMonth = month
    }
    return { columns: weeks, monthLabels: labels }
  }, [days, heatmapByDate])

  return (
    <div className={styles.heatmapCard}>
      <div className={styles.heatmapHead}>
        <span className={styles.heatmapTitle}>活跃热力图 · 按当日 Tokens 总量 · 悬停查看当日各模型占比</span>
        <span className={shared.legend}>
          <span><i className="ghost" />无数据</span>
          <span><i style={{ background: LEVEL_COLORS[0] }} />无用量</span>
          <span><i style={{ background: LEVEL_COLORS[1] }} />少</span>
          <span><i style={{ background: LEVEL_COLORS[2] }} />中</span>
          <span><i style={{ background: LEVEL_COLORS[3] }} />高</span>
        </span>
      </div>
      <div className={styles.heatmapWrap}>
        <div className={styles.heatWeekdays}>
          <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
        </div>
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
      </div>
      <div className={styles.heatMonths}>
        {monthLabels.map((label, index) => <span key={index}>{label}</span>)}
      </div>
      <div className={styles.heatScale}>
        分档按活跃日三分位：少 &lt; {fmtTokens(thresholds[0])} · 中 &lt; {fmtTokens(thresholds[1])} · 高 ≥ {fmtTokens(thresholds[1])}
      </div>
    </div>
  )
}

function tipOf(cell: HeatCell, day: HeatmapDay | undefined, channels: Channel[]): ReactNode {
  if (cell.state !== 'active' || day === undefined) {
    return (
      <>
        <TipTitle>{cell.date}</TipTitle>
        <TipSub>{cell.state === 'idle' ? '当日无用量记录' : '台账尚未覆盖'}</TipSub>
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
