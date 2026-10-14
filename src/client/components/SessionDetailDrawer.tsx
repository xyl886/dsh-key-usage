/**
 * 会话详情抽屉：点会话行后从右侧滑出，数据来自 `/dsh-key-usage/session?id=…`。
 * 服务端只折叠这一个会话，所以打开很快；读不出来时它降级返回头部字段 + 说明，这里照常展示。
 */
import { useEffect, useState, type ReactNode } from 'react'
import { failureReasonOf, loadSessionDetail, sessionDetailPath } from '../api.ts'
import { channelOf, costCellText, displayNameOf, showsAmount } from '../channels.ts'
import { fmtCalls, fmtDateTime, fmtDuration, fmtTokens } from '../format.ts'
import { costSourceHintOf } from '../pricing.ts'
import { CostSourceChip } from './CostSourceChip.tsx'
import type { Channel, SessionDetail, SessionDetailResponse } from '../types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'

export function SessionDetailDrawer(props: {
  sessionId: string
  /** 列表里那一行的标题，详情还没到时先顶上，避免抽屉标题空着 */
  fallbackTitle: string | null
  channels: Channel[]
  onClose: () => void
}): ReactNode {
  const [data, setData] = useState<SessionDetailResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setFailed(false)
    void loadSessionDetail(props.sessionId).then((result) => {
      if (cancelled) return
      setData(result)
      setFailed(result === null)
    })
    return () => { cancelled = true }
  }, [props.sessionId])

  // Esc 关闭：抽屉是浮层，键盘用户也要能退出来
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => { if (event.key === 'Escape') props.onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props.onClose])

  const session = data?.session ?? null
  return (
    <div className={listStyles.drawerMask} onClick={props.onClose}>
      <div
        className={listStyles.drawerPanel}
        role="dialog"
        aria-modal="true"
        aria-label="会话详情"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={listStyles.drawerHead}>
          <div className={listStyles.drawerTitle}>
            {session?.title ?? props.fallbackTitle ?? '（无提问）· ' + shortIdOf(props.sessionId)}
            {session?.archived === true && <span className={listStyles.archivedTag}>已归档</span>}
          </div>
          <button type="button" className={listStyles.drawerClose} onClick={props.onClose} aria-label="关闭会话详情">✕</button>
        </div>
        <div className={listStyles.drawerId}>{props.sessionId}</div>

        {data === null && !failed && <div className={styles.empty}>会话详情读取中…</div>}
        {failed && (
          <div className={styles.warning}>
            会话详情读取失败：{failureReasonOf(sessionDetailPath(props.sessionId)) ?? '未知原因'}
          </div>
        )}
        {data !== null && data.coverage.status !== 'complete' && (
          <div className={styles.warning}>
            {data.coverage.status === 'unavailable' ? '会话用量不可用' : '会话用量不完整'}
            {data.coverage.reason === null ? '' : '：' + data.coverage.reason}
          </div>
        )}

        {data !== null && session !== null && (
          <SessionDetailBody session={session} channels={props.channels} priced={data.priced} />
        )}
        {data !== null && session === null && <div className={styles.empty}>该会话没有可展示的详情</div>}
      </div>
    </div>
  )
}

function SessionDetailBody(props: { session: SessionDetail; channels: Channel[]; priced: boolean }): ReactNode {
  const session = props.session
  const channel = channelOf(props.channels, session.provider)
  const costCell = costCellText(channel, session.cost ?? 0)
  return (
    <div>
      <div className={listStyles.detailGrid}>
        <DetailItem label="工作区" value={session.workspace ?? '未归属工作区'} wide />
        <DetailItem label="通道" value={session.provider === null ? '—' : (session.providerLabel ?? displayNameOf(props.channels, session.provider))} />
        <DetailItem label="计费模式" value={channel === null ? '—' : channel.costLabel} />
        <DetailItem label="首次" value={fmtDateTime(session.firstTime)} />
        <DetailItem label="最近" value={fmtDateTime(session.lastTime)} />
        <DetailItem
          label="时长"
          value={fmtDuration(session.durationMs) + (session.crossDays >= 1 ? '（跨 ' + String(session.crossDays) + ' 天）' : '')}
        />
        <DetailItem label="活跃天数" value={String(session.days)} />
      </div>

      <div className={listStyles.detailStrip}>
        <StripItem label="Tokens" value={fmtTokens(session.tokens)} note="输入 + 输出 + 缓存读" />
        <StripItem label="输入" value={fmtTokens(session.buckets.inputTokens)} />
        <StripItem label="输出" value={fmtTokens(session.buckets.outputTokens)} />
        <StripItem label="缓存读" value={fmtTokens(session.buckets.cacheReadTokens)} />
        <StripItem label="缓存写" value={fmtTokens(session.buckets.cacheWriteTokens)} note="只参与计费" />
        <StripItem label="命中率" value={session.cacheHitRate === null ? '—' : session.cacheHitRate.toFixed(1) + '%'} />
        <StripItem label="调用" value={fmtCalls(session.calls)} note="结算样本数" />
      </div>

      <div className={listStyles.detailBlock}>
        <div className={listStyles.detailBlockTitle}>成本</div>
        <div className={listStyles.detailCost}>
          <span className={costCell.dim ? styles.dim : undefined}>{costCell.text}</span>
          {showsAmount(costCell) && <CostSourceChip source={session.costSource} partial={session.partial} />}
          {/* 「订阅内 / 无计费 / —」不是金额，这时再解释来源只会误导 */}
          {showsAmount(costCell) && <span className={listStyles.detailCostHint}>{costSourceHintOf(session.costSource, session.partial)}</span>}
        </div>
        {/* 有计费规则时 `priced` 仍可能是 false（它指「台账里有可反推的均价」），所以只在真的没金额时说明 */}
        {!props.priced && session.cost === null && <div className={styles.statExtra}>台账里没有成本数据，也没有命中计费规则，暂时只能显示「—」</div>}
      </div>

      <div className={listStyles.detailBlock}>
        <div className={listStyles.detailBlockTitle}>首条提问</div>
        {session.prompt === null
          ? <div className={styles.empty}>这个会话没有人类提问（可能是 teammate / 系统会话）</div>
          : <div className={listStyles.promptText}>{session.prompt}</div>}
      </div>

      <div className={listStyles.detailBlock}>
        <div className={listStyles.detailBlockTitle}>逐模型用量</div>
        {session.models.length === 0
          ? <div className={styles.empty}>没有按模型的用量记录</div>
          : (
            <table className={styles.table + ' ' + listStyles.sessionDetailModelTable}>
              <thead>
                <tr><th>模型</th><th>Tokens</th><th>占比</th><th>成本</th></tr>
              </thead>
              <tbody>
                {session.models.map((model) => {
                  const modelCostCell = costCellText(channelOf(props.channels, model.provider), model.cost ?? 0)
                  return (
                    <tr key={model.provider + '|' + model.model}>
                      <td>
                        <div className={listStyles.listMain}>{model.model}</div>
                        <div className={listStyles.listSub}>{model.providerLabel} · {fmtCalls(model.calls)} 次</div>
                      </td>
                      <td>{fmtTokens(model.tokens)}</td>
                      <td>
                        <span className={listStyles.listBar}>
                          <i style={{ width: Math.max(2, model.sharePercent) + '%', background: 'var(--dsw-alias-state-accent-primary, #5b8cff)' }} />
                        </span> {model.sharePercent}%
                      </td>
                      <td>
                        {model.cost === null || !showsAmount(modelCostCell)
                          ? <span className={styles.dim}>{modelCostCell.text}</span>
                          : <>{modelCostCell.text}<CostSourceChip source={model.costSource} partial={model.partial} /></>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {session.hours !== null && (
        <div className={listStyles.detailBlock}>
          <div className={listStyles.detailBlockTitle}>一天里的分布（各小时合计，跨天会话已累加）</div>
          <HourMiniChart hours={session.hours} />
        </div>
      )}
    </div>
  )
}

/** 24 小时迷你图：柱高按该会话的小时峰值归一，数值在悬停与读屏文本里给出。 */
function HourMiniChart(props: { hours: Array<{ calls: number; tokens: number }> }): ReactNode {
  const peak = props.hours.reduce((max, hour) => Math.max(max, hour.tokens), 0)
  return (
    <div className={listStyles.hourChart} role="img" aria-label={hourChartSummary(props.hours)}>
      {props.hours.map((hour, index) => (
        <div className={listStyles.hourBar} key={index} title={String(index) + ' 时 · ' + fmtTokens(hour.tokens) + ' · ' + fmtCalls(hour.calls) + ' 次'}>
          <span className={listStyles.hourBarFill} style={{ height: peak > 0 ? Math.round(hour.tokens / peak * 100) + '%' : '0%' }} />
          <span className={listStyles.hourBarTick}>{index % 6 === 0 ? String(index) : ''}</span>
        </div>
      ))}
    </div>
  )
}

/** 读屏用户的数值概述：柱状图本身只有悬停才看得到数。 */
function hourChartSummary(hours: Array<{ calls: number; tokens: number }>): string {
  const busiest = hours.reduce((best, hour, index) => (hour.tokens > hours[best].tokens ? index : best), 0)
  return hours[busiest].tokens === 0
    ? '该会话没有按小时的用量分布'
    : '最忙的是 ' + String(busiest) + ' 时，' + fmtTokens(hours[busiest].tokens) + ' tokens'
}

function DetailItem(props: { label: string; value: string; wide?: boolean }): ReactNode {
  return (
    <div className={props.wide === true ? listStyles.detailItemWide : listStyles.detailItem}>
      <div className={listStyles.detailItemLabel}>{props.label}</div>
      <div className={listStyles.detailItemValue}>{props.value}</div>
    </div>
  )
}

function StripItem(props: { label: string; value: string; note?: string }): ReactNode {
  return (
    <div className={listStyles.detailStripItem}>
      <div className={listStyles.detailItemLabel}>{props.label}</div>
      <div className={listStyles.detailItemValue}>{props.value}</div>
      {props.note !== undefined && <div className={listStyles.detailItemNote}>{props.note}</div>}
    </div>
  )
}

/** 会话头通常不带标题，用 id 的短片段做可读标识。 */
function shortIdOf(id: string): string {
  return id.replace(/^session-/, '').slice(0, 8)
}
