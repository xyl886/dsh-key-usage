/**
 * 路由集成测试：把 DSH_HOME 指向临时夹具，直接调用各端点 handler 校验响应结构。
 * 覆盖：通道判定、范围聚合、单日小时、热力图、快照、总览汇总、会话、项目、非回环 403、预算判定。
 * 运行：node test/routes.test.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mountKeyUsageRoutes } from '../lib/routes.js'
import { createSessionSource } from '../lib/sessions.js'
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

/** 0.2 形态的假持久化服务：list / open('read') / read(0) / close；记录 open 次数，用来验证「只折一个会话」。 */
function createFakePersistence(entries) {
  const records = new Map(entries)
  const stats = { opens: [], reads: [], closes: 0 }
  return {
    stats,
    service: {
      identity: Symbol('fixture'),
      list: async () => [...records.values()].map((record) => ({
        header: record.header,
        revision: record.revision,
        eventCount: record.events.length,
      })),
      open: async (id, access) => {
        stats.opens.push([id, access])
        const record = records.get(id)
        if (record === undefined || record.failOpen === true) throw new Error('fixture open failure')
        return {
          inheritedEventCount: 0,
          read: async (offset) => {
            stats.reads.push([id, offset])
            return { events: record.events.slice(offset) }
          },
          close: async () => { stats.closes += 1 },
        }
      },
    },
  }
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
assert.equal(liveOpencode.supported, true, '有查询方案的通道标 supported')
assert.equal(liveLocal.supported, false, '本地端点没有余额接口，界面不该提示「查询失败」')

// 快照持久化：实时一成功就落一份自己的快照（宿主那份已经 13 天没更新了）
const ownSnapshotPath = join(home, 'dsh-key-usage', 'quota-snapshots.json')
assert.equal(existsSync(ownSnapshotPath), true, '实时成功后应写出自己的快照文件')
const ownSnapshot = JSON.parse(readFileSync(ownSnapshotPath, 'utf8'))
assert.equal(ownSnapshot.providers['opencode-go'].updatedAt, 1791000900000)
assert.equal(ownSnapshot.providers['opencode-go'].windows.length, 3)

// 之后实时失败时，回落的是这份「最近一次成功」的快照，而不是宿主那份旧值
const failedCache = new Map([['opencode-go', {
  provider: 'opencode-go',
  ok: false,
  error: 'timeout',
  fetchedAt: 1791001000000,
  balance: null,
  windows: null,
}]])
const failedHandlers = new Map()
mountKeyUsageRoutes(
  { register: (route) => { failedHandlers.set(route.path, route.handler) } },
  sessionSource,
  { cached: () => failedCache, refreshIfStale: async () => failedCache },
)
const afterFailure = await callHandler(failedHandlers, '/dsh-key-usage/quota')
const staleOpencode = afterFailure.body.providers.find((row) => row.provider === 'opencode-go')
assert.equal(staleOpencode.source, 'snapshot')
assert.equal(staleOpencode.error, 'timeout', '失败原因照常透出')
assert.equal(staleOpencode.updatedAt, 1791000900000, '回落的是最近一次成功的快照，不是宿主的旧值')
assert.deepEqual(staleOpencode.plan.windows.map((window) => window.key), ['5h', 'week', 'month'])

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
assert.equal(sessions.body.rows[0].archived, false, '没有归档集合时标记为未归档')

// 归档标记与标题：夹具里补一份 storages/workspace.json 与投影缓存
mkdirSync(join(home, 'storages'), { recursive: true })
writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({
  global: { archivedSessionIds: ['session-fixture'] },
}), 'utf8')
writeFileSync(join(home, 'storages', 'session_projcache.json'), JSON.stringify({
  tables: { sessions: { 'session-fixture': { rows: { title: { val: '夹具会话标题' } } } } },
}), 'utf8')
const sessionsWithMeta = await callEndpoint('/dsh-key-usage/sessions')
assert.equal(sessionsWithMeta.body.rows[0].archived, true, '归档集合命中（session- 前缀归一后比对）')
assert.equal(sessionsWithMeta.body.rows[0].title, '夹具会话标题', '标题取宿主投影缓存')
const projectsWithMeta = await callEndpoint('/dsh-key-usage/projects')
assert.equal(projectsWithMeta.body.rows[0].archivedSessionCount, 1, '项目行统计已归档数，用量不剔除')

// 项目：按工作目录聚合
const projects = await callEndpoint('/dsh-key-usage/projects')
assert.equal(projects.body.rows.length, 1)
assert.equal(projects.body.rows[0].workspace, 'D:\\EasyJob')
assert.equal(projects.body.rows[0].tokens, 9200 + 440, '两次结算样本的 tokens 之和')
assert.equal(projects.body.rows[0].dominantProvider, 'opencode-go')

// 按模型：通道 + 模型聚合，口径与 /sessions 一致（tokens 不含 cacheWrite）
const models = await callEndpoint('/dsh-key-usage/models')
assert.equal(models.body.rows.length, 1, '两份样本同一模型归一行')
const modelRow = models.body.rows[0]
assert.equal(modelRow.provider, 'opencode-go')
assert.equal(modelRow.providerLabel, 'opencode-go')
assert.equal(modelRow.model, 'GLM-5.3-Flash')
assert.equal(modelRow.calls, 2, '调用数 = 结算样本数')
assert.equal(modelRow.tokens, 9640, '输入 + 输出 + 缓存读')
assert.equal(modelRow.buckets.inputTokens, 1400)
assert.equal(modelRow.buckets.outputTokens, 240)
assert.equal(modelRow.buckets.cacheReadTokens, 8000)
assert.equal(modelRow.cacheHitRate, 83, '8000 / 9640')
assert.equal(modelRow.sessionCount, 1)
assert.equal(modelRow.costMode, 'sub')
assert.equal(modelRow.cost, null, '台账无成本数据时不给估算值（与 /sessions 同口径）')
assert.equal(models.body.coverage.status, 'complete')
assert.equal(models.body.priced, false)

// limit 生效，非法 limit 回落默认值而不是报错
const limited = await callEndpoint('/dsh-key-usage/models?limit=0')
assert.equal(limited.body.rows.length, 1, 'limit 非法时回落默认值')
const loopbackOnly = await callEndpoint('/dsh-key-usage/models', '10.0.0.7')
assert.equal(loopbackOnly.status, 403, '按模型端点同样只允许回环')

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

// ===== 单会话详情端点 /session：只折一个会话、404 / 403 / 降级、标题过滤、模型构成截断 =====
{
  const injectedPrompt = '<system-reminder> You are teammate "kurlon".'
  const realPrompt = '把会话用量这页加上详情抽屉'
  const detailDay = new Date(2026, 9, 12, 9, 15, 0).getTime()
  const detailNextDay = new Date(2026, 9, 13, 20, 5, 0).getTime()
  const usageOf = (seq, time, turn, provider, model, usage) => ({
    seq, time, type: 'assistant/chunk', data: { turn, step: 1, chunk: { type: 'usage', usage }, message: { source: { provider, model } } },
  })
  const detailEvents = [
    { seq: 0, time: detailDay, type: 'user/message', data: { content: [{ type: 'text', text: injectedPrompt }] } },
    { seq: 1, time: detailDay, type: 'user/message', data: { content: [{ type: 'text', text: realPrompt }] } },
    usageOf(2, detailDay, 1, 'pi-ai/opencode-go', 'GLM-5.3-Flash', { inputTokens: 1000, outputTokens: 100, cacheReadTokens: 0 }),
    usageOf(3, detailNextDay, 2, 'pi-ai/opencode-go', 'GLM-5.3-Flash', { inputTokens: 2000, outputTokens: 200, cacheReadTokens: 8000 }),
  ]
  // 七个模型：验证 /sessions 行内展开的「前 5 个 + 其它」
  const manyModelEvents = Array.from({ length: 7 }, (unused, index) => usageOf(
    index, detailDay, index + 1, 'pi-ai/opencode-go', 'model-' + String(index),
    { inputTokens: 1000, outputTokens: 100, cacheReadTokens: 0 },
  ))
  const detailFixture = createFakePersistence([
    ['session-detail', { header: { id: 'session-detail', cwd: 'D:\\EasyJob', updatedAt: detailNextDay }, revision: Symbol('r1'), events: detailEvents }],
    ['session-titled', { header: { id: 'session-titled', title: '会话头标题', cwd: 'D:\\EasyJob', updatedAt: detailDay }, revision: Symbol('r1'), events: detailEvents }],
    ['session-many', { header: { id: 'session-many', cwd: 'D:\\EasyJob', updatedAt: detailDay }, revision: Symbol('r1'), events: manyModelEvents }],
    ['session-broken', { header: { id: 'session-broken', title: '读不出来的会话', cwd: 'D:\\work', updatedAt: detailDay }, revision: Symbol('r1'), events: detailEvents, failOpen: true }],
  ])
  const detailSource = createSessionSource({ get: (name) => (name === 'sessionPersistence' ? detailFixture.service : undefined) })
  // 投影缓存里的标题优先级链在详情里同样生效（宿主投影标题 > 会话头标题）
  const projectionPath = join(home, 'storages', 'session_projcache.json')
  const projection = JSON.parse(readFileSync(projectionPath, 'utf8'))
  projection.tables.sessions['session-titled'] = { rows: { title: { val: '投影缓存里的标题' } } }
  writeFileSync(projectionPath, JSON.stringify(projection), 'utf8')
  const detailHandlers = new Map()
  mountKeyUsageRoutes({ register: (route) => { detailHandlers.set(route.path, route.handler) } }, detailSource)
  const detailCall = (path, remoteAddress) => callHandler(detailHandlers, path, remoteAddress)

  // 权限与参数：与其它端点同类
  assert.equal((await detailCall('/dsh-key-usage/session?id=session-detail', '10.0.0.7')).status, 403, '详情端点同样只允许回环')
  assert.deepEqual((await detailCall('/dsh-key-usage/session?id=session-detail', '10.0.0.7')).body, { error: 'loopback only' })
  const noId = await detailCall('/dsh-key-usage/session')
  assert.equal(noId.status, 400, '缺 id 时给出可读的参数错误')
  assert.ok(noId.body.error.includes('id'))

  // 找不到：404 + 明确错误体（不是空 200）
  const notFound = await detailCall('/dsh-key-usage/session?id=session-nope')
  assert.equal(notFound.status, 404)
  assert.equal(notFound.body.error, '会话不存在')
  assert.equal(notFound.body.id, 'session-nope')
  assert.ok(typeof notFound.body.reason === 'string' && notFound.body.reason !== '')
  assert.equal(detailFixture.stats.opens.length, 0, '找不到时不读任何会话')

  // 字段完整：抽屉要的每一项都在
  const detail = await detailCall('/dsh-key-usage/session?id=session-detail')
  assert.equal(detail.status, 200)
  assert.equal(detailFixture.stats.opens.length, 1, '只折叠被点开的那一个会话（不重折全部）')
  assert.equal(detail.body.coverage.status, 'complete')
  assert.equal(detail.body.coverage.reason, null)
  const session = detail.body.session
  assert.equal(session.id, 'session-detail')
  assert.equal(session.title, realPrompt, '标题跳过 system-reminder，取第一条真实提问')
  assert.equal(session.prompt, realPrompt, '首条真实提问全文')
  assert.equal(session.workspace, 'D:\\EasyJob')
  assert.equal(session.provider, 'opencode-go', 'pi-ai 路由归一到通道')
  assert.equal(session.providerLabel, 'opencode-go')
  assert.equal(session.costMode, 'sub')
  assert.equal(session.archived, false)
  assert.equal(session.firstTime, detailDay)
  assert.equal(session.lastTime, detailNextDay)
  assert.equal(session.durationMs, detailNextDay - detailDay)
  assert.equal(session.crossDays, 1, '跨天会话给出天数差')
  assert.equal(session.days, 2)
  assert.equal(session.calls, 2, '两个结算样本')
  assert.equal(session.tokens, 11300, '1000 + 100 + 2000 + 200 + 8000')
  assert.equal(session.buckets.inputTokens, 3000)
  assert.equal(session.buckets.outputTokens, 300)
  assert.equal(session.buckets.cacheReadTokens, 8000)
  assert.equal(session.buckets.cacheWriteTokens, 0)
  assert.equal(session.cacheHitRate, 70.8, '8000 / 11300')
  assert.equal(session.hours.length, 24, '有样本就给 24 个小时槽')
  assert.equal(session.hours[9].calls, 1)
  assert.equal(session.hours[20].calls, 1)
  assert.equal(session.hours[9].tokens, 1100)
  assert.equal(session.hours[20].tokens, 10200)
  assert.equal(session.models.length, 1)
  assert.equal(session.models[0].providerLabel, 'opencode-go')
  assert.equal(session.models[0].model, 'GLM-5.3-Flash')
  assert.equal(session.models[0].sharePercent, 100)
  assert.equal(session.models[0].cost, null, '台账成本为 0 且没有规则时不编造金额')
  assert.equal(session.models[0].costSource, 'none')
  assert.equal(session.cost, null)
  assert.equal(session.costSource, 'none')
  assert.equal(detail.body.priced, false)

  // 再点一次同一个会话：吃缓存，零 I/O
  await detailCall('/dsh-key-usage/session?id=session-detail')
  assert.equal(detailFixture.stats.opens.length, 1, '重复打开详情不再读会话')

  // 标题优先级链在详情里同样生效：宿主投影缓存的标题压过会话头标题
  const titledDetail = await detailCall('/dsh-key-usage/session?id=session-titled')
  assert.equal(titledDetail.body.session.title, '投影缓存里的标题')
  assert.equal(titledDetail.body.session.prompt, realPrompt, '提问全文照常给出')

  // 读不出来：200 + 降级说明 + 会话头字段（不是 500，也不是空响应）
  const degraded = await detailCall('/dsh-key-usage/session?id=session-broken')
  assert.equal(degraded.status, 200)
  assert.equal(degraded.body.coverage.status, 'partial')
  assert.ok(degraded.body.coverage.reason.includes('会话读取失败'))
  assert.equal(degraded.body.session.title, '读不出来的会话', '降级时仍给会话头里的标题')
  assert.equal(degraded.body.session.workspace, 'D:\\work')
  assert.equal(degraded.body.session.calls, 0)
  assert.equal(degraded.body.session.hours, null, '没有样本就不画小时图')
  assert.equal(degraded.body.session.cost, null)

  // 列表行：标题过滤 + 跨天 + 首条提问片段；模型构成只给前 5 个 + 其它
  const listRows = await detailCall('/dsh-key-usage/sessions')
  const titledRow = listRows.body.rows.find((row) => row.id === 'session-detail')
  assert.equal(titledRow.title, realPrompt, '列表标题也跳过 system-reminder')
  assert.equal(titledRow.prompt, realPrompt)
  assert.equal(titledRow.crossDays, 1)
  const manyRow = listRows.body.rows.find((row) => row.id === 'session-many')
  assert.equal(manyRow.models.length, 6, '前 5 个模型 + 合并出来的「其它」')
  assert.equal(manyRow.models[5].model, '其它')
  assert.equal(manyRow.models[5].provider, '')
  assert.equal(manyRow.models[5].tokens, 2200, '两个长尾模型合并')
  assert.equal(manyRow.models[5].calls, 2)
  assert.equal(manyRow.tokens, 7700, '合并只影响展示，行合计仍是全量')
  assert.equal(manyRow.models[0].sharePercent, 14.3)

  // 带规则：逐模型与合计都按规则算，来源角标为「自定」
  const pricedDetailHandlers = new Map()
  mountKeyUsageRoutes(
    { register: (route) => { pricedDetailHandlers.set(route.path, route.handler) } },
    detailSource,
    undefined,
    undefined,
    {
      current: () => ({
        config: {
          version: 1, currency: 'CNY',
          rules: [{ provider: 'opencode-go', model: '*', unit: 'perThousandTokens', currency: 'CNY', input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8, offPeak: null, note: '测试规则' }],
        },
        writable: true, revision: 1,
      }),
    },
  )
  const pricedDetail = await callHandler(pricedDetailHandlers, '/dsh-key-usage/session?id=session-many')
  assert.equal(pricedDetail.body.session.models.length, 7, '详情给全部模型，不合并长尾')
  assert.equal(pricedDetail.body.session.models[0].cost, 2.8, '(1000×2 + 100×8) / 1000')
  assert.equal(pricedDetail.body.session.models[0].costSource, 'rule')
  assert.equal(pricedDetail.body.session.cost, 19.6, '七个模型 × 2.8')
  assert.equal(pricedDetail.body.session.costSource, 'rule')
  const pricedRows = await callHandler(pricedDetailHandlers, '/dsh-key-usage/sessions')
  const pricedManyRow = pricedRows.body.rows.find((row) => row.id === 'session-many')
  assert.equal(pricedManyRow.cost, 19.6, '行合计按全量模型算，不受「其它」合并影响')
  assert.equal(pricedManyRow.costSource, 'rule')
  assert.equal(pricedManyRow.models[5].cost, 5.6, '合并行的成本是两个长尾模型之和')
  assert.equal(pricedManyRow.models[5].costSource, 'rule')

  // 数据源没有 detail 能力时（外部注入的旧实现）：404 而不是抛错
  const noCapability = new Map()
  mountKeyUsageRoutes({ register: (route) => { noCapability.set(route.path, route.handler) } }, { collect: sessionSource.collect })
  const unsupported = await callHandler(noCapability, '/dsh-key-usage/session?id=session-detail')
  assert.equal(unsupported.status, 404)
  assert.equal(unsupported.body.error, '会话详情不可用')

  // 宿主没有会话服务：200 + unavailable（与 /sessions 的降级口径一致）
  const unavailableHandlers = new Map()
  mountKeyUsageRoutes({ register: (route) => { unavailableHandlers.set(route.path, route.handler) } })
  const unavailable = await callHandler(unavailableHandlers, '/dsh-key-usage/session?id=session-detail')
  assert.equal(unavailable.status, 200)
  assert.equal(unavailable.body.coverage.status, 'unavailable')
  assert.equal(unavailable.body.session.calls, 0)
}

// ===== 计费规则：带规则再挂一份路由，验证四处成本按规则重算与来源角标 =====
// 台账仍在（下面的 rmSync 才删），所以同一次请求里既有「官方」也有「自定」两种来源
{
  const pricedHandlers = new Map()
  const rules = [{
    provider: 'opencode-go', model: '*', unit: 'perThousandTokens', currency: 'CNY',
    input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8, offPeak: null, note: '测试规则',
  }]
  mountKeyUsageRoutes(
    { register: (route) => { pricedHandlers.set(route.path, route.handler) } },
    sessionSource,
    undefined,
    undefined,
    { current: () => ({ config: { version: 1, currency: 'CNY', rules }, writable: true, revision: 7 }) },
  )
  const priced = (path) => callHandler(pricedHandlers, path)

  const pricing = await priced('/dsh-key-usage/pricing')
  assert.equal(pricing.status, 200)
  assert.equal(pricing.body.writable, true)
  assert.equal(pricing.body.revision, 7, '修订号透出给界面做乐观锁')
  assert.equal(pricing.body.rules.length, 1)
  assert.deepEqual(pricing.body.templates.map((template) => template.id), ['deepseek', 'kimi', 'glm'])
  assert.equal(pricing.body.offPeakNow.length, 1, '每条规则一个错峰状态')
  assert.equal(pricing.body.offPeakNow[0], false, '没有错峰窗口的规则永远不是错峰')
  // 内置官方价目：自动生效，界面靠这段渲染「已内置 N 条（来源见 …）」
  assert.ok(pricing.body.catalog.entries > 0, '内置价目条数透出给界面')
  assert.ok(pricing.body.catalog.sources.length >= 4, '按来源分组：DeepSeek / Kimi / Z.ai / OpenRouter')
  for (const source of pricing.body.catalog.sources) {
    assert.ok(/^https:\/\//.test(source.source), '每条来源都是精确 URL：' + source.source)
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(source.fetchedAt), '每条来源都带抓取日期')
    assert.ok(source.providers.length > 0 && source.count > 0)
  }
  assert.equal(pricing.body.coverage.ruleModels, 1, 'opencode-go 命中规则')
  assert.equal(pricing.body.coverage.unpricedModels, 1, 'local 既没规则也没台账成本')
  // 参照值：近 30 天所有行按规则口径算 = 台账两天（1000+200+8000 与 2000+400+16000）
  const ledgerDayCost = (1000 * 2 + 200 * 8 + 8000 * 0.2) / 1000 + (2000 * 2 + 400 * 8 + 16000 * 0.2) / 1000
  assert.ok(Math.abs(pricing.body.coverage.ruleCostByCurrency.CNY - ledgerDayCost) < 1e-9)

  // 台账天保留官方成本，会话补位天按规则算
  const pricedUsage = await priced('/dsh-key-usage/usage?from=2026-10-12&to=2026-10-20')
  assert.deepEqual(pricedUsage.body.days.map((day) => day.costSource), ['official', 'official', 'rule'])
  assert.equal(pricedUsage.body.days[0].models[0].costSource, 'official', '台账天不重算')
  assert.equal(pricedUsage.body.days[2].cost, 1.12, '规则算出的会话天成本')
  assert.equal(pricedUsage.body.totals.costSource, 'rule', '总计划到最弱的那一格')

  // /models /sessions /projects 三处同一口径：输入 1400 + 输出 240 + 缓存读 8000
  const expectedCost = Math.round((1400 * 2 + 240 * 8 + 8000 * 0.2) / 1000 * 100) / 100
  const pricedModels = await priced('/dsh-key-usage/models')
  assert.equal(pricedModels.body.rows[0].cost, expectedCost)
  assert.equal(pricedModels.body.rows[0].costSource, 'rule')
  assert.equal(pricedModels.body.rows[0].buckets.cacheWriteTokens, 0, '分桶补上 cacheWrite（只用于计费）')

  const pricedSessions = await priced('/dsh-key-usage/sessions')
  assert.equal(pricedSessions.body.rows[0].cost, expectedCost)
  assert.equal(pricedSessions.body.rows[0].costSource, 'rule')

  const pricedProjects = await priced('/dsh-key-usage/projects')
  assert.equal(pricedProjects.body.rows[0].cost, expectedCost)
  assert.equal(pricedProjects.body.rows[0].costSource, 'rule')

  // 总览「近 30 天」窗口内 opencode-go 只有台账天（10-12/10-13），所以仍然是官方；
  // 规则路径由上面的 /usage（含 10-20 会话天）覆盖，两处共用同一个 annotateCosts
  const pricedSummary = await priced('/dsh-key-usage/summary')
  const pricedChannel = pricedSummary.body.channels.find((row) => row.provider === 'opencode-go')
  assert.equal(pricedChannel.month.costSource, 'official', '台账覆盖期内标官方，不按规则重算')
  const localChannelSummary = pricedSummary.body.channels.find((row) => row.provider === 'local')
  assert.equal(localChannelSummary.month.costSource, 'official', '台账里有官方成本时标官方')

  // 没有规则源（默认）时行为与升级前一致：既没有规则也没有台账成本 → 无依据
  const unpricedUsage = await callEndpoint('/dsh-key-usage/usage?from=2026-10-20&to=2026-10-20')
  assert.equal(unpricedUsage.body.days[0].costSource, 'none')
  assert.equal(unpricedUsage.body.days[0].cost, 0)
}

// ===== 预算与告警：阈值来自宿主设置服务，未配置时必须 enabled:false（而不是报错） =====
{
  // 期望值按夹具算：日历月内「台账优先、缺日由会话补位」的展示口径之和
  // （与 /summary 一样，夹具日期被假设落在当前自然月；月份变了这里跟着变，断言不会失真）
  const ledgerDayTokens = { '2026-10-12': 9200 + 120, '2026-10-13': 18400 }
  const sessionOnlyDayTokens = { '2026-10-20': 440 }
  const expectedTokensBetween = (from, to) => {
    let total = 0
    for (const [date, tokens] of Object.entries({ ...sessionOnlyDayTokens, ...ledgerDayTokens })) {
      if (date >= from && date <= to) total += tokens
    }
    return total
  }
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const monthFromKey = todayKey.slice(0, 8) + '01'
  const expectedMonthTokens = expectedTokensBetween(monthFromKey, todayKey)
  const expectedTodayTokens = expectedTokensBetween(todayKey, todayKey)

  const unconfigured = await callEndpoint('/dsh-key-usage/budget')
  assert.equal(unconfigured.status, 200)
  assert.equal(unconfigured.body.enabled, false, '没有任何阈值 = 不启用（不是报错）')
  assert.equal(unconfigured.body.level, 'ok')
  assert.deepEqual(unconfigured.body.entries, [])
  assert.deepEqual(unconfigured.body.thresholds, { dailyTokens: 0, monthlyTokens: 0, monthlyCost: [] })
  assert.equal(unconfigured.body.today.date, todayKey, '「今日」按服务器本地日历日')
  assert.equal(unconfigured.body.month.from, monthFromKey, '「本月」按本地日历月首日，不是滚动 30 天')
  assert.equal(unconfigured.body.month.to, todayKey)
  assert.equal(unconfigured.body.today.tokens, expectedTodayTokens)
  assert.equal(unconfigured.body.month.tokens, expectedMonthTokens, '与台账 × 会话合并同一口径')

  // 非回环一律 403（与其它端点同一写法）
  const foreignBudget = await callEndpoint('/dsh-key-usage/budget', '10.0.0.7')
  assert.equal(foreignBudget.status, 403)
  assert.deepEqual(foreignBudget.body, { error: 'loopback only' })

  // 配了阈值：阈值 = 本月 Tokens 时正好用满（夹具不在本月则该阈值等于 0 → 不启用，两种都断言）
  const configuredBudgetHandlers = new Map()
  mountKeyUsageRoutes(
    { register: (route) => { configuredBudgetHandlers.set(route.path, route.handler) } },
    sessionSource,
    undefined,
    undefined,
    undefined,
    { current: () => ({ dailyTokens: 0, monthlyTokens: expectedMonthTokens, monthlyCost: [] }) },
  )
  const configured = await callHandler(configuredBudgetHandlers, '/dsh-key-usage/budget')
  const hasMonthUsage = expectedMonthTokens > 0
  assert.equal(configured.body.enabled, hasMonthUsage, '阈值 > 0 才启用')
  assert.equal(configured.body.thresholds.monthlyTokens, expectedMonthTokens, '透出归一后的阈值')
  assert.equal(configured.body.level, hasMonthUsage ? 'over' : 'ok', '用满上限即视为超限')
  assert.equal(configured.body.entries[0]?.kind ?? null, hasMonthUsage ? 'monthlyTokens' : null)
  assert.equal(configured.body.entries[0]?.used ?? 0, hasMonthUsage ? expectedMonthTokens : 0)
  assert.equal(configured.body.entries[0]?.percent ?? 0, hasMonthUsage ? 100 : 0)
}

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
