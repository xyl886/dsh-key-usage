/**
 * 预算与告警：把「今日 / 本月用量」与阈值折成 ok / near / over 三档（纯函数，可离线单测）。
 *
 * 阈值与计费规则同住宿主设置服务的 `dsh-key-usage` 命名空间（见 index.ts 的 `Config.budget`），
 * 本模块不读文件、不联网。口径：「日」「月」按**本地日历日 / 日历月**切分；Tokens 用**展示口径**
 * （输入 + 输出 + 缓存读，不含缓存写）；成本**按币种独立比较**，不换算、不合计。
 * 告警只是提示，不阻断任何操作。
 */
import { settingsSectionOf } from './pricing.js'

/** 预算阈值：三项都可为 0 / 缺省 = 该项不启用。 */
export interface BudgetThresholds {
  /** 每日 Tokens 上限（展示口径）。 */
  dailyTokens: number
  /** 每月 Tokens 上限（展示口径）。 */
  monthlyTokens: number
  /** 每月成本上限，逐币种独立比较（不做汇率换算）。 */
  monthlyCost: Array<{ currency: string; amount: number }>
}

export type BudgetKind = 'dailyTokens' | 'monthlyTokens' | 'monthlyCost'

/** ok = 未达提醒线；near = 已到 80%；over = 用满或超出上限。 */
export type BudgetLevel = 'ok' | 'near' | 'over'

export interface BudgetEntry {
  kind: BudgetKind
  /** 仅 `monthlyCost` 有：该条上限的币种。 */
  currency?: string
  used: number
  limit: number
  /** 使用率百分数，保留 1 位小数；**不封顶**（超限时大于 100，界面据此说明超了多少）。 */
  percent: number
}

/** 判定用的用量读数（由 routes 从台账 × 会话合并里取）。 */
export interface BudgetUsage {
  todayTokens: number
  monthTokens: number
  /** 本月各币种成本（键为币种代码）。 */
  monthCostByCurrency: Record<string, number>
}

export interface BudgetEvaluation {
  enabled: boolean
  level: BudgetLevel
  entries: BudgetEntry[]
}

export const EMPTY_BUDGET: BudgetThresholds = { dailyTokens: 0, monthlyTokens: 0, monthlyCost: [] }

/** 接近阈值：使用率到达这条线就提醒（提前量，不随配置变化）。 */
export const NEAR_PERCENT = 80

/** 单币种上限条数上限：设置里的值不可信，超出的丢弃，避免一次请求把界面撑爆。 */
const MAX_COST_LIMITS = 12

/** 阈值的唯一合法形态是「有限且大于 0」；其余（负数 / 字符串 / NaN）一律折算成 0 = 不启用。 */
function limitOr(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * 防御式解析设置值：命名空间根对象（`{ budget: … }`）与直接给这一段的两种形状都接受。
 * 上限为 0 或金额非法的条目直接丢掉 —— 留着只会在界面上显示「0 上限」的假条目。
 */
export function normalizeBudget(raw: unknown): BudgetThresholds {
  const value = settingsSectionOf(raw, 'budget')
  if (value === null || typeof value !== 'object') return EMPTY_BUDGET
  const record = value as Record<string, unknown>
  const candidates = Array.isArray(record.monthlyCost) ? record.monthlyCost.slice(0, MAX_COST_LIMITS) : []
  const monthlyCost: Array<{ currency: string; amount: number }> = []
  for (const entry of candidates) {
    if (entry === null || typeof entry !== 'object') continue
    const fields = entry as { currency?: unknown; amount?: unknown }
    const currency = typeof fields.currency === 'string' ? fields.currency.trim() : ''
    const amount = limitOr(fields.amount)
    if (currency === '' || amount === 0) continue
    monthlyCost.push({ currency, amount })
  }
  return {
    dailyTokens: limitOr(record.dailyTokens),
    monthlyTokens: limitOr(record.monthlyTokens),
    monthlyCost,
  }
}

function percentOf(used: number, limit: number): number {
  return Math.round(used / limit * 1000) / 10
}

function levelOf(percent: number): BudgetLevel {
  if (percent >= 100) return 'over'
  if (percent >= NEAR_PERCENT) return 'near'
  return 'ok'
}

const LEVEL_RANK: Record<BudgetLevel, number> = { ok: 0, near: 1, over: 2 }

/**
 * 判定：逐项算使用率，整体取**最严重**的那一项（日与月同时配置时不会互相掩盖）。
 * 没有任何有效阈值时 `enabled:false`、`level:'ok'`、`entries:[]` —— 界面据此完全不渲染。
 * @param usage - 读数；缺的币种按 0 处理（该币种本月没花钱）
 */
export function evaluateBudget(thresholds: BudgetThresholds, usage: BudgetUsage): BudgetEvaluation {
  const entries: BudgetEntry[] = []
  const push = (kind: BudgetKind, rawUsed: number, limit: number, currency?: string): void => {
    // limit <= 0 = 该项不启用；顺带挡掉除零，percent 永远是可用的有限数
    if (!(limit > 0)) return
    const used = Number.isFinite(rawUsed) ? rawUsed : 0
    entries.push({
      kind,
      ...(currency === undefined ? {} : { currency }),
      used,
      limit,
      percent: percentOf(used, limit),
    })
  }
  push('dailyTokens', usage.todayTokens, thresholds.dailyTokens)
  push('monthlyTokens', usage.monthTokens, thresholds.monthlyTokens)
  for (const entry of thresholds.monthlyCost) {
    push('monthlyCost', usage.monthCostByCurrency[entry.currency] ?? 0, entry.amount, entry.currency)
  }
  if (entries.length === 0) return { enabled: false, level: 'ok', entries }
  let level: BudgetLevel = 'ok'
  for (const entry of entries) {
    const candidate = levelOf(entry.percent)
    if (LEVEL_RANK[candidate] > LEVEL_RANK[level]) level = candidate
  }
  return { enabled: true, level, entries }
}
