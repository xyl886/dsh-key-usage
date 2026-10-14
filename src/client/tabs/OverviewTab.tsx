/** 总览：Key 清单表（原型列结构）+ 年度热力图。 */
import type { ReactNode } from 'react'
import { costCellOf, statusColorOf } from '../channels.ts'
import { fmtCalls, fmtTokens } from '../format.ts'
import type { Channel, HeatmapDay, QuotaProvider, SummaryResponse } from '../types.ts'
import type { TooltipApi } from '../tooltip.tsx'
import { Heatmap } from '../components/Heatmap.tsx'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import styles from '../styles/shared.module.css'
import overviewStyles from '../styles/overview.module.css'

export function OverviewTab(props: {
  channels: Channel[]
  summary: SummaryResponse | null
  quotas: QuotaProvider[]
  heatmap: HeatmapDay[]
  tooltip: TooltipApi
  onOpenDetail: (provider: string) => void
}): ReactNode {
  const { channels, summary } = props
  return (
    <div>
      <div className={styles.groupLabel}>Key 清单</div>
      <table className={overviewStyles.keyTable}>
        <thead>
          <tr>
            <th>通道</th><th>类型</th><th>今日</th><th>近 30 天</th><th>余额 / 窗口</th><th>30 天成本</th><th></th>
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => {
            const row = summary?.channels.find((item) => item.provider === channel.provider) ?? null
            const todayTokens = row === null ? 0 : row.today.tokens
            const monthTokens = row === null ? 0 : row.month.tokens
            const costCell = costCellOf(channel, row?.month ?? {})
            const disabled = channel.status === 'off'
            return (
              <tr
                key={channel.provider}
                className={disabled ? overviewStyles.disabledRow : overviewStyles.clickable}
                onClick={disabled ? undefined : () => props.onOpenDetail(channel.provider)}
              >
                <td>
                  <div className={overviewStyles.cellKey}>
                    <span className={styles.statusDot} style={{ background: statusColorOf(channel.status) }} />
                    <div className={overviewStyles.keyDisplay}>{channel.displayName}</div>
                  </div>
                </td>
                <td><span className={tagClassOf(channel)}>{channel.status === 'off' ? '未配置' : channel.costLabel}</span></td>
                <td>{todayTokens > 0 ? fmtTokens(todayTokens) : <span className={styles.dim}>—</span>}</td>
                <td>{monthTokens > 0 ? fmtTokens(monthTokens) : <span className={styles.dim}>—</span>}</td>
                <td>{quotaCellOf(channel)}</td>
                <td>{costCell.dim ? <span className={styles.dim}>{costCell.text}</span> : <>{costCell.text}{costCell.amount && <CostSourceChip source={row?.month.costSource} partial={row?.month.partial} />}</>}</td>
                <td>{disabled ? null : <span className={overviewStyles.rowLink}>明细 →</span>}</td>
              </tr>
            )
          })}
          {channels.length === 0 && <tr><td colSpan={7} className={styles.empty}>未读取到通道配置</td></tr>}
        </tbody>
      </table>

      <Heatmap days={props.heatmap} channels={channels} tooltip={props.tooltip} />

      {summary === null && (
        <div className={styles.empty}>台账读取中或不可用，今日 / 近 30 天列为空</div>
      )}
      {props.quotas.length === 0 && channels.length > 0 && (
        <div className={styles.empty}>未读取到余额快照，余额 / 窗口列显示为 —</div>
      )}
    </div>
  )
}

function tagClassOf(channel: Channel): string {
  const base = overviewStyles.tag
  if (channel.status === 'off') return base + ' ' + overviewStyles.off
  if (channel.costMode === 'free') return base + ' ' + overviewStyles.free
  if (channel.costMode === 'sub') return base + ' ' + overviewStyles.sub
  return base
}

function quotaCellOf(channel: Channel): ReactNode {
  if (channel.costMode === 'sub' && channel.quotaPercent !== null) {
    const percent = channel.quotaPercent
    const levelClass = percent >= 90 ? overviewStyles.danger : percent >= 60 ? overviewStyles.warn : ''
    const windowLabel = channel.quotaWindowLabel ?? channel.quotaWindowKey ?? ''
    return (
      <span className={overviewStyles.quotaCell}>
        <span className={overviewStyles.miniBar}>
          <i style={{ width: Math.max(2, percent) + '%', background: percent >= 60 ? 'var(--dsw-alias-state-warning-primary, #e0a13c)' : 'var(--dsw-alias-state-success-primary, #3fb96f)' }} />
        </span>
        <span className={[overviewStyles.quotaText, levelClass].join(' ').trim()}>{windowLabel} {percent}%</span>
      </span>
    )
  }
  if (channel.balanceText !== null) {
    const levelClass = channel.status === 'danger' ? overviewStyles.danger : channel.status === 'warn' ? overviewStyles.warn : ''
    return (
      <span className={overviewStyles.quotaCell}>
        <span className={[overviewStyles.quotaText, levelClass].join(' ').trim()}>{channel.balanceText}</span>
      </span>
    )
  }
  const fallback = channel.costMode === 'none' ? '无计费' : channel.costMode === 'free' ? '—' : '未查询'
  return <span className={[overviewStyles.quotaText, overviewStyles.dim].join(' ')}>{fallback}</span>
}

/** 供标题行使用的调用汇总（占位保持导出面稳定）。 */
export function overviewCaptionOf(summary: SummaryResponse | null): string {
  if (summary === null) return '台账不可用'
  const calls = summary.channels.reduce((total, row) => total + row.month.calls, 0)
  return fmtCalls(calls) + ' 次调用'
}
