/**
 * 实时汇率（USD → CNY）：三个显式联网动作之一，只在打开页面 / 切币种 / 点「刷新汇率」时请求；
 * 12 小时 TTL 内直接吃本机缓存（不联网），没有轮询、没有开机拉取。
 * 上游 open.er-api.com → frankfurter.app（取 `rates.CNY`）：6 秒超时、64 KiB 上限、非 200 算失败；
 * 成功即原子写 `$DSH_HOME/dsh-key-usage/fx-rate.json`，失败静默回落缓存、再回落默认 7.1，
 * 原因写进中文 `note` —— 绝不抛错，接口恒为 `ok: true`。
 */
import { openStorage, readFxRow, replaceFxRow, storagePath, STORAGE_FILE } from '../storage/db.js';
export const FX_BASE = 'USD';
export const FX_QUOTE = 'CNY';
/** 拿不到任何汇率时的兜底值：界面上必须显式标注「用默认汇率」，不能当成实时值。 */
export const FX_DEFAULT_RATE = 7.1;
export const FX_TTL_HOURS = 12;
export const FX_TIMEOUT_MS = 6000;
export const FX_MAX_BYTES = 65536;
/** 主上游：exchangerate-api 的开放端点，`rates.CNY` 为 USD→CNY。 */
export const FX_PRIMARY_URL = 'https://open.er-api.com/v6/latest/USD';
/** 备上游：法兰克福 ECB 数据，`rates.CNY` 同上；主上游不可达时用。 */
export const FX_BACKUP_URL = 'https://api.frankfurter.app/latest?from=USD&to=CNY';
/** 本机缓存的唯一可写目标（与 quota-snapshots.json / model-prices.json 同目录）。 */
export const FX_CACHE_FILE = STORAGE_FILE;
/** 本机缓存文件路径（插件自己的目录，唯一的可写目标）。 */
export function fxRatePath() {
    return storagePath();
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** 上游响应 → 汇率；只认 `rates.CNY` 的有限正数（数字或纯数字字符串），其余一律算坏响应。 */
function rateFromBody(body) {
    if (!isObject(body))
        return null;
    const rates = isObject(body.rates) ? body.rates : null;
    if (rates === null)
        return null;
    const raw = rates[FX_QUOTE];
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : Number.NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
}
/**
 * 读本机缓存：文件不存在（还没成功查过）返回 `entry: null`，属于正常状态；
 * 文件坏了额外给出 problem（中文），由调用方写进 note —— 读失败绝不抛错。
 */
/** 读本机汇率：库里没有（还没成功查过）返回 `entry: null`，属正常状态；读库失败给出 problem。 */
export function readFxCache(path = fxRatePath()) {
    let row;
    try {
        row = readFxRow(openStorage(path));
    }
    catch (error) {
        return { entry: null, problem: '汇率库读取失败，已忽略：' + (error instanceof Error ? error.message : String(error)) };
    }
    if (row === null)
        return { entry: null, problem: null };
    const rate = Number.isFinite(row.rate) && row.rate > 0 ? row.rate : null;
    const fetchedAt = Number.isFinite(Date.parse(row.fetchedAt)) ? row.fetchedAt : null;
    if (rate === null || fetchedAt === null)
        return { entry: null, problem: '汇率库里缺 rate / fetchedAt（或数值非法），已忽略' };
    return {
        entry: { version: row.version, base: row.base, quote: row.quote, rate, fetchedAt, upstream: row.upstream ?? '' },
        problem: null,
    };
}
export function writeFxCache(entry, path = fxRatePath()) {
    try {
        replaceFxRow(openStorage(path), {
            base: entry.base,
            quote: entry.quote,
            version: entry.version,
            rate: entry.rate,
            fetchedAt: entry.fetchedAt,
            upstream: entry.upstream === '' ? null : entry.upstream,
        });
    }
    catch (error) {
        return { ok: false, error: '写入汇率库失败：' + (error instanceof Error ? error.message : String(error)) };
    }
    return { ok: true, path };
}
function isFresh(fetchedAt, now, ttlHours = FX_TTL_HOURS) {
    const fetched = Date.parse(fetchedAt);
    if (!Number.isFinite(fetched))
        return false;
    return now - fetched < ttlHours * 3600 * 1000;
}
function hostOf(url) {
    try {
        return new URL(url).host;
    }
    catch {
        return url;
    }
}
async function readCappedText(response, controller) {
    const body = response.body;
    const iterable = body !== null && typeof body[Symbol.asyncIterator] === 'function';
    if (!iterable) {
        const text = await response.text();
        return Buffer.byteLength(text, 'utf8') > FX_MAX_BYTES ? null : text;
    }
    const chunks = [];
    let size = 0;
    try {
        for await (const chunk of body) {
            const buffer = Buffer.from(chunk);
            size += buffer.length;
            if (size > FX_MAX_BYTES) {
                controller.abort();
                return null;
            }
            chunks.push(buffer);
        }
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError')
            return null;
        throw error;
    }
    return Buffer.concat(chunks).toString('utf8');
}
/** 拉一次上游：6 秒超时、非 200、超 64 KiB、坏 JSON、缺 rates.CNY 都算失败。 */
async function fetchRate(url, fetchImpl, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' }, redirect: 'follow' });
        if (!response.ok)
            return { ok: false, error: 'http-' + String(response.status) };
        const declared = Number(response.headers?.get?.('content-length') ?? '');
        if (Number.isFinite(declared) && declared > FX_MAX_BYTES)
            return { ok: false, error: 'too-large' };
        const text = await readCappedText(response, controller);
        if (text === null)
            return { ok: false, error: 'too-large' };
        let body;
        try {
            body = JSON.parse(text);
        }
        catch {
            return { ok: false, error: 'bad-json' };
        }
        const rate = rateFromBody(body);
        if (rate === null)
            return { ok: false, error: 'bad-json' };
        return { ok: true, rate };
    }
    catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        return { ok: false, error: aborted ? 'timeout' : 'network' };
    }
    finally {
        clearTimeout(timer);
    }
}
/** 取汇率（唯一入口）：TTL 内吃缓存不联网，过期或强制才拉上游；失败恒为 `ok: true` + 中文 `note`。 */
export async function resolveFxRate(options = {}) {
    const path = options.path ?? fxRatePath();
    const now = options.now ?? Date.now();
    const { entry: cache, problem } = readFxCache(path);
    const fresh = cache !== null && isFresh(cache.fetchedAt, now);
    if (options.refresh !== true && fresh) {
        return {
            ok: true,
            base: FX_BASE,
            quote: FX_QUOTE,
            rate: cache.rate,
            fetchedAt: cache.fetchedAt,
            source: 'cache',
            stale: false,
            upstream: null,
            ttlHours: FX_TTL_HOURS,
            note: '使用 ' + String(FX_TTL_HOURS) + ' 小时内的缓存汇率（本次未联网）',
            noteCode: 'srv.fxCache',
            noteParams: { hours: FX_TTL_HOURS },
        };
    }
    const failures = [];
    for (const url of [FX_PRIMARY_URL, FX_BACKUP_URL]) {
        const outcome = await fetchRate(url, options.fetchImpl ?? fetch, options.timeoutMs ?? FX_TIMEOUT_MS);
        if (!outcome.ok) {
            failures.push(hostOf(url) + '：' + outcome.error);
            continue;
        }
        const fetchedAt = new Date(now).toISOString();
        // 写盘失败不影响本次显示（缓存只是下次的加速），但要在 note 里如实说明
        const written = writeFxCache({ version: 1, base: FX_BASE, quote: FX_QUOTE, rate: outcome.rate, fetchedAt, upstream: url }, path);
        return {
            ok: true,
            base: FX_BASE,
            quote: FX_QUOTE,
            rate: outcome.rate,
            fetchedAt,
            source: 'upstream',
            stale: false,
            upstream: url,
            ttlHours: FX_TTL_HOURS,
            note: '实时汇率来自 ' + hostOf(url) + '（USD → CNY）' + (written.ok ? '' : '；本机缓存写入失败：' + written.error),
            noteCode: 'srv.fxLive',
            noteParams: { host: hostOf(url) },
        };
    }
    const reason = failures.length > 0 ? '（' + failures.join('；') + '）' : '';
    if (cache !== null) {
        return {
            ok: true,
            base: FX_BASE,
            quote: FX_QUOTE,
            rate: cache.rate,
            fetchedAt: cache.fetchedAt,
            source: 'cache',
            stale: !fresh,
            upstream: null,
            ttlHours: FX_TTL_HOURS,
            note: '上游汇率获取失败' + reason + '，回落到本机缓存'
                + (fresh ? '（缓存仍在 ' + String(FX_TTL_HOURS) + ' 小时内）' : '（缓存已超过 ' + String(FX_TTL_HOURS) + ' 小时）'),
            noteCode: 'srv.fxFailedCache',
            noteParams: { reason },
        };
    }
    return {
        ok: true,
        base: FX_BASE,
        quote: FX_QUOTE,
        rate: FX_DEFAULT_RATE,
        fetchedAt: null,
        source: 'default',
        stale: true,
        upstream: null,
        ttlHours: FX_TTL_HOURS,
        note: '无法获取汇率' + reason + '，也没有可用的本机缓存，暂用默认 ' + String(FX_DEFAULT_RATE) + ' 兜底（USD → CNY）'
            + (problem === null ? '' : '；' + problem),
        noteCode: 'srv.fxFailedDefault',
        noteParams: { reason, rate: FX_DEFAULT_RATE },
    };
}
