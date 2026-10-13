/**
 * 计费规则面板：并入「余额与配额」页下半部分（不新增 Tab）。
 *
 * 规则本体存在宿主设置服务里，本组件只负责编辑体验：模板套用、逐条增删改、
 * 导入 / 导出 JSON、以及把「缓存命中省了多少钱」这类结果展示出来。
 * 成本计算全在服务端（src/server/pricing.ts），界面不重复算。
 */
import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CURRENCY_OPTIONS, EMPTY_CONFIG, UNIT_LABELS, UNIT_OPTIONS,
  blankRule, currencySymbolOf, offPeakWindowsText,
  parseImportedPricing, ruleKeyOf, ruleLabelOf, ruleProblemOf,
  type OffPeakWindow, type PricingConfig, type PricingRates, type PricingResponse, type PricingRule,
} from '../pricing.ts'
import type { PricingSettingsState, PricingSettingsStore } from '../pricingSettings.ts'
import { JSON_MIME, downloadFile, exportFileName, toJson } from '../export.ts'
import { fmtTokens } from '../format.ts'
import type { Channel } from '../types.ts'
import styles from '../styles/shared.module.css'
import pricingStyles from '../styles/pricing.module.css'
import exportStyles from '../styles/export.module.css'

export function PricingRulesPanel(props: {
  settings: PricingSettingsStore
  state: PricingSettingsState
  pricing: PricingResponse | null
  channels: Channel[]
}): ReactNode {
  const { settings, state, pricing, channels } = props
  const [draft, setDraft] = useState<PricingRule | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const config = state.config
  const rules = config.rules
  const offPeakNowOf = (rule: PricingRule): boolean => {
    if (pricing === null) return false
    const index = rules.indexOf(rule)
    return index >= 0 && pricing.offPeakNow[index] === true
  }

  const templates = pricing?.templates ?? []
  const providerOptions = useMemo(() => channels.map((channel) => channel.provider), [channels])
  const modelOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const channel of channels) for (const model of channel.models) ids.add(model.id)
    return [...ids]
  }, [channels])

  const save = async (next: PricingConfig, done: string): Promise<void> => {
    const accepted = await settings.save(next)
    if (accepted) {
      setNotice(done)
      setDraft(null)
      setEditingKey(null)
      setEditorError(null)
    }
  }

  const startNew = (): void => {
    setDraft(blankRule(config))
    setEditingKey(null)
    setEditorError(null)
  }

  const startEdit = (rule: PricingRule): void => {
    setDraft(structuredClone(rule))
    setEditingKey(ruleKeyOf(rule))
    setEditorError(null)
  }

  const commitDraft = async (): Promise<void> => {
    if (draft === null) return
    const problem = ruleProblemOf(draft)
    if (problem !== null) {
      setEditorError(problem)
      return
    }
    const nextRules = [...rules]
    const editedIndex = editingKey === null ? -1 : nextRules.findIndex((rule) => ruleKeyOf(rule) === editingKey)
    const duplicateIndex = nextRules.findIndex((rule) => ruleKeyOf(rule) === ruleKeyOf(draft))
    if (editedIndex >= 0) {
      nextRules[editedIndex] = draft
      // 改了通道 / 模型等于改了主键：把同键的旧行删掉，避免留下两行同名规则
      if (duplicateIndex >= 0 && duplicateIndex !== editedIndex) nextRules.splice(duplicateIndex, 1)
    } else if (duplicateIndex >= 0) {
      nextRules[duplicateIndex] = draft
    } else {
      nextRules.push(draft)
    }
    await save({ ...config, rules: nextRules }, '规则已保存')
  }

  const removeRule = async (rule: PricingRule): Promise<void> => {
    await save(
      { ...config, rules: rules.filter((candidate) => candidate !== rule) },
      '规则已删除',
    )
  }

  const applyTemplate = async (): Promise<void> => {
    const template = templates.find((candidate) => candidate.id === templateId)
    if (template === undefined) return
    // 同键覆盖、新键追加：套用模板不会把已有的手工规则冲掉
    const nextRules = [...rules]
    for (const rule of template.rules) {
      const index = nextRules.findIndex((candidate) => ruleKeyOf(candidate) === ruleKeyOf(rule))
      if (index >= 0) nextRules[index] = rule
      else nextRules.push(rule)
    }
    await save({ ...config, rules: nextRules }, '已套用模板「' + template.label + '」，数值请自行核对')
  }

  const exportRules = (): void => {
    downloadFile(exportFileName('pricing-rules', 'json'), toJson(config), JSON_MIME)
  }

  const importRules = async (file: File): Promise<void> => {
    const parsed = parseImportedPricing(await file.text())
    if (parsed.config === null) {
      settings.noteError(parsed.error ?? '导入失败：文件内容无法识别')
      return
    }
    await save(parsed.config, '规则已导入（整份替换）')
  }

  const savings = pricing?.coverage.savingsByCurrency ?? {}
  const savingsEntries = Object.entries(savings).filter(([, amount]) => amount > 0)

  return (
    <div className={pricingStyles.panel}>
      <div className={pricingStyles.panelHead}>
        <span className={pricingStyles.panelTitle}>计费规则</span>
        <span className={pricingStyles.panelHint}>
          存在宿主设置服务（命名空间 <code>dsh-key-usage</code>），插件不写任何文件
        </span>
      </div>
      <div className={pricingStyles.panelNote}>
        成本优先级：<b>台账当天的官方成本</b> &gt; <b>你填的规则</b>（精确 → 通道通配 → 模型通配 → 全通配） &gt;{' '}
        <b>台账反推均价</b>；三者都没有时显示 <b>—</b>。规则改动立即在四个页签生效，不需要重启宿主。
      </div>

      {state.error !== null && <div className={pricingStyles.error}>{state.error}</div>}
      {notice !== null && <div className={pricingStyles.panelHint}>{notice}</div>}
      {state.status === 'loading' && (
        <div className={pricingStyles.panelHint}>正在读取宿主设置服务里的规则…（还没读到，导入 / 导出仍可用）</div>
      )}
      {state.status === 'unavailable' && (
        <div className={pricingStyles.warning}>
          宿主没有提供配置表单服务（或未组配 <code>@deepseek-ai/dsh-client-ui-settings</code>），
          规则只能导出 / 导入，无法保存。
        </div>
      )}
      {state.status === 'ready' && !state.writable && (
        <div className={pricingStyles.warning}>当前部署的设置为只读，保存会被宿主拒绝。</div>
      )}

      <div className={pricingStyles.statStrip}>
        <div className={pricingStyles.statItem}>
          <div className={pricingStyles.statName}>已配置规则</div>
          <div className={pricingStyles.statNum}>{rules.length} 条</div>
        </div>
        <div className={pricingStyles.statItem}>
          <div className={pricingStyles.statName}>近 30 天覆盖（模型数）</div>
          <div className={pricingStyles.statNum}>
            {pricing === null
              ? '—'
              : '规则 ' + String(pricing.coverage.ruleModels) + ' · 估算 ' + String(pricing.coverage.averagedModels) + ' · 无依据 ' + String(pricing.coverage.unpricedModels)}
          </div>
        </div>
        <div className={pricingStyles.statItem}>
          <div className={pricingStyles.statName}>规则口径金额（仅参照）</div>
          <div className={pricingStyles.statNum}>
            {pricing === null || Object.keys(pricing.coverage.ruleCostByCurrency).length === 0
              ? '—'
              : Object.entries(pricing.coverage.ruleCostByCurrency)
                .map(([currency, amount]) => currencySymbolOf(currency) + amount.toFixed(2))
                .join(' / ')}
          </div>
        </div>
        <div className={pricingStyles.statItem}>
          <div className={pricingStyles.statName}>缓存命中省下</div>
          <div className={pricingStyles.statNum + (savingsEntries.length > 0 ? ' ' + pricingStyles.saving : '')}>
            {pricing === null
              ? '—'
              : savingsEntries.length === 0
                ? '—'
                : savingsEntries.map(([currency, amount]) => currencySymbolOf(currency) + amount.toFixed(4)).join(' / ')}
          </div>
        </div>
      </div>

      {(pricing?.coverage.savingsDetail.length ?? 0) > 0 && (
        <ul className={pricingStyles.savingsList}>
          {pricing?.coverage.savingsDetail.slice(0, 6).map((entry) => (
            <li key={entry.provider + '|' + entry.model}>
              {entry.model}
              <span className={styles.dim}> · {entry.provider}</span>：命中缓存 {fmtTokens(entry.cacheReadTokens)} tokens，
              省 {currencySymbolOf(entry.currency) + entry.amount.toFixed(4)}（{pricing.coverage.from} 起）
            </li>
          ))}
        </ul>
      )}

      <div className={pricingStyles.toolbar}>
        <select
          className={pricingStyles.actionBtn}
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
        >
          <option value="">选择厂商模板…</option>
          {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
        </select>
        <button className={pricingStyles.actionBtn} disabled={templateId === ''} onClick={() => void applyTemplate()}>
          套用模板
        </button>
        <button className={pricingStyles.actionBtn} onClick={startNew}>+ 新增规则</button>
        <span className={pricingStyles.toolbarSpacer} />
        <button className={exportStyles.exportBtn} disabled={rules.length === 0} onClick={exportRules}>导出 JSON</button>
        <button className={exportStyles.exportBtn} onClick={() => fileInput.current?.click()}>导入 JSON</button>
        <button
          className={pricingStyles.actionBtn}
          disabled={rules.length === 0}
          onClick={() => void save({ ...EMPTY_CONFIG, currency: config.currency }, '已清空规则：成本回到台账反推均价')}
        >
          清空规则
        </button>
        <input
          ref={fileInput}
          className={pricingStyles.hiddenFile}
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file !== undefined) void importRules(file)
          }}
        />
      </div>

      {rules.length === 0
        ? (
          <div className={pricingStyles.empty}>
            还没有规则，成本沿用「台账反推均价」（标注为<b>估算</b>）。
            可以从上面的厂商模板起步，或点「新增规则」手填。
          </div>
        )
        : (
          <table className={pricingStyles.ruleTable}>
            <thead>
              <tr>
                <th>通道</th><th>模型</th><th>单位</th><th>输入</th><th>缓存读</th><th>缓存写</th><th>输出</th>
                <th>币种</th><th>错峰</th><th>备注</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={ruleKeyOf(rule)} className={editingKey === ruleKeyOf(rule) ? pricingStyles.editing : ''}>
                  <td><span className={pricingStyles.ruleName}>{rule.provider}</span></td>
                  <td><span className={pricingStyles.ruleName}>{rule.model}</span></td>
                  <td>{UNIT_LABELS[rule.unit]}</td>
                  <td>{rule.input}</td>
                  <td>{rule.cacheRead}</td>
                  <td>{rule.cacheWrite}</td>
                  <td>{rule.output}</td>
                  <td>{rule.currency}</td>
                  <td>
                    {rule.offPeak === null
                      ? <span className={styles.dim}>—</span>
                      : (
                        <>
                          <span className={pricingStyles.ruleName}>{offPeakWindowsText(rule)}</span>
                          {offPeakNowOf(rule) && <span className={pricingStyles.offPeakChip}>错峰中</span>}
                        </>
                      )}
                  </td>
                  <td className={pricingStyles.ruleNote}>{rule.note === '' ? <span className={styles.dim}>—</span> : rule.note}</td>
                  <td>
                    <button className={pricingStyles.linkBtn} onClick={() => startEdit(rule)}>编辑</button>
                    <button className={pricingStyles.linkBtn} onClick={() => void removeRule(rule)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {draft !== null && (
        <RuleEditor
          draft={draft}
          onChange={setDraft}
          onCancel={() => { setDraft(null); setEditorError(null); setEditingKey(null) }}
          onSave={() => void commitDraft()}
          error={editorError}
          providerOptions={providerOptions}
          modelOptions={modelOptions}
        />
      )}

      <div className={pricingStyles.panelNote}>
        来源角标：<b>官方</b> = 台账记录的厂商账单金额；<b>自定</b> = 按你填的规则算出；
        <b>估算</b> = 按台账反推均价推算；<b>—</b> = 没有价格依据。
        按次计费只用「输入」档当每次调用价；错峰窗口按<b>本地时间</b>判断，起止相同表示全天，支持跨午夜。
        多币种不换算、不合计（规则各按自己的币种算）。
      </div>
    </div>
  )
}

/** 单条规则的编辑器：单位换算、错峰窗口都在这里显式呈现，避免「按千 / 按百万」填错 1000 倍。 */
function RuleEditor(props: {
  draft: PricingRule
  onChange: (rule: PricingRule) => void
  onCancel: () => void
  onSave: () => void
  error: string | null
  providerOptions: string[]
  modelOptions: string[]
}): ReactNode {
  const { draft, onChange } = props
  const numberField = (
    label: string,
    key: 'input' | 'cacheRead' | 'cacheWrite' | 'output',
    value: number,
    extra?: { onChange?: (value: number) => void },
  ): ReactNode => (
    <div className={pricingStyles.field} key={label}>
      <label>{label}</label>
      <input
        type="number"
        min={0}
        step="any"
        value={String(value)}
        onChange={(event) => {
          const next = Number(event.target.value)
          const safe = Number.isFinite(next) && next >= 0 ? next : 0
          if (extra?.onChange !== undefined) extra.onChange(safe)
          else onChange({ ...draft, [key]: safe })
        }}
      />
    </div>
  )

  const windows = draft.offPeak?.windows ?? []
  const setWindows = (next: OffPeakWindow[]): void => {
    if (next.length === 0) {
      onChange({ ...draft, offPeak: null })
      return
    }
    onChange({
      ...draft,
      offPeak: {
        windows: next,
        input: draft.offPeak?.input ?? draft.input,
        cacheRead: draft.offPeak?.cacheRead ?? draft.cacheRead,
        cacheWrite: draft.offPeak?.cacheWrite ?? draft.cacheWrite,
        output: draft.offPeak?.output ?? draft.output,
      },
    })
  }

  return (
    <div className={pricingStyles.editor}>
      <div className={pricingStyles.editorGrid}>
        <div className={pricingStyles.field}>
          <label>通道 id（* = 任意通道）</label>
          <input list="dsh-ku-providers" value={draft.provider} onChange={(event) => onChange({ ...draft, provider: event.target.value })} />
          <datalist id="dsh-ku-providers">
            {props.providerOptions.map((provider) => <option key={provider} value={provider} />)}
          </datalist>
        </div>
        <div className={pricingStyles.field}>
          <label>模型 id（* = 该通道全部）</label>
          <input list="dsh-ku-models" value={draft.model} onChange={(event) => onChange({ ...draft, model: event.target.value })} />
          <datalist id="dsh-ku-models">
            {props.modelOptions.map((model) => <option key={model} value={model} />)}
          </datalist>
        </div>
        <div className={pricingStyles.field}>
          <label>计价单位</label>
          <select value={draft.unit} onChange={(event) => onChange({ ...draft, unit: event.target.value as PricingRule['unit'] })}>
            {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>)}
          </select>
        </div>
        <div className={pricingStyles.field}>
          <label>币种</label>
          <select value={draft.currency} onChange={(event) => onChange({ ...draft, currency: event.target.value })}>
            {CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
        </div>
        {numberField('输入（未命中缓存）', 'input', draft.input)}
        {numberField('缓存读（命中）', 'cacheRead', draft.cacheRead)}
        {numberField('缓存写', 'cacheWrite', draft.cacheWrite)}
        {numberField('输出', 'output', draft.output)}
        <div className={pricingStyles.field + ' ' + pricingStyles.fieldWide}>
          <label>备注（建议写价目来源与日期）</label>
          <input value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} />
        </div>
      </div>

      <div className={pricingStyles.subLabel}>错峰时段（本地时间；留空表示没有错峰价）</div>
      {windows.map((window, index) => (
        <div className={pricingStyles.windowRow} key={index}>
          <input
            value={window.from}
            placeholder="00:00"
            onChange={(event) => setWindows(windows.map((candidate, position) => position === index ? { ...candidate, from: event.target.value } : candidate))}
          />
          <span className={styles.dim}>至</span>
          <input
            value={window.to}
            placeholder="09:00"
            onChange={(event) => setWindows(windows.map((candidate, position) => position === index ? { ...candidate, to: event.target.value } : candidate))}
          />
          <button className={pricingStyles.linkBtn} onClick={() => setWindows(windows.filter((_, position) => position !== index))}>移除</button>
        </div>
      ))}
      <button className={pricingStyles.actionBtn} onClick={() => setWindows([...windows, { from: '00:00', to: '08:00' }])}>+ 加时间窗</button>

      {draft.offPeak !== null && (
        <>
          <div className={pricingStyles.subLabel}>错峰价（留空即与标准价相同）</div>
          <div className={pricingStyles.editorGrid}>
            {numberField('错峰输入', 'input', draft.offPeak.input, { onChange: (value) => patchOffPeak(draft, onChange, { input: value }) })}
            {numberField('错峰缓存读', 'cacheRead', draft.offPeak.cacheRead, { onChange: (value) => patchOffPeak(draft, onChange, { cacheRead: value }) })}
            {numberField('错峰缓存写', 'cacheWrite', draft.offPeak.cacheWrite, { onChange: (value) => patchOffPeak(draft, onChange, { cacheWrite: value }) })}
            {numberField('错峰输出', 'output', draft.offPeak.output, { onChange: (value) => patchOffPeak(draft, onChange, { output: value }) })}
          </div>
        </>
      )}

      {props.error !== null && <div className={pricingStyles.editorError}>{props.error}</div>}
      <div className={pricingStyles.editorHint}>
        正在编辑：{ruleLabelOf(draft)} · 单位 {UNIT_LABELS[draft.unit]}
      </div>
      <div className={pricingStyles.editorActions}>
        <button className={pricingStyles.actionBtn + ' ' + pricingStyles.primary} onClick={props.onSave}>保存规则</button>
        <button className={pricingStyles.actionBtn} onClick={props.onCancel}>取消</button>
      </div>
    </div>
  )
}

function patchOffPeak(draft: PricingRule, onChange: (rule: PricingRule) => void, patch: Partial<PricingRates>): void {
  if (draft.offPeak === null) return
  onChange({ ...draft, offPeak: { ...draft.offPeak, ...patch } })
}
