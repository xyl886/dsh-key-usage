/**
 * 系统日志面板：条数统计 + 级别 / 来源 / 搜索筛选 + 平铺条目。
 * 每条的 message 与详情直接展示（详情多行缩进、保留换行、不截断），不再需要点击展开。
 * 数据只来自 core/log.ts（内存 + 磁盘回读），动作与旧实现一致：刷新 / 复制 / 导出 / 清空。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { clearLog, logEntries, logTextOf, logWarn, refreshLog, subscribeLog, type LogEntry, type LogLevel } from '../core/log.ts'
import { useT } from '../core/i18n.ts'
import { TEXT_MIME, downloadFile, exportFileName } from '../core/export.ts'
import { Button } from './ui/Button.tsx'
import { Select } from './ui/Select.tsx'
import { EmptyState } from './ui/EmptyState.tsx'
import styles from '../styles/log.module.css'

type LevelFilter = 'all' | 'warn' | 'error'

const LEVEL_FILTERS: Array<{ value: LevelFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'log.filterAll' },
  { value: 'warn', labelKey: 'log.filterWarn' },
  { value: 'error', labelKey: 'log.filterError' },
]

/** 列表停在顶部附近时才跟随新条目，用户往下翻看历史时不被抢滚动位置。 */
const STICK_TOP_PX = 32

export function LogPanel(): ReactNode {
  const t = useT()
  /** `tick` 只用来打破 React 的引用相等短路：同一条重复出现只累加 ×N 时数组引用不变。 */
  const [snapshot, setSnapshot] = useState(() => ({ list: logEntries(), tick: 0 }))
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const newestRef = useRef<number | null>(null)

  useEffect(() => subscribeLog(() => {
    setSnapshot((previous) => ({ list: logEntries(), tick: previous.tick + 1 }))
  }), [])

  /** 来源下拉只列真实出现过的来源，去重后固定顺序，筛选时选项不跳。 */
  const sources = useMemo(() => {
    const seen = new Set<string>()
    for (const entry of snapshot.list) seen.add(entry.source)
    return [...seen].sort((first, second) => first.localeCompare(second))
  }, [snapshot.list])

  /** 时间倒序 + 级别 / 来源 / 搜索三条件过滤（搜索按消息 / 来源 / 详情模糊匹配）。 */
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...snapshot.list]
      .sort((first, second) => second.time - first.time)
      .filter((entry) => {
        if (levelFilter !== 'all' && entry.level !== levelFilter) return false
        if (sourceFilter !== '' && entry.source !== sourceFilter) return false
        if (query === '') return true
        return (entry.message + '\n' + entry.source + '\n' + (entry.detail ?? '')).toLowerCase().includes(query)
      })
  }, [snapshot.list, levelFilter, sourceFilter, search])

  /** 新条目出现时回到最新一条（列表时间倒序，最新在顶部）。 */
  useEffect(() => {
    const list = listRef.current
    if (list === null) return
    const newest = visible.length === 0 ? null : visible[0].id
    if (newest === newestRef.current) return
    if (list.scrollTop <= STICK_TOP_PX) list.scrollTop = 0
    newestRef.current = newest
  }, [visible])

  const onRefresh = (): void => {
    setRefreshing(true)
    // 刷新时把当前筛选带给服务端：筛选在库里生效，能查到最近 500 条之外的更早记录
    void refreshLog({ level: levelFilter === 'all' ? undefined : levelFilter, source: sourceFilter === '' ? undefined : sourceFilter }).finally(() => setRefreshing(false))
  }

  const onCopy = (): void => {
    navigator.clipboard?.writeText(logTextOf(visible)).catch(() => logWarn('export', t('log.copyBlocked'), 'clipboard'))
  }

  const onExport = (): void => {
    try {
      downloadFile(exportFileName('log', 'txt'), logTextOf(visible) + '\n', TEXT_MIME)
    } catch (error) {
      logWarn('export', t('log.exportBlocked'), error instanceof Error ? error.message : String(error))
    }
  }

  const onClear = (): void => {
    clearLog()
    setSourceFilter('')
  }

  const empty = visible.length === 0

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.count}>{t('log.count', { count: visible.length })}</span>
        <span className={styles.headActions}>
          <Button size="sm" disabled={refreshing} onClick={onRefresh}>{refreshing ? t('action.refreshing') : t('action.refresh')}</Button>
          <Button size="sm" disabled={snapshot.list.length === 0} onClick={onCopy}>{t('log.copy')}</Button>
          <Button size="sm" disabled={snapshot.list.length === 0} onClick={onExport}>{t('log.export')}</Button>
          <Button size="sm" disabled={snapshot.list.length === 0} onClick={onClear}>{t('log.clear')}</Button>
        </span>
      </div>

      <div className={styles.filters}>
        <span className={styles.levelGroup}>
          {LEVEL_FILTERS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              active={levelFilter === option.value}
              onClick={() => setLevelFilter(option.value)}
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </span>
        <Select
          ariaLabel={t('quota.sourceLabel')}
          value={sourceFilter}
          onChange={setSourceFilter}
          options={[{ value: '', labelKey: 'log.sourceAll' }, ...sources.map((source) => ({ value: source, label: source }))]}
        />
        <input
          className={styles.searchInput}
          type="search"
          aria-label={t('log.search')}
          placeholder={t('log.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {empty
        ? <EmptyState title={t('log.empty')} />
        : (
          <div className={styles.listScroll} ref={listRef}>
            <ul className={styles.list}>
              {visible.map((entry) => (
                <li key={entry.id} className={styles.row}>
                  <div className={styles.meta}>
                    <span className={styles.time}>{formatTime(entry.time)}</span>
                    <span className={styles.level + levelClass(entry.level)}>
                      <span className={styles.levelDot} aria-hidden="true" />
                      {entry.level.toUpperCase()}
                    </span>
                    <span className={styles.source}>{entry.source}</span>
                    {entry.retry === undefined ? null : (
                      <button type="button" className={styles.retry} onClick={() => { entry.retry?.() }}>{t('log.retry')}</button>
                    )}
                  </div>
                  <div className={styles.content}>
                    <span className={styles.message}>{messageTextOf(entry)}</span>
                    {entry.detail === undefined ? null : <pre className={styles.detail}>{entry.detail}</pre>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  )
}

/** 完整本地日期 + 时分秒：日志要跨天对照，只给时分秒看不出是哪一天。 */
function formatTime(time: number): string {
  const date = new Date(time)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return String(date.getFullYear()) + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

/** 重复次数跟在消息后面（去重累加后要能看出「发生过几次」）。 */
function messageTextOf(entry: LogEntry): string {
  return entry.message + (entry.count > 1 ? ' ×' + String(entry.count) : '')
}

/** 级别配色：错误红、警告黄、信息弱化（色点与色字同色）。 */
function levelClass(level: LogLevel): string {
  if (level === 'error') return ' ' + styles.levelError
  if (level === 'warn') return ' ' + styles.levelWarn
  return ''
}
