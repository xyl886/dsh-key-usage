/** 会话详情抽屉：数据来自 `/session?id=…`（服务端只折叠这一个会话；读不出来时降级返回头部字段）。 */
import { useEffect, useState, type ReactNode } from 'react'
import { failureReasonOf, loadSessionDetail, sessionDetailPath } from '../core/api.ts'
import { logWarn } from '../core/log.ts'
import { LogHint } from './LogHint.tsx'
import { COST_MODE_KEYS, channelOf, costCellOf, displayNameOf } from '../core/channels.ts'
import { fmtCalls, fmtDateTime, fmtDuration, fmtTokens } from '../core/format.ts'
import { costSourceHintOf } from '../core/pricing.ts'
import { t, useT } from '../core/i18n.ts'
import { serverText } from '../core/serverText.ts'
import { CostSourceChip } from './CostSourceChip.tsx'
import type { Channel, SessionDetail, SessionDetailResponse, SessionRow } from '../core/types.ts'
import styles from '../styles/shared.module.css'
import listStyles from '../styles/lists.module.css'

export function SessionDetailDrawer(props: {
  sessionId: string
  /** 列表里那一行的标题，详情还没到时先顶上，避免抽屉标题空着 */
  fallbackTitle: string | null
  channels: Channel[]
  /** 挂在这个主会话下的子代理会话（列表默认不显示它们，这里给入口逐个点开）。 */
  subagents: SessionRow[]
  /** 切到某个子会话的详情（弹窗内容随之替换）。 */
  onOpenSession: (id: string) => void
  /** 当前看的是子会话时给出返回入口（列表里不显示子会话，只能从这里回去）。 */
  parentId: string | null
  parentTitle: string | null
  onClose: () => void
}): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
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
      // 失败原因进系统日志：抽屉里只留一行「读取失败 · 查看系统日志」
      if (result === null) logWarn('ledger', t('d.loadFailed') + ' · ' + props.sessionId, failureReasonOf(sessionDetailPath(props.sessionId)) ?? t('d.unknownReason'))
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
        aria-label={t('d.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={listStyles.drawerHead}>
          <div className={listStyles.drawerTitle}>
            {session?.title ?? props.fallbackTitle ?? t('s.noPrompt') + ' · ' + shortIdOf(props.sessionId)}
            {session?.archived === true && <span className={listStyles.archivedTag}>{t('s.archived')}</span>}
          </div>
          <button type="button" className={listStyles.drawerClose} onClick={props.onClose} aria-label={t('d.close')}>✕</button>
        </div>
        <div className={listStyles.drawerId}>{props.sessionId}</div>

        {props.parentId !== null && (
          <button
            type="button"
            className={listStyles.drawerBack}
            onClick={() => props.onOpenSession(props.parentId as string)}
          >
            {t('d.backToParent')}{props.parentTitle === null ? '' : '：' + props.parentTitle}
          </button>
        )}

        {data === null && !failed && <div className={styles.empty}>{t('d.loading')}</div>}
        {failed && (
          <div className={styles.warning}>
            <LogHint text={t('d.loadFailed')} tone="error" />
          </div>
        )}
        {data !== null && data.coverage.status !== 'complete' && (
          <div className={styles.warning}>
            {data.coverage.status === 'unavailable' ? t('d.unavailable') : t('d.partial')}
            {data.coverage.reason === null ? '' : '：' + serverText(data.coverage.reason)}
          </div>
        )}

        {data !== null && session !== null && (
          <SessionDetailBody session={session} channels={props.channels} priced={data.priced} />
        )}
        {data !== null && session === null && <div className={styles.empty}>{t('d.noDetail')}</div>}

        {props.subagents.length > 0 && (
          <div className={listStyles.subagentBlock}>
            <div className={listStyles.subagentBlockTitle}>
              {t('d.subagentCount', { count: props.subagents.length })}
            </div>
            {props.subagents.map((child) => (
              <button
                type="button"
                key={child.id}
                className={listStyles.subagentRow}
                onClick={() => props.onOpenSession(child.id)}
              >
                <span className={listStyles.subagentRowTitle}>{systemTitleOf(child.title) + ' · ' + shortIdOf(child.id)}</span>
                <span className={listStyles.subagentRowMeta}>{fmtTokens(child.tokens)} · {fmtCalls(child.calls)} · {fmtDateTime(child.lastTime)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** teammate / 系统会话的标题是运行时注入的长句，列表里只显示「系统会话」，细节看时间与目录。 */
function systemTitleOf(title: string | null): string {
  if (title === null || title.trim() === '') return t('d.systemSession')
  return /^(Current runtime context|no prompt)/i.test(title.trim()) ? t('d.systemSession') : title
}

function SessionDetailBody(props: { session: SessionDetail; channels: Channel[]; priced: boolean }): ReactNode {
  const session = props.session
  const channel = channelOf(props.channels, session.provider)
  const costCell = costCellOf(channel, session)
  return (
    <div className={listStyles.detailBody}>
      <div className={listStyles.detailGrid}>
        <DetailItem label={t('common.workspace')} value={session.workspace ?? t('s.noWorkspace')} wide />
        <DetailItem label={t('common.channel')} value={session.provider === null ? '—' : (session.providerLabel ?? displayNameOf(props.channels, session.provider))} />
        <DetailItem label={t('d.costMode')} value={channel === null ? '—' : t(COST_MODE_KEYS[channel.costMode] ?? 'ch.notQueried')} />
        <DetailItem label={t('d.first')} value={fmtDateTime(session.firstTime)} />
        <DetailItem label={t('d.last')} value={fmtDateTime(session.lastTime)} />
        <DetailItem
          label={t('d.duration')}
          value={fmtDuration(session.durationMs) + (session.crossDays >= 1 ? t('d.crossDays', { count: session.crossDays }) : '')}
        />
        <DetailItem label={t('d.activeDays')} value={String(session.days)} />
      </div>

      <div className={listStyles.detailStrip}>
        <StripItem label="Tokens" value={fmtTokens(session.tokens)} note={t('d.ioNote')} />
        <StripItem label={t('c.input')} value={fmtTokens(session.buckets.inputTokens)} />
        <StripItem label={t('c.output')} value={fmtTokens(session.buckets.outputTokens)} />
        <StripItem label={t('c.cacheRead')} value={fmtTokens(session.buckets.cacheReadTokens)} />
        <StripItem label={t('d.cacheWrite')} value={fmtTokens(session.buckets.cacheWriteTokens)} note={t('d.billingOnly')} />
        <StripItem label={t('d.hitRate')} value={session.cacheHitRate === null ? '—' : session.cacheHitRate.toFixed(1) + '%'} />
        <StripItem label={t('common.calls')} value={fmtCalls(session.calls)} note={t('d.samples')} />
      </div>

      <div className={listStyles.detailBlock}>
        <div className={listStyles.detailBlockTitle}>{t('c.cost')}</div>
        <div className={listStyles.detailCost}>
          <span className={costCell.dim ? styles.dim : undefined}>{costCell.text}</span>
          {costCell.amount && <CostSourceChip source={session.costSource} partial={session.partial} />}
          {/* 「订阅内 / 无计费 / —」不是金额，这时再解释来源只会误导 */}
          {costCell.amount && <span className={listStyles.detailCostHint}>{costSourceHintOf(session.costSource, session.partial)}</span>}
        </div>
        {/* `priced` 指「台账里有可反推的均价」，所以只在真的没金额时说明 */}
        {!props.priced && session.cost === null && <div className={styles.statExtra}>{t('d.noCostBasis')}</div>}
      </div>

      <div className={listStyles.detailBlock}>
        <div className={listStyles.detailBlockTitle}>{t('s.prompt')}</div>
        {session.prompt === null
          ? <div className={styles.empty}>{t('d.noPrompt')}</div>
          : <div className={listStyles.promptText}>{session.prompt}</div>}
      </div>

      <div className={listStyles.detailBlock + ' ' + listStyles.detailColLeft}>
        <div className={listStyles.detailBlockTitle}>{t('d.byModel')}</div>
        {session.models.length === 0
          ? <div className={styles.empty}>{t('empty.noUsage')}</div>
          : (
            <table className={styles.table + ' ' + listStyles.sessionDetailModelTable}>
              <thead>
                <tr><th>{t('m.model')}</th><th>Tokens</th><th>{t('m.share')}</th><th>{t('c.cost')}</th></tr>
              </thead>
              <tbody>
                {session.models.map((model) => {
                  const modelCostCell = costCellOf(channelOf(props.channels, model.provider), model)
                  return (
                    <tr key={model.provider + '|' + model.model}>
                      <td>
                        <div className={listStyles.listMain}>{model.model}</div>
                        <div className={listStyles.listSub}>{model.providerLabel} · {t('d.callTimes', { count: fmtCalls(model.calls) })}</div>
                      </td>
                      <td>{fmtTokens(model.tokens)}</td>
                      <td>
                        <span className={listStyles.listBar}>
                          <i style={{ width: Math.max(2, model.sharePercent) + '%', background: 'var(--dsw-alias-state-business-primary, #5b8cff)' }} />
                        </span> {model.sharePercent}%
                      </td>
                      <td>
                        {model.cost === null || !modelCostCell.amount
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
        <div className={listStyles.detailBlock + ' ' + listStyles.detailColRight}>
          <div className={listStyles.detailBlockTitle}>{t('d.hoursNote')}</div>
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
        <div className={listStyles.hourBar} key={index} title={String(index) + t('d.hourUnit') + fmtTokens(hour.tokens) + ' · ' + fmtCalls(hour.calls) + t('d.callUnit')}>
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
    ? t('d.noHours')
    : t('d.busiest', { hour: busiest }) + fmtTokens(hours[busiest].tokens) + ' tokens'
}

function DetailItem(props: { label: string; value: string; wide?: boolean }): ReactNode {
  return (
    <div className={props.wide === true ? listStyles.detailItemWide : undefined}>
      <div className={listStyles.detailItemLabel}>{props.label}</div>
      <div className={listStyles.detailItemValue}>{props.value}</div>
    </div>
  )
}

function StripItem(props: { label: string; value: string; note?: string }): ReactNode {
  return (
    <div className={listStyles.detailStrip}>
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
