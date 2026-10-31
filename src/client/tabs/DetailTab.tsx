/**
 * 使用明细：每日成本柱状图（费用 · Token · 输出 Token · 会话）
 * + 逐日明细表（按天 / 按通道 / 按模型，列可排序、行可展开模型明细、带环比）。
 * 两张面板的数据都来自同一份 `/usage`，维度聚合与环比全在客户端算；
 * 范围、通道筛选与导出统一由页头承担，本组件不再重复一份。
 */
import { DAY_MS, dateKeysOfRange, daysBetween, previousDateOf, previousWindowOf } from '../core/date-range.ts'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadUsage } from '../core/api.ts'
import { displayNameOf } from '../core/channels.ts'
import { comparableMoneyOf, moneyTextOf, rowMoneyViewOf, useCurrencyDisplay, type CostRowLike } from '../core/currency.ts'
import { fmtCalls, fmtShortDate, fmtTokens, isoDate } from '../core/format.ts'
import { useT } from '../core/i18n.ts'
import { selectionOf } from '../core/filter-selection.ts'
import type { Channel, ChannelDailySummary, CostSource, DaySummary, HourMetricCell, ModelSummary, SessionsResponse, UsageResponse, UsageTotals } from '../core/types.ts'
import { costSourceLabelOf } from '../core/pricing.ts'
import { TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import detailStyles from '../styles/detail.module.css'
import styles from '../styles/shared.module.css'

export type RangeKey = 'today' | 'week' | 'month' | 'quarter' | 'total' | 'custom'

/** 图表最多铺开的列数：超过这个跨度的范围按天全画会挤成一团。 */
const MAX_AXIS_DAYS = 366

/** 柱状图底下最多标几个日期（原型是 8 个等距刻度，逐柱都标会糊成一片）。 */
const AXIS_LABEL_COUNT = 8


/** 每日成本面板可切换的指标（会话数当前数据源没有，选中时显示 —）。 */
type MetricKey = 'cost' | 'tokens' | 'output' | 'sessions'

const METRIC_ORDER: MetricKey[] = ['cost', 'tokens', 'output', 'sessions']

const METRIC_LABEL_KEYS: Record<MetricKey, string> = {
  cost: 'detail.metricCost',
  tokens: 'detail.metricTokens',
  output: 'detail.metricOutput',
  sessions: 'detail.metricSessions',
}

/** 逐日明细的维度：同一份 usage 在客户端聚合。 */
type Dimension = 'day' | 'channel' | 'model'

const DIMENSIONS: Array<[Dimension, string]> = [
  ['day', 'detail.byDay'],
  ['channel', 'detail.byChannel'],
  ['model', 'detail.byModel'],
]

type SortKey = 'date' | 'label' | 'calls' | 'input' | 'output' | 'cacheRead' | 'sessions' | 'cost' | 'delta' | 'source'
type SortDirection = 'asc' | 'desc'

/** 表头（原型顺序）；第一列是展开箭头，没有表头文案。 */
const SORT_COLUMNS: Array<[SortKey, string]> = [
  ['date', 'c.date'],
  ['label', 'common.channel'],
  ['calls', 'c.calls'],
  ['input', 'c.input'],
  ['output', 'c.output'],
  ['cacheRead', 'c.cacheRead'],
  ['sessions', 'c.sessions'],
  ['cost', 'c.cost'],
  ['delta', 'detail.delta'],
  ['source', 'detail.source'],
]

/** 右对齐的列：数字与来源。 */
const RIGHT_ALIGNED = new Set<SortKey>(['calls', 'input', 'output', 'cacheRead', 'sessions', 'cost', 'delta', 'source'])

/** 成本来源强弱：聚合行取最弱的那一格（与价目层的强弱序一致）。 */
const SOURCE_ORDER: Record<CostSource, number> = { official: 0, catalog: 1, aggregate: 2, model: 3, none: 4 }

export 
function usePreviousUsage(props: {
  from: string
  to: string
  range: RangeKey
  pricingRevision: number
}): UsageResponse | null {
  const [previous, setPrevious] = useState<UsageResponse | null>(null)
  const comparable = props.range !== 'total'
  useEffect(() => {
    if (!comparable) return
    const window = previousWindowOf(props.from, props.to)
    let cancelled = false
    setPrevious(null)
    void loadUsage(window.from, window.to, 'ALL').then((result) => {
      if (!cancelled) setPrevious(result)
    })
    return () => { cancelled = true }
  }, [comparable, props.from, props.to, props.pricingRevision])
  return comparable ? previous : null
}

/** 逐行金额：`costsByCurrency` 是逐币种小计，`cost` 只在没有小计时兜底。 */
interface MoneyRow {
  cost: number
  costsByCurrency: Record<string, number>
}

function moneyRowOf(row: { cost?: number | null; costsByCurrency?: Record<string, number> | null }): MoneyRow {
  const costsByCurrency: Record<string, number> = {}
  for (const [currency, amount] of Object.entries(row.costsByCurrency ?? {})) {
    if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) costsByCurrency[currency] = amount
  }
  return {
    cost: typeof row.cost === 'number' && Number.isFinite(row.cost) ? row.cost : 0,
    costsByCurrency,
  }
}

function addMoneyInto(target: MoneyRow, source: MoneyRow): void {
  target.cost += source.cost
  for (const [currency, amount] of Object.entries(source.costsByCurrency)) {
    target.costsByCurrency[currency] = (target.costsByCurrency[currency] ?? 0) + amount
  }
}

/** 金额文本：没有价目依据（`none`）或金额为 0 时给 —，不拿 0 元冒充「免费」。 */
function costTextOf(row: CostRowLike, source: CostSource | null): string {
  if (source === 'none') return '—'
  const view = rowMoneyViewOf(row)
  return view.amount > 0 ? view.text : '—'
}

/** 聚合行取最弱的成本来源。 */
function weakSourceOf(sources: CostSource[]): CostSource | null {
  let weakest: CostSource | null = null
  for (const source of sources) {
    if (weakest === null || SOURCE_ORDER[source] > SOURCE_ORDER[weakest]) weakest = source
  }
  return weakest
}

/** 把若干模型桶并成一天：调用 / tokens 相加，金额按逐币种小计合并，来源取最弱那一格。 */
function mergedDayOf(models: ModelSummary[], date: string, provider: string): ChannelDailySummary {
  const costsByCurrency: Record<string, number> = {}
  const sources: CostSource[] = []
  let calls = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  let reasoningTokens = 0
  let cost = 0
  let partial = false
  for (const model of models) {
    calls += model.calls
    inputTokens += model.inputTokens
    outputTokens += model.outputTokens
    cacheReadTokens += model.cacheReadTokens
    cacheWriteTokens += model.cacheWriteTokens
    reasoningTokens += model.reasoningTokens
    if (typeof model.cost === 'number' && Number.isFinite(model.cost)) cost += model.cost
    for (const [currency, amount] of Object.entries(model.costsByCurrency ?? {})) {
      if (typeof amount === 'number' && Number.isFinite(amount)) costsByCurrency[currency] = (costsByCurrency[currency] ?? 0) + amount
    }
    if (model.costSource !== undefined) sources.push(model.costSource)
    if (model.partial === true) partial = true
  }
  const costSource = weakSourceOf(sources)
  return {
    date,
    provider,
    calls,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens,
    cost,
    models,
    ...(Object.keys(costsByCurrency).length > 0 ? { costsByCurrency } : {}),
    ...(costSource === null ? {} : { costSource }),
    ...(partial ? { partial: true } : {}),
  }
}

/** 范围合计：由过滤后的逐日行相加；`cacheSaved` 无法从模型桶反推，不给（界面显示 —，不编）。 */
function totalsOfDays(days: ChannelDailySummary[], date: string): UsageTotals {
  const costsByCurrency: Record<string, number> = {}
  const sources: CostSource[] = []
  let calls = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  let reasoningTokens = 0
  let cost = 0
  let partial = false
  for (const day of days) {
    calls += day.calls
    inputTokens += day.inputTokens
    outputTokens += day.outputTokens
    cacheReadTokens += day.cacheReadTokens
    cacheWriteTokens += day.cacheWriteTokens
    reasoningTokens += day.reasoningTokens
    cost += day.cost
    for (const [currency, amount] of Object.entries(day.costsByCurrency ?? {})) {
      if (typeof amount === 'number' && Number.isFinite(amount)) costsByCurrency[currency] = (costsByCurrency[currency] ?? 0) + amount
    }
    if (day.costSource !== undefined) sources.push(day.costSource)
    if (day.partial === true) partial = true
  }
  const costSource = weakSourceOf(sources)
  return {
    date,
    calls,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens,
    cost,
    ...(Object.keys(costsByCurrency).length > 0 ? { costsByCurrency } : {}),
    ...(costSource === null ? {} : { costSource }),
    ...(partial ? { partial: true } : {}),
  }
}

/** 多选筛选里「未归入工作区」项目的值：空串被 `selectionOf` 当成「全部」，所以用固定 sentinel 表示。 */
export const ORPHAN_PROJECT_VALUE = '__orphan__'

/**
 * 项目筛选的取值集合：未归入工作区的行（`workspace` 为空）用 sentinel，其余用 workspace + 覆盖目录。
 * 通道 / 模型 / 会话三个 Tab 都用它，保证同一个项目在各处命中同一批行。
 */
export function projectFilterValuesOf(workspace: string | null | undefined, paths: readonly string[] | undefined): string[] {
  const self = workspace === undefined || workspace === null || workspace === '' ? ORPHAN_PROJECT_VALUE : workspace
  return [self, ...(paths ?? [])]
}

/**
 * 按维度过滤 `/usage`：逐日只留命中的模型桶，当天合计与范围合计都按剩下的桶重算（口径一致）。
 * `hours`（按时段）没有模型 / 通道维度，保持原样、不二次聚合。
 */
function filterUsageOf(usage: UsageResponse | null | undefined, keep: (model: ModelSummary) => boolean): UsageResponse | null {
  const raw = usage ?? null
  if (raw === null) return null
  const days: ChannelDailySummary[] = []
  for (const day of raw.days) {
    const models = day.models.filter(keep)
    if (models.length === 0) continue
    days.push(mergedDayOf(models, day.date, day.provider))
  }
  return { ...raw, days, totals: days.length === 0 ? null : totalsOfDays(days, raw.totals?.date ?? '') }
}

/**
 * 按通道多选过滤（值存逗号分隔串，空串 = 全部；通道维度只在模型桶的 `provider` 上）。
 * 页头把整段选中的通道一起下发，服务端 `/usage` 固定取全量，过滤在客户端做。
 */
export function filterUsageByChannels(usage: UsageResponse | null | undefined, channelFilter: string | undefined): UsageResponse | null {
  const raw = usage ?? null
  const selected = selectionOf(channelFilter)
  if (raw === null || selected.length === 0) return raw
  return filterUsageOf(raw, (model) => selected.includes(model.provider))
}

/** 按模型多选过滤（值同上）；多个模型先合并回逐日行再算，合计 / 图表 / 环比一起重算。 */
export function filterUsageByModel(usage: UsageResponse | null | undefined, modelFilter: string | undefined): UsageResponse | null {
  const raw = usage ?? null
  const selected = selectionOf(modelFilter)
  if (raw === null || selected.length === 0) return raw
  return filterUsageOf(raw, (model) => selected.includes(model.model))
}

/** 环比百分比（一位小数）；缺一侧或上期为 0 时不给数字。 */
function deltaOf(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null
  return Math.round((current - previous) / previous * 1000) / 10
}

/** 环比单元格：涨红跌绿，无上期数据给 —。 */
function deltaCellOf(delta: number | null): ReactNode {
  if (delta === null) return <span className={detailStyles.deltaFlat}>—</span>
  if (Math.abs(delta) < 0.05) return <span className={detailStyles.deltaFlat}>0%</span>
  const text = (delta > 0 ? '+' : '') + String(delta) + '%'
  return <span className={delta > 0 ? detailStyles.deltaUp : detailStyles.deltaDown}>{text}</span>
}

function itemKeyOf(model: ModelSummary, dimension: Dimension): string {
  return dimension === 'model' ? model.provider + '|' + model.model : model.provider
}

/** 表格一行（三个维度共用同一形状，展开后是该行的模型构成）。 */
interface DetailRow {
  key: string
  date: string
  label: string
  /** 通道列后面的弱化后缀：按天 = 其余通道数，按模型 = 所属通道。 */
  labelDim: string | null
  calls: number
  input: number
  output: number
  cacheRead: number
  /** 该行窗口内有活动的会话数；按通道 / 模型 / 小时分不出会话时为 null */
  sessions: number | null
  costText: string
  costAmount: number | null
  delta: number | null
  source: CostSource | null
  models: ModelSummary[]
}

/** 按日期聚合时的中间桶（按通道 / 按模型视图共用）。 */
interface DetailGroup {
  itemKey: string
  label: string
  labelDim: string | null
  calls: number
  input: number
  output: number
  cacheRead: number
  money: MoneyRow
  sources: CostSource[]
  models: ModelSummary[]
}

function buildDetailRows(props: { usage: UsageResponse; channels: Channel[]; dimension: Dimension; sessions?: SessionsResponse | null }): DetailRow[] {
  const { usage, channels, dimension } = props
  const sessionCounts = daySessionCountsOf(props.sessions ?? null)
  const rows: DetailRow[] = []
  const dayMoney = new Map<string, MoneyRow>()
  for (const day of usage.days) dayMoney.set(day.date, moneyRowOf(day))
  // 同一项在前一天的金额：环比跟「同项的前一日」比，缺那天的数据就不给百分比
  const itemMoney = new Map<string, Map<string, MoneyRow>>()
  if (dimension !== 'day') {
    for (const day of usage.days) {
      for (const model of day.models) {
        const itemKey = itemKeyOf(model, dimension)
        let byDate = itemMoney.get(itemKey)
        if (byDate === undefined) {
          byDate = new Map<string, MoneyRow>()
          itemMoney.set(itemKey, byDate)
        }
        const bucket = byDate.get(day.date) ?? { cost: 0, costsByCurrency: {} }
        addMoneyInto(bucket, moneyRowOf(model))
        byDate.set(day.date, bucket)
      }
    }
  }

  if (dimension === 'day') {
    for (const day of usage.days) {
      const tokensByProvider = new Map<string, number>()
      for (const model of day.models) {
        const tokens = model.inputTokens + model.outputTokens + model.cacheReadTokens
        tokensByProvider.set(model.provider, (tokensByProvider.get(model.provider) ?? 0) + tokens)
      }
      let dominant: string | null = null
      let dominantTokens = -1
      for (const [provider, tokens] of tokensByProvider) {
        if (tokens > dominantTokens) {
          dominant = provider
          dominantTokens = tokens
        }
      }
      const previous = dayMoney.get(previousDateOf(day.date)) ?? null
      const amount = comparableMoneyOf(day)
      const costText = costTextOf(day, day.costSource ?? null)
      rows.push({
        key: 'day|' + day.date,
        date: day.date,
        label: dominant === null ? '—' : displayNameOf(channels, dominant),
        labelDim: tokensByProvider.size > 1 ? '+' + String(tokensByProvider.size - 1) : null,
        calls: day.calls,
        input: day.inputTokens,
        output: day.outputTokens,
        cacheRead: day.cacheReadTokens,
        sessions: sessionCounts.get(day.date) ?? 0,
        costText,
        costAmount: amount,
        delta: costText === '—' ? null : deltaOf(amount, previous === null ? null : comparableMoneyOf(previous)),
        source: day.costSource ?? null,
        models: day.models,
      })
    }
    return rows
  }

  for (const day of usage.days) {
    const groups = new Map<string, DetailGroup>()
    for (const model of day.models) {
      const itemKey = itemKeyOf(model, dimension)
      let group = groups.get(itemKey)
      if (group === undefined) {
        group = {
          itemKey,
          label: dimension === 'channel' ? displayNameOf(channels, model.provider) : model.model,
          labelDim: dimension === 'channel' ? null : displayNameOf(channels, model.provider),
          calls: 0,
          input: 0,
          output: 0,
          cacheRead: 0,
          money: { cost: 0, costsByCurrency: {} },
          sources: [],
          models: [],
        }
        groups.set(itemKey, group)
      }
      group.calls += model.calls
      group.input += model.inputTokens
      group.output += model.outputTokens
      group.cacheRead += model.cacheReadTokens
      addMoneyInto(group.money, moneyRowOf(model))
      if (model.costSource !== undefined) group.sources.push(model.costSource)
      // 按模型视图的行本身就是最细一层，展开会是它自己，所以不给展开内容
      if (dimension === 'channel') group.models.push(model)
    }
    for (const group of groups.values()) {
      const source = weakSourceOf(group.sources)
      const previous = itemMoney.get(group.itemKey)?.get(previousDateOf(day.date)) ?? null
      const amount = comparableMoneyOf(group.money)
      const costText = costTextOf(group.money, source)
      rows.push({
        key: dimension + '|' + day.date + '|' + group.itemKey,
        date: day.date,
        label: group.label,
        labelDim: group.labelDim,
        calls: group.calls,
        input: group.input,
        output: group.output,
        cacheRead: group.cacheRead,
        sessions: null,
        costText,
        costAmount: amount,
        delta: costText === '—' ? null : deltaOf(amount, previous === null ? null : comparableMoneyOf(previous)),
        source,
        models: group.models,
      })
    }
  }
  return rows
}

function sortValueOf(row: DetailRow, sortKey: SortKey): string | number | null {
  if (sortKey === 'date') return row.date
  if (sortKey === 'label') return row.label
  if (sortKey === 'calls') return row.calls
  if (sortKey === 'input') return row.input
  if (sortKey === 'output') return row.output
  if (sortKey === 'cacheRead') return row.cacheRead
  if (sortKey === 'sessions') return row.sessions
  if (sortKey === 'cost') return row.costAmount
  if (sortKey === 'delta') return row.delta
  return row.source === null ? null : SOURCE_ORDER[row.source]
}

/** 排序：无值（没价目 / 没上期）永远排最后，不跟方向翻转；同值时按日期倒序。 */
function sortDetailRows(rows: DetailRow[], sortKey: SortKey, direction: SortDirection): DetailRow[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((first, second) => {
    const left = sortValueOf(first, sortKey)
    const right = sortValueOf(second, sortKey)
    if (left === null || right === null) {
      if (left === right) return 0
      return left === null ? 1 : -1
    }
    const base = typeof left === 'string' ? left.localeCompare(String(right)) : left - (right as number)
    if (base !== 0) return base * sign
    return second.date.localeCompare(first.date)
  })
}

/** 每日成本的一根柱：`height` 是相对峰值的百分比。 */
interface DailyBar {
  date: string
  short: string
  value: number
  height: string
  peak: boolean
  text: string
}

function metricValueOf(day: ChannelDailySummary, metric: MetricKey): number {
  if (metric === 'tokens') return day.inputTokens + day.outputTokens + day.cacheReadTokens
  if (metric === 'output') return day.outputTokens
  if (metric === 'cost') return comparableMoneyOf(day) ?? 0
  return 0
}

function metricTextOf(day: ChannelDailySummary, metric: MetricKey): string {
  if (metric === 'cost') return costTextOf(day, day.costSource ?? null)
  if (metric === 'tokens') return fmtTokens(day.inputTokens + day.outputTokens + day.cacheReadTokens)
  if (metric === 'output') return fmtTokens(day.outputTokens)
  return '—'
}

/** 某天有活动的会话数：会话首末时间与该日有交集即计 1。 */
function daySessionCountsOf(sessions: SessionsResponse | null): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of sessions?.rows ?? []) {
    if (row.calls <= 0) continue
    const startMs = row.firstTime ?? row.lastTime
    const endMs = row.lastTime ?? row.firstTime
    if (startMs === null || endMs === null) continue
    const start = new Date(startMs)
    start.setHours(0, 0, 0, 0)
    const limit = Math.min(endMs, startMs + 120 * 86400000)
    for (let cursor = start.getTime(); cursor <= limit; cursor += 86400000) {
      const date = new Date(cursor)
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * 分时范围的表格行：今天 24 行（每小时）、7 天 28 行（每天 4 个 6 小时段）。
 * 数据与图表同源（`/usage` 的 hoursByDate），没有更细的模型构成，因此不给展开箭头。
 */
function buildHourRows(props: { usage: UsageResponse; range: RangeKey }): DetailRow[] {
  const byDate = props.usage.hoursByDate
  if (byDate == null) return []
  const dates = Object.keys(byDate).sort()
  const slotHours = props.range === 'today' ? 1 : 6
  const slotsPerDay = 24 / slotHours
  const rows: DetailRow[] = []
  for (const date of dates) {
    const cells = byDate[date]
    if (!Array.isArray(cells)) continue
    for (let slot = 0; slot < slotsPerDay; slot += 1) {
      const startHour = slot * slotHours
      let calls = 0
      let tokens = 0
      let output = 0
      let cacheRead = 0
      let sessions = 0
      const money: MoneyRow = { cost: 0, costsByCurrency: {} }
      let hasCost = false
      for (let offset = 0; offset < slotHours; offset += 1) {
        const cell = cells[startHour + offset]
        if (cell === undefined) continue
        calls += cell.calls ?? 0
        tokens += cell.tokens ?? 0
        output += cell.outputTokens ?? 0
        cacheRead += cell.cacheReadTokens ?? 0
        sessions += cell.sessions ?? 0
        if (cell.cost !== null && cell.cost !== undefined) hasCost = true
        if (cell.costsByCurrency !== undefined) addMoneyInto(money, { cost: cell.cost ?? 0, costsByCurrency: cell.costsByCurrency })
      }
      if (calls === 0 && tokens === 0 && !hasCost) continue
      const label = props.range === 'today'
        ? String(startHour).padStart(2, '0') + '时'
        : String(startHour).padStart(2, '0') + '–' + String(startHour + slotHours).padStart(2, '0') + '时'
      const dateCell = props.range === 'today' ? '' : date
      rows.push({
        key: 'hour|' + date + '|' + String(startHour),
        date: dateCell,
        label: label,
        labelDim: null,
        calls,
        input: Math.max(0, tokens - output - cacheRead),
        output,
        cacheRead,
        sessions,
        costText: hasCost ? costTextOf(money, 'catalog') : '—',
        costAmount: hasCost ? comparableMoneyOf(money) : null,
        delta: null,
        source: null,
        models: [],
      })
    }
  }
  return rows
}

function buildDailyBars(props: { usage: UsageResponse; from: string; to: string; metric: MetricKey; sessions: SessionsResponse | null }): DailyBar[] {
  const byDate = new Map(props.usage.days.map((day) => [day.date, day]))
  const sessionCounts = daySessionCountsOf(props.sessions)
  const raw = dateKeysOfRange(props.from, props.to).map((date) => {
    const day = byDate.get(date) ?? null
    if (props.metric === 'sessions') {
      const value = sessionCounts.get(date) ?? 0
      return { date, value, text: value > 0 ? fmtCalls(value) : '—' }
    }
    return {
      date,
      value: day === null ? 0 : metricValueOf(day, props.metric),
      text: day === null ? '—' : metricTextOf(day, props.metric),
    }
  })
  let peak = 0
  for (const item of raw) if (item.value > peak) peak = item.value
  return raw.map((item) => ({
    date: item.date,
    short: fmtShortDate(item.date),
    value: item.value,
    height: peak > 0 ? String(Math.max(1, Math.round(item.value / peak * 100))) + '%' : '0%',
    peak: peak > 0 && item.value === peak,
    text: item.text,
  }))
}

/** 横轴刻度：固定 `AXIS_LABEL_COUNT` 个等距日期（首尾都含）；跨度不足这个数时逐根标。 */
/** 分时桶的指标值：费用 / Token / 输出 Token / 会话四档都来自 /usage 的 hoursByDate。 */
function hourCellValueOf(cell: HourMetricCell, metric: MetricKey): number {
  if (metric === 'tokens') return cell.tokens
  if (metric === 'output') return cell.outputTokens
  if (metric === 'sessions') return cell.sessions
  return 0
}

/** 今天 → 24 根小时柱；7 天 → 28 根 6 小时柱（标签带日期段，悬停看原始区间）。 */
function buildHourBucketBars(props: { usage: UsageResponse; range: RangeKey; metric: MetricKey; currency: string }): DailyBar[] {
  const byDate = props.usage.hoursByDate ?? null
  if (byDate === null) return []
  const dates = Object.keys(byDate).sort()
  const raw: Array<{ date: string; short: string; value: number; text: string }> = []
  const push = (date: string, short: string, cells: HourMetricCell[]): void => {
    const value = props.metric === 'cost'
      ? Math.round(cells.reduce((total, cell) => total + (cell.cost ?? 0), 0) * 100) / 100
      : cells.reduce((total, cell) => total + hourCellValueOf(cell, props.metric), 0)
    const costsByCurrency: Record<string, number> = {}
    for (const cell of cells) {
      const byCurrency: Record<string, number> = cell.costsByCurrency ?? {}
      for (const [key, amount] of Object.entries(byCurrency)) costsByCurrency[key] = (costsByCurrency[key] ?? 0) + amount
    }
    const text = props.metric === 'cost'
      ? (value > 0 ? moneyTextOf(props.currency, value) : '—')
      : props.metric === 'sessions' ? fmtCalls(value) : fmtTokens(value)
    void costsByCurrency
    raw.push({ date, short, value, text })
  }
  if (props.range === 'today') {
    const date = dates[dates.length - 1]
    if (date === undefined) return []
    const cells = byDate[date] ?? []
    for (let hour = 0; hour < 24; hour += 1) {
      push(date + ' ' + String(hour).padStart(2, '0') + ':00', String(hour).padStart(2, '0') + '时', cells[hour] === undefined ? [] : [cells[hour]])
    }
  } else {
    for (const date of dates) {
      const cells = byDate[date] ?? []
      for (let start = 0; start < 24; start += 6) {
        push(date + ' ' + String(start).padStart(2, '0') + ':00-' + String(start + 6).padStart(2, '0') + ':00', date.slice(5) + ' ' + String(start).padStart(2, '0') + '时', cells.slice(start, start + 6))
      }
    }
  }
  let peak = 0
  for (const item of raw) if (item.value > peak) peak = item.value
  return raw.map((item) => ({
    date: item.date,
    short: item.short,
    value: item.value,
    height: peak > 0 ? String(Math.max(1, Math.round(item.value / peak * 100))) + '%' : '0%',
    peak: item.value === peak && peak > 0,
    text: item.text,
  }))
}

function axisTicksOf(bars: DailyBar[]): DailyBar[] {
  if (bars.length <= AXIS_LABEL_COUNT) return bars
  const step = (bars.length - 1) / (AXIS_LABEL_COUNT - 1)
  return Array.from({ length: AXIS_LABEL_COUNT }, (unused, index) => bars[Math.round(index * step)])
}

export function DetailTab(props: {
  usage: UsageResponse | null
  channels: Channel[]
  /** 范围控件在页头；range 仍用于判断「全部」范围不取上期，其余范围 props 只为壳层签名保留。 */
  range: RangeKey
  onRange: (value: RangeKey) => void
  customFrom: string
  onCustomFrom: (value: string) => void
  customTo: string
  onCustomTo: (value: string) => void
  /** 通道筛选已由页头在客户端过滤 `usage` 后再传进来（多选不能当单值发给服务端），这两个 prop 只为壳层签名保留。 */
  channelFilter: string
  onChannelFilter: (value: string) => void
  bounds: { from: string; to: string }
  tooltip: TooltipApi
  /** 价目版本号：成本在服务端按价目算，价目一换这里要重取上期数据。 */
  pricingRevision: number
  /** 全局模型筛选（逗号分隔多选，空串 = 不过滤）：只作用于 `/usage` 的模型桶，通道过滤已在页头做完。 */
  modelFilter?: string
  /** 会话段：按天粒度画「会话」档时用（窗口内有活动的会话数）。 */
  sessions?: SessionsResponse | null
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const { usage, channels, bounds, tooltip } = props
  const modelFilter = props.modelFilter ?? ''
  const currency = useCurrencyDisplay()
  const [metric, setMetric] = useState<MetricKey>('cost')
  const [dimension, setDimension] = useState<Dimension>('day')
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  // hook 必须在任何早退之前调用：usage 从 null 变成有值时如果才第一次调，会因 hook 数量变化抛 #310
  const previousUsage = usePreviousUsage({
    from: bounds.from, to: bounds.to, range: props.range, pricingRevision: props.pricingRevision,
  })
  /** 模型筛选后的本期 / 上期 `/usage`：两张面板、合计、环比全部从它算，保证口径一致。
   *  本期已由页头按通道多选过滤；上期是本 Tab 自己取的（服务端固定取全量），必须在这里补一次通道过滤。 */
  const scopedUsage = useMemo(() => filterUsageByModel(usage, modelFilter), [usage, modelFilter])
  const scopedPrevious = useMemo(
    () => filterUsageByModel(filterUsageByChannels(previousUsage, props.channelFilter), modelFilter),
    [previousUsage, props.channelFilter, modelFilter],
  )
  /** 显示币种或汇率一变，金额文本就得重算（模块级状态变了，memo 自己发现不了）。 */
  const moneyKey = currency.display + '|' + (currency.fx === null ? '' : String(currency.fx.rate))
  /** 分时范围 + 按天维度：表格也是小时行，没有环比与来源列。 */
  const hourlyTable = (props.range === 'today' || props.range === 'week') && dimension === 'day'
  /** 分时表隐藏「环比 / 来源」两列（小时桶没有这两个维度）。 */
  const tableColumns = hourlyTable ? SORT_COLUMNS.filter(([key]) => key !== 'delta' && key !== 'source') : SORT_COLUMNS
  const rows = useMemo(() => {
    if (scopedUsage === null) return []
    if (hourlyTable) return buildHourRows({ usage: scopedUsage, range: props.range })
    return buildDetailRows({ usage: scopedUsage, channels, dimension, sessions: props.sessions ?? null })
  }, [scopedUsage, channels, dimension, moneyKey, props.range, props.sessions, hourlyTable])
  const sortedRows = useMemo(() => sortDetailRows(rows, sortKey, sortDirection), [rows, sortKey, sortDirection])
  /** 分时范围：今天按小时（24 桶）、7 天按 6 小时（28 桶）；其余范围仍按天。 */
  const granularRange = props.range === 'today' || props.range === 'week'
  const bars = useMemo(
    () => (scopedUsage === null ? [] : granularRange
      ? buildHourBucketBars({ usage: scopedUsage, range: props.range, metric, currency: currency.display })
      : buildDailyBars({ usage: scopedUsage, from: bounds.from, to: bounds.to, metric, sessions: props.sessions ?? null })),
    [scopedUsage, metric, granularRange, props.range, props.sessions, bounds.from, bounds.to, moneyKey],
  )
  if (scopedUsage === null) return <div className={styles.empty}>{t('d.ledgerLoading')}</div>

  const safeTotals: DaySummary = scopedUsage.totals ?? {
    date: '', calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 0,
  }
  const totalTokens = safeTotals.inputTokens + safeTotals.outputTokens + safeTotals.cacheReadTokens
  /** 日均分母：有数据的天（拿日历天数去除会把空闲日算成用量偏低）。 */
  const activeDays = scopedUsage.days.length

  // 合计只要有金额就显示；存在未定价的行时标「部分」，不再整行退回 —（与概览口径对齐）
  const totalCostText = safeTotals.cost > 0
    ? rowMoneyViewOf(safeTotals).text + ((safeTotals.costSource ?? null) === 'none' ? ' · ' + t('detail.partialCost') : '')
    : costTextOf(safeTotals, safeTotals.costSource ?? null)
  const totalAmount = comparableMoneyOf(safeTotals)
  const previousTotal = scopedPrevious === null ? null : scopedPrevious.totals
  const totalDelta = totalCostText === '—' || previousTotal === null || previousTotal === undefined
    ? null
    : deltaOf(totalAmount, comparableMoneyOf(previousTotal))

  const summaryText = (() => {
    const totalText = metric === 'sessions'
      ? fmtCalls(bars.reduce((total, bar) => total + bar.value, 0))
      : metric === 'cost'
        ? totalCostText
        : metric === 'tokens' ? fmtTokens(totalTokens) : fmtTokens(safeTotals.outputTokens)
    // 分时范围按「有数的桶」求均值，按天范围按活跃天（分母含义不同，文案也随之切换）
    const bucketCount = bars.filter((bar) => bar.value > 0).length
    let averageText = '—'
    if (metric === 'sessions') {
      averageText = bucketCount === 0 ? '—' : fmtCalls(Math.round(bars.reduce((total, bar) => total + bar.value, 0) / bucketCount))
    } else if (activeDays > 0) {
      if (metric === 'cost') {
        const view = rowMoneyViewOf(safeTotals)
        if (!view.mixed && view.currency !== '' && view.amount > 0) {
          const divisor = granularRange ? Math.max(1, bucketCount) : activeDays
          averageText = (view.converted ? '≈' : '') + moneyTextOf(view.currency, view.amount / divisor)
        }
      } else {
        const total = metric === 'tokens' ? totalTokens : safeTotals.outputTokens
        const divisor = granularRange ? Math.max(1, bucketCount) : activeDays
        averageText = fmtTokens(Math.round(total / divisor))
      }
    }
    let peakBar: DailyBar | null = null
    for (const bar of bars) if (bar.value > 0 && (peakBar === null || bar.value > peakBar.value)) peakBar = bar
    return [
      t('detail.total') + ' ' + totalText,
      t(granularRange ? 'detail.avgPerBucket' : 'detail.dailyAvg') + ' ' + averageText,
      t('detail.peak') + ' ' + (peakBar === null ? '—' : peakBar.short),
    ].join(' · ')
  })()

  const axisTicks = axisTicksOf(bars)

  const totalChannels = new Set<string>()
  const totalModels = new Set<string>()
  for (const day of scopedUsage.days) {
    for (const model of day.models) {
      totalChannels.add(model.provider)
      totalModels.add(model.provider + '|' + model.model)
    }
  }
  const groupCount = dimension === 'model' ? totalModels.size : totalChannels.size

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection(key === 'label' ? 'asc' : 'desc')
  }

  const toggleExpanded = (key: string): void => {
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  }

  const pinOf = (node: HTMLElement | null): { right: number; top: number } | undefined => {
    const box = (node?.parentElement ?? node)?.getBoundingClientRect()
    return box === undefined ? undefined : { right: box.right - 4, top: box.top + 4 }
  }

  return (
    <div className={detailStyles.page}>
      {/* 范围与导出统一由页头承担，本组件只渲染两张面板。 */}

      <div className={detailStyles.panel}>
        <div className={detailStyles.panelHead}>
          <span className={detailStyles.panelTitle}>{t(granularRange ? 'detail.hourlyCost' : 'detail.dailyCost')}</span>
          <div className={detailStyles.metricTabs}>
            {METRIC_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                className={metric === key ? detailStyles.metricTab + ' ' + detailStyles.metricTabOn : detailStyles.metricTab}
                aria-pressed={metric === key}
                onClick={() => setMetric(key)}
              >
                {t(METRIC_LABEL_KEYS[key])}
              </button>
            ))}
          </div>
          <span className={detailStyles.panelMore}>{summaryText}</span>
        </div>
        {scopedUsage.days.length === 0
          ? <div className={styles.empty}>{t('empty.noUsage')}</div>
          : (
            <>
              <div
                className={bars.length > 60 ? detailStyles.costBars + ' ' + detailStyles.costBarsDense : detailStyles.costBars}
                role="img"
                aria-label={t('detail.barsAria', { metric: t(METRIC_LABEL_KEYS[metric]), count: bars.length })}
              >
                {bars.map((bar) => (
                  <div
                    key={bar.date}
                    className={detailStyles.costBarCol}
                    onMouseMove={bar.value > 0
                      ? (event) => tooltip.show(event, (
                        <>
                          <TipTitle>{bar.date}</TipTitle>
                          <TipSub>{t(METRIC_LABEL_KEYS[metric])} <b>{bar.text}</b></TipSub>
                        </>
                      ), pinOf(event.currentTarget))
                      : undefined}
                    onMouseLeave={tooltip.hide}
                  >
                    {bar.value > 0 && <span className={bar.peak ? detailStyles.costBarPeak : detailStyles.costBar} style={{ height: bar.height }} />}
                  </div>
                ))}
              </div>
              <div className={detailStyles.costAxis} aria-hidden="true">
                {axisTicks.map((bar) => <span key={bar.date}>{bar.short}</span>)}
              </div>
            </>
          )}
      </div>

      <div className={detailStyles.panel}>
        <div className={detailStyles.panelHead}>
          <span className={detailStyles.panelTitle}>{t('detail.dailyDetail')}</span>
          <div className={detailStyles.metricTabs}>
            {DIMENSIONS.map(([key, labelKey]) => (
              <button
                key={key}
                type="button"
                className={dimension === key ? detailStyles.metricTab + ' ' + detailStyles.metricTabOn : detailStyles.metricTab}
                aria-pressed={dimension === key}
                onClick={() => setDimension(key)}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
          <span className={detailStyles.panelMore}>{t('detail.rows', { count: sortedRows.length })}</span>
        </div>
        {sortedRows.length === 0
          ? <div className={styles.empty}>{t('empty.noUsage')}</div>
          : (
            <div className={detailStyles.tableScroll}>
              <table className={detailStyles.detailTable}>
                <thead>
                  <tr>
                    <th scope="col" />
                    {tableColumns.map(([key, labelKey]) => {
                      const active = sortKey === key
                      return (
                        <th
                          key={key}
                          scope="col"
                          aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className={RIGHT_ALIGNED.has(key) ? detailStyles.alignRight : detailStyles.alignLeft}
                        >
                          <button type="button" className={detailStyles.sortBtn} onClick={() => toggleSort(key)}>
                            {t(labelKey)}
                            {active && <span className={detailStyles.sortDir} aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => {
                    const open = expanded[row.key] === true
                    return (
                      <Fragment key={row.key}>
                        <tr>
                          <td>
                            {row.models.length === 0
                              // 没有更细的模型构成就不给展开入口，但留出同宽箭头位，避免各行文字错位
                              ? <span className={detailStyles.expandSpacer} aria-hidden="true" />
                              : (
                                <button
                                  type="button"
                                  className={detailStyles.expandBtn}
                                  aria-expanded={open}
                                  aria-label={open ? t('detail.collapse') : t('detail.expand')}
                                  onClick={() => toggleExpanded(row.key)}
                                >
                                  <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                                </button>
                              )}
                          </td>
                          <td className={detailStyles.alignLeft}>{row.date === '' ? '' : fmtShortDate(row.date)}</td>
                          <td className={detailStyles.alignLeft}>
                            {row.label}
                            {row.labelDim !== null && <span className={styles.dim}> {row.labelDim}</span>}
                          </td>
                          <td className={detailStyles.alignRight}>{fmtCalls(row.calls)}</td>
                          <td className={detailStyles.alignRight}>{fmtTokens(row.input)}</td>
                          <td className={detailStyles.alignRight}>{fmtTokens(row.output)}</td>
                          <td className={detailStyles.alignRight}>{fmtTokens(row.cacheRead)}</td>
                          <td className={detailStyles.alignRight}>{row.sessions === null ? '—' : fmtCalls(row.sessions)}</td>
                          <td className={detailStyles.alignRight + ' ' + detailStyles.costCell} title={row.costText === '—' ? t('cost.noBasis') : undefined}>{row.costText}</td>
                          {!hourlyTable && <td className={detailStyles.alignRight}>{deltaCellOf(row.delta)}</td>}
                          {!hourlyTable && <td className={detailStyles.alignRight}>{costSourceLabelOf(row.source, t)}</td>}
                        </tr>
                        {open && (
                          <tr>
                            <td className={detailStyles.subCell} colSpan={tableColumns.length + 1}>
                              <table className={detailStyles.subTable}>
                                <thead>
                                  <tr>
                                    <th scope="col" className={detailStyles.alignLeft}>{t('detail.model')}</th>
                                    <th scope="col" className={detailStyles.alignRight}>{t('c.calls')}</th>
                                    <th scope="col" className={detailStyles.alignRight}>Tokens</th>
                                    <th scope="col" className={detailStyles.alignRight}>{t('c.cost')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.models.map((model) => (
                                    <tr key={model.provider + '|' + model.model}>
                                      <td className={detailStyles.alignLeft}>
                                        {model.model}
                                        <span className={styles.dim}> · {displayNameOf(channels, model.provider)}</span>
                                      </td>
                                      <td className={detailStyles.alignRight}>{fmtCalls(model.calls)}</td>
                                      <td className={detailStyles.alignRight}>{fmtTokens(model.inputTokens + model.outputTokens + model.cacheReadTokens)}</td>
                                      <td className={detailStyles.alignRight}>{costTextOf(model, model.costSource ?? null)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  <tr className={detailStyles.totalRow}>
                    <td />
                    <td className={detailStyles.alignLeft}>{t('detail.total')}</td>
                    <td className={detailStyles.alignLeft}>{t('detail.groupCount', { count: groupCount })}</td>
                    <td className={detailStyles.alignRight}>{fmtCalls(safeTotals.calls)}</td>
                    <td className={detailStyles.alignRight}>{fmtTokens(safeTotals.inputTokens)}</td>
                    <td className={detailStyles.alignRight}>{fmtTokens(safeTotals.outputTokens)}</td>
                    <td className={detailStyles.alignRight}>{fmtTokens(safeTotals.cacheReadTokens)}</td>
                    <td className={detailStyles.alignRight}>{totalCostText}</td>
                    <td className={detailStyles.alignRight}>{deltaCellOf(totalDelta)}</td>
                    <td className={detailStyles.alignRight}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}
