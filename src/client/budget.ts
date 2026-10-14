/**
 * 预算与告警的客户端视图模型：阈值形状、归一化、文案与配色。
 *
 * 阈值与计费规则同住宿主设置服务的 `dsh-key-usage` 命名空间（读写都经 `pricingSettings`），
 * 判定在服务端（`src/server/budget.ts`），界面只负责把结论说清楚、把阈值编辑好。
 */
import { fmtTokens } from './format.ts'
import { moneyTextOf, settingsSectionOf } from './pricing.ts'

export type BudgetKind = 'dailyTokens' | 'monthlyTokens' | 'monthlyCost'

/** ok = 未达提醒线；near = 已到 80%；over = 用满或超出上限（与服务端同一套取值）。 */
export type BudgetLevel = 'ok' | 'near' | 'over'

export interface BudgetCostLimit {
  currency: string
  amount: number
}

/** 预算阈值：三项都可为 0 / 缺省 = 该项不启用。 */
export interface BudgetThresholds {
  dailyTokens: number
  monthlyTokens: number
  monthlyCost: BudgetCostLimit[]
}

export interface BudgetEntry {
  kind: BudgetKind
  /** 仅 `monthlyCost` 有。 */
  currency?: string
  used: number
  limit: number
  /** 使用率百分数，保留 1 位小数，超限时不封顶。 */
  percent: number
}

export interface BudgetResponse {
  enabled: boolean
  level: BudgetLevel
  entries: BudgetEntry[]
  today: { date: string; tokens: number }
  /** 「月」是本地日历月（首日 ~ 今天），不是滚动 30 天。 */
  month: { from: string; to: string; tokens: number; costByCurrency: Record<string, number> }
  thresholds: BudgetThresholds
}

export const EMPTY_BUDGET_THRESHOLDS: BudgetThresholds = { dailyTokens: 0, monthlyTokens: 0, monthlyCost: [] }

/** 与服务端 budget.ts 的 NEAR_PERCENT 同一口径：使用率到达这条线算「接近上限」。 */
const NEAR_PERCENT = 80

function limitOr(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

/** 设置服务返回的值做防御式归一：认不出的字段一律当「不启用」，不猜数值。 */
export function normalizeClientBudget(value: unknown): BudgetThresholds {
  const record = settingsSectionOf(value, 'budget')
  if (record === null || typeof record !== 'object') return EMPTY_BUDGET_THRESHOLDS
  const fields = record as Record<string, unknown>
  const monthlyCost: BudgetCostLimit[] = []
  for (const entry of Array.isArray(fields.monthlyCost) ? fields.monthlyCost : []) {
    if (entry === null || typeof entry !== 'object') continue
    const candidate = entry as { currency?: unknown; amount?: unknown }
    const amount = limitOr(candidate.amount)
    if (amount === 0) continue
    monthlyCost.push({ currency: textOr(candidate.currency, 'CNY'), amount })
  }
  return {
    dailyTokens: limitOr(fields.dailyTokens),
    monthlyTokens: limitOr(fields.monthlyTokens),
    monthlyCost,
  }
}

/**
 * 编辑器草稿 → 写盘形状：金额为 0（= 不启用）与空币种的条目丢掉，
 * 同币种只保留第一条 —— 成本是逐币种独立比较，重复配置没有意义。
 */
export function budgetThresholdsForWrite(thresholds: BudgetThresholds): Record<string, unknown> {
  const seen = new Set<string>()
  const monthlyCost: BudgetCostLimit[] = []
  for (const candidate of thresholds.monthlyCost) {
    const currency = candidate.currency.trim()
    const amount = limitOr(candidate.amount)
    if (currency === '' || amount === 0 || seen.has(currency)) continue
    seen.add(currency)
    monthlyCost.push({ currency, amount })
  }
  return {
    dailyTokens: limitOr(thresholds.dailyTokens),
    monthlyTokens: limitOr(thresholds.monthlyTokens),
    monthlyCost,
  }
}

/** 条目名称：今日 Tokens / 本月 Tokens / 本月 CNY 成本。 */
export function budgetEntryNameOf(entry: BudgetEntry): string {
  if (entry.kind === 'dailyTokens') return '今日 Tokens'
  if (entry.kind === 'monthlyTokens') return '本月 Tokens'
  return '本月 ' + (entry.currency ?? '') + ' 成本'
}

/** 已用 / 上限：「3.58B / 5B」「¥61.20 / ¥100.00」。 */
export function budgetAmountTextOf(entry: BudgetEntry): string {
  if (entry.kind === 'monthlyCost') {
    const currency = entry.currency ?? ''
    return moneyTextOf(currency, entry.used) + ' / ' + moneyTextOf(currency, entry.limit)
  }
  return fmtTokens(entry.used) + ' / ' + fmtTokens(entry.limit)
}

/** 使用率文本：服务端已算到 1 位小数，这里只补百分号。 */
export function budgetPercentTextOf(percent: number): string {
  return percent.toFixed(1) + '%'
}

/** 单条的档位（与服务端 levelOf 同一套阈值，供逐条配色）。 */
export function budgetLevelOf(percent: number): BudgetLevel {
  if (percent >= 100) return 'over'
  if (percent >= NEAR_PERCENT) return 'near'
  return 'ok'
}

/** 进度条颜色：只在本处用对错语义色，正常档用强调色。 */
export function budgetBarColorOf(level: BudgetLevel): string {
  if (level === 'over') return 'var(--dsw-alias-state-error-primary, #e05a5a)'
  if (level === 'near') return 'var(--dsw-alias-state-warn-primary, #e0a13c)'
  return 'var(--dsw-alias-state-accent-primary, #5b8cff)'
}

/** 最严重的那一项：横幅只报一条，先说最要紧的。 */
export function worstBudgetEntryOf(entries: BudgetEntry[]): BudgetEntry | null {
  const rank: Record<BudgetLevel, number> = { ok: 0, near: 1, over: 2 }
  let worst: BudgetEntry | null = null
  for (const entry of entries) {
    if (worst === null || rank[budgetLevelOf(entry.percent)] > rank[budgetLevelOf(worst.percent)]) worst = entry
  }
  return worst
}

/**
 * 横幅文案：「本月 Tokens 已用 3.58B / 5B（71.6%），接近上限」/「…，已超出上限」。
 * 全部都在提醒线以内时返回 null（界面据此完全不渲染横幅）。
 */
export function budgetAlertTextOf(response: BudgetResponse): string | null {
  const entry = worstBudgetEntryOf(response.entries)
  if (entry === null) return null
  const level = budgetLevelOf(entry.percent)
  if (level === 'ok') return null
  const verdict = level === 'near' ? '接近上限' : entry.percent > 100 ? '已超出上限' : '已用满上限'
  return budgetEntryNameOf(entry) + '已用 ' + budgetAmountTextOf(entry)
    + '（' + budgetPercentTextOf(entry.percent) + '），' + verdict
}
