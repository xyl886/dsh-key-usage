/** 渲染进程启动时刻：启动耗时埋点用（页面脚本开始执行时求值）。 */
export const CLIENT_BOOT_AT_MS = typeof performance === 'undefined' ? 0 : performance.now()
