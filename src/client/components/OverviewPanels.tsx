/**
 * 概览的两个大件：趋势柱（只有高度与日期）与排行面板（横条 + 「还有 M 个」弹窗）。
 * 数据拼装留在 OverviewTab，这里只管渲染与交互。
 */
import { useState, type ReactNode } from 'react'
import { useT } from '../core/i18n.ts'
import { fmtShortDate } from '../core/format.ts'
import { Dialog } from './ui/Dialog.tsx'
import type { TooltipApi } from '../core/tooltip.tsx'
import shared from '../styles/shared.module.css'
import styles from '../styles/overview.module.css'

const RANK_ROWS = 5

/** 柱状图横轴最多标注几个日期。 */
const BAR_TICKS = 8

export interface TrendDay {
  date: string
  tokens: number
  /** 调用次数；没有按天明细时为 null */
  calls: number | null
  outTokens: number | null
  cacheRead: number | null
  cost: number | null
  /** 当天有活动的会话数；会话段缺失时为 null（趋势「会话」档给空态而不是 0） */
  sessions?: number | null
}

export function TrendBars(props: {
  days: TrendDay[]
  values: Array<number | null>
  tooltip: TooltipApi
  tipOf: (date: string, value: number | null) => ReactNode
}): ReactNode {
  const peak = Math.max(0, ...props.values.filter((value): value is number => value !== null))
  const peakIndex = props.values.findIndex((value) => value !== null && value === peak && peak > 0)
  const ticks = tickIndexesOf(props.days.length, BAR_TICKS)
  return (
    <div>
      <div className={styles.hist}>
        {props.days.map((day, index) => {
          const value = props.values[index] ?? null
          const percent = value === null || peak <= 0 ? 0 : Math.max(2, value / peak * 100)
          return (
            <div
              key={day.date}
              className={styles.histColumn}
              onMouseMove={(event) => props.tooltip.show(event, props.tipOf(day.date, value))}
              onMouseLeave={props.tooltip.hide}
            >
              <div
                className={index === peakIndex ? styles.histBar + ' ' + styles.histBarPeak : styles.histBar}
                style={{ height: percent + '%' }}
              />
            </div>
          )
        })}
      </div>
      <div className={styles.histLabels}>
        {ticks.map((index) => <span key={props.days[index].date}>{fmtShortDate(props.days[index].date)}</span>)}
      </div>
    </div>
  )
}

/** 排行面板：横条 + 右侧数值；行数超出「还有 M 个」。 */
export function RankPanel<Key extends string>(props: {
  title: string
  metrics: Array<[Key, string]>
  active: Key
  onActive: (key: Key) => void
  items: RankItem[]
  total: number
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const [showAll, setShowAll] = useState(false)
  /** 弹窗里的排序方向：默认降序，再点一次改升序。 */
  const [ascending, setAscending] = useState(false)
  const shown = props.items.slice(0, RANK_ROWS)
  const peak = shown.reduce((maximum, item) => (item.value !== null && item.value > maximum ? item.value : maximum), 0)
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <b className={styles.panelTitle}>{props.title}</b>
        <div className={styles.metricTabs}>
          {props.metrics.map(([metric, labelKey]) => (
            <button
              key={metric}
              type="button"
              className={metric === props.active ? styles.metricTab + ' ' + styles.metricTabOn : styles.metricTab}
              aria-pressed={metric === props.active}
              onClick={() => props.onActive(metric)}
            >{t(labelKey)}</button>
          ))}
        </div>
        {props.total > shown.length && (
          <button
            type="button"
            className={styles.panelMore}
            onClick={() => setShowAll(true)}
            title={t('overview.moreHint')}
          >{t('overview.more', { total: props.total, rest: Math.max(0, props.total - shown.length) })}
          </button>
        )}
      </div>
      {shown.length === 0
        ? <div className={shared.empty}>{t('overview.noData')}</div>
        : shown.map((item, index) => (
          <div className={styles.rankRow} key={item.key} title={item.title}>
            <span className={styles.rankName}>{item.name}</span>
            <span className={styles.rankTrack}>
              <i
                className={index === 0 ? styles.rankBar + ' ' + styles.rankBarTop : styles.rankBar}
                style={{ width: item.value === null || peak <= 0 ? 0 : Math.max(2, item.value / peak * 100) + '%' }}
              />
            </span>
            <span className={item.value === null ? styles.rankValue + ' ' + styles.rankDim : styles.rankValue}>{item.valueText}</span>
            <span className={styles.rankSub}>{item.subText}</span>
          </div>
        ))}
      {showAll && (
        <Dialog title={props.title} closeLabel={t('action.close')} onClose={() => setShowAll(false)}>
          <div className={styles.dialogTools}>
            <button
              type="button"
              className={styles.dialogSortBtn}
              onClick={() => setAscending((previous) => !previous)}
              aria-label={t('overview.sortDirection')}
              title={t('overview.sortDirection')}
            >{ascending ? '↑' : '↓'}</button>
          </div>
          {props.items.length === 0
            ? <div className={shared.empty}>{t('overview.noData')}</div>
            : [...props.items].sort((first, second) => (ascending ? -compareRankValue(first, second) : compareRankValue(first, second))).map((item) => (
              <div className={styles.rankRow} key={item.key} title={item.title}>
                <span className={styles.rankName}>{item.name}</span>
                <span className={styles.rankValue}>{item.valueText}</span>
                <span className={styles.rankSub}>{item.subText}</span>
              </div>
            ))}
        </Dialog>
      )}
    </div>
  )
}

export interface RankItem {
  key: string
  name: string
  /** 悬停提示：名字被省略号截断时还能看全 */
  title: string
  /** 排序 / 柱长用的数值；`null` = 该指标没有依据（成本无价目），显示「—」并排在末尾 */
  value: number | null
  valueText: string
  subText: string
}

/** 排行排序：有数值的按数值降序在前，没有依据（—）的稳定排在末尾。 */
export function compareRankValue(first: RankItem, second: RankItem): number {
  if (first.value === null && second.value === null) return 0
  if (first.value === null) return 1
  if (second.value === null) return -1
  return second.value - first.value
}

/** 汇总 summary 的近 30 天成本：合计只按逐币种小计折算后相加（`cost` 只是兜底）。 */
function tickIndexesOf(count: number, wanted: number): number[] {
  if (count <= wanted) return Array.from({ length: count }, (_, index) => index)
  const step = Math.ceil(count / wanted)
  const indexes: number[] = []
  for (let index = 0; index < count; index += step) indexes.push(index)
  return indexes
}

