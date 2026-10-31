/**
 * 客户端导出：只用已经取回的数据拼 CSV Blob，**不新增端点、不联网**。
 * 列名与明细表一致；金额不带币种符号（币种由页面显示口径决定，导出保留原值）。
 */
import type { SessionsResponse, UsageResponse } from './types.ts'

/** 纯函数返回的表格数据：下载入口只负责转 Blob。 */
export interface CsvTable {
  filename: string
  header: string[]
  rows: Array<Array<string | number | null | undefined>>
}

const escapeCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

/** 触发一次浏览器下载（BOM 让 Excel 直接按 UTF-8 打开）。 */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null | undefined>>): void {
  const lines = [header, ...rows].map((row) =>
    row.map((cell) => escapeCell(cell === null || cell === undefined ? '' : String(cell))).join(','),
  )
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.click()
  URL.revokeObjectURL(url)
}

const todaySuffix = (): string => new Date().toISOString().slice(0, 10)

/** 使用明细（按天）：一行 = 一天 × 一个通道（与明细表同口径）。 */
export function buildUsageCsv(usage: UsageResponse): CsvTable {
  return {
    filename: 'dsh-key-usage-使用明细-' + todaySuffix() + '.csv',
    header: ['日期', '通道', 'calls', '输入 token', '输出 token', '缓存读 token', '缓存写 token', '成本', '成本来源', '部分计价'],
    rows: usage.days.map((day) => [
      day.date,
      day.provider,
      day.calls,
      day.inputTokens,
      day.outputTokens,
      day.cacheReadTokens,
      day.cacheWriteTokens,
      day.cost,
      day.costSource,
      day.partial === true ? '是' : '否',
    ]),
  }
}

/** 使用明细（分时）：一行 = 日期 × 时段；成本按币种分列，不做跨币种相加。 */
export function buildHourlyCsv(usage: UsageResponse, range: 'today' | 'week'): CsvTable {
  const slotHours = range === 'today' ? 1 : 6
  const currencies = new Set<string>()
  for (const cells of Object.values(usage.hoursByDate ?? {})) {
    if (!Array.isArray(cells)) continue
    for (const cell of cells) for (const code of Object.keys(cell.costsByCurrency ?? {})) currencies.add(code)
  }
  const codes = [...currencies].sort()
  const header = ['日期', '时段', 'calls', 'Tokens', '输出 token', '缓存读 token', '会话', ...codes.map((code) => '成本 ' + code)]
  const rows: Array<Array<string | number | null>> = []
  for (const date of Object.keys(usage.hoursByDate ?? {}).sort()) {
    const cells = usage.hoursByDate?.[date]
    if (!Array.isArray(cells)) continue
    for (let startHour = 0; startHour < 24; startHour += slotHours) {
      let calls = 0
      let tokens = 0
      let output = 0
      let cacheRead = 0
      let sessions = 0
      const money: Record<string, number> = {}
      for (let offset = 0; offset < slotHours; offset += 1) {
        const cell = cells[startHour + offset]
        if (cell === undefined) continue
        calls += cell.calls ?? 0
        tokens += cell.tokens ?? 0
        output += cell.outputTokens ?? 0
        cacheRead += cell.cacheReadTokens ?? 0
        sessions += cell.sessions ?? 0
        for (const [code, amount] of Object.entries(cell.costsByCurrency ?? {})) money[code] = (money[code] ?? 0) + amount
      }
      if (calls === 0 && tokens === 0) continue
      const label = range === 'today'
        ? String(startHour).padStart(2, '0') + ':00'
        : String(startHour).padStart(2, '0') + '–' + String(startHour + slotHours).padStart(2, '0') + ':00'
      rows.push([
        date, label, calls, tokens, output, cacheRead, sessions,
        ...codes.map((code) => (money[code] === undefined ? '—' : money[code].toFixed(4))),
      ])
    }
  }
  return { filename: 'dsh-key-usage-明细分时-' + todaySuffix() + '.csv', header, rows }
}

/** 会话：一行 = 一个会话（与「最近会话」列表同口径）。 */
export function buildSessionsCsv(sessions: SessionsResponse): CsvTable {
  return {
    filename: 'dsh-key-usage-会话-' + todaySuffix() + '.csv',
    header: ['会话', '项目', '通道', '模型数', 'calls', 'Tokens', '缓存命中率', '成本', '成本来源', '首次时间', '最后时间', '归档', '子代理数'],
    rows: sessions.rows.map((row) => [
      row.title,
      row.workspace,
      row.provider,
      row.modelCount,
      row.calls,
      row.tokens,
      row.cacheHitRate,
      row.cost,
      row.costSource,
      row.firstTime,
      row.lastTime,
      row.archived === true ? '是' : '否',
      row.subagentCount,
    ]),
  }
}

/** 使用明细：分时范围导出「日期 × 时段」，其余导出逐日行。 */
export function exportUsageCsv(usage: UsageResponse, range?: string): void {
  const table = range === 'today' || range === 'week'
    ? buildHourlyCsv(usage, range)
    : buildUsageCsv(usage)
  downloadCsv(table.filename, table.header, table.rows)
}

/** 会话：一行 = 一个会话。 */
export function exportSessionsCsv(sessions: SessionsResponse): void {
  const table = buildSessionsCsv(sessions)
  downloadCsv(table.filename, table.header, table.rows)
}
