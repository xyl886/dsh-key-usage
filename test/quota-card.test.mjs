/**
 * 额度卡片：没有官方配额接口的通道正文直接显示「无」；有窗口 / 余额 / 免费 / 未配置密钥时保持原样。
 * 运行：node test/quota-card.test.mjs
 */
import assert from 'node:assert/strict'
import { loadTsx } from './support/render.mjs'

const mod = await loadTsx('quota-card', "export { channelCardOf } from './src/client/tabs/QuotaTab.tsx'")

function channelOf(overrides) {
  return {
    provider: 'opencode', displayName: 'OpenCode', apiKeyEnv: 'OPENCODE_API_KEY',
    baseURL: 'https://opencode.ai/inference/v1', models: [], costMode: 'usage', status: 'ok',
    quotaPercent: null, quotaWindowKey: null, balanceText: null, snapshotUpdatedAt: null,
    ...overrides,
  }
}
function snapshotOf(overrides) {
  return {
    provider: 'opencode', displayName: 'OpenCode', credential: 'OPENCODE_API_KEY',
    supported: false, source: 'snapshot', snapshotOrigin: null, fetchedAt: null, updatedAt: null,
    error: null, balance: null, plan: null, ...overrides,
  }
}

// 无官方配额接口：正文只有一行「无」
const unsupported = mod.channelCardOf(channelOf({}), snapshotOf({}), 2)
assert.equal(unsupported.rows.length, 1)
assert.equal(unsupported.rows[0].value, '无')

// 有官方窗口：三行窗口（不受 supported=false 之外的逻辑影响）
const windows = mod.channelCardOf(channelOf({ provider: 'opencode-go' }), snapshotOf({
  provider: 'opencode-go', supported: true,
  plan: { windows: [
    { key: 'month', percent: 4, resetsAt: null },
    { key: '5h', percent: 19, resetsAt: '2026-10-13T15:00:00.000Z' },
    { key: 'week', percent: 8, resetsAt: null },
  ] },
}), 0)
assert.deepEqual(windows.rows.map((row) => row.key), ['5h', 'week', 'month'])

// 免费额度通道保留「免费」，不显示「无」
const free = mod.channelCardOf(channelOf({ provider: 'sensenova', costMode: 'free' }), snapshotOf({ provider: 'sensenova' }), 1)
assert.ok(free.rows.some((row) => row.value === '免费'))

// 未配置密钥优先显示原因，不显示「无」
const off = mod.channelCardOf(channelOf({ provider: 'openai', status: 'off' }), snapshotOf({ provider: 'openai' }), 0)
assert.equal(off.rows.length, 3, '未配置密钥时保留额度 / 端点 / 联网三行')
assert.ok(typeof off.rows[0].value === 'string' && off.rows[0].value.length > 0)

console.log('quota-card.test: 全部通过')
