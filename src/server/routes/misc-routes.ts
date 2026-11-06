/** /fx、/update、/update/skip：实时汇率、更新检查与忽略版本。 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebServer } from './helpers.js'
import { requireLoopback, readJsonBody, sendJson } from './helpers.js'
import { resolveFxRate } from '../quota/fx-rate.js'
import { markUpdateSkipped, resolveUpdate } from '../update-check.js'

export function registerMiscRoutes(webServer: WebServer): void {
  /** 实时汇率（USD → CNY）：只在用户动作时请求，12 小时 TTL 内吃缓存不联网；失败也恒 200 + `ok:true`。 */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/fx',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      const view = await resolveFxRate({ refresh: url.searchParams.get('refresh') === '1' })
      sendJson(response, 200, view)
    },
  })

  /**
   * 插件更新检查（只读）：返回 npm 上的 latest 版本与本地缓存状态。
   * 打开插件页时由客户端调一次，服务端 24 小时节流；refresh=1 强制联网。
   * 失败恒 200（latest 可能为 null），不把上游错误摊到界面上。
   */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/update',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      sendJson(response, 200, await resolveUpdate({ refresh: url.searchParams.get('refresh') === '1' }))
    },
  })

  /** 忽略某个版本：写 app_meta 的 update.skipped，同版本不再提示。 */
  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/update/skip',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      if (request.method !== 'POST') {
        sendJson(response, 405, { ok: false, error: 'method not allowed' })
        return
      }
      const body = await readJsonBody(request)
      const version = body !== null && typeof body === 'object' && typeof (body as { version?: unknown }).version === 'string'
        ? (body as { version: string }).version
        : ''
      if (!/^\d+\.\d+\.\d+/.test(version)) {
        sendJson(response, 200, { ok: false, error: 'version 必须是 主.次.修订' })
        return
      }
      markUpdateSkipped(version)
      sendJson(response, 200, { ok: true })
    },
  })
}
