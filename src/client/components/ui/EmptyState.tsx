/** 统一空态 / 降级态：标题 +（可选）原因 +（可选）动作。
 *  以前各 Tab 自己写「读取中或不可用…」，失败原因有的带有的不带，用户分不清是加载还是真失败。 */
import type { ReactNode } from 'react'
import styles from '../../styles/ui.module.css'

export function EmptyState(props: {
  /** 一句话说明现在是什么状态（读取中 / 不可用 / 失败） */
  title: string
  /** 失败原因或口径补充，可省 */
  reason?: string | null
  /** 空态类型：读取中给转圈、失败给告警色、无数据保持中性（默认）。 */
  kind?: 'loading' | 'error' | 'empty'
  children?: ReactNode
}): ReactNode {
  const kind = props.kind ?? 'empty'
  return (
    <div className={styles.emptyState} role="status" data-kind={kind} aria-busy={kind === 'loading'}>
      {kind === 'loading' && <span className={styles.emptySpinner} aria-hidden="true" />}
      <div className={styles.emptyTitle}>{props.title}</div>
      {props.reason !== undefined && props.reason !== null && <div>{props.reason}</div>}
      {props.children}
    </div>
  )
}
