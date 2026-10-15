/**
 * 余额与配额：按通道展示官方余额快照与订阅窗口，卡片可展开看该通道近 30 天的模型单价表（`/rates`）。
 * 界面不维护任何价格；金额按工具条选的显示币种折算（汇率来自 `/fx`，折算收口在 currency.ts）。
 */
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import {
  FX_PATH, MODEL_PRICE_REFRESH_PATH, RATES_PATH, failureReasonOf, loadFxRate, loadRates, refreshModelPrices,
} from '../core/api.ts'
import { COST_MODE_KEYS, quotaBarColor, statusColorOf } from '../core/channels.ts'
import {
  convertsCurrencyOf, fxFallbackWarningOf, fxSummaryTextOf, normalizeFxRate, rateTextOf, setDisplayCurrency,
  setFxRate, useCurrencyDisplay, DISPLAY_CURRENCIES, DISPLAY_CURRENCY_LABELS, type DisplayCurrency,
} from '../core/currency.ts'
import { fmtDateTime, fmtTokens, localTimeTextOf } from '../core/format.ts'
import { isEnglish, t, useT } from '../core/i18n.ts'
import { serverText } from '../core/serverText.ts'
import {
  LITELLM_REPO_URL, aggregateLoadedLabelOf, catalogStaleDays, costSourceHintOf, fetchedDaysAgo, hostOf,
  megabytesTextOf, shortCommitOf, COST_SOURCE_HINTS,
  type AggregateIssue, type CostSource, type ModelPriceAggregate, type PricingRefreshResult, type PricingResponse,
} from '../core/pricing.ts'
import type { Channel, ModelRateRow, QuotaProvider, RatesResponse, SnapshotQuotaOutcome } from '../core/types.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import styles from '../styles/shared.module.css'
import quotaStyles from '../styles/quota.module.css'
import pricingStyles from '../styles/pricing.module.css'
import uiStyles from '../styles/ui.module.css'

/** 余额字段展示顺序（未收录字段按原键名追加在后）。 */
const BALANCE_ORDER = ['totalBalance', 'topUpBalance', 'giftBalance', 'balance', 'currency']
const BALANCE_LABELS: Record<string, string> = {
  totalBalance: 'balance.total', topUpBalance: 'balance.credit', giftBalance: 'balance.grant', balance: 'balance.balance', currency: 'balance.currency',
}
const WINDOW_ORDER = ['5h', 'week', 'month', 'day']
const WINDOW_LABELS: Record<string, string> = { '5h': 'window.5h', week: 'window.week', month: 'window.month', day: 'window.day' }

/** 解析问题默认只列几条：一屏列不完的清单没人读。 */
const ISSUE_LIMIT = 5

/** 单价来源在表格里的说法（`none` 写「无依据」，不用角标的 `—`）。 */
const RATE_SOURCE_LABELS: Record<string, string> = {
  official: 'source.official',
  catalog: 'source.catalog',
  aggregate: 'source.aggregate',
  estimate: 'source.estimate',
  none: 'source.none',
}

/** 刷新价目的结果提示：ok = 成功回执，bad = 服务端原因或请求失败，两种都要留在界面上。 */
interface PriceRefreshStatus {
  tone: 'ok' | 'bad'
  text: string
}

function resetTextOf(value: unknown): string {
  if (typeof value !== 'string' || value === '') return t('q.resetUnknown')
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return t('quota.resetAt') + ' ' + value
  return t('quota.resetAt') + ' ' + fmtDateTime(time.getTime())
}

export function QuotaTab(props: {
  channels: Channel[]
  quotas: QuotaProvider[]
  pricing: PricingResponse | null
  /** 配额执行结果：哪个通道这次查到实时值、展示值时间与失败原因（用来标「本机快照 + 数据时间」）。 */
  quotaOutcome: SnapshotQuotaOutcome | null
  /** 价目版本号：刷新价目后单价表与用量口径都要重取。 */
  reloadToken: number
  /** 刷新价目成功后通知页面重取 /pricing 与用量（成本整体重算）。 */
  onPricingReload: () => void
}): ReactNode {
  /** 取词：宿主切语言时重渲染（模块级辅助函数直接用 import 的 t） */
  const t = useT()
  // 抽屉 / 信息块的 id 逐实例唯一：同一页渲染两份时写死字符串会撞 id，aria-controls 会指到别处
  const instanceId = useId()
  const pricingInfoId = instanceId + '-pricing-info'
  const display = useCurrencyDisplay()

  const [rates, setRates] = useState<RatesResponse | null>(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [fxLoading, setFxLoading] = useState(false)
  const [fxError, setFxError] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showPricingInfo, setShowPricingInfo] = useState(false)
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})
  const [refreshingPrices, setRefreshingPrices] = useState(false)
  const [refreshElapsedSeconds, setRefreshElapsedSeconds] = useState(0)
  const [refreshStatus, setRefreshStatus] = useState<PriceRefreshStatus | null>(null)

  /** 取一次汇率：服务端 12 小时内走缓存，打上游的只有用户点「刷新汇率」那一下；失败时保留已有汇率。 */
  const fetchFx = useCallback(async (force: boolean): Promise<void> => {
    setFxLoading(true)
    const result = await loadFxRate(force)
    setFxLoading(false)
    if (result === null) {
      setFxError(failureReasonOf(FX_PATH) ?? t('quota.noResponse'))
      return
    }
    setFxError(null)
    // 归一化返回 null 说明 rate 非法：宁可说「没取到汇率」，也不要拿上一次的值冒充
    const normalized = normalizeFxRate(result)
    if (normalized === null) setFxError(t('quota.fxBad'))
    setFxRate(normalized)
  }, [])

  // 打开「余额与配额」页取一次汇率；价目刷新不影响汇率，所以不挂 reloadToken
  useEffect(() => { void fetchFx(false) }, [fetchFx])

  // 单价表：近 30 天用到的模型（刷新价目后价目层变了，要重取）
  useEffect(() => {
    let cancelled = false
    setRatesLoading(true)
    void loadRates(30, 20).then((result) => {
      if (cancelled) return
      setRates(result)
      setRatesLoading(false)
    })
    return () => { cancelled = true }
  }, [props.reloadToken])

  // 刷新期间每秒推进一次「已等 N 秒」：20 秒的超时窗口里用户得看到它在跑，否则会以为界面卡死
  useEffect(() => {
    if (!refreshingPrices) return
    const timer = setInterval(() => setRefreshElapsedSeconds((previous) => previous + 1), 1000)
    return () => clearInterval(timer)
  }, [refreshingPrices])

  /** 切显示币种：只改展示口径，不重取用量；汇率缺失 / 过期才补取一次。 */
  const switchCurrency = (next: DisplayCurrency): void => {
    if (next === display.display) return
    setDisplayCurrency(next)
    if (display.fx === null || display.fx.stale) void fetchFx(false)
  }

  /** 「刷新价目」：唯一会拉上游的动作；成功后再让页面重取 /pricing 与用量（成本口径整体变了）。 */
  const refreshPrices = async (): Promise<void> => {
    if (refreshingPrices) return
    setRefreshingPrices(true)
    setRefreshElapsedSeconds(0)
    setRefreshStatus(null)
    const outcome = await refreshModelPrices()
    setRefreshingPrices(false)
    if (outcome === null) {
      setRefreshStatus({ tone: 'bad', text: t('quota.refreshFailed') + '：' + (failureReasonOf(MODEL_PRICE_REFRESH_PATH) ?? t('quota.noResponse')) })
      return
    }
    if (!outcome.ok) {
      setRefreshStatus({ tone: 'bad', text: t('quota.refreshFailed') + '：' + outcome.error })
      return
    }
    setRefreshStatus({ tone: 'ok', text: modelPriceRefreshTextOf(outcome) })
    props.onPricingReload()
  }

  // 服务端没升级时整块缺省：按「读不到」降级，不影响余额与窗口
  const pricing = props.pricing
  const aggregate: ModelPriceAggregate | null = pricing?.aggregate ?? null
  const catalog = pricing?.catalog ?? null
  const issues = Array.isArray(pricing?.issues) ? pricing.issues : []
  // 超过阈值就改成警示样式并提示复核：价目是静态数据，厂商调价后只能人工更新
  const catalogStale = catalog === null ? null : catalogStaleDays(Array.isArray(catalog.sources) ? catalog.sources : [])

  const rateChannels = Array.isArray(rates?.channels) ? rates.channels : []
  const rateRowsOf = (provider: string): ModelRateRow[] => {
    const entry = rateChannels.find((item) => item.provider === provider)
    return entry === undefined || !Array.isArray(entry.models) ? [] : entry.models
  }

  const fxText = display.fx === null
    ? (fxError === null ? fxSummaryTextOf(null) : t('quota.fxUnavailable') + '：' + fxError)
    : (fxFallbackWarningOf(display.fx) ?? fxSummaryTextOf(display.fx))
  const fxTone = display.fx === null || display.fx.source === 'default' ? quotaStyles.fxWarn : quotaStyles.fxText

  return (
    <div>
      <div className={quotaStyles.toolbar}>
        <span className={quotaStyles.toolbarLabel}>{t('quota.displayCurrency')}</span>
        {DISPLAY_CURRENCIES.map((currency) => (
          <button
            key={currency}
            type="button"
            className={quotaStyles.toolbarBtn + (display.display === currency ? ' ' + quotaStyles.currencyBtnOn : '')}
            aria-pressed={display.display === currency}
            onClick={() => switchCurrency(currency)}
          >
            {DISPLAY_CURRENCY_LABELS[currency]}
          </button>
        ))}
        <button
          type="button"
          className={quotaStyles.toolbarBtn}
          disabled={fxLoading}
          aria-busy={fxLoading}
          title={t('quota.fxCacheHint')}
          onClick={() => void fetchFx(true)}
        >
          {fxLoading ? t('quota.fetchFx') : t('quota.refreshFx')}
        </button>
        <span className={quotaStyles.toolbarSpacer} />
        <button
          type="button"
          className={quotaStyles.toolbarBtn + ' ' + quotaStyles.toolbarBtnPrimary}
          disabled={refreshingPrices}
          aria-busy={refreshingPrices}
          onClick={() => void refreshPrices()}
        >
          {refreshingPrices
            ? t('action.refreshing') + (refreshElapsedSeconds > 0 ? ' ' + String(refreshElapsedSeconds) + 's' : '')
            : t('quota.refreshPrices')}
        </button>
        <button
          type="button"
          className={quotaStyles.infoBtn + (showExplanation ? ' ' + quotaStyles.infoBtnActive : '')}
          aria-label={t('quota.caliberHint')}
          aria-expanded={showExplanation}
          onClick={() => setShowExplanation((previous) => !previous)}
        >
          ⓘ
        </button>
      </div>

      {/* 汇率来源 / 时间 / 兜底原因：`source: 'default'` 必须能看出「没联网，用的是兜底值」 */}
      <div className={fxTone} title={display.fx?.note ?? undefined}>{fxText}</div>

      <div className={quotaStyles.pricingInfo}>
        <button
          type="button"
          className={quotaStyles.pricingInfoToggle}
          aria-expanded={showPricingInfo}
          aria-controls={pricingInfoId}
          onClick={() => setShowPricingInfo((previous) => !previous)}
        >
          {showPricingInfo ? '▾' : '▸'} 价目数据来源与文件（内置厂商官方价目
          {catalog !== null && Number.isFinite(catalog.entries) ? ' ' + String(catalog.entries) + t('quota.entriesSuffix') : ''}
          {t('q.aggregateSuffix')}
        </button>
        <div id={pricingInfoId} className={quotaStyles.pricingInfoBody} hidden={!showPricingInfo}>
          <PricingInfoBlock pricing={pricing} aggregate={aggregate} issues={issues} catalogStale={catalogStale} />
        </div>
      </div>

      {catalogStale !== null && (
        <div className={quotaStyles.staleLine}>
          价目最新一次抓取距今 {String(catalogStale)} 天，建议按官方文档复核价目（价目是静态数据，厂商调价后要人工更新）。
        </div>
      )}

      {showExplanation && <ExplanationBlock />}

      <div
        className={pricingStyles.aggregateStatus + (refreshStatus === null ? '' : ' ' + (refreshStatus.tone === 'ok'
          ? pricingStyles.aggregateStatusOk
          : pricingStyles.aggregateStatusBad))}
        role="status"
        aria-live="polite"
      >
        {refreshStatus === null ? '' : refreshStatus.text}
      </div>

      <div className={quotaStyles.quotaList}>
        {props.channels.map((channel, index) => {
          const snapshot = props.quotas.find((item) => item.provider === channel.provider) ?? null
          const outcome = props.quotaOutcome?.providers.find((item) => item.provider === channel.provider) ?? null
          const balance = snapshot?.balance ?? null
          const plan = snapshot?.plan ?? null
          const isLive = snapshot?.source === 'live'
          const windows = plan !== null && Array.isArray((plan as { windows?: unknown }).windows)
            ? (plan as { windows: Array<{ key?: unknown; percent?: unknown; resetsAt?: unknown }> }).windows
            : null
          const rateRows = rateRowsOf(channel.provider)
          const isOpen = expandedProviders[channel.provider] === true
          const drawerId = instanceId + '-rates-' + String(index)
          return (
            <div className={quotaStyles.quotaCard} key={channel.provider}>
              {/* 卡片头是真按钮：整行可点，键盘 Tab + Enter 也能展开 */}
              <button
                type="button"
                className={quotaStyles.quotaToggle}
                aria-expanded={isOpen}
                aria-controls={drawerId}
                title={t('quota.ratesHint')}
                onClick={() => setExpandedProviders((previous) => ({ ...previous, [channel.provider]: previous[channel.provider] !== true }))}
              >
                <span className={styles.statusDot} style={{ background: statusColorOf(channel.status) }} />
                <span className={quotaStyles.quotaTitle}>{channel.displayName}</span>
                {isLive && <span className={quotaStyles.liveChip}>{t('quota.live')}</span>}
                <span className={quotaStyles.rateCount}>{rateCountTextOf(rateRows, ratesLoading, rates === null, failureReasonOf(RATES_PATH))}</span>
                <span className={quotaStyles.quotaProvider}>{channel.provider} · {t(COST_MODE_KEYS[channel.costMode] ?? 'ch.notQueried')}</span>
                <span className={quotaStyles.expandArrow} aria-hidden="true">{isOpen ? '▼' : '▶'}</span>
              </button>

              {outcome !== null && outcome.ok === false && (
                <div className={quotaStyles.staleLine}>
                  数据时间 {outcome.capturedAt === null ? t('quota.unknown') : localTimeTextOf(outcome.capturedAt)} · 本机快照 · 本次失败：
                  {outcome.error ?? t('quota.notQueried')}
                </div>
              )}

              {balance !== null && (
                <div className={quotaStyles.balanceStrip}>
                  {orderedBalanceEntries(balance).map(([key, value]) => (
                    <div className={quotaStyles.balanceItem} key={key}>
                      <div className={quotaStyles.bsLabel}>{t(BALANCE_LABELS[key] ?? key)}</div>
                      <div className={quotaStyles.bsValue}>{String(value)}</div>
                    </div>
                  ))}
                </div>
              )}

              {balance === null && windows !== null && windows.length > 0 && (
                <div className={quotaStyles.windowRow}>
                  {orderedWindows(windows).map((window) => {
                    const percent = typeof window.percent === 'number' ? window.percent : 0
                    const key = typeof window.key === 'string' ? window.key : 'window'
                    return (
                      <div className={quotaStyles.windowItem} key={key}>
                        <div className={quotaStyles.windowHead}>
                          <span className={quotaStyles.windowName}>{t(WINDOW_LABELS[key] ?? key)}</span>
                          <span className={quotaStyles.windowValue}>{percent}%</span>
                        </div>
                        <div className={quotaStyles.windowBar}>
                          <i style={{ width: Math.max(percent, 0) + '%', background: quotaBarColor(percent) }} />
                        </div>
                        <div className={quotaStyles.windowReset}>{resetTextOf(window.resetsAt)}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {balance === null && (windows === null || windows.length === 0) && (
                <div className={styles.dim}>{emptyReasonOf(channel, snapshot)}</div>
              )}

              {isLive && (
                <div className={quotaStyles.snapshotHint}>
                  实时查询于 {freshTextOf(snapshot?.fetchedAt ?? null)}（来自官方接口，最多缓存 1 分钟）
                </div>
              )}
              {snapshot !== null && !isLive && snapshot.supported && (
                <div className={staleDaysOf(snapshot.updatedAt) >= 1 ? quotaStyles.snapshotStale : quotaStyles.snapshotHint}>
                  实时查询未成功（{errorTextOf(snapshot.error)}）
                  {snapshot.updatedAt === null
                    ? t('q.retryHint')
                    : t('q.snapshotPrefix') + fmtDateTime(snapshot.updatedAt) + (staleDaysOf(snapshot.updatedAt) >= 1 ? t('q.stalePrefix') + staleDaysOf(snapshot.updatedAt) + t('q.daysStaleSuffix') : '')}
                </div>
              )}

              {/* 单价抽屉：收起时保持空容器，aria-controls 指过来始终有效 */}
              <div id={drawerId} className={quotaStyles.rateDrawer}>
                {isOpen && (
                  <RateTable
                    rows={rateRows}
                    loading={ratesLoading}
                    failureText={rates === null ? (failureReasonOf(RATES_PATH) ?? t('quota.noResponse')) : null}
                    display={display.display}
                    convertedHint={display.fx === null ? null : fxSummaryTextOf(display.fx)}
                    range={rates !== null && typeof rates.from === 'string' && typeof rates.to === 'string'
                      ? { from: rates.from, to: rates.to }
                      : null}
                  />
                )}
              </div>
            </div>
          )
        })}
        {props.channels.length === 0 && <div className={styles.empty}>{t('o.noChannels')}</div>}
      </div>
    </div>
  )
}

/** 卡片头部的单价摘要：收起时也能看出有多少个模型、来源压在哪一层。 */
function rateCountTextOf(rows: ModelRateRow[], loading: boolean, failed: boolean, failureText: string | null): string {
  if (rows.length > 0) {
    const counts = new Map<string, number>()
    for (const row of rows) counts.set(row.source, (counts.get(row.source) ?? 0) + 1)
    const mix = [...counts.entries()]
      .map(([source, count]) => t(RATE_SOURCE_LABELS[source] ?? source) + ' ' + String(count))
      .join(' / ')
    return String(rows.length) + t('q.modelRatesPrefix') + mix
  }
  if (loading) return t('quota.loadingRates')
  if (failed) return failureText === null ? t('quota.ratesUnavailable') : t('quota.ratesUnavailable') + '：' + failureText
  return t('quota.noUsage')
}

/** 单价表：`rates` 为 null 的行在四档位置显示来源说明（写 0 会被读成「免费」，比「没有依据」更糟）。 */
function RateTable(props: {
  rows: ModelRateRow[]
  loading: boolean
  failureText: string | null
  display: DisplayCurrency
  /** 折算口径（`1 USD = 7.10 CNY · 来源 · 时间`）；没取到汇率时为 null。 */
  convertedHint: string | null
  range: { from: string; to: string } | null
}): ReactNode {
  if (props.rows.length === 0) {
    return (
      <div className={quotaStyles.rateEmpty}>
        {props.loading
          ? t('quota.loadingRates')
          : props.failureText !== null
            ? t('quota.ratesUnavailable') + '：' + props.failureText
            : t('quota.ratesEmpty')}
      </div>
    )
  }
  const converted = props.rows.some((row) => convertsCurrencyOf(row.currency))
  return (
    <>
      <div className={quotaStyles.rateHead}>
        {t('quota.priceUnit')}（{t('unit.perMillion')}）· {t('quota.displayCurrency')} {DISPLAY_CURRENCY_LABELS[props.display]}
        {converted && props.convertedHint !== null ? t('q.convertedPrefix') + props.convertedHint + '）' : ''}
        {props.range === null ? '' : t('q.rangePrefix') + props.range.from + ' ~ ' + props.range.to}
      </div>
      <div className={quotaStyles.rateScroll}>
        <div className={uiStyles.tableScroll}><table className={quotaStyles.rateTable}>
          <thead>
            <tr>
              <th>{t('m.model')}</th><th>{t('c.input')}</th><th>{t('c.cacheRead')}</th><th>{t('d.cacheWrite')}</th><th>{t('c.output')}</th>
              <th>{t('quota.sourceLabel')}</th><th>{t('m.lastActive')}</th><th>{t('m.model')}</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => {
              const rates = row.rates
              const hasRates = rates !== null && typeof rates === 'object'
              const rowConverted = convertsCurrencyOf(row.currency)
              return (
                <tr key={row.model}>
                  <td>
                    <div className={quotaStyles.rateModel}>{row.model}</div>
                    <div className={quotaStyles.rateConverted}>
                      币种 {typeof row.currency === 'string' && row.currency !== '' ? row.currency : '—'}
                      {rowConverted ? ' → ' + props.display : ''}
                    </div>
                    {row.offPeak === true && <span className={quotaStyles.offPeakChip}>{t('q.offPeak')}</span>}
                  </td>
                  {hasRates
                    ? (
                      <>
                        <td>{rateCellText(row.currency, rates.input)}</td>
                        <td>{rateCellText(row.currency, rates.cacheRead)}</td>
                        <td>{rateCellText(row.currency, rates.cacheWrite)}</td>
                        <td>{rateCellText(row.currency, rates.output)}</td>
                      </>
                    )
                    : (
                      <td className={quotaStyles.rateEmpty} colSpan={4}>
                        {noteTextOf(row.note) !== '' ? noteTextOf(row.note) : noRateTextOf(row.source)}
                      </td>
                    )}
                  <td>
                    {row.source === 'none'
                      ? <span className={quotaStyles.rateSourceNone} title={costSourceHintOf('none', row.partial)}>{t('q.noBasis')}</span>
                      : <CostSourceChip source={row.source} partial={row.partial} />}
                  </td>
                  <td>{fmtTokens(typeof row.tokens === 'number' && Number.isFinite(row.tokens) ? row.tokens : 0)}</td>
                  <td className={quotaStyles.rateNote}>{row.note !== null && row.note !== '' ? row.note : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>
    </>
  )
}

/** 单价单元格：按显示币种折算（`≈` 表示折算值），小值保留 4 位小数避免显示成 0.00。 */
function rateCellText(currency: string | null, value: unknown): string {
  return rateTextOf(currency, typeof value === 'number' && Number.isFinite(value) ? value : 0).text
}

/** `rates` 为 null 时的整段说明：按来源讲清为什么没有四档单价。 */
function noRateTextOf(source: CostSource): string {
  return t(COST_SOURCE_HINTS[source] ?? 'quota.noFourRates')
}

/** 价目信息块：官方价目来源与新鲜度、价目文件与解析问题、聚合价目装载状态。 */
function PricingInfoBlock(props: {
  pricing: PricingResponse | null
  aggregate: ModelPriceAggregate | null
  issues: PricingResponse['issues']
  catalogStale: number | null
}): ReactNode {
  const { pricing, aggregate } = props
  const catalog = pricing?.catalog ?? null
  const sources = Array.isArray(catalog?.sources) ? catalog.sources : []
  const issues = props.issues ?? []
  const shownIssues = issues.slice(0, ISSUE_LIMIT)
  const coverage = pricing?.coverage ?? null
  const files = pricing?.files ?? null
  const coverageText = coverageTextOf(coverage)

  // issues 是新增字段，老响应可能整块没有；非数组一律当空（不让一条脏数据把这块带崩）
  const aggregateIssues = (Array.isArray(aggregate?.issues) ? aggregate.issues : [])
    .filter((issue): issue is AggregateIssue => issue !== null && typeof issue === 'object')
  const fetchedAtText = aggregate === null ? null : localTimeTextOf(aggregate.fetchedAt)
  const pathText = typeof aggregate?.path === 'string' && aggregate.path !== '' ? aggregate.path : null
  const commitFull = typeof aggregate?.upstreamCommit === 'string' && aggregate.upstreamCommit.trim() !== ''
    ? aggregate.upstreamCommit.trim()
    : null
  const commitShort = commitFull === null ? null : shortCommitOf(commitFull)
  const licenseText = typeof aggregate?.license === 'string' && aggregate.license.trim() !== ''
    ? aggregate.license
    : 'MIT'

  return (
    <>
      {coverageText !== null && <div className={quotaStyles.countLine}>{coverageText}</div>}

      {catalog !== null && Number.isFinite(catalog.entries) && catalog.entries > 0 && (
        <div className={pricingStyles.catalogNote + (props.catalogStale === null ? '' : ' ' + pricingStyles.catalogStale)}>
          已内置 <b>{String(catalog.entries)}</b>{t('q.catalogPrefix')}<b>{t('q.catalogAuto')}</b>。来源：
          {sources.length === 0
            ? t('quota.noSourceDetail')
            : sources.map((entry, index) => {
              const daysAgo = fetchedDaysAgo(entry.fetchedAt)
              return (
                <span key={entry.source}>
                  {index > 0 && '；'}
                  {typeof entry.source === 'string' && entry.source !== ''
                    ? <a className={pricingStyles.linkBtn} href={entry.source} target="_blank" rel="noreferrer">{(entry.providers ?? []).join(' / ')}</a>
                    : (entry.providers ?? []).join(' / ')}
                  （{String(entry.count)} 条，{entry.fetchedAt} 抓取{daysAgo === null ? '' : t('q.agoPrefix') + String(daysAgo) + t('q.daySuffix')}）
                </span>
              )
            })}
        </div>
      )}

      {files !== null && files.catalog !== undefined && (
        <div className={pricingStyles.fileLine}>
          <span>
            内置价目文件 <code className={pricingStyles.pathText}>{files.catalog.path}</code>
            {files.catalog.exists ? '（' + String(files.catalog.entries) + t('q.entriesClose') : '（' + t('quota.unreadable') + '）'}
          </span>
        </div>
      )}

      {issues.length > 0 && (
        <div className={pricingStyles.issueBlock}>
          <div className={pricingStyles.issueHead}>
            <b>{String(issues.length)} 处价目解析问题</b>
            <span className={pricingStyles.issueNote}>
              —— 这些问题所在的条目已被跳过，成本按其余层与台账算
            </span>
          </div>
          <ul className={pricingStyles.issueList}>
            {shownIssues.map((issue, index) => (
              <li key={String(issue.file) + '|' + String(issue.line) + '|' + String(index)}>
                <span className={pricingStyles.issueWhere}>
                  内置价目{issue.line === null ? '' : t('q.rowPrefix') + String(issue.line) + t('q.rowSuffix')}
                </span>
                {issue.message}
              </li>
            ))}
          </ul>
          {issues.length > ISSUE_LIMIT && (
            <div className={pricingStyles.issueNote}>还有 {String(issues.length - ISSUE_LIMIT)} 条同类问题已折叠。</div>
          )}
        </div>
      )}

      <div className={pricingStyles.aggregateBlock}>
        <div className={pricingStyles.aggregateHead}>
          <span className={pricingStyles.aggregateTitle}>
            聚合价目来源：
            <a className={pricingStyles.linkBtn} href={LITELLM_REPO_URL} target="_blank" rel="noreferrer">LiteLLM</a>
            （{licenseText}，第三方聚合价目，美元计价；优先级低于内置官方价目）
          </span>
        </div>
        {aggregate === null
          ? (
            <div className={pricingStyles.aggregateMeta}>
              {pricing === null
                ? t('quota.loadingPricing')
                : t('quota.pricingUnavailable')}
            </div>
          )
          : (
            <>
              <div className={pricingStyles.aggregateMeta}>
                当前装载：<b>{aggregateLoadedLabelOf(aggregate.loaded)}</b>
                {Number.isFinite(aggregate.entries) ? t('quota.entry') + ' ' + String(aggregate.entries) : ''}
                {Number.isFinite(aggregate.models) ? t('quota.modelCount') + ' ' + String(aggregate.models) : ''}
                {fetchedAtText === null ? '' : t('quota.fileTime') + ' ' + fetchedAtText}
                {commitShort === null ? '' : '　upstream ' + commitShort}
              </div>
              <div className={pricingStyles.aggregateMeta}>
                平时不联网：<b>{t('q.aggregateRefreshOnly')}</b>才会访问 LiteLLM 上游地址；刷新失败不影响已装载的那一份。
                {pathText === null ? '' : t('quota.currentFile') + '：' + pathText}
              </div>
            </>
          )}
        {aggregateIssues.length > 0 && (
          <div className={pricingStyles.issueBlock}>
            <div className={pricingStyles.issueHead}>
              <b>{String(aggregateIssues.length)} 处聚合价目装载问题</b>
              <span className={pricingStyles.issueNote}>{t('q.aggregateScope')}</span>
            </div>
            <ul className={pricingStyles.issueList}>
              {aggregateIssues.slice(0, ISSUE_LIMIT).map((issue, index) => (
                <li key={issue.kind + '|' + String(index)}>
                  <span className={pricingStyles.issueWhere}>{issue.kind}</span>
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

/** 覆盖度一行：官方账单天数 + 三层价目各命中多少模型 + 台账兜底与无依据；一个数字都没有就整段省略。 */
function coverageTextOf(coverage: PricingResponse['coverage'] | null): string | null {
  if (coverage === null) return null
  const days = coverage.from === undefined || coverage.to === undefined ? null : daysBetween(coverage.from, coverage.to)
  const parts: string[] = []
  if (days !== null) parts.push(t('quota.officialBill') + ' ' + String(days) + t('q.daySuffix'))
  const counts: Array<[string, number | undefined]> = [
    [t('cso.catalog'), coverage.catalogModels],
    [t('cso.aggregate'), coverage.aggregateModels],
    [t('cso.estimate'), coverage.averagedModels],
    [t('q.noBasis'), coverage.unpricedModels],
  ]
  for (const [label, value] of counts) {
    if (typeof value === 'number' && Number.isFinite(value)) parts.push(label + ' ' + String(value) + t('q.modelsSuffix'))
  }
  if (typeof coverage.partialModels === 'number' && coverage.partialModels > 0) {
    parts.push(t('q.partialPrefix') + String(coverage.partialModels) + t('q.countSuffix'))
  }
  if (parts.length === 0) return null
  return t('quota.basis') + '：' + parts.join(' · ') + t('quota.basisAuto')
}

/** 覆盖区间的自然天数（含首尾），用作「官方账单 X 天」的口径。 */
function daysBetween(from: string, to: string): number | null {
  const start = new Date(from + 'T00:00:00').getTime()
  const end = new Date(to + 'T00:00:00').getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.round((end - start) / 86400000) + 1
}

/** 成本口径说明：点 ⓘ 才展开，只留结论口径（算法细节在 docs/01）。 */
function ExplanationBlock(): ReactNode {
  return (
    <div className={pricingStyles.explanation}>
      <div className={pricingStyles.explanationTitle}>{t('caliber.title')}</div>
      <ul className={pricingStyles.explanationList}>
        <li>{t('caliber.orderPrefix')}<b>{t('quota.officialBill')}</b> &gt; <b>{t('cso.catalog')}</b>{t('caliber.orderCatalog')}<b>{t('cso.aggregate')}</b>{t('caliber.orderAggregate')}<b>{t('cso.estimate')}</b>{t('caliber.orderTail')}</li>
        <li><b>{t('cso.official')}</b>{t('caliber.officialNote')}<b>{t('cso.estimate')}</b>{t('caliber.estimateNote')}</li>
        <li>{t('caliber.unitNote')}</li>
        <li>{t('caliber.nonePrefix')}<b>—</b>{t('caliber.convertNote')}<code>≈</code>。</li>
      </ul>
    </div>
  )
}

/** 刷新回执：契约只给 `entries`（条目数）不给模型数，所以写「条」而不冒充「个模型」。 */
function modelPriceRefreshTextOf(result: Extract<PricingRefreshResult, { ok: true }>): string {
  const parts: string[] = []
  if (typeof result.entries === 'number' && Number.isFinite(result.entries)) {
    parts.push(String(result.entries) + t('q.priceEntriesSuffix'))
  }
  const megabytes = megabytesTextOf(result.bytes)
  if (megabytes !== null) parts.push(megabytes)
  const host = hostOf(result.url)
  if (host !== null) parts.push(t('quota.sourceLabel') + ' ' + host)
  const time = localTimeTextOf(result.fetchedAt)
  if (time !== null) parts.push(time)
  return t('quota.updated') + '：' + (parts.length === 0 ? t('quota.recomputed') : parts.join(' · '))
}

function freshTextOf(fetchedAt: number | null): string {
  if (fetchedAt === null) return t('quota.justNow')
  const seconds = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000))
  if (seconds < 60) return t('quota.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes + t('q.minutesAgoSuffix')
  return Math.floor(minutes / 60) + t('q.hoursAgoSuffix')
}

/** 价目说明：中文原文只在中文模式显示；英文模式改成指向界面已有的费率 / 来源 / 日期。 */
function noteTextOf(note: string | null | undefined): string {
  if (note === null || note === undefined || note === '') return ''
  if (isEnglish() && /[\u4e00-\u9fa5]/.test(note)) return t('srv.rateNoteEn')
  return serverText(note)
}

function errorTextOf(error: string | null): string {
  if (error === null) return t('err.noLiveQuery')
  if (error === 'no-key') return t('err.noApiKey')
  if (error === 'no-snapshot') return t('err.noSnapshot')
  if (error === 'network') return t('err.network')
  if (error === 'timeout') return t('err.timeout')
  if (error === 'unauthorized') return t('err.unauthorized')
  if (error === 'bad-json') return t('err.badJson')
  if (error === 'too-large') return t('err.tooLarge')
  if (error.startsWith('http-')) return t('err.http', { code: error.slice(5) })
  return error
}

/** 快照距今天数（向下取整）；用于把「宿主很久没刷新」显式标出来。 */
function staleDaysOf(updatedAt: number | null): number {
  if (updatedAt === null) return 0
  return Math.floor((Date.now() - updatedAt) / 86400000)
}

function orderedBalanceEntries(balance: Record<string, unknown>): Array<[string, unknown]> {
  const entries = Object.entries(balance).filter(([key]) => key !== 'updatedAt')
  const ordered: Array<[string, unknown]> = []
  for (const key of BALANCE_ORDER) {
    const found = entries.find(([entryKey]) => entryKey === key)
    if (found !== undefined) ordered.push(found)
  }
  for (const entry of entries) {
    if (!BALANCE_ORDER.includes(entry[0])) ordered.push(entry)
  }
  return ordered
}

function orderedWindows(windows: Array<{ key?: unknown }>): Array<{ key?: unknown; percent?: unknown; resetsAt?: unknown }> {
  const typed = windows as Array<{ key?: unknown; percent?: unknown; resetsAt?: unknown }>
  return [...typed].sort((first, second) => {
    const firstIndex = WINDOW_ORDER.indexOf(typeof first.key === 'string' ? first.key : '')
    const secondIndex = WINDOW_ORDER.indexOf(typeof second.key === 'string' ? second.key : '')
    return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex)
  })
}

/** 无数据时的分档说明：区分未配置凭据 / 免费额度 / 本地端点 / 无查询能力。 */
function emptyReasonOf(channel: Channel, snapshot: QuotaProvider | null): string {
  if (snapshot?.source === 'snapshot' && snapshot.error === 'no-key') return t('err.detail.noKey')
  if (snapshot?.source === 'snapshot' && snapshot.error === 'unauthorized') return t('err.detail.rejected')
  if (channel.status === 'off') return t('err.detail.keyMissing')
  if (channel.costMode === 'none') return t('err.detail.local')
  if (channel.costMode === 'free') return t('err.detail.free')
  return t('err.detail.none')
}
