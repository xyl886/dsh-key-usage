/**
 * 对话操作行里的「本轮费用」：只显示金额，没有价目依据时显示 `—`。
 *
 * 金额来自服务端 `/turns`（与页面同一套价目 / 错峰 / 币种规则），这里只负责：
 * 把当前消息映射到轮次 → 取该会话的轮次表（按 sessionId 只请求一次）→ 渲染金额。
 * 映射不出来（快照里没有这条消息、或宿主没给会话 id）时整块不渲染，不占操作行位置。
 */
import { useEffect, useState, type ReactElement } from 'react'
import { loadTurns } from '../core/api.ts'
import { moneyTextOf } from '../core/currency.ts'
import { t } from '../core/i18n.ts'
import type { TurnCostRow, TurnsResponse } from '../core/types.ts'
import styles from '../styles/turnCost.module.css'

interface ChatNodeLike {
  kind?: string
  data?: { finalNode?: { messageId?: string } }
  location?: { turn?: number }
}

interface ChatSnapshotLike {
  nodes?: { values?: () => Iterable<ChatNodeLike> }
}

/** 一条消息对应的轮次；解析不到返回 null（该消息不显示费用）。 */
type TurnLookup = (snapshot: unknown) => number | null

/** `assistant-actions` 插槽的标准属性：会话 id + 消息 id + 快照选择器。 */
interface TurnCostProps {
  messageId?: string
  sessionId?: string
  useChat?: (selector: (snapshot: ChatSnapshotLike) => number | null) => number | null
}

/** 快照对象 → messageId 到轮次的索引：同一次快照只扫一遍节点，避免每条消息各扫一次。 */
const indexCache = new WeakMap<object, Map<string, number>>()

function turnIndexOfSnapshot(snapshot: ChatSnapshotLike): Map<string, number> {
  const key = snapshot as unknown as object
  const cached = indexCache.get(key)
  if (cached !== undefined) return cached
  const index = new Map<string, number>()
  const nodes = snapshot.nodes?.values?.()
  if (nodes !== undefined) {
    for (const node of nodes) {
      const messageId = node.data?.finalNode?.messageId
      const turn = node.location?.turn
      if (typeof messageId !== 'string' || typeof turn !== 'number') continue
      index.set(messageId, turn)
    }
  }
  indexCache.set(key, index)
  return index
}

function turnOfMessage(snapshot: ChatSnapshotLike, messageId: string): number | null {
  return turnIndexOfSnapshot(snapshot).get(messageId) ?? null
}

export function TurnCostChip(props: TurnCostProps): ReactElement | null {
  const messageId = props.messageId
  const sessionId = props.sessionId
  const selectTurn: TurnLookup = (snapshot) =>
    messageId === undefined ? null : turnOfMessage(snapshot as ChatSnapshotLike, messageId)
  // 宿主没提供快照选择器时（旧版本）不显示，而不是渲染一个空壳
  const turn = typeof props.useChat === 'function' ? props.useChat(selectTurn) : null
  const [payload, setPayload] = useState<TurnsResponse | null>(null)

  useEffect(() => {
    if (sessionId === undefined || sessionId === '') return
    let alive = true
    void loadTurns(sessionId).then((result) => {
      if (alive) setPayload(result)
    })
    return () => {
      alive = false
    }
  }, [sessionId])

  if (turn === null || payload === null) return null
  const row = payload.turns.find((item) => item.turn === turn)
  if (row === undefined) return null
  const label = t('turnCost.aria')
  if (row.cost === null) {
    return (
      <span className={styles.amount} title={label + ' · ' + t('turnCost.unpriced')} aria-label={label}>
        {t('turnCost.unpricedMark')}
      </span>
    )
  }
  const text = moneyTextOf(row.currency, row.cost)
  return (
    <span
      className={row.subEstimate ? styles.amount + ' ' + styles.estimated : styles.amount}
      title={label + (row.subEstimate ? ' · ' + t('turnCost.subEstimate') : '')}
      aria-label={label}
    >
      {text}
    </span>
  )
}
