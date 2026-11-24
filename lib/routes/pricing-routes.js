/** 价目与单价表：`/pricing`、`/pricing/refresh`、`/rates`。 */
import { classifyChannels } from '../data/collect.js';
import { aggregateRange } from '../data/ledger.js';
import { mergeDailySeries, sessionDayRows } from '../data/merge.js';
import { matchPricedRule, ratesAt, rowCostsOf, summarizeCoverage } from '../pricing/pricing.js';
import { catalogCurrency, catalogEntryCount, catalogFileInfo, catalogIssues, catalogRuleList, catalogSources, } from '../pricing/pricing-catalog.js';
import { aggregateStatus, refreshModelPrices } from '../pricing/model-prices.js';
import { dayKeyOf, dayModelPricingRow, parseDays, parseRatesLimit, pricingRowOf, ratesNoteOf, requireLoopback, sendJson, shiftedDayKey, } from './helpers.js';
/**
 * 每通道单价表：`rates` 与成本计算走同一套匹配（通道内价目 → 同模型官方价目），给的是**此刻生效**的单价
 * （错峰时是错峰价 + `offPeak: true`）；两层都没命中标 `none`（`rates: null`）。
 */
export async function ratesPayload(context, days, limit, today) {
    const from = shiftedDayKey(-(days - 1));
    const ledger = context.loadLedger();
    const channels = await context.channelsWithQuota();
    const knownProviders = channels.map((channel) => channel.provider);
    const collection = await context.sessionSource.collect();
    const merged = mergeDailySeries(aggregateRange(ledger, from, today, null).days, sessionDayRows(collection.records, knownProviders), from, today);
    const now = new Date();
    // 模型集合 = 范围内（台账 + 会话合并口径）出现过的模型
    const usageByProvider = new Map();
    for (const day of merged.days) {
        for (const model of day.models) {
            let models = usageByProvider.get(model.provider);
            if (models === undefined) {
                models = new Map();
                usageByProvider.set(model.provider, models);
            }
            let bucket = models.get(model.model);
            if (bucket === undefined) {
                bucket = { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
                models.set(model.model, bucket);
            }
            bucket.calls += model.calls;
            bucket.inputTokens += model.inputTokens;
            bucket.outputTokens += model.outputTokens;
            bucket.cacheReadTokens += model.cacheReadTokens;
            bucket.cacheWriteTokens += model.cacheWriteTokens ?? 0;
        }
    }
    const channelRows = [...usageByProvider.entries()].map(([provider, models]) => {
        const displayName = channels.find((channel) => channel.provider === provider)?.displayName ?? '';
        // 未配置 / 未命名的通道用 raw provider id 兜底；provider 本身为空时给一句可读说明
        const label = displayName !== '' ? displayName : provider !== '' ? provider : '未知通道';
        const rankedModels = [...models.entries()]
            .map(([model, usage]) => ({ model, usage, tokens: usage.inputTokens + usage.outputTokens + usage.cacheReadTokens }))
            .sort((first, second) => second.tokens - first.tokens)
            .slice(0, limit)
            .map(({ model, usage, tokens }) => {
            const hit = matchPricedRule(provider, model);
            const effective = hit === null ? null : ratesAt(hit.rule, now);
            // 该行这段用量的成本：用表里同一份「此刻单价」算，成本列与单价列永远对得上
            const pricedRow = rowCostsOf([pricingRowOf({
                    provider,
                    model,
                    tokens,
                    calls: usage.calls,
                    buckets: {
                        inputTokens: usage.inputTokens,
                        outputTokens: usage.outputTokens,
                        cacheReadTokens: usage.cacheReadTokens,
                        cacheWriteTokens: usage.cacheWriteTokens,
                    },
                })], { at: now })[0];
            return {
                model,
                cost: pricedRow === undefined ? null : pricedRow.cost,
                costCurrency: pricedRow === undefined ? null : pricedRow.currency,
                tokens,
                calls: usage.calls,
                source: hit !== null ? hit.source : 'none',
                currency: hit === null ? null : hit.rule.currency,
                partial: hit !== null && hit.partial,
                offPeak: effective !== null && effective.offPeak,
                rates: effective === null ? null : {
                    input: effective.rates.input,
                    cacheRead: effective.rates.cacheRead,
                    cacheWrite: effective.rates.cacheWrite,
                    output: effective.rates.output,
                },
                note: ratesNoteOf(hit),
                noteEn: hit === null || hit.rule.noteEn === undefined ? null : hit.rule.noteEn,
            };
        });
        const currencies = new Set(rankedModels.map((row) => row.currency).filter((value) => value !== null));
        return {
            provider,
            label,
            // 该通道**展示出来的**模型币种一致时给出，混合（如官方价 CNY + 聚合价 USD）时为 null —— 不猜
            currency: currencies.size === 1 ? [...currencies][0] : null,
            models: rankedModels,
            totalTokens: rankedModels.reduce((total, row) => total + row.tokens, 0),
        };
    }).sort((first, second) => second.totalTokens - first.totalTokens);
    return {
        from,
        to: today,
        channels: channelRows.map(({ totalTokens, ...channel }) => channel),
    };
}
export function registerPricingRoutes(context) {
    const { webServer } = context;
    /** 价目装载状态：内置价目（随包 YAML）+ 聚合价（随包 JSON 或本机刷新副本）+ 近 30 天覆盖度 + 解析问题。 */
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/pricing',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const ledger = context.loadLedger();
            const channels = classifyChannels(context.readChannelConfig(), []);
            const knownProviders = channels.map((channel) => channel.provider);
            const collection = await context.sessionSource.collect();
            const today = dayKeyOf(new Date());
            const monthFrom = shiftedDayKey(-29);
            const merged = mergeDailySeries(aggregateRange(ledger, monthFrom, today, null).days, sessionDayRows(collection.records, knownProviders), monthFrom, today);
            // 覆盖度按「近 30 天出现过的 provider|model」统计，与使用明细的口径一致
            const usageRows = merged.days.flatMap((day) => day.models.map(dayModelPricingRow));
            const coverage = summarizeCoverage(usageRows);
            // 覆盖度统计会顺带做聚合价匹配，装载问题与「定不了通道」的提示要在这之后再取，才能一起下发
            const aggregate = aggregateStatus();
            sendJson(response, 200, {
                currency: catalogCurrency(),
                // 内置官方价目：自动生效、无需用户维护；条数 / 来源给摘要，rules 给逐条数值
                catalog: {
                    entries: catalogEntryCount(),
                    sources: catalogSources(),
                    rules: catalogRuleList(),
                },
                // LiteLLM 聚合价目（第三方、USD）：随包快照 + 本地刷新文件；刷新走下面的 POST /pricing/refresh
                aggregate,
                coverage: {
                    from: monthFrom,
                    to: today,
                    catalogModels: coverage.catalogModels,
                    aggregateModels: coverage.aggregateModels,
                    partialModels: coverage.partialModels,
                    modelModels: coverage.modelModels,
                    unpricedModels: coverage.unpricedModels,
                    // 只作参照：界面上的成本按「官方账单 > 内置价目 > 聚合价 > 均价」逐格取值，与这个总额不一定相等
                    costByCurrency: coverage.costByCurrency,
                    savingsByCurrency: coverage.savingsByCurrency,
                    savingsDetail: coverage.savingsDetail,
                },
                files: { catalog: catalogFileInfo() },
                issues: catalogIssues().map((issue) => ({ file: 'catalog', line: issue.line, message: issue.message })),
            });
        },
    });
    /**
     * 聚合价目刷新：只在用户点面板「刷新价目」按钮时触发。
     * 先 raw 再 jsDelivr 镜像，总超时 20 秒、响应上限 12 MiB；校验不过不覆盖已有本地文件。
     * 与写入端点同样一律 HTTP 200 + `{ok:false,error}`（客户端只看 ok）。
     */
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/pricing/refresh',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            if (request.method !== undefined && request.method !== 'POST') {
                sendJson(response, 200, { ok: false, error: '该端点只支持 POST（面板的「刷新价目」按钮会发 POST）' });
                return;
            }
            const result = await refreshModelPrices();
            sendJson(response, 200, result);
        },
    });
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/rates',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const days = parseDays(url.searchParams.get('days'));
            const limit = parseRatesLimit(url.searchParams.get('limit'));
            sendJson(response, 200, await ratesPayload(context, days, limit, dayKeyOf(new Date())));
        },
    });
}
