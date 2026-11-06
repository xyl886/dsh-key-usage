/** 使用明细的每日（或分时）成本柱状图：柱高、峰值高亮、悬停/点按浮层与坐标轴刻度。状态由 DetailTab 持有。 */
import type { ReactNode } from 'react'
import { t } from '../core/i18n.ts'
import { TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import detailStyles from '../styles/detail.module.css'
import styles from '../styles/shared.module.css'

export interface DetailBar {
  date: string
  short: string
  text: string
  value: number
  height: string
  peak: boolean
}

export function DetailBarsPanel(props: {
  titleKey: string
  metrics: Array<{ key: string; labelKey: string }>
  metric: string
  metricLabelKey: string
  onMetric: (key: string) => void
  summaryText: string
  bars: DetailBar[]
  axisTicks: DetailBar[]
  tooltip: TooltipApi
  pinOf: (node: HTMLElement | null) => { right: number; top: number } | undefined
  empty: boolean
}): ReactNode {
  return (
        <div className={detailStyles.panel}>
          <div className={detailStyles.panelHead}>
            <span className={detailStyles.panelTitle}>{t(props.titleKey)}</span>
            <div className={detailStyles.metricTabs}>
              {props.metrics.map(({ key, labelKey }) => (
                <button
                  key={key}
                  type="button"
                  className={props.metric === key ? detailStyles.metricTab + ' ' + detailStyles.metricTabOn : detailStyles.metricTab}
                  aria-pressed={props.metric === key}
                  onClick={() => props.onMetric(key)}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <span className={detailStyles.panelMore}>{props.summaryText}</span>
          </div>
          {props.empty
            ? <div className={styles.empty}>{t('empty.noUsage')}</div>
            : (
              <>
                <div
                  className={props.bars.length > 60 ? detailStyles.costBars + ' ' + detailStyles.costBarsDense : detailStyles.costBars}
                  role="img"
                  aria-label={t('detail.barsAria', { metric: t(props.metricLabelKey), count: props.bars.length })}
                >
                  {props.bars.map((bar) => (
                    <div
                      key={bar.date}
                      className={detailStyles.costBarCol}
                      onMouseMove={bar.value > 0
                        ? (event) => props.tooltip.show(event, (
                          <>
                            <TipTitle>{bar.date}</TipTitle>
                            <TipSub>{t(props.metricLabelKey)} <b>{bar.text}</b></TipSub>
                          </>
                        ), props.pinOf(event.currentTarget))
                        : undefined}
                      onMouseLeave={props.tooltip.hide}
                      onTouchStart={bar.value > 0
                        ? (event) => props.tooltip.show(event, (
                          <>
                            <TipTitle>{bar.date}</TipTitle>
                            <TipSub>{t(props.metricLabelKey)} <b>{bar.text}</b></TipSub>
                          </>
                        ), props.pinOf(event.currentTarget))
                        : undefined}
                    >
                      {bar.value > 0 && <span className={bar.peak ? detailStyles.costBarPeak : detailStyles.costBar} style={{ height: bar.height }} />}
                    </div>
                  ))}
                </div>
                <div className={detailStyles.costAxis} aria-hidden="true">
                  {props.axisTicks.map((bar) => <span key={bar.date}>{bar.short}</span>)}
                </div>
              </>
            )}
        </div>
  )
}
