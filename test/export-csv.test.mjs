/**
 * 客户端导出（纯函数）：逐日明细、分时明细（按币种分列）、会话三个导出。
 * 不触发浏览器下载，只校验表头与行内容。
 * 运行：node test/export-csv.test.mjs
 */
import assert from 'node:assert/strict'

const { buildUsageCsv, buildHourlyCsv, buildSessionsCsv } = await import('../src/client/core/export-csv.ts')

let passed = 0
async function check(name, run) {
  await run()
  passed += 1
  console.log('  ✓ ' + name)
}

const usage = {
  days: [
    { date: '2026-10-30', provider: 'deepseek-official', calls: 3, inputTokens: 100, outputTokens: 40, cacheReadTokens: 60, cacheWriteTokens: 5, cost: 0.12, costSource: 'catalog', partial: true },
    { date: '2026-10-31', provider: '', calls: 1, inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, cost: 0, costSource: 'official' },
  ],
  hoursByDate: {
    '2026-10-30': Array.from({ length: 24 }, (_, hour) => ({
      calls: hour === 9 ? 2 : 0,
      tokens: hour === 9 ? 30 : 0,
      outputTokens: hour === 9 ? 10 : 0,
      cacheReadTokens: hour === 9 ? 5 : 0,
      sessions: hour === 9 ? 1 : 0,
      cost: hour === 9 ? 0.02 : null,
      costsByCurrency: hour === 9 ? { CNY: 0.1, USD: 0.01 } : {},
    })),
  },
}

await check('逐日导出：表头与行一一对应，部分计价转「是」', async () => {
  const table = buildUsageCsv(usage)
  assert.equal(table.header.length, 10)
  assert.equal(table.header[0], '日期')
  assert.equal(table.rows.length, 2)
  assert.equal(table.rows[0][0], '2026-10-30')
  assert.equal(table.rows[0][9], '是')
  assert.equal(table.rows[1][9], '否')
  assert.match(table.filename, /使用明细/)
})

await check('分时导出：成本按币种分列，不再混币种相加', async () => {
  const table = buildHourlyCsv(usage, 'today')
  assert.deepEqual(table.header.slice(-2), ['成本 CNY', '成本 USD'])
  assert.equal(table.rows.length, 1, '只有 9 点那一格有数据')
  const row = table.rows[0]
  assert.equal(row[0], '2026-10-30')
  assert.equal(row[1], '09:00')
  assert.equal(row[2], 2)
  assert.equal(row[6], 1, '会话数')
  assert.equal(row[7], '0.1000')
  assert.equal(row[8], '0.0100')
})

await check('分时导出（7 天）：时段标签是 6 小时段', async () => {
  const cells = Array.from({ length: 24 }, () => ({ calls: 1, tokens: 1, outputTokens: 1, cacheReadTokens: 0, sessions: 1, cost: 0, costsByCurrency: {} }))
  const table = buildHourlyCsv({ days: [], hoursByDate: { '2026-10-30': cells } }, 'week')
  assert.deepEqual(table.rows.map((row) => row[1]), ['00–06:00', '06–12:00', '12–18:00', '18–24:00'])
  assert.equal(table.header.includes('成本 CNY'), false, '没有币种时不出成本列')
})

await check('会话导出：归档与子代理数列存在', async () => {
  const table = buildSessionsCsv({
    rows: [{ title: '示例会话', workspace: 'proj', provider: 'p', modelCount: 2, calls: 5, tokens: 100, cacheHitRate: 12.3, cost: 0.02, costSource: 'catalog', firstTime: 1, lastTime: 2, archived: true, subagentCount: 3 }],
  })
  assert.equal(table.header.length, table.rows[0].length)
  assert.equal(table.rows[0][11], '是')
  assert.equal(table.rows[0][12], 3)
  assert.match(table.filename, /会话/)
})

console.log('export-csv: ' + String(passed) + ' 项通过')
