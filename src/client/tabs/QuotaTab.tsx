/** 余额与配额：按通道展示官方余额快照与订阅窗口（原样数据，不换算不建议）。 */
import type { ReactNode } from 'react'
import { quotaBarColor, statusColorOf } from '../channels.ts'
import { fmtDateTime } from '../format.ts'
import type { Channel, QuotaProvider } from '../types.ts'
import styles from '../styles/shared.module.css'
import quotaStyles from '../styles/quota.module.css'

/** 余额字段展示顺序（原型顺序）；未收录字段按原键名追加在后。 */
const BALANCE_ORDER = ['totalBalance', 'topUpBalance', 'giftBalance', 'balance', 'currency']
const BALANCE_LABELS: Record<string, string> = {
  totalBalance: '总余额', topUpBalance: '充值余额', giftBalance: '赠送余额', balance: '余额', currency: '币种',
}
/** 订阅窗口固定展示顺序。 */
const WINDOW_ORDER = ['5h', 'week', 'month', 'day']
const WINDOW_LABELS: Record<string, string> = { '5h': '5 小时窗口', week: '本周窗口', month: '本月窗口', day: '当日窗口' }

function resetTextOf(value: unknown): string {
  if (typeof value !== 'string' || value === '') return '重置时间 —'
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return '重置于 ' + value
  return '重置于 ' + fmtDateTime(time.getTime())
}

export function QuotaTab(props: { channels: Channel[]; quotas: QuotaProvider[] }): ReactNode {
  const snapshotOf = (provider: string): QuotaProvider | null => props.quotas.find((item) => item.provider === provider) ?? null
  return (
    <div className={quotaStyles.quotaList}>
      {props.channels.map((channel) => {
        const snapshot = snapshotOf(channel.provider)
        const balance = snapshot?.balance ?? null
        const plan = snapshot?.plan ?? null
        const windows = plan !== null && Array.isArray((plan as { windows?: unknown }).windows)
          ? (plan as { windows: Array<{ key?: unknown; percent?: unknown; resetsAt?: unknown }> }).windows
          : null
        return (
          <div className={quotaStyles.quotaCard} key={channel.provider}>
            <div className={quotaStyles.quotaHead}>
              <span className={styles.statusDot} style={{ background: statusColorOf(channel.status) }} />
              <span className={quotaStyles.quotaTitle}>{channel.displayName}</span>
              <span className={quotaStyles.quotaProvider}>{channel.provider} · {channel.costLabel}</span>
            </div>

            {balance !== null && (
              <div className={quotaStyles.balanceStrip}>
                {orderedBalanceEntries(balance).map(([key, value]) => (
                  <div className={quotaStyles.balanceItem} key={key}>
                    <div className={quotaStyles.bsLabel}>{BALANCE_LABELS[key] ?? key}</div>
                    <div className={quotaStyles.bsValue}>{String(value)}</div>
                  </div>
                ))}
              </div>
            )}

            {balance === null && windows !== null && windows.length > 0 && (
              <div className={quotaStyles.windowRow}>
                {orderedWindows(windows).map((window) => {
                  const percent = typeof window.percent === 'number' ? window.percent : 0
                  const key = typeof window.key === 'string' ? window.key : 'window'
                  return (
                    <div className={quotaStyles.windowItem} key={key}>
                      <div className={quotaStyles.windowHead}>
                        <span className={quotaStyles.windowName}>{WINDOW_LABELS[key] ?? key}</span>
                        <span className={quotaStyles.windowValue}>{percent}%</span>
                      </div>
                      <div className={quotaStyles.windowBar}>
                        <i style={{ width: Math.max(percent, 0) + '%', background: quotaBarColor(percent) }} />
                      </div>
                      <div className={quotaStyles.windowReset}>{resetTextOf(window.resetsAt)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {balance === null && (windows === null || windows.length === 0) && (
              <div className={styles.dim}>{emptyReasonOf(channel)}</div>
            )}

            {snapshot?.updatedAt !== null && snapshot?.updatedAt !== undefined && (
              <div className={staleDaysOf(snapshot.updatedAt) >= 1 ? quotaStyles.snapshotStale : quotaStyles.snapshotHint}>
                快照时间 {fmtDateTime(snapshot.updatedAt)}
                {staleDaysOf(snapshot.updatedAt) >= 1 ? ' · 已 ' + staleDaysOf(snapshot.updatedAt) + ' 天未更新（宿主未刷新）' : ''}
              </div>
            )}
          </div>
        )
      })}
      {props.channels.length === 0 && <div className={styles.empty}>未读取到通道配置</div>}
    </div>
  )
}

/** 快照距今天数（向下取整）；用于把「宿主很久没刷新」显式标出来。 */
function staleDaysOf(updatedAt: number): number {
  return Math.floor((Date.now() - updatedAt) / 86400000)
}

function orderedBalanceEntries(balance: Record<string, unknown>): Array<[string, unknown]> {
  const entries = Object.entries(balance).filter(([key]) => key !== 'updatedAt')
  const ordered: Array<[string, unknown]> = []
  for (const key of BALANCE_ORDER) {
    const found = entries.find(([entryKey]) => entryKey === key)
    if (found !== undefined) ordered.push(found)
  }
  for (const entry of entries) {
    if (!BALANCE_ORDER.includes(entry[0])) ordered.push(entry)
  }
  return ordered
}

function orderedWindows(windows: Array<{ key?: unknown }>): Array<{ key?: unknown; percent?: unknown; resetsAt?: unknown }> {
  const typed = windows as Array<{ key?: unknown; percent?: unknown; resetsAt?: unknown }>
  return [...typed].sort((first, second) => {
    const firstIndex = WINDOW_ORDER.indexOf(typeof first.key === 'string' ? first.key : '')
    const secondIndex = WINDOW_ORDER.indexOf(typeof second.key === 'string' ? second.key : '')
    return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex)
  })
}

/** 无快照时的分档说明：区分未配置 / 免费额度 / 本地端点 / 宿主未查询。 */
function emptyReasonOf(channel: Channel): string {
  if (channel.status === 'off') return '凭据引用存在，Key 未填写'
  if (channel.costMode === 'none') return '本地端点，无余额查询接口'
  if (channel.costMode === 'free') return '该通道无余额查询接口（免费额度）'
  return '宿主尚未查询该通道的余额 / 配额'
}
