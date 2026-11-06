/**
 * 提问统计：人类提问判定（剥离宿主注入段）、中文分词 / 词频预算、提问片段截断。
 * 从 session-usage 折叠流程里独立出来：只依赖事件形状，被 foldSessionEvents 与词云聚合共用。
 */
export const MAX_PROMPT_CHARS = 4000;
/** 列表里的提问片段长度（标题兜底与搜索都用它）；正文全文只在 `/session` 详情里给。 */
export const PROMPT_SNIPPET_CHARS = 200;
/** 列表标题的截断长度。 */
export const PROMPT_TITLE_CHARS = 60;
/** 每条提问参与词频统计的最大字符数：超长粘贴只取前 300 字，统计不被一段长文带偏。 */
export const PROMPT_STATS_CHARS = 300;
/**
 * 单会话词表上限：到顶后只累加已有词、不再收新词（高频词早已入表，不受影响）。
 * 上限只兜「数十万条消息 / 随机文本」这类病态会话的内存，不参与正常数据口径。
 */
export const MAX_SESSION_WORDS = 8192;
/** 词云默认下发的词数（客户端只渲染 top 词）。 */
export const PROMPT_WORDS_LIMIT = 60;
/**
 * 宿主注入的非人类文本：teammate 的系统提示、斜杠命令回显、本地命令输出都不是用户提问。
 * 取标题时必须跳过它们继续往下找，否则列表一屏全是 `You are teammate "…"` 这种无辨识度的标题。
 */
const INJECTED_TEXT_PREFIXES = ['<system-reminder', '<system', '<command-', '<local-command'];
/** 真实人类输入的来源 kind；宿主注入的上下文消息（time-context / runtime-context / agent-instructions…）用别的 kind。 */
const HUMAN_PROMPT_SOURCE_KIND = 'user';
/** 注入段标签名：成对段落整段删除，未闭合的开头删到正文末尾（注入被截断时）。 */
const INJECTED_TAG_NAME_PATTERN = '(?:system-reminder|local-command[a-z0-9-]*|command-[a-z0-9-]*|system)';
/** 成对标签包裹的注入段：大小写不敏感、可跨行、非贪婪。 */
const PAIRED_INJECTED_SECTION_PATTERN = new RegExp(`<(${INJECTED_TAG_NAME_PATTERN})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, 'gi');
/**
 * 未闭合的注入段只在其位于段落开头（全文开头或行首）时删到末尾：
 * 宿主注入段总是独立成段，而正文里引用 `<system-reminder>` 的正常提问不能被误删后半句。
 */
const UNCLOSED_INJECTED_SECTION_PATTERN = new RegExp(`(^|[\\r\\n])\\s*<(${INJECTED_TAG_NAME_PATTERN})\\b[^>]*>[\\s\\S]*$`, 'i');
export function isInjectedPromptText(text) {
    return INJECTED_TEXT_PREFIXES.some((prefix) => text.startsWith(prefix));
}
/** 剥离正文里的注入段（成对段落 + 段落开头的未闭合段），返回仍保留换行的原文。 */
export function stripInjectedPromptText(text) {
    return text.replace(PAIRED_INJECTED_SECTION_PATTERN, ' ').replace(UNCLOSED_INJECTED_SECTION_PATTERN, '$1');
}
/** 消息来源是否人类输入：没有 source 的旧数据按人类处理，再由文本清洗兜底。 */
export function isHumanPromptMessage(data) {
    const source = data?.source ?? data?.message?.source;
    if (typeof source !== 'object' || source === null)
        return true;
    const kind = source.kind;
    if (typeof kind !== 'string' || kind === '')
        return true;
    return kind === HUMAN_PROMPT_SOURCE_KIND;
}
/**
 * 中文虚词表：2-gram 的首字或尾字落在表里就丢弃，也不收整词落在表里的 gram。
 * 依据：这些字没有独立语义或只作语法连接，不过滤会拼出「你是」「不要」这类跨词碎片，词云全是噪声；
 * 过滤只看边界，不做分词，不会漏掉「分析」「插件」这类实词组合。
 * 按码点做成标记表：逐 gram 判定时直接按 charCode 下标查，不分配单字字符串。
 */
const CHINESE_FUNCTION_CHAR_FLAGS = (() => {
    const flags = new Uint8Array(0x10000);
    for (const char of '的了是我你他这那有在和就不人都一个上也很到说要去可以们什么怎样吗呢吧啊把被让给对从但而叉再又还只没做用看下里中之与及') {
        flags[char.codePointAt(0)] = 1;
    }
    return flags;
})();
/** 英文 / 标识符：先小写，首字符必须是字母，总长 2~25，允许 `.` `_` `-` `/`。 */
const LATIN_WORD_PATTERN = /[a-z][a-z0-9_.\-/]{1,24}/g;
/** 连续汉字串（基本区 U+4E00–U+9FFF）。 */
const HAN_RUN_PATTERN = /[\u4e00-\u9fff]+/g;
/**
 * 词表里的 URL / 路径噪音（含斜杠的词、协议前缀、MCP 工具名）：
 * 这些不是提问里的关键词，保留只会把词云挤满。
 */
function isNoisyPromptWord(word) {
    if (word.includes('/'))
        return true;
    if (word === 'http' || word === 'https' || word === 'www')
        return true;
    if (word.startsWith('mcp__'))
        return true;
    return false;
}
/**
 * 英文停用词：虚词 + 宿主注入模板里的高频词（时间上下文 / 后台任务 / 审批提示）。
 * 只删这些，技术实词（token / cache / model / cost / deployment…）一律保留。
 */
const ENGLISH_STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these', 'those',
    'for', 'from', 'with', 'without', 'into', 'onto', 'over', 'under', 'while', 'during',
    'before', 'after', 'since', 'by', 'as', 'at', 'in', 'on', 'of', 'to',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'not', 'no', 'nor',
    'you', 'your', 'yours', 'we', 'our', 'ours', 'they', 'their', 'theirs', 'them', 'there', 'it', 'its',
    'he', 'she', 'him', 'her', 'his', 'hers', 'i', 'me', 'my', 'mine',
    'do', 'does', 'did', 'done', 'have', 'has', 'had', 'having',
    'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must',
    'step', 'message', 'browser', 'zone', 'dates', 'elapsed', 'sampled', 'preparing', 'request', 'turn',
    'result', 'output', 'input', 'system', 'human', 'user', 'assistant', 'date', 'time',
]);
/** 中文注入模板词：注入段的中文碎片，整词命中即丢；实词组合仍保留。 */
const CHINESE_INJECTED_GRAMS = new Set(['时间', '请求', '消息', '环境', '区域', '上海', '采样', '准备']);
/** 含汉字判定（jieba 会把标点与英文也切出来，这里只要中文词）。 */
const HAN_ANY_PATTERN = /[\u4e00-\u9fff]/;
let segmenter = null;
let segmenterLoading = null;
/**
 * 准备中文分词器（jieba-wasm，MIT）。
 * **懒加载**：wasm 3.9 MB、首次 cut 约 270 ms，绝不能放在宿主启动路径上；构建词云前调用一次即可。
 * 加载失败静默回退到 2-gram，不影响快照与其它端点。
 */
export async function preparePromptSegmenter() {
    if (segmenter !== null)
        return;
    segmenterLoading ??= (async () => {
        try {
            // nodejs 入口在 import 时已自带 wasm（无需手动 initSync / 读文件）
            const wasm = await import('jieba-wasm');
            const cut = wasm.cut ?? wasm.default?.cut;
            if (typeof cut === 'function')
                segmenter = { cut };
        }
        catch {
            segmenter = null;
        }
    })();
    await segmenterLoading;
}
/** 累加词频：到上限后只累加已有词、不再收新词。 */
export function addWordCount(words, word, count, cap) {
    const current = words.get(word);
    if (current !== undefined) {
        words.set(word, current + count);
        return;
    }
    if (words.size >= cap)
        return;
    words.set(word, count);
}
/**
 * 把一段提问正文拆成英文标识符与中文词并逐词计数（中英同一权重）。
 * 中文优先走 jieba 分词；分词器没就绪时回退到滑动 2-gram（宁可碎片也不丢词）。
 */
export function addPromptWords(words, text, dayBucket) {
    // 同一个词一次出现只切一次；当天桶与总表同步累加，避免重复分词
    const add = (word) => {
        addWordCount(words, word, 1, MAX_SESSION_WORDS);
        if (dayBucket === undefined)
            return;
        // 当天桶的总词条数另有预算：只兜病态会话的内存，到顶后只累加已有词
        if (dayBucket.budget.remaining <= 0)
            return;
        if (!dayBucket.words.has(word))
            dayBucket.budget.remaining -= 1;
        addWordCount(dayBucket.words, word, 1, MAX_SESSION_WORDS);
    };
    for (const word of text.toLowerCase().match(LATIN_WORD_PATTERN) ?? []) {
        if (ENGLISH_STOP_WORDS.has(word) || isNoisyPromptWord(word))
            continue;
        add(word);
    }
    const cut = segmenter?.cut ?? null;
    if (cut !== null) {
        for (const word of cut(text, true)) {
            // jieba 会把标点、英文、单字也切出来：只收 2 字以上的中文词
            if (word.length < 2 || !HAN_ANY_PATTERN.test(word))
                continue;
            // 词首 / 词尾是虚词（这个、什么、我们的…）就丢掉，与 2-gram 的边界判定同一套表
            if (CHINESE_FUNCTION_CHAR_FLAGS[word.charCodeAt(0)] === 1 || CHINESE_FUNCTION_CHAR_FLAGS[word.charCodeAt(word.length - 1)] === 1)
                continue;
            if (CHINESE_INJECTED_GRAMS.has(word))
                continue;
            add(word);
        }
        return;
    }
    for (const run of text.match(HAN_RUN_PATTERN) ?? []) {
        for (let index = 0; index + 1 < run.length; index += 1) {
            // 两个字都是虚词时必然被边界判定丢掉，所以不需要单独判「整词在表里」
            if (CHINESE_FUNCTION_CHAR_FLAGS[run.charCodeAt(index)] === 1 || CHINESE_FUNCTION_CHAR_FLAGS[run.charCodeAt(index + 1)] === 1)
                continue;
            const gram = run.slice(index, index + 2);
            if (CHINESE_INJECTED_GRAMS.has(gram))
                continue;
            add(gram);
        }
    }
}
