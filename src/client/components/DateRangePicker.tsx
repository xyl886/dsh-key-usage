/**
 * 自定义日期区间选择器：胶囊触发条（起 → 止 ▾）+ 浮层日历。
 * 交互对齐 dsh-context：先点开始日、再点结束日；区间浅底连片、两端实心；Esc / 点外部 / 滚动关闭。
 * 日期运算一律用本地时间构造 Date，避免 UTC 偏移把「当天」算错。
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { isoDate } from '../core/format.ts'
import { isEnglish, t, useT } from '../core/i18n.ts'
import styles from '../styles/dateRange.module.css'

const WEEKDAY_COUNT = 7

/** `YYYY-MM-DD` → 本地零点的时间戳；解析失败返回 null。 */
function timeOf(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const time = new Date(year, month - 1, day).getTime()
  return Number.isNaN(time) ? null : time
}

/** 日期加减天数（本地时间）；入参非法返回 null。 */
function addDaysOf(value: string, delta: number): string | null {
  const time = timeOf(value)
  if (time === null) return null
  return isoDate(new Date(time + delta * 86400000))
}

/** 月份加减：`YYYY-MM` → 相邻月份；入参非法返回 null。 */
function shiftMonthOf(yearMonth: string, delta: number): string | null {
  const year = Number(yearMonth.slice(0, 4))
  const month = Number(yearMonth.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  const date = new Date(year, month - 1 + delta, 1)
  return isoDate(date).slice(0, 7)
}

/** 月标题：跟随界面语言（中文「2026年10月」/ 英文 "October 2026"），不写死文案。 */
function monthTitleOf(yearMonth: string): string {
  const year = Number(yearMonth.slice(0, 4))
  const month = Number(yearMonth.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(month)) return yearMonth
  return new Date(year, month - 1, 1).toLocaleDateString(isEnglish() ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'long' })
}

/** 一个月的日历行：6 行 × 7 列，首尾用 null 补齐（周日开头，与宿主日历一致）。 */
function weeksOf(yearMonth: string): Array<Array<string | null>> {
  const year = Number(yearMonth.slice(0, 4))
  const month = Number(yearMonth.slice(5, 7))
  const first = new Date(year, month - 1, 1)
  const lead = first.getDay()
  const total = new Date(year, month, 0).getDate()
  const cells: Array<string | null> = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= total; day += 1) cells.push(isoDate(new Date(year, month - 1, day)))
  while (cells.length % WEEKDAY_COUNT !== 0) cells.push(null)
  const weeks: Array<Array<string | null>> = []
  for (let index = 0; index < cells.length; index += WEEKDAY_COUNT) weeks.push(cells.slice(index, index + WEEKDAY_COUNT))
  return weeks
}

export function DateRangePicker(props: {
  /** 已选区间（`YYYY-MM-DD`）；页头始终有值，选中途中只在浮层里预览 */
  from: string
  to: string
  onChange: (from: string, to: string) => void
}): ReactNode {
  const t = useT()
  const today = isoDate(new Date())
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => (timeOf(props.to) === null ? today.slice(0, 7) : props.to.slice(0, 7)))
  const [cursor, setCursor] = useState(() => (timeOf(props.to) === null ? today.slice(0, 7) : props.to.slice(0, 7)) + '-01')
  /** 已点下开始日、还没点结束日 */
  const [pending, setPending] = useState<string | null>(null)
  /** 选结束日时的悬停预览 */
  const [hovered, setHovered] = useState<string | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const popupId = useId()
  const cursorId = useId()

  /** 浮层里要画的区间：选结束日阶段用「起点 + 悬停/起点」预览，否则用已提交的区间 */
  const previewFrom = pending === null ? props.from : (hovered !== null && hovered < pending ? hovered : pending)
  const previewTo = pending === null ? props.to : (hovered !== null && hovered > pending ? hovered : pending)

  const close = (): void => {
    setOpen(false)
    setPending(null)
    setHovered(null)
  }

  // 打开时把日历定位到已选区间的结束月；没有可解析的区间就从本月开始
  const openPicker = (): void => {
    const anchor = timeOf(props.to) === null ? today.slice(0, 7) : props.to.slice(0, 7)
    setMonth(anchor)
    setCursor(anchor + '-01')
    setPending(null)
    setHovered(null)
    setPosition(null)
    setOpen(true)
  }

  // Esc 关闭、点浮层外部关闭、页面滚动/窗口缩放关闭（浮层是 fixed 定位，滚动后会错位）
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent): void => {
      const root = rootRef.current
      if (root !== null && event.target instanceof Node && root.contains(event.target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      close()
      triggerRef.current?.focus()
    }
    const onDismiss = (): void => { close() }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onDismiss, true)
    window.addEventListener('resize', onDismiss)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onDismiss, true)
      window.removeEventListener('resize', onDismiss)
    }
  }, [open])

  // 浮层贴在触发条下方；越界时夹到视口内 / 翻到触发条上方
  useLayoutEffect(() => {
    if (!open) return
    const trigger = rootRef.current
    const panel = panelRef.current
    if (trigger === null || panel === null) return
    const box = trigger.getBoundingClientRect()
    const left = Math.max(8, Math.min(box.left, window.innerWidth - panel.offsetWidth - 8))
    const below = box.bottom + 6
    const top = below + panel.offsetHeight > window.innerHeight - 8
      ? Math.max(8, box.top - panel.offsetHeight - 6)
      : below
    setPosition((previous) => (previous !== null && previous.left === left && previous.top === top ? previous : { left, top }))
  })

  const pickDay = (day: string): void => {
    if (day > today) return
    if (pending === null) {
      setPending(day)
      setHovered(null)
      return
    }
    const start = pending <= day ? pending : day
    const end = pending <= day ? day : pending
    close()
    // 面板关闭后焦点回触发条：焦点不能随着被移除的日历格一起消失
    triggerRef.current?.focus()
    props.onChange(start, end)
  }

  const shiftMonth = (delta: number): void => {
    const next = shiftMonthOf(month, delta)
    if (next === null || next > today.slice(0, 7)) return
    setMonth(next)
    setCursor(next + '-01')
  }

  // 键盘：←/→/↑/↓ 移动日历光标，Enter / Space 选中；焦点在网格上时 Esc 关闭由上面的监听负责
  const onGridKeyDown = (event: { key: string; preventDefault: () => void }): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      pickDay(cursor)
      return
    }
    const step = event.key === 'ArrowLeft' ? -1
      : event.key === 'ArrowRight' ? 1
        : event.key === 'ArrowUp' ? -7
          : event.key === 'ArrowDown' ? 7
            : null
    if (step === null) return
    event.preventDefault()
    const next = addDaysOf(cursor, step)
    if (next === null || next > today || next.slice(0, 7) !== month) return
    setCursor(next)
  }

  const cellClassOf = (day: string): string => {
    const parts = [styles.cell]
    if (day >= previewFrom && day <= previewTo) parts.push(styles.inRange)
    if (day === previewFrom || day === previewTo) parts.push(styles.edge)
    if (day === cursor) parts.push(styles.cursor)
    if (day === today) parts.push(styles.todayCell)
    if (day > today) parts.push(styles.future)
    return parts.join(' ')
  }

  return (
    <span className={styles.root} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        aria-label={t('date.select')}
        title={t('date.select')}
        onClick={() => { if (open) close(); else openPicker() }}
      >
        <span className={styles.half}>{props.from}</span>
        <span className={styles.sep} aria-hidden="true">→</span>
        <span className={styles.half}>{props.to}</span>
        <span className={styles.caret} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          id={popupId}
          className={styles.panel}
          role="dialog"
          aria-label={t('date.select')}
          style={position === null ? { left: 0, top: 0, visibility: 'hidden' } : { left: position.left, top: position.top }}
        >
          <div className={styles.nav}>
            <button type="button" className={styles.navBtn} aria-label={t('date.prevMonth')} onClick={() => shiftMonth(-1)}>‹</button>
            <span className={styles.month}>{monthTitleOf(month)}</span>
            <button
              type="button"
              className={styles.navBtn}
              aria-label={t('date.nextMonth')}
              disabled={month >= today.slice(0, 7)}
              onClick={() => shiftMonth(1)}
            >›</button>
          </div>
          <div className={styles.weekdays} aria-hidden="true">
            {Array.from({ length: WEEKDAY_COUNT }, (unused, index) => (
              <span className={styles.weekday} key={index}>{t('h.wd' + String(index))}</span>
            ))}
          </div>
          <div
            className={styles.grid}
            role="grid"
            tabIndex={0}
            aria-label={t('date.select')}
            aria-activedescendant={cursorId}
            onKeyDown={onGridKeyDown}
          >
            {weeksOf(month).map((week, weekIndex) => (
              <div className={styles.week} role="row" key={weekIndex}>
                {week.map((day, dayIndex) => {
                  if (day === null) return <span className={styles.cell + ' ' + styles.blank} key={dayIndex} />
                  return (
                    <span
                      key={dayIndex}
                      id={day === cursor ? cursorId : undefined}
                      role="gridcell"
                      aria-label={day}
                      aria-selected={day >= previewFrom && day <= previewTo}
                      aria-disabled={day > today}
                      className={cellClassOf(day)}
                      onMouseEnter={() => { if (pending !== null) setHovered(day) }}
                      onClick={() => pickDay(day)}
                    >{String(Number(day.slice(8, 10)))}</span>
                  )
                })}
              </div>
            ))}
          </div>
          <div className={styles.foot}>
            <span className={styles.hint}>{t(pending === null ? 'date.startHint' : 'date.endHint')}</span>
          </div>
        </div>
      )}
    </span>
  )
}
