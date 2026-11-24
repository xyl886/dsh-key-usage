/**
 * HTTP 路由挂载：22 个路径 = 19 个只读 `GET` + 4 个写 `POST`（`/log` 同时支持 GET 与 POST）；非本机回环一律 403。
 * 各域端点拆在 `routes/*.ts`，本文件只做参数解构、共享上下文创建、统一快照装配与各域注册。
 * 成本逐格取值：台账官方账单 > 通道内价目（内置价目 / 聚合价按通道别名）> 同模型官方价目 > 无依据（另有 `costSource` / `partial`
 * / `costsByCurrency` / `unpricedTokens` 并列字段）；台账缺的日期由会话事件补位（见 merge.ts），
 * 所有页面的成本都走 `data/costing.ts` 的同一份「天 × 模型」索引（逐日错峰）。
 * 外网只有三处、都由用户动作触发：余额查询（live-quota.ts）、价目刷新（model-prices.ts）、汇率（fx-rate.ts）。
 */
import { appendLogRecords, logFilePath } from './data/log-store.js';
import { buildPromptSessionIndex } from './data/session-usage.js';
import { buildToolSessionIndex, mergeToolStats } from './data/tool-stats.js';
import { createSnapshotService } from './snapshot/snapshot.js';
import { createRouteContext } from './routes/context.js';
import { dayKeyOf, disabledLiveQuota, shiftedDayKey, unavailableSessionSource, } from './routes/helpers.js';
import { promptCloudOf, registerInsightsRoutes } from './routes/insights-routes.js';
import { registerLogRoutes } from './routes/log-routes.js';
import { registerMiscRoutes } from './routes/misc-routes.js';
import { registerPricingRoutes } from './routes/pricing-routes.js';
import { registerQuotaRoutes } from './routes/quota-routes.js';
import { registerSessionRoutes, sessionsPayload } from './routes/session-routes.js';
import { channelsPayloadOf, quotaBuild, registerSnapshotRoutes } from './routes/snapshot-routes.js';
import { modelsPayload, projectsPayload, registerStatsRoutes, summaryPayload } from './routes/stats-routes.js';
import { heatmapPayload, registerUsageRoutes, usagePayload } from './routes/usage-routes.js';
export * from './routes/helpers.js';
export function mountKeyUsageRoutes(webServer, sessionSource = unavailableSessionSource, liveQuota = disabledLiveQuota, hostServices = { get: () => undefined }, options = {}) {
    const context = createRouteContext(webServer, sessionSource, liveQuota, hostServices);
    /**
     * 统一快照：7 个页面的唯一数据来源（`$DSH_HOME/dsh-key-usage/usage.db` 的 `snapshot_section` 表）。
     * 本地段由定时器每 5 分钟重算（不联网）；配额段只在首次构建与手动刷新时联网。
     */
    const snapshotService = createSnapshotService({
        intervalMs: options.snapshotIntervalMs,
        builders: {
            local: async ({ quota }) => {
                // 一次构建只读一遍会话：models / projects / sessions 三段共用同一份折叠结果
                const collection = await context.sessionSource.collect();
                // 两个运行期索引共用同一份折叠结果：只搬 Map 引用与过滤维度，不读第二遍会话
                const providers = context.knownProviders();
                context.toolsIndex = buildToolSessionIndex(collection.records, providers);
                context.promptsIndex = buildPromptSessionIndex(collection.records, providers);
                const stats = context.sessionSource.stats?.() ?? null;
                // 耗时明细直接落盘（info）：这是排查信息，不是「快照问题」，不进 issues（界面就不会弹警告）
                if (stats !== null) {
                    appendLogRecords([{
                            time: new Date().toISOString(),
                            level: 'info',
                            source: 'snapshot',
                            message: '本地重建：会话读取明细',
                            detail: '共 ' + String(stats.sessions) + ' 个，缓存命中 ' + String(stats.cached)
                                + '，本次读取 ' + String(stats.read) + '；宿主列表 ' + String(stats.listMs)
                                + ' ms，折叠 ' + String(stats.readMs) + ' ms，合计 ' + String(stats.totalMs) + ' ms',
                        }], logFilePath());
                }
                return {
                    sections: {
                        overview: await summaryPayload(context),
                        // 快照存默认范围：近 30 天 / 全部通道
                        usage: await usagePayload(context, shiftedDayKey(-29), dayKeyOf(new Date()), null),
                        heatmap: await heatmapPayload(context),
                        models: await modelsPayload(context, Number.MAX_SAFE_INTEGER, quota, collection),
                        projects: await projectsPayload(context, Number.MAX_SAFE_INTEGER, collection),
                        sessions: await sessionsPayload(context, Number.MAX_SAFE_INTEGER, quota, collection),
                        // 提问词云与工具统计都来自同一份折叠结果，只做跨会话合并（没有工具调用的数据源给 null）
                        prompts: promptCloudOf(collection.records),
                        tools: mergeToolStats(collection.records),
                    },
                    issues: [],
                };
            },
            quota: async (input) => quotaBuild(context, input.seedLegacy, input.previous, input.force !== false),
            channels: async ({ quota, outcome }) => ({ channels: channelsPayloadOf(context, quota, outcome), issues: [] }),
        },
    });
    context.snapshotService = snapshotService;
    snapshotService.start();
    registerSnapshotRoutes(context);
    registerUsageRoutes(context);
    registerQuotaRoutes(context);
    registerStatsRoutes(context);
    registerSessionRoutes(context);
    registerInsightsRoutes(context);
    registerPricingRoutes(context);
    registerMiscRoutes(webServer);
    registerLogRoutes(webServer);
}
