/**
 * 成本来源角标：只在「聚合价」这类需要解释的档位上挂；官方 / 官方价 / 跨通道厂商官方价都是常见档位，不占版面。
 * `partial`（聚合价目缺一个缓存价、按未命中价代）是口径说明不是错误，不用告警色。
 */
import type { ReactNode } from 'react'
import { COST_SOURCE_LABELS, PARTIAL_PRICE_TEXT, costSourceHintOf, type CostSource } from '../core/pricing.ts'
import { t, useT } from '../core/i18n.ts'
import styles from '../styles/pricing.module.css'

/* 官方账单、官方价、跨通道厂商官方价覆盖绝大多数金额，不再占版面；角标只标注聚合这类需要解释的来源。 */
export function CostSourceChip(props: {
  source: CostSource | null | undefined
  compact?: boolean
  partial?: boolean | null
}): ReactNode {
  if (props.source === 'official' || props.source === 'catalog' || props.source === 'model') return null
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
  // 常见档位在上面 early return 里就不挂角标；这里只剩将来新增的档位
  return styles.sourceModel
}
