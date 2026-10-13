/**
 * dsh-key-usage 客户端入口：注册「使用情况」侧边栏导航项 + 主区域页面，
 * 并把计费规则面板接到宿主的配置表单服务上。
 * UI 逻辑在 UsagePage / KeyUsageSection 里；本文件只做 cordis apply 接线。
 *
 * slot 契约（对齐已装的 dsh-context「上下文洞察」写法）：
 * - `sidebar.panellist`：宿主自持整行（标签 / hover / active），插件只提供图标，`id` 是面板标识；
 * - `main`：同一标识放在 `key` 上，宿主在主内容区按它渲染整页 —— 因此不是弹窗、也不占设置页；
 * - `plugins.bundle.config`：插件页（以包名为键）里的配置卡片，与页面里的规则面板共用同一份状态。
 *
 * 计费规则的存储：命名空间就是本包在 profile 里的条目 id，写入由宿主的 config-editor
 * 落到当前 profile 的 cordis patch 上；本插件不写任何文件（见 AGENTS.md 硬约束）。
 */
import { createElement as h } from 'react'
import type { SectionContext } from './types.ts'
import { pricingSettings } from './pricingSettings.ts'
import { UsageIcon } from './UsageIcon.tsx'
import { UsagePage } from './UsagePage.tsx'
import { PricingCard } from './components/PricingCard.tsx'

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

  // 配置表单服务由宿主 ui-settings 提供；没有它就只读（面板会提示只能导入 / 导出）
  ctx.inject?.(['configForms'], (scope) => {
    const forms = scope.configForms
    if (forms === undefined) return
    scope.effect?.(() => pricingSettings.attach(forms.get(NS)), 'dsh-key-usage: pricing rules binding')
    // 只在宿主真的服务这个命名空间时才登记插件页卡片，否则那个部署里不该留下痕迹
    scope.effect?.(() => forms.whileServed([NS], () => scope.slots.inject('plugins.bundle.config', () => scope.slots.register({
      name: 'plugins.bundle.config',
      key: NS,
    }, PricingCard))), 'dsh-key-usage: plugins page card')
  })
}
