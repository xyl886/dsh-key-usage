/** 「使用情况」主区域页面（宿主内联渲染，不是弹窗）；宿主主内容区不滚动，滚动由本容器负责。 */
import type { ReactNode } from 'react'
import { KeyUsageSection } from './KeyUsageSection.tsx'
import styles from './styles/page.module.css'

/** 宿主会传入根作用域的标准 kit 与绑定的 `t`；本页面当前不需要它们。 */
export function UsagePage(_props: Record<string, unknown>): ReactNode {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <KeyUsageSection />
      </div>
    </div>
  )
}
