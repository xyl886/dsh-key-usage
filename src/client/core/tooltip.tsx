/** 共享浮层：跟随鼠标的 fixed 层，内容用 React 节点渲染（不再拼接 innerHTML）。 */
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import styles from '../styles/shared.module.css'

export interface TooltipContent {
  x: number
  y: number
  node: ReactNode
  /** 悬停目标的左右边界：把它放到目标**外面**，才不会盖住正在看的柱子/行。 */
  anchorLeft: number
  anchorRight: number
  /** 钉住位置（图表类用）：给出右边界与上边界时，浮层固定在容器右上角，不再跟随鼠标。 */
  pinRight?: number
  pinTop?: number
}

export interface TooltipApi {
  tooltip: TooltipContent | null
  show: (event: React.MouseEvent, node: ReactNode, pin?: { right: number; top: number }) => void
  hide: () => void
}

export function useTooltip(): TooltipApi {
  const [tooltip, setTooltip] = useState<TooltipContent | null>(null)
  const show = useCallback((event: React.MouseEvent, node: ReactNode, pin?: { right: number; top: number }) => {
    const target = event.currentTarget as HTMLElement | null
    const rect = target?.getBoundingClientRect()
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      node,
      anchorLeft: rect === undefined ? event.clientX : rect.left,
      anchorRight: rect === undefined ? event.clientX : rect.right,
      pinRight: pin?.right,
      pinTop: pin?.top,
    })
  }, [])
  const hide = useCallback(() => setTooltip(null), [])
  return { tooltip, show, hide }
}

export function TooltipView({ tooltip }: { tooltip: TooltipContent | null }): ReactNode {
  const elementRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const element = elementRef.current
    if (element === null || tooltip === null) return
    const width = element.offsetWidth
    const height = element.offsetHeight
    const margin = 12
    const gap = 10
    // 横向：放在悬停目标的**右侧**（目标外），右边放不下就放左侧 —— 这样永远不会盖住那一列
    // 钉住模式（图表）：固定贴在容器右上角，柱子与数值同屏可见，也不挡别的柱子
    const pinRight = tooltip.pinRight
    const pinTop = tooltip.pinTop
    const pinned = pinRight !== undefined && pinTop !== undefined
    const left = pinned
      ? pinRight - width
      : (tooltip.anchorRight + gap + width > window.innerWidth - margin ? tooltip.anchorLeft - width - gap : tooltip.anchorRight + gap)
    const top = pinned ? pinTop : tooltip.y - height / 2
    element.style.left = Math.max(margin, Math.min(left, window.innerWidth - width - margin)) + 'px'
    element.style.top = Math.max(margin, Math.min(top, window.innerHeight - height - margin)) + 'px'
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
