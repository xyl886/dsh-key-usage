/**
 * 实时汇率离线测试：全部用注入的 fetch 夹具，不发真实网络请求。
 * 运行：node test/fx-rate.test.mjs（依赖 lib/fx-rate.js 与 lib/routes.js，改 src 后要先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  FX_BACKUP_URL,
  FX_CACHE_FILE,
  FX_DEFAULT_RATE,
  FX_PRIMARY_URL,
  FX_TTL_HOURS,
  fxRatePath,
  readFxCache,
  resolveFxRate,
  writeFxCache,
} from '../lib/quota/fx-rate.js'
import { mountKeyUsageRoutes } from '../lib/routes.js'

const home = mkdtempSync(join(tmpdir(), 'dsh-key-usage-fx-'))
process.env.DSH_HOME = home
const cachePath = join(home, 'dsh-key-usage', FX_CACHE_FILE)
const pluginDir = join(home, 'dsh-key-usage')

/** 上游成功响应：`rates.CNY` 是唯一被采信的字段。 */
function okResponse(rate) {
  const body = JSON.stringify({ result: 'success', base: 'USD', rates: { USD: 1, CNY: rate, EUR: 0.9 } })
  return { ok: true, status: 200, headers: { get: () => null }, text: async () => body, body: null }
}

/** 记录调用顺序的 fetch 夹具，按调用次序消费预设结果（预设项可以是响应对象、'network' 或自定义实现）。 */
function fetchFixture(responses) {
  const calls = []
  const impl = async (url, init) => {
    calls.push(url)
    const response = responses.shift()
    if (response === undefined) throw new Error('夹具没有为这个 URL 准备响应：' + url)
    if (response === 'network') throw new Error('fixture network failure')
    if (typeof response === 'function') return await response(url, init)
    return response
  }
  return { impl, calls }
}

/** 永不返回、只在 abort 时 reject 的 fetch：验证超时路径（测试里用短超时）。 */
function hangingFetch() {
  return (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => {
      const error = new Error('aborted')
      error.name = 'AbortError'
      reject(error)
    })
  })
}

/** 直接落一份缓存文件（绕过写盘守卫，用来造「过期 / 坏文件」等初始状态）。 */
function seedCache(path, entry) {
  // 缓存存 SQLite：直接写库（与运行时同一条写入路径）
  writeFxCache(entry, path)
}

// ===== 1. 上游成功：主上游优先，成功即原子写缓存 =====
{
  assert.equal(readFxCache(cachePath).entry, null, '初始没有缓存')
  const { impl, calls } = fetchFixture([okResponse(7.15)])
  const view = await resolveFxRate({ fetchImpl: impl })
  assert.equal(view.ok, true)
  assert.equal(view.base, 'USD')
  assert.equal(view.quote, 'CNY')
  assert.equal(view.rate, 7.15)
  assert.equal(view.source, 'upstream')
  assert.equal(view.stale, false)
  assert.equal(view.upstream, FX_PRIMARY_URL)
  assert.equal(view.ttlHours, FX_TTL_HOURS)
  assert.equal(Number.isFinite(Date.parse(view.fetchedAt)), true, 'fetchedAt 是 ISO：' + view.fetchedAt)
  assert.ok(view.note.includes('open.er-api.com'), 'note 写明来源：' + view.note)
  assert.deepEqual(calls, [FX_PRIMARY_URL], '主上游成功后不再请求备上游')

  const written = readFxCache(cachePath).entry
  assert.equal(written.rate, 7.15)
  assert.equal(written.base, 'USD')
  assert.equal(written.quote, 'CNY')
  assert.equal(written.upstream, FX_PRIMARY_URL)
  assert.equal(written.fetchedAt, view.fetchedAt)
  assert.deepEqual(readdirSync(pluginDir), [FX_CACHE_FILE], '不残留临时文件')
  assert.equal(fxRatePath(), cachePath, '存储路径 = $DSH_HOME/dsh-key-usage/usage.db')
}

// ===== 2. 缓存命中：12 小时内直接吃缓存，一次网络都不发 =====
{
  const { impl, calls } = fetchFixture([])
  const view = await resolveFxRate({ fetchImpl: impl })
  assert.equal(view.rate, 7.15)
  assert.equal(view.source, 'cache', '12 小时内的缓存不联网')
  assert.equal(view.stale, false)
  assert.equal(view.upstream, null, '吃缓存时没有本次上游')
  assert.equal(calls.length, 0, '缓存命中时不许调 fetch')
  assert.ok(view.note.includes('缓存'), view.note)
}

// ===== 3. 缓存过期：超过 TTL 就要联网；上游不可用时回落并标 stale =====
{
  const path = join(home, 'expired.json')
  const fetchedAt = new Date(Date.now() - (FX_TTL_HOURS + 3) * 3600 * 1000).toISOString()
  seedCache(path, { version: 1, base: 'USD', quote: 'CNY', rate: 6.98, fetchedAt, upstream: FX_PRIMARY_URL })
  const { impl, calls } = fetchFixture(['network', 'network'])
  const view = await resolveFxRate({ fetchImpl: impl, path })
  assert.equal(view.ok, true)
  assert.equal(view.source, 'cache')
  assert.equal(view.rate, 6.98)
  assert.equal(view.stale, true, '超过 12 小时的缓存要标 stale')
  assert.equal(view.fetchedAt, fetchedAt, '原样带上缓存时间')
  assert.equal(calls.length, 2, '过期就要试一次上游（两个上游都失败）')
  assert.ok(view.note.includes('已超过'), 'note 说明缓存已过期：' + view.note)
}

// ===== 4. 主上游失败 → 备上游成功（顺序回落） =====
{
  const { impl, calls } = fetchFixture([{ ok: false, status: 503, headers: { get: () => null } }, okResponse(7.02)])
  const view = await resolveFxRate({ refresh: true, fetchImpl: impl, path: join(home, 'fresh-1.json') })
  assert.equal(view.source, 'upstream')
  assert.equal(view.rate, 7.02)
  assert.equal(view.upstream, FX_BACKUP_URL, '主上游失败后用 frankfurter')
  assert.deepEqual(calls, [FX_PRIMARY_URL, FX_BACKUP_URL])
}

// ===== 5. 上游超时（abort）→ 两个上游都试过，再降级 =====
{
  const { impl, calls } = fetchFixture([hangingFetch(), hangingFetch()])
  const view = await resolveFxRate({ refresh: true, fetchImpl: impl, path: join(home, 'fresh-2.json'), timeoutMs: 30 })
  assert.equal(view.ok, true)
  assert.equal(view.source, 'default', '没有缓存时用默认值兜底')
  assert.equal(view.rate, FX_DEFAULT_RATE)
  assert.equal(view.fetchedAt, null)
  assert.equal(view.upstream, null)
  assert.equal(view.stale, true)
  assert.equal(calls.length, 2, '两个上游各超时一次')
  assert.ok(view.note.includes('timeout'), 'note 写明超时原因：' + view.note)
  assert.ok(view.note.includes(String(FX_DEFAULT_RATE)), 'note 写明用的是默认汇率')
}

// ===== 6. 非 200 / 坏 JSON / 缺 rates.CNY / 超 64 KiB：都算失败 =====
{
  const cases = [
    {
      name: '非 200',
      responses: [{ ok: false, status: 429, headers: { get: () => null } }, { ok: false, status: 500, headers: { get: () => null } }],
      expect: 'http-429',
    },
    {
      name: '坏 JSON',
      responses: [
        { ok: true, status: 200, headers: { get: () => null }, text: async () => 'not-json', body: null },
        { ok: true, status: 200, headers: { get: () => null }, text: async () => '<html>', body: null },
      ],
      expect: 'bad-json',
    },
    {
      name: '缺 rates.CNY',
      responses: [
        { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ rates: { EUR: 0.9 } }), body: null },
        { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ error: 'nope' }), body: null },
      ],
      expect: 'bad-json',
    },
    {
      name: '内容超 64 KiB',
      responses: [
        { ok: true, status: 200, headers: { get: (name) => (name === 'content-length' ? String(70 * 1024) : null) }, text: async () => 'x', body: null },
        { ok: true, status: 200, headers: { get: () => null }, text: async () => 'y'.repeat(70 * 1024), body: null },
      ],
      expect: 'too-large',
    },
  ]
  for (const testCase of cases) {
    const target = join(home, 'fresh-case.json')
    const { impl, calls } = fetchFixture([...testCase.responses])
    const view = await resolveFxRate({ refresh: true, fetchImpl: impl, path: target })
    assert.equal(view.source, 'default', testCase.name + '：无缓存时用默认值')
    assert.equal(view.rate, FX_DEFAULT_RATE)
    assert.equal(calls.length, 2, testCase.name + '：两个上游都要试')
    assert.ok(view.note.includes(testCase.expect), testCase.name + '：note 要写清失败原因（' + view.note + '）')
    assert.equal(readFxCache(target).entry, null, testCase.name + '：失败不写缓存')
  }
}

// ===== 7. 数字字符串的 rates.CNY 也接受（上游结构漂移的防御） =====
{
  const { impl } = fetchFixture([okResponse('7.08')])
  const view = await resolveFxRate({ refresh: true, fetchImpl: impl, path: join(home, 'fresh-3.json') })
  assert.equal(view.rate, 7.08, '纯数字字符串按数字解析')
  assert.equal(view.source, 'upstream')
}

// ===== 8. refresh=1 强制上游：成功即覆盖缓存；失败则回落仍在 TTL 内的缓存 =====
{
  const { impl: freshImpl, calls: freshCalls } = fetchFixture([okResponse(7.33)])
  const refreshed = await resolveFxRate({ refresh: true, fetchImpl: freshImpl })
  assert.equal(freshCalls.length, 1, 'refresh=1 必须联网，哪怕缓存还在 TTL 内')
  assert.equal(refreshed.source, 'upstream')
  assert.equal(refreshed.rate, 7.33)
  assert.equal(readFxCache(cachePath).entry?.rate, 7.33, '成功即覆盖缓存')

  const { impl, calls } = fetchFixture(['network', 'network'])
  const fallback = await resolveFxRate({ refresh: true, fetchImpl: impl })
  assert.equal(fallback.source, 'cache', '强制刷新失败也要 ok:true')
  assert.equal(fallback.rate, 7.33)
  assert.equal(fallback.stale, false, '回落的缓存仍在 12 小时内 → 不算过期')
  assert.equal(calls.length, 2)
  assert.ok(fallback.note.includes('缓存'), fallback.note)
}

// ===== 5. 缓存数据一定是校验过的：非法内容进不了库，读到的永远是合法汇率 =====
{
  assert.equal(writeFxCache({ version: 1, base: 'USD', quote: 'CNY', rate: Number.NaN, fetchedAt: '2026-10-28T00:00:00.000Z', upstream: '' }, cachePath).ok, false, '非法汇率拒绝入库')
}
