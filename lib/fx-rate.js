/**
 * 实时汇率（USD → CNY）：服务端**第三个、也是最后一个**显式联网动作
 * （另外两个是「余额与订阅窗口」与「刷新价目」）。
 *
 * 触发时机只有一种：客户端在**打开页面 / 切换显示币种 / 点「刷新汇率」**时请求
 * `GET /dsh-key-usage/fx`（`?refresh=1` 表示强制上游）。**没有定时轮询、没有开机拉取**，
 * 也不在任何其它端点里隐式联网 —— 12 小时 TTL 以内的请求直接吃本机缓存文件，一次网络都不发。
 *
 * 上游顺序：open.er-api.com（取 `rates.CNY`）→ frankfurter.app（取 `rates.CNY`）；
 * 单次 6 秒超时、响应上限 64 KiB、非 200 一律算失败。成功即原子写
 * `$DSH_HOME/dsh-key-usage/fx-rate.json`（写目标按文件名 + 绝对路径双重校验，同目录 tmp + rename）。
 * 任何失败都降级：有缓存就回落缓存（`stale: true`），没有缓存就用默认 7.1 兜底，
 * 并把可读的中文原因写进 `note` —— 绝不抛错，接口恒为 `ok: true`。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
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
export const FX_CACHE_FILE = 'fx-rate.json';
/** 本机缓存文件路径（插件自己的目录，唯一的可写目标）。 */
export function fxRatePath() {
    return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-key-usage', FX_CACHE_FILE);
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
export function readFxCache(path = fxRatePath()) {
    let text;
    try {
        text = readFileSync(path, 'utf8');
    }
    catch {
        return { entry: null, problem: null };
    }
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        return { entry: null, problem: '本机汇率缓存不是合法 JSON，已忽略：' + path };
    }
    if (!isObject(raw))
        return { entry: null, problem: '本机汇率缓存顶层不是对象，已忽略：' + path };
    const rate = typeof raw.rate === 'number' && Number.isFinite(raw.rate) && raw.rate > 0 ? raw.rate : null;
    const fetchedAt = typeof raw.fetchedAt === 'string' && Number.isFinite(Date.parse(raw.fetchedAt)) ? raw.fetchedAt : null;
    if (rate === null || fetchedAt === null) {
        return { entry: null, problem: '本机汇率缓存缺 rate / fetchedAt（或数值非法），已忽略：' + path };
    }
    return {
        entry: {
            version: typeof raw.version === 'number' ? raw.version : 1,
            base: typeof raw.base === 'string' ? raw.base : FX_BASE,
            quote: typeof raw.quote === 'string' ? raw.quote : FX_QUOTE,
            rate,
            fetchedAt,
            upstream: typeof raw.upstream === 'string' ? raw.upstream : '',
        },
        problem: null,
    };
}
/** 写目标守卫：文件名 + 绝对路径都要对得上（Windows 路径大小写不敏感）。 */
function writableTargetProblem(path) {
    if (basename(path) !== FX_CACHE_FILE) {
        return '只允许写 ' + FX_CACHE_FILE + '（当前目标：' + path + '）';
    }
    if (resolve(path).toLowerCase() !== resolve(fxRatePath()).toLowerCase()) {
        return '只允许写 $DSH_HOME/dsh-key-usage/' + FX_CACHE_FILE + '（当前目标：' + path + '）';
    }
    return null;
}
/** 原子写：同目录临时文件 + rename（避免读到半截 JSON）；写失败只返回原因，不抛错。 */
export function writeFxCache(entry, path = fxRatePath()) {
    const problem = writableTargetProblem(path);
    if (problem !== null)
        return { ok: false, error: problem };
    try {
        mkdirSync(dirname(path), { recursive: true });
        const temporaryPath = path + '.tmp';
        writeFileSync(temporaryPath, JSON.stringify(entry, null, 2) + '\n', 'utf8');
        renameSync(temporaryPath, path);
    }
    catch (error) {
        return { ok: false, error: '写入汇率缓存失败：' + (error instanceof Error ? error.message : String(error)) };
    }
    return { ok: true, path };
}
/** 缓存是否还在 TTL 内（`fetchedAt` 无法解析时视为过期）。 */
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
/** 按上限读响应体：超过上限立刻中止连接并返回 null。 */
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
/**
 * 取汇率（唯一入口）：TTL 内吃缓存不联网；过期或强制刷新才拉上游，失败静默回落缓存，
 * 无缓存则用默认值兜底。返回体恒为 `ok: true`，失败原因在 `note` 里，绝不抛错。
 */
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
    };
}
