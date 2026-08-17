window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-skin-claude-code",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0dsh-css:packages/skins/claude-code/src/client/claude-code.module.css.mjs
		const css = "body[data-dsh-claude-code]{--claude-code-ui-font:var(--dsh-appearance-ui-font,\"思源宋体 VF\", \"Source Han Serif SC VF\", \"思源宋体\", \"Songti SC\", serif);--claude-code-mono-font:var(--dsh-appearance-code-font,\"SF Mono\", \"SFMono-Regular\", Menlo, Consolas, monospace);--claude-code-accent:var(--dsh-appearance-light-accent,#da7756);--claude-code-canvas:var(--dsh-appearance-light-canvas,#f5f3ee);--claude-code-surface:var(--dsh-appearance-light-surface,#f1eee8);--claude-code-foreground:var(--dsh-appearance-light-foreground,#1d1b16);--claude-code-brand-invert:var(--dsh-appearance-light-canvas,#fffdf9);--claude-code-brand-text:color-mix(in srgb, var(--dsh-appearance-light-accent,#a95137) 72%, var(--dsh-appearance-light-foreground,#a95137) 28%);--claude-code-warning:color-mix(in srgb, var(--dsh-appearance-light-accent,#cc7d5e) 82%, var(--dsh-appearance-light-foreground,#cc7d5e) 18%);--claude-code-layer-2:color-mix(in srgb, var(--dsh-appearance-light-surface,#ece8e0) 94%, var(--dsh-appearance-light-foreground,#ece8e0) 6%);--claude-code-layer-3:color-mix(in srgb, var(--dsh-appearance-light-surface,#e5e0d7) 90%, var(--dsh-appearance-light-foreground,#e5e0d7) 10%);--claude-code-label-primary-dimmed:color-mix(in srgb, var(--dsh-appearance-light-foreground,#4a453c) 82%, var(--dsh-appearance-light-canvas,#4a453c) 18%);--claude-code-label-dimmed:color-mix(in srgb, var(--dsh-appearance-light-foreground,#6e675e) 68%, var(--dsh-appearance-light-canvas,#6e675e) 32%);--claude-code-label-caption:color-mix(in srgb, var(--dsh-appearance-light-foreground,#999087) 48%, var(--dsh-appearance-light-canvas,#999087) 52%);--claude-code-border-l1:color-mix(in srgb, var(--dsh-appearance-light-surface,#d8d2c9) 82%, var(--dsh-appearance-light-foreground,#d8d2c9) 18%);--claude-code-border-l2:color-mix(in srgb, var(--dsh-appearance-light-surface,#cfc7bc) 76%, var(--dsh-appearance-light-foreground,#cfc7bc) 24%);--claude-code-border-l3:color-mix(in srgb, var(--dsh-appearance-light-surface,#c0b5a8) 68%, var(--dsh-appearance-light-foreground,#c0b5a8) 32%);--claude-code-border-l4:color-mix(in srgb, var(--dsh-appearance-light-surface,#b0a494) 60%, var(--dsh-appearance-light-foreground,#b0a494) 40%);--claude-code-interactive-hover:color-mix(in srgb, var(--dsh-appearance-light-surface,#e8e2d9) 92%, var(--dsh-appearance-light-foreground,#e8e2d9) 8%);--claude-code-interactive-active:color-mix(in srgb, var(--dsh-appearance-light-surface,#ded6cc) 86%, var(--dsh-appearance-light-foreground,#ded6cc) 14%);--claude-code-accent-hover:color-mix(in srgb, var(--dsh-appearance-light-accent,#c9694d) 88%, var(--dsh-appearance-light-foreground,#c9694d) 12%);--claude-code-raised-surface:color-mix(in srgb, var(--dsh-appearance-light-canvas,#f9f7f3) 78%, var(--dsh-appearance-light-surface,#f9f7f3) 22%);--claude-code-titlebar-surface:var(--dsh-appearance-light-canvas,#f5f3ee);--claude-code-code-surface:var(--dsh-appearance-light-surface,#f1eee8);--claude-code-accent-hover-soft:color-mix(in srgb, var(--dsh-appearance-light-accent,#da7756) 14%, transparent 86%);--claude-code-accent-hover-solid:color-mix(in srgb, var(--dsh-appearance-light-accent,#da7756) 22%, transparent 78%);--claude-code-accent-dimmed:color-mix(in srgb, var(--dsh-appearance-light-accent,#da7756) 22%, transparent 78%);--claude-code-selection:color-mix(in srgb, var(--dsh-appearance-light-accent,#da7756) 32%, transparent 68%);--dsw-font-family:var(--claude-code-ui-font);--ds-font-family-code:var(--claude-code-mono-font);--dsw-alias-brand-primary:var(--claude-code-accent);--dsw-alias-brand-primary-invert:var(--claude-code-brand-invert);--dsw-alias-brand-primary-new-colorprimary-new-color:var(--claude-code-accent);--dsw-alias-brand-text:var(--claude-code-brand-text);--dsw-alias-state-success-primary:#00c853;--dsw-alias-state-error-primary:#ff5f38;--dsw-alias-state-warn-primary:var(--claude-code-warning);--dsw-alias-bg-base:var(--claude-code-canvas);--dsw-alias-bg-layer-1:var(--claude-code-surface);--dsw-alias-bg-layer-2:var(--claude-code-layer-2);--dsw-alias-bg-layer-3:var(--claude-code-layer-3);--dsw-alias-label-primary:var(--claude-code-foreground);--dsw-alias-label-primary-foreground:var(--claude-code-foreground);--dsw-alias-label-primary-bluish:var(--claude-code-foreground);--dsw-alias-label-primary-dimmed:var(--claude-code-label-primary-dimmed);--dsw-alias-label-primary-inverted:var(--claude-code-canvas);--dsw-alias-label-dimmed:var(--claude-code-label-dimmed);--dsw-alias-label-caption:var(--claude-code-label-caption);--dsw-alias-border-l1:var(--claude-code-border-l1);--dsw-alias-border-l2:var(--claude-code-border-l2);--dsw-alias-border-l3:var(--claude-code-border-l3);--dsw-alias-border-l4:var(--claude-code-border-l4);--dsw-alias-border-inverted:var(--claude-code-foreground);--dsw-alias-border-inverted2:var(--claude-code-foreground);--dsw-alias-interactive-bg-hover:var(--claude-code-interactive-hover);--dsw-alias-interactive-bg-active:var(--claude-code-interactive-active);--dsw-alias-interactive-bg-hover-accent:var(--claude-code-accent-hover-soft);--dsw-alias-interactive-bg-hover-solid:var(--claude-code-accent-hover-solid);--dsw-alias-button-primary-fill:var(--claude-code-accent);--dsw-alias-button-primary-hover:var(--claude-code-accent-hover);--dsw-alias-button-primary-dimmed:var(--claude-code-accent-dimmed);--dsw-alias-button-elevated-fill:var(--claude-code-raised-surface);--dsw-alias-button-floating-fill:var(--claude-code-raised-surface);--dsw-alias-button-tool-bar-fill:var(--claude-code-canvas);--dsw-alias-button-contrast-fill:var(--claude-code-foreground);color:var(--claude-code-foreground);background-color:var(--claude-code-canvas);box-sizing:border-box;padding-top:32px}body[data-dsh-claude-code][data-ds-dark-theme]{--claude-code-accent:var(--dsh-appearance-dark-accent,#da7756);--claude-code-canvas:var(--dsh-appearance-dark-canvas,#1d1b16);--claude-code-surface:var(--dsh-appearance-dark-surface,#262119);--claude-code-foreground:var(--dsh-appearance-dark-foreground,#f5f3ee);--claude-code-brand-invert:var(--dsh-appearance-dark-canvas,#1d1b16);--claude-code-brand-text:color-mix(in srgb, var(--dsh-appearance-dark-accent,#e89c81) 78%, var(--dsh-appearance-dark-foreground,#e89c81) 22%);--claude-code-warning:color-mix(in srgb, var(--dsh-appearance-dark-accent,#d99a7e) 78%, var(--dsh-appearance-dark-foreground,#d99a7e) 22%);--claude-code-layer-2:color-mix(in srgb, var(--dsh-appearance-dark-surface,#2e2820) 94%, var(--dsh-appearance-dark-foreground,#2e2820) 6%);--claude-code-layer-3:color-mix(in srgb, var(--dsh-appearance-dark-surface,#353028) 90%, var(--dsh-appearance-dark-foreground,#353028) 10%);--claude-code-label-primary-dimmed:color-mix(in srgb, var(--dsh-appearance-dark-foreground,#d6cfc4) 84%, var(--dsh-appearance-dark-canvas,#d6cfc4) 16%);--claude-code-label-dimmed:color-mix(in srgb, var(--dsh-appearance-dark-foreground,#b8b0a4) 70%, var(--dsh-appearance-dark-canvas,#b8b0a4) 30%);--claude-code-label-caption:color-mix(in srgb, var(--dsh-appearance-dark-foreground,#8a8277) 48%, var(--dsh-appearance-dark-canvas,#8a8277) 52%);--claude-code-border-l1:color-mix(in srgb, var(--dsh-appearance-dark-surface,#4a4236) 82%, var(--dsh-appearance-dark-foreground,#4a4236) 18%);--claude-code-border-l2:color-mix(in srgb, var(--dsh-appearance-dark-surface,#57503f) 76%, var(--dsh-appearance-dark-foreground,#57503f) 24%);--claude-code-border-l3:color-mix(in srgb, var(--dsh-appearance-dark-surface,#6b6250) 68%, var(--dsh-appearance-dark-foreground,#6b6250) 32%);--claude-code-border-l4:color-mix(in srgb, var(--dsh-appearance-dark-surface,#7d7360) 60%, var(--dsh-appearance-dark-foreground,#7d7360) 40%);--claude-code-interactive-hover:color-mix(in srgb, var(--dsh-appearance-dark-surface,#353028) 90%, var(--dsh-appearance-dark-foreground,#353028) 10%);--claude-code-interactive-active:color-mix(in srgb, var(--dsh-appearance-dark-surface,#3f3a30) 84%, var(--dsh-appearance-dark-foreground,#3f3a30) 16%);--claude-code-accent-hover:color-mix(in srgb, var(--dsh-appearance-dark-accent,#e08a6a) 88%, var(--dsh-appearance-dark-foreground,#e08a6a) 12%);--claude-code-raised-surface:color-mix(in srgb, var(--dsh-appearance-dark-canvas,#2e2820) 62%, var(--dsh-appearance-dark-surface,#2e2820) 38%);--claude-code-titlebar-surface:var(--dsh-appearance-dark-surface,#262119);--claude-code-code-surface:color-mix(in srgb, var(--dsh-appearance-dark-canvas,#171510) 88%, var(--dsh-appearance-dark-surface,#171510) 12%);--claude-code-scrollbar-thumb:color-mix(in srgb, var(--dsh-appearance-dark-surface,#4a4236) 78%, var(--dsh-appearance-dark-foreground,#4a4236) 22%);--claude-code-scrollbar-thumb-hover:color-mix(in srgb, var(--dsh-appearance-dark-surface,#6b6250) 66%, var(--dsh-appearance-dark-foreground,#6b6250) 34%);--claude-code-accent-hover-soft:color-mix(in srgb, var(--dsh-appearance-dark-accent,#da7756) 18%, transparent 82%);--claude-code-accent-hover-solid:color-mix(in srgb, var(--dsh-appearance-dark-accent,#da7756) 28%, transparent 72%);--claude-code-accent-dimmed:color-mix(in srgb, var(--dsh-appearance-dark-accent,#da7756) 26%, transparent 74%);--claude-code-selection:color-mix(in srgb, var(--dsh-appearance-dark-accent,#da7756) 32%, transparent 68%);--dsw-alias-state-success-primary:#3ddc72;--dsw-alias-state-error-primary:#ff7a55;--dsw-alias-state-warn-primary:var(--claude-code-warning)}body[data-dsh-claude-code] .oGn7bW_titlebar{z-index:1000;background:var(--claude-code-titlebar-surface);border-bottom:1px solid var(--claude-code-border-l1);height:32px;color:var(--claude-code-foreground);font-family:var(--claude-code-ui-font);align-items:center;gap:6px;padding:0 12px;font-size:12px;display:flex;position:fixed;top:0;left:0;right:0}body[data-dsh-claude-code] .oGn7bW_dot{border-radius:50%;flex:none;width:12px;height:12px}body[data-dsh-claude-code] .oGn7bW_dot-red{background:#ff5f56}body[data-dsh-claude-code] .oGn7bW_dot-yellow{background:#ffbd2e}body[data-dsh-claude-code] .oGn7bW_dot-green{background:#27c93f}body[data-dsh-claude-code] .oGn7bW_title{letter-spacing:.02em;margin-left:8px;font-weight:600}body[data-dsh-claude-code] pre,body[data-dsh-claude-code] code,body[data-dsh-claude-code] kbd{font-family:var(--claude-code-mono-font)}body[data-dsh-claude-code] pre{background:var(--claude-code-code-surface);border:1px solid var(--claude-code-border-l1);border-radius:6px}body[data-dsh-claude-code] ::selection{background:var(--claude-code-selection)}body[data-dsh-claude-code][data-ds-dark-theme] ::-webkit-scrollbar{width:10px;height:10px}body[data-dsh-claude-code][data-ds-dark-theme] ::-webkit-scrollbar-thumb{background:var(--claude-code-scrollbar-thumb);border-radius:5px}body[data-dsh-claude-code][data-ds-dark-theme] ::-webkit-scrollbar-thumb:hover{background:var(--claude-code-scrollbar-thumb-hover)}body[data-dsh-claude-code][data-ds-dark-theme] ::-webkit-scrollbar-track{background:var(--claude-code-canvas)}";
		const tagId = "@deepseek-ai/dsh-client-ui-skin-claude-code/claude-code.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-skin-claude-code";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var claude_code_module_css_default = {
			"dot": "oGn7bW_dot",
			"dot-green": "oGn7bW_dot-green",
			"dot-red": "oGn7bW_dot-red",
			"dot-yellow": "oGn7bW_dot-yellow",
			"title": "oGn7bW_title",
			"titlebar": "oGn7bW_titlebar"
		};
		//#endregion
		//#region src/client/index.ts
		/** The product title the skin pins (captured by the shell's DocumentTitle after settle). */
		const SKIN_TITLE = "Claude Code · DeepSeek 在线";
		/** Resolve one module class name (fallback only satisfies the indexed-access type). */
		const cls = (name) => claude_code_module_css_default[name] ?? "";
		/** macOS-style terminal window dots, in order. */
		const WINDOW_DOTS = [
			"red",
			"yellow",
			"green"
		];
		/**
		* Apply the Claude Code terminal skin: body attribute, title bar, title.
		* All writes are retracted by the effect disposer on dispose.
		* @param ctx - owning context (the effect lifecycle owns retraction).
		*/
		function apply(ctx) {
			const body = document.body;
			const originalTitle = document.title;
			body.setAttribute("data-dsh-claude-code", "");
			const titlebar = document.createElement("div");
			titlebar.className = cls("titlebar");
			titlebar.dataset.skinChrome = "titlebar";
			for (const color of WINDOW_DOTS) {
				const dot = document.createElement("span");
				dot.className = cls("dot") + " " + cls("dot-" + color);
				dot.dataset.skinChrome = "dot-" + color;
				titlebar.append(dot);
			}
			const title = document.createElement("span");
			title.className = cls("title");
			title.textContent = SKIN_TITLE;
			title.dataset.skinChrome = "title";
			titlebar.append(title);
			body.append(titlebar);
			document.title = SKIN_TITLE;
			ctx.effect(() => () => {
				body.removeAttribute("data-dsh-claude-code");
				titlebar.remove();
				if (document.title === SKIN_TITLE) document.title = originalTitle;
			}, "ui-skin-claude-code: Claude Code chrome");
		}
		//#endregion
		exports.apply = apply;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map