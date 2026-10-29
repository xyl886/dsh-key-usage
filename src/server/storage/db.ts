/**
 * 统一存储：$DSH_HOME/dsh-key-usage/usage.db（SQLite，node-sqlite3-wasm 驱动）。
 *
 * 为什么用 wasm 驱动：插件服务端跑在宿主 Electron 进程里，原生 sqlite 模块的 ABI 对不上；
 * `node:sqlite` 在 Node 22 需要实验 flag（CI 就是 22），wasm 版在所有环境行为一致。
 *
 * 表设计原则：**快照按「段」存 JSON**（客户端要全量画图，拆明细表只增加迁移成本），
 * 价目按「行」存（构建时只查命中的模型，不必每次解析 2.7 MB），日志按行存（结构化查询 + 保留期）。
 * 所有端点响应结构不变，客户端零改动。
 */
import type { Database as DatabaseHandle } from 'node-sqlite3-wasm'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'

// node-sqlite3-wasm 是 CommonJS 包：ESM 的命名导入在 Node 里解析不到，运行时走 createRequire
const require = createRequire(import.meta.url)
const { Database } = require('node-sqlite3-wasm') as { Database: new (path: string) => DatabaseHandle }

export const STORAGE_FILE = 'usage.db'
export const STORAGE_SCHEMA_VERSION = 1
/** 日志保留天数（超期在写入后清理）。 */
export const LOG_RETENTION_DAYS = 30
/** 拒绝把日志写进非 db 路径（迁移前的 JSONL 也走同一套接口，靠这个守卫兜住）。 */
const LEGACY_LOG_FILE = 'plugin.log'
const LEGACY_SNAPSHOT_FILE = 'snapshot.json'
const LEGACY_PRICES_FILE = 'model-prices.json'
const LEGACY_FX_FILE = 'fx-rate.json'
const LEGACY_QUOTA_FILE = 'quota-snapshots.json'

export function storageDir(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-key-usage')
}

export function storagePath(): string {
  return join(storageDir(), STORAGE_FILE)
}

const connections = new Map<string, DatabaseHandle>()

/** 打开（并按需初始化）库；同一路径复用连接。测试传临时路径即可拿到独立库。 */
export function openStorage(path: string = storagePath()): DatabaseHandle {
  const key = resolve(path)
  const cached = connections.get(key)
  if (cached !== undefined) return cached
  mkdirSync(dirname(key), { recursive: true })
  const db = new Database(key)
  db.exec('PRAGMA journal_mode = DELETE; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = OFF;')
  createSchema(db)
  migrateLegacyFiles(db, dirname(key))
  connections.set(key, db)
  return db
}

export function closeStorage(path: string = storagePath()): void {
  const key = resolve(path)
  const db = connections.get(key)
  if (db === undefined) return
  try { db.close() } catch { /* 关闭失败不影响主流程 */ }
  connections.delete(key)
}

export function closeAllStorage(): void {
  for (const key of [...connections.keys()]) closeStorage(key)
}

function createSchema(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS snapshot_section (
      section TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS log_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL,
      level TEXT NOT NULL,
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      detail TEXT
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_log_time ON log_entry(id DESC);
    CREATE INDEX IF NOT EXISTS idx_log_level ON log_entry(level, id DESC);
    CREATE TABLE IF NOT EXISTS litellm_price (
      model_key TEXT PRIMARY KEY,
      vendor TEXT,
      model_name TEXT NOT NULL,
      input_per_token REAL,
      output_per_token REAL,
      cache_read_per_token REAL,
      cache_write_per_token REAL,
      raw TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_price_model_name ON litellm_price(model_name);
    CREATE INDEX IF NOT EXISTS idx_price_vendor ON litellm_price(vendor);
    CREATE TABLE IF NOT EXISTS litellm_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS fx_rate (
      base TEXT NOT NULL,
      quote TEXT NOT NULL,
      version INTEGER NOT NULL,
      rate REAL NOT NULL,
      fetched_at TEXT NOT NULL,
      upstream TEXT,
      PRIMARY KEY (base, quote)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS quota_seed (provider TEXT PRIMARY KEY, payload TEXT NOT NULL) STRICT;
  `)
}

// ===== meta =====

export function metaGet(db: DatabaseHandle, key: string): string | null {
  const row = db.get('SELECT value FROM meta WHERE key = ?', [key]) as unknown as { value: string } | undefined
  return row == null ? null : row.value
}

export function metaSet(db: DatabaseHandle, key: string, value: string): void {
  db.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value])
}

// ===== 快照（段级） =====

export interface StoredSection {
  section: string
  payload: string
  updatedAt: string
}

/** 读快照段；不传 sections 就是全部段。 */
export function readSnapshotSections(db: DatabaseHandle, sections?: readonly string[]): StoredSection[] {
  if (sections === undefined || sections.length === 0) {
    return db.all('SELECT section, payload, updated_at AS updatedAt FROM snapshot_section') as unknown as StoredSection[]
  }
  const placeholders = sections.map(() => '?').join(',')
  return db.all(
    `SELECT section, payload, updated_at AS updatedAt FROM snapshot_section WHERE section IN (${placeholders})`,
    [...sections],
  ) as unknown as StoredSection[]
}

/** 整份快照写入：每个段一行，一个事务（重建时全段替换）。 */
export function writeSnapshotSections(db: DatabaseHandle, entries: Array<{ section: string; payload: string }>, updatedAt: string): void {
  db.exec('BEGIN')
  try {
    db.run('DELETE FROM snapshot_section')
    for (const entry of entries) {
      db.run('INSERT INTO snapshot_section (section, payload, updated_at) VALUES (?, ?, ?)', [entry.section, entry.payload, updatedAt])
    }
    db.exec('COMMIT')
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* 回滚失败保持原状 */ }
    throw error
  }
}

export function clearSnapshotSections(db: DatabaseHandle): void {
  db.run('DELETE FROM snapshot_section')
}

// ===== 日志 =====

export interface StoredLogRecord {
  time: string
  level: string
  source: string
  message: string
  detail?: string
}

export function appendLogRows(db: DatabaseHandle, records: StoredLogRecord[]): number {
  if (records.length === 0) return 0
  db.exec('BEGIN')
  try {
    for (const record of records) {
      db.run('INSERT INTO log_entry (time, level, source, message, detail) VALUES (?, ?, ?, ?, ?)', [
        record.time,
        record.level,
        record.source,
        record.message,
        record.detail ?? null,
      ])
    }
    db.exec('COMMIT')
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* 回滚失败保持原状 */ }
    throw error
  }
  pruneLogRows(db)
  return records.length
}

/** 按保留期清理旧日志（每次写入后顺手做，代价可忽略）。 */
export function pruneLogRows(db: DatabaseHandle, days: number = LOG_RETENTION_DAYS): number {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()
  const before = countRows(db, 'log_entry')
  db.run('DELETE FROM log_entry WHERE time < ?', [cutoff])
  return before - countRows(db, 'log_entry')
}

export function readLogRows(db: DatabaseHandle, limit: number): StoredLogRecord[] {
  const rows = db.all(
    'SELECT time, level, source, message, detail FROM log_entry ORDER BY id DESC LIMIT ?',
    [limit],
  ) as unknown as StoredLogRecord[]
  return rows.reverse().map((row) => (row.detail === null ? { time: row.time, level: row.level, source: row.source, message: row.message } : row))
}

export function clearLogRows(db: DatabaseHandle): void {
  db.run('DELETE FROM log_entry')
}

export function countLogRows(db: DatabaseHandle): number {
  return countRows(db, 'log_entry')
}

function countRows(db: DatabaseHandle, table: 'log_entry'): number {
  const row = db.get(`SELECT COUNT(*) AS total FROM ${table}`) as unknown as { total: number } | undefined
  return row == null ? 0 : row.total
}

// ===== 聚合价目（行级） =====

export interface StoredPriceRow {
  modelKey: string
  vendor: string | null
  modelName: string
  inputPerToken: number | null
  outputPerToken: number | null
  cacheReadPerToken: number | null
  cacheWritePerToken: number | null
  raw: string
}

export function replacePriceRows(db: DatabaseHandle, rows: StoredPriceRow[], meta: Record<string, string>): void {
  db.exec('BEGIN')
  try {
    db.run('DELETE FROM litellm_price')
    for (const row of rows) {
      db.run(
        `INSERT INTO litellm_price
           (model_key, vendor, model_name, input_per_token, output_per_token, cache_read_per_token, cache_write_per_token, raw)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.modelKey, row.vendor, row.modelName, row.inputPerToken, row.outputPerToken, row.cacheReadPerToken, row.cacheWritePerToken, row.raw],
      )
    }
    db.run('DELETE FROM litellm_meta')
    for (const [key, value] of Object.entries(meta)) {
      db.run('INSERT INTO litellm_meta (key, value) VALUES (?, ?)', [key, value])
    }
    db.exec('COMMIT')
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* 回滚失败保持原状 */ }
    throw error
  }
}

export function readPriceRows(db: DatabaseHandle): StoredPriceRow[] {
  return db.all(
    `SELECT model_key AS modelKey, vendor, model_name AS modelName,
            input_per_token AS inputPerToken, output_per_token AS outputPerToken,
            cache_read_per_token AS cacheReadPerToken, cache_write_per_token AS cacheWritePerToken, raw
       FROM litellm_price`,
  ) as unknown as StoredPriceRow[]
}

export function readPriceMeta(db: DatabaseHandle): Record<string, string> {
  const rows = db.all('SELECT key, value FROM litellm_meta') as unknown as Array<{ key: string; value: string }>
  const meta: Record<string, string> = {}
  for (const row of rows) meta[row.key] = row.value
  return meta
}

export function clearPrices(db: DatabaseHandle): void {
  db.run('DELETE FROM litellm_price')
  db.run('DELETE FROM litellm_meta')
}

// ===== 汇率 =====

export interface StoredFxRow {
  base: string
  quote: string
  version: number
  rate: number
  fetchedAt: string
  upstream: string | null
}

export function replaceFxRow(db: DatabaseHandle, row: StoredFxRow): void {
  db.run(
    `INSERT INTO fx_rate (base, quote, version, rate, fetched_at, upstream) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(base, quote) DO UPDATE SET version = excluded.version, rate = excluded.rate,
       fetched_at = excluded.fetched_at, upstream = excluded.upstream`,
    [row.base, row.quote, row.version, row.rate, row.fetchedAt, row.upstream],
  )
}

export function readFxRow(db: DatabaseHandle): StoredFxRow | null {
  const row = db.get(
    'SELECT base, quote, version, rate, fetched_at AS fetchedAt, upstream FROM fx_rate ORDER BY fetched_at DESC LIMIT 1',
  ) as unknown as StoredFxRow | undefined
  return row == null ? null : row
}

export function clearFx(db: DatabaseHandle): void {
  db.run('DELETE FROM fx_rate')
}

// ===== 历史配额快照（只读种子） =====

export function readQuotaSeed(db: DatabaseHandle): Array<{ provider: string; payload: string }> {
  return db.all('SELECT provider, payload FROM quota_seed') as unknown as Array<{ provider: string; payload: string }>
}

// ===== 迁移：旧 JSON/JSONL 文件 → 库，然后移到回收目录 =====

function migrateLegacyFiles(db: DatabaseHandle, dir: string): void {
  if (metaGet(db, 'schema_version') !== null) return
  const imported: string[] = []
  if (tryImportLegacySnapshot(db, join(dir, LEGACY_SNAPSHOT_FILE))) imported.push(LEGACY_SNAPSHOT_FILE)
  if (tryImportLegacyLog(db, join(dir, LEGACY_LOG_FILE))) imported.push(LEGACY_LOG_FILE)
  if (tryImportLegacyPrices(db, join(dir, LEGACY_PRICES_FILE))) imported.push(LEGACY_PRICES_FILE)
  if (tryImportLegacyFx(db, join(dir, LEGACY_FX_FILE))) imported.push(LEGACY_FX_FILE)
  if (tryImportLegacyQuota(db, join(dir, LEGACY_QUOTA_FILE))) imported.push(LEGACY_QUOTA_FILE)
  metaSet(db, 'schema_version', String(STORAGE_SCHEMA_VERSION))
  metaSet(db, 'migrated_at', new Date().toISOString())
  moveLegacyFiles(dir, imported)
}

function readJsonFile(path: string): unknown | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown
  } catch {
    return null
  }
}

function tryImportLegacySnapshot(db: DatabaseHandle, path: string): boolean {
  const document = readJsonFile(path) as { sections?: Record<string, unknown>; updatedAt?: unknown } | null
  if (document === null || typeof document.sections !== 'object' || document.sections === null) return false
  const updatedAt = typeof document.updatedAt === 'string' ? document.updatedAt : new Date().toISOString()
  const entries = Object.entries(document.sections).map(([section, payload]) => ({ section, payload: JSON.stringify(payload) }))
  writeSnapshotSections(db, entries, updatedAt)
  return true
}

function tryImportLegacyLog(db: DatabaseHandle, path: string): boolean {
  let text = ''
  try { text = readFileSync(path, 'utf8') } catch { return false }
  const records: StoredLogRecord[] = []
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    try {
      const raw = JSON.parse(line) as Partial<StoredLogRecord>
      if (typeof raw.time !== 'string' || typeof raw.level !== 'string' || typeof raw.source !== 'string' || typeof raw.message !== 'string') continue
      records.push({ time: raw.time, level: raw.level, source: raw.source, message: raw.message, detail: typeof raw.detail === 'string' ? raw.detail : undefined })
    } catch { /* 坏行跳过 */ }
  }
  if (records.length === 0) return false
  appendLogRows(db, records)
  return true
}

function tryImportLegacyPrices(db: DatabaseHandle, path: string): boolean {
  const document = readJsonFile(path) as Record<string, unknown> | null
  if (document === null || typeof document !== 'object') return false
  const rows: StoredPriceRow[] = []
  for (const [modelKey, value] of Object.entries(document)) {
    if (modelKey === 'meta' || typeof value !== 'object' || value === null) continue
    const entry = value as Record<string, unknown>
    const nameOf = (key: string): number | null => (typeof entry[key] === 'number' ? entry[key] as number : null)
    const slash = modelKey.indexOf('/')
    rows.push({
      modelKey,
      vendor: slash > 0 ? modelKey.slice(0, slash) : null,
      modelName: slash > 0 ? modelKey.slice(slash + 1) : modelKey,
      inputPerToken: nameOf('input_cost_per_token'),
      outputPerToken: nameOf('output_cost_per_token'),
      cacheReadPerToken: nameOf('cache_read_input_token_cost'),
      cacheWritePerToken: nameOf('cache_creation_input_token_cost'),
      raw: JSON.stringify(value),
    })
  }
  if (rows.length === 0) return false
  const meta: Record<string, string> = {}
  const rawMeta = (document as { meta?: unknown }).meta
  if (typeof rawMeta === 'object' && rawMeta !== null) {
    for (const [key, value] of Object.entries(rawMeta as Record<string, unknown>)) {
      if (typeof value === 'string' || typeof value === 'number') meta[key] = String(value)
    }
  }
  meta.count = String(rows.length)
  replacePriceRows(db, rows, meta)
  return true
}

function tryImportLegacyFx(db: DatabaseHandle, path: string): boolean {
  const document = readJsonFile(path) as Record<string, unknown> | null
  if (document === null || typeof document !== 'object') return false
  const { base, quote, version, rate, fetchedAt, upstream } = document
  if (typeof base !== 'string' || typeof quote !== 'string' || typeof rate !== 'number' || typeof fetchedAt !== 'string') return false
  replaceFxRow(db, {
    base,
    quote,
    version: typeof version === 'number' ? version : 1,
    rate,
    fetchedAt,
    upstream: typeof upstream === 'string' ? upstream : null,
  })
  return true
}

function tryImportLegacyQuota(db: DatabaseHandle, path: string): boolean {
  const document = readJsonFile(path)
  if (document === null || typeof document !== 'object') return false
  const providers = (document as { providers?: unknown }).providers
  if (typeof providers !== 'object' || providers === null) return false
  for (const [provider, payload] of Object.entries(providers as Record<string, unknown>)) {
    db.run('INSERT OR REPLACE INTO quota_seed (provider, payload) VALUES (?, ?)', [provider, JSON.stringify(payload)])
  }
  return true
}

/**
 * 迁移完成后把旧文件移出数据目录。
 * 跨卷（C: 数据目录 → D: 回收站）rename 会报 EXDEV，所以先复制到回收目录，再把源文件同盘改名到
 * 数据目录下的 legacy-<日期> 子目录：顶层干净、数据留备份、不删除任何文件。
 */
function moveLegacyFiles(dir: string, files: string[]): void {
  if (files.length === 0) return
  const date = new Date().toISOString().slice(0, 10)
  const easyJobTrash = 'D:\\EasyJob\\.trash'
  const backupDir = existsSync(easyJobTrash) ? join(easyJobTrash, date + '-dsh-key-usage-legacy') : null
  const localLegacyDir = join(dir, 'legacy-' + date)
  try {
    mkdirSync(localLegacyDir, { recursive: true })
    if (backupDir !== null) mkdirSync(backupDir, { recursive: true })
    for (const file of files) {
      const from = join(dir, file)
      if (!existsSync(from)) continue
      if (backupDir !== null) {
        try { copyFileSync(from, join(backupDir, file)) } catch { /* 备份失败不阻塞改名 */ }
      }
      try {
        renameSync(from, join(localLegacyDir, file))
      } catch { /* 同盘改名失败就留在原地，不删数据 */ }
    }
  } catch { /* 迁移清理失败不影响运行：旧文件留着也不会再被读 */ }
}
