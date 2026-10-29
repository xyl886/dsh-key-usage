/**
 * 热力图横轴：按 ISO 周列定位月份刻度。
 *
 * 规则：只在「该月第一次出现的那一列」标一次；标签宽度按列宽估算，放不下（会与上一个标签重叠、
 * 或超出最后一列）就跳过这个月 —— 宁可少标，不许叠字。跨年的 1 月带年份，且年份全场只出现一次。
 *
 * 纯函数（不碰 DOM / i18n）：组件量好列宽后调用，Node 脚本用同样的输入校验几何。
 */

export interface MonthAxisOptions {
  /** 每列 7 个本地日期键（`YYYY-MM-DD`），按时间升序；列数即热力图列数（≤ 53）。 */
  weekDates: string[][]
  /** 列宽（px，不含列间距）。 */
  columnWidthPx: number
  /** 列间距（px）。 */
  columnGapPx: number
  /** 标签字号（px），用于估算文字宽度。 */
  fontSizePx: number
  /** 标签之间至少留出的空隙（px）。 */
  minGapPx: number
  /** 拼文案（组件里传 `t`，脚本里传桩函数）：`includeYear` 为 true 的标签全场只有一个。 */
  labelOf: (month: number, includeYear: boolean, year: number) => string
}

export interface MonthAxisMark {
  /** 0 基列号：标签贴这一列的左边缘。 */
  column: number
  label: string
  /** 估算占用的列数（含到下一个标签的最小间隔）；相邻标签必须满足 `next.column >= prev.column + prev.spanColumns`。 */
  spanColumns: number
  year: number
  month: number
  /** 是否带年份（跨年的那个 1 月）。 */
  withYear: boolean
}

/** 单字符宽度占字号的倍数。宁可估宽：真机字体比估算宽时就会叠字。 */
function charWidthEm(char: string): number {
  const code = char.codePointAt(0) ?? 0
  if (code >= 0x2e80) return 1
  if (char >= '0' && char <= '9') return 0.62
  if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) return 0.65
  return 0.4
}

/** 标签宽度（px，估算值）：只用于判断放不放得下，不参与布局。 */
export function estimateLabelWidthPx(label: string, fontSizePx: number): number {
  let width = 0
  for (const char of label) width += charWidthEm(char) * fontSizePx
  return width
}

/**
 * 计算月份刻度：返回按列升序、互不重叠的标签。
 * `weekDates` 为空或列宽非正时返回空数组（调用方显示无刻度，不抛错）。
 */
export function buildMonthAxis(options: MonthAxisOptions): MonthAxisMark[] {
  const columnCount = options.weekDates.length
  const trackWidthPx = options.columnWidthPx + options.columnGapPx
  if (columnCount === 0 || !(trackWidthPx > 0) || !(options.fontSizePx > 0)) return []

  // 1. 每月第一次出现的那一天 → 所在列；同一列可能出现两个月的首次出现，交给重叠校验淘汰后一个
  const candidates: Array<{ column: number; year: number; month: number }> = []
  let previousMonthKey = ''
  for (let column = 0; column < columnCount; column += 1) {
    for (const dateKey of options.weekDates[column]) {
      const monthKey = dateKey.slice(0, 7)
      if (monthKey === previousMonthKey) continue
      previousMonthKey = monthKey
      candidates.push({ column, year: Number(dateKey.slice(0, 4)), month: Number(dateKey.slice(5, 7)) })
    }
  }
  if (candidates.length === 0) return []

  const spanOfLabel = (label: string): number => Math.max(1, Math.ceil(
    (estimateLabelWidthPx(label, options.fontSizePx) + options.minGapPx) / trackWidthPx,
  ))
  const markOf = (index: number, withYear: boolean): MonthAxisMark => {
    const candidate = candidates[index]
    const label = options.labelOf(candidate.month, withYear, candidate.year)
    return {
      column: candidate.column,
      label,
      spanColumns: spanOfLabel(label),
      year: candidate.year,
      month: candidate.month,
      withYear,
    }
  }
  const fitsRightEdge = (mark: MonthAxisMark): boolean => mark.column + mark.spanColumns <= columnCount

  // 2. 跨年那个 1 月带年份。年份标签比「N月」宽，窄面板上可能越过最后一列：
  //    先退回到窗口自己的 1 月（窗口从 1 月那几周开始时列位仍然精确），
  //    再不行就右对齐贴住最后一列（只在极窄面板出现，保证年份终究看得见）。
  const firstYear = candidates[0].year
  let yearIndex = candidates.findIndex((candidate) => candidate.month === 1 && candidate.year > firstYear)
  let yearMark = yearIndex < 0 ? null : markOf(yearIndex, true)
  if (yearMark !== null && !fitsRightEdge(yearMark) && candidates[0].month === 1) {
    const firstMonthMark = markOf(0, true)
    if (fitsRightEdge(firstMonthMark)) {
      yearIndex = 0
      yearMark = firstMonthMark
    }
  }
  if (yearMark !== null && !fitsRightEdge(yearMark)) {
    yearMark = yearMark.spanColumns <= columnCount
      ? { ...yearMark, column: columnCount - yearMark.spanColumns }
      : null
  }
  if (yearMark === null) yearIndex = -1

  const placed: MonthAxisMark[] = []
  for (let index = 0; index < candidates.length; index += 1) {
    const withYear = index === yearIndex
    const mark = withYear && yearMark !== null ? yearMark : markOf(index, withYear)
    if (!fitsRightEdge(mark)) continue
    // 跨年标签优先：挤掉挡位的非跨年标签，年份这一格比相邻月份更重要
    while (withYear && placed.length > 0 && mark.column < placed[placed.length - 1].column + placed[placed.length - 1].spanColumns) {
      if (placed[placed.length - 1].withYear) break
      placed.pop()
    }
    const previous = placed[placed.length - 1]
    if (previous !== undefined && mark.column < previous.column + previous.spanColumns) continue
    if (!fitsRightEdge(mark)) continue
    placed.push(mark)
  }
  return placed
}
