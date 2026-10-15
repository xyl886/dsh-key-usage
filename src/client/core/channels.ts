/** 通道展示工具：颜色、显示名、状态与计费模式文案。 */
import { rowMoneyViewOf, zeroMoneyTextOf, type CostRowLike } from './currency.ts'
import type { Channel, ChannelCostMode, ChannelStatus } from './types.ts'
import { t } from './i18n.ts'

const CHANNEL_COLORS = [
  'var(--dsw-alias-state-business-primary, #5b8cff)',
  'var(--dsw-alias-state-business-secondary, #9a7bff)',
  'var(--dsw-alias-state-success-primary, #3fb96f)',
  'var(--dsw-alias-state-warn-primary, #e0a13c)',
  'var(--dsw-alias-state-error-primary, #e05a5a)',
  'var(--dsw-alias-state-idle-primary, #38bdc8)',
]

export const STATUS_LABELS: Record<ChannelStatus, string> = {
  ok: 'ch.ok',
  warn: 'ch.warn',
  danger: 'ch.danger',
  off: 'ch.off',
}

export function channelIndexOf(channels: Channel[], provider: string): number {
  return channels.findIndex((channel) => channel.provider === provider)
}

export function channelColorOf(channels: Channel[], provider: string): string {
  const index = channelIndexOf(channels, provider)
  return CHANNEL_COLORS[(index >= 0 ? index : 0) % CHANNEL_COLORS.length]
}

export function displayNameOf(channels: Channel[], provider: string): string {
  return channels.find((channel) => channel.provider === provider)?.displayName ?? provider
}

export function channelOf(channels: Channel[], provider: string | null): Channel | null {
  if (provider === null) return null
  return channels.find((channel) => channel.provider === provider) ?? null
}

/** 成本单元格：文案 + 是否该挂来源角标。金额本身按显示币种折算（见 currency.ts）。 */
export interface CostCell {
  text: string
  dim: boolean
  /** 真的显示了金额：`订阅内` / `免费` / `无计费` / `—` 都是占位文案，不挂角标。 */
  amount: boolean
  /** 金额经过汇率折算（文本带 `≈`）。 */
  converted: boolean
  /** 多币种并列显示（缺汇率没法相加）：`text` 不是合计。 */
  mixed: boolean
}

/** 成本单元格：按计费模式给文案；金额走 `costsByCurrency` 逐币种折算，缺该字段时由 currency.ts 兜底。 */
export function costCellOf(channel: Channel | null, row: CostRowLike): CostCell {
  const view = rowMoneyViewOf(row)
  const hasAmount = view.amount > 0
  const money: CostCell = hasAmount
    ? { text: view.text, dim: false, amount: true, converted: view.converted, mixed: view.mixed }
    : { text: '—', dim: true, amount: false, converted: false, mixed: false }
  if (channel === null) return money
  if (channel.costMode === 'sub') return { text: t('ch.inSub'), dim: true, amount: false, converted: false, mixed: false }
  if (channel.costMode === 'free') return { text: zeroMoneyTextOf(), dim: true, amount: false, converted: false, mixed: false }
  if (channel.costMode === 'none') return { text: t('ch.noBilling'), dim: true, amount: false, converted: false, mixed: false }
  return money
}

/** 状态点的颜色（走宿主告警/成功令牌）。 */
export function statusColorOf(status: ChannelStatus): string {
  if (status === 'ok') return 'var(--dsw-alias-state-success-primary, #3fb96f)'
  if (status === 'warn') return 'var(--dsw-alias-state-warning-primary, #e0a13c)'
  if (status === 'danger') return 'var(--dsw-alias-state-danger-primary, #e05a5a)'
  return 'var(--dsw-alias-label-tertiary, #67676f)'
}

/** 窗口占用进度条颜色：≥90 危险、≥60 警告，其余正常。 */
export function quotaBarColor(percent: number): string {
  if (percent >= 90) return 'var(--dsw-alias-state-danger-primary, #e05a5a)'
  if (percent >= 60) return 'var(--dsw-alias-state-warning-primary, #e0a13c)'
  return 'var(--dsw-alias-state-success-primary, #3fb96f)'
}

export const COST_MODE_KEYS: Record<ChannelCostMode, string> = {
  sub: 'ch.inSub',
  perToken: 'ch.metered',
  free: 'ch.free',
  none: 'ch.noBilling',
  unknown: 'ch.notQueried',
}
export const COST_MODE_LABELS: Record<ChannelCostMode, string> = {
  sub: t('ch.subscription'),
  perToken: 'ch.metered',
  free: 'ch.free',
  none: t('ch.local'),
  unknown: 'ch.notQueried',
}
