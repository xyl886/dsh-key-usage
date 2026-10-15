/**
 * 系统日志：内存环形缓冲 + 落盘（`POST/GET /dsh-key-usage/log`）+ 可导出文本。
 *
 * 界面只留结论，原因 / 上游 URL / 错误类型这类排查信息统一进这里；落盘是为了刷新页面后还能查上次为什么失败。
 * 本模块直接 `fetch` 日志端点（不绕 api.ts，避免循环依赖）；落盘失败一律静默 —— 日志自己刷屏就失去意义。
 * 记录来源（source）固定几个：`i18n`（缺词 / 回落）、`api`（请求失败）、`snapshot`（快照 issue）、
 * `pricing`（价目刷新）、`fx`（汇率）、`quota`（余额 / 窗口查询）、`ledger`（台账与快照读取）、`export`、`ui`。
 * 通知一律放到微任务：`t()` 可能在渲染中调用，同步通知订阅者会触发 React 的渲染期更新警告。
 */
export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  time: number
  level: LogLevel
  source: string
  message: string
  /** 排查详情（上游 URL、错误类型、耗时等）：界面默认只显示 message，展开或导出时可见。 */
  detail?: string
  /** 同一问题重复出现的次数（去重累加，避免刷屏）。 */
  count: number
  /** 失败条目的重试入口：日志窗里点「重试」直接再来一次，不用回去找按钮。 */
  retry?: () => void
}

const MAX_ENTRIES = 200
const LOG_PATH = '/dsh-key-usage/log'
/** 攒批间隔：1 秒内的连续失败合成一次 POST，避免每条日志一个请求。 */
const FLUSH_DELAY_MS = 1000
const READ_LIMIT = 500

let entries: LogEntry[] = []
let nextId = 1
let notifyQueued = false
let hydrated = false
let flushTimer: ReturnType<typeof setTimeout> | null = null
/** 本次会话新建 / 累加过的条目：只回写这些（从磁盘读回来的不再写回去，否则越读越多）。 */
const pending = new Map<number, LogEntry>()
/** 已经从磁盘读过的记录（按时间 + 内容去重）：重复读同一份文件不会把次数刷虚。 */
const storedKeys = new Set<string>()
const listeners = new Set<() => void>()
const openListeners = new Set<() => void>()

function notify(): void {
  if (notifyQueued) return
  notifyQueued = true
  queueMicrotask(() => {
    notifyQueued = false
    for (const listener of listeners) listener()
  })
}

function trim(): void {
  if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES)
}

/** 去重累加：同来源 + 同消息 + 同级别合并成一条（重试一次不该刷两屏）。 */
function fold(level: LogLevel, source: string, message: string, detail: string | undefined, time: number): LogEntry {
  const existing = entries.find((entry) => entry.source === source && entry.message === message && entry.level === level)
  if (existing !== undefined) {
    existing.count += 1
    if (time > existing.time) existing.time = time
    if (detail !== undefined) existing.detail = detail
    return existing
  }
  const entry: LogEntry = { id: nextId, time, level, source, message, detail, count: 1 }
  nextId += 1
  entries = [...entries, entry]
  return entry
}

function scheduleFlush(): void {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushLog()
  }, FLUSH_DELAY_MS)
}

/** 把待写条目发一批到磁盘；失败就丢掉这一批（内存里还看得到），不重试、不再记日志。 */
export async function flushLog(): Promise<void> {
  if (pending.size === 0) return
  const records = [...pending.values()].map((entry) => ({
    time: new Date(entry.time).toISOString(),
    level: entry.level,
    source: entry.source,
    message: entry.message,
    ...(entry.detail === undefined ? {} : { detail: entry.detail }),
  }))
  pending.clear()
  try {
    const response = await fetch(LOG_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ records }),
      keepalive: true,
    })
    if (!response.ok) throw new Error('HTTP ' + String(response.status))
  } catch {
    // 服务端还是旧版本 / 请求被拦：内存日志照常可用
  }
}

/** 页面打开时读回磁盘上的历史日志（只做一次）；没有端点或读失败都安静跳过。 */
export async function hydrateLog(): Promise<void> {
  if (hydrated) return
  hydrated = true
  await readFromDisk()
}

/** 日志窗的「刷新」：重新读一遍磁盘（已读过的记录按时间 + 内容去重，不重复计数）。 */
export async function refreshLog(): Promise<void> {
  hydrated = true
  await readFromDisk()
}

async function readFromDisk(): Promise<void> {
  try {
    const response = await fetch(LOG_PATH + '?limit=' + String(READ_LIMIT), { headers: { Accept: 'application/json' } })
    if (!response.ok) return
    const body = await response.json() as { records?: unknown }
    if (!Array.isArray(body.records)) return
    let changed = false
    /**
     * 同一条内容在文件里可能真的出现多次（同一次失败被记了两遍），所以去重键要带「第几次出现」：
     * 文件没变时重复读不会虚增，文件里两条一模一样的记录仍各自计入次数。
     */
    const occurrences = new Map<string, number>()
    for (const raw of body.records) {
      if (typeof raw !== 'object' || raw === null) continue
      const record = raw as { time?: unknown; level?: unknown; source?: unknown; message?: unknown; detail?: unknown }
      if (typeof record.message !== 'string' || record.message === '') continue
      const level: LogLevel = record.level === 'error' || record.level === 'warn' ? record.level : 'info'
      const time = typeof record.time === 'string' && Number.isFinite(Date.parse(record.time)) ? Date.parse(record.time) : Date.now()
      const source = typeof record.source === 'string' ? record.source : 'ui'
      const content = String(time) + '|' + level + '|' + source + '|' + record.message
      const nth = (occurrences.get(content) ?? 0) + 1
      occurrences.set(content, nth)
      const key = content + '#' + String(nth)
      if (storedKeys.has(key)) continue
      storedKeys.add(key)
      fold(level, source, record.message, typeof record.detail === 'string' ? record.detail : undefined, time)
      changed = true
    }
    if (!changed) return
    entries = [...entries].sort((first, second) => first.time - second.time)
    trim()
    notify()
  } catch {
    // 没有 /log 端点（服务端旧版本）时静默
  }
}

export function logPush(level: LogLevel, source: string, message: string, detail?: string, retry?: () => void): void {
  if (message === '') return
  const entry = fold(level, source, message, detail, Date.now())
  if (retry !== undefined) entry.retry = retry
  pending.set(entry.id, entry)
  trim()
  notify()
  scheduleFlush()
}

export function logInfo(source: string, message: string, detail?: string): void {
  logPush('info', source, message, detail)
}

export function logWarn(source: string, message: string, detail?: string): void {
  logPush('warn', source, message, detail)
}

export function logError(source: string, message: string, detail?: string, retry?: () => void): void {
  logPush('error', source, message, detail, retry)
}

export function logEntries(): LogEntry[] {
  return entries
}

export function subscribeLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** 清空：内存与磁盘一起清（磁盘失败就只清内存，界面行为不变）。 */
export function clearLog(): void {
  entries = []
  pending.clear()
  notify()
  void fetch(LOG_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ clear: true }),
  }).catch(() => undefined)
}

/** 页面上的「查看系统日志」入口：任何组件都能请求打开日志窗，不必层层传 prop。 */
export function requestOpenLog(): void {
  for (const listener of openListeners) listener()
}

export function subscribeOpenLog(listener: () => void): () => void {
  openListeners.add(listener)
  return () => { openListeners.delete(listener) }
}

/** 导出成纯文本（贴 issue 用）：带日期时间，详情缩进一行跟在条目后面，重复次数标 ×N。 */
export function logText(): string {
  return entries
    .flatMap((entry) => {
      const head = new Date(entry.time).toLocaleString('zh-CN', { hour12: false })
        + ' [' + entry.level + '] ' + entry.source + ' · ' + entry.message
        + (entry.count > 1 ? ' ×' + String(entry.count) : '')
      return entry.detail === undefined ? [head] : [head, '    ' + entry.detail]
    })
    .join('\n')
}

/** 同一类问题只记一次，避免刷屏（例如同一次渲染里同一个缺词被问很多遍）。 */
const onceKeys = new Set<string>()

export function logOnce(level: LogLevel, source: string, key: string, message: string): void {
  const dedupe = source + '|' + key
  if (onceKeys.has(dedupe)) return
  onceKeys.add(dedupe)
  logPush(level, source, message)
}

// 关页面 / 切后台时把没发出去的日志补一发（刷新页面不该丢掉刚看到的失败原因）
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { void flushLog() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushLog()
  })
}
