/**
 * dsh-key-usage 服务端入口：挂载 HTTP 路由。
 * 数据源：本地只读文件（台账 / 快照 / 通道配置 / 价目）+ 宿主只读 handle（sessionPersistence）；
 * 联网只有三处、都由用户动作触发：余额查询、价目刷新、汇率（详见 routes.ts）。
 */
import { mountKeyUsageRoutes } from './routes.js';
import { createLiveQuotaService } from './quota/live-quota.js';
import { createSessionSource } from './data/sessions.js';
import { appendLogRecords, logFilePath } from './data/log-store.js';
export const name = 'dsh-key-usage';
/**
 * 启动埋点：只记时间，不读数据、不联网；写失败静默（埋点绝不能影响插件）。
 * 用途：重启 DSH 后看这两条日志就能算出「宿主 host 启动 → 插件挂载 → 首屏请求」各花多久。
 */
function logBoot(message, detail) {
    try {
        appendLogRecords([{ time: new Date().toISOString(), level: 'info', source: 'boot', message, detail }], logFilePath());
    }
    catch {
        // 埋点失败不影响主流程
    }
}
export function apply(ctx) {
    logBoot('插件已挂载', '宿主进程已运行 ' + String(Math.round(process.uptime() * 1000)) + ' ms');
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
                    // 拿不到就退到进程环境变量
                }
            }
            // 兜底：只读进程环境变量，不碰任何凭据文件
            const fromEnv = process.env[reference];
            return typeof fromEnv === 'string' ? fromEnv.trim() : '';
        },
    });
    ctx.inject(['webServer'], (host) => {
        host.effect(() => mountKeyUsageRoutes(host.webServer, sessionSource, liveQuota, {
            // workspaceRegistry 用来读官方归档集合（拿不到就回退本地 storages/workspace.json）
            get: (serviceName) => (typeof ctx.get === 'function' ? ctx.get(serviceName) : undefined),
        }), 'dsh-key-usage: http routes');
    });
}
