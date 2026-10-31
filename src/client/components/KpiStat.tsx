/**
 * KPI 卡：图标 + 标签 / 上期与环比同一行 / 大数。
 * 十张卡结构完全一致，抽成组件后概览只负责组装描述符。
 */
import type { ReactNode } from 'react'
import styles from '../styles/overview.module.css'

export interface KpiCardDescriptor {
  key: string
  icon: KpiIconName
  label: string
  value: string
  unit?: string
  previousText: string | null
  deltaText: string | null
  tone: 'warn' | 'good' | 'neutral'
}

export type KpiIconName = 'cost' | 'tokens' | 'input' | 'output' | 'cacheRead' | 'hit' | 'dailyTokens' | 'dailyCost' | 'calls' | 'sessions'

/** 线性小图标：只用 currentColor 描边，尺寸固定 14，不依赖任何图标库。 */
const KPI_ICON_PATHS: Record<KpiIconName, string> = {
  cost: 'M8 2v12M4.5 5h5.2a1.8 1.8 0 0 1 0 3.6H6a1.8 1.8 0 0 0 0 3.6h5.5',
  tokens: 'M2.8 4h10.4v3.2H2.8zM2.8 8.8h10.4V12H2.8z',
  input: 'M8 2.4v7.2m0 0 2.6-2.6M8 9.6 5.4 7M2.8 13.6h10.4',
  output: 'M8 9.6V2.4m0 0L5.4 5M8 2.4 10.6 5M2.8 13.6h10.4',
  cacheRead: 'M4.6 11.4a2.4 2.4 0 0 1 .2-4.8 3.1 3.1 0 0 1 5.9.5 2.4 2.4 0 0 1-.3 4.3H4.6z',
  hit: 'M2.8 2.8h10.4v10.4H2.8zM6 10l4-4M6 6.2h.01M10 9.8h.01',
  dailyTokens: 'M3 12.6V9m3 3.6V5.6m3.2 7V8.2m3 4.4V6.8',
  dailyCost: 'M2.8 4.4h10.4v9.2H2.8zM2.8 7.2h10.4M5.8 2.6v2.4m4.4-2.4v2.4',
  calls: 'M2.6 9.4 5.4 6.2l2.6 3 2.6-4 2.8 3.2',
  sessions: 'M6.2 7.4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2.8 13.4c0-1.9 1.5-3.4 3.4-3.4s3.4 1.5 3.4 3.4M11 6.6a1.6 1.6 0 1 0 0-3.2M11.2 13.4c0-1.3-.5-2.4-1.2-3.2',
}

/** KPI 卡：图标+标签 / 上期与环比同一行 / 大数。十张卡结构完全一致，扫一列就能比出变化。 */
export function KpiStat(props: {
  icon: KpiIconName
  label: string
  value: string
  unit?: string
  previousText: string | null
  deltaText: string | null
  tone: 'warn' | 'good' | 'neutral'
  /** 没有上一等长窗口时（范围=全部）省掉上期行 */
  hidePrev?: boolean
}): ReactNode {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <svg className={styles.kpiIcon} viewBox="0 0 16 16" aria-hidden="true">
          <path d={KPI_ICON_PATHS[props.icon]} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.kpiLabel}>{props.label}</span>
      </div>
      {props.hidePrev !== true && (
      <div className={styles.kpiCompare}>
        <span className={styles.kpiPrev}>{props.previousText ?? '—'}</span>
        {props.deltaText !== null && (
          <span className={props.tone === 'warn' ? styles.kpiDeltaWarn : props.tone === 'good' ? styles.kpiDeltaGood : styles.kpiDelta}>
            {props.deltaText}
          </span>
        )}
      </div>
      )}
      <div className={styles.kpiValue}>
        {props.value}
        {props.unit !== undefined && <span className={styles.kpiUnit}>{props.unit}</span>}
      </div>
    </div>
  )
}

/** 环比（%）：上期没有或非正时不编数字，只留上期值。成本类上涨算警示、下降算好。 */
