/**
 * 路由集成测试：把 DSH_HOME 指向临时夹具，直接调用各端点 handler 校验响应结构（含 /rates、/fx、按币种拆分）。
 * 运行：node test/routes.test.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collapseOrphanProjects, mountKeyUsageRoutes, parseDays, parseRatesLimit } from '../lib/routes.js'
import { createSessionSource } from '../lib/data/sessions.js'
import { foldSessionEvents, summarizeSession } from '../lib/data/session-usage.js'

/** 本地日历日（与 routes 的 shiftedDayKey 同一口径）；夹具用相对日期，避免依赖运行当天的具体日期。 */
function localDayKey(offsetDays) {
  const date = new Date(Date.now() + offsetDays * 86400000)
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

/** 本地某天的某个小时（毫秒时间戳）。 */
function localTimeOf(offsetDays, hour, minute = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0).getTime()
}

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

// 台账与会话夹具的日期一律相对「今天」：写死的日期一旦滑出近 30 天 / 热力图窗口，断言会随日历失效
const ledgerOlderDay = localDayKey(-3)
const ledgerNewerDay = localDayKey(-2)
const sessionOnlyDay = localDayKey(0)

writeFileSync(join(home, 'dsh-usage', 'usage-ledger.json'), JSON.stringify({
  version: 1,
  days: {
    [ledgerOlderDay]: {
      'opencode-go': { 'GLM-5.3-Flash': { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 8000, cacheWriteTokens: 0, reasoningTokens: 0, calls: 3, cost: 0 } },
      local: { Qwen3: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, calls: 1, cost: 0 } },
    },
    [ledgerNewerDay]: {
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

const morning = localTimeOf(-2, 9, 15)
// 今天刻意落在台账覆盖之外：用来验证「台账缺的日期由会话补位」
const outsideLedger = localTimeOf(0, 14, 30)
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
  // 提问词频统计字段（快照 prompts 段直接聚合它们；数据源外部注入时也允许缺这些字段）
  promptCount: 2,
  promptChars: 24,
  words: new Map([['分析', 3], ['snapshot.json', 2], ['ledger', 1]]),
  promptFirstTime: morning,
  promptLastTime: outsideLedger,
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
await warmUp(handlers)

async function callHandler(handlers, path, remoteAddress = '127.0.0.1', body = null) {
  const handler = handlers.get(path.split('?')[0])
  assert.ok(handler !== undefined, '端点应已注册：' + path)
  let status = 0
  let payload = ''
  const request = { socket: { remoteAddress }, url: path, method: body === null ? 'GET' : 'POST' }
  if (body !== null) {
    // 真实宿主给的是可读流；夹具用异步迭代器模拟（handler 只依赖 asyncIterator）
    const buffer = Buffer.from(body, 'utf8')
    request[Symbol.asyncIterator] = async function* () { yield buffer }
  }
  await handler(
    request,
    { writeHead: (code) => { status = code }, end: (value) => { payload = value } },
  )
  return { status, body: payload === '' ? null : JSON.parse(payload) }
}

/** 打开页面现在不等构建（先给本机快照、重建放后台）：测试里先等首次构建落地再断言端点内容。 */
async function warmUp(handlerMap) {
  const first = await callHandler(handlerMap, '/dsh-key-usage/snapshot')
  assert.equal(first.status, 200)
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const probe = await callHandler(handlerMap, '/dsh-key-usage/snapshot')
    if (probe.body.building === false) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('首次快照构建没有在预期时间内完成')
}

async function callEndpoint(path, remoteAddress = '127.0.0.1') {
  return callHandler(handlers, path, remoteAddress)
}

/**
 * 递归校验「单币种时 costsByCurrency 只有一个键、值等于 cost」这条契约（漏改某个端点会被它挡住）。
 */
function assertMoneyInvariant(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertMoneyInvariant(entry, path + '[' + String(index) + ']'))
    return
  }
  if (value === null || typeof value !== 'object') return
  if (Object.prototype.hasOwnProperty.call(value, 'cost') && value.costsByCurrency !== undefined) {
    const currencies = Object.keys(value.costsByCurrency)
    if (currencies.length === 1) {
      assert.equal(value.costsByCurrency[currencies[0]], value.cost, path + '：单币种时拆分值必须等于 cost')
    }
    if (value.cost === null) assert.deepEqual(value.costsByCurrency, {}, path + '：没有金额就不该有币种小计')
  }
  for (const [key, entry] of Object.entries(value)) assertMoneyInvariant(entry, path + '.' + key)
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
const usage = await callEndpoint('/dsh-key-usage/usage?from=' + ledgerOlderDay + '&to=' + ledgerNewerDay)
assert.equal(usage.body.totals.calls, 10)
assert.equal(usage.body.days.length, 2)
assert.equal(usage.body.hours, null, '多日范围不返回小时数据')
const singleDay = await callEndpoint('/dsh-key-usage/usage?from=' + ledgerNewerDay + '&to=' + ledgerNewerDay)
assert.equal(singleDay.body.days.length, 1)
assert.equal(singleDay.body.hours.length, 24, '单日范围返回 24 小时槽')
assert.equal(singleDay.body.hours[9].calls, 1, '小时数据来自会话事件')
assert.equal(singleDay.body.hours[9].buckets.cacheReadTokens, 8000)

// 通道过滤
const filtered = await callEndpoint('/dsh-key-usage/usage?from=' + ledgerOlderDay + '&to=' + ledgerNewerDay + '&provider=local')
assert.equal(filtered.body.totals.calls, 1)

// 热力图：台账两天 + 会话补齐的一天
const heatmap = await callEndpoint('/dsh-key-usage/heatmap')
assert.equal(heatmap.body.days.length, 3)
assert.equal(heatmap.body.days[1].totalTokens, 18400)
assert.equal(heatmap.body.days[2].date, sessionOnlyDay)
assert.equal(heatmap.body.days[2].totalTokens, 440, '台账缺的日期由会话事件补进热力图')
assert.deepEqual(heatmap.body.sessionDates, [sessionOnlyDay])

// 余额 / 窗口：按配置的通道逐个返回；首次构建（还没有快照）就把结果写进快照
const quota = await callEndpoint('/dsh-key-usage/quota')
assert.equal(quota.body.providers.length, 2, '每个通道一条')
const opencodeQuota = quota.body.providers.find((row) => row.provider === 'opencode-go')
assert.equal(opencodeQuota.source, 'snapshot', '未注入实时服务时回落快照')
assert.equal(opencodeQuota.snapshotOrigin, 'host', '插件自己还没有值时，如实标出值来自宿主那份')
assert.equal(opencodeQuota.plan.windows.length, 2, '宿主快照里 week / month 两个窗口')
assert.equal(opencodeQuota.updatedAt, 1791000000000, '值的时间就是宿主快照的时间（旧的，界面要标出来）')
const localQuota = quota.body.providers.find((row) => row.provider === 'local')
assert.equal(localQuota.source, 'snapshot')
assert.equal(localQuota.supported, false, '本地端点没有余额接口，界面不该提示「查询失败」')
assert.equal(localQuota.error, 'no-snapshot', '既无实时也无快照时给出原因')

// 统一快照：首次请求物化一份，6 个 tab 共用（写盘 + 读回）
const snapshotFile = join(home, 'dsh-key-usage', 'snapshot.json')
assert.equal(existsSync(snapshotFile), true, '首次请求后应写出统一快照')
const firstSnapshot = await callEndpoint('/dsh-key-usage/snapshot')
assert.equal(firstSnapshot.body.ok, true)
assert.equal(firstSnapshot.body.buildSource, 'initial')
assert.equal(firstSnapshot.body.building, false)
assert.deepEqual(Object.keys(firstSnapshot.body.sections).sort(), [
  'channels', 'heatmap', 'models', 'overview', 'projects', 'prompts', 'quota', 'sessions', 'usage',
])
assert.equal(firstSnapshot.body.sections.overview.channels.length, 2, '总览段 = /summary 响应体')
assert.equal(firstSnapshot.body.sections.channels.channels.length, 2, '通道段 = /channels 响应体')
assert.equal(firstSnapshot.body.sections.usage.availableFrom, ledgerOlderDay, '使用明细段 = 默认范围（近 30 天 / 全部通道）')
assert.deepEqual(firstSnapshot.body.sections.prompts, {
  words: [{ word: '分析', count: 3 }, { word: 'snapshot.json', count: 2 }, { word: 'ledger', count: 1 }],
  totalPrompts: 2,
  totalChars: 24,
  from: ledgerNewerDay,
  to: sessionOnlyDay,
}, 'prompts 段 = 跨会话词频合并结果（不含提问原文）')
assert.equal(JSON.stringify(firstSnapshot.body.sections.prompts).includes('夹具会话'), false, '词云不下发提问原文')
assert.equal(firstSnapshot.body.quotaOutcome.providers.length, 2)
assert.equal(firstSnapshot.body.stale === undefined, true, 'stale 只出现在 quotaOutcome 的通道条目里')
assert.ok(firstSnapshot.body.issues.some((issue) => issue.kind === 'build-duration'), '构建耗时进 issues')

// 只读端点与快照同源：/channels 与 /summary 直接给快照里的对应段
assert.deepEqual((await callEndpoint('/dsh-key-usage/channels')).body, firstSnapshot.body.sections.channels)
assert.deepEqual((await callEndpoint('/dsh-key-usage/summary')).body, firstSnapshot.body.sections.overview)

// 打开页面（?fresh=1）：本地段在防抖下限内不重复重算、配额刚查过也不补查，
// 但两个状态标记必须在响应里（客户端按 building / quotaRefreshing 追取）
const reopened = await callEndpoint('/dsh-key-usage/snapshot?fresh=1')
assert.equal(reopened.body.ok, true)
assert.equal(reopened.body.buildSource, 'initial', '刚建过（10 秒防抖内）不重复重算本地段')
assert.equal(reopened.body.building, false)
assert.equal(reopened.body.quotaRefreshing, false, '配额刚查过（60 秒闸门内）不补查')
assert.equal(typeof reopened.body.quotaRefreshing, 'boolean', '标记要下发（客户端据此决定追不追）')
assert.deepEqual(reopened.body.sections.sessions, firstSnapshot.body.sections.sessions, '复用的仍是同一份快照')

// 按需下发（?sections=a,b,c）：只裁剪 sections 段，顶层字段一律保留；不传 = 全量（向后兼容）
const allSectionNames = ['channels', 'heatmap', 'models', 'overview', 'projects', 'prompts', 'quota', 'sessions', 'usage']
const onlyChannels = await callEndpoint('/dsh-key-usage/snapshot?sections=channels')
assert.deepEqual(Object.keys(onlyChannels.body.sections), ['channels'], '只回请求的那一段')
assert.deepEqual(onlyChannels.body.sections.channels, firstSnapshot.body.sections.channels, '裁剪只影响下发，内容不变')

// 词云段同样受 ?sections= 裁剪（分布页切到时才取，不占首屏体积）
const onlyPrompts = await callEndpoint('/dsh-key-usage/snapshot?sections=prompts')
assert.deepEqual(Object.keys(onlyPrompts.body.sections), ['prompts'], '词云段可按需单独下发')
assert.deepEqual(onlyPrompts.body.sections.prompts, firstSnapshot.body.sections.prompts, '裁剪只影响下发，内容不变')
for (const field of ['ok', 'building', 'quotaRefreshing', 'version', 'updatedAt', 'buildSource', 'quotaOutcome', 'issues']) {
  assert.deepEqual(onlyChannels.body[field], firstSnapshot.body[field], '顶层字段 ' + field + ' 不因裁剪而变')
}

// 与 fresh=1 组合 + 多段（名字 trim + 小写比对）
const combinedSections = await callEndpoint('/dsh-key-usage/snapshot?fresh=1&sections=%20Overview%20,%20channels%20')
assert.deepEqual(Object.keys(combinedSections.body.sections).sort(), ['channels', 'overview'])
assert.equal(combinedSections.body.building, false)
assert.equal(combinedSections.body.quotaRefreshing, false, '组合查询照常走到 fresh 那套逻辑')
assert.deepEqual(combinedSections.body.sections.overview, firstSnapshot.body.sections.overview)
assert.deepEqual(combinedSections.body.sections.channels, firstSnapshot.body.sections.channels)

// 未知名字忽略；一个合法段都不剩（含空值）时 fail-open 返回全部段，不报错
const partialSections = await callEndpoint('/dsh-key-usage/snapshot?sections=nope,quota')
assert.deepEqual(Object.keys(partialSections.body.sections), ['quota'], '认得的留下、不认得的忽略')
for (const query of ['sections=nope', 'sections=', 'sections=%20,%20']) {
  const fellBack = await callEndpoint('/dsh-key-usage/snapshot?' + query)
  assert.equal(fellBack.status, 200)
  assert.deepEqual(Object.keys(fellBack.body.sections).sort(), allSectionNames, 'fail-open 返回全部段：' + query)
}

// 不带参数：行为与改动前一致（全量下发）
const noSectionsParam = await callEndpoint('/dsh-key-usage/snapshot')
assert.deepEqual(Object.keys(noSectionsParam.body.sections).sort(), allSectionNames)

// 会话派生的三段同理（「统一快照是唯一数据来源」的回归哨兵）：端点调的是同一批构建器函数，
// limit 取到上限（1000）时必须与快照段逐字段相同 —— 一旦有人给端点另算一份，这里立刻红
assert.deepEqual(
  (await callEndpoint('/dsh-key-usage/sessions?limit=1000')).body,
  firstSnapshot.body.sections.sessions,
  '会话段 = /sessions 响应体（同一批构建器函数）',
)
assert.deepEqual(
  (await callEndpoint('/dsh-key-usage/projects?limit=1000')).body,
  firstSnapshot.body.sections.projects,
  '项目段 = /projects 响应体（同一批构建器函数）',
)
assert.deepEqual(
  (await callEndpoint('/dsh-key-usage/models?limit=1000')).body,
  firstSnapshot.body.sections.models,
  '模型段 = /models 响应体（同一批构建器函数）',
)

// 手动刷新（POST /refresh）：重算全部 + 查配额（联网），成功的通道标 live
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
mountKeyUsageRoutes(
  { register: (route) => { liveHandlers.set(route.path, route.handler) } },
  sessionSource,
  stubLiveQuota,
  undefined,
  { snapshotIntervalMs: 0 },
)

const refreshed = await callHandler(liveHandlers, '/dsh-key-usage/refresh', '127.0.0.1', '')
assert.equal(refreshed.body.ok, true)
assert.equal(refreshed.body.buildSource, 'manual')
const liveOpencode = refreshed.body.sections.quota.providers.find((row) => row.provider === 'opencode-go')
assert.equal(liveOpencode.source, 'live', '实时成功时用实时值')
assert.equal(liveOpencode.fetchedAt, 1791000900000)
assert.deepEqual(liveOpencode.plan.windows.map((window) => window.key), ['5h', 'week', 'month'])
assert.equal(liveOpencode.supported, true, '有查询方案的通道标 supported')
const liveState = refreshed.body.quotaOutcome.providers.find((entry) => entry.provider === 'opencode-go')
assert.equal(liveState.ok, true)
assert.equal(liveState.stale, false)
assert.equal(liveState.capturedAt, new Date(1791000900000).toISOString(), 'capturedAt = 这次实时取数时间')
const localState = refreshed.body.quotaOutcome.providers.find((entry) => entry.provider === 'local')
assert.equal(localState.ok, false, '没有查询方案的通道不算「查到了」')
assert.equal(localState.stale, false, '没有值可展示时不该谎称「正在展示旧值」')
assert.equal(localState.capturedAt, null)

// 通道段按最新配额重建：额度百分比取实时窗口（5h 19%），不是宿主那份 month 76%
const liveChannels = await callHandler(liveHandlers, '/dsh-key-usage/channels')
const liveOpencodeChannel = liveChannels.body.channels.find((channel) => channel.provider === 'opencode-go')
assert.equal(liveOpencodeChannel.quotaPercent, 19, '额度百分比取实时窗口')
assert.equal(liveOpencodeChannel.quotaWindowKey, '5h')
assert.equal(liveOpencodeChannel.quotaStale, false)
assert.equal(liveOpencodeChannel.quotaError, null)

// 实时失败的通道：显示「最近一次成功」的旧值 + 数据时间 + 本次失败原因，绝不静默当最新
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
  undefined,
  { snapshotIntervalMs: 0 },
)
const afterFailure = await callHandler(failedHandlers, '/dsh-key-usage/refresh', '127.0.0.1', '')
assert.equal(afterFailure.body.ok, true, '配额失败不影响刷新本身')
const staleOpencode = afterFailure.body.sections.quota.providers.find((row) => row.provider === 'opencode-go')
assert.equal(staleOpencode.source, 'snapshot')
assert.equal(staleOpencode.error, 'timeout', '失败原因照常透出')
assert.equal(staleOpencode.updatedAt, 1791000900000, '回落的是插件自己「最近一次成功」的值，不是宿主那份 14 天前的 76%')
assert.equal(staleOpencode.snapshotOrigin, 'own', '并如实标出值来自本机快照')
assert.deepEqual(staleOpencode.plan.windows.map((window) => window.key), ['5h', 'week', 'month'])
const staleState = afterFailure.body.quotaOutcome.providers.find((entry) => entry.provider === 'opencode-go')
assert.equal(staleState.ok, false)
assert.equal(staleState.stale, true, '正在展示旧值 → stale')
assert.equal(staleState.capturedAt, new Date(1791000900000).toISOString(), '带上数据时间')
assert.equal(staleState.error, 'timeout')

// 总览的窗口单元格同样能标出「数据时间 · 本机快照 · 本次失败原因」，且百分比仍是最近一次成功的值
const staleChannels = await callHandler(failedHandlers, '/dsh-key-usage/channels')
const staleChannel = staleChannels.body.channels.find((channel) => channel.provider === 'opencode-go')
assert.equal(staleChannel.quotaStale, true)
assert.equal(staleChannel.quotaCapturedAt, new Date(1791000900000).toISOString())
assert.equal(staleChannel.quotaError, 'timeout')
assert.equal(staleChannel.quotaSnapshotOrigin, 'own')
assert.equal(staleChannel.quotaPercent, 19, '不再回落到宿主那份 month 76%')
assert.equal(staleChannel.quotaWindowKey, '5h')

// 总览汇总：今日与近 30 天
const summary = await callEndpoint('/dsh-key-usage/summary')
const summaryOpencode = summary.body.channels.find((row) => row.provider === 'opencode-go')
assert.equal(summaryOpencode.month.calls, 10, '台账两天 3 + 6，加会话补齐的今天 1')
const todayKey = summary.body.range.today
assert.equal(todayKey, sessionOnlyDay, '「今日」按服务器当天计算')
assert.equal(summaryOpencode.today.calls, 1, '今天只有会话补齐的那一条')

// 会话：模型归属归一 + 成本（台账里没有该模型的账单，走「同模型官方价目」这一档）
const sessions = await callEndpoint('/dsh-key-usage/sessions')
assert.equal(sessions.body.rows.length, 1)
assert.equal(sessions.body.rows[0].provider, 'opencode-go', 'pi-ai 路由归一到通道')
assert.equal(sessions.body.rows[0].providerLabel, 'opencode-go')
assert.equal(
  sessions.body.rows[0].costSource,
  'model',
  '本通道没有 GLM-5.3-Flash 的价目 → 用同名模型的官方价目（内置价目知道 GLM 的厂商是 zai）',
)
assert.equal(sessions.body.rows[0].cost, 0, '有价目依据，但夹具用量太小、四舍五入到分后是 0.00')
assert.deepEqual(sessions.body.rows[0].costsByCurrency, { USD: 0 }, '有依据的 0 元进币种小计（无依据的 0 元才不进）')
assert.equal(sessions.body.priced, true, '这份数据里有行命中了价目')
assert.equal(sessions.body.rows[0].costMode, 'sub')
assert.equal(sessions.body.coverage.status, 'complete')
assert.equal(sessions.body.rows[0].archived, false, '没有归档集合时标记为未归档')

// 归档标记与标题：夹具里补一份 storages/workspace.json 与投影缓存
mkdirSync(join(home, 'storages'), { recursive: true })
writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({
  global: { archivedSessionIds: ['session-fixture'] },
  // 工作区表：项目页靠它把「工作目录」对齐成侧边栏里的「工作区」（名字用 title）
  tables: { workspaces: { 'ws-easyjob': { path: 'D:\\EasyJob', title: 'EasyJob', sessionIds: [] } } },
}), 'utf8')
writeFileSync(join(home, 'storages', 'session_projcache.json'), JSON.stringify({
  tables: { sessions: { 'session-fixture': { rows: { title: { val: '夹具会话标题' } } } } },
}), 'utf8')
// 新的按会话分文件投影：侧边栏显示名与「真子代理」判定的权威来源，优先于上面那份聚合文件
mkdirSync(join(home, 'storages', 'session_projcache', 'sessions'), { recursive: true })
writeFileSync(join(home, 'storages', 'session_projcache', 'sessions', 'session-fixture.json'), JSON.stringify({
  version: 7,
  record: { identity: { isSeeded: true }, rows: { title: { val: '夹具投影标题' }, subagent: { val: {} } } },
}), 'utf8')
const sessionsWithMeta = await callEndpoint('/dsh-key-usage/sessions')
assert.equal(sessionsWithMeta.body.rows[0].archived, true, '归档集合命中（session- 前缀归一后比对）')
assert.equal(sessionsWithMeta.body.rows[0].title, '夹具投影标题', '标题取按会话分文件的投影（优先于旧聚合文件）')
assert.equal(sessionsWithMeta.body.rows[0].origin, null, '投影里 subagent.val 为空 → 不是子代理（seed 续接的会话算主会话）')
const projectsWithMeta = await callEndpoint('/dsh-key-usage/projects')
assert.equal(projectsWithMeta.body.rows[0].archivedSessionCount, 1, '项目行统计已归档数，用量不剔除')

// 项目：按工作目录聚合，并标出宿主工作区名
const projects = await callEndpoint('/dsh-key-usage/projects')
assert.equal(projects.body.rows.length, 1)
assert.equal(projects.body.rows[0].workspace, 'D:\\EasyJob')
assert.equal(projects.body.rows[0].workspaceTitle, 'EasyJob', '名字取宿主工作区 title（与侧边栏一致）')
assert.equal(projects.body.rows[0].registered, true)
assert.deepEqual(projects.body.rows[0].paths, ['D:\\EasyJob'])
assert.equal(projects.body.rows[0].tokens, 9200 + 440, '两次结算样本的 tokens 之和')
assert.equal(projects.body.rows[0].dominantProvider, 'opencode-go')
// 项目行成本 = 行内模型成本之和：GLM-5.3-Flash 走「同模型官方价目」（USD），夹具用量太小 → 0.00
assert.equal(projects.body.rows[0].costSource, 'model')
assert.equal(projects.body.rows[0].cost, 0)
assert.deepEqual(projects.body.rows[0].costsByCurrency, { USD: 0 })

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
// 与 /sessions 同口径：GLM-5.3-Flash 通过「同模型官方价目」拿到 Z.ai 的官方价（USD）
assert.equal(modelRow.costSource, 'model')
assert.equal(modelRow.cost, 0, '有价目依据，夹具用量太小、四舍五入到分后是 0.00')
assert.deepEqual(modelRow.costsByCurrency, { USD: 0 })
assert.equal(models.body.coverage.status, 'complete')
assert.equal(models.body.priced, true)

// limit 生效，非法 limit 回落默认值而不是报错
const limited = await callEndpoint('/dsh-key-usage/models?limit=0')
assert.equal(limited.body.rows.length, 1, 'limit 非法时回落默认值')
const loopbackOnly = await callEndpoint('/dsh-key-usage/models', '10.0.0.7')
assert.equal(loopbackOnly.status, 403, '按模型端点同样只允许回环')

// 非回环一律 403
const foreign = await callEndpoint('/dsh-key-usage/channels', '192.168.1.9')
assert.equal(foreign.status, 403)
assert.deepEqual(foreign.body, { error: 'loopback only' })

// 台账缺的日期由会话补位（近两天在台账里，今天只在会话里）
const spanning = await callEndpoint('/dsh-key-usage/usage?from=' + ledgerOlderDay + '&to=' + sessionOnlyDay)
assert.deepEqual(spanning.body.days.map((day) => day.date), [ledgerOlderDay, ledgerNewerDay, sessionOnlyDay])
assert.deepEqual(spanning.body.sessionDates, [sessionOnlyDay], '只有台账缺的那天标为会话来源')
assert.equal(spanning.body.days[1].cost, 0, '台账那两天不重算成本')
assert.equal(spanning.body.days[2].inputTokens, 400, '会话补齐的那天带上了用量')

// 按币种拆分：台账天的官方 0 元带币种（CNY）；会话补齐的天现在也有依据（GLM-5.3-Flash → 同模型官方价目，USD）
assert.deepEqual(spanning.body.days[0].costsByCurrency, { CNY: 0 }, '台账金额带台账币种（该通道无内置价目 → 基准 CNY）')
assert.equal(spanning.body.days[0].models[0].costSource, 'official')
assert.deepEqual(spanning.body.days[0].models[0].costsByCurrency, { CNY: 0 })
assert.deepEqual(spanning.body.days[2].costsByCurrency, { USD: 0 }, '会话天按「同模型官方价目」算（GLM-5.3-Flash → zai）')
assert.deepEqual(spanning.body.days[2].models[0].costsByCurrency, { USD: 0 })
assert.equal(spanning.body.days[2].models[0].costSource, 'model')
assert.equal(spanning.body.totals.cost, 0)
assert.deepEqual(spanning.body.totals.costsByCurrency, { CNY: 0, USD: 0 }, '两个币种各 0 元：台账天 CNY + 会话天 USD')

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
  // GLM-5.3-Flash 走「同模型官方价目」（zai，USD）；夹具用量太小 → 0.00，但来源与币种都要如实给出
  assert.equal(session.models[0].costSource, 'model')
  assert.equal(session.models[0].cost, 0)
  assert.deepEqual(session.models[0].costsByCurrency, { USD: 0 })
  assert.equal(session.cost, 0)
  assert.deepEqual(session.costsByCurrency, { USD: 0 })
  assert.equal(session.costSource, 'model')
  assert.equal(detail.body.priced, true)

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
  // 长尾合并行的 model 为空：显示名由客户端按语言渲染（「其它 / Others」）
  assert.equal(manyRow.models[5].model, '')
  assert.equal(manyRow.models[5].provider, '')
  assert.equal(manyRow.models[5].tokens, 2200, '两个长尾模型合并')
  assert.equal(manyRow.models[5].calls, 2)
  assert.equal(manyRow.tokens, 7700, '合并只影响展示，行合计仍是全量')
  assert.equal(manyRow.models[0].sharePercent, 14.3)

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

// ===== 价目端点新契约：用户规则层已移除，只剩内置价目 + 聚合价 + 覆盖度 + 问题 =====
{
  const contractHandlers = new Map()
  mountKeyUsageRoutes({ register: (route) => { contractHandlers.set(route.path, route.handler) } }, sessionSource)
  const priced = (path, remoteAddress) => callHandler(contractHandlers, path, remoteAddress)

  const pricing = await priced('/dsh-key-usage/pricing')
  assert.equal(pricing.status, 200)
  // 冻结契约：字段集合就是这些，多一个少一个客户端都要跟着改
  assert.deepEqual(Object.keys(pricing.body).sort(), ['aggregate', 'catalog', 'coverage', 'currency', 'files', 'issues'])
  for (const removed of ['rules', 'rulesOrigin', 'writable', 'revision', 'offPeakNow', 'templates']) {
    assert.equal(pricing.body[removed], undefined, removed + ' 已随「你的规则」层移除')
  }
  assert.deepEqual(Object.keys(pricing.body.catalog).sort(), ['entries', 'rules', 'sources'])
  assert.deepEqual(Object.keys(pricing.body.files).sort(), ['catalog'])
  assert.deepEqual(Object.keys(pricing.body.files.catalog).sort(), ['entries', 'exists', 'path'])
  assert.equal(pricing.body.currency, 'CNY', '内置价目的基准币种')

  // 聚合价目（第三方 USD）：随包快照装载状态；客户端按这些字段渲染「装载来源 / 条目 / 模型 / 来源与许可」
  assert.equal(pricing.body.aggregate.loaded, 'shipped', '没有本地刷新文件时读随包快照')
  assert.ok(pricing.body.aggregate.path.endsWith(join('data', 'litellm-model-prices.json')), pricing.body.aggregate.path)
  assert.ok(pricing.body.aggregate.shippedPath.endsWith(join('data', 'litellm-model-prices.json')))
  assert.ok(pricing.body.aggregate.localPath.endsWith(join('dsh-key-usage', 'model-prices.json')))
  assert.ok(pricing.body.aggregate.entries > 1000, '可定价条目数：' + String(pricing.body.aggregate.entries))
  assert.ok(pricing.body.aggregate.models > 500, '去重模型名数：' + String(pricing.body.aggregate.models))
  assert.equal(pricing.body.aggregate.usd, true, '聚合价目只有美元，不做汇率换算')
  assert.equal(/^[0-9a-f]{64}$/.test(pricing.body.aggregate.sha256), true, '装载文件要有 sha256')
  assert.ok(pricing.body.aggregate.fetchedAt === null || Number.isFinite(Date.parse(pricing.body.aggregate.fetchedAt)))
  assert.equal(pricing.body.aggregate.license, 'MIT')
  assert.equal(/^[0-9a-f]{40}$/.test(pricing.body.aggregate.upstreamCommit), true)
  assert.ok(pricing.body.aggregate.source.startsWith('https://github.com/BerriAI/litellm'))
  // 夹具里的 GLM-5.3-Flash 在聚合价目里有 9 条同名候选、opencode-go 没有别名 →
  // 走「同模型官方价目」：内置价目知道 GLM 的厂商是 zai，用 zai 自己的那条键（USD）
  assert.equal(pricing.body.coverage.aggregateModels, 0, '别名不命中就不算通道内价目')
  assert.equal(pricing.body.coverage.partialModels, 0)
  assert.equal(pricing.body.coverage.modelModels, 1, 'GLM-5.3-Flash 通过厂商兜底拿到同模型官方价目')
  assert.equal(
    pricing.body.aggregate.issues.some((issue) => issue.kind === 'match-ambiguous'),
    false,
    '拿到金额的模型不该同时报「已跳过不参与定价」：' + JSON.stringify(pricing.body.aggregate.issues),
  )
  assert.equal(pricing.body.coverage.catalogModels, 0, '夹具里的模型都不在内置价目里')
  assert.equal(pricing.body.coverage.unpricedModels, 1, '夹具里还有一个完全没价目的模型')
  assert.deepEqual(Object.keys(pricing.body.coverage).sort(), [
    'aggregateModels', 'catalogModels', 'costByCurrency', 'from', 'modelModels', 'partialModels',
    'savingsByCurrency', 'savingsDetail', 'to', 'unpricedModels',
  ])
  // 近 30 天覆盖度含「台账两天 + 会话补齐的今天」：GLM 三段用量按同模型官方价目（USD）累加
  assert.deepEqual(pricing.body.coverage.costByCurrency, { USD: 0.0016 }, '命中价目的行按币种累加')
  assert.deepEqual(pricing.body.coverage.savingsByCurrency, { USD: 0.0029 })
  assert.equal(pricing.body.coverage.savingsDetail.length, 1)
  assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(pricing.body.coverage.from), true)
  assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(pricing.body.coverage.to), true)

  // 内置价目文件状态与解析问题
  assert.equal(pricing.body.files.catalog.exists, true, '内置价目随包发布')
  assert.ok(pricing.body.files.catalog.path.includes('pricing-catalog.yml'))
  assert.equal(pricing.body.files.catalog.entries, pricing.body.catalog.entries)
  assert.deepEqual(pricing.body.issues, [], '内置价目干净 → 没有问题')
  assert.ok(pricing.body.catalog.entries > 0, '内置价目条数透出给界面')
  assert.ok(pricing.body.catalog.sources.length >= 4, '按来源分组：DeepSeek / Kimi / Z.ai / OpenRouter')
  assert.equal(pricing.body.catalog.rules.length, pricing.body.catalog.entries, '逐条数值与条数一致')
  assert.equal(pricing.body.catalog.rules[0].note, '', '长 note 不下发：来源与抓取日期走 sources')
  for (const source of pricing.body.catalog.sources) {
    assert.ok(/^https:\/\//.test(source.source), '每条来源都是精确 URL：' + source.source)
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(source.fetchedAt), '每条来源都带抓取日期')
    assert.ok(source.providers.length > 0 && source.count > 0)
  }

  // 端点表就是这些：新增统一快照 /snapshot、手动刷新 /refresh 与系统日志 /log，删掉 /pricing/rules
  assert.deepEqual([...contractHandlers.keys()].sort(), [
    '/dsh-key-usage/channels',
    '/dsh-key-usage/fx',
    '/dsh-key-usage/heatmap',
    '/dsh-key-usage/log',
    '/dsh-key-usage/models',
    '/dsh-key-usage/pricing',
    '/dsh-key-usage/pricing/refresh',
    '/dsh-key-usage/projects',
    '/dsh-key-usage/quota',
    '/dsh-key-usage/rates',
    '/dsh-key-usage/refresh',
    '/dsh-key-usage/session',
    '/dsh-key-usage/sessions',
    '/dsh-key-usage/snapshot',
    '/dsh-key-usage/summary',
    '/dsh-key-usage/usage',
  ], '17 个端点 = 14 个只读 GET + 3 个写 POST（手动刷新 / 价目刷新 / 日志）')

  // /log：POST 追加 → GET 回读 → POST 清空；坏请求体与非回环都被挡住
  const logAppend = await callHandler(contractHandlers, '/dsh-key-usage/log', '127.0.0.1', JSON.stringify({
    records: [{ time: '2026-10-15T10:00:00.000Z', level: 'error', source: 'pricing', message: '刷新价目失败', detail: 'HTTP 502 · https://example.test/prices.json' }],
  }))
  assert.equal(logAppend.status, 200)
  assert.deepEqual(logAppend.body, { ok: true, written: 1 })
  const logRead = await priced('/dsh-key-usage/log?limit=10')
  assert.equal(logRead.status, 200)
  // 启动埋点（source=boot）也会落进同一个文件：断言只看业务日志，不因埋点条数变化而脆断
  const businessRecords = logRead.body.records.filter((record) => record.source !== 'boot')
  assert.equal(businessRecords.length, 1)
  assert.equal(businessRecords[0].message, '刷新价目失败')
  assert.equal(businessRecords[0].detail, 'HTTP 502 · https://example.test/prices.json')
  const logBadBody = await callHandler(contractHandlers, '/dsh-key-usage/log', '127.0.0.1', '不是 JSON')
  assert.equal(logBadBody.body.ok, false, '坏请求体回 {ok:false}，不抛错')
  const logClear = await callHandler(contractHandlers, '/dsh-key-usage/log', '127.0.0.1', JSON.stringify({ clear: true }))
  assert.deepEqual(logClear.body, { ok: true })
  assert.deepEqual((await priced('/dsh-key-usage/log')).body.records, [], '清空后回读为空')
  const logOutside = await priced('/dsh-key-usage/log', '10.0.0.7')
  assert.equal(logOutside.status, 403, '非回环一律 403')

  // /rates：GLM-5.3-Flash 走「同模型官方价目」（zai，USD），Qwen3 完全没有依据 → source = none
  const rates = await priced('/dsh-key-usage/rates')
  assert.equal(rates.status, 200)
  assert.deepEqual(Object.keys(rates.body).sort(), ['channels', 'from', 'to'])
  assert.deepEqual(rates.body.channels.map((row) => row.provider), ['opencode-go', 'local'], '按展示 tokens 降序')
  const ratesOpencode = rates.body.channels.find((row) => row.provider === 'opencode-go')
  assert.equal(ratesOpencode.label, 'opencode-go', '通道名兜底为 provider id')
  assert.equal(ratesOpencode.currency, 'USD', '该通道展示出来的模型币种一致（USD）')
  assert.equal(ratesOpencode.models.length, 1)
  assert.deepEqual(Object.keys(ratesOpencode.models[0]).sort(), [
    'calls', 'cost', 'costCurrency', 'currency', 'model', 'note', 'noteEn', 'offPeak', 'partial', 'rates', 'source', 'tokens',
  ])
  assert.equal(ratesOpencode.models[0].model, 'GLM-5.3-Flash')
  assert.equal(ratesOpencode.models[0].source, 'model', '本通道没价目 → 用同名模型的官方价目')
  assert.deepEqual(ratesOpencode.models[0].rates, { input: 0.15, cacheRead: 0.03, cacheWrite: 0, output: 0.5 })
  assert.equal(ratesOpencode.models[0].currency, 'USD')
  assert.equal(ratesOpencode.models[0].partial, false)
  // 这一档优先用内置价目里厂商自己那条（随包、带出处），所以 note 是 z.ai 文档的口径说明；
  // 只有内置价目没有时才退到聚合价，那时的 note 会写明上游键（`zai/glm-5.3-flash`）
  assert.ok(
    ratesOpencode.models[0].note.includes('GLM-5.3') || ratesOpencode.models[0].note.includes('zai/glm-5.3-flash'),
    'note 要能追溯到价目出处：' + ratesOpencode.models[0].note,
  )
  assert.equal(typeof ratesOpencode.models[0].cost, 'number', '有价目的行要给出这段用量的成本')
  // 夹具里这一行只有调用数、tokens 为 0，所以成本是 0（有价目就算，不因为 0 而变成 null）
  assert.ok(Number.isFinite(ratesOpencode.models[0].cost))
  assert.equal(ratesOpencode.models[0].costCurrency, 'USD', '成本币种跟价目一致')
  const ratesLocal = rates.body.channels.find((row) => row.provider === 'local')
  assert.equal(ratesLocal.currency, null, '没有任何币种依据')
  assert.equal(ratesLocal.models[0].cost, null, '无价目依据的行不给成本（不猜）')
  assert.equal(ratesLocal.models[0].costCurrency, null)
  assert.equal(ratesLocal.models[0].source, 'none')
  assert.equal(ratesLocal.models[0].rates, null)
  assert.ok(ratesLocal.models[0].note.includes('暂无价格依据'))
  assert.equal(ratesOpencode.models[0].offPeak, false)
  assert.equal(ratesOpencode.models[0].calls, 10, '台账两天 9 次 + 会话补齐的今天 1 次')

  // limit / days 归一：非法值回落默认，越大越截断
  const limitedRates = await priced('/dsh-key-usage/rates?limit=1')
  assert.equal(limitedRates.body.channels.every((row) => row.models.length <= 1), true)
  const tinyRange = await priced('/dsh-key-usage/rates?days=1')
  assert.deepEqual(tinyRange.body.channels.map((row) => row.provider), ['opencode-go'], '近 1 天只剩今天（会话补齐）的用量')
  assert.equal(parseDays(null), 30)
  assert.equal(parseDays('0'), 30)
  assert.equal(parseDays('abc'), 30)
  assert.equal(parseDays('7'), 7)
  assert.equal(parseDays('9999'), 400, '天数上限 400（与合并序列一致）')
  assert.equal(parseRatesLimit(null), 20)
  assert.equal(parseRatesLimit('-1'), 20)
  assert.equal(parseRatesLimit('abc'), 20)
  assert.equal(parseRatesLimit('50'), 50)
  assert.equal(parseRatesLimit('999'), 50, '每通道模型数上限 50')

  const foreignRates = await priced('/dsh-key-usage/rates', '10.0.0.7')
  assert.equal(foreignRates.status, 403, '单价表端点同样只允许回环')
  assert.deepEqual(foreignRates.body, { error: 'loopback only' })

  // 契约不变量：主夹具（没有价格依据）同样满足「没有金额就没有币种小计」
  for (const path of [
    '/dsh-key-usage/usage?from=' + ledgerOlderDay + '&to=' + sessionOnlyDay,
    '/dsh-key-usage/summary',
    '/dsh-key-usage/sessions',
    '/dsh-key-usage/projects',
    '/dsh-key-usage/models',
  ]) {
    assertMoneyInvariant((await priced(path)).body)
  }
}

// ===== POST /dsh-key-usage/pricing/refresh：只允许回环 + 只接受 POST =====
// 真刷新（联网、镜像回落、超限、坏 JSON 不覆盖）在 test/model-prices.test.mjs 里用注入的 fetch 验，避免测试打网络
{
  const foreignRefresh = await callEndpoint('/dsh-key-usage/pricing/refresh', '10.0.0.7')
  assert.equal(foreignRefresh.status, 403, '刷新端点与其它端点同一写法：非回环一律 403')
  assert.deepEqual(foreignRefresh.body, { error: 'loopback only' })

  const wrongMethodRefresh = await callEndpoint('/dsh-key-usage/pricing/refresh')
  assert.equal(wrongMethodRefresh.status, 200)
  assert.equal(wrongMethodRefresh.body.ok, false)
  assert.ok(wrongMethodRefresh.body.error.includes('POST'), wrongMethodRefresh.body.error)
}

// 台账整体缺失时不会变成空态，而是全量走会话事件
rmSync(join(home, 'dsh-usage', 'usage-ledger.json'))
const sessionOnlyUsage = await callEndpoint('/dsh-key-usage/usage')
assert.equal(sessionOnlyUsage.status, 200)
assert.deepEqual(sessionOnlyUsage.body.days.map((day) => day.date), [ledgerNewerDay, sessionOnlyDay])
assert.deepEqual(sessionOnlyUsage.body.sessionDates, [ledgerNewerDay, sessionOnlyDay])
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
// 手动刷新后，快照的通道段按新配置重建
const afterConfigRefresh = await callHandler(handlers, '/dsh-key-usage/refresh', '127.0.0.1', '')
assert.equal(afterConfigRefresh.body.ok, true)
const fallbackChannels = await callEndpoint('/dsh-key-usage/channels')
assert.equal(fallbackChannels.body.channels.length, 1, '组合产物为空时回退到 patch 层')
assert.equal(fallbackChannels.body.channels[0].provider, 'sensenova')
assert.equal(fallbackChannels.body.channels[0].costMode, 'free')

// ===== 有价格依据的夹具：内置官方价目（CNY）+ 同模型官方价目（USD）+ 无依据，四处金额按币种拆分 =====
// 单独一个 DSH_HOME：台账只有一条「两层价目都没命中」的模型（无依据），其余用量全来自会话事件。
{
  const pricedHome = mkdtempSync(join(tmpdir(), 'dsh-key-usage-priced-'))
  mkdirSync(join(pricedHome, 'profiles', 'desktop'), { recursive: true })
  mkdirSync(join(pricedHome, 'dsh-usage'), { recursive: true })

  // moonshotai → 内置官方价目（CNY）；opencode-go 没有内置价目，moonshot-v1-8k 在聚合价里同名唯一 → 同模型官方价目（USD）
  writeFileSync(join(pricedHome, 'profiles', 'desktop', 'cordis.yml'), [
    '- id: llm-pi-ai',
    '  config:',
    '    providers:',
    '      moonshotai:',
    '        apiKeyEnv: MOONSHOT_API_KEY',
    '        models:',
    '          - id: kimi-k3',
    '            name: Kimi K3',
    '      opencode-go:',
    '        apiKeyEnv: OPENCODE_GO_API_KEY',
    '        models:',
    '          - id: moonshot-v1-8k',
    '            name: Moonshot v1 8k',
    '',
  ].join('\n'), 'utf8')

  // 台账：mystery-model 两层价目都没命中 → 不给金额；台账里的 12.5 元只是那天的官方账单金额（costSource: official）
  writeFileSync(join(pricedHome, 'dsh-usage', 'usage-ledger.json'), JSON.stringify({
    version: 1,
    days: {
      [localDayKey(-3)]: {
        'opencode-go': {
          'mystery-model': { inputTokens: 4000000, outputTokens: 1000000, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, calls: 7, cost: 12.5 },
        },
      },
    },
  }), 'utf8')

  const pricedEvents = [
    { seq: 0, time: localTimeOf(-1, 10), type: 'user/message', data: { content: [{ type: 'text', text: '价目夹具' }] } },
    // 内置官方价目：kimi-k3 未命中 ¥20 / MTok、输出 ¥100 / MTok → 1M 输入 + 0.1M 输出 = ¥30
    { seq: 1, time: localTimeOf(-1, 10), type: 'assistant/chunk', data: { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 1000000, outputTokens: 100000, cacheReadTokens: 0 } }, message: { source: { provider: 'pi-ai/moonshotai', model: 'kimi-k3' } } } },
    // 同模型官方价目：moonshot-v1-8k 在 LiteLLM 里全库唯一 → USD 0.2 / MTok × 1M
    { seq: 2, time: localTimeOf(-1, 11), type: 'assistant/chunk', data: { turn: 2, step: 1, chunk: { type: 'usage', usage: { inputTokens: 1000000, outputTokens: 0, cacheReadTokens: 0 } }, message: { source: { provider: 'pi-ai/opencode-go', model: 'moonshot-v1-8k' } } } },
    // 未配置的通道 + 没有任何价目依据
    { seq: 3, time: localTimeOf(0, 9), type: 'assistant/chunk', data: { turn: 3, step: 1, chunk: { type: 'usage', usage: { inputTokens: 500000, outputTokens: 0, cacheReadTokens: 0 } }, message: { source: { provider: 'unlisted-vendor', model: 'unknown-model-x' } } } },
  ]
  const pricedFixture = createFakePersistence([
    ['session-priced', { header: { id: 'session-priced', title: '价目夹具会话', cwd: 'D:\\EasyJob', updatedAt: localTimeOf(0, 9) }, revision: Symbol('r1'), events: pricedEvents }],
  ])
  const pricedSessionSource = createSessionSource({ get: (name) => (name === 'sessionPersistence' ? pricedFixture.service : undefined) })

  const pricedHandlers = new Map()
  process.env.DSH_HOME = pricedHome
  mountKeyUsageRoutes({ register: (route) => { pricedHandlers.set(route.path, route.handler) } }, pricedSessionSource)
await warmUp(pricedHandlers)
  const pricedCall = (path, remoteAddress) => callHandler(pricedHandlers, path, remoteAddress)

  // ---- /rates：三档单价（catalog / model / none）与通道币种 ----
  const rates = await pricedCall('/dsh-key-usage/rates?days=30')
  assert.equal(rates.status, 200)
  assert.equal(rates.body.from, localDayKey(-29), '近 30 天的起点 = 今天 − 29 天')
  assert.equal(rates.body.to, localDayKey(0))
  assert.deepEqual(rates.body.channels.map((row) => row.provider), ['opencode-go', 'moonshotai', 'unlisted-vendor'], '按 tokens 降序')

  const opencodeRates = rates.body.channels[0]
  assert.equal(opencodeRates.currency, 'USD', '通道币种只按**有价的**行取：mystery-model 无依据（不带币种），剩下的是 USD')
  assert.deepEqual(opencodeRates.models.map((row) => row.model), ['mystery-model', 'moonshot-v1-8k'])
  const unpricedRow = opencodeRates.models[0]
  assert.equal(unpricedRow.source, 'none', '两层价目都没命中 → 无依据')
  assert.equal(unpricedRow.rates, null, '无依据不给单价表')
  assert.equal(unpricedRow.currency, null, '没有金额就没有币种（台账里的金额不再用来反推）')
  assert.equal(unpricedRow.tokens, 5000000)
  assert.equal(unpricedRow.calls, 7)
  assert.equal(unpricedRow.offPeak, false)
  assert.ok(unpricedRow.note.includes('暂无价格依据'), unpricedRow.note)
  const modelRow = opencodeRates.models[1]
  assert.equal(modelRow.source, 'model', '本通道没命中、同名模型全库唯一 → 同模型官方价目')
  assert.equal(modelRow.currency, 'USD')
  assert.deepEqual(modelRow.rates, { input: 0.2, cacheRead: 0, cacheWrite: 0, output: 2 }, 'LiteLLM 聚合价：USD / 每百万 tokens')
  assert.equal(modelRow.partial, false)
  assert.equal(modelRow.tokens, 1000000)

  const moonshotRates = rates.body.channels[1]
  assert.equal(moonshotRates.currency, 'CNY', '内置官方价目是 CNY')
  const catalogRow = moonshotRates.models[0]
  assert.equal(catalogRow.model, 'kimi-k3')
  assert.equal(catalogRow.source, 'catalog')
  assert.equal(catalogRow.currency, 'CNY')
  assert.deepEqual(catalogRow.rates, { input: 20, cacheRead: 2, cacheWrite: 20, output: 100 }, '内置官方价目：CNY / 每百万 tokens')
  assert.equal(catalogRow.partial, false)
  assert.equal(catalogRow.offPeak, false, 'kimi-k3 没有错峰价')
  assert.ok(catalogRow.note.includes('K3'), 'note 带官方价目口径说明')

  const unlistedRates = rates.body.channels[2]
  assert.equal(unlistedRates.provider, 'unlisted-vendor')
  assert.equal(unlistedRates.label, 'unlisted-vendor', '未配置的通道用 raw provider id 当 label')
  assert.equal(unlistedRates.currency, null)
  assert.equal(unlistedRates.models[0].source, 'none')
  assert.equal(unlistedRates.models[0].currency, null)
  assert.equal(unlistedRates.models[0].rates, null)
  assert.ok(unlistedRates.models[0].note.includes('暂无价格依据'), unlistedRates.models[0].note)

  // limit：每通道只留前 N 个模型
  const limitedRates = await pricedCall('/dsh-key-usage/rates?limit=1')
  assert.deepEqual(limitedRates.body.channels.map((row) => row.models.length), [1, 1, 1])
  assert.deepEqual(limitedRates.body.channels.map((row) => row.models[0].model), ['mystery-model', 'kimi-k3', 'unknown-model-x'])

  // days：只算今天 → 只剩今天那条用量
  const oneDay = await pricedCall('/dsh-key-usage/rates?days=1')
  assert.deepEqual(oneDay.body.channels.map((row) => row.provider), ['unlisted-vendor'])
  assert.equal(oneDay.body.from, localDayKey(0))

  // ---- /usage：官方天 + 会话天，逐天与合计都给按币种拆分 ----
  const usage = await pricedCall('/dsh-key-usage/usage?from=' + localDayKey(-3) + '&to=' + localDayKey(0))
  assert.equal(usage.status, 200)
  assert.deepEqual(usage.body.days.map((day) => day.date), [localDayKey(-3), localDayKey(-1), localDayKey(0)])
  assert.deepEqual(usage.body.days.map((day) => day.costSource), ['official', 'model', 'none'])
  assert.equal(usage.body.days[0].cost, 12.5, '台账天保留官方账单金额')
  assert.deepEqual(usage.body.days[0].costsByCurrency, { CNY: 12.5 })
  assert.equal(usage.body.days[1].cost, 30.2, 'CNY 30 + USD 0.2 按行相加（cost 语义不变）')
  assert.deepEqual(usage.body.days[1].costsByCurrency, { CNY: 30, USD: 0.2 }, '混币种按币种分列，不换算')
  assert.equal(usage.body.days[2].cost, 0, '没有任何价格依据的模型不产生金额')
  assert.deepEqual(usage.body.days[2].costsByCurrency, {})

  const kimiDay = usage.body.days[1]
  const kimiModelRow = kimiDay.models.find((row) => row.model === 'kimi-k3')
  assert.equal(kimiModelRow.costSource, 'catalog')
  assert.equal(kimiModelRow.cost, 30)
  assert.deepEqual(kimiModelRow.costsByCurrency, { CNY: 30 }, '单币种时拆分值等于 cost')
  const modelTierRow = kimiDay.models.find((row) => row.model === 'moonshot-v1-8k')
  assert.equal(modelTierRow.costSource, 'model', '同模型官方价目这一档')
  assert.equal(modelTierRow.cost, 0.2)
  assert.deepEqual(modelTierRow.costsByCurrency, { USD: 0.2 })

  assert.equal(usage.body.totals.cost, 42.7)
  assert.deepEqual(usage.body.totals.costsByCurrency, { CNY: 42.5, USD: 0.2 }, '合计按币种分列：CNY 12.5 + 30、USD 0.2')
  assert.equal(usage.body.totals.costSource, 'none', '总计划到最弱的那一格')

  // ---- /summary：今日 / 近 30 天两列都带按币种拆分 ----
  const summary = await pricedCall('/dsh-key-usage/summary')
  const summaryMoonshot = summary.body.channels.find((row) => row.provider === 'moonshotai')
  const summaryOpencode = summary.body.channels.find((row) => row.provider === 'opencode-go')
  assert.equal(summaryMoonshot.month.cost, 30)
  assert.deepEqual(summaryMoonshot.month.costsByCurrency, { CNY: 30 }, '单币种时拆分值等于 cost')
  assert.equal(summaryMoonshot.month.costSource, 'catalog')
  assert.equal(summaryMoonshot.today.cost, 0)
  assert.deepEqual(summaryMoonshot.today.costsByCurrency, { CNY: 0 }, '没有用量也给一个 0（币种按台账币种）')
  assert.equal(summaryOpencode.month.cost, 12.7, '官方账单 12.5 + 同模型官方价目 0.2')
  assert.deepEqual(summaryOpencode.month.costsByCurrency, { CNY: 12.5, USD: 0.2 })
  assert.equal(summaryOpencode.month.costSource, 'model', '官方账单最可信，同模型官方价目次之 → 取最弱的那一格')

  // ---- /sessions 与 /session：行、模型、详情三处都带拆分 ----
  const sessions = await pricedCall('/dsh-key-usage/sessions')
  assert.equal(sessions.body.rows.length, 1)
  const sessionRow = sessions.body.rows[0]
  assert.equal(sessionRow.id, 'session-priced')
  assert.equal(sessionRow.cost, 30.2, '无依据的模型不计入，但不影响其它模型的金额')
  assert.deepEqual(sessionRow.costsByCurrency, { CNY: 30, USD: 0.2 })
  assert.equal(sessionRow.costSource, 'none', '最弱的一格决定整行角标')
  assert.deepEqual(sessionRow.models.map((row) => row.model), ['kimi-k3', 'moonshot-v1-8k', 'unknown-model-x'])
  assert.deepEqual(sessionRow.models[0].costsByCurrency, { CNY: 30 })
  assert.deepEqual(sessionRow.models[1].costsByCurrency, { USD: 0.2 })
  assert.equal(sessionRow.models[2].cost, null)
  assert.deepEqual(sessionRow.models[2].costsByCurrency, {}, '没有金额的模型不带币种')

  const detail = await pricedCall('/dsh-key-usage/session?id=session-priced')
  assert.equal(detail.status, 200)
  assert.equal(detail.body.session.cost, 30.2)
  assert.deepEqual(detail.body.session.costsByCurrency, { CNY: 30, USD: 0.2 })
  assert.equal(detail.body.session.models.length, 3, '详情给全部模型')
  assert.deepEqual(detail.body.session.models.map((row) => row.costSource), ['catalog', 'model', 'none'])

  // ---- /models 与 /projects：单币种行拆分值等于 cost，混币种行分列 ----
  const models = await pricedCall('/dsh-key-usage/models')
  const modelRows = new Map(models.body.rows.map((row) => [row.provider + '|' + row.model, row]))
  assert.equal(modelRows.get('moonshotai|kimi-k3').cost, 30)
  assert.deepEqual(modelRows.get('moonshotai|kimi-k3').costsByCurrency, { CNY: 30 })
  assert.equal(modelRows.get('opencode-go|moonshot-v1-8k').cost, 0.2)
  assert.deepEqual(modelRows.get('opencode-go|moonshot-v1-8k').costsByCurrency, { USD: 0.2 })
  assert.equal(modelRows.get('unlisted-vendor|unknown-model-x').cost, null)
  assert.deepEqual(modelRows.get('unlisted-vendor|unknown-model-x').costsByCurrency, {})

  const projects = await pricedCall('/dsh-key-usage/projects')
  assert.equal(projects.body.rows.length, 1)
  assert.equal(projects.body.rows[0].cost, 30.2)
  assert.deepEqual(projects.body.rows[0].costsByCurrency, { CNY: 30, USD: 0.2 })

  // ---- /pricing：覆盖度按命中层次计数（catalog / aggregate / model / none） ----
  const pricing = await pricedCall('/dsh-key-usage/pricing')
  assert.equal(pricing.body.coverage.catalogModels, 1, 'kimi-k3 命中内置官方价目')
  assert.equal(pricing.body.coverage.aggregateModels, 0, '没有通道别名命中的模型')
  assert.equal(pricing.body.coverage.partialModels, 0)
  assert.equal(pricing.body.coverage.modelModels, 1, 'moonshot-v1-8k 走同模型官方价目（跨通道同名唯一）')
  assert.equal(pricing.body.coverage.unpricedModels, 2, 'mystery-model 与 unknown-model-x 都没有价格依据')
  assert.deepEqual(pricing.body.coverage.costByCurrency, { CNY: 30, USD: 0.2 }, '命中价目的行按币种分组（参照值）')
  assert.deepEqual(pricing.body.coverage.savingsByCurrency, {}, '没有缓存命中 → 不省任何钱')
  assert.deepEqual(pricing.body.coverage.savingsDetail, [])

  // ---- 契约不变量：上面所有响应里，单币种的 costsByCurrency 都必须等于 cost ----
  for (const response of [usage.body, summary.body, sessions.body, detail.body, models.body, projects.body, rates.body]) {
    assertMoneyInvariant(response)
  }

  process.env.DSH_HOME = home
  rmSync(pricedHome, { recursive: true, force: true })
}

rmSync(home, { recursive: true, force: true })

// ---- 项目行折叠：非工作区目录并成一行，工作区各占一行（纯函数，直接测） ----
{
  const row = (workspace, extra) => ({
    workspace, workspaceTitle: null, paths: [workspace], registered: false,
    calls: 1, tokens: 100, sessionCount: 1, archivedSessionCount: 0, lastTime: 1000,
    providers: { 'opencode-go': 100 }, models: [], cost: null, costsByCurrency: {}, costSource: 'none',
    partial: false, dominantProvider: 'opencode-go', ...extra,
  })
  const collapsed = collapseOrphanProjects([
    row('D:\\EasyJob', { workspaceTitle: 'EasyJob', registered: true, tokens: 500, calls: 5, lastTime: 5000, cost: 3, costsByCurrency: { CNY: 3 }, costSource: 'catalog' }),
    row('D:\\old\\A', { tokens: 200, calls: 2, lastTime: 2000 }),
    row('D:\\old\\B', { tokens: 300, calls: 3, lastTime: 3000, cost: 2, costsByCurrency: { CNY: 2 }, costSource: 'model', partial: true }),
  ])
  assert.equal(collapsed.length, 2, '1 个工作区 + 1 行「未归入工作区」')
  assert.equal(collapsed[0].workspaceTitle, 'EasyJob')
  const orphan = collapsed[1]
  assert.equal(orphan.workspace, '', '合并行没有单个目录')
  assert.deepEqual(orphan.paths, ['D:\\old\\A', 'D:\\old\\B'])
  assert.equal(orphan.tokens, 500, '用量累加')
  assert.equal(orphan.calls, 5)
  assert.equal(orphan.lastTime, 3000, '最近时间取最大')
  assert.equal(orphan.cost, null, '合并里有一行没有成本 → 合计不给数（宁可不给也不低估）')
  assert.equal(orphan.costSource, 'none', '来源取最弱的一层（一行没有依据 → 合计也不声称有依据）')
  assert.equal(orphan.partial, true)
  const allRegistered = collapseOrphanProjects([row('D:\\EasyJob', { registered: true, workspaceTitle: 'EasyJob' })])
  assert.equal(allRegistered.length, 1, '全部是工作区时原样返回')
}

console.log('routes.test: 全部通过')
