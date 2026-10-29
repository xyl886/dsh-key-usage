/**
 * 总览：KPI 卡片行 + 使用趋势（「全部」看全年热力图，其余范围看柱状图）+ 项目 / 模型排行 + 按时段热力。
 * 按原型不再列通道表：通道余额与配额在「额度与订阅」，这里只留结论。
 * KPI 口径跟随页头范围：近 30 天取 `summary` 的月列（官方账单），其余范围取 `usage.totals`（同一窗口）；
 * 拿不到的字段一律显示 —，不编造，也不把两个窗口的数字拼进同一张卡。
 */
import { useState, type ReactNode } from 'react'
import { channelColorOf, displayNameOf } from '../core/channels.ts'
import { comparableMoneyOf, displaySymbolOf, moneyTextOf, moneyTotalsTextOf, rowMoneyViewOf, useCurrencyDisplay, type CostRowLike } from '../core/currency.ts'
import { fmtCalls, fmtShortDate, fmtTokens, isoDate, shiftedIsoDate } from '../core/format.ts'
import { t, useT } from '../core/i18n.ts'
import { TipBar, TipRow, TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import type {
  Channel,
  DaySummary,
  HeatmapDay,
  ModelAggregateRow,
  ModelsResponse,
  ProjectRow,
  ProjectsResponse,
  QuotaProvider,
  SessionsResponse,
  SummaryResponse,
  UsageResponse,
  UsageTotals,
  WeekdayHours,
} from '../core/types.ts'
import { LEVEL_COLORS, YearHeatmap, levelColorOf, levelOfValue, levelThresholds } from '../components/Heatmap.tsx'
import type { RangeKey } from './DetailTab.tsx'
import shared from '../styles/shared.module.css'
import styles from '../styles/overview.module.css'

/** 使用趋势的指标：热力强度与柱高都按它取逐日值。 */
type TrendMetric = 'activity' | 'tokens' | 'outTokens' | 'cacheRead' | 'sessions' | 'cost'

const TREND_METRICS: Array<[TrendMetric, string]> = [
  ['activity', 'overview.mActivity'],
  ['tokens', 'overview.mTokens'],
  ['outTokens', 'overview.mOutTokens'],
  ['cacheRead', 'overview.mCacheRead'],
  ['sessions', 'overview.mSessions'],
  ['cost', 'overview.mSpend'],
]

type ProjectMetric = 'cost' | 'tokens' | 'sessions'

const PROJECT_METRICS: Array<[ProjectMetric, string]> = [
  ['cost', 'overview.mCost'],
  ['tokens', 'overview.mTokens'],
  ['sessions', 'overview.mSessions'],
]

type ModelMetric = 'cost' | 'tokens' | 'cacheHit'

const MODEL_METRICS: Array<[ModelMetric, string]> = [
  ['cost', 'overview.mCost'],
  ['tokens', 'overview.mTokens'],
  ['cacheHit', 'overview.kpiCache'],
]

type HourMetric = 'sessions' | 'tokens' | 'cost'

const HOUR_METRICS: Array<[HourMetric, string]> = [
  ['sessions', 'overview.mSessions'],
  ['tokens', 'overview.mTokens'],
  ['cost', 'overview.mSpend'],
]

/** 周一到周日的标签键（`h.wd0` 是周日）。 */
const WEEKDAY_KEYS = ['h.wd1', 'h.wd2', 'h.wd3', 'h.wd4', 'h.wd5', 'h.wd6', 'h.wd0']

/** 排行面板最多列出的行数，其余收进「还有 M 个」。 */
const RANK_ROWS = 5

/** 柱状图横轴最多标注几个日期。 */
const BAR_TICKS = 8

interface TrendDay {
  date: string
  tokens: number
  /** 调用次数；没有按天明细时为 null */
  calls: number | null
  outTokens: number | null
  cacheRead: number | null
  cost: number | null
}

export interface OverviewTabProps {
  channels: Channel[]
  summary: SummaryResponse | null
  /** 保留给父级：总览不再列通道表，余额与配额走「额度与订阅」。 */
  quotas: QuotaProvider[]
  heatmap: HeatmapDay[]
  tooltip: TooltipApi
  /** 保留给父级：见上 */
  onOpenDetail: (provider: string) => void
  /** 保留给父级：见上 */
  onOpenChannel: (provider: string) => void
  /** 点热力图某天：切到「使用明细」并定位到那一天 */
  onPickDay: (date: string) => void
  /** 当前范围：`total` 画全年热力图，其余画柱状图。没传时按近 30 天（与外壳的默认范围一致）。 */
  range?: RangeKey
  /**
   * 当前范围的每日明细与合计：非近 30 天的 KPI、活跃度 / 输出 / 缓存读 / 费用都靠它。
   * 不传时这些位置显示 — 或空态（不拿别的窗口的数据顶替）。
   */
  usage?: UsageResponse | null
  /** 项目排行。 */
  projects?: ProjectsResponse | null
  /** 会话段：只用来数「本期有多少会话」；不传时会话 KPI 显示 —（不拿全部会话数冒充本期）。 */
  sessions?: SessionsResponse | null
  /** 模型排行。 */
  models?: ModelsResponse | null
  /** heatmap 段的 `hourly`（周一 1 … 周日 7 × 24 小时的调用数）：旧服务端没有这一项，按可选处理。 */
  hourly?: WeekdayHours[] | null
  /** 上期成本（显示币种金额）：服务端没有这个字段，不传时副标题显示 —。 */
  previousCost?: number | null
  /** 上期会话数：同上。 */
  previousSessions?: number | null
}

export function OverviewTab(props: OverviewTabProps): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  /** 订阅显示币种与汇率：金额随它重渲染（汇率与币种在设置弹窗里改）。 */
  const { display } = useCurrencyDisplay()
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('activity')
  const [projectMetric, setProjectMetric] = useState<ProjectMetric>('cost')
  const [modelMetric, setModelMetric] = useState<ModelMetric>('cost')
  const [hourMetric, setHourMetric] = useState<HourMetric>('sessions')

  const range: RangeKey = props.range ?? 'month'
  const summary = props.summary

  // ===== KPI：近 30 天那一列（summary 的第二列，有官方账单）=====
  const isMonthRange = range === 'month'
  const monthRows = summary === null ? [] : summary.channels.map((row) => row.month)
  const monthCost = monthCostTotalsOf(summary)
  const monthTokens = monthRows.reduce((total, row) => total + row.tokens, 0)
  const monthFrom = summary === null ? null : summary.range.monthFrom
  const monthTo = summary === null ? null : summary.range.today
  const activeDaysOfMonth = monthFrom === null || monthTo === null
    ? 0
    : props.heatmap.filter((day) => day.date >= monthFrom && day.date <= monthTo).length

  // ===== KPI：其余范围整行改由 usage.totals 算，一行里不混两个窗口 =====
  const rangeTotals = isMonthRange ? null : rangeTotalsOf(props.usage, range)
  /** 入 / 出拆分与缓存读：近 30 天借 `usage.totals`（与 summary 同窗口），其余范围就是当前范围的合计。 */
  const splitTotals: UsageTotals | null = isMonthRange ? (props.usage?.totals ?? null) : rangeTotals
  const costRow: CostRowLike | null = isMonthRange
    ? (summary === null ? null : monthCost)
    : (rangeTotals === null ? null : { cost: rangeTotals.cost, costsByCurrency: rangeTotals.costsByCurrency })
  const costAmount = costRow === null ? null : comparableMoneyOf(costRow)
  const tokenCount = isMonthRange
    ? (summary === null ? null : monthTokens)
    : (rangeTotals === null ? null : rangeTotals.inputTokens + rangeTotals.outputTokens + rangeTotals.cacheReadTokens)
  const tokenValue = tokenCount === null ? null : tokenValueOf(tokenCount)
  const hitRate = hitRateOf(splitTotals)
  const cacheSaved = splitTotals === null || splitTotals.cacheSaved == null
    ? null
    : moneyTotalsTextOf({ cost: splitTotals.cacheSaved, costsByCurrency: splitTotals.cacheSavedByCurrency })
  const activeDays = isMonthRange ? activeDaysOfMonth : usageDayCountOf(props.usage, range)
  const dailyAverage = costAmount === null || activeDays === 0 ? null : costAmount / activeDays
  const sessionCount = isMonthRange
    ? sessionCountOf(props.sessions, monthFrom)
    : sessionCountOf(props.sessions, sessionFromOf(range))

  // ===== 使用趋势 =====
  const isAllRange = range === 'total'
  const trendDays = trendDaysOf(props.usage, props.heatmap)
  /** 活跃度只认按天调用数：`heatmap` 段没有这一项时该档不画柱（不拿 token 量冒充调用数）。 */
  const hasDailyCalls = trendDays.some((day) => day.calls !== null)
  const rangeWindow = windowOfRange(range)
  /** 自定义范围的真实起止只有父级知道：没给 usage 时宁可不画，也不拿一整年数据冒充某段自定义范围。 */
  const lacksCustomWindow = range === 'custom' && props.usage == null
  const barDays = lacksCustomWindow || rangeWindow === null
    ? trendDays
    : trendDays.filter((day) => day.date >= rangeWindow.from && day.date <= rangeWindow.to)
  const barValues = barDays.map((day) => metricValueOf(trendMetric, day))
  const hasBarData = barValues.some((value) => value !== null && value > 0)
  const heatValues = new Map<string, number>()
  for (const day of trendDays) {
    const value = metricValueOf(trendMetric, day)
    if (value !== null && value > 0) heatValues.set(day.date, value)
  }
  const hasHeatData = heatValues.size > 0
  /** 趋势空态：活跃度缺按天调用数时讲清原因，不给笼统的「暂无数据」。 */
  const trendEmptyText = trendMetric === 'activity' && !hasDailyCalls ? t('overview.noCalls') : t('overview.noData')
  const drawnDates = isAllRange ? [...heatValues.keys()] : barDays.filter((_, index) => (barValues[index] ?? 0) > 0).map((day) => day.date)
  const drawnValues = isAllRange ? [...heatValues.values()] : barValues.filter((value): value is number => value !== null && value > 0)
  const busiest = busiestOf(drawnDates, drawnValues)
  const trendStats = [
    drawnDates.length > 0 ? t('overview.streak', { count: streakOf(drawnDates) }) : null,
    busiest === null ? null : t('overview.busiest', { date: fmtShortDate(busiest.date), value: metricTextOf(trendMetric, busiest.value) }),
    drawnDates.length > 0 ? t('overview.activeDays', { count: drawnDates.length }) : null,
  ].filter((part): part is string => part !== null).join(' · ')
  const heatmapByDate = new Map(props.heatmap.map((day) => [day.date, day]))
  const dataStart = props.heatmap.length > 0 ? props.heatmap[0].date : null

  /** 热力图悬停：先讲当前指标的值，Tokens 类指标再补逐模型占比（模型构成只有 tokens 口径）。 */
  const tipOfDay = (date: string): ReactNode => {
    const value = heatValues.get(date)
    if (value === undefined) {
      const covered = dataStart !== null && date >= dataStart
      return <><TipTitle>{date}</TipTitle><TipSub>{covered ? t('h.noUsage') : t('h.noLedger')}</TipSub></>
    }
    const day = heatmapByDate.get(date)
    const withModels = trendMetric === 'activity' || trendMetric === 'tokens'
    return (
      <>
        <TipTitle>{date}</TipTitle>
        <TipSub>{t(labelKeyOf(TREND_METRICS, trendMetric))} <b>{metricTextOf(trendMetric, value)}</b></TipSub>
        {withModels && day !== undefined && day.models.map((model) => {
          const percent = day.totalTokens > 0 ? Math.round(model.totalTokens / day.totalTokens * 100) : 0
          const color = channelColorOf(props.channels, model.provider)
          return (
            <div key={model.provider + '|' + model.model}>
              <TipRow
                color={color}
                label={<>{model.model}<span className={shared.dim}> · {displayNameOf(props.channels, model.provider)}</span></>}
                amount={fmtTokens(model.totalTokens)}
                rate={percent + '%'}
              />
              <TipBar percent={percent} color={color} />
            </div>
          )
        })}
      </>
    )
  }

  const barTipOf = (date: string, value: number | null): ReactNode => (
    <>
      <TipTitle>{date}</TipTitle>
      <TipSub>{t(labelKeyOf(TREND_METRICS, trendMetric))} <b>{value === null ? '—' : metricTextOf(trendMetric, value)}</b></TipSub>
    </>
  )

  // ===== 项目 / 模型排行 =====
  const projectItems = rankItemsOfProjects(props.projects, projectMetric)
  const modelItems = rankItemsOfModels(props.models, modelMetric)

  // ===== 按时段 =====
  const hourMatrix = hourlyMatrixOf(props.hourly)
  const hourValues = hourMatrix === null
    ? null
    : hourMatrix.map((weekday) => weekday.map((cell) => hourMetricValueOf(hourMetric, cell)))
  const hourActiveValues = hourValues === null
    ? []
    : hourValues.flat().filter((value): value is number => value !== undefined && value > 0)
  const hasHourData = hourActiveValues.length > 0
  const hourThresholds = levelThresholds(hourActiveValues)
  const busiestHour = busiestHourOf(hourValues)

  return (
    <div className={styles.stack}>
      <div className={styles.kpiRow}>
        <KpiCard
          label={t('overview.kpiCost')}
          value={costRow === null ? '—' : moneyTotalsTextOf(costRow)}
          detail={<PrevLine previous={props.previousCost ?? null} current={costAmount} format={(value) => moneyTextOf(display, value)} />}
        />
        <KpiCard
          label={t('overview.kpiTokens')}
          value={tokenValue === null ? '—' : tokenValue.text}
          unit={tokenValue === null || tokenValue.unit === '' ? undefined : tokenValue.unit}
          detail={splitTotals === null
            ? '—'
            : t('overview.ioSplit', { input: fmtTokens(splitTotals.inputTokens), output: fmtTokens(splitTotals.outputTokens) })}
        />
        <KpiCard
          label={t('overview.kpiCache')}
          value={hitRate === null ? '—' : hitRate.toFixed(1)}
          unit={hitRate === null ? undefined : '%'}
          detail={splitTotals === null
            ? '—'
            : t('overview.cacheLine', { value: fmtTokens(splitTotals.cacheReadTokens), saved: cacheSaved ?? '—' })}
        />
        <KpiCard
          label={t('overview.kpiSessions')}
          value={sessionCount === null ? '—' : fmtCalls(sessionCount)}
          detail={<PrevLine previous={props.previousSessions ?? null} current={sessionCount} format={fmtCalls} />}
        />
        <KpiCard
          label={t('overview.kpiDaily')}
          value={dailyAverage === null ? '—' : moneyTextOf(display, dailyAverage)}
          detail={activeDays === 0 ? '—' : t('overview.activeDays', { count: activeDays })}
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <b className={styles.panelTitle}>{t('overview.trend')}</b>
          <div className={styles.metricTabs}>
            {TREND_METRICS.map(([metric, labelKey]) => (
              <button
                key={metric}
                type="button"
                className={metric === trendMetric ? styles.metricTab + ' ' + styles.metricTabOn : styles.metricTab}
                aria-pressed={metric === trendMetric}
                onClick={() => setTrendMetric(metric)}
              >{t(labelKey)}</button>
            ))}
          </div>
        </div>
        {isAllRange
          ? (hasHeatData
            ? (
              <YearHeatmap
                valuesByDate={heatValues}
                dataStart={dataStart}
                tooltip={props.tooltip}
                tipOf={tipOfDay}
                onPickDay={props.onPickDay}
                ariaLabel={t('overview.trend') + ' · ' + String(heatValues.size) + t('h.summarySuffix')}
              />
            )
            : <div className={shared.empty}>{trendEmptyText}</div>)
          : (hasBarData
            ? <TrendBars days={barDays} values={barValues} tooltip={props.tooltip} tipOf={barTipOf} />
            : <div className={shared.empty}>{trendEmptyText}</div>)}
        <div className={styles.trendFoot}>
          {isAllRange && hasHeatData && (
            <span className={styles.scale}>
              <span className={styles.scaleText}>{t('overview.legendLess')}</span>
              {LEVEL_COLORS.map((color) => <i key={color} style={{ background: color }} />)}
              <span className={styles.scaleText}>{t('overview.legendMore')}</span>
            </span>
          )}
          {trendStats !== '' && <span className={styles.trendStats}>{trendStats}</span>}
        </div>
      </div>

      <div className={styles.gridTwo}>
        <RankPanel
          title={t('overview.panelProjects')}
          metrics={PROJECT_METRICS}
          active={projectMetric}
          onActive={setProjectMetric}
          items={projectItems.items}
          total={projectItems.total}
        />
        <RankPanel
          title={t('overview.panelModels')}
          metrics={MODEL_METRICS}
          active={modelMetric}
          onActive={setModelMetric}
          items={modelItems.items}
          total={modelItems.total}
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <b className={styles.panelTitle}>{t('overview.hourly')}</b>
          <div className={styles.metricTabs}>
            {HOUR_METRICS.map(([metric, labelKey]) => (
              <button
                key={metric}
                type="button"
                className={metric === hourMetric ? styles.metricTab + ' ' + styles.metricTabOn : styles.metricTab}
                aria-pressed={metric === hourMetric}
                onClick={() => setHourMetric(metric)}
              >{t(labelKey)}</button>
            ))}
          </div>
          <span className={styles.panelMore}>
            {busiestHour === null ? '' : t('overview.busiestHour', {
              weekday: t(WEEKDAY_KEYS[busiestHour.weekday]),
              hour: String(busiestHour.hour).padStart(2, '0') + ':00',
            })}
          </span>
        </div>
        {hourValues === null || hourMatrix === null || !hasHourData
          ? <div className={shared.empty}>{t('overview.noHourly')}</div>
          : (
            <div className={styles.hourWrap} role="group" aria-label={t('overview.hourly')}>
              <div className={styles.hourWeekdays}>
                {WEEKDAY_KEYS.map((key) => <span key={key}>{t(key)}</span>)}
              </div>
              <div className={styles.hourAxis}>
                {Array.from({ length: 24 }, (_, hour) => <span key={hour}>{hour % 3 === 0 ? String(hour) : ''}</span>)}
              </div>
              <div className={styles.hourGrid}>
                {hourMatrix.map((weekday, weekdayIndex) => weekday.map((cell, hour) => {
                  const value = hourValues[weekdayIndex][hour]
                  const level = value === undefined ? 0 : levelOfValue(value, hourThresholds)
                  return (
                    <div
                      key={weekdayIndex + '-' + hour}
                      className={styles.hourCell}
                      style={{ background: levelColorOf(level) }}
                      onMouseMove={(event) => props.tooltip.show(event, (
                        <>
                          <TipTitle>{t(WEEKDAY_KEYS[weekdayIndex]) + ' ' + String(hour).padStart(2, '0') + ':00'}</TipTitle>
                          <TipSub>{t(labelKeyOf(HOUR_METRICS, hourMetric))} <b>{value === undefined ? '—' : metricTextOf(hourMetric, value)}</b></TipSub>
                        </>
                      ))}
                      onMouseLeave={props.tooltip.hide}
                    />
                  )
                }))}
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

function KpiCard(props: { label: string; value: string; unit?: string; detail: ReactNode }): ReactNode {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{props.label}</div>
      <div className={styles.kpiValue}>
        {props.value}
        {props.unit !== undefined && <span className={styles.kpiUnit}>{props.unit}</span>}
      </div>
      <div className={styles.kpiDetail}>{props.detail}</div>
    </div>
  )
}

/**
 * 副标题的环比：给得出上期才出现涨跌（涨红跌绿），给不出就留 —。
 * 服务端目前没有上期字段，所以常态是 —。
 */
function PrevLine(props: { previous: number | null; current: number | null; format: (value: number) => string }): ReactNode {
  if (props.previous === null || props.current === null || props.previous <= 0) {
    return <>{t('overview.prev', { value: props.previous === null ? '—' : props.format(props.previous) })}</>
  }
  const delta = (props.current - props.previous) / props.previous * 100
  return (
    <>
      {t('overview.prev', { value: props.format(props.previous) })}
      <span className={delta > 0 ? styles.rise : delta < 0 ? styles.fall : undefined}>
        {(delta > 0 ? '+' : '') + delta.toFixed(1) + '%'}
      </span>
    </>
  )
}

/** 柱状图：只有高度与日期，数值在悬停里看（不往柱子上堆文字）。 */
function TrendBars(props: {
  days: TrendDay[]
  values: Array<number | null>
  tooltip: TooltipApi
  tipOf: (date: string, value: number | null) => ReactNode
}): ReactNode {
  const peak = Math.max(0, ...props.values.filter((value): value is number => value !== null))
  const peakIndex = props.values.findIndex((value) => value !== null && value === peak && peak > 0)
  const ticks = tickIndexesOf(props.days.length, BAR_TICKS)
  return (
    <div>
      <div className={styles.hist}>
        {props.days.map((day, index) => {
          const value = props.values[index] ?? null
          const percent = value === null || peak <= 0 ? 0 : Math.max(2, value / peak * 100)
          return (
            <div
              key={day.date}
              className={styles.histColumn}
              onMouseMove={(event) => props.tooltip.show(event, props.tipOf(day.date, value))}
              onMouseLeave={props.tooltip.hide}
            >
              <div
                className={index === peakIndex ? styles.histBar + ' ' + styles.histBarPeak : styles.histBar}
                style={{ height: percent + '%' }}
              />
            </div>
          )
        })}
      </div>
      <div className={styles.histLabels}>
        {ticks.map((index) => <span key={props.days[index].date}>{fmtShortDate(props.days[index].date)}</span>)}
      </div>
    </div>
  )
}

/** 排行面板：横条 + 右侧数值；行数超出「还有 M 个」。 */
function RankPanel<Key extends string>(props: {
  title: string
  metrics: Array<[Key, string]>
  active: Key
  onActive: (key: Key) => void
  items: RankItem[]
  total: number
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const shown = props.items.slice(0, RANK_ROWS)
  const peak = shown.length === 0 ? 0 : Math.max(...shown.map((item) => item.value))
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <b className={styles.panelTitle}>{props.title}</b>
        <div className={styles.metricTabs}>
          {props.metrics.map(([metric, labelKey]) => (
            <button
              key={metric}
              type="button"
              className={metric === props.active ? styles.metricTab + ' ' + styles.metricTabOn : styles.metricTab}
              aria-pressed={metric === props.active}
              onClick={() => props.onActive(metric)}
            >{t(labelKey)}</button>
          ))}
        </div>
        {props.total > 0 && (
          <span className={styles.panelMore}>
            {t('overview.more', { total: props.total, rest: Math.max(0, props.total - shown.length) })}
          </span>
        )}
      </div>
      {shown.length === 0
        ? <div className={shared.empty}>{t('overview.noData')}</div>
        : shown.map((item, index) => (
          <div className={styles.rankRow} key={item.key} title={item.title}>
            <span className={styles.rankName}>{item.name}</span>
            <span className={styles.rankTrack}>
              <i
                className={index === 0 ? styles.rankBar + ' ' + styles.rankBarTop : styles.rankBar}
                style={{ width: (peak <= 0 ? 0 : Math.max(2, item.value / peak * 100)) + '%' }}
              />
            </span>
            <span className={styles.rankValue}>{item.valueText}</span>
            <span className={styles.rankSub}>{item.subText}</span>
          </div>
        ))}
    </div>
  )
}

interface RankItem {
  key: string
  name: string
  /** 悬停提示：名字被省略号截断时还能看全 */
  title: string
  value: number
  valueText: string
  subText: string
}

/** 汇总 summary 的近 30 天成本：合计只按逐币种小计折算后相加（`cost` 只是兜底）。 */
function monthCostTotalsOf(summary: SummaryResponse | null): { cost: number; costsByCurrency: Record<string, number> } {
  const totals: { cost: number; costsByCurrency: Record<string, number> } = { cost: 0, costsByCurrency: {} }
  for (const row of summary?.channels ?? []) {
    totals.cost += row.month.cost
    for (const [currency, amount] of Object.entries(row.month.costsByCurrency ?? {})) {
      totals.costsByCurrency[currency] = (totals.costsByCurrency[currency] ?? 0) + amount
    }
  }
  return totals
}

/** 缓存命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）；没有拆分数据时给 null。 */
function hitRateOf(totals: DaySummary | null): number | null {
  if (totals === null) return null
  const total = totals.inputTokens + totals.outputTokens + totals.cacheReadTokens
  return total > 0 ? totals.cacheReadTokens / total * 100 : null
}

/**
 * 本期会话数：最近活动落在当前窗口里的会话行数（`'all'` = 全部会话，不设下限）。
 * 列表被 limit 截断时不能拿来计数（会少算），Coverage 说读不出来的也不给数字；
 * `from` 为 null 表示窗口未知（自定义范围只有父级知道起止）→ 显示 —。
 */
function sessionCountOf(sessions: SessionsResponse | null | undefined, from: string | 'all' | null): number | null {
  if (from === null || sessions == null || sessions.coverage.status === 'unavailable') return null
  if (sessions.rows.length === 0 || sessions.rows.length < sessions.coverage.countedSessions) return null
  const active = sessions.rows.filter((row) => row.calls > 0)
  if (from === 'all') return active.length
  const fromTime = new Date(from + 'T00:00:00').getTime()
  return active.filter((row) => row.lastTime !== null && row.lastTime >= fromTime).length
}

/** 会话 KPI 的起点：今天 / 7 天按窗口起点，全部不设下限，自定义范围只有父级知道起止 → null（显示 —）。 */
function sessionFromOf(range: RangeKey): string | 'all' | null {
  if (range === 'total') return 'all'
  return windowOfRange(range)?.from ?? null
}

/**
 * 非近 30 天范围的可信合计：父级按当前范围请求 `/usage`，分页时可能还没跟上；
 * 逐日明细越出当前窗口就按没有数据处理（宁可显示 —，也不把上一个范围的数字贴到本范围）。
 */
function rangeTotalsOf(usage: UsageResponse | null | undefined, range: RangeKey): UsageTotals | null {
  const totals = usage?.totals ?? null
  if (totals === null) return null
  const window = windowOfRange(range)
  if (window === null) return totals
  const mismatch = (usage?.days ?? []).some((day) => day.date < window.from || day.date > window.to)
  return mismatch ? null : totals
}

/** 当前范围里有数据的天数（日均的分母）：`usage.days` 的日期去重，只数窗口内的日子。 */
function usageDayCountOf(usage: UsageResponse | null | undefined, range: RangeKey): number {
  const window = windowOfRange(range)
  const dates = new Set<string>()
  for (const day of usage?.days ?? []) {
    if (window !== null && (day.date < window.from || day.date > window.to)) continue
    dates.add(day.date)
  }
  return dates.size
}

/** 大数拆成「数值 + 单位」，单位用小字（原型：15.34<small>B</small>）。 */
function tokenValueOf(count: number): { text: string; unit: string } {
  const text = fmtTokens(count)
  const match = /^([\d.,]+)([KMB])$/.exec(text)
  return match === null ? { text, unit: '' } : { text: match[1], unit: match[2] }
}

/** 逐日序列：有 usage 只用它的 days（父级已按当前范围请求），否则退回 heatmap 的逐日总量。 */
function trendDaysOf(usage: UsageResponse | null | undefined, heatmap: HeatmapDay[]): TrendDay[] {
  const usageDays = usage?.days ?? []
  if (usageDays.length > 0) return usageDays.map(trendDayOfDay).sort((first, second) => first.date.localeCompare(second.date))
  return heatmap
    .map((day) => ({
      date: day.date,
      tokens: day.totalTokens,
      calls: null,
      outTokens: null,
      cacheRead: null,
      cost: null,
    }))
    .sort((first, second) => first.date.localeCompare(second.date))
}

function trendDayOfDay(day: DaySummary): TrendDay {
  return {
    date: day.date,
    tokens: day.inputTokens + day.outputTokens + day.cacheReadTokens,
    calls: day.calls,
    outTokens: day.outputTokens,
    cacheRead: day.cacheReadTokens,
    cost: comparableMoneyOf(day),
  }
}

/** 各范围对应的本地窗口；`total` 由热力图覆盖、`custom` 只有父级知道起止，两者返回 null。 */
function windowOfRange(range: RangeKey): { from: string; to: string } | null {
  const today = isoDate(new Date())
  if (range === 'today') return { from: today, to: today }
  if (range === 'week') return { from: shiftedIsoDate(-6), to: today }
  if (range === 'month') return { from: shiftedIsoDate(-29), to: today }
  return null
}

/**
 * 当前指标在一天上的取值。`activity` 只认按天调用数：`heatmap` 段没有这一项时返回 null（该档不画柱），
 * 绝不拿 token 量冒充调用数；`sessions` 一律 null：服务端没有按天会话数。
 */
function metricValueOf(metric: TrendMetric, day: TrendDay): number | null {
  if (metric === 'activity') return day.calls
  if (metric === 'tokens') return day.tokens
  if (metric === 'outTokens') return day.outTokens
  if (metric === 'cacheRead') return day.cacheRead
  if (metric === 'cost') return day.cost
  return null
}

/** 指标数值文本：金额按显示币种，调用次数带单位，其余按 tokens 缩写。 */
function metricTextOf(metric: TrendMetric, value: number): string {
  if (metric === 'cost') return displaySymbolOf() + value.toFixed(2)
  if (metric === 'activity') return fmtCalls(value) + ' ' + t('overview.callsUnit')
  if (metric === 'sessions') return fmtCalls(value)
  return fmtTokens(value)
}

function labelKeyOf<Key extends string>(pairs: Array<[Key, string]>, key: Key): string {
  return pairs.find(([item]) => item === key)?.[1] ?? ''
}

/** 连续活跃天数：只数有值的日子，中间断一天就重新起算。 */
function streakOf(dates: string[]): number {
  const sorted = [...dates].sort()
  let longest = 0
  let run = 0
  let previous: string | null = null
  for (const date of sorted) {
    run = previous !== null && nextDateOf(previous) === date ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = date
  }
  return longest
}

function nextDateOf(dateKey: string): string {
  return isoDate(new Date(new Date(dateKey + 'T00:00:00').getTime() + 86400000))
}

/** 最忙的一天（值最大的那天）；没有值时给 null。 */
function busiestOf(dates: string[], values: number[]): { date: string; value: number } | null {
  let busiest: { date: string; value: number } | null = null
  for (let index = 0; index < dates.length; index += 1) {
    const value = values[index]
    if (value === undefined || value <= 0) continue
    if (busiest === null || value > busiest.value) busiest = { date: dates[index], value }
  }
  return busiest
}

function tickIndexesOf(count: number, wanted: number): number[] {
  if (count <= wanted) return Array.from({ length: count }, (_, index) => index)
  const step = Math.ceil(count / wanted)
  const indexes: number[] = []
  for (let index = 0; index < count; index += step) indexes.push(index)
  return indexes
}

function projectValueOf(metric: ProjectMetric, row: ProjectRow): number | null {
  if (metric === 'cost') return comparableMoneyOf(row)
  if (metric === 'tokens') return row.tokens
  return row.sessionCount
}

function projectValueTextOf(metric: ProjectMetric, row: ProjectRow): string {
  if (metric === 'cost') return rowMoneyViewOf(row).text
  if (metric === 'tokens') return fmtTokens(row.tokens)
  return fmtCalls(row.sessionCount)
}

function rankItemsOfProjects(projects: ProjectsResponse | null | undefined, metric: ProjectMetric): { items: RankItem[]; total: number } {
  const rows = projects?.rows ?? []
  const items: RankItem[] = []
  for (const row of rows) {
    const value = projectValueOf(metric, row)
    if (value === null || value <= 0) continue
    const name = row.workspaceTitle ?? (row.workspace === '' ? t('p.orphan') : row.workspace)
    items.push({
      key: row.workspace === '' ? '__orphan__' : row.workspace,
      name,
      title: name,
      value,
      valueText: projectValueTextOf(metric, row),
      subText: t('overview.sessionCount', { count: row.sessionCount }),
    })
  }
  items.sort((first, second) => second.value - first.value)
  return { items, total: items.length }
}

function modelValueOf(metric: ModelMetric, row: ModelAggregateRow): number | null {
  if (metric === 'cost') return comparableMoneyOf(row)
  if (metric === 'tokens') return row.tokens
  return row.cacheHitRate
}

function modelValueTextOf(metric: ModelMetric, row: ModelAggregateRow): string {
  if (metric === 'cost') return rowMoneyViewOf(row).text
  if (metric === 'tokens') return fmtTokens(row.tokens)
  return row.cacheHitRate === null ? '—' : row.cacheHitRate.toFixed(1) + '%'
}

function rankItemsOfModels(models: ModelsResponse | null | undefined, metric: ModelMetric): { items: RankItem[]; total: number } {
  const rows = models?.rows ?? []
  const items: RankItem[] = []
  for (const row of rows) {
    const value = modelValueOf(metric, row)
    if (value === null || value <= 0) continue
    items.push({
      key: row.provider + '|' + row.model,
      name: row.model,
      title: row.model + ' · ' + row.providerLabel,
      value,
      valueText: modelValueTextOf(metric, row),
      subText: fmtTokens(row.tokens),
    })
  }
  items.sort((first, second) => second.value - first.value)
  return { items, total: items.length }
}

/** 按时段的一格：服务端字段可能只给其中几个，逐个可选解析。 */
interface HourCell {
  sessions?: number
  tokens?: number
  cost?: number
}

function hourCellOf(value: unknown): HourCell {
  if (typeof value === 'number' && Number.isFinite(value)) return { sessions: value }
  if (value === null || typeof value !== 'object') return {}
  const record = value as Record<string, unknown>
  const numberAt = (key: string): number | undefined => {
    const raw = record[key]
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined
  }
  return { sessions: numberAt('sessions') ?? numberAt('calls'), tokens: numberAt('tokens'), cost: numberAt('cost') }
}

/**
 * 把 heatmap 段的 `hourly` 归一成「周一到周日 × 24 小时」。
 * 接受两种写法：`hours` 里是数字（当会话数）或对象（sessions / calls / tokens / cost）；
 * 周几用 7 或 0 区分「周一 = 1」与「周日 = 0」；外面包一层 `rows` / `weekdays` 也认。
 * 形状不对时返回 null（面板显示空态，不崩）。
 */
function hourlyMatrixOf(raw: unknown): HourCell[][] | null {
  const list = hourlyListOf(raw)
  if (list === null) return null
  const rows: Array<{ weekday: number; hours: HourCell[] }> = []
  for (const entry of list) {
    if (entry === null || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const weekday = typeof record.weekday === 'number' ? record.weekday : Number(record.weekday)
    const hoursRaw = Array.isArray(record.hours) ? record.hours : null
    if (!Number.isFinite(weekday) || hoursRaw === null) continue
    const hours: HourCell[] = []
    for (let hour = 0; hour < 24; hour += 1) hours.push(hourCellOf(hoursRaw[hour]))
    rows.push({ weekday, hours })
  }
  if (rows.length === 0) return null
  const oneBasedMonday = rows.some((row) => row.weekday === 7)
  const sundayZero = !oneBasedMonday && rows.some((row) => row.weekday === 0)
  const matrix: HourCell[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({})))
  for (const row of rows) {
    const displayIndex = sundayZero ? (row.weekday + 6) % 7 : row.weekday - 1
    if (displayIndex < 0 || displayIndex > 6) continue
    matrix[displayIndex] = row.hours
  }
  return matrix
}

/** 取承载七行的那一层数组：原子数组，或 `{ rows: [...] }` / `{ weekdays: [...] }` 这种包一层的写法。 */
function hourlyListOf(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw
  if (raw === null || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  for (const key of ['rows', 'weekdays', 'hourly']) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  return null
}

function hourMetricValueOf(metric: HourMetric, cell: HourCell): number | undefined {
  if (metric === 'sessions') return cell.sessions
  if (metric === 'tokens') return cell.tokens
  return cell.cost
}

function busiestHourOf(values: Array<Array<number | undefined>> | null): { weekday: number; hour: number; value: number } | null {
  if (values === null) return null
  let busiest: { weekday: number; hour: number; value: number } | null = null
  for (let weekday = 0; weekday < values.length; weekday += 1) {
    for (let hour = 0; hour < values[weekday].length; hour += 1) {
      const value = values[weekday][hour]
      if (value === undefined || value <= 0) continue
      if (busiest === null || value > busiest.value) busiest = { weekday, hour, value }
    }
  }
  return busiest
}
