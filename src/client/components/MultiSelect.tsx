/** 可搜索、可多选、选项按名称排序的筛选下拉（通道 / 项目 / 模型共用）。 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/** 同一时刻只允许一个筛选浮层展开：新打开的那个负责关掉上一个。 */
let closeOtherOverlay: (() => void) | null = null
const OVERLAY_CLOSE_EVENT = 'dsh-key-usage:close-overlays'
import { t } from '../core/i18n.ts'
import styles from '../styles/multiSelect.module.css'

export interface MultiSelectOption {
  /** 选中值；空串是合法值（例如「未归入工作区」） */
  value: string
  label: string
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  /** 触发按钮在「全部」状态下的文案 */
  allLabel: string
  ariaLabel: string
  /** 面板里搜索框的占位文案 */
  searchLabel: string
  /** 选项的用量（Token）：给了就按用量降序，否则按名称 */
  usageOf?: (value: string) => number
}

/** 名称排序：中文按拼音、数字与符号跟在后面，保证每次打开顺序稳定。 */
function sorted(options: MultiSelectOption[], usageOf?: (value: string) => number): MultiSelectOption[] {
  const byName = (left: MultiSelectOption, right: MultiSelectOption): number =>
    left.label.localeCompare(right.label, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
  if (usageOf === undefined) return [...options].sort(byName)
  return [...options].sort((left, right) => usageOf(right.value) - usageOf(left.value) || byName(left, right))
}

export function MultiSelect(props: MultiSelectProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [anchor, setAnchor] = useState({ top: 0, left: 0 })
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const options = useMemo(() => sorted(props.options, props.usageOf), [props.options, props.usageOf])
  const selectedSet = useMemo(() => new Set(props.selected), [props.selected])

  // 浮层 fixed 定位：不参与文档流，打开时不会把页面撑宽导致整页左移
  useLayoutEffect(() => {
    if (!open) return
    const place = (): void => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect === undefined) return
      const width = 260
      setAnchor({ top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  useEffect(() => {
    if (!open) return
    const myClose = (): void => { setOpen(false) }
    if (closeOtherOverlay !== null && closeOtherOverlay !== myClose) closeOtherOverlay()
    closeOtherOverlay = myClose
    const onOverlayClose = (): void => setOpen(false)
    window.addEventListener(OVERLAY_CLOSE_EVENT, onOverlayClose)
    const onDown = (event: MouseEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener(OVERLAY_CLOSE_EVENT, onOverlayClose)
      if (closeOtherOverlay === myClose) closeOtherOverlay = null
    }
  }, [open])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (keyword === '') return options
    return options.filter((option) => option.label.toLowerCase().includes(keyword))
  }, [options, query])

  const toggle = (value: string): void => {
    const next = selectedSet.has(value) ? props.selected.filter((item) => item !== value) : [...props.selected, value]
    props.onChange(next)
  }

  const triggerText = props.selected.length === 0
    ? props.allLabel
    : props.selected.length === 1
      ? (options.find((option) => option.value === props.selected[0])?.label ?? props.selected[0])
      : t('multi.count', { count: props.selected.length })

  return (
    <span className={styles.root} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={props.ariaLabel}
        title={props.ariaLabel}
      >
        <span className={styles.triggerText}>{triggerText}</span>
        <span className={styles.caret} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className={styles.panel} style={{ top: anchor.top, left: anchor.left }} role="listbox" aria-multiselectable="true">
          <input
            className={styles.search}
            value={query}
            placeholder={props.searchLabel}
            aria-label={props.searchLabel}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className={styles.toolbar}>
            <button type="button" className={styles.linkBtn} onClick={() => props.onChange(options.map((option) => option.value))}>{t('multi.all')}</button>
            <button type="button" className={styles.linkBtn} onClick={() => props.onChange([])}>{t('multi.none')}</button>
          </div>
          <div className={styles.list}>
            {filtered.length === 0 && <div className={styles.empty}>{t('multi.empty')}</div>}
            {filtered.map((option) => {
              const chosen = selectedSet.has(option.value)
              return (
                <button
                  key={option.value === '' ? '__empty' : option.value}
                  type="button"
                  className={chosen ? styles.itemOn : styles.item}
                  role="option"
                  aria-selected={chosen}
                  onClick={() => toggle(option.value)}
                >
                  <span className={chosen ? styles.boxOn : styles.box} aria-hidden="true">{chosen ? '✓' : ''}</span>
                  <span className={styles.itemLabel}>{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </span>
  )
}
