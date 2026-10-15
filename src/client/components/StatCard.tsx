/** 统计卡：标签 + 主数值 + 副文案（原型 .stat-card）。 */
import type { ReactNode } from 'react'
import styles from '../styles/shared.module.css'

export function StatCard(props: { label: string; value: ReactNode; extra?: ReactNode; badge?: ReactNode; above?: ReactNode }): ReactNode {
  return (
    <div className={props.badge === undefined ? styles.card : styles.card + ' ' + styles.cardWithBadge}>
      {props.badge !== undefined && <span className={styles.statBadge}>{props.badge}</span>}
      <div className={styles.statLabel}>{props.label}</div>
      {props.above !== undefined && <div className={styles.statAbove}>{props.above}</div>}
      <div className={styles.statValue}>{props.value}</div>
      {props.extra !== undefined && <div className={styles.statExtra}>{props.extra}</div>}
    </div>
  )
}
