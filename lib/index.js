/**
 * dsh-key-usage 服务端入口：声明计费规则配置项、挂载只读 HTTP 路由，
 * 向客户端提供用量台账、通道配置、余额快照与会话用量的聚合数据。
 *
 * 数据来源：
 * - 台账 / 快照 / 通道配置：本地文件只读；
 * - 项目、会话、按小时：宿主 sessionPersistence 的只读 handle；
 * - 余额与订阅窗口：优先查各通道官方接口（凭据经宿主 credentials seam 解析，
 *   不落盘、不进日志、不返回给客户端），失败时回落到本地快照；
 * - 计费规则：宿主设置服务（宿主负责落盘，本插件不写任何文件）。
 */
import z from '@deepseek-ai/schemastery';
import { mountKeyUsageRoutes } from './routes.js';
import { createLiveQuotaService } from './live-quota.js';
import { createSessionSource } from './sessions.js';
import { EMPTY_PRICING, normalizePricing } from './pricing.js';
export const name = 'dsh-key-usage';
/**
 * 计费规则存在宿主设置服务的这个命名空间里。
 *
 * 宿主的「设置」服务并不维护独立存储：命名空间就是 profile 里**本条目的 id**
 * （`cordis.patch.yml` 的 `insert.id`，与本包同名），字段必须用 `.volatile()` 标记才会被
 * 列出；写入由宿主的 config-editor 落到当前 profile 的 cordis patch 上并原地生效，
 * 因此本插件不写文件、也不需要重启宿主。
 */
const SETTINGS_NAMESPACE = 'dsh-key-usage';
/** 规则的 Config 形状；数值全部可改，默认空规则 = 沿用台账反推均价（与升级前行为一致）。 */
const RulesSchema = z.array(z.object({
    provider: z.string().default('*'),
    model: z.string().default('*'),
    unit: z.union(['perMillionTokens', 'perThousandTokens', 'perCall']).default('perMillionTokens'),
    currency: z.string().default('CNY'),
    input: z.number().default(0),
    cacheRead: z.number().default(0),
    cacheWrite: z.number().default(0),
    output: z.number().default(0),
    offPeak: z.object({
        // `days`（ISO 1=周一 … 7=周日）缺省 = 每天适用；加它之前保存的规则没有这个字段，语义必须不变
        windows: z.array(z.object({
            from: z.string(),
            to: z.string(),
            days: z.array(z.number()).default([]),
        })).default([]),
        input: z.number().default(0),
        cacheRead: z.number().default(0),
        cacheWrite: z.number().default(0),
        output: z.number().default(0),
    }),
    note: z.string().default(''),
}));
export const Config = z.object({
    pricing: z.object({
        version: z.number().default(1),
        currency: z.string().default('CNY'),
        rules: RulesSchema.default([]),
    }).default(EMPTY_PRICING).volatile(),
});
/**
 * 读当前规则：优先问宿主设置服务的实时投影（用户改完立即生效，无需重启宿主），
 * 服务缺失（非桌面 / 未组配 dsh-settings）时退回插件自己的 Config 引用。
 */
function readPricing(ctx, configRef) {
    const settings = (typeof ctx.get === 'function' ? ctx.get('settings') : undefined);
    if (settings !== undefined && typeof settings.describe === 'function') {
        try {
            const rows = settings.describe({ redactSecrets: false });
            const row = Array.isArray(rows) ? rows.find((candidate) => candidate?.ns === SETTINGS_NAMESPACE) : undefined;
            if (row !== undefined) {
                return {
                    config: normalizePricing(row.value),
                    writable: true,
                    revision: typeof row.revision === 'number' ? row.revision : null,
                };
            }
        }
        catch {
            // 设置服务尚未就绪（组合中或已停用）：静默退回本地 Config
        }
    }
    return { config: normalizePricing(configRef), writable: false, revision: null };
}
export function apply(ctx, config) {
    // 会话服务是可选依赖：用 get 惰性取，缺了也只是会话相关页面显示空态
    const sessionSource = createSessionSource({
        get: (serviceName) => (typeof ctx.get === 'function' ? ctx.get(serviceName) : undefined),
    });
    // 凭据同样只在真正查询余额时经宿主 seam 解析；拿不到就回落快照
    const liveQuota = createLiveQuotaService({
        resolveCredential: async (reference) => {
            const credentials = (typeof ctx.get === 'function' ? ctx.get('credentials') : undefined);
            if (credentials !== undefined && typeof credentials.resolve === 'function') {
                try {
                    const hit = await credentials.resolve(reference);
                    if (hit !== null && typeof hit.value === 'string' && hit.value.trim() !== '')
                        return hit.value.trim();
                }
                catch {
                    // 继续尝试进程环境变量
                }
            }
            // 兜底：宿主把凭据放在进程环境里时直接取（只读环境变量，不碰任何凭据文件）
            const fromEnv = process.env[reference];
            return typeof fromEnv === 'string' ? fromEnv.trim() : '';
        },
    });
    ctx.inject(['webServer'], (host) => {
        host.effect(() => mountKeyUsageRoutes(host.webServer, sessionSource, liveQuota, {
            // workspaceRegistry 用来读官方归档集合（拿不到就回退本地 storages/workspace.json）
            get: (serviceName) => (typeof ctx.get === 'function' ? ctx.get(serviceName) : undefined),
        }, {
            current: () => readPricing(ctx, config?.pricing),
        }), 'dsh-key-usage: http routes');
    });
}
