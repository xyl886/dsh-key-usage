/**
 * session-usage 折叠逻辑离线测试：样本去重/重试累加、模型归属、小时分桶与汇总。
 * 运行：node test/session-usage.test.mjs
 */
import assert from 'node:assert/strict'
import {
  attributeModelKey,
  foldSessionEvents,
  normalizeProvider,
  summarizeSession,
} from '../lib/session-usage.js'

// 固定本地时间，避免测试依赖机器时区
const baseTime = new Date(2026, 9, 13, 10, 30, 0).getTime()
const laterTime = new Date(2026, 9, 13, 14, 5, 0).getTime()

const header = {
  seq: 0,
  time: baseTime,
  type: 'request/header',
  data: { header: { config: { provider: 'pi-ai/opencode-go', model: 'GLM-5.3-Flash' } } },
}

function usageChunk(seq, time, turn, step, usage) {
  return { seq, time, type: 'assistant/chunk', data: { turn, step, chunk: { type: 'usage', usage } } }
}

// 场景一：同一 (turn, step) 的重复上报按后到覆盖，不重复计数
const replacementFold = foldSessionEvents([
  header,
  usageChunk(1, baseTime, 1, 1, { inputTokens: 100, outputTokens: 50, cacheReadTokens: 850 }),
  {
    seq: 2,
    time: laterTime,
    type: 'assistant/message',
    data: {
      turn: 1, step: 1,
      usage: { inputTokens: 120, outputTokens: 60, cacheReadTokens: 900 },
      message: { source: { provider: 'opencode-go', model: 'GLM-5.3-Flash' } },
    },
  },
])
const replacementSummary = summarizeSession(replacementFold)
assert.equal(replacementSummary.calls, 1, '同一 turn/step 只算一次调用')
assert.equal(replacementSummary.buckets.inputTokens, 120, '后到的上报覆盖先到的')
assert.equal(replacementSummary.buckets.cacheReadTokens, 900)
assert.equal(replacementSummary.days.length, 1, '覆盖后只落在后到事件所在的那一天')
assert.equal(replacementSummary.days[0].date, '2026-10-13')
assert.equal(replacementSummary.days[0].hours[14].calls, 1, '小时槽跟随覆盖后的时间')
assert.equal(replacementSummary.days[0].hours[10].calls, 0, '被覆盖的旧小时槽清空')

// 场景二：llm/retry-started 之后的同 turn/step 是新一轮尝试，应与原尝试累加
const retryFold = foldSessionEvents([
  header,
  usageChunk(1, baseTime, 1, 1, { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0 }),
  { seq: 2, time: baseTime, type: 'llm/retry-started', data: { turn: 1, step: 1 } },
  usageChunk(3, baseTime, 1, 1, { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0 }),
])
const retrySummary = summarizeSession(retryFold)
assert.equal(retrySummary.calls, 2, '重试是新的一次上报')
assert.equal(retrySummary.buckets.inputTokens, 110, '重试用量与原尝试累加')
assert.equal(retrySummary.buckets.outputTokens, 55)

// 场景三：模型归属 —— message.source 优先，缺失时回落最近一次 request/header
const attributionFold = foldSessionEvents([
  header,
  usageChunk(1, baseTime, 1, 1, { inputTokens: 10, outputTokens: 1, cacheReadTokens: 0 }),
  {
    seq: 2, time: baseTime, type: 'assistant/chunk',
    data: { turn: 1, step: 2, chunk: { type: 'usage', usage: { inputTokens: 20, outputTokens: 2, cacheReadTokens: 0 } } },
  },
  {
    seq: 3, time: baseTime, type: 'assistant/message',
    data: {
      turn: 1, step: 3,
      usage: { inputTokens: 30, outputTokens: 3, cacheReadTokens: 0 },
      message: { source: { provider: 'deepseek-official', model: 'DeepSeek-Flash' } },
    },
  },
])
const attributionSummary = summarizeSession(attributionFold)
assert.equal(attributionSummary.models.length, 2, '两个不同模型归属')
const fallbackModel = attributionSummary.models.find((row) => row.key.startsWith('pi-ai/opencode-go/'))
assert.ok(fallbackModel !== undefined, '未带 source 的样本回落到 request/header 的模型')
assert.equal(fallbackModel.calls, 2, '前两个样本都归到回落模型')
const sourceModel = attributionSummary.models.find((row) => row.key.startsWith('deepseek-official/'))
assert.ok(sourceModel !== undefined, 'message.source 命名的模型单独成行')
assert.equal(sourceModel.calls, 1)
assert.equal(sourceModel.tokens, 33, '模型行 tokens 为该模型四个分桶之和')
assert.equal(typeof attributionSummary.primaryModelKey, 'string', '存在主归属键')

// 场景四：v2 结算把样本放进 data.stream
const streamFold = foldSessionEvents([
  header,
  {
    seq: 1, time: baseTime, type: 'assistant/attempt',
    data: {
      turn: 2, step: 1,
      stream: [{ type: 'text' }, { type: 'chunk', chunk: { type: 'usage', usage: { inputTokens: 7, outputTokens: 3, cacheReadTokens: 0, cacheWriteTokens: 5 } } }],
    },
  },
])
const streamSummary = summarizeSession(streamFold)
assert.equal(streamSummary.calls, 1, 'stream 内嵌样本被识别')
assert.equal(streamSummary.buckets.cacheWriteTokens, 5, 'cacheWrite 一并计入总量')
assert.equal(streamSummary.tokens, 15, 'tokens = 四类分桶之和')

// 场景五：继承前缀不计入（由数据源负责裁剪），此处只验证时间范围
assert.equal(replacementSummary.firstTime, baseTime)
assert.equal(replacementSummary.lastTime, laterTime)
assert.equal(replacementSummary.cacheHitRate, 83.3, '命中率 = 900 / (120 + 60 + 900)')

// 归属键拆分：已知通道名在段边界上从右往左匹配
assert.deepEqual(attributeModelKey('pi-ai/opencode-go/GLM-5.3-Flash', ['opencode-go', 'local']), { provider: 'opencode-go', model: 'GLM-5.3-Flash' })
assert.deepEqual(attributeModelKey('sensenova/sensenova-6.8-flash-lite', ['sensenova']), { provider: 'sensenova', model: 'sensenova-6.8-flash-lite' })
assert.deepEqual(attributeModelKey('unknown/unknown', ['sensenova']), { provider: 'unknown', model: 'unknown' })
assert.equal(normalizeProvider('pi-ai/opencode-go', ['opencode-go']), 'opencode-go')
assert.equal(normalizeProvider('other', ['opencode-go']), 'other')

console.log('session-usage.test: 全部通过')
