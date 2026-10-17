/**
 * 设置：把「偶尔动一次」的东西从各页面收进来 —— 显示币种、汇率刷新、价目刷新、版本。
 * 页面里只留结论；来源与时间放这里，失败原因仍只进系统日志（`LogHint` 指路）。
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { FX_PATH, MODEL_PRICE_REFRESH_PATH, failureReasonOf, loadFxRate, refreshModelPrices } from '../core/api.ts'
import {
  DISPLAY_CURRENCIES, DISPLAY_CURRENCY_SYMBOLS, fxFallbackWarningOf, fxSummaryTextOf, normalizeFxRate,
  setDisplayCurrency, setFxRate, useCurrencyDisplay, type DisplayCurrency,
} from '../core/currency.ts'
import { t, useT } from '../core/i18n.ts'
import { logError, logInfo, logWarn } from '../core/log.ts'
import { modelPriceRefreshTextOf } from '../core/pricing.ts'
import { PLUGIN_VERSION } from '../core/version.ts'
import { LogHint } from './LogHint.tsx'
import { Button } from './ui/Button.tsx'
import styles from '../styles/settings.module.css'

export function SettingsDialog(props: {
  /** 刷新价目成功后通知页面重取 /pricing 与用量（成本口径整体变了） */
  onPricingReload: () => void
}): ReactNode {
  const t = useT()
  const display = useCurrencyDisplay()
  const [fxLoading, setFxLoading] = useState(false)
  const [fxError, setFxError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshElapsed, setRefreshElapsed] = useState(0)
  const [refreshStatus, setRefreshStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  /** 取一次汇率：服务端 12 小时内走缓存，打上游的只有用户点「刷新汇率」那一下；失败时保留已有汇率。 */
  const fetchFx = useCallback(async (force: boolean): Promise<void> => {
    setFxLoading(true)
    const result = await loadFxRate(force)
    setFxLoading(false)
    if (result === null) {
      const reason = failureReasonOf(FX_PATH) ?? t('quota.noResponse')
      setFxError(reason)
      logWarn('fx', t('quota.fxUnavailable'), reason + ' · ' + FX_PATH)
      return
    }
    setFxError(null)
    // 归一化返回 null 说明 rate 非法：宁可说「没取到汇率」，也不要拿上一次的值冒充
    const normalized = normalizeFxRate(result)
    if (normalized === null) {
      setFxError(t('quota.fxBad'))
      logWarn('fx', t('quota.fxUnavailable'), t('quota.fxBad') + ' · ' + FX_PATH)
      setFxRate(null)
      return
    }
    setFxRate(normalized)
    if (force) logInfo('fx', t('quota.refreshFx'), fxSummaryTextOf(normalized))
  }, [t])

  // 打开设置时确保有一次汇率：缓存内不联网，缺了才打上游
  useEffect(() => { void fetchFx(false) }, [fetchFx])

  // 刷新价目最长 20 秒预算：逐秒推进，用户得看到它还在跑
  useEffect(() => {
    if (!refreshing) return
    const timer = setInterval(() => setRefreshElapsed((previous) => previous + 1), 1000)
    return () => clearInterval(timer)
  }, [refreshing])

  // 汇率回落默认值：原因进日志，界面只留那行说明
  const fxFallback = display.fx === null ? null : fxFallbackWarningOf(display.fx)
  useEffect(() => {
    if (fxFallback === null) return
    logWarn('fx', fxFallback, (display.fx?.note ?? '') + ' · ' + FX_PATH)
  }, [fxFallback, display.fx?.note])

  /** 切显示币种：只改展示口径，不重取用量；汇率缺失 / 过期才补取一次。 */
  const switchCurrency = (next: DisplayCurrency): void => {
    if (next === display.display) return
    setDisplayCurrency(next)
    if (display.fx === null || display.fx.stale) void fetchFx(false)
  }

  /** 「刷新价目」：唯一会拉上游的写动作；成功后让页面重取 /pricing 与用量。 */
  const refreshPrices = async (): Promise<void> => {
    if (refreshing) return
    setRefreshing(true)
    setRefreshElapsed(0)
    setRefreshStatus(null)
    const outcome = await refreshModelPrices()
    setRefreshing(false)
    if (outcome === null) {
      const reason = failureReasonOf(MODEL_PRICE_REFRESH_PATH) ?? t('quota.noResponse')
      logError('pricing', t('quota.pricingFailedShort'), reason + ' · ' + MODEL_PRICE_REFRESH_PATH, () => { void refreshPrices() })
      setRefreshStatus({ tone: 'bad', text: t('quota.pricingFailedShort') })
      return
    }
    if (!outcome.ok) {
      logError('pricing', t('quota.pricingFailedShort'), outcome.error, () => { void refreshPrices() })
      setRefreshStatus({ tone: 'bad', text: t('quota.pricingFailedShort') })
      return
    }
    setRefreshStatus({ tone: 'ok', text: modelPriceRefreshTextOf(outcome) })
    logInfo('pricing', t('quota.refreshPrices'), modelPriceRefreshTextOf(outcome) + '\n' + outcome.url)
    props.onPricingReload()
  }

  const fxText = display.fx === null
    ? (fxError === null ? fxSummaryTextOf(null) : t('quota.fxUnavailable'))
    : (fxFallback ?? fxSummaryTextOf(display.fx))
  const fxWarn = display.fx === null || display.fx.source === 'default'

  return (
    <div className={styles.wrap}>
      <div className={styles.block}>
        <div className={styles.head}>
          <span className={styles.title}>{t('settings.currency')}</span>
          <span className={styles.actions}>
            {DISPLAY_CURRENCIES.map((currency) => (
              <Button
                key={currency}
                size="sm"
                active={display.display === currency}
                className={styles.currencyBtn}
                ariaLabel={currency}
                onClick={() => switchCurrency(currency)}
              >
                {DISPLAY_CURRENCY_SYMBOLS[currency]}
              </Button>
            ))}
          </span>
        </div>
        {/* 金额按当前币种折算（带 ≈）；折算率与来源在下面「汇率」里 */}
      </div>

      <div className={styles.block}>
        <div className={styles.head}>
          <span className={styles.title}>{t('settings.fx')}</span>
          <span className={styles.actions}>
            <Button size="sm" disabled={fxLoading} aria-busy={fxLoading} title={t('quota.fxCacheHint')} onClick={() => void fetchFx(true)}>
              {fxLoading ? t('quota.fetchFx') : t('quota.refreshFx')}
            </Button>
          </span>
        </div>
        <div className={fxWarn ? styles.value + ' ' + styles.valueWarn : styles.value}>{fxText}</div>
      </div>

      <div className={styles.block}>
        <div className={styles.head}>
          <span className={styles.title}>{t('settings.pricing')}</span>
          <span className={styles.actions}>
            <Button size="sm" variant="primary" disabled={refreshing} aria-busy={refreshing} onClick={() => void refreshPrices()}>
              {refreshing
                ? t('action.refreshing') + (refreshElapsed > 0 ? ' ' + String(refreshElapsed) + 's' : '')
                : t('quota.refreshPrices')}
            </Button>
          </span>
        </div>
        {refreshStatus === null
          ? <div className={styles.value}>{t('quota.pricingInfoHint')}</div>
          : refreshStatus.tone === 'ok'
            ? <div className={styles.value}>{refreshStatus.text}</div>
            : <LogHint text={refreshStatus.text} tone="error" />}
      </div>

      <div className={styles.version}>{t('settings.version') + ' ' + PLUGIN_VERSION}</div>
    </div>
  )
}
