/**
 * 用量台账读取与聚合：解析 ~/.dsh/dsh-usage/usage-ledger.json，
 * 提供范围聚合、按模型/通道拆分、年度热力图序列。
 * 纯函数实现，便于离线测试（不触达真实家目录）。
 */

export interface LedgerModelEntry {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  reasoningTokens: number
  calls: number
  cost: number
}

export interface UsageLedger {
  version: number
  days: Record<string, Record<string, Record<string, LedgerModelEntry>>>
}

export interface DaySummary {
  date: string
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  reasoningTokens: number
  cost: number
}

export interface ModelSummary extends DaySummary {
  provider: string
  model: string
}

export interface ChannelDailySummary extends DaySummary {
  provider: string
  models: ModelSummary[]
}

/** 安全读取并解析台账文件；不存在或损坏时返回 null，由调用方决定空态。 */
export function readLedger(ledgerPath: string, readFile: (path: string) => string | null): UsageLedger | null {
  const raw = readFile(ledgerPath)
  if (raw === null) return null
  try {
    const parsed = JSON.parse(raw) as UsageLedger
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.days !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

/** 台账按天遍历（含端点），dateKey 形如 2026-10-13。 */
export function forEachDay(ledger: UsageLedger, fromDate: string, toDate: string, callback: (dateKey: string, channels: Record<string, Record<string, LedgerModelEntry>>) => void): void {
  const start = new Date(fromDate + 'T00:00:00Z')
  const end = new Date(toDate + 'T00:00:00Z')
  for (let time = start.getTime(); time <= end.getTime(); time += 86400000) {
    const dateKey = new Date(time).toISOString().slice(0, 10)
    const channels = ledger.days[dateKey]
    if (channels) callback(dateKey, channels)
  }
}

interface AggregateAccumulator {
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  reasoningTokens: number
  cost: number
}

function addToAccumulator(target: AggregateAccumulator, entry: LedgerModelEntry): void {
  target.calls += entry.calls
  target.inputTokens += entry.inputTokens
  target.outputTokens += entry.outputTokens
  target.cacheReadTokens += entry.cacheReadTokens
  target.cacheWriteTokens += entry.cacheWriteTokens
  target.reasoningTokens += entry.reasoningTokens
  target.cost += entry.cost
}

function emptyAccumulator(): AggregateAccumulator {
  return { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 0 }
}

/** 范围聚合：可选限定通道（provider id 列表），返回总计与逐日序列。 */
export function aggregateRange(
  ledger: UsageLedger,
  fromDate: string,
  toDate: string,
  providerFilter: string[] | null,
): { totals: DaySummary; days: ChannelDailySummary[] } {
  const totals = emptyAccumulator()
  const days: ChannelDailySummary[] = []
  forEachDay(ledger, fromDate, toDate, (dateKey, channels) => {
    const dayAccumulator = emptyAccumulator()
    const dayModels: ModelSummary[] = []
    for (const [provider, models] of Object.entries(channels)) {
      if (providerFilter !== null && !providerFilter.includes(provider)) continue
      for (const [model, entry] of Object.entries(models)) {
        addToAccumulator(dayAccumulator, entry)
        dayModels.push({ provider, model, date: dateKey, ...structuredClone(entry) })
      }
    }
    if (dayModels.length === 0) return
    addToAccumulator(totals, dayAccumulator)
    days.push({
      date: dateKey,
      provider: '',
      ...dayAccumulator,
      models: dayModels.sort((first, second) => (second.inputTokens + second.outputTokens + second.cacheReadTokens) - (first.inputTokens + first.outputTokens + first.cacheReadTokens)),
    })
  })
  return { totals: { date: '', ...totals }, days }
}

/** 年度热力图数据：起止范围内每天的总 tokens 与按模型拆分。 */
export function buildHeatmap(ledger: UsageLedger, fromDate: string, toDate: string): Array<{
  date: string
  totalTokens: number
  models: Array<{ provider: string; model: string; totalTokens: number }>
}> {
  const result: Array<{ date: string; totalTokens: number; models: Array<{ provider: string; model: string; totalTokens: number }> }> = []
  forEachDay(ledger, fromDate, toDate, (dateKey, channels) => {
    const modelMap = new Map<string, { provider: string; model: string; totalTokens: number }>()
    let dayTotal = 0
    for (const [provider, models] of Object.entries(channels)) {
      for (const [model, entry] of Object.entries(models)) {
        const totalTokens = entry.inputTokens + entry.outputTokens + entry.cacheReadTokens
        if (totalTokens <= 0) continue
        dayTotal += totalTokens
        const key = provider + '|' + model
        const bucket = modelMap.get(key)
        if (bucket) bucket.totalTokens += totalTokens
        else modelMap.set(key, { provider, model, totalTokens })
      }
    }
    if (dayTotal <= 0) return
    result.push({
      date: dateKey,
      totalTokens: dayTotal,
      models: [...modelMap.values()].sort((first, second) => second.totalTokens - first.totalTokens),
    })
  })
  return result
}

/** 单个通道在指定范围内的汇总（总览表「今日 / 近 30 天」列用）。 */
export interface ProviderRangeSummary {
  provider: string
  calls: number
  tokens: number
  cost: number
}

/** 按通道汇总指定范围（展示口径 tokens 不含 cacheWrite）。 */
export function summarizeByProvider(ledger: UsageLedger, fromDate: string, toDate: string): ProviderRangeSummary[] {
  const byProvider = new Map<string, ProviderRangeSummary>()
  forEachDay(ledger, fromDate, toDate, (_dateKey, channels) => {
    for (const [provider, models] of Object.entries(channels)) {
      let summary = byProvider.get(provider)
      if (summary === undefined) {
        summary = { provider, calls: 0, tokens: 0, cost: 0 }
        byProvider.set(provider, summary)
      }
      for (const entry of Object.values(models)) {
        summary.calls += entry.calls
        summary.tokens += entry.inputTokens + entry.outputTokens + entry.cacheReadTokens
        summary.cost += entry.cost
      }
    }
  })
  return [...byProvider.values()]
}

export interface PriceEntry {
  tokens: number
  cost: number
}

/**
 * 从台账反推模型均价表（`provider|model` 与退化到 `model` 两种键）。
 * 台账只有「当天该模型的成本合计」，没有单价表，所以会话/项目成本只能估算，
 * 展示时必须标注口径（见页脚口径说明）。
 */
export function buildPriceTable(ledger: UsageLedger): Map<string, PriceEntry> {
  const table = new Map<string, PriceEntry>()
  const add = (key: string, tokens: number, cost: number): void => {
    const entry = table.get(key)
    if (entry === undefined) table.set(key, { tokens, cost })
    else { entry.tokens += tokens; entry.cost += cost }
  }
  for (const channels of Object.values(ledger.days)) {
    for (const [provider, models] of Object.entries(channels)) {
      for (const [model, entry] of Object.entries(models)) {
        const tokens = entry.inputTokens + entry.outputTokens + entry.cacheReadTokens
        if (tokens <= 0 || entry.cost <= 0) continue
        add(provider + '|' + model, tokens, entry.cost)
        add(model, tokens, entry.cost)
      }
    }
  }
  return table
}

/** 用均价表估算一组模型行的成本；没有任何可比价时返回 null（界面显示 —）。 */
export function estimateCost(
  models: Array<{ provider: string; model: string; tokens: number }>,
  priceTable: Map<string, PriceEntry>,
): number | null {
  let total = 0
  let matched = false
  for (const row of models) {
    if (row.tokens <= 0) continue
    const price = priceTable.get(row.provider + '|' + row.model) ?? priceTable.get(row.model)
    if (price === undefined || price.tokens <= 0) continue
    total += row.tokens * (price.cost / price.tokens)
    matched = true
  }
  return matched ? Math.round(total * 100) / 100 : null
}
