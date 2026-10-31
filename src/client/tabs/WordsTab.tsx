/** 提问：4 张 KPI（带环比）+ 词云（悬停给次数与占比）。数据全部来自快照的 prompts 段。 */
import { useState, type ReactNode } from 'react'
import { WordCloud } from '../components/WordCloud.tsx'
import { fmtCount } from '../core/format.ts'
import { t, useT } from '../core/i18n.ts'
import type { PromptsResponse } from '../core/types.ts'
import styles from '../styles/words.module.css'

const TOP_OPTIONS = [20, 60, 100]

export function WordsTab(props: { prompts: PromptsResponse | null }): ReactNode {
  /** 取词：宿主切语言时重渲染 */
  const t = useT()
  const prompts = props.prompts
  const words = prompts === null ? [] : [...prompts.words].sort((first, second) => second.count - first.count)
  const topWord = words[0]
  const totalPrompts = prompts === null ? null : prompts.totalPrompts
  // 上期字段：服务端没给（上期窗口没有提问 / 旧版本）时保持 null，整段环比不显示
  /** 词云展示条数：默认前 60，可按需放宽到 100 / 收到 20。 */
  const [topN, setTopN] = useState(60)
  /** 词比档位少时按实际词数截断，避免「选了 100 只有 30」的错觉。 */
  const effectiveTopN = Math.min(topN, words.length)
  const prevPrompts = prevOf(prompts?.prevTotalPrompts)
  const prevChars = prevOf(prompts?.prevTotalChars)
  const prevWords = prevOf(prompts?.prevWordCount)
  const prevTopWord = prevOf(prompts?.prevTopWordCount)

  return (
    <div className={styles.page}>
      <div className={styles.kpis}>
        <KpiCard
          label={t('words.kpiPrompts')}
          value={totalPrompts === null ? '—' : fmtCount(totalPrompts)}
          detail={prevPrompts === null ? undefined : <PrevLine previous={prevPrompts} current={totalPrompts} format={fmtCount} />}
        />
        <KpiCard
          label={t('words.kpiChars')}
          value={prompts === null ? '—' : fmtCount(prompts.totalChars)}
          detail={prevChars === null
            ? undefined
            : <PrevLine previous={prevChars} current={prompts === null ? null : prompts.totalChars} format={fmtCount} />}
        />
        <KpiCard
          label={t('words.kpiWords')}
          value={prompts === null ? '—' : fmtCount(words.length)}
          detail={prevWords === null ? undefined : <PrevLine previous={prevWords} current={prompts === null ? null : words.length} format={fmtCount} />}
        />
        <KpiCard
          label={t('words.kpiTop')}
          value={topWord === undefined ? '—' : topWord.word}
          detail={topWord === undefined
            ? undefined
            : (
              <>
                {t('words.times', { count: fmtCount(topWord.count) })}
                <TrendPercent previous={prevTopWord} current={topWord.count} />
              </>
            )}
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>{t('words.cloud')}</span>
          {words.length > 20 && (
            <span className={styles.topN}>
              {TOP_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={option > words.length}
                  className={option === topN ? styles.topNBtn + ' ' + styles.topNBtnOn : styles.topNBtn}
                  aria-pressed={option === topN}
                  onClick={() => setTopN(option)}
                >{option}</button>
              ))}
            </span>
          )}
          {prompts !== null && (
            <span className={styles.panelAction}>
              <span className={styles.panelNote}>{t('words.wordCount', { count: words.length })}</span>
            </span>
          )}
        </div>
        <WordCloud
          words={words.slice(0, effectiveTopN)}
          emptyText={prompts === null ? t('s.loading') : t('words.noPrompts')}
          tipOf={(word, count) => t('words.cloudTip', {
            word,
            count: fmtCount(count),
            share: sharePercentOf(count, totalPrompts),
          })}
        />
      </div>
    </div>
  )
}

/** KPI 小卡：标签 + 数值 +（可选）环比行。 */
function KpiCard(props: { label: string; value: string; detail?: ReactNode }): ReactNode {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{props.label}</div>
      <div className={styles.kpiValue} title={props.value}>{props.value}</div>
      {props.detail !== undefined && <div className={styles.kpiDetail}>{props.detail}</div>}
    </div>
  )
}

/** 服务端没给上期字段（旧版本 / 上期窗口没有提问）时为 null，整段环比不显示。 */
function prevOf(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** 涨跌角标：与概览的环比同一套语义色（涨红跌绿），持平不染色。 */
function TrendPercent(props: { previous: number | null; current: number | null }): ReactNode {
  if (props.previous === null || props.previous <= 0 || props.current === null) return null
  const delta = (props.current - props.previous) / props.previous * 100
  return (
    <span className={delta > 0 ? styles.rise : delta < 0 ? styles.fall : styles.flat}>
      {(delta > 0 ? '+' : '') + delta.toFixed(1) + '%'}
    </span>
  )
}

/**
 * 「上期值 ±Y%」：没有上期字段就整行不显示（不编数字）；
 * 有上期但本期为 null 时只给上期值，只有两边都有且上期非零才带涨跌百分比。
 */
function PrevLine(props: { previous: number | null; current: number | null; format: (value: number) => string }): ReactNode {
  if (props.previous === null) return null
  const previousText = props.format(props.previous)
  if (props.current === null) return <>{previousText}</>
  return <>{previousText}<TrendPercent previous={props.previous} current={props.current} /></>
}

/** 词频占比：一位小数；没有参与统计的提问时给 0（此时词云必为空，不会真的显示）。 */
function sharePercentOf(count: number, totalPrompts: number | null): string {
  if (totalPrompts === null || totalPrompts <= 0) return '0.0'
  return (count / totalPrompts * 100).toFixed(1)
}
