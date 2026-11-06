/**
 * 组件渲染冒烟：用 esbuild 临时打包组件，react-dom/server 渲染成 HTML 后断言结构。
 * 覆盖：空态、KPI 卡、日志提示、成本来源角标（这些组件是各 Tab 共用的基础件）。
 * 运行：node test/components-render.test.mjs
 */
import assert from 'node:assert/strict'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { loadTsx } from './support/render.mjs'

const components = await loadTsx('components-smoke', `
export { EmptyState } from './src/client/components/ui/EmptyState.tsx'
export { KpiStat } from './src/client/components/KpiStat.tsx'
export { LogHint } from './src/client/components/LogHint.tsx'
export { CostSourceChip } from './src/client/components/CostSourceChip.tsx'
`)

// 空态：role=status + 标题 + 原因
const empty = renderToString(React.createElement(components.EmptyState, { title: '暂无数据', reason: '换个范围试试' }))
assert.match(empty, /role="status"/)
assert.match(empty, /暂无数据/)
assert.match(empty, /换个范围试试/)

// KPI 卡：标签 / 数值 / 单位 / 变化行
const kpi = renderToString(React.createElement(components.KpiStat, {
  label: '调用', value: '1234', unit: '次', previousText: '较上期', deltaText: '+12%',
}))
assert.match(kpi, /kpiCard/)
assert.match(kpi, /kpiLabel/)
assert.match(kpi, /调用/)
assert.match(kpi, /1234/)
assert.match(kpi, /次/)
assert.match(kpi, /\+12%/)

// 日志提示：按钮形态，文本即结论
const hint = renderToString(React.createElement(components.LogHint, { text: '刷新失败', tone: 'error' }))
assert.match(hint, /<button/)
assert.match(hint, /刷新失败/)

// 成本来源角标：常见档位不挂角标，聚合价挂
assert.equal(renderToString(React.createElement(components.CostSourceChip, { source: 'official' })), '')
assert.equal(renderToString(React.createElement(components.CostSourceChip, { source: null })), '')
const aggregate = renderToString(React.createElement(components.CostSourceChip, { source: 'aggregate' }))
assert.match(aggregate, /sourceChip/)
assert.match(aggregate, /聚合价/)

console.log('components-render.test: 全部通过')
