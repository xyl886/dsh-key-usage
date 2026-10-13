/**
 * 插件页（`plugins.bundle.config` 槽，以包名为键）里的计费规则卡片。
 * 与「余额与配额」页下半部分共用同一个面板与同一份状态（存在宿主设置服务里），
 * 这里只是多一个入口，不做第二套逻辑。
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { loadChannels, loadPricing } from '../api.ts'
import { pricingSettings } from '../pricingSettings.ts'
import type { Channel, PricingResponse } from '../types.ts'
import { PricingRulesPanel } from './PricingRulesPanel.tsx'

export function PricingCard(): ReactNode {
  const state = useSyncExternalStore(pricingSettings.store.subscribe, pricingSettings.store.getSnapshot)
  const [pricing, setPricing] = useState<PricingResponse | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])

  useEffect(() => {
    let cancelled = false
    void loadPricing().then((result) => { if (!cancelled) setPricing(result) })
    void loadChannels().then((result) => { if (!cancelled) setChannels(result ?? []) })
    return () => { cancelled = true }
  }, [state.config])

  return (
    <PricingRulesPanel
      settings={pricingSettings}
      state={state}
      pricing={pricing}
      channels={channels}
    />
  )
}
