/** 占比条：全部通道看通道占比，单通道看模型占比（名字与百分比走悬停 tip）。 */
import type { ReactNode } from 'react'
import { channelColorOf, displayNameOf } from '../core/channels.ts'
import { fmtTokens } from '../core/format.ts'
import type { Channel, UsageResponse } from '../core/types.ts'
import { TipRow, TipSub, TipTitle, type TooltipApi } from '../core/tooltip.tsx'
import styles from '../styles/shared.module.css'
import detailStyles from '../styles/detail.module.css'
import { t, useT } from '../core/i18n.ts'

interface ShareRow {
  key: string
  label: string
  tokens: number
  color: string
}

export function ShareBar(props: {
  usage: UsageResponse | null
  totalTokens: number
  channelFilter: string
  channels: Channel[]
  tooltip: TooltipApi
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const { usage, totalTokens, channels } = props
  if (usage === null || totalTokens <= 0) {
    return (
      <div className={styles.card}>
        <div className={styles.statLabel}>{t('sh.shareByTokens')}</div>
        <div className={styles.empty} style={{ padding: '8px 0' }}>{t('empty.noUsage')}</div>
      </div>
    )
  }
  let rows: ShareRow[] = []
  let title = t('sh.channels')
  if (props.channelFilter === 'ALL') {
    const byProvider = new Map<string, number>()
    for (const day of usage.days) {
      for (const model of day.models) {
        byProvider.set(model.provider, (byProvider.get(model.provider) ?? 0) + model.inputTokens + model.outputTokens + model.cacheReadTokens)
      }
    }
    rows = [...byProvider.entries()].map(([provider, tokens]) => ({
      key: provider, label: displayNameOf(channels, provider), tokens, color: channelColorOf(channels, provider),
    }))
  } else {
    title = t('sh.models')
    const byModel = new Map<string, { tokens: number; provider: string }>()
    for (const day of usage.days) {
      for (const model of day.models) {
        const bucket = byModel.get(model.model)
        const tokens = model.inputTokens + model.outputTokens + model.cacheReadTokens
        if (bucket === undefined) byModel.set(model.model, { tokens, provider: model.provider })
        else bucket.tokens += tokens
      }
    }
    rows = [...byModel.entries()].map(([model, value]) => ({
      key: model, label: model, tokens: value.tokens, color: channelColorOf(channels, value.provider),
    }))
  }
  rows.sort((first, second) => second.tokens - first.tokens)
  // 每段的数值只有悬停才看得到，读屏用户拿不到；这里给出前几名的文本概述
  const shareSummary = rows.length === 0
    ? title + t('sh.noData')
    : title + '：' + rows.slice(0, 3)
      .map((row) => row.label + ' ' + String(totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0) + '%')
      .join('、') + (rows.length > 3 ? t('sh.morePrefix') + String(rows.length) + t('sh.moreSuffix') : '')
  return (
    <div className={styles.card}>
      <div className={styles.statLabel}>{title}</div>
      <div
        className={detailStyles.shareBar}
        role="img"
        aria-label={shareSummary}
        onMouseMove={(event) => props.tooltip.show(event, (
          <>
            <TipTitle>{title}</TipTitle>
            <TipSub>{t('sh.shareAll')}</TipSub>
            {rows.map((row) => (
              <TipRow
                key={row.key}
                color={row.color}
                label={row.label}
                amount={fmtTokens(row.tokens)}
                rate={(totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0) + '%'}
              />
            ))}
          </>
        ))}
        onMouseLeave={props.tooltip.hide}
      >
        {rows.map((row) => {
          const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0
          return (
            <i key={row.key} style={{ width: (row.tokens / totalTokens * 100) + '%', background: row.color }} />
          )
        })}
      </div>
    </div>
  )
}
