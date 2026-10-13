/**
 * 路由集成测试：把 DSH_HOME 指向临时夹具，直接调用各端点 handler 校验响应结构。
 * 覆盖：通道判定、范围聚合、单日小时、热力图、快照、总览汇总、会话、项目、非回环 403。
 * 运行：node test/routes.test.mjs
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mountKeyUsageRoutes } from '../lib/routes.js'
import { foldSessionEvents, summarizeSession } from '../lib/session-usage.js'

const home = mkdtempSync(join(tmpdir(), 'dsh-key-usage-routes-'))
mkdirSync(join(home, 'profiles', 'desktop'), { recursive: true })
mkdirSync(join(home, 'dsh-usage'), { recursive: true })

writeFileSync(join(home, 'profiles', 'desktop', 'cordis.yml'), [
  '- id: llm-pi-ai',
  '  config:',
  '    providers:',
  '      opencode-go:',
  '        apiKeyEnv: OPENCODE_GO_API_KEY',
  '        models:',
  '          - id: glm-5.3-flash',
  '            name: GLM-5.3-Flash',
  '      local:',
  '        apiKeyEnv: LOCAL_API_KEY',
  '        baseURL: http://127.0.0.1:11434/v1',
  '        models:',
  '          - id: qwen3',
  '            name: Qwen3',
  '',
].join('\n'), 'utf8')

writeFileSync(join(home, 'dsh-usage', 'usage-ledger.json'), JSON.stringify({
  version: 1,
  days: {
    '2026-10-12': {
      'opencode-go': { 'GLM-5.3-Flash': { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 8000, cacheWriteTokens: 0, reasoningTokens: 0, calls: 3, cost: 0 } },
      local: { Qwen3: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, calls: 1, cost: 0 } },
    },
    '2026-10-13': {
      'opencode-go': { 'GLM-5.3-Flash': { inputTokens: 2000, outputTokens: 400, cacheReadTokens: 16000, cacheWriteTokens: 0, reasoningTokens: 0, calls: 6, cost: 0 } },
    },
  },
}), 'utf8')

writeFileSync(join(home, 'dsh-usage', 'provider-snapshots.json'), JSON.stringify({
  version: 1,
  providers: {
    'opencode-go': { provider: 'opencode-go', credential: 'env', updatedAt: 1791000000000, plan: { windows: [{ key: 'week', percent: 19 }, { key: 'month', percent: 76 }] } },
  },
}), 'utf8')

const morning = new Date(2026, 9, 13, 9, 15, 0).getTime()
// 2026-10-20 刻意落在台账覆盖之外：用来验证「台账缺的日期由会话补位」
const outsideLedger = new Date(2026, 9, 20, 14, 30, 0).getTime()
const sessionEvents = [
  { seq: 0, time: morning, type: 'request/header', data: { header: { config: { provider: 'pi-ai/opencode-go', model: 'GLM-5.3-Flash' } } } },
  { seq: 1, time: morning, type: 'assistant/chunk', data: { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 8000 } } } },
  { seq: 2, time: outsideLedger, type: 'assistant/chunk', data: { turn: 2, step: 1, chunk: { type: 'usage', usage: { inputTokens: 400, outputTokens: 40, cacheReadTokens: 0 } } } },
]
const sessionRecords = [{
  id: 'session-fixture',
  title: '夹具会话',
  workspace: 'D:\\EasyJob',
  summary: summarizeSession(foldSessionEvents(sessionEvents)),
}]
const sessionSource = {
  collect: async () => ({
    records: sessionRecords,
    coverage: { status: 'complete', totalSessions: 1, countedSessions: 1, skippedSessions: 0 },
  }),
}

const handlers = new Map()
// DSH_HOME 必须在挂载前设置：路由在挂载时就解析出文件路径
process.env.DSH_HOME = home
mountKeyUsageRoutes({ register: (route) => { handlers.set(route.path, route.handler) } }, sessionSource)

async function callHandler(handlers, path, remoteAddress = '127.0.0.1') {
  const handler = handlers.get(path.split('?')[0])
  assert.ok(handler !== undefined, '端点应已注册：' + path)
  let status = 0
  let payload = ''
  await handler(
    { socket: { remoteAddress }, url: path, method: 'GET' },
    { writeHead: (code) => { status = code }, end: (body) => { payload = body } },
  )
  return { status, body: payload === '' ? null : JSON.parse(payload) }
}

async function callEndpoint(path, remoteAddress = '127.0.0.1') {
  return callHandler(handlers, path, remoteAddress)
}

// 通道：本地端点判定 + 订阅窗口判定
const channels = await callEndpoint('/dsh-key-usage/channels')
assert.equal(channels.status, 200)
assert.equal(channels.body.channels.length, 2)
const opencodeGo = channels.body.channels.find((channel) => channel.provider === 'opencode-go')
assert.equal(opencodeGo.costMode, 'sub')
assert.equal(opencodeGo.status, 'warn')
assert.equal(opencodeGo.quotaWindowKey, 'month')
assert.equal(opencodeGo.costLabel, '订阅制')
const localChannel = channels.body.channels.find((channel) => channel.provider === 'local')
assert.equal(localChannel.costMode, 'none', '127.0.0.1 baseURL 判为本地端点')
assert.equal(localChannel.balanceText, null)

// 范围聚合
const usage = await callEndpoint('/dsh-key-usage/usage?from=2026-10-12&to=2026-10-13')
assert.equal(usage.body.totals.calls, 10)
assert.equal(usage.body.days.length, 2)
assert.equal(usage.body.hours, null, '多日范围不返回小时数据')
const singleDay = await callEndpoint('/dsh-key-usage/usage?from=2026-10-13&to=2026-10-13')
assert.equal(singleDay.body.days.length, 1)
assert.equal(singleDay.body.hours.length, 24, '单日范围返回 24 小时槽')
assert.equal(singleDay.body.hours[9].calls, 1, '小时数据来自会话事件')
assert.equal(singleDay.body.hours[9].buckets.cacheReadTokens, 8000)

// 通道过滤
const filtered = await callEndpoint('/dsh-key-usage/usage?from=2026-10-12&to=2026-10-13&provider=local')
assert.equal(filtered.body.totals.calls, 1)

// 热力图：台账两天 + 会话补齐的一天
const heatmap = await callEndpoint('/dsh-key-usage/heatmap')
assert.equal(heatmap.body.days.length, 3)
assert.equal(heatmap.body.days[1].totalTokens, 18400)
assert.equal(heatmap.body.days[2].date, '2026-10-20')
assert.equal(heatmap.body.days[2].totalTokens, 440, '台账缺的日期由会话事件补进热力图')
assert.deepEqual(heatmap.body.sessionDates, ['2026-10-20'])

// 余额 / 窗口：按配置的通道逐个返回；实时不可用时回落快照并标出来源
const quota = await callEndpoint('/dsh-key-usage/quota')
assert.equal(quota.body.providers.length, 2, '每个通道一条')
const opencodeQuota = quota.body.providers.find((row) => row.provider === 'opencode-go')
assert.equal(opencodeQuota.source, 'snapshot', '未注入实时服务时回落快照')
assert.equal(opencodeQuota.plan.windows.length, 2)
const localQuota = quota.body.providers.find((row) => row.provider === 'local')
assert.equal(localQuota.source, 'snapshot')
assert.equal(localQuota.error, 'no-snapshot', '既无实时也无快照时给出原因')

// 实时优先：注入 stub 实时服务后，成功的通道标 live，失败的仍回落快照
const liveHandlers = new Map()
const liveCache = new Map([['opencode-go', {
  provider: 'opencode-go',
  ok: true,
  error: null,
  fetchedAt: 1791000900000,
  balance: null,
  windows: [
    { key: '5h', percent: 19, resetsAt: '2026-10-13T15:00:00.000Z', status: null },
    { key: 'week', percent: 8, resetsAt: null, status: null },
    { key: 'month', percent: 4, resetsAt: null, status: null },
  ],
}]])
const stubLiveQuota = { cached: () => liveCache, refreshIfStale: async () => liveCache }
mountKeyUsageRoutes({ register: (route) => { liveHandlers.set(route.path, route.handler) } }, sessionSource, stubLiveQuota)

const liveQuotaBody = await callHandler(liveHandlers, '/dsh-key-usage/quota')
const liveOpencode = liveQuotaBody.body.providers.find((row) => row.provider === 'opencode-go')
assert.equal(liveOpencode.source, 'live', '实时成功时用实时值')
assert.equal(liveOpencode.fetchedAt, 1791000900000)
assert.deepEqual(liveOpencode.plan.windows.map((window) => window.key), ['5h', 'week', 'month'])
const liveLocal = liveQuotaBody.body.providers.find((row) => row.provider === 'local')
assert.equal(liveLocal.source, 'snapshot', '实时没有结果的通道继续回落快照')

// 通道判定要吃实时值：快照里峰值是 month 76%，实时峰值是 rolling 19%
const liveChannels = await callHandler(liveHandlers, '/dsh-key-usage/channels')
const liveOpencodeChannel = liveChannels.body.channels.find((channel) => channel.provider === 'opencode-go')
assert.equal(liveOpencodeChannel.quotaPercent, 19, '额度百分比取实时窗口')
assert.equal(liveOpencodeChannel.quotaWindowKey, '5h')

// 总览汇总：今日与近 30 天
const summary = await callEndpoint('/dsh-key-usage/summary')
const summaryOpencode = summary.body.channels.find((row) => row.provider === 'opencode-go')
assert.equal(summaryOpencode.month.calls, 9)
const todayKey = summary.body.range.today
assert.equal(summaryOpencode.today.calls, todayKey === '2026-10-13' ? 6 : 0, '「今日」按服务器当天计算')

// 会话：模型归属归一 + 成本估算（台账里成本为 0，故无法估价）
const sessions = await callEndpoint('/dsh-key-usage/sessions')
assert.equal(sessions.body.rows.length, 1)
assert.equal(sessions.body.rows[0].provider, 'opencode-go', 'pi-ai 路由归一到通道')
assert.equal(sessions.body.rows[0].providerLabel, 'opencode-go')
assert.equal(sessions.body.rows[0].cost, null, '台账无成本数据时不给估算值')
assert.equal(sessions.body.rows[0].costMode, 'sub')
assert.equal(sessions.body.coverage.status, 'complete')

// 项目：按工作目录聚合
const projects = await callEndpoint('/dsh-key-usage/projects')
assert.equal(projects.body.rows.length, 1)
assert.equal(projects.body.rows[0].workspace, 'D:\\EasyJob')
assert.equal(projects.body.rows[0].tokens, 9200 + 440, '两次结算样本的 tokens 之和')
assert.equal(projects.body.rows[0].dominantProvider, 'opencode-go')

// 非回环一律 403
const foreign = await callEndpoint('/dsh-key-usage/channels', '192.168.1.9')
assert.equal(foreign.status, 403)
assert.deepEqual(foreign.body, { error: 'loopback only' })

// 台账缺的日期由会话补位（10-12/10-13 在台账里，10-20 只在会话里）
const spanning = await callEndpoint('/dsh-key-usage/usage?from=2026-10-12&to=2026-10-20')
assert.deepEqual(spanning.body.days.map((day) => day.date), ['2026-10-12', '2026-10-13', '2026-10-20'])
assert.deepEqual(spanning.body.sessionDates, ['2026-10-20'], '只有台账缺的那天标为会话来源')
assert.equal(spanning.body.days[1].cost, 0, '台账那两天不重算成本')
assert.equal(spanning.body.days[2].inputTokens, 400, '会话补齐的那天带上了用量')

// 台账整体缺失时不会变成空态，而是全量走会话事件
rmSync(join(home, 'dsh-usage', 'usage-ledger.json'))
const sessionOnlyUsage = await callEndpoint('/dsh-key-usage/usage')
assert.equal(sessionOnlyUsage.status, 200)
assert.deepEqual(sessionOnlyUsage.body.days.map((day) => day.date), ['2026-10-13', '2026-10-20'])
assert.deepEqual(sessionOnlyUsage.body.sessionDates, ['2026-10-13', '2026-10-20'])
assert.equal(sessionOnlyUsage.body.totals.inputTokens, 1400)

// 台账与会话都没有数据的范围才返回空前端空态
const noDataUsage = await callEndpoint('/dsh-key-usage/usage?from=2026-01-01&to=2026-01-02')
assert.equal(noDataUsage.status, 200)
assert.equal(noDataUsage.body.totals, null)
assert.deepEqual(noDataUsage.body.days, [])

// cordis.yml 被应用重置为空模板时，回退到 cordis.patch.yml 仍能取到通道
writeFileSync(join(home, 'profiles', 'desktop', 'cordis.yml'), '# 空模板\n[]\n', 'utf8')
writeFileSync(join(home, 'profiles', 'desktop', 'cordis.patch.yml'), [
  '- id: llm-pi-ai',
  '  name: "@deepseek-ai/dsh-llm-pi-ai"',
  '  config:',
  '    providers:',
  '      sensenova:',
  '        displayName: sensenova',
  '        apiKeyEnv: SENSENOVA_API_KEY',
  '        models:',
  '          - id: sensenova-6.8-flash-lite',
  '            name: sensenova-6.8-flash-lite',
  '',
].join('\n'), 'utf8')
const fallbackChannels = await callEndpoint('/dsh-key-usage/channels')
assert.equal(fallbackChannels.body.channels.length, 1, '组合产物为空时回退到 patch 层')
assert.equal(fallbackChannels.body.channels[0].provider, 'sensenova')
assert.equal(fallbackChannels.body.channels[0].costMode, 'free')

rmSync(home, { recursive: true, force: true })
console.log('routes.test: 全部通过')
