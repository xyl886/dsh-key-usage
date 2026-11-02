/**
 * 界面文案词典入口：实际词条在 `locale/zh.json` / `locale/en.json`。
 * 规则：界面标签中文 ≤6 字、提示 ≤8 字、英文 ≤2 词；解释性长句只允许出现在口径弹窗或 tooltip 里，且必须给英文。
 * 新增键 → 两份 JSON 同步补齐；缺键会回落中文（见 i18n.ts）。
 */
import enJson from './locale/en.json' with { type: 'json' }
import zhJson from './locale/zh.json' with { type: 'json' }

export const zh: Record<string, string> = zhJson
export const en: Record<string, string> = enJson
