/**
 * HTTP 路由：只读 GET 端点，向客户端提供聚合数据。
 * - /dsh-key-usage/channels  通道清单（含状态与计费模式）
 * - /dsh-key-usage/usage     范围聚合（from/to/provider 过滤；单日附带按小时）
 * - /dsh-key-usage/heatmap   年度热力图序列
 * - /dsh-key-usage/quota     余额与订阅窗口原样快照
 * - /dsh-key-usage/summary   总览表用的「今日 / 近 30 天」按通道汇总
 * - /dsh-key-usage/sessions  会话用量（来自宿主会话事件折叠）
 * - /dsh-key-usage/projects  项目（工作目录）用量
 *
 * 台账已停更时（本机停在 2026-09-30），按天序列会用会话事件补齐缺的日期（见 merge.ts），
 * 并在响应里用 `sessionDates` 标出来源。非本机回环请求一律 403。
 *
 * 网络：只有「余额与订阅窗口」会访问各通道**官方**接口（见 live-quota.ts），
 * 失败即回落本地快照；其余端点零外网。
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { aggregateRange, buildPriceTable, estimateCost, readLedger, } from './ledger.js';
import { classifyChannels, costModeLabel, extractChannels, quotaWindowLabel, readProviderSnapshots, } from './collect.js';
import { hoursOfDate, projectRowsOf, sessionRowsOf, } from './sessions.js';
import { createArchiveSource, createTitleSource } from './session-meta.js';
import { mergeDailySeries, sessionDayRows, summarizeMergedByProvider, totalsOfMerged, } from './merge.js';
/** 无会话服务时的兜底数据源，保证台账相关端点照常工作。 */
export const unavailableSessionSource = {
    collect: async () => ({
        records: [],
        coverage: { status: 'unavailable', totalSessions: 0, countedSessions: 0, skippedSessions: 0 },
    }),
};
/** 关闭实时查询时的空实现（离线测试与降级用）。 */
export const disabledLiveQuota = {
    cached: () => new Map(),
    refreshIfStale: async () => new Map(),
};
const EMPTY_LEDGER = { version: 0, days: {} };
function sendJson(response, statusCode, body) {
    const payload = JSON.stringify(body);
    response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    response.end(payload);
}
function isLoopback(request) {
    const remoteAddress = request.socket.remoteAddress ?? '';
    return remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1';
}
/** dsh 家目录：与宿主一致地优先 DSH_HOME。 */
export function dshHomePath() {
    return process.env.DSH_HOME ?? join(homedir(), '.dsh');
}
function dayKeyOf(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}
function shiftedDayKey(offsetDays) {
    return dayKeyOf(new Date(Date.now() + offsetDays * 86400000));
}
function channelPayload(channel) {
    return {
        ...channel,
        costLabel: costModeLabel(channel.costMode),
        quotaWindowLabel: channel.quotaWindowKey === null ? null : quotaWindowLabel(channel.quotaWindowKey),
    };
}
export function mountKeyUsageRoutes(webServer, sessionSource = unavailableSessionSource, liveQuota = disabledLiveQuota, hostServices = { get: () => undefined }) {
    const ledgerPath = join(dshHomePath(), 'dsh-usage', 'usage-ledger.json');
    const snapshotPath = join(dshHomePath(), 'dsh-usage', 'provider-snapshots.json');
    const titleSource = createTitleSource(join(dshHomePath(), 'storages', 'session_projcache.json'));
    const archiveSource = createArchiveSource(hostServices, join(dshHomePath(), 'storages', 'workspace.json'));
    /** 会话标题与归档状态：宿主服务/缓存文件都拿不到时返回空集合，界面自行回落。 */
    const sessionMeta = () => ({ titles: titleSource.titles(), archived: archiveSource.archived() });
    const loadLedger = () => readLedger(ledgerPath, (path) => {
        try {
            return readFileSync(path, 'utf8');
        }
        catch {
            return null;
        }
    }) ?? EMPTY_LEDGER;
    const readSnapshots = () => readProviderSnapshots(snapshotPath).providers;
    const loadChannels = (live = new Map()) => {
        // cordis.yml 是应用按需重写的组合产物：插件集变化期间会短暂变成空模板，
        // 因此先读它，取不到再回退到用户 patch 层 cordis.patch.yml。
        // 两个文件都含 !!js 表达式，只做文本提取，不执行任何表达式。
        const profileDir = join(dshHomePath(), 'profiles', 'desktop');
        const snapshots = mergeLiveSnapshots(readSnapshots(), live);
        const composed = readTextFile(join(profileDir, 'cordis.yml'));
        if (composed !== null) {
            const channels = classifyChannels(extractChannels(composed), snapshots);
            if (channels.length > 0)
                return channels;
        }
        const patch = readTextFile(join(profileDir, 'cordis.patch.yml'));
        return patch === null ? [] : classifyChannels(extractChannels(patch), snapshots);
    };
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/channels',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            // 只用缓存：状态判定不该为了一次刷新去等网络，实时结果由 /quota 预热
            sendJson(response, 200, { channels: loadChannels(liveQuota.cached()).map(channelPayload) });
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/usage',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const ledger = loadLedger();
            const collection = await sessionSource.collect();
            const knownProviders = loadChannels().map((channel) => channel.provider);
            const dayKeys = Object.keys(ledger.days).sort();
            const providerParam = url.searchParams.get('provider');
            const providerFilter = providerParam !== null && providerParam !== '' ? providerParam.split(',').filter(Boolean) : null;
            const sessionRows = sessionDayRows(collection.records, knownProviders)
                .filter((row) => providerFilter === null || providerFilter.includes(row.provider));
            const sessionDates = [...new Set(sessionRows.map((row) => row.date))].sort();
            const availableFrom = minKey(dayKeys[0], sessionDates[0]);
            const availableTo = maxKey(dayKeys[dayKeys.length - 1], sessionDates[sessionDates.length - 1]);
            const from = url.searchParams.get('from') ?? availableFrom ?? '';
            const to = url.searchParams.get('to') ?? availableTo ?? '';
            const ledgerResult = aggregateRange(ledger, from, to, providerFilter);
            const merged = mergeDailySeries(ledgerResult.days, sessionRows, from, to);
            // 单日范围才提供小时细分（来自会话事件，口径与台账不同，见页脚口径说明）
            const hours = from !== '' && from === to ? hoursOfDate(collection.records, from) : null;
            sendJson(response, 200, {
                days: merged.days,
                totals: merged.days.length > 0 ? totalsOfMerged(merged.days) : null,
                sessionDates: merged.sessionDates,
                availableFrom: availableFrom ?? null,
                availableTo: availableTo ?? null,
                hours,
            });
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/heatmap',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const ledger = loadLedger();
            const collection = await sessionSource.collect();
            const knownProviders = loadChannels().map((channel) => channel.provider);
            const sessionRows = sessionDayRows(collection.records, knownProviders);
            const dayKeys = Object.keys(ledger.days).sort();
            const sessionDates = [...new Set(sessionRows.map((row) => row.date))].sort();
            const yearAgo = new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10);
            const earliest = minKey(dayKeys[0], sessionDates[0]) ?? yearAgo;
            const from = earliest > yearAgo ? earliest : yearAgo;
            const to = maxKey(dayKeys[dayKeys.length - 1], sessionDates[sessionDates.length - 1]) ?? from;
            const merged = mergeDailySeries(aggregateRange(ledger, from, to, null).days, sessionRows, from, to);
            sendJson(response, 200, {
                days: merged.days
                    .map((day) => ({
                    date: day.date,
                    totalTokens: day.inputTokens + day.outputTokens + day.cacheReadTokens,
                    models: day.models
                        .map((model) => ({
                        provider: model.provider,
                        model: model.model,
                        totalTokens: model.inputTokens + model.outputTokens + model.cacheReadTokens,
                    }))
                        .filter((model) => model.totalTokens > 0)
                        .sort((first, second) => second.totalTokens - first.totalTokens),
                }))
                    .filter((day) => day.totalTokens > 0),
                sessionDates: merged.sessionDates,
            });
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/quota',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const channels = loadChannels();
            // 打开「余额与配额」时才等网络：缓存过期就刷新一次，失败一律回落快照
            const live = url.searchParams.get('fresh') === '1'
                ? await liveQuota.refreshIfStale(channels, true)
                : await liveQuota.refreshIfStale(channels);
            const snapshots = readSnapshots();
            const providers = channels.map((channel) => {
                const liveEntry = live.get(channel.provider);
                const snapshot = snapshots.find((entry) => entry.provider === channel.provider) ?? null;
                if (liveEntry !== undefined && liveEntry.ok) {
                    return {
                        provider: channel.provider,
                        displayName: channel.displayName,
                        credential: channel.apiKeyEnv,
                        source: 'live',
                        fetchedAt: liveEntry.fetchedAt,
                        updatedAt: liveEntry.fetchedAt,
                        error: null,
                        balance: liveEntry.balance,
                        plan: liveEntry.windows === null ? null : { windows: liveEntry.windows },
                    };
                }
                return {
                    provider: channel.provider,
                    displayName: snapshot?.displayName ?? channel.displayName,
                    credential: snapshot?.credential ?? channel.apiKeyEnv,
                    source: 'snapshot',
                    fetchedAt: null,
                    updatedAt: snapshot?.updatedAt ?? null,
                    // 实时失败的原因要透出（未配置凭据 / 网络 / 鉴权），界面据此提示
                    error: liveEntry?.error ?? (snapshot === null ? 'no-snapshot' : null),
                    balance: snapshot?.balance ?? null,
                    plan: snapshot?.plan ?? null,
                };
            });
            sendJson(response, 200, { providers });
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/summary',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const today = dayKeyOf(new Date());
            const monthFrom = shiftedDayKey(-29);
            const ledger = loadLedger();
            const collection = await sessionSource.collect();
            const channels = loadChannels();
            const knownProviders = channels.map((channel) => channel.provider);
            const sessionRows = sessionDayRows(collection.records, knownProviders);
            const merged = mergeDailySeries(aggregateRange(ledger, monthFrom, today, null).days, sessionRows, monthFrom, today);
            const todaySummary = summarizeMergedByProvider(merged.days, today, today);
            const monthSummary = summarizeMergedByProvider(merged.days, monthFrom, today);
            const rows = channels.map((channel) => {
                const todayRow = todaySummary.find((row) => row.provider === channel.provider);
                const monthRow = monthSummary.find((row) => row.provider === channel.provider);
                return {
                    provider: channel.provider,
                    today: todayRow ?? { provider: channel.provider, calls: 0, tokens: 0, cost: 0 },
                    month: monthRow ?? { provider: channel.provider, calls: 0, tokens: 0, cost: 0 },
                };
            });
            sendJson(response, 200, {
                channels: rows,
                range: { today, monthFrom },
                todaySource: merged.sessionDates.includes(today) ? 'session' : 'ledger',
                sessionDates: merged.sessionDates,
            });
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/sessions',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const limit = parseLimit(url.searchParams.get('limit'), 200);
            const channels = loadChannels();
            const knownProviders = channels.map((channel) => channel.provider);
            const costModeOf = new Map(channels.map((channel) => [channel.provider, channel.costMode]));
            const { records, coverage } = await sessionSource.collect();
            const priceTable = buildPriceTable(loadLedger());
            const meta = sessionMeta();
            const rows = sessionRowsOf(records, knownProviders, meta).slice(0, limit).map((row) => ({
                ...row,
                providerLabel: channels.find((channel) => channel.provider === row.provider)?.displayName ?? row.provider,
                costMode: row.provider === null ? null : costModeOf.get(row.provider) ?? null,
                cost: estimateCost(row.models, priceTable),
            }));
            sendJson(response, 200, { rows, coverage, priced: priceTable.size > 0 });
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/projects',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const limit = parseLimit(url.searchParams.get('limit'), 200);
            const channels = loadChannels();
            const knownProviders = channels.map((channel) => channel.provider);
            const { records, coverage } = await sessionSource.collect();
            const priceTable = buildPriceTable(loadLedger());
            const rows = projectRowsOf(records, knownProviders, sessionMeta()).slice(0, limit).map((row) => ({
                ...row,
                dominantProvider: Object.entries(row.providers).sort((first, second) => second[1] - first[1])[0]?.[0] ?? null,
                cost: estimateCost(row.models, priceTable),
            }));
            sendJson(response, 200, { rows, coverage, priced: priceTable.size > 0 });
        },
    });
}
/**
 * 把实时余额 / 窗口合并进快照数组，供通道状态判定（额度百分比、余额文案）使用。
 * 只覆盖查询成功的条目，失败条目保持快照原值。
 */
function mergeLiveSnapshots(snapshots, live) {
    if (live.size === 0)
        return snapshots;
    const byProvider = new Map(snapshots.map((entry) => [entry.provider, entry]));
    for (const [provider, result] of live) {
        if (!result.ok)
            continue;
        const existing = byProvider.get(provider);
        byProvider.set(provider, {
            provider,
            displayName: existing?.displayName ?? null,
            credential: existing?.credential ?? null,
            updatedAt: result.fetchedAt,
            balance: result.balance ?? existing?.balance ?? null,
            plan: result.windows === null ? (existing?.plan ?? null) : { windows: result.windows },
        });
    }
    return [...byProvider.values()];
}
function minKey(first, second) {
    if (first === undefined)
        return second;
    if (second === undefined)
        return first;
    return first < second ? first : second;
}
function maxKey(first, second) {
    if (first === undefined)
        return second;
    if (second === undefined)
        return first;
    return first > second ? first : second;
}
function parseLimit(raw, fallback) {
    if (raw === null)
        return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return fallback;
    return Math.min(parsed, 1000);
}
function requireLoopback(request, response) {
    if (isLoopback(request))
        return true;
    sendJson(response, 403, { error: 'loopback only' });
    return false;
}
function readTextFile(path) {
    try {
        return readFileSync(path, 'utf8');
    }
    catch {
        return null;
    }
}
