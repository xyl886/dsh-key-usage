/** 堆叠柱状图：按天或按小时，含 x 轴标签与左侧纵轴刻度。 */
import type { ReactNode } from 'react'
import { fmtTokens } from '../format.ts'
import type { TooltipApi } from '../tooltip.tsx'
import styles from '../styles/detail.module.css'

export interface TokenBarRow {
  key: string
  axisLabel: string
  cacheReadTokens: number
  inputTokens: number
  outputTokens: number
  tip: ReactNode
}

export function TokenBars(props: {
  rows: TokenBarRow[]
  tooltip: TooltipApi
  /** 整张图的读屏替代文本：逐柱数值只有 hover tip，柱子本身不建成 tab stop（几十上百个会淹没键盘用户）。 */
  ariaLabel: string
  hidden?: boolean
}): ReactNode {
  const { rows, tooltip } = props
  if (props.hidden === true || rows.length === 0) return null
  const peak = Math.max(1, ...rows.map((row) => row.cacheReadTokens + row.inputTokens + row.outputTokens))
  const heightOf = (value: number): string => (peak > 0 ? Math.max(1, Math.round(value / peak * 100)) : 1) + '%'
  // 标签抽稀：列数多时每列都写会糊成一片，只保留首列、末列与等距采样
  const labelEvery = Math.max(1, Math.ceil(rows.length / 14))
  return (
    <div className={styles.chartAxisWrap}>
      {/* 纵轴只标峰值 / 半值 / 0：柱子高度按峰值归一，这三档足够读出量级 */}
      <div className={styles.yAxis} aria-hidden="true">
        <span>{fmtTokens(peak)}</span>
        <span>{fmtTokens(Math.round(peak / 2))}</span>
        <span>0</span>
      </div>
      <div className={styles.chartPane}>
        <div className={rows.length > 20 ? styles.bars + ' ' + styles.barsDense : styles.bars} role="img" aria-label={props.ariaLabel}>
          {rows.map((row) => {
            const rowTotal = row.cacheReadTokens + row.inputTokens + row.outputTokens
            return (
              <div
                key={row.key}
                className={styles.barColumn}
                onMouseMove={(event) => tooltip.show(event, row.tip)}
                onMouseLeave={tooltip.hide}
              >
                {rowTotal > 0 && (
                  <>
                    <span className={styles.segCache} style={{ height: heightOf(row.cacheReadTokens) }} />
                    <span className={styles.segIn} style={{ height: heightOf(row.inputTokens) }} />
                    <span className={styles.segOut} style={{ height: heightOf(row.outputTokens) }} />
                  </>
                )}
              </div>
            )
          })}
        </div>
        <div className={styles.barLabels}>
          {rows.map((row, index) => (
            <span key={row.key}>{index % labelEvery === 0 || index === rows.length - 1 ? row.axisLabel : ''}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
