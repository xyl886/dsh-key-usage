/** 总览 / 按项目 / 按模型：`/summary`、`/projects`、`/models`（单价表 `/rates` 与价目同域，见 pricing-routes.ts）。 */
import { classifyChannels } from '../data/collect.js';
import { tallyOf } from '../data/costing.js';
import { aggregateRange } from '../data/ledger.js';
import { mergeDailySeries, sessionDayRows, summarizeMergedByProvider } from '../data/merge.js';
import { modelRowsOf, projectRowsOf, sliceSessionRecords } from '../data/sessions.js';
import { round6 } from '../pricing/pricing.js';
import { cellMatches, collapseOrphanProjects, dayKeyOf, emptyFilter, hasCostFilter, moneyOfProvider, moneyOrZero, parseLimit, parseMultiFilter, parseWindow, partialOfProvider, projectMatches, quotaRowsOf, requireLoopback, scopedCells, sendJson, shiftedDayKey, sourceOfProvider, } from './helpers.js';
/** 总览表：今日 / 近 30 天两列（与使用明细同一口径，否则两页数字对不上）。 */
export async function summaryPayload(context) {
    const today = dayKeyOf(new Date());
    const monthFrom = shiftedDayKey(-29);
    const ledger = context.loadLedger();
    const collection = await context.sessionSource.collect();
    const channels = classifyChannels(context.readChannelConfig(), []);
    const sessionRows = sessionDayRows(collection.records, channels.map((channel) => channel.provider));
    const merged = mergeDailySeries(aggregateRange(ledger, monthFrom, today, null).days, sessionRows, monthFrom, today);
    const costIndex = context.costIndexOf(collection.records, channels.map((channel) => channel.provider), new Map(channels.map((channel) => [channel.provider, channel.costMode])));
    const days = context.annotateCosts(merged.days, merged.sessionDates, costIndex);
    const todaySummary = summarizeMergedByProvider(days, today, today);
    const monthSummary = summarizeMergedByProvider(days, monthFrom, today);
    const rows = channels.map((channel) => {
        const todayRow = todaySummary.find((row) => row.provider === channel.provider);
        const monthRow = monthSummary.find((row) => row.provider === channel.provider);
        const todayCost = todayRow === undefined ? 0 : round6(todayRow.cost);
        const monthCost = monthRow === undefined ? 0 : round6(monthRow.cost);
        const currency = context.ledgerCurrencyOf(channel.provider);
        return {
            provider: channel.provider,
            today: {
                ...todayRow ?? { provider: channel.provider, calls: 0, tokens: 0, cost: 0 },
                cost: todayCost,
                costSource: sourceOfProvider(days, channel.provider, today, today),
                partial: partialOfProvider(days, channel.provider, today, today),
                costsByCurrency: moneyOrZero(moneyOfProvider(days, channel.provider, today, today), todayCost, currency),
            },
            month: {
                ...monthRow ?? { provider: channel.provider, calls: 0, tokens: 0, cost: 0 },
                cost: monthCost,
                costSource: sourceOfProvider(days, channel.provider, monthFrom, today),
                partial: partialOfProvider(days, channel.provider, monthFrom, today),
                costsByCurrency: moneyOrZero(moneyOfProvider(days, channel.provider, monthFrom, today), monthCost, currency),
            },
        };
    });
    return {
        channels: rows,
        range: { today, monthFrom },
        todaySource: merged.sessionDates.includes(today) ? 'session' : 'ledger',
        sessionDates: merged.sessionDates,
    };
}
/** 项目用量列表；window = 顶部范围窗口；filter = 顶部通道 / 模型 / 项目筛选。 */
export async function projectsPayload(context, limit, collection, window = null, filter = emptyFilter()) {
    const channels = classifyChannels(context.readChannelConfig(), []);
    const known = channels.map((channel) => channel.provider);
    const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]));
    const collected = collection ?? await context.sessionSource.collect();
    const { coverage } = collected;
    const windowed = window === null ? collected.records : sliceSessionRecords(collected.records, window.from, window.to);
    const titles = context.workspaceSource.titles();
    const records = windowed.filter((record) => projectMatches(filter, record.workspace, titles));
    const costIndex = context.costIndexOf(records, known, costModeOf);
    const idsOfWorkspace = new Map();
    for (const record of records) {
        const path = record.workspace ?? '';
        const bucket = idsOfWorkspace.get(path);
        if (bucket === undefined)
            idsOfWorkspace.set(path, [record.id]);
        else
            bucket.push(record.id);
    }
    const priced = projectRowsOf(records, known, context.sessionMeta(records.map((record) => record.id))).map((row) => {
        const ids = idsOfWorkspace.get(row.workspace) ?? [];
        const tally = tallyOf(scopedCells(costIndex, ids, filter));
        const title = titles.get(row.workspace.toLowerCase()) ?? null;
        // 通道 / 模型筛选要同时收窄行内的 tokens 与 calls（否则会出现「金额是筛后的、Tokens 是全部的」）
        const rowModels = filter.providers === null && filter.models === null
            ? row.models
            : row.models.filter((model) => (filter.providers === null || filter.providers.includes(model.provider)) && (filter.models === null || filter.models.includes(model.model)));
        const scoped = filter.providers === null && filter.models === null
            ? row
            : (() => {
                const buckets = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
                let calls = 0;
                let tokens = 0;
                for (const model of rowModels) {
                    calls += model.calls;
                    tokens += model.tokens;
                    buckets.inputTokens += model.buckets.inputTokens ?? 0;
                    buckets.outputTokens += model.buckets.outputTokens ?? 0;
                    buckets.cacheReadTokens += model.buckets.cacheReadTokens ?? 0;
                    buckets.cacheWriteTokens += model.buckets.cacheWriteTokens ?? 0;
                }
                const sessionCount = ids.filter((id) => (costIndex.byRecord.get(id) ?? []).some((cell) => cellMatches(filter, cell))).length;
                return {
                    ...row,
                    calls,
                    tokens,
                    models: rowModels,
                    sessionCount,
                    cacheHitRate: tokens > 0 ? Math.round(buckets.cacheReadTokens / tokens * 1000) / 10 : null,
                };
            })();
        const dominant = Object.entries(scoped.providers).sort((first, second) => second[1] - first[1])[0]?.[0] ?? null;
        const dominantMode = dominant === null ? null : costModeOf.get(dominant) ?? null;
        return {
            ...scoped,
            /** 宿主工作区名（侧边栏显示名）；目录不在工作区表里时为 null。 */
            workspaceTitle: title,
            /** 这一行覆盖的目录（工作区行 = 1 个；「未归入工作区」行 = 多个）。 */
            paths: [row.workspace],
            registered: title !== null,
            dominantProvider: dominant,
            costMode: dominantMode,
            cost: tally.cost,
            costsByCurrency: tally.costsByCurrency,
            costSource: tally.source,
            partial: tally.partial,
            unpricedTokens: tally.unpricedTokens,
        };
    });
    // 通道 / 模型筛选把一行的用量清零时，这一行不该继续占位（筛「不存在的通道」应该是空表，而不是 0 行）
    const visibleRows = hasCostFilter(filter) ? priced.filter((row) => row.tokens > 0 || row.sessionCount > 0) : priced;
    // 项目页与侧边栏对齐：工作区各占一行，不在工作区里的历史目录合并成一行（否则会出现侧边栏里没有的「项目」）
    const rows = collapseOrphanProjects(visibleRows).slice(0, limit);
    // priced = 这份数据里至少有一行真的命中了价目（界面据此决定要不要提示「无价目依据」）
    const payload = { rows, coverage, priced: rows.some((row) => row.cost !== null) };
    if (window !== null) {
        payload.from = window.from;
        payload.to = window.to;
    }
    return payload;
}
/** 按模型用量列表；window = 顶部范围窗口；filter = 顶部通道 / 模型 / 项目筛选。 */
export async function modelsPayload(context, limit, quota, collection, window = null, filter = emptyFilter()) {
    const channels = classifyChannels(context.readChannelConfig(), quotaRowsOf(quota));
    const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]));
    const collected = collection ?? await context.sessionSource.collect();
    const { coverage } = collected;
    const windowed = window === null ? collected.records : sliceSessionRecords(collected.records, window.from, window.to);
    const titles = context.workspaceSource.titles();
    const records = windowed.filter((record) => projectMatches(filter, record.workspace, titles));
    const costIndex = context.costIndexOf(records, channels.map((channel) => channel.provider), costModeOf);
    const rows = modelRowsOf(records, channels.map((channel) => channel.provider))
        .filter((row) => (filter.providers === null || filter.providers.includes(row.provider)))
        .filter((row) => (filter.models === null || filter.models.includes(row.model)))
        .slice(0, limit)
        .map((row) => {
        const cells = [];
        for (const record of records) {
            for (const cell of costIndex.byRecord.get(record.id) ?? []) {
                if (cell.provider === row.provider && cell.model === row.model)
                    cells.push(cell);
            }
        }
        const tally = tallyOf(cells);
        return {
            ...row,
            providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
            costMode: costModeOf.get(row.provider) ?? null,
            // 与 /sessions 同一口径：统一成本索引（逐日错峰、逐币种小计）
            cost: tally.cost,
            costsByCurrency: tally.costsByCurrency,
            costSource: tally.source,
            partial: tally.partial,
            unpricedTokens: tally.unpricedTokens,
        };
    });
    // priced = 这份数据里至少有一行真的命中了价目（界面据此决定要不要提示「无价目依据」）
    const payload = { rows, coverage, priced: rows.some((row) => row.cost !== null) };
    if (window !== null) {
        payload.from = window.from;
        payload.to = window.to;
    }
    return payload;
}
export function registerStatsRoutes(context) {
    const { webServer, snapshotService } = context;
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/summary',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const view = await snapshotService.view();
            sendJson(response, 200, view.sections.overview ?? { channels: [], range: null, todaySource: 'ledger', sessionDates: [] });
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/projects',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const window = parseWindow(url.searchParams.get('from'), url.searchParams.get('to'));
            const filter = {
                providers: parseMultiFilter(url.searchParams.get('provider')),
                models: parseMultiFilter(url.searchParams.get('model')),
                projects: parseMultiFilter(url.searchParams.get('project')),
            };
            sendJson(response, 200, await projectsPayload(context, parseLimit(url.searchParams.get('limit'), 200), undefined, window, filter));
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/models',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const view = await snapshotService.view();
            const window = parseWindow(url.searchParams.get('from'), url.searchParams.get('to'));
            const filter = {
                providers: parseMultiFilter(url.searchParams.get('provider')),
                models: parseMultiFilter(url.searchParams.get('model')),
                projects: parseMultiFilter(url.searchParams.get('project')),
            };
            sendJson(response, 200, await modelsPayload(context, parseLimit(url.searchParams.get('limit'), 200), view.sections.quota, undefined, window, filter));
        },
    });
}
