/**
 * 通道多选下拉：自绘浮层（不用原生 `select multiple`），触发条显示「全部通道」或「N 个通道」。
 * 勾选结果由父组件持有并落 localStorage；本组件只管浮层开关、点外部 / Esc 关闭。
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { COST_MODE_TAG_KEYS } from '../core/channels.ts'
import { t, useT } from '../core/i18n.ts'
import type { Channel } from '../core/types.ts'
import styles from '../styles/channelFilter.module.css'

export function ChannelFilter(props: {
  channels: Channel[]
  /** 被勾掉的通道 provider（空数组 = 全选）；由父组件过滤卡片并持久化 */
  hidden: string[]
  onToggle: (provider: string) => void
}): ReactNode {
  const t = useT()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popupId = useId()
  const visibleCount = props.channels.filter((channel) => !props.hidden.includes(channel.provider)).length

  // 点外部关闭；Esc 关闭并把焦点还给触发条，键盘用户不会丢失位置
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent): void => {
      const root = rootRef.current
      if (root !== null && event.target instanceof Node && root.contains(event.target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-label={t('quota.channelFilter')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span>{visibleCount === props.channels.length ? t('quota.allChannels') : t('quota.channelCount', { count: visibleCount })}</span>
        <span className={styles.caret} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className={styles.popup} id={popupId} role="group" aria-label={t('quota.channelFilter')}>
          {props.channels.map((channel) => (
            <label className={styles.item} key={channel.provider}>
              <input
                type="checkbox"
                checked={!props.hidden.includes(channel.provider)}
                onChange={() => props.onToggle(channel.provider)}
              />
              <span className={styles.itemName}>{channel.displayName}</span>
              <span className={styles.itemKind}>{t(COST_MODE_TAG_KEYS[channel.costMode] ?? 'ch.notQueried')}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
