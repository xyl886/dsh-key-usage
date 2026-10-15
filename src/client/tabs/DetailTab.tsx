/** 使用明细：范围切换 + 三张统计卡 + 占比条 + 通道筛选 + 按天/按小时图表 + 每日细目。 */
import type { ReactNode } from 'react'
import { channelColorOf, channelOf, costCellOf, displayNameOf, statusColorOf } from '../core/channels.ts'
import { fmtCalls, fmtShortDate, fmtTokens, isoDate } from '../core/format.ts'
import { rowMoneyViewOf } from '../core/currency.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../core/export.ts'
import type { Channel, ChannelDailySummary, DaySummary, UsageResponse } from '../core/types.ts'
import { TipDivider, TipRow, TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import { ShareBar } from '../components/ShareBar.tsx'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { StatCard } from '../components/StatCard.tsx'
import { TokenBars, type TokenBarRow } from '../components/TokenBars.tsx'
import { useTrend } from '../core/useTrend.tsx'
import styles from '../styles/shared.module.css'
import detailStyles from '../styles/detail.module.css'
import exportStyles from '../styles/export.module.css'
import { t, useT } from '../core/i18n.ts'

export type RangeKey = 'today' | 'week' | 'month' | 'total' | 'custom'

const RANGE_TABS: Array<[RangeKey, string]> = [
  ['today', 'r.today'], ['week', 'r.week'], ['month', 'r.month'], ['total', 'r.total'], ['custom', 'r.custom'],
]

/** 图表最多铺开的列数：超过这个跨度的范围按天全画会挤成一团。 */
const MAX_AXIS_DAYS = 366

/** 导出列：命中率与成本给数值（不带单位），方便在表格里继续算。 */
const EXPORT_COLUMNS: Array<ExportColumn<ChannelDailySummary>> = [
  { key: 'date', labelKey: 'c.date', value: (row) => row.date },
  { key: 'calls', labelKey: 'c.calls', value: (row) => row.calls },
  { key: 'inputTokens', labelKey: 'c.input', value: (row) => row.inputTokens },
  { key: 'outputTokens', labelKey: 'c.output', value: (row) => row.outputTokens },
  { key: 'cacheReadTokens', labelKey: 'c.cacheRead', value: (row) => row.cacheReadTokens },
  { key: 'cacheHitRate', labelKey: 'c.hitRate', value: (row) => hitRateValueOf(row) },
  { key: 'cost', labelKey: 'c.costNative', value: (row) => row.cost },
]

/** 命中率数值（导出用；界面上的带 % 文本由 `hitRateOf` 生成）。 */
function hitRateValueOf(row: ChannelDailySummary): number | null {
  const total = row.inputTokens + row.outputTokens + row.cacheReadTokens
  return total > 0 ? Math.round(row.cacheReadTokens / total * 1000) / 10 : null
}

function hitRateOf(cacheReadTokens: number, inputTokens: number, outputTokens: number): string {
  const total = inputTokens + outputTokens + cacheReadTokens
  return total > 0 ? (cacheReadTokens / total * 100).toFixed(1) + '%' : '—'
}

/** 每日成本文本：合计按逐币种小计折算后相加（缺字段时回落旧的单值口径）。 */
function dayMoneyOf(row: ChannelDailySummary): string {
  const view = rowMoneyViewOf(row)
  return view.amount > 0 ? view.text : '—'
}

function daysBetween(from: string, to: string): number {
  const fromTime = new Date(from + 'T00:00:00').getTime()
  const toTime = new Date(to + 'T00:00:00').getTime()
  return Math.max(1, Math.round((toTime - fromTime) / 86400000) + 1)
}

/** 范围内每一天的日期键（无数据的日子也要出现在横轴上）。 */
function dateKeysOfRange(from: string, to: string): string[] {
  const start = new Date(from + 'T00:00:00').getTime()
  const total = Math.min(daysBetween(from, to), MAX_AXIS_DAYS)
  const keys: string[] = []
  for (let offset = 0; offset < total; offset += 1) keys.push(isoDate(new Date(start + offset * 86400000)))
  return keys
}

export function DetailTab(props: {
  usage: UsageResponse | null
  channels: Channel[]
  range: RangeKey
  onRange: (value: RangeKey) => void
  customFrom: string
  onCustomFrom: (value: string) => void
  customTo: string
  onCustomTo: (value: string) => void
  channelFilter: string
  onChannelFilter: (value: string) => void
  bounds: { from: string; to: string }
  tooltip: TooltipApi
  /** 价目版本号：成本在服务端按价目算，价目一换这里要重取上期数据。 */
  pricingRevision: number
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const { usage, channels, bounds, tooltip, channelFilter } = props
  if (usage === null) return <div className={styles.empty}>{t('d.ledgerLoading')}</div>

  const totals = usage.totals
  const safeTotals: DaySummary = totals ?? {
    date: '', calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 0,
  }
  const totalTokens = safeTotals.inputTokens + safeTotals.outputTokens + safeTotals.cacheReadTokens
  const hitRate = hitRateOf(safeTotals.cacheReadTokens, safeTotals.inputTokens, safeTotals.outputTokens)
  /** 缓存读在展示口径 Tokens 里的占比；分母为 0 时不给数字（避免显示 0% 误导）。 */
  /** 范围内「有用量」的天数：日均 Tokens 的分母（拿日历天数去除会把空闲日算成用量偏低）。 */
  const activeDays = usage.days.filter((day) => day.inputTokens + day.outputTokens + day.cacheReadTokens > 0).length
  const singleChannel = channelFilter === 'ALL' ? null : channelOf(channels, channelFilter)
  const costCell = costCellOf(singleChannel, safeTotals)
  // 环比：只取角标与上期值（需求 3）
  const trend = useTrend({ usage, from: bounds.from, to: bounds.to, range: props.range, channelFilter, channels, pricingRevision: props.pricingRevision })
  const singleDay = bounds.from === bounds.to
  const rangeDays = Math.min(daysBetween(bounds.from, bounds.to), MAX_AXIS_DAYS)

  /** 导出当前范围与通道筛选后的每日明细（按日期升序，不跟随表格排序）。 */
  const exportDaily = (format: 'csv' | 'json'): void => {
    if (format === 'csv') downloadFile(exportFileName('daily', 'csv'), toCsv(usage.days, EXPORT_COLUMNS), CSV_MIME)
    else downloadFile(exportFileName('daily', 'json'), toJson(usage.days), JSON_MIME)
  }

  const activeProviders = new Set<string>()
  for (const day of usage.days) {
    for (const model of day.models) {
      if (model.inputTokens + model.outputTokens + model.cacheReadTokens > 0) activeProviders.add(model.provider)
    }
  }

  const hourlyRows: TokenBarRow[] = []
  if (singleDay && usage.hours !== null) {
    usage.hours.forEach((slot, hour) => {
      const slotTokens = slot.buckets.inputTokens + slot.buckets.outputTokens + slot.buckets.cacheReadTokens
      hourlyRows.push({
        key: String(hour),
        axisLabel: String(hour).padStart(2, '0') + ':00',
        cacheReadTokens: slot.buckets.cacheReadTokens,
        inputTokens: slot.buckets.inputTokens,
        outputTokens: slot.buckets.outputTokens,
        tip: (
          <>
            <TipTitle>{bounds.from + ' ' + String(hour).padStart(2, '0') + ':00'}</TipTitle>
            {slot.calls === 0 && slotTokens === 0
              ? <TipSub>{t('h.noUsage')}</TipSub>
              : (
                <>
                  <TipSub>{t('common.calls')} <b>{fmtCalls(slot.calls)}</b> · Tokens <b>{fmtTokens(slotTokens)}</b></TipSub>
                  <TipRow color="var(--dsw-alias-state-business-primary, #5b8cff)" label={t('c.input')} amount={fmtTokens(slot.buckets.inputTokens)} />
                  <TipRow color="var(--dsw-alias-state-business-primary, #9a7bff)" label={t('c.output')} amount={fmtTokens(slot.buckets.outputTokens)} />
                  <TipRow
                    color="var(--dsw-alias-state-business-tertiary, rgba(91,140,255,.28))"
                    label={t('c.cacheRead')}
                    amount={fmtTokens(slot.buckets.cacheReadTokens)}
                    rate={hitRateOf(slot.buckets.cacheReadTokens, slot.buckets.inputTokens, slot.buckets.outputTokens)}
                  />
                </>
              )}
          </>
        ),
      })
    })
  }

  // 横轴铺满所选范围：没有调用的日子留空位（不画柱子）
  const sessionDates = new Set(usage.sessionDates ?? [])
  const dayByDate = new Map<string, ChannelDailySummary>(usage.days.map((day) => [day.date, day]))
  const dailyRows: TokenBarRow[] = dateKeysOfRange(bounds.from, bounds.to).map((dateKey) => {
    const day = dayByDate.get(dateKey)
    if (day === undefined) {
      return {
        key: dateKey,
        axisLabel: fmtShortDate(dateKey),
        cacheReadTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        tip: (
          <>
            <TipTitle>{dateKey}</TipTitle>
            <TipSub>{t('h.noUsage')}</TipSub>
          </>
        ),
      }
    }
    const dayTotal = day.inputTokens + day.outputTokens + day.cacheReadTokens
    const fromSession = sessionDates.has(day.date)
    const topModels = [...day.models]
      .sort((first, second) => (second.inputTokens + second.outputTokens + second.cacheReadTokens) - (first.inputTokens + first.outputTokens + first.cacheReadTokens))
      .slice(0, 5)
    return {
      key: day.date,
      axisLabel: fmtShortDate(day.date),
      cacheReadTokens: day.cacheReadTokens,
      inputTokens: day.inputTokens,
      outputTokens: day.outputTokens,
      tip: (
        <>
          <TipTitle>{day.date}</TipTitle>
          <TipSub>{t('common.calls')} <b>{fmtCalls(day.calls)}</b> · Tokens <b>{fmtTokens(dayTotal)}</b></TipSub>
          <TipRow color="var(--dsw-alias-state-business-primary, #5b8cff)" label={t('c.input')} amount={fmtTokens(day.inputTokens)} />
          <TipRow color="var(--dsw-alias-state-business-primary, #9a7bff)" label={t('c.output')} amount={fmtTokens(day.outputTokens)} />
          <TipRow
            color="var(--dsw-alias-state-business-tertiary, rgba(91,140,255,.28))"
            label={t('c.cacheRead')}
            amount={fmtTokens(day.cacheReadTokens)}
            rate={hitRateOf(day.cacheReadTokens, day.inputTokens, day.outputTokens)}
          />
          <TipDivider>
            <span>{t('c.cost')}</span>
            <b>{dayMoneyOf(day)}</b>
          </TipDivider>
          {fromSession && <TipSub>{t('d.sourceSession')}</TipSub>}
          {topModels.map((model) => (
            <TipRow
              key={model.provider + '|' + model.model}
              label={<>{model.model}<span className={styles.dim}> · {displayNameOf(channels, model.provider)}</span></>}
              amount={fmtTokens(model.inputTokens + model.outputTokens + model.cacheReadTokens)}
            />
          ))}
        </>
      ),
    }
  })

  const useHourAxis = singleDay && usage.hours !== null
  const chartRows = useHourAxis ? hourlyRows : dailyRows
  const chartTitle = useHourAxis ? t('d.chartHourPrefix') + bounds.from + '）' : t('d.chartDayPrefix') + rangeDays + t('d.chartDaysSuffix')
  // 图表的读屏替代文本：柱状图本身没有可读文本，逐柱数值只有 hover tip
  const chartAriaLabel = useHourAxis
    ? t('d.chartHourAriaPrefix') + bounds.from + t('d.chartAriaMiddle') + String(chartRows.length) + t('d.chartHourAriaSuffix')
    : t('d.chartDayAriaPrefix') + String(chartRows.length) + t('d.chartDayAriaSuffix')

  return (
    <div>
      <div className={detailStyles.rangeBar}>
        <div className={detailStyles.rangeLeft}>
          <div className={detailStyles.rangeTabs}>
            {RANGE_TABS.map(([key, label]) => (
              <button key={key} className={props.range === key ? detailStyles.active : ''} onClick={() => props.onRange(key)}>{t(label)}</button>
            ))}
          </div>
          {props.range === 'custom' && (
            <span className={detailStyles.dateRange}>
              <label className={detailStyles.dateField}>
                <span className={detailStyles.dateLabel}>{t('r.from')}</span>
                <input type="date" className={detailStyles.rangeInput} value={props.customFrom} onChange={(event) => props.onCustomFrom(event.target.value)} />
              </label>
              <span className={styles.dim}>–</span>
              <label className={detailStyles.dateField}>
                <span className={detailStyles.dateLabel}>{t('r.to')}</span>
                <input type="date" className={detailStyles.rangeInput} value={props.customTo} onChange={(event) => props.onCustomTo(event.target.value)} />
              </label>
            </span>
          )}
        </div>
        <span className={exportStyles.exportGroup}>
          <button className={exportStyles.exportBtn} disabled={usage.days.length === 0} onClick={() => exportDaily('csv')}>{t('export.csv')}</button>
          <button className={exportStyles.exportBtn} disabled={usage.days.length === 0} onClick={() => exportDaily('json')}>{t('export.json')}</button>
        </span>
      </div>

      <div className={styles.cardGrid6}>
        <StatCard label={t('d.callCount')} value={fmtCalls(safeTotals.calls)} badge={trend?.calls.badge} above={trend?.calls.above} />
        <StatCard label="Tokens" value={fmtTokens(totalTokens)} badge={trend?.tokens.badge} above={trend?.tokens.above} />
        <StatCard label={t('c.input')} value={fmtTokens(safeTotals.inputTokens)} badge={trend?.input.badge} above={trend?.input.above} />
        <StatCard label={t('c.output')} value={fmtTokens(safeTotals.outputTokens)} badge={trend?.output.badge} above={trend?.output.above} />
        <StatCard label={t('c.cacheRead')} value={fmtTokens(safeTotals.cacheReadTokens)} badge={trend?.cacheRead.badge} above={trend?.cacheRead.above} />
        <StatCard label={t('d.hitRateShort')} value={hitRate} badge={trend?.hitRate.badge} above={trend?.hitRate.above} />
        <StatCard label={t('d.dailyAvg')} value={activeDays === 0 ? '—' : fmtTokens(Math.round(totalTokens / activeDays))} badge={trend?.dailyAvg.badge} above={trend?.dailyAvg.above} />
        <StatCard label={t('d.channelCount')} value={String(activeProviders.size)} badge={trend?.channels.badge} above={trend?.channels.above} />
        <StatCard label={t('d.activeDayCount')} value={String(activeDays)} badge={trend?.activeDays.badge} above={trend?.activeDays.above} />
        <StatCard
          label={t('c.cost')}
          badge={trend?.cost.badge}
          above={trend?.cost.above}
          value={costCell.dim
            ? <span className={styles.dim}>{costCell.text}</span>
            : <>{costCell.text}{costCell.amount && <CostSourceChip source={safeTotals.costSource} partial={safeTotals.partial} />}</>}
        />
      </div>

      <ShareBar usage={usage} totalTokens={totalTokens} channelFilter={channelFilter} channels={channels} tooltip={tooltip} />

      <div className={styles.chipRow} style={{ marginTop: 14 }}>
        <button className={channelFilter === 'ALL' ? styles.chip + ' ' + styles.active : styles.chip} onClick={() => props.onChannelFilter('ALL')}>
          <span className={styles.statusDot} style={{ background: 'var(--dsw-alias-state-business-primary, #5b8cff)' }} />全部通道
        </button>
        {channels.map((channel) => (
          <button
            key={channel.provider}
            className={channelFilter === channel.provider ? styles.chip + ' ' + styles.active : styles.chip}
            onClick={() => props.onChannelFilter(channel.provider)}
          >
            <span className={styles.statusDot} style={{ background: statusColorOf(channel.status) }} />{channel.displayName}
          </button>
        ))}
      </div>

      <div className={styles.card}>
        <div className={detailStyles.chartTitle}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {singleChannel === null
              ? <b>{t('s.allChannels')}</b>
              : (
                <>
                  <span className={styles.statusDot} style={{ background: statusColorOf(singleChannel.status) }} />
                  <b>{singleChannel.displayName}</b>
                </>
              )}
          </span>
          <span className={styles.dim} style={{ fontSize: 'calc(var(--dsh-content-font-size, 12px) * 1.05)' }}>{bounds.from} ~ {bounds.to}</span>
        </div>
        <div className={detailStyles.chartTitle} style={{ marginTop: 10 }}>
          <span className={styles.statLabel}>{chartTitle}</span>
          <span className={styles.legend}>
            <span><i style={{ background: 'rgba(91,140,255,.28)' }} />{t('c.cacheRead')}</span>
            <span><i style={{ background: 'var(--dsw-alias-state-business-primary, #5b8cff)' }} />{t('c.input')}</span>
            <span><i style={{ background: 'var(--dsw-alias-state-business-primary, #9a7bff)' }} />{t('c.output')}</span>
          </span>
        </div>
        {chartRows.length === 0
          ? <div className={styles.empty}>{t('empty.noUsage')}</div>
          : <TokenBars rows={chartRows} tooltip={tooltip} ariaLabel={chartAriaLabel} />}
        {useHourAxis && <div className={styles.statExtra}>{t('d.hourlyNote')}</div>}
      </div>
    </div>
  )
}

/** 通道颜色（供外部复用，避免各 Tab 重复实现）。 */
export { channelColorOf }
