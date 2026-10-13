/**
 * 零 Token 行的统一处理。
 *
 * 只有调用次数、Token 全是 0 的行，基本都是**调用失败 / 未产生用量**的记录（本机实测：
 * key 失效的模型只有调用数、没有任何 Token），列在用量表里全是噪音 —— 总计 0、命中率 —、成本 —。
 * 四处列表（使用明细的每日细目 / 按模型 / 项目用量 / 会话用量）统一用 `dropEmptyRows` 过滤，
 * 并把隐藏条数如实告诉用户，避免「数字怎么少了」的困惑。
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
