/** 页面头部：标题 + 设置 / GitHub / 刷新周期 / 手动刷新。纯展示，状态与回调由 KeyUsageSection 传入。 */
import type { ReactNode } from 'react'
import { t } from '../core/i18n.ts'
import styles from '../styles/shared.module.css'

export function UsageHead(props: {
  /** 有可用新版本时在设置按钮右上角点一个小圆点（是否 link 模式由上层判断）。 */
  hasUpdate: boolean
  onOpenSettings: () => void
  ghUrl: string
  refreshSeconds: number
  onRefreshSecondsChange: (seconds: number) => void
  refreshOptions: number[]
  refreshLabel: (seconds: number) => string
  loading: boolean
  onRefresh: () => void
}): ReactNode {
  return (
        <div className={styles.pageHead}>
          <h1 className={styles.pageTitle}>{t('app.title')}</h1>
          <span className={styles.rowSpacer} />
          <span className={styles.toolbarGroup}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={props.onOpenSettings}
              aria-label={t('action.settings')}
              title={t('action.settings')}
            >
              {props.hasUpdate && <span className={styles.badgeDot} aria-hidden="true" />}
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
                <circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <path fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" />
              </svg>
            </button>
            <a className={styles.ghLink} href={props.ghUrl} target="_blank" rel="noreferrer" aria-label="GitHub">
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
            <select
              className={styles.refreshSelect}
              value={props.refreshSeconds}
              onChange={(event) => props.onRefreshSecondsChange(Number(event.target.value))}
              aria-label={t('filter.refreshCycle')}
              title={t('filter.refreshCycle')}
            >
              {props.refreshOptions.map((seconds) => (
                <option key={seconds} value={seconds}>{props.refreshLabel(seconds)}</option>
              ))}
            </select>
            <button
              type="button"
              className={styles.iconBtn}
              disabled={props.loading}
              onClick={props.onRefresh}
              aria-label={props.loading ? t('action.refreshing') : t('action.refresh')}
              aria-busy={props.loading}
            >
              <span className={props.loading ? styles.refreshIconSpin : styles.refreshIcon} aria-hidden="true">↻</span>
            </button>
          </span>
        </div>


  )
}
