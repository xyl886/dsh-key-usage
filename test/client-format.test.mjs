/**
 * 展示层格式化纯函数测试：数字 / 日期 / 时长 / 命中率。
 * 运行：node test/client-format.test.mjs
 */
import assert from 'node:assert/strict'
import {
  fmtCount, fmtTokens, fmtCalls, fmtShortDate, fmtDateTime, fmtTime, fmtDuration, fmtHitRate, fmtRelative,
  isoDate, shiftedIsoDate, localTimeTextOf,
} from '../src/client/core/format.ts'

// 数字：空格千分位、不跟随 locale、非有限数显示破折号
assert.equal(fmtCount(1234567), '1234567')
assert.equal(fmtCount(999), '999')
assert.equal(fmtCount(12.4), '12')
assert.equal(fmtCount(Number.NaN), '—')
assert.equal(fmtCalls(1000), '1000')

// 大数缩写：K / M / B，且四舍五入到 1000 时降级
assert.equal(fmtTokens(1500), '1.5K')
assert.equal(fmtTokens(999_999), '999999')
assert.equal(fmtTokens(2_500_000), '2.5M')
assert.equal(fmtTokens(3_000_000_000), '3.0B')
assert.equal(fmtTokens(Number.POSITIVE_INFINITY), '—')

// 日期：本地日历日、短日期、时间戳格式化
assert.equal(isoDate(new Date(2026, 0, 5)), '2026-01-05')
assert.equal(fmtShortDate('2026-03-09'), '03-09')
assert.equal(fmtDateTime(null), '—')
assert.equal(fmtTime(null), '—')
assert.equal(fmtDateTime(new Date(2026, 2, 9, 8, 5).getTime()), '2026-03-09 08:05')
assert.equal(fmtTime(new Date(2026, 2, 9, 8, 5).getTime()), '08:05')
assert.match(shiftedIsoDate(0), /^\d{4}-\d{2}-\d{2}$/)

// ISO 文本解析：只认能 parse 的字符串
assert.equal(localTimeTextOf('2026-03-09T08:05:00.000Z'), fmtDateTime(new Date('2026-03-09T08:05:00.000Z').getTime()))
assert.equal(localTimeTextOf('not-a-date'), null)
assert.equal(localTimeTextOf(''), null)
assert.equal(localTimeTextOf(42), null)

// 时长 / 命中率 / 最近活跃
assert.equal(fmtDuration(null), '—')
assert.equal(fmtDuration(0), '—')
assert.equal(fmtDuration(59_000), '1m')
assert.equal(fmtDuration(3_600_000), '1h 0m')
assert.match(fmtDuration(25 * 3_600_000), /天/)
assert.equal(fmtHitRate(50, 200), '25.0%')
assert.equal(fmtHitRate(0, 0), '—')
assert.equal(fmtRelative(null, 0), '—')
assert.match(fmtRelative(Date.now(), Date.now()), /^\d{2}:\d{2}$/)

console.log('client-format.test: 全部通过')
