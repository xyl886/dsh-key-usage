/**
 * 零 Token 行过滤与提示文案。
 * 运行：node test/client-rows.test.mjs
 */
import assert from 'node:assert/strict'
import { dropEmptyRows, hiddenEmptyRowsText } from '../src/client/core/rows.ts'

const rows = [{ tokens: 0 }, { tokens: 5 }, { tokens: 0 }, { tokens: 1 }]
const filtered = dropEmptyRows(rows, (row) => row.tokens)
assert.equal(filtered.rows.length, 2)
assert.equal(filtered.hidden, 2)

assert.deepEqual(dropEmptyRows([], (row) => row.tokens), { rows: [], hidden: 0 })

const text = hiddenEmptyRowsText(3)
assert.equal(typeof text, 'string')
assert.ok(text.includes('3'))

console.log('client-rows.test: 全部通过')
