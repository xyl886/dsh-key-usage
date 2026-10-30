/**
 * 存储层：schema 2 → 3 的元信息迁移（meta / litellm_meta → app_meta）。
 * 只依赖 lib/storage/db.js，跑之前需要 npm run build:server。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire('D:/EasyJob/.plugin/dsh-key-usage/package.json')
const { Database } = require('node-sqlite3-wasm')

const storage = await import('../lib/storage/db.js')

const dir = mkdtempSync(join(tmpdir(), 'dsh-ku-meta-'))
const path = join(dir, 'usage.db')

// 先造一个 schema 2 的旧库：只有 meta / litellm_meta 两张表
const legacy = new Database(path)
legacy.exec(`
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
  CREATE TABLE litellm_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
`)
legacy.run('INSERT INTO meta (key, value) VALUES (?, ?)', ['schema_version', '2'])
legacy.run('INSERT INTO meta (key, value) VALUES (?, ?)', ['document_version', '7'])
legacy.run('INSERT INTO litellm_meta (key, value) VALUES (?, ?)', ['count', '4120'])
legacy.run('INSERT INTO litellm_meta (key, value) VALUES (?, ?)', ['sha256', 'abc123'])
legacy.close()

const db = storage.openStorage(path)
// 迁移后：旧键仍可读（metaGet 走 app scope），新表里有同一批键
assert.equal(storage.metaGet(db, 'document_version'), '7', '旧 meta 键迁移后可读')
assert.equal(storage.metaGet(db, 'schema_version'), String(storage.STORAGE_SCHEMA_VERSION), '打开库时刷新 schema_version')
const priceMeta = storage.readPriceMeta(db)
assert.equal(priceMeta.count, '4120', '价目元信息迁移后可读')
assert.equal(priceMeta.sha256, 'abc123')

// 写一条新元信息：只落 app_meta，且带上 version / source
storage.dictSet(db, 'litellm', 'fetchedAt', '2026-10-30T00:00:00.000Z', { version: 2, source: 'manual' })
assert.equal(storage.dictGet(db, 'litellm', 'fetchedAt'), '2026-10-30T00:00:00.000Z')
const rows = db.all("SELECT scope, key, value, version, source FROM app_meta WHERE key = 'fetchedAt'")
assert.deepEqual(rows, [{ scope: 'litellm', key: 'fetchedAt', value: '2026-10-30T00:00:00.000Z', version: 2, source: 'manual' }])

// 再打开一次不应重复迁移（幂等）
storage.closeStorage(path)
const reopened = storage.openStorage(path)
assert.equal(storage.dictGet(reopened, 'app', 'document_version'), '7', '重复打开保持数据')
assert.equal(storage.dictAll(reopened, 'litellm').count, '4120')
storage.closeStorage(path)

rmSync(dir, { recursive: true, force: true })
console.log('db: schema 2 → 3 元信息迁移通过')
