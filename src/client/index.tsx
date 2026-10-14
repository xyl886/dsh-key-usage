/**
 * dsh-key-usage 客户端入口：注册「使用情况」侧边栏导航项 + 主区域页面。
 * UI 逻辑在 UsagePage / KeyUsageSection 里；本文件只做 cordis apply 接线。
 *
 * slot 契约（对齐已装的 dsh-context「上下文洞察」写法）：
 * - `sidebar.panellist`：宿主自持整行（标签 / hover / active），插件只提供图标，`id` 是面板标识；
 * - `main`：同一标识放在 `key` 上，宿主在主内容区按它渲染整页 —— 因此不是弹窗、也不占设置页。
 *
 * 计费不需要用户配置：价格由服务端的三层价目（内置官方价目 / LiteLLM 聚合价目 / 台账反推均价）自动决定，
 * 客户端只经 `/pricing`、`/rates`、`/fx` 读；宿主的设置服务链路（配置表单 + 插件页配置卡片）已整条退役。
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
