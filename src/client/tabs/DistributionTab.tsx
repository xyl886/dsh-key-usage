/** 分布：项目用量与按模型合并成一页，图表优先（Tokens 占比 / 成本占比），明细表默认收起。 */
import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button.tsx'
import { channelColorOf, channelOf, costCellOf } from '../core/channels.ts'
import { comparableMoneyOf, rowMoneyViewOf, type CostRowLike } from '../core/currency.ts'
import { fmtTokens } from '../core/format.ts'
import { t, useT } from '../core/i18n.ts'
import { dropEmptyRows } from '../core/rows.ts'
import { TipRow, TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import type { Channel, CostsByCurrency, ModelAggregateRow, ModelsResponse, ProjectRow, ProjectsResponse, SessionCoverage } from '../core/types.ts'
import detailStyles from '../styles/detail.module.css'
import styles from '../styles/distribution.module.css'
import sharedStyles from '../styles/shared.module.css'
import { ModelsTab } from './ModelsTab.tsx'
import { ProjectsTab, baseNameOf } from './ProjectsTab.tsx'

/** 占比条最多画几段，其余并成一段「其它」（不丢弃，否则条形占比不足 100%）。 */
const MAX_SEGMENTS = 8

/** 「其它」段的色块：中立灰，与通道配色区分开。 */
const OTHERS_COLOR = 'var(--dsw-alias-interactive-bg-active, rgba(128, 128, 140, .32))'

type ViewKey = 'project' | 'model'

/** 占比条的一段：数值、文本、颜色都已按该卡片的口径算好，渲染层不再判断。 */
interface ShareSegment {
  key: string
  label: string
  value: number
  color: string
  amountText: string
}

/** 一行在图表里的形态：两种视图共用，Tokens 与成本两张卡只是取值口径不同。 */
interface ShareEntry {
  key: string
  label: string
  color: string
  tokens: number
  /** 展示币种下的可比成本；null = 不参与成本占比。 */
  cost: number | null
  costText: string
  /** 原始成本字段：合并「其它」时逐币种相加，仍走 currency.ts 的同一口径。 */
  costRow: CostRowLike
}

export function DistributionTab(props: {
  projects: ProjectsResponse | null
  models: ModelsResponse | null
  channels: Channel[]
  /** 图表悬停浮层：复用页面里同一个 tip 实例。 */
  tooltip: TooltipApi
  /** 跨 Tab 联动：从「会话用量」点工作目录进来时只看这一个项目（null = 不过滤）。 */
  focusWorkspace?: string | null
  onClearFocus?: () => void
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const [view, setView] = useState<ViewKey>('project')
  const [tableOpen, setTableOpen] = useState(false)
  const focusWorkspace = props.focusWorkspace ?? null
  const projectRows = dropEmptyRows(props.projects?.rows ?? [], (row) => row.tokens).rows
  const modelRows = dropEmptyRows(props.models?.rows ?? [], (row) => row.tokens).rows
  /** 零 Token 行本来就上不了表（失败调用），图表与表格同口径；联动筛选在项目视图里同样生效。 */
  const entries: ShareEntry[] = view === 'project'
    ? projectEntries(projectRows, props.channels, focusWorkspace)
    : modelEntries(modelRows, props.channels)

  const costEntries = entries.filter((entry) => entry.cost !== null)
  const tokensSegments = segmentsOf(entries, (entry) => entry.tokens, (entry) => fmtTokens(entry.tokens), (tail) => fmtTokens(sumTokens(tail)))
  const costSegments = segmentsOf(costEntries, (entry) => entry.cost ?? 0, (entry) => entry.costText, mergedCostText)
  /** 数据还没到（或这一档读取失败）时先说读取中；到了但没量再给具体结论。 */
  const pending = view === 'project' ? props.projects === null : props.models === null
  const pendingText = view === 'project' ? t('s.loading') : t('m.loading')
  /** 会话数据不完整时图表也要说一句：表格收起时只有这里能看到（展开后由表格自己报，不重复）。 */
  const coverage = view === 'project' ? props.projects?.coverage : props.models?.coverage

  return (
    <div>
      <div className={styles.switchBar}>
        <span className={styles.switchGroup}>
          <Button size="sm" active={view === 'project'} onClick={() => setView('project')}>{t('dist.byProject')}</Button>
          <Button size="sm" active={view === 'model'} onClick={() => setView('model')}>{t('dist.byModel')}</Button>
        </span>
        <Button size="sm" active={tableOpen} onClick={() => setTableOpen(!tableOpen)}>
          {tableOpen ? t('dist.hideTable') : t('dist.showTable')}
        </Button>
      </div>

      {!tableOpen && coverage !== undefined && coverage.status !== 'complete' && (
        <div className={sharedStyles.warning}>{coverageTextOf(coverage)}</div>
      )}

      <div className={styles.cards}>
        <ShareCard
          title={t('dist.shareTokens')}
          totalText={fmtTokens(sumTokens(entries))}
          segments={tokensSegments}
          emptyText={pending ? pendingText : t('empty.noUsage')}
          tooltip={props.tooltip}
        />
        <ShareCard
          title={t('dist.shareCost')}
          totalText={mergedCostText(costEntries)}
          segments={costSegments}
          emptyText={pending ? pendingText : t('s.noCost')}
          tooltip={props.tooltip}
        />
      </div>

      {/* 表格默认收起：展开后直接用现成的两个页，筛选 / 排序 / 导出 / 联动都不重做 */}
      {tableOpen && (
        <div className={styles.tableWrap}>
          {view === 'project'
            ? <ProjectsTab data={props.projects} channels={props.channels} focusWorkspace={focusWorkspace} onClearFocus={props.onClearFocus} />
            : <ModelsTab data={props.models} channels={props.channels} />}
        </div>
      )}
    </div>
  )
}

/** 一张占比卡：标题 + 合计、占比条、逐段图例；条形本身是图例的可视化副本，读屏只读图例。 */
function ShareCard(props: {
  title: string
  totalText: string
  segments: ShareSegment[]
  /** 没有可展示数值时的结论文案。 */
  emptyText: string
  tooltip: TooltipApi
}): ReactNode {
  const total = props.segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <div className={sharedStyles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{props.title}</span>
        <span className={styles.cardTotal}>{props.totalText}</span>
      </div>
      {props.segments.length === 0
        ? <div className={sharedStyles.empty}>{props.emptyText}</div>
        : (
          <>
            <div
              className={detailStyles.shareBar}
              aria-hidden="true"
              onMouseMove={(event) => props.tooltip.show(event, (
                <>
                  <TipTitle>{props.title}</TipTitle>
                  <TipSub>{t('sh.shareAll')}</TipSub>
                  {props.segments.map((segment) => (
                    <TipRow
                      key={segment.key}
                      color={segment.color}
                      label={segment.label}
                      amount={segment.amountText}
                      rate={percentOf(segment.value, total) + '%'}
                    />
                  ))}
                </>
              ))}
              onMouseLeave={props.tooltip.hide}
            >
              {props.segments.map((segment) => (
                <i key={segment.key} style={{ width: (segment.value / total * 100) + '%', background: segment.color }} />
              ))}
            </div>
            <div className={styles.legend}>
              {props.segments.map((segment) => (
                <div key={segment.key} className={styles.legendRow}>
                  <i className={styles.legendDot} style={{ background: segment.color }} />
                  <span className={styles.legendName} title={segment.label}>{segment.label}</span>
                  <span className={styles.legendValue}>{segment.amountText}</span>
                  <span className={styles.legendRate}>{percentOf(segment.value, total)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
    </div>
  )
}

/** 项目视图的行：名字与颜色沿用「项目用量」表，联动筛选按目录命中（合并行也要能被筛出来）。 */
function projectEntries(rows: ProjectRow[], channels: Channel[], focusWorkspace: string | null): ShareEntry[] {
  return rows
    .filter((row) => focusWorkspace === null || row.workspace === focusWorkspace || (row.paths ?? []).includes(focusWorkspace))
    .map((row) => {
      const channel = channelOf(channels, row.dominantProvider)
      return {
        key: row.workspace === '' ? 'orphan' : row.workspace,
        label: row.workspaceTitle ?? (row.registered === false ? t('p.orphan') : baseNameOf(row.workspace)),
        color: channelColorOf(channels, row.dominantProvider ?? ''),
        tokens: row.tokens,
        cost: costOfRow(channel, row),
        costText: rowMoneyViewOf(row).text,
        costRow: row,
      }
    })
}

/** 模型视图的行：名字与颜色沿用「按模型」表。 */
function modelEntries(rows: ModelAggregateRow[], channels: Channel[]): ShareEntry[] {
  return rows.map((row) => ({
    key: row.provider + '|' + row.model,
    label: row.model === '' ? t('m.others') : row.model,
    color: channelColorOf(channels, row.provider),
    tokens: row.tokens,
    cost: costOfRow(channelOf(channels, row.provider), row),
    costText: rowMoneyViewOf(row).text,
    costRow: row,
  }))
}

/**
 * 该行计入成本占比的金额：计费模式为订阅 / 免费 / 无计费的通道没有单价成本（表里显示「订阅内」这类占位），
 * 混币种又取不到汇率时 `comparableMoneyOf` 给 null —— 这两种行都不参与，不按 0 摊进分母。
 */
function costOfRow(channel: Channel | null, row: CostRowLike): number | null {
  if (!costCellOf(channel, row).amount) return null
  const comparable = comparableMoneyOf(row)
  return comparable !== null && comparable > 0 ? comparable : null
}

/** 取前 N 段，其余并成一段「其它」。 */
function segmentsOf(
  entries: ShareEntry[],
  valueOf: (entry: ShareEntry) => number,
  textOf: (entry: ShareEntry) => string,
  mergedTextOf: (entries: ShareEntry[]) => string,
): ShareSegment[] {
  const sorted = entries
    .map((entry) => ({ entry, value: valueOf(entry) }))
    .filter((item) => item.value > 0)
    .sort((first, second) => second.value - first.value)
  const segments = sorted.slice(0, MAX_SEGMENTS).map((item) => ({
    key: item.entry.key,
    label: item.entry.label,
    value: item.value,
    color: item.entry.color,
    amountText: textOf(item.entry),
  }))
  const tail = sorted.slice(MAX_SEGMENTS)
  if (tail.length === 0) return segments
  segments.push({
    key: 'others',
    label: t('m.others'),
    value: tail.reduce((sum, item) => sum + item.value, 0),
    color: OTHERS_COLOR,
    amountText: mergedTextOf(tail.map((item) => item.entry)),
  })
  return segments
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
    // 旧服务端没有逐币种小计时按 `cost` 兜底（与 currency.ts 的兜底口径一致：当 CNY）
    const fallback = entry.costRow.cost
    if (typeof fallback === 'number' && Number.isFinite(fallback)) totals.CNY = (totals.CNY ?? 0) + fallback
  }
  return rowMoneyViewOf({ costsByCurrency: totals }).text
}

function sumTokens(entries: ShareEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.tokens, 0)
}

function percentOf(value: number, total: number): number {
  return total > 0 ? Math.round(value / total * 100) : 0
}

/** 会话数据覆盖度结论：与两张列表同一套文案（不完整 / 不可用）。 */
function coverageTextOf(coverage: SessionCoverage): string {
  if (coverage.status === 'unavailable') return t('s.unavailable')
  return t('s.partial') + String(coverage.skippedSessions) + t('s.partialTail')
}
