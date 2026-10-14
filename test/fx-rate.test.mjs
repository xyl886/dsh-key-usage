/**
 * 实时汇率（USD → CNY）离线测试：注入 fetch 夹具，覆盖上游成功 / 主上游失败回落备上游 /
 * 超时 / 非 200 / 坏 JSON / 缺 rates.CNY / 超 64 KiB / 缓存命中（不联网）/ 缓存过期回落 /
 * 默认兜底 / `refresh=1` 强制 / 写盘守卫与写失败降级 / 回环端点。全程不发真实网络请求。
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
} from '../lib/fx-rate.js'
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
  mkdirSync(join(home, 'dsh-key-usage'), { recursive: true })
  writeFileSync(path, JSON.stringify(entry), 'utf8')
}

// ===== 1. 上游成功：主上游优先，成功即原子写缓存 =====
{
  assert.equal(existsSync(cachePath), false, '初始没有缓存文件')
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

  const written = JSON.parse(readFileSync(cachePath, 'utf8'))
  assert.equal(written.rate, 7.15)
  assert.equal(written.base, 'USD')
  assert.equal(written.quote, 'CNY')
  assert.equal(written.upstream, FX_PRIMARY_URL)
  assert.equal(written.fetchedAt, view.fetchedAt)
  assert.deepEqual(readdirSync(pluginDir), [FX_CACHE_FILE], '不残留临时文件')
  assert.equal(fxRatePath(), cachePath, '缓存路径 = $DSH_HOME/dsh-key-usage/fx-rate.json')
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
    assert.equal(existsSync(target), false, testCase.name + '：失败不写缓存')
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
  assert.equal(JSON.parse(readFileSync(cachePath, 'utf8')).rate, 7.33, '成功即覆盖缓存')

  const { impl, calls } = fetchFixture(['network', 'network'])
  const fallback = await resolveFxRate({ refresh: true, fetchImpl: impl })
  assert.equal(fallback.source, 'cache', '强制刷新失败也要 ok:true')
  assert.equal(fallback.rate, 7.33)
  assert.equal(fallback.stale, false, '回落的缓存仍在 12 小时内 → 不算过期')
  assert.equal(calls.length, 2)
  assert.ok(fallback.note.includes('缓存'), fallback.note)
}

// ===== 9. 坏缓存文件：当作没有缓存，但 note 要说清 =====
{
  const path = join(home, 'broken.json')
  writeFileSync(path, '{oops', 'utf8')
  const read = readFxCache(path)
  assert.equal(read.entry, null)
  assert.ok(read.problem.includes('不是合法 JSON'), read.problem)
  const { impl } = fetchFixture(['network', 'network'])
  const view = await resolveFxRate({ refresh: true, fetchImpl: impl, path })
  assert.equal(view.source, 'default')
  assert.ok(view.note.includes('不是合法 JSON'), '坏文件的原因要透出：' + view.note)

  // 缺 rate / fetchedAt 的缓存同样视为不可用
  writeFileSync(path, JSON.stringify({ version: 1, base: 'USD' }), 'utf8')
  const incomplete = readFxCache(path)
  assert.equal(incomplete.entry, null)
  assert.ok(incomplete.problem.includes('rate'), incomplete.problem)

  // 文件不存在是正常状态（还没成功查过），不给 problem
  const missing = readFxCache(join(home, 'never-written.json'))
  assert.deepEqual(missing, { entry: null, problem: null })
}

// ===== 10. 写盘守卫：只允许 $DSH_HOME/dsh-key-usage/fx-rate.json =====
{
  mkdirSync(pluginDir, { recursive: true })
  const entry = { version: 1, base: 'USD', quote: 'CNY', rate: 7, fetchedAt: new Date().toISOString(), upstream: FX_PRIMARY_URL }

  const wrongName = writeFxCache(entry, join(pluginDir, 'other.json'))
  assert.equal(wrongName.ok, false)
  assert.ok(wrongName.error.includes(FX_CACHE_FILE), wrongName.error)
  assert.equal(existsSync(join(pluginDir, 'other.json')), false)

  const wrongDir = writeFxCache(entry, join(home, FX_CACHE_FILE))
  assert.equal(wrongDir.ok, false, '同名但不在插件目录下也要拒绝')
  assert.ok(wrongDir.error.includes('dsh-key-usage'), wrongDir.error)
  assert.equal(existsSync(join(home, FX_CACHE_FILE)), false)

  const nested = writeFxCache(entry, join(pluginDir, 'nested', FX_CACHE_FILE))
  assert.equal(nested.ok, false, '不能写子目录')

  // 写盘失败不影响返回值：让守卫拦住写入，但显示仍要 ok:true 并在 note 里说明
  const { impl } = fetchFixture([okResponse(7.4)])
  const view = await resolveFxRate({ refresh: true, fetchImpl: impl, path: join(home, 'elsewhere', FX_CACHE_FILE) })
  assert.equal(view.ok, true)
  assert.equal(view.rate, 7.4)
  assert.equal(view.source, 'upstream')
  assert.ok(view.note.includes('本机缓存写入失败'), '写盘失败要在 note 里说明：' + view.note)
  assert.equal(existsSync(join(home, 'elsewhere', FX_CACHE_FILE)), false)
}

// ===== 11. 端点：仅回环 + 回环时吃缓存（离线，不发网络） =====
{
  const handlers = new Map()
  mountKeyUsageRoutes({ register: (route) => { handlers.set(route.path, route.handler) } })
  const call = async (path, remoteAddress = '127.0.0.1') => {
    const handler = handlers.get(path.split('?')[0])
    assert.ok(handler !== undefined, '端点应已注册：' + path)
    let status = 0
    let payload = ''
    await handler(
      { socket: { remoteAddress }, url: path, method: 'GET' },
      { writeHead: (code) => { status = code }, end: (value) => { payload = value } },
    )
    return { status, body: payload === '' ? null : JSON.parse(payload) }
  }

  const foreign = await call('/dsh-key-usage/fx', '10.0.0.7')
  assert.equal(foreign.status, 403, '汇率端点同样只允许回环')
  assert.deepEqual(foreign.body, { error: 'loopback only' })

  // 回环请求吃第 8 步写好的缓存（TTL 内），因此这里同样不联网
  const local = await call('/dsh-key-usage/fx')
  assert.equal(local.status, 200)
  assert.deepEqual(Object.keys(local.body).sort(), [
    'base', 'fetchedAt', 'note', 'ok', 'quote', 'rate', 'source', 'stale', 'ttlHours', 'upstream',
  ], '响应字段就是冻结契约里的那十个')
  assert.equal(local.body.ok, true)
  assert.equal(local.body.rate, 7.33)
  assert.equal(local.body.source, 'cache')
  assert.equal(local.body.ttlHours, FX_TTL_HOURS)
}

rmSync(home, { recursive: true, force: true })
console.log('fx-rate.test: 全部通过')
