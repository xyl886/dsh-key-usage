/**
 * 路由共享上下文：挂载期只建一次的闭包状态（数据源、台账 / 成本索引缓存、通道配置读取、快照服务引用）。
 * 各域 register 函数只接收这一份，避免每个域各自重读文件或各建一份业务缓存。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createArchiveSource,
  createSessionProjectionSource,
  createTitleSource,
  createWorkspaceSource,
} from '../data/session-meta.js'
import {
  classifyChannels,
  extractChannels,
  readProviderSnapshots,
  type ChannelInfo,
  type ProviderSnapshot,
} from '../data/collect.js'
import { buildCostIndex, tallyOf, type CostIndex } from '../data/costing.js'
import { readLedger, type ChannelDailySummary, type UsageLedger } from '../data/ledger.js'
import type { SessionMetaOptions } from '../data/sessions.js'
import type { PromptSessionIndex } from '../data/session-usage.js'
import type { ToolSessionIndex } from '../data/tool-stats.js'
import {
  alignMoneyWithCost,
  costsByCurrencyOf,
  priceRowsOf,
  round6,
  sumMoneyByCurrency,
  type CostSource,
} from '../pricing/pricing.js'
import { catalogCurrency, catalogProviderCurrency } from '../pricing/pricing-catalog.js'
import type { LiveQuotaService } from '../quota/live-quota.js'
import type { SnapshotService } from '../snapshot/snapshot.js'
import {
  EMPTY_LEDGER,
  dayModelPricingRow,
  dshHomePath,
  quotaRowsOf,
  readTextFile,
  type AnnotatedDaySummary,
  type SessionSource,
  type WebServer,
} from './helpers.js'

/** 宿主工作区表：项目页 / 模型页 / 按时段都要把「目录」对齐成侧边栏里的「工作区」。 */
export type WorkspaceSource = ReturnType<typeof createWorkspaceSource>

export interface KeyUsageRouteContext {
  webServer: WebServer
  sessionSource: SessionSource
  liveQuota: LiveQuotaService
  /** 旧版 `quota-snapshots.json` 路径：只在首次构建时兼容读一次当种子。 */
  quotaSnapshotPath: string
  workspaceSource: WorkspaceSource
  /**
   * 会话标题、子代理判定与归档状态：宿主服务 / 缓存文件都拿不到时返回空集合，界面自行回落。
   * 投影按 id 惰性读（只读这次要用到的会话），所以调用方要把 ids 传进来。
   */
  sessionMeta(ids: string[]): SessionMetaOptions
  loadLedger(): UsageLedger
  readSnapshots(): ProviderSnapshot[]
  ledgerCurrencyOf(provider: string): string
  costIndexOf(
    records: Parameters<typeof buildCostIndex>[0],
    knownProviders: string[],
    costModeOf: ReadonlyMap<string, string>,
  ): CostIndex
  annotateCosts(days: ChannelDailySummary[], sessionDates: string[], costIndex: CostIndex): AnnotatedDaySummary[]
  readChannelConfig(): ChannelInfo[]
  knownProviders(): string[]
  /** 通道清单（含配额判定）：与快照同源，供 /session、/rates 这类按需端点复用。 */
  channelsWithQuota(): Promise<ChannelInfo[]>
  /** 统一快照服务：挂载末尾装配（builders 要用各域的 payload 函数），装配完成后端点才会被调用。 */
  snapshotService: SnapshotService
  /** 运行期工具索引：每次本地重建时整体替换，端点读最新值，不重读会话。 */
  toolsIndex: ToolSessionIndex | null
  /** 运行期提问索引：每次本地重建时整体替换，端点读最新值，不重读会话。 */
  promptsIndex: PromptSessionIndex | null
}

export function createRouteContext(
  webServer: WebServer,
  sessionSource: SessionSource,
  liveQuota: LiveQuotaService,
  hostServices: { get(name: string): unknown },
): KeyUsageRouteContext {
  const ledgerPath = join(dshHomePath(), 'dsh-usage', 'usage-ledger.json')
  const snapshotPath = join(dshHomePath(), 'dsh-usage', 'provider-snapshots.json')
  const titleSource = createTitleSource(join(dshHomePath(), 'storages', 'session_projcache.json'))
  /** 会话投影（一会话一文件）：侧边栏显示名与「是不是真子代理」的权威来源。 */
  const projectionSource = createSessionProjectionSource(join(dshHomePath(), 'storages', 'session_projcache', 'sessions'))
  const archiveSource = createArchiveSource(hostServices, join(dshHomePath(), 'storages', 'workspace.json'))
  /** 宿主工作区表（path → 侧边栏显示名）：项目页要靠它把「目录」对齐成侧边栏里的「工作区」。 */
  const workspaceSource = createWorkspaceSource(hostServices, join(dshHomePath(), 'storages', 'workspace.json'))
  const quotaSnapshotPath = join(dshHomePath(), 'dsh-key-usage', 'quota-snapshots.json')

  const sessionMeta = (ids: string[]): SessionMetaOptions => {
    const facts = projectionSource.facts(ids)
    const titles = new Map(titleSource.titles())
    for (const [id, fact] of facts) if (fact.title !== null) titles.set(id, fact.title)
    return { titles, facts, archived: archiveSource.archived() }
  }

  const loadLedger = (): UsageLedger => readLedger(ledgerPath, (path) => {
    try { return readFileSync(path, 'utf8') } catch { return null }
  }) ?? EMPTY_LEDGER

  const readSnapshots = (): ProviderSnapshot[] => readProviderSnapshots(snapshotPath).providers

  /**
   * 台账金额的币种：台账只记金额、不记币种（宿主 `usage-ledger.json` 没有 currency 字段），
   * 按该通道在内置价目里的币种推断（DeepSeek / Kimi → CNY，Z.ai / OpenRouter → USD），
   * 价目里没有这个通道时回落到价目基准币种 —— 这是**推断**而不是台账自带的事实，界面要注明。
   */
  const ledgerCurrencyOf = (provider: string): string => catalogProviderCurrency(provider) ?? catalogCurrency()

  /** 成本索引按「会话记录数组 + 通道集合」缓存：一次构建只算一遍，各段共用同一份金额。 */
  const costIndexCache = new WeakMap<object, { key: string; index: CostIndex }>()
  const costIndexOf = (
    records: Parameters<typeof buildCostIndex>[0],
    knownProviders: string[],
    costModeOf: ReadonlyMap<string, string>,
  ): CostIndex => {
    const key = knownProviders.join('|') + '#' + [...new Set(costModeOf.values())].sort().join(',')
    const cached = costIndexCache.get(records)
    if (cached !== undefined && cached.key === key) return cached.index
    const index = buildCostIndex(records, knownProviders, costModeOf)
    costIndexCache.set(records, { key, index })
    return index
  }

  /**
   * 给合并序列补成本与来源：台账天保留官方成本（official，不重算），
   * 会话补位天按「天 × 模型」格取统一成本索引（逐日错峰 + 逐币种小计），两层都不命中就是 none。
   * 金额内部保留 6 位小数，展示层再收两位。
   */
  const annotateCosts = (
    days: ChannelDailySummary[],
    sessionDates: string[],
    costIndex: CostIndex,
  ): AnnotatedDaySummary[] => {
    const sessionSet = new Set(sessionDates)
    return days.map((day) => {
      if (!sessionSet.has(day.date)) {
        // 台账天带官方账单金额：原样保留，不按价目重算
        const models = day.models.map((model) => ({
          ...model,
          costSource: 'official' as CostSource,
          partial: false,
          costsByCurrency: costsByCurrencyOf([{ cost: model.cost, currency: ledgerCurrencyOf(model.provider) }]),
          unpricedTokens: 0,
        }))
        return {
          ...day,
          costSource: 'official' as CostSource,
          partial: false,
          estimated: false,
          unpricedTokens: 0,
          models,
          costsByCurrency: alignMoneyWithCost(sumMoneyByCurrency(models.map((model) => model.costsByCurrency)), day.cost),
        }
      }
      const dayCells = costIndex.byDate.get(day.date) ?? []
      const tally = tallyOf(dayCells)
      const models = day.models.map((model) => {
        const cell = costIndex.byDateModel.get(day.date + '|' + model.provider + '|' + model.model)
        if (cell !== undefined) {
          return {
            ...model,
            cost: cell.cost ?? 0,
            costSource: (cell.cost === null ? 'none' : cell.source) as CostSource,
            partial: cell.partial,
            costsByCurrency: cell.cost === null || cell.currency === null ? {} : { [cell.currency]: round6(cell.cost) },
            unpricedTokens: cell.unpricedTokens,
          }
        }
        // 兜底路径：索引里没有这一格（理论上不会），按标准价算并标「无依据」之外的最弱来源
        const priced = priceRowsOf([dayModelPricingRow(model)])[0]
        const cost = priced.cost === null ? 0 : round6(priced.cost)
        return {
          ...model,
          cost,
          costSource: (priced.cost === null ? 'none' : priced.source) as CostSource,
          partial: priced.partial,
          costsByCurrency: priced.cost === null || priced.rule === null ? {} : { [priced.rule.currency]: cost },
          unpricedTokens: priced.cost === null ? model.inputTokens + model.outputTokens + model.cacheReadTokens : 0,
        }
      })
      return {
        ...day,
        cost: tally.cost ?? 0,
        costSource: tally.source,
        partial: tally.partial,
        estimated: true,
        unpricedTokens: tally.unpricedTokens,
        models,
        costsByCurrency: tally.costsByCurrency,
      }
    })
  }

  /** 通道配置：cordis.yml 优先、空模板时回退 cordis.patch.yml（两个文件都含 !!js，只做文本提取）。 */
  const readChannelConfig = (): ChannelInfo[] => {
    const profileDir = join(dshHomePath(), 'profiles', 'desktop')
    const composed = readTextFile(join(profileDir, 'cordis.yml'))
    if (composed !== null) {
      const channels = extractChannels(composed)
      if (channels.length > 0) return channels
    }
    const patch = readTextFile(join(profileDir, 'cordis.patch.yml'))
    return patch === null ? [] : extractChannels(patch)
  }
  const knownProviders = (): string[] => readChannelConfig().map((channel) => channel.provider)

  let snapshotService: SnapshotService | null = null
  const context: KeyUsageRouteContext = {
    webServer,
    sessionSource,
    liveQuota,
    quotaSnapshotPath,
    workspaceSource,
    sessionMeta,
    loadLedger,
    readSnapshots,
    ledgerCurrencyOf,
    costIndexOf,
    annotateCosts,
    readChannelConfig,
    knownProviders,
    channelsWithQuota: async () => classifyChannels(readChannelConfig(), quotaRowsOf((await (snapshotService as SnapshotService).view()).sections.quota)),
    toolsIndex: null,
    promptsIndex: null,
    get snapshotService(): SnapshotService {
      // 装配在 mountKeyUsageRoutes 末尾完成，端点只会在那之后被调用
      return snapshotService as SnapshotService
    },
    set snapshotService(next: SnapshotService) {
      snapshotService = next
    },
  }
  return context
}
