/**
 * 界面刻度检查：CSS 里的间距 / 圆角 / 字号 / 控件高只能取 ui-scale.json 里列出的值。
 * 目的：把「7px、9px、10.4px、0.87 倍字号」这类手上调出来的脏值挡在 verify 里，
 * 而不是靠人一页页看。只读：不改文件，发现越界值就退出 1 并列出位置。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const scale = JSON.parse(readFileSync(join(root, 'scripts/ui-scale.json'), 'utf8'))

const SPACING_PROPS = new Set(['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap'])
const RADIUS_PROPS = new Set(['border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius'])
const FONT_PROPS = new Set(['font-size'])
const CONTROL_PROPS = new Set(['min-height'])  // height 多用于图表条，不纳入控件刻度

/** 只检查纯 px 值；calc()/var()/max()/百分比/em/rem 视为使用令牌，跳过。 */
function pxValuesOf(value) {
  if (/[a-z%]/i.test(value.replace(/px/g, ''))) return []
  return [...value.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]))
}

function allowedSetFor(prop) {
  if (SPACING_PROPS.has(prop)) return scale.spacing
  if (RADIUS_PROPS.has(prop)) return scale.radius
  if (FONT_PROPS.has(prop)) return scale.fontSize
  if (CONTROL_PROPS.has(prop)) return scale.controlHeight
  return null
}

const violations = []
const files = []
for (const directory of ['src/client/styles', 'src/client/components', 'src/client/tabs']) {
  for (const name of readdirSync(join(root, directory), { withFileTypes: true })) {
    if (!name.isFile()) continue
    if (!name.name.endsWith('.css')) continue
    files.push(join(directory, name.name))
  }
}

for (const relative of files) {
  const text = readFileSync(join(root, relative), 'utf8')
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    for (const match of line.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)) {
      const prop = match[1]
      const allowed = allowedSetFor(prop)
      if (allowed === null) continue
      for (const value of pxValuesOf(match[2])) {
        if (value < 0) continue  // 负 margin 是吸顶/对齐的刻意写法，不参与刻度
        if (allowed.includes(value)) continue
        violations.push(`${relative}:${index + 1}  ${prop}: ${value}px（允许：${allowed.join(' / ')}）`)
      }
    }
  }
}

if (violations.length > 0) {
  console.error('界面刻度越界 ' + String(violations.length) + ' 处：')
  for (const item of violations) console.error('  ' + item)
  console.error('\n规则见 scripts/ui-scale.json；确需例外请先改刻度表，不要就地写新数值。')
  process.exit(1)
}
console.log('界面刻度检查通过（间距 / 圆角 / 字号 / 控件高均在刻度内）')
