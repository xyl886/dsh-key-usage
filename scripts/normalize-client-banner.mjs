#!/usr/bin/env node
/**
 * 构建后处理：把 tsdown pretty-print 出的三行 loader 头折叠回单行
 * `window.__ModuleLoader__.load({ id: "…", factory: (require) => {`，
 * 供宿主从文件头嗅探 loader id。原空白行保留，sourcemap 行号不受影响。
 */
import fs from 'node:fs'

const file = 'client/client.js'
const name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name
const required = `window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}, factory: (require) => {`
let code = fs.readFileSync(file, 'utf8')

if (!code.startsWith(required)) {
  const lines = code.split('\n')
  const loadIndex = lines.findIndex((line) => line.includes('window.__ModuleLoader__.load('))
  if (loadIndex !== -1) {
    // tsdown 产物形如：`window.__ModuleLoader__.load({` + `\tid: "…",` + `\tfactory: (require) => {`
    const joinCount = 2
    const joined = lines.slice(loadIndex, loadIndex + joinCount + 1).map((line) => line.trim()).join(' ')
    lines.splice(loadIndex, joinCount + 1, joined, ...Array.from({ length: joinCount }, () => ''))
    code = lines.join('\n')
  }
}

if (!code.startsWith(required)) {
  console.error('banner 归一化失败：头部未形成 ' + required)
  process.exit(1)
}
fs.writeFileSync(file, code)
console.log('client banner 归一化完成：' + required)
