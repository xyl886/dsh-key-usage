/**
 * 统一快照离线测试：首次构建 / 读回、原子写、失败不覆盖、写盘守卫、
 * 定时器（假时钟）只重建本地段且不查配额、`/refresh` 串行化与超时、配额失败时 stale + capturedAt 保留。
 * 运行：node test/snapshot.test.mjs（依赖 lib/snapshot.js，改 src 后要先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SNAPSHOT_FILE, createSnapshotService, readSnapshotFile, snapshotPath, writeSnapshotFile } from '../lib/snapshot/snapshot.js'

const home = mkdtempSync(join(tmpdir(), 'dsh-key-usage-snapshot-'))
process.env.DSH_HOME = home
const path = join(home, 'dsh-key-usage', SNAPSHOT_FILE)

/** 构建器夹具：记录调用次数，可按需让某一步抛错 / 挂起。 */
function createBuilders() {
  const state = {
    localCalls: 0,
    quotaCalls: 0,
    channelsCalls: 0,
    failLocal: false,
    holdLocal: null,
    quotaOk: true,
    capturedAt: '2026-10-14T10:00:00.000Z',
    /** 每次配额构建收到的 force（后台补查必须是 false）。 */
    quotaForce: [],
  }
  const builders = {
    async local({ outcome }) {
      state.localCalls += 1
      if (state.holdLocal !== null) await state.holdLocal
      if (state.failLocal) throw new Error('台账读不出来')
      return {
        sections: {
          overview: { channels: [], range: { today: '2026-10-14' } },
          usage: { days: [], totals: null, availableFrom: null, availableTo: null, hours: null },
          heatmap: { days: [], sessionDates: [] },
          models: { rows: [], coverage: { status: 'complete' }, priced: false },
          projects: { rows: [], coverage: { status: 'complete' }, priced: false },
          sessions: { rows: [], coverage: { status: 'complete' }, priced: false },
          prompts: { words: [], totalPrompts: 0, totalChars: 0, from: null, to: null },
        },
        issues: outcome.providers.length === 0 ? [{ kind: 'note', message: '还没有配额结果' }] : [],
      }
    },
    async quota(input) {
      state.quotaCalls += 1
      state.quotaForce.push(input?.force)
      const provider = {
        provider: 'opencode-go',
        ok: state.quotaOk,
        error: state.quotaOk ? null : 'timeout',
        capturedAt: state.capturedAt,
        stale: !state.quotaOk,
      }
      return {
        quota: { providers: [{ provider: 'opencode-go', source: state.quotaOk ? 'live' : 'snapshot', plan: state.quotaOk ? { windows: [{ key: 'month', percent: 23 }] } : { windows: [{ key: 'month', percent: 76 }] } }] },
        outcome: { refreshedAt: '2026-10-14T12:00:00.000Z', providers: [provider] },
        issues: [],
      }
    },
    async channels({ quota, outcome }) {
      state.channelsCalls += 1
      const row = (quota?.providers ?? [])[0] ?? null
      const quotaState = (outcome?.providers ?? [])[0] ?? null
      return {
        channels: { channels: [{ provider: 'opencode-go', quotaPercent: 23, quotaStale: quotaState?.stale === true, quotaCapturedAt: row === null ? null : quotaState?.capturedAt ?? null }] },
        issues: [],
      }
    },
  }
  return { state, builders }
}

/** 等后台构建结束：首次 view() / view({fresh:true}) 现在都不阻塞，靠 building 标记等它落地。 */
const settleBuild = async (service) => {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5))
    const current = await service.view()
    if (!current.building) return current
  }
  throw new Error('后台构建没有在预期时间内完成')
}

/** 等到条件成立（后台异步动作如配额补查）。 */
const waitUntil = async (predicate) => {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('条件没有在预期时间内成立')
}

// ===== 1. 首次 view()：没有快照 → 后台构建（打开页面不等），构建完写盘且段齐全 =====
{
  const { state, builders } = createBuilders()
  const service = createSnapshotService({ builders, path, intervalMs: 0 })
  const first = await service.view()
  assert.equal(first.ok, true)
  assert.equal(first.building, true, '首次没有快照：先返回空视图 + building，构建放后台')
  assert.equal(first.sections.channels, null, '后台还没建完，段是空的')
  const view = await settleBuild(service)
  assert.equal(view.buildSource, 'initial', '首次没有快照 → initial')
  assert.deepEqual(Object.keys(view.sections).sort(), [
    'channels', 'heatmap', 'models', 'overview', 'projects', 'prompts', 'quota', 'sessions', 'usage',
  ])
  assert.deepEqual(
    view.sections.prompts,
    { words: [], totalPrompts: 0, totalChars: 0, from: null, to: null },
    'prompts 段随本地段一起物化（提问词云）',
  )
  assert.equal(state.localCalls, 1)
  assert.equal(state.quotaCalls, 1, '首次构建要联网查一次配额')
  assert.equal(state.channelsCalls, 1, '配额之后重建 channels 段')
  assert.equal(view.quotaOutcome.providers[0].provider, 'opencode-go')
  assert.ok(view.issues.some((issue) => issue.kind === 'build-duration'), '构建耗时进 issues')

  assert.equal(existsSync(path), true, '写盘')
  assert.deepEqual(readdirSync(join(home, 'dsh-key-usage')), [SNAPSHOT_FILE], '不残留临时文件')
  const readBack = readSnapshotFile(path)
  assert.equal(readBack.document.buildSource, 'initial')
  assert.deepEqual(readBack.document.sections.usage, view.sections.usage, '读回与内存一致')
  assert.deepEqual(readBack.document.sections.prompts, view.sections.prompts, 'prompts 段读回后不变')
}

// ===== 2. 已有快照：view() 直接读回，不重建（同一个文件，另一个服务实例） =====
{
  const { state, builders } = createBuilders()
  const service = createSnapshotService({ builders, path, intervalMs: 0 })
  const view = await service.view()
  assert.equal(state.localCalls, 0, '文件在 → 不重建')
  assert.equal(state.quotaCalls, 0, '文件在 → 不联网')
  assert.equal(view.buildSource, 'initial')
  assert.equal(view.sections.channels.channels[0].provider, 'opencode-go')
}

// ===== 3. 定时重建：只跑本地段 + channels，绝不查配额 =====
{
  const { state, builders } = createBuilders()
  const ticks = []
  let cleared = 0
  const service = createSnapshotService({
    builders,
    path,
    intervalMs: 5 * 60 * 1000,
    setIntervalImpl: (handler) => { ticks.push(handler); return { unref: () => {} } },
    clearIntervalImpl: () => { cleared += 1 },
  })
  service.start()
  assert.equal(ticks.length, 1, '起了一个定时器')
  const quotaBefore = state.quotaCalls
  const channelsBefore = state.channelsCalls
  await ticks[0]()
  const view = await service.view()
  assert.equal(state.quotaCalls, quotaBefore, '定时重建不联网查配额')
  assert.equal(state.channelsCalls, channelsBefore + 1, '定时重建也要刷新 channels 段')
  assert.equal(view.buildSource, 'scheduled')
  const onDisk = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(onDisk.buildSource, 'scheduled')
  assert.equal(onDisk.quotaOutcome.refreshedAt, '2026-10-14T12:00:00.000Z', '配额结果原样沿用')
  service.stop()
  assert.equal(cleared, 1)
}

// ===== 4. 构建失败：返回 ok:false，且磁盘上仍是上一份好快照（不覆盖） =====
{
  const { state, builders } = createBuilders()
  const service = createSnapshotService({ builders, path, intervalMs: 0 })
  await service.view()
  const before = readFileSync(path, 'utf8')
  const updatedAtBefore = JSON.parse(before).updatedAt
  state.failLocal = true
  const failed = await service.refresh()
  assert.equal(failed.ok, false)
  assert.ok(failed.error.includes('重建本地数据失败'), failed.error)
  assert.equal(readFileSync(path, 'utf8'), before, '失败不覆盖上一份好快照')
  assert.equal((await service.view()).updatedAt, updatedAtBefore, '读到的仍是上一份')
  state.failLocal = false
  const retried = await service.refresh()
  assert.equal(retried.ok, true)
  assert.equal(retried.view.buildSource, 'manual')
}

// ===== 5. 配额失败：沿用上一份值，并把 stale / capturedAt 如实保留 =====
{
  const { state, builders } = createBuilders()
  const service = createSnapshotService({ builders, path, intervalMs: 0 })
  await service.view()
  state.quotaOk = false
  const refreshed = await service.refresh()
  assert.equal(refreshed.ok, true, '配额失败不影响刷新本身')
  const provider = refreshed.view.quotaOutcome.providers[0]
  assert.equal(provider.ok, false)
  assert.equal(provider.error, 'timeout', '本次失败原因透出')
  assert.equal(provider.stale, true, '展示的是旧值 → stale')
  assert.equal(provider.capturedAt, '2026-10-14T10:00:00.000Z', 'capturedAt 保留（数据时间）')
  assert.ok(
    refreshed.view.issues.some((issue) => issue.kind === 'quota-failed'),
    '配额失败要记一条 issue',
  )
  assert.equal(refreshed.view.sections.quota.providers[0].plan.windows[0].percent, 76, '旧值仍可展示')
}

// ===== 6. /refresh 串行化：等正在跑的构建；超时给可读错误 =====
{
  const { state, builders } = createBuilders()
  const service = createSnapshotService({ builders, path, intervalMs: 0, refreshWaitMs: 30 })
  let release
  state.holdLocal = new Promise((resolve) => { release = resolve })
  const first = service.refresh()          // 卡在 local
  const waiting = service.refresh()        // 应该在等第一个，随后超时
  const timedOut = await waiting
  assert.equal(timedOut.ok, false)
  assert.equal(timedOut.error, '正在重建数据，请稍后重试')
  release()
  const done = await first
  assert.equal(done.ok, true)
  state.holdLocal = null

  // 构建间隙的 /snapshot：返回上一份完整内容 + building:true，不允许半成品
  let releaseSecond
  const hold = new Promise((resolve) => { releaseSecond = resolve })
  state.holdLocal = hold
  const running = service.refresh()
  const during = await service.view()
  assert.equal(during.building, true, '构建中标记 building')
  assert.equal(during.sections.channels.channels[0].provider, 'opencode-go', '返回的是上一份完整内容')
  releaseSecond()
  await running
  assert.equal((await service.view()).building, false)
}

// ===== 7. 写盘守卫与写失败静默：只允许写 $DSH_HOME/dsh-key-usage/snapshot.json =====
{
  const document = {
    version: 1,
    updatedAt: '2026-10-14T00:00:00.000Z',
    buildSource: 'manual',
    sections: {},
    quotaOutcome: { refreshedAt: null, providers: [] },
    issues: [],
  }
  const wrongName = writeSnapshotFile(document, join(home, 'dsh-key-usage', 'other.json'))
  assert.equal(wrongName.ok, false)
  assert.ok(wrongName.error.includes(SNAPSHOT_FILE), wrongName.error)

  const wrongDir = writeSnapshotFile(document, join(home, SNAPSHOT_FILE))
  assert.equal(wrongDir.ok, false, '同名但不在插件目录下也要拒绝')

  // 写盘失败：内存照常可用，issue 里说明，磁盘上没有半份文件
  const elsewhere = join(home, 'elsewhere', SNAPSHOT_FILE)
  const { builders } = createBuilders()
  const service = createSnapshotService({ builders, path: elsewhere, intervalMs: 0 })
  const view = await settleBuild(service)
  assert.equal(view.ok, true, '写不了也要能返回内容')
  assert.ok(view.issues.some((issue) => issue.kind === 'write-failed'), '写盘失败要记 issue')
  assert.equal(existsSync(elsewhere), false)
  assert.equal(snapshotPath(), path, '默认路径 = $DSH_HOME/dsh-key-usage/snapshot.json')
}

// ===== 8. 坏快照文件：当作没有，重新构建（不抛错） =====
{
  mkdirSync(join(home, 'dsh-key-usage'), { recursive: true })
  const brokenPath = join(home, 'broken-home', 'dsh-key-usage', SNAPSHOT_FILE)
  mkdirSync(join(home, 'broken-home', 'dsh-key-usage'), { recursive: true })
  writeFileSync(brokenPath, '{oops', 'utf8')
  const read = readSnapshotFile(brokenPath)
  assert.equal(read.document, null)
  assert.ok(read.problem.includes('不是合法 JSON'))
  const { state, builders } = createBuilders()
  const service = createSnapshotService({ builders, path: brokenPath, intervalMs: 0 })
  const view = await settleBuild(service)
  assert.equal(view.ok, true)
  assert.equal(state.localCalls, 1, '坏文件 → 重新构建一次')
}

// ===== 9. 打开页面（view({fresh:true})）：立即返回 + 后台重算；配额段后台补查 =====
{
  let clock = Date.parse('2026-10-14T12:00:00.000Z')
  const { state, builders } = createBuilders()
  // 独立路径：前面的用例在同一个文件里留下了 manual / scheduled 的快照，会干扰本用例的首建断言
  const openPath = join(home, 'open-home', 'dsh-key-usage', SNAPSHOT_FILE)
  mkdirSync(join(home, 'open-home', 'dsh-key-usage'), { recursive: true })
  const service = createSnapshotService({
    builders,
    path: openPath,
    intervalMs: 0,
    openMinMs: 10 * 1000,
    quotaTtlMs: 60 * 1000,
    now: () => clock,
  })
  await service.view()
  await settleBuild(service)
  const afterFirst = state.localCalls

  // 1) 刚建过（防抖下限内）：不再重算，配额也在闸门内
  state.capturedAt = '2026-10-14T11:59:00.000Z'
  const quotaBefore = state.quotaCalls
  const fresh = await service.view({ fresh: true })
  assert.equal(state.localCalls, afterFirst, '防抖下限内不重复重算本地段')
  assert.equal(fresh.buildSource, 'initial', '没重算 → 沿用原 buildSource')
  assert.equal(state.quotaCalls, quotaBefore, '配额段闸门内不补查（此处 refreshedAt 仍是刚写的 12:00）')

  // 2) 过了防抖下限：**不阻塞**返回，后台重算，客户端按 building 追取
  clock += 11 * 1000
  const reopened = await service.view({ fresh: true })
  assert.equal(reopened.building, true, '打开页面不等构建：立即返回 building=true')
  assert.equal(reopened.buildSource, 'initial', '重算还没落地，先沿用旧 buildSource')
  const settled = await settleBuild(service)
  assert.equal(state.localCalls, afterFirst + 1, '超过防抖下限 → 后台重算一次本地段')
  assert.equal(settled.buildSource, 'open', '打开页面触发的本地段重建标 open')

  // 3) 配额超过闸门：后台补查一次（非强制），客户端靠 quotaRefreshing 追取
  clock += 61 * 1000
  state.quotaCalls = 0
  state.quotaForce = []
  await service.view({ fresh: true })
  await waitUntil(() => state.quotaCalls === 1)
  assert.deepEqual(state.quotaForce, [false], '后台补查用非强制查询（不绕过 live-quota 缓存）')
  await waitUntil(() => true)
  const afterQuota = await service.view()
  assert.equal(afterQuota.building, false)

  // 4) 构建中打开页面：不排队、不干等，直接给手上这份 + building:true
  clock += 11 * 1000
  let release = null
  state.holdLocal = new Promise((resolve) => { release = resolve })
  void service.view({ fresh: true })
  await new Promise((resolve) => setTimeout(resolve, 0))
  const during = await service.view({ fresh: true })
  assert.equal(during.building, true, '构建中不干等：返回上一份并标 building')
  release()
  state.holdLocal = null
}

rmSync(home, { recursive: true, force: true })
console.log('snapshot.test: 全部通过')
