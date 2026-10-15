/**
 * 实时余额 / 订阅窗口的离线测试：方案映射、fixture 表驱动的响应解析、错误分档、缓存与并发。
 * 全部用假 fetch，不发真实网络请求；fixture 依据各厂商官方文档或社区实现构造（见每个文件的 _source）。
 * 运行：node test/live-quota.test.mjs
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createLiveQuotaService, schemeIdOf } from '../lib/quota/live-quota.js'

function channelOf(provider, apiKeyEnv, baseURL = null) {
  return {
    provider,
    displayName: provider,
    apiKeyEnv,
    baseURL,
    models: [],
    costMode: 'unknown',
    status: 'ok',
    quotaPercent: null,
    quotaWindowKey: null,
    balanceText: null,
    snapshotUpdatedAt: null,
  }
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

// provider → 方案映射（含路由前缀与常见别名）
assert.equal(schemeIdOf('opencode-go'), 'opencode-go')
assert.equal(schemeIdOf('pi-ai/opencode'), 'opencode-go')
assert.equal(schemeIdOf('deepseek-official'), 'deepseek-official')
assert.equal(schemeIdOf('pi-ai/deepseek'), 'deepseek-official')
assert.equal(schemeIdOf('kimi-coding'), 'moonshotai')
assert.equal(schemeIdOf('sensenova'), null, '无方案通道返回 null')

const resolverOf = (keys) => ({ resolveCredential: async (reference) => keys[reference] ?? '' })

// OpenCode Go：rolling / weekly / monthly → 5h / week / month
const requestedUrls = []
const opencodeFetch = async (url, options) => {
  requestedUrls.push({ url, authorization: options.headers.Authorization })
  return jsonResponse({
    usage: {
      rolling: { percent: 19, resetsAt: '2026-10-13T15:00:00.000Z', status: 'ok' },
      weekly: { percent: 8, resetsAt: null },
      monthly: { percent: 4 },
    },
  })
}
const opencodeService = createLiveQuotaService(resolverOf({ OPENCODE_GO_API_KEY: 'test-key-not-real' }), opencodeFetch, 60000)
const opencodeLive = await opencodeService.refreshIfStale([channelOf('opencode-go', 'OPENCODE_GO_API_KEY')])
const opencodeEntry = opencodeLive.get('opencode-go')
assert.equal(opencodeEntry.ok, true)
assert.deepEqual(opencodeEntry.windows.map((window) => [window.key, window.percent]), [['5h', 19], ['week', 8], ['month', 4]])
assert.equal(opencodeEntry.windows[0].resetsAt, '2026-10-13T15:00:00.000Z')
assert.equal(opencodeEntry.balance, null)
assert.equal(requestedUrls[0].url, 'https://opencode.ai/zen/go/v1/usage')
assert.equal(requestedUrls[0].authorization, 'Bearer test-key-not-real', '凭据只作为请求头，不进任何响应')

// DeepSeek：balance_infos 的 CNY 项
const deepseekService = createLiveQuotaService(resolverOf({ DEEPSEEK_API_KEY: 'test-key-not-real' }), async (url) => {
  assert.equal(url, 'https://api.deepseek.com/user/balance')
  return jsonResponse({
    is_available: true,
    balance_infos: [{ currency: 'USD', total_balance: '0.00' }, { currency: 'CNY', total_balance: '1.50', granted_balance: '0.50', topped_up_balance: '1.00' }],
  })
}, 60000)
const deepseekEntry = (await deepseekService.refreshIfStale([channelOf('deepseek-official', 'DEEPSEEK_API_KEY')])).get('deepseek-official')
assert.equal(deepseekEntry.ok, true)
assert.deepEqual(deepseekEntry.balance, { currency: 'CNY', totalBalance: '1.50', giftBalance: '0.50', topUpBalance: '1.00' })

// 自定义 baseURL：路径挂在通道自己的 origin 上
const selfHostedService = createLiveQuotaService(resolverOf({ DEEPSEEK_API_KEY: 'test-key-not-real' }), async (url) => {
  assert.equal(url, 'https://proxy.example.com/user/balance')
  return jsonResponse({ balance_infos: [{ currency: 'CNY', total_balance: '9' }] })
}, 60000)
const selfHosted = (await selfHostedService.refreshIfStale([channelOf('deepseek-official', 'DEEPSEEK_API_KEY', 'https://proxy.example.com/v1')])).get('deepseek-official')
assert.equal(selfHosted.balance.totalBalance, '9')

// 未配置凭据：不发请求
let requestCount = 0
const noKeyService = createLiveQuotaService(resolverOf({}), async () => { requestCount += 1; return jsonResponse({}) }, 60000)
const noKeyEntry = (await noKeyService.refreshIfStale([channelOf('opencode-go', 'OPENCODE_GO_API_KEY')])).get('opencode-go')
assert.equal(noKeyEntry.ok, false)
assert.equal(noKeyEntry.error, 'no-key')
assert.equal(requestCount, 0, '没有凭据就不该发请求')

// 错误分档：401 / 500 / 非 JSON / 网络异常 / 响应过大
const errorCases = [
  [async () => jsonResponse({}, 401), 'unauthorized'],
  [async () => jsonResponse({}, 500), 'http-500'],
  [async () => jsonResponse('not json at all'), 'bad-json'],
  [async () => jsonResponse({ usage: {} }), 'bad-json'],
  [async () => { throw new Error('boom') }, 'network'],
  [async () => jsonResponse('x'.repeat(70000)), 'too-large'],
  // 上限按字节算：中文响应 25000 个字符（UTF-16 码元 25000）但 UTF-8 是 75000 字节，必须同样判超限
  [async () => jsonResponse('中'.repeat(25000)), 'too-large'],
]
for (const [fakeFetch, expectedError] of errorCases) {
  const service = createLiveQuotaService(resolverOf({ OPENCODE_GO_API_KEY: 'test-key-not-real' }), fakeFetch, 60000)
  const entry = (await service.refreshIfStale([channelOf('opencode-go', 'OPENCODE_GO_API_KEY')])).get('opencode-go')
  assert.equal(entry.ok, false, expectedError + ' 应判为失败')
  assert.equal(entry.error, expectedError)
}

// 超时：AbortError → timeout
const timeoutService = createLiveQuotaService(resolverOf({ OPENCODE_GO_API_KEY: 'test-key-not-real' }), async () => {
  const abortError = new Error('aborted')
  abortError.name = 'AbortError'
  throw abortError
}, 60000)
assert.equal((await timeoutService.refreshIfStale([channelOf('opencode-go', 'OPENCODE_GO_API_KEY')])).get('opencode-go').error, 'timeout')

// 缓存：TTL 内不重复请求；force 时强制刷新
let cachedFetchCount = 0
const cacheService = createLiveQuotaService(resolverOf({ OPENCODE_GO_API_KEY: 'test-key-not-real' }), async () => {
  cachedFetchCount += 1
  return jsonResponse({ usage: { rolling: { percent: 1 } } })
}, 60000)
const cacheChannels = [channelOf('opencode-go', 'OPENCODE_GO_API_KEY')]
await cacheService.refreshIfStale(cacheChannels)
await cacheService.refreshIfStale(cacheChannels)
assert.equal(cachedFetchCount, 1, 'TTL 内复用缓存')
await cacheService.refreshIfStale(cacheChannels, true)
assert.equal(cachedFetchCount, 2, 'force 时重新请求')

// 并发刷新合并成一次请求
let concurrentCount = 0
const concurrentService = createLiveQuotaService(resolverOf({ OPENCODE_GO_API_KEY: 'test-key-not-real' }), async () => {
  concurrentCount += 1
  await new Promise((resolve) => setTimeout(resolve, 10))
  return jsonResponse({ usage: { rolling: { percent: 2 } } })
}, 60000)
await Promise.all([
  concurrentService.refreshIfStale(cacheChannels),
  concurrentService.refreshIfStale(cacheChannels),
  concurrentService.refreshIfStale(cacheChannels),
])
assert.equal(concurrentCount, 1, '并发刷新只发一次请求')

// 无方案的通道不进结果，cached() 也不触发网络
const idleService = createLiveQuotaService(resolverOf({}), async () => { throw new Error('不该被调用') }, 60000)
const idleResult = await idleService.refreshIfStale([channelOf('sensenova', 'SENSENOVA_API_KEY')])
assert.equal(idleResult.size, 0)
assert.equal(idleService.cached().size, 0)

// fixture 表驱动：test/fixtures/providers/<provider>/<case>.json —— 用假 fetch 注入 httpStatus + body，
// 走 queryOne → scheme.parse 的真实归一化路径；可选 baseURL 表示该 case 需要通道自定义 baseURL。
const FIXTURE_ROOT = fileURLToPath(new URL('./fixtures/providers/', import.meta.url))
const PROVIDERS = [
  { schemeId: 'opencode-go', apiKeyEnv: 'OPENCODE_GO_API_KEY', defaultUrl: 'https://opencode.ai/zen/go/v1/usage', source: '社区' },
  { schemeId: 'deepseek-official', apiKeyEnv: 'DEEPSEEK_API_KEY', defaultUrl: 'https://api.deepseek.com/user/balance', source: '官方文档' },
  { schemeId: 'openrouter', apiKeyEnv: 'OPENROUTER_API_KEY', defaultUrl: 'https://openrouter.ai/api/v1/credits', source: '官方文档' },
  { schemeId: 'moonshotai', apiKeyEnv: 'MOONSHOT_API_KEY', defaultUrl: 'https://api.moonshot.cn/v1/users/me/balance', source: '官方文档' },
  { schemeId: 'zai', apiKeyEnv: 'ZAI_API_KEY', defaultUrl: 'https://api.z.ai/api/paas/v4/balance', source: '推断' },
]
const REQUIRED_CASES = ['normal', 'boundary', 'error']
const KNOWN_CASES = ['normal', 'boundary', 'error', 'drift']

assert.deepEqual(
  readdirSync(FIXTURE_ROOT).sort(),
  PROVIDERS.map((provider) => provider.schemeId).sort(),
  'fixture 目录必须与 PROVIDERS 表一一对应（新增方案时同步补 fixture 与表项）',
)

let fixtureCount = 0
for (const provider of PROVIDERS) {
  const fixtureDir = new URL(provider.schemeId + '/', new URL('./fixtures/providers/', import.meta.url))
  const files = readdirSync(fixtureDir).filter((name) => name.endsWith('.json')).sort()
  const caseTally = new Map()
  assert.ok(files.length >= 3, provider.schemeId + ' 至少要有 3 个 case')
  for (const file of files) {
    const raw = readFileSync(new URL(file, fixtureDir), 'utf8')
    const fixture = JSON.parse(raw)
    const label = provider.schemeId + '/' + file.replace(/\.json$/, '')

    // fixture 自身约束：来源可查、case 合法、不得夹带真实凭据
    assert.ok(typeof fixture._source === 'string' && fixture._source.includes('http'), label + ' 的 _source 必须写明来源链接与抓取日期')
    assert.ok(fixture._source.includes('2026-10-13'), label + ' 的 _source 必须写明抓取日期')
    assert.ok(KNOWN_CASES.includes(fixture.case), label + ' 的 case 只能是 ' + KNOWN_CASES.join('/'))
    assert.equal(typeof fixture.httpStatus, 'number', label + ' 必须写明 httpStatus')
    assert.equal(typeof fixture.expect, 'object', label + ' 必须写明 expect')
    assert.ok(!/sk-[A-Za-z0-9]|Bearer /.test(raw), label + ' 不得包含任何真实 key 或认证头')
    if (provider.source !== '官方文档') {
      assert.ok(fixture._source.includes('非官方'), label + ' 无官方文档的方案必须在 _source 标注「非官方」')
      assert.ok(fixture._source.includes('推断') || fixture._source.includes('社区'), label + ' 必须标明来源是社区实现还是推断')
    }
    caseTally.set(fixture.case, (caseTally.get(fixture.case) ?? 0) + 1)

    // 真实解析路径：只把 body 与状态码喂给假 fetch
    const service = createLiveQuotaService(resolverOf({ [provider.apiKeyEnv]: 'test-key-not-real' }), async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test-key-not-real', label + ' 凭据只作为请求头')
      const expectedUrl = fixture.baseURL === undefined ? provider.defaultUrl : fixture.baseURL
      assert.ok(url.startsWith(expectedUrl), label + ' 请求地址应为 ' + expectedUrl + '，实际 ' + url)
      return jsonResponse(fixture.body, fixture.httpStatus)
    }, 60000)
    const entry = (await service.refreshIfStale([channelOf(provider.schemeId, provider.apiKeyEnv, fixture.baseURL ?? null)])).get(provider.schemeId)
    assert.equal(entry.ok, fixture.expect.ok, label + ' ok 不符')
    assert.equal(entry.error, fixture.expect.error, label + ' error 不符')
    assert.deepEqual(entry.balance, fixture.expect.balance, label + ' balance 不符')
    assert.deepEqual(entry.windows, fixture.expect.windows, label + ' windows 不符')
    fixtureCount += 1
  }
  for (const required of REQUIRED_CASES) {
    assert.ok(caseTally.has(required), provider.schemeId + ' 缺少 ' + required + ' case')
  }
  const tally = [...caseTally.entries()].map(([name, count]) => name + ' ' + count).join(' / ')
  console.log('  ' + provider.schemeId.padEnd(18) + files.length + ' 个 case（' + tally + '，来源：' + provider.source + '）')
}

console.log('live-quota.test: 全部通过（含 ' + fixtureCount + ' 个 provider fixture）')
