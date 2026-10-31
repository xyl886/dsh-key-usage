/**
 * 更新检查（服务端）：版本比较、24 小时缓存、忽略版本、上游失败回落。
 * 用临时目录当存储，不碰真实 ~/.dsh；fetch 用桩，不联网。
 * 运行：node test/update-check.test.mjs（先 npm run build:server）
 */
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { compareVersions, resolveUpdate, markUpdateSkipped, isLinkedInstall, CURRENT_VERSION } = await import('../lib/update-check.js')

let passed = 0
async function check(name, run) {
  await run()
  passed += 1
  console.log('  ✓ ' + name)
}

const storePath = join(mkdtempSync(join(tmpdir(), 'dsh-key-usage-update-')), 'usage.db')
let fetchCalls = 0
const stubFetch = async () => {
  fetchCalls += 1
  return { ok: true, json: async () => ({ latest: '99.0.0' }) }
}

await check('版本比较：主次修订，预发布低于同号正式版', async () => {
  assert.equal(compareVersions('0.2.4', '0.2.5') < 0, true)
  assert.equal(compareVersions('0.3.0', '0.2.9') > 0, true)
  assert.equal(compareVersions('0.2.4', '0.2.4'), 0)
  assert.equal(compareVersions('0.2.4-rc.1', '0.2.4'), 0, '预发布按同版本号处理')
  assert.equal(compareVersions('abc', '0.2.4'), 0, '解析不了不算更新')
})

await check('首次检查：联网一次并给 hasUpdate', async () => {
  fetchCalls = 0
  const view = await resolveUpdate({ fetchImpl: stubFetch, storagePath: storePath, localDev: false, now: 1_000_000 })
  assert.equal(fetchCalls, 1)
  assert.equal(view.latest, '99.0.0')
  assert.equal(view.hasUpdate, true)
  assert.equal(view.current, CURRENT_VERSION)
})

await check('24 小时内缓存命中：不再联网', async () => {
  fetchCalls = 0
  const view = await resolveUpdate({ fetchImpl: stubFetch, storagePath: storePath, localDev: false, now: 1_000_000 + 60_000 })
  assert.equal(fetchCalls, 0)
  assert.equal(view.hasUpdate, true)
  assert.equal(view.stale, false)
})

await check('refresh=1 强制联网', async () => {
  fetchCalls = 0
  await resolveUpdate({ fetchImpl: stubFetch, storagePath: storePath, localDev: false, now: 1_000_000 + 60_000, refresh: true })
  assert.equal(fetchCalls, 1)
})

await check('忽略此版本：同版本不再提示，但 latest 仍可下载', async () => {
  markUpdateSkipped('99.0.0', storePath)
  const view = await resolveUpdate({ fetchImpl: stubFetch, storagePath: storePath, localDev: false, now: 1_000_000 + 120_000 })
  assert.equal(view.latest, '99.0.0')
  assert.equal(view.hasUpdate, false)
})

await check('上游失败：保留上次结果，不抛错', async () => {
  const failing = async () => { throw new Error('network down') }
  const view = await resolveUpdate({ fetchImpl: failing, storagePath: storePath, localDev: false, now: 1_000_000 + 3_600_000, refresh: true })
  assert.equal(view.latest, '99.0.0')
  assert.equal(view.hasUpdate, false, '已忽略的版本仍然不提示')
  assert.equal(typeof view.checkedAt, 'number')
})

await check('link 模式不提示更新（本地仓库版本不代表 registry 包）', async () => {
  assert.equal(isLinkedInstall('file:///D:/EasyJob/.plugin/dsh-key-usage/lib/update-check.js'), true)
  assert.equal(isLinkedInstall('file:///C:/Users/x/.dsh/profiles/desktop/node_modules/dsh-key-usage/lib/update-check.js'), false)
  fetchCalls = 0
  const view = await resolveUpdate({ fetchImpl: stubFetch, storagePath: storePath, now: 1_000_000, refresh: true, localDev: true })
  assert.equal(view.latest, '99.0.0')
  assert.equal(view.hasUpdate, false)
})

console.log('update-check: ' + String(passed) + ' 项通过')
