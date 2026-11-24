/**
 * 每轮（turn）成本：把一条会话的用量样本按轮聚合，再走页面完全相同的一套价目与错峰规则。
 *
 * 口径与其它页面一致：同一次上报按 `(turn, step)` 去重（`foldSessionEvents` 已做）、
 * 错峰按该轮样本实际落在的小时判定、币种不换算（逐币种小计）、没有价目依据的轮显示 `—`。
 */
import { attributeModelKey, type UsageSample } from './session-usage.js'
import {
  isoDayOf,
  priceRowsOf,
  round6,
  weakestOf,
  type CostSource,
  type MoneyByCurrency,
  type PricingUsageRow,
} from '../pricing/pricing.js'

/** 一轮的计价结果；`cost === null` 表示这一轮没有价目依据。 */
export interface TurnCostRow {
  turn: number
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  /** 展示口径 tokens（输入 + 输出 + 缓存读，与界面一致）。 */
  tokens: number
  /** 这一轮用到的 `provider/model`（归一名）。 */
  models: string[]
  /** 这一轮对应的助手消息 id（界面按它把金额挂到具体那条回答上）；旧数据可能为空。 */
  messageIds: string[]
  cost: number | null
  currency: string | null
  costsByCurrency: MoneyByCurrency
  source: CostSource
  partial: boolean
  unpricedTokens: number
  cacheSavings: number
}

interface BucketSum {
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

const emptySum = (): BucketSum => ({ calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })

const emptyRow = (): PricingUsageRow => ({
  provider: '',
  model: '',
  calls: 0,
  tokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
})

const displayTokensOfSum = (sum: BucketSum): number => sum.inputTokens + sum.outputTokens + sum.cacheReadTokens

/** 样本键的前缀就是轮次（`turn:step#attempt`）；`seq:` 开头的没有轮次信息，跳过。 */
function turnOfSample(sample: UsageSample): number | null {
  const matched = /^(\d+):/.exec(sample.key)
  if (matched === null) return null
  const turn = Number(matched[1])
  return Number.isSafeInteger(turn) && turn >= 0 ? turn : null
}

function addIntoSample(target: BucketSum, buckets: UsageSample['buckets']): void {
  target.calls += 1
  target.inputTokens += buckets.inputTokens
  target.outputTokens += buckets.outputTokens
  target.cacheReadTokens += buckets.cacheReadTokens
  target.cacheWriteTokens += buckets.cacheWriteTokens
}

/**
 * 按轮计算成本。只依赖折叠出来的用量样本，价格与错峰全部交给 `pricing` 层，
 * 与 `/usage`、`/session`、`/hourly` 是同一套规则。
 */
export function turnCostsOf(
  samples: Iterable<UsageSample>,
  knownProviders: string[],
  costModeOf: ReadonlyMap<string, string>,
): TurnCostRow[] {
  // 轮次 → 模型原始键 → 该模型的样本（同一轮可能换过模型）
  const byTurn = new Map<number, Map<string, UsageSample[]>>()
  for (const sample of samples) {
    const turn = turnOfSample(sample)
    if (turn === null) continue
    let models = byTurn.get(turn)
    if (models === undefined) {
      models = new Map()
      byTurn.set(turn, models)
    }
    const bucket = models.get(sample.model)
    if (bucket === undefined) models.set(sample.model, [sample])
    else bucket.push(sample)
  }

  const rows: TurnCostRow[] = []
  for (const [turn, models] of byTurn) {
    const totals = emptySum()
    const costsByCurrency: MoneyByCurrency = {}
    const modelNames: string[] = []
    const messageIds = new Set<string>()
    let mixedCost: number | null = null
    let source: CostSource | null = null
    let partial = false
    let unpricedTokens = 0
    let cacheSavings = 0
    for (const [rawKey, modelSamples] of models) {
      const sum = emptySum()
      // 24 小时槽里只填该模型样本实际落的小时，价目层据此判定错峰（与按天索引同一算法）
      const hours: PricingUsageRow[] = Array.from({ length: 24 }, emptyRow)
      for (const sample of modelSamples) {
        if (sample.messageId !== null) messageIds.add(sample.messageId)
        addIntoSample(sum, sample.buckets)
        addIntoSample(totals, sample.buckets)
        const slot = hours[Math.min(23, Math.max(0, sample.hour))]
        slot.calls = (slot.calls ?? 0) + 1
        slot.inputTokens = (slot.inputTokens ?? 0) + sample.buckets.inputTokens
        slot.outputTokens = (slot.outputTokens ?? 0) + sample.buckets.outputTokens
        slot.cacheReadTokens = (slot.cacheReadTokens ?? 0) + sample.buckets.cacheReadTokens
        slot.cacheWriteTokens = (slot.cacheWriteTokens ?? 0) + sample.buckets.cacheWriteTokens
        slot.tokens = (slot.inputTokens ?? 0) + (slot.outputTokens ?? 0) + (slot.cacheReadTokens ?? 0)
      }

      const attribution = attributeModelKey(rawKey, knownProviders)
      modelNames.push(attribution.provider + '/' + attribution.model)
      const row: PricingUsageRow = {
        provider: attribution.provider,
        model: attribution.model,
        calls: sum.calls,
        tokens: displayTokensOfSum(sum),
        inputTokens: sum.inputTokens,
        outputTokens: sum.outputTokens,
        cacheReadTokens: sum.cacheReadTokens,
        cacheWriteTokens: sum.cacheWriteTokens,
      }
      const day = modelSamples[0].day
      const priced = priceRowsOf([row], { hours, hoursDay: isoDayOf(new Date(day + 'T12:00:00')) })[0]
      const tokens = displayTokensOfSum(sum)
      source = source === null ? priced.source : weakestOf(source, priced.source)
      if (priced.partial) partial = true
      if (priced.cacheSavings > 0) cacheSavings = round6(cacheSavings + priced.cacheSavings)
      if (priced.cost === null || priced.rule === null) {
        unpricedTokens += tokens
        source = weakestOf(source, 'none')
        continue
      }
      const cost = round6(priced.cost)
      const currency = priced.rule.currency
      costsByCurrency[currency] = round6((costsByCurrency[currency] ?? 0) + cost)
      mixedCost = round6((mixedCost ?? 0) + cost)
    }
    const currencies = Object.keys(costsByCurrency)
    rows.push({
      turn,
      calls: totals.calls,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      cacheReadTokens: totals.cacheReadTokens,
      cacheWriteTokens: totals.cacheWriteTokens,
      tokens: displayTokensOfSum(totals),
      models: modelNames,
      messageIds: [...messageIds],
      cost: mixedCost,
      currency: currencies.length === 1 ? currencies[0] : null,
      costsByCurrency,
      source: source ?? 'none',
      partial,
      unpricedTokens,
      cacheSavings,
    })
  }
  return rows.sort((first, second) => first.turn - second.turn)
}
