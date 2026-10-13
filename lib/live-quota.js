const REQUEST_TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 65536;
const DEFAULT_TTL_MS = 60000;
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function textOf(value) {
    if (typeof value === 'string' && value !== '')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return String(value);
    return null;
}
/** OpenCode Go：GET https://opencode.ai/zen/go/v1/usage → usage.rolling / weekly / monthly。 */
const OPENCODE_GO_SCHEME = {
    url: () => 'https://opencode.ai/zen/go/v1/usage',
    parse: (body) => {
        const usage = isObject(body) && isObject(body.usage) ? body.usage : body;
        if (!isObject(usage))
            return { balance: null, windows: null };
        const mapping = [['rolling', '5h'], ['weekly', 'week'], ['monthly', 'month']];
        const windows = [];
        for (const [sourceKey, windowKey] of mapping) {
            const raw = usage[sourceKey];
            if (!isObject(raw))
                continue;
            const percent = typeof raw.percent === 'number' ? raw.percent : Number(raw.percent);
            if (!Number.isFinite(percent))
                continue;
            windows.push({
                key: windowKey,
                percent,
                resetsAt: textOf(raw.resetsAt),
                status: typeof raw.status === 'string' ? raw.status : null,
            });
        }
        return { balance: null, windows: windows.length > 0 ? windows : null };
    },
};
/** 官方余额类接口：GET {origin}<path>，凭据同为 Bearer。 */
function balanceScheme(path, parse, fallbackOrigin) {
    return {
        url: (baseURL) => new URL(path, baseURL ?? fallbackOrigin).href,
        parse: (body) => ({ balance: isObject(body) ? parse(body) : null, windows: null }),
    };
}
const SCHEMES = {
    'opencode-go': OPENCODE_GO_SCHEME,
    // DeepSeek: GET {origin}/user/balance → balance_infos[{currency,total_balance,granted_balance,topped_up_balance}]
    'deepseek-official': balanceScheme('/user/balance', (body) => {
        const infos = Array.isArray(body.balance_infos) ? body.balance_infos : [];
        const info = infos.find((entry) => isObject(entry) && entry.currency === 'CNY') ?? infos[0];
        if (!isObject(info))
            return null;
        const balance = {};
        const currency = textOf(info.currency);
        const total = textOf(info.total_balance);
        const granted = textOf(info.granted_balance);
        const toppedUp = textOf(info.topped_up_balance);
        if (currency !== null)
            balance.currency = currency;
        if (total !== null)
            balance.totalBalance = total;
        if (granted !== null)
            balance.giftBalance = granted;
        if (toppedUp !== null)
            balance.topUpBalance = toppedUp;
        return Object.keys(balance).length > 0 ? balance : null;
    }, 'https://api.deepseek.com'),
    // OpenRouter: GET {origin}/api/v1/credits（需要 Management Key）
    openrouter: balanceScheme('/api/v1/credits', (body) => {
        const data = isObject(body.data) ? body.data : null;
        if (data === null)
            return null;
        const totalCredits = typeof data.total_credits === 'number' ? data.total_credits : null;
        const totalUsage = typeof data.total_usage === 'number' ? data.total_usage : null;
        if (totalCredits === null || totalUsage === null)
            return null;
        return { currency: 'USD', totalBalance: (totalCredits - totalUsage).toFixed(2) };
    }, 'https://openrouter.ai'),
    // Moonshot / Kimi: GET {origin}/v1/users/me/balance
    moonshotai: balanceScheme('/v1/users/me/balance', (body) => {
        const data = isObject(body.data) ? body.data : null;
        if (data === null)
            return null;
        const balance = {};
        const currency = textOf(data.currency);
        const available = textOf(data.available_balance);
        const cash = textOf(data.cash_balance);
        const voucher = textOf(data.voucher_balance);
        if (currency !== null)
            balance.currency = currency;
        if (available !== null)
            balance.totalBalance = available;
        if (voucher !== null)
            balance.giftBalance = voucher;
        if (cash !== null)
            balance.topUpBalance = cash;
        return Object.keys(balance).length > 0 ? balance : null;
    }, 'https://api.moonshot.cn'),
    // Z.AI / GLM: GET {origin}/api/paas/v4/balance
    zai: balanceScheme('/api/paas/v4/balance', (body) => {
        const data = isObject(body.data) ? body.data : null;
        if (data === null)
            return null;
        const balance = { currency: 'CNY' };
        const total = textOf(data.total_balance);
        const available = textOf(data.available_balance);
        if (total !== null)
            balance.totalBalance = total;
        if (available !== null)
            balance.availableBalance = available;
        return Object.keys(balance).length > 1 ? balance : null;
    }, 'https://api.z.ai'),
};
/** provider id → 方案 id（事件里的 provider 可能是路由名，先取末段）。 */
export function schemeIdOf(provider) {
    const tail = provider.includes('/') ? provider.slice(provider.lastIndexOf('/') + 1) : provider;
    if (tail === 'opencode-go' || tail === 'opencode')
        return 'opencode-go';
    if (tail === 'deepseek-official' || tail === 'deepseek')
        return 'deepseek-official';
    if (tail === 'openrouter')
        return 'openrouter';
    if (tail === 'moonshotai' || tail === 'moonshotai-cn' || tail === 'kimi' || tail === 'kimi-coding')
        return 'moonshotai';
    if (tail === 'zai' || tail === 'zai-coding-cn')
        return 'zai';
    return null;
}
async function queryOne(schemeId, apiKey, baseURL, fetchImpl) {
    const scheme = SCHEMES[schemeId];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetchImpl(scheme.url(baseURL), {
            headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' },
            signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403)
            return { balance: null, windows: null, error: 'unauthorized' };
        if (!response.ok)
            return { balance: null, windows: null, error: 'http-' + String(response.status) };
        const raw = await response.text();
        if (raw.length > MAX_RESPONSE_BYTES)
            return { balance: null, windows: null, error: 'too-large' };
        let body;
        try {
            body = JSON.parse(raw);
        }
        catch {
            return { balance: null, windows: null, error: 'bad-json' };
        }
        const parsed = scheme.parse(body);
        if (parsed.balance === null && parsed.windows === null)
            return { balance: null, windows: null, error: 'bad-json' };
        return { ...parsed, error: null };
    }
    catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        return { balance: null, windows: null, error: aborted ? 'timeout' : 'network' };
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * 建立实时查询服务。
 * @param resolver - 凭据解析（宿主 credentials seam）
 * @param fetchImpl - 可注入的 fetch（测试用）
 * @param ttlMs - 缓存有效期
 */
export function createLiveQuotaService(resolver, fetchImpl = fetch, ttlMs = DEFAULT_TTL_MS) {
    let cache = new Map();
    let inFlight = null;
    const isStale = () => {
        const now = Date.now();
        for (const entry of cache.values())
            if (now - entry.fetchedAt > ttlMs)
                return true;
        return cache.size === 0;
    };
    async function refresh(channels) {
        const targets = channels
            .map((channel) => ({ channel, schemeId: schemeIdOf(channel.provider) }))
            .filter((entry) => entry.schemeId !== null);
        const results = await Promise.all(targets.map(async ({ channel, schemeId }) => {
            const apiKey = channel.apiKeyEnv === null ? '' : await resolver.resolveCredential(channel.apiKeyEnv);
            const fetchedAt = Date.now();
            if (apiKey === '') {
                return [channel.provider, { provider: channel.provider, ok: false, error: 'no-key', fetchedAt, balance: null, windows: null }];
            }
            const outcome = await queryOne(schemeId, apiKey, channel.baseURL, fetchImpl);
            return [channel.provider, {
                    provider: channel.provider,
                    ok: outcome.error === null,
                    error: outcome.error,
                    fetchedAt,
                    balance: outcome.balance,
                    windows: outcome.windows,
                }];
        }));
        // 只保留本次仍然配置了的通道，并保留没有方案可查的旧条目以免频繁抖动
        const next = new Map();
        for (const [provider, result] of results)
            next.set(provider, result);
        for (const [provider, entry] of cache)
            if (!next.has(provider))
                next.set(provider, entry);
        cache = next;
        return cache;
    }
    return {
        cached: () => cache,
        refreshIfStale: async (channels, force = false) => {
            if (isStale() || force) {
                if (inFlight === null) {
                    inFlight = refresh(channels).finally(() => { inFlight = null; });
                }
                return inFlight;
            }
            return cache;
        },
    };
}
