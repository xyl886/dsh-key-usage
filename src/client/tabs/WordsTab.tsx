/** 提问词云：4 张 KPI + 词云 + 词表（最多 30 行、可滚动、可导出 CSV）。数据全部来自快照的 prompts 段。 */
import type { ReactNode } from 'react'
import { WordCloud } from '../components/WordCloud.tsx'
import { Button } from '../components/ui/Button.tsx'
import { downloadCsv } from '../core/export-csv.ts'
import { fmtCount } from '../core/format.ts'
import { t, useT } from '../core/i18n.ts'
import type { PromptsResponse } from '../core/types.ts'
import styles from '../styles/words.module.css'

/** 词表最多列几行：服务端最多下发 60 个词，页面只列高频的前 30 个（导出仍给全量）。 */
const MAX_WORD_ROWS = 30

export function WordsTab(props: { prompts: PromptsResponse | null }): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const prompts = props.prompts
  const words = prompts === null ? [] : [...prompts.words].sort((first, second) => second.count - first.count)
  const totalPrompts = prompts === null ? null : prompts.totalPrompts
  const topWord = words[0]

  return (
    <div className={styles.page}>
      {/* 上期口径服务端没有下发，四张卡只给绝对值：没有数据就不显示对比，也不拿别的数凑百分比 */}
      <div className={styles.kpis}>
        <KpiCard label={t('words.kpiPrompts')} value={totalPrompts === null ? '—' : fmtCount(totalPrompts)} />
        <KpiCard label={t('words.kpiChars')} value={prompts === null ? '—' : fmtCount(prompts.totalChars)} />
        <KpiCard label={t('words.kpiWords')} value={prompts === null ? '—' : fmtCount(words.length)} />
        <KpiCard
          label={t('words.kpiTop')}
          value={topWord === undefined ? '—' : topWord.word}
          detail={topWord === undefined ? undefined : t('words.times', { count: fmtCount(topWord.count) })}
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>{t('words.cloud')}</span>
            {prompts !== null && (
              <span className={styles.panelAction}>
                <span className={styles.panelNote}>{t('words.wordCount', { count: words.length })}</span>
              </span>
            )}
          </div>
          <WordCloud
            words={words}
            emptyText={prompts === null ? t('s.loading') : t('words.noPrompts')}
          />
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>{t('words.table')}</span>
            <span className={styles.panelAction}>
              {prompts !== null && (
                <span className={styles.panelNote}>{t('words.wordCount', { count: words.length })}</span>
              )}
              <Button
                size="sm"
                disabled={words.length === 0}
                onClick={() => exportWordCsv(words, totalPrompts)}
              >{t('export.csv')}</Button>
            </span>
          </div>
          {words.length === 0
            ? <div className={styles.empty}>{prompts === null ? t('s.loading') : t('words.noPrompts')}</div>
            : (
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">{t('words.colWord')}</th>
                      <th scope="col">{t('words.colCount')}</th>
                      <th scope="col">{t('m.share')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.slice(0, MAX_WORD_ROWS).map((entry) => (
                      <tr key={entry.word}>
                        <td>{entry.word}</td>
                        <td>{fmtCount(entry.count)}</td>
                        <td>{wordShareTextOf(entry.count, totalPrompts)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

/** KPI 小卡：标签 + 数值 +（可选）绝对值附注。 */
function KpiCard(props: { label: string; value: string; detail?: string }): ReactNode {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{props.label}</div>
      <div className={styles.kpiValue} title={props.value}>{props.value}</div>
      {props.detail !== undefined && <div className={styles.kpiDetail}>{props.detail}</div>}
    </div>
  )
}

/** 词频占比：保留一位小数；没有参与统计的提问时给 —（不除零）。 */
function wordShareTextOf(count: number, totalPrompts: number | null): string {
  if (totalPrompts === null || totalPrompts <= 0) return '—'
  return (count / totalPrompts * 100).toFixed(1) + '%'
}

/** 词表导出：列与页面表格同口径（百分数写在表头，单元格只放数值）；导出全部词。 */
function exportWordCsv(words: Array<{ word: string; count: number }>, totalPrompts: number | null): void {
  const header = [t('words.colWord'), t('words.colCount'), t('m.share') + '(%)']
  const rows = words.map((entry) => [
    entry.word,
    entry.count,
    totalPrompts === null || totalPrompts <= 0 ? '' : (entry.count / totalPrompts * 100).toFixed(1),
  ])
  downloadCsv('dsh-key-usage-提问词表-' + new Date().toISOString().slice(0, 10) + '.csv', header, rows)
}
