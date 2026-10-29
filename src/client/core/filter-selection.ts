/** 多选筛选的值约定：界面用数组，状态里存成逗号分隔的字符串（空串 = 全部）。 */
export function selectionOf(value: string | undefined): string[] {
  if (value === undefined) return []
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === 'ALL') return []
  return trimmed.split(',').filter((item) => item !== '')
}

/** 一个值集合是否命中筛选：筛选为空表示不筛。 */
export function selectionMatches(values: readonly string[], filter: string | undefined): boolean {
  const selected = selectionOf(filter)
  if (selected.length === 0) return true
  return values.some((value) => selected.includes(value))
}
