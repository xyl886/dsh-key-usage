/**
 * 通道判定离线测试：计费模式与状态规则、余额/窗口提取、标签映射。
 * 运行：node test/channels.test.mjs
 */
import assert from 'node:assert/strict'
import { classifyChannels, costModeLabel, extractChannels, quotaWindowLabel } from '../lib/data/collect.js'

function channel(overrides) {
  return {
    provider: 'demo', displayName: 'demo', apiKeyEnv: 'DEMO_API_KEY', baseURL: null, models: [],
    costMode: 'unknown', status: 'ok', quotaPercent: null, quotaWindowKey: null, balanceText: null, snapshotUpdatedAt: null,
    ...overrides,
  }
}

// 未配置凭据 → off
const unconfigured = classifyChannels([channel({ provider: 'opencode', apiKeyEnv: null })], [])
assert.equal(unconfigured[0].status, 'off')
assert.equal(unconfigured[0].costMode, 'unknown')

// 本地端点 → none / ok
const local = classifyChannels([channel({ provider: 'local' })], [])
assert.equal(local[0].costMode, 'none')
assert.equal(costModeLabel(local[0].costMode), '本地端点')

// patch 层的 local 通常不写 apiKeyEnv，仍应判为本地端点而不是「未配置」
const localWithoutKey = classifyChannels([channel({ provider: 'local', apiKeyEnv: null })], [])
assert.equal(localWithoutKey[0].costMode, 'none')
assert.equal(localWithoutKey[0].status, 'ok')

// 订阅窗口 → sub，状态随最高占用分档
const subscribed = classifyChannels([channel({ provider: 'opencode-go' })], [{
  provider: 'opencode-go', displayName: null, credential: 'env', updatedAt: 1790762819897,
  balance: null, plan: { windows: [{ key: '5h', percent: 0 }, { key: 'week', percent: 19 }, { key: 'month', percent: 76 }] },
}])
assert.equal(subscribed[0].costMode, 'sub')
assert.equal(subscribed[0].status, 'warn', '76% 属于偏高')
assert.equal(subscribed[0].quotaPercent, 76, '取占用最高的窗口')
assert.equal(subscribed[0].quotaWindowKey, 'month')
assert.equal(quotaWindowLabel(subscribed[0].quotaWindowKey), '本月', '总览单元格用短标签「本月 76%」')

const saturated = classifyChannels([channel({ provider: 'sub2' })], [{
  provider: 'sub2', displayName: null, credential: 'env', updatedAt: 1, balance: null, plan: { windows: [{ key: 'week', percent: 95 }] },
}])
assert.equal(saturated[0].status, 'danger', '≥90% 属于告警')

// 余额 → perToken，余额越低越紧张
const prepaid = classifyChannels([channel({ provider: 'deepseek-official' })], [{
  provider: 'deepseek-official', displayName: 'DeepSeek', credential: 'env', updatedAt: 1,
  balance: { currency: 'CNY', totalBalance: '1.50', updatedAt: 1 }, plan: null,
}])
assert.equal(prepaid[0].costMode, 'perToken')
assert.equal(prepaid[0].status, 'warn', '余额低于 10 属于偏高')
assert.equal(prepaid[0].balanceText, 'CNY 1.50', '余额文本原样保留币种')
assert.equal(prepaid[0].snapshotUpdatedAt, 1)

const emptied = classifyChannels([channel({ provider: 'paid2' })], [{
  provider: 'paid2', displayName: null, credential: 'env', updatedAt: 1, balance: { totalBalance: 0 }, plan: null,
}])
assert.equal(emptied[0].status, 'danger', '余额为 0 属于告警')

// 兜底登记：sensenova 无快照 → 免费额度
const fallback = classifyChannels([channel({ provider: 'sensenova' })], [])
assert.equal(fallback[0].costMode, 'free')
assert.equal(costModeLabel(fallback[0].costMode), '免费额度')

// 完全未知的通道 → unknown，不误判
const unknown = classifyChannels([channel({ provider: 'mystery' })], [])
assert.equal(unknown[0].costMode, 'unknown')
assert.equal(costModeLabel(unknown[0].costMode), '未查询')

// cordis.yml 提取出来的通道带默认判定字段，可直接交给 classifyChannels
const extracted = extractChannels("- id: llm-pi-ai\n  config:\n    providers:\n      alpha:\n        apiKeyEnv: ALPHA_KEY\n        models:\n          - id: m1\n            name: M1\n")
assert.equal(extracted[0].costMode, 'unknown')
assert.equal(extracted[0].status, 'ok')
assert.equal(extracted[0].quotaPercent, null)

console.log('channels.test: 全部通过')
