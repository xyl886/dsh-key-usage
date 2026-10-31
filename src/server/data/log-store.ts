/**
 * 系统日志（存 `$DSH_HOME/dsh-key-usage/usage.db` 的 `log_entry` 表）。
 *
 * 为什么落库：界面上的失败原因原先只在内存里，刷新页面就没了 —— 排查时最需要的恰恰是「上次为什么失败」。
 * 保留期 30 天（写入后顺手清理）；单条字段与批量条数都设上限，客户端不能靠日志把库撑爆；
 * 读失败 / 写失败一律返回原因、绝不抛错 —— 日志坏掉不能影响主流程。
 */
import {
  appendLogRows,
  clearLogRows,
  LOG_RETENTION_DAYS,
  openStorage,
  pruneLogRows,
  readLogRows,
  storagePath,
  type LogQuery,
  type StoredLogRecord,
} from '../storage/db.js'

/** 存储文件名（`$DSH_HOME/dsh-key-usage/` 下唯一的可写目标）。 */
export const LOG_FILE = 'usage.db'
/** 单次批量写入的条数上限（客户端 1 秒一批，正常远小于这个数）。 */
export const LOG_APPEND_LIMIT = 200
/** 回读条数上限。 */
export const LOG_READ_LIMIT_MAX = 2000
/** 单条字段长度上限：消息与详情都不许塞进整段响应体。 */
export const LOG_MESSAGE_LIMIT = 400
export const LOG_DETAIL_LIMIT = 1200
/** 日志保留天数（与 `storage/db.ts` 的清理策略同一口径）。 */
export const LOG_KEEP_DAYS = LOG_RETENTION_DAYS

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogRecord {
  /** ISO 时间串（客户端给的本地时间，落库只做格式校验）。 */
  time: string
  level: LogLevel
  source: string
  message: string
  detail?: string
}

export function logFilePath(): string {
  return storagePath()
}

function clipped(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) + '…' : value
}

/** 客户端来的记录一律当不可信输入：形状不对就丢掉，不写坏库。 */
export function toLogRecord(raw: unknown): LogRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const source = raw as Record<string, unknown>
  const message = typeof source.message === 'string' ? source.message.trim() : ''
  if (message === '') return null
  const level = source.level === 'error' || source.level === 'warn' || source.level === 'info' ? source.level : 'info'
  const time = typeof source.time === 'string' && Number.isFinite(Date.parse(source.time))
    ? source.time
    : new Date().toISOString()
  const origin = typeof source.source === 'string' && source.source.trim() !== '' ? source.source.trim() : 'ui'
  const detail = typeof source.detail === 'string' && source.detail.trim() !== ''
    ? clipped(source.detail.trim(), LOG_DETAIL_LIMIT)
    : undefined
  return {
    time,
    level,
    source: clipped(origin, 32),
    message: clipped(message, LOG_MESSAGE_LIMIT),
    ...(detail === undefined ? {} : { detail }),
  }
}

function levelOf(value: string): LogLevel {
  return value === 'error' || value === 'warn' ? value : 'info'
}

/** 追加写入（超期记录顺带清理）。 */
export function appendLogRecords(records: unknown[], path: string = logFilePath()): { ok: true; written: number } | { ok: false; error: string } {
  const accepted: LogRecord[] = []
  for (const raw of records.slice(0, LOG_APPEND_LIMIT)) {
    const record = toLogRecord(raw)
    if (record !== null) accepted.push(record)
  }
  if (accepted.length === 0) return { ok: true, written: 0 }
  try {
    const written = appendLogRows(openStorage(path), accepted.map((record) => record as StoredLogRecord))
    return { ok: true, written }
  } catch (error) {
    return { ok: false, error: '写入日志失败：' + (error instanceof Error ? error.message : String(error)) }
  }
}

/** 回读最近 `limit` 条（按时间正序返回）；可按 level / source 过滤。 */
export function readLogRecords(limit: number = 500, path: string = logFilePath(), query: LogQuery = {}): LogRecord[] {
  const capped = Math.max(1, Math.min(limit, LOG_READ_LIMIT_MAX))
  try {
    const db = openStorage(path)
    // 打开日志窗时顺手清理过期记录：长期没新日志也不会一直留着旧条目
    try { pruneLogRows(db, LOG_KEEP_DAYS) } catch { /* 清理失败不影响读取 */ }
    return readLogRows(db, capped, query).map((row) => {
      const record: LogRecord = { time: row.time, level: levelOf(row.level), source: row.source, message: row.message }
      if (typeof row.detail === 'string') record.detail = row.detail
      return record
    })
  } catch {
    return []
  }
}

/** 清空日志。 */
export function clearLogFile(path: string = logFilePath()): { ok: true } | { ok: false; error: string } {
  try {
    clearLogRows(openStorage(path))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: '清空日志失败：' + (error instanceof Error ? error.message : String(error)) }
  }
}
