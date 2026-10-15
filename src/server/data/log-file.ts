/**
 * 系统日志落盘（`$DSH_HOME/dsh-key-usage/plugin.log`，一行一条 JSON）。
 *
 * 为什么落盘：界面上的失败原因原先只在内存里，刷新页面就没了 —— 排查时最需要的恰恰是「上次为什么失败」。
 * 约束：只写插件自己的文件（写目标按文件名 + 绝对路径双重校验，与快照 / 价目 / 汇率同一套规矩）；
 * 超过上限保留后半段，避免无限增长；单条字段与批量条数都设上限，客户端不能靠日志把文件撑爆；
 * 读失败 / 写失败一律返回原因、绝不抛错 —— 日志坏掉不能影响主流程。
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

/** 日志文件名（`$DSH_HOME/dsh-key-usage/` 下，唯一的日志目标）。 */
export const LOG_FILE = 'plugin.log'
/** 文件上限：超过就保留后半段（约等于最近一半的排查记录）。 */
export const LOG_MAX_BYTES = 512 * 1024
/** 单次批量写入的条数上限（客户端 1 秒一批，正常远小于这个数）。 */
export const LOG_APPEND_LIMIT = 200
/** 回读条数上限。 */
export const LOG_READ_LIMIT_MAX = 2000
/** 单条字段长度上限：消息与详情都不许塞进整段响应体。 */
export const LOG_MESSAGE_LIMIT = 400
export const LOG_DETAIL_LIMIT = 1200

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogRecord {
  /** ISO 时间串（客户端给的本地时间，落盘只做格式校验）。 */
  time: string
  level: LogLevel
  source: string
  message: string
  detail?: string
}

export function logFilePath(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-key-usage', LOG_FILE)
}

/** 写目标守卫：文件名 + 绝对路径都要对得上（Windows 路径大小写不敏感）。 */
function writableTargetProblem(path: string): string | null {
  if (basename(path) !== LOG_FILE) return '只允许写 ' + LOG_FILE + '（当前目标：' + path + '）'
  if (resolve(path).toLowerCase() !== resolve(logFilePath()).toLowerCase()) {
    return '只允许写 $DSH_HOME/dsh-key-usage/' + LOG_FILE + '（当前目标：' + path + '）'
  }
  return null
}

function clipped(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) + '…' : value
}

/** 客户端来的记录一律当不可信输入：形状不对就丢掉，不写坏文件。 */
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

/**
 * 追加写入：超过上限就保留后半段。
 * 先落盘再轮转（顺序反了会丢掉刚写进去的那批），轮转走临时文件 + rename。
 */
export function appendLogRecords(records: unknown[], path: string = logFilePath()): { ok: true; written: number } | { ok: false; error: string } {
  const problem = writableTargetProblem(path)
  if (problem !== null) return { ok: false, error: problem }
  const accepted: LogRecord[] = []
  for (const raw of records.slice(0, LOG_APPEND_LIMIT)) {
    const record = toLogRecord(raw)
    if (record !== null) accepted.push(record)
  }
  if (accepted.length === 0) return { ok: true, written: 0 }
  try {
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, accepted.map((record) => JSON.stringify(record) + '\n').join(''), 'utf8')
    rotateIfTooLarge(path)
  } catch (error) {
    return { ok: false, error: '写入日志失败：' + (error instanceof Error ? error.message : String(error)) }
  }
  return { ok: true, written: accepted.length }
}

/** 超过上限就只留后半段：日志是环形缓冲的磁盘版，老记录本来也没人看。 */
function rotateIfTooLarge(path: string): void {
  let size = 0
  try { size = statSync(path).size } catch { return }
  if (size <= LOG_MAX_BYTES) return
  const lines = readFileSync(path, 'utf8').split('\n').filter((line) => line.trim() !== '')
  const kept = lines.slice(Math.floor(lines.length / 2))
  const temporaryPath = path + '.tmp'
  writeFileSync(temporaryPath, kept.join('\n') + '\n', 'utf8')
  renameSync(temporaryPath, path)
}

/** 回读最近 `limit` 条；文件不存在、单行坏掉都安静跳过。 */
export function readLogRecords(limit: number = 500, path: string = logFilePath()): LogRecord[] {
  const capped = Math.max(1, Math.min(limit, LOG_READ_LIMIT_MAX))
  let text = ''
  try { text = readFileSync(path, 'utf8') } catch { return [] }
  const records: LogRecord[] = []
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    let parsed: unknown
    try { parsed = JSON.parse(line) } catch { continue }
    const record = toLogRecord(parsed)
    if (record !== null) records.push(record)
  }
  return records.slice(Math.max(0, records.length - capped))
}

/** 清空日志：临时文件 + rename，和写入同一套写法。 */
export function clearLogFile(path: string = logFilePath()): { ok: true } | { ok: false; error: string } {
  const problem = writableTargetProblem(path)
  if (problem !== null) return { ok: false, error: problem }
  try {
    mkdirSync(dirname(path), { recursive: true })
    const temporaryPath = path + '.tmp'
    writeFileSync(temporaryPath, '', 'utf8')
    renameSync(temporaryPath, path)
  } catch (error) {
    return { ok: false, error: '清空日志失败：' + (error instanceof Error ? error.message : String(error)) }
  }
  return { ok: true }
}
