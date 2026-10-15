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

/** 界面文案（中文）：标签极简，解释性内容只出现在口径弹窗里。 */
const zh: Record<string, string> = {
  'nav.usage': '使用情况',
  'app.title': '使用情况',

  'tab.overview': '总览',
  'tab.detail': '使用明细',
  'tab.projects': '项目用量',
  'tab.models': '按模型',
  'tab.sessions': '会话用量',
  'tab.quota': '余额与配额',

  'action.refresh': '刷新',
  'action.refreshing': '刷新中',
  'action.caliber': '口径',
  'action.close': '关闭',

  'caliber.title': '口径说明',
  'caliber.source': '按天数据优先取宿主台账（含官方成本），台账没记录的日子回退会话事件补充{days}；项目 / 会话 / 按模型 / 按小时来自会话事件，每个样本计一次调用。',
  'caliber.sourceDays': '（当前有 {count} 天）',
  'caliber.cost': '成本四层自动生效，不需要填任何价格：官方账单 > 官方价（内置厂商价目）> 聚合（LiteLLM）> 台账反推均价；角标同此命名，没有依据时显示 —。',
  'caliber.currency': '金额按所选币种折算（带 ≈），当前{fx}。',
  'caliber.fxMissing': '还没取到汇率，跨币种按原币种显示',
  'caliber.refresh': '页面数据来自统一快照，本地数据每 5 分钟重建；余额与订阅窗口只在打开页面或点刷新时联网，查不到就沿用上一份快照并标出时间与原因。',
}

/** 界面文案（英文）：只做短词，不写句子；长解释同样只在口径弹窗里。 */
const en: Record<string, string> = {
  'nav.usage': 'Usage',
  'app.title': 'Usage',

  'tab.overview': 'Overview',
  'tab.detail': 'Details',
  'tab.projects': 'Projects',
  'tab.models': 'Models',
  'tab.sessions': 'Sessions',
  'tab.quota': 'Balance',

  'action.refresh': 'Refresh',
  'action.refreshing': 'Refreshing',
  'action.caliber': 'Method',
  'action.close': 'Close',

  'caliber.title': 'Method',
  'caliber.source': 'Daily figures come from the host ledger (official cost included); days missing there fall back to session events{days}. Projects, sessions, models and hourly buckets come from session events, one call per sample.',
  'caliber.sourceDays': ' ({count} days)',
  'caliber.cost': 'Cost resolves in four layers: official bill > built-in vendor catalog > LiteLLM aggregate > ledger average. Badges use the same names; — means no basis.',
  'caliber.currency': 'Amounts convert to the selected currency (≈). Currently {fx}.',
  'caliber.fxMissing': 'no FX rate yet, showing original currencies',
  'caliber.refresh': 'Page data comes from one snapshot, rebuilt locally every 5 minutes. Balance and quota windows only go online when you open the page or refresh; stale values keep their timestamp and reason.',
}

/** 宿主 locale 服务的形状（只声明我们用到的方法，宿主版本不同也能跑）。 */
export interface LocaleFace {
  register?: (namespace: string, dicts: { zh: Record<string, string>; en: Record<string, string> }) => unknown
  bind?: (namespace: string) => (key: string) => string
  subscribe?: (listener: () => void) => (() => void) | void
}

const NS = 'dsh-key-usage'
let bound: ((key: string) => string) | null = null
let revision = 0
const listeners = new Set<() => void>()

/** 由客户端入口在 apply 时调用；任何一步失败都不抛错（界面继续用内置中文）。 */
export function installI18n(locale: LocaleFace | undefined): void {
  if (locale === undefined) return
  try {
    locale.register?.(NS, { zh, en })
    if (typeof locale.bind === 'function') bound = locale.bind(NS)
    locale.subscribe?.(() => {
      revision += 1
      for (const listener of listeners) listener()
    })
  } catch {
    bound = null
  }
}

/** 取词：`{name}` 占位用 params 替换；缺键回落中文词典，再缺则回显键名（便于发现漏词）。 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = key
  if (bound !== null) {
    const translated = bound(key)
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
  useSyncExternalStore(subscribe, () => revision)
  return t
}
