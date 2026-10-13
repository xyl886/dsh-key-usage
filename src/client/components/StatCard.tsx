/** 统计卡：标签 + 主数值 + 副文案（原型 .stat-card）。 */
import type { ReactNode } from 'react'
import styles from '../styles/shared.module.css'

export function StatCard(props: { label: string; value: ReactNode; extra?: ReactNode }): ReactNode {
  return (
    <div className={styles.card}>
      <div className={styles.statLabel}>{props.label}</div>
      <div className={styles.statValue}>{props.value}</div>
      {props.extra !== undefined && <div className={styles.statExtra}>{props.extra}</div>}
    </div>
  )
}
