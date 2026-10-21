import type { ReactNode } from 'react'
import { COST_MODE_TAG_KEYS, WINDOW_TAG_KEYS, costCellOf, statusColorOf } from '../core/channels.ts'
import { fmtCalls, fmtTokens } from '../core/format.ts'
import type { Channel, HeatmapDay, QuotaProvider, SummaryResponse } from '../core/types.ts'
import type { TooltipApi } from '../core/tooltip.tsx'
import { Heatmap } from '../components/Heatmap.tsx'
import { CostSourceChip } from '../components/CostSourceChip.tsx'
import { t, useT } from '../core/i18n.ts'
import styles from '../styles/shared.module.css'
import overviewStyles from '../styles/overview.module.css'
import uiStyles from '../styles/ui.module.css'

export function OverviewTab(props: {
  channels: Channel[]
  summary: SummaryResponse | null
  quotas: QuotaProvider[]
  heatmap: HeatmapDay[]
  tooltip: TooltipApi
  onOpenDetail: (provider: string) => void
  /** 点通道行：打开该通道的余额/配额详情弹窗 */
  onOpenChannel: (provider: string) => void
  /** 点热力图某天：切到「使用明细」并定位到那一天 */
  onPickDay: (date: string) => void
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const { channels, summary } = props
  return (
    <div>
            <div className={uiStyles.tableScroll}><table className={overviewStyles.keyTable}>
        <thead>
          <tr>
            <th>{t('common.channel')}</th><th>{t('o.type')}</th><th>{t('r.today')}</th><th>{t('s.days30')}</th><th>{t('o.balanceWindow')}</th><th>{t('o.cost30')}</th><th></th>
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
                onClick={disabled ? undefined : () => props.onOpenChannel(channel.provider)}
              >
                <td>
                  <div className={overviewStyles.cellKey}>
                    <span className={styles.statusDot} style={{ background: statusColorOf(channel.status) }} />
                    <div className={overviewStyles.keyDisplay}>{channel.displayName}</div>
                  </div>
                </td>
                <td><span className={tagClassOf(channel)}>{t(COST_MODE_TAG_KEYS[channel.costMode] ?? 'ch.notQueried')}</span></td>
                <td>{todayTokens > 0 ? fmtTokens(todayTokens) : <span className={styles.dim}>—</span>}</td>
                <td>{monthTokens > 0 ? fmtTokens(monthTokens) : <span className={styles.dim}>—</span>}</td>
                <td>{quotaCellOf(channel)}</td>
                <td>{costCell.dim ? <span className={styles.dim}>{costCell.text}</span> : <>{costCell.text}{costCell.amount && <CostSourceChip source={row?.month.costSource} partial={row?.month.partial} />}</>}</td>
                <td>{disabled ? null : (
                <button type="button" className={overviewStyles.rowLink} onClick={(event) => { event.stopPropagation(); props.onOpenDetail(channel.provider) }}>
                  {t('o.detailArrow')}
                </button>
              )}</td>
              </tr>
            )
          })}
          {channels.length === 0 && <tr><td colSpan={7} className={styles.empty}>{t('o.noChannels')}</td></tr>}
        </tbody>
      </table></div>

      <Heatmap days={props.heatmap} channels={channels} tooltip={props.tooltip} onPickDay={props.onPickDay} />

      {summary === null && (
        <div className={styles.empty}>{t('o.ledgerHint')}</div>
      )}
      {props.quotas.length === 0 && channels.length > 0 && (
        <div className={styles.empty}>{t('o.snapshotHint')}</div>
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
    const windowLabel = channel.quotaWindowKey === null ? '' : t(WINDOW_TAG_KEYS[channel.quotaWindowKey] ?? channel.quotaWindowKey)
    return (
      <span className={overviewStyles.quotaCell}>
        <span className={overviewStyles.miniBar}>
          <i style={{ width: Math.max(2, percent) + '%', background: percent >= 60 ? 'var(--dsw-alias-state-warn-primary, #e0a13c)' : 'var(--dsw-alias-state-success-primary, #3fb96f)' }} />
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
  const fallback = channel.costMode === 'none' ? t('o.noBilling') : channel.costMode === 'free' ? '—' : t('o.notQueried')
  return <span className={[overviewStyles.quotaText, overviewStyles.dim].join(' ')}>{fallback}</span>
}

