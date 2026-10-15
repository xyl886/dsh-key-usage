/**
 * 一行状态提示：页面只留结论（如「刷新失败」），原因进系统日志；整句可点开日志窗。
 * 用于「刷新价目失败 / 汇率回落默认值 / 余额查询未成功 / 快照读取失败」这类**要看见但不必摊开**的失败。
 */
import type { ReactNode } from 'react'
import { requestOpenLog } from '../core/log.ts'
import { t } from '../core/i18n.ts'
import uiStyles from '../styles/ui.module.css'

export function LogHint(props: {
  /** 结论（不带原因）。 */
  text: string
  tone?: 'error' | 'warn'
  className?: string
}): ReactNode {
  const toneClass = (props.tone ?? 'warn') === 'error' ? uiStyles.logHintError : uiStyles.logHintWarn
  return (
    <button
      type="button"
      className={uiStyles.logHint + ' ' + toneClass + (props.className === undefined ? '' : ' ' + props.className)}
      title={t('log.view')}
      onClick={() => requestOpenLog()}
    >
      {props.text}
      <span className={uiStyles.logHintTail}>{t('log.view')}</span>
    </button>
  )
}
