/**
 * 热力图横轴刻度：月份只在首次出现的列标一次、互不重叠、跨年 1 月带年份。
 * 运行：node test/client-heatmap-axis.test.mjs
 */
import assert from 'node:assert/strict'
import { buildMonthAxis, estimateLabelWidthPx } from '../src/client/core/heatmap-axis.ts'

const labelOf = (month, includeYear, year) => (includeYear ? `${year}-${month}月` : `${month}月`)
const base = { columnWidthPx: 40, columnGapPx: 2, fontSizePx: 12, minGapPx: 4, labelOf }

// 空输入 / 非正宽度：返回空数组，不抛错
assert.deepEqual(buildMonthAxis({ ...base, weekDates: [] }), [])
assert.deepEqual(buildMonthAxis({ ...base, columnWidthPx: 0, weekDates: [['2026-01-01']] }), [])

// 跨年窗口：1 月带年份，标签按列升序且互不重叠
const weeks = [
  ['2025-12-01'], ['2025-12-08'], ['2025-12-15'],
  ['2026-01-01'], ['2026-01-08'], ['2026-01-15'],
  ['2026-02-01'], ['2026-02-08'], ['2026-03-01'], ['2026-03-08'], ['2026-04-01'],
]
const marks = buildMonthAxis({ ...base, weekDates: weeks })
assert.ok(marks.length >= 3, '至少标出 3 个月份')
const yearMarks = marks.filter((mark) => mark.withYear)
assert.equal(yearMarks.length, 1, '年份标签全场只出现一次')
assert.ok(yearMarks[0].label.includes('2026'))
for (let index = 1; index < marks.length; index += 1) {
  const previous = marks[index - 1]
  const current = marks[index]
  assert.ok(current.column >= previous.column + previous.spanColumns, '相邻标签不得重叠')
}
for (const mark of marks) {
  assert.ok(mark.spanColumns >= 1)
  assert.ok(mark.column + mark.spanColumns <= weeks.length, '标签不得越过最后一列')
}

// 宽度估算：中文按 1em、数字按 0.62em，宁可估宽
assert.ok(estimateLabelWidthPx('1月', 12) >= 12 + 12 * 0.62)
assert.ok(estimateLabelWidthPx('2026-1月', 12) > estimateLabelWidthPx('1月', 12))

// 极窄面板：放不下就少标，但已标出的仍不重叠
const narrow = buildMonthAxis({ ...base, columnWidthPx: 14, weekDates: weeks })
for (let index = 1; index < narrow.length; index += 1) {
  assert.ok(narrow[index].column >= narrow[index - 1].column + narrow[index - 1].spanColumns)
}

console.log('client-heatmap-axis.test: 全部通过')
