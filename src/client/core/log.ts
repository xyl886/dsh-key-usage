/**
 * 系统日志（内存环形缓冲）：给「出问题时能看见原因」用。
 *
 * 只存在内存里 —— 插件不许写第四个文件，日志也就不落盘；关掉页面即清空。
 * 记录来源（source）固定几个：`i18n`（缺词 / 回落）、`api`（请求失败）、`snapshot`（快照 issue）、`ui`（其它）。
 * 通知一律放到微任务：`t()` 可能在渲染中调用，同步通知订阅者会触发 React 的渲染期更新警告。
 */
export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  time: number
  level: LogLevel
  source: string
  message: string
}

const MAX_ENTRIES = 200
let entries: LogEntry[] = []
let nextId = 1
let notifyQueued = false
const listeners = new Set<() => void>()

function notify(): void {
  if (notifyQueued) return
  notifyQueued = true
  queueMicrotask(() => {
    notifyQueued = false
    for (const listener of listeners) listener()
  })
}

export function logPush(level: LogLevel, source: string, message: string): void {
  if (message === '') return
  entries = [...entries, { id: nextId, time: Date.now(), level, source, message }]
  nextId += 1
  if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES)
  notify()
}

export function logInfo(source: string, message: string): void {
  logPush('info', source, message)
}

export function logWarn(source: string, message: string): void {
  logPush('warn', source, message)
}

export function logError(source: string, message: string): void {
  logPush('error', source, message)
}

export function logEntries(): LogEntry[] {
  return entries
}

export function subscribeLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function clearLog(): void {
  entries = []
  notify()
}

/** 导出成纯文本，便于贴到 issue 里。 */
export function logText(): string {
  return entries
    .map((entry) => new Date(entry.time).toLocaleTimeString('zh-CN', { hour12: false }) + ' [' + entry.level + '] ' + entry.source + ': ' + entry.message)
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
