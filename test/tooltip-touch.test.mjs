/**
 * 触控浮层交互：点按显示 / 同一目标再点关闭 / 点浮层外面关闭。
 * 用 jsdom + react-dom/client 真挂载 useTooltip + TooltipView，模拟 touchstart 事件。
 * 运行：node test/tooltip-touch.test.mjs
 */
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import React from 'react'
const { act } = React

const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const { window } = dom
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'CustomEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
  Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { loadTsx } = await import('./support/render.mjs')
const harness = await loadTsx('tooltip-harness', `
import { createRoot } from 'react-dom/client'
import { useTooltip, TooltipView } from './src/client/core/tooltip.tsx'

function Harness() {
  const tooltip = useTooltip()
  return (
    <div>
      <button data-testid="cell" onTouchStart={(event) => tooltip.show(event, <b>touch-tip</b>)}>cell</button>
      <button data-testid="other">other</button>
      <TooltipView tooltip={tooltip.tooltip} />
    </div>
  )
}

export function mount(container) {
  const root = createRoot(container)
  root.render(<Harness />)
  return root
}
`)

function touchEvent(target) {
  const event = new window.Event('touchstart', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: [{ clientX: 20, clientY: 30, target }] })
  return event
}

const host = window.document.getElementById('host')
const root = await act(async () => {
  const mounted = harness.mount(host)
  await Promise.resolve()
  return mounted
})
const cell = host.querySelector('[data-testid="cell"]')
assert.ok(cell !== null)

// 初始不显示
assert.equal(window.document.querySelector('.tooltip'), null)

// 第一次点按：显示
await act(async () => { cell.dispatchEvent(touchEvent(cell)) })
const shown = window.document.querySelector('.tooltip')
assert.ok(shown !== null, '点按后应出现浮层')
assert.match(shown.textContent, /touch-tip/)

// 同一目标再点：关闭
await act(async () => { cell.dispatchEvent(touchEvent(cell)) })
assert.equal(window.document.querySelector('.tooltip'), null, '同一目标再点应关闭')

// 再次打开后点浮层外面（body 空白处）：关闭
await act(async () => { cell.dispatchEvent(touchEvent(cell)) })
assert.ok(window.document.querySelector('.tooltip') !== null)
await act(async () => { window.document.body.dispatchEvent(touchEvent(window.document.body)) })
assert.equal(window.document.querySelector('.tooltip'), null, '点外面应关闭')

await act(async () => { root.unmount() })
console.log('tooltip-touch.test: 全部通过')
