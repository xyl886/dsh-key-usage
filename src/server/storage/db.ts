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
export const STORAGE_SCHEMA_VERSION = 3
/** 日志保留天数（超期在写入后清理）。 */
export const LOG_RETENTION_DAYS = 30
/** 拒绝把日志写进非 db 路径（迁移前的 JSONL 也走同一套接口，靠这个守卫兜住）。 */
const LEGACY_LOG_FILE = 'plugin.log'
const LEGACY_SNAPSHOT_FILE = 'snapshot.json'
const LEGACY_PRICES_FILE = 'model-prices.json'
const LEGACY_FX_FILE = 'fx-rate.json'
const LEGACY_QUOTA_FILE = 'quota-snapshots.json'

export function storageDir(): string {
  // DSH_HOME 可能是空串（只判 null/undefined 会拼出相对路径，打开到别处的同名文件）
  const home = process.env.DSH_HOME?.trim()
  return join(home !== undefined && home !== '' ? home : join(homedir(), '.dsh'), 'dsh-key-usage')
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
  migrateMetaToAppMeta(db)
  ensurePriceColumns(db)
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
      mode TEXT,
      input_per_token REAL,
      output_per_token REAL,
      cache_read_per_token REAL,
      cache_write_per_token REAL,
      raw TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_price_model_name ON litellm_price(model_name);
    CREATE INDEX IF NOT EXISTS idx_price_vendor ON litellm_price(vendor);
    CREATE TABLE IF NOT EXISTS litellm_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
    -- 运行期元信息统一表：scope 划分来源域（app / litellm / snapshot），meta 与 litellm_meta 两个旧表只保留双写一轮
    CREATE TABLE IF NOT EXISTS app_meta (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      source TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (scope, key)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_app_meta_scope ON app_meta(scope, updated_at DESC);
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

/**
 * schema 2 → 3：把 meta（scope=app）与 litellm_meta（scope=litellm）搬进 app_meta。
 * 只在 app_meta 为空时搬一次；旧表保留原样（双写一轮，下一版再删），搬失败不影响读写主流程。
 */
function migrateMetaToAppMeta(db: DatabaseHandle): void {
  try {
    const row = db.get('SELECT COUNT(*) AS n FROM app_meta') as unknown as { n: number }
    if (row.n > 0) return
    const now = new Date().toISOString()
    db.exec('BEGIN')
    try {
      db.run('INSERT INTO app_meta (scope, key, value, version, source, updated_at) SELECT ?, key, value, 0, NULL, ? FROM meta', ['app', now])
      db.run('INSERT INTO app_meta (scope, key, value, version, source, updated_at) SELECT ?, key, value, 0, NULL, ? FROM litellm_meta', ['litellm', now])
      db.exec('COMMIT')
    } catch (error) {
      try { db.exec('ROLLBACK') } catch { /* 回滚失败保持原状 */ }
      throw error
    }
  } catch { /* 迁移失败保持旧表读取路径，下次打开再试 */ }
}

/** 旧库补列（schema 1 → 2）：`mode` 是装载优化用的派生列，缺了就加，不动已有数据。 */
function ensurePriceColumns(db: DatabaseHandle): void {
  const columns = db.all('PRAGMA table_info(litellm_price)') as unknown as Array<{ name: string }>
  const hasMode = columns.some((column) => column.name === 'mode')
  if (hasMode) {
    metaSet(db, 'schema_version', String(STORAGE_SCHEMA_VERSION))
    return
  }
  try {
    db.exec('ALTER TABLE litellm_price ADD COLUMN mode TEXT')
    // 从 raw 回填 mode（只做一次）：不回填的话装载时按空 mode 过滤，聚合价整层会失效。
    // 必须包在一个事务里：逐行自动提交等于每行一次 fsync，4120 行实测要 17 秒。
    const pending = db.all('SELECT model_key AS modelKey, raw FROM litellm_price WHERE mode IS NULL') as unknown as Array<{ modelKey: string; raw: string }>
    db.exec('BEGIN')
    try {
      for (const row of pending) {
        try {
          const value = JSON.parse(row.raw) as { mode?: unknown }
          if (typeof value.mode === 'string') db.run('UPDATE litellm_price SET mode = ? WHERE model_key = ?', [value.mode, row.modelKey])
        } catch { /* 坏行跳过 */ }
      }
      db.exec('COMMIT')
    } catch {
      try { db.exec('ROLLBACK') } catch { /* 回滚失败保持原状 */ }
    }
    metaSet(db, 'schema_version', String(STORAGE_SCHEMA_VERSION))
  } catch { /* 加列失败保持旧版本号，下次再试 */ }
}

// ===== meta =====

/** 从统一元信息表取一条（scope 缺省为 app）。 */
export function dictGet(db: DatabaseHandle, scope: string, key: string): string | null {
  const row = db.get('SELECT value FROM app_meta WHERE scope = ? AND key = ?', [scope, key]) as unknown as { value: string } | undefined
  return row == null ? null : row.value
}

/** 取某个 scope 的全部元信息（键值对）。 */
export function dictAll(db: DatabaseHandle, scope: string): Record<string, string> {
  const rows = db.all('SELECT key, value FROM app_meta WHERE scope = ?', [scope]) as unknown as Array<{ key: string; value: string }>
  const values: Record<string, string> = {}
  for (const row of rows) values[row.key] = row.value
  return values
}

/** 写一条元信息：value 是原文，source 记来源（上游 URL / etag / commit），version 由调用方递增。 */
export function dictSet(
  db: DatabaseHandle,
  scope: string,
  key: string,
  value: string,
  options: { version?: number; source?: string | null } = {},
): void {
  db.run(
    `INSERT INTO app_meta (scope, key, value, version, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value, version = excluded.version,
       source = excluded.source, updated_at = excluded.updated_at`,
    [scope, key, value, options.version ?? 0, options.source ?? null, new Date().toISOString()],
  )
}

/** 整体替换某个 scope 的元信息（价目快照这类「一次性快照」用）。 */
export function dictReplaceScope(
  db: DatabaseHandle,
  scope: string,
  values: Record<string, string>,
  options: { version?: number; source?: string | null } = {},
): void {
  db.run('DELETE FROM app_meta WHERE scope = ?', [scope])
  for (const [key, value] of Object.entries(values)) dictSet(db, scope, key, value, options)
}

/** 旧调用点沿用：键走 app_meta 的 app scope，读不到时回落旧 meta 表（迁移后半拍）。 */
export function metaGet(db: DatabaseHandle, key: string): string | null {
  const value = dictGet(db, 'app', key)
  if (value !== null) return value
  const row = db.get('SELECT value FROM meta WHERE key = ?', [key]) as unknown as { value: string } | undefined
  return row == null ? null : row.value
}

export function metaSet(db: DatabaseHandle, key: string, value: string): void {
  dictSet(db, 'app', key, value)
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

export interface LogQuery {
  /** 只要这一档；不传表示全部。 */
  level?: string
  /** 只要这个来源；不传表示全部。 */
  source?: string
  /** 时间游标（毫秒）：只取比它更早的记录，用于日志窗向前翻页。 */
  before?: number
}

/** 读日志：可按 level / source 过滤（两列都有索引），筛选时能查到 limit 之外的更早记录。 */
export function readLogRows(db: DatabaseHandle, limit: number, query: LogQuery = {}): StoredLogRecord[] {
  const where: string[] = []
  const params: Array<string | number> = []
  if (query.level !== undefined && query.level !== '') {
    where.push('level = ?')
    params.push(query.level)
  }
  if (query.source !== undefined && query.source !== '') {
    where.push('source = ?')
    params.push(query.source)
  }
  if (query.before !== undefined && Number.isFinite(query.before)) {
    where.push('time < ?')
    params.push(query.before)
  }
  params.push(limit)
  const clause = where.length === 0 ? '' : ' WHERE ' + where.join(' AND ')
  const rows = db.all(
    'SELECT time, level, source, message, detail FROM log_entry' + clause + ' ORDER BY id DESC LIMIT ?',
    params,
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
  /** 上游条目的 mode（chat / completion / …）：装载时用它筛会话模型，不必解析 raw。 */
  mode: string | null
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
           (model_key, vendor, model_name, mode, input_per_token, output_per_token, cache_read_per_token, cache_write_per_token, raw)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.modelKey, row.vendor, row.modelName, row.mode, row.inputPerToken, row.outputPerToken, row.cacheReadPerToken, row.cacheWritePerToken, row.raw],
      )
    }
    // 新表为唯一读源；旧 litellm_meta 双写一轮，等下一版删表
    db.run('DELETE FROM litellm_meta')
    for (const [key, value] of Object.entries(meta)) {
      db.run('INSERT INTO litellm_meta (key, value) VALUES (?, ?)', [key, value])
    }
    db.run('DELETE FROM app_meta WHERE scope = ?', ['litellm'])
    const version = Number(meta.version ?? 0)
    const source = meta.upstream ?? meta.sha256 ?? null
    for (const [key, value] of Object.entries(meta)) {
      db.run(
        `INSERT INTO app_meta (scope, key, value, version, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value, version = excluded.version,
           source = excluded.source, updated_at = excluded.updated_at`,
        ['litellm', key, value, Number.isFinite(version) ? version : 0, source, new Date().toISOString()],
      )
    }
    db.exec('COMMIT')
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* 回滚失败保持原状 */ }
    throw error
  }
}

export function readPriceRows(db: DatabaseHandle): StoredPriceRow[] {
  return db.all(
    `SELECT model_key AS modelKey, vendor, model_name AS modelName, mode,
            input_per_token AS inputPerToken, output_per_token AS outputPerToken,
            cache_read_per_token AS cacheReadPerToken, cache_write_per_token AS cacheWritePerToken, raw
       FROM litellm_price`,
  ) as unknown as StoredPriceRow[]
}

export function readPriceMeta(db: DatabaseHandle): Record<string, string> {
  const meta = dictAll(db, 'litellm')
  if (Object.keys(meta).length > 0) return meta
  const rows = db.all('SELECT key, value FROM litellm_meta') as unknown as Array<{ key: string; value: string }>
  for (const row of rows) meta[row.key] = row.value
  return meta
}

export function clearPrices(db: DatabaseHandle): void {
  db.run('DELETE FROM litellm_price')
  db.run('DELETE FROM litellm_meta')
  db.run('DELETE FROM app_meta WHERE scope = ?', ['litellm'])
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
      mode: typeof entry.mode === 'string' ? entry.mode : null,
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
