/**
 * 额度与订阅：按通道渲染等高卡片（订阅窗口 / 余额 / 通道事实各三行），标题行可展开该通道近 30 天模型单价表。
 * 界面不维护任何价格；金额按设置里选的显示币种折算（汇率来自 `/fx`，折算收口在 currency.ts）。
 */
import { useEffect, useId, useState, type ReactNode } from 'react'
import { RATES_PATH, failureReasonOf, loadRates } from '../core/api.ts'
import { COST_MODE_TAG_KEYS, quotaBarColor, statusColorOf, WINDOW_TAG_KEYS } from '../core/channels.ts'
import {
  DISPLAY_CURRENCY_SYMBOLS, moneyTextOf, rateTextOf, rowMoneyViewOf, useCurrencyDisplay, type DisplayCurrency,
} from '../core/currency.ts'
import { fmtCount, fmtDateTime, fmtTokens } from '../core/format.ts'
import { isEnglish, t, useT } from '../core/i18n.ts'
import { logWarn } from '../core/log.ts'
import { serverText } from '../core/serverText.ts'
import { costSourceHintOf, COST_SOURCE_HINTS, type CostSource } from '../core/pricing.ts'
import type { Channel, ChannelRates, ModelRateRow, QuotaProvider, RatesResponse, SnapshotQuotaOutcome } from '../core/types.ts'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import styles from '../styles/shared.module.css'
import quotaStyles from '../styles/quota.module.css'
import uiStyles from '../styles/ui.module.css'

/** 余额字段展示顺序（未收录字段按原键名追加在后）。 */
const BALANCE_ORDER = ['totalBalance', 'topUpBalance', 'giftBalance', 'balance', 'currency']
const BALANCE_LABELS: Record<string, string> = {
  totalBalance: 'balance.total', topUpBalance: 'balance.credit', giftBalance: 'balance.grant', balance: 'balance.balance',
}
const WINDOW_ORDER = ['5h', 'week', 'month', 'day']

/** 卡片正文的一行：订阅窗口行（带进度条）或键值行；每张卡固定三行。 */
type CardRow =
  | { kind: 'window'; key: string; label: string; percent: number; reset: string }
  /** number：金额这类主数字用大字号（百分比在窗口行里单独放） */
  | { kind: 'line'; key: string; label: string; value: string; number?: boolean }

/** 一张卡片：标题行（通道名 + 类型胶囊 + 更新时间）与三行正文。 */
interface QuotaCard {
  key: string
  title: string
  kindText: string
  /** 右侧更新时间：实时查到写「刚查」，回落到快照时给数据时间，没查过给 —。 */
  checkedText: string
  /** 告警色只在状态不是正常时出现（正常不占版面）。 */
  statusColor: string | null
  rows: CardRow[]
  /** 能展开单价表的通道；null = 没有单价表可接（未计价汇总卡）。 */
  provider: string | null
  /** 排序档：有实时窗口的卡在前、余额次之、通道事实最后（同档保持通道配置顺序）。 */
  rank: number
}

/** 单价表里 `source: 'none'` 的模型按通道归组（未计价卡的模型清单）。 */
interface UnpricedEntry {
  provider: string
  label: string
  models: string[]
}

export function QuotaTab(props: {
  channels: Channel[]
  quotas: QuotaProvider[]
  /** 配额执行结果：哪个通道这次查到实时值、展示值时间与失败原因（用来标「本机快照 + 数据时间」）。 */
  quotaOutcome: SnapshotQuotaOutcome | null
  /** 只渲染指定通道（总览的行内弹窗用）；不传则渲染全部通道。 */
  onlyProvider?: string
  /** 价目版本号：刷新价目后单价表与用量口径都要重取。 */
  reloadToken: number
  /** 刷新价目成功后通知页面重取 /pricing 与用量（成本整体重算）。 */
  onPricingReload: () => void
  /** 点卡片标题时打开「通道明细」弹窗（整页模式用）；不传则退回原地在卡片下方展开。 */
  onOpenProvider?: (provider: string) => void
}): ReactNode {
  /** 取词：宿主切语言时重渲染（模块级辅助函数直接用 import 的 t） */
  const t = useT()
  // 单价表 id 逐实例唯一：同一页渲染两份时写死字符串会撞 id，aria-controls 会指到别处
  const instanceId = useId()
  const display = useCurrencyDisplay()

  const [rates, setRates] = useState<RatesResponse | null>(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
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
   * 通道级失败原因进系统日志：卡片上只留更新时间，上游错误（含未配置 Key）摊在卡片里既挤又没人读，
   * 出问题时去日志窗按通道查。
   */
  useEffect(() => {
    const failed: string[] = []
    for (const channel of props.channels) {
      if (channel.status === 'off') {
        failed.push(channel.displayName + '（未配置 Key）')
        continue
      }
      const snapshot = props.quotas.find((item) => item.provider === channel.provider) ?? null
      if (snapshot === null || snapshot.source === 'live' || !snapshot.supported || snapshot.error === null || snapshot.error === '') continue
      failed.push(channel.displayName)
    }
    for (const provider of props.quotaOutcome?.providers ?? []) {
      if (provider.ok !== false) continue
      const quota = props.quotas.find((item) => item.provider === provider.provider)
      if (quota !== undefined && !quota.supported) continue
      failed.push(provider.provider)
    }
    // 每次打开聚合一条，而不是每个通道一条：失败原因在卡片 / 系统日志里都能查到
    if (failed.length > 0) logWarn('quota', t('quota.liveFailedShort') + ' · ' + String(failed.length) + ' 个通道', failed.join('、'))
  }, [props.channels, props.quotas, props.quotaOutcome, t])

  const rateChannels: ChannelRates[] = Array.isArray(rates?.channels) ? rates.channels : []
  const rateRowsOf = (provider: string): ModelRateRow[] => {
    const entry = rateChannels.find((item) => item.provider === provider)
    return entry === undefined || !Array.isArray(entry.models) ? [] : entry.models
  }
  // 通道显隐由页头的全局「通道」筛选决定，本页不再自带筛选条
  const unpricedEntries = unpricedEntriesOf(rateChannels)

  const shown = props.onlyProvider === undefined
    ? props.channels
    : props.channels.filter((channel) => channel.provider === props.onlyProvider)
  // 有实时数据的卡排前面：订阅窗口 > 余额 > 通道事实；同档保持通道配置顺序
  const cards: QuotaCard[] = shown
    .map((channel) => channelCardOf(
      channel,
      props.quotas.find((item) => item.provider === channel.provider) ?? null,
      unpricedCountOf(unpricedEntries, channel.provider),
    ))
    .sort((first, second) => first.rank - second.rank)
  // 未计价汇总卡只在整页出现：弹窗只讲一个通道，跨通道汇总放进去没有意义
  // 弹窗模式（只渲染一个通道）恒展开：详情弹窗里不留任何展开项
  const openProvider = props.onlyProvider ?? expandedProvider
  const openChannel = shown.find((channel) => channel.provider === openProvider) ?? null
  const drawerId = instanceId + '-rates'

  return (
    <div>
      <div className={[quotaStyles.cardGrid, props.onlyProvider === undefined ? '' : quotaStyles.cardGridSingle].join(' ').trim()}>
        {cards.map((card) => (
          <div className={quotaStyles.chanCard} key={card.key}>
            {card.provider !== null && props.onlyProvider === undefined
              ? (
                <button
                  type="button"
                  className={quotaStyles.chanHead + ' ' + quotaStyles.chanHeadButton}
                  aria-expanded={openProvider === card.provider}
                  aria-controls={openProvider === card.provider ? drawerId : undefined}
                  title={t('quota.ratesHint')}
                  onClick={() => {
                    if (props.onOpenProvider !== undefined) props.onOpenProvider(card.provider as string)
                    else setExpandedProvider((previous) => (previous === card.provider ? null : card.provider))
                  }}
                >
                  {cardHeadOf(card)}
                </button>
              )
              : <div className={quotaStyles.chanHead}>{cardHeadOf(card)}</div>}
            <div className={quotaStyles.chanBody}>
              {card.rows.map((row) => <CardRowView row={row} key={row.key} />)}
            </div>
          </div>
        ))}
      </div>
      {props.channels.length === 0 && <div className={styles.empty}>{t('o.noChannels')}</div>}

      {openChannel !== null && (
        <div id={drawerId} className={quotaStyles.ratePanel}>
          <div className={quotaStyles.ratePanelHead}>
            <b className={quotaStyles.ratePanelTitle}>{openChannel.displayName}</b>
            {props.onlyProvider === undefined && (
              <button type="button" className={quotaStyles.ratePanelClose} onClick={() => setExpandedProvider(null)}>{t('dist.hideTable')}</button>
            )}
          </div>
          <RateTable
            rows={rateRowsOf(openChannel.provider)}
            loading={ratesLoading}
            failureText={rates === null ? (failureReasonOf(RATES_PATH) ?? t('quota.noResponse')) : null}
            display={display.display}
            range={rates !== null && typeof rates.from === 'string' && typeof rates.to === 'string'
              ? { from: rates.from, to: rates.to }
              : null}
          />
        </div>
      )}
    </div>
  )
}

/** 标题行：通道名 + 类型胶囊 + 右侧更新时间（告警色只在异常时出现）。 */
function cardHeadOf(card: QuotaCard): ReactNode {
  return (
    <>
      {card.statusColor === null ? null : <span className={styles.statusDot} style={{ background: card.statusColor }} />}
      <span className={quotaStyles.chanName} title={card.title}>{card.title}</span>
      <span className={quotaStyles.chanKind}>{card.kindText}</span>
      <span className={quotaStyles.chanChecked}>{card.checkedText}</span>
    </>
  )
}

/** 正文一行：窗口行是「标签 + 固定宽度进度条 + 百分比 + 重置时间」，其余是左标签右值。 */
function CardRowView(props: { row: CardRow }): ReactNode {
  const row = props.row
  if (row.kind === 'window') {
    const percent = Math.max(0, Math.min(100, Math.round(row.percent)))
    return (
      <div className={quotaStyles.windowLine}>
        <div className={quotaStyles.windowTop}>
          <span className={quotaStyles.windowName}>{row.label}</span>
          <span className={quotaStyles.windowPercent}>{percent}%</span>
          <span className={quotaStyles.windowReset} title={t('quota.resetAt')}>{t('quota.resetPrefix')}{row.reset}</span>
        </div>
        <span className={quotaStyles.meter}><i style={{ width: percent + '%', background: quotaBarColor(percent) }} /></span>
      </div>
    )
  }
  return (
    <div className={quotaStyles.cardLine}>
      <span className={quotaStyles.lineKey}>{row.label}</span>
      <span className={row.number === true ? quotaStyles.lineValue + ' ' + quotaStyles.lineValueNumber : quotaStyles.lineValue}>{row.value}</span>
    </div>
  )
}

/**
 * 通道卡：有订阅窗口先给三个窗口（进度条只属于窗口占用，余额不是进度）；其次余额三行；
 * 都没有时给三行通道事实（额度 / 端点 / 联网 / 成员），不写任何解释性长句。
 */
function channelCardOf(channel: Channel, snapshot: QuotaProvider | null, unpricedCount: number): QuotaCard {
  const base = {
    key: channel.provider,
    provider: channel.provider,
    title: channel.displayName,
    kindText: t(COST_MODE_TAG_KEYS[channel.costMode] ?? 'ch.notQueried'),
    checkedText: checkedTextOf(snapshot),
    statusColor: channel.status === 'ok' ? null : statusColorOf(channel.status),
  }
  const windowRows = windowRowsOf(snapshot)
  if (windowRows.length > 0) return { ...base, rows: windowRows, rank: 0 }
  const moneyRows = moneyRowsOf(snapshot?.balance ?? null)
  if (moneyRows.length > 0) return { ...base, rows: moneyRows, rank: 1 }
  return { ...base, rows: metaRowsOf(channel, unpricedCount), rank: 2 }
}

/** 订阅窗口正文：固定三行（多给的窗口截掉，缺的窗口不补假数据）。 */
function windowRowsOf(snapshot: QuotaProvider | null): CardRow[] {
  const windows = windowsOf(snapshot)
  if (windows === null) return []
  return windows.slice(0, 3).map((window) => ({
    kind: 'window',
    key: window.key,
    label: t(WINDOW_TAG_KEYS[window.key] ?? window.key),
    percent: window.percent,
    reset: resetTextOf(window.resetsAt),
  }))
}

/** 订阅窗口：按 5h / 本周 / 本月排序，识别不出键的排最后；没有窗口返回 null。 */
function windowsOf(snapshot: QuotaProvider | null): Array<{ key: string; percent: number; resetsAt: unknown }> | null {
  const plan = snapshot?.plan
  if (plan === null || plan === undefined) return null
  const raw = (plan as { windows?: unknown }).windows
  if (!Array.isArray(raw)) return null
  const windows: Array<{ key: string; percent: number; resetsAt: unknown }> = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    const key = typeof record.key === 'string' ? record.key : ''
    if (key === '') continue
    windows.push({
      key,
      percent: typeof record.percent === 'number' && Number.isFinite(record.percent) ? record.percent : 0,
      resetsAt: record.resetsAt,
    })
  }
  if (windows.length === 0) return null
  return windows.sort((first, second) => windowOrderOf(first.key) - windowOrderOf(second.key))
}

function windowOrderOf(key: string): number {
  const index = WINDOW_ORDER.indexOf(key)
  return index < 0 ? WINDOW_ORDER.length : index
}

/** 重置时间：本地 `YYYY-MM-DD HH:mm`；解析不出来的原样给出（服务端已做过 epoch 归一）。 */
function resetTextOf(value: unknown): string {
  if (typeof value !== 'string' || value === '') return '—'
  const time = new Date(value)
  return Number.isNaN(time.getTime()) ? value : fmtDateTime(time.getTime())
}

/** 标题行右侧的更新时间：实时值写「刚查」，回落到快照时写数据时间，没查到过写 —。 */
function checkedTextOf(snapshot: QuotaProvider | null): string {
  if (snapshot === null) return '—'
  if (snapshot.source === 'live') return t('quota.justChecked')
  const time = snapshot.updatedAt ?? snapshot.fetchedAt
  return time === null ? '—' : fmtDateTime(time)
}

/** 余额正文：总余额 / 充值 / 赠送（最多三行）同字号同格式，金额走显示币种折算的唯一收口。 */
function moneyRowsOf(balance: Record<string, unknown> | null): CardRow[] {
  if (balance === null) return []
  const currency = typeof balance.currency === 'string' && balance.currency !== '' ? balance.currency : null
  const rows: CardRow[] = []
  for (const [key, value] of orderedBalanceEntries(balance)) {
    const amount = typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN
    if (!Number.isFinite(amount)) continue
    rows.push({ kind: 'line', key, label: t(BALANCE_LABELS[key] ?? key), value: moneyTextOf(currency, amount), number: true })
    if (rows.length === 3) break
  }
  return rows
}

/** 通道事实正文：额度 / 端点 / 联网 / 成员里取三行，值都来自通道配置与近 30 天价目命中情况。 */
function metaRowsOf(channel: Channel, unpricedCount: number): CardRow[] {
  const baseURL = typeof channel.baseURL === 'string' ? channel.baseURL : ''
  const local = isLocalEndpointOf(baseURL)
  const endpointRow: CardRow = {
    kind: 'line',
    key: 'endpoint',
    label: t('quota.endpoint'),
    value: baseURL === '' ? '—' : local ? t('quota.local') : t('quota.remote'),
  }
  const networkRow: CardRow = {
    kind: 'line',
    key: 'network',
    label: t('quota.network'),
    value: baseURL === '' ? '—' : local ? t('quota.offline') : t('quota.online'),
  }
  if (channel.status === 'off') {
    return [{ kind: 'line', key: 'quota', label: t('quota.quotaLabel'), value: t('err.noApiKey') }, endpointRow, networkRow]
  }
  if (channel.costMode === 'free') {
    return [
      { kind: 'line', key: 'quota', label: t('quota.quotaLabel'), value: t('quota.free') },
      { kind: 'line', key: 'unpriced', label: t('quota.unpriced'), value: fmtCount(unpricedCount) + t('common.modelSuffix') },
      endpointRow,
    ]
  }
  return [
    endpointRow,
    networkRow,
    { kind: 'line', key: 'members', label: t('quota.members'), value: fmtCount(channel.models.length) + t('common.modelSuffix') },
  ]
}

function isLocalEndpointOf(baseURL: string): boolean {
  return baseURL.includes('127.0.0.1') || baseURL.includes('localhost') || baseURL.includes('0.0.0.0')
}

/** 未计价模型按通道归组（标题与清单都取服务端下发的通道显示名）。 */
function unpricedEntriesOf(entries: ChannelRates[]): UnpricedEntry[] {
  const result: UnpricedEntry[] = []
  for (const entry of entries) {
    const models = entry.models.filter((row) => row.source === 'none').map((row) => row.model)
    if (models.length === 0) continue
    result.push({ provider: entry.provider, label: entry.label === '' ? entry.provider : entry.label, models })
  }
  return result
}

function unpricedCountOf(entries: UnpricedEntry[], provider: string): number {
  return entries.find((entry) => entry.provider === provider)?.models.length ?? 0
}

function modelListTextOf(models: string[]): string {
  const shown = models.slice(0, 3).join(' / ')
  if (models.length <= 3) return shown
  return shown + t('sh.morePrefix') + fmtCount(models.length - 3) + t('sh.moreSuffix')
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
              <th>{t('quota.tokensColumn')}</th><th>{t('c.cost')}</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => {
              const rates = row.rates
              const hasRates = rates !== null && typeof rates === 'object'
              const note = noteTextOf(row)
              // 有价目依据才有金额（服务端不猜）：null / 缺失一律按「无依据」呈现
              const costView = typeof row.cost === 'number' && Number.isFinite(row.cost)
                ? rowMoneyViewOf({ cost: row.cost, costsByCurrency: row.costCurrency === null ? undefined : { [row.costCurrency]: row.cost } })
                : null
              return (
                <tr key={row.model}>
                  <td>
                    <div className={quotaStyles.rateModel}>{row.model}</div>
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
                  <td>{fmtTokens(typeof row.tokens === 'number' && Number.isFinite(row.tokens) ? row.tokens : 0)}</td>
                  {/* 长口径不占列：放进成本格的 hover，表格宽度也就够用了 */}
                  <td title={note === '' ? undefined : note}>
                    {costView === null
                      ? <span className={quotaStyles.rateSourceNone} title={costSourceHintOf('none', row.partial)}>{t('q.noBasis')}</span>
                      : <>{costView.text}<CostSourceChip source={row.source} partial={row.partial} /></>}
                  </td>
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
