/**
 * 统计卡的小图标：内联 SVG（不引图标库、不加依赖），统一 15px、stroke 走 currentColor。
 * 只做形状，颜色由 `.statIcon` 控制（宿主强调色）。
 */
import type { ReactNode } from 'react'

type IconName = 'calls' | 'tokens' | 'input' | 'output' | 'cacheRead' | 'hitRate' | 'dailyAvg' | 'channels' | 'days' | 'cost'

const PATHS: Record<IconName, ReactNode> = {
  // 折线：调用次数
  calls: <polyline points="1.5,11 5,6.5 8,9 13.5,3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  // 圆柱：Tokens
  tokens: <>
    <ellipse cx="7.5" cy="3.6" rx="5" ry="1.9" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2.5 3.6v7.8c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V3.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2.5 7.5c0 1 2.2 1.9 5 1.9s5-.9 5-1.9" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </>,
  // 向下箭头：输入
  input: <>
    <path d="M7.5 1.8v7.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <polyline points="4.4,6.4 7.5,9.5 10.6,6.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.2 12.2h10.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </>,
  // 向上箭头：输出
  output: <>
    <path d="M7.5 9.4V2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <polyline points="4.4,4.8 7.5,1.8 10.6,4.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.2 12.2h10.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </>,
  // 圆柱 + 勾：缓存读
  cacheRead: <>
    <ellipse cx="7.5" cy="3.4" rx="4.6" ry="1.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2.9 3.4v6.4c0 .9 2 1.7 4.6 1.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <polyline points="8.6,11.6 10.2,13.2 13.2,9.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // 百分号：命中率
  hitRate: <>
    <circle cx="4.6" cy="4.6" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="10.4" cy="10.4" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M12 3L3 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </>,
  // 面积：日均
  dailyAvg: <>
    <path d="M1.6 11.5l3.4-4 2.6 2.2 3-3.8 3.8 4.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.6 13.4h11.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
  </>,
  // 节点：通道数
  channels: <>
    <circle cx="7.5" cy="2.8" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="2.9" cy="12.1" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="12.1" cy="12.1" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6.6 4.2L3.8 10.6M8.4 4.2l2.8 6.4M4.5 12.1h6" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </>,
  // 日历：使用天数
  days: <>
    <rect x="2" y="3.2" width="11" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 6.6h11M5.2 1.8v2.6M9.8 1.8v2.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </>,
  // 货币：成本
  cost: <>
    <circle cx="7.5" cy="7.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5.1 4.6l2.4 3.2 2.4-3.2M7.5 7.8v3.6M5.4 8.9h4.2M5.4 10.4h4.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </>,
}

export function CardIcon(props: { name: IconName }): ReactNode {
  return (
    <svg className="statIcon" viewBox="0 0 15 15" width="15" height="15" aria-hidden="true" focusable="false" style={{ color: 'var(--dsw-alias-state-business-primary, #5b8cff)', flex: '0 0 auto' }}>
      {PATHS[props.name]}
    </svg>
  )
}
