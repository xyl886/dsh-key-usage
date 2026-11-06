import { parseLimit, readJsonBody, requireLoopback, sendJson } from './helpers.js';
import { appendLogRecords, clearLogFile, logFilePath, readLogRecords } from '../data/log-store.js';
export function registerLogRoutes(webServer) {
    /**
     * 系统日志：`GET` 回读（刷新页面后日志还在）、`POST` 批量追加 / 清空。
     * 客户端攒约 1 秒发一批；写失败只回 `{ok:false}`，界面不因此报错（日志本身不该打断使用）。
     */
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/log',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            if (request.method === 'POST') {
                const body = await readJsonBody(request);
                if (body === null) {
                    sendJson(response, 200, { ok: false, error: '请求体不是合法 JSON（日志端点只收 {records:[…]} 或 {clear:true}）' });
                    return;
                }
                if (body.clear === true) {
                    sendJson(response, 200, clearLogFile());
                    return;
                }
                const records = body.records;
                sendJson(response, 200, appendLogRecords(Array.isArray(records) ? records : []));
                return;
            }
            const url = new URL(request.url ?? '/', 'http://localhost');
            // level / source 过滤在库里做（都有索引）：筛选时能看到 limit 之外的更早记录
            const levelParam = url.searchParams.get('level') ?? '';
            const sourceParam = url.searchParams.get('source') ?? '';
            const query = {};
            if (levelParam === 'info' || levelParam === 'warn' || levelParam === 'error')
                query.level = levelParam;
            if (sourceParam.trim() !== '')
                query.source = sourceParam.trim().slice(0, 32);
            const beforeParam = Number(url.searchParams.get('before'));
            if (Number.isFinite(beforeParam) && beforeParam > 0)
                query.before = beforeParam;
            sendJson(response, 200, { ok: true, records: readLogRecords(parseLimit(url.searchParams.get('limit'), 500), logFilePath(), query) });
        },
    });
}
