/** 「使用情况」主区域页面（宿主内联渲染，不是弹窗）；宿主主内容区不滚动，滚动由本容器负责。 */
import { useEffect, useRef, type ReactNode } from 'react'
import { CLIENT_BOOT_AT_MS } from './core/boot.ts'
import { logInfo } from './core/log.ts'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { KeyUsageSection } from './KeyUsageSection.tsx'
import styles from './styles/page.module.css'

/** 宿主会传入根作用域的标准 kit 与绑定的 `t`；本页面当前不需要它们。 */
export function UsagePage(_props: Record<string, unknown>): ReactNode {
  // 启动埋点：首屏渲染完成时刻（只在首次生效，StrictMode 双跑也只记一条）
  const logged = useRef(false)
  useEffect(() => {
    if (logged.current) return
    logged.current = true
    logInfo('boot', '首屏已渲染', '渲染进程已运行 ' + String(Math.round(performance.now())) + ' ms；距插件挂载 '
      + String(Math.round(performance.now() - CLIENT_BOOT_AT_MS)) + ' ms')
  }, [])
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <ErrorBoundary>
          <KeyUsageSection />
        </ErrorBoundary>
      </div>
    </div>
  )
}
