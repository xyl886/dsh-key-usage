/** 概览的按时段矩阵：7×24 格、指标切换（会话 / Token / 成本）、悬停与点按浮层、最忙时段提示。 */
import type { ReactNode } from 'react'
import { t } from '../core/i18n.ts'
import { TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import styles from '../styles/overview.module.css'
import shared from '../styles/shared.module.css'

export function HourlyPanel(props: {
  metrics: Array<[string, string]>
  metric: string
  onMetric: (metric: string) => void
  metricLabelKey: string
  metricTextOf: (value: number) => string
  hasData: boolean
  hasCostData: boolean
  matrix: unknown[][] | null
  values: Array<Array<number | undefined>> | null
  levelOf: (value: number) => number
  colorOf: (level: number) => string | undefined
  weekdayKeys: string[]
  busiestHour: { weekday: number; hour: number } | null
  tooltip: TooltipApi
}): ReactNode {
  return (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <b className={styles.panelTitle}>{t('overview.hourly')}</b>
            <span className={styles.panelHint}>{t('overview.hoursScope')}</span>
            <div className={styles.metricTabs}>
              {props.metrics.map(([metric, labelKey]) => (
                <button
                  key={metric}
                  type="button"
                  disabled={metric === 'cost' && !props.hasCostData}
                  className={metric === props.metric ? styles.metricTab + ' ' + styles.metricTabOn : styles.metricTab}
                  aria-pressed={metric === props.metric}
                  onClick={() => { if (metric !== 'cost' || props.hasCostData) props.onMetric(metric) }}
                >{t(labelKey)}</button>
              ))}
            </div>
            <span className={styles.panelMore}>
              {props.busiestHour === null ? '' : t('overview.busiestHour', {
                weekday: t(props.weekdayKeys[props.busiestHour.weekday]),
                hour: String(props.busiestHour.hour).padStart(2, '0') + ':00',
              })}
            </span>
          </div>
          {props.values === null || props.matrix === null || !props.hasData
            ? <div className={shared.empty}>{t('overview.noHourly')}</div>
            : (
              <div className={styles.hourScroll}><div className={styles.hourWrap} role="group" aria-label={t('overview.hourly')}>
                {props.weekdayKeys.map((key, weekdayIndex) => (
                  <span key={key} className={styles.hourWeekday} style={{ gridColumn: 1, gridRow: weekdayIndex + 2 }}>{t(key)}</span>
                ))}
                {Array.from({ length: 24 }, (_, hour) => (
                  hour % 3 === 0
                    ? <span key={'axis-' + String(hour)} className={styles.hourAxisLabel} style={{ gridColumn: hour + 2, gridRow: 1 }}>{String(hour)}</span>
                    : null
                ))}
                {props.matrix.map((weekday, weekdayIndex) => weekday.map((_cell, hour) => {
                  const value = props.values![weekdayIndex][hour]
                  const level = value === undefined ? 0 : props.levelOf(value)
                  return (
                    <div
                      key={weekdayIndex + '-' + hour}
                      className={styles.hourCell}
                      style={{ gridColumn: hour + 2, gridRow: weekdayIndex + 2, background: props.colorOf(level) }}
                      onMouseMove={(event) => props.tooltip.show(event, (
                        <>
                          <TipTitle>{t(props.weekdayKeys[weekdayIndex]) + ' ' + String(hour).padStart(2, '0') + ':00'}</TipTitle>
                          <TipSub>{t(props.metricLabelKey)} <b>{value === undefined ? '—' : props.metricTextOf(value)}</b></TipSub>
                        </>
                      ))}
                      onMouseLeave={props.tooltip.hide}
                      onTouchStart={(event) => props.tooltip.show(event, (
                        <>
                          <TipTitle>{t(props.weekdayKeys[weekdayIndex]) + ' ' + String(hour).padStart(2, '0') + ':00'}</TipTitle>
                          <TipSub>{t(props.metricLabelKey)} <b>{value === undefined ? '—' : props.metricTextOf(value)}</b></TipSub>
                        </>
                      ))}
                    />
                  )
                }))}
              </div></div>
            )}
        </div>
  )
}
