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
        const isLive = snapshot?.source === 'live'
        const windows = plan !== null && Array.isArray((plan as { windows?: unknown }).windows)
          ? (plan as { windows: Array<{ key?: unknown; percent?: unknown; resetsAt?: unknown }> }).windows
          : null
        return (
          <div className={quotaStyles.quotaCard} key={channel.provider}>
            <div className={quotaStyles.quotaHead}>
              <span className={styles.statusDot} style={{ background: statusColorOf(channel.status) }} />
              <span className={quotaStyles.quotaTitle}>{channel.displayName}</span>
              {isLive && <span className={quotaStyles.liveChip}>实时</span>}
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
              <div className={styles.dim}>{emptyReasonOf(channel, snapshot)}</div>
            )}

            {isLive && (
              <div className={quotaStyles.snapshotHint}>
                实时查询于 {freshTextOf(snapshot?.fetchedAt ?? null)}（来自官方接口，最多缓存 1 分钟）
              </div>
            )}
            {snapshot !== null && !isLive && snapshot.supported && (
              <div className={staleDaysOf(snapshot.updatedAt) >= 1 ? quotaStyles.snapshotStale : quotaStyles.snapshotHint}>
                实时查询未成功（{errorTextOf(snapshot.error)}）
                {snapshot.updatedAt === null
                  ? '，且暂无可用快照 —— 点右上角「刷新」重试'
                  : '，显示快照 · 快照时间 ' + fmtDateTime(snapshot.updatedAt) + (staleDaysOf(snapshot.updatedAt) >= 1 ? '，已 ' + staleDaysOf(snapshot.updatedAt) + ' 天未更新' : '')}
              </div>
            )}
          </div>
        )
      })}
      {props.channels.length === 0 && <div className={styles.empty}>未读取到通道配置</div>}
    </div>
  )
}

/** 实时结果的相对时间文案。 */
function freshTextOf(fetchedAt: number | null): string {
  if (fetchedAt === null) return '刚刚'
  const seconds = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000))
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes + ' 分钟前'
  return Math.floor(minutes / 60) + ' 小时前'
}

/** 实时查询失败原因的展示文案。 */
function errorTextOf(error: string | null): string {
  if (error === null) return '未启用实时查询'
  if (error === 'no-key') return '该通道未配置 API Key'
  if (error === 'no-snapshot') return '没有快照可用'
  if (error === 'network') return '网络不可达'
  if (error === 'timeout') return '请求超时'
  if (error === 'unauthorized') return '凭据被拒绝（401/403）'
  if (error === 'bad-json') return '接口响应无法解析'
  if (error === 'too-large') return '接口响应异常大'
  if (error.startsWith('http-')) return '接口返回 HTTP ' + error.slice(5)
  return error
}

/** 快照距今天数（向下取整）；用于把「宿主很久没刷新」显式标出来。 */
function staleDaysOf(updatedAt: number | null): number {
  if (updatedAt === null) return 0
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

/** 无数据时的分档说明：区分未配置凭据 / 免费额度 / 本地端点 / 无查询能力。 */
function emptyReasonOf(channel: Channel, snapshot: QuotaProvider | null): string {
  if (snapshot?.source === 'snapshot' && snapshot.error === 'no-key') return '该通道未配置 API Key，无法查询余额'
  if (snapshot?.source === 'snapshot' && snapshot.error === 'unauthorized') return '凭据被通道拒绝，无法查询余额'
  if (channel.status === 'off') return '凭据引用存在，Key 未填写'
  if (channel.costMode === 'none') return '本地端点，无余额查询接口'
  if (channel.costMode === 'free') return '该通道无余额查询接口（免费额度）'
  return '该通道暂无可查询的余额 / 配额接口'
}
