/**
 * 成本来源角标：官方 / 官方价 / 聚合 / 模型官方价 —— 避免把估算当成账单金额用；只在真的显示了金额时挂。
 * `partial`（聚合价目缺一个缓存价、按未命中价代）是口径说明不是错误，不用告警色。
 */
import type { ReactNode } from 'react'
import { COST_SOURCE_LABELS, PARTIAL_PRICE_TEXT, costSourceHintOf, type CostSource } from '../core/pricing.ts'
import { t, useT } from '../core/i18n.ts'
import styles from '../styles/pricing.module.css'

/* 官方账单与官方价覆盖绝大多数金额，不再占版面；角标只标注需要解释的来源：聚合 / 模型官方价 / 其它。 */
export function CostSourceChip(props: {
  source: CostSource | null | undefined
  compact?: boolean
  partial?: boolean | null
}): ReactNode {
  if (props.source === 'official' || props.source === 'catalog') return null
  const source = props.source ?? 'none'
  if (source === 'none') return null
  const partial = props.partial === true
  return (
    <span className={styles.sourceChip + ' ' + sourceClass(source)} title={costSourceHintOf(source, partial)}>
      {/* 服务端将来加了新档位时，原样显示取值而不是渲染成空白 */}
      {t(COST_SOURCE_LABELS[source] ?? source)}
      {partial && <span className={styles.sourcePartial}>{t(PARTIAL_PRICE_TEXT)}</span>}
    </span>
  )
}

function sourceClass(source: CostSource): string {
  if (source === 'aggregate') return styles.sourceAggregate
  // 官方 / 官方价在上面的 early return 里就不会挂角标；这里只剩「模型官方价」与将来新增的档位
  return styles.sourceModel
}
