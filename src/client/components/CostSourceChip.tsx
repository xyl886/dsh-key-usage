/**
 * 成本来源角标：官方（台账账单）/ 官方价（内置官方价目）/ 自定（你的规则）/ 估算（台账均价）
 * —— 避免把估算当成账单金额用。
 * 只在真的显示了金额时挂；`订阅内` / `免费` / `—` 这类占位文案不带角标。
 */
import type { ReactNode } from 'react'
import { COST_SOURCE_HINTS, COST_SOURCE_LABELS, type CostSource } from '../pricing.ts'
import styles from '../styles/pricing.module.css'

export function CostSourceChip(props: { source: CostSource | null | undefined; compact?: boolean }): ReactNode {
  const source = props.source ?? 'none'
  if (source === 'none') return null
  return (
    <span className={styles.sourceChip + ' ' + sourceClass(source)} title={COST_SOURCE_HINTS[source]}>
      {COST_SOURCE_LABELS[source]}
    </span>
  )
}

function sourceClass(source: CostSource): string {
  if (source === 'official') return styles.sourceOfficial
  if (source === 'rule') return styles.sourceRule
  if (source === 'catalog') return styles.sourceCatalog
  return styles.sourceEstimate
}
