/**
 * 余额与配额：按通道展示官方余额快照与订阅窗口（原样数据，不换算不建议）。
 *
 * 每张通道卡片是可展开控件：展开后是该通道近 30 天用到的模型单价表（来自 `/rates`），
 * 让人一眼看出「这个通道这些模型的单价是多少、来源是哪一层」。价格全部由服务端决定，
 * 界面不提供任何价格表单；金额按工具条里选的显示币种折算（汇率来自 `/fx`，折算收口在 currency.ts）。
 */
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import {
  FX_PATH, MODEL_PRICE_REFRESH_PATH, RATES_PATH, failureReasonOf, loadFxRate, loadRates, refreshModelPrices,
} from '../api.ts'
import { quotaBarColor, statusColorOf } from '../channels.ts'
import {
  convertsCurrencyOf, fxFallbackWarningOf, fxSummaryTextOf, normalizeFxRate, rateTextOf, setDisplayCurrency,
  setFxRate, useCurrencyDisplay, DISPLAY_CURRENCIES, DISPLAY_CURRENCY_LABELS, type DisplayCurrency,
} from '../currency.ts'
import { fmtDateTime, fmtTokens, localTimeTextOf } from '../format.ts'
import {
  LITELLM_REPO_URL, aggregateLoadedLabelOf, catalogStaleDays, costSourceHintOf, fetchedDaysAgo, hostOf,
  megabytesTextOf, shortCommitOf, COST_SOURCE_HINTS,
  type AggregateIssue, type CostSource, type ModelPriceAggregate, type PricingRefreshResult, type PricingResponse,
} from '../pricing.ts'
import type { Channel, ModelRateRow, QuotaProvider, RatesResponse } from '../types.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import styles from '../styles/shared.module.css'
import quotaStyles from '../styles/quota.module.css'
import pricingStyles from '../styles/pricing.module.css'

/** 余额字段展示顺序（原型顺序）；未收录字段按原键名追加在后。 */
const BALANCE_ORDER = ['totalBalance', 'topUpBalance', 'giftBalance', 'balance', 'currency']
const BALANCE_LABELS: Record<string, string> = {
  totalBalance: '总余额', topUpBalance: '充值余额', giftBalance: '赠送余额', balance: '余额', currency: '币种',
}
/** 订阅窗口固定展示顺序。 */
const WINDOW_ORDER = ['5h', 'week', 'month', 'day']
const WINDOW_LABELS: Record<string, string> = { '5h': '5 小时窗口', week: '本周窗口', month: '本月窗口', day: '当日窗口' }

/** 解析问题默认只列几条：一屏列不完的清单没人读。 */
const ISSUE_LIMIT = 5

/** 单价表的计价单位：内置官方价目与聚合价目都是每百万 tokens（服务端 `/rates` 也按这个口径折算）。 */
const RATE_UNIT_TEXT = '每百万 tokens'

/** 单价来源在表格里的说法；`none` 在这里写「无依据」，不用角标的 `—`（那一列不能空着）。 */
const RATE_SOURCE_LABELS: Record<string, string> = {
  official: '官方',
  catalog: '官方价',
  aggregate: '聚合',
  estimate: '估算',
  none: '无依据',
}

/** 刷新价目的结果提示：ok = 成功回执，bad = 服务端原因或请求失败，两种都要留在界面上。 */
interface PriceRefreshStatus {
  tone: 'ok' | 'bad'
  text: string
}

function resetTextOf(value: unknown): string {
  if (typeof value !== 'string' || value === '') return '重置时间 —'
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return '重置于 ' + value
  return '重置于 ' + fmtDateTime(time.getTime())
}

export function QuotaTab(props: {
  channels: Channel[]
  quotas: QuotaProvider[]
  pricing: PricingResponse | null
  /** 价目版本号：刷新价目后单价表与用量口径都要重取。 */
  reloadToken: number
  /** 刷新价目成功后通知页面重取 /pricing 与用量（成本整体重算）。 */
  onPricingReload: () => void
}): ReactNode {
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

  /**
   * 取一次汇率：服务端 12 小时内走缓存，所以打开页面与切币种时都可以直接调 —— 真正打上游的只有
   * 用户点「刷新汇率」（`force`）那一下。失败时保留已有的汇率，只把原因挂在工具条上。
   */
  const fetchFx = useCallback(async (force: boolean): Promise<void> => {
    setFxLoading(true)
    const result = await loadFxRate(force)
    setFxLoading(false)
    if (result === null) {
      setFxError(failureReasonOf(FX_PATH) ?? '没拿到服务端响应')
      return
    }
    setFxError(null)
    // rate 不是合法数字时归一化会返回 null：这时宁可说「没取到汇率」，也不要拿上一次的值冒充
    const normalized = normalizeFxRate(result)
    if (normalized === null) setFxError('服务端返回的汇率无法解析')
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

  /**
   * 切显示币种：只改展示口径，不重新请求任何用量数据（服务端金额按原币种给，折算在客户端做）。
   * 汇率缺失或已过期时补取一次（服务端有 12 小时缓存，不会每次打上游）。
   */
  const switchCurrency = (next: DisplayCurrency): void => {
    if (next === display.display) return
    setDisplayCurrency(next)
    if (display.fx === null || display.fx.stale) void fetchFx(false)
  }

  /**
   * 「刷新价目」：全插件唯一会访问上游拉价目的用户动作（服务端去上游拉 JSON 并写到本机）。
   * 成功 / 失败都留在界面上（`aria-live` 播报），成功后再让页面重取 `/pricing` 与用量 —— 价目换了一份，
   * 成本口径整体都变了。
   */
  const refreshPrices = async (): Promise<void> => {
    if (refreshingPrices) return
    setRefreshingPrices(true)
    setRefreshElapsedSeconds(0)
    setRefreshStatus(null)
    const outcome = await refreshModelPrices()
    setRefreshingPrices(false)
    if (outcome === null) {
      setRefreshStatus({ tone: 'bad', text: '刷新失败：' + (failureReasonOf(MODEL_PRICE_REFRESH_PATH) ?? '没拿到服务端响应') })
      return
    }
    if (!outcome.ok) {
      setRefreshStatus({ tone: 'bad', text: '刷新失败：' + outcome.error })
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
    ? (fxError === null ? fxSummaryTextOf(null) : '汇率不可用：' + fxError)
    : (fxFallbackWarningOf(display.fx) ?? fxSummaryTextOf(display.fx))
  const fxTone = display.fx === null || display.fx.source === 'default' ? quotaStyles.fxWarn : quotaStyles.fxText

  return (
    <div>
      <div className={quotaStyles.toolbar}>
        <span className={quotaStyles.toolbarLabel}>显示币种</span>
        {DISPLAY_CURRENCIES.map((currency) => (
          <button
            key={currency}
            type="button"
            className={quotaStyles.toolbarBtn + (display.display === currency ? ' ' + quotaStyles.currencyBtnOn : '')}
            aria-pressed={display.display === currency}
            title={'所有金额按 ' + (currency === 'CNY' ? '人民币' : '美元') + '折算显示'}
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
          title="重新取一次汇率（服务端 12 小时内走缓存）"
          onClick={() => void fetchFx(true)}
        >
          {fxLoading ? '取汇率…' : '刷新汇率'}
        </button>
        <span className={quotaStyles.toolbarSpacer} />
        <button
          type="button"
          className={quotaStyles.toolbarBtn + ' ' + quotaStyles.toolbarBtnPrimary}
          disabled={refreshingPrices}
          aria-busy={refreshingPrices}
          title="从 LiteLLM 上游拉取最新聚合价目并写到本机：这是插件里唯一会联网拉价目的操作"
          onClick={() => void refreshPrices()}
        >
          {refreshingPrices
            ? '刷新中…' + (refreshElapsedSeconds > 0 ? '（已 ' + String(refreshElapsedSeconds) + ' 秒）' : '')
            : '刷新价目'}
        </button>
        <button
          type="button"
          className={quotaStyles.infoBtn + (showExplanation ? ' ' + quotaStyles.infoBtnActive : '')}
          aria-label="查看成本口径说明"
          aria-expanded={showExplanation}
          title="来源角标、单价单位、错峰与多币种折算口径"
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
          {catalog !== null && Number.isFinite(catalog.entries) ? ' ' + String(catalog.entries) + ' 条' : ''}
          {' · LiteLLM 聚合价目）'}
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
                title={isOpen ? '收起单价表' : '展开看这条通道近 30 天用到的模型单价'}
                onClick={() => setExpandedProviders((previous) => ({ ...previous, [channel.provider]: previous[channel.provider] !== true }))}
              >
                <span className={styles.statusDot} style={{ background: statusColorOf(channel.status) }} />
                <span className={quotaStyles.quotaTitle}>{channel.displayName}</span>
                {isLive && <span className={quotaStyles.liveChip}>实时</span>}
                <span className={quotaStyles.rateCount}>{rateCountTextOf(rateRows, ratesLoading, rates === null, failureReasonOf(RATES_PATH))}</span>
                <span className={quotaStyles.quotaProvider}>{channel.provider} · {channel.costLabel}</span>
                <span className={quotaStyles.expandArrow} aria-hidden="true">{isOpen ? '▼' : '▶'}</span>
              </button>

              {balance !== null && (
                <div className={quotaStyles.balanceStrip}>
                  {orderedBalanceEntries(balance).map(([key, value]) => (
                    <div className={quotaStyles.balanceItem} key={key}>
                      <div className={quotaStyles.bsLabel}>{BALANCE_LABELS[key] ?? key}</div>
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
                          <span className={quotaStyles.windowName}>{WINDOW_LABELS[key] ?? key}</span>
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
                    ? '，且暂无可用快照 —— 点右上角「刷新」重试'
                    : '，显示快照 · 快照时间 ' + fmtDateTime(snapshot.updatedAt) + (staleDaysOf(snapshot.updatedAt) >= 1 ? '，已 ' + staleDaysOf(snapshot.updatedAt) + ' 天未更新' : '')}
                </div>
              )}

              {/* 单价抽屉：收起时保持空容器，aria-controls 指过来始终有效 */}
              <div id={drawerId} className={quotaStyles.rateDrawer}>
                {isOpen && (
                  <RateTable
                    rows={rateRows}
                    loading={ratesLoading}
                    failureText={rates === null ? (failureReasonOf(RATES_PATH) ?? '没拿到服务端响应') : null}
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
        {props.channels.length === 0 && <div className={styles.empty}>未读取到通道配置</div>}
      </div>
    </div>
  )
}

/**
 * 通道卡片头部的单价摘要：收起状态也要能看出「有多少个模型、来源压在哪一层」。
 */
function rateCountTextOf(rows: ModelRateRow[], loading: boolean, failed: boolean, failureText: string | null): string {
  if (rows.length > 0) {
    const counts = new Map<string, number>()
    for (const row of rows) counts.set(row.source, (counts.get(row.source) ?? 0) + 1)
    const mix = [...counts.entries()]
      .map(([source, count]) => (RATE_SOURCE_LABELS[source] ?? source) + ' ' + String(count))
      .join(' / ')
    return String(rows.length) + ' 个模型单价 · ' + mix
  }
  if (loading) return '读取单价…'
  if (failed) return failureText === null ? '单价表不可用' : '单价表不可用：' + failureText
  return '近 30 天无用量'
}

/**
 * 单价表：模型 · 四档单价 · 来源 · 近 30 天 tokens。
 * `rates` 为 null 的行在四档位置显示来源说明（写 0 会被读成「免费」，比「没有依据」更糟）。
 */
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
          ? '正在读取单价…'
          : props.failureText !== null
            ? '单价表不可用：' + props.failureText
            : '近 30 天没有这条通道的模型用量，列不出单价。'}
      </div>
    )
  }
  const converted = props.rows.some((row) => convertsCurrencyOf(row.currency))
  return (
    <>
      <div className={quotaStyles.rateHead}>
        单价（{RATE_UNIT_TEXT}）· 显示币种 {DISPLAY_CURRENCY_LABELS[props.display]}
        {converted && props.convertedHint !== null ? '（≈ 为折算值：' + props.convertedHint + '）' : ''}
        {props.range === null ? '' : ' · 统计区间 ' + props.range.from + ' ~ ' + props.range.to}
      </div>
      <div className={quotaStyles.rateScroll}>
        <table className={quotaStyles.rateTable}>
          <thead>
            <tr>
              <th>模型</th><th>输入</th><th>缓存读</th><th>缓存写</th><th>输出</th>
              <th>来源</th><th>近 30 天 tokens</th><th>说明</th>
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
                    {row.offPeak === true && <span className={quotaStyles.offPeakChip}>错峰中</span>}
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
                        {row.note !== null && row.note !== '' ? row.note : noRateTextOf(row.source)}
                      </td>
                    )}
                  <td>
                    {row.source === 'none'
                      ? <span className={quotaStyles.rateSourceNone} title={costSourceHintOf('none', row.partial)}>无依据</span>
                      : <CostSourceChip source={row.source} partial={row.partial} />}
                  </td>
                  <td>{fmtTokens(typeof row.tokens === 'number' && Number.isFinite(row.tokens) ? row.tokens : 0)}</td>
                  <td className={quotaStyles.rateNote}>{row.note !== null && row.note !== '' ? row.note : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
  return COST_SOURCE_HINTS[source] ?? '没有四档单价'
}

/** 价目信息块：内置官方价目来源与新鲜度、价目文件与解析问题、聚合价目装载状态。 */
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
          已内置 <b>{String(catalog.entries)}</b> 条厂商官方价目，<b>自动生效，不需要你维护</b>。来源：
          {sources.length === 0
            ? '服务端没返回来源明细'
            : sources.map((entry, index) => {
              const daysAgo = fetchedDaysAgo(entry.fetchedAt)
              return (
                <span key={entry.source}>
                  {index > 0 && '；'}
                  {typeof entry.source === 'string' && entry.source !== ''
                    ? <a className={pricingStyles.linkBtn} href={entry.source} target="_blank" rel="noreferrer">{(entry.providers ?? []).join(' / ')}</a>
                    : (entry.providers ?? []).join(' / ')}
                  （{String(entry.count)} 条，{entry.fetchedAt} 抓取{daysAgo === null ? '' : '，距今 ' + String(daysAgo) + ' 天'}）
                </span>
              )
            })}
        </div>
      )}

      {files !== null && files.catalog !== undefined && (
        <div className={pricingStyles.fileLine}>
          <span>
            内置价目文件 <code className={pricingStyles.pathText}>{files.catalog.path}</code>
            {files.catalog.exists ? '（' + String(files.catalog.entries) + ' 条）' : '（读不到，成本会少一层依据）'}
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
                  内置价目{issue.line === null ? '' : ' 第 ' + String(issue.line) + ' 行'}
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
                ? '正在读取服务端价目信息…'
                : '服务端没有返回聚合价目信息，多半是插件服务端还是旧版本 —— 改了服务端要退出重开 DSH 才生效。'}
            </div>
          )
          : (
            <>
              <div className={pricingStyles.aggregateMeta}>
                当前装载：<b>{aggregateLoadedLabelOf(aggregate.loaded)}</b>
                {Number.isFinite(aggregate.entries) ? '　条目 ' + String(aggregate.entries) : ''}
                {Number.isFinite(aggregate.models) ? '　模型 ' + String(aggregate.models) : ''}
                {fetchedAtText === null ? '' : '　文件时间 ' + fetchedAtText}
                {commitShort === null ? '' : '　upstream ' + commitShort}
              </div>
              <div className={pricingStyles.aggregateMeta}>
                平时不联网：<b>只有你点「刷新价目」时</b>才会访问 LiteLLM 上游地址；刷新失败不影响已装载的那一份。
                {pathText === null ? '' : '　当前文件：' + pathText}
              </div>
            </>
          )}
        {aggregateIssues.length > 0 && (
          <div className={pricingStyles.issueBlock}>
            <div className={pricingStyles.issueHead}>
              <b>{String(aggregateIssues.length)} 处聚合价目装载问题</b>
              <span className={pricingStyles.issueNote}>—— 只影响聚合价目这一层的条目</span>
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

/**
 * 覆盖度一行：官方账单覆盖多少天 + 三层价目各命中多少个模型 + 台账兜底与无依据的模型数。
 * 字段全是可选的（服务端换口径时不至于渲染出 undefined），一个数字都没有就整段省略。
 */
function coverageTextOf(coverage: PricingResponse['coverage'] | null): string | null {
  if (coverage === null) return null
  const days = coverage.from === undefined || coverage.to === undefined ? null : daysBetween(coverage.from, coverage.to)
  const parts: string[] = []
  if (days !== null) parts.push('官方账单 ' + String(days) + ' 天')
  const counts: Array<[string, number | undefined]> = [
    ['官方价', coverage.catalogModels],
    ['聚合', coverage.aggregateModels],
    ['估算', coverage.averagedModels],
    ['无依据', coverage.unpricedModels],
  ]
  for (const [label, value] of counts) {
    if (typeof value === 'number' && Number.isFinite(value)) parts.push(label + ' ' + String(value) + ' 个模型')
  }
  if (typeof coverage.partialModels === 'number' && coverage.partialModels > 0) {
    parts.push('其中部分 ' + String(coverage.partialModels) + ' 个')
  }
  if (parts.length === 0) return null
  return '近 30 天这一格钱的依据：' + parts.join(' · ') + '（三层价目自动生效，不需要你填价格）'
}

/** 覆盖区间的自然天数（含首尾），用作「官方账单 X 天」的口径。 */
function daysBetween(from: string, to: string): number | null {
  const start = new Date(from + 'T00:00:00').getTime()
  const end = new Date(to + 'T00:00:00').getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.round((end - start) / 86400000) + 1
}

/** 成本口径说明：默认不占正文，点 ⓘ 才出现。只讲「这一格钱是怎么来的」。 */
function ExplanationBlock(): ReactNode {
  return (
    <div className={pricingStyles.explanation}>
      <div className={pricingStyles.explanationTitle}>成本口径（三层价目自动生效，不需要你填任何价格）</div>
      <ul className={pricingStyles.explanationList}>
        <li><b>官方</b>：台账记录的厂商账单金额，是既成事实，不会被价目覆盖。</li>
        <li><b>官方价</b>：按插件<b>内置的厂商官方价目</b>算出（随包发布、自动生效）；匹配只做精确 / 忽略大小写 / 去 <code>vendor/</code> 前缀，不做模糊匹配。展开通道卡片可以看到逐模型单价与来源。</li>
        <li><b>聚合</b>：按 <b>LiteLLM 聚合价目</b>算出（第三方维护、美元计价）；点「刷新价目」才联网更新，失败不影响已装载的那一份。条目缺缓存写入价时标「部分」：那一档按未命中价计。</li>
        <li><b>估算</b>：三层价目都没命中时，按台账反推的均价推算，仅供参照，不是账单。</li>
        <li><b>—</b>：连台账均价都没有，这一格没有价格依据。</li>
        <li>取值顺序：官方账单 &gt; 内置官方价目 &gt; 聚合价目 &gt; 台账均价，每一格按这个顺序取第一个可用的来源。</li>
        <li>单价按每百万 tokens 记；错峰由服务端按<b>本地时间</b>判定，处于错峰时段时单价表里标「错峰中」。</li>
        <li>多币种与折算：价目各按文档原币种记录（CNY / USD），显示时按当前汇率<b>逐币种折算后相加</b>，折算值前缀 <code>≈</code>；原币种与显示币种相同时不加标记。汇率来源与时间见工具条。</li>
      </ul>
    </div>
  )
}

/**
 * 刷新成功回执：「已更新：… 条价目 · M MB · 来源 host · 时间」。
 * 冻结契约里的刷新回执只给 `entries`（条目数）不给模型数，所以这里写「条」而不冒充「个模型」。
 */
function modelPriceRefreshTextOf(result: Extract<PricingRefreshResult, { ok: true }>): string {
  const parts: string[] = []
  if (typeof result.entries === 'number' && Number.isFinite(result.entries)) {
    parts.push(String(result.entries) + ' 条价目')
  }
  const megabytes = megabytesTextOf(result.bytes)
  if (megabytes !== null) parts.push(megabytes)
  const host = hostOf(result.url)
  if (host !== null) parts.push('来源 ' + host)
  const time = localTimeTextOf(result.fetchedAt)
  if (time !== null) parts.push(time)
  return '已更新：' + (parts.length === 0 ? '服务端没返回明细，已按新价目重算' : parts.join(' · '))
}

/** 实时结果的相对时间文案。 */
function freshTextOf(fetchedAt: number | null): string {
  if (fetchedAt === null) return '刚刚'
  const seconds = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000))
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes + ' 分钟前'
  return Math.floor(minutes / 60) + ' 小时前'
}

/** 实时查询失败原因的展示文案。 */
function errorTextOf(error: string | null): string {
  if (error === null) return '未启用实时查询'
  if (error === 'no-key') return '该通道未配置 API Key'
  if (error === 'no-snapshot') return '没有快照可用'
  if (error === 'network') return '网络不可达'
  if (error === 'timeout') return '请求超时'
  if (error === 'unauthorized') return '凭据被拒绝（401/403）'
  if (error === 'bad-json') return '接口响应无法解析'
  if (error === 'too-large') return '接口响应异常大'
  if (error.startsWith('http-')) return '接口返回 HTTP ' + error.slice(5)
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
  if (snapshot?.source === 'snapshot' && snapshot.error === 'no-key') return '该通道未配置 API Key，无法查询余额'
  if (snapshot?.source === 'snapshot' && snapshot.error === 'unauthorized') return '凭据被通道拒绝，无法查询余额'
  if (channel.status === 'off') return '凭据引用存在，Key 未填写'
  if (channel.costMode === 'none') return '本地端点，无余额查询接口'
  if (channel.costMode === 'free') return '该通道无余额查询接口（免费额度）'
  return '该通道暂无可查询的余额 / 配额接口'
}
