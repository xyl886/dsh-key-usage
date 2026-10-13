/**
 * 实时余额 / 订阅窗口的离线测试：方案映射、响应解析、错误分档、缓存与并发。
 * 全部用假 fetch，不发真实网络请求。
 * 运行：node test/live-quota.test.mjs
 */
import assert from 'node:assert/strict'
import { createLiveQuotaService, schemeIdOf } from '../lib/live-quota.js'

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

console.log('live-quota.test: 全部通过')
