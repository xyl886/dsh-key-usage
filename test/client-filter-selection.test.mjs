/**
 * 多选筛选值约定：逗号分隔字符串 ↔ 数组、空串 / ALL = 不筛。
 * 运行：node test/client-filter-selection.test.mjs
 */
import assert from 'node:assert/strict'
import { selectionMatches, selectionOf } from '../src/client/core/filter-selection.ts'

assert.deepEqual(selectionOf(undefined), [])
assert.deepEqual(selectionOf(''), [])
assert.deepEqual(selectionOf('  '), [])
assert.deepEqual(selectionOf('ALL'), [])
assert.deepEqual(selectionOf('web'), ['web'])
assert.deepEqual(selectionOf('web,api'), ['web', 'api'])
// 只去掉整体首尾空白，逗号两侧的空白属于值本身（调用方存值时不带空白）
assert.deepEqual(selectionOf(' web , api '), ['web ', ' api'])
assert.deepEqual(selectionOf('web,,api'), ['web', 'api'])

assert.equal(selectionMatches(['web'], undefined), true)
assert.equal(selectionMatches(['web'], ''), true)
assert.equal(selectionMatches(['web'], 'ALL'), true)
assert.equal(selectionMatches(['web', 'api'], 'api'), true)
assert.equal(selectionMatches(['web', 'api'], 'web,cli'), true)
assert.equal(selectionMatches(['web'], 'cli'), false)
assert.equal(selectionMatches([], 'web'), false)

console.log('client-filter-selection.test: 全部通过')
