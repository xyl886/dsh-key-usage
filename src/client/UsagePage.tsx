/**
 * 「使用情况」主区域页面（`main` slot，与 sidebar.panellist 的 id 同名配对）。
 * 点击侧边栏导航项后由宿主在主内容区内联渲染 —— 不是弹窗、不占设置页。
 * 滚动由本容器负责：宿主主内容区不会滚动，长表格必须靠自己滚。
 */
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
