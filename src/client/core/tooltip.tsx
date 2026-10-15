/** 共享浮层：跟随鼠标的 fixed 层，内容用 React 节点渲染（不再拼接 innerHTML）。 */
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import styles from '../styles/shared.module.css'

export interface TooltipContent {
  x: number
  y: number
  node: ReactNode
}

export interface TooltipApi {
  tooltip: TooltipContent | null
  show: (event: React.MouseEvent, node: ReactNode) => void
  hide: () => void
}

export function useTooltip(): TooltipApi {
  const [tooltip, setTooltip] = useState<TooltipContent | null>(null)
  const show = useCallback((event: React.MouseEvent, node: ReactNode) => {
    setTooltip({ x: event.clientX, y: event.clientY, node })
  }, [])
  const hide = useCallback(() => setTooltip(null), [])
  return { tooltip, show, hide }
}

export function TooltipView({ tooltip }: { tooltip: TooltipContent | null }): ReactNode {
  const elementRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const element = elementRef.current
    if (element === null || tooltip === null) return
    const maxX = window.innerWidth - element.offsetWidth - 12
    const maxY = window.innerHeight - element.offsetHeight - 12
    element.style.left = Math.max(8, Math.min(tooltip.x + 14, maxX)) + 'px'
    element.style.top = Math.max(8, Math.min(tooltip.y + 14, maxY)) + 'px'
  }, [tooltip])
  if (tooltip === null) return null
  return <div ref={elementRef} className={styles.tooltip}>{tooltip.node}</div>
}

export function TipTitle({ children }: { children: ReactNode }): ReactNode {
  return <div className={styles.tipTitle}>{children}</div>
}

export function TipSub({ children }: { children: ReactNode }): ReactNode {
  return <div className={styles.tipSub}>{children}</div>
}

export function TipRow(props: { color?: string; label: ReactNode; amount?: ReactNode; rate?: ReactNode }): ReactNode {
  return (
    <div className={styles.tipRow}>
      {props.color !== undefined && <i style={{ background: props.color }} />}
      <span className={styles.tipName}>{props.label}</span>
      {props.amount !== undefined && <span className={styles.tipAmount}>{props.amount}</span>}
      {props.rate !== undefined && <span className={styles.tipRate}>{props.rate}</span>}
    </div>
  )
}

export function TipBar({ percent, color }: { percent: number; color: string }): ReactNode {
  return <div className={styles.tipBar}><i style={{ width: Math.max(2, percent) + '%', background: color }} /></div>
}

export function TipDivider({ children }: { children: ReactNode }): ReactNode {
  return <div className={styles.tipDivider}>{children}</div>
}
