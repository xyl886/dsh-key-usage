<div align="center">

# 使用情况 · dsh-key-usage

**DeepSeek Harness 的侧边栏用量面板** —— 按通道看 Token、缓存命中率、成本，以及余额与订阅窗口。

[![npm](https://img.shields.io/npm/v/dsh-key-usage?style=flat-square)](https://www.npmjs.com/package/dsh-key-usage)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![platform](https://img.shields.io/badge/platform-web%20%7C%20desktop-4d9fff?style=flat-square)](#兼容与运行要求)
[![node](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square)](#兼容与运行要求)
[![topic](https://img.shields.io/badge/topic-dsh--plugin-0e7490?style=flat-square)](https://github.com/topics/dsh-plugin)
[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/xyl886/dsh-key-usage)

[界面预览](#界面预览) · [安装](#安装) · [数据与权限](#数据权限与联网) · [功能](#功能) · [成本与内置价目](#成本与内置价目) · [常见问题](#常见问题) · [更新记录](./CHANGELOG.md) · [开发](#开发)

</div>

---

装上之后，左侧边栏会多一项「使用情况」，点开就是整页用量面板：**总览（Key 清单 + 活跃热力图）、使用明细、项目用量、按模型、会话用量、余额与配额**。数据全部来自你自己的机器，**默认不联网**。

和同类插件的三个区别：

- **台账 × 会话事件双源合并** —— 宿主台账停更时（很常见），没有记录的日期回退到本地会话事件折叠补齐，**按天取舍、不相加**，界面标明来源；
- **余额与订阅窗口是真·实时** —— 直接查各通道官方接口，查不到才回落本机快照，并把失败原因写在卡片上；
- **成本有据可依** —— **内置了一批厂商官方价目**（按官方文档抓取并注明日期），开箱即生效、不用你填；也可以写自己的规则覆盖它，四处成本都标来源角标，还能看到「缓存命中省了多少钱」。

## 界面预览

> 真实界面截图，**演示数据**（项目路径与部分金额已打码）。设计意图与早期原型见 [`docs/prototype/`](./docs/prototype/)（不代表当前界面）。

<p align="center">
  <img src="./docs/images/usage-overview.png" alt="总览：Key 清单与活跃热力图" width="820" />
  <br />
  <sub><b>总览</b> · Key 清单（类型 / 今日与近 30 天用量 / 余额与窗口 / 成本来源）与近 9 个月活跃热力图</sub>
</p>

<p align="center">
  <img src="./docs/images/usage-daily.png" alt="使用明细：六张统计卡、环比趋势、通道占比与每日细目" width="820" />
  <br />
  <sub><b>使用明细</b> · 六张统计卡、环比趋势对比、通道占比、按天图表与可展开的每日细目</sub>
</p>

<p align="center">
  <img src="./docs/images/按模型.png" alt="按模型：按通道 + 模型聚合，成本带来源角标" width="820" />
  <br />
  <sub><b>按模型</b> · 按「通道 + 模型」聚合调用数与 Tokens，成本带 官方 / 自定 / 官方价 / 估算 角标</sub>
</p>

<p align="center">
  <img src="./docs/images/项目总量.png" alt="项目用量：按工作目录聚合" width="820" />
  <br />
  <sub><b>项目用量</b> · 按工作目录聚合调用数、Tokens、占比与最近活跃，底部标明被隐藏的零 Token 行</sub>
</p>

<p align="center">
  <img src="./docs/images/usage-quota.png" alt="余额与配额：官方余额、订阅窗口与计费规则" width="820" />
  <br />
  <sub><b>余额与配额</b> · 官方余额、订阅窗口占用与计费规则面板</sub>
</p>

## 安装

```bash
dsh plugin --profile web add dsh-key-usage
dsh plugin --profile desktop add dsh-key-usage
```

> 桌面端 profile 受应用保护，部分版本会拒绝该命令（本机实测报 `profile "desktop" is managed exclusively by the Electron application`），此时改用应用内 **设置 → 插件 → 添加插件**。装完都要**退出并重新打开 DSH** 才生效。

## 数据、权限与联网

**读什么**

| 读取对象 | 用途 | 说明 |
| --- | --- | --- |
| `$DSH_HOME/dsh-usage/usage-ledger.json` | 用量台账 | 按天 × 通道 × 模型，含官方成本 |
| `$DSH_HOME/dsh-usage/provider-snapshots.json` | 余额 / 窗口**回落值** | 仅在实时查询失败时使用 |
| `$DSH_HOME/profiles/<profile>/cordis.yml` | 通道清单 | 只做文本提取，**不执行**其中的 `!!js`；取不到回退 `cordis.patch.yml` |
| 宿主 `sessionPersistence` 服务 | 项目 / 会话 / 单会话详情 / 按小时 | 只开只读句柄（`open("read") → read(0) → close`），不自行解压会话文件；看详情只折叠被点开的那一个会话 |
| 宿主 `credentials` 服务 / 进程环境变量 | 查余额时的 API Key | 只用于拼 `Authorization` 请求头 |
| `$DSH_HOME/dsh-key-usage/pricing-rules.yml` | 你的计费规则 | **唯一事实来源**：面板保存与手改都写它，改完刷新页面即生效 |
| profile 条目配置里的旧 `pricing` 字段（`apply(ctx, config).pricing`） | 规则**只读回退** | 只在上面那个文件不存在时才用（老用户规则不丢）；它是当年宿主设置服务写进去的，现在只读、不再写入 |

**写什么**（两处，都在 `$DSH_HOME/dsh-key-usage/`）：

- `quota-snapshots.json` —— 余额与订阅窗口的快照，每次实时查询成功即原子写（临时文件 + 改名，每通道只留最新一份）；查询失败时与宿主那份**取更新的**；
- `pricing-rules.yml` —— 你自己的计费规则（面板保存时原子写；也可以直接手改这个文件）。

两个文件都不含任何密钥；宿主的 `provider-snapshots.json` 与 profile 配置一律只读。

三条承诺：

- **不读凭据文件** —— 从不打开 `.credentials.yaml`；密钥不落盘、不进日志、不返回前端；界面只显示 `apiKeyEnv` 这类**变量名**；
- **不改宿主配置** —— 不写宿主的 `provider-snapshots.json`，不碰 profile 的 `cordis.yml` / `cordis.patch.yml`；规则写插件自己的 `pricing-rules.yml`（宿主设置服务那条链路已退役；旧版 entry config 里的规则只在文件缺失时作只读回退）；
- **仅回环** —— 所有端点只接受 `127.0.0.1` / `::1` 的请求，非回环一律 403（含写规则的 `POST`）。

**会联网的唯一路径**：打开「余额与配额」时按通道请求官方接口，结果缓存 60 秒（点「刷新」强制重查）。

| 通道 | 接口 |
| --- | --- |
| `opencode-go` | `GET https://opencode.ai/zen/go/v1/usage`（rolling / weekly / monthly） |
| `deepseek-official` | `GET {baseURL}/user/balance` |
| `openrouter` · `moonshotai` · `zai` | 各自的官方余额接口 |

请求 6 秒超时、响应上限 64 KiB、只发 `Authorization` 与 `Accept` 两个头；任何失败都回落本机快照并在卡片上写明原因（未配置 Key / 网络不可达 / 401 / 超时）。

## 功能

**总览**

- **Key 清单** —— 每通道一行：类型（按量计费 / 免费额度 / 本地端点 / 订阅制）、今日与近 30 天调用量、余额或订阅窗口占用、30 天成本（带来源角标）；
- **活跃热力图** —— 近 9 个月按日 Tokens，格子按可见区间的**活跃日五分位**分档（少 / 较少 / 中 / 较多 / 多，即 p20 / p40 / p60 / p80），悬停看当日各模型 Token 与占比。

**使用明细**

- 今日 / 周 / 月 / 总计 / 自定义范围 + 按通道筛选，全页联动；
- **六张统计卡**（调用次数、Tokens、缓存读、缓存命中率、日均 Tokens、成本）**+ 环比趋势对比**（与上一段等长范围比这四个指标，命中率按百分点计；`总计` 没有可比区间时会说明）；
- **通道占比条**、**按天 / 按小时图表**（单日范围自动切 24 小时）、**每日细目**（每天一行，表头可点击排序，可展开到模型级）。

**项目用量 · 按模型 · 会话用量**

- 分别按**工作目录**、**通道 + 模型**、**单个会话**聚合调用数 / Tokens / 占比 / 命中率 / 成本 / 最近活跃；都支持搜索、按通道筛选与排序切换；会话按日期分组，可切换显示已归档会话；
- **会话详情抽屉** —— 点会话行打开：首条**真实**提问全文、工作区、通道、首次 / 最近时间与时长、四类 tokens 与命中率、成本与来源角标、逐模型占比与成本来源，有结算样本时再给一张 **24 小时迷你图**；
- **会话列表**还能按**成本 / 命中率 / 调用数**排序；首次与最近不在同一天会标「**跨 N 天**」；每行可**展开看模型构成**（模型 · Tokens · 占比条 · 成本来源）；首屏渲染 50 条、底部「加载更多」（**没有引入任何虚拟滚动库**）；搜索覆盖标题 / **首条提问正文** / session id / 工作区；点行内的工作目录会跳到「项目用量」并**只看该项目**。

**导出**

- 上面四处都能把**当前筛选后**的数据导出为 CSV 或 JSON（CSV 带 UTF-8 BOM，Excel 打开中文不乱码）。

**余额与配额**

- 每个通道一张卡片：官方余额（如 DeepSeek 的总余额 / 赠送 / 充值）或订阅窗口占用（opencode-go 的 5 小时 / 本周 / 本月 + 重置时间）；成功带「实时」标签与查询时间，失败写明原因并回落快照。

**计费规则**（在「余额与配额」页下半部分）

- **YAML 是唯一事实来源**：规则存在 `$DSH_HOME/dsh-key-usage/pricing-rules.yml`，面板保存与手改写的是**同一个文件** —— 改完**刷新页面即生效，不需要重启宿主**；面板会显示该文件路径，解析有问题的条目**带行号列出并被跳过**（不影响其它规则）；
- **三条配价路径**（写的是同一条优先级链，你的规则覆盖内置价目）：① **什么都不用做** —— 内置官方价目自动生效、开箱即用；② **用面板** —— 表单只填 **通道 · 模型 · 币种 · 四档单价**，保存即写文件；③ **改 YAML** —— 手改 `pricing-rules.yml`，或点「让 DSH 帮我配」一键生成提示词交给 agent 去改；
- ⚠️ **面板保存是整份重写**：条目字段会按 `provider|model` 继承 `unit` / `offPeak` / `note`，但**你在 YAML 里手写的注释不会保留**（插件会写自己的头部注释）。想把「价格出处」留住，请写进 `note` 字段，或先备份文件再点保存；
- **下载规则模板** —— 客户端直接生成 YAML：预填**内置价目 ∩ 你实际用到的模型**（模型清单来自「按模型」页的数据），把你**还没有价格依据**的模型列成**注释占位**（`#   - provider: …`，故意不写成价格 0 —— 0 会被算成「免费」，比「没有依据」更糟；填好四档单价后删掉行首 `# ` 即可）；顶部注释给出字段说明与**完整的错峰写法**；
- **下载 / 复制片段** —— 缺口模型每行一键给出单条规则（缩进已按 `rules:` 下排好），规则表每行也能**复制这一条的 YAML**（含 `unit` / `offPeak` / `note`）。注意它是**片段、不是完整文档**：单独存成文件会因首行缩进报 1 条 issue，要粘到已有文件的 `rules:` 下面；文件里若还是 `rules: []`，先把它改成 `rules:` 再粘；
- **让 DSH 帮我配** —— 一键生成提示词（自动带上目标文件绝对路径与缺口模型清单，并要求核对厂商官方定价页、不许编造价格、不许用 0 占位），粘进 DSH 会话即可由 agent 直接改 YAML；也可以下载成 `.txt`；
- `unit`（计价单位）、`offPeak`（错峰窗口）、`note`（备注）**只在 YAML 里编辑**：含这些字段的已有规则会在列表里标出「含错峰窗口 … · 含单位设置：… —— 只在 YAML 里编辑」，表单里也写明「错峰价、计价单位、备注由 YAML 维护；在这里保存不会清掉它们」，面板保存**按原值写回、不会清空**（改通道 / 模型等于换主键，旧条的这三项不会跟过来）；
- **默认只显示你的通道**：规则列表按 `cordis.yml` 里配置过的通道过滤（`*` 通配规则始终显示），属于未配置通道的规则点「显示全部」即可看到；内置价目来源同样只列相关项。**过滤只是显示层，成本计算照旧用完整规则与价目**；
- 面板上同时显示内置价目的**抓取日期与距今天数**，最新一次抓取超过 **90 天**会改成警示样式并提示按官方文档复核价目。

## 成本与内置价目

**取值优先级**：`官方账单`（台账记录的厂商账单，最可信、不会被覆盖）→ `你的规则` → `内置官方价目` → `台账反推均价`；都没有则显示 `—`。

| 角标 | 含义 |
| --- | --- |
| **官方** | 台账记录的厂商账单金额 |
| **自定** | 按你自己填的计费规则算出 |
| **官方价** | 按插件**内置的官方价目**算出（自动生效，来源与抓取日期可查） |
| **估算** | 内置价目也没收录时，按台账反推的均价推算 |

**内置价目覆盖**（共 18 条，2026-10-13 抓取；数据在随包发布的 `pricing-catalog.yml`）：

| 通道 | 模型 | 币种 | 来源 |
| --- | --- | --- | --- |
| `deepseek-official` | deepseek-flash · deepseek-v4-flash · deepseek-v4-flash-vision-exp · deepseek-v4-pro | CNY | [api-docs.deepseek.com](https://api-docs.deepseek.com/zh-cn/quick_start/pricing) |
| `moonshotai` | kimi-k3 · kimi-k2.7-code · kimi-k2.7-code-highspeed · kimi-k2.6 | CNY | [platform.kimi.com](https://platform.kimi.com/docs/pricing/chat) |
| `zai` | glm-5.3 · glm-5.3-flash · glm-5.3-flashx · glm-5.2 · glm-5 | USD | [docs.z.ai](https://docs.z.ai/guides/overview/pricing) |
| `openrouter` | deepseek/deepseek-v4.1-flash · anthropic/claude-sonnet-5.5 · anthropic/claude-opus-5.5 · openai/gpt-6.1-sol · openai/gpt-6-astra | USD | [openrouter.ai](https://openrouter.ai/api/v1/models) |

- 币种按各家定价页**原样记录，不做汇率换算**：DeepSeek / Kimi 与账户币种一致（CNY），GLM / OpenRouter 为 USD；不同币种分别展示、不合计；
- **运行时不联网抓价**：价目是随包发布的静态文件 `pricing-catalog.yml`（仓库根，源码侧的读取逻辑在 `src/server/pricing-catalog.ts`），每条带来源 URL 与抓取日期，厂商调价后需人工更新；文档没写清的档位**留空而不是猜**（例如 Kimi K2 系列未公布缓存写入价 → 该档按 0 计）。想覆盖价格请写自己的规则文件，**不要改这个包内文件**（升级会被覆盖）；
- **错峰怎么算**：窗口按**本地时间**判定（`起止相同` = 全天，`from > to` = 跨午夜），每个窗口可限定**每天 / 仅工作日 / 仅周末**；只有**单日范围**会用当天的 24 小时分布算错峰占比并加权，跨天 / 会话 / 项目 / 按模型按标准价算（有意保守）。内置的 DeepSeek 价目按官方口径：**北京时间周一至周五 9:00–12:00 与 14:00–18:00 为高峰，其余（含周末全天）为空闲（半价）**；插件没有中国法定节假日日历，**节假日会按高峰价算**（金额偏高、保守），是已知近似；
- 完整明细、单位换算与全部已知近似见 [`docs/05-后续版本计划.md`](./docs/05-后续版本计划.md) 附录 A.5。

## 常见问题

<details>
<summary><b>装了新版，界面怎么还是旧的</b></summary>

宿主必须**完全退出**再重开（不是关窗口、不是刷新页面）：插件在宿主启动时组合，客户端资源也在启动时注册进内存，只替换磁盘上的包不会生效。重开后再 `Ctrl + Shift + R` 清一次浏览器缓存。桌面端用户最容易遇到 —— 重装插件也不会重新导入服务端模块。
</details>

<details>
<summary><b>Windows 上 pnpm 安装报 EPERM（无法创建符号链接）</b></summary>

未开启开发者模式时 Windows 不允许创建符号链接。本插件把唯一的宿主 peer 依赖（`@deepseek-ai/cordis`）标为 **optional**，pnpm 不会为它建链接，因此新版本不会触发这个错误（`@deepseek-ai/schemastery` 已随设置服务退役从 `peerDependencies` 移除）。

在更早的版本（≤ 0.1.4）上遇到此错误时：改用 **Plugin Hub** 安装（DSH 自带安装器不安装 peer 依赖），或开启开发者模式 / 以管理员身份运行。
</details>

<details>
<summary><b>余额卡片显示「该通道未配置 API Key」</b></summary>

需要宿主 `credentials` 能解析该通道的 `apiKeyEnv`（如 `OPENCODE_GO_API_KEY`），或该变量存在于宿主进程环境里。解析不到时插件不会去读凭据文件，而是直接回落快照。
</details>

<details>
<summary><b>填了规则但成本没变</b></summary>

规则按 `通道 id + 模型 id` 匹配（精确 → `通道+*` → `*+模型` → `*+*`）。先确认规则里的通道 / 模型 id 与页面显示一致（模型 id 可能带尾随空格，从「使用明细」复制最稳）。另外，**台账已经记录了官方成本的那些天不会被规则覆盖** —— 这是有意的。
</details>

<details>
<summary><b>成本显示为 0 / 「无计费」</b></summary>

免费额度与本地端点没有成本概念；由会话事件补位的日期、以及项目 / 会话 / 按小时视图也没有官方成本。想让它有数字，先看这个模型是否在**内置价目覆盖表**里；没覆盖就在计费规则里手填单价。
</details>

<details>
<summary><b>我在 <code>pricing-rules.yml</code> 里写的注释，保存后怎么没了</b></summary>

面板保存是**整份重写**这个文件：条目字段会按 `provider|model` 继承旧的 `unit` / `offPeak` / `note`，但**注释不保留**（插件会写自己的头部注释）。想把「价格出处」留下来，请写进 `note` 字段（表格里会原样显示），或先备份文件再点保存。只打算改价、不打算用面板的话，手改文件是安全的 —— 改完刷新页面即生效。
</details>

<details>
<summary><b>下载的「片段」单独存成文件，面板却报解析问题</b></summary>

片段是**片段、不是完整文档**：它的缩进是按 `rules:` 下方排好的，单独存成文件时解析器会报 1 条 issue（首行有缩进）。正确用法是粘到已有规则文件的 `rules:` 下面；如果文件里还是 `rules: []`，先把它改成 `rules:` 再粘。
</details>

<details>
<summary><b>会话标题怎么不是我说的第一句话</b></summary>

标题按优先级取：**宿主投影缓存里的标题 → 会话 header 自带字段 → 首条人类提问**（压平空白、截 60 字）。
teammate / 斜杠命令这类会话的首条消息是宿主注入的 `<system-reminder>`、`<command-…>`、`<local-command-…>` 文本，插件会**跳过**它继续往下找真正的人类提问；确实一句提问都没有时显示「（无提问）· <短 id>」，不会显示空标题。想看完整提问就点这一行打开详情抽屉。
</details>

<details>
<summary><b>热力图的颜色深浅怎么定</b></summary>

按可见区间内**活跃日的五分位**分档（p20 / p40 / p60 / p80），不是固定阈值 —— 这样低用量和高用量都能看出层次。
</details>

<details>
<summary><b>卸载后侧边栏还有图标</b></summary>

客户端资源需要刷新页面，服务端需要退出重开 DSH。桌面端的卸载同样在 Plugin Hub 里操作。
</details>

## 兼容与运行要求

| 项 | 要求 |
| --- | --- |
| DeepSeek Harness | 桌面端 0.2.x（客户端 slot：`sidebar.panellist` + `main`）；web profile 同样支持 |
| Node.js | ≥ 22（宿主内置） |
| 运行时依赖 | 无。`react` / `react/jsx-runtime` 由宿主注入，服务端只用 Node 内置模块（含自带的受限 YAML 子集解析器）；唯一 peer 是 `@deepseek-ai/cordis`（optional） |
| 必需服务 | 无 |
| 可选服务 | `sessionPersistence`（缺失时项目 / 会话 / 按小时为空态）、`credentials`（缺失时余额只读快照） |
| 客户端注入 | `@deepseek-ai/dsh-client-locale`、`@deepseek-ai/dsh-client-ui-slots`（计费规则改走 YAML 文件后，已不依赖 `dsh-client-ui-settings`） |
| 计费规则文件 | `$DSH_HOME/dsh-key-usage/pricing-rules.yml`（插件自己写，唯一可写目标）；内置价目是随包发布的 `pricing-catalog.yml`（只读） |

## 开发

```bash
pnpm install          # 依赖（CI 用 pnpm，见 .github/workflows/ci.yml）
pnpm run build        # 服务端 → lib/，客户端 → client/client.js（含产物头校验）
pnpm run typecheck    # 客户端 + 服务端类型检查
pnpm run test         # 13 个离线测试
pnpm run check        # lib/*.js 语法检查
pnpm run verify       # 上面全套（CI 跑的就是这条）
pnpm run pack:dry     # 发布清单自检
```

> 本目录的 `node_modules` 目前是 pnpm 10.32.1 装的；用**不同大版本**的 pnpm 执行 `pnpm run` 会触发「清空 modules 目录」而中止。此时改用 `npm run <script>`（等价），或先按 `packageManager` 字段对齐 pnpm 版本再重装依赖。

**改动生效条件**（最容易踩的坑）：

| 改动 | 生效方式 |
| --- | --- |
| `src/client/**` | `pnpm run build` → **刷新页面** |
| `src/server/**` | `pnpm run build` → **退出重开 DSH**（模块在宿主启动时进入 ESM 缓存，重装插件也不会重新导入） |

**验证安装**（**10 个只读 `GET` + 1 个写规则的 `POST`**，全部只接受回环请求；写端点只允许 `POST`，非回环 403）：

```bash
curl -s http://127.0.0.1:19387/dsh-key-usage/channels   # 返回 { channels: [...] } 即已挂载
curl -s http://127.0.0.1:19387/dsh-key-usage/pricing    # 计费契约：rules / files / issues / catalog / coverage
```

**CI**：[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) 在 push / PR 上跑 `pnpm run verify`，另加「构建产物必须与源码同步」与「发布包必须含三件套」两道闸；发布由人工触发 [`publish.yml`](./.github/workflows/publish.yml)（带 provenance 签名）。

目录结构、产物契约（`lib/` 与 `client/` 为什么必须提交、构建为什么要与机器无关）与计费规则的离线自检见 [`docs/06-开发与构建.md`](./docs/06-开发与构建.md)。

## 延伸文档

[架构与数据契约](./docs/01-架构与数据契约.md) · [原型差异清单](./docs/02-原型差异与优化清单.md) · [按 Tab 重构方案](./docs/03-按Tab拆分重构方案.md) · [会话归档的影响](./docs/04-归档会话的影响与对策.md) · [后续版本计划](./docs/05-后续版本计划.md) · [开发与构建](./docs/06-开发与构建.md) · [更新记录](./CHANGELOG.md) · [AGENTS.md](./AGENTS.md)

## 许可证

[MIT](./LICENSE) © 2026 xyl886

非官方社区插件，与 DeepSeek 无隶属关系。
