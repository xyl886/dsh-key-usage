/**
 * 导出工具：纯函数生成 CSV / JSON 文本 + Blob 触发下载，导出的是当前筛选后的数据。
 * CSV 必须带 UTF-8 BOM（否则 Excel 中文乱码），JSON 不能带 BOM（`JSON.parse` 会抛错）。
 */
import { isoDate } from './format.ts'
import { t } from './i18n.ts'

/** 列定义。`value` 取原始值（数字保持数字），避免把界面文本再解析回数字。 */
export interface ExportColumn<Row> {
  key: string
  /** 固定表头（与语言无关，如 Tokens） */
  label?: string
  /** 词典键：导出时取词，切语言后导出的表头也跟着变 */
  labelKey?: string
  value: (row: Row) => string | number | null
}

const UTF8_BOM = '\ufeff'

export const CSV_MIME = 'text/csv;charset=utf-8'
export const JSON_MIME = 'application/json;charset=utf-8'
export const YAML_MIME = 'text/yaml;charset=utf-8'
export const TEXT_MIME = 'text/plain;charset=utf-8'

/** 表头 + 数据行 → CSV 文本（转义见 `csvCell`，换行用 RFC 4180 的 CRLF）。 */
export function toCsv<Row>(rows: Row[], columns: Array<ExportColumn<Row>>): string {
  const lines = [columns.map((column) => csvCell(column.labelKey === undefined ? (column.label ?? column.key) : t(column.labelKey))).join(',')]
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(column.value(row))).join(','))
  }
  return UTF8_BOM + lines.join('\r\n') + '\r\n'
}

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}

/** 下载文件名：`dsh-usage-<主题>-<当天>.<扩展名>`，主题用英文短名避免跨端中文文件名乱码。 */
export function exportFileName(topic: string, extension: 'csv' | 'json' | 'yml' | 'txt'): string {
  return 'dsh-usage-' + topic + '-' + isoDate(new Date()) + '.' + extension
}

export function downloadFile(name: string, text: string, mime: string): void {
  const objectUrl = URL.createObjectURL(new Blob([text], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // 立刻 revoke 会有浏览器来不及取数据，推到下一轮事件循环再释放
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

/** 逗号、引号、换行都必须包引号并把内部引号翻倍，否则标题里的逗号会撑破列。 */
function csvCell(value: string | number | null): string {
  if (value === null) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}
