/**
 * 提问词云：纯 SVG 螺旋布局（阿基米德螺线 + 矩形碰撞检测），零依赖、不量 DOM。
 * 坐标按固定 720×300 计算，容器只负责等比缩放，所以容器尺寸怎么变都不会重叠。
 */
import { useMemo, type ReactNode } from 'react'
import styles from '../styles/wordcloud.module.css'

/** 词云配色：按排名轮换的 8 个色相（都用宿主令牌派生，明暗主题都可见）。 */
const WORD_TONES = [
  styles.tone0, styles.tone1, styles.tone2, styles.tone3,
  styles.tone4, styles.tone5, styles.tone6, styles.tone7,
]

/** 画布逻辑尺寸（CSS 里按宽度等比缩放）。 */
const VIEW_WIDTH = 720
const VIEW_HEIGHT = 300
const MAX_WORDS = 56
const MAX_FONT = 34
/** 画布按容器宽度等比缩放（约 0.77 倍），17 对应屏幕上约 13px，保证最小一档不小于正文。 */
const MIN_FONT = 17

interface PlacedWord {
  word: string
  count: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
}

interface Box {
  x: number
  y: number
  width: number
  height: number
}

const CJK = /[\u4e00-\u9fa5]/

/** 字号按频次的平方根映射：线性映射会让高频词把画布撑爆、低频词小到看不清。 */
function fontSizeOf(count: number, maxCount: number): number {
  const ratio = maxCount <= 0 ? 0 : Math.sqrt(count / maxCount)
  return Math.round(MIN_FONT + ratio * (MAX_FONT - MIN_FONT))
}

/** 粗估词宽（中文按 1 个字号、其它按 0.58），避免为测量而读 DOM。 */
function widthOf(word: string, fontSize: number): number {
  let units = 0
  for (const char of word) units += CJK.test(char) ? 1 : 0.58
  return units * fontSize + fontSize * 0.35
}

function overlaps(first: Box, second: Box): boolean {
  const gap = 1.5
  return first.x - gap < second.x + second.width
    && second.x - gap < first.x + first.width
    && first.y - gap < second.y + second.height
    && second.y - gap < first.y + first.height
}

/** 从中心向外螺旋找空位；放不下就丢弃（比硬塞更耐看）。 */
function layoutWords(words: Array<{ word: string; count: number }>): PlacedWord[] {
  const ranked = [...words].sort((first, second) => second.count - first.count).slice(0, MAX_WORDS)
  if (ranked.length === 0) return []
  const maxCount = ranked[0].count
  const centerX = VIEW_WIDTH / 2
  const centerY = VIEW_HEIGHT / 2
  const placed: PlacedWord[] = []
  for (const item of ranked) {
    const fontSize = fontSizeOf(item.count, maxCount)
    const width = widthOf(item.word, fontSize)
    const height = fontSize * 1.14
    for (let step = 0; step < 2200; step += 1) {
      const angle = step * 0.32
      const radius = 1.9 * angle
      const x = centerX + radius * Math.cos(angle) - width / 2
      // 纵向压扁（画布是 720×300 的横条），否则大词会先撞上下边界
      const y = centerY + radius * Math.sin(angle) * 0.58 - height / 2
      if (x < 2 || y < 2 || x + width > VIEW_WIDTH - 2 || y + height > VIEW_HEIGHT - 2) continue
      const box = { x, y, width, height }
      if (placed.some((item2) => overlaps(box, { x: item2.x, y: item2.y, width: item2.width, height: item2.height }))) continue
      placed.push({ word: item.word, count: item.count, x, y, width, height, fontSize })
      break
    }
  }
  return placed
}

export function WordCloud(props: {
  words: Array<{ word: string; count: number }>
  emptyText: string
}): ReactNode {
  // 布局是纯函数但开销不小（螺旋 + 碰撞检测）：按 words 记忆，悬停/切 Tab 不重算
  const placed = useMemo(() => layoutWords(props.words), [props.words])
  if (placed.length === 0) return <div className={styles.empty}>{props.emptyText}</div>
  return (
    <svg className={styles.cloud} viewBox={'0 0 ' + String(VIEW_WIDTH) + ' ' + String(VIEW_HEIGHT)} role="img" aria-label={props.emptyText}>
      {placed.map((item, index) => {
        // 8 色按排名轮换：相邻词不同色，比「三档深浅」丰富得多；颜色全走宿主令牌（跟随明暗主题）
        const tone = WORD_TONES[index % WORD_TONES.length] ?? styles.tone0
        const weight = index < 6 ? styles.heavy : index < 18 ? styles.medium : ''
        return (
          <text
            key={item.word}
            x={item.x + item.width / 2}
            y={item.y + item.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={item.fontSize}
            className={[styles.word, tone, weight].join(' ').trim()}
          >
            {item.word}
            <title>{item.word + ' · ' + String(item.count)}</title>
          </text>
        )
      })}
    </svg>
  )
}
