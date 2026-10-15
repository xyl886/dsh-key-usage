/**
 * 日期范围选择器（自建原语，零依赖）：触发按钮 + 日历弹层。
 *
 * 交互对齐 dsh-context 的同类控件：第一次点选开始日、第二次点选结束日并自动关闭；
 * 重开按已有范围回填；点外部或 Esc 关闭；范围两端实心、区间淡底。
 * 日期一律用 ISO 字符串（YYYY-MM-DD）在本地日历上计算，避免时区偏移。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isEnglish, t, useT } from '../../core/i18n.ts'
import styles from '../../styles/ui.module.css'

const WEEKDAY_WIDTH = 7
const CELLS = 42

/** ISO 日期 → 当天的本地 0 点（用本地日历，不用 UTC，避免跨时区串日）。 */
function parseIso(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (match === null) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function sameDay(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate()
}

export function DateRangePicker(props: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  ariaLabel: string
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pendingStart, setPendingStart] = useState<string | null>(null)
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const fromDate = parseIso(props.from)
  const toDate = parseIso(props.to)
  const [viewMonth, setViewMonth] = useState<Date>(() => fromDate ?? new Date())

  // 打开时把视图月对齐到已有范围的起点
  useEffect(() => {
    if (open && fromDate !== null) setViewMonth(new Date(fromDate.getFullYear(), fromDate.getMonth(), 1))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent): void => {
      if (anchorRef.current !== null && !anchorRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const days = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const offset = first.getDay()
    const start = addDays(first, -offset)
    return Array.from({ length: CELLS }, (_, index) => addDays(start, index))
  }, [viewMonth])

  const weekdays = isEnglish() ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['日', '一', '二', '三', '四', '五', '六']
  const monthTitle = isEnglish()
    ? viewMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : viewMonth.getFullYear() + '年' + String(viewMonth.getMonth() + 1) + '月'
  const rangeStart = pendingStart ?? props.from
  const rangeEnd = pendingStart === null ? props.to : ''
  const startDate = parseIso(rangeStart)
  const endDate = parseIso(rangeEnd)

  const pick = (day: Date): void => {
    const iso = toIso(day)
    if (pendingStart === null) {
      // 第一次点选：先把起点落下，等第二次点选终点
      if (startDate !== null && endDate !== null && sameDay(day, startDate)) { setPendingStart(null); return }
      setPendingStart(iso)
      return
    }
    const first = parseIso(pendingStart)
    if (first === null) { setPendingStart(iso); return }
    // 第二次点选：早于起点就交换，然后提交并关闭
    const [nextFrom, nextTo] = day < first ? [iso, pendingStart] : [pendingStart, iso]
    setPendingStart(null)
    setOpen(false)
    props.onChange(nextFrom, nextTo)
  }

  return (
    <span className={styles.datePicker} ref={anchorRef}>
      <button type="button" className={styles.control + ' ' + styles.dateTrigger} aria-label={props.ariaLabel} aria-expanded={open} onClick={() => { setPendingStart(null); setOpen((previous) => !previous) }}>
        <span className={props.from === '' && props.to === '' ? styles.dateTriggerEmpty : undefined}>
          {props.from === '' ? t('date.select') : props.from + ' → ' + (props.to === '' ? t('date.select') : props.to)}
        </span>
        <span className={styles.dateTriggerArrow} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className={styles.datePopover} role="dialog" aria-label={props.ariaLabel}>
          <div className={styles.dateHead}>
            <button type="button" className={styles.dateNav} aria-label={t('date.prevMonth')} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>‹</button>
            <span className={styles.dateTitle}>{monthTitle}</span>
            <button type="button" className={styles.dateNav} aria-label={t('date.nextMonth')} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>›</button>
          </div>
          <div className={styles.dateGrid}>
            {weekdays.map((label, index) => <span key={'w' + String(index)} className={styles.dateWeekday}>{label}</span>)}
            {days.map((day) => {
              const inMonth = day.getMonth() === viewMonth.getMonth()
              const isEdge = (startDate !== null && sameDay(day, startDate)) || (endDate !== null && sameDay(day, endDate))
              const inRange = startDate !== null && endDate !== null && day > startDate && day < endDate
              const className = [
                styles.dateCell,
                inMonth ? '' : styles.dateCellMuted,
                inRange ? styles.dateCellInRange : '',
                isEdge ? styles.dateCellEdge : '',
              ].filter((part) => part !== '').join(' ')
              return (
                <button type="button" key={toIso(day)} className={className} onClick={() => pick(day)} tabIndex={-1}>
                  {day.getDate()}
                </button>
              )
            })}
          </div>
          <div className={styles.dateFoot}>
            <span className={styles.dateHint}>{pendingStart === null ? t('date.startHint') : t('date.endHint')}</span>
            <button
              type="button"
              className={styles.dateClear}
              onClick={() => { setPendingStart(null); setOpen(false); props.onChange('', '') }}
            >
              {t('date.clear')}
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
