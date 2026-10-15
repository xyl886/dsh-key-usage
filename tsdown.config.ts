/** 客户端 bundle 构建：与 dsh-plugin 官方仓库同一套 ModuleLoader 契约。 */
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, relative, resolve as resolvePath } from 'node:path'
import { defineConfig } from 'tsdown'
import { transform } from 'lightningcss'

const pkg = createRequire(import.meta.url)('./package.json') as { version: string }
const id = 'dsh-key-usage'
const CLIENT_EXTERNALS = ['react', 'react/jsx-runtime']
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'
/**
 * 虚拟模块 id 与 CSS 文件名一律用**仓库相对路径**：
 * 用绝对路径时 Windows / Linux 产物不同（region 注释嵌路径、lightningcss 的 [hash] 按文件名算），
 * 跨平台构建就无法字节一致，CI 的「产物与源码同步」闸也就永远失败。
 */
const projectRoot = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const toRelative = (file: string): string => relative(projectRoot, file).split('\\').join('/')

export default defineConfig({
  entry: { client: 'src/client/index.tsx' },
  outDir: 'client',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  external: [...CLIENT_EXTERNALS],
  noExternal: (source: string) => (CLIENT_EXTERNALS.includes(source) ? undefined : true),
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.MODE': JSON.stringify('production'),
    'import.meta.env': JSON.stringify({ MODE: 'production' }),
  },
  plugins: [{
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer !== undefined ? resolvePath(dirname(importer), source) : source
      return CSS_VIRTUAL_PREFIX + toRelative(abs) + CSS_VIRTUAL_SUFFIX
    },
    async load(this: { addWatchFile(file: string): void }, virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const relativeId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      const fileId = resolvePath(projectRoot, relativeId)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        // filename 传相对路径：lightningcss 的 [hash] 由它派生，传绝对路径会让类名随机器变化
        filename: relativeId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
        targets: { chrome: 90 << 16, firefox: 100 << 16, safari: 13 << 16, edge: 90 << 16 },
      })
      const classMap: Record<string, string> = {}
      // 键必须排序：lightningcss 返回的 exports 顺序不稳定，直接遍历会让同一份源码每次构建产物不同
      for (const local of Object.keys(cssExports ?? {}).sort()) classMap[local] = cssExports![local].name
      return [
        `const css = ${JSON.stringify(code.toString())};`,
        `const tagId = ${JSON.stringify(`${id}/${basename(fileId)}`)};`,
        'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
        '  const tag = document.createElement(\'style\');',
        `  tag.dataset.plugin = ${JSON.stringify(id)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `const cssRegistry = (globalThis.__DSH_PLUGIN_CSS__ ??= []);`,
        'if (!cssRegistry.some(e => e.tagId === tagId)) cssRegistry.push({ tagId, css });',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
