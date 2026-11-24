/** 额度（余额与订阅窗口）：`/quota`，数据与状态都取自统一快照，不另算一份。 */
import type { KeyUsageRouteContext } from './context.js'
import { requireLoopback, sendJson } from './helpers.js'

export function registerQuotaRoutes(context: KeyUsageRouteContext): void {
  const { webServer, snapshotService } = context

  webServer.register({
    kind: 'exact',
    path: '/dsh-key-usage/quota',
    handler: async (request, response) => {
      if (!requireLoopback(request, response)) return
      const url = new URL(request.url ?? '/', 'http://localhost')
      // fresh=1 语义并入快照的手动刷新（只重查配额）；否则直接给快照里的配额段
      const result = url.searchParams.get('fresh') === '1'
        ? await snapshotService.refreshQuota()
        : { ok: true as const, view: await snapshotService.view() }
      if (!result.ok) {
        sendJson(response, 200, { error: result.error, providers: [] })
        return
      }
      sendJson(response, 200, result.view.sections.quota ?? { providers: [] })
    },
  })
}
