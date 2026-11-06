/**
 * 会话详情抽屉：加载成功后渲染标题；Esc 与点遮罩都能关闭（组件交互，不依赖真实 API）。
 * 用 jsdom 挂载，`core/api.ts` 由 esbuild 桩模块替换。
 * 运行：node test/session-drawer.test.mjs
 */
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React from 'react'

const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
  if (window[key] === undefined) continue
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { act } = React

const { loadTsx } = await import('./support/render.mjs')
const apiStub = `
export function failureReasonOf() { return null }
export function sessionDetailPath(id) { return '/dsh-key-usage/session?id=' + encodeURIComponent(id) }
export async function loadSessionDetail() {
  return {
    session: {
      id: 's1', title: '测试会话', archived: false, workspace: 'D:/EasyJob', provider: 'opencode-go',
      providerLabel: 'OpenCode Go', costMode: 'subscription', firstTime: 1760000000000, lastTime: 1760003600000,
      durationMs: 3600000, days: 1, prompt: '你好', models: [], hours: null,
      buckets: { inputTokens: 100, outputTokens: 200, cacheReadTokens: 300, cacheWriteTokens: 0 },
      cacheHitRate: 50.0,
      calls: 12, tokens: 3400, cost: 1.23, costSource: 'catalog', partial: false, costsByCurrency: { USD: 1.23 },
    },
    coverage: { status: 'complete', reason: null },
    priced: true,
  }
}
`
const harness = await loadTsx('session-drawer-harness', `
import { createRoot } from 'react-dom/client'
import { SessionDetailDrawer } from './src/client/components/SessionDetailDrawer.tsx'

export function mount(container, handlers) {
  const root = createRoot(container)
  root.render(
    <SessionDetailDrawer
      sessionId="s1"
      fallbackTitle="fallback"
      channels={[]}
      subagents={[]}
      onOpenSession={() => {}}
      parentId={null}
      parentTitle={null}
      onClose={() => handlers.close.push(1)}
    />,
  )
  return root
}
`, { stubs: { 'core/api\\.ts$': apiStub } })

const host = window.document.getElementById('host')
const handlers = { close: [] }
const root = await act(async () => {
  const mounted = harness.mount(host, handlers)
  await new Promise((resolve) => setTimeout(resolve, 10))
  return mounted
})
assert.match(host.textContent, /测试会话/, '加载成功后应显示会话标题')

// Esc 关闭
await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })) })
assert.equal(handlers.close.length, 1, 'Esc 应触发关闭')

// 点遮罩关闭
const mask = host.querySelector('.drawerMask')
assert.ok(mask !== null, '抽屉遮罩应存在')
await act(async () => { mask.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
assert.equal(handlers.close.length, 2, '点遮罩应触发关闭')

await act(async () => { root.unmount() })
console.log('session-drawer.test: 全部通过')
