/** 通用下拉：原生 `select` 的外观改不动（各系统长相不一，与宿主主题脱节），这里自建 listbox。
 *  键盘：↑↓ 移动、Enter 选中、Esc 关闭；点外部关闭；role=listbox/option 供读屏。 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from '../../styles/ui.module.css'

export interface SelectOption {
  value: string
  label: string
}

export function Select(props: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** 读屏用的名称（也就是这个筛选器在筛什么） */
  ariaLabel: string
}): ReactNode {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const current = props.options.find((option) => option.value === props.value) ?? props.options[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node
      if (wrapRef.current !== null && !wrapRef.current.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const step = (delta: number): void => {
    setActiveIndex((previous) => Math.min(props.options.length - 1, Math.max(0, previous + delta)))
  }

  const commit = (index: number): void => {
    const option = props.options[index]
    if (option !== undefined) props.onChange(option.value)
    setOpen(false)
  }

  const toggle = (): void => {
    const index = props.options.findIndex((option) => option.value === props.value)
    setActiveIndex(index < 0 ? 0 : index)
    setOpen((previous) => !previous)
  }

  return (
    <span className={styles.selectWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.selectBtn}
        aria-label={props.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) { setOpen(true); return }
            step(event.key === 'ArrowDown' ? 1 : -1)
          }
        }}
      >
        <span className={styles.selectValue}>{current?.label ?? ''}</span>
        <span className={styles.selectCaret} aria-hidden="true">▼</span>
      </button>
      {open && (
        <ul
          className={styles.selectList}
          role="listbox"
          aria-label={props.ariaLabel}
          tabIndex={-1}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- 打开即接管键盘，Esc/Enter 才有落点
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Escape') { setOpen(false); return }
            if (event.key === 'Enter') { event.preventDefault(); commit(activeIndex); return }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              step(event.key === 'ArrowDown' ? 1 : -1)
            }
          }}
        >
          {props.options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === props.value}
              className={styles.selectOption + (index === activeIndex ? ' ' + styles.selectOptionActive : '')}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              <span>{option.label}</span>
              {option.value === props.value && <span className={styles.selectCheck} aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
