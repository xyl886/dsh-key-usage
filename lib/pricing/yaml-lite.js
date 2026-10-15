/**
 * 受限 YAML 子集解析器（零依赖、纯函数、离线）。
 *
 * 为什么手写：仓库零运行时依赖，宿主也不提供可复用的 YAML 模块；价目与用户规则是本插件
 * 自己定义的格式，支持到的写法够用即可，**其余写法必须报错而不是猜** —— 猜错一个单价就会算错金额。
 *
 * 支持：注释（整行 / 行尾，引号内除外）、空行、缩进嵌套映射、`- ` 列表、行内 `key: value`、
 * 单 / 双引号字符串、数字 / 布尔 / null / `~`、行内 flow 序列 `[1, 2]` / `[]`、CRLF。
 * 不支持（返回带行号的 issue，绝不抛错、绝不静默错解）：tab 缩进、块标量 `|` / `>`、
 * 锚点 `&` 与别名 `*`、多文档 `---` / `...`、flow 映射 `{…}`、跨行 flow 序列、显式键 `? `、合并键 `<<`。
 */
/** 解析入口：任何输入都返回结果 + 问题列表，不抛异常。 */
export function parseYamlLite(text) {
    const issues = [];
    const lines = scanSourceLines(text, issues);
    const parser = new YamlParser(lines, issues);
    return { root: parser.parseDocument(), issues };
}
/** 顶格映射取字段；非映射或字段缺失返回 null。 */
export function yamlField(node, key) {
    if (node === null || node === undefined || node.kind !== 'map')
        return null;
    const field = node.fields.find((candidate) => candidate.key === key);
    return field === undefined ? null : field.value;
}
/** 列表取项；非列表返回 null（用来区分「不是列表」和「空列表」）。 */
export function yamlItems(node) {
    if (node === null || node === undefined || node.kind !== 'list')
        return null;
    return node.items;
}
/** 标量取文本：数字 / 布尔转成文本，null 与非标量返回 null。 */
export function yamlText(node) {
    if (node === null || node === undefined || node.kind !== 'scalar' || node.value === null)
        return null;
    if (typeof node.value === 'string')
        return node.value.trim();
    return String(node.value);
}
/** 标量取数字：允许带引号的数字文本（手写 YAML 常见），其余一律 null。 */
export function yamlNumber(node) {
    if (node === null || node === undefined || node.kind !== 'scalar' || node.value === null)
        return null;
    if (typeof node.value === 'number')
        return Number.isFinite(node.value) ? node.value : null;
    if (typeof node.value === 'boolean')
        return null;
    const text = node.value.trim();
    if (!NUMBER_TEXT.test(text))
        return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
}
/** 取行号（报错用）；节点为空返回 null。 */
export function yamlLine(node) {
    return node === null || node === undefined ? null : node.line;
}
/** 节点类型的中文名（拼错误文案用）。 */
export function yamlKindLabel(node) {
    if (node === null || node === undefined)
        return '空';
    if (node.kind === 'map')
        return '映射';
    if (node.kind === 'list')
        return '列表';
    return node.value === null ? '空值' : '标量';
}
const NUMBER_TEXT = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
function scalarNode(line, value, text, quoted) {
    return { kind: 'scalar', line, value, text, quoted };
}
function isListItem(text) {
    return text === '-' || text.startsWith('- ');
}
/** 预处理：去 tab 缩进行、去注释行、记录缩进；`---` / `...` 直接报不支持。 */
function scanSourceLines(text, issues) {
    const lines = [];
    const rawLines = text.split(/\r?\n/);
    for (let index = 0; index < rawLines.length; index += 1) {
        const number = index + 1;
        const raw = rawLines[index];
        const indentation = /^[ \t]*/.exec(raw)?.[0] ?? '';
        if (indentation.includes('\t')) {
            issues.push({ line: number, message: '不支持 tab 缩进，请改成空格（每个层级 2 个空格）' });
            continue;
        }
        const { text: body, unclosedQuote } = stripComment(raw.slice(indentation.length));
        const trimmed = body.trim();
        if (trimmed === '')
            continue;
        if (trimmed === '---' || trimmed === '...' || trimmed.startsWith('--- ') || trimmed.startsWith('... ')) {
            issues.push({ line: number, message: '不支持多文档（--- / ...），一个文件只能有一个文档' });
            continue;
        }
        if (unclosedQuote) {
            issues.push({ line: number, message: '引号未闭合：' + trimmed.slice(0, 40) });
        }
        lines.push({ number, indent: indentation.length, text: trimmed });
    }
    return lines;
}
/**
 * 去行尾注释：`#` 只在行首或前面是空白时才起注释作用，引号内的 `#` 原样保留。
 * 顺带报出引号是否未闭合（跨行字符串不支持，必须报出来而不是猜）。
 */
function stripComment(text) {
    let quote = null;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (quote === "'") {
            if (character !== "'")
                continue;
            if (text[index + 1] === "'") {
                index += 1;
                continue;
            }
            quote = null;
            continue;
        }
        if (quote === '"') {
            if (character === '\\') {
                index += 1;
                continue;
            }
            if (character === '"')
                quote = null;
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }
        if (character === '#' && (index === 0 || /\s/.test(text[index - 1]))) {
            return { text: text.slice(0, index), unclosedQuote: false };
        }
    }
    return { text, unclosedQuote: quote !== null };
}
/**
 * 找「键: 值」的分隔冒号：必须是**行内首个**后面跟空白（或行尾）的 `:`，且在引号 / flow 括号外。
 * `key:value`（冒号后无空格）按 YAML 规则是普通标量，不是映射。
 */
function splitKeyValue(text) {
    let quote = null;
    let depth = 0;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (quote === "'") {
            if (character !== "'")
                continue;
            if (text[index + 1] === "'") {
                index += 1;
                continue;
            }
            quote = null;
            continue;
        }
        if (quote === '"') {
            if (character === '\\') {
                index += 1;
                continue;
            }
            if (character === '"')
                quote = null;
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }
        if (character === '[' || character === '{') {
            depth += 1;
            continue;
        }
        if (character === ']' || character === '}') {
            depth -= 1;
            continue;
        }
        if (character !== ':' || depth !== 0)
            continue;
        if (index !== text.length - 1 && !/\s/.test(text[index + 1]))
            continue;
        const key = text.slice(0, index).trim();
        if (key === '')
            return null;
        return { key: unquoteKey(key), rest: text.slice(index + 1).trim() };
    }
    return null;
}
/** 键支持加引号（`'a b': 1`）；空键视为无法解析。 */
function unquoteKey(key) {
    if (key.length >= 2) {
        const quote = key[0];
        if ((quote === "'" || quote === '"') && key.endsWith(quote))
            return key.slice(1, -1);
    }
    return key;
}
/** 按引号外的逗号切分 flow 序列内容。 */
function splitFlowItems(text) {
    const parts = [];
    let current = '';
    let quote = null;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (quote === "'") {
            current += character;
            if (character !== "'")
                continue;
            if (text[index + 1] === "'") {
                current += text[index + 1];
                index += 1;
                continue;
            }
            quote = null;
            continue;
        }
        if (quote === '"') {
            current += character;
            if (character === '\\') {
                current += text[index + 1] ?? '';
                index += 1;
                continue;
            }
            if (character === '"')
                quote = null;
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
            current += character;
            continue;
        }
        if (character === ',') {
            parts.push(current);
            current = '';
            continue;
        }
        current += character;
    }
    parts.push(current);
    return parts;
}
function unescapeDoubleQuoted(text, line, issues) {
    let output = '';
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (character !== '\\') {
            output += character;
            continue;
        }
        const escape = text[index + 1];
        index += 1;
        if (escape === undefined) {
            issues.push({ line, message: '双引号字符串以反斜杠结尾' });
            break;
        }
        if (escape === 'n') {
            output += '\n';
            continue;
        }
        if (escape === 't') {
            output += '\t';
            continue;
        }
        if (escape === 'r') {
            output += '\r';
            continue;
        }
        if (escape === '"' || escape === '\\' || escape === '/') {
            output += escape;
            continue;
        }
        if (escape === 'u') {
            const code = text.slice(index + 1, index + 5);
            if (/^[0-9a-fA-F]{4}$/.test(code)) {
                output += String.fromCharCode(Number.parseInt(code, 16));
                index += 4;
                continue;
            }
            issues.push({ line, message: '不支持的 \\u 转义：\\u' + code });
            continue;
        }
        issues.push({ line, message: '不支持的转义写法：\\' + escape });
        output += escape;
    }
    return output;
}
function parseScalarNode(text, line, issues) {
    const trimmed = text.trim();
    const quote = trimmed[0];
    if (quote === "'" || quote === '"') {
        if (trimmed.length === 1 || !trimmed.endsWith(quote)) {
            // 未闭合的引号（含跨行字符串）：报错后按去掉引号的明文返回，绝不静默吞掉
            issues.push({ line, message: '引号未闭合：' + trimmed.slice(0, 40) });
            return scalarNode(line, trimmed.slice(1), trimmed, true);
        }
        const inner = trimmed.slice(1, -1);
        if (quote === "'")
            return scalarNode(line, inner.replace(/''/g, "'"), trimmed, true);
        return scalarNode(line, unescapeDoubleQuoted(inner, line, issues), trimmed, true);
    }
    if (trimmed === '' || trimmed === '~' || /^null$/i.test(trimmed))
        return scalarNode(line, null, trimmed, false);
    if (/^(true|false)$/i.test(trimmed))
        return scalarNode(line, trimmed.toLowerCase() === 'true', trimmed, false);
    if (NUMBER_TEXT.test(trimmed))
        return scalarNode(line, Number(trimmed), trimmed, false);
    return scalarNode(line, trimmed, trimmed, false);
}
class YamlParser {
    lines;
    issues;
    index = 0;
    constructor(lines, issues) {
        this.lines = lines;
        this.issues = issues;
    }
    /** 解析整个文档；剩余无法归属的行逐条报错（不静默丢弃）。 */
    parseDocument() {
        if (this.lines.length === 0)
            return null;
        const first = this.lines[0];
        // 顶部整体缩进是非法 YAML（会让整份文件的层级语义偏移），报出来但按实际缩进继续解析
        if (first.indent > 0) {
            this.issues.push({ line: first.number, message: '缩进层级不匹配：文档第一行不应有缩进' });
        }
        const root = this.parseBlock(first.indent);
        while (this.index < this.lines.length) {
            const line = this.lines[this.index];
            this.issues.push({ line: line.number, message: '缩进层级不匹配：这一行无法归入任何键或列表项' });
            this.index += 1;
        }
        return root;
    }
    peek() {
        return this.lines[this.index] ?? null;
    }
    parseBlock(indent) {
        const first = this.peek();
        if (first === null || first.indent < indent)
            return null;
        if (first.indent > indent) {
            // 没有父键却更深（例如顶层整体多缩进两格）：按实际缩进继续，但必须报出来
            this.issues.push({ line: first.number, message: '缩进层级不匹配：这一行没有可归属的上一级键' });
            return this.parseBlock(first.indent);
        }
        return isListItem(first.text) ? this.parseList(indent) : this.parseMap(indent);
    }
    parseMap(indent) {
        const first = this.peek();
        const node = { kind: 'map', line: first?.number ?? 1, fields: [] };
        while (true) {
            const line = this.peek();
            if (line === null || line.indent < indent)
                break;
            if (line.indent > indent) {
                this.issues.push({ line: line.number, message: '缩进层级不匹配：这一行无法归入上一个键' });
                this.index += 1;
                continue;
            }
            if (isListItem(line.text))
                break;
            if (line.text.startsWith('? ')) {
                this.issues.push({ line: line.number, message: '不支持显式键（? 键名）' });
                this.index += 1;
                continue;
            }
            const pair = splitKeyValue(line.text);
            if (pair === null) {
                this.issues.push({ line: line.number, message: '无法解析的行（既不是键值也不是列表项）：' + line.text.slice(0, 40) });
                this.index += 1;
                continue;
            }
            this.index += 1;
            this.parseFieldInto(node, pair, line.number, indent);
        }
        return node;
    }
    parseList(indent) {
        const first = this.peek();
        const node = { kind: 'list', line: first?.number ?? 1, items: [] };
        while (true) {
            const line = this.peek();
            if (line === null || line.indent !== indent || !isListItem(line.text))
                break;
            this.index += 1;
            node.items.push({ line: line.number, value: this.parseListItem(line) });
        }
        return node;
    }
    /** 列表项：`- 标量` / `- [a, b]` / `- 键: 值`（后续同级键也属于这个项）/ 裸 `-` + 缩进块。 */
    parseListItem(line) {
        const content = line.text.slice(1);
        if (content.trim() === '') {
            const next = this.peek();
            if (next !== null && next.indent > line.indent) {
                const block = this.parseBlock(next.indent);
                if (block !== null)
                    return block;
            }
            return scalarNode(line.number, null, '', false);
        }
        const contentIndent = line.indent + 1 + (content.length - content.trimStart().length);
        const body = content.trim();
        const pair = splitKeyValue(body);
        if (pair === null)
            return this.parseValueText(body, line.number, line.indent);
        const map = { kind: 'map', line: line.number, fields: [] };
        this.parseFieldInto(map, pair, line.number, contentIndent);
        while (true) {
            const next = this.peek();
            if (next === null || next.indent < contentIndent)
                break;
            if (isListItem(next.text))
                break;
            const nextPair = splitKeyValue(next.text);
            if (nextPair === null) {
                this.issues.push({ line: next.number, message: '列表项里既有键值又有裸标量，无法解析：' + next.text.slice(0, 40) });
                this.index += 1;
                continue;
            }
            this.index += 1;
            this.parseFieldInto(map, nextPair, next.number, contentIndent);
        }
        return map;
    }
    parseFieldInto(map, pair, lineNumber, indent) {
        if (pair.key === '<<') {
            this.issues.push({ line: lineNumber, message: '不支持合并键（<<）' });
            return;
        }
        const duplicate = map.fields.find((field) => field.key === pair.key);
        if (duplicate !== undefined) {
            this.issues.push({ line: lineNumber, message: '重复的键 ' + pair.key + '（第 ' + duplicate.line + ' 行已定义）：保留第一条' });
            // 仍然把值消费掉，避免下面的缩进块被当成别的键
            this.parseFieldValue(pair.rest, lineNumber, indent);
            return;
        }
        map.fields.push({ key: pair.key, line: lineNumber, value: this.parseFieldValue(pair.rest, lineNumber, indent) });
    }
    parseFieldValue(rest, lineNumber, indent) {
        if (rest === '') {
            const next = this.peek();
            if (next !== null && next.indent > indent) {
                const block = this.parseBlock(next.indent);
                // 报错行号指到「键」那一行更贴近人的定位（块内容自身的第一行在下面）
                if (block !== null)
                    return { ...block, line: lineNumber };
            }
            return scalarNode(lineNumber, null, '', false);
        }
        return this.parseValueText(rest, lineNumber, indent);
    }
    parseValueText(text, lineNumber, indent) {
        const first = text[0];
        if (first === '[')
            return this.parseFlowSequence(text, lineNumber);
        if (first === '{') {
            this.issues.push({ line: lineNumber, message: '不支持行内映射（flow mapping {…}），请改成缩进写法' });
            return scalarNode(lineNumber, null, text, false);
        }
        if (first === '|' || first === '>') {
            this.issues.push({ line: lineNumber, message: '不支持块标量（| / >），请写成单行字符串' });
            this.skipIndentedBlock(indent);
            return scalarNode(lineNumber, null, text, false);
        }
        if (first === '&') {
            this.issues.push({ line: lineNumber, message: '不支持锚点（&），请把内容直接写在该键下' });
            return scalarNode(lineNumber, null, text, false);
        }
        if (first === '*') {
            this.issues.push({ line: lineNumber, message: '不支持别名（*），请把内容直接写在该键下' });
            return scalarNode(lineNumber, null, text, false);
        }
        if (text.startsWith('---') || text.startsWith('...')) {
            this.issues.push({ line: lineNumber, message: '不支持多文档（--- / ...），一个文件只能有一个文档' });
            return scalarNode(lineNumber, null, text, false);
        }
        return parseScalarNode(text, lineNumber, this.issues);
    }
    /** 块标量的正文：整段跳过（内容无法解释，继续按 YAML 结构解析只会错得更离谱）。 */
    skipIndentedBlock(indent) {
        while (true) {
            const line = this.peek();
            if (line === null || line.indent <= indent)
                return;
            this.index += 1;
        }
    }
    parseFlowSequence(text, lineNumber) {
        const trimmed = text.trim();
        if (!trimmed.endsWith(']')) {
            this.issues.push({ line: lineNumber, message: '不支持跨行的 flow 序列（[ 必须在本行闭合）' });
            return scalarNode(lineNumber, null, trimmed, false);
        }
        const node = { kind: 'list', line: lineNumber, items: [] };
        const inner = trimmed.slice(1, -1).trim();
        if (inner === '')
            return node;
        for (const part of splitFlowItems(inner)) {
            const itemText = part.trim();
            if (itemText === '')
                continue;
            if (itemText.startsWith('[') || itemText.startsWith('{') || itemText.startsWith('&') || itemText.startsWith('*') || splitKeyValue(itemText) !== null) {
                this.issues.push({ line: lineNumber, message: '不支持嵌套 / 复杂 flow 写法：' + itemText.slice(0, 40) });
                continue;
            }
            node.items.push({ line: lineNumber, value: parseScalarNode(itemText, lineNumber, this.issues) });
        }
        return node;
    }
}
