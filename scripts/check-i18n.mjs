/**
 * 词典自检：
 * 1. 中英两份 JSON 词典键必须完全一致（缺一侧直接失败），同一份文件里不允许重复键；
 * 2. 列出在客户端源码里找不到引用的键（提示用，不失败 —— 有些键由常量拼接）。
 * 只读源码，不依赖宿主。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const clientDir = new URL('../src/client/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
const localeDir = join(clientDir, 'core', 'locale')
const zhPath = join(localeDir, 'zh.json')
const enPath = join(localeDir, 'en.json')

function readDict(path, label) {
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    console.error('check:i18n 找不到 ' + label + '：' + path)
    process.exit(1)
  }
  const dict = JSON.parse(raw)
  const keys = Object.keys(dict)
  const rawKeys = [...raw.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((match) => match[1])
  const duplicates = [...new Set(rawKeys.filter((key, index) => rawKeys.indexOf(key) !== index))]
  return { dict, keys, duplicates }
}

const zh = readDict(zhPath, 'zh.json')
const en = readDict(enPath, 'en.json')
const zhKeys = new Set(zh.keys)
const enKeys = new Set(en.keys)
const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key))
const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key))

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}
const copyPath = join(clientDir, 'core', 'copy.ts')
const others = walk(clientDir)
  .filter((file) => file !== copyPath)
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')
const unused = [...zhKeys].filter((key) => !others.includes("'" + key + "'"))

for (const key of missingInEn) console.error('en 缺键: ' + key)
for (const key of missingInZh) console.error('zh 缺键: ' + key)
for (const key of zh.duplicates) console.error('zh.json 重复键: ' + key)
for (const key of en.duplicates) console.error('en.json 重复键: ' + key)
console.log('词条: ' + zhKeys.size + ' 条；中英一致: ' + (missingInEn.length === 0 && missingInZh.length === 0))
if (unused.length > 0) console.log('提示：' + unused.length + ' 条在组件源码里没有直接引用（可能由常量拼接，人工确认）')
const failed = missingInEn.length > 0 || missingInZh.length > 0 || zh.duplicates.length > 0 || en.duplicates.length > 0
if (failed) process.exit(1)
