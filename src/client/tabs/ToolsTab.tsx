/**
 * 工具与技能：会话事件里的 `tool/call` 统计（工具 Top7 / 技能 Top6+其它 / MCP server Top8 / 工具占比 + 窗口内迷你柱）。
 *
 * 数据来自 `GET /tools`（窗口 + 项目 + 模型跟随顶部筛选，服务端按会话折叠里的按天计数表聚合）；
 * 首屏与请求失败时用统一快照的 `tools` 段兜底（全部会话、全量历史）；`null` = 暂无采集（老库 / 读不到会话），
 * 显示占位而不是 0。占比口径由服务端算好（该行次数 / 同类总次数），界面只做取整与条宽换算。
 */
import { useMemo, type ReactNode } from 'react'
import { failureReasonOf, SNAPSHOT_PATH } from '../core/api.ts'
import { fmtCount, fmtShortDate, fmtTokens } from '../core/format.ts'
import { t, useT } from '../core/i18n.ts'
import type { ToolsResponse } from '../core/types.ts'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import styles from '../styles/tools.module.css'

/** 工具占比堆叠条只单列前 4 个工具，其余并成「其它」。 */
const SHARE_TOP_LIMIT = 4
/** 条宽下限（2%）：0 宽的条看起来像没渲染。 */
const MIN_BAR_PERCENT = 2

interface RankRowView {
  key: string
  label: string
  calls: number
  sharePercent: number
  /** 横条宽度（相对本榜最大次数，百分比）。 */
  barPercent: number
  /** 本榜第一名：实色条。 */
  top: boolean
  /** 「其它」汇总行：弱化色。 */
  muted?: boolean
}

/** 排行榜行：名字 + 横条 + 次数 + 占比（正文 13px）。 */
/** 工具名归一：MCP 调用显示成「server · tool」，不把双下划线原始名摊到界面上。 */
function displayToolNameOf(name: string): string {
  const match = /^mcp__([A-Za-z0-9_-]+?)__(.+)$/.exec(name)
  return match === null ? name : match[1] + ' · ' + match[2]
}
function RankRows(props: { rows: RankRowView[] }): ReactNode {
  return (
    <>
      {props.rows.map((row) => (
        <div className={styles.row} key={row.key}>
          <span className={styles.rowName} title={row.label}>{row.label}</span>
          <span className={styles.rowTrack}>
            <i
              className={row.muted === true ? styles.rowFillOther : row.top ? styles.rowFillTop : styles.rowFill}
              style={{ width: Math.max(MIN_BAR_PERCENT, Math.round(row.barPercent)) + '%' }}
            />
          </span>
          <span className={styles.rowValue}>{fmtTokens(row.calls)}</span>
          <span className={styles.rowPercent}>{Math.round(row.sharePercent) + '%'}</span>
        </div>
      ))}
    </>
  )
}

/** 横条宽度：相对本榜最大次数（第一名 100%）。 */
function barPercentOf(calls: number, maxCalls: number): number {
  if (maxCalls <= 0) return 0
  return calls / maxCalls * 100
}

export function ToolsTab(props: { data: ToolsResponse | null }): ReactNode {
  const t = useT()
  const data = props.data

  const share = useMemo(() => {
    if (data === null) return null
    const topRows = data.tools.slice(0, SHARE_TOP_LIMIT)
    const topCalls = topRows.reduce((total, row) => total + row.calls, 0)
    const otherCalls = Math.max(0, data.calls - topCalls)
    return { topRows, otherCalls }
  }, [data])

  // 暂无采集（或一整份工具调用都没有）：占位；请求失败时补一行原因（服务端原因只进日志，这里只显示状态）
  if (data === null || data.calls <= 0 || share === null) {
    const reason = failureReasonOf(SNAPSHOT_PATH)
    return (
      <div className={styles.page}>
        <EmptyState title={t('tools.empty')} reason={reason} />
      </div>
    )
  }

  const maxToolCalls = data.tools.length > 0 ? data.tools[0].calls : 0
  const toolRows: RankRowView[] = data.tools.map((row, index) => ({
    key: 'tool-' + row.name,
    label: displayToolNameOf(row.name),
    calls: row.calls,
    sharePercent: row.sharePercent,
    barPercent: barPercentOf(row.calls, maxToolCalls),
    top: index === 0,
  }))

  const skills = data.skills
  const skillOtherVisible = skills.other.count > 0 && skills.other.calls > 0
  // 条宽只按「命名行」的最大值换算；「其它」行照原型固定满格并用弱化色（它汇总的是长尾，不与单行比大小）
  const skillMaxCalls = skills.rows[0]?.calls ?? 0
  const skillRows: RankRowView[] = skills.rows.map((row, index) => ({
    key: 'skill-' + row.name,
    label: row.name,
    calls: row.calls,
    sharePercent: row.sharePercent,
    barPercent: barPercentOf(row.calls, skillMaxCalls),
    top: index === 0,
  }))
  if (skillOtherVisible) {
    skillRows.push({
      key: 'skill-other',
      label: t('tools.otherCount', { count: fmtCount(skills.other.count) }),
      calls: skills.other.calls,
      sharePercent: skills.calls > 0 ? skills.other.calls / skills.calls * 100 : 0,
      barPercent: 100,
      top: false,
      muted: true,
    })
  }

  const mcp = data.mcp
  const mcpMaxCalls = mcp.rows[0]?.calls ?? 0
  const mcpRows: RankRowView[] = mcp.rows.map((row, index) => ({
    key: 'mcp-' + row.server,
    label: row.server,
    calls: row.calls,
    sharePercent: row.sharePercent,
    barPercent: barPercentOf(row.calls, mcpMaxCalls),
    top: index === 0,
  }))

  // 堆叠条：前四按真实次数分配宽度，标签里的百分比取整；「其它」= 100 − 前四取整之和，保证合计 100%
  const topDisplayPercents = share.topRows.map((row) => Math.round(row.sharePercent))
  const otherDisplayPercent = Math.max(0, 100 - topDisplayPercents.reduce((total, percent) => total + percent, 0))
  const maxDayCalls = Math.max(1, ...data.days.map((day) => day.calls))

  return (
    <div className={styles.page}>
      <div className={styles.grid2}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{t('tools.tools')}</h3>
            <span className={styles.panelTag}>{t('tools.noChannel')}</span>
            <span className={styles.panelMeta}>
              <span className={styles.headNum}>{fmtTokens(data.calls)}</span> {t('tools.callsUnit')} ·{' '}
              <span className={styles.headNum}>{fmtCount(data.sessions)}</span> {t('tools.sessionsUnit')}
            </span>
          </div>
          <RankRows rows={toolRows} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{t('tools.skills')}</h3>
            <span className={styles.panelMeta}>
              <span className={styles.headNum}>{fmtCount(skills.calls)}</span> {t('tools.callsUnit')} ·{' '}
              <span className={styles.headNum}>{fmtCount(skills.count)}</span> {t('tools.skillsUnit')}
            </span>
          </div>
          {skillRows.length === 0
            ? <div className={styles.dimLine}>{t('tools.none')}</div>
            : <RankRows rows={skillRows} />}
        </section>
      </div>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{t('tools.mcp')}</h3>
            <span className={styles.panelMeta}>
              <span className={styles.headNum}>{fmtCount(mcp.count)}</span> {t('tools.serversUnit')} ·{' '}
              <span className={styles.headNum}>{fmtCount(mcp.calls)}</span> {t('tools.callsUnit')}
            </span>
          </div>
          {mcpRows.length === 0
            ? <div className={styles.dimLine}>{t('tools.none')}</div>
            : <RankRows rows={mcpRows} />}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{t('tools.share')}</h3>
            {share.topRows.length > 0 && (
              <span className={styles.panelMeta}>{t('tools.shareTop', { name: share.topRows[0].name })}</span>
            )}
          </div>
          <div className={styles.stack}>
            {share.topRows.map((row, index) => (
              <div
                key={'share-' + row.name}
                className={styles.stackSegment + ' ' + styles['stack' + String(index + 1)]}
                style={{ flexGrow: Math.max(1, topDisplayPercents[index]) }}
                title={row.name + ' · ' + topDisplayPercents[index] + '%'}
              >
                {row.name} {topDisplayPercents[index]}%
              </div>
            ))}
            {share.otherCalls > 0 && (
              <div
                className={styles.stackSegment + ' ' + styles.stackOther}
                style={{ flexGrow: Math.max(1, otherDisplayPercent) }}
                title={t('tools.other') + ' · ' + otherDisplayPercent + '%'}
              >
                {t('tools.other')} {otherDisplayPercent}%
              </div>
            )}
          </div>
          <div className={styles.legend}>
            {share.topRows.map((row, index) => (
              <span key={'legend-' + row.name}>
                <i className={styles['dot' + String(index + 1)]} />
                {row.name} {fmtTokens(row.calls)}
              </span>
            ))}
            {share.otherCalls > 0 && (
              <span>
                <i className={styles.dotOther} />
                {t('tools.other')} {fmtTokens(share.otherCalls)}
              </span>
            )}
          </div>
          <div className={styles.mini}>
            {data.days.map((day) => {
              const heightPercent = day.calls / maxDayCalls * 100
              const isTop = day.calls > 0 && day.calls === maxDayCalls
              return (
                <div className={styles.miniItem} key={'day-' + day.date}>
                  <i
                    className={isTop ? styles.miniBar + ' ' + styles.miniBarTop : styles.miniBar}
                    style={{ height: (day.calls > 0 ? Math.max(4, heightPercent) : 0) + '%' }}
                    title={t('tools.dayBarTitle', { date: fmtShortDate(day.date), calls: fmtCount(day.calls) })}
                  />
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
