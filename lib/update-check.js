/**
 * 插件更新检查：读 npm 的 dist-tags 判断是否有新版本。
 * 只提示，不下载、不安装；24 小时节流，结果存 app_meta 的 `update` scope。
 * 失败静默（原因由调用方写入系统日志），界面只显示「当前版本」不变。
 */
import { createRequire } from 'node:module';
import { dictGet, dictSet, openStorage, storagePath } from './storage/db.js';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
/** 当前运行的插件版本（与服务端 lib 始终同版本）。 */
export const CURRENT_VERSION = typeof pkg.version === 'string' ? pkg.version : '0.0.0';
const DIST_TAGS_URL = 'https://registry.npmjs.org/-/package/dsh-key-usage/dist-tags';
const CHECK_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;
const SCOPE = 'update';
/** 只按主.次.修订三段比较；预发布（-rc.1）按同版本号的正式版更低处理。 */
function versionPartsOf(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
    if (match === null)
        return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}
export function compareVersions(first, second) {
    const left = versionPartsOf(first);
    const right = versionPartsOf(second);
    if (left === null || right === null)
        return 0;
    for (let index = 0; index < 3; index += 1) {
        if (left[index] !== right[index])
            return left[index] - right[index];
    }
    return 0;
}
function readCache(path) {
    try {
        const db = openStorage(path ?? storagePath());
        const latest = dictGet(db, SCOPE, 'latest');
        const checkedAtText = dictGet(db, SCOPE, 'checkedAt');
        const checkedAt = checkedAtText === null ? null : Number(checkedAtText);
        const skipped = dictGet(db, SCOPE, 'skipped');
        return { latest, checkedAt: Number.isFinite(checkedAt ?? NaN) ? checkedAt : null, skipped };
    }
    catch {
        return { latest: null, checkedAt: null, skipped: null };
    }
}
function writeCache(latest, checkedAt, path) {
    try {
        const db = openStorage(path ?? storagePath());
        dictSet(db, SCOPE, 'latest', latest, { source: DIST_TAGS_URL });
        dictSet(db, SCOPE, 'checkedAt', String(checkedAt), { source: DIST_TAGS_URL });
    }
    catch {
        // 元信息写失败不影响本次返回，下次重新联网
    }
}
/** 上游 dist-tags 只取 latest 字段；非 200 / 坏 JSON / 超时都返回 null。 */
async function fetchLatestVersion(fetchImpl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetchImpl(DIST_TAGS_URL, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        });
        if (!response.ok)
            return null;
        const body = await response.json();
        return typeof body.latest === 'string' && versionPartsOf(body.latest) !== null ? body.latest : null;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * 解析更新状态：缓存 24 小时内直接返回；`refresh` 或过期才联网。
 * 联网失败时保留上次结果并标记 stale，不抛错。
 */
/** 记录用户「忽略此版本」：同一版本不再提示（app_meta 的 update.skipped）。 */
export function markUpdateSkipped(version, path) {
    try {
        dictSet(openStorage(path ?? storagePath()), SCOPE, 'skipped', version);
    }
    catch {
        // 忽略失败不影响主流程，下次仍会提示
    }
}
export async function resolveUpdate(options = {}) {
    const now = options.now ?? Date.now();
    const cached = readCache(options.storagePath);
    const fresh = cached.checkedAt !== null && now - cached.checkedAt < CHECK_TTL_MS;
    if (fresh && options.refresh !== true) {
        return viewOf(cached.latest, cached.checkedAt, now, cached.skipped);
    }
    const latest = await fetchLatestVersion(options.fetchImpl ?? fetch);
    if (latest === null) {
        return viewOf(cached.latest, cached.checkedAt, now, cached.skipped);
    }
    writeCache(latest, now, options.storagePath);
    return viewOf(latest, now, now, cached.skipped);
}
function viewOf(latest, checkedAt, now, skipped = null) {
    const hasUpdate = latest !== null && compareVersions(latest, CURRENT_VERSION) > 0 && latest !== skipped;
    return {
        current: CURRENT_VERSION,
        latest,
        checkedAt,
        stale: checkedAt === null || now - checkedAt >= CHECK_TTL_MS,
        hasUpdate,
    };
}
