import { requireLoopback, sendJson } from './helpers.js';
export function registerQuotaRoutes(context) {
    const { webServer, snapshotService } = context;
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/quota',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            // fresh=1 语义并入快照的手动刷新（只重查配额）；否则直接给快照里的配额段
            const result = url.searchParams.get('fresh') === '1'
                ? await snapshotService.refreshQuota()
                : { ok: true, view: await snapshotService.view() };
            if (!result.ok) {
                sendJson(response, 200, { error: result.error, providers: [] });
                return;
            }
            sendJson(response, 200, result.view.sections.quota ?? { providers: [] });
        },
    });
}
