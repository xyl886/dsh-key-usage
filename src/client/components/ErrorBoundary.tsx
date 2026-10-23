/** 页面错误边界：渲染异常时显示可读错误 + 写系统日志，不再让宿主主区域整块空白。 */
import { Component, type ReactNode } from 'react'
import { t } from '../core/i18n.ts'
import { logWarn } from '../core/log.ts'
import styles from '../styles/shared.module.css'

interface BoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error): void {
    // 原因只进系统日志：面板上只留一句结论 + 重试按钮
    logWarn('client', t('err.renderFailed'), error.stack ?? error.message)
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className={styles.card} style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ marginBottom: '6px' }}>{t('err.renderFailed')}</div>
          <div className={styles.dim} style={{ marginBottom: '12px' }}>{this.state.error.message}</div>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => this.setState({ error: null })}
          >{t('action.retry')}</button>
        </div>
      )
    }
    return this.props.children
  }
}
