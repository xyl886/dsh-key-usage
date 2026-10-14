/**
 * dsh-key-usage 客户端入口：注册「使用情况」侧边栏导航项 + 主区域页面，本文件只做 cordis apply 接线。
 * slot 契约（对齐 dsh-context）：`sidebar.panellist` 宿主自持整行、只用 `id`；`main` 同一标识放 `key`。
 * 价格由服务端三层价目自动决定，客户端只经 `/pricing`、`/rates`、`/fx` 读。
 */
import { createElement as h } from 'react'
import type { SectionContext } from './types.ts'
import { UsageIcon } from './UsageIcon.tsx'
import { UsagePage } from './UsagePage.tsx'

const NS = 'dsh-key-usage'
/** 侧边栏条目与 main 页面共用的面板标识（宿主 MainPanelId 域，命名空间化避免撞车）。 */
const PANEL_ID = NS

export const name = NS
export const inject = ['slots']

export function apply(ctx: SectionContext): void {
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
  }, UsagePage))

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 30,
    label: () => '使用情况',
  }, (props: { size?: number }) => h(UsageIcon, { size: props.size })))
}
