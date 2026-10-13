/**
 * 余额 / 窗口快照的本地持久化。
 *
 * 为什么需要：宿主那份 `dsh-usage/provider-snapshots.json` 由别的组件写，本机实测从 2026-09-30
 * 起就停更了 —— 实时查询一旦失败，界面就只剩十几天前的旧值（截图里的「已 13 天未更新」）。
 * 这里在**每次实时查询成功后**立刻落一份自己的快照，失败时优先回落到它，
 * 把数据断档压缩到「最近一次成功查询」为止。
 *
 * 约定：只写插件自己的文件（`$DSH_HOME/dsh-key-usage/quota-snapshots.json`），不碰宿主的文件；
 * 读写失败一律忽略（返回空 / 不写），绝不影响接口可用性。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** 读快照；文件缺失、损坏、结构不符一律返回空数组。 */
export function readQuotaSnapshots(path) {
    let document;
    try {
        document = JSON.parse(readFileSync(path, 'utf8'));
    }
    catch {
        return [];
    }
    const providers = document?.providers;
    if (!isObject(providers))
        return [];
    const entries = [];
    for (const [id, raw] of Object.entries(providers)) {
        if (!isObject(raw))
            continue;
        if (typeof raw.updatedAt !== 'number' || !Number.isFinite(raw.updatedAt))
            continue;
        const windows = Array.isArray(raw.windows)
            ? raw.windows.filter((window) => isObject(window) && typeof window.key === 'string' && typeof window.percent === 'number')
            : null;
        entries.push({
            provider: typeof raw.provider === 'string' ? raw.provider : id,
            displayName: typeof raw.displayName === 'string' ? raw.displayName : null,
            updatedAt: raw.updatedAt,
            balance: isObject(raw.balance) ? raw.balance : null,
            windows: windows !== null && windows.length > 0 ? windows : null,
        });
    }
    return entries;
}
/**
 * 合并写入：本次成功的通道覆盖旧值，其余通道保留（避免一次只刷新部分通道时把别的通道抹掉）。
 * 先写临时文件再改名，避免读到半截 JSON；任何异常都吞掉。
 */
export function writeQuotaSnapshots(path, entries) {
    if (entries.length === 0)
        return;
    try {
        const merged = new Map(readQuotaSnapshots(path).map((entry) => [entry.provider, entry]));
        for (const entry of entries)
            merged.set(entry.provider, entry);
        const document = { version: 1, providers: Object.fromEntries(merged) };
        mkdirSync(dirname(path), { recursive: true });
        const temporaryPath = path + '.tmp';
        writeFileSync(temporaryPath, JSON.stringify(document, null, 2) + '\n', 'utf8');
        renameSync(temporaryPath, path);
    }
    catch {
        // 快照只是加速回落，写不了就不写
    }
}
