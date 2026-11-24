/** 使用明细 / 热力图 / 按时段：`/usage`、`/heatmap`、`/hourly`。 */
import { classifyChannels } from '../data/collect.js'
import { hoursByDateOf, hoursOfDate } from '../data/sessions.js'
import { hoursByDateFiltered } from '../data/costing.js'
import { aggregateRange } from '../data/ledger.js'
import { mergeDailySeries, sessionDayRows, totalsOfMerged } from '../data/merge.js'
import { round6, sumMoneyByCurrency } from '../pricing/pricing.js'
import type { KeyUsageRouteContext } from './context.js'
import {
  cacheSavingsOf,
  dayKeyOf,
  hourMetricsByDateOf,
  maxKey,
  minKey,
  parseMultiFilter,
  parseWindow,
  projectMatches,
  requireLoopback,
  sendJson,
  shiftedDayKey,
  weakestSource,
  weekHourlyMetricsOf,
  weekHourlyOf,
  type CostFilterInput,
} from './helpers.js'

/**
 * 使用明细：默认范围由快照物化；参数化请求走同一函数、同一份本地缓存，不另算一份。
 * 项目筛选时台账天无法按 workspace 拆分 → 只用会话事件估算，并置 officialIncomplete（界面标「估算」）。
 */
export async function usagePayload(
  context: KeyUsageRouteContext,
  from: string,
  to: string,
  providerFilter: string[] | null,
  projectFilter: string[] | null = null,
): Promise<Record<string, unknown>> {
  const ledger = context.loadLedger()
  const collection = await context.sessionSource.collect()
  const channels = classifyChannels(context.readChannelConfig(), [])
  const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]))
  const providers = channels.map((channel) => channel.provider)
  const records = projectFilter === null
    ? collection.records
    : collection.records.filter((record) => projectFilter.includes(record.workspace ?? ''))
  const sessionRows = sessionDayRows(records, providers)
    .filter((row) => providerFilter === null || providerFilter.includes(row.provider))
  const sessionDates = [...new Set(sessionRows.map((row) => row.date))].sort()
  const dayKeys = Object.keys(ledger.days).sort()
  const availableFrom = minKey(dayKeys[0], sessionDates[0]) ?? null
  const availableTo = maxKey(dayKeys[dayKeys.length - 1], sessionDates[sessionDates.length - 1]) ?? null
  // 项目筛选下台账没有 workspace 维度：拿掉台账天，只用会话事件估算（不混算）
  const ledgerDays = projectFilter === null ? aggregateRange(ledger, from, to, providerFilter).days : []
  const merged = mergeDailySeries(ledgerDays, sessionRows, from, to)
  // 单日范围才提供小时细分（来自会话事件，口径与台账不同，见页脚口径说明）
  const hours = from !== '' && from === to ? hoursOfDate(records, from) : null
  // 按日期 × 小时：趋势/明细的分时视图取这里（窗口上限 120 天，避免自定义长窗口把响应撑大）
  const windowDays = from !== '' && to !== '' ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1 : 0
  const hoursByDate = windowDays > 0 && windowDays <= 120 ? hourMetricsByDateOf(records, from, to) : null
  // 成本一律按「天 × 模型」格取统一索引（逐日错峰、逐币种小计）
  const costIndex = context.costIndexOf(records, providers, costModeOf)
  const days = context.annotateCosts(merged.days, merged.sessionDates, costIndex)
  const rawTotals = days.length > 0 ? totalsOfMerged(days) : null
  // 合计以「天」为准（台账天没有成本索引格，不能只用索引格求和，否则官方金额会凭空消失）
  const officialMoney = sumMoneyByCurrency(days.filter((day) => !day.estimated).map((day) => day.costsByCurrency))
  const estimatedMoney = sumMoneyByCurrency(days.filter((day) => day.estimated).map((day) => day.costsByCurrency))
  const totalMoney = sumMoneyByCurrency([officialMoney, estimatedMoney])
  const totalsCost = days.length === 0 ? null : round6(days.reduce((total, day) => total + day.cost, 0))
  const totalsSource = days.length === 0 ? 'none' : weakestSource(days.map((day) => day.costSource))
  const totalsPartial = days.some((day) => day.partial)
  const totalsUnpriced = days.reduce((total, day) => total + day.unpricedTokens, 0)
  const savings = cacheSavingsOf(days)
  return {
    days,
    totals: rawTotals === null ? null : {
      ...rawTotals,
      cost: totalsCost,
      costSource: totalsSource,
      partial: totalsPartial,
      costsByCurrency: totalMoney,
      // 口径标记：估算 / 订阅制估算 / 未计价 tokens / 官方与估算拆开
      estimated: days.some((day) => day.estimated),
      officialIncomplete: projectFilter !== null,

      unpricedTokens: totalsUnpriced,
      officialCostByCurrency: officialMoney,
      estimatedCostByCurrency: estimatedMoney,
      // 缓存省钱只给范围合计：逐天 / 逐模型行不带，避免界面在错误粒度上展示
      ...savings,
    },
    sessionDates: merged.sessionDates,
    availableFrom,
    availableTo,
    hours,
    hoursByDate,
  }
}

/** 热力图：近 364 天，与使用明细同一口径（会话补位天按价目估算，台账天保留官方成本）。 */
export async function heatmapPayload(context: KeyUsageRouteContext): Promise<Record<string, unknown>> {
  const ledger = context.loadLedger()
  const collection = await context.sessionSource.collect()
  const sessionRows = sessionDayRows(collection.records, context.knownProviders())
  const dayKeys = Object.keys(ledger.days).sort()
  const sessionDates = [...new Set(sessionRows.map((row) => row.date))].sort()
  const yearAgo = new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10)
  const earliest = minKey(dayKeys[0], sessionDates[0]) ?? yearAgo
  const from = earliest > yearAgo ? earliest : yearAgo
  const to = maxKey(dayKeys[dayKeys.length - 1], sessionDates[sessionDates.length - 1]) ?? from
  const merged = mergeDailySeries(aggregateRange(ledger, from, to, null).days, sessionRows, from, to)
  const heatmapChannels = classifyChannels(context.readChannelConfig(), [])
  const heatmapIndex = context.costIndexOf(collection.records, heatmapChannels.map((channel) => channel.provider), new Map(heatmapChannels.map((channel) => [channel.provider, channel.costMode])))
  const days = context.annotateCosts(merged.days, merged.sessionDates, heatmapIndex)
  // 时段矩阵只取同一窗口内的日期：窗口外的小时槽算进来，会和 days 的数字对不上
  const hoursByDate = hoursByDateOf(collection.records)
  const inWindow = new Map([...hoursByDate].filter(([date]) => date >= from && date <= to))
  return {
    days: days
      .map((day) => ({
        date: day.date,
        totalTokens: day.inputTokens + day.outputTokens + day.cacheReadTokens,
        models: day.models
          .map((model) => ({
            provider: model.provider,
            model: model.model,
            totalTokens: model.inputTokens + model.outputTokens + model.cacheReadTokens,
          }))
          .filter((model) => model.totalTokens > 0)
          .sort((first, second) => second.totalTokens - first.totalTokens),
      }))
      .filter((day) => day.totalTokens > 0),
    hourly: weekHourlyOf(inWindow),
    hourlyMetrics: weekHourlyMetricsOf(inWindow),
    hoursByDate: Object.fromEntries([...inWindow].map(([date, slots]) => [date, slots])),
    sessionDates: merged.sessionDates,
  }
}

export function registerUsageRoutes(context: KeyUsageRouteContext): void {
  const { webServer, snapshotService } = context

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/usage',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const view = await snapshotService.view()
      const available = view.sections.usage as { availableFrom?: string | null; availableTo?: string | null } | null
      const from = url.searchParams.get('from') ?? available?.availableFrom ?? ''
      const to = url.searchParams.get('to') ?? available?.availableTo ?? ''
      const providerParam = url.searchParams.get('provider')
      const providerFilter = providerParam !== null && providerParam !== '' ? providerParam.split(',').filter(Boolean) : null
      const projectFilter = parseMultiFilter(url.searchParams.get('project'))
      // 参数化请求与快照同源：同一套聚合函数、同一份本地 mtime 缓存
      sendJson(response, 200, await usagePayload(context, from, to, providerFilter, projectFilter))
    },
  })

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/heatmap',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      sendJson(response, 200, await heatmapPayload(context))
    },
  })

  /**
   * 按时段矩阵（星期 × 小时）：跟随顶部范围 + 通道 / 模型 / 项目筛选。
   * 与 /usage 的 hoursByDate 同源（会话事件），只是重新聚合到「长期画像」的坐标上。
   */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/hourly',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const window = parseWindow(url.searchParams.get('from'), url.searchParams.get('to'))
      const today = dayKeyOf(new Date())
      const from = window?.from ?? shiftedDayKey(-29)
      const to = window?.to ?? today
      const filter: CostFilterInput = {
        providers: parseMultiFilter(url.searchParams.get('provider')),
        models: parseMultiFilter(url.searchParams.get('model')),
        projects: parseMultiFilter(url.searchParams.get('project')),
      }
      const channels = await context.channelsWithQuota()
      const known = channels.map((channel) => channel.provider)
      const collection = await context.sessionSource.collect()
      const titles = context.workspaceSource.titles()
      const records = collection.records.filter((record) => projectMatches(filter, record.workspace, titles))
      const byDate = hoursByDateFiltered(records, known, {
        providers: filter.providers === null ? null : new Set(filter.providers),
        models: filter.models === null ? null : new Set(filter.models),
      })
      // 只统计窗口内的日期：范围切片与其它面板同口径
      const scoped = new Map([...byDate].filter(([date]) => date >= from && date <= to))
      sendJson(response, 200, {
        from,
        to,
        hourly: weekHourlyOf(scoped),
        hourlyMetrics: weekHourlyMetricsOf(scoped),
      })
    },
  })
}
