/**
 * 占比条：全部通道→通道占比；单通道→模型占比。
 * 只有一条堆叠横条，名字与百分比走悬停 tip（不再列表展示）。
 */
import type { ReactNode } from 'react'
import { channelColorOf, displayNameOf } from '../channels.ts'
import { fmtTokens } from '../format.ts'
import type { Channel, UsageResponse } from '../types.ts'
import { TipRow, TipSub, TipTitle, type TooltipApi } from '../tooltip.tsx'
import styles from '../styles/shared.module.css'
import detailStyles from '../styles/detail.module.css'

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
  const { usage, totalTokens, channels } = props
  if (usage === null || totalTokens <= 0) {
    return (
      <div className={styles.card}>
        <div className={styles.statLabel}>占比 · 按 Tokens</div>
        <div className={styles.empty} style={{ padding: '8px 0' }}>所选范围内无用量记录</div>
      </div>
    )
  }
  let rows: ShareRow[] = []
  let title = '通道占比 · 按 Tokens'
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
    title = '模型占比 · 按 Tokens'
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
  return (
    <div className={styles.card}>
      <div className={styles.statLabel}>{title}</div>
      <div className={detailStyles.shareBar}>
        {rows.map((row) => {
          const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0
          return (
            <i
              key={row.key}
              style={{ width: (row.tokens / totalTokens * 100) + '%', background: row.color }}
              onMouseMove={(event) => props.tooltip.show(event, (
                <>
                  <TipTitle>{row.label}</TipTitle>
                  <TipSub>占比 <b>{percent}%</b></TipSub>
                  <TipRow color={row.color} label="Tokens" amount={fmtTokens(row.tokens)} rate={percent + '%'} />
                </>
              ))}
              onMouseLeave={props.tooltip.hide}
            />
          )
        })}
      </div>
    </div>
  )
}
