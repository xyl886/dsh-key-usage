/**
 * 分布：模型 / 项目 / 通道三个维度的占比（Tokens 与成本）+ 提问词云 + 可收起的明细表。
 * 图表默认只画环、不排图例（悬停中心显示该段名称与占比）；点某段可下钻定位到明细表。
 * 颜色按**排名**取有序调色板：按通道上色时同一通道的模型会全同色，扇形分不清。
 */
import { useState, type ReactNode } from 'react'
import { PieChart } from '../components/PieChart.tsx'
import { WordCloud } from '../components/WordCloud.tsx'
import { Button } from '../components/ui/Button.tsx'
import { channelOf, costCellOf } from '../core/channels.ts'
import { comparableMoneyOf, rowMoneyViewOf, type CostRowLike } from '../core/currency.ts'
import { fmtTokens } from '../core/format.ts'
import { t, useT } from '../core/i18n.ts'
import { dropEmptyRows } from '../core/rows.ts'
import type { TooltipApi } from '../core/tooltip.tsx'
import type { Channel, CostsByCurrency, ModelAggregateRow, ModelsResponse, ProjectRow, ProjectsResponse, PromptsResponse, SessionCoverage } from '../core/types.ts'
import styles from '../styles/distribution.module.css'
import listStyles from '../styles/lists.module.css'
import sharedStyles from '../styles/shared.module.css'
import { ModelsTab } from './ModelsTab.tsx'
import { ProjectsTab, baseNameOf } from './ProjectsTab.tsx'

/** 环形图最多画几段，其余并成一段「其它」。 */
const MAX_SEGMENTS = 7

/** 「其它」段的色块：中立灰。 */
const OTHERS_COLOR = 'var(--dsw-alias-interactive-bg-active, rgba(128, 128, 140, .32))'

/**
 * 有序调色板：按排名给色，保证相邻段可区分。
 * 只用宿主令牌派生（color-mix 会跟着明暗主题走），不硬编码两套色。
 */
const SLICE_COLORS = [
  'var(--dsw-alias-state-business-primary, #5b8cff)',
  'var(--dsw-alias-state-warn-primary, #e0a13c)',
  'var(--dsw-alias-state-success-primary, #3fb96f)',
  'var(--dsw-alias-state-error-primary, #e05a5a)',
  'color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 45%, var(--dsw-alias-state-success-primary, #3fb96f))',
  'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a13c) 45%, var(--dsw-alias-state-error-primary, #e05a5a))',
  'color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 40%, var(--dsw-alias-state-warn-primary, #e0a13c))',
]

interface ShareSegment {
  key: string
  label: string
  value: number
  color: string
  amountText: string
}

/** 一行在图表里的形态：项目、模型、通道各一份，Tokens / 成本只是取值口径不同。 */
interface ShareEntry {
  key: string
  label: string
  tokens: number
  /** 展示币种下的可比成本；null = 不参与成本占比。 */
  cost: number | null
  costText: string
  costRow: CostRowLike
}

/** 下钻定位：点环形图某段后只显示这一项对应的明细。 */
type PickKind = 'project' | 'model' | 'channel'
interface PickState {
  kind: PickKind
  key: string
  label: string
}

export function DistributionTab(props: {
  projects: ProjectsResponse | null
  models: ModelsResponse | null
  prompts: PromptsResponse | null
  channels: Channel[]
  tooltip: TooltipApi
  /** 跨 Tab 联动：从「会话用量」点工作目录进来时只看这一个项目（null = 不过滤）。 */
  focusWorkspace?: string | null
  onClearFocus?: () => void
}): ReactNode {
  const t = useT()
  const [tableOpen, setTableOpen] = useState(false)
  const [picked, setPicked] = useState<PickState | null>(null)
  const focusWorkspace = props.focusWorkspace ?? null

  const projectRows = dropEmptyRows(props.projects?.rows ?? [], (row) => row.tokens).rows
  const modelRows = dropEmptyRows(props.models?.rows ?? [], (row) => row.tokens).rows
  // 项目图也要跟随外部联动筛选（从会话页点工作目录进来时）
  const projectEntries = projectEntriesOf(projectRows, props.channels, focusWorkspace)
  const modelEntries = modelEntriesOf(modelRows, props.channels)
  const channelEntries = channelEntriesOf(modelRows, props.channels)

  const coverage = props.projects?.coverage ?? props.models?.coverage
  const pending = props.projects === null || props.models === null
  const costScope = t('dist.costScope')

  /**
   * 点某段：展开明细并定位到该项（再点一次同一段可取消）。
   * 「其它」是合并段，没有可筛选的单值 → 只展开明细；「未归入工作区」的筛选值是空串。
   */
  const pick = (kind: PickKind, key: string, label: string): void => {
    setTableOpen(true)
    if (key === 'others') return
    const filterValue = kind === 'project' && key === 'orphan' ? '' : key
    setPicked((previous) => (previous !== null && previous.kind === kind && previous.key === filterValue ? null : { kind, key: filterValue, label }))
  }
  const modelsFocus = picked !== null && picked.kind === 'model' ? picked.key : null
  const channelsFocus = picked !== null && picked.kind === 'channel' ? picked.key : null
  const projectsFocus = picked !== null && picked.kind === 'project' ? picked.key : focusWorkspace

  return (
    <div className={styles.page}>
      {focusWorkspace !== null && (
        <div className={listStyles.focusChip}>
          {t('p.focusPrefix')}{focusWorkspace}
          <span className={styles.focusNote}>{t('dist.focusScope')}</span>
          <button type="button" className={listStyles.focusClear} onClick={() => props.onClearFocus?.()} aria-label={t('p.clearFilter')}>✕</button>
        </div>
      )}

      <div className={styles.rangeLine}>{t('dist.rangeAll')}</div>

      {!tableOpen && coverage !== undefined && coverage.status !== 'complete' && (
        <div className={sharedStyles.warning}>{coverageTextOf(coverage)}</div>
      )}

      <div className={styles.charts}>
        <PieCard
          title={t('dist.shareTokens')}
          group={t('dist.byChannel')}
          totalText={fmtTokens(sumTokens(channelEntries))}
          entries={channelEntries}
          valueOf={(entry) => entry.tokens}
          amountOf={(entry) => fmtTokens(entry.tokens)}
          emptyText={pending ? t('s.loading') : t('empty.noUsage')}
          tooltip={props.tooltip}
          onPickSegment={(segment) => pick('channel', segment.key, segment.label)}
        />
        <PieCard
          title={t('dist.shareCost')}
          group={t('dist.byModel')}
          totalText={mergedCostText(modelEntries.filter((entry) => entry.cost !== null))}
          entries={modelEntries.filter((entry) => entry.cost !== null)}
          valueOf={(entry) => entry.cost ?? 0}
          amountOf={(entry) => entry.costText}
          emptyText={pending ? t('m.loading') : t('s.noCost')}
          note={costScope}
          tooltip={props.tooltip}
          onPickSegment={(segment) => pick('model', segment.key, segment.label)}
        />
        <PieCard
          title={t('dist.shareTokens')}
          group={t('dist.byProject')}
          totalText={fmtTokens(sumTokens(projectEntries))}
          entries={projectEntries}
          valueOf={(entry) => entry.tokens}
          amountOf={(entry) => fmtTokens(entry.tokens)}
          emptyText={pending ? t('s.loading') : t('empty.noUsage')}
          tooltip={props.tooltip}
          onPickSegment={(segment) => pick('project', segment.key, segment.label)}
        />
        <PieCard
          title={t('dist.shareCost')}
          group={t('dist.byProject')}
          totalText={mergedCostText(projectEntries.filter((entry) => entry.cost !== null))}
          entries={projectEntries.filter((entry) => entry.cost !== null)}
          valueOf={(entry) => entry.cost ?? 0}
          amountOf={(entry) => entry.costText}
          emptyText={pending ? t('s.loading') : t('s.noCost')}
          note={costScope}
          tooltip={props.tooltip}
          onPickSegment={(segment) => pick('project', segment.key, segment.label)}
        />

        <div className={styles.cloudCard}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>{t('dist.words')}</span>
            <span className={styles.cardTotal}>{t('dist.wordsHint', { count: String(props.prompts?.totalPrompts ?? 0) })}</span>
          </div>
          <WordCloud words={props.prompts?.words ?? []} emptyText={t('dist.noPrompts')} />
        </div>
      </div>

      {picked !== null && (
        <div className={listStyles.focusChip}>
          {t('dist.picked', { label: picked.label })}
          <button type="button" className={listStyles.focusClear} onClick={() => setPicked(null)} aria-label={t('p.clearFilter')}>✕</button>
        </div>
      )}

      <div className={styles.detailsBar}>
        <span className={styles.detailsTitle}>{t('dist.tablesHint')}</span>
        <Button size="sm" active={tableOpen} onClick={() => setTableOpen(!tableOpen)}>
          {tableOpen ? t('dist.hideTable') : t('dist.showTable')}
        </Button>
      </div>

      {tableOpen && (
        <div className={styles.tables}>
          <section>
            <div className={styles.tableTitle}>{t('dist.modelsDetails')}</div>
            <ModelsTab data={props.models} channels={props.channels} focusModel={modelsFocus} focusProvider={channelsFocus} />
          </section>
          <section>
            <div className={styles.tableTitle}>{t('dist.projectsDetails')}</div>
            <ProjectsTab
              data={props.projects}
              channels={props.channels}
              focusWorkspace={projectsFocus}
              focusProvider={channelsFocus}
              hideFocusChip
              onClearFocus={() => { setPicked(null); props.onClearFocus?.() }}
            />
          </section>
        </div>
      )}
    </div>
  )
}

/** 一张占比卡：标题 + 分组 + 合计，只放环形图；点某段可下钻。 */
function PieCard(props: {
  title: string
  group: string
  totalText: string
  entries: ShareEntry[]
  valueOf: (entry: ShareEntry) => number
  amountOf: (entry: ShareEntry) => string
  emptyText: string
  note?: string
  tooltip: TooltipApi
  onPickSegment: (segment: ShareSegment) => void
}): ReactNode {
  const segments = segmentsOf(props.entries, props.valueOf, props.amountOf)
  return (
    <div className={sharedStyles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{props.title}<span className={styles.cardGroup}>{props.group}</span></span>
        <span className={styles.cardTotal}>{props.totalText}</span>
      </div>
      {segments.length === 0
        ? <div className={sharedStyles.empty}>{props.emptyText}</div>
        : (
          <div className={styles.cardBody}>
            <PieChart
              title={props.title + ' · ' + props.group}
              ariaLabel={props.title + ' ' + props.group + ' ' + props.totalText}
              tooltip={props.tooltip}
              segments={segments}
              onPickSegment={props.onPickSegment}
            />
          </div>
        )}
      {props.note === undefined || segments.length === 0 ? null : <div className={styles.note}>{props.note}</div>}
    </div>
  )
}

/** 项目视图的行：名字沿用「项目用量」表，过滤掉零用量行。 */
function projectEntriesOf(rows: ProjectRow[], channels: Channel[], focusWorkspace: string | null): ShareEntry[] {
  return rows
    .filter((row) => focusWorkspace === null || row.workspace === focusWorkspace || (row.paths ?? []).includes(focusWorkspace))
    .map((row) => {
      const channel = channelOf(channels, row.dominantProvider)
      return {
        key: row.workspace === '' ? 'orphan' : row.workspace,
        label: row.workspaceTitle ?? (row.registered === false ? t('p.orphan') : baseNameOf(row.workspace)),
        tokens: row.tokens,
        cost: costOfRow(channel, row),
        costText: rowMoneyViewOf(row).text,
        costRow: row,
      }
    })
}

/** 模型视图的行：跨通道同名模型要带通道短名，否则会出现几行一模一样的名字。 */
function modelEntriesOf(rows: ModelAggregateRow[], channels: Channel[]): ShareEntry[] {
  const nameCount = new Map<string, number>()
  for (const row of rows) nameCount.set(row.model, (nameCount.get(row.model) ?? 0) + 1)
  return rows.map((row) => {
    const sameName = (nameCount.get(row.model) ?? 0) > 1
    const channelName = row.providerLabel ?? channelOf(channels, row.provider)?.displayName ?? row.provider
    return {
      key: row.provider + '|' + row.model,
      label: row.model === '' ? t('m.others') : sameName ? row.model + ' · ' + channelName : row.model,
      tokens: row.tokens,
      cost: costOfRow(channelOf(channels, row.provider), row),
      costText: rowMoneyViewOf(row).text,
      costRow: row,
    }
  })
}

/** 通道视图的行：同 provider 的模型用量累加（成本口径与模型卡一致，供「按通道」Token 图用）。 */
function channelEntriesOf(rows: ModelAggregateRow[], channels: Channel[]): ShareEntry[] {
  const byProvider = new Map<string, { tokens: number; cost: number }>()
  for (const row of rows) {
    const entry = byProvider.get(row.provider) ?? { tokens: 0, cost: 0 }
    entry.tokens += row.tokens
    entry.cost += costOfRow(channelOf(channels, row.provider), row) ?? 0
    byProvider.set(row.provider, entry)
  }
  return [...byProvider.entries()].map(([provider, entry]) => ({
    key: provider,
    label: channelOf(channels, provider)?.displayName ?? provider,
    tokens: entry.tokens,
    // 通道卡只画 Tokens：成本字段留 null（避免与「成本按模型」卡口径打架）
    cost: null,
    costText: '',
    costRow: { cost: null } as CostRowLike,
  }))
}

/**
 * 该行计入成本占比的金额：订阅 / 免费 / 无计费通道没有单价成本（表里显示「订阅内」这类占位），
 * 混币种又取不到汇率时 `comparableMoneyOf` 给 null —— 两种行都不参与，不按 0 摊进分母。
 */
function costOfRow(channel: Channel | null, row: CostRowLike): number | null {
  if (!costCellOf(channel, row).amount) return null
  const comparable = comparableMoneyOf(row)
  return comparable !== null && comparable > 0 ? comparable : null
}

/** 取前 N 段（按排名给调色板色），其余并成一段「其它」。 */
function segmentsOf(
  entries: ShareEntry[],
  valueOf: (entry: ShareEntry) => number,
  amountOf: (entry: ShareEntry) => string,
): ShareSegment[] {
  const sorted = entries
    .map((entry) => ({ entry, value: valueOf(entry) }))
    .filter((item) => item.value > 0)
    .sort((first, second) => second.value - first.value)
  const segments = sorted.slice(0, MAX_SEGMENTS).map((item, index) => ({
    key: item.entry.key,
    label: item.entry.label,
    value: item.value,
    color: SLICE_COLORS[index % SLICE_COLORS.length] ?? OTHERS_COLOR,
    amountText: amountOf(item.entry),
  }))
  const tail = sorted.slice(MAX_SEGMENTS)
  if (tail.length === 0) return segments
  segments.push({
    key: 'others',
    label: t('m.others'),
    value: tail.reduce((sum, item) => sum + item.value, 0),
    color: OTHERS_COLOR,
    amountText: mergedAmountTextOf(tail.map((item) => item.entry), amountOf),
  })
  return segments
}

/** 合并段的文本：金额段逐币种相加，数量段直接累加。 */
function mergedAmountTextOf(entries: ShareEntry[], amountOf: (entry: ShareEntry) => string): string {
  if (entries.length === 0) return '—'
  const sample = amountOf(entries[0])
  if (/[¥$]/.test(sample) || /CNY|USD/.test(sample)) return mergedCostText(entries)
  return fmtTokens(entries.reduce((sum, entry) => sum + entry.tokens, 0))
}

/** 合并段的金额：逐币种相加后仍走 `rowMoneyViewOf`，缺汇率时如实并列、不相加。 */
function mergedCostText(entries: ShareEntry[]): string {
  const totals: CostsByCurrency = {}
  for (const entry of entries) {
    const byCurrency = entry.costRow.costsByCurrency
    if (byCurrency !== undefined && byCurrency !== null && Object.keys(byCurrency).length > 0) {
      for (const [currency, amount] of Object.entries(byCurrency)) {
        if (Number.isFinite(amount)) totals[currency] = (totals[currency] ?? 0) + amount
      }
      continue
    }
    const fallback = entry.costRow.cost
    if (typeof fallback === 'number' && Number.isFinite(fallback)) totals.CNY = (totals.CNY ?? 0) + fallback
  }
  return Object.keys(totals).length === 0 ? '—' : rowMoneyViewOf({ costsByCurrency: totals }).text
}

function sumTokens(entries: ShareEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.tokens, 0)
}

/** 会话数据覆盖度结论：与两张列表同一套文案（不完整 / 不可用）。 */
function coverageTextOf(coverage: SessionCoverage): string {
  if (coverage.status === 'unavailable') return t('s.unavailable')
  return t('s.partial') + String(coverage.skippedSessions) + t('s.partialTail')
}
