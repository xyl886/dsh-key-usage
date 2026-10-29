/**
 * 台账 × 会话按天合并的离线测试：同日优先台账、缺日回退会话、不相加、来源标注。
 * 运行：node test/merge.test.mjs
 */
import assert from 'node:assert/strict'
import {
  mergeDailySeries,
  sessionDayRows,
  summarizeMergedByProvider,
  totalsOfMerged,
} from '../lib/data/merge.js'
import { foldSessionEvents, summarizeSession } from '../lib/data/session-usage.js'

function ledgerDay(date, provider, model, inputTokens, cost) {
  return {
    date,
    provider: '',
    calls: 3,
    inputTokens,
    outputTokens: 100,
    cacheReadTokens: 0,
    reasoningTokens: 0,
    cost,
    models: [{
      date, provider, model, calls: 3, inputTokens, outputTokens: 100,
      cacheReadTokens: 0, reasoningTokens: 0, cost,
    }],
  }
}

const morning = new Date(2026, 9, 1, 9, 0, 0).getTime()
const secondDay = new Date(2026, 9, 2, 11, 0, 0).getTime()
const sameLedgerDay = new Date(2026, 8, 29, 10, 0, 0).getTime()

const sessionRecords = [{
  id: 'session-merge',
  title: null,
  workspace: 'D:\\EasyJob',
  summary: summarizeSession(foldSessionEvents([
    { seq: 0, time: sameLedgerDay, type: 'request/header', data: { header: { config: { provider: 'pi-ai/opencode-go', model: 'GLM-5.3-Flash' } } } },
    { seq: 1, time: sameLedgerDay, type: 'assistant/chunk', data: { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 999, outputTokens: 9, cacheReadTokens: 0 } } } },
    { seq: 2, time: morning, type: 'assistant/chunk', data: { turn: 2, step: 1, chunk: { type: 'usage', usage: { inputTokens: 1000, outputTokens: 100, cacheReadTokens: 500 } } } },
    { seq: 3, time: secondDay, type: 'assistant/chunk', data: { turn: 3, step: 1, chunk: { type: 'usage', usage: { inputTokens: 2000, outputTokens: 200, cacheReadTokens: 1000 } } } },
  ])),
}]

const knownProviders = ['opencode-go', 'sensenova']
const rows = sessionDayRows(sessionRecords, knownProviders)
assert.equal(rows.length, 3, '三天各一行')
assert.equal(rows[0].provider, 'opencode-go', 'pi-ai 路由归一到通道')

// 台账覆盖 09-29 与 09-30；10-01、10-02 只在会话里
const ledgerDays = [
  ledgerDay('2026-09-29', 'opencode-go', 'GLM-5.3-Flash', 5000, 1.25),
  ledgerDay('2026-09-30', 'opencode-go', 'GLM-5.3-Flash', 6000, 1.5),
]

const merged = mergeDailySeries(ledgerDays, rows, '2026-09-29', '2026-10-02')
assert.deepEqual(merged.days.map((day) => day.date), ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'])
assert.deepEqual(merged.sessionDates, ['2026-10-01', '2026-10-02'], '只有台账缺的两天由会话补位')

// 09-29 台账与会话都有数据 → 必须用台账，不能相加
const sameDay = merged.days[0]
assert.equal(sameDay.inputTokens, 5000, '同日取台账值，不与会话相加')
assert.equal(sameDay.cost, 1.25, '同日保留台账的官方成本')

// 10-01 只有会话 → 用会话值且成本为 0（由界面按计费模式展示）
const sessionDay = merged.days[2]
assert.equal(sessionDay.inputTokens, 1000)
assert.equal(sessionDay.cacheReadTokens, 500)
assert.equal(sessionDay.cost, 0, '会话来源没有官方成本')
assert.equal(sessionDay.models[0].provider, 'opencode-go')
assert.equal(sessionDay.models[0].model, 'GLM-5.3-Flash')

// 总计 = 四天之和（无重复计数）
const totals = totalsOfMerged(merged.days)
assert.equal(totals.inputTokens, 5000 + 6000 + 1000 + 2000)
assert.equal(totals.cost, 1.25 + 1.5, '成本只累加台账那两天')

// 只有会话的窗口：汇总按 provider 出结果
const sessionOnly = summarizeMergedByProvider(merged.days, '2026-10-01', '2026-10-02')
assert.equal(sessionOnly.length, 1)
assert.equal(sessionOnly[0].provider, 'opencode-go')
assert.equal(sessionOnly[0].tokens, (1000 + 100 + 500) + (2000 + 200 + 1000))
assert.equal(sessionOnly[0].calls, 2)

// 同一天同一模型的多个会话必须合并成一行（热力图与每日细目都依赖这一点）
const secondSession = {
  id: 'session-merge-2',
  title: null,
  workspace: 'D:\\EasyJob',
  summary: summarizeSession(foldSessionEvents([
    { seq: 0, time: morning + 3600000, type: 'request/header', data: { header: { config: { provider: 'pi-ai/opencode-go', model: 'GLM-5.3-Flash' } } } },
    { seq: 1, time: morning + 3600000, type: 'assistant/chunk', data: { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 300, outputTokens: 30, cacheReadTokens: 100 } } } },
  ])),
}
const duplicated = mergeDailySeries([], sessionDayRows([sessionRecords[0], secondSession], knownProviders), '2026-10-01', '2026-10-01')
assert.equal(duplicated.days.length, 1)
assert.equal(duplicated.days[0].models.length, 1, '同一天同一模型只保留一行')
assert.equal(duplicated.days[0].models[0].inputTokens, 1300, '合并后的数值是各会话之和')
assert.equal(duplicated.days[0].models[0].calls, 2)
assert.equal(duplicated.days[0].inputTokens, 1300, '日级汇总不受合并影响')

// 台账、会话都缺的日期不出现在结果里
const sparse = mergeDailySeries(ledgerDays, [], '2026-09-28', '2026-09-30')
assert.deepEqual(sparse.days.map((day) => day.date), ['2026-09-29', '2026-09-30'])
assert.deepEqual(sparse.sessionDates, [])

// 空输入不抛错
const empty = mergeDailySeries([], [], '', '')
assert.deepEqual(empty.days, [])

console.log('merge.test: 全部通过')

// 超长区间（> 400 天）只铺最近 400 天骨架：最新的那天必须在，否则「全部」范围会丢数据
{
  const longFrom = '2024-01-01'
  const longTo = '2026-10-28'
  const longLedger = [{ date: '2026-10-28', provider: 'opencode-go', calls: 3, inputTokens: 100, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 1, models: [] }]
  const longMerged = mergeDailySeries(longLedger, [], longFrom, longTo)
  const dates = longMerged.days.map((day) => day.date)
  // 骨架按「最近 400 天」铺：最新那天必须在，最早那端允许被截掉
  assert.equal(dates.includes(longTo), true, '最新那天的台账行不能被丢掉')
  assert.equal(dates.includes('2024-01-01'), false, '超长区间不该从最早那端开始铺骨架')
}
