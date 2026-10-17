/**
 * 余额与配额：按通道展示官方余额快照与订阅窗口，卡片可展开看该通道近 30 天的模型单价表（`/rates`）。
 * 界面不维护任何价格；金额按工具条选的显示币种折算（汇率来自 `/fx`，折算收口在 currency.ts）。
 */
import { useEffect, useId, useState, type ReactNode } from 'react'
import { RATES_PATH, failureReasonOf, loadRates } from '../core/api.ts'
import { COST_MODE_KEYS, quotaBarColor, statusColorOf } from '../core/channels.ts'
import {
  convertsCurrencyOf, fxSummaryTextOf, rateTextOf, useCurrencyDisplay, DISPLAY_CURRENCY_SYMBOLS, type DisplayCurrency,
} from '../core/currency.ts'
import { fmtDateTime, fmtTokens, localTimeTextOf } from '../core/format.ts'
import { isEnglish, t, useT } from '../core/i18n.ts'
import { logWarn, requestOpenLog } from '../core/log.ts'
import { serverText } from '../core/serverText.ts'
import {
  LITELLM_REPO_URL, aggregateLoadedLabelOf, catalogStaleDays, costSourceHintOf, fetchedDaysAgo, hostOf,
  megabytesTextOf, shortCommitOf, COST_SOURCE_HINTS,
  type AggregateIssue, type CostSource, type ModelPriceAggregate, type PricingResponse,
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
  totalBalance: 'balance.total', topUpBalance: 'balance.credit', giftBalance: 'balance.grant', balance: 'balance.balance',
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
  model: 'source.model',
  none: 'source.none',
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
  /** 只渲染指定通道（总览的行内弹窗用）；不传则渲染全部通道。 */
  onlyProvider?: string
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
  const [showPricingInfo, setShowPricingInfo] = useState(false)
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})

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

  /**
   * 通道级失败原因进系统日志：页面每张卡片只留一行「本机快照 · 数据时间 + 本次查询未成功」，
   * 上游错误（含未配置 Key）摊在卡片里既挤又没人读，出问题时去日志窗按通道查。
   */
  useEffect(() => {
    for (const channel of props.channels) {
      if (channel.status === 'off') {
        logWarn('quota', t('quota.liveFailedShort') + ' · ' + channel.displayName, t('err.noApiKey'))
        continue
      }
      const snapshot = props.quotas.find((item) => item.provider === channel.provider) ?? null
      if (snapshot === null || snapshot.source === 'live' || !snapshot.supported || snapshot.error === null || snapshot.error === '') continue
      const stale = snapshot.updatedAt === null ? '' : t('q.snapshotPrefix') + fmtDateTime(snapshot.updatedAt)
      logWarn('quota', t('quota.liveFailedShort') + ' · ' + channel.displayName, errorTextOf(snapshot.error) + stale)
    }
    for (const provider of props.quotaOutcome?.providers ?? []) {
      if (provider.ok !== false) continue
      // 没有余额接口的通道（`supported: false`）插件根本没查过它，别记成「实时查询未成功」——
      // 那是配置事实，卡片上已经写了「无余额接口」，再往日志里写一条只会淹没真正的失败。
      const quota = props.quotas.find((item) => item.provider === provider.provider)
      if (quota !== undefined && !quota.supported) continue
      logWarn('quota', t('quota.liveFailedShort') + ' · ' + provider.provider, provider.error ?? t('quota.notQueried'))
    }
  }, [props.channels, props.quotas, props.quotaOutcome, t])

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

  return (
    <div>

      {catalogStale !== null && (
        <div className={quotaStyles.staleLine}>
          {t('quota.catalogStale', { days: catalogStale })}
        </div>
      )}

      

      <div className={quotaStyles.quotaList}>
        {props.channels.filter((channel) => props.onlyProvider === undefined || channel.provider === props.onlyProvider).map((channel, index) => {
          const snapshot = props.quotas.find((item) => item.provider === channel.provider) ?? null
          const outcome = props.quotaOutcome?.providers.find((item) => item.provider === channel.provider) ?? null
          const balance = snapshot?.balance ?? null
          const plan = snapshot?.plan ?? null
          const isLive = snapshot?.source === 'live'
          const windows = plan !== null && Array.isArray((plan as { windows?: unknown }).windows)
            ? (plan as { windows: Array<{ key?: unknown; percent?: unknown; resetsAt?: unknown }> }).windows
            : null
          const rateRows = rateRowsOf(channel.provider)
          const balanceView = balance === null ? null : balanceViewOf(balance)
          // 弹窗模式（只渲染一个通道）恒展开：详情弹窗里不留任何展开项
    const isOpen = props.onlyProvider !== undefined || expandedProviders[channel.provider] === true
          const drawerId = instanceId + '-rates-' + String(index)
          return (
            <div className={quotaStyles.quotaCard} key={channel.provider}>
              {/* 卡片头是真按钮：整行可点，键盘 Tab + Enter 也能展开 */}
              <button
                type="button"
                className={quotaStyles.quotaToggle}
                aria-expanded={props.onlyProvider === undefined ? isOpen : undefined}
                aria-controls={drawerId}
                title={t('quota.ratesHint')}
                onClick={props.onlyProvider === undefined ? () => setExpandedProviders((previous) => ({ ...previous, [channel.provider]: previous[channel.provider] !== true })) : undefined}
              >
                <span className={styles.statusDot} style={{ background: statusColorOf(channel.status) }} />
                <span className={quotaStyles.quotaTitle}>{channel.displayName}</span>
                <span className={quotaStyles.rateCount}>{rateCountTextOf(rateRows, ratesLoading, rates === null, failureReasonOf(RATES_PATH))}</span>
                {/* 右侧只留计费模式：通道 id 与左边显示名是同一件事，id 挪到 hover（排障要看时也有） */}
                <span className={quotaStyles.quotaProvider} title={channel.provider}>{t(COST_MODE_KEYS[channel.costMode] ?? 'ch.notQueried')}</span>
                {props.onlyProvider === undefined && <span className={quotaStyles.expandArrow} aria-hidden="true">{isOpen ? '▼' : '▶'}</span>}
              </button>


              {balanceView !== null && (
                <>
                  <div className={quotaStyles.balanceStrip}>
                    {balanceView.cards.map(([key, value]) => (
                      <div className={quotaStyles.balanceItem} key={key}>
                        <div className={quotaStyles.bsLabel}>{t(BALANCE_LABELS[key] ?? key)}</div>
                        <div className={quotaStyles.bsValue}>{String(value)}</div>
                      </div>
                    ))}
                  </div>
                  {balanceView.totalText === null ? null : <div className={quotaStyles.balanceTotal}>{balanceView.totalText}</div>}
                </>
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

              {/* 不是实时值时只留一个小标签：完整时间与原因在悬浮里，点击开日志（不摊在版面上） */}
              {!isLive && (
                <button
                  type="button"
                  className={quotaStyles.snapshotChip}
                  title={snapshotTitleOf(snapshot, outcome, channel)}
                  onClick={() => requestOpenLog()}
                >{t('quota.snapshotChip')}</button>
              )}

              {/* 单价抽屉：收起时保持空容器，aria-controls 指过来始终有效 */}
              <div id={drawerId} className={quotaStyles.rateDrawer}>
                {isOpen && (
                  <RateTable
                    rows={rateRows}
                    loading={ratesLoading}
                    failureText={rates === null ? (failureReasonOf(RATES_PATH) ?? t('quota.noResponse')) : null}
                    display={display.display}
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

/** 卡片头部的单价摘要：收起时也能看出有多少个模型、来源压在哪一层（默认档不占字）。 */
function rateCountTextOf(rows: ModelRateRow[], loading: boolean, failed: boolean, failureText: string | null): string {
  if (rows.length > 0) {
    const counts = new Map<string, number>()
    for (const row of rows) counts.set(row.source, (counts.get(row.source) ?? 0) + 1)
    const mix = [...counts.entries()]
      .filter(([source]) => source !== 'catalog' && source !== 'official')
      .map(([source, count]) => t(RATE_SOURCE_LABELS[source] ?? source) + ' ' + String(count))
      .join(' / ')
    // 来源全是默认档（catalog / official）时 mix 为空：不能再留一个悬空的分隔符
    return String(rows.length) + t('q.modelRatesCount') + (mix === '' ? '' : ' · ' + mix)
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
  const offPeakNow = props.rows.some((row) => row.offPeak === true)
  return (
    <>
      <div className={quotaStyles.rateHead}>
        {t('quota.priceUnit')}（{t('unit.perMillion')} · {DISPLAY_CURRENCY_SYMBOLS[props.display]}）
        {offPeakNow ? t('q.offPeakNow') : ''}
        {props.range === null ? '' : t('q.ratesRange')}
      </div>
      <div className={quotaStyles.rateScroll}>
        <div className={uiStyles.tableScroll}><table className={quotaStyles.rateTable}>
          <thead>
            <tr>
              <th>{t('m.model')}</th><th>{t('c.input')}</th><th>{t('c.cacheRead')}</th><th>{t('d.cacheWrite')}</th><th>{t('c.output')}</th>
              <th>{t('quota.sourceLabel')}</th><th>{t('quota.tokensColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => {
              const rates = row.rates
              const hasRates = rates !== null && typeof rates === 'object'
              const rowConverted = convertsCurrencyOf(row.currency)
              // 行币种与显示币种一致时不重复写一遍（这是常态），只有跨币种行才值得说
              const showCurrency = typeof row.currency === 'string' && row.currency !== '' && row.currency.toUpperCase() !== props.display
              const note = noteTextOf(row)
              return (
                <tr key={row.model}>
                  <td>
                    <div className={quotaStyles.rateModel}>{row.model}</div>
                    {showCurrency && (
                      <div className={quotaStyles.rateConverted}>
                        {t('q.currencyLabel', { value: row.currency ?? '' })}
                        {rowConverted ? ' → ' + DISPLAY_CURRENCY_SYMBOLS[props.display] : ''}
                      </div>
                    )}
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
                        {note !== '' ? note : noRateTextOf(row.source)}
                      </td>
                    )}
                  {/* 长口径不占列：放进来源格的 hover，表格宽度也就够用了 */}
                  <td title={note === '' ? undefined : note}>
                    {row.source === 'none'
                      ? <span className={quotaStyles.rateSourceNone} title={costSourceHintOf('none', row.partial)}>{t('q.noBasis')}</span>
                      : <CostSourceChip source={row.source} partial={row.partial} />}
                  </td>
                  <td>{fmtTokens(typeof row.tokens === 'number' && Number.isFinite(row.tokens) ? row.tokens : 0)}</td>
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
                {issueTextOf(issue)}
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
                  {issueTextOf(issue)}
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
    [t('cso.model'), coverage.modelModels],
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

/** 价目说明：中文原文只在中文模式显示；英文模式改成指向界面已有的费率 / 来源 / 日期。 */
function noteTextOf(row: { note?: string | null; noteEn?: string | null }): string {
  const note = row.note ?? ''
  if (isEnglish()) {
    const english = row.noteEn ?? ''
    if (english !== '') return english
    if (/[\u4e00-\u9fa5]/.test(note)) return t('srv.rateNoteEn')
  }
  return note === '' ? '' : serverText(note)
}

/** 快照 issue：kind 机器可读，英文模式按 kind 渲染；中文模式保留服务端原文（含路径与数字）。 */
function issueTextOf(issue: { kind?: string; message: string }): string {
  if (!isEnglish() || issue.kind === undefined) return issue.message
  const english = t('issue.' + issue.kind)
  return english === 'issue.' + issue.kind ? issue.message : english
}

/** 非实时值的小标签悬浮说明：数据时间 + 这次查询的结果或原因（原因不摊在版面上）。 */
function snapshotTitleOf(snapshot: QuotaProvider | null, outcome: SnapshotQuotaOutcome['providers'][number] | null, channel: Channel): string {
  const capturedAt = outcome !== null && outcome.capturedAt !== null ? localTimeTextOf(outcome.capturedAt) : null
  const fallbackTime = snapshot !== null && snapshot.updatedAt !== null ? fmtDateTime(snapshot.updatedAt) : null
  const time = capturedAt ?? fallbackTime ?? t('quota.unknown')
  return t('quota.snapshotAt', { time })
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

/**
 * 余额卡片：总余额 = 充值 + 赠送时它是派生值，不再单列一张卡；币种不单独占卡，并进值里。
 * 拿不到这三项（别的通道返回形状不同）时退回原样，保证任何形状都不会把余额整块吞掉。
 */
function balanceViewOf(balance: Record<string, unknown>): { cards: Array<[string, unknown]>; totalText: string | null } {
  const entries = orderedBalanceEntries(balance)
  const valueOf = (key: string): number | null => {
    const hit = entries.find(([entryKey]) => entryKey === key)
    return hit !== undefined && typeof hit[1] === 'number' ? hit[1] : null
  }
  const currency = typeof balance.currency === 'string' && balance.currency !== '' ? balance.currency : ''
  const total = valueOf('totalBalance')
  const credit = valueOf('topUpBalance')
  const grant = valueOf('giftBalance')
  const withoutCurrency = entries.filter(([key]) => key !== 'currency')
  if (withoutCurrency.length === 0) return { cards: entries, totalText: null }
  const withCurrency = (value: unknown): string => String(value) + (currency === '' ? '' : ' ' + currency)
  if (total !== null && credit !== null && grant !== null && Math.abs(credit + grant - total) <= 0.02) {
    return {
      cards: withoutCurrency.filter(([key]) => key !== 'totalBalance'),
      totalText: t('balance.totalInline', { value: withCurrency(total) }),
    }
  }
  // 总余额不是派生值（或压根没有）：保留卡片，把币种挂到总余额 / 第一张卡的值上
  let currencyPlaced = false
  const cards = withoutCurrency.map(([key, value]) => {
    if (key === 'totalBalance' || (!currencyPlaced && total === null && !entries.some(([entryKey]) => entryKey === 'totalBalance'))) {
      currencyPlaced = true
      return [key, withCurrency(value)] as [string, unknown]
    }
    return [key, value] as [string, unknown]
  })
  return { cards, totalText: null }
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
