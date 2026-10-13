/**
 * dsh-key-usage 服务端入口：挂载只读 HTTP 路由，向客户端提供
 * 用量台账、通道配置、余额快照与会话用量的聚合数据。
 * 台账与快照来自本地文件；会话用量走宿主 sessionPersistence 的只读 handle。零外网请求。
 */
import { mountKeyUsageRoutes } from './routes.js';
import { createSessionSource } from './sessions.js';
export const name = 'dsh-key-usage';
export function apply(ctx) {
    // 会话服务是可选依赖：用 get 惰性取，缺了也只是会话相关页面显示空态
    const sessionSource = createSessionSource({
        get: (serviceName) => (typeof ctx.get === 'function' ? ctx.get(serviceName) : undefined),
    });
    ctx.inject(['webServer'], (host) => {
        host.effect(() => mountKeyUsageRoutes(host.webServer, sessionSource), 'dsh-key-usage: http routes');
    });
}
