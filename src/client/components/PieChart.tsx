/**
 * 环形占比图（纯 SVG，无第三方依赖）。
 * 默认中心显示占比最大的一段；悬停某段时中心切换成该段名称+占比（替代已在版面上移除的图例）；
 * 传了 `onPickSegment` 时段可点击下钻。
 */
import { useState, type ReactNode } from 'react'
import { TipRow, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import styles from '../styles/distribution.module.css'

export interface PieSegment {
  key: string
  label: string
  value: number
  color: string
  /** 金额文本（已按显示币种渲染）；纯 Token 视图可以传数量文本 */
  amountText: string
}

const SIZE = 156
const THICKNESS = 22

export function PieChart(props: {
  title: string
  segments: PieSegment[]
  ariaLabel: string
  tooltip: TooltipApi
  /** 点击某段：用于下钻到明细表；不传则段不可点 */
  onPickSegment?: (segment: PieSegment) => void
}): ReactNode {
  const [hovered, setHovered] = useState<string | null>(null)
  const total = props.segments.reduce((sum, segment) => sum + segment.value, 0)
  if (total <= 0) return null
  const radius = (SIZE - THICKNESS) / 2
  const circumference = 2 * Math.PI * radius
  const center = SIZE / 2
  const top = props.segments.reduce((best, segment) => (segment.value > best.value ? segment : best), props.segments[0])
  const active = hovered === null ? null : props.segments.find((segment) => segment.key === hovered) ?? null
  const percentOf = (value: number): string => (value / total * 100).toFixed(value / total >= 0.1 ? 0 : 1)
  let offset = 0
  return (
    <div className={styles.pieWrap}>
      <svg
        className={styles.pie}
        width={SIZE}
        height={SIZE}
        viewBox={'0 0 ' + String(SIZE) + ' ' + String(SIZE)}
        role="img"
        aria-label={props.ariaLabel}
      >
        {/* 底环：只有一段时也能看出这是个环 */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--dsw-alias-interactive-bg-active, rgba(128,128,140,.18))" strokeWidth={THICKNESS} />
        {props.segments.map((segment) => {
          const length = segment.value / total * circumference
          const dash = String(length) + ' ' + String(Math.max(0, circumference - length))
          const rotation = -90 + offset / circumference * 360
          offset += length
          const pickable = props.onPickSegment !== undefined
          const className = styles.pieSlice
            + (pickable ? ' ' + styles.pieSlicePickable : '')
            + (hovered === segment.key ? ' ' + styles.pieSliceActive : '')
          return (
            <circle
              key={segment.key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={THICKNESS}
              strokeDasharray={dash}
              transform={'rotate(' + rotation.toFixed(3) + ' ' + String(center) + ' ' + String(center) + ')'}
              className={className}
              onMouseEnter={() => setHovered(segment.key)}
              onMouseMove={(event) => props.tooltip.show(event, (
                <>
                  <TipTitle>{props.title}</TipTitle>
                  <TipRow color={segment.color} label={segment.label} amount={segment.amountText} rate={percentOf(segment.value) + '%'} />
                </>
              ))}
              onMouseLeave={() => { setHovered(null); props.tooltip.hide() }}
              onClick={pickable ? () => props.onPickSegment?.(segment) : undefined}
            />
          )
        })}
      </svg>
      <div className={styles.pieCenter}>
        <span className={styles.pieCenterValue}>{percentOf(active === null ? top.value : active.value) + '%'}</span>
        {active !== null && <span className={styles.pieCenterLabel} title={active.label}>{active.label}</span>}
      </div>
    </div>
  )
}
