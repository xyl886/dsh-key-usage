/**
 * i18n：按宿主 `@deepseek-ai/dsh-client-locale` 的契约注册命名空间字典，组件用 `t()` 取词。
 *
 * - 注册：`ctx.locale.register('dsh-key-usage', { zh, en })`，两种内置语言必须齐全；
 * - 取词：优先用宿主 `ctx.locale.bind(ns)` 返回的绑定函数（身份稳定，跟随宿主语言切换）；
 * - 重渲染：订阅宿主 locale 快照，切语言时 `useT()` 触发组件更新，不需要刷新页面；
 * - 回落：宿主没有 locale 服务（旧版本）时用本文件的 `zh`，界面不会变空。
 *
 * 命名：键用「区域.用途」，界面标签尽量 ≤6 字，解释性长句统一放 `caliber.*`（弹窗里）。
 */
import { useSyncExternalStore } from 'react'
import { en, zh } from './copy.ts'
import { logOnce } from './log.ts'

/** 宿主 locale 服务的形状（只声明我们用到的方法，宿主版本不同也能跑）。 */
export interface LocaleFace {
  register?: (namespace: string, dicts: { zh: Record<string, string>; en: Record<string, string> }) => unknown
  bind?: (namespace: string) => (key: string) => string
  subscribe?: (listener: () => void) => (() => void) | void
}

const NS = 'dsh-key-usage'
let bound: ((key: string) => string) | null = null
/** 宿主当前生效的语言（register/subscribe 时同步；宿主无 locale 服务时按中文） */
let active = 'zh'
let revision = 0
const listeners = new Set<() => void>()

/** 由客户端入口在 apply 时调用；任何一步失败都不抛错（界面继续用内置中文）。 */
export function installI18n(locale: LocaleFace | undefined): void {
  if (locale === undefined) return
  try {
    locale.register?.(NS, { zh, en })
    if (typeof locale.bind === 'function') bound = locale.bind(NS)
    const readActive = (): void => {
      const snapshot = (locale as { getSnapshot?: () => { active?: unknown } }).getSnapshot?.()
      if (snapshot !== undefined && typeof snapshot.active === 'string') active = snapshot.active
    }
    readActive()
    locale.subscribe?.(() => {
      readActive()
      revision += 1
      for (const listener of listeners) listener()
    })
  } catch {
    bound = null
  }
}

/** 取词：`{name}` 占位用 params 替换；缺键回落中文词典，再缺则回显键名（便于发现漏词）。 */
/** 当前语言是否英文（用于决定「服务端中文长文」要不要换成结构化指引）。 */
export function isEnglish(): boolean {
  return active.toLowerCase().startsWith('en')
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = key
  if (bound !== null) {
    const translated = bound(key)
    if (translated === key && zh[key] === undefined) logOnce('warn', 'i18n', key, '缺词：' + key)
    text = translated === key ? (zh[key] ?? key) : translated
  } else {
    text = zh[key] ?? key
  }
  if (params === undefined) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name]
    return value === undefined ? whole : String(value)
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** 组件里用它拿 t：宿主切语言时自动重渲染。 */
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  useSyncExternalStore(subscribe, () => revision, () => revision)
  return t
}
