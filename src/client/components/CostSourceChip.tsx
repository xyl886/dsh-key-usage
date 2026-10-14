/**
 * 成本来源角标：官方（台账账单）/ 自定（你的规则）/ 官方价（内置官方价目）/ 聚合（LiteLLM 聚合价目）
 * / 估算（台账均价）—— 避免把估算当成账单金额用。
 * 只在真的显示了金额时挂；`订阅内` / `免费` / `—` 这类占位文案不带角标。
 * `partial` = 该条聚合价目缺一个缓存价（按未命中价代）：只补一个次要文字色的「部分」标记与 tooltip，
 * 不是错误，不用告警色。
 */
import type { ReactNode } from 'react'
import { COST_SOURCE_LABELS, PARTIAL_PRICE_TEXT, costSourceHintOf, type CostSource } from '../pricing.ts'
import styles from '../styles/pricing.module.css'

export function CostSourceChip(props: {
  source: CostSource | null | undefined
  compact?: boolean
  partial?: boolean | null
}): ReactNode {
  const source = props.source ?? 'none'
  if (source === 'none') return null
  const partial = props.partial === true
  return (
    <span className={styles.sourceChip + ' ' + sourceClass(source)} title={costSourceHintOf(source, partial)}>
      {/* 服务端将来加了新档位时，原样显示取值而不是渲染成空白 */}
      {COST_SOURCE_LABELS[source] ?? source}
      {partial && <span className={styles.sourcePartial}>{PARTIAL_PRICE_TEXT}</span>}
    </span>
  )
}

function sourceClass(source: CostSource): string {
  if (source === 'official') return styles.sourceOfficial
  if (source === 'rule') return styles.sourceRule
  if (source === 'catalog') return styles.sourceCatalog
  if (source === 'aggregate') return styles.sourceAggregate
  return styles.sourceEstimate
}
