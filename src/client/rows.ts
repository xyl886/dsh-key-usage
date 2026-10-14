/**
 * 零 Token 行的统一处理：只有调用次数、Token 全 0 的行基本都是调用失败（本机实测 key 失效的模型
 * 就是这样），留在表里全是噪音；四处列表统一用它过滤，并把隐藏条数如实告诉用户。
 */
export interface EmptyRowFilter<Row> {
  rows: Row[]
  /** 被隐藏的行数（Token 为 0）。 */
  hidden: number
}

export function dropEmptyRows<Row>(rows: Row[], tokensOf: (row: Row) => number): EmptyRowFilter<Row> {
  const kept = rows.filter((row) => tokensOf(row) > 0)
  return { rows: kept, hidden: rows.length - kept.length }
}

/** 列表底部的一行小字：说明隐藏了什么、为什么。 */
export function hiddenEmptyRowsText(hidden: number): string {
  return '已隐藏 ' + String(hidden) + ' 行无 Token 记录（调用失败或未产生用量；调用次数仍计入合计）'
}
