/** 筛选工具栏：范围 / 自定义日期 / 分页滚动开关 / 重置 / 导出。状态与导出动作仍由页面持有。 */
import type { KeyboardEvent, MutableRefObject, ReactNode, RefObject } from 'react'
import { DateRangePicker } from './DateRangePicker.tsx'
import { Button } from './ui/Button.tsx'
import { t } from '../core/i18n.ts'
import type { RangeKey } from '../tabs/DetailTab.tsx'
import type { SessionsResponse, UsageResponse } from '../core/types.ts'
import styles from '../styles/shared.module.css'

export const RANGES: Array<[RangeKey, string]> = [
  ['today', 'r.today'],
  ['week', 'r.week'],
  ['month', 'r.month'],
  ['quarter', 'r.90days'],
  ['total', 'r.total'],
]

export function UsageFilters(props: {
  range: RangeKey
  onRangeChange: (key: RangeKey) => void
  customFrom: string
  customTo: string
  bounds: { from: string; to: string }
  onCustomRange: (from: string, to: string) => void
  paged: boolean
  onPagedChange: (paged: boolean) => void
  filtersActive: boolean
  onReset: () => void
  scopedUsage: UsageResponse | null
  sessions: SessionsResponse | null
  exportOpen: boolean
  onExportToggle: () => void
  onExportMenuKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => void
  exportMenuRef: RefObject<HTMLSpanElement>
  exportItemRefs: MutableRefObject<Array<HTMLButtonElement | null>>
  onExportUsage: () => void
  onExportSessions: () => void
}): ReactNode {
  const { range, customFrom, customTo, bounds, paged, filtersActive, scopedUsage, sessions, exportOpen } = props
  const setRange = props.onRangeChange
  const setPaged = props.onPagedChange
  const resetFilters = props.onReset
  const { exportMenuRef, exportItemRefs, onExportMenuKeyDown } = props
  return (
      <div className={styles.toolbarRow}>
        <span className={styles.toolbarGroup}>
          <span className={styles.rangeTabs}>
            {RANGES.map(([key, labelKey]) => (
              <button key={key} className={range === key ? styles.rangeTabActive : styles.rangeTab} onClick={() => setRange(key)}>{t(labelKey)}</button>
            ))}
          </span>
          <DateRangePicker
            from={range === 'custom' ? customFrom : bounds.from}
            to={range === 'custom' ? customTo : bounds.to}
            onChange={props.onCustomRange}
            active={range === 'custom'}
          />
        </span>
        <span className={styles.rowSpacer} />
        <label className={styles.modeSwitch} title={t('section.modeHint')}>
          <input type="checkbox" checked={!paged} onChange={(event) => setPaged(!event.target.checked)} />
          {paged ? t('section.paged') : t('section.scroll')}
        </label>
        <button
          type="button"
          className={styles.resetBtn}
          disabled={!filtersActive}
          onClick={resetFilters}
          title={t('action.resetFilters')}
          aria-label={t('action.resetFilters')}
        >{t('action.resetFilters')}</button>
        <span className={styles.exportMenu} ref={exportMenuRef}>
          <Button
            size="sm"
            className={styles.headBtn}
            disabled={scopedUsage === null && sessions === null}
            onClick={props.onExportToggle}
            ariaLabel={t('action.export')}
            title={t('action.export')}
          >{t('action.export')} ▾</Button>
          {exportOpen && (
            <span className={styles.exportPanel} role="menu" onKeyDown={onExportMenuKeyDown}>
              <button
                type="button"
                role="menuitem"
                ref={(element) => { exportItemRefs.current[0] = element }}
                className={styles.exportItem}
                disabled={scopedUsage === null}
                onClick={props.onExportUsage}
              >{t('action.exportUsage')}</button>
              <button
                type="button"
                role="menuitem"
                ref={(element) => { exportItemRefs.current[1] = element }}
                className={styles.exportItem}
                disabled={sessions === null}
                onClick={props.onExportSessions}
              >{t('action.exportSessions')}</button>
            </span>
          )}
        </span>
      </div>
  )
}
