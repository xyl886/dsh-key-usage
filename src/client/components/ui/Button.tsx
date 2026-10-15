/** 通用按钮：一套外观 / 焦点环 / 尺寸，替换各 Tab 里三套手写按钮样式（零依赖，只吃宿主令牌）。 */
import type { ReactNode } from 'react'
import styles from '../../styles/ui.module.css'

export function Button(props: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  /** primary 用主色描边（次要动作一律默认样式，别再用第三种写法） */
  variant?: 'default' | 'primary'
  size?: 'md' | 'sm'
  /** 当前处于「已开启 / 已选中」状态（筛选类按钮用） */
  active?: boolean
  /** 只有图标时必填：给读屏一个名字 */
  ariaLabel?: string
  title?: string
  className?: string
}): ReactNode {
  const classes = [styles.btn]
  if (props.size === 'sm') classes.push(styles.btnSm)
  if (props.variant === 'primary') classes.push(styles.btnPrimary)
  if (props.active === true) classes.push(styles.btnActive)
  if (props.className !== undefined) classes.push(props.className)
  return (
    <button
      type="button"
      className={classes.join(' ')}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      aria-pressed={props.active}
      title={props.title}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}
