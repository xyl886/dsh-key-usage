/**
 * 分布：项目 × 模型（Mekko 成本占比）、缓存节省、成本构成、通道成本；末尾是提问词云（KPI + 云 + 词表）。
 * 金额一律走 `currency.ts` 的收口函数；颜色只用宿主 `--dsw-alias-*` 令牌。
 */
import { useState, type ReactNode } from 'react'
import { WordCloud } from '../components/WordCloud.tsx'
import { Button } from '../components/ui/Button.tsx'
import { channelOf } from '../core/channels.ts'
import { comparableMoneyOf, moneyTextOf, rowMoneyViewOf, type CostRowLike } from '../core/currency.ts'
import { downloadCsv } from '../core/export-csv.ts'
import { fmtCalls, fmtCount, fmtTokens } from '../core/format.ts'
import { t, useT } from '../core/i18n.ts'
import { dropEmptyRows } from '../core/rows.ts'
import type { TooltipApi } from '../core/tooltip.tsx'
import type {
  Channel, CostsByCurrency, ModelAggregateRow, ModelsResponse, ProjectRow, ProjectsResponse,
  PromptsResponse, SessionCoverage, UsageResponse,
} from '../core/types.ts'
import styles from '../styles/distribution.module.css'
import listStyles from '../styles/lists.module.css'
import overviewStyles from '../styles/overview.module.css'
import sharedStyles from '../styles/shared.module.css'
import { ModelsTab } from './ModelsTab.tsx'
import { ProjectsTab, baseNameOf } from './ProjectsTab.tsx'

/** 最多单列几个项目，其余并成一块「其它」：再切下去字只会互相挤。 */
const MAX_PROJECT_BLOCKS = 5
/** 缓存节省 / 通道成本各最多几行（含「其它」）：与原型两张卡片的高度对齐。 */
const MAX_CACHE_ROWS = 4
const MAX_CHANNEL_ROWS = 3
/** 排行条的可见下限（2%），0 宽度的条看起来像没渲染。 */
const MIN_BAR_PERCENT = 2
/** 块宽低于这个百分比只留名字：金额放进去会溢出。 */
const TINY_BLOCK_PERCENT = 2.5
/** 块宽达到这个百分比才把「名字 + 金额」放在同一行，并腾出空间写逐模型占比。 */
const WIDE_BLOCK_PERCENT = 20
/** 宽块里列几个模型：前二已经能说明「钱花在哪个模型上」，第三行起放不下。 */
const MAX_BLOCK_MODELS = 2
/** 词表最多列几行：服务端最多下发 60 个词，页面只列高频的前 30 个（导出仍给全量）。 */
const MAX_WORD_ROWS = 30

/**
 * 项目块配色：按成本排名轮换。每个色都与 `label-primary` 混合 —— 亮色主题里压暗、暗色主题里提亮，
 * 这样配 `label-primary-foreground`（亮色主题白、暗色主题黑）始终可读；色相仍来自宿主状态色。
 */
const PROJECT_COLORS = [
  'color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 85%, var(--dsw-alias-label-primary, #111))',
  'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a13c) 60%, var(--dsw-alias-label-primary, #111))',
  'color-mix(in srgb, var(--dsw-alias-state-success-primary, #3fb96f) 60%, var(--dsw-alias-label-primary, #111))',
  'color-mix(in srgb, var(--dsw-alias-state-error-primary, #e05a5a) 60%, var(--dsw-alias-label-primary, #111))',
  'color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 55%, var(--dsw-alias-label-primary, #111))',
]

/** 「其它」块 / 合并行用中性底色，避免被误读成某个通道。 */
const OTHERS_BG = 'var(--dsw-alias-interactive-bg-active, rgba(128, 128, 140, .22))'

/** 服务端在 `/usage` 的 `totals` 上补的缓存省钱；逐模型行暂未下发，缺字段时金额显示 —。 */
type CacheSavedModelRow = ModelAggregateRow & {
  cacheSaved?: number | null
  cacheSavedByCurrency?: CostsByCurrency
}

interface MekkoBlock {
  key: string
  label: string
  amountText: string
  percent: number
  color: string
  textColor: string
  /** 宽块里逐模型 tokens 占比（最多两个）；「其它」块为空数组。 */
  models: Array<{ label: string; percent: number }>
}

interface RankRow {
  key: string
  label: string
  /** 条宽权重：有钱按钱、没钱按缓存读 tokens。 */
  weight: number
  amountText: string
  metaText: string
}

interface CacheEntry {
  key: string
  label: string
  cacheRead: number
  saved: number | null
  amountText: string
}

export function DistributionTab(props: {
  projects: ProjectsResponse | null
  models: ModelsResponse | null
  prompts: PromptsResponse | null
  channels: Channel[]
  tooltip: TooltipApi
  /** `/usage` 范围合计：缓存节省的「合计」只从它的 `totals` 取；未接线时只给按模型的缓存读排行。 */
  usage?: UsageResponse | null
  /** 跨 Tab 联动：从「会话用量」点工作目录进来时只看这一个项目（null = 不过滤）。 */
  focusWorkspace?: string | null
  onClearFocus?: () => void
}): ReactNode {
  const t = useT()
  const [tableOpen, setTableOpen] = useState(false)
  const focusWorkspace = props.focusWorkspace ?? null

  const projectRows = dropEmptyRows(props.projects?.rows ?? [], (row) => row.tokens).rows
  const modelRows = dropEmptyRows(props.models?.rows ?? [], (row) => row.tokens).rows
  // 项目块与项目明细跟随外部联动筛选（从会话页点工作目录进来时）
  const scopedProjects = projectRows.filter((row) => (
    focusWorkspace === null || row.workspace === focusWorkspace || (row.paths ?? []).includes(focusWorkspace)
  ))
  const coverage = props.projects?.coverage ?? props.models?.coverage

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

      <MekkoPanel projects={scopedProjects} loading={props.projects === null} />

      <div className={styles.grid}>
        <CacheSavingsPanel models={modelRows} usage={props.usage ?? null} loading={props.models === null} />
        <CostMixPanel models={modelRows} loading={props.models === null} />
        <ChannelCostPanel models={modelRows} channels={props.channels} loading={props.models === null} />
      </div>

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
            <ModelsTab data={props.models} channels={props.channels} />
          </section>
          <section>
            <div className={styles.tableTitle}>{t('dist.projectsDetails')}</div>
            <ProjectsTab
              data={props.projects}
              channels={props.channels}
              focusWorkspace={focusWorkspace}
              hideFocusChip
              onClearFocus={() => props.onClearFocus?.()}
            />
          </section>
        </div>
      )}

      <PromptCloudPanel prompts={props.prompts} />
    </div>
  )
}

/** 项目 × 模型：块宽 = 该项目成本占总成本比例；宽块写前二模型占比，窄块只留名字 / 金额。 */
function MekkoPanel(props: { projects: ProjectRow[]; loading: boolean }): ReactNode {
  const t = useT()
  const blocks = mekkoBlocksOf(props.projects)
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>{t('dist.projectModel')}</span>
        <span className={styles.panelNote}>{t('dist.totalCost')}</span>
      </div>
      {blocks.length === 0
        ? <div className={sharedStyles.empty}>{props.loading ? t('s.loading') : t('s.noCost')}</div>
        : (
          <div className={styles.mekko}>
            {blocks.map((block, index) => {
              // 第一名即使不宽也尽量给逐模型占比：它是这张图最该回答的问题
              const wide = block.percent >= WIDE_BLOCK_PERCENT || (index === 0 && block.percent >= 8)
              const tiny = block.percent < TINY_BLOCK_PERCENT
              return (
                <div
                  key={block.key}
                  className={wide ? styles.mekkoBlock : styles.mekkoBlock + ' ' + styles.mekkoBlockCompact}
                  style={{ flexGrow: block.percent, flexBasis: 0, background: block.color, color: block.textColor }}
                  title={block.label + ' ' + block.amountText}
                >
                  <span className={styles.mekkoHead}>
                    <span className={styles.mekkoName}>{block.label}</span>
                    {wide && <span className={styles.mekkoAmount}>{block.amountText}</span>}
                  </span>
                  {!wide && !tiny && <span className={styles.mekkoAmount}>{block.amountText}</span>}
                  {wide && block.models.map((model, modelIndex) => (
                    <span key={block.key + ':model:' + String(modelIndex)} className={styles.mekkoModel}>
                      {model.label} {model.percent}%
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

/** 缓存节省：模型 + 横条 + 金额 + 缓存读 tokens；合计取 `/usage` 的 totals。 */
function CacheSavingsPanel(props: { models: ModelAggregateRow[]; usage: UsageResponse | null; loading: boolean }): ReactNode {
  const t = useT()
  const { rows, totalText } = cacheSavingsOf(props.models, props.usage)
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>{t('dist.cacheSave')}</span>
        <span className={styles.panelNote}>{t('balance.totalInline', { value: totalText })}</span>
      </div>
      {rows.length === 0
        ? <div className={sharedStyles.empty}>{props.loading ? t('s.loading') : t('empty.noUsage')}</div>
        : rows.map((row, index) => <RankLine key={row.key} row={row} top={index === 0} />)}
    </div>
  )
}

/** 成本构成：输出 / 缓存读的 token 占比 + 图例（金额无法按 token 类型拆，这里只按 token 类型说明）。 */
function CostMixPanel(props: { models: ModelAggregateRow[]; loading: boolean }): ReactNode {
  const t = useT()
  const output = props.models.reduce((sum, row) => sum + row.buckets.outputTokens, 0)
  const cacheRead = props.models.reduce((sum, row) => sum + row.buckets.cacheReadTokens, 0)
  const total = output + cacheRead
  const outputShare = total > 0 ? output / total * 100 : 0
  const cacheShare = total > 0 ? 100 - outputShare : 0
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>{t('dist.costMix')}</span>
        <span className={styles.panelNote}>{t('dist.byTokenType')}</span>
      </div>
      {total === 0
        ? <div className={sharedStyles.empty}>{props.loading ? t('s.loading') : t('empty.noUsage')}</div>
        : (
          <>
            <div className={styles.stackBar}>
              {outputShare > 0 && (
                <span className={styles.stackOutput} style={{ flexGrow: outputShare }}>
                  {outputShare >= 8 ? t('c.output') + ' ' + Math.round(outputShare) + '%' : ''}
                </span>
              )}
              {cacheShare > 0 && (
                <span className={styles.stackCache} style={{ flexGrow: cacheShare }}>
                  {cacheShare >= 8 ? t('c.cacheRead') + ' ' + Math.round(cacheShare) + '%' : ''}
                </span>
              )}
            </div>
            <div className={styles.legend}>
              <span><i className={styles.legendOutput} />{t('c.output')} {fmtTokens(output)}</span>
              <span><i className={styles.legendCache} />{t('c.cacheRead')} {fmtTokens(cacheRead)}</span>
            </div>
          </>
        )}
    </div>
  )
}

/** 通道成本：按通道汇总模型行的成本，取前几名 + 「其它」。 */
function ChannelCostPanel(props: { models: ModelAggregateRow[]; channels: Channel[]; loading: boolean }): ReactNode {
  const t = useT()
  const { rows, channelCount } = channelCostOf(props.models, props.channels)
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>{t('dist.channelCost')}</span>
        <span className={styles.panelNote}>{t('dist.countUnit', { count: channelCount })}</span>
      </div>
      {rows.length === 0
        ? <div className={sharedStyles.empty}>{props.loading ? t('s.loading') : t('s.noCost')}</div>
        : rows.map((row, index) => <RankLine key={row.key} row={row} top={index === 0} />)}
    </div>
  )
}

/**
 * 提问词云：云 + 4 张 KPI + 词表（可导出）。
 * 数据全在 `/prompts`：占比 = 词频 ÷ 参与统计的提问条数；服务端只下发词与频次，不下发提问原文。
 */
function PromptCloudPanel(props: { prompts: PromptsResponse | null }): ReactNode {
  const t = useT()
  const prompts = props.prompts
  const words = prompts === null ? [] : [...prompts.words].sort((first, second) => second.count - first.count)
  const totalPrompts = prompts === null ? null : prompts.totalPrompts
  const totalChars = prompts === null ? null : prompts.totalChars
  const topWord = words[0]
  return (
    <div className={styles.cloudCard}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>{t('dist.words')}</span>
        <span className={styles.panelAction}>
          <Button
            size="sm"
            disabled={words.length === 0}
            onClick={() => exportWordCsv(words, totalPrompts)}
          >{t('export.csv')}</Button>
        </span>
      </div>
      <WordCloud
        words={words}
        emptyText={prompts === null ? t('s.loading') : t('dist.noPrompts')}
      />
      <div className={overviewStyles.kpiRow + ' ' + styles.cloudKpis}>
        <CloudKpi label={t('dist.kpiPrompts')} value={totalPrompts === null ? '—' : fmtCalls(totalPrompts)} />
        <CloudKpi label={t('dist.kpiChars')} value={totalChars === null ? '—' : fmtCount(totalChars)} />
        <CloudKpi label={t('dist.kpiWords')} value={prompts === null ? '—' : fmtCount(words.length)} />
        <CloudKpi label={t('dist.kpiTop')} value={topWord === undefined ? '—' : topWord.word} />
      </div>
      {words.length > 0 && (
        <table className={sharedStyles.table}>
          <thead>
            <tr>
              <th scope="col">{t('dist.colWord')}</th>
              <th scope="col">{t('dist.colCount')}</th>
              <th scope="col">{t('m.share')}</th>
            </tr>
          </thead>
          <tbody>
            {words.slice(0, MAX_WORD_ROWS).map((entry) => (
              <tr key={entry.word}>
                <td>{entry.word}</td>
                <td>{fmtCalls(entry.count)}</td>
                <td>{wordShareTextOf(entry.count, totalPrompts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** KPI 小卡：与总览同一套卡片样式（标签 + 数值），不加解释行。 */
function CloudKpi(props: { label: string; value: string }): ReactNode {
  return (
    <div className={overviewStyles.kpiCard}>
      <div className={overviewStyles.kpiLabel}>{props.label}</div>
      <div className={overviewStyles.kpiValue}>{props.value}</div>
    </div>
  )
}

/** 词频占比：保留一位小数；没有参与统计的提问时给 —（不除零）。 */
function wordShareTextOf(count: number, totalPrompts: number | null): string {
  if (totalPrompts === null || totalPrompts <= 0) return '—'
  return (count / totalPrompts * 100).toFixed(1) + '%'
}

/** 词表导出：列与页面表格同口径（百分数写在表头，单元格只放数值）；导出全部词。 */
function exportWordCsv(words: Array<{ word: string; count: number }>, totalPrompts: number | null): void {
  const header = [t('dist.colWord'), t('dist.colCount'), t('m.share') + '(%)']
  const rows = words.map((entry) => [
    entry.word,
    entry.count,
    totalPrompts === null || totalPrompts <= 0 ? '' : (entry.count / totalPrompts * 100).toFixed(1),
  ])
  downloadCsv('dsh-key-usage-提问词表-' + new Date().toISOString().slice(0, 10) + '.csv', header, rows)
}

/** 一条排行：名字 + 横条 + 金额 + 右侧附注（缓存读 tokens / 占比）。 */
function RankLine(props: { row: RankRow; top: boolean }): ReactNode {
  return (
    <div className={styles.row}>
      <span className={styles.rowName} title={props.row.label}>{props.row.label}</span>
      <span className={styles.rowTrack}>
        <i
          className={props.top ? styles.rowFillTop : styles.rowFill}
          style={{ width: Math.max(MIN_BAR_PERCENT, props.row.weight) + '%' }}
        />
      </span>
      <span className={styles.rowAmount}>{props.row.amountText}</span>
      <span className={styles.rowMeta}>{props.row.metaText}</span>
    </div>
  )
}

/** 项目块：按可比成本降序，前 N 名各占一块，其余并成「其它」。 */
function mekkoBlocksOf(projects: ProjectRow[]): MekkoBlock[] {
  const priced = projects
    .map((row) => ({ row, cost: comparableMoneyOf(row) }))
    .filter((item): item is { row: ProjectRow; cost: number } => item.cost !== null && item.cost > 0)
    .sort((first, second) => second.cost - first.cost)
  const total = priced.reduce((sum, item) => sum + item.cost, 0)
  if (total <= 0) return []

  const blocks: MekkoBlock[] = priced.slice(0, MAX_PROJECT_BLOCKS).map((item, index) => ({
    key: 'project:' + item.row.workspace,
    label: projectLabelOf(item.row),
    amountText: rowMoneyViewOf(item.row).text,
    percent: item.cost / total * 100,
    color: PROJECT_COLORS[index % PROJECT_COLORS.length] ?? OTHERS_BG,
    textColor: 'var(--dsw-alias-label-primary-foreground, #fff)',
    models: topModelsOf(item.row),
  }))

  const tail = priced.slice(MAX_PROJECT_BLOCKS)
  if (tail.length > 0) {
    blocks.push({
      key: 'project:others',
      label: t('m.others'),
      amountText: moneyTextOfRows(tail.map((item) => item.row)),
      percent: tail.reduce((sum, item) => sum + item.cost, 0) / total * 100,
      color: OTHERS_BG,
      textColor: 'var(--dsw-alias-label-primary, #e8e8ec)',
      models: [],
    })
  }
  return blocks
}

/** 项目展示名：宿主工作区名 > 「未归入工作区」 > 目录名。 */
function projectLabelOf(row: ProjectRow): string {
  const title = row.workspaceTitle
  if (title !== undefined && title !== null && title !== '') return title
  if (row.registered === false) return t('p.orphan')
  return row.workspace === '' ? t('p.orphan') : baseNameOf(row.workspace)
}

/** 项目内 tokens 最多的前两个模型及占比（项目行的模型没有逐模型成本，占比只能按 tokens 算）。 */
function topModelsOf(row: ProjectRow): Array<{ label: string; percent: number }> {
  const models = row.models ?? []
  const total = models.reduce((sum, entry) => sum + entry.tokens, 0)
  if (total <= 0) return []
  return [...models]
    .sort((first, second) => second.tokens - first.tokens)
    .slice(0, MAX_BLOCK_MODELS)
    .map((entry) => ({
      label: entry.model === '' ? t('m.others') : entry.model,
      percent: Math.round(entry.tokens / total * 100),
    }))
}

/** 缓存节省排行：有钱按钱、没钱按缓存读 tokens 排序；合计只从 `/usage` totals 取。 */
function cacheSavingsOf(models: ModelAggregateRow[], usage: UsageResponse | null): { rows: RankRow[]; totalText: string } {
  // 同名模型跨通道会出现两行一样的名字：补通道短名区分
  const nameCount = new Map<string, number>()
  for (const row of models) nameCount.set(row.model, (nameCount.get(row.model) ?? 0) + 1)
  const entries: CacheEntry[] = models
    // 没有价目的模型省不出钱（服务端也算 0），不进这张排行榜
    .filter((row) => row.buckets.cacheReadTokens > 0 && (row.cost !== null || typeof (row as CacheSavedModelRow).cacheSaved === 'number'))
    .map((row) => {
      const extended = row as CacheSavedModelRow
      const saved = typeof extended.cacheSaved === 'number' && Number.isFinite(extended.cacheSaved) ? extended.cacheSaved : null
      const savedByCurrency = extended.cacheSavedByCurrency
      const hasCurrency = savedByCurrency !== undefined && savedByCurrency !== null && Object.keys(savedByCurrency).length > 0
      const baseLabel = row.model === '' ? t('m.others') : row.model
      return {
        key: 'cache:' + row.provider + '|' + row.model,
        label: (nameCount.get(row.model) ?? 0) > 1 ? baseLabel + ' · ' + (row.providerLabel || row.provider) : baseLabel,
        cacheRead: row.buckets.cacheReadTokens,
        saved,
        amountText: hasCurrency
          ? rowMoneyViewOf({ costsByCurrency: savedByCurrency }).text
          : saved === null ? '—' : moneyTextOf('CNY', saved),
      }
    })
  const hasAmounts = entries.some((entry) => entry.saved !== null)
  const weightOf = (entry: CacheEntry): number => hasAmounts ? (entry.saved ?? 0) : entry.cacheRead
  const sorted = [...entries].sort((first, second) => weightOf(second) - weightOf(first))

  const named = sorted.length <= MAX_CACHE_ROWS ? sorted : sorted.slice(0, MAX_CACHE_ROWS - 1)
  const rows: RankRow[] = named.map((entry) => ({
    key: entry.key,
    label: entry.label,
    weight: weightOf(entry),
    amountText: entry.amountText,
    metaText: fmtTokens(entry.cacheRead),
  }))
  const tail = sorted.slice(named.length)
  if (tail.length > 0) {
    const savedTail = tail.filter((entry) => entry.saved !== null)
    rows.push({
      key: 'cache:others',
      label: t('dist.others', { count: tail.length }),
      weight: tail.reduce((sum, entry) => sum + weightOf(entry), 0),
      amountText: savedTail.length === tail.length ? moneyTextOf('CNY', savedTail.reduce((sum, entry) => sum + (entry.saved ?? 0), 0)) : '—',
      metaText: fmtTokens(tail.reduce((sum, entry) => sum + entry.cacheRead, 0)),
    })
  }

  const maxWeight = Math.max(1, ...rows.map((row) => row.weight))
  for (const row of rows) row.weight = row.weight / maxWeight * 100
  // 逐模型金额都到了就按行加总（与全历史的行同口径）；否则才用 /usage 的范围合计
  const rowTotal = entries.length > 0 && entries.every((entry) => entry.saved !== null)
    ? entries.reduce((sum, entry) => sum + (entry.saved ?? 0), 0)
    : null
  return { rows, totalText: rowTotal === null ? cacheTotalTextOf(usage) : moneyTextOf('CNY', rowTotal) }
}

/** `/usage` 合计里的缓存省钱：优先逐币种小计，缺了才回落单值（混币种语义同 `cost`）。 */
function cacheTotalTextOf(usage: UsageResponse | null): string {
  const totals = usage?.totals
  if (totals === undefined || totals === null) return '—'
  const byCurrency = totals.cacheSavedByCurrency
  if (byCurrency !== undefined && byCurrency !== null && Object.keys(byCurrency).length > 0) {
    return rowMoneyViewOf({ costsByCurrency: byCurrency }).text
  }
  const saved = totals.cacheSaved
  return typeof saved === 'number' && Number.isFinite(saved) ? moneyTextOf('CNY', saved) : '—'
}

/** 通道成本排行：同通道模型成本相加，取前几名 + 「其它」，条宽按占总成本比例。 */
function channelCostOf(models: ModelAggregateRow[], channels: Channel[]): { rows: RankRow[]; channelCount: number } {
  const byProvider = new Map<string, { label: string; costs: CostsByCurrency }>()
  for (const row of models) {
    const entry = byProvider.get(row.provider) ?? {
      label: channelOf(channels, row.provider)?.displayName ?? row.providerLabel ?? row.provider,
      costs: {},
    }
    addCosts(entry.costs, row)
    byProvider.set(row.provider, entry)
  }

  const priced = [...byProvider.entries()]
    .map(([provider, entry]) => ({ provider, label: entry.label, costs: entry.costs, comparable: comparableMoneyOf({ costsByCurrency: entry.costs }) }))
    .filter((entry): entry is { provider: string; label: string; costs: CostsByCurrency; comparable: number } => entry.comparable !== null && entry.comparable > 0)
    .sort((first, second) => second.comparable - first.comparable)
  const total = priced.reduce((sum, entry) => sum + entry.comparable, 0)
  if (total <= 0) return { rows: [], channelCount: 0 }

  const top = priced[0]
  const toRow = (entry: { provider: string; label: string; costs: CostsByCurrency; comparable: number }, key: string): RankRow => ({
    key,
    label: entry.label,
    weight: entry.comparable / top.comparable * 100,
    amountText: rowMoneyViewOf({ costsByCurrency: entry.costs }).text,
    metaText: Math.round(entry.comparable / total * 100) + '%',
  })

  const named = priced.length <= MAX_CHANNEL_ROWS ? priced : priced.slice(0, MAX_CHANNEL_ROWS - 1)
  const rows = named.map((entry) => toRow(entry, 'channel:' + entry.provider))
  const tail = priced.slice(named.length)
  if (tail.length > 0) {
    const costs: CostsByCurrency = {}
    for (const entry of tail) addCosts(costs, { costsByCurrency: entry.costs })
    const comparable = tail.reduce((sum, entry) => sum + entry.comparable, 0)
    rows.push({
      key: 'channel:others',
      label: t('dist.others', { count: tail.length }),
      weight: comparable / top.comparable * 100,
      amountText: rowMoneyViewOf({ costsByCurrency: costs }).text,
      metaText: Math.round(comparable / total * 100) + '%',
    })
  }
  return { rows, channelCount: priced.length }
}

/** 一行金额累加进逐币种小计；没有 `costsByCurrency` 时按 `cost` 兜底记 CNY。 */
function addCosts(target: CostsByCurrency, row: CostRowLike): void {
  const byCurrency = row.costsByCurrency
  if (byCurrency !== undefined && byCurrency !== null && Object.keys(byCurrency).length > 0) {
    for (const [currency, amount] of Object.entries(byCurrency)) {
      if (typeof amount === 'number' && Number.isFinite(amount)) target[currency] = (target[currency] ?? 0) + amount
    }
    return
  }
  const fallback = row.cost
  if (typeof fallback === 'number' && Number.isFinite(fallback)) target.CNY = (target.CNY ?? 0) + fallback
}

/** 多行金额合并成一行文本；一行都拿不到时返回 —。 */
function moneyTextOfRows(rows: CostRowLike[]): string {
  const totals: CostsByCurrency = {}
  for (const row of rows) addCosts(totals, row)
  return Object.keys(totals).length === 0 ? '—' : rowMoneyViewOf({ costsByCurrency: totals }).text
}

/** 会话数据覆盖度结论：与两张列表同一套文案（不完整 / 不可用）。 */
function coverageTextOf(coverage: SessionCoverage): string {
  if (coverage.status === 'unavailable') return t('s.unavailable')
  return t('s.partial') + String(coverage.skippedSessions) + t('s.partialTail')
}
