/** 统一空态 / 降级态：标题 +（可选）原因 +（可选）动作。
 *  以前各 Tab 自己写「读取中或不可用…」，失败原因有的带有的不带，用户分不清是加载还是真失败。 */
import type { ReactNode } from 'react'
import styles from '../../styles/ui.module.css'

export function EmptyState(props: {
  /** 一句话说明现在是什么状态（读取中 / 不可用 / 失败） */
  title: string
  /** 失败原因或口径补充，可省 */
  reason?: string | null
  children?: ReactNode
}): ReactNode {
  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.emptyTitle}>{props.title}</div>
      {props.reason !== undefined && props.reason !== null && <div>{props.reason}</div>}
      {props.children}
    </div>
  )
}
