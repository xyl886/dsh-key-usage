/**
 * 首屏骨架：快照还没回来时占住版面，避免「加载中 → 内容」造成的大幅跳动。
 * 只做视觉占位，不带数据、不带文案（文案与空态由 EmptyState 负责）。
 */
import type { ReactNode } from 'react'
import styles from '../../styles/ui.module.css'

export function Skeleton(props: { rows?: number; className?: string }): ReactNode {
  const rows = props.rows ?? 3
  return (
    <div className={styles.skeleton + (props.className === undefined ? '' : ' ' + props.className)} aria-hidden="true">
      <div className={styles.skeletonBar + ' ' + styles.skeletonBarTitle} />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.skeletonBar} style={{ width: index % 2 === 0 ? '100%' : '72%' }} />
      ))}
    </div>
  )
}
