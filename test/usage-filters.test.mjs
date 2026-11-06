/**
 * 工具栏交互：范围切换、分页/滚动开关、重置、导出菜单展开与两项导出回调。
 * 用 jsdom 真挂载 UsageFilters（esbuild 打包），断言回调与菜单状态。
 * 运行：node test/usage-filters.test.mjs
 */
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React from 'react'

const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'MouseEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
  if (window[key] === undefined) continue
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { act } = React

const { loadTsx } = await import('./support/render.mjs')
const harness = await loadTsx('usage-filters-harness', `
import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { UsageFilters } from './src/client/components/UsageFilters.tsx'

export function mount(container, handlers) {
  function Harness() {
    const [range, setRange] = useState('month')
    const [paged, setPaged] = useState(true)
    const [exportOpen, setExportOpen] = useState(false)
    const exportMenuRef = useRef(null)
    const exportItemRefs = useRef([])
    return (
      <UsageFilters
        range={range}
        onRangeChange={(key) => { handlers.range.push(key); setRange(key) }}
        customFrom="2026-01-01"
        customTo="2026-01-31"
        bounds={{ from: '2026-01-01', to: '2026-01-31' }}
        onCustomRange={() => {}}
        paged={paged}
        onPagedChange={(value) => { handlers.paged.push(value); setPaged(value) }}
        filtersActive={true}
        onReset={() => handlers.reset.push(1)}
        scopedUsage={{ days: [] }}
        sessions={null}
        exportOpen={exportOpen}
        onExportToggle={() => { handlers.exportToggle.push(1); setExportOpen((open) => !open) }}
        onExportMenuKeyDown={() => {}}
        exportMenuRef={exportMenuRef}
        exportItemRefs={exportItemRefs}
        onExportUsage={() => handlers.exportUsage.push(1)}
        onExportSessions={() => handlers.exportSessions.push(1)}
      />
    )
  }
  const root = createRoot(container)
  root.render(<Harness />)
  return root
}
`)

const host = window.document.getElementById('host')
const handlers = { range: [], paged: [], reset: [], exportToggle: [], exportUsage: [], exportSessions: [] }
const root = await act(async () => { const mounted = harness.mount(host, handlers); await Promise.resolve(); return mounted })
const buttons = () => [...host.querySelectorAll('button')]
const byText = (text) => buttons().find((button) => button.textContent.includes(text))

// 范围切换
const rangeTabs = host.querySelector('[class="rangeTabs"]')
assert.ok(rangeTabs !== null, '范围 Tab 容器应已渲染')
const rangeButtons = [...rangeTabs.querySelectorAll('button')]
assert.ok(rangeButtons.length >= 3, '范围按钮应已渲染')
await act(async () => { rangeButtons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
assert.ok(handlers.range.length === 1, '点范围按钮应触发回调')

// 分页 / 滚动开关
const checkbox = host.querySelector('input[type="checkbox"]')
assert.ok(checkbox !== null)
await act(async () => { checkbox.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
assert.deepEqual(handlers.paged, [false], '取消勾选 → 切到滚动模式')

// 重置
const reset = byText('重置')
assert.ok(reset !== undefined)
await act(async () => { reset.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
assert.equal(handlers.reset.length, 1)

// 导出菜单：点开 → 两项都渲染 → 点第一项回调
const exportButton = byText('导出')
assert.ok(exportButton !== undefined)
await act(async () => { exportButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
assert.equal(handlers.exportToggle.length, 1)
let menuItems = [...host.querySelectorAll('[role="menuitem"]')]
assert.equal(menuItems.length, 2, '导出菜单应有导出明细 / 导出会话两项')
await act(async () => { menuItems[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
assert.equal(handlers.exportUsage.length, 1)
assert.equal(handlers.exportSessions.length, 0)

await act(async () => { root.unmount() })
console.log('usage-filters.test: 全部通过')
