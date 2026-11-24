/** 工具 / 技能 / MCP 与提问词云：`/tools`、`/prompts`。 */
import { mergePromptStatsForWindow, mergePromptStatsInWindow, previousPromptWindowOf, TOOL_TREND_DAYS, } from '../data/session-usage.js';
import { mergeToolStatsInWindow } from '../data/tool-stats.js';
import { dayKeyOf, parseDayParam, parseMultiFilter, requireLoopback, sendJson, shiftedDayKey, } from './helpers.js';
/** 提问词云统计窗口天数：与 usage 默认范围一致（近 30 天），上期 = 紧邻的前 30 天。 */
const PROMPT_WINDOW_DAYS = 30;
/**
 * 提问词云的响应体（快照 `prompts` 段与 `GET /prompts` 端点共用同一个形状）：
 * 本期 + 上期，上期窗口没有任何提问时 prev* 全给 null（界面据此不显示环比，不拿 0 编百分比）。
 */
function promptPayloadOf(current, previous, from, to) {
    const hasPrevious = previous !== null && previous.days > 0;
    return {
        words: current.words,
        totalPrompts: current.totalPrompts,
        totalChars: current.totalChars,
        sessionCount: current.sessionCount,
        from,
        to,
        prevTotalPrompts: hasPrevious ? previous.totalPrompts : null,
        prevTotalChars: hasPrevious ? previous.totalChars : null,
        prevWordCount: hasPrevious ? previous.words.length : null,
        prevTopWordCount: hasPrevious && previous.words.length > 0 ? previous.words[0].count : null,
    };
}
/**
 * 提问词云（快照 `prompts` 段）：当前窗口 = 近 30 天，上期 = 紧邻的前 30 天。
 * 按天桶切分，同一会话跨窗口时各计各的。
 */
export function promptCloudOf(records) {
    const to = dayKeyOf(new Date());
    const from = shiftedDayKey(-(PROMPT_WINDOW_DAYS - 1));
    const previousWindow = previousPromptWindowOf(from, to);
    const current = mergePromptStatsForWindow(records, from, to);
    const previous = mergePromptStatsForWindow(records, previousWindow.from, previousWindow.to);
    return promptPayloadOf(current, previous, from, to);
}
export function registerInsightsRoutes(context) {
    const { webServer } = context;
    /**
     * 工具 / 技能 / MCP 参数化统计：窗口 = `from`/`to`（本地日期、含首尾），
     * `project` / `model` 逗号分隔多选（空串项 = 匹配「未归入工作区」）。
     * 只读运行期索引、不重读会话；索引还没建好（老版本 / 构建中）时回 `null`，客户端回落快照全量段。
     */
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/tools',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const today = dayKeyOf(new Date());
            const to = parseDayParam(url.searchParams.get('to'), today);
            const from = parseDayParam(url.searchParams.get('from'), shiftedDayKey(-(TOOL_TREND_DAYS - 1)));
            // 起止倒置时交换：与范围选择器一致，取用户圈定的窗口而不是报错
            const windowFrom = from <= to ? from : to;
            const windowTo = from <= to ? to : from;
            const stat = mergeToolStatsInWindow(context.toolsIndex, {
                from: windowFrom,
                to: windowTo,
                projects: parseMultiFilter(url.searchParams.get('project')),
                models: parseMultiFilter(url.searchParams.get('model')),
            });
            if (stat === null) {
                sendJson(response, 200, null);
                return;
            }
            sendJson(response, 200, { ...stat, from: windowFrom, to: windowTo });
        },
    });
    /**
     * 提问词云参数化统计：窗口 = `from`/`to`（本地日期、含首尾），`project` / `model` / `provider`
     * 逗号分隔多选（空串项 = 匹配「未归入工作区」）。响应形状与快照 `prompts` 段一致，另带上期环比。
     * 只读运行期索引、不重读会话；索引还没建好（老版本 / 构建中）时回 `null`，客户端回落快照段。
     */
    webServer.register({
        kind: 'exact',
        path: '/dsh-key-usage/prompts',
        handler: async (request, response) => {
            if (!requireLoopback(request, response))
                return;
            const url = new URL(request.url ?? '/', 'http://localhost');
            const today = dayKeyOf(new Date());
            const to = parseDayParam(url.searchParams.get('to'), today);
            const from = parseDayParam(url.searchParams.get('from'), shiftedDayKey(-(PROMPT_WINDOW_DAYS - 1)));
            // 起止倒置时交换：与范围选择器一致，取用户圈定的窗口而不是报错
            const windowFrom = from <= to ? from : to;
            const windowTo = from <= to ? to : from;
            const projects = parseMultiFilter(url.searchParams.get('project'));
            const models = parseMultiFilter(url.searchParams.get('model'));
            const providers = parseMultiFilter(url.searchParams.get('provider'));
            const current = mergePromptStatsInWindow(context.promptsIndex, {
                from: windowFrom,
                to: windowTo,
                projects,
                models,
                providers,
            });
            if (current === null) {
                sendJson(response, 200, null);
                return;
            }
            // 上期 = 同长度、紧邻前一段；筛选条件与本期一致，环比才有可比性
            const previousWindow = previousPromptWindowOf(windowFrom, windowTo);
            const previous = mergePromptStatsInWindow(context.promptsIndex, {
                from: previousWindow.from,
                to: previousWindow.to,
                projects,
                models,
                providers,
            });
            sendJson(response, 200, promptPayloadOf(current, previous, windowFrom, windowTo));
        },
    });
}
