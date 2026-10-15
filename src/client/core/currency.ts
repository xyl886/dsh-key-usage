/**
 * 显示币种与汇率折算：全插件金额渲染的唯一收口点（模块级订阅 store，切币种时整页重渲染）。
 * 逐币种小计走 `costsByCurrency`（`cost` 是混币种相加，只当兜底）；能折算才折算（带 `≈`），绝不猜汇率；
 * 显示币种不落盘 —— 记住一个还没取到汇率的 USD 只会让界面更难懂。
 */
import { useEffect, useState } from 'react'
import { localTimeTextOf } from './format.ts'
import { t } from './i18n.ts'

export type DisplayCurrency = 'CNY' | 'USD'

export const DISPLAY_CURRENCIES: DisplayCurrency[] = ['CNY', 'USD']

/** 切换按钮的文案：符号 + ISO 代码，避免只认符号的用户认错币种。 */
export const DISPLAY_CURRENCY_LABELS: Record<DisplayCurrency, string> = {
  CNY: '¥ RMB',
  USD: '$ USD',
}

/** 缺省显示人民币：内置官方价目以 CNY 为主，旧的界面口径也是 ¥。 */
export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = 'CNY'

/** 汇率来源：upstream = 刚联网取的；cache = 服务端 12 小时内的缓存；default = 没能联网时的兜底值。 */
export type FxSource = 'upstream' | 'cache' | 'default'

export const FX_SOURCE_LABELS: Record<FxSource, string> = {
  upstream: t('fx.live'),
  cache: t('fx.cache'),
  default: t('fx.default'),
}

export interface FxRate {
  base: string
  quote: string
  /** 1 base 兑多少 quote（服务端给 USD → CNY）。 */
  rate: number
  fetchedAt: string | null
  source: FxSource
  /** 服务端判定已过期：切换币种时会再取一次。 */
  stale: boolean
  upstream: string | null
  note: string | null
}

export interface CurrencyDisplayState {
  display: DisplayCurrency
  fx: FxRate | null
}

/** 显示币种与汇率都在这里；`fx: null` = 还没取到汇率（跨币种金额按原币种显示）。 */
let state: CurrencyDisplayState = { display: DEFAULT_DISPLAY_CURRENCY, fx: null }

const listeners = new Set<() => void>()

export function currencyDisplayStateOf(): CurrencyDisplayState {
  return state
}

export function subscribeCurrencyDisplay(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function emit(): void {
  for (const listener of [...listeners]) listener()
}

export function setDisplayCurrency(display: DisplayCurrency): void {
  if (state.display === display) return
  state = { ...state, display }
  emit()
}

/** 写入汇率；服务端读不到时传 null（不要保留上一次的旧值冒充新值）。 */
export function setFxRate(fx: FxRate | null): void {
  state = { ...state, fx }
  emit()
}

/** 订阅显示币种与汇率：切币种 / 汇率更新后组件重渲染。 */
export function useCurrencyDisplay(): CurrencyDisplayState {
  const [current, setCurrent] = useState<CurrencyDisplayState>(currencyDisplayStateOf)
  useEffect(() => subscribeCurrencyDisplay(() => setCurrent(currencyDisplayStateOf())), [])
  return current
}

/** 币种代码归一：只认 CNY / USD（其余返回 null，不猜汇率）。 */
function normalizeCurrency(currency: unknown): DisplayCurrency | null {
  if (typeof currency !== 'string') return null
  const upper = currency.trim().toUpperCase()
  return upper === 'CNY' || upper === 'USD' ? upper : null
}

/** 币种符号；未知 / 缺失的币种保留代码前缀，避免把 USD 当 CNY 渲染。 */
export function currencySymbolOf(currency: unknown): string {
  const normalized = normalizeCurrency(currency)
  if (normalized === 'CNY') return '¥'
  if (normalized === 'USD') return '$'
  return typeof currency === 'string' && currency !== '' ? currency + ' ' : ''
}

/** 显示币种的符号。 */
export function displaySymbolOf(display: DisplayCurrency = state.display): string {
  return currencySymbolOf(display)
}

/** 从 from 折算到 to 的倍率；方向不匹配或缺汇率时返回 null。 */
function pairRateOf(from: DisplayCurrency, to: DisplayCurrency): number | null {
  const fx = state.fx
  if (fx === null || !Number.isFinite(fx.rate) || fx.rate <= 0) return null
  const base = normalizeCurrency(fx.base)
  const quote = normalizeCurrency(fx.quote)
  if (base === null || quote === null) return null
  if (from === base && to === quote) return fx.rate
  if (from === quote && to === base) return 1 / fx.rate
  return null
}

export interface MoneyView {
  /** 展示文本：发生折算时带 `≈` 前缀。 */
  text: string
  converted: boolean
  /** 多币种并列显示（缺汇率没法相加）时为 true：文本里是 `¥1.00 · $2.00`，不是合计。 */
  mixed: boolean
  amount: number
  /** 该数值的币种（混币种无法折算时为空串）。 */
  currency: string
}

/** 金额文本（全插件唯一入口）：按显示币种折算，折算值带 `≈`；两位小数精度不随折算改变。 */
export function moneyTextOf(currency: unknown, amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0
  const display = state.display
  const from = normalizeCurrency(currency)
  const rate = from === null || from === display ? null : pairRateOf(from, display)
  if (rate === null) return currencySymbolOf(currency) + value.toFixed(2)
  return '≈' + currencySymbolOf(display) + (value * rate).toFixed(2)
}

/** 单笔金额的展示视图：文本 + 是否折算 + 折算后的数值。 */
export function moneyViewOf(currency: unknown, amount: number): MoneyView {
  const value = Number.isFinite(amount) ? amount : 0
  const display = state.display
  const from = normalizeCurrency(currency)
  const rate = from === null || from === display ? null : pairRateOf(from, display)
  return {
    text: moneyTextOf(currency, amount),
    converted: rate !== null,
    mixed: false,
    amount: rate === null ? value : value * rate,
    currency: rate === null ? (typeof currency === 'string' ? currency : '') : display,
  }
}

/** 0 元占位文案（免费额度等）：跟着显示币种走，不带折算标记（0 折算还是 0）。 */
export function zeroMoneyTextOf(): string {
  return displaySymbolOf() + '0.00'
}

/** 单价数值文本：≥0.01 用两位小数，小值保留 4 位 —— 显示成 0.00 等于谎报「免费」。 */
export function rateValueTextOf(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0
  if (value === 0) return '0'
  if (Math.abs(value) >= 0.01) return value.toFixed(2)
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

/** 该币种的金额在当前显示币种下是否会被折算（决定要不要显示 `≈` 与原始币种）。 */
export function convertsCurrencyOf(currency: unknown): boolean {
  const from = normalizeCurrency(currency)
  return from !== null && from !== state.display && pairRateOf(from, state.display) !== null
}

/** 单价单元格：按显示币种折算（折算值带 `≈`），换算后仍用单价精度，不套金额的两位小数。 */
export function rateTextOf(currency: unknown, amount: number): { text: string; converted: boolean } {
  const display = state.display
  const from = normalizeCurrency(currency)
  const rate = from === null || from === display ? null : pairRateOf(from, display)
  const value = Number.isFinite(amount) ? amount : 0
  if (rate === null) return { text: rateValueTextOf(value), converted: false }
  return { text: '≈' + rateValueTextOf(value * rate), converted: true }
}

/** 服务端给的一行成本：`costsByCurrency` 是并列的逐币种小计，`cost` 只是兜底单值。 */
export interface CostRowLike {
  cost?: number | null
  costsByCurrency?: Record<string, number> | null
}

/** 逐币种小计里参与展示的项：0 与非有限值一律丢掉（0 只会污染文本）。 */
function positiveEntriesOf(row: CostRowLike): Array<[string, number]> {
  const totals = row.costsByCurrency
  if (totals === null || typeof totals !== 'object') return []
  const entries: Array<[string, number]> = []
  for (const [currency, amount] of Object.entries(totals)) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) continue
    entries.push([currency, amount])
  }
  const orderOf = (currency: string): number => {
    const normalized = normalizeCurrency(currency)
    return normalized === 'CNY' ? 0 : normalized === 'USD' ? 1 : 2
  }
  return entries.sort((first, second) => orderOf(first[0]) - orderOf(second[0]) || first[0].localeCompare(second[0]))
}

/**
 * 一行金额：有 `costsByCurrency` 就逐币种折算后相加（`cost` 会把 CNY 与 USD 加在一起）；
 * 拿不到该字段时回落旧行为，多币种缺汇率时并列显示、不相加。
 */
export function rowMoneyViewOf(row: CostRowLike): MoneyView {
  const entries = positiveEntriesOf(row)
  if (entries.length === 0) {
    const fallback = typeof row.cost === 'number' && Number.isFinite(row.cost) ? row.cost : 0
    return { text: currencySymbolOf('CNY') + fallback.toFixed(2), converted: false, mixed: false, amount: fallback, currency: 'CNY' }
  }
  const parts = entries.map(([currency, amount]) => ({ currency, amount, view: moneyViewOf(currency, amount) }))
  const unconvertible = parts.filter((part) => !part.view.converted && normalizeCurrency(part.currency) !== state.display)
  if (unconvertible.length === 0) {
    const total = parts.reduce((sum, part) => sum + part.view.amount, 0)
    const converted = parts.some((part) => part.view.converted)
    // 文本仍走 moneyTextOf 收口（显示币种与原币种相同，不会再折算一次）
    const text = moneyTextOf(state.display, total)
    return {
      text: converted ? '≈' + text : text,
      converted,
      mixed: parts.length > 1,
      amount: total,
      currency: state.display,
    }
  }
  if (parts.length === 1) return parts[0].view
  return {
    text: parts.map((part) => part.view.text).join(' · '),
    converted: false,
    mixed: true,
    amount: parts.reduce((sum, part) => sum + part.amount, 0),
    currency: '',
  }
}

/** 行金额文本（含折算标记）；汇总 / 合计一律走它，不要直接渲染 `cost`。 */
export function moneyTotalsTextOf(row: CostRowLike): string {
  return rowMoneyViewOf(row).text
}

/** 同一行在展示币种下的可比数值（环比涨跌、排序用）。 */
export function comparableMoneyAmountOf(row: CostRowLike): number {
  return rowMoneyViewOf(row).amount
}

/** 汇率说明：`1 USD = 7.10 CNY · 实时上游 · 08-14 10:22`；没取到时说明为什么。 */
export function fxSummaryTextOf(fx: FxRate | null): string {
  if (fx === null) return t('fx.missing')
  const parts = ['1 ' + fx.base + ' = ' + rateValueTextOf(fx.rate) + ' ' + fx.quote]
  parts.push(FX_SOURCE_LABELS[fx.source] ?? fx.source)
  const time = localTimeTextOf(fx.fetchedAt)
  if (time !== null) parts.push(time)
  if (fx.stale) parts.push(t('fx.stale'))
  return parts.join(' · ')
}

/** 把服务端 `/fx` 的响应归一化成内部结构；rate 非法时返回 null（宁可不算也不猜）。 */
export function normalizeFxRate(raw: unknown): FxRate | null {
  if (raw === null || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const rate = typeof record.rate === 'number' ? record.rate : Number(record.rate)
  if (!Number.isFinite(rate) || rate <= 0) return null
  const source = record.source === 'upstream' || record.source === 'cache' || record.source === 'default'
    ? record.source
    : 'default'
  return {
    base: typeof record.base === 'string' && record.base !== '' ? record.base : 'USD',
    quote: typeof record.quote === 'string' && record.quote !== '' ? record.quote : 'CNY',
    rate,
    fetchedAt: typeof record.fetchedAt === 'string' && record.fetchedAt !== '' ? record.fetchedAt : null,
    source,
    stale: record.stale === true,
    upstream: typeof record.upstream === 'string' && record.upstream !== '' ? record.upstream : null,
    note: typeof record.note === 'string' && record.note !== '' ? record.note : null,
  }
}

/** 服务端兜底汇率时的显式提示：`source: 'default'` 必须让人看出「这不是联网拿到的」。 */
export function fxFallbackWarningOf(fx: FxRate | null): string | null {
  if (fx === null || fx.source !== 'default') return null
  return t('fx.defaultPrefix') + rateValueTextOf(fx.rate) + t('fx.defaultSuffix')
    + (fx.note === null ? '' : '（' + fx.note + '）')
}
