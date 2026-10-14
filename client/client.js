window.__ModuleLoader__.load({ id: "dsh-key-usage", factory: (require) => {


		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/UsageIcon.tsx
		function UsageIcon({ size = 18 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				focusable: "false",
				style: { display: "block" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.6",
						y: "8.8",
						width: "2.6",
						height: "4.2",
						rx: "0.7",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "6.7",
						y: "5.6",
						width: "2.6",
						height: "7.4",
						rx: "0.7",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "10.8",
						y: "2.8",
						width: "2.6",
						height: "10.2",
						rx: "0.7",
						fill: "currentColor"
					})
				]
			});
		}
		//#endregion
		//#region src/client/api.ts
		/**
		* 最近一次请求失败的原因，按路径记住。
		* 空态文案需要能指向「怎么做」——最常见的失败是新端点 404（服务端代码要重启宿主才生效）。
		*/
		const failureReasons = /* @__PURE__ */ new Map();
		function failureReasonOf(path) {
			return failureReasons.get(path) ?? null;
		}
		/** 404 单独说清「要重启宿主」：刷新页面不会让服务端新端点出现。 */
		function failureTextOf(status) {
			return status === 404 ? "HTTP 404：宿主没有这个端点 —— 服务端改动需要退出重开 DSH（刷新页面不够）" : "HTTP " + String(status);
		}
		async function fetchJson(path) {
			try {
				const response = await fetch(path, { headers: { Accept: "application/json" } });
				if (!response.ok) {
					failureReasons.set(path, failureTextOf(response.status));
					return null;
				}
				failureReasons.delete(path);
				return await response.json();
			} catch (error) {
				failureReasons.set(path, "请求失败：" + (error instanceof Error ? error.message : String(error)));
				return null;
			}
		}
		async function loadChannels() {
			const result = await fetchJson("/dsh-key-usage/channels");
			return result === null ? null : result.channels;
		}
		async function loadUsage(from, to, provider) {
			const params = new URLSearchParams({
				from,
				to
			});
			if (provider !== "ALL") params.set("provider", provider);
			return fetchJson("/dsh-key-usage/usage?" + params.toString());
		}
		async function loadHeatmap() {
			const result = await fetchJson("/dsh-key-usage/heatmap");
			return result === null ? null : result.days;
		}
		/**
		* 余额与订阅窗口：服务端实时优先、失败回落本机快照。
		* @param fresh - 用户手动刷新时传 true，强制重新查一次官方接口
		*/
		async function loadQuota(fresh = false) {
			const result = await fetchJson("/dsh-key-usage/quota" + (fresh ? "?fresh=1" : ""));
			return result === null ? null : result.providers;
		}
		function loadSummary() {
			return fetchJson("/dsh-key-usage/summary");
		}
		function loadSessions(limit = 300) {
			return fetchJson("/dsh-key-usage/sessions?limit=" + String(limit));
		}
		/** 单会话详情的请求路径：界面要按同一串查失败原因，所以路径由这里统一拼。 */
		function sessionDetailPath(id) {
			return "/dsh-key-usage/session?id=" + encodeURIComponent(id);
		}
		/** 单会话详情：服务端只折叠这一个会话（列表已折叠过时直接吃缓存）。 */
		function loadSessionDetail(id) {
			return fetchJson(sessionDetailPath(id));
		}
		function loadProjects(limit = 200) {
			return fetchJson("/dsh-key-usage/projects?limit=" + String(limit));
		}
		function loadModels(limit = 200) {
			return fetchJson("/dsh-key-usage/models?limit=" + String(limit));
		}
		/** 计费规则面板的服务端对照：内置价目（含逐条规则）、错峰状态、缺口覆盖度、两个 YAML 文件与解析问题。 */
		function loadPricing() {
			return fetchJson("/dsh-key-usage/pricing");
		}
		/** 保存计费规则的端点：界面按这个键取失败原因，所以路径在这里统一。 */
		const PRICING_RULES_PATH = "/dsh-key-usage/pricing/rules";
		/**
		* 整批提交规则（规则写盘的唯一入口，服务端只接受回环请求）。
		*
		* 返回 null = 请求本身失败（原因记在 `failureReasonOf(PRICING_RULES_PATH)`）；
		* 返回 `{ok:false, error}` = 服务端拒绝了这次写入（中文原因可直接展示）。
		*/
		async function savePricingRules(rules) {
			try {
				const response = await fetch(PRICING_RULES_PATH, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ rules })
				});
				if (!response.ok) {
					failureReasons.set(PRICING_RULES_PATH, failureTextOf(response.status));
					return null;
				}
				failureReasons.delete(PRICING_RULES_PATH);
				return await response.json();
			} catch (error) {
				failureReasons.set(PRICING_RULES_PATH, "请求失败：" + (error instanceof Error ? error.message : String(error)));
				return null;
			}
		}
		//#endregion
		//#region src/client/format.ts
		/** 展示层格式化：全部与统计口径无关，只负责把数字变成界面文本。 */
		/** 本地日历 `YYYY-MM-DD`。 */
		function isoDate(date) {
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return `${date.getFullYear()}-${month}-${day}`;
		}
		function shiftedIsoDate(offsetDays) {
			return isoDate(new Date(Date.now() + offsetDays * 864e5));
		}
		function fmtTokens(count) {
			if (count >= 1e9) return (count / 1e9).toFixed(2) + "B";
			if (count >= 1e6) return (count / 1e6).toFixed(1) + "M";
			if (count >= 1e3) return (count / 1e3).toFixed(0) + "K";
			return String(count);
		}
		function fmtCost(amount) {
			return "¥" + amount.toFixed(2);
		}
		function fmtCalls(count) {
			return count.toLocaleString("en-US").replace(/,/g, " ");
		}
		/** `MM-DD`（图表坐标轴与范围文案用）。 */
		function fmtShortDate(dateKey) {
			return dateKey.slice(5);
		}
		/** 毫秒时间戳 → `YYYY-MM-DD HH:mm`（本地时区）。 */
		function fmtDateTime(timeMs) {
			if (timeMs === null) return "—";
			const date = new Date(timeMs);
			const hours = String(date.getHours()).padStart(2, "0");
			const minutes = String(date.getMinutes()).padStart(2, "0");
			return `${isoDate(date)} ${hours}:${minutes}`;
		}
		/** 毫秒时间戳 → `HH:mm`。 */
		function fmtTime(timeMs) {
			if (timeMs === null) return "—";
			const date = new Date(timeMs);
			return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
		}
		/** 时长（毫秒）→ `2h 15m` / `43m` / `—`。 */
		function fmtDuration(milliseconds) {
			if (milliseconds === null || milliseconds <= 0) return "—";
			const minutes = Math.max(1, Math.round(milliseconds / 6e4));
			if (minutes < 60) return `${minutes}m`;
			return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
		}
		/** 最近活跃：刚刚 / N 分钟前 / N 小时前 / N 天前。 */
		function fmtRelative(timeMs, nowMs) {
			if (timeMs === null) return "—";
			const minutes = Math.round((nowMs - timeMs) / 6e4);
			if (minutes < 1) return "刚刚";
			if (minutes < 60) return `${minutes} 分钟前`;
			if (minutes < 1440) return `${Math.round(minutes / 60)} 小时前`;
			return `${Math.round(minutes / 1440)} 天前`;
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/shared.module.css.mjs
		const css$8 = ".d29QNW_section{box-sizing:border-box;height:100%;color:var(--dsw-alias-label-primary,#e8e8ec);padding:16px 20px 32px;font-size:13.5px;line-height:1.55;overflow-y:auto}[data-sidebar-right-open] .d29QNW_section,[data-sidebar-right-float-host] .d29QNW_section{padding:12px}.d29QNW_title{justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;font-size:18px;font-weight:650;display:flex}.d29QNW_titleActions{align-items:center;gap:8px;display:inline-flex}.d29QNW_refreshBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);cursor:pointer;background:0 0;border-radius:999px;padding:3px 12px;font-family:inherit;font-size:11.5px}.d29QNW_refreshBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_refreshBtn:disabled{opacity:.6;cursor:default}.d29QNW_tabBar{border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);flex-wrap:wrap;gap:2px;margin-bottom:18px;display:flex}.d29QNW_tabBar button{color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border:0;border-bottom:2px solid #0000;margin-bottom:-1px;padding:8px 14px;font-size:13px}.d29QNW_tabBar button:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_tabBar button.d29QNW_active{color:var(--dsw-alias-state-accent-primary,#5b8cff);border-bottom-color:var(--dsw-alias-state-accent-primary,#5b8cff);font-weight:600}.d29QNW_card{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;padding:14px 16px}.d29QNW_cardGrid3{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px;display:grid}.d29QNW_cardGrid4{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px;display:grid}.d29QNW_cardGridAuto{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:18px;display:grid}.d29QNW_cardGrid6{grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:18px;display:grid}@media (max-width:1180px){.d29QNW_cardGrid6{grid-template-columns:repeat(3,minmax(0,1fr))}}@media (max-width:720px){.d29QNW_cardGrid6,.d29QNW_cardGrid4{grid-template-columns:repeat(2,minmax(0,1fr))}}.d29QNW_statLabel{color:var(--dsw-alias-label-tertiary,#67676f);margin-bottom:6px;font-size:11.5px}.d29QNW_statValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:20px;font-weight:650}.d29QNW_statExtra{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:4px;font-size:11.5px}.d29QNW_groupLabel{color:var(--dsw-alias-label-secondary,#9a9aa6);margin:4px 0 10px;font-size:12.5px;font-weight:600}.d29QNW_blockLabel{color:var(--dsw-alias-label-secondary,#9a9aa6);margin:18px 0 4px;font-size:11.5px}.d29QNW_table{border-collapse:collapse;width:100%;margin-top:10px}.d29QNW_table th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:5px 8px;font-size:10.5px;font-weight:500}.d29QNW_table td{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);vertical-align:middle;border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:normal;overflow-wrap:anywhere;padding:7px 8px;font-size:12px}.d29QNW_table th:first-child,.d29QNW_table td:first-child{text-align:left;padding-left:0}.d29QNW_table td:first-child{color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_sortBtn{font:inherit;color:inherit;cursor:pointer;-webkit-user-select:none;user-select:none;background:0 0;border:0;align-items:center;padding:0;display:inline-flex}.d29QNW_sortBtn:hover{color:var(--dsw-alias-label-secondary,#9a9aa6)}.d29QNW_sortBtn.d29QNW_sortActiveBtn{color:var(--dsw-alias-state-accent-primary,#5b8cff)}.d29QNW_refreshBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.d29QNW_chip:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.d29QNW_sortBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.d29QNW_tabBar button:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.d29QNW_sortArrow{opacity:.8;margin-left:3px;font-size:8px}.d29QNW_table tr.d29QNW_clickable{cursor:pointer}.d29QNW_table tr.d29QNW_clickable:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.d29QNW_table tr.d29QNW_total td{color:var(--dsw-alias-label-primary,#e8e8ec);border-bottom:0;border-top:1px solid var(--dsw-alias-border-l2,#2c2c34);font-weight:600}.d29QNW_table tr.d29QNW_disabled{opacity:.55}.d29QNW_chipRow{flex-wrap:wrap;gap:8px;margin-bottom:14px;display:flex}.d29QNW_chip{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border-radius:999px;align-items:center;gap:6px;padding:5px 13px;font-size:12px;display:inline-flex}.d29QNW_chip:hover{color:var(--dsw-alias-label-primary,#e8e8ec);border-color:var(--dsw-alias-label-tertiary,#67676f)}.d29QNW_chip.d29QNW_active{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-accent-primary,#5b8cff);border-color:#5b8cff66;font-weight:600}.d29QNW_statusDot{border-radius:50%;flex-shrink:0;width:8px;height:8px;display:inline-block}.d29QNW_dim{color:var(--dsw-alias-label-tertiary,#67676f)}.d29QNW_mono{color:var(--dsw-alias-label-secondary,#9a9aa6);font-family:ui-monospace,Consolas,monospace;font-size:11px}.d29QNW_empty{color:var(--dsw-alias-label-tertiary,#67676f);padding:18px 0}.d29QNW_warning{color:var(--dsw-alias-state-warning-primary,#e0a13c);margin-bottom:10px;font-size:11.5px}.d29QNW_legend{color:var(--dsw-alias-label-tertiary,#67676f);flex-wrap:wrap;align-items:center;gap:10px;font-size:10.5px;display:inline-flex}.d29QNW_legend i{border-radius:2px;width:10px;height:10px;margin-right:3px;display:inline-block}.d29QNW_legend i.d29QNW_ghost{background:#80808c1a;border:1px solid #80808c47}.d29QNW_footnote{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);color:var(--dsw-alias-label-tertiary,#67676f);margin-top:26px;padding-top:14px;font-size:11.5px;line-height:1.8}.d29QNW_footnote b{color:var(--dsw-alias-label-secondary,#9a9aa6);font-weight:500}.d29QNW_footnoteList{margin:4px 0 0;padding-left:18px}.d29QNW_footnoteList li{margin:1px 0}.d29QNW_tooltip{z-index:9999;pointer-events:none;background:var(--dsw-alias-bg-layer-3,#232329);border:1px solid var(--dsw-alias-border-l2,#2c2c34);box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);min-width:210px;max-width:300px;color:var(--dsw-alias-label-primary,#e8e8ec);border-radius:10px;padding:10px 12px;font-family:inherit;font-size:12px;line-height:1.5;position:fixed}.d29QNW_tipTitle{margin-bottom:2px;font-size:12px;font-weight:650}.d29QNW_tipSub{color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:8px;font-size:11.5px}.d29QNW_tipRow{color:var(--dsw-alias-label-secondary,#9a9aa6);align-items:center;gap:6px;padding:2px 0;font-size:11px;display:flex}.d29QNW_tipRow i{border-radius:2px;flex-shrink:0;width:7px;height:7px}.d29QNW_tipName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.d29QNW_tipAmount{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#67676f);text-align:right;width:58px}.d29QNW_tipRate{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.d29QNW_tipBar{background:var(--dsw-alias-fill-l1,#80808c2e);border-radius:2px;height:3px;margin:1px 0 5px;overflow:hidden}.d29QNW_tipBar>i{border-radius:2px;height:100%;display:block}.d29QNW_tipDivider{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);justify-content:space-between;gap:12px;margin-top:6px;padding-top:6px;font-size:11px;display:flex}";
		const tagId$8 = "dsh-key-usage/shared.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$8) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$8;
			tag.textContent = css$8;
			document.head.appendChild(tag);
		}
		const cssRegistry$8 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$8.some((e) => e.tagId === tagId$8)) cssRegistry$8.push({
			tagId: tagId$8,
			css: css$8
		});
		var shared_module_css_default = {
			"active": "d29QNW_active",
			"blockLabel": "d29QNW_blockLabel",
			"card": "d29QNW_card",
			"cardGrid3": "d29QNW_cardGrid3",
			"cardGrid4": "d29QNW_cardGrid4",
			"cardGrid6": "d29QNW_cardGrid6",
			"cardGridAuto": "d29QNW_cardGridAuto",
			"chip": "d29QNW_chip",
			"chipRow": "d29QNW_chipRow",
			"clickable": "d29QNW_clickable",
			"dim": "d29QNW_dim",
			"disabled": "d29QNW_disabled",
			"empty": "d29QNW_empty",
			"footnote": "d29QNW_footnote",
			"footnoteList": "d29QNW_footnoteList",
			"ghost": "d29QNW_ghost",
			"groupLabel": "d29QNW_groupLabel",
			"legend": "d29QNW_legend",
			"mono": "d29QNW_mono",
			"refreshBtn": "d29QNW_refreshBtn",
			"section": "d29QNW_section",
			"sortActiveBtn": "d29QNW_sortActiveBtn",
			"sortArrow": "d29QNW_sortArrow",
			"sortBtn": "d29QNW_sortBtn",
			"statExtra": "d29QNW_statExtra",
			"statLabel": "d29QNW_statLabel",
			"statValue": "d29QNW_statValue",
			"statusDot": "d29QNW_statusDot",
			"tabBar": "d29QNW_tabBar",
			"table": "d29QNW_table",
			"tipAmount": "d29QNW_tipAmount",
			"tipBar": "d29QNW_tipBar",
			"tipDivider": "d29QNW_tipDivider",
			"tipName": "d29QNW_tipName",
			"tipRate": "d29QNW_tipRate",
			"tipRow": "d29QNW_tipRow",
			"tipSub": "d29QNW_tipSub",
			"tipTitle": "d29QNW_tipTitle",
			"title": "d29QNW_title",
			"titleActions": "d29QNW_titleActions",
			"tooltip": "d29QNW_tooltip",
			"total": "d29QNW_total",
			"warning": "d29QNW_warning"
		};
		//#endregion
		//#region src/client/tooltip.tsx
		/** 共享浮层：跟随鼠标的 fixed 层，内容用 React 节点渲染（不再拼接 innerHTML）。 */
		function useTooltip() {
			const [tooltip, setTooltip] = (0, react.useState)(null);
			return {
				tooltip,
				show: (0, react.useCallback)((event, node) => {
					setTooltip({
						x: event.clientX,
						y: event.clientY,
						node
					});
				}, []),
				hide: (0, react.useCallback)(() => setTooltip(null), [])
			};
		}
		function TooltipView({ tooltip }) {
			const elementRef = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				const element = elementRef.current;
				if (element === null || tooltip === null) return;
				const maxX = window.innerWidth - element.offsetWidth - 12;
				const maxY = window.innerHeight - element.offsetHeight - 12;
				element.style.left = Math.max(8, Math.min(tooltip.x + 14, maxX)) + "px";
				element.style.top = Math.max(8, Math.min(tooltip.y + 14, maxY)) + "px";
			}, [tooltip]);
			if (tooltip === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: elementRef,
				className: shared_module_css_default.tooltip,
				children: tooltip.node
			});
		}
		function TipTitle({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.tipTitle,
				children
			});
		}
		function TipSub({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.tipSub,
				children
			});
		}
		function TipRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.tipRow,
				children: [
					props.color !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: props.color } }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: shared_module_css_default.tipName,
						children: props.label
					}),
					props.amount !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: shared_module_css_default.tipAmount,
						children: props.amount
					}),
					props.rate !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: shared_module_css_default.tipRate,
						children: props.rate
					})
				]
			});
		}
		function TipBar({ percent, color }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.tipBar,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
					width: Math.max(2, percent) + "%",
					background: color
				} })
			});
		}
		function TipDivider({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.tipDivider,
				children
			});
		}
		//#endregion
		//#region src/client/channels.ts
		const CHANNEL_COLORS = [
			"#5b8cff",
			"#9a7bff",
			"#3fb96f",
			"#e0a13c",
			"#e05a5a",
			"#38bdc8"
		];
		function channelIndexOf(channels, provider) {
			return channels.findIndex((channel) => channel.provider === provider);
		}
		function channelColorOf(channels, provider) {
			const index = channelIndexOf(channels, provider);
			return CHANNEL_COLORS[(index >= 0 ? index : 0) % CHANNEL_COLORS.length];
		}
		function displayNameOf(channels, provider) {
			return channels.find((channel) => channel.provider === provider)?.displayName ?? provider;
		}
		function channelOf(channels, provider) {
			if (provider === null) return null;
			return channels.find((channel) => channel.provider === provider) ?? null;
		}
		/** 成本单元格：按计费模式给出文案，无法判定时回落金额或 —。 */
		function costCellText(channel, cost) {
			if (channel === null) return cost > 0 ? {
				text: "¥" + cost.toFixed(2),
				dim: false
			} : {
				text: "—",
				dim: true
			};
			if (channel.costMode === "sub") return {
				text: "订阅内",
				dim: true
			};
			if (channel.costMode === "free") return {
				text: "¥0.00",
				dim: true
			};
			if (channel.costMode === "none") return {
				text: "无计费",
				dim: true
			};
			return cost > 0 ? {
				text: "¥" + cost.toFixed(2),
				dim: false
			} : {
				text: "—",
				dim: true
			};
		}
		/**
		* 单元格是否该挂来源角标：只有真的显示了金额（`¥…`）时才挂，
		* `订阅内` / `免费` / `无计费` / `—` 都是占位文案，挂角标只是噪音。
		*/
		function showsAmount(cell) {
			return cell.text.startsWith("¥");
		}
		/** 状态点的颜色（走宿主告警/成功令牌）。 */
		function statusColorOf(status) {
			if (status === "ok") return "var(--dsw-alias-state-success-primary, #3fb96f)";
			if (status === "warn") return "var(--dsw-alias-state-warning-primary, #e0a13c)";
			if (status === "danger") return "var(--dsw-alias-state-danger-primary, #e05a5a)";
			return "var(--dsw-alias-label-tertiary, #67676f)";
		}
		/** 窗口占用进度条颜色：≥90 危险、≥60 警告，其余正常。 */
		function quotaBarColor(percent) {
			if (percent >= 90) return "var(--dsw-alias-state-danger-primary, #e05a5a)";
			if (percent >= 60) return "var(--dsw-alias-state-warning-primary, #e0a13c)";
			return "var(--dsw-alias-state-success-primary, #3fb96f)";
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/overview.module.css.mjs
		const css$7 = ".tXjxsq_keyTable{border-collapse:collapse;width:100%}.tXjxsq_keyTable th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:6px 10px;font-size:10.5px;font-weight:500}.tXjxsq_keyTable th:first-child{text-align:left;padding-left:0}.tXjxsq_keyTable td{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);border-bottom:1px solid var(--dsw-alias-fill-l1,#80808c1f);white-space:nowrap;padding:10px;font-size:12.5px}.tXjxsq_keyTable td:first-child{text-align:left;padding-left:0}.tXjxsq_keyTable tr:last-child td{border-bottom:0}.tXjxsq_keyTable tbody tr.tXjxsq_clickable{cursor:pointer}.tXjxsq_keyTable tbody tr.tXjxsq_clickable:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.tXjxsq_keyTable tr.tXjxsq_disabledRow{opacity:.55}.tXjxsq_cellKey{align-items:center;gap:10px;display:flex}.tXjxsq_keyDisplay{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:13px;font-weight:600}.tXjxsq_keyEnv{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:1px;font-family:ui-monospace,Consolas,monospace;font-size:10px}.tXjxsq_tag{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);background:var(--dsw-alias-bg-layer-2,#1d1d22);border-radius:5px;padding:1px 7px;font-size:10.5px;display:inline-block}.tXjxsq_tag.tXjxsq_free{color:var(--dsw-alias-state-success-primary,#3fb96f);border-color:#3fb96f59}.tXjxsq_tag.tXjxsq_sub{color:var(--dsw-alias-state-accent-primary,#5b8cff);border-color:#5b8cff59}.tXjxsq_tag.tXjxsq_off{color:var(--dsw-alias-label-tertiary,#67676f)}.tXjxsq_rowLink{color:var(--dsw-alias-label-tertiary,#67676f);font-size:11px}.tXjxsq_keyTable tbody tr.tXjxsq_clickable:hover .tXjxsq_rowLink{color:var(--dsw-alias-state-accent-primary,#5b8cff)}.tXjxsq_quotaCell{align-items:center;gap:8px;display:inline-flex}.tXjxsq_miniBar{background:var(--dsw-alias-fill-l2,#80808c2e);border-radius:3px;flex-shrink:0;width:64px;height:5px;overflow:hidden}.tXjxsq_miniBar>i{border-radius:3px;height:100%;display:block}.tXjxsq_quotaText{text-align:left;min-width:74px}.tXjxsq_quotaText.tXjxsq_warn{color:var(--dsw-alias-state-warning-primary,#e0a13c);font-weight:600}.tXjxsq_quotaText.tXjxsq_danger{color:var(--dsw-alias-state-danger-primary,#e05a5a);font-weight:600}.tXjxsq_quotaText.tXjxsq_dim{color:var(--dsw-alias-label-tertiary,#67676f)}.tXjxsq_heatmapCard{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;margin-top:24px;padding:14px 16px}.tXjxsq_heatmapHead{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:10px;display:flex}.tXjxsq_heatmapTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:11.5px}.tXjxsq_heatmapScroll{padding-bottom:4px;overflow-x:auto}.tXjxsq_heatmapBody{gap:6px;width:max-content;display:flex}.tXjxsq_heatWeekdays{flex-direction:column;flex-shrink:0;gap:3px;display:flex}.tXjxsq_heatWeekdays span{color:var(--dsw-alias-label-tertiary,#67676f);text-align:right;width:13px;height:28px;font-size:9.5px;line-height:28px}.tXjxsq_heatGridCol{flex-direction:column;display:flex}.tXjxsq_heatGrid{gap:3px;display:flex}.tXjxsq_heatWeek{flex-direction:column;gap:3px;display:flex}.tXjxsq_heatCell{box-sizing:border-box;background:var(--dsw-alias-fill-l1,#80808c2e);cursor:default;border-radius:5px;flex-shrink:0;width:28px;height:28px}.tXjxsq_heatCell.tXjxsq_idle{background:#80808c38}.tXjxsq_heatCell.tXjxsq_empty{background:#80808c1a;box-shadow:inset 0 0 0 1px #80808c47}.tXjxsq_heatMonths{gap:3px;margin-top:6px;display:flex}.tXjxsq_heatMonths span{width:28px;color:var(--dsw-alias-label-tertiary,#67676f);text-align:left;white-space:nowrap;flex-shrink:0;font-size:10px}";
		const tagId$7 = "dsh-key-usage/overview.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$7;
			document.head.appendChild(tag);
		}
		const cssRegistry$7 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$7.some((e) => e.tagId === tagId$7)) cssRegistry$7.push({
			tagId: tagId$7,
			css: css$7
		});
		var overview_module_css_default = {
			"cellKey": "tXjxsq_cellKey",
			"clickable": "tXjxsq_clickable",
			"danger": "tXjxsq_danger",
			"dim": "tXjxsq_dim",
			"disabledRow": "tXjxsq_disabledRow",
			"empty": "tXjxsq_empty",
			"free": "tXjxsq_free",
			"heatCell": "tXjxsq_heatCell",
			"heatGrid": "tXjxsq_heatGrid",
			"heatGridCol": "tXjxsq_heatGridCol",
			"heatMonths": "tXjxsq_heatMonths",
			"heatWeek": "tXjxsq_heatWeek",
			"heatWeekdays": "tXjxsq_heatWeekdays",
			"heatmapBody": "tXjxsq_heatmapBody",
			"heatmapCard": "tXjxsq_heatmapCard",
			"heatmapHead": "tXjxsq_heatmapHead",
			"heatmapScroll": "tXjxsq_heatmapScroll",
			"heatmapTitle": "tXjxsq_heatmapTitle",
			"idle": "tXjxsq_idle",
			"keyDisplay": "tXjxsq_keyDisplay",
			"keyEnv": "tXjxsq_keyEnv",
			"keyTable": "tXjxsq_keyTable",
			"miniBar": "tXjxsq_miniBar",
			"off": "tXjxsq_off",
			"quotaCell": "tXjxsq_quotaCell",
			"quotaText": "tXjxsq_quotaText",
			"rowLink": "tXjxsq_rowLink",
			"sub": "tXjxsq_sub",
			"tag": "tXjxsq_tag",
			"warn": "tXjxsq_warn"
		};
		//#endregion
		//#region src/client/components/Heatmap.tsx
		/**
		* 活跃热力图：最近约 9 个月的滚动窗口（含未来格占位）。
		* 强度分档取活跃日的五分位（p20 / p40 / p60 / p80），阈值随可见区间自动变化，
		* 具体数值并入页面底部的口径说明，不再单独占一行。
		* 格子用固定方形尺寸 + 横向滚动，保证「有数据 / 无数据 / 无用量」三类格子完全等大。
		*/
		const DAY_MS$1 = 864e5;
		function levelThresholds(days) {
			const active = days.map((day) => day.totalTokens).filter((tokens) => tokens > 0).sort((first, second) => first - second);
			if (active.length < 5) return [
				1e7,
				3e7,
				6e7,
				15e7
			];
			const pick = (fraction) => active[Math.min(active.length - 1, Math.floor(active.length * fraction))];
			return [
				pick(.2),
				pick(.4),
				pick(.6),
				pick(.8)
			];
		}
		function levelOf(tokens, thresholds) {
			if (tokens <= 0) return 0;
			let level = 1;
			for (const threshold of thresholds) if (tokens >= threshold) level += 1;
			return level;
		}
		/** 五档由浅到深，末档用满色；灰色是「无用量」，与「无数据」的 ghost 区分。 */
		const LEVEL_COLORS = [
			"rgba(128,128,140,.22)",
			"rgba(91,140,255,.18)",
			"rgba(91,140,255,.36)",
			"rgba(91,140,255,.56)",
			"rgba(91,140,255,.78)",
			"#5b8cff"
		];
		function Heatmap(props) {
			const { days, channels, tooltip } = props;
			const heatmapByDate = (0, react.useMemo)(() => new Map(days.map((day) => [day.date, day])), [days]);
			const thresholds = (0, react.useMemo)(() => levelThresholds(days), [days]);
			const { columns, monthLabels } = (0, react.useMemo)(() => {
				const today = /* @__PURE__ */ new Date();
				today.setHours(0, 0, 0, 0);
				const endSaturday = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS$1);
				const start = /* @__PURE__ */ new Date(endSaturday.getTime() - 272 * DAY_MS$1);
				const dataStart = days.length > 0 ? days[0].date : null;
				const cells = [];
				for (let offset = 0; offset < 273; offset += 1) {
					const date = new Date(start.getTime() + offset * DAY_MS$1);
					const dateKey = isoDate(date);
					if (date.getTime() > today.getTime()) {
						cells.push({
							date: dateKey,
							state: "future",
							level: 0
						});
						continue;
					}
					if (dataStart === null || dateKey < dataStart) {
						cells.push({
							date: dateKey,
							state: "empty",
							level: 0
						});
						continue;
					}
					const day = heatmapByDate.get(dateKey);
					if (day === void 0 || day.totalTokens <= 0) {
						cells.push({
							date: dateKey,
							state: "idle",
							level: 0
						});
						continue;
					}
					cells.push({
						date: dateKey,
						state: "active",
						level: levelOf(day.totalTokens, thresholds)
					});
				}
				const weeks = [];
				for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
				const labels = [];
				let previousMonth = -1;
				for (const week of weeks) {
					const month = Number(week[0].date.slice(5, 7));
					labels.push(month !== previousMonth ? month + "月" : "");
					previousMonth = month;
				}
				return {
					columns: weeks,
					monthLabels: labels
				};
			}, [days, heatmapByDate]);
			const activeDays = columns.reduce((count, week) => count + week.filter((cell) => cell.state === "active").length, 0);
			const scrollRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const node = scrollRef.current;
				if (node === null) return;
				node.scrollLeft = node.scrollWidth - node.clientWidth;
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: overview_module_css_default.heatmapCard,
				role: "img",
				"aria-label": "活跃热力图：近 9 个月，共 " + String(activeDays) + " 个活跃日；每格代表一天的 Tokens 总量，颜色越深用量越高。逐格明细请查看「使用明细」页的按天图表与每日细目。",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: overview_module_css_default.heatmapHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: overview_module_css_default.heatmapTitle,
						children: "活跃热力图 · 近 9 个月 · 按当日 Tokens 总量 · 悬停查看当日各模型占比"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: shared_module_css_default.legend,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "ghost" }), "无数据"] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[0] } }), "无用量"] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[1] } }), "少"] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[2] } }), "较少"] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[3] } }), "中"] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[4] } }), "较多"] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[5] } }), "多"] })
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: overview_module_css_default.heatmapScroll,
					ref: scrollRef,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.heatmapBody,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: overview_module_css_default.heatWeekdays,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "日" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "一" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "二" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "三" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "四" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "五" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "六" })
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: overview_module_css_default.heatGridCol,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: overview_module_css_default.heatGrid,
								children: columns.map((week, weekIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: overview_module_css_default.heatWeek,
									children: week.map((cell) => {
										const day = cell.state === "active" ? heatmapByDate.get(cell.date) : void 0;
										const className = cell.state === "active" ? overview_module_css_default.heatCell : cell.state === "idle" ? overview_module_css_default.heatCell + " " + overview_module_css_default.idle : overview_module_css_default.heatCell + " " + overview_module_css_default.empty;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className,
											style: cell.state === "active" ? { background: LEVEL_COLORS[cell.level] } : void 0,
											onMouseMove: (event) => tooltip.show(event, tipOf(cell, day, channels)),
											onMouseLeave: tooltip.hide
										}, cell.date);
									})
								}, weekIndex))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: overview_module_css_default.heatMonths,
								children: monthLabels.map((label, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }, index))
							})]
						})]
					})
				})]
			});
		}
		function tipOf(cell, day, channels) {
			if (cell.state !== "active" || day === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: cell.date }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: cell.state === "idle" ? "当日无用量记录" : "台账尚未覆盖" })] });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: cell.date }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
					"合计 ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtTokens(day.totalTokens) }),
					" tokens"
				] }),
				day.models.map((model) => {
					const percent = day.totalTokens > 0 ? Math.round(model.totalTokens / day.totalTokens * 100) : 0;
					const color = channelColorOf(channels, model.provider);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
						color,
						label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [model.model, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: shared_module_css_default.dim,
							children: [" · ", displayNameOf(channels, model.provider)]
						})] }),
						amount: fmtTokens(model.totalTokens),
						rate: percent + "%"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipBar, {
						percent,
						color
					})] }, model.provider + "|" + model.model);
				})
			] });
		}
		//#endregion
		//#region src/client/pricing.ts
		/**
		* 客户端计费规则视图模型：响应类型、文案、表单校验与 YAML 文本生成。
		*
		* 规则的唯一事实来源是用户 YAML 文件（路径见 `/pricing` 的 `files.user.path`）：客户端只读 `/pricing`、
		* 只经 `POST /pricing/rules` 整批提交，**不自己写文件**（服务端写盘时会按 provider|model 继承旧条目的
		* unit / offPeak / note，客户端拼 YAML 反而会把这三项丢掉）。
		*
		* 面板表单只编辑 通道 / 模型 / 币种 / 四档单价；unit（计价单位）、offPeak（错峰窗口）、note（备注）
		* 只由用户在 YAML 里维护。这里另外负责生成给人 / agent 看的 YAML 文本（规则模板、单条片段）
		* 与「让 DSH 帮我配」的提示词 —— 生成物必须是服务端受限 YAML 子集能读回的写法。
		* 定价算法在服务端（src/server/pricing.ts），界面不重复实现。
		*/
		const COST_SOURCE_LABELS = {
			official: "官方",
			rule: "自定",
			catalog: "官方价",
			estimate: "估算",
			none: "—"
		};
		/** 角标的悬浮说明：让「估算」不会被当成账单金额用。 */
		const COST_SOURCE_HINTS = {
			official: "官方：台账记录的厂商账单金额",
			rule: "自定：按你维护的计费规则算出",
			catalog: "官方价：按插件内置的厂商官方价目算出（可查来源；你的规则优先于它）",
			estimate: "估算：按台账反推的均价推算",
			none: "没有价格依据（未配置规则，台账也无成本数据）"
		};
		const UNIT_LABELS = {
			perMillionTokens: "每百万 tokens",
			perThousandTokens: "每千 tokens",
			perCall: "每次调用"
		};
		const CURRENCY_OPTIONS = ["CNY", "USD"];
		const RULES_ORIGIN_TEXT = {
			file: "规则来自你的 YAML 文件",
			legacy: "规则还是旧设置服务里的历史值，还没落盘成 YAML —— 在面板上保存一次就会写进文件",
			none: "还没有用户规则：成本按内置官方价目与台账均价算"
		};
		/** 表单外的三个字段只能在 YAML 里维护，界面上必须有一句明示，否则用户以为保存会把它们清掉。 */
		const FORM_EXTRAS_HINT = "错峰价、计价单位、备注由 YAML 维护；在这里保存不会清掉它们。";
		/** 表单缺省单位：列表里只有「非缺省」才提示单位设置，避免每行都挂一句。 */
		const DEFAULT_UNIT = "perMillionTokens";
		/** 币种符号；未知币种保留代码前缀，避免把 USD 当 CNY 渲染。 */
		function currencySymbolOf(currency) {
			if (currency === "CNY") return "¥";
			if (currency === "USD") return "$";
			return currency + " ";
		}
		/** 金额一律两位小数；服务端给的 4 位是计算精度，不是展示精度。 */
		const AMOUNT_DIGITS = 2;
		/** 金额文本：币种符号 + 两位小数（多处展示共用，避免精度不一致）。 */
		function moneyTextOf(currency, amount) {
			return currencySymbolOf(currency) + amount.toFixed(AMOUNT_DIGITS);
		}
		/** 抓取日期（`YYYY-MM-DD`，本地日历日）距今天数；解析不出返回 null。 */
		function fetchedDaysAgo(fetchedAt, now = /* @__PURE__ */ new Date()) {
			const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fetchedAt.trim());
			if (match === null) return null;
			const fetched = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
			if (!Number.isFinite(fetched)) return null;
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
			return Math.max(0, Math.round((today - fetched) / 864e5));
		}
		/** 最新一次抓取距今的天数；没有可解析的日期、或还没超过阈值时返回 null。 */
		function catalogStaleDays(sources, now = /* @__PURE__ */ new Date()) {
			const days = sources.map((entry) => fetchedDaysAgo(entry.fetchedAt, now)).filter((day) => day !== null);
			if (days.length === 0) return null;
			const newest = Math.min(...days);
			return newest > 90 ? newest : null;
		}
		function ruleKeyOf(rule) {
			return rule.provider + "|" + rule.model;
		}
		function ruleLabelOf(rule) {
			const model = rule.model === "*" ? "全部模型" : rule.model;
			return (rule.provider === "*" ? "任意通道" : rule.provider) + " · " + model;
		}
		/** 错峰窗口文案：`09:00–12:00、14:00–18:00`；带 `days` 的窗口补一个「（工作日）」之类的后缀。 */
		function offPeakWindowsText(rule) {
			if (rule.offPeak === null || rule.offPeak.windows.length === 0) return "";
			return rule.offPeak.windows.map((window) => {
				const base = window.from + "–" + window.to;
				const suffix = dayScopeSuffixOf(window.days);
				return suffix === "" ? base : base + "（" + suffix + "）";
			}).join("、");
		}
		const DAY_SCOPE_LABELS = {
			every: "每天",
			weekday: "仅工作日",
			weekend: "仅周末"
		};
		/** 已保存的 `days` → 展示取值；非法值一律当「每天」（与服务端容错口径一致）。 */
		function dayScopeOf(days) {
			const normalized = normalizeDays(days);
			if (normalized === void 0) return "every";
			const key = normalized.join(",");
			if (key === "1,2,3,4,5") return "weekday";
			if (key === "6,7") return "weekend";
			return "every";
		}
		/** `days` 的简短说明；缺省或非三名组合返回空串（表示「每天」）。 */
		function dayScopeSuffixOf(days) {
			const scope = dayScopeOf(days);
			return scope === "every" ? "" : DAY_SCOPE_LABELS[scope];
		}
		/**
		* `days` 归一：只接受 1–7 的整数、去重排序；非法值返回 undefined = 每天适用。
		* 与服务端同一口径：非法值不整段作废，避免金额突然变高。
		*/
		function normalizeDays(raw) {
			if (!Array.isArray(raw)) return void 0;
			const days = /* @__PURE__ */ new Set();
			for (const entry of raw) {
				if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 1 || entry > 7) continue;
				days.add(entry);
			}
			if (days.size === 0) return void 0;
			return [...days].sort((first, second) => first - second);
		}
		/**
		* 列表里的「只在 YAML 里维护」提示：表单只改 通道 / 模型 / 币种 / 四档单价，
		* 但已有规则的错峰与单位仍然生效 —— 必须显式标出来，否则用户会以为这些数据丢了。
		*/
		function ruleExtrasTextOf(rule) {
			const extras = [];
			if (rule.offPeak !== null) extras.push("含错峰窗口 " + offPeakWindowsText(rule));
			if (rule.unit !== "perMillionTokens") extras.push("含单位设置：" + UNIT_LABELS[rule.unit]);
			return extras.length === 0 ? "" : extras.join(" · ") + " —— 只在 YAML 里编辑";
		}
		/** 模型 id 归一：去掉 `vendor/` 前缀并转小写（与服务端内置价目的保守匹配同一口径）。 */
		function normalizeModelId(model) {
			const trimmed = model.trim();
			const slash = trimmed.lastIndexOf("/");
			return (slash >= 0 ? trimmed.slice(slash + 1) : trimmed).toLowerCase();
		}
		/**
		* 内置价目匹配（顺序与服务端一致）：
		* 精确 → 忽略大小写 → 去 `vendor/` 前缀 → 该通道通配；不做模糊匹配。
		*/
		function catalogRuleFor(catalogRules, provider, model) {
			const wantedProvider = normalizeModelId(provider);
			const wantedModel = normalizeModelId(model);
			const tiers = [
				(rule) => rule.provider === provider && rule.model === model,
				(rule) => normalizeModelId(rule.provider) === wantedProvider && normalizeModelId(rule.model) === wantedModel,
				(rule) => normalizeModelId(rule.provider) === wantedProvider && rule.model === "*"
			];
			for (const matches of tiers) {
				const hit = catalogRules.find(matches);
				if (hit !== void 0) return hit;
			}
			return null;
		}
		/** 与服务端 matchPricingRule 同序的粗判：精确 → 通道通配 → 模型通配 → 全通配。 */
		function matchesAnyRule(rules, provider, model) {
			return [
				(rule) => rule.provider === provider && rule.model === model,
				(rule) => rule.provider === provider && rule.model === "*",
				(rule) => rule.provider === "*" && rule.model === model,
				(rule) => rule.provider === "*" && rule.model === "*"
			].some((matches) => rules.some(matches));
		}
		/**
		* 「没有价格依据」的模型：用户的模型 − 用户规则 − 内置价目。
		* 逐模型判定优先用 `/models` 的 `costSource`（就是成本单元格上那个角标，口径一致），
		* 角标缺失（旧响应）时退回本地规则匹配，避免整块不显示。
		*/
		function unpricedModelsOf(rows, rules, catalogRules) {
			const used = (rows ?? []).filter((row) => row.tokens > 0);
			if (used.length === 0) return [];
			const uncovered = used.filter((row) => {
				if (row.costSource === "rule" || row.costSource === "official" || row.costSource === "catalog") return false;
				return row.costSource === "estimate" || row.costSource === "none" || !matchesAnyRule(rules, row.provider, row.model) && catalogRuleFor(catalogRules, row.provider, row.model) === null;
			});
			const total = uncovered.reduce((sum, row) => sum + row.tokens, 0);
			if (total <= 0) return [];
			return uncovered.map((row) => ({
				provider: row.provider,
				model: row.model,
				tokens: row.tokens,
				share: row.tokens / total,
				estimated: row.costSource === "estimate"
			})).sort((first, second) => second.tokens - first.tokens);
		}
		/** 单价全为 0 的规则会把成本算成免费，保存前必须拦住。 */
		function ruleProblemOf(rule) {
			const values = [
				rule.input,
				rule.cacheRead,
				rule.cacheWrite,
				rule.output
			];
			if (values.every((value) => value === 0)) return "四档单价全为 0 会算成免费，至少填一个";
			if (values.some((value) => !Number.isFinite(value) || value < 0)) return "单价必须是不小于 0 的数字";
			if (rule.provider.trim() === "") return "通道 id 不能为空（要匹配任意通道请填 *）";
			if (rule.model.trim() === "") return "模型 id 不能为空（要匹配该通道全部模型请填 *）";
			return null;
		}
		/** 新增规则的初始值：全 0 单价会算成免费，因此先挡在保存之前（见 `ruleProblemOf`）。 */
		function blankRule(currency) {
			return {
				provider: "*",
				model: "*",
				unit: DEFAULT_UNIT,
				currency,
				input: 0,
				cacheRead: 0,
				cacheWrite: 0,
				output: 0,
				offPeak: null,
				note: ""
			};
		}
		/**
		* 提交给 `POST /pricing/rules` 的那 7 个字段。
		* 不带 unit / offPeak / note：服务端写盘时按 provider|model 从文件旧值继承，客户端传了反而可能覆盖掉。
		*/
		function submittableRuleOf(rule) {
			return {
				provider: rule.provider.trim(),
				model: rule.model.trim(),
				currency: rule.currency,
				input: rule.input,
				cacheRead: rule.cacheRead,
				cacheWrite: rule.cacheWrite,
				output: rule.output
			};
		}
		/** YAML 标量：字符串一律单引号（裸 `*` 会被当成别名报错），内部单引号翻倍转义。 */
		function yamlText(value) {
			return "'" + value.replace(/'/g, "''") + "'";
		}
		/** 数字不加引号；非有限值按 0 兜底（表单已经拦过，这里只保证不生成非法文本）。 */
		function yamlNumberText(value) {
			return Number.isFinite(value) && value >= 0 ? String(value) : "0";
		}
		function padOf(indent) {
			return " ".repeat(Math.max(0, indent));
		}
		/** 一条规则的块映射行（不含 `- ` 前缀）；`indent` 是第一个键的缩进。 */
		function ruleFieldLines(rule, indent) {
			const pad = padOf(indent);
			const lines = [
				pad + "provider: " + yamlText(rule.provider),
				pad + "model: " + yamlText(rule.model),
				pad + "unit: " + yamlText(rule.unit),
				pad + "currency: " + yamlText(rule.currency),
				pad + "input: " + yamlNumberText(rule.input),
				pad + "cacheRead: " + yamlNumberText(rule.cacheRead),
				pad + "cacheWrite: " + yamlNumberText(rule.cacheWrite),
				pad + "output: " + yamlNumberText(rule.output)
			];
			if (rule.note.trim() !== "") lines.push(pad + "note: " + yamlText(rule.note));
			if (rule.offPeak !== null && rule.offPeak.windows.length > 0) {
				lines.push(pad + "offPeak:");
				lines.push(pad + "  windows:");
				for (const window of rule.offPeak.windows) {
					lines.push(pad + "    - from: " + yamlText(window.from));
					lines.push(pad + "      to: " + yamlText(window.to));
					const days = normalizeDays(window.days);
					if (days !== void 0) lines.push(pad + "      days: [" + days.join(", ") + "]");
				}
				lines.push(pad + "  input: " + yamlNumberText(rule.offPeak.input));
				lines.push(pad + "  cacheRead: " + yamlNumberText(rule.offPeak.cacheRead));
				lines.push(pad + "  cacheWrite: " + yamlNumberText(rule.offPeak.cacheWrite));
				lines.push(pad + "  output: " + yamlNumberText(rule.offPeak.output));
			}
			return lines;
		}
		/** 规则作为 `rules:` 下的一项：`- provider: …`，后续键与首键内容对齐（服务端按 2 空格层级解析）。 */
		function ruleBlockLines(rule, indent) {
			const [first, ...rest] = ruleFieldLines(rule, indent + 2);
			return [padOf(indent) + "- " + first.trimStart(), ...rest];
		}
		/** 把若干行整段注释掉（注释行会被解析器丢弃，因此不会影响文档结构）。 */
		function commentOut(lines) {
			return lines.map((line) => line.trim() === "" ? "#" : "# " + line);
		}
		/** 下载用的文件名里不能带空格与路径分隔符：通道 / 模型 id（如 openrouter 的 `vendor/model`）要压平。 */
		function fileSafeOf(text) {
			return text.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "rule";
		}
		/** 模板 / 片段的公共注释头：讲清文件的作用与能用的写法，避免用户写出解析器不认的语法。 */
		function headerComments(extra) {
			return [
				"# dsh-key-usage 计费规则（YAML 是唯一事实来源）",
				"# 作用：这份文本用于手改或交给 agent 填价，改完保存到面板上显示的「用户规则文件」路径即可。",
				"# 允许的写法：2 空格缩进的块映射、`- ` 块序列、单行 `key: value`、短数组 `[1, 2]`；",
				"#            不要用 tab、花括号 `{}`、锚点 `&` / 别名 `*`、块标量 `|` / `>`、`---`。",
				"# 四档单价顺序：输入 / 缓存读 / 缓存写 / 输出；单位缺省是每百万 tokens（unit: perMillionTokens）。",
				"# 错峰窗口（面板表单不提供，只能在 YAML 里改）写法：",
				"#   offPeak:",
				"#     windows:",
				"#       - from: '00:30'",
				"#         to: '08:30'",
				"#     input: 0.5",
				"#     cacheRead: 0.05",
				"#     cacheWrite: 0.5",
				"#     output: 1",
				...extra
			];
		}
		/**
		* 「下载规则模板」：注释头 + 用户近期用到的模型 ∩ 内置官方价目（价格预填）+ 没有价格依据的待填条目。
		*
		* 待填条目整段注释掉：写 0 会把这批用量算成免费（比「没有依据」更糟），写成 null 会被解析器判为缺字段，
		* 所以注释占位、填好单价后删掉行首的 `# ` 才是安全路径。
		*/
		function buildRulesTemplateYaml(catalog, usedModels, userRules, uncovered, currency) {
			const catalogRules = catalog?.rules ?? [];
			const prefilled = [];
			const seen = /* @__PURE__ */ new Set();
			for (const used of usedModels) {
				if (matchesAnyRule(userRules, used.provider, used.model)) continue;
				const hit = catalogRuleFor(catalogRules, used.provider, used.model);
				if (hit === null) continue;
				const key = ruleKeyOf(hit);
				if (seen.has(key)) continue;
				seen.add(key);
				prefilled.push(hit);
			}
			const body = ["version: 1", "currency: " + yamlText(currency)];
			if (prefilled.length === 0) body.push("rules: []");
			else {
				body.push("rules:");
				for (const rule of prefilled) body.push(...ruleBlockLines(rule, 2));
			}
			const pending = [];
			if (uncovered.length > 0) {
				pending.push("", "# ---- 以下模型还没有价格依据（近 30 天用到，但既没有规则也没命中内置价目）----");
				pending.push("# 填好四档单价后，把每条开头的「# 」删掉即可；不要用 0 占位 —— 0 会把这批用量算成免费。");
				for (const model of uncovered) {
					pending.push("#");
					pending.push("# " + model.provider + " | " + model.model + " —— 近 30 天 " + fmtTokens(model.tokens) + " tokens" + (model.estimated ? "（当前按台账均价估算）" : "（当前无价格依据）"));
					pending.push(...commentOut(ruleBlockLines({
						...blankRule(currency),
						provider: model.provider,
						model: model.model
					}, 2)));
				}
			}
			return {
				text: [
					...headerComments(["# 注意：这是整份文档。已有规则文件时不要直接覆盖，只把需要的条目粘进 rules 下（或先备份原文件）。"]),
					"",
					...body,
					...pending,
					""
				].join("\n"),
				prefilledCount: prefilled.length,
				pendingCount: uncovered.length
			};
		}
		/**
		* 「单条片段」：一条规则的 YAML，缩进按 `rules:` 下的位置排好，可直接粘进用户文件。
		* `placeholder = true` 表示这是一条还没有价格的模型（四档单价先按 0 占位，必须填完再粘）。
		*
		* 注意这是**片段**不是完整文档：服务端的解析器不接受「文档第一行带缩进」，
		* 所以片段必须粘到已有文件的 `rules:` 下面，不能单独当整份规则文件用。
		*/
		function buildRuleSnippetYaml(rule, placeholder = false) {
			return [
				...placeholder ? [
					"# 单条规则片段（该模型还没有价格依据）：把四档单价换成厂商官方价后再粘到 rules 下。",
					"# 现在四档都是 0，直接粘进去会把这批用量算成免费。",
					commonSnippetNotice()
				] : ["# 单条规则片段：unit / offPeak / note 由 YAML 维护，面板保存不会改动它们。", commonSnippetNotice()],
				...ruleBlockLines(rule, 2),
				""
			].join("\n");
		}
		/** 片段的用法说明：它不是完整文档，必须粘进 rules 下（解析器不接受首行缩进的文档）。 */
		function commonSnippetNotice() {
			return "# 这是片段、不是完整文档：粘到规则文件的 rules: 下面即可（缩进已按 2 空格排好）；若文件里还是 rules: []，先换成 rules: 再粘。";
		}
		/**
		* 「让 DSH 帮我配」的提示词：带上目标文件绝对路径与缺口模型清单，
		* 并明确要求核对厂商官方定价页、不要编造价格、改完刷新页面即生效。
		*/
		function buildAgentPrompt(input) {
			const lines = [
				"请帮我配置 dsh-key-usage 插件（DSH 侧边栏「使用情况」→「余额与配额」）的计费规则。",
				"",
				"目标文件（唯一事实来源，请直接改它）：",
				"  " + (input.filePath ?? "(面板还没读到路径，请先确认插件服务端已重启)"),
				"",
				"改完刷新 DSH 页面即生效（不需要重启宿主）。面板上的「保存规则」写的也是这个文件，",
				"所以不要另建规则文件，也不要改插件目录里的内置官方价目。",
				"当前状态：用户规则 " + String(input.rulesCount) + " 条，内置官方价目 " + String(input.catalogEntries) + " 条。"
			];
			lines.push("", "现在缺价格依据的模型（近 30 天用量，按 tokens 降序，共 " + String(input.uncovered.length) + " 个）：");
			if (input.uncovered.length === 0) lines.push("  （没有缺口：你用到的模型都已有规则或命中内置价目。可以直接结束，或复核现有价格是否过期。）");
			else for (const model of input.uncovered) lines.push("  - " + model.provider + " | " + model.model + " —— " + fmtTokens(model.tokens) + " tokens（占缺口 " + (model.share * 100).toFixed(1) + "%）" + (model.estimated ? "｜当前按台账均价估算" : "｜当前无价格依据"));
			lines.push("", "请按这些要求做：", "1. 逐个去厂商**官方定价页**核对四档单价（输入 / 缓存读 / 缓存写 / 输出），并在回复里给出出处链接；", "   查不到官方价的模型就明确说「查不到」，保持原样，**不要凭记忆或推测编造价格**，", "   也不要用 0 占位 —— 0 会把这批用量算成免费。", "2. 币种按官方页面原币种写（CNY / USD）；本插件不换算、不合计，金额按币种分行显示。", "3. 计价单位缺省是每百万 tokens（unit: perMillionTokens）；按次计费的通道写 perCall。", "4. 文件格式：顶层只有 version / currency / rules 三个键；rules 用 `- provider: ...` 的块序列，", "   每个字段一行、2 空格缩进、字符串加引号；不要用 tab、花括号、锚点或 `---`。", "   已存在条目的 unit / offPeak / note 不要动（错峰窗口与备注只在 YAML 里维护）。", "5. 改完告诉我：新增 / 修改了哪几条、价格出处，以及仍然查不到价格的模型。", "");
			return lines.join("\n");
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/pricing.module.css.mjs
		const css$6 = ".aymcxa_panel{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);margin-top:26px;padding-top:16px}.aymcxa_panelHint{color:var(--dsw-alias-label-tertiary,#67676f);font-size:11px}.aymcxa_statStrip{flex-wrap:wrap;gap:10px 26px;margin-bottom:12px;display:flex}.aymcxa_statItem .aymcxa_statName{color:var(--dsw-alias-label-tertiary,#67676f);margin-bottom:2px;font-size:11px}.aymcxa_statItem .aymcxa_statNum{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:15px;font-weight:650}.aymcxa_statItem .aymcxa_statNum.aymcxa_saving{color:var(--dsw-alias-state-success-primary,#3fb96f)}.aymcxa_toolbar{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;display:flex}.aymcxa_actionBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 11px;font-size:11.5px}.aymcxa_actionBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.aymcxa_actionBtn:disabled{opacity:.5;cursor:default}.aymcxa_actionBtn.aymcxa_primary{color:var(--dsw-alias-state-accent-primary,#5b8cff);border-color:#5b8cff73}.aymcxa_toolbarSpacer{flex:1}.aymcxa_filterRow{flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0 6px;display:flex}.aymcxa_filterLabel{color:var(--dsw-alias-label-tertiary,#67676f);margin-right:2px;font-size:11px}.aymcxa_chip{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-tertiary,#67676f);font:inherit;cursor:pointer;background:0 0;border-radius:999px;align-items:center;gap:6px;padding:2px 10px;font-size:11px;display:inline-flex}.aymcxa_chip:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.aymcxa_chip b{font-variant-numeric:tabular-nums;font-weight:600}.aymcxa_chipOn{color:var(--dsw-alias-state-accent-primary,#5b8cff);border-color:#5b8cff73}.aymcxa_chip:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.aymcxa_fileLine{color:var(--dsw-alias-label-tertiary,#67676f);flex-wrap:wrap;gap:4px 18px;margin:8px 0;font-size:10.5px;display:flex}.aymcxa_pathText{word-break:break-all;font-family:ui-monospace,Consolas,monospace;font-size:10.5px}.aymcxa_issueBlock{color:var(--dsw-alias-state-warning-primary,#e0a13c);background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-state-warning-primary,#e0a13c);border-radius:8px;margin:8px 0;padding:8px 12px;font-size:11.5px;line-height:1.7}.aymcxa_issueHead{flex-wrap:wrap;align-items:baseline;gap:8px;display:flex}.aymcxa_issueNote{color:var(--dsw-alias-label-tertiary,#67676f);font-size:11px}.aymcxa_issueList{margin:6px 0 0;padding-left:18px}.aymcxa_issueWhere{color:var(--dsw-alias-label-secondary,#9a9aa6);margin-right:6px}.aymcxa_promptBlock{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:10px;margin:8px 0 10px;padding:10px 14px}.aymcxa_promptHead{color:var(--dsw-alias-label-tertiary,#67676f);font-size:11px;line-height:1.7}.aymcxa_promptActions{flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0;display:flex}.aymcxa_promptText{background:var(--dsw-alias-bg-layer-3,#232329);max-height:260px;color:var(--dsw-alias-label-secondary,#9a9aa6);white-space:pre-wrap;word-break:break-word;border-radius:8px;margin:0;padding:10px 12px;font-family:ui-monospace,Consolas,monospace;font-size:11px;line-height:1.7;overflow:auto}.aymcxa_ruleTable{border-collapse:collapse;width:100%;margin-top:4px}.aymcxa_ruleTable th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:5px 8px;font-size:10.5px;font-weight:500}.aymcxa_ruleTable td{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:7px 8px;font-size:11.5px}.aymcxa_ruleTable th:first-child,.aymcxa_ruleTable td:first-child,.aymcxa_ruleTable th:nth-child(2),.aymcxa_ruleTable td:nth-child(2){text-align:left}.aymcxa_ruleTable td:first-child{color:var(--dsw-alias-label-primary,#e8e8ec)}.aymcxa_ruleTable tr.aymcxa_editing{background:var(--dsw-alias-interactive-bg-active,#5b8cff24)}.aymcxa_ruleName{font-family:ui-monospace,Consolas,monospace;font-size:11px}.aymcxa_ruleNote{color:var(--dsw-alias-label-tertiary,#67676f);white-space:normal;max-width:260px;font-size:10.5px}.aymcxa_ruleExtra{margin-top:2px;font-size:10px}.aymcxa_linkBtn{color:var(--dsw-alias-label-tertiary,#67676f);font:inherit;cursor:pointer;background:0 0;border:0;padding:0 6px;font-size:11px}.aymcxa_linkBtn:hover{color:var(--dsw-alias-state-accent-primary,#5b8cff)}.aymcxa_sourceChip{vertical-align:baseline;white-space:nowrap;border:1px solid;border-radius:999px;margin-left:5px;padding:0 6px;font-size:10px;line-height:1.7;display:inline-block}.aymcxa_sourceOfficial{color:var(--dsw-alias-label-tertiary,#67676f)}.aymcxa_sourceRule{color:var(--dsw-alias-state-accent-primary,#5b8cff)}.aymcxa_sourceCatalog{color:var(--dsw-alias-label-secondary,#9a9aa2)}.aymcxa_sourceEstimate{color:var(--dsw-alias-state-warning-primary,#e0a13c)}.aymcxa_catalogNote{color:var(--dsw-alias-label-secondary,#9a9aa2);background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:8px;margin:10px 0;padding:8px 12px;font-size:12px;line-height:1.7}.aymcxa_catalogStale{color:var(--dsw-alias-state-warn-primary,#e0a13c);border-color:var(--dsw-alias-state-warn-primary,#e0a13c)}.aymcxa_offPeakChip{border:1px solid var(--dsw-alias-state-success-primary,#3fb96f);color:var(--dsw-alias-state-success-primary,#3fb96f);border-radius:999px;padding:0 6px;font-size:10px;line-height:1.7;display:inline-block}.aymcxa_editor{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:10px;margin:10px 0;padding:12px 14px}.aymcxa_editorGrid{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;display:grid}.aymcxa_field{flex-direction:column;gap:4px;display:flex}.aymcxa_field label{color:var(--dsw-alias-label-tertiary,#67676f);font-size:10.5px}.aymcxa_field input,.aymcxa_field select{background:var(--dsw-alias-bg-layer-3,#232329);border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;border-radius:6px;min-width:0;padding:4px 7px;font-size:11.5px}.aymcxa_field input:focus,.aymcxa_field select:focus{border-color:var(--dsw-alias-state-accent-primary,#5b8cff)}.aymcxa_field input:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:1px}.aymcxa_field select:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:1px}.aymcxa_linkBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.aymcxa_infoBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.aymcxa_actionBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.aymcxa_subLabel{color:var(--dsw-alias-label-secondary,#9a9aa6);margin:12px 0 6px;font-size:11.5px;font-weight:600}.aymcxa_editorError{color:var(--dsw-alias-state-danger-primary,#e05a5a);margin-top:10px;font-size:11.5px}.aymcxa_editorHint{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:8px;font-size:10.5px}.aymcxa_editorActions{gap:8px;margin-top:12px;display:flex}.aymcxa_empty{color:var(--dsw-alias-label-tertiary,#67676f);padding:12px 0;font-size:12px}.aymcxa_warning{color:var(--dsw-alias-state-warning-primary,#e0a13c);margin:6px 0;font-size:11.5px}.aymcxa_error{color:var(--dsw-alias-state-danger-primary,#e05a5a);margin:6px 0;font-size:11.5px}.aymcxa_savingsList{color:var(--dsw-alias-label-tertiary,#67676f);margin:6px 0 0;padding:0;font-size:11.5px;line-height:1.7;list-style:none}.aymcxa_summaryStrip{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;flex-wrap:wrap;align-items:center;gap:12px 28px;padding:12px 16px;display:flex}.aymcxa_summaryBasis{flex:320px;min-width:0}.aymcxa_summarySaving{flex:none}.aymcxa_summaryActions{align-items:center;gap:8px;margin-left:auto;display:flex}.aymcxa_summaryStrip .aymcxa_summaryName{color:var(--dsw-alias-label-tertiary,#67676f);margin-bottom:3px;font-size:11px}.aymcxa_summaryStrip .aymcxa_summaryValue{color:var(--dsw-alias-label-primary,#e8e8ec);font-variant-numeric:tabular-nums;font-size:12.5px;font-weight:600;line-height:1.5}.aymcxa_summaryStrip .aymcxa_summaryValue.aymcxa_saving{color:var(--dsw-alias-state-success-primary,#3fb96f)}.aymcxa_infoBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-tertiary,#67676f);width:22px;height:22px;font:inherit;cursor:pointer;background:0 0;border-radius:999px;padding:0;font-size:12px;line-height:1}.aymcxa_infoBtn:hover,.aymcxa_infoBtnActive{color:var(--dsw-alias-state-accent-primary,#5b8cff);border-color:#5b8cff73}.aymcxa_explanation{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:10px;margin-top:8px;padding:10px 14px}.aymcxa_explanationTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:4px;font-size:11.5px;font-weight:600}.aymcxa_explanationList{color:var(--dsw-alias-label-tertiary,#67676f);margin:0;padding-left:18px;font-size:11.5px;line-height:1.75}.aymcxa_explanationList b{color:var(--dsw-alias-label-secondary,#9a9aa6);font-weight:500}.aymcxa_drawer{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;margin-top:8px;padding:12px 16px 14px}.aymcxa_sectionBlock{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);margin-top:16px;padding-top:12px}.aymcxa_statItem .aymcxa_statNote{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:3px;font-size:10.5px}.aymcxa_worthList{margin:6px 0 0;padding:0;font-size:11.5px;line-height:1.9;list-style:none}.aymcxa_worthList li,.aymcxa_savingsList li{flex-wrap:wrap;align-items:baseline;gap:8px;display:flex}.aymcxa_worthMeta{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums}.aymcxa_savingsList .aymcxa_saving{color:var(--dsw-alias-state-success-primary,#3fb96f);margin-left:auto;font-weight:600}.aymcxa_linkBtn:disabled{opacity:.5;cursor:default}";
		const tagId$6 = "dsh-key-usage/pricing.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		const cssRegistry$6 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$6.some((e) => e.tagId === tagId$6)) cssRegistry$6.push({
			tagId: tagId$6,
			css: css$6
		});
		var pricing_module_css_default = {
			"actionBtn": "aymcxa_actionBtn",
			"catalogNote": "aymcxa_catalogNote",
			"catalogStale": "aymcxa_catalogStale",
			"chip": "aymcxa_chip",
			"chipOn": "aymcxa_chipOn",
			"drawer": "aymcxa_drawer",
			"editing": "aymcxa_editing",
			"editor": "aymcxa_editor",
			"editorActions": "aymcxa_editorActions",
			"editorError": "aymcxa_editorError",
			"editorGrid": "aymcxa_editorGrid",
			"editorHint": "aymcxa_editorHint",
			"empty": "aymcxa_empty",
			"error": "aymcxa_error",
			"explanation": "aymcxa_explanation",
			"explanationList": "aymcxa_explanationList",
			"explanationTitle": "aymcxa_explanationTitle",
			"field": "aymcxa_field",
			"fileLine": "aymcxa_fileLine",
			"filterLabel": "aymcxa_filterLabel",
			"filterRow": "aymcxa_filterRow",
			"infoBtn": "aymcxa_infoBtn",
			"infoBtnActive": "aymcxa_infoBtnActive",
			"issueBlock": "aymcxa_issueBlock",
			"issueHead": "aymcxa_issueHead",
			"issueList": "aymcxa_issueList",
			"issueNote": "aymcxa_issueNote",
			"issueWhere": "aymcxa_issueWhere",
			"linkBtn": "aymcxa_linkBtn",
			"offPeakChip": "aymcxa_offPeakChip",
			"panel": "aymcxa_panel",
			"panelHint": "aymcxa_panelHint",
			"pathText": "aymcxa_pathText",
			"primary": "aymcxa_primary",
			"promptActions": "aymcxa_promptActions",
			"promptBlock": "aymcxa_promptBlock",
			"promptHead": "aymcxa_promptHead",
			"promptText": "aymcxa_promptText",
			"ruleExtra": "aymcxa_ruleExtra",
			"ruleName": "aymcxa_ruleName",
			"ruleNote": "aymcxa_ruleNote",
			"ruleTable": "aymcxa_ruleTable",
			"saving": "aymcxa_saving",
			"savingsList": "aymcxa_savingsList",
			"sectionBlock": "aymcxa_sectionBlock",
			"sourceCatalog": "aymcxa_sourceCatalog",
			"sourceChip": "aymcxa_sourceChip",
			"sourceEstimate": "aymcxa_sourceEstimate",
			"sourceOfficial": "aymcxa_sourceOfficial",
			"sourceRule": "aymcxa_sourceRule",
			"statItem": "aymcxa_statItem",
			"statName": "aymcxa_statName",
			"statNote": "aymcxa_statNote",
			"statNum": "aymcxa_statNum",
			"statStrip": "aymcxa_statStrip",
			"subLabel": "aymcxa_subLabel",
			"summaryActions": "aymcxa_summaryActions",
			"summaryBasis": "aymcxa_summaryBasis",
			"summaryName": "aymcxa_summaryName",
			"summarySaving": "aymcxa_summarySaving",
			"summaryStrip": "aymcxa_summaryStrip",
			"summaryValue": "aymcxa_summaryValue",
			"toolbar": "aymcxa_toolbar",
			"toolbarSpacer": "aymcxa_toolbarSpacer",
			"warning": "aymcxa_warning",
			"worthList": "aymcxa_worthList",
			"worthMeta": "aymcxa_worthMeta"
		};
		//#endregion
		//#region src/client/components/CostSourceChip.tsx
		function CostSourceChip(props) {
			const source = props.source ?? "none";
			if (source === "none") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: pricing_module_css_default.sourceChip + " " + sourceClass(source),
				title: COST_SOURCE_HINTS[source],
				children: COST_SOURCE_LABELS[source]
			});
		}
		function sourceClass(source) {
			if (source === "official") return pricing_module_css_default.sourceOfficial;
			if (source === "rule") return pricing_module_css_default.sourceRule;
			if (source === "catalog") return pricing_module_css_default.sourceCatalog;
			return pricing_module_css_default.sourceEstimate;
		}
		//#endregion
		//#region src/client/tabs/OverviewTab.tsx
		function OverviewTab(props) {
			const { channels, summary } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.groupLabel,
					children: "Key 清单"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: overview_module_css_default.keyTable,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "通道" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "类型" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "今日" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "近 30 天" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "余额 / 窗口" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "30 天成本" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {})
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [channels.map((channel) => {
						const row = summary?.channels.find((item) => item.provider === channel.provider) ?? null;
						const todayTokens = row === null ? 0 : row.today.tokens;
						const monthTokens = row === null ? 0 : row.month.tokens;
						const costCell = costCellText(channel, row === null ? 0 : row.month.cost);
						const disabled = channel.status === "off";
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
							className: disabled ? overview_module_css_default.disabledRow : overview_module_css_default.clickable,
							onClick: disabled ? void 0 : () => props.onOpenDetail(channel.provider),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: overview_module_css_default.cellKey,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: shared_module_css_default.statusDot,
										style: { background: statusColorOf(channel.status) }
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: overview_module_css_default.keyDisplay,
										children: channel.displayName
									})]
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: tagClassOf(channel),
									children: channel.status === "off" ? "未配置" : channel.costLabel
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: todayTokens > 0 ? fmtTokens(todayTokens) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: "—"
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: monthTokens > 0 ? fmtTokens(monthTokens) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: "—"
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: quotaCellOf(channel) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: costCell.dim ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: costCell.text
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, showsAmount(costCell) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, { source: row?.month.costSource })] }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: disabled ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: overview_module_css_default.rowLink,
									children: "明细 →"
								}) })
							]
						}, channel.provider);
					}), channels.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						colSpan: 7,
						className: shared_module_css_default.empty,
						children: "未读取到通道配置"
					}) })] })]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Heatmap, {
					days: props.heatmap,
					channels,
					tooltip: props.tooltip
				}),
				summary === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: "台账读取中或不可用，今日 / 近 30 天列为空"
				}),
				props.quotas.length === 0 && channels.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: "未读取到余额快照，余额 / 窗口列显示为 —"
				})
			] });
		}
		function tagClassOf(channel) {
			const base = overview_module_css_default.tag;
			if (channel.status === "off") return base + " " + overview_module_css_default.off;
			if (channel.costMode === "free") return base + " " + overview_module_css_default.free;
			if (channel.costMode === "sub") return base + " " + overview_module_css_default.sub;
			return base;
		}
		function quotaCellOf(channel) {
			if (channel.costMode === "sub" && channel.quotaPercent !== null) {
				const percent = channel.quotaPercent;
				const levelClass = percent >= 90 ? overview_module_css_default.danger : percent >= 60 ? overview_module_css_default.warn : "";
				const windowLabel = channel.quotaWindowLabel ?? channel.quotaWindowKey ?? "";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: overview_module_css_default.quotaCell,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: overview_module_css_default.miniBar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
							width: Math.max(2, percent) + "%",
							background: percent >= 60 ? "var(--dsw-alias-state-warning-primary, #e0a13c)" : "var(--dsw-alias-state-success-primary, #3fb96f)"
						} })
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: [overview_module_css_default.quotaText, levelClass].join(" ").trim(),
						children: [
							windowLabel,
							" ",
							percent,
							"%"
						]
					})]
				});
			}
			if (channel.balanceText !== null) {
				const levelClass = channel.status === "danger" ? overview_module_css_default.danger : channel.status === "warn" ? overview_module_css_default.warn : "";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: overview_module_css_default.quotaCell,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: [overview_module_css_default.quotaText, levelClass].join(" ").trim(),
						children: channel.balanceText
					})
				});
			}
			const fallback = channel.costMode === "none" ? "无计费" : channel.costMode === "free" ? "—" : "未查询";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: [overview_module_css_default.quotaText, overview_module_css_default.dim].join(" "),
				children: fallback
			});
		}
		//#endregion
		//#region src/client/export.ts
		/**
		* 导出工具：纯函数生成 CSV / JSON 文本 + 用 Blob 触发浏览器下载。
		* 零依赖、零服务端往返，导出的永远是**客户端当前筛选后**的数据。
		*
		* 两条口径约束：
		* - CSV 必须带 UTF-8 BOM：Excel 默认按本地代码页解码，没有 BOM 中文会变乱码；
		* - JSON 不能带 BOM：`JSON.parse` 遇到 BOM 会直接抛错。
		*/
		const UTF8_BOM = "﻿";
		const CSV_MIME = "text/csv;charset=utf-8";
		const JSON_MIME = "application/json;charset=utf-8";
		const YAML_MIME = "text/yaml;charset=utf-8";
		/** 表头 + 数据行 → CSV 文本（转义见 `csvCell`，换行用 RFC 4180 的 CRLF）。 */
		function toCsv(rows, columns) {
			const lines = [columns.map((column) => csvCell(column.label)).join(",")];
			for (const row of rows) lines.push(columns.map((column) => csvCell(column.value(row))).join(","));
			return UTF8_BOM + lines.join("\r\n") + "\r\n";
		}
		function toJson(value) {
			return JSON.stringify(value, null, 2) + "\n";
		}
		/** 下载文件名：`dsh-usage-<主题>-<当天>.<扩展名>`，主题用英文短名避免跨端中文文件名乱码。 */
		function exportFileName(topic, extension) {
			return "dsh-usage-" + topic + "-" + isoDate(/* @__PURE__ */ new Date()) + "." + extension;
		}
		function downloadFile(name, text, mime) {
			const objectUrl = URL.createObjectURL(new Blob([text], { type: mime }));
			const anchor = document.createElement("a");
			anchor.href = objectUrl;
			anchor.download = name;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
		}
		/** 逗号、引号、换行都必须包引号并把内部引号翻倍，否则标题里的逗号会撑破列。 */
		function csvCell(value) {
			if (value === null) return "";
			const text = String(value);
			return /[",\r\n]/.test(text) ? "\"" + text.replace(/"/g, "\"\"") + "\"" : text;
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/detail.module.css.mjs
		const css$5 = "._91PKKq_rangeBar{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;display:flex}._91PKKq_rangeLeft{flex-wrap:wrap;align-items:center;gap:10px;display:flex}._91PKKq_rangeTabs{border:1px solid var(--dsw-alias-border-l2,#2c2c34);border-radius:9px;gap:2px;padding:2px;display:inline-flex}._91PKKq_rangeTabs button{color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:7px;padding:4px 13px;font-size:12px}._91PKKq_rangeTabs button._91PKKq_active{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-accent-primary,#5b8cff);font-weight:600}._91PKKq_rangeInput{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light dark;background:0 0;border-radius:7px;padding:3px 8px;font-size:12px}@media (prefers-color-scheme:dark){._91PKKq_rangeInput{--lightningcss-light: ;--lightningcss-dark:initial}}._91PKKq_rangeTabs button:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}._91PKKq_rangeInput:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}._91PKKq_rangeCaption{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:auto;font-size:11.5px}._91PKKq_rowToggle{font:inherit;color:inherit;cursor:pointer;font-variant-numeric:tabular-nums;background:0 0;border:0;align-items:center;gap:6px;padding:0;font-size:12px;display:inline-flex}._91PKKq_rowToggle:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}._91PKKq_shareBar{border-radius:6px;gap:2px;height:12px;margin:8px 0 2px;display:flex;overflow:hidden}._91PKKq_shareBar>i{cursor:default;height:100%;display:block}._91PKKq_shareBar>i:hover{filter:brightness(1.15)}._91PKKq_chartTitle{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:10px;display:flex}._91PKKq_bars{align-items:flex-end;gap:3px;height:110px;margin-top:8px;display:flex}._91PKKq_barsDense{gap:2px}._91PKKq_barColumn{cursor:default;flex-direction:column;flex:1;justify-content:flex-end;gap:1px;height:100%;display:flex}._91PKKq_barColumn:hover{filter:brightness(1.2)}._91PKKq_segCache{background:var(--dsw-alias-state-accent-tertiary,#5b8cff47);border-radius:2px 2px 0 0}._91PKKq_segIn{background:var(--dsw-alias-state-accent-primary,#5b8cff)}._91PKKq_segOut{background:var(--dsw-alias-state-business-primary,#9a7bff);border-radius:0 0 2px 2px}._91PKKq_barLabels{margin-top:6px;display:flex}._91PKKq_barLabels span{text-align:center;color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap;flex:1;font-size:9.5px}._91PKKq_subRowCell{background:var(--dsw-alias-fill-l1,#80808c0d);text-align:left!important;padding:2px 10px 10px 30px!important}._91PKKq_subHead,._91PKKq_subRow{grid-template-columns:minmax(150px,1.5fr) minmax(70px,1fr) minmax(70px,1fr) minmax(70px,1fr) minmax(80px,1.1fr) minmax(70px,1fr);align-items:center;gap:8px;display:grid}._91PKKq_subHead{color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-fill-l2,#80808c33);padding:4px 0;font-size:10px}._91PKKq_subRow{border-bottom:1px dashed var(--dsw-alias-fill-l1,#80808c24);padding:5px 0;font-size:11.5px}._91PKKq_subRow:last-child{border-bottom:0}._91PKKq_subName{flex-direction:column;gap:1px;min-width:0;display:flex}._91PKKq_subModel{color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,Consolas,monospace;font-size:11px;overflow:hidden}._91PKKq_subChannel{color:var(--dsw-alias-label-tertiary,#67676f);text-overflow:ellipsis;white-space:nowrap;font-family:inherit;font-size:10px;overflow:hidden}._91PKKq_subNumber{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6)}._91PKKq_toggleArrow{width:13px;color:var(--dsw-alias-label-tertiary,#67676f);font-size:9px;display:inline-block}";
		const tagId$5 = "dsh-key-usage/detail.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		const cssRegistry$5 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$5.some((e) => e.tagId === tagId$5)) cssRegistry$5.push({
			tagId: tagId$5,
			css: css$5
		});
		var detail_module_css_default = {
			"active": "_91PKKq_active",
			"barColumn": "_91PKKq_barColumn",
			"barLabels": "_91PKKq_barLabels",
			"bars": "_91PKKq_bars",
			"barsDense": "_91PKKq_barsDense",
			"chartTitle": "_91PKKq_chartTitle",
			"rangeBar": "_91PKKq_rangeBar",
			"rangeCaption": "_91PKKq_rangeCaption",
			"rangeInput": "_91PKKq_rangeInput",
			"rangeLeft": "_91PKKq_rangeLeft",
			"rangeTabs": "_91PKKq_rangeTabs",
			"rowToggle": "_91PKKq_rowToggle",
			"segCache": "_91PKKq_segCache",
			"segIn": "_91PKKq_segIn",
			"segOut": "_91PKKq_segOut",
			"shareBar": "_91PKKq_shareBar",
			"subChannel": "_91PKKq_subChannel",
			"subHead": "_91PKKq_subHead",
			"subModel": "_91PKKq_subModel",
			"subName": "_91PKKq_subName",
			"subNumber": "_91PKKq_subNumber",
			"subRow": "_91PKKq_subRow",
			"subRowCell": "_91PKKq_subRowCell",
			"toggleArrow": "_91PKKq_toggleArrow"
		};
		//#endregion
		//#region src/client/components/ShareBar.tsx
		function ShareBar(props) {
			const { usage, totalTokens, channels } = props;
			if (usage === null || totalTokens <= 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statLabel,
					children: "占比 · 按 Tokens"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					style: { padding: "8px 0" },
					children: "所选范围内无用量记录"
				})]
			});
			let rows = [];
			let title = "通道占比 · 按 Tokens";
			if (props.channelFilter === "ALL") {
				const byProvider = /* @__PURE__ */ new Map();
				for (const day of usage.days) for (const model of day.models) byProvider.set(model.provider, (byProvider.get(model.provider) ?? 0) + model.inputTokens + model.outputTokens + model.cacheReadTokens);
				rows = [...byProvider.entries()].map(([provider, tokens]) => ({
					key: provider,
					label: displayNameOf(channels, provider),
					tokens,
					color: channelColorOf(channels, provider)
				}));
			} else {
				title = "模型占比 · 按 Tokens";
				const byModel = /* @__PURE__ */ new Map();
				for (const day of usage.days) for (const model of day.models) {
					const bucket = byModel.get(model.model);
					const tokens = model.inputTokens + model.outputTokens + model.cacheReadTokens;
					if (bucket === void 0) byModel.set(model.model, {
						tokens,
						provider: model.provider
					});
					else bucket.tokens += tokens;
				}
				rows = [...byModel.entries()].map(([model, value]) => ({
					key: model,
					label: model,
					tokens: value.tokens,
					color: channelColorOf(channels, value.provider)
				}));
			}
			rows.sort((first, second) => second.tokens - first.tokens);
			const shareSummary = rows.length === 0 ? title + "：暂无数据" : title + "：" + rows.slice(0, 3).map((row) => row.label + " " + String(totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0) + "%").join("、") + (rows.length > 3 ? "，等 " + String(rows.length) + " 项" : "");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statLabel,
					children: title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: detail_module_css_default.shareBar,
					role: "img",
					"aria-label": shareSummary,
					children: rows.map((row) => {
						const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
							style: {
								width: row.tokens / totalTokens * 100 + "%",
								background: row.color
							},
							onMouseMove: (event) => props.tooltip.show(event, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: row.label }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: ["占比 ", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", { children: [percent, "%"] })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
									color: row.color,
									label: "Tokens",
									amount: fmtTokens(row.tokens),
									rate: percent + "%"
								})
							] })),
							onMouseLeave: props.tooltip.hide
						}, row.key);
					})
				})]
			});
		}
		//#endregion
		//#region src/client/components/StatCard.tsx
		function StatCard(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.statLabel,
						children: props.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.statValue,
						children: props.value
					}),
					props.extra !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.statExtra,
						children: props.extra
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/TokenBars.tsx
		function TokenBars(props) {
			const { rows, tooltip } = props;
			if (props.hidden === true || rows.length === 0) return null;
			const peak = Math.max(1, ...rows.map((row) => row.cacheReadTokens + row.inputTokens + row.outputTokens));
			const heightOf = (value) => (peak > 0 ? Math.max(1, Math.round(value / peak * 100)) : 1) + "%";
			const labelEvery = Math.max(1, Math.ceil(rows.length / 14));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: rows.length > 20 ? detail_module_css_default.bars + " " + detail_module_css_default.barsDense : detail_module_css_default.bars,
				role: "img",
				"aria-label": props.ariaLabel,
				children: rows.map((row) => {
					const rowTotal = row.cacheReadTokens + row.inputTokens + row.outputTokens;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: detail_module_css_default.barColumn,
						onMouseMove: (event) => tooltip.show(event, row.tip),
						onMouseLeave: tooltip.hide,
						children: rowTotal > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.segCache,
								style: { height: heightOf(row.cacheReadTokens) }
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.segIn,
								style: { height: heightOf(row.inputTokens) }
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.segOut,
								style: { height: heightOf(row.outputTokens) }
							})
						] })
					}, row.key);
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: detail_module_css_default.barLabels,
				children: rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: index % labelEvery === 0 || index === rows.length - 1 ? row.axisLabel : "" }, row.key))
			})] });
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/trend.module.css.mjs
		const css$4 = ".dJbyja_panel{margin-bottom:12px}.dJbyja_head{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:10px;display:flex}.dJbyja_span{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;font-size:11.5px}.dJbyja_placeholder{color:var(--dsw-alias-label-tertiary,#67676f);padding:10px 0 2px}.dJbyja_current{color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.dJbyja_previous{color:var(--dsw-alias-label-secondary,#9a9aa6)}.dJbyja_change{color:var(--dsw-alias-label-secondary,#9a9aa6);white-space:nowrap}.dJbyja_flat{color:var(--dsw-alias-label-tertiary,#67676f)}.dJbyja_warn{color:var(--dsw-alias-state-warning-primary,#e0a13c)}.dJbyja_muted{color:var(--dsw-alias-label-tertiary,#67676f)}.dJbyja_notes{flex-direction:column;gap:2px;margin-top:8px;display:flex}.dJbyja_note{color:var(--dsw-alias-label-tertiary,#67676f);font-size:11px;line-height:1.5}";
		const tagId$4 = "dsh-key-usage/trend.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		const cssRegistry$4 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$4.some((e) => e.tagId === tagId$4)) cssRegistry$4.push({
			tagId: tagId$4,
			css: css$4
		});
		var trend_module_css_default = {
			"change": "dJbyja_change",
			"current": "dJbyja_current",
			"flat": "dJbyja_flat",
			"head": "dJbyja_head",
			"muted": "dJbyja_muted",
			"note": "dJbyja_note",
			"notes": "dJbyja_notes",
			"panel": "dJbyja_panel",
			"placeholder": "dJbyja_placeholder",
			"previous": "dJbyja_previous",
			"span": "dJbyja_span",
			"warn": "dJbyja_warn"
		};
		//#endregion
		//#region src/client/components/TrendPanel.tsx
		/**
		* 环比对比：当前范围 vs 上一段等长范围。
		* 纯客户端实现 —— 复用同一个 /usage 端点按上期范围再请求一次，服务端不感知「环比」。
		* 涨跌只用中性色 + 上下箭头：用量涨不代表好、成本涨也不代表错，不引入红绿对错语义。
		*/
		const DAY_MS = 864e5;
		const FLAT = {
			text: "持平",
			kind: "flat",
			warn: false
		};
		const UNAVAILABLE = {
			text: "—",
			kind: "none",
			warn: false
		};
		/** 闭区间天数，至少 1（日期键按本地日历算，与 DetailTab 的横轴口径一致）。 */
		function spanDaysOf(from, to) {
			const fromTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const toTime = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
			return Math.max(1, Math.round((toTime - fromTime) / DAY_MS) + 1);
		}
		/** 上一段等长范围：本期首日的前一天往前推同样天数（10-07~10-13 → 09-30~10-06）。 */
		function previousWindowOf(from, to) {
			const startTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const span = spanDaysOf(from, to);
			return {
				from: isoDate(/* @__PURE__ */ new Date(startTime - span * DAY_MS)),
				to: isoDate(/* @__PURE__ */ new Date(startTime - DAY_MS))
			};
		}
		/** 展示口径 Tokens：输入 + 输出 + 缓存读（与三张统计卡、命中率公式同一口径）。 */
		function displayTokensOf(totals) {
			return totals.inputTokens + totals.outputTokens + totals.cacheReadTokens;
		}
		/** 命中率（%）；分母为 0 时返回 null，界面显示 — 而不是 NaN。 */
		function hitRateOf$2(totals) {
			const total = displayTokensOf(totals);
			return total > 0 ? totals.cacheReadTokens / total * 100 : null;
		}
		/** 该期是否有任何用量：全 0 视为「无数据」，据此显示「上期无数据」而不是 0 与 −100%。 */
		function hasAnyData(totals) {
			return totals !== null && (totals.calls > 0 || displayTokensOf(totals) > 0 || totals.cost > 0);
		}
		/** 环比百分比；上期为 0 时不给百分比（Infinity / NaN 不进界面）。 */
		function percentChangeOf(current, previous, warnOnUp) {
			if (previous <= 0) return current <= 0 ? FLAT : {
				text: "上期为 0",
				kind: "none",
				warn: false
			};
			const percent = (current - previous) / previous * 100;
			if (Math.abs(percent) < .05) return FLAT;
			return {
				text: (percent > 0 ? "+" : "") + percent.toFixed(1) + "%",
				kind: percent > 0 ? "up" : "down",
				warn: warnOnUp && percent > 0
			};
		}
		/** 命中率本身是比值，涨跌按百分点（pp）计，避免「96.2% 比 94.0% 涨 2.3%」这类误读。 */
		function pointChangeOf(current, previous) {
			const difference = current - previous;
			if (Math.abs(difference) < .05) return FLAT;
			return {
				text: (difference > 0 ? "+" : "") + difference.toFixed(1) + "pp",
				kind: difference > 0 ? "up" : "down",
				warn: false
			};
		}
		/**
		* 成本文案：订阅 / 免费 / 本地端点没有可比金额，沿用 `costCellText` 的占位文案；
		* 其余情况一律给金额（含 ¥0.00），否则「本期降到 0」会被当成不可比而丢掉 −100%。
		*/
		function costTextOf(channel, cost) {
			if (channel !== null && channel.costMode !== "perToken" && channel.costMode !== "unknown") {
				const cell = costCellText(channel, cost);
				return {
					text: cell.text,
					dim: cell.dim,
					amount: false
				};
			}
			return {
				text: fmtCost(cost),
				dim: false,
				amount: true
			};
		}
		function changeNodeOf(change) {
			if (change.kind === "none") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: trend_module_css_default.muted,
				children: change.text
			});
			const arrow = change.kind === "up" ? "↑" : change.kind === "down" ? "↓" : "→";
			const tone = change.warn ? trend_module_css_default.warn : change.kind === "flat" ? trend_module_css_default.flat : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: tone === "" ? trend_module_css_default.change : trend_module_css_default.change + " " + tone,
				children: [
					arrow,
					" ",
					change.text
				]
			});
		}
		function TrendPanel(props) {
			const { usage, bounds, channelFilter } = props;
			const comparable = props.range !== "total";
			const previousWindow = (0, react.useMemo)(() => previousWindowOf(bounds.from, bounds.to), [bounds.from, bounds.to]);
			const [previousUsage, setPreviousUsage] = (0, react.useState)(null);
			const [status, setStatus] = (0, react.useState)("loading");
			(0, react.useEffect)(() => {
				if (!comparable) return;
				let cancelled = false;
				setStatus("loading");
				loadUsage(previousWindow.from, previousWindow.to, channelFilter).then((result) => {
					if (cancelled) return;
					setPreviousUsage(result);
					setStatus("ready");
				});
				return () => {
					cancelled = true;
				};
			}, [
				comparable,
				previousWindow.from,
				previousWindow.to,
				channelFilter,
				props.pricingRevision
			]);
			const header = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: trend_module_css_default.head,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: shared_module_css_default.statLabel,
					children: "环比对比 · 与上一段等长范围"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: trend_module_css_default.span,
					children: [
						"本期 ",
						bounds.from,
						" ~ ",
						bounds.to,
						comparable ? " · 上期 " + previousWindow.from + " ~ " + previousWindow.to : ""
					]
				})]
			});
			if (!comparable) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card + " " + trend_module_css_default.panel,
				children: [header, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: trend_module_css_default.placeholder,
					children: "总计范围没有可对比的上一段"
				})]
			});
			const currentTotals = usage.totals;
			const previousTotals = previousUsage?.totals ?? null;
			const previousHasData = status === "ready" && hasAnyData(previousTotals);
			const currentHasData = hasAnyData(currentTotals);
			const previousPlaceholder = status === "loading" ? "读取中…" : previousUsage === null ? "无法获取" : "上期无数据";
			const currentValue = (text) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: trend_module_css_default.current,
				children: text
			});
			const previousValue = (text) => previousHasData ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: trend_module_css_default.previous,
				children: text
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: trend_module_css_default.muted,
				children: previousPlaceholder
			});
			const changeValue = (change) => previousHasData ? changeNodeOf(change) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: trend_module_css_default.muted,
				children: "—"
			});
			const currentCalls = currentTotals?.calls ?? 0;
			const previousCalls = previousTotals?.calls ?? 0;
			const currentTokens = currentTotals === null ? 0 : displayTokensOf(currentTotals);
			const previousTokens = previousTotals === null ? 0 : displayTokensOf(previousTotals);
			const currentHitRate = currentTotals === null ? null : hitRateOf$2(currentTotals);
			const previousHitRate = previousTotals === null ? null : hitRateOf$2(previousTotals);
			const currentCost = currentTotals?.cost ?? 0;
			const previousCost = previousTotals?.cost ?? 0;
			const singleChannel = channelFilter === "ALL" ? null : channelOf(props.channels, channelFilter);
			const currentCostText = costTextOf(singleChannel, currentCost);
			const previousCostText = costTextOf(singleChannel, previousCost);
			const costComparable = currentCostText.amount && previousCostText.amount;
			const rows = [
				{
					key: "calls",
					label: "调用次数",
					current: currentValue(fmtCalls(currentCalls)),
					previous: previousValue(fmtCalls(previousCalls)),
					change: changeValue(percentChangeOf(currentCalls, previousCalls, false))
				},
				{
					key: "tokens",
					label: "Tokens",
					current: currentValue(fmtTokens(currentTokens)),
					previous: previousValue(fmtTokens(previousTokens)),
					change: changeValue(percentChangeOf(currentTokens, previousTokens, false))
				},
				{
					key: "cost",
					label: "成本",
					current: currentCostText.amount ? currentValue(currentCostText.text) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: trend_module_css_default.muted,
						children: currentCostText.text
					}),
					previous: previousValue(previousCostText.text),
					change: costComparable ? changeValue(percentChangeOf(currentCost, previousCost, true)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: trend_module_css_default.muted,
						children: "不可比"
					})
				},
				{
					key: "hitRate",
					label: "缓存命中率",
					current: currentValue(currentHitRate === null ? "—" : currentHitRate.toFixed(1) + "%"),
					previous: previousValue(previousHitRate === null ? "—" : previousHitRate.toFixed(1) + "%"),
					change: changeValue(currentHitRate !== null && previousHitRate !== null ? pointChangeOf(currentHitRate, previousHitRate) : UNAVAILABLE)
				}
			];
			const notes = [];
			if ((usage.sessionDates ?? []).length > 0 || (previousUsage?.sessionDates ?? []).length > 0) notes.push("含会话补位数据，与台账口径不完全可比");
			if (previousHasData && costComparable) {
				const currentSource = currentTotals?.costSource ?? "none";
				const previousSource = previousTotals?.costSource ?? "none";
				if (currentSource !== previousSource) notes.push("两期成本来源不同（本期 " + COST_SOURCE_LABELS[currentSource] + " / 上期 " + COST_SOURCE_LABELS[previousSource] + "），口径不完全可比");
			}
			if (status === "ready" && previousUsage === null) notes.push("上一段范围读取失败，无法对比");
			if (!currentHasData) notes.push("本期范围内无用量记录");
			notes.push("命中率的变化按百分点（pp）计，其余指标为环比百分比");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card + " " + trend_module_css_default.panel,
				children: [
					header,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: shared_module_css_default.table,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "指标" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "本期" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "上期" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "变化" })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.label }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.current }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.previous }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.change })
						] }, row.key)) })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: trend_module_css_default.notes,
						children: notes.map((note) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: trend_module_css_default.note,
							children: note
						}, note))
					})
				]
			});
		}
		//#endregion
		//#region src/client/rows.ts
		function dropEmptyRows(rows, tokensOf) {
			const kept = rows.filter((row) => tokensOf(row) > 0);
			return {
				rows: kept,
				hidden: rows.length - kept.length
			};
		}
		/** 列表底部的一行小字：说明隐藏了什么、为什么。 */
		function hiddenEmptyRowsText(hidden) {
			return "已隐藏 " + String(hidden) + " 行无 Token 记录（调用失败或未产生用量；调用次数仍计入合计）";
		}
		//#endregion
		//#region src/client/components/DailyDetailTable.tsx
		/**
		* 每日细目：以「天」为折叠单位，展开行用原型子表格展示模型维度
		* （模型 + 调用 / 输入 / 输出 / 缓存读 / 命中率，不占主表列）。
		*/
		/** 输入/输出为 0 时不再显示 `0`（全缓存命中或纯输出模型的 0 是噪音），改显示淡化的 `—`。 */
		function tokenCellOf(value) {
			return value === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: shared_module_css_default.dim,
				children: "—"
			}) : fmtTokens(value);
		}
		function hitRateOf$1(cacheReadTokens, inputTokens, outputTokens) {
			const total = inputTokens + outputTokens + cacheReadTokens;
			if (total <= 0) return "—";
			return (cacheReadTokens / total * 100).toFixed(1) + "%";
		}
		const COMPARERS = {
			period: (first, second) => first.period < second.period ? -1 : first.period > second.period ? 1 : 0,
			total: (first, second) => first.totalTokens - second.totalTokens,
			calls: (first, second) => first.calls - second.calls,
			input: (first, second) => first.inputTokens - second.inputTokens,
			output: (first, second) => first.outputTokens - second.outputTokens,
			cacheRead: (first, second) => first.cacheReadTokens - second.cacheReadTokens,
			hit: (first, second) => {
				const firstTotal = first.inputTokens + first.outputTokens + first.cacheReadTokens;
				const secondTotal = second.inputTokens + second.outputTokens + second.cacheReadTokens;
				return (firstTotal > 0 ? first.cacheReadTokens / firstTotal : -1) - (secondTotal > 0 ? second.cacheReadTokens / secondTotal : -1);
			},
			cost: (first, second) => first.cost - second.cost
		};
		function DailyDetailTable(props) {
			const { usage, channels, channelFilter, expandedPeriods, onTogglePeriod, sort, onSort } = props;
			const modelRows = [];
			for (const day of usage.days) for (const model of day.models) {
				const totalTokens = model.inputTokens + model.outputTokens + model.cacheReadTokens;
				modelRows.push({
					period: day.date,
					model: model.model,
					provider: model.provider,
					calls: model.calls,
					inputTokens: model.inputTokens,
					outputTokens: model.outputTokens,
					cacheReadTokens: model.cacheReadTokens,
					cost: model.cost,
					totalTokens
				});
			}
			const aggregates = /* @__PURE__ */ new Map();
			for (const row of modelRows) {
				const bucket = aggregates.get(row.period);
				if (bucket === void 0) aggregates.set(row.period, {
					period: row.period,
					calls: row.calls,
					inputTokens: row.inputTokens,
					outputTokens: row.outputTokens,
					cacheReadTokens: row.cacheReadTokens,
					cost: row.cost,
					totalTokens: row.totalTokens
				});
				else {
					bucket.calls += row.calls;
					bucket.inputTokens += row.inputTokens;
					bucket.outputTokens += row.outputTokens;
					bucket.cacheReadTokens += row.cacheReadTokens;
					bucket.cost += row.cost;
					bucket.totalTokens += row.totalTokens;
				}
			}
			const comparer = COMPARERS[sort.key] ?? COMPARERS.period;
			const nonEmpty = [...aggregates.values()].filter((entry) => entry.totalTokens > 0);
			const hiddenEmpty = aggregates.size - nonEmpty.length;
			const ordered = nonEmpty.sort((first, second) => {
				const compared = comparer(first, second);
				return sort.dir === "asc" ? compared : -compared;
			});
			const header = (key, label) => {
				const isActive = sort.key === key;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
					scope: "col",
					"aria-sort": isActive ? sort.dir === "asc" ? "ascending" : "descending" : "none",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: shared_module_css_default.sortBtn + (isActive ? " " + shared_module_css_default.sortActiveBtn : ""),
						onClick: () => onSort(isActive ? {
							key,
							dir: sort.dir === "asc" ? "desc" : "asc"
						} : {
							key,
							dir: "desc"
						}),
						children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.sortArrow,
							"aria-hidden": "true",
							children: isActive ? sort.dir === "asc" ? "▲" : "▼" : "↕"
						})]
					})
				});
			};
			const totals = usage.totals;
			const totalTokens = totals === null ? 0 : totals.inputTokens + totals.outputTokens + totals.cacheReadTokens;
			if (ordered.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.blockLabel,
				children: "每日细目"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.empty,
				children: "所选范围内无用量记录"
			})] });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.blockLabel,
					children: "每日细目"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: shared_module_css_default.table,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						header("period", "日期"),
						header("total", "总计"),
						header("calls", "调用"),
						header("input", "输入"),
						header("output", "输出"),
						header("cacheRead", "缓存读"),
						header("hit", "命中率")
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [ordered.map((period) => {
						const modelsInPeriod = modelRows.filter((row) => row.period === period.period).filter((row) => row.totalTokens > 0).sort((first, second) => second.totalTokens - first.totalTokens);
						const expandable = modelsInPeriod.length > 1;
						const isOpen = expandable && expandedPeriods[period.period] === true;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
							className: expandable ? shared_module_css_default.clickable : "",
							onClick: expandable ? () => onTogglePeriod(period.period) : void 0,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: expandable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: detail_module_css_default.rowToggle,
									"aria-expanded": isOpen,
									onClick: (event) => {
										event.stopPropagation();
										onTogglePeriod(period.period);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.toggleArrow,
										"aria-hidden": "true",
										children: isOpen ? "▼" : "▶"
									}), period.period]
								}) : period.period }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(period.totalTokens) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtCalls(period.calls) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: tokenCellOf(period.inputTokens) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: tokenCellOf(period.outputTokens) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(period.cacheReadTokens) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: hitRateOf$1(period.cacheReadTokens, period.inputTokens, period.outputTokens) })
							]
						}), isOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
							className: detail_module_css_default.subRowCell,
							colSpan: 7,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.subHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: "调用"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: "输入"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: "输出"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: "缓存读"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: "命中率"
									})
								]
							}), modelsInPeriod.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: detail_module_css_default.subRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: detail_module_css_default.subName,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: detail_module_css_default.subModel,
											children: row.model
										}), channelFilter === "ALL" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: detail_module_css_default.subChannel,
											children: displayNameOf(channels, row.provider)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: fmtCalls(row.calls)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: tokenCellOf(row.inputTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: tokenCellOf(row.outputTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: fmtTokens(row.cacheReadTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.subNumber,
										children: hitRateOf$1(row.cacheReadTokens, row.inputTokens, row.outputTokens)
									})
								]
							}, row.period + "|" + row.model + "|" + row.provider))]
						}) })] }, period.period);
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
						className: shared_module_css_default.total,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: "合计" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(totalTokens) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtCalls(totals?.calls ?? 0) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(totals?.inputTokens ?? 0) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(totals?.outputTokens ?? 0) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(totals?.cacheReadTokens ?? 0) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: hitRateOf$1(totals?.cacheReadTokens ?? 0, totals?.inputTokens ?? 0, totals?.outputTokens ?? 0) })
						]
					})] })]
				}),
				hiddenEmpty > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: hiddenEmptyRowsText(hiddenEmpty)
				})
			] });
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/export.module.css.mjs
		const css$3 = ".-\\38 z9vG_exportGroup{align-items:center;gap:6px;margin-left:auto;display:inline-flex}.-\\38 z9vG_exportBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border-radius:999px;padding:4px 11px;font-size:11.5px}.-\\38 z9vG_exportBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.-\\38 z9vG_exportBtn:disabled{opacity:.5;cursor:default}.-\\38 z9vG_exportBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}";
		const tagId$3 = "dsh-key-usage/export.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		const cssRegistry$3 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$3.some((e) => e.tagId === tagId$3)) cssRegistry$3.push({
			tagId: tagId$3,
			css: css$3
		});
		var export_module_css_default = {
			"exportBtn": "-8z9vG_exportBtn",
			"exportGroup": "-8z9vG_exportGroup"
		};
		//#endregion
		//#region src/client/tabs/DetailTab.tsx
		const RANGE_TABS = [
			["today", "今日"],
			["week", "周"],
			["month", "月"],
			["total", "总计"],
			["custom", "自定义"]
		];
		/** 图表最多铺开的列数：超过这个跨度的范围按天全画会挤成一团。 */
		const MAX_AXIS_DAYS = 366;
		/** 导出列：命中率与成本给数值（不带单位），方便在表格里继续算。 */
		const EXPORT_COLUMNS$3 = [
			{
				key: "date",
				label: "日期",
				value: (row) => row.date
			},
			{
				key: "calls",
				label: "调用",
				value: (row) => row.calls
			},
			{
				key: "inputTokens",
				label: "输入",
				value: (row) => row.inputTokens
			},
			{
				key: "outputTokens",
				label: "输出",
				value: (row) => row.outputTokens
			},
			{
				key: "cacheReadTokens",
				label: "缓存读",
				value: (row) => row.cacheReadTokens
			},
			{
				key: "cacheHitRate",
				label: "命中率(%)",
				value: (row) => hitRateValueOf(row)
			},
			{
				key: "cost",
				label: "成本(元)",
				value: (row) => row.cost
			}
		];
		/** 命中率数值（导出用；界面上的带 % 文本由 `hitRateOf` 生成）。 */
		function hitRateValueOf(row) {
			const total = row.inputTokens + row.outputTokens + row.cacheReadTokens;
			return total > 0 ? Math.round(row.cacheReadTokens / total * 1e3) / 10 : null;
		}
		function hitRateOf(cacheReadTokens, inputTokens, outputTokens) {
			const total = inputTokens + outputTokens + cacheReadTokens;
			return total > 0 ? (cacheReadTokens / total * 100).toFixed(1) + "%" : "—";
		}
		function daysBetween$1(from, to) {
			const fromTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const toTime = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
			return Math.max(1, Math.round((toTime - fromTime) / 864e5) + 1);
		}
		/** 范围内每一天的日期键（无数据的日子也要出现在横轴上）。 */
		function dateKeysOfRange(from, to) {
			const start = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const total = Math.min(daysBetween$1(from, to), MAX_AXIS_DAYS);
			const keys = [];
			for (let offset = 0; offset < total; offset += 1) keys.push(isoDate(new Date(start + offset * 864e5)));
			return keys;
		}
		function DetailTab(props) {
			const { usage, channels, bounds, tooltip, channelFilter } = props;
			if (usage === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.empty,
				children: "台账读取中或不可用…"
			});
			const safeTotals = usage.totals ?? {
				date: "",
				calls: 0,
				inputTokens: 0,
				outputTokens: 0,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
				reasoningTokens: 0,
				cost: 0
			};
			const totalTokens = safeTotals.inputTokens + safeTotals.outputTokens + safeTotals.cacheReadTokens;
			const hitRate = hitRateOf(safeTotals.cacheReadTokens, safeTotals.inputTokens, safeTotals.outputTokens);
			/** 缓存读在展示口径 Tokens 里的占比；分母为 0 时不给数字（避免显示 0% 误导）。 */
			const cacheReadShare = totalTokens > 0 ? (safeTotals.cacheReadTokens / totalTokens * 100).toFixed(1) + "%" : null;
			/** 范围内「有用量」的天数：日均 Tokens 的分母（拿日历天数去除会把空闲日算成用量偏低）。 */
			const activeDays = usage.days.filter((day) => day.inputTokens + day.outputTokens + day.cacheReadTokens > 0).length;
			const singleChannel = channelFilter === "ALL" ? null : channelOf(channels, channelFilter);
			const costCell = costCellText(singleChannel, safeTotals.cost);
			const singleDay = bounds.from === bounds.to;
			const rangeDays = Math.min(daysBetween$1(bounds.from, bounds.to), MAX_AXIS_DAYS);
			/** 导出当前范围与通道筛选后的每日明细（按日期升序，不跟随表格排序）。 */
			const exportDaily = (format) => {
				if (format === "csv") downloadFile(exportFileName("daily", "csv"), toCsv(usage.days, EXPORT_COLUMNS$3), CSV_MIME);
				else downloadFile(exportFileName("daily", "json"), toJson(usage.days), JSON_MIME);
			};
			const activeProviders = /* @__PURE__ */ new Set();
			for (const day of usage.days) for (const model of day.models) if (model.inputTokens + model.outputTokens + model.cacheReadTokens > 0) activeProviders.add(model.provider);
			const hourlyRows = [];
			if (singleDay && usage.hours !== null) usage.hours.forEach((slot, hour) => {
				const slotTokens = slot.buckets.inputTokens + slot.buckets.outputTokens + slot.buckets.cacheReadTokens;
				hourlyRows.push({
					key: String(hour),
					axisLabel: String(hour).padStart(2, "0") + ":00",
					cacheReadTokens: slot.buckets.cacheReadTokens,
					inputTokens: slot.buckets.inputTokens,
					outputTokens: slot.buckets.outputTokens,
					tip: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: bounds.from + " " + String(hour).padStart(2, "0") + ":00" }), slot.calls === 0 && slotTokens === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: "该小时无用量记录" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
							"调用 ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtCalls(slot.calls) }),
							" · Tokens ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtTokens(slotTokens) })
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-accent-primary, #5b8cff)",
							label: "输入",
							amount: fmtTokens(slot.buckets.inputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-business-primary, #9a7bff)",
							label: "输出",
							amount: fmtTokens(slot.buckets.outputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-accent-tertiary, rgba(91,140,255,.28))",
							label: "缓存读",
							amount: fmtTokens(slot.buckets.cacheReadTokens),
							rate: hitRateOf(slot.buckets.cacheReadTokens, slot.buckets.inputTokens, slot.buckets.outputTokens)
						})
					] })] })
				});
			});
			const sessionDates = new Set(usage.sessionDates ?? []);
			const dayByDate = new Map(usage.days.map((day) => [day.date, day]));
			const dailyRows = dateKeysOfRange(bounds.from, bounds.to).map((dateKey) => {
				const day = dayByDate.get(dateKey);
				if (day === void 0) return {
					key: dateKey,
					axisLabel: fmtShortDate(dateKey),
					cacheReadTokens: 0,
					inputTokens: 0,
					outputTokens: 0,
					tip: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: dateKey }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: "当日无用量记录" })] })
				};
				const dayTotal = day.inputTokens + day.outputTokens + day.cacheReadTokens;
				const fromSession = sessionDates.has(day.date);
				const topModels = [...day.models].sort((first, second) => second.inputTokens + second.outputTokens + second.cacheReadTokens - (first.inputTokens + first.outputTokens + first.cacheReadTokens)).slice(0, 5);
				return {
					key: day.date,
					axisLabel: fmtShortDate(day.date),
					cacheReadTokens: day.cacheReadTokens,
					inputTokens: day.inputTokens,
					outputTokens: day.outputTokens,
					tip: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: day.date }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
							"调用 ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtCalls(day.calls) }),
							" · Tokens ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtTokens(dayTotal) })
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-accent-primary, #5b8cff)",
							label: "输入",
							amount: fmtTokens(day.inputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-business-primary, #9a7bff)",
							label: "输出",
							amount: fmtTokens(day.outputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-accent-tertiary, rgba(91,140,255,.28))",
							label: "缓存读",
							amount: fmtTokens(day.cacheReadTokens),
							rate: hitRateOf(day.cacheReadTokens, day.inputTokens, day.outputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipDivider, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "成本" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: day.cost > 0 ? fmtCost(day.cost) : "—" })] }),
						fromSession && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: "来源：会话事件（该日台账无记录，不含官方成本）" }),
						topModels.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [model.model, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: shared_module_css_default.dim,
								children: [" · ", displayNameOf(channels, model.provider)]
							})] }),
							amount: fmtTokens(model.inputTokens + model.outputTokens + model.cacheReadTokens)
						}, model.provider + "|" + model.model))
					] })
				};
			});
			const useHourAxis = singleDay && usage.hours !== null;
			const chartRows = useHourAxis ? hourlyRows : dailyRows;
			const chartTitle = useHourAxis ? "按小时 Tokens（" + bounds.from + "）" : "按天 Tokens（" + rangeDays + " 天）";
			const chartAriaLabel = useHourAxis ? "按小时 Tokens 堆叠柱状图（" + bounds.from + "），共 " + String(chartRows.length) + " 个小时，含输入 / 输出 / 缓存读三段" : "按天 Tokens 堆叠柱状图，共 " + String(chartRows.length) + " 天（含无用量日），含输入 / 输出 / 缓存读三段";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.rangeBar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.rangeLeft,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: detail_module_css_default.rangeTabs,
							children: RANGE_TABS.map(([key, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: props.range === key ? detail_module_css_default.active : "",
								onClick: () => props.onRange(key),
								children: label
							}, key))
						}), props.range === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "date",
								className: detail_module_css_default.rangeInput,
								value: props.customFrom,
								onChange: (event) => props.onCustomFrom(event.target.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: shared_module_css_default.dim,
								children: "至"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "date",
								className: detail_module_css_default.rangeInput,
								value: props.customTo,
								onChange: (event) => props.onCustomTo(event.target.value)
							})
						] })]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: export_module_css_default.exportGroup,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: export_module_css_default.exportBtn,
							disabled: usage.days.length === 0,
							onClick: () => exportDaily("csv"),
							children: "导出 CSV"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: export_module_css_default.exportBtn,
							disabled: usage.days.length === 0,
							onClick: () => exportDaily("json"),
							children: "导出 JSON"
						})]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.cardGrid6,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "调用次数",
							value: fmtCalls(safeTotals.calls),
							extra: activeProviders.size + " 个通道有用量"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "Tokens",
							value: fmtTokens(totalTokens),
							extra: "输入 " + fmtTokens(safeTotals.inputTokens) + " · 输出 " + fmtTokens(safeTotals.outputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "缓存读",
							value: fmtTokens(safeTotals.cacheReadTokens),
							extra: cacheReadShare === null ? "与上方 Tokens 同口径" : "占 Tokens 的 " + cacheReadShare
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "缓存命中率",
							value: hitRate,
							extra: "缓存读 ÷（输入 + 输出 + 缓存读）"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "日均 Tokens",
							value: activeDays === 0 ? "—" : fmtTokens(Math.round(totalTokens / activeDays)),
							extra: "范围内 " + String(activeDays) + " 天有用量"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "成本",
							value: costCell.dim ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: shared_module_css_default.dim,
								children: costCell.text
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, showsAmount(costCell) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, { source: safeTotals.costSource })] }),
							extra: "按所选范围与筛选聚合"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrendPanel, {
					usage,
					channels,
					range: props.range,
					bounds,
					channelFilter,
					pricingRevision: props.pricingRevision
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareBar, {
					usage,
					totalTokens,
					channelFilter,
					channels,
					tooltip
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.chipRow,
					style: { marginTop: 14 },
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						className: channelFilter === "ALL" ? shared_module_css_default.chip + " " + shared_module_css_default.active : shared_module_css_default.chip,
						onClick: () => props.onChannelFilter("ALL"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.statusDot,
							style: { background: "var(--dsw-alias-state-accent-primary, #5b8cff)" }
						}), "全部通道"]
					}), channels.map((channel) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						className: channelFilter === channel.provider ? shared_module_css_default.chip + " " + shared_module_css_default.active : shared_module_css_default.chip,
						onClick: () => props.onChannelFilter(channel.provider),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.statusDot,
							style: { background: statusColorOf(channel.status) }
						}), channel.displayName]
					}, channel.provider))]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: detail_module_css_default.chartTitle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: 8
								},
								children: singleChannel === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "全部通道" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.statusDot,
									style: { background: statusColorOf(singleChannel.status) }
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: singleChannel.displayName })] })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: shared_module_css_default.dim,
								style: { fontSize: 11.5 },
								children: [
									bounds.from,
									" ~ ",
									bounds.to
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: detail_module_css_default.chartTitle,
							style: { marginTop: 10 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: shared_module_css_default.statLabel,
								children: chartTitle
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: shared_module_css_default.legend,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: "rgba(91,140,255,.28)" } }), "缓存读"] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: "var(--dsw-alias-state-accent-primary, #5b8cff)" } }), "输入"] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: "var(--dsw-alias-state-business-primary, #9a7bff)" } }), "输出"] })
								]
							})]
						}),
						chartRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: "所选范围内无用量记录"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TokenBars, {
							rows: chartRows,
							tooltip,
							ariaLabel: chartAriaLabel
						}),
						useHourAxis && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.statExtra,
							children: "按小时数据来自本地会话事件，不含成本"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DailyDetailTable, {
					usage,
					channels,
					channelFilter,
					expandedPeriods: props.expandedPeriods,
					onTogglePeriod: props.onTogglePeriod,
					sort: props.sort,
					onSort: props.onSort
				})
			] });
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/lists.module.css.mjs
		const css$2 = ".ysq2ha_filterBar{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;display:flex}.ysq2ha_searchInput{border:1px solid var(--dsw-alias-border-l2,#2c2c34);min-width:180px;color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;background:0 0;border-radius:9px;flex:1;padding:6px 12px;font-size:12.5px}.ysq2ha_searchInput::placeholder{color:var(--dsw-alias-label-tertiary,#67676f)}.ysq2ha_filterSelect{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;border-radius:9px;padding:6px 10px;font-size:12px}.ysq2ha_searchInput:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.ysq2ha_filterSelect:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.ysq2ha_listTitle{align-items:center;gap:10px;min-width:0;display:flex}.ysq2ha_listMain{color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;overflow:hidden}.ysq2ha_listSub{color:var(--dsw-alias-label-tertiary,#67676f);text-overflow:ellipsis;white-space:nowrap;margin-top:1px;font-size:10.5px;overflow:hidden}.ysq2ha_listBar{background:var(--dsw-alias-fill-l2,#80808c2e);vertical-align:middle;border-radius:3px;width:70px;height:5px;display:inline-block;overflow:hidden}.ysq2ha_listBar>i{border-radius:3px;height:100%;display:block}.ysq2ha_sessionDay td{background:var(--dsw-alias-bg-layer-2,#1d1d22);color:var(--dsw-alias-label-primary,#e8e8ec);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);font-size:12px;font-weight:600;text-align:left!important;padding:7px 10px!important}.ysq2ha_dayCount{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:8px;font-size:11px;font-weight:500}.ysq2ha_rowArchived td{opacity:.5}.ysq2ha_archivedTag{color:var(--dsw-alias-label-tertiary,#67676f);border:1px solid var(--dsw-alias-border-l2,#2c2c34);border-radius:999px;margin-left:6px;padding:0 6px;font-size:10px;font-weight:500}.ysq2ha_sessionTable{table-layout:fixed}.ysq2ha_sessionTable th:first-child{width:38%}.ysq2ha_sessionTable th:nth-child(2){width:13%}.ysq2ha_sessionTable th:nth-child(3){width:19%}.ysq2ha_sessionTable th:nth-child(4){width:11%}.ysq2ha_sessionTable th:nth-child(5){width:8%}.ysq2ha_sessionTable th:nth-child(6){width:11%}.ysq2ha_modelTable{table-layout:fixed}.ysq2ha_modelTable th:first-child{width:30%}.ysq2ha_modelTable th:nth-child(2){width:9%}.ysq2ha_modelTable th:nth-child(3){width:11%}.ysq2ha_modelTable th:nth-child(4){width:12%}.ysq2ha_modelTable th:nth-child(5){width:9%}.ysq2ha_modelTable th:nth-child(6){width:12%}.ysq2ha_modelTable th:nth-child(7){width:17%}.ysq2ha_projectTable{table-layout:fixed}.ysq2ha_projectTable th:first-child{width:38%}.ysq2ha_projectTable th:nth-child(2){width:10%}.ysq2ha_projectTable th:nth-child(3){width:12%}.ysq2ha_projectTable th:nth-child(4){width:13%}.ysq2ha_projectTable th:nth-child(5){width:12%}.ysq2ha_projectTable th:nth-child(6){width:15%}.ysq2ha_searchHint{color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap;font-size:10.5px}.ysq2ha_crossDayTag{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:6px}.ysq2ha_linkBtn{font:inherit;text-align:left;color:var(--dsw-alias-label-tertiary,#67676f);cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;max-width:100%;padding:0;font-size:10.5px;overflow:hidden}.ysq2ha_linkBtn:hover{color:var(--dsw-alias-state-accent-primary,#5b8cff);text-decoration:underline}.ysq2ha_linkBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.ysq2ha_focusChip{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);border-radius:999px;align-items:center;gap:6px;margin-bottom:10px;padding:3px 10px;font-size:11px;display:inline-flex}.ysq2ha_focusClear{color:inherit;font:inherit;cursor:pointer;background:0 0;border:0;padding:0}.ysq2ha_focusClear:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.ysq2ha_sessionToggle{font:inherit;color:inherit;cursor:pointer;background:0 0;border:0;flex-shrink:0;justify-content:center;align-items:center;gap:0;padding:0;display:inline-flex}.ysq2ha_sessionToggle:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.ysq2ha_sessionToggleArrow{width:11px;color:var(--dsw-alias-label-tertiary,#67676f);font-size:9px;display:inline-block}.ysq2ha_sessionTitleBtn{min-width:0;font:inherit;color:var(--dsw-alias-label-primary,#e8e8ec);cursor:pointer;text-align:left;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;flex:1;padding:0;font-size:12.5px;font-weight:600;overflow:hidden}.ysq2ha_sessionTitleBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.ysq2ha_composeCell{background:var(--dsw-alias-fill-l1,#80808c0d);text-align:left!important;padding:4px 10px 10px 30px!important}.ysq2ha_composeRow{grid-template-columns:minmax(120px,1.4fr) minmax(60px,.7fr) minmax(90px,1fr) minmax(70px,.8fr);align-items:center;gap:8px;padding:2px 0;font-size:11.5px;display:grid}.ysq2ha_composeHead{color:var(--dsw-alias-label-tertiary,#67676f);font-size:10.5px}.ysq2ha_composeName{color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ysq2ha_composeChannel{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:6px;font-size:10.5px}.ysq2ha_composeNumber{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6)}.ysq2ha_moreRow{align-items:center;gap:10px;margin-top:12px;display:flex}.ysq2ha_moreBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border-radius:999px;padding:4px 14px;font-size:11.5px}.ysq2ha_moreBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.ysq2ha_moreBtn:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.ysq2ha_moreText{color:var(--dsw-alias-label-tertiary,#67676f);font-size:11px}.ysq2ha_drawerMask{z-index:9000;background:var(--dsw-alias-bg-mask-1,#00000061);justify-content:flex-end;display:flex;position:fixed;top:0;bottom:0;left:0;right:0}.ysq2ha_drawerPanel{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#1d1d22);border-left:1px solid var(--dsw-alias-border-l1,#2c2c34);width:min(620px,94vw);height:100%;box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);padding:14px 18px 30px;overflow-y:auto}.ysq2ha_drawerHead{align-items:flex-start;gap:10px;display:flex}.ysq2ha_drawerTitle{min-width:0;color:var(--dsw-alias-label-primary,#e8e8ec);overflow-wrap:anywhere;flex:1;font-size:15px;font-weight:650}.ysq2ha_drawerClose{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);width:26px;height:26px;font:inherit;cursor:pointer;background:0 0;border-radius:8px;flex-shrink:0;font-size:12px;line-height:1}.ysq2ha_drawerClose:hover{color:var(--dsw-alias-label-primary,#e8e8ec);background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_drawerClose:focus-visible{outline:2px solid var(--dsw-alias-state-accent-primary,#5b8cff);outline-offset:2px}.ysq2ha_drawerId{color:var(--dsw-alias-label-tertiary,#67676f);overflow-wrap:anywhere;margin:2px 0 12px;font-family:ui-monospace,Consolas,monospace;font-size:10.5px}.ysq2ha_detailGrid{grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px 14px;display:grid}.ysq2ha_detailItemWide{grid-column:1/-1}.ysq2ha_detailItemLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:10.5px}.ysq2ha_detailItemValue{color:var(--dsw-alias-label-primary,#e8e8ec);font-variant-numeric:tabular-nums;overflow-wrap:anywhere;font-size:12px}.ysq2ha_detailItemNote{color:var(--dsw-alias-label-tertiary,#67676f);font-size:10px}.ysq2ha_detailStrip{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:10px;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:8px 12px;margin:12px 0 4px;padding:10px 12px;display:grid}.ysq2ha_detailBlock{margin-top:16px}.ysq2ha_detailBlockTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:6px;font-size:11.5px;font-weight:600}.ysq2ha_detailCost{color:var(--dsw-alias-label-primary,#e8e8ec);font-variant-numeric:tabular-nums;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px;display:flex}.ysq2ha_detailCostHint{color:var(--dsw-alias-label-tertiary,#67676f);font-size:11px}.ysq2ha_promptText{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-fill-l1,#80808c0f);max-height:220px;color:var(--dsw-alias-label-primary,#e8e8ec);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.6;overflow-y:auto}.ysq2ha_sessionDetailModelTable{table-layout:fixed}.ysq2ha_sessionDetailModelTable th:first-child{width:40%}.ysq2ha_sessionDetailModelTable th:nth-child(2){width:18%}.ysq2ha_sessionDetailModelTable th:nth-child(3){width:24%}.ysq2ha_sessionDetailModelTable th:nth-child(4){width:18%}.ysq2ha_hourChart{align-items:flex-end;gap:2px;height:84px;margin-top:6px;display:flex}.ysq2ha_hourBar{flex-direction:column;flex:1;justify-content:flex-end;gap:2px;height:100%;display:flex}.ysq2ha_hourBarFill{background:var(--dsw-alias-state-accent-primary,#5b8cff);border-radius:2px 2px 0 0;min-height:1px;display:block}.ysq2ha_hourBarTick{text-align:center;color:var(--dsw-alias-label-tertiary,#67676f);font-size:9px}";
		const tagId$2 = "dsh-key-usage/lists.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		const cssRegistry$2 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$2.some((e) => e.tagId === tagId$2)) cssRegistry$2.push({
			tagId: tagId$2,
			css: css$2
		});
		var lists_module_css_default = {
			"archivedTag": "ysq2ha_archivedTag",
			"composeCell": "ysq2ha_composeCell",
			"composeChannel": "ysq2ha_composeChannel",
			"composeHead": "ysq2ha_composeHead",
			"composeName": "ysq2ha_composeName",
			"composeNumber": "ysq2ha_composeNumber",
			"composeRow": "ysq2ha_composeRow",
			"crossDayTag": "ysq2ha_crossDayTag",
			"dayCount": "ysq2ha_dayCount",
			"detailBlock": "ysq2ha_detailBlock",
			"detailBlockTitle": "ysq2ha_detailBlockTitle",
			"detailCost": "ysq2ha_detailCost",
			"detailCostHint": "ysq2ha_detailCostHint",
			"detailGrid": "ysq2ha_detailGrid",
			"detailItemLabel": "ysq2ha_detailItemLabel",
			"detailItemNote": "ysq2ha_detailItemNote",
			"detailItemValue": "ysq2ha_detailItemValue",
			"detailItemWide": "ysq2ha_detailItemWide",
			"detailStrip": "ysq2ha_detailStrip",
			"drawerClose": "ysq2ha_drawerClose",
			"drawerHead": "ysq2ha_drawerHead",
			"drawerId": "ysq2ha_drawerId",
			"drawerMask": "ysq2ha_drawerMask",
			"drawerPanel": "ysq2ha_drawerPanel",
			"drawerTitle": "ysq2ha_drawerTitle",
			"filterBar": "ysq2ha_filterBar",
			"filterSelect": "ysq2ha_filterSelect",
			"focusChip": "ysq2ha_focusChip",
			"focusClear": "ysq2ha_focusClear",
			"hourBar": "ysq2ha_hourBar",
			"hourBarFill": "ysq2ha_hourBarFill",
			"hourBarTick": "ysq2ha_hourBarTick",
			"hourChart": "ysq2ha_hourChart",
			"linkBtn": "ysq2ha_linkBtn",
			"listBar": "ysq2ha_listBar",
			"listMain": "ysq2ha_listMain",
			"listSub": "ysq2ha_listSub",
			"listTitle": "ysq2ha_listTitle",
			"modelTable": "ysq2ha_modelTable",
			"moreBtn": "ysq2ha_moreBtn",
			"moreRow": "ysq2ha_moreRow",
			"moreText": "ysq2ha_moreText",
			"projectTable": "ysq2ha_projectTable",
			"promptText": "ysq2ha_promptText",
			"rowArchived": "ysq2ha_rowArchived",
			"searchHint": "ysq2ha_searchHint",
			"searchInput": "ysq2ha_searchInput",
			"sessionDay": "ysq2ha_sessionDay",
			"sessionDetailModelTable": "ysq2ha_sessionDetailModelTable",
			"sessionTable": "ysq2ha_sessionTable",
			"sessionTitleBtn": "ysq2ha_sessionTitleBtn",
			"sessionToggle": "ysq2ha_sessionToggle",
			"sessionToggleArrow": "ysq2ha_sessionToggleArrow"
		};
		//#endregion
		//#region src/client/tabs/ModelsTab.tsx
		/** 按模型：`provider + model` 聚合的用量与估算成本（数据来自宿主会话事件折叠）。 */
		const MODELS_PATH = "/dsh-key-usage/models";
		/** 导出列：取原始数值（金额、命中率不带单位），方便直接进表格做计算。 */
		const EXPORT_COLUMNS$2 = [
			{
				key: "provider",
				label: "通道 id",
				value: (row) => row.provider
			},
			{
				key: "providerLabel",
				label: "通道",
				value: (row) => row.providerLabel
			},
			{
				key: "model",
				label: "模型",
				value: (row) => row.model
			},
			{
				key: "calls",
				label: "调用",
				value: (row) => row.calls
			},
			{
				key: "tokens",
				label: "Tokens",
				value: (row) => row.tokens
			},
			{
				key: "inputTokens",
				label: "输入",
				value: (row) => row.buckets.inputTokens
			},
			{
				key: "outputTokens",
				label: "输出",
				value: (row) => row.buckets.outputTokens
			},
			{
				key: "cacheReadTokens",
				label: "缓存读",
				value: (row) => row.buckets.cacheReadTokens
			},
			{
				key: "cacheHitRate",
				label: "命中率(%)",
				value: (row) => row.cacheHitRate
			},
			{
				key: "cost",
				label: "成本(元)",
				value: (row) => row.cost
			},
			{
				key: "costSource",
				label: "成本来源",
				value: (row) => row.costSource === void 0 ? null : COST_SOURCE_LABELS[row.costSource]
			},
			{
				key: "costMode",
				label: "计费模式",
				value: (row) => row.costMode
			},
			{
				key: "sessionCount",
				label: "会话数",
				value: (row) => row.sessionCount
			},
			{
				key: "lastTime",
				label: "最近活跃",
				value: (row) => fmtDateTime(row.lastTime)
			}
		];
		function ModelsTab(props) {
			const [query, setQuery] = (0, react.useState)("");
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			const [sortKey, setSortKey] = (0, react.useState)("tokensDesc");
			const [nowMs] = (0, react.useState)(() => Date.now());
			const rows = props.data?.rows ?? [];
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
					const haystack = (row.model + " " + row.provider + " " + row.providerLabel).toLowerCase();
					const matchesQuery = keyword === "" || haystack.includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.provider === channelFilter;
					return matchesQuery && matchesChannel;
				});
				const sorters = {
					tokensDesc: (first, second) => second.tokens - first.tokens,
					callsDesc: (first, second) => second.calls - first.calls,
					costDesc: (first, second) => (second.cost ?? 0) - (first.cost ?? 0),
					recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0)
				};
				return [...filtered].sort(sorters[sortKey]);
			}, [
				rows,
				query,
				channelFilter,
				sortKey
			]);
			const totalTokens = rows.reduce((total, row) => total + row.tokens, 0);
			const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden;
			/** 导出当前筛选与排序后的行（JSON 取整行，CSV 按固定列映射）。 */
			const exportRows = (format) => {
				if (format === "csv") downloadFile(exportFileName("models", "csv"), toCsv(visible, EXPORT_COLUMNS$2), CSV_MIME);
				else downloadFile(exportFileName("models", "json"), toJson(visible), JSON_MIME);
			};
			if (props.data === null) {
				const reason = failureReasonOf(MODELS_PATH);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: reason === null ? "按模型数据读取中…" : "按模型数据不可用：" + reason
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				props.data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.warning,
					children: coverageText$1(props.data.coverage.status, props.data.coverage.skippedSessions)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.filterBar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: lists_module_css_default.searchInput,
							placeholder: "搜索模型名、通道…",
							value: query,
							onChange: (event) => setQuery(event.target.value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: lists_module_css_default.filterSelect,
							value: channelFilter,
							onChange: (event) => setChannelFilter(event.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "ALL",
								children: "全部通道"
							}), props.channels.map((channel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: channel.provider,
								children: channel.displayName
							}, channel.provider))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: lists_module_css_default.filterSelect,
							value: sortKey,
							onChange: (event) => setSortKey(event.target.value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "tokensDesc",
									children: "Tokens 最多"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "callsDesc",
									children: "调用最多"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "costDesc",
									children: "成本最高"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "recent",
									children: "最近活跃"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: export_module_css_default.exportGroup,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: export_module_css_default.exportBtn,
								disabled: visible.length === 0,
								onClick: () => exportRows("csv"),
								children: "导出 CSV"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: export_module_css_default.exportBtn,
								disabled: visible.length === 0,
								onClick: () => exportRows("json"),
								children: "导出 JSON"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: shared_module_css_default.table + " " + lists_module_css_default.modelTable,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "模型" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "调用" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "占比" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "命中率" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "成本" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "最近活跃" })
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [visible.map((row) => {
						const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0;
						const channel = channelOf(props.channels, row.provider);
						const costCell = costCellText(channel, row.cost ?? 0);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: lists_module_css_default.listTitle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lists_module_css_default.listMain,
									children: row.model
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lists_module_css_default.listSub,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: shared_module_css_default.statusDot,
											style: {
												background: channelColorOf(props.channels, row.provider),
												marginRight: 4
											}
										}),
										row.providerLabel,
										" · ",
										row.sessionCount,
										" 个会话"
									]
								})] })
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtCalls(row.calls) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(row.tokens) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.listBar,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
										width: Math.max(2, percent) + "%",
										background: channelColorOf(props.channels, row.provider)
									} })
								}),
								" ",
								percent,
								"%"
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cacheHitRate === null ? "—" : row.cacheHitRate.toFixed(1) + "%" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cost === null || channel?.costMode !== "perToken" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: shared_module_css_default.dim,
								children: costCell.text
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, showsAmount(costCell) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, { source: row.costSource })] }) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtRelative(row.lastTime, nowMs) })
						] }, row.provider + "|" + row.model);
					}), visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						colSpan: 7,
						className: shared_module_css_default.empty,
						children: "没有符合条件的模型"
					}) })] })]
				}),
				hiddenEmpty > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: hiddenEmptyRowsText(hiddenEmpty)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: [
						"模型用量按宿主会话事件折叠（每个结算样本计一次调用）；成本按台账模型均价估算",
						props.data.priced ? "" : "（台账无成本数据，暂不可估）",
						"；命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）"
					]
				})
			] });
		}
		function coverageText$1(status, skipped) {
			if (status === "unavailable") return "会话数据不可用（宿主未提供会话服务或全部读取失败）";
			return "会话数据不完整：" + String(skipped) + " 个会话读取失败，未计入统计";
		}
		//#endregion
		//#region src/client/tabs/ProjectsTab.tsx
		/** 项目用量：按会话工作目录聚合（数据来自宿主会话事件折叠）。 */
		/** 导出列：成本与命中率都给原始数值，方便在表格里继续算。 */
		const EXPORT_COLUMNS$1 = [
			{
				key: "workspace",
				label: "项目路径",
				value: (row) => row.workspace
			},
			{
				key: "dominantProvider",
				label: "主要通道",
				value: (row) => row.dominantProvider
			},
			{
				key: "calls",
				label: "调用",
				value: (row) => row.calls
			},
			{
				key: "tokens",
				label: "Tokens",
				value: (row) => row.tokens
			},
			{
				key: "cacheHitRate",
				label: "命中率(%)",
				value: (row) => row.cacheHitRate
			},
			{
				key: "cost",
				label: "成本(元)",
				value: (row) => row.cost
			},
			{
				key: "costSource",
				label: "成本来源",
				value: (row) => row.costSource === void 0 ? null : COST_SOURCE_LABELS[row.costSource]
			},
			{
				key: "sessionCount",
				label: "会话数",
				value: (row) => row.sessionCount
			},
			{
				key: "archivedSessionCount",
				label: "已归档会话数",
				value: (row) => row.archivedSessionCount
			},
			{
				key: "lastTime",
				label: "最近活跃",
				value: (row) => fmtDateTime(row.lastTime)
			}
		];
		function ProjectsTab(props) {
			const [query, setQuery] = (0, react.useState)("");
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			const [sortKey, setSortKey] = (0, react.useState)("recent");
			const [nowMs] = (0, react.useState)(() => Date.now());
			const rows = props.data?.rows ?? [];
			const focusWorkspace = props.focusWorkspace ?? null;
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
					const matchesQuery = keyword === "" || row.workspace.toLowerCase().includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.providers[channelFilter] !== void 0;
					const matchesFocus = focusWorkspace === null || row.workspace === focusWorkspace;
					return matchesQuery && matchesChannel && matchesFocus;
				});
				const sorters = {
					recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
					tokensDesc: (first, second) => second.tokens - first.tokens,
					tokensAsc: (first, second) => first.tokens - second.tokens,
					callsDesc: (first, second) => second.calls - first.calls
				};
				return [...filtered].sort(sorters[sortKey]);
			}, [
				rows,
				query,
				channelFilter,
				sortKey,
				focusWorkspace
			]);
			const totalTokens = rows.reduce((total, row) => total + row.tokens, 0);
			const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden;
			/** 导出当前筛选与排序后的项目行（JSON 取整行，CSV 按固定列映射）。 */
			const exportRows = (format) => {
				if (format === "csv") downloadFile(exportFileName("projects", "csv"), toCsv(visible, EXPORT_COLUMNS$1), CSV_MIME);
				else downloadFile(exportFileName("projects", "json"), toJson(visible), JSON_MIME);
			};
			if (props.data === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.empty,
				children: "会话数据读取中或不可用…"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				props.data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.warning,
					children: coverageText(props.data.coverage.status, props.data.coverage.skippedSessions)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.filterBar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: lists_module_css_default.searchInput,
							placeholder: "搜索项目路径…",
							value: query,
							onChange: (event) => setQuery(event.target.value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: lists_module_css_default.filterSelect,
							value: channelFilter,
							onChange: (event) => setChannelFilter(event.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "ALL",
								children: "全部通道"
							}), props.channels.map((channel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: channel.provider,
								children: channel.displayName
							}, channel.provider))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: lists_module_css_default.filterSelect,
							value: sortKey,
							onChange: (event) => setSortKey(event.target.value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "recent",
									children: "最近活跃"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "tokensDesc",
									children: "Tokens 最多"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "tokensAsc",
									children: "Tokens 最少"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "callsDesc",
									children: "调用最多"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: export_module_css_default.exportGroup,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: export_module_css_default.exportBtn,
								disabled: visible.length === 0,
								onClick: () => exportRows("csv"),
								children: "导出 CSV"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: export_module_css_default.exportBtn,
								disabled: visible.length === 0,
								onClick: () => exportRows("json"),
								children: "导出 JSON"
							})]
						})
					]
				}),
				focusWorkspace !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.focusChip,
					children: [
						"仅看项目：",
						focusWorkspace,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: lists_module_css_default.focusClear,
							onClick: () => props.onClearFocus?.(),
							"aria-label": "清除项目筛选",
							children: "✕"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: shared_module_css_default.table + " " + lists_module_css_default.projectTable,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "项目" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "调用" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "占比" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "成本" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "最近活跃" })
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [visible.map((row) => {
						const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0;
						const dominant = row.dominantProvider;
						const channel = channelOf(props.channels, dominant);
						const costCell = costCellText(channel, row.cost ?? 0);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: lists_module_css_default.listTitle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lists_module_css_default.listMain,
									children: baseNameOf(row.workspace)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lists_module_css_default.listSub,
									children: [
										row.workspace,
										" · ",
										row.sessionCount,
										" 个会话",
										row.archivedSessionCount > 0 ? "（含 " + row.archivedSessionCount + " 个已归档，仍计入）" : ""
									]
								})] })
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtCalls(row.calls) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(row.tokens) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.listBar,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
										width: Math.max(2, percent) + "%",
										background: channelColorOf(props.channels, dominant ?? "")
									} })
								}),
								" ",
								percent,
								"%"
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cost === null || channel?.costMode === "sub" || channel?.costMode === "free" || channel?.costMode === "none" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: shared_module_css_default.dim,
								children: costCell.text
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, showsAmount(costCell) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, { source: row.costSource })] }) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtRelative(row.lastTime, nowMs) })
						] }, row.workspace);
					}), visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						colSpan: 6,
						className: shared_module_css_default.empty,
						children: focusWorkspace === null ? "没有符合条件的项目" : "这个项目没有可展示的用量（可能只有失败的调用）"
					}) })] })]
				}),
				hiddenEmpty > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: hiddenEmptyRowsText(hiddenEmpty)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: [
						"成本按台账模型中位均价估算",
						props.data.priced ? "" : "（台账无成本数据，暂不可估）",
						"；命中率 = 缓存读 /（输入 + 输出 + 缓存读）"
					]
				})
			] });
		}
		function coverageText(status, skipped) {
			if (status === "unavailable") return "会话数据不可用（宿主未提供会话服务或全部读取失败）";
			return "会话数据不完整：" + String(skipped) + " 个会话读取失败，未计入统计";
		}
		function baseNameOf(path) {
			const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/);
			return parts[parts.length - 1] === "" ? path : parts[parts.length - 1];
		}
		//#endregion
		//#region src/client/components/PricingRulesPanel.tsx
		/**
		* 计费规则面板：并入「余额与配额」页下半部分（不新增 Tab）。
		*
		* 层级：默认只显示一行摘要（依据 / 已省 / 口径 + 「配置规则」），细节全部收进抽屉。
		*
		* 事实来源是用户的 `pricing-rules.yml`：面板保存走 `POST /pricing/rules` 整批提交（服务端按
		* provider|model 继承旧条目的 unit / offPeak / note），保存后由页面重取 `/pricing` 与用量。
		* 表单只编辑 通道 / 模型 / 币种 / 四档单价 五个字段；unit / offPeak / note 只在 YAML 里维护，
		* 界面上必须明示这一点（见 FORM_EXTRAS_HINT），否则用户会以为保存把它们清掉了。
		* 规则列表上方的通道过滤只影响展示 —— 保存永远提交全部规则（包括被过滤掉的那些）。
		*/
		/** 解析问题默认只列几条：一屏列不完的清单没人读，展开再看全部。 */
		const ISSUE_LIMIT = 5;
		/** 缺口模型列表默认列几条（按 tokens 倒序），其余折叠。 */
		const MODEL_LIST_LIMIT = 8;
		/** 复制到剪贴板；拿不到剪贴板权限时返回 false，由调用方提示改用「下载」。 */
		async function copyText(text) {
			try {
				if (navigator.clipboard === void 0) return false;
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				return false;
			}
		}
		function PricingRulesPanel(props) {
			const { pricing, channels } = props;
			const instanceId = (0, react.useId)();
			const drawerId = instanceId + "-drawer";
			const providersListId = instanceId + "-providers";
			const modelsListId = instanceId + "-models";
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)(null);
			const [editingKey, setEditingKey] = (0, react.useState)(null);
			const [editorError, setEditorError] = (0, react.useState)(null);
			const [saveError, setSaveError] = (0, react.useState)(null);
			const [notice, setNotice] = (0, react.useState)(null);
			const [saving, setSaving] = (0, react.useState)(false);
			const [showAllSavings, setShowAllSavings] = (0, react.useState)(false);
			const [showExplanation, setShowExplanation] = (0, react.useState)(false);
			const [showAllIssues, setShowAllIssues] = (0, react.useState)(false);
			const [showAllModels, setShowAllModels] = (0, react.useState)(false);
			const [showPrompt, setShowPrompt] = (0, react.useState)(false);
			/** null = 不过滤（显示全部通道）；数组 = 只显示这些通道的规则。 */
			const [providerFilter, setProviderFilter] = (0, react.useState)(null);
			/** 默认过滤只设一次初值，之后完全交给用户点的芯片（否则用户取消过滤会被再次覆盖）。 */
			const [filterInitialized, setFilterInitialized] = (0, react.useState)(false);
			const rules = pricing?.rules ?? [];
			const catalog = pricing?.catalog ?? null;
			const files = pricing?.files;
			const issues = pricing?.issues ?? [];
			const currency = pricing?.currency ?? "CNY";
			const catalogStale = catalog === null ? null : catalogStaleDays(catalog.sources);
			const providerOptions = (0, react.useMemo)(() => channels.map((channel) => channel.provider), [channels]);
			const modelOptions = (0, react.useMemo)(() => {
				const ids = /* @__PURE__ */ new Set();
				for (const channel of channels) for (const model of channel.models) ids.add(model.id);
				for (const row of props.models?.rows ?? []) ids.add(row.model);
				return [...ids];
			}, [channels, props.models]);
			/** 「你的通道」= cordis.yml 里配置过的 provider；内置价目的来源按它折叠无关项。 */
			const usedProviders = (0, react.useMemo)(() => new Set(channels.map((channel) => channel.provider)), [channels]);
			const catalogRules = catalog?.rules ?? [];
			const relatedCatalogCount = catalogRules.filter((rule) => rule.provider === "*" || usedProviders.has(rule.provider)).length;
			const visibleSources = (catalog?.sources ?? []).filter((entry) => entry.providers.some((provider) => usedProviders.has(provider)));
			/** 过滤只影响展示：成本照旧按完整规则与内置价目算，保存也提交全部规则。 */
			const visibleRules = providerFilter === null ? rules : rules.filter((rule) => providerFilter.includes(rule.provider));
			const hiddenRulesCount = rules.length - visibleRules.length;
			const uncovered = (0, react.useMemo)(() => unpricedModelsOf(props.models?.rows ?? [], rules, catalogRules), [
				props.models,
				rules,
				catalogRules
			]);
			const shownUncovered = showAllModels ? uncovered : uncovered.slice(0, MODEL_LIST_LIMIT);
			const providerChips = (0, react.useMemo)(() => chipEntriesOf(rules, channels), [rules, channels]);
			const channelLabelOf = (provider) => channels.find((channel) => channel.provider === provider)?.displayName ?? provider;
			/**
			* 默认只显示「你的通道」：未配置通道的规则（通道被删掉或改过名）要主动点「显示全部」才看得到。
			* `*` 通配规则对任何通道都生效，因此始终算在默认可见里；channels 是异步到的，所以到齐后才设初值。
			*/
			(0, react.useEffect)(() => {
				if (filterInitialized || providerChips.length === 0) return;
				setFilterInitialized(true);
				const initial = providerChips.filter((chip) => chip.provider === "*" || usedProviders.has(chip.provider)).map((chip) => chip.provider);
				if (initial.length < providerChips.length) setProviderFilter(initial);
			}, [
				filterInitialized,
				providerChips,
				usedProviders
			]);
			const maybeRefreshNotice = (message) => {
				setNotice(message);
				setSaveError(null);
			};
			/**
			* 唯一的写盘入口：整批提交。
			* 传进来的 `nextRules` 必须是**全部**规则（不是过滤后的子集），删除靠「不在列表里」表达。
			*/
			const submit = async (nextRules, doneText) => {
				if (saving) return;
				setSaving(true);
				setSaveError(null);
				const result = await savePricingRules(nextRules.map(submittableRuleOf));
				setSaving(false);
				if (result === null) {
					setSaveError(failureReasonOf("/dsh-key-usage/pricing/rules") ?? "保存请求失败：没拿到服务端响应");
					return;
				}
				if (!result.ok) {
					setSaveError(result.error);
					return;
				}
				const issueCount = (result.issues ?? []).length;
				setNotice(doneText + "：已写入 " + result.path + "（" + String(result.entries) + " 条）" + (issueCount > 0 ? "；文件里还有 " + String(issueCount) + " 处解析问题，见下方列表" : ""));
				setDraft(null);
				setEditingKey(null);
				setEditorError(null);
				props.onSaved();
			};
			const startNew = () => {
				setDraft(blankRule(currency));
				setEditingKey(null);
				setEditorError(null);
			};
			const startEdit = (rule) => {
				setDraft(structuredClone(rule));
				setEditingKey(ruleKeyOf(rule));
				setEditorError(null);
			};
			const commitDraft = async () => {
				if (draft === null) return;
				const problem = ruleProblemOf(draft);
				if (problem !== null) {
					setEditorError(problem);
					return;
				}
				const nextRules = [...rules];
				const editedIndex = editingKey === null ? -1 : nextRules.findIndex((rule) => ruleKeyOf(rule) === editingKey);
				const duplicateIndex = nextRules.findIndex((rule) => ruleKeyOf(rule) === ruleKeyOf(draft));
				if (editedIndex >= 0) {
					nextRules[editedIndex] = draft;
					if (duplicateIndex >= 0 && duplicateIndex !== editedIndex) nextRules.splice(duplicateIndex, 1);
				} else if (duplicateIndex >= 0) nextRules[duplicateIndex] = draft;
				else nextRules.push(draft);
				await submit(nextRules, editingKey === null ? "规则已新增" : "规则已保存");
			};
			const removeRule = async (rule) => {
				await submit(rules.filter((candidate) => candidate !== rule), "规则已删除");
			};
			const clearRules = async () => {
				if (!window.confirm("清空后规则条目会从 YAML 文件里删除，成本回到内置官方价目与台账均价。确定清空吗？")) return;
				await submit([], "已清空规则");
			};
			/** 「下载规则模板」：内置价目 ∩ 你实际用到的模型（价格预填）+ 缺价格依据的模型（注释占位待填）。 */
			const downloadTemplate = () => {
				const usedModels = (props.models?.rows ?? []).filter((row) => row.tokens > 0).map((row) => ({
					provider: row.provider,
					model: row.model
				}));
				const template = buildRulesTemplateYaml(catalog, usedModels, rules, uncovered, currency);
				downloadFile(exportFileName("pricing-template", "yml"), template.text, YAML_MIME);
				maybeRefreshNotice("模板已下载：按内置价目预填 " + String(template.prefilledCount) + " 条（只含你用到的模型）" + (template.pendingCount > 0 ? "，另有 " + String(template.pendingCount) + " 个缺价格依据的模型以注释占位 —— 填好后删掉行首的「# 」" : ""));
			};
			const snippetOf = (rule, placeholder) => buildRuleSnippetYaml(rule, placeholder);
			const ruleForModel = (model) => ({
				...blankRule(currency),
				provider: model.provider,
				model: model.model
			});
			const downloadSnippet = (rule, placeholder, label) => {
				downloadFile(exportFileName("pricing-rule-" + fileSafeOf(rule.provider + "-" + rule.model), "yml"), snippetOf(rule, placeholder), YAML_MIME);
				maybeRefreshNotice("已下载片段：" + label + "（粘到规则文件的 rules: 下面即可）");
			};
			const copySnippet = async (rule, placeholder, label) => {
				const copied = await copyText(snippetOf(rule, placeholder));
				maybeRefreshNotice(copied ? "已复制片段：" + label : "复制失败：浏览器没有把剪贴板权限给这个页面，请改用「下载片段」");
			};
			const promptText = buildAgentPrompt({
				filePath: files?.user.path ?? null,
				currency,
				rulesCount: rules.length,
				catalogEntries: catalog?.entries ?? 0,
				uncovered
			});
			const copyPrompt = async () => {
				const copied = await copyText(promptText);
				maybeRefreshNotice(copied ? "提示词已复制：粘给 DSH 即可（里面带着目标文件路径与 " + String(uncovered.length) + " 个缺口模型）" : "复制失败：浏览器没有把剪贴板权限给这个页面，请改用「下载提示词」");
			};
			const coverage = pricing?.coverage ?? null;
			const savingsEntries = Object.entries(coverage?.savingsByCurrency ?? {}).filter(([, amount]) => amount > 0);
			const savingsDetail = coverage?.savingsDetail ?? [];
			const visibleSavings = showAllSavings ? savingsDetail : savingsDetail.slice(0, 3);
			const ruleCostEntries = Object.entries(coverage?.ruleCostByCurrency ?? {}).filter(([, amount]) => amount > 0);
			const shownIssues = showAllIssues ? issues : issues.slice(0, ISSUE_LIMIT);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: pricing_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SummaryStrip, {
						coverage,
						rulesCount: rules.length,
						loading: pricing === null,
						savingsEntries,
						expanded,
						onToggle: () => setExpanded((previous) => !previous),
						drawerId,
						showExplanation,
						onToggleExplanation: () => setShowExplanation((previous) => !previous)
					}),
					showExplanation && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationBlock, {}),
					expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: pricing_module_css_default.drawer,
						id: drawerId,
						children: [
							pricing !== null && pricing.rulesOrigin !== "file" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: pricing_module_css_default.warning,
								children: RULES_ORIGIN_TEXT[pricing.rulesOrigin]
							}),
							pricing !== null && !pricing.writable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: pricing_module_css_default.warning,
								children: "服务端拒绝写盘（只接受本机回环请求）：规则暂时只能在 YAML 文件里手改，改完刷新页面即生效。"
							}),
							saveError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.error,
								children: ["保存失败：", saveError]
							}),
							notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: pricing_module_css_default.panelHint,
								children: notice
							}),
							files !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.fileLine,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"用户规则 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: pricing_module_css_default.pathText,
										children: files.user.path
									}),
									files.user.exists ? "（" + String(files.user.entries) + " 条）" : "（还没有这个文件，面板保存后会创建）"
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"内置价目 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: pricing_module_css_default.pathText,
										children: files.catalog.path
									}),
									files.catalog.exists ? "（" + String(files.catalog.entries) + " 条）" : "（读不到，成本会缺一层依据）"
								] })]
							}),
							issues.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.issueBlock,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: pricing_module_css_default.issueHead,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", { children: [String(issues.length), " 处 YAML 解析问题"] }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: pricing_module_css_default.issueNote,
											children: "—— 这些问题所在的条目已被跳过，成本按内置价目 / 台账均价算"
										}),
										issues.length > ISSUE_LIMIT && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											className: pricing_module_css_default.linkBtn,
											"aria-expanded": showAllIssues,
											onClick: () => setShowAllIssues((previous) => !previous),
											children: showAllIssues ? "收起" : "展开全部（" + String(issues.length) + " 条）"
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: pricing_module_css_default.issueList,
									children: shownIssues.map((issue, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: pricing_module_css_default.issueWhere,
										children: [issue.file === "user" ? "用户规则" : "内置价目", issue.line === null ? "" : " 第 " + String(issue.line) + " 行"]
									}), issue.message] }, issue.file + "|" + String(issue.line) + "|" + String(index)))
								})]
							}),
							ruleCostEntries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: pricing_module_css_default.statStrip,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: pricing_module_css_default.statItem,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: pricing_module_css_default.statName,
											children: "按当前规则试算（近 30 天，仅参照）"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: pricing_module_css_default.statNum,
											children: ruleCostEntries.map(([ruleCurrency, amount]) => moneyTextOf(ruleCurrency, amount)).join(" / ")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: pricing_module_css_default.statNote,
											children: "不是账单：实际成本按「官方 > 规则 > 官方价 > 均价」逐格取值"
										})
									]
								})
							}),
							catalog !== null && catalog.entries > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.catalogNote + (catalogStale === null ? "" : " " + pricing_module_css_default.catalogStale),
								children: [
									"已内置 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: String(catalog.entries) }),
									" 条厂商官方价目，",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "自动生效，不需要你维护" }),
									"（你的规则优先于它）",
									catalogRules.length > 0 && relatedCatalogCount < catalogRules.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										"，其中 ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: String(relatedCatalogCount) }),
										" 条属于你的通道"
									] }),
									"。来源：",
									visibleSources.map((entry, index) => {
										const daysAgo = fetchedDaysAgo(entry.fetchedAt);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
											index > 0 && "；",
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
												className: pricing_module_css_default.linkBtn,
												href: entry.source,
												target: "_blank",
												rel: "noreferrer",
												children: entry.providers.join(" / ")
											}),
											"（",
											entry.count,
											" 条，",
											entry.fetchedAt,
											" 抓取",
											daysAgo === null ? "" : "，距今 " + String(daysAgo) + " 天",
											"）"
										] }, entry.source);
									}),
									visibleSources.length < catalog.sources.length && "　其余来源属于未配置的通道，已折叠。",
									catalogStale !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: ["　", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", { children: [
										"价目最新一次抓取距今 ",
										String(catalogStale),
										" 天，建议按官方文档复核价目。"
									] })] })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.toolbar,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: pricing_module_css_default.actionBtn,
										disabled: pricing === null,
										title: props.models == null ? "还没读到按模型用量：模板里只会给字段说明与空 rules" : "按内置价目预填你实际用到的模型，并把缺价格依据的模型注释占位",
										onClick: downloadTemplate,
										children: "下载规则模板"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: pricing_module_css_default.actionBtn + " " + pricing_module_css_default.primary,
										disabled: saving,
										onClick: startNew,
										children: "＋ 新增规则"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: pricing_module_css_default.actionBtn,
										"aria-expanded": showPrompt,
										title: "生成一段可以直接交给 DSH 的提示词：带上这个文件的路径与缺价格依据的模型",
										onClick: () => setShowPrompt((previous) => !previous),
										children: "让 DSH 帮我配"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: pricing_module_css_default.toolbarSpacer }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: pricing_module_css_default.linkBtn,
										disabled: rules.length === 0 || saving,
										onClick: () => void clearRules(),
										children: "清空规则"
									})
								]
							}),
							showPrompt && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.promptBlock,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: pricing_module_css_default.promptHead,
										children: "把这段提示词交给 DSH（也可以复制给别的 agent）：它会按下面这个路径直接改 YAML， 去厂商官方定价页核对价格 —— 改完刷新本页面即生效。"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: pricing_module_css_default.promptActions,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: pricing_module_css_default.actionBtn + " " + pricing_module_css_default.primary,
												onClick: () => void copyPrompt(),
												children: "复制提示词"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: pricing_module_css_default.actionBtn,
												onClick: () => {
													downloadFile(exportFileName("pricing-agent-prompt", "txt"), promptText, "text/plain;charset=utf-8");
													maybeRefreshNotice("提示词已下载（.txt）");
												},
												children: "下载提示词"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: pricing_module_css_default.panelHint,
												children: [
													"缺口模型 ",
													String(uncovered.length),
													" 个",
													files === void 0 ? "" : "；目标文件 " + files.user.path
												]
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
										className: pricing_module_css_default.promptText,
										children: promptText
									})
								]
							}),
							rules.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.filterRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: pricing_module_css_default.filterLabel,
										children: "按通道过滤"
									}),
									providerChips.map((chip) => {
										const active = providerFilter === null || providerFilter.includes(chip.provider);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											className: pricing_module_css_default.chip + (active ? " " + pricing_module_css_default.chipOn : ""),
											"aria-pressed": active,
											title: "只看 " + chip.provider + " 的规则（" + String(chip.count) + " 条）",
											onClick: () => {
												const current = providerFilter ?? providerChips.map((entry) => entry.provider);
												const next = current.includes(chip.provider) ? current.filter((provider) => provider !== chip.provider) : [...current, chip.provider];
												setProviderFilter(next.length === providerChips.length ? null : next);
											},
											children: [chip.provider === "*" ? "任意通道（*）" : channelLabelOf(chip.provider), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: String(chip.count) })]
										}, chip.provider);
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: pricing_module_css_default.linkBtn,
										disabled: providerFilter === null,
										onClick: () => setProviderFilter(null),
										children: "显示全部"
									})
								]
							}),
							providerFilter !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.panelHint,
								children: [
									"过滤只影响这里的显示；保存仍会提交全部 ",
									String(rules.length),
									" 条规则 （被过滤掉的 ",
									String(hiddenRulesCount),
									" 条不会被删掉）。"
								]
							}),
							rules.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: pricing_module_css_default.empty,
								children: "还没有规则。点「＋ 新增规则」手填，或先「下载规则模板」按内置价目起步。"
							}) : visibleRules.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: pricing_module_css_default.empty,
								children: "当前过滤条件下没有规则，点「显示全部」重置（这些规则不会被删除）。"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
								className: pricing_module_css_default.ruleTable,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "通道" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "模型" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "输入" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "缓存读" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "缓存写" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "输出" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "币种" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "备注 / 附加项（YAML 维护）" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "操作" })
								] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: visibleRules.map((rule) => {
									const extras = ruleExtrasTextOf(rule);
									const index = rules.indexOf(rule);
									const offPeakNow = pricing !== null && index >= 0 && pricing.offPeakNow[index] === true;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
										className: editingKey === ruleKeyOf(rule) ? pricing_module_css_default.editing : "",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: pricing_module_css_default.ruleName,
												children: rule.provider
											}) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: pricing_module_css_default.ruleName,
												children: rule.model
											}) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rule.input }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rule.cacheRead }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rule.cacheWrite }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rule.output }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rule.currency }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
												className: pricing_module_css_default.ruleNote,
												children: [rule.note === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: shared_module_css_default.dim,
													children: "—"
												}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													title: rule.note,
													children: rule.note
												}), extras !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: pricing_module_css_default.ruleExtra,
													title: rule.offPeak === null ? void 0 : offPeakTooltipOf(rule),
													children: [extras, offPeakNow && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: pricing_module_css_default.offPeakChip,
														children: "错峰中"
													})]
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													className: pricing_module_css_default.linkBtn,
													onClick: () => startEdit(rule),
													children: "编辑"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													className: pricing_module_css_default.linkBtn,
													title: "复制这一条规则的 YAML（含 unit / offPeak / note）",
													onClick: () => void copySnippet(rule, false, ruleLabelOf(rule)),
													children: "复制片段"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													className: pricing_module_css_default.linkBtn,
													disabled: saving,
													onClick: () => void removeRule(rule),
													children: "删除"
												})
											] })
										]
									}, ruleKeyOf(rule));
								}) })]
							}),
							hiddenRulesCount > 0 && visibleRules.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.panelHint,
								children: [
									"另有 ",
									String(hiddenRulesCount),
									" 条规则被过滤掉（只影响显示，保存时照旧提交）。"
								]
							}),
							draft !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RuleEditor, {
								draft,
								onChange: setDraft,
								onCancel: () => {
									setDraft(null);
									setEditorError(null);
									setEditingKey(null);
								},
								onSave: () => void commitDraft(),
								error: editorError,
								saving,
								keyChanged: editingKey !== null && ruleKeyOf(draft) !== editingKey,
								providerOptions,
								modelOptions,
								providersListId,
								modelsListId
							}, editingKey ?? "__new__"),
							uncovered.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.sectionBlock,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: pricing_module_css_default.subLabel,
										children: [
											"没有价格依据的模型（",
											String(uncovered.length),
											" 个）"
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: pricing_module_css_default.panelHint,
										children: "近 30 天用到了、但既没有规则也没命中内置价目：这些用量的成本现在按台账均价估算或显示 —。 可以下载 / 复制单条片段填好价格后粘进规则文件，或点「让 DSH 帮我配」把清单交给 DSH。"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: pricing_module_css_default.worthList,
										children: shownUncovered.map((model) => {
											const label = model.provider + " · " + model.model;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: pricing_module_css_default.ruleName,
													children: model.model
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: shared_module_css_default.dim,
													children: [" · ", model.provider]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: pricing_module_css_default.worthMeta,
													children: [
														fmtTokens(model.tokens),
														" tokens（占缺口 ",
														percentText(model.share),
														"）",
														model.estimated ? " · 现为估算" : " · 无价格依据"
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													className: pricing_module_css_default.linkBtn,
													onClick: () => downloadSnippet(ruleForModel(model), true, label),
													children: "下载片段"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													className: pricing_module_css_default.linkBtn,
													onClick: () => void copySnippet(ruleForModel(model), true, label),
													children: "复制片段"
												})
											] }, model.provider + "|" + model.model);
										})
									}),
									uncovered.length > MODEL_LIST_LIMIT && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: pricing_module_css_default.linkBtn,
										onClick: () => setShowAllModels((previous) => !previous),
										children: showAllModels ? "收起" : "展开全部（" + String(uncovered.length) + " 个）"
									})
								]
							}),
							savingsDetail.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.sectionBlock,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: pricing_module_css_default.subLabel,
										children: ["缓存命中省钱明细", coverage === null ? "" : "（" + coverage.from + " 起）"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: pricing_module_css_default.savingsList,
										children: visibleSavings.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: pricing_module_css_default.ruleName,
												children: entry.model
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: shared_module_css_default.dim,
												children: [" · ", entry.provider]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: pricing_module_css_default.worthMeta,
												children: [
													"命中缓存 ",
													fmtTokens(entry.cacheReadTokens),
													" tokens"
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: pricing_module_css_default.saving,
												children: ["省 ", moneyTextOf(entry.currency, entry.amount)]
											})
										] }, entry.provider + "|" + entry.model))
									}),
									savingsDetail.length > 3 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: pricing_module_css_default.linkBtn,
										onClick: () => setShowAllSavings((previous) => !previous),
										children: showAllSavings ? "收起" : "展开全部（" + String(savingsDetail.length) + " 条）"
									})
								]
							})
						]
					})
				]
			});
		}
		/** 过滤芯片：按通道分组计数；配置过的通道排前面，`*` 通配规则永远排最后。 */
		function chipEntriesOf(rules, channels) {
			const counts = /* @__PURE__ */ new Map();
			for (const rule of rules) counts.set(rule.provider, (counts.get(rule.provider) ?? 0) + 1);
			const known = channels.map((channel) => channel.provider).filter((provider) => counts.has(provider));
			const rest = [...counts.keys()].filter((provider) => provider !== "*" && !known.includes(provider)).sort((first, second) => first.localeCompare(second));
			return [
				...known,
				...rest,
				...counts.has("*") ? ["*"] : []
			].map((provider) => ({
				provider,
				count: counts.get(provider) ?? 0
			}));
		}
		/**
		* 摘要行：默认收起的全部内容就这一行。
		* 「依据」用 /pricing 的 coverage 数模型个数，让用户一眼看出哪些模型可信、哪些只是估算。
		*/
		function SummaryStrip(props) {
			const { coverage } = props;
			const days = coverage === null ? null : daysBetween(coverage.from, coverage.to);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: pricing_module_css_default.summaryStrip,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: pricing_module_css_default.summaryBasis,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: pricing_module_css_default.summaryName,
							children: "这一格钱的依据"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: pricing_module_css_default.summaryValue,
							children: coverage === null ? props.loading ? "正在读取规则与覆盖度…" : "还没读到服务端覆盖度 —— 稍后自动重试" : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								"官方账单 ",
								days === null ? "—" : String(days),
								" 天 · 你的规则 ",
								String(coverage.ruleModels),
								" 个模型 · 内置官方价 ",
								String(coverage.catalogModels ?? 0),
								" 个模型 · 台账均价估算 ",
								String(coverage.averagedModels),
								" 个模型",
								coverage.unpricedModels > 0 && " · 无依据 " + String(coverage.unpricedModels) + " 个"
							] })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: pricing_module_css_default.summarySaving,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: pricing_module_css_default.summaryName,
							children: "缓存命中已省"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: pricing_module_css_default.summaryValue + (props.savingsEntries.length > 0 ? " " + pricing_module_css_default.saving : ""),
							children: props.savingsEntries.length === 0 ? "—" : props.savingsEntries.map(([currency, amount]) => moneyTextOf(currency, amount)).join(" / ")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: pricing_module_css_default.summaryActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: pricing_module_css_default.infoBtn + (props.showExplanation ? " " + pricing_module_css_default.infoBtnActive : ""),
							title: "来源角标、单位、错峰与多币种口径",
							"aria-label": "查看成本口径说明",
							"aria-expanded": props.showExplanation,
							onClick: props.onToggleExplanation,
							children: "ⓘ"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: pricing_module_css_default.actionBtn + " " + pricing_module_css_default.primary,
							"aria-expanded": props.expanded,
							"aria-controls": props.drawerId,
							onClick: props.onToggle,
							children: props.expanded ? "收起规则 ◂" : "配置规则 ▸"
						})]
					})
				]
			});
		}
		/** 成本口径说明：默认不占正文，点 ⓘ 才出现。只讲「这一格钱是怎么来的」，数据来源类口径在页面页脚。 */
		function ExplanationBlock() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: pricing_module_css_default.explanation,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: pricing_module_css_default.explanationTitle,
					children: "成本口径"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
					className: pricing_module_css_default.explanationList,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "官方" }), "：台账记录的厂商账单金额，是既成事实，不会被规则覆盖。"] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "自定" }), "：按你填的规则算出，匹配顺序 精确 → 通道通配 → 模型通配 → 全通配。"] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "官方价" }),
							"：按插件",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "内置的厂商官方价目" }),
							"算出（自动生效，不需要你维护）；你的规则优先于它。匹配只做精确 / 忽略大小写 / 去 ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "vendor/" }),
							" 前缀，不做模糊匹配。"
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "估算" }), "：按台账反推的均价推算，仅供参照，不是账单。"] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "—" }), "：没有价格依据（规则与内置价目都没命中，台账也没有成本数据）。"] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							"单位与按次计费：在 YAML 里写 —— ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "perMillionTokens" }),
							"（每百万，缺省）/ ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "perThousandTokens" }),
							"（每千）/ ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "perCall" }),
							"（每次调用，只用「输入」档当每次调用价）。"
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							"错峰：也在 YAML 里写。窗口按",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "本地时间" }),
							"判断，起止相同表示全天，",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "from" }),
							" 大于 ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "to" }),
							" 表示跨午夜；每个窗口可按",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "每天 / 仅工作日 / 仅周末" }),
							"限定生效的星期（不写即每天）。跨天范围拿不到小时分布，按标准价算。"
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "多币种不换算、不合计：规则与内置价目各按文档原币种算（DeepSeek 取中文文档的 CNY，Kimi 为 CNY，OpenRouter / Z.ai 为 USD），金额按币种分行显示。" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							"文件写法：点「",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "下载规则模板" }),
							"」拿一份带注释说明与错峰写法示例的 YAML；面板保存写的是同一个文件。"
						] })
					]
				})]
			});
		}
		/** 单价输入框：用文本态承接输入，避免「0.」在数字态里被吃掉后小数点打不进去。 */
		function RateField(props) {
			const [text, setText] = (0, react.useState)(String(props.value));
			(0, react.useEffect)(() => {
				setText(String(props.value));
			}, [props.value]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: pricing_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: props.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "text",
					inputMode: "decimal",
					value: text,
					onChange: (event) => {
						setText(event.target.value);
						const next = Number(event.target.value);
						props.onChange(Number.isFinite(next) && next >= 0 ? next : 0);
					},
					onBlur: () => setText(String(props.value))
				})]
			});
		}
		function percentText(share) {
			return (share * 100).toFixed(1) + "%";
		}
		/** 覆盖区间的自然天数（含首尾），用作「官方账单 X 天」的口径。 */
		function daysBetween(from, to) {
			const start = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const end = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
			if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
			return Math.round((end - start) / 864e5) + 1;
		}
		/** 错峰说明进 tooltip：规则表因此不被一整列文字撑开。 */
		function offPeakTooltipOf(rule) {
			const windows = offPeakWindowsText(rule);
			if (rule.offPeak === null) return windows;
			const peak = "标准价 " + String(rule.input) + " / " + String(rule.cacheRead) + " / " + String(rule.cacheWrite) + " / " + String(rule.output);
			const offPeak = "错峰价 " + String(rule.offPeak.input) + " / " + String(rule.offPeak.cacheRead) + " / " + String(rule.offPeak.cacheWrite) + " / " + String(rule.offPeak.output);
			return "错峰时段（本地时间，跨午夜用 from > to 表示；括号内是生效的星期）：" + windows + "\n" + peak + "\n" + offPeak + "\n四档顺序：输入 / 缓存读 / 缓存写 / 输出";
		}
		/**
		* 单条规则的编辑器：只暴露 通道 / 模型 / 币种 / 四档单价。
		* unit / offPeak / note 不在这里渲染（只在 YAML 里维护），保存也不提交它们 —— 服务端按
		* provider|model 从文件旧值继承，所以表单变窄不会让用户数据丢。
		*/
		function RuleEditor(props) {
			const { draft, onChange } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: pricing_module_css_default.editor,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: pricing_module_css_default.editorGrid,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.field,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: "通道 id（* = 任意通道）" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										list: props.providersListId,
										value: draft.provider,
										onChange: (event) => onChange({
											...draft,
											provider: event.target.value
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("datalist", {
										id: props.providersListId,
										children: props.providerOptions.map((provider) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: provider }, provider))
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.field,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: "模型 id（* = 该通道全部）" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										list: props.modelsListId,
										value: draft.model,
										onChange: (event) => onChange({
											...draft,
											model: event.target.value
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("datalist", {
										id: props.modelsListId,
										children: props.modelOptions.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: model }, model))
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: "币种" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									value: draft.currency,
									onChange: (event) => onChange({
										...draft,
										currency: event.target.value
									}),
									children: CURRENCY_OPTIONS.map((currency) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: currency,
										children: currency
									}, currency))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RateField, {
								label: "输入（未命中缓存）",
								value: draft.input,
								onChange: (value) => onChange({
									...draft,
									input: value
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RateField, {
								label: "缓存读（命中）",
								value: draft.cacheRead,
								onChange: (value) => onChange({
									...draft,
									cacheRead: value
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RateField, {
								label: "缓存写",
								value: draft.cacheWrite,
								onChange: (value) => onChange({
									...draft,
									cacheWrite: value
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RateField, {
								label: "输出",
								value: draft.output,
								onChange: (value) => onChange({
									...draft,
									output: value
								})
							})
						]
					}),
					props.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: pricing_module_css_default.editorError,
						children: props.error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: pricing_module_css_default.editorHint,
						children: [
							"正在编辑：",
							ruleLabelOf(draft),
							" · 单位 ",
							UNIT_LABELS[draft.unit],
							draft.offPeak === null ? "" : " · 含错峰窗口 " + offPeakWindowsText(draft),
							draft.note === "" ? "" : " · 备注 " + draft.note
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: pricing_module_css_default.editorHint,
						children: FORM_EXTRAS_HINT
					}),
					props.keyChanged && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: pricing_module_css_default.editorHint,
						children: "改通道或模型等于换一条规则：原条目的错峰价 / 单位 / 备注不会跟过来，需要在 YAML 里补。"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: pricing_module_css_default.editorActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: pricing_module_css_default.actionBtn + " " + pricing_module_css_default.primary,
							disabled: props.saving,
							onClick: props.onSave,
							children: props.saving ? "保存中…" : "保存规则"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: pricing_module_css_default.actionBtn,
							disabled: props.saving,
							onClick: props.onCancel,
							children: "取消"
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/quota.module.css.mjs
		const css$1 = ".ohwLxW_quotaList{flex-direction:column;gap:12px;display:flex}.ohwLxW_quotaCard{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;padding:16px 18px}.ohwLxW_quotaHead{flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px;display:flex}.ohwLxW_quotaTitle{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:13px;font-weight:600}.ohwLxW_quotaEnv{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:8px;font-family:ui-monospace,Consolas,monospace;font-size:10px}.ohwLxW_quotaProvider{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:auto;font-size:11.5px}.ohwLxW_liveChip{border:1px solid var(--dsw-alias-state-success-primary,#3fb950);color:var(--dsw-alias-state-success-primary,#3fb950);border-radius:999px;padding:1px 7px;font-size:10px;line-height:1.6}.ohwLxW_balanceStrip{flex-wrap:wrap;align-items:baseline;gap:10px 44px;display:flex}.ohwLxW_balanceItem .ohwLxW_bsLabel{color:var(--dsw-alias-label-tertiary,#67676f);margin-bottom:2px;font-size:11px}.ohwLxW_balanceItem .ohwLxW_bsValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:16px;font-weight:650}.ohwLxW_windowRow{flex-wrap:wrap;gap:18px;display:flex}.ohwLxW_windowItem{flex:1;min-width:150px}.ohwLxW_windowHead{justify-content:space-between;align-items:baseline;margin-bottom:5px;display:flex}.ohwLxW_windowName{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:11.5px}.ohwLxW_windowValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:12px;font-weight:600}.ohwLxW_windowReset{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:3px;font-size:10.5px}.ohwLxW_windowBar{background:var(--dsw-alias-fill-l2,#80808c2e);border-radius:4px;height:6px;overflow:hidden}.ohwLxW_windowBar>i{border-radius:4px;height:100%;display:block}.ohwLxW_snapshotHint{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:10px;font-size:10.5px}.ohwLxW_snapshotStale{color:var(--dsw-alias-state-warning-primary,#e0a13c);margin-top:10px;font-size:10.5px}";
		const tagId$1 = "dsh-key-usage/quota.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		const cssRegistry$1 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$1.some((e) => e.tagId === tagId$1)) cssRegistry$1.push({
			tagId: tagId$1,
			css: css$1
		});
		var quota_module_css_default = {
			"balanceItem": "ohwLxW_balanceItem",
			"balanceStrip": "ohwLxW_balanceStrip",
			"bsLabel": "ohwLxW_bsLabel",
			"bsValue": "ohwLxW_bsValue",
			"liveChip": "ohwLxW_liveChip",
			"quotaCard": "ohwLxW_quotaCard",
			"quotaEnv": "ohwLxW_quotaEnv",
			"quotaHead": "ohwLxW_quotaHead",
			"quotaList": "ohwLxW_quotaList",
			"quotaProvider": "ohwLxW_quotaProvider",
			"quotaTitle": "ohwLxW_quotaTitle",
			"snapshotHint": "ohwLxW_snapshotHint",
			"snapshotStale": "ohwLxW_snapshotStale",
			"windowBar": "ohwLxW_windowBar",
			"windowHead": "ohwLxW_windowHead",
			"windowItem": "ohwLxW_windowItem",
			"windowName": "ohwLxW_windowName",
			"windowReset": "ohwLxW_windowReset",
			"windowRow": "ohwLxW_windowRow",
			"windowValue": "ohwLxW_windowValue"
		};
		//#endregion
		//#region src/client/tabs/QuotaTab.tsx
		/** 余额字段展示顺序（原型顺序）；未收录字段按原键名追加在后。 */
		const BALANCE_ORDER = [
			"totalBalance",
			"topUpBalance",
			"giftBalance",
			"balance",
			"currency"
		];
		const BALANCE_LABELS = {
			totalBalance: "总余额",
			topUpBalance: "充值余额",
			giftBalance: "赠送余额",
			balance: "余额",
			currency: "币种"
		};
		/** 订阅窗口固定展示顺序。 */
		const WINDOW_ORDER = [
			"5h",
			"week",
			"month",
			"day"
		];
		const WINDOW_LABELS = {
			"5h": "5 小时窗口",
			week: "本周窗口",
			month: "本月窗口",
			day: "当日窗口"
		};
		function resetTextOf(value) {
			if (typeof value !== "string" || value === "") return "重置时间 —";
			const time = new Date(value);
			if (Number.isNaN(time.getTime())) return "重置于 " + value;
			return "重置于 " + fmtDateTime(time.getTime());
		}
		function QuotaTab(props) {
			const snapshotOf = (provider) => props.quotas.find((item) => item.provider === provider) ?? null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: quota_module_css_default.quotaList,
				children: [
					props.channels.map((channel) => {
						const snapshot = snapshotOf(channel.provider);
						const balance = snapshot?.balance ?? null;
						const plan = snapshot?.plan ?? null;
						const isLive = snapshot?.source === "live";
						const windows = plan !== null && Array.isArray(plan.windows) ? plan.windows : null;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: quota_module_css_default.quotaCard,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: quota_module_css_default.quotaHead,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: shared_module_css_default.statusDot,
											style: { background: statusColorOf(channel.status) }
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: quota_module_css_default.quotaTitle,
											children: channel.displayName
										}),
										isLive && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: quota_module_css_default.liveChip,
											children: "实时"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: quota_module_css_default.quotaProvider,
											children: [
												channel.provider,
												" · ",
												channel.costLabel
											]
										})
									]
								}),
								balance !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: quota_module_css_default.balanceStrip,
									children: orderedBalanceEntries(balance).map(([key, value]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: quota_module_css_default.balanceItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: quota_module_css_default.bsLabel,
											children: BALANCE_LABELS[key] ?? key
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: quota_module_css_default.bsValue,
											children: String(value)
										})]
									}, key))
								}),
								balance === null && windows !== null && windows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: quota_module_css_default.windowRow,
									children: orderedWindows(windows).map((window) => {
										const percent = typeof window.percent === "number" ? window.percent : 0;
										const key = typeof window.key === "string" ? window.key : "window";
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: quota_module_css_default.windowItem,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: quota_module_css_default.windowHead,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: quota_module_css_default.windowName,
														children: WINDOW_LABELS[key] ?? key
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: quota_module_css_default.windowValue,
														children: [percent, "%"]
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: quota_module_css_default.windowBar,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
														width: Math.max(percent, 0) + "%",
														background: quotaBarColor(percent)
													} })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: quota_module_css_default.windowReset,
													children: resetTextOf(window.resetsAt)
												})
											]
										}, key);
									})
								}),
								balance === null && (windows === null || windows.length === 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: shared_module_css_default.dim,
									children: emptyReasonOf(channel, snapshot)
								}),
								isLive && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: quota_module_css_default.snapshotHint,
									children: [
										"实时查询于 ",
										freshTextOf(snapshot?.fetchedAt ?? null),
										"（来自官方接口，最多缓存 1 分钟）"
									]
								}),
								snapshot !== null && !isLive && snapshot.supported && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: staleDaysOf(snapshot.updatedAt) >= 1 ? quota_module_css_default.snapshotStale : quota_module_css_default.snapshotHint,
									children: [
										"实时查询未成功（",
										errorTextOf(snapshot.error),
										"）",
										snapshot.updatedAt === null ? "，且暂无可用快照 —— 点右上角「刷新」重试" : "，显示快照 · 快照时间 " + fmtDateTime(snapshot.updatedAt) + (staleDaysOf(snapshot.updatedAt) >= 1 ? "，已 " + staleDaysOf(snapshot.updatedAt) + " 天未更新" : "")
									]
								})
							]
						}, channel.provider);
					}),
					props.channels.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.empty,
						children: "未读取到通道配置"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PricingRulesPanel, {
						pricing: props.pricing,
						channels: props.channels,
						models: props.models,
						onSaved: props.onPricingReload
					})
				]
			});
		}
		/** 实时结果的相对时间文案。 */
		function freshTextOf(fetchedAt) {
			if (fetchedAt === null) return "刚刚";
			const seconds = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1e3));
			if (seconds < 60) return "刚刚";
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return minutes + " 分钟前";
			return Math.floor(minutes / 60) + " 小时前";
		}
		/** 实时查询失败原因的展示文案。 */
		function errorTextOf(error) {
			if (error === null) return "未启用实时查询";
			if (error === "no-key") return "该通道未配置 API Key";
			if (error === "no-snapshot") return "没有快照可用";
			if (error === "network") return "网络不可达";
			if (error === "timeout") return "请求超时";
			if (error === "unauthorized") return "凭据被拒绝（401/403）";
			if (error === "bad-json") return "接口响应无法解析";
			if (error === "too-large") return "接口响应异常大";
			if (error.startsWith("http-")) return "接口返回 HTTP " + error.slice(5);
			return error;
		}
		/** 快照距今天数（向下取整）；用于把「宿主很久没刷新」显式标出来。 */
		function staleDaysOf(updatedAt) {
			if (updatedAt === null) return 0;
			return Math.floor((Date.now() - updatedAt) / 864e5);
		}
		function orderedBalanceEntries(balance) {
			const entries = Object.entries(balance).filter(([key]) => key !== "updatedAt");
			const ordered = [];
			for (const key of BALANCE_ORDER) {
				const found = entries.find(([entryKey]) => entryKey === key);
				if (found !== void 0) ordered.push(found);
			}
			for (const entry of entries) if (!BALANCE_ORDER.includes(entry[0])) ordered.push(entry);
			return ordered;
		}
		function orderedWindows(windows) {
			return [...windows].sort((first, second) => {
				const firstIndex = WINDOW_ORDER.indexOf(typeof first.key === "string" ? first.key : "");
				const secondIndex = WINDOW_ORDER.indexOf(typeof second.key === "string" ? second.key : "");
				return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex);
			});
		}
		/** 无数据时的分档说明：区分未配置凭据 / 免费额度 / 本地端点 / 无查询能力。 */
		function emptyReasonOf(channel, snapshot) {
			if (snapshot?.source === "snapshot" && snapshot.error === "no-key") return "该通道未配置 API Key，无法查询余额";
			if (snapshot?.source === "snapshot" && snapshot.error === "unauthorized") return "凭据被通道拒绝，无法查询余额";
			if (channel.status === "off") return "凭据引用存在，Key 未填写";
			if (channel.costMode === "none") return "本地端点，无余额查询接口";
			if (channel.costMode === "free") return "该通道无余额查询接口（免费额度）";
			return "该通道暂无可查询的余额 / 配额接口";
		}
		//#endregion
		//#region src/client/components/SessionDetailDrawer.tsx
		/**
		* 会话详情抽屉：点会话行后从右侧滑出，数据来自 `/dsh-key-usage/session?id=…`。
		* 服务端只折叠这一个会话，所以打开很快；读不出来时它降级返回头部字段 + 说明，这里照常展示。
		*/
		function SessionDetailDrawer(props) {
			const [data, setData] = (0, react.useState)(null);
			const [failed, setFailed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let cancelled = false;
				setData(null);
				setFailed(false);
				loadSessionDetail(props.sessionId).then((result) => {
					if (cancelled) return;
					setData(result);
					setFailed(result === null);
				});
				return () => {
					cancelled = true;
				};
			}, [props.sessionId]);
			(0, react.useEffect)(() => {
				const onKeyDown = (event) => {
					if (event.key === "Escape") props.onClose();
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [props.onClose]);
			const session = data?.session ?? null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: lists_module_css_default.drawerMask,
				onClick: props.onClose,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.drawerPanel,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": "会话详情",
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: lists_module_css_default.drawerHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lists_module_css_default.drawerTitle,
								children: [session?.title ?? props.fallbackTitle ?? "（无提问）· " + shortIdOf$1(props.sessionId), session?.archived === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.archivedTag,
									children: "已归档"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.drawerClose,
								onClick: props.onClose,
								"aria-label": "关闭会话详情",
								children: "✕"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lists_module_css_default.drawerId,
							children: props.sessionId
						}),
						data === null && !failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: "会话详情读取中…"
						}),
						failed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: shared_module_css_default.warning,
							children: ["会话详情读取失败：", failureReasonOf(sessionDetailPath(props.sessionId)) ?? "未知原因"]
						}),
						data !== null && data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: shared_module_css_default.warning,
							children: [data.coverage.status === "unavailable" ? "会话用量不可用" : "会话用量不完整", data.coverage.reason === null ? "" : "：" + data.coverage.reason]
						}),
						data !== null && session !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionDetailBody, {
							session,
							channels: props.channels,
							priced: data.priced
						}),
						data !== null && session === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: "该会话没有可展示的详情"
						})
					]
				})
			});
		}
		function SessionDetailBody(props) {
			const session = props.session;
			const channel = channelOf(props.channels, session.provider);
			const costCell = costCellText(channel, session.cost ?? 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.detailGrid,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
							label: "工作区",
							value: session.workspace ?? "未归属工作区",
							wide: true
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
							label: "通道",
							value: session.provider === null ? "—" : session.providerLabel ?? displayNameOf(props.channels, session.provider)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
							label: "计费模式",
							value: channel === null ? "—" : channel.costLabel
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
							label: "首次",
							value: fmtDateTime(session.firstTime)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
							label: "最近",
							value: fmtDateTime(session.lastTime)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
							label: "时长",
							value: fmtDuration(session.durationMs) + (session.crossDays >= 1 ? "（跨 " + String(session.crossDays) + " 天）" : "")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
							label: "活跃天数",
							value: String(session.days)
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.detailStrip,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
							label: "Tokens",
							value: fmtTokens(session.tokens),
							note: "输入 + 输出 + 缓存读"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
							label: "输入",
							value: fmtTokens(session.buckets.inputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
							label: "输出",
							value: fmtTokens(session.buckets.outputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
							label: "缓存读",
							value: fmtTokens(session.buckets.cacheReadTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
							label: "缓存写",
							value: fmtTokens(session.buckets.cacheWriteTokens),
							note: "只参与计费"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
							label: "命中率",
							value: session.cacheHitRate === null ? "—" : session.cacheHitRate.toFixed(1) + "%"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
							label: "调用",
							value: fmtCalls(session.calls),
							note: "结算样本数"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.detailBlock,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lists_module_css_default.detailBlockTitle,
							children: "成本"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: lists_module_css_default.detailCost,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: costCell.dim ? shared_module_css_default.dim : void 0,
									children: costCell.text
								}),
								showsAmount(costCell) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, { source: session.costSource }),
								showsAmount(costCell) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.detailCostHint,
									children: COST_SOURCE_HINTS[session.costSource]
								})
							]
						}),
						!props.priced && session.cost === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.statExtra,
							children: "台账里没有成本数据，也没有命中计费规则，暂时只能显示「—」"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.detailBlock,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailBlockTitle,
						children: "首条提问"
					}), session.prompt === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.empty,
						children: "这个会话没有人类提问（可能是 teammate / 系统会话）"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.promptText,
						children: session.prompt
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.detailBlock,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailBlockTitle,
						children: "逐模型用量"
					}), session.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.empty,
						children: "没有按模型的用量记录"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: shared_module_css_default.table + " " + lists_module_css_default.sessionDetailModelTable,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "模型" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "占比" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "成本" })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: session.models.map((model) => {
							const modelCostCell = costCellText(channelOf(props.channels, model.provider), model.cost ?? 0);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lists_module_css_default.listMain,
									children: model.model
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: lists_module_css_default.listSub,
									children: [
										model.providerLabel,
										" · ",
										fmtCalls(model.calls),
										" 次"
									]
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(model.tokens) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: lists_module_css_default.listBar,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
											width: Math.max(2, model.sharePercent) + "%",
											background: "var(--dsw-alias-state-accent-primary, #5b8cff)"
										} })
									}),
									" ",
									model.sharePercent,
									"%"
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: model.cost === null || !showsAmount(modelCostCell) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: modelCostCell.text
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [modelCostCell.text, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, { source: model.costSource })] }) })
							] }, model.provider + "|" + model.model);
						}) })]
					})]
				}),
				session.hours !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.detailBlock,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailBlockTitle,
						children: "一天里的分布（各小时合计，跨天会话已累加）"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HourMiniChart, { hours: session.hours })]
				})
			] });
		}
		/** 24 小时迷你图：柱高按该会话的小时峰值归一，数值在悬停与读屏文本里给出。 */
		function HourMiniChart(props) {
			const peak = props.hours.reduce((max, hour) => Math.max(max, hour.tokens), 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: lists_module_css_default.hourChart,
				role: "img",
				"aria-label": hourChartSummary(props.hours),
				children: props.hours.map((hour, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.hourBar,
					title: String(index) + " 时 · " + fmtTokens(hour.tokens) + " · " + fmtCalls(hour.calls) + " 次",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: lists_module_css_default.hourBarFill,
						style: { height: peak > 0 ? Math.round(hour.tokens / peak * 100) + "%" : "0%" }
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: lists_module_css_default.hourBarTick,
						children: index % 6 === 0 ? String(index) : ""
					})]
				}, index))
			});
		}
		/** 读屏用户的数值概述：柱状图本身只有悬停才看得到数。 */
		function hourChartSummary(hours) {
			const busiest = hours.reduce((best, hour, index) => hour.tokens > hours[best].tokens ? index : best, 0);
			return hours[busiest].tokens === 0 ? "该会话没有按小时的用量分布" : "最忙的是 " + String(busiest) + " 时，" + fmtTokens(hours[busiest].tokens) + " tokens";
		}
		function DetailItem(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: props.wide === true ? lists_module_css_default.detailItemWide : lists_module_css_default.detailItem,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: lists_module_css_default.detailItemLabel,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: lists_module_css_default.detailItemValue,
					children: props.value
				})]
			});
		}
		function StripItem(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: lists_module_css_default.detailStripItem,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailItemLabel,
						children: props.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailItemValue,
						children: props.value
					}),
					props.note !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailItemNote,
						children: props.note
					})
				]
			});
		}
		/** 会话头通常不带标题，用 id 的短片段做可读标识。 */
		function shortIdOf$1(id) {
			return id.replace(/^session-/, "").slice(0, 8);
		}
		//#endregion
		//#region src/client/tabs/SessionsTab.tsx
		/**
		* 会话用量：按会话列出 tokens / 命中率 / 时长，最近活跃时按日分组。
		* 点行打开详情抽屉；行内可展开到模型构成；工作目录可点，跳到「项目用量」并只看该项目。
		*/
		/** 首屏渲染 50 个：本机有 ~130 个会话，一次全渲染会明显卡顿；「加载更多」每次再加这么多。 */
		const PAGE_SIZE = 50;
		/** 导出列：标题可能带逗号或换行，由 toCsv 统一转义。 */
		const EXPORT_COLUMNS = [
			{
				key: "id",
				label: "会话 id",
				value: (row) => row.id
			},
			{
				key: "title",
				label: "标题",
				value: (row) => row.title
			},
			{
				key: "prompt",
				label: "首条提问",
				value: (row) => row.prompt
			},
			{
				key: "workspace",
				label: "工作区",
				value: (row) => row.workspace
			},
			{
				key: "provider",
				label: "通道",
				value: (row) => row.provider
			},
			{
				key: "firstTime",
				label: "首次时间",
				value: (row) => fmtDateTime(row.firstTime)
			},
			{
				key: "lastTime",
				label: "最近时间",
				value: (row) => fmtDateTime(row.lastTime)
			},
			{
				key: "crossDays",
				label: "跨天",
				value: (row) => row.crossDays
			},
			{
				key: "calls",
				label: "调用",
				value: (row) => row.calls
			},
			{
				key: "tokens",
				label: "Tokens",
				value: (row) => row.tokens
			},
			{
				key: "cacheHitRate",
				label: "命中率(%)",
				value: (row) => row.cacheHitRate
			},
			{
				key: "cost",
				label: "成本(元)",
				value: (row) => row.cost
			},
			{
				key: "costSource",
				label: "成本来源",
				value: (row) => row.costSource === void 0 ? null : COST_SOURCE_LABELS[row.costSource]
			},
			{
				key: "archived",
				label: "已归档",
				value: (row) => row.archived ? "是" : "否"
			}
		];
		function SessionsTab(props) {
			const [query, setQuery] = (0, react.useState)("");
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			const [daysFilter, setDaysFilter] = (0, react.useState)("30");
			const [sortKey, setSortKey] = (0, react.useState)("recent");
			const [archiveFilter, setArchiveFilter] = (0, react.useState)("hide");
			const [pageSize, setPageSize] = (0, react.useState)(PAGE_SIZE);
			const [expandedIds, setExpandedIds] = (0, react.useState)({});
			const [detailId, setDetailId] = (0, react.useState)(null);
			const [nowMs] = (0, react.useState)(() => Date.now());
			const rows = props.data?.rows ?? [];
			const archivedCount = rows.filter((row) => row.archived).length;
			const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden;
			(0, react.useEffect)(() => {
				setPageSize(PAGE_SIZE);
			}, [
				query,
				channelFilter,
				daysFilter,
				sortKey,
				archiveFilter
			]);
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const maxAgeDays = Number(daysFilter);
				const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
					const haystack = (row.title ?? "") + " " + row.id + " " + (row.workspace ?? "") + " " + (row.prompt ?? "");
					const matchesQuery = keyword === "" || haystack.toLowerCase().includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.provider === channelFilter;
					const matchesAge = maxAgeDays === 0 || row.lastTime === null || nowMs - row.lastTime <= maxAgeDays * 864e5;
					const matchesArchive = archiveFilter === "all" || (archiveFilter === "only" ? row.archived : !row.archived);
					return matchesQuery && matchesChannel && matchesAge && matchesArchive;
				});
				const sorters = {
					recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
					tokensDesc: (first, second) => second.tokens - first.tokens,
					tokensAsc: (first, second) => first.tokens - second.tokens,
					durationDesc: (first, second) => durationOf(second) - durationOf(first),
					costDesc: (first, second) => (second.cost ?? -1) - (first.cost ?? -1),
					hitDesc: (first, second) => (second.cacheHitRate ?? -1) - (first.cacheHitRate ?? -1),
					callsDesc: (first, second) => second.calls - first.calls
				};
				return [...filtered].sort(sorters[sortKey]);
			}, [
				rows,
				query,
				channelFilter,
				daysFilter,
				sortKey,
				nowMs,
				archiveFilter
			]);
			/** 只导当前筛选后的会话行（归档筛选、时间窗口、搜索都算数）；分页不影响导出。 */
			const exportRows = (format) => {
				if (format === "csv") downloadFile(exportFileName("sessions", "csv"), toCsv(visible, EXPORT_COLUMNS), CSV_MIME);
				else downloadFile(exportFileName("sessions", "json"), toJson(visible), JSON_MIME);
			};
			if (props.data === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.empty,
				children: "会话数据读取中或不可用…"
			});
			const groups = [];
			if (sortKey === "recent") for (const row of visible) {
				const label = dayLabelOf(row.lastTime, nowMs);
				const last = groups[groups.length - 1];
				if (last === void 0 || last.label !== label) groups.push({
					label,
					rows: [row],
					tokens: row.tokens
				});
				else {
					last.rows.push(row);
					last.tokens += row.tokens;
				}
			}
			let remaining = pageSize;
			const shownGroups = groups.map((group) => {
				const shown = remaining <= 0 ? [] : group.rows.slice(0, remaining);
				remaining -= shown.length;
				return {
					label: group.label,
					rows: shown,
					total: group.rows.length,
					tokens: group.tokens
				};
			}).filter((group) => group.rows.length > 0);
			const shownRows = sortKey === "recent" ? [] : visible.slice(0, pageSize);
			const shownCount = sortKey === "recent" ? shownGroups.reduce((count, group) => count + group.rows.length, 0) : shownRows.length;
			const detailRow = detailId === null ? null : rows.find((row) => row.id === detailId) ?? null;
			const rowOptions = {
				channels: props.channels,
				tooltip: props.tooltip,
				expandedIds,
				nowMs,
				onToggleModels: (id) => setExpandedIds((previous) => ({
					...previous,
					[id]: previous[id] !== true
				})),
				onOpenDetail: (id) => setDetailId(id),
				onOpenProject: props.onOpenProject
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				props.data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.warning,
					children: props.data.coverage.status === "unavailable" ? "会话数据不可用（宿主未提供会话服务或全部读取失败）" : "会话数据不完整：" + String(props.data.coverage.skippedSessions) + " 个会话读取失败，未计入统计"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.filterBar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: lists_module_css_default.searchInput,
							placeholder: "搜索会话标题、首条提问、session id、工作区…",
							value: query,
							onChange: (event) => setQuery(event.target.value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: lists_module_css_default.searchHint,
							children: "可搜：标题 · 首条提问 · session id · 工作区"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: lists_module_css_default.filterSelect,
							value: channelFilter,
							onChange: (event) => setChannelFilter(event.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "ALL",
								children: "全部通道"
							}), props.channels.map((channel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: channel.provider,
								children: channel.displayName
							}, channel.provider))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: lists_module_css_default.filterSelect,
							value: daysFilter,
							onChange: (event) => setDaysFilter(event.target.value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "7",
									children: "近 7 天"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "30",
									children: "近 30 天"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "0",
									children: "全部"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: lists_module_css_default.filterSelect,
							value: sortKey,
							onChange: (event) => setSortKey(event.target.value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "recent",
									children: "最新会话"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "tokensDesc",
									children: "Tokens 最多"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "tokensAsc",
									children: "Tokens 最少"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "durationDesc",
									children: "时长最长"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "costDesc",
									children: "成本最高"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "hitDesc",
									children: "命中率最高"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "callsDesc",
									children: "调用最多"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: lists_module_css_default.filterSelect,
							value: archiveFilter,
							onChange: (event) => setArchiveFilter(event.target.value),
							title: "已归档会话只做标记，仍然计入统计",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "hide",
									children: "隐藏已归档"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "all",
									children: "全部对话（显示已归档）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "only",
									children: "仅显示已归档"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: export_module_css_default.exportGroup,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: export_module_css_default.exportBtn,
								disabled: visible.length === 0,
								onClick: () => exportRows("csv"),
								children: "导出 CSV"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: export_module_css_default.exportBtn,
								disabled: visible.length === 0,
								onClick: () => exportRows("json"),
								children: "导出 JSON"
							})]
						})
					]
				}),
				archiveFilter === "hide" && archivedCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: [
						"另有 ",
						archivedCount,
						" 个已归档会话未显示（归档只是标记，用量仍计入上方统计）"
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: shared_module_css_default.table + " " + lists_module_css_default.sessionTable,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "会话" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "通道" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "时间 / 时长" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "命中率" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "成本" })
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [
						sortKey === "recent" && shownGroups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", {
							className: lists_module_css_default.sessionDay,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
								colSpan: 6,
								children: [group.label, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: lists_module_css_default.dayCount,
									children: [
										group.rows.length < group.total ? "显示 " + String(group.rows.length) + " / " + String(group.total) + " 个会话" : String(group.total) + " 个会话",
										" · ",
										fmtTokens(group.tokens)
									]
								})]
							})
						}), group.rows.map((row) => sessionRowOf(row, rowOptions))] }, "group-" + group.label)),
						sortKey !== "recent" && shownRows.map((row) => sessionRowOf(row, rowOptions)),
						visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							colSpan: 6,
							className: shared_module_css_default.empty,
							children: "没有符合条件的会话"
						}) })
					] })]
				}),
				visible.length > shownCount && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.moreRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: lists_module_css_default.moreBtn,
						onClick: () => setPageSize(pageSize + PAGE_SIZE),
						children: [
							"加载更多（+",
							PAGE_SIZE,
							"）"
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: lists_module_css_default.moreText,
						children: [
							"已显示 ",
							shownCount,
							" / ",
							visible.length,
							" 个会话"
						]
					})]
				}),
				hiddenEmpty > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: hiddenEmptyRowsText(hiddenEmpty)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: ["会话用量按宿主会话事件折叠（每个结算样本计一次调用）；成本按台账模型均价估算", props.data.priced ? "" : "（台账无成本数据，暂不可估）"]
				}),
				detailId !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionDetailDrawer, {
					sessionId: detailId,
					fallbackTitle: detailRow?.title ?? null,
					channels: props.channels,
					onClose: () => setDetailId(null)
				})
			] });
		}
		function sessionRowOf(row, options) {
			const channel = channelOf(options.channels, row.provider);
			const costCell = costCellText(channel, row.cost ?? 0);
			const isOpen = options.expandedIds[row.id] === true;
			const workspace = row.workspace;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
				className: (row.archived ? lists_module_css_default.rowArchived + " " : "") + shared_module_css_default.clickable,
				onClick: () => options.onOpenDetail(row.id),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.listTitle,
						children: [
							row.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: lists_module_css_default.sessionToggleArrow,
								"aria-hidden": "true"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.sessionToggle,
								"aria-expanded": isOpen,
								"aria-label": isOpen ? "收起模型构成" : "展开模型构成",
								onClick: (event) => {
									event.stopPropagation();
									options.onToggleModels(row.id);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.sessionToggleArrow,
									"aria-hidden": "true",
									children: isOpen ? "▼" : "▶"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.sessionTitleBtn,
								title: "查看会话详情",
								onClick: (event) => {
									event.stopPropagation();
									options.onOpenDetail(row.id);
								},
								children: row.title ?? "（无提问）· " + shortIdOf(row.id)
							}),
							row.archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: lists_module_css_default.archivedTag,
								children: "已归档"
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.listSub,
						children: workspace === null ? "未归属工作区" : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: lists_module_css_default.linkBtn,
							title: "在「项目用量」里只看 " + workspace,
							onClick: (event) => {
								event.stopPropagation();
								options.onOpenProject(workspace);
							},
							children: workspace
						})
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.providerLabel ?? displayNameOf(options.channels, row.provider ?? "") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: row.lastTime === null ? "—" : dayLabelOf(row.lastTime, options.nowMs) + " " + fmtTime(row.lastTime) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.listSub,
						children: [
							"时长 ",
							fmtDuration(durationOf(row)),
							row.crossDays >= 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: lists_module_css_default.crossDayTag,
								children: [
									"跨 ",
									row.crossDays,
									" 天"
								]
							})
						]
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(row.tokens) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cacheHitRate === null ? "—" : row.cacheHitRate.toFixed(1) + "%" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						onMouseEnter: (event) => options.tooltip.show(event, costTipOf(row)),
						onMouseMove: (event) => options.tooltip.show(event, costTipOf(row)),
						onMouseLeave: options.tooltip.hide,
						children: row.cost === null || channel === null || channel.costMode !== "perToken" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.dim,
							children: costCell.text
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, showsAmount(costCell) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, { source: row.costSource })] })
					})
				]
			}), isOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
				className: lists_module_css_default.composeCell,
				colSpan: 6,
				children: row.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: "没有按模型的用量记录"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.composeRow + " " + lists_module_css_default.composeHead,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "模型" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: lists_module_css_default.composeNumber,
							children: "Tokens"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: lists_module_css_default.composeNumber,
							children: "占比"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: lists_module_css_default.composeNumber,
							children: "成本"
						})
					]
				}), row.models.map((model) => {
					const percent = model.sharePercent ?? 0;
					const modelCost = model.cost ?? null;
					const color = model.provider === "" ? "var(--dsw-alias-label-tertiary, #67676f)" : channelColorOf(options.channels, model.provider);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.composeRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: lists_module_css_default.composeName,
								children: [model.model, model.provider !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.composeChannel,
									children: model.providerLabel ?? displayNameOf(options.channels, model.provider)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: lists_module_css_default.composeNumber,
								children: fmtTokens(model.tokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: lists_module_css_default.composeNumber,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: lists_module_css_default.listBar,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
											width: Math.max(2, percent) + "%",
											background: color
										} })
									}),
									" ",
									percent,
									"%"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: lists_module_css_default.composeNumber,
								children: modelCost === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: "—"
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [fmtCost(modelCost), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
									source: model.costSource,
									compact: true
								})] })
							})
						]
					}, model.provider + "|" + model.model);
				})] })
			}) })] }, row.id);
		}
		/** 成本单元格的悬停说明：这一格钱是怎么来的（角标只写得下两个字）。 */
		function costTipOf(row) {
			const source = row.costSource ?? "none";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: "会话成本" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: COST_SOURCE_HINTS[source] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
					label: "金额",
					amount: row.cost === null ? "—" : fmtCost(row.cost),
					rate: COST_SOURCE_LABELS[source]
				})
			] });
		}
		function durationOf(row) {
			if (row.firstTime === null || row.lastTime === null) return 0;
			return Math.max(0, row.lastTime - row.firstTime);
		}
		/** 会话头通常不带标题，用 id 的短片段做可读标识。 */
		function shortIdOf(id) {
			return id.replace(/^session-/, "").slice(0, 8);
		}
		function dayLabelOf(timeMs, nowMs) {
			if (timeMs === null) return "未知日期";
			const dateKey = isoDate(new Date(timeMs));
			if (dateKey === isoDate(new Date(nowMs))) return "今日";
			if (dateKey === isoDate(/* @__PURE__ */ new Date(nowMs - 864e5))) return "昨日";
			return dateKey;
		}
		//#endregion
		//#region src/client/KeyUsageSection.tsx
		/**
		* 「使用情况」设置页外壳：Tab 路由、范围 / 通道筛选状态与取数。
		* 台账类数据（通道 / 台账 / 热力图 / 汇总 / 快照）来自本地文件端点；
		* 项目与会话数据来自宿主会话事件折叠，切到对应 Tab 时才首次拉取。
		*/
		const TABS = [
			["overview", "总览"],
			["detail", "使用明细"],
			["projects", "项目用量"],
			["models", "按模型"],
			["sessions", "会话用量"],
			["quota", "余额与配额"]
		];
		function KeyUsageSection() {
			const [activeTab, setActiveTab] = (0, react.useState)("overview");
			const [range, setRange] = (0, react.useState)("month");
			const [customFrom, setCustomFrom] = (0, react.useState)(() => shiftedIsoDate(-29));
			const [customTo, setCustomTo] = (0, react.useState)(() => isoDate(/* @__PURE__ */ new Date()));
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			/** 跨 Tab 联动：从「会话用量」点工作目录进来时只看那一个项目（不做全局路由） */
			const [projectFilter, setProjectFilter] = (0, react.useState)(null);
			const [expandedPeriods, setExpandedPeriods] = (0, react.useState)({});
			const [detailSort, setDetailSort] = (0, react.useState)({
				key: "period",
				dir: "desc"
			});
			const [channels, setChannels] = (0, react.useState)([]);
			const [quotas, setQuotas] = (0, react.useState)([]);
			const [summary, setSummary] = (0, react.useState)(null);
			const [heatmap, setHeatmap] = (0, react.useState)([]);
			const [usage, setUsage] = (0, react.useState)(null);
			const [sessions, setSessions] = (0, react.useState)(null);
			const [projects, setProjects] = (0, react.useState)(null);
			const [models, setModels] = (0, react.useState)(null);
			const [pricing, setPricing] = (0, react.useState)(null);
			const [available, setAvailable] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			/**
			* 计费规则版本号：规则写进 YAML 后成本要整体重算，所有按成本展示的数据都得重取。
			* 规则只从面板保存（POST /pricing/rules）这一个入口变，所以用一个自增计数当失效信号即可。
			*/
			const [pricingRevision, setPricingRevision] = (0, react.useState)(0);
			const tooltip = useTooltip();
			const reload = (0, react.useCallback)(async (includeSessionData, forceQuota = false) => {
				setLoading(true);
				const quotaResult = await loadQuota(forceQuota);
				const [channelResult, summaryResult, heatmapResult] = await Promise.all([
					loadChannels(),
					loadSummary(),
					loadHeatmap()
				]);
				setChannels(channelResult ?? []);
				setQuotas(quotaResult ?? []);
				setSummary(summaryResult);
				setHeatmap(heatmapResult ?? []);
				if (includeSessionData) {
					const [sessionResult, projectResult, modelResult] = await Promise.all([
						loadSessions(),
						loadProjects(),
						loadModels()
					]);
					setSessions(sessionResult);
					setProjects(projectResult);
					setModels(modelResult);
				}
				setLoading(false);
			}, [pricingRevision]);
			(0, react.useEffect)(() => {
				reload(false);
			}, [reload]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				loadPricing().then((result) => {
					if (!cancelled) setPricing(result);
				});
				return () => {
					cancelled = true;
				};
			}, [pricingRevision]);
			(0, react.useEffect)(() => {
				if (activeTab === "sessions" && sessions === null) loadSessions().then(setSessions);
				if (activeTab === "projects" && projects === null) loadProjects().then(setProjects);
				if ((activeTab === "models" || activeTab === "quota") && models === null) loadModels().then(setModels);
			}, [
				activeTab,
				sessions,
				projects,
				models
			]);
			const bounds = (0, react.useMemo)(() => {
				const today = isoDate(/* @__PURE__ */ new Date());
				if (range === "today") return {
					from: today,
					to: today
				};
				if (range === "week") return {
					from: shiftedIsoDate(-6),
					to: today
				};
				if (range === "month") return {
					from: shiftedIsoDate(-29),
					to: today
				};
				if (range === "custom") return {
					from: customFrom,
					to: customTo < customFrom ? customFrom : customTo
				};
				return {
					from: available?.from ?? today,
					to: available?.to ?? today
				};
			}, [
				range,
				customFrom,
				customTo,
				available
			]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				loadUsage(bounds.from, bounds.to, channelFilter).then((result) => {
					if (cancelled || result === null) return;
					setUsage(result);
					if (result.availableFrom !== null && result.availableTo !== null) setAvailable({
						from: result.availableFrom,
						to: result.availableTo
					});
				});
				return () => {
					cancelled = true;
				};
			}, [
				bounds.from,
				bounds.to,
				channelFilter,
				pricingRevision
			]);
			const refresh = (0, react.useCallback)(() => {
				reload(activeTab === "sessions" || activeTab === "projects" || activeTab === "models" || sessions !== null || projects !== null || models !== null, true);
				loadUsage(bounds.from, bounds.to, channelFilter).then((result) => {
					if (result !== null) setUsage(result);
				});
			}, [
				reload,
				activeTab,
				sessions,
				projects,
				models,
				bounds.from,
				bounds.to,
				channelFilter
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shared_module_css_default.title,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "使用情况" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.titleActions,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: shared_module_css_default.refreshBtn,
								disabled: loading,
								onClick: refresh,
								children: loading ? "刷新中…" : "↻ 刷新"
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.tabBar,
						children: TABS.map(([tabId, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: activeTab === tabId ? shared_module_css_default.active : "",
							onClick: () => setActiveTab(tabId),
							children: label
						}, tabId))
					}),
					activeTab === "overview" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewTab, {
						channels,
						summary,
						quotas,
						heatmap,
						tooltip,
						onOpenDetail: (provider) => {
							setChannelFilter(provider);
							setActiveTab("detail");
						}
					}),
					activeTab === "detail" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailTab, {
						usage,
						channels,
						range,
						onRange: setRange,
						customFrom,
						onCustomFrom: setCustomFrom,
						customTo,
						onCustomTo: setCustomTo,
						channelFilter,
						onChannelFilter: setChannelFilter,
						expandedPeriods,
						onTogglePeriod: (periodKey) => setExpandedPeriods((previous) => ({
							...previous,
							[periodKey]: previous[periodKey] !== true
						})),
						sort: detailSort,
						onSort: setDetailSort,
						bounds,
						tooltip,
						pricingRevision
					}),
					activeTab === "projects" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProjectsTab, {
						data: projects,
						channels,
						focusWorkspace: projectFilter,
						onClearFocus: () => setProjectFilter(null)
					}),
					activeTab === "models" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelsTab, {
						data: models,
						channels
					}),
					activeTab === "sessions" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionsTab, {
						data: sessions,
						channels,
						tooltip,
						onOpenProject: (workspace) => {
							setProjectFilter(workspace);
							setActiveTab("projects");
						}
					}),
					activeTab === "quota" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuotaTab, {
						channels,
						quotas,
						pricing,
						models,
						onPricingReload: () => setPricingRevision((previous) => previous + 1)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shared_module_css_default.footnote,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "口径说明" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
							className: shared_module_css_default.footnoteList,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
									"按天数据优先取宿主用量台账（含官方成本）；台账无记录的日期回退本地会话事件折叠，那些天没有官方成本",
									summary !== null && summary.todaySource === "session" ? "（当前有 " + summary.sessionDates.length + " 天由会话补位）" : "",
									"。两套来源按天取舍、不相加。"
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "热力图按可见区间内活跃日的五分位分档（少 / 较少 / 中 / 较多 / 多，即 p20 / p40 / p60 / p80）。" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "项目用量、会话用量、按模型与单日「按小时」均来自会话事件，每个结算样本计一次调用（不计成本）。" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "已归档会话只是标记：用量照常计入，会话列表默认隐藏、可切换显示（显示时淡化并标注）。" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）。" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
									"成本来源与优先级见「余额与配额」页计费面板的 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "成本口径" }),
									"（ⓘ）：角标分 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "官方" }),
									" / ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "自定" }),
									" / ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "官方价" }),
									" / ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "估算" }),
									"， 没有价格依据时显示 —；规则以用户 YAML 文件为唯一事实来源（面板保存写的就是它，错峰与计价单位在 YAML 里维护），保存后立即重算。"
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: "余额与订阅窗口实时查询官方接口（失败回落本机快照），原样展示，不做换算与建议。" })
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipView, { tooltip: tooltip.tooltip })
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/page.module.css.mjs
		const css = ".Zd1J4W_page{box-sizing:border-box;overscroll-behavior:contain;width:100%;height:100%;min-height:0;overflow-x:hidden;overflow-y:auto}.Zd1J4W_inner{box-sizing:border-box;width:100%;max-width:1240px;margin:0 auto;padding:20px 24px 28px}";
		const tagId = "dsh-key-usage/page.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const cssRegistry = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry.some((e) => e.tagId === tagId)) cssRegistry.push({
			tagId,
			css
		});
		var page_module_css_default = {
			"inner": "Zd1J4W_inner",
			"page": "Zd1J4W_page"
		};
		//#endregion
		//#region src/client/UsagePage.tsx
		/** 宿主会传入根作用域的标准 kit 与绑定的 `t`；本页面当前不需要它们。 */
		function UsagePage(_props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: page_module_css_default.page,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: page_module_css_default.inner,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyUsageSection, {})
				})
			});
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* dsh-key-usage 客户端入口：注册「使用情况」侧边栏导航项 + 主区域页面。
		* UI 逻辑在 UsagePage / KeyUsageSection 里；本文件只做 cordis apply 接线。
		*
		* slot 契约（对齐已装的 dsh-context「上下文洞察」写法）：
		* - `sidebar.panellist`：宿主自持整行（标签 / hover / active），插件只提供图标，`id` 是面板标识；
		* - `main`：同一标识放在 `key` 上，宿主在主内容区按它渲染整页 —— 因此不是弹窗、也不占设置页。
		*
		* 计费规则以用户 YAML 文件为唯一事实来源：客户端只经 `/pricing` 读、经 `POST /pricing/rules` 写，
		* 宿主的设置服务链路（配置表单 + 插件页配置卡片）已随该方案整条退役。
		*/
		const NS = "dsh-key-usage";
		/** 侧边栏条目与 main 页面共用的面板标识（宿主 MainPanelId 域，命名空间化避免撞车）。 */
		const PANEL_ID = NS;
		const name = NS;
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID
			}, UsagePage));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 30,
				label: () => "使用情况"
			}, (props) => (0, react.createElement)(UsageIcon, { size: props.size })));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map