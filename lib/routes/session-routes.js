/** 会话列表 / 单会话详情 / 每轮费用：`/sessions`、`/session`、`/turns`。 */
import { classifyChannels } from '../data/collect.js';
import { tallyOf } from '../data/costing.js';
import { normalizeSessionId } from '../data/session-meta.js';
import { emptySessionDetail, sessionDetailOf, sessionRowsOf, } from '../data/sessions.js';
import { turnCostsOf } from '../data/turn-cost.js';
import { cappedModelRows, parseLimit, quotaRowsOf, requireLoopback, sendJson, } from './helpers.js';
/** 会话用量列表（`limit` 只影响展示条数；快照段用大 limit 物化全量）。 */
export async function sessionsPayload(context, limit, quota, collection) {
    const channels = classifyChannels(context.readChannelConfig(), quotaRowsOf(quota));
    const known = channels.map((channel) => channel.provider);
    const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]));
    const { records, coverage } = collection ?? await context.sessionSource.collect();
    const meta = context.sessionMeta(records.map((record) => record.id));
    const costIndex = context.costIndexOf(records, known, costModeOf);
    const rows = sessionRowsOf(records, known, meta).slice(0, limit).map((row) => {
        const cells = costIndex.byRecord.get(row.id) ?? [];
        const tally = tallyOf(cells);
        const costs = row.models.map((model) => {
            const modelTally = tallyOf(cells.filter((cell) => cell.provider === model.provider && cell.model === model.model));
            return {
                cost: modelTally.cost,
                source: modelTally.source,
                rule: null,
                partial: modelTally.partial,
                cacheSavings: modelTally.cacheSavings,
                currency: Object.keys(modelTally.costsByCurrency)[0] ?? null,
            };
        });
        return {
            ...row,
            providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
            costMode: row.provider === null ? null : costModeOf.get(row.provider) ?? null,
            cost: tally.cost,
            costsByCurrency: tally.costsByCurrency,
            costSource: tally.source,
            partial: tally.partial,
            unpricedTokens: tally.unpricedTokens,
            // 行内展开的模型构成：全量算成本（总额不受截断影响），只把长尾合并成「其它」
            models: cappedModelRows(row, costs),
        };
    });
    // priced = 这份数据里至少有一行真的命中了价目（界面据此决定要不要提示「无价目依据」）
    return { rows, coverage, priced: rows.some((row) => row.cost !== null) };
}
export function registerSessionRoutes(context) {
    const { webServer, snapshotService } = context;
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/sessions',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const view = await snapshotService.view();
            sendJson(response, 200, await sessionsPayload(context, parseLimit(url.searchParams.get('limit'), 200), view.sections.quota));
        },
    });
    /**
     * 单会话详情：抽屉用。只折叠这一个会话（缓存命中时零 I/O），
     * 因此不会像 `/sessions` 那样为一次点击重折全部会话。
     */
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/session',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const id = (url.searchParams.get('id') ?? '').trim();
            if (id === '') {
                sendJson(response, 400, { error: '缺少会话 id：请用 ?id=<sessionId>' });
                return;
            }
            if (context.sessionSource.detail === undefined) {
                sendJson(response, 404, { error: '会话详情不可用', id, reason: '当前注入的会话数据源不支持单会话查询' });
                return;
            }
            const lookup = await context.sessionSource.detail(id);
            if (lookup.status === 'not-found') {
                sendJson(response, 404, { error: '会话不存在', id: lookup.id, reason: lookup.reason ?? '宿主会话列表里没有这个 id' });
                return;
            }
            const channels = await context.channelsWithQuota();
            const knownProviders = channels.map((channel) => channel.provider);
            const meta = context.sessionMeta([lookup.id]);
            const detail = lookup.record === null
                // 降级时只有会话头字段，但投影缓存里的标题仍然可用，优先级与列表保持一致
                ? emptySessionDetail(lookup.id, (meta.titles ?? new Map()).get(normalizeSessionId(lookup.id)) ?? lookup.title, lookup.workspace, (meta.archived ?? new Set()).has(normalizeSessionId(lookup.id)))
                : sessionDetailOf(lookup.record, knownProviders, meta);
            // 详情与列表同一口径：单会话按记录建同一份成本索引（逐日错峰、逐币种小计）
            const detailIndex = context.costIndexOf(lookup.record === null ? [] : [lookup.record], knownProviders, new Map(channels.map((channel) => [channel.provider, channel.costMode])));
            const detailCells = detailIndex.cells;
            const detailTally = tallyOf(detailCells);
            const models = detail.models.map((model) => {
                const tally = tallyOf(detailCells.filter((cell) => cell.provider === model.provider && cell.model === model.model));
                return {
                    ...model,
                    providerLabel: channels.find((channel) => channel.provider === model.provider)?.displayName ?? model.provider,
                    cost: tally.cost,
                    costSource: tally.source,
                    partial: tally.partial,
                    costsByCurrency: tally.costsByCurrency,
                    unpricedTokens: tally.unpricedTokens,
                };
            });
            const detailCost = detailTally.cost;
            sendJson(response, 200, {
                session: {
                    ...detail,
                    models,
                    providerLabel: detail.provider === null ? null : channels.find((channel) => channel.provider === detail.provider)?.displayName ?? detail.provider,
                    costMode: detail.provider === null ? null : channels.find((channel) => channel.provider === detail.provider)?.costMode ?? null,
                    cost: detailCost,
                    costsByCurrency: detailTally.costsByCurrency,
                    costSource: detailTally.source,
                    partial: detailTally.partial,
                    unpricedTokens: detailTally.unpricedTokens,
                },
                coverage: {
                    status: lookup.status === 'ok' ? 'complete' : lookup.status === 'degraded' ? 'partial' : 'unavailable',
                    reason: lookup.reason,
                },
                priced: detailTally.cost !== null,
            });
        },
    });
    /**
     * 每轮费用：对话操作行里的「本轮花了多少」用。
     * 只读这一条会话的用量样本，价格 / 错峰 / 币种与页面走同一套规则（不另算一份）。
     */
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/turns',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const id = (url.searchParams.get('id') ?? '').trim();
            if (id === '') {
                sendJson(response, 400, { error: '缺少会话 id：请用 ?id=<sessionId>' });
                return;
            }
            if (context.sessionSource.turns === undefined) {
                sendJson(response, 200, { sessionId: id, status: 'unavailable', reason: '当前注入的会话数据源不支持按轮查询', turns: [] });
                return;
            }
            const read = await context.sessionSource.turns(id);
            const channels = await context.channelsWithQuota();
            const knownProviders = channels.map((channel) => channel.provider);
            const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]));
            sendJson(response, 200, {
                sessionId: read.id,
                status: read.status,
                reason: read.reason,
                turns: turnCostsOf(read.samples, knownProviders, costModeOf),
            });
        },
    });
}
