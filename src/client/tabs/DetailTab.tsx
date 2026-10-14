/** 使用明细：范围切换 + 三张统计卡 + 占比条 + 通道筛选 + 按天/按小时图表 + 每日细目。 */
import type { ReactNode } from 'react'
import { channelColorOf, channelOf, costCellOf, displayNameOf, statusColorOf } from '../channels.ts'
import { fmtCalls, fmtShortDate, fmtTokens, isoDate } from '../format.ts'
import { rowMoneyViewOf } from '../currency.ts'
import { CSV_MIME, JSON_MIME, downloadFile, exportFileName, toCsv, toJson, type ExportColumn } from '../export.ts'
import type { Channel, ChannelDailySummary, DaySummary, UsageResponse } from '../types.ts'
import { TipDivider, TipRow, TipSub, TipTitle, type TooltipApi } from '../tooltip.tsx'
import { ShareBar } from '../components/ShareBar.tsx'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { StatCard } from '../components/StatCard.tsx'
import { TokenBars, type TokenBarRow } from '../components/TokenBars.tsx'
import { TrendPanel } from '../components/TrendPanel.tsx'
import { DailyDetailTable, type DetailSortState } from '../components/DailyDetailTable.tsx'
import styles from '../styles/shared.module.css'
import detailStyles from '../styles/detail.module.css'
import exportStyles from '../styles/export.module.css'

export type RangeKey = 'today' | 'week' | 'month' | 'total' | 'custom'

const RANGE_TABS: Array<[RangeKey, string]> = [
  ['today', '今日'], ['week', '周'], ['month', '月'], ['total', '总计'], ['custom', '自定义'],
]

/** 图表最多铺开的列数：超过这个跨度的范围按天全画会挤成一团。 */
const MAX_AXIS_DAYS = 366

/** 导出列：命中率与成本给数值（不带单位），方便在表格里继续算。 */
const EXPORT_COLUMNS: Array<ExportColumn<ChannelDailySummary>> = [
  { key: 'date', label: '日期', value: (row) => row.date },
  { key: 'calls', label: '调用', value: (row) => row.calls },
  { key: 'inputTokens', label: '输入', value: (row) => row.inputTokens },
  { key: 'outputTokens', label: '输出', value: (row) => row.outputTokens },
  { key: 'cacheReadTokens', label: '缓存读', value: (row) => row.cacheReadTokens },
  { key: 'cacheHitRate', label: '命中率(%)', value: (row) => hitRateValueOf(row) },
  { key: 'cost', label: '成本(原币种合计)', value: (row) => row.cost },
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
  expandedPeriods: Record<string, boolean>
  onTogglePeriod: (periodKey: string) => void
  sort: DetailSortState
  onSort: (sort: DetailSortState) => void
  bounds: { from: string; to: string }
  tooltip: TooltipApi
  /** 价目版本号：成本在服务端按价目算，价目一换这里要重取上期数据。 */
  pricingRevision: number
}): ReactNode {
  const { usage, channels, bounds, tooltip, channelFilter } = props
  if (usage === null) return <div className={styles.empty}>台账读取中或不可用…</div>

  const totals = usage.totals
  const safeTotals: DaySummary = totals ?? {
    date: '', calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 0,
  }
  const totalTokens = safeTotals.inputTokens + safeTotals.outputTokens + safeTotals.cacheReadTokens
  const hitRate = hitRateOf(safeTotals.cacheReadTokens, safeTotals.inputTokens, safeTotals.outputTokens)
  /** 缓存读在展示口径 Tokens 里的占比；分母为 0 时不给数字（避免显示 0% 误导）。 */
  const cacheReadShare = totalTokens > 0 ? (safeTotals.cacheReadTokens / totalTokens * 100).toFixed(1) + '%' : null
  /** 范围内「有用量」的天数：日均 Tokens 的分母（拿日历天数去除会把空闲日算成用量偏低）。 */
  const activeDays = usage.days.filter((day) => day.inputTokens + day.outputTokens + day.cacheReadTokens > 0).length
  const singleChannel = channelFilter === 'ALL' ? null : channelOf(channels, channelFilter)
  const costCell = costCellOf(singleChannel, safeTotals)
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
              ? <TipSub>该小时无用量记录</TipSub>
              : (
                <>
                  <TipSub>调用 <b>{fmtCalls(slot.calls)}</b> · Tokens <b>{fmtTokens(slotTokens)}</b></TipSub>
                  <TipRow color="var(--dsw-alias-state-accent-primary, #5b8cff)" label="输入" amount={fmtTokens(slot.buckets.inputTokens)} />
                  <TipRow color="var(--dsw-alias-state-business-primary, #9a7bff)" label="输出" amount={fmtTokens(slot.buckets.outputTokens)} />
                  <TipRow
                    color="var(--dsw-alias-state-accent-tertiary, rgba(91,140,255,.28))"
                    label="缓存读"
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
            <TipSub>当日无用量记录</TipSub>
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
          <TipSub>调用 <b>{fmtCalls(day.calls)}</b> · Tokens <b>{fmtTokens(dayTotal)}</b></TipSub>
          <TipRow color="var(--dsw-alias-state-accent-primary, #5b8cff)" label="输入" amount={fmtTokens(day.inputTokens)} />
          <TipRow color="var(--dsw-alias-state-business-primary, #9a7bff)" label="输出" amount={fmtTokens(day.outputTokens)} />
          <TipRow
            color="var(--dsw-alias-state-accent-tertiary, rgba(91,140,255,.28))"
            label="缓存读"
            amount={fmtTokens(day.cacheReadTokens)}
            rate={hitRateOf(day.cacheReadTokens, day.inputTokens, day.outputTokens)}
          />
          <TipDivider>
            <span>成本</span>
            <b>{dayMoneyOf(day)}</b>
          </TipDivider>
          {fromSession && <TipSub>来源：会话事件（该日台账无记录，不含官方成本）</TipSub>}
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
  const chartTitle = useHourAxis ? '按小时 Tokens（' + bounds.from + '）' : '按天 Tokens（' + rangeDays + ' 天）'
  // 图表的读屏替代文本：柱状图本身没有可读文本，逐柱数值只有 hover tip
  const chartAriaLabel = useHourAxis
    ? '按小时 Tokens 堆叠柱状图（' + bounds.from + '），共 ' + String(chartRows.length) + ' 个小时，含输入 / 输出 / 缓存读三段'
    : '按天 Tokens 堆叠柱状图，共 ' + String(chartRows.length) + ' 天（含无用量日），含输入 / 输出 / 缓存读三段'

  return (
    <div>
      <div className={detailStyles.rangeBar}>
        <div className={detailStyles.rangeLeft}>
          <div className={detailStyles.rangeTabs}>
            {RANGE_TABS.map(([key, label]) => (
              <button key={key} className={props.range === key ? detailStyles.active : ''} onClick={() => props.onRange(key)}>{label}</button>
            ))}
          </div>
          {props.range === 'custom' && (
            <span className={detailStyles.dateRange}>
              <label className={detailStyles.dateField}>
                <span className={detailStyles.dateLabel}>从</span>
                <input type="date" className={detailStyles.rangeInput} value={props.customFrom} onChange={(event) => props.onCustomFrom(event.target.value)} />
              </label>
              <span className={styles.dim}>–</span>
              <label className={detailStyles.dateField}>
                <span className={detailStyles.dateLabel}>至</span>
                <input type="date" className={detailStyles.rangeInput} value={props.customTo} onChange={(event) => props.onCustomTo(event.target.value)} />
              </label>
            </span>
          )}
        </div>
        <span className={exportStyles.exportGroup}>
          <button className={exportStyles.exportBtn} disabled={usage.days.length === 0} onClick={() => exportDaily('csv')}>导出 CSV</button>
          <button className={exportStyles.exportBtn} disabled={usage.days.length === 0} onClick={() => exportDaily('json')}>导出 JSON</button>
        </span>
      </div>

      <div className={styles.cardGrid6}>
        <StatCard label="调用次数" value={fmtCalls(safeTotals.calls)} extra={activeProviders.size + ' 个通道有用量'} />
        <StatCard
          label="Tokens"
          value={fmtTokens(totalTokens)}
          extra={'输入 ' + fmtTokens(safeTotals.inputTokens) + ' · 输出 ' + fmtTokens(safeTotals.outputTokens)}
        />
        <StatCard
          label="缓存读"
          value={fmtTokens(safeTotals.cacheReadTokens)}
          extra={cacheReadShare === null ? '与上方 Tokens 同口径' : '占 Tokens 的 ' + cacheReadShare}
        />
        <StatCard label="缓存命中率" value={hitRate} extra="缓存读 ÷（输入 + 输出 + 缓存读）" />
        <StatCard
          label="日均 Tokens"
          value={activeDays === 0 ? '—' : fmtTokens(Math.round(totalTokens / activeDays))}
          extra={'范围内 ' + String(activeDays) + ' 天有用量'}
        />
        <StatCard
          label="成本"
          value={costCell.dim
            ? <span className={styles.dim}>{costCell.text}</span>
            : <>{costCell.text}{costCell.amount && <CostSourceChip source={safeTotals.costSource} partial={safeTotals.partial} />}</>}
          extra="按所选范围与筛选聚合"
        />
      </div>

      <TrendPanel
        usage={usage}
        channels={channels}
        range={props.range}
        bounds={bounds}
        channelFilter={channelFilter}
        pricingRevision={props.pricingRevision}
      />

      <ShareBar usage={usage} totalTokens={totalTokens} channelFilter={channelFilter} channels={channels} tooltip={tooltip} />

      <div className={styles.chipRow} style={{ marginTop: 14 }}>
        <button className={channelFilter === 'ALL' ? styles.chip + ' ' + styles.active : styles.chip} onClick={() => props.onChannelFilter('ALL')}>
          <span className={styles.statusDot} style={{ background: 'var(--dsw-alias-state-accent-primary, #5b8cff)' }} />全部通道
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
              ? <b>全部通道</b>
              : (
                <>
                  <span className={styles.statusDot} style={{ background: statusColorOf(singleChannel.status) }} />
                  <b>{singleChannel.displayName}</b>
                </>
              )}
          </span>
          <span className={styles.dim} style={{ fontSize: 11.5 }}>{bounds.from} ~ {bounds.to}</span>
        </div>
        <div className={detailStyles.chartTitle} style={{ marginTop: 10 }}>
          <span className={styles.statLabel}>{chartTitle}</span>
          <span className={styles.legend}>
            <span><i style={{ background: 'rgba(91,140,255,.28)' }} />缓存读</span>
            <span><i style={{ background: 'var(--dsw-alias-state-accent-primary, #5b8cff)' }} />输入</span>
            <span><i style={{ background: 'var(--dsw-alias-state-business-primary, #9a7bff)' }} />输出</span>
          </span>
        </div>
        {chartRows.length === 0
          ? <div className={styles.empty}>所选范围内无用量记录</div>
          : <TokenBars rows={chartRows} tooltip={tooltip} ariaLabel={chartAriaLabel} />}
        {useHourAxis && <div className={styles.statExtra}>按小时数据来自本地会话事件，不含成本</div>}
      </div>

      <DailyDetailTable
        usage={usage}
        channels={channels}
        channelFilter={channelFilter}
        expandedPeriods={props.expandedPeriods}
        onTogglePeriod={props.onTogglePeriod}
        sort={props.sort}
        onSort={props.onSort}
      />
    </div>
  )
}

/** 通道颜色（供外部复用，避免各 Tab 重复实现）。 */
export { channelColorOf }
