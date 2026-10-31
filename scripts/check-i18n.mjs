/**
 * 词典自检：
 * 1. 中英两份词典键必须完全一致（缺一侧直接失败）；
 * 2. 列出在客户端源码里找不到引用的键（提示用，不失败 —— 有些键由常量拼接）。
 * 只读源码，不依赖宿主。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const clientDir = new URL('../src/client/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}
const files = walk(clientDir)
const copyPath = join(clientDir, 'core', 'copy.ts')
const text = readFileSync(copyPath, 'utf8')
const zhStart = text.indexOf('export const zh')
const enStart = text.indexOf('export const en')
if (zhStart < 0 || enStart < 0) {
  console.error('check:i18n 找不到 zh / en 词典')
  process.exit(1)
}
const keysOf = (block) => [...block.matchAll(/^\s+'([^']+)':/gm)].map((match) => match[1])
const zhKeys = new Set(keysOf(text.slice(zhStart, enStart)))
const enKeys = new Set(keysOf(text.slice(enStart)))
const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key))
const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key))
const others = files.filter((file) => file !== copyPath).map((file) => readFileSync(file, 'utf8')).join('\n')
const unused = [...zhKeys].filter((key) => !others.includes("'" + key + "'"))

for (const key of missingInEn) console.error('en 缺键: ' + key)
for (const key of missingInZh) console.error('zh 缺键: ' + key)
console.log('词条: ' + zhKeys.size + ' 条；中英一致: ' + (missingInEn.length === 0 && missingInZh.length === 0))
if (unused.length > 0) console.log('提示：' + unused.length + ' 条在组件源码里没有直接引用（可能由常量拼接，人工确认）')
if (missingInEn.length > 0 || missingInZh.length > 0) process.exit(1)
