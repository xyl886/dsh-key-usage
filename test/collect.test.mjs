/**
 * collect 配置提取离线测试：cordis.yml 文本提取与快照解析。
 * 运行：node test/collect.test.mjs
 */
import assert from 'node:assert/strict'
import { extractChannels, readProviderSnapshots } from '../lib/collect.js'
import { readFileSync } from 'node:fs'

// 结构化提取：模拟 cordis.yml 中 llm-pi-ai 段（不含 !!js 也能测骨架）
const sampleYml = `- id: llm-pi-ai
  name: '@deepseek-ai/dsh-llm-pi-ai'
  config:
    providers:
      sensenova:
        displayName: sensenova
        apiKeyEnv: SENSENOVA_API_KEY
        baseURL: https://token.sensenova.cn/v1
        models:
          - id: deepseek-v4-flash
            name: deepseek-v4-flash
            contextWindow: 1048576
          - id: glm-5.2
            name: glm-5.2
            contextWindow: 1048576
      opencode-go:
        apiKeyEnv: OPENCODE_GO_API_KEY
        models:
          - id: glm-5.3-flash
            name: 'GLM-5.3-Flash '
            contextWindow: 1000000
- id: next-plugin
  name: other
`
const channels = extractChannels(sampleYml)
assert.equal(channels.length, 2, '应提取出两个 provider')
const sensenova = channels.find((channel) => channel.provider === 'sensenova')
assert.ok(sensenova !== undefined)
assert.equal(sensenova.displayName, 'sensenova')
assert.equal(sensenova.apiKeyEnv, 'SENSENOVA_API_KEY')
assert.equal(sensenova.models.length, 2)
assert.equal(sensenova.models[0].name, 'deepseek-v4-flash')
assert.equal(sensenova.models[0].contextWindow, 1048576)
const opencode = channels.find((channel) => channel.provider === 'opencode-go')
assert.ok(opencode !== undefined)
assert.equal(opencode.displayName, 'opencode-go', '无 displayName 时回落 provider id')
assert.equal(opencode.models.length, 1)
// cordis.yml 里该 name 写作 'GLM-5.3-Flash '（引号内含尾随空格），剥引号后原样保留
assert.equal(opencode.models[0].name, 'GLM-5.3-Flash ')

// 真实 cordis.yml 冒烟（仅本机存在时）：验证提取器对真实文件的健壮性
try {
  const realYml = readFileSync(process.env.DSH_HOME + '\\profiles\\desktop\\cordis.yml', 'utf8')
  const realChannels = extractChannels(realYml)
  assert.ok(realChannels.length >= 1, '真实 cordis.yml 应至少提取一个 provider')
  const realSensenova = realChannels.find((channel) => channel.provider === 'sensenova')
  if (realSensenova !== undefined) {
    assert.ok(realSensenova.models.length >= 1, 'sensenova 应含模型清单')
  }
  console.log(`collect.test: 真实 cordis.yml 提取 ${realChannels.length} 个 provider（冒烟通过）`)
} catch {
  console.log('collect.test: 真实 cordis.yml 不存在，跳过冒烟')
}

// 快照解析：经临时文件走真实 readProviderSnapshots（readFileSync 注入文件路径）
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const snapshotJson = JSON.stringify({
  version: 1,
  providers: {
    'deepseek-official': {
      provider: 'deepseek-official',
      displayName: 'DeepSeek',
      credential: 'env',
      updatedAt: 1790762819897,
      balance: { currency: 'CNY', totalBalance: '1.50', updatedAt: 1790762820649 },
    },
    'opencode-go': {
      provider: 'opencode-go',
      credential: 'env',
      plan: { windows: [{ key: '5h', percent: 0 }, { key: 'month', percent: 76, resetsAt: '2026-10-17T02:56:54.000Z' }], updatedAt: 1 },
    },
  },
})
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'dsh-key-usage-test-'))
const snapshotPath = join(temporaryDirectory, 'provider-snapshots.json')
writeFileSync(snapshotPath, snapshotJson, 'utf8')
const snapshots = readProviderSnapshots(snapshotPath)
assert.equal(snapshots.providers.length, 2)
const deepseekSnapshot = snapshots.providers.find((item) => item.provider === 'deepseek-official')
assert.equal(deepseekSnapshot.balance.totalBalance, '1.50', 'balance 原样透传')
const opencodeSnapshot = snapshots.providers.find((item) => item.provider === 'opencode-go')
assert.equal(opencodeSnapshot.plan.windows.length, 2, 'plan 原样透传')

// 损坏快照容错
writeFileSync(snapshotPath, '{broken', 'utf8')
assert.deepEqual(readProviderSnapshots(snapshotPath).providers, [])
rmSync(temporaryDirectory, { recursive: true, force: true })

console.log('collect.test: 全部通过')
