/** 统一快照：`/snapshot`、`/refresh`、`/channels`，以及快照服务要用的配额段 / 通道段构建器。 */
import { classifyChannels } from '../data/collect.js';
import { schemeOf } from '../quota/live-quota.js';
import { readQuotaSnapshots } from '../quota/quota-snapshots.js';
import { channelPayload, logFirstView, parseSections, quotaRowsOf, requireLoopback, sendJson, trimSnapshotSections, } from './helpers.js';
/**
 * 配额段（余额与订阅窗口）：唯一会联网取余额的地方，只在首次构建、手动刷新、`/quota?fresh=1`
 * 与页面打开的后台补查（force: false，由 live-quota 的 60 秒缓存把关）时调用。
 * 回落优先级：上一份快照的配额段 > 旧版 `quota-snapshots.json`（仅首次构建）> 宿主快照；
 * 展示旧值时必须带 `capturedAt` / `stale` / `error`，绝不静默当成最新。
 */
export async function quotaBuild(context, seedLegacy, previousSection, force = true) {
    const channels = classifyChannels(context.readChannelConfig(), []);
    const live = await context.liveQuota.refreshIfStale(channels, force);
    const seeded = seedLegacy ? readQuotaSnapshots(context.quotaSnapshotPath) : [];
    const hostSnapshots = context.readSnapshots();
    const previousRows = quotaRowsOf(previousSection);
    const fallbackOf = (provider) => {
        const previous = previousRows.find((row) => row.provider === provider && row.updatedAt !== null);
        if (previous !== undefined) {
            return { updatedAt: previous.updatedAt, balance: previous.balance, plan: previous.plan, origin: 'own' };
        }
        const own = seeded.find((entry) => entry.provider === provider) ?? null;
        const hostEntry = hostSnapshots.find((entry) => entry.provider === provider) ?? null;
        const useOwn = own !== null && (hostEntry === null || own.updatedAt >= (hostEntry.updatedAt ?? 0));
        if (useOwn) {
            return {
                updatedAt: own.updatedAt,
                balance: own.balance,
                plan: own.windows === null ? null : { windows: own.windows },
                origin: 'own',
            };
        }
        return {
            updatedAt: hostEntry?.updatedAt ?? null,
            balance: hostEntry?.balance ?? null,
            plan: hostEntry?.plan ?? null,
            origin: hostEntry === null ? null : 'host',
        };
    };
    const providers = channels.map((channel) => {
        const liveEntry = live.get(channel.provider);
        const supported = schemeOf(channel) !== null;
        const liveOk = liveEntry !== undefined && liveEntry.ok;
        const hostEntry = hostSnapshots.find((entry) => entry.provider === channel.provider) ?? null;
        if (liveOk) {
            return {
                provider: channel.provider,
                displayName: channel.displayName,
                credential: channel.apiKeyEnv,
                supported,
                source: 'live',
                snapshotOrigin: null,
                fetchedAt: liveEntry.fetchedAt,
                updatedAt: liveEntry.fetchedAt,
                error: null,
                balance: liveEntry.balance,
                plan: liveEntry.windows === null ? null : { windows: liveEntry.windows },
            };
        }
        const fallback = fallbackOf(channel.provider);
        return {
            provider: channel.provider,
            displayName: hostEntry?.displayName ?? channel.displayName,
            credential: hostEntry?.credential ?? channel.apiKeyEnv,
            supported,
            source: 'snapshot',
            snapshotOrigin: fallback.origin,
            fetchedAt: null,
            updatedAt: fallback.updatedAt,
            // 实时失败的原因要透出（未配置凭据 / 网络 / 鉴权），界面据此提示
            error: liveEntry?.error ?? (fallback.updatedAt === null ? 'no-snapshot' : null),
            balance: fallback.balance,
            plan: fallback.plan,
        };
    });
    const outcome = {
        refreshedAt: new Date().toISOString(),
        providers: providers.map((row) => {
            const capturedAt = row.updatedAt === null ? null : new Date(row.updatedAt).toISOString();
            return {
                provider: row.provider,
                ok: row.source === 'live',
                error: row.error,
                capturedAt,
                // 「陈旧」= 正在展示的不是本次实时值，而是确实有值可展示的旧快照
                stale: row.supported && row.source !== 'live' && capturedAt !== null,
            };
        }),
    };
    return { quota: { providers }, outcome, issues: [] };
}
/** 通道清单（形状 = `/channels` 响应）：窗口 / 余额取自快照的配额段，并带上「数据时间 + 是否陈旧 + 本次失败原因」。 */
export function channelsPayloadOf(context, quota, outcome) {
    const rows = quotaRowsOf(quota);
    const snapshots = rows.map((row) => ({
        provider: row.provider,
        displayName: row.displayName,
        credential: row.credential,
        updatedAt: row.updatedAt,
        balance: row.balance,
        plan: row.plan,
    }));
    const stateOf = new Map(outcome.providers.map((entry) => [entry.provider, entry]));
    return {
        channels: classifyChannels(context.readChannelConfig(), snapshots).map((channel) => {
            const state = stateOf.get(channel.provider) ?? null;
            const row = rows.find((entry) => entry.provider === channel.provider) ?? null;
            return {
                ...channelPayload(channel),
                // 旧值必须能被界面标出来（数据时间 · 本机快照 · 本次失败原因），不许静默当成最新
                quotaCapturedAt: state?.capturedAt ?? null,
                quotaStale: state?.stale === true,
                quotaError: state?.error ?? null,
                quotaSnapshotOrigin: row?.snapshotOrigin ?? null,
            };
        }),
    };
}
export function registerSnapshotRoutes(context) {
    const { webServer, snapshotService } = context;
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/snapshot',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            // 打开页面（?fresh=1）：本地段超过防抖下限就阻塞重算一次、配额段超时就后台补查；
            // 构建中返回上一份完整内容 + building:true，客户端按 building / quotaRefreshing 追取
            const url = new URL(request.url ?? '/', 'http://localhost');
            const view = await snapshotService.view({ fresh: url.searchParams.get('fresh') === '1' });
            logFirstView(view.building);
            // ?sections=a,b,c 只裁剪下发（构建照旧全量），界面按 Tab 只取自己要的那几段
            sendJson(response, 200, trimSnapshotSections(view, parseSections(url.searchParams.get('sections'))));
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/refresh',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            if (request.method !== 'POST') {
                sendJson(response, 200, { ok: false, error: '该端点只支持 POST（面板右上角「刷新」按钮会发 POST）' });
                return;
            }
            const result = await snapshotService.refresh();
            sendJson(response, 200, result.ok ? result.view : { ok: false, error: result.error });
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/channels',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            // 与快照同源：不再单独读宿主快照 + 内存缓存（那正是「总览显示 14 天前 76%」的来源）
            const view = await snapshotService.view();
            sendJson(response, 200, view.sections.channels ?? { channels: [] });
        },
    });
}
