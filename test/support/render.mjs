/**
 * 组件渲染测试的构建辅助：用 esbuild 把 TSX 组件打成 ESM 临时模块，再交给 Node 加载。
 *
 * - react / react-dom 保持 external：测试进程与组件共享同一份 React（否则 hooks 会报 Invalid hook call）；
 * - `*.css` / `*.module.css` 由插件替换成 Proxy 默认导出（类名取键名），测试不关心具体样式；
 * - 产物写到 `test/.tmp/`（gitignored），从该目录向上能找到仓库 node_modules，external 的 bare import 可解析。
 */
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = new URL('../../', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
const tmpDir = join(root, 'test', '.tmp')

const stubPlugin = (stubs) => ({
  name: 'module-stubs',
  setup(buildApi) {
    for (const [pattern, contents] of Object.entries(stubs)) {
      const namespace = 'stub:' + pattern
      buildApi.onResolve({ filter: new RegExp(pattern) }, (args) => ({ path: args.path, namespace }))
      buildApi.onLoad({ filter: /.*/, namespace }, () => ({ contents, loader: 'js' }))
    }
  },
})

const cssStub = {
  name: 'css-modules-stub',
  setup(buildApi) {
    buildApi.onResolve({ filter: /\.css$/ }, () => ({ path: 'css-module-stub', namespace: 'css-stub' }))
    buildApi.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({
      contents: 'const classes = new Proxy({}, { get: (_target, key) => String(key) }); export default classes;',
      loader: 'js',
    }))
  },
}

/** 把一段 TSX 源码（通常只是 re-export）打成临时 ESM 模块并 import 回来。 */
export async function loadTsx(name, source, options = {}) {
  mkdirSync(tmpDir, { recursive: true })
  const result = await build({
    stdin: { contents: source, loader: 'tsx', resolveDir: root, sourcefile: `${name}.tsx` },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'react-dom/server', 'react-dom/test-utils'],
    plugins: [cssStub, ...(options.stubs === undefined ? [] : [stubPlugin(options.stubs)])],
    logLevel: 'silent',
  })
  const code = result.outputFiles[0].text
  const hash = createHash('sha1').update(code).digest('hex').slice(0, 10)
  const file = join(tmpDir, `${name}-${hash}.mjs`)
  writeFileSync(file, code, 'utf8')
  return import(pathToFileURL(file).href + '?v=' + hash)
}
