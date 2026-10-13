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
		async function fetchJson(path) {
			try {
				const response = await fetch(path, { headers: { Accept: "application/json" } });
				if (!response.ok) return null;
				return await response.json();
			} catch {
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
		function loadProjects(limit = 200) {
			return fetchJson("/dsh-key-usage/projects?limit=" + String(limit));
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
		//#region \0dsh-css:D:\EasyJob\.plugin\dsh-key-usage\src\client\styles\shared.module.css.mjs
		const css$5 = ".LhdpGW_section{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:13.5px;line-height:1.55}.LhdpGW_title{justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;font-size:18px;font-weight:650;display:flex}.LhdpGW_titleActions{align-items:center;gap:8px;display:inline-flex}.LhdpGW_refreshBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);cursor:pointer;background:0 0;border-radius:999px;padding:3px 12px;font-family:inherit;font-size:11.5px}.LhdpGW_refreshBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.LhdpGW_refreshBtn:disabled{opacity:.6;cursor:default}.LhdpGW_tabBar{border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);flex-wrap:wrap;gap:2px;margin-bottom:18px;display:flex}.LhdpGW_tabBar button{color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border:0;border-bottom:2px solid #0000;margin-bottom:-1px;padding:8px 14px;font-size:13px}.LhdpGW_tabBar button:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.LhdpGW_tabBar button.LhdpGW_active{color:var(--dsw-alias-state-accent-primary,#5b8cff);border-bottom-color:var(--dsw-alias-state-accent-primary,#5b8cff);font-weight:600}.LhdpGW_card{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;padding:14px 16px}.LhdpGW_cardGrid3{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px;display:grid}.LhdpGW_cardGrid4{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px;display:grid}.LhdpGW_cardGridAuto{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:18px;display:grid}@media (max-width:720px){.LhdpGW_cardGrid4{grid-template-columns:repeat(2,minmax(0,1fr))}}.LhdpGW_statLabel{color:var(--dsw-alias-label-tertiary,#67676f);margin-bottom:6px;font-size:11.5px}.LhdpGW_statValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:20px;font-weight:650}.LhdpGW_statExtra{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:4px;font-size:11.5px}.LhdpGW_groupLabel{color:var(--dsw-alias-label-secondary,#9a9aa6);margin:4px 0 10px;font-size:12.5px;font-weight:600}.LhdpGW_blockLabel{color:var(--dsw-alias-label-secondary,#9a9aa6);margin:18px 0 4px;font-size:11.5px}.LhdpGW_table{border-collapse:collapse;width:100%;margin-top:10px}.LhdpGW_table th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:5px 8px;font-size:10.5px;font-weight:500}.LhdpGW_table td{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);vertical-align:middle;border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:normal;overflow-wrap:anywhere;padding:7px 8px;font-size:12px}.LhdpGW_table th:first-child,.LhdpGW_table td:first-child{text-align:left;padding-left:0}.LhdpGW_table td:first-child{color:var(--dsw-alias-label-primary,#e8e8ec)}.LhdpGW_table th.LhdpGW_sortable{cursor:pointer;-webkit-user-select:none;user-select:none}.LhdpGW_table th.LhdpGW_sortable:hover{color:var(--dsw-alias-label-secondary,#9a9aa6)}.LhdpGW_table th.LhdpGW_sortActive{color:var(--dsw-alias-state-accent-primary,#5b8cff)}.LhdpGW_sortArrow{opacity:.8;margin-left:3px;font-size:8px}.LhdpGW_table tr.LhdpGW_clickable{cursor:pointer}.LhdpGW_table tr.LhdpGW_clickable:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.LhdpGW_table tr.LhdpGW_total td{color:var(--dsw-alias-label-primary,#e8e8ec);border-bottom:0;border-top:1px solid var(--dsw-alias-border-l2,#2c2c34);font-weight:600}.LhdpGW_table tr.LhdpGW_disabled{opacity:.55}.LhdpGW_chipRow{flex-wrap:wrap;gap:8px;margin-bottom:14px;display:flex}.LhdpGW_chip{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border-radius:999px;align-items:center;gap:6px;padding:5px 13px;font-size:12px;display:inline-flex}.LhdpGW_chip:hover{color:var(--dsw-alias-label-primary,#e8e8ec);border-color:var(--dsw-alias-label-tertiary,#67676f)}.LhdpGW_chip.LhdpGW_active{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-accent-primary,#5b8cff);border-color:#5b8cff66;font-weight:600}.LhdpGW_statusDot{border-radius:50%;flex-shrink:0;width:8px;height:8px;display:inline-block}.LhdpGW_dim{color:var(--dsw-alias-label-tertiary,#67676f)}.LhdpGW_mono{color:var(--dsw-alias-label-secondary,#9a9aa6);font-family:ui-monospace,Consolas,monospace;font-size:11px}.LhdpGW_empty{color:var(--dsw-alias-label-tertiary,#67676f);padding:18px 0}.LhdpGW_warning{color:var(--dsw-alias-state-warning-primary,#e0a13c);margin-bottom:10px;font-size:11.5px}.LhdpGW_legend{color:var(--dsw-alias-label-tertiary,#67676f);flex-wrap:wrap;align-items:center;gap:10px;font-size:10.5px;display:inline-flex}.LhdpGW_legend i{border-radius:2px;width:10px;height:10px;margin-right:3px;display:inline-block}.LhdpGW_legend i.LhdpGW_ghost{background:#80808c1a;border:1px solid #80808c47}.LhdpGW_footnote{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);color:var(--dsw-alias-label-tertiary,#67676f);margin-top:26px;padding-top:14px;font-size:11.5px;line-height:1.8}.LhdpGW_footnote b{color:var(--dsw-alias-label-secondary,#9a9aa6);font-weight:500}.LhdpGW_tooltip{z-index:9999;pointer-events:none;background:var(--dsw-alias-bg-layer-3,#232329);border:1px solid var(--dsw-alias-border-l2,#2c2c34);box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);min-width:210px;max-width:300px;color:var(--dsw-alias-label-primary,#e8e8ec);border-radius:10px;padding:10px 12px;font-family:inherit;font-size:12px;line-height:1.5;position:fixed}.LhdpGW_tipTitle{margin-bottom:2px;font-size:12px;font-weight:650}.LhdpGW_tipSub{color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:8px;font-size:11.5px}.LhdpGW_tipRow{color:var(--dsw-alias-label-secondary,#9a9aa6);align-items:center;gap:6px;padding:2px 0;font-size:11px;display:flex}.LhdpGW_tipRow i{border-radius:2px;flex-shrink:0;width:7px;height:7px}.LhdpGW_tipName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.LhdpGW_tipAmount{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#67676f);text-align:right;width:58px}.LhdpGW_tipRate{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.LhdpGW_tipBar{background:var(--dsw-alias-fill-l1,#80808c2e);border-radius:2px;height:3px;margin:1px 0 5px;overflow:hidden}.LhdpGW_tipBar>i{border-radius:2px;height:100%;display:block}.LhdpGW_tipDivider{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);justify-content:space-between;gap:12px;margin-top:6px;padding-top:6px;font-size:11px;display:flex}";
		const tagId$5 = "dsh-key-usage/shared.module.css";
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
		var shared_module_css_default = {
			"footnote": "LhdpGW_footnote",
			"legend": "LhdpGW_legend",
			"tipSub": "LhdpGW_tipSub",
			"cardGrid4": "LhdpGW_cardGrid4",
			"tabBar": "LhdpGW_tabBar",
			"chipRow": "LhdpGW_chipRow",
			"empty": "LhdpGW_empty",
			"section": "LhdpGW_section",
			"warning": "LhdpGW_warning",
			"blockLabel": "LhdpGW_blockLabel",
			"cardGridAuto": "LhdpGW_cardGridAuto",
			"disabled": "LhdpGW_disabled",
			"title": "LhdpGW_title",
			"tipName": "LhdpGW_tipName",
			"tipRate": "LhdpGW_tipRate",
			"statValue": "LhdpGW_statValue",
			"tipAmount": "LhdpGW_tipAmount",
			"tipDivider": "LhdpGW_tipDivider",
			"total": "LhdpGW_total",
			"groupLabel": "LhdpGW_groupLabel",
			"sortActive": "LhdpGW_sortActive",
			"chip": "LhdpGW_chip",
			"refreshBtn": "LhdpGW_refreshBtn",
			"table": "LhdpGW_table",
			"tipTitle": "LhdpGW_tipTitle",
			"statusDot": "LhdpGW_statusDot",
			"sortArrow": "LhdpGW_sortArrow",
			"tooltip": "LhdpGW_tooltip",
			"cardGrid3": "LhdpGW_cardGrid3",
			"clickable": "LhdpGW_clickable",
			"tipRow": "LhdpGW_tipRow",
			"statLabel": "LhdpGW_statLabel",
			"titleActions": "LhdpGW_titleActions",
			"sortable": "LhdpGW_sortable",
			"active": "LhdpGW_active",
			"ghost": "LhdpGW_ghost",
			"tipBar": "LhdpGW_tipBar",
			"statExtra": "LhdpGW_statExtra",
			"mono": "LhdpGW_mono",
			"dim": "LhdpGW_dim",
			"card": "LhdpGW_card"
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
		//#region \0dsh-css:D:\EasyJob\.plugin\dsh-key-usage\src\client\styles\overview.module.css.mjs
		const css$4 = ".J7Idbq_keyTable{border-collapse:collapse;width:100%}.J7Idbq_keyTable th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:6px 10px;font-size:10.5px;font-weight:500}.J7Idbq_keyTable th:first-child{text-align:left;padding-left:0}.J7Idbq_keyTable td{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);border-bottom:1px solid var(--dsw-alias-fill-l1,#80808c1f);white-space:nowrap;padding:10px;font-size:12.5px}.J7Idbq_keyTable td:first-child{text-align:left;padding-left:0}.J7Idbq_keyTable tr:last-child td{border-bottom:0}.J7Idbq_keyTable tbody tr.J7Idbq_clickable{cursor:pointer}.J7Idbq_keyTable tbody tr.J7Idbq_clickable:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.J7Idbq_keyTable tr.J7Idbq_disabledRow{opacity:.55}.J7Idbq_cellKey{align-items:center;gap:10px;display:flex}.J7Idbq_keyDisplay{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:13px;font-weight:600}.J7Idbq_keyEnv{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:1px;font-family:ui-monospace,Consolas,monospace;font-size:10px}.J7Idbq_tag{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);background:var(--dsw-alias-bg-layer-2,#1d1d22);border-radius:5px;padding:1px 7px;font-size:10.5px;display:inline-block}.J7Idbq_tag.J7Idbq_free{color:var(--dsw-alias-state-success-primary,#3fb96f);border-color:#3fb96f59}.J7Idbq_tag.J7Idbq_sub{color:var(--dsw-alias-state-accent-primary,#5b8cff);border-color:#5b8cff59}.J7Idbq_tag.J7Idbq_off{color:var(--dsw-alias-label-tertiary,#67676f)}.J7Idbq_rowLink{color:var(--dsw-alias-label-tertiary,#67676f);font-size:11px}.J7Idbq_keyTable tbody tr.J7Idbq_clickable:hover .J7Idbq_rowLink{color:var(--dsw-alias-state-accent-primary,#5b8cff)}.J7Idbq_quotaCell{align-items:center;gap:8px;display:inline-flex}.J7Idbq_miniBar{background:var(--dsw-alias-fill-l2,#80808c2e);border-radius:3px;flex-shrink:0;width:64px;height:5px;overflow:hidden}.J7Idbq_miniBar>i{border-radius:3px;height:100%;display:block}.J7Idbq_quotaText{text-align:left;min-width:74px}.J7Idbq_quotaText.J7Idbq_warn{color:var(--dsw-alias-state-warning-primary,#e0a13c);font-weight:600}.J7Idbq_quotaText.J7Idbq_danger{color:var(--dsw-alias-state-danger-primary,#e05a5a);font-weight:600}.J7Idbq_quotaText.J7Idbq_dim{color:var(--dsw-alias-label-tertiary,#67676f)}.J7Idbq_heatmapCard{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;margin-top:24px;padding:14px 16px}.J7Idbq_heatmapHead{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:10px;display:flex}.J7Idbq_heatmapTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:11.5px}.J7Idbq_heatmapWrap{gap:5px;display:flex}.J7Idbq_heatWeekdays{flex-direction:column;flex-shrink:0;gap:2px;display:flex}.J7Idbq_heatWeekdays span{color:var(--dsw-alias-label-tertiary,#67676f);text-align:right;width:11px;font-size:8.5px}.J7Idbq_heatGrid{flex:1;gap:2px;min-width:0;display:flex}.J7Idbq_heatWeek{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.J7Idbq_heatCell{aspect-ratio:1;background:var(--dsw-alias-fill-l1,#80808c2e);cursor:default;border-radius:2px;width:100%;max-height:12px}.J7Idbq_heatCell.J7Idbq_idle{background:#80808c38}.J7Idbq_heatCell.J7Idbq_empty{background:#80808c1a;border:1px solid #80808c40}.J7Idbq_heatMonths{gap:2px;margin:5px 0 0 16px;display:flex}.J7Idbq_heatMonths span{color:var(--dsw-alias-label-tertiary,#67676f);text-align:left;white-space:nowrap;flex:1;font-size:9px}.J7Idbq_heatScale{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:8px;font-size:10.5px}";
		const tagId$4 = "dsh-key-usage/overview.module.css";
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
		var overview_module_css_default = {
			"warn": "J7Idbq_warn",
			"heatmapWrap": "J7Idbq_heatmapWrap",
			"cellKey": "J7Idbq_cellKey",
			"keyEnv": "J7Idbq_keyEnv",
			"sub": "J7Idbq_sub",
			"heatmapCard": "J7Idbq_heatmapCard",
			"heatMonths": "J7Idbq_heatMonths",
			"heatmapHead": "J7Idbq_heatmapHead",
			"idle": "J7Idbq_idle",
			"heatGrid": "J7Idbq_heatGrid",
			"free": "J7Idbq_free",
			"keyDisplay": "J7Idbq_keyDisplay",
			"dim": "J7Idbq_dim",
			"heatWeek": "J7Idbq_heatWeek",
			"rowLink": "J7Idbq_rowLink",
			"keyTable": "J7Idbq_keyTable",
			"danger": "J7Idbq_danger",
			"off": "J7Idbq_off",
			"miniBar": "J7Idbq_miniBar",
			"heatmapTitle": "J7Idbq_heatmapTitle",
			"quotaCell": "J7Idbq_quotaCell",
			"heatScale": "J7Idbq_heatScale",
			"disabledRow": "J7Idbq_disabledRow",
			"heatWeekdays": "J7Idbq_heatWeekdays",
			"quotaText": "J7Idbq_quotaText",
			"heatCell": "J7Idbq_heatCell",
			"empty": "J7Idbq_empty",
			"tag": "J7Idbq_tag",
			"clickable": "J7Idbq_clickable"
		};
		//#endregion
		//#region src/client/components/Heatmap.tsx
		/**
		* 年度活跃热力图：53 周滚动窗口（含未来格 ghost 占位）。
		* 强度分档取活跃日的三分位（p33 / p67），并在卡片底部标出实际阈值 ——
		* 固定绝对值在低用量下会全暗、高用量下会全亮，分位数能保证三档都有区分度。
		*/
		const DAY_MS = 864e5;
		function levelThresholds(days) {
			const active = days.map((day) => day.totalTokens).filter((tokens) => tokens > 0).sort((first, second) => first - second);
			if (active.length < 3) return [5e7, 2e8];
			const pick = (fraction) => active[Math.min(active.length - 1, Math.floor(active.length * fraction))];
			return [pick(.33), pick(.67)];
		}
		function levelOf(tokens, thresholds) {
			if (tokens <= 0) return 0;
			if (tokens < thresholds[0]) return 1;
			if (tokens < thresholds[1]) return 2;
			return 3;
		}
		const LEVEL_COLORS = [
			"rgba(128,128,140,.22)",
			"rgba(91,140,255,.25)",
			"rgba(91,140,255,.55)",
			"#5b8cff"
		];
		function Heatmap(props) {
			const { days, channels, tooltip } = props;
			const heatmapByDate = (0, react.useMemo)(() => new Map(days.map((day) => [day.date, day])), [days]);
			const thresholds = (0, react.useMemo)(() => levelThresholds(days), [days]);
			const { columns, monthLabels } = (0, react.useMemo)(() => {
				const today = /* @__PURE__ */ new Date();
				today.setHours(0, 0, 0, 0);
				const endSaturday = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS);
				const start = /* @__PURE__ */ new Date(endSaturday.getTime() - 370 * DAY_MS);
				const dataStart = days.length > 0 ? days[0].date : null;
				const cells = [];
				for (let offset = 0; offset < 371; offset += 1) {
					const date = new Date(start.getTime() + offset * DAY_MS);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: overview_module_css_default.heatmapCard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.heatmapHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: overview_module_css_default.heatmapTitle,
							children: "活跃热力图 · 按当日 Tokens 总量 · 悬停查看当日各模型占比"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: shared_module_css_default.legend,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "ghost" }), "无数据"] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[0] } }), "无用量"] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[1] } }), "少"] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[2] } }), "中"] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[3] } }), "高"] })
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.heatmapWrap,
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
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: overview_module_css_default.heatMonths,
						children: monthLabels.map((label, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }, index))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.heatScale,
						children: [
							"分档按活跃日三分位：少 < ",
							fmtTokens(thresholds[0]),
							" · 中 < ",
							fmtTokens(thresholds[1]),
							" · 高 ≥ ",
							fmtTokens(thresholds[1])
						]
					})
				]
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
								}) : costCell.text }),
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
				summary !== null && summary.todaySource === "session" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: [
						"今日数据来自会话事件（宿主台账已停更，最近 ",
						summary.sessionDates.length,
						" 天由会话补位；这些天没有官方成本）"
					]
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
		//#region \0dsh-css:D:\EasyJob\.plugin\dsh-key-usage\src\client\styles\detail.module.css.mjs
		const css$3 = ".V9QVRa_rangeBar{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;display:flex}.V9QVRa_rangeLeft{flex-wrap:wrap;align-items:center;gap:10px;display:flex}.V9QVRa_rangeTabs{border:1px solid var(--dsw-alias-border-l2,#2c2c34);border-radius:9px;gap:2px;padding:2px;display:inline-flex}.V9QVRa_rangeTabs button{color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:7px;padding:4px 13px;font-size:12px}.V9QVRa_rangeTabs button.V9QVRa_active{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-accent-primary,#5b8cff);font-weight:600}.V9QVRa_rangeInput{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light dark;background:0 0;border-radius:7px;padding:3px 8px;font-size:12px}@media (prefers-color-scheme:dark){.V9QVRa_rangeInput{--lightningcss-light: ;--lightningcss-dark:initial}}.V9QVRa_rangeCaption{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:auto;font-size:11.5px}.V9QVRa_shareBar{border-radius:6px;gap:2px;height:12px;margin:8px 0 2px;display:flex;overflow:hidden}.V9QVRa_shareBar>i{cursor:default;height:100%;display:block}.V9QVRa_shareBar>i:hover{filter:brightness(1.15)}.V9QVRa_chartTitle{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:10px;display:flex}.V9QVRa_bars{align-items:flex-end;gap:3px;height:110px;margin-top:8px;display:flex}.V9QVRa_barsDense{gap:2px}.V9QVRa_barColumn{cursor:default;flex-direction:column;flex:1;justify-content:flex-end;gap:1px;height:100%;display:flex}.V9QVRa_barColumn:hover{filter:brightness(1.2)}.V9QVRa_segCache{background:var(--dsw-alias-state-accent-tertiary,#5b8cff47);border-radius:2px 2px 0 0}.V9QVRa_segIn{background:var(--dsw-alias-state-accent-primary,#5b8cff)}.V9QVRa_segOut{background:var(--dsw-alias-state-business-primary,#9a7bff);border-radius:0 0 2px 2px}.V9QVRa_barLabels{margin-top:6px;display:flex}.V9QVRa_barLabels span{text-align:center;color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap;flex:1;font-size:9.5px}.V9QVRa_subRowCell{background:var(--dsw-alias-fill-l1,#80808c0d);text-align:left!important;padding:2px 10px 10px 30px!important}.V9QVRa_subHead,.V9QVRa_subRow{grid-template-columns:minmax(150px,1.5fr) minmax(70px,1fr) minmax(70px,1fr) minmax(70px,1fr) minmax(80px,1.1fr) minmax(70px,1fr);align-items:center;gap:8px;display:grid}.V9QVRa_subHead{color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-fill-l2,#80808c33);padding:4px 0;font-size:10px}.V9QVRa_subRow{border-bottom:1px dashed var(--dsw-alias-fill-l1,#80808c24);padding:5px 0;font-size:11.5px}.V9QVRa_subRow:last-child{border-bottom:0}.V9QVRa_subName{flex-direction:column;gap:1px;min-width:0;display:flex}.V9QVRa_subModel{color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,Consolas,monospace;font-size:11px;overflow:hidden}.V9QVRa_subChannel{color:var(--dsw-alias-label-tertiary,#67676f);text-overflow:ellipsis;white-space:nowrap;font-family:inherit;font-size:10px;overflow:hidden}.V9QVRa_subNumber{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6)}.V9QVRa_toggleArrow{width:13px;color:var(--dsw-alias-label-tertiary,#67676f);font-size:9px;display:inline-block}";
		const tagId$3 = "dsh-key-usage/detail.module.css";
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
		var detail_module_css_default = {
			"toggleArrow": "V9QVRa_toggleArrow",
			"bars": "V9QVRa_bars",
			"subModel": "V9QVRa_subModel",
			"rangeTabs": "V9QVRa_rangeTabs",
			"rangeLeft": "V9QVRa_rangeLeft",
			"segOut": "V9QVRa_segOut",
			"barLabels": "V9QVRa_barLabels",
			"subChannel": "V9QVRa_subChannel",
			"subHead": "V9QVRa_subHead",
			"active": "V9QVRa_active",
			"barColumn": "V9QVRa_barColumn",
			"subRowCell": "V9QVRa_subRowCell",
			"subName": "V9QVRa_subName",
			"chartTitle": "V9QVRa_chartTitle",
			"subNumber": "V9QVRa_subNumber",
			"segCache": "V9QVRa_segCache",
			"rangeBar": "V9QVRa_rangeBar",
			"rangeCaption": "V9QVRa_rangeCaption",
			"subRow": "V9QVRa_subRow",
			"rangeInput": "V9QVRa_rangeInput",
			"segIn": "V9QVRa_segIn",
			"barsDense": "V9QVRa_barsDense",
			"shareBar": "V9QVRa_shareBar"
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statLabel,
					children: title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: detail_module_css_default.shareBar,
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
		//#region src/client/components/DailyDetailTable.tsx
		/**
		* 每日细目：以「天」为折叠单位，展开行用原型子表格展示模型维度
		* （模型 + 调用 / 输入 / 输出 / 缓存读 / 命中率，不占主表列）。
		*/
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
			const ordered = [...aggregates.values()].sort((first, second) => {
				const compared = comparer(first, second);
				return sort.dir === "asc" ? compared : -compared;
			});
			const header = (key, label) => {
				const isActive = sort.key === key;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("th", {
					className: isActive ? shared_module_css_default.sortActive : shared_module_css_default.sortable,
					onClick: () => onSort(isActive ? {
						key,
						dir: sort.dir === "asc" ? "desc" : "asc"
					} : {
						key,
						dir: "desc"
					}),
					children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: shared_module_css_default.sortArrow,
						children: isActive ? sort.dir === "asc" ? "▲" : "▼" : "↕"
					})]
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.blockLabel,
				children: "每日细目"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
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
					const modelsInPeriod = modelRows.filter((row) => row.period === period.period).sort((first, second) => second.totalTokens - first.totalTokens);
					const expandable = modelsInPeriod.length > 1;
					const isOpen = expandable && expandedPeriods[period.period] === true;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
						className: expandable ? shared_module_css_default.clickable : "",
						onClick: expandable ? () => onTogglePeriod(period.period) : void 0,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [expandable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.toggleArrow,
								children: isOpen ? "▼" : "▶"
							}), period.period] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(period.totalTokens) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtCalls(period.calls) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(period.inputTokens) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(period.outputTokens) }),
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
									children: fmtTokens(row.inputTokens)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: detail_module_css_default.subNumber,
									children: fmtTokens(row.outputTokens)
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
			})] });
		}
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
		function hitRateOf(cacheReadTokens, inputTokens, outputTokens) {
			const total = inputTokens + outputTokens + cacheReadTokens;
			return total > 0 ? (cacheReadTokens / total * 100).toFixed(1) + "%" : "—";
		}
		function daysBetween(from, to) {
			const fromTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const toTime = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
			return Math.max(1, Math.round((toTime - fromTime) / 864e5) + 1);
		}
		/** 范围内每一天的日期键（无数据的日子也要出现在横轴上）。 */
		function dateKeysOfRange(from, to) {
			const start = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const total = Math.min(daysBetween(from, to), MAX_AXIS_DAYS);
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
				reasoningTokens: 0,
				cost: 0
			};
			const totalTokens = safeTotals.inputTokens + safeTotals.outputTokens + safeTotals.cacheReadTokens;
			const hitRate = hitRateOf(safeTotals.cacheReadTokens, safeTotals.inputTokens, safeTotals.outputTokens);
			const singleChannel = channelFilter === "ALL" ? null : channelOf(channels, channelFilter);
			const costCell = costCellText(singleChannel, safeTotals.cost);
			const singleDay = bounds.from === bounds.to;
			const rangeDays = Math.min(daysBetween(bounds.from, bounds.to), MAX_AXIS_DAYS);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: detail_module_css_default.rangeBar,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.cardGrid3,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "调用次数",
							value: fmtCalls(safeTotals.calls),
							extra: activeProviders.size + " 个通道有用量"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "Tokens",
							value: fmtTokens(totalTokens),
							extra: "缓存读 " + fmtTokens(safeTotals.cacheReadTokens) + " · 命中率 " + hitRate
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "成本",
							value: costCell.dim ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: shared_module_css_default.dim,
								children: costCell.text
							}) : costCell.text,
							extra: "按所选范围与筛选聚合"
						})
					]
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
							tooltip
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
		//#region \0dsh-css:D:\EasyJob\.plugin\dsh-key-usage\src\client\styles\lists.module.css.mjs
		const css$2 = ".QpFKma_filterBar{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;display:flex}.QpFKma_searchInput{border:1px solid var(--dsw-alias-border-l2,#2c2c34);min-width:180px;color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;background:0 0;border-radius:9px;flex:1;padding:6px 12px;font-size:12.5px}.QpFKma_searchInput::placeholder{color:var(--dsw-alias-label-tertiary,#67676f)}.QpFKma_filterSelect{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;border-radius:9px;padding:6px 10px;font-size:12px}.QpFKma_listTitle{align-items:center;gap:10px;min-width:0;display:flex}.QpFKma_listMain{color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;overflow:hidden}.QpFKma_listSub{color:var(--dsw-alias-label-tertiary,#67676f);text-overflow:ellipsis;white-space:nowrap;margin-top:1px;font-size:10.5px;overflow:hidden}.QpFKma_listBar{background:var(--dsw-alias-fill-l2,#80808c2e);vertical-align:middle;border-radius:3px;width:70px;height:5px;display:inline-block;overflow:hidden}.QpFKma_listBar>i{border-radius:3px;height:100%;display:block}.QpFKma_sessionDay td{background:var(--dsw-alias-bg-layer-2,#1d1d22);color:var(--dsw-alias-label-primary,#e8e8ec);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);font-size:12px;font-weight:600;text-align:left!important;padding:7px 10px!important}.QpFKma_dayCount{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:8px;font-size:11px;font-weight:500}";
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
			"filterSelect": "QpFKma_filterSelect",
			"sessionDay": "QpFKma_sessionDay",
			"filterBar": "QpFKma_filterBar",
			"listTitle": "QpFKma_listTitle",
			"dayCount": "QpFKma_dayCount",
			"listMain": "QpFKma_listMain",
			"searchInput": "QpFKma_searchInput",
			"listBar": "QpFKma_listBar",
			"listSub": "QpFKma_listSub"
		};
		//#endregion
		//#region src/client/tabs/ProjectsTab.tsx
		/** 项目用量：按会话工作目录聚合（数据来自宿主会话事件折叠）。 */
		function ProjectsTab(props) {
			const [query, setQuery] = (0, react.useState)("");
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			const [sortKey, setSortKey] = (0, react.useState)("recent");
			const [nowMs] = (0, react.useState)(() => Date.now());
			const rows = props.data?.rows ?? [];
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const filtered = rows.filter((row) => {
					const matchesQuery = keyword === "" || row.workspace.toLowerCase().includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.providers[channelFilter] !== void 0;
					return matchesQuery && matchesChannel;
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
				sortKey
			]);
			const totalTokens = rows.reduce((total, row) => total + row.tokens, 0);
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
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: shared_module_css_default.table,
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
							}) : costCell.text }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtRelative(row.lastTime, nowMs) })
						] }, row.workspace);
					}), visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						colSpan: 6,
						className: shared_module_css_default.empty,
						children: "没有符合条件的项目"
					}) })] })]
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
		//#region \0dsh-css:D:\EasyJob\.plugin\dsh-key-usage\src\client\styles\quota.module.css.mjs
		const css$1 = ".F7iUHa_quotaList{flex-direction:column;gap:12px;display:flex}.F7iUHa_quotaCard{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;padding:16px 18px}.F7iUHa_quotaHead{flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px;display:flex}.F7iUHa_quotaTitle{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:13px;font-weight:600}.F7iUHa_quotaEnv{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:8px;font-family:ui-monospace,Consolas,monospace;font-size:10px}.F7iUHa_quotaProvider{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:auto;font-size:11.5px}.F7iUHa_liveChip{border:1px solid var(--dsw-alias-state-success-primary,#3fb950);color:var(--dsw-alias-state-success-primary,#3fb950);border-radius:999px;padding:1px 7px;font-size:10px;line-height:1.6}.F7iUHa_balanceStrip{flex-wrap:wrap;align-items:baseline;gap:10px 44px;display:flex}.F7iUHa_balanceItem .F7iUHa_bsLabel{color:var(--dsw-alias-label-tertiary,#67676f);margin-bottom:2px;font-size:11px}.F7iUHa_balanceItem .F7iUHa_bsValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:16px;font-weight:650}.F7iUHa_windowRow{flex-wrap:wrap;gap:18px;display:flex}.F7iUHa_windowItem{flex:1;min-width:150px}.F7iUHa_windowHead{justify-content:space-between;align-items:baseline;margin-bottom:5px;display:flex}.F7iUHa_windowName{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:11.5px}.F7iUHa_windowValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:12px;font-weight:600}.F7iUHa_windowReset{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:3px;font-size:10.5px}.F7iUHa_windowBar{background:var(--dsw-alias-fill-l2,#80808c2e);border-radius:4px;height:6px;overflow:hidden}.F7iUHa_windowBar>i{border-radius:4px;height:100%;display:block}.F7iUHa_snapshotHint{color:var(--dsw-alias-label-tertiary,#67676f);margin-top:10px;font-size:10.5px}.F7iUHa_snapshotStale{color:var(--dsw-alias-state-warning-primary,#e0a13c);margin-top:10px;font-size:10.5px}";
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
			"quotaProvider": "F7iUHa_quotaProvider",
			"quotaTitle": "F7iUHa_quotaTitle",
			"quotaList": "F7iUHa_quotaList",
			"windowName": "F7iUHa_windowName",
			"windowBar": "F7iUHa_windowBar",
			"snapshotStale": "F7iUHa_snapshotStale",
			"windowHead": "F7iUHa_windowHead",
			"bsValue": "F7iUHa_bsValue",
			"balanceStrip": "F7iUHa_balanceStrip",
			"balanceItem": "F7iUHa_balanceItem",
			"quotaCard": "F7iUHa_quotaCard",
			"quotaHead": "F7iUHa_quotaHead",
			"bsLabel": "F7iUHa_bsLabel",
			"windowRow": "F7iUHa_windowRow",
			"windowValue": "F7iUHa_windowValue",
			"snapshotHint": "F7iUHa_snapshotHint",
			"quotaEnv": "F7iUHa_quotaEnv",
			"windowReset": "F7iUHa_windowReset",
			"windowItem": "F7iUHa_windowItem",
			"liveChip": "F7iUHa_liveChip"
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
				children: [props.channels.map((channel) => {
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
							snapshot !== null && !isLive && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: staleDaysOf(snapshot.updatedAt) >= 1 ? quota_module_css_default.snapshotStale : quota_module_css_default.snapshotHint,
								children: [
									"实时查询未成功（",
									errorTextOf(snapshot.error),
									"），显示本机快照",
									snapshot.updatedAt === null ? "" : " · 快照时间 " + fmtDateTime(snapshot.updatedAt) + (staleDaysOf(snapshot.updatedAt) >= 1 ? "，已 " + staleDaysOf(snapshot.updatedAt) + " 天未更新" : "")
								]
							})
						]
					}, channel.provider);
				}), props.channels.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: "未读取到通道配置"
				})]
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
		//#region src/client/tabs/SessionsTab.tsx
		/** 会话用量：按会话列出 tokens / 命中率 / 时长，按最近活跃时按日分组。 */
		function SessionsTab(props) {
			const [query, setQuery] = (0, react.useState)("");
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			const [daysFilter, setDaysFilter] = (0, react.useState)("30");
			const [sortKey, setSortKey] = (0, react.useState)("recent");
			const [nowMs] = (0, react.useState)(() => Date.now());
			const rows = props.data?.rows ?? [];
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const maxAgeDays = Number(daysFilter);
				const filtered = rows.filter((row) => {
					const title = (row.title ?? "") + " " + row.id + " " + (row.workspace ?? "");
					const matchesQuery = keyword === "" || title.toLowerCase().includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.provider === channelFilter;
					const matchesAge = maxAgeDays === 0 || row.lastTime === null || nowMs - row.lastTime <= maxAgeDays * 864e5;
					return matchesQuery && matchesChannel && matchesAge;
				});
				const sorters = {
					recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
					tokensDesc: (first, second) => second.tokens - first.tokens,
					tokensAsc: (first, second) => first.tokens - second.tokens,
					durationDesc: (first, second) => durationOf(second) - durationOf(first)
				};
				return [...filtered].sort(sorters[sortKey]);
			}, [
				rows,
				query,
				channelFilter,
				daysFilter,
				sortKey,
				nowMs
			]);
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
					rows: [row]
				});
				else last.rows.push(row);
			}
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
							placeholder: "搜索会话标题、session id、工作区…",
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
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: shared_module_css_default.table,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "会话" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "通道" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "时间 / 时长" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "命中率" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "成本" })
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [
						groups.map((group) => {
							const groupTokens = group.rows.reduce((total, row) => total + row.tokens, 0);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", {
								className: lists_module_css_default.sessionDay,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
									colSpan: 6,
									children: [group.label, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: lists_module_css_default.dayCount,
										children: [
											group.rows.length,
											" 个会话 · ",
											fmtTokens(groupTokens)
										]
									})]
								})
							}), group.rows.map((row) => sessionRowOf(row, props.channels))] }, "group-" + group.label);
						}),
						sortKey !== "recent" && visible.map((row) => sessionRowOf(row, props.channels)),
						visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							colSpan: 6,
							className: shared_module_css_default.empty,
							children: "没有符合条件的会话"
						}) })
					] })]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: ["会话用量按宿主会话事件折叠（每个结算样本计一次调用）；成本按台账模型均价估算", props.data.priced ? "" : "（台账无成本数据，暂不可估）"]
				})
			] });
		}
		function sessionRowOf(row, channels) {
			const channel = channelOf(channels, row.provider);
			const costCell = costCellText(channel, row.cost ?? 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: lists_module_css_default.listMain,
					children: row.title ?? "会话 " + shortIdOf(row.id)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: lists_module_css_default.listSub,
					children: row.workspace ?? "未归属工作区"
				})] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.providerLabel ?? displayNameOf(channels, row.provider ?? "") }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: row.lastTime === null ? "—" : dayLabelOf(row.lastTime, Date.now()) + " " + fmtTime(row.lastTime) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.listSub,
					children: ["时长 ", fmtDuration(durationOf(row))]
				})] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(row.tokens) }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cacheHitRate === null ? "—" : row.cacheHitRate.toFixed(1) + "%" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cost === null || channel === null || channel.costMode !== "perToken" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: shared_module_css_default.dim,
					children: costCell.text
				}) : costCell.text })
			] }, row.id);
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
			["sessions", "会话用量"],
			["quota", "余额与配额"]
		];
		function KeyUsageSection() {
			const [activeTab, setActiveTab] = (0, react.useState)("overview");
			const [range, setRange] = (0, react.useState)("month");
			const [customFrom, setCustomFrom] = (0, react.useState)(() => shiftedIsoDate(-29));
			const [customTo, setCustomTo] = (0, react.useState)(() => isoDate(/* @__PURE__ */ new Date()));
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
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
			const [available, setAvailable] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
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
					const [sessionResult, projectResult] = await Promise.all([loadSessions(), loadProjects()]);
					setSessions(sessionResult);
					setProjects(projectResult);
				}
				setLoading(false);
			}, []);
			(0, react.useEffect)(() => {
				reload(false);
			}, [reload]);
			(0, react.useEffect)(() => {
				if (activeTab === "sessions" && sessions === null) loadSessions().then(setSessions);
				if (activeTab === "projects" && projects === null) loadProjects().then(setProjects);
			}, [
				activeTab,
				sessions,
				projects
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
				channelFilter
			]);
			const refresh = (0, react.useCallback)(() => {
				reload(activeTab === "sessions" || activeTab === "projects" || sessions !== null || projects !== null, true);
				loadUsage(bounds.from, bounds.to, channelFilter).then((result) => {
					if (result !== null) setUsage(result);
				});
			}, [
				reload,
				activeTab,
				sessions,
				projects,
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
						tooltip
					}),
					activeTab === "projects" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProjectsTab, {
						data: projects,
						channels
					}),
					activeTab === "sessions" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionsTab, {
						data: sessions,
						channels
					}),
					activeTab === "quota" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuotaTab, {
						channels,
						quotas
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shared_module_css_default.footnote,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "口径说明" }), "：按天数据优先取宿主用量台账（有官方成本）；台账没有记录的日期回退到本地会话事件折叠 （那些天没有官方成本，界面上会标注来源）—— 两套来源按天取舍、不相加，避免重复计数； 项目用量与会话用量全部来自会话事件，每个结算样本计一次调用，单日「按小时」视图同理（不含成本）； 命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）；余额与订阅窗口原样展示官方接口返回的数据，不做换算与建议。"]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipView, { tooltip: tooltip.tooltip })
				]
			});
		}
		//#endregion
		//#region \0dsh-css:D:\EasyJob\.plugin\dsh-key-usage\src\client\styles\page.module.css.mjs
		const css = "._2fl9Ga_page{box-sizing:border-box;overscroll-behavior:contain;width:100%;height:100%;min-height:0;overflow-x:hidden;overflow-y:auto}._2fl9Ga_inner{box-sizing:border-box;width:100%;max-width:1240px;margin:0 auto;padding:20px 24px 28px}";
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
			"page": "_2fl9Ga_page",
			"inner": "_2fl9Ga_inner"
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