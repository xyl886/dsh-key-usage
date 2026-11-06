/** Tab 栏 + 全局多选筛选（通道 / 项目 / 模型）。选中态与选项由页面计算，这里只负责渲染与回调。 */
import type { ReactNode } from 'react'
import { MultiSelect } from './MultiSelect.tsx'
import { t } from '../core/i18n.ts'
import { selectionOf } from '../core/filter-selection.ts'
export type TabId = 'quota' | 'overview' | 'detail' | 'distribution' | 'sessions' | 'tools' | 'words'
import styles from '../styles/shared.module.css'

export const TABS: Array<[TabId, string]> = [
  ['quota', 'tab.quota'],
  ['overview', 'tab.overview'],
  ['detail', 'tab.detail'],
  ['distribution', 'tab.distribution'],
  ['sessions', 'tab.sessions'],
  ['tools', 'tab.tools'],
  ['words', 'tab.words'],
]

export function UsageTabs(props: {
  activeTab: TabId
  onPick: (tab: TabId) => void
  usage: { channel: Map<string, number>; project: Map<string, number>; model: Map<string, number> }
  channelOptions: Array<{ value: string; label: string }>
  projectOptions: Array<{ value: string; label: string }>
  modelOptions: Array<{ value: string; label: string }>
  channelFilter: string
  projectFilter: string
  modelFilter: string
  onChannelFilter: (value: string) => void
  onProjectFilter: (value: string) => void
  onModelFilter: (value: string) => void
}): ReactNode {
  const { activeTab, channelFilter, projectFilter, modelFilter, channelOptions, projectOptions, modelOptions } = props
  const { channel: channelUsage, project: projectUsage, model: modelUsage } = props.usage
  const pickSection = props.onPick
  const setChannelFilter = props.onChannelFilter
  const setProjectFilter = props.onProjectFilter
  const setModelFilter = props.onModelFilter
  return (
      <div className={styles.toolbarRow}>
        <div className={styles.tabBar}>
          {TABS.map(([tabId, labelKey]) => (
            <button key={tabId} className={activeTab === tabId ? styles.active : ''} onClick={() => pickSection(tabId)}>{t(labelKey)}</button>
          ))}
        </div>
        <span className={styles.rowSpacer} />
        <MultiSelect
          usageOf={(value) => channelUsage.get(value) ?? 0}
          options={channelOptions}
          selected={selectionOf(channelFilter)}
          onChange={(next) => setChannelFilter(next.join(','))}
          allLabel={t('s.allChannels')}
          ariaLabel={t('filter.channel')}
          searchLabel={t('filter.searchChannel')}
        />
        <MultiSelect
          usageOf={(value) => projectUsage.get(value) ?? 0}
          options={projectOptions}
          selected={selectionOf(projectFilter)}
          onChange={(next) => setProjectFilter(next.join(','))}
          allLabel={t('filter.allProjects')}
          ariaLabel={t('filter.project')}
          searchLabel={t('filter.searchProject')}
        />
        <MultiSelect
          usageOf={(value) => modelUsage.get(value) ?? 0}
          options={modelOptions}
          selected={selectionOf(modelFilter)}
          onChange={(next) => setModelFilter(next.join(','))}
          allLabel={t('filter.allModels')}
          ariaLabel={t('filter.model')}
          searchLabel={t('filter.searchModel')}
        />
      </div>
  )
}
