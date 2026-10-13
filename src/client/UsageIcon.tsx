/**
 * 侧边栏导航图标（`sidebar.panellist`）。
 * 该 slot 由宿主自持整行（标签、hover/active 配色），插件只提供字形，
 * 因此用 currentColor 让宿主的行样式直接染上图标。
 */
import type { ReactNode } from 'react'

export function UsageIcon({ size = 18 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      <rect x="2.6" y="8.8" width="2.6" height="4.2" rx="0.7" fill="currentColor" />
      <rect x="6.7" y="5.6" width="2.6" height="7.4" rx="0.7" fill="currentColor" />
      <rect x="10.8" y="2.8" width="2.6" height="10.2" rx="0.7" fill="currentColor" />
    </svg>
  )
}
