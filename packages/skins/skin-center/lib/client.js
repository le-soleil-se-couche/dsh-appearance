window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-skin-center",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/appearance-config.ts
		/**
		* Portable, versioned appearance configuration.
		*
		* This module is deliberately browser-free: parsing, validation and
		* serialization can be tested without DOM or storage. The JSON shape is a
		* public interchange contract, so every object is exact and every value is
		* normalized before it crosses the boundary.
		*/
		/** Stable format discriminator written into copied/imported JSON. */
		const APPEARANCE_FORMAT = "dsh-claude-code-appearance";
		/** Current interchange schema version. Future versions fail closed. */
		const APPEARANCE_VERSION = 2;
		/** Stable local-first persistence key. */
		const APPEARANCE_STORAGE_KEY = "dsh-claude-code-appearance";
		/** Local clipboard/paste envelope. This does not claim Codex interoperability. */
		const APPEARANCE_TRANSPORT_PREFIX = "dsh-theme-v1:";
		/** Typed fail-closed parser error. */
		var AppearanceConfigError = class extends Error {
			code;
			constructor(code, message) {
				super(message);
				this.code = code;
				this.name = "AppearanceConfigError";
			}
		};
		/** Warm, legible defaults used when no valid local document exists. */
		const DEFAULT_APPEARANCE_CONFIG = Object.freeze({
			format: APPEARANCE_FORMAT,
			version: 2,
			colors: Object.freeze({
				light: Object.freeze({
					accent: "#da7756",
					canvas: "#f5f3ee",
					surface: "#f1eee8",
					foreground: "#1d1b16"
				}),
				dark: Object.freeze({
					accent: "#da7756",
					canvas: "#1d1b16",
					surface: "#262119",
					foreground: "#f5f3ee"
				})
			}),
			fonts: Object.freeze({
				ui: "思源宋体 VF",
				code: "SF Mono"
			})
		});
		const HEX_COLOR = /^#[0-9a-f]{6}$/i;
		const FONT_FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} ._+\-]{0,79}$/u;
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/** Require exactly the declared keys; additions need a schema version bump. */
		function assertExactKeys(value, keys, path) {
			if (!isRecord(value)) throw new AppearanceConfigError("invalid-shape", `${path} must be an object`);
			const actual = Object.keys(value).sort();
			const expected = [...keys].sort();
			if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new AppearanceConfigError("invalid-shape", `${path} has unexpected or missing fields`);
		}
		function normalizeColor(value, path) {
			if (typeof value !== "string" || !HEX_COLOR.test(value)) throw new AppearanceConfigError("invalid-color", `${path} must be a six-digit hex color`);
			return value.toLowerCase();
		}
		function normalizeFont(value, path) {
			if (typeof value !== "string") throw new AppearanceConfigError("invalid-font", `${path} must be a font family name`);
			const normalized = value.trim().replace(/\s+/g, " ");
			if (!FONT_FAMILY.test(normalized)) throw new AppearanceConfigError("invalid-font", `${path} contains unsupported characters or is too long`);
			return normalized;
		}
		function channel(hex, offset) {
			return Number.parseInt(hex.slice(offset, offset + 2), 16);
		}
		function toHex(value) {
			return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
		}
		/**
		* Derive a warm raised surface from background and foreground only.
		* Light canvases move slightly toward foreground with a cooler depth bias;
		* dark canvases use a warmer red-weighted lift. The established Claude Code
		* defaults therefore resolve exactly to #f1eee8 and #262119.
		*/
		function deriveAppearanceSurface(canvasValue, foregroundValue) {
			const canvas = normalizeColor(canvasValue, "canvas");
			const foreground = normalizeColor(foregroundValue, "foreground");
			const backgroundChannels = [
				channel(canvas, 1),
				channel(canvas, 3),
				channel(canvas, 5)
			];
			const foregroundChannels = [
				channel(foreground, 1),
				channel(foreground, 3),
				channel(foreground, 5)
			];
			const weights = backgroundChannels.reduce((sum, value) => sum + value, 0) >= foregroundChannels.reduce((sum, value) => sum + value, 0) ? [
				.02,
				.025,
				.03
			] : [
				.04,
				.03,
				.015
			];
			return `#${backgroundChannels.map((value, index) => toHex(value + (foregroundChannels[index] - value) * weights[index])).join("")}`;
		}
		function normalizePalette(value, path) {
			assertExactKeys(value, [
				"accent",
				"canvas",
				"surface",
				"foreground"
			], path);
			const accent = normalizeColor(value.accent, `${path}.accent`);
			const canvas = normalizeColor(value.canvas, `${path}.canvas`);
			const foreground = normalizeColor(value.foreground, `${path}.foreground`);
			const surface = normalizeColor(value.surface, `${path}.surface`);
			const expectedSurface = deriveAppearanceSurface(canvas, foreground);
			if (surface !== expectedSurface) throw new AppearanceConfigError("invalid-color", `${path}.surface must be ${expectedSurface}, derived from canvas and foreground`);
			return {
				accent,
				canvas,
				surface,
				foreground
			};
		}
		/**
		* Normalize the early version 2 palette where surface was independently
		* editable. Its field set is otherwise identical to the current contract.
		*/
		function migrateLegacyPalette(value, path) {
			assertExactKeys(value, [
				"accent",
				"canvas",
				"surface",
				"foreground"
			], path);
			const accent = normalizeColor(value.accent, `${path}.accent`);
			const canvas = normalizeColor(value.canvas, `${path}.canvas`);
			const foreground = normalizeColor(value.foreground, `${path}.foreground`);
			const legacySurface = normalizeColor(value.surface, `${path}.surface`);
			const surface = deriveAppearanceSurface(canvas, foreground);
			return {
				palette: {
					accent,
					canvas,
					surface,
					foreground
				},
				changed: legacySurface !== surface
			};
		}
		/**
		* Validate and normalize an already-decoded candidate.
		* @param value - untrusted decoded JSON value.
		* @returns a fresh canonical version 2 config.
		*/
		function normalizeAppearanceConfig(value) {
			if (!isRecord(value)) throw new AppearanceConfigError("invalid-shape", "appearance config must be an object");
			if (value.format !== "dsh-claude-code-appearance") throw new AppearanceConfigError("invalid-format", `format must be ${APPEARANCE_FORMAT}`);
			if (value.version !== 2) throw new AppearanceConfigError("unsupported-version", `version ${String(value.version)} is not supported; expected 2`);
			assertExactKeys(value, [
				"format",
				"version",
				"colors",
				"fonts"
			], "appearance config");
			assertExactKeys(value.colors, ["light", "dark"], "colors");
			assertExactKeys(value.fonts, ["ui", "code"], "fonts");
			return {
				format: APPEARANCE_FORMAT,
				version: 2,
				colors: {
					light: normalizePalette(value.colors.light, "colors.light"),
					dark: normalizePalette(value.colors.dark, "colors.dark")
				},
				fonts: {
					ui: normalizeFont(value.fonts.ui, "fonts.ui"),
					code: normalizeFont(value.fonts.code, "fonts.code")
				}
			};
		}
		/**
		* Migrate only the recognizable early version 2 persisted shape.
		*
		* That build wrote the same exact fields and version while allowing surface
		* to vary independently. Every legacy field is still validated; the sole
		* accepted drift is a valid surface that differs from today's deterministic
		* derivation. Unknown versions, fields, missing values and damaged values
		* return null, so callers can preserve their original storage verbatim.
		*/
		function migrateLegacyAppearanceConfig(value) {
			try {
				assertExactKeys(value, [
					"format",
					"version",
					"colors",
					"fonts"
				], "appearance config");
				if (value.format !== "dsh-claude-code-appearance" || value.version !== 2) return null;
				assertExactKeys(value.colors, ["light", "dark"], "colors");
				assertExactKeys(value.fonts, ["ui", "code"], "fonts");
				const light = migrateLegacyPalette(value.colors.light, "colors.light");
				const dark = migrateLegacyPalette(value.colors.dark, "colors.dark");
				if (!light.changed && !dark.changed) return null;
				return normalizeAppearanceConfig({
					format: APPEARANCE_FORMAT,
					version: 2,
					colors: {
						light: light.palette,
						dark: dark.palette
					},
					fonts: {
						ui: normalizeFont(value.fonts.ui, "fonts.ui"),
						code: normalizeFont(value.fonts.code, "fonts.code")
					}
				});
			} catch (error) {
				if (error instanceof AppearanceConfigError) return null;
				throw error;
			}
		}
		/** Decode local persistence, migrating only the recognized legacy document. */
		function parseStoredAppearanceConfig(text) {
			let decoded;
			try {
				decoded = JSON.parse(text);
			} catch {
				throw new AppearanceConfigError("invalid-json", "appearance config is not valid JSON");
			}
			try {
				return {
					config: normalizeAppearanceConfig(decoded),
					migrated: false
				};
			} catch (error) {
				if (!(error instanceof AppearanceConfigError)) throw error;
				const migrated = migrateLegacyAppearanceConfig(decoded);
				if (migrated === null) throw error;
				return {
					config: migrated,
					migrated: true
				};
			}
		}
		/** Parse untrusted JSON and fail closed on any schema or value mismatch. */
		function parseAppearanceConfig(text) {
			let decoded;
			try {
				decoded = JSON.parse(text);
			} catch {
				throw new AppearanceConfigError("invalid-json", "appearance config is not valid JSON");
			}
			return normalizeAppearanceConfig(decoded);
		}
		/** Serialize in stable field order with canonical two-space indentation. */
		function serializeAppearanceConfig(value) {
			return JSON.stringify(normalizeAppearanceConfig(value), null, 2);
		}
		/** Parse the local clipboard/paste envelope used by both page actions. */
		function parseAppearanceTransport(text) {
			const transport = text.trim();
			if (!transport.startsWith("dsh-theme-v1:")) throw new AppearanceConfigError("invalid-transport", `appearance transport must start with ${APPEARANCE_TRANSPORT_PREFIX}`);
			return parseAppearanceConfig(transport.slice(13));
		}
		/** Serialize the exact string Copy emits and Import accepts. */
		function serializeAppearanceTransport(value) {
			return `${APPEARANCE_TRANSPORT_PREFIX}${JSON.stringify(normalizeAppearanceConfig(value))}`;
		}
		/**
		* Atomically validate one editable color and re-derive the hidden surface.
		* The input config is never mutated.
		*/
		function updateAppearanceColor(value, mode, role, colorValue) {
			const current = normalizeAppearanceConfig(value);
			const color = normalizeColor(colorValue, `colors.${mode}.${role}`);
			const palette = {
				...current.colors[mode],
				[role]: color
			};
			palette.surface = deriveAppearanceSurface(palette.canvas, palette.foreground);
			return normalizeAppearanceConfig({
				...current,
				colors: {
					...current.colors,
					[mode]: palette
				}
			});
		}
		//#endregion
		//#region src/client/appearance-runtime.ts
		/** DOM and localStorage lifecycle for the appearance configuration. */
		/** The only body CSS variables this plugin is allowed to write. */
		const APPEARANCE_BODY_VARIABLES = [
			"--dsh-appearance-ui-font",
			"--dsh-appearance-code-font",
			"--dsh-appearance-light-accent",
			"--dsh-appearance-light-canvas",
			"--dsh-appearance-light-surface",
			"--dsh-appearance-light-foreground",
			"--dsh-appearance-dark-accent",
			"--dsh-appearance-dark-canvas",
			"--dsh-appearance-dark-surface",
			"--dsh-appearance-dark-foreground"
		];
		function cloneDefault() {
			return normalizeAppearanceConfig(DEFAULT_APPEARANCE_CONFIG);
		}
		/**
		* Own the private body variables and local persistence as one reversible unit.
		* Invalid imports are parsed before storage, state or DOM is touched.
		*/
		var AppearanceRuntime = class {
			body;
			storage;
			config;
			previous = /* @__PURE__ */ new Map();
			disposed = false;
			initialIssue;
			constructor(body, storage) {
				this.body = body;
				this.storage = storage;
				for (const variable of APPEARANCE_BODY_VARIABLES) {
					const value = body.style.getPropertyValue(variable);
					this.previous.set(variable, {
						value: value === "" ? null : value,
						priority: body.style.getPropertyPriority(variable)
					});
				}
				let config = cloneDefault();
				let issue = null;
				try {
					const stored = storage.getItem(APPEARANCE_STORAGE_KEY);
					if (stored !== null) try {
						const loaded = parseStoredAppearanceConfig(stored);
						config = loaded.config;
						if (loaded.migrated) storage.setItem(APPEARANCE_STORAGE_KEY, serializeAppearanceConfig(config));
					} catch (error) {
						if (!(error instanceof AppearanceConfigError)) throw error;
						issue = "invalid-stored-config";
					}
				} catch {
					issue = "storage-unavailable";
				}
				this.config = config;
				this.initialIssue = issue;
				this.applyVariables(config);
			}
			/** Current immutable-by-convention config snapshot. */
			getConfig() {
				return this.config;
			}
			/** Validate, persist canonically, then publish to state and the live body. */
			update(value) {
				this.assertLive();
				const config = normalizeAppearanceConfig(value);
				const canonical = serializeAppearanceConfig(config);
				this.storage.setItem(APPEARANCE_STORAGE_KEY, canonical);
				this.config = config;
				this.applyVariables(config);
				return config;
			}
			/** Parse first, so rejected imports leave storage, state and DOM untouched. */
			import(text) {
				this.assertLive();
				const config = parseAppearanceTransport(text);
				return this.update(config);
			}
			/** Re-assert the current variables after a skin try-on restores body style. */
			reapply() {
				if (!this.disposed) this.applyVariables(this.config);
			}
			/** Restore every exact pre-plugin inline value. Skin attributes are never owned here. */
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				for (const variable of APPEARANCE_BODY_VARIABLES) {
					const previous = this.previous.get(variable);
					if (previous?.value === null || previous === void 0) this.body.style.removeProperty(variable);
					else this.body.style.setProperty(variable, previous.value, previous.priority);
				}
			}
			assertLive() {
				if (this.disposed) throw new Error("appearance runtime is disposed");
			}
			applyVariables(config) {
				const values = {
					"--dsh-appearance-ui-font": config.fonts.ui,
					"--dsh-appearance-code-font": config.fonts.code,
					"--dsh-appearance-light-accent": config.colors.light.accent,
					"--dsh-appearance-light-canvas": config.colors.light.canvas,
					"--dsh-appearance-light-surface": config.colors.light.surface,
					"--dsh-appearance-light-foreground": config.colors.light.foreground,
					"--dsh-appearance-dark-accent": config.colors.dark.accent,
					"--dsh-appearance-dark-canvas": config.colors.dark.canvas,
					"--dsh-appearance-dark-surface": config.colors.dark.surface,
					"--dsh-appearance-dark-foreground": config.colors.dark.foreground
				};
				for (const variable of APPEARANCE_BODY_VARIABLES) this.body.style.setProperty(variable, values[variable]);
			}
		};
		//#endregion
		//#region src/client/local-fonts.ts
		/** Dedupe families case-insensitively and sort them for the active locale. */
		function normalizeLocalFontFamilies(records) {
			const families = /* @__PURE__ */ new Map();
			for (const record of records) {
				if (typeof record.family !== "string") continue;
				const family = record.family.trim().replace(/\s+/g, " ");
				if (family === "") continue;
				const key = family.toLocaleLowerCase();
				if (!families.has(key)) families.set(key, family);
			}
			return [...families.values()].sort((left, right) => left.localeCompare(right, void 0, {
				sensitivity: "base",
				numeric: true
			}));
		}
		/** Resolve the browser API without calling it; permission stays gesture-gated. */
		function browserLocalFontQuery() {
			if (typeof window === "undefined") return void 0;
			const query = window.queryLocalFonts;
			if (typeof query !== "function") return void 0;
			return () => query.call(window);
		}
		/** Same-origin host fallback used when browser Local Font Access is empty or unavailable. */
		function hostLocalFontQuery() {
			if (typeof window === "undefined" || typeof window.fetch !== "function") return void 0;
			return async () => {
				const response = await window.fetch("/api/skin-center/fonts", {
					method: "GET",
					headers: { accept: "application/json" }
				});
				const payload = await response.json().catch(() => null);
				if (!response.ok || payload?.ok !== true || !Array.isArray(payload.families)) throw new Error(`local font endpoint failed with HTTP ${response.status}`);
				return payload.families.map((family) => ({ family }));
			};
		}
		function denied(error) {
			if (typeof error !== "object" || error === null || !("name" in error)) return false;
			const name = error.name;
			return name === "NotAllowedError" || name === "SecurityError";
		}
		/**
		* Enumerate through an injectable query. Undefined means unsupported; browser
		* permission rejection is kept distinct from other runtime failures.
		*/
		async function enumerateLocalFonts(query = browserLocalFontQuery(), fallback = hostLocalFontQuery()) {
			let failure = query === void 0 ? "unsupported" : "error";
			if (query !== void 0) try {
				const families = normalizeLocalFontFamilies(await query());
				if (families.length > 0) return {
					status: "loaded",
					families
				};
			} catch (error) {
				failure = denied(error) ? "denied" : "error";
			}
			if (fallback !== void 0) try {
				const families = normalizeLocalFontFamilies(await fallback());
				if (families.length > 0) return {
					status: "loaded",
					families
				};
			} catch {}
			return {
				status: failure,
				families: []
			};
		}
		//#endregion
		//#region src/client/modal-keyboard.ts
		/** Keyboard containment for a Modal nested inside the host Settings dialog. */
		const FOCUSABLE_SELECTOR = [
			"button:not([disabled])",
			"input:not([disabled])",
			"textarea:not([disabled])",
			"select:not([disabled])",
			"[tabindex]:not([tabindex=\"-1\"])"
		].join(",");
		/**
		* Keep Escape from closing both nested dialogs and cycle Tab within the top one.
		* The host Modal atom owns visuals; this helper only closes its interaction gap.
		*/
		function handleNestedDialogKeyDown(event, dialog, close) {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopImmediatePropagation();
				close();
				return;
			}
			if (event.key !== "Tab" || dialog === null) return;
			const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
			if (focusable.length === 0) {
				event.preventDefault();
				dialog.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement;
			if (event.shiftKey && (active === first || !dialog.contains(active))) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
				event.preventDefault();
				first.focus();
			}
		}
		//#endregion
		//#region src/client/generated/skins.ts
		/** Every skin, ordered by packages/skins/<name>/skin.json `order`. */
		const SKIN_CENTER_ENTRIES = [{
			"id": "claude-code",
			"name": "Claude Code",
			"nameEn": "Claude Code Terminal",
			"author": "le-soleil-se-couche",
			"tagline": "暖陶土橙 · 奶油纸面 · 思源宋体 + SF Mono",
			"description": "Codex 暖光配色版 Claude Code 皮肤：陶土橙强调 #DA7756、奶油纸面 #F5F3EE、暖黑正文 #1D1B16，UI 用思源宋体 VF、代码用 SF Mono，配终端窗口式标题栏（红黄绿三圆点）。",
			"tags": [
				"claude-code",
				"codex",
				"warm",
				"light",
				"terracotta",
				"serif"
			],
			"accent": "#DA7756",
			"bodyAttr": "data-dsh-claude-code",
			"package": "@deepseek-ai/dsh-client-ui-skin-claude-code",
			"order": 9
		}];
		//#endregion
		//#region src/client/try-on.ts
		/**
		* Try-on engine for the in-GUI skin center.
		*
		* A skin's client bundle is executed through the REAL module system, not a
		* shim and not eval: the host route `/api/skin-center/bundle/<id>` serves
		* the skin's prebuilt `lib/client.js` as a same-origin script (mirroring
		* the kernel's own defaultLoadBundle — see dsh-client-modules), and its
		* body calls `window.__ModuleLoader__.load({id, factory})`, which only
		* REGISTERS the factory. `window.__DSH_MODULES__.import(package)` (the
		* kernel's ClientModuleSystem, contract C5/C6) then materializes it — which
		* auto-injects the skin's CSS `<style data-plugin>` tag — and
		* `surface.apply(miniCtx)` mounts the skin exactly as the fiber system
		* would, returning a full disposer. That makes try-on and its teardown the
		* real code paths, with no CSP `unsafe-eval` dependence and no startup
		* cost: the ~700KB of embedded art base64 is only parsed when a skin is
		* actually tried on.
		*
		* Mutual exclusion: the GUI never hosts two skins at once. The currently
		* ACTIVE skin is owned by its own cordis fiber (its disposer is not
		* reachable), so try-on retracts the active skin's visual writes by recipe:
		* remove its body attribute (its stylesheet goes inert), clear the
		* body-level backdrop inline styles (blue-fantasy's whale art), detach only
		* known skin chrome body children (title/status bars marked `data-skin-chrome`
		* or carrying the skin's body attribute, leaving other plugins' portals and
		* toasts in place), and neutralize known global-rule leaks (xp's sidebar
		* taskbar/start). Everything is snapshotted and restored on exit in original
		* order. The active skin's own fiber is never touched, so exiting try-on
		* returns the page to exactly the pre-try-on state.
		*
		* A ghost MutationObserver may survive retraction (blue-fantasy re-writes
		* its backdrop on theme flips), so during try-on a neutralizing observer
		* re-clears the backdrop props whenever `data-ds-dark-theme` changes.
		*/
		/** Body-level backdrop properties skins may write inline (blue-fantasy). */
		const BACKDROP_PROPS = [
			"background-image",
			"background-position",
			"background-size",
			"background-attachment",
			"background-repeat"
		];
		/**
		* Per-skin neutralization CSS: rules that hide visual leaks whose styles
		* are NOT scoped under the skin's body attribute (they live on app elements
		* the skin touches, so detaching chrome cannot remove them). Matched by
		* css-module class substring, which is stable across rebuilds.
		*/
		const NEUTRALIZE_CSS = { xp: [`[data-pane='sidebar'] [class*='xpTaskbar']{background:transparent!important;border-top:none!important;box-shadow:none!important}`, `[data-pane='sidebar'] [class*='xpStart']{display:none!important}`].join("") };
		/** Host base path of the skin bundle route (registered by src/routes.ts). */
		const BUNDLE_ROUTE = "/api/skin-center/bundle";
		/**
		* Execute one skin's client bundle as a real same-origin script, mirroring
		* the kernel's own defaultLoadBundle (dsh-client-modules): the script body
		* calls `window.__ModuleLoader__.load({id, factory})`, which only registers
		* the factory — materialization is the caller's separate `import` step. No
		* eval: try-on works under any CSP that allows same-origin scripts (the
		* shell itself loads plugin bundles this way), and a failed fetch rejects
		* so the caller can restore the active skin instead of leaving it retracted.
		* @param url - same-origin bundle URL.
		* @returns a promise resolving once the script executed.
		*/
		function loadBundleScript(url) {
			return new Promise((resolve, reject) => {
				const el = document.createElement("script");
				el.async = true;
				el.src = url;
				el.addEventListener("load", () => {
					el.remove();
					resolve();
				}, { once: true });
				el.addEventListener("error", () => {
					el.remove();
					reject(/* @__PURE__ */ new Error(`skin-center: bundle script ${url} failed to load`));
				}, { once: true });
				document.head.append(el);
			});
		}
		/** Read the page's composed boot-graph entry ids (only enabled plugins appear). */
		function bootEntryIds() {
			return window.__DSH_BOOT__?.entries?.map((entry) => entry.id) ?? [];
		}
		/** The skin package currently ACTIVE in the boot graph, if it is one of ours. */
		function activeSkinEntry() {
			const ids = new Set(bootEntryIds());
			return SKIN_CENTER_ENTRIES.find((entry) => ids.has(entry.package));
		}
		/**
		* Whether a direct body child is skin chrome owned by `skin`: marked with the
		* `data-skin-chrome` marker (minecraft/dragon-heir) or carrying the skin's
		* scoping body attribute. Everything else — other plugins' portals, toasts and
		* overlays appended to body — is left alone.
		*/
		function isSkinChrome(el, skin) {
			if (el.hasAttribute("data-skin-chrome")) return true;
			return skin !== null && el.hasAttribute(skin.bodyAttr);
		}
		function miniCtx() {
			const disposers = [];
			return {
				effect(callback) {
					disposers.push(callback());
					return () => {};
				},
				get() {},
				__disposeAll() {
					for (const dispose of disposers.reverse()) dispose();
				}
			};
		}
		/**
		* One live try-on session: owns the tried-on skin's disposer plus the
		* captured active-skin visuals, and restores everything on exit.
		*/
		var TryOnController = class {
			session = null;
			/**
			* Generation counter. A newer try-on or exit increments it, so an in-flight
			* `tryOn` (awaiting the real bundle load) can detect it was superseded and
			* drop only what it mounted instead of clobbering the newer session.
			*/
			epoch = 0;
			/**
			* Loads one skin's client bundle so its factory registers on the page's
			* `__ModuleLoader__`. Defaults to a same-origin script tag from the host
			* route `/api/skin-center/bundle/<id>`; tests inject a stub.
			*/
			loadBundle;
			/** Re-assert plugin-owned appearance values after restoring a body snapshot. */
			afterRestore;
			constructor(options = {}) {
				this.loadBundle = options.loadBundle ?? ((entry) => loadBundleScript(`${BUNDLE_ROUTE}/${encodeURIComponent(entry.id)}`));
				this.afterRestore = options.afterRestore ?? (() => {});
			}
			/** The skin currently being tried on, if any. */
			get trying() {
				return this.session?.entry ?? null;
			}
			/** Whether the official stock look (no skin) is being tried on. */
			get tryingOfficial() {
				return this.session !== null && this.session.entry === null;
			}
			/** Start trying on `entry` (replaces any live session). */
			async tryOn(entry) {
				if (entry.package === activeSkinEntry()?.package) return;
				this.exit();
				const epoch = ++this.epoch;
				const active = this.captureAndRetractActive();
				let dispose;
				try {
					dispose = await this.loadAndApply(entry);
				} catch (error) {
					if (epoch === this.epoch) this.restoreActive(active);
					throw error;
				}
				if (epoch !== this.epoch) {
					this.cleanupModule(entry);
					dispose();
					return;
				}
				this.session = {
					entry,
					dispose,
					active
				};
			}
			/**
			* Try on the official stock look: retract the active skin's visual writes
			* (same recipe as a skin try-on) and mount nothing. Exiting restores the
			* active skin exactly like any other try-on session.
			*/
			tryOnOfficial() {
				if (activeSkinEntry() === null) return;
				this.exit();
				this.epoch += 1;
				const active = this.captureAndRetractActive();
				this.session = {
					entry: null,
					dispose: () => {},
					active
				};
			}
			/** Exit the live session: dispose the tried-on skin, then restore the active skin. */
			exit() {
				const session = this.session;
				if (session === null) return;
				this.epoch += 1;
				this.session = null;
				session.dispose();
				if (session.entry !== null) this.cleanupModule(session.entry);
				this.restoreActive(session.active);
			}
			/** Execute + materialize + mount the target skin through the real loader. */
			async loadAndApply(entry) {
				const modules = window.__DSH_MODULES__;
				if (modules === void 0) throw new Error("skin-center: window.__DSH_MODULES__ missing");
				modules.invalidate(entry.package);
				await this.loadBundle(entry);
				const apply = (await modules.import(entry.package)).apply;
				if (typeof apply !== "function") throw new Error(`skin-center: "${entry.package}" client bundle exports no apply`);
				const ctx = miniCtx();
				try {
					apply(ctx);
				} catch (error) {
					this.cleanupModule(entry);
					document.body.removeAttribute(entry.bodyAttr);
					for (const el of [...document.body.children]) if (isSkinChrome(el, entry)) el.remove();
					throw error;
				}
				return ctx.__disposeAll;
			}
			/** Drop the tried-on module record + its injected style tag. */
			cleanupModule(entry) {
				window.__DSH_MODULES__?.invalidate(entry.package);
				for (const el of document.querySelectorAll(`style[data-plugin=${JSON.stringify(entry.package)}]`)) el.remove();
			}
			/**
			* Snapshot the active skin's visual writes and retract them so the tried-on
			* skin can take over the whole surface.
			*/
			captureAndRetractActive() {
				const skin = activeSkinEntry() ?? null;
				const body = document.body;
				const bodyAttr = skin === null ? null : body.getAttribute(skin.bodyAttr);
				if (skin !== null && bodyAttr !== null) body.removeAttribute(skin.bodyAttr);
				const bodyStyle = body.getAttribute("style");
				for (const prop of BACKDROP_PROPS) body.style.removeProperty(prop);
				const children = [...body.children];
				const chrome = /* @__PURE__ */ new Set();
				for (const el of children) if (el.id !== "root" && isSkinChrome(el, skin)) chrome.add(el);
				const detached = [];
				for (let i = 0; i < children.length; i++) {
					const el = children[i];
					if (!chrome.has(el)) continue;
					let anchor = null;
					for (let j = i + 1; j < children.length; j++) if (!chrome.has(children[j])) {
						anchor = children[j];
						break;
					}
					detached.push({
						el,
						anchor
					});
				}
				for (const { el } of detached) el.remove();
				const clearObserver = new MutationObserver(() => {
					for (const prop of BACKDROP_PROPS) body.style.removeProperty(prop);
				});
				clearObserver.observe(body, {
					attributes: true,
					attributeFilter: ["data-ds-dark-theme"]
				});
				const neutralizeCss = skin === null ? void 0 : NEUTRALIZE_CSS[skin.id];
				return {
					skin,
					bodyAttr,
					bodyStyle,
					detached,
					clearObserver,
					neutralizeStyle: neutralizeCss === void 0 ? null : this.injectStyle(neutralizeCss)
				};
			}
			/** Restore the active skin's captured visual state. */
			restoreActive(active) {
				const body = document.body;
				if (active.skin !== null && active.bodyAttr !== null) body.setAttribute(active.skin.bodyAttr, active.bodyAttr);
				if (active.bodyStyle !== null) body.setAttribute("style", active.bodyStyle);
				else body.removeAttribute("style");
				for (const { el, anchor } of active.detached) body.insertBefore(el, anchor !== null && anchor.parentNode === body ? anchor : null);
				active.clearObserver?.disconnect();
				active.neutralizeStyle?.remove();
				this.afterRestore();
			}
			injectStyle(css) {
				const tag = document.createElement("style");
				tag.dataset.skinCenterNeutralize = "";
				tag.textContent = css;
				document.head.append(tag);
				return tag;
			}
		};
		//#endregion
		//#region \0dsh-css:packages/skins/skin-center/src/client/skin-center.module.css.mjs
		const css = ".uZsSiW_page{box-sizing:border-box;width:min(100%,920px);color:var(--dsw-alias-label-primary);flex-direction:column;gap:18px;margin:0 auto;padding:4px 2px 28px;display:flex;container-type:inline-size}.uZsSiW_pageHeader{justify-content:space-between;align-items:flex-start;gap:18px;padding-bottom:4px;display:flex}.uZsSiW_titleGroup{min-width:0}.uZsSiW_pageTitle{letter-spacing:-.01em;margin:0;font-size:20px;font-weight:600;line-height:1.35}.uZsSiW_pageDescription{max-width:620px;color:var(--dsw-alias-label-secondary);margin:4px 0 0;font-size:13px;line-height:1.55}.uZsSiW_headerActions{flex:none;align-items:center;gap:8px;display:flex}.uZsSiW_noticeError,.uZsSiW_noticeSuccess{border:1px solid;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5}.uZsSiW_noticeError{color:var(--dsw-alias-state-error-primary,#b42318);border-color:color-mix(in srgb, currentColor 24%, transparent);background:var(--dsw-alias-state-error-tertiary,#b4231814)}.uZsSiW_noticeSuccess{color:var(--dsw-alias-state-success-primary,#14743e);border-color:color-mix(in srgb, currentColor 24%, transparent);background:var(--dsw-alias-state-success-tertiary,#14743e14)}.uZsSiW_sectionBlock,.uZsSiW_skinsBlock{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:14px}.uZsSiW_sectionBlock{flex-direction:column;gap:14px;padding:16px;display:flex}.uZsSiW_blockHeading h3{margin:0;font-size:14px;font-weight:600;line-height:1.4}.uZsSiW_blockHeading p{color:var(--dsw-alias-label-secondary);margin:3px 0 0;font-size:12px;line-height:1.5}.uZsSiW_themeGrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;display:grid}.uZsSiW_themeChoice{min-height:48px;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);cursor:pointer;background:0 0;border-radius:11px;justify-content:center;align-items:center;gap:8px;padding:10px 14px;transition:background .12s,border-color .12s,color .12s;display:flex}.uZsSiW_themeChoice:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-module-platform))}.uZsSiW_themeChoiceSelected{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-button-primary-dimmed)}.uZsSiW_themeChoice:focus-visible,.uZsSiW_skinsDisclosure:focus-visible,.uZsSiW_fontField input:focus-visible,.uZsSiW_fontField select:focus-visible,.uZsSiW_colorControl input:focus-visible,.uZsSiW_importField :is(input,textarea):focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.uZsSiW_paletteCard{border:1px solid var(--dsw-alias-border-l2);border-radius:11px;min-width:0;margin:0;padding:13px}.uZsSiW_paletteCard legend{padding:0 6px;font-size:12px;font-weight:600}.uZsSiW_colorGrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 14px;display:grid}.uZsSiW_colorField{min-width:0;color:var(--dsw-alias-label-secondary);flex-direction:column;gap:6px;font-size:11.5px;display:flex}.uZsSiW_colorControl{align-items:center;gap:8px;min-width:0;display:flex}.uZsSiW_colorControl input[type=color]{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-2);cursor:pointer;border-radius:8px;flex:none;width:34px;height:30px;padding:2px}.uZsSiW_colorText{box-sizing:border-box;width:100%;min-width:0;height:32px;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code,ui-monospace, monospace);border-radius:8px;padding:5px 8px;font-size:12px}.uZsSiW_colorText[aria-invalid=true]{border-color:var(--dsw-alias-state-error-primary,#b42318)}.uZsSiW_fieldError{color:var(--dsw-alias-state-error-primary,#b42318);font-size:10.5px;line-height:1.4}.uZsSiW_fontGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;display:grid}.uZsSiW_fontField{border:1px solid var(--dsw-alias-border-l2);border-radius:11px;flex-direction:column;gap:6px;min-width:0;padding:13px;display:flex}.uZsSiW_fontLabel{font-size:12px;font-weight:600}.uZsSiW_fontField input,.uZsSiW_fontField select{box-sizing:border-box;width:100%;min-height:36px;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:7px 10px;font-size:13px}.uZsSiW_fontField select{cursor:pointer}.uZsSiW_fontField input[aria-invalid=true]{border-color:var(--dsw-alias-state-error-primary,#b42318)}.uZsSiW_fallbackText,.uZsSiW_fontStatus{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.4}.uZsSiW_fontStatusWarning{color:var(--dsw-alias-state-warn-primary,#9a6700)}.uZsSiW_fontAccessStatus,.uZsSiW_fontAccessWarning{color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:9px 11px;font-size:11.5px;line-height:1.45}.uZsSiW_fontAccessWarning{color:var(--dsw-alias-state-warn-primary,#9a6700)}.uZsSiW_importModal{box-sizing:border-box;max-block-size:calc(100dvh - 2rem);max-inline-size:calc(100vw - 2rem);overflow:hidden}.uZsSiW_importModalContent{box-sizing:border-box;overflow-wrap:anywhere;overscroll-behavior:contain;scrollbar-gutter:stable;flex-direction:column;gap:10px;max-block-size:min(70dvh,42rem);inline-size:min(35rem,100%);min-inline-size:0;max-inline-size:100%;display:flex;overflow-y:auto;container:uZsSiW_import-modal/inline-size}.uZsSiW_importField{min-inline-size:0;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;flex-direction:column;gap:7px;font-size:12px;display:flex}.uZsSiW_importField :is(input,textarea){box-sizing:border-box;inline-size:100%;min-inline-size:0;max-inline-size:100%;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code,ui-monospace, monospace);border-radius:9px;padding:8px 11px;font-size:11.5px;line-height:1.5;display:block}.uZsSiW_importField input{min-block-size:2.625rem}.uZsSiW_importField textarea{resize:vertical;min-block-size:clamp(8rem,28dvh,14rem);max-block-size:min(45dvh,24rem)}.uZsSiW_importField :is(input,textarea)[aria-invalid=true]{border-color:var(--dsw-alias-state-error-primary,#b42318)}.uZsSiW_importModalContent+div{flex-wrap:wrap;min-inline-size:0;max-inline-size:100%}.uZsSiW_importModalContent+div>button{white-space:normal;min-inline-size:0;max-inline-size:100%}@container uZsSiW_import-modal (width<=28rem){.uZsSiW_importField textarea{min-block-size:clamp(7rem,24dvh,11rem)}}.uZsSiW_skinsBlock{overflow:hidden}.uZsSiW_skinsDisclosure{width:100%;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:0;justify-content:space-between;align-items:center;gap:14px;padding:14px 16px;transition:background .12s;display:flex}.uZsSiW_skinsDisclosure:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-module-platform))}.uZsSiW_skinsDisclosure>span{flex-direction:column;gap:3px;display:flex}.uZsSiW_skinsDisclosure strong{font-size:13px;font-weight:600}.uZsSiW_skinsDisclosure small{color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.4}.uZsSiW_disclosureIcon,.uZsSiW_disclosureIconOpen{flex:none;transition:transform .12s}.uZsSiW_disclosureIconOpen{transform:rotate(180deg)}.uZsSiW_skinsBody{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:12px;padding:14px 16px 16px;display:flex}.uZsSiW_skinGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;display:grid}.uZsSiW_skinCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;flex-direction:column;gap:8px;min-width:0;padding:12px;display:flex}.uZsSiW_skinCardTitleRow{align-items:center;gap:8px;min-width:0;display:flex}.uZsSiW_skinSwatch,.uZsSiW_skinSwatchOfficial{border:1px solid var(--dsw-alias-border-l3);border-radius:50%;flex:none;width:13px;height:13px}.uZsSiW_skinSwatchOfficial{background:var(--dsw-alias-label-caption)}.uZsSiW_skinName{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:12.5px;font-weight:600;overflow:hidden}.uZsSiW_badgeActive,.uZsSiW_badgeTrying{border-radius:999px;flex:none;margin-left:auto;padding:2px 7px;font-size:10.5px;font-weight:600}.uZsSiW_badgeActive{color:var(--dsw-alias-state-success-primary,#14743e);background:var(--dsw-alias-state-success-tertiary,#14743e1a)}.uZsSiW_badgeTrying{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-button-primary-dimmed)}.uZsSiW_skinTagline{color:var(--dsw-alias-label-secondary);flex:1;margin:0;font-size:11.5px;line-height:1.45}.uZsSiW_skinActions{flex-wrap:wrap;gap:7px;display:flex}@media (width<=700px){.uZsSiW_pageHeader{flex-direction:column}.uZsSiW_headerActions{align-self:stretch}}@media (width<=520px){.uZsSiW_page{gap:14px;padding-bottom:18px}.uZsSiW_pageHeader{gap:10px}.uZsSiW_headerActions>button{flex:1}.uZsSiW_themeGrid,.uZsSiW_colorGrid,.uZsSiW_fontGrid,.uZsSiW_skinGrid{grid-template-columns:1fr}.uZsSiW_importModalContent{min-width:0}.uZsSiW_sectionBlock,.uZsSiW_skinsDisclosure,.uZsSiW_skinsBody{padding-left:12px;padding-right:12px}}@container (width<=500px){.uZsSiW_pageHeader{flex-direction:column;gap:10px}.uZsSiW_headerActions{align-self:stretch}.uZsSiW_headerActions>button{flex:1}.uZsSiW_themeGrid,.uZsSiW_colorGrid,.uZsSiW_fontGrid,.uZsSiW_skinGrid{grid-template-columns:1fr}.uZsSiW_sectionBlock,.uZsSiW_skinsDisclosure,.uZsSiW_skinsBody{padding-left:12px;padding-right:12px}}@media (prefers-reduced-motion:reduce){.uZsSiW_themeChoice,.uZsSiW_skinsDisclosure,.uZsSiW_disclosureIcon,.uZsSiW_disclosureIconOpen{transition:none}}";
		const tagId = "@deepseek-ai/dsh-client-ui-skin-center/skin-center.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-skin-center";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var skin_center_module_css_default = {
			"badgeActive": "uZsSiW_badgeActive",
			"badgeTrying": "uZsSiW_badgeTrying",
			"blockHeading": "uZsSiW_blockHeading",
			"colorControl": "uZsSiW_colorControl",
			"colorField": "uZsSiW_colorField",
			"colorGrid": "uZsSiW_colorGrid",
			"colorText": "uZsSiW_colorText",
			"disclosureIcon": "uZsSiW_disclosureIcon",
			"disclosureIconOpen": "uZsSiW_disclosureIconOpen",
			"fallbackText": "uZsSiW_fallbackText",
			"fieldError": "uZsSiW_fieldError",
			"fontAccessStatus": "uZsSiW_fontAccessStatus",
			"fontAccessWarning": "uZsSiW_fontAccessWarning",
			"fontField": "uZsSiW_fontField",
			"fontGrid": "uZsSiW_fontGrid",
			"fontLabel": "uZsSiW_fontLabel",
			"fontStatus": "uZsSiW_fontStatus",
			"fontStatusWarning": "uZsSiW_fontStatusWarning",
			"headerActions": "uZsSiW_headerActions",
			"import-modal": "uZsSiW_import-modal",
			"importField": "uZsSiW_importField",
			"importModal": "uZsSiW_importModal",
			"importModalContent": "uZsSiW_importModalContent",
			"noticeError": "uZsSiW_noticeError",
			"noticeSuccess": "uZsSiW_noticeSuccess",
			"page": "uZsSiW_page",
			"pageDescription": "uZsSiW_pageDescription",
			"pageHeader": "uZsSiW_pageHeader",
			"pageTitle": "uZsSiW_pageTitle",
			"paletteCard": "uZsSiW_paletteCard",
			"sectionBlock": "uZsSiW_sectionBlock",
			"skinActions": "uZsSiW_skinActions",
			"skinCard": "uZsSiW_skinCard",
			"skinCardTitleRow": "uZsSiW_skinCardTitleRow",
			"skinGrid": "uZsSiW_skinGrid",
			"skinName": "uZsSiW_skinName",
			"skinSwatch": "uZsSiW_skinSwatch",
			"skinSwatchOfficial": "uZsSiW_skinSwatchOfficial",
			"skinTagline": "uZsSiW_skinTagline",
			"skinsBlock": "uZsSiW_skinsBlock",
			"skinsBody": "uZsSiW_skinsBody",
			"skinsDisclosure": "uZsSiW_skinsDisclosure",
			"themeChoice": "uZsSiW_themeChoice",
			"themeChoiceSelected": "uZsSiW_themeChoiceSelected",
			"themeGrid": "uZsSiW_themeGrid",
			"titleGroup": "uZsSiW_titleGroup"
		};
		//#endregion
		//#region src/client/SkinCenter.tsx
		/** First-class Appearance settings section for the DeepSeek Harness UI. */
		const OFFICIAL = "official";
		const THEME_OPTIONS = [
			{
				id: "system",
				label: "themeSystem",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconFollowsystemOutline16
			},
			{
				id: "light",
				label: "themeLight",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconLightOutline16
			},
			{
				id: "dark",
				label: "themeDark",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconDarkOutline16
			}
		];
		const COLOR_ROLES = [
			{
				role: "accent",
				label: "accent"
			},
			{
				role: "canvas",
				label: "background"
			},
			{
				role: "foreground",
				label: "foreground"
			}
		];
		function colorDrafts(config) {
			return {
				light: {
					accent: config.colors.light.accent,
					canvas: config.colors.light.canvas,
					foreground: config.colors.light.foreground
				},
				dark: {
					accent: config.colors.dark.accent,
					canvas: config.colors.dark.canvas,
					foreground: config.colors.dark.foreground
				}
			};
		}
		function emptyColorErrors() {
			return {
				light: {
					accent: false,
					canvas: false,
					foreground: false
				},
				dark: {
					accent: false,
					canvas: false,
					foreground: false
				}
			};
		}
		/** Render the complete Appearance page; host settings owns navigation/chrome. */
		function SkinCenter({ t, controller, appearance, theme }) {
			const themeSnapshot = (0, react.useSyncExternalStore)(theme.subscribe, theme.getTheme);
			const [config, setConfig] = (0, react.useState)(() => appearance.getConfig());
			const [colorDraftValues, setColorDraftValues] = (0, react.useState)(() => colorDrafts(appearance.getConfig()));
			const [colorErrors, setColorErrors] = (0, react.useState)(emptyColorErrors);
			const [fontDrafts, setFontDrafts] = (0, react.useState)(() => ({ ...appearance.getConfig().fonts }));
			const [fontErrors, setFontErrors] = (0, react.useState)({
				ui: false,
				code: false
			});
			const [fontList, setFontList] = (0, react.useState)({
				status: "idle",
				families: []
			});
			const [importOpen, setImportOpen] = (0, react.useState)(false);
			const [importText, setImportText] = (0, react.useState)("");
			const [importError, setImportError] = (0, react.useState)(null);
			const [otherSkinsOpen, setOtherSkinsOpen] = (0, react.useState)(false);
			const [tryingId, setTryingId] = (0, react.useState)(null);
			const [tryingOfficial, setTryingOfficial] = (0, react.useState)(false);
			const [applying, setApplying] = (0, react.useState)(null);
			const [skinError, setSkinError] = (0, react.useState)(null);
			const [notice, setNotice] = (0, react.useState)(() => {
				if (appearance.initialIssue === "invalid-stored-config") return {
					kind: "error",
					text: t("storedInvalid")
				};
				if (appearance.initialIssue === "storage-unavailable") return {
					kind: "error",
					text: t("storageUnavailable")
				};
				return null;
			});
			const fontLoadGeneration = (0, react.useRef)(0);
			const fontLoadStarted = (0, react.useRef)(false);
			const headerActionsRef = (0, react.useRef)(null);
			const importWasOpen = (0, react.useRef)(false);
			(0, react.useEffect)(() => () => {
				fontLoadGeneration.current += 1;
			}, []);
			(0, react.useEffect)(() => {
				if (!importOpen) return;
				const onKeyDown = (event) => {
					handleNestedDialogKeyDown(event, document.querySelector(`.${skin_center_module_css_default.importModal}`), () => {
						setImportOpen(false);
						setImportError(null);
					});
				};
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [importOpen]);
			(0, react.useEffect)(() => {
				if (importWasOpen.current && !importOpen) headerActionsRef.current?.querySelector("button")?.focus();
				importWasOpen.current = importOpen;
			}, [importOpen]);
			const editableMode = themeSnapshot.preference === "system" ? themeSnapshot.active.colorScheme : themeSnapshot.preference;
			const activePackage = activeSkinEntry()?.package;
			const publish = (candidate) => {
				try {
					const next = appearance.update(candidate);
					setConfig(next);
					return true;
				} catch {
					setNotice({
						kind: "error",
						text: t("saveFailed")
					});
					return false;
				}
			};
			const setColorError = (mode, role, invalid) => {
				setColorErrors((current) => ({
					...current,
					[mode]: {
						...current[mode],
						[role]: invalid
					}
				}));
			};
			const commitColor = (mode, role, value, normalizeDraft) => {
				let next;
				try {
					next = updateAppearanceColor(appearance.getConfig(), mode, role, value);
				} catch {
					setColorError(mode, role, true);
					return;
				}
				setColorError(mode, role, false);
				if (publish(next)) {
					if (normalizeDraft) setColorDraftValues((current) => ({
						...current,
						[mode]: {
							...current[mode],
							[role]: next.colors[mode][role]
						}
					}));
					setNotice(null);
				}
			};
			const updateColorText = (mode, role, value) => {
				setColorDraftValues((current) => ({
					...current,
					[mode]: {
						...current[mode],
						[role]: value
					}
				}));
				commitColor(mode, role, value, false);
			};
			const updateColorPicker = (mode, role, value) => {
				setColorDraftValues((current) => ({
					...current,
					[mode]: {
						...current[mode],
						[role]: value
					}
				}));
				commitColor(mode, role, value, true);
			};
			const normalizeColorDraft = (mode, role) => {
				setColorDraftValues((current) => ({
					...current,
					[mode]: {
						...current[mode],
						[role]: config.colors[mode][role]
					}
				}));
				setColorError(mode, role, false);
			};
			const updateFont = (role, value) => {
				setFontDrafts((current) => ({
					...current,
					[role]: value
				}));
				const current = appearance.getConfig();
				const candidate = {
					...current,
					fonts: {
						...current.fonts,
						[role]: value
					}
				};
				try {
					normalizeAppearanceConfig(candidate);
					setFontErrors((current) => ({
						...current,
						[role]: false
					}));
				} catch {
					setFontErrors((current) => ({
						...current,
						[role]: true
					}));
					return;
				}
				if (publish(candidate)) setNotice(null);
			};
			const normalizeFontDraft = (role) => {
				setFontDrafts((current) => ({
					...current,
					[role]: appearance.getConfig().fonts[role]
				}));
				setFontErrors((current) => ({
					...current,
					[role]: false
				}));
			};
			const fontListStatusText = () => {
				if (fontList.status === "idle") return t("fontListIdle");
				if (fontList.status === "loading") return t("fontListLoading");
				if (fontList.status === "loaded") return t("fontListLoaded");
				if (fontList.status === "unsupported") return t("fontListUnsupported");
				if (fontList.status === "denied") return t("fontListDenied");
				return t("fontListError");
			};
			const loadLocalFonts = () => {
				if (fontLoadStarted.current) return;
				fontLoadStarted.current = true;
				const generation = ++fontLoadGeneration.current;
				setFontList({
					status: "loading",
					families: []
				});
				enumerateLocalFonts().then((result) => {
					if (fontLoadGeneration.current === generation) {
						setFontList(result);
						if (result.status !== "loaded") fontLoadStarted.current = false;
					}
				});
			};
			const selectTheme = (preference) => {
				try {
					theme.setTheme(preference);
					setNotice(null);
				} catch {
					setNotice({
						kind: "error",
						text: t("themeFailed")
					});
				}
			};
			const copyConfig = () => {
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(serializeAppearanceTransport(config)).then((ok) => {
					setNotice({
						kind: ok ? "success" : "error",
						text: t(ok ? "copySuccess" : "copyFailed")
					});
				}).catch(() => {
					setNotice({
						kind: "error",
						text: t("copyFailed")
					});
				});
			};
			const openImport = () => {
				setImportText("");
				setImportError(null);
				setImportOpen(true);
			};
			const closeImport = () => {
				setImportOpen(false);
				setImportError(null);
			};
			const importConfig = () => {
				try {
					const next = appearance.import(importText);
					setConfig(next);
					setColorDraftValues(colorDrafts(next));
					setColorErrors(emptyColorErrors());
					setFontDrafts({ ...next.fonts });
					setFontErrors({
						ui: false,
						code: false
					});
					setNotice({
						kind: "success",
						text: t("importSuccess")
					});
					setImportOpen(false);
					setImportText("");
					setImportError(null);
				} catch (error) {
					setImportError(t(error instanceof AppearanceConfigError ? "importRejected" : "saveFailed"));
				}
			};
			const tryOn = (entry) => {
				setSkinError(null);
				controller.tryOn(entry).then(() => {
					setTryingId(entry.id);
					setTryingOfficial(false);
				}).catch(() => {
					setSkinError(t("tryOnError"));
					setTryingId(null);
					setTryingOfficial(false);
				});
			};
			const tryOnOfficial = () => {
				setSkinError(null);
				try {
					controller.tryOnOfficial();
					setTryingId(null);
					setTryingOfficial(true);
				} catch {
					setSkinError(t("tryOnError"));
					setTryingOfficial(false);
				}
			};
			const exitTryOn = () => {
				controller.exit();
				setTryingId(null);
				setTryingOfficial(false);
			};
			const confirmActive = (target) => new Promise((resolve) => {
				const expected = target === OFFICIAL ? "none" : target;
				let tries = 0;
				const tick = () => {
					tries += 1;
					fetch("/api/skin-center/state").then(async (response) => {
						const payload = await response.json().catch(() => null);
						if (response.ok && payload?.ok === true && payload.active === expected) resolve(true);
						else if (tries >= 20) resolve(false);
						else window.setTimeout(tick, 250);
					}).catch(() => {
						if (tries >= 20) resolve(false);
						else window.setTimeout(tick, 250);
					});
				};
				tick();
			});
			const applySkin = (target) => {
				setSkinError(null);
				setApplying(target);
				fetch("/api/skin-center/apply", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(target === OFFICIAL ? { official: true } : { skin: target })
				}).then(async (response) => {
					const payload = await response.json().catch(() => null);
					if (!response.ok || payload?.ok !== true) throw new Error(payload?.error ?? `HTTP ${response.status}`);
					setApplying(null);
					confirmActive(target).then((confirmed) => {
						if (confirmed) window.location.reload();
						else {
							const command = target === OFFICIAL ? "dsh-skin use official" : `dsh-skin use ${target}`;
							setSkinError(`${t("appliedUnconfirmed")} — ${command}`);
						}
					});
				}).catch((cause) => {
					setApplying(null);
					const detail = cause instanceof Error ? cause.message : String(cause);
					const command = target === OFFICIAL ? "dsh-skin use official" : `dsh-skin use ${target}`;
					setSkinError(`${t("applyFailed")} (${detail}) — ${command}`);
				});
			};
			const actionButtons = (opts) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: skin_center_module_css_default.skinActions,
				children: [opts.isActive ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					type: "button",
					size: "sm",
					variant: "ghost",
					disabled: true,
					children: t("active")
				}) : opts.isTrying ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					type: "button",
					size: "sm",
					variant: "primary",
					onClick: exitTryOn,
					children: t("exitTryOn")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					type: "button",
					size: "sm",
					variant: "primary",
					onClick: opts.onTryOn,
					children: t("tryOn")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					type: "button",
					size: "sm",
					variant: "outline",
					disabled: applying !== null,
					onClick: () => {
						applySkin(opts.key);
					},
					children: applying === opts.key ? t("applying") : opts.applyLabel
				})]
			});
			const skinCard = (entry) => {
				const isActive = entry.package === activePackage;
				const isTrying = entry.id === tryingId;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
					className: skin_center_module_css_default.skinCard,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: skin_center_module_css_default.skinCardTitleRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: skin_center_module_css_default.skinSwatch,
									style: { backgroundColor: entry.accent },
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									className: skin_center_module_css_default.skinName,
									children: entry.nameEn
								}),
								(isActive || isTrying) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: isActive ? skin_center_module_css_default.badgeActive : skin_center_module_css_default.badgeTrying,
									children: t(isActive ? "active" : "tryingOn")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: skin_center_module_css_default.skinTagline,
							children: entry.tagline
						}),
						actionButtons({
							key: entry.id,
							isActive,
							isTrying,
							onTryOn: () => {
								tryOn(entry);
							},
							applyLabel: t("apply")
						})
					]
				}, entry.id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: skin_center_module_css_default.page,
				"aria-labelledby": "dsh-appearance-title",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: skin_center_module_css_default.pageHeader,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: skin_center_module_css_default.titleGroup,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								id: "dsh-appearance-title",
								className: skin_center_module_css_default.pageTitle,
								children: t("title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: skin_center_module_css_default.pageDescription,
								children: t("description")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: skin_center_module_css_default.headerActions,
							ref: headerActionsRef,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "button",
								size: "sm",
								variant: "outline",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, {}),
								onClick: openImport,
								children: t("import")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "button",
								size: "sm",
								variant: "outline",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, {}),
								onClick: copyConfig,
								children: t("copy")
							})]
						})]
					}),
					notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: notice.kind === "error" ? skin_center_module_css_default.noticeError : skin_center_module_css_default.noticeSuccess,
						role: notice.kind === "error" ? "alert" : "status",
						"aria-live": notice.kind === "error" ? "assertive" : "polite",
						children: notice.text
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: skin_center_module_css_default.sectionBlock,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: skin_center_module_css_default.blockHeading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("themeTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("themeDescription") })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: skin_center_module_css_default.themeGrid,
							children: THEME_OPTIONS.map(({ id, label, Icon }) => {
								const selected = themeSnapshot.preference === id;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `${skin_center_module_css_default.themeChoice} ${selected ? skin_center_module_css_default.themeChoiceSelected : ""}`,
									"aria-pressed": selected,
									onClick: () => {
										selectTheme(id);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { size: 18 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(label) })]
								}, id);
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: skin_center_module_css_default.sectionBlock,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: skin_center_module_css_default.blockHeading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("colorsTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("colorsDescription") })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
							className: skin_center_module_css_default.paletteCard,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: t(editableMode === "light" ? "lightPalette" : "darkPalette") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: skin_center_module_css_default.colorGrid,
								children: COLOR_ROLES.map(({ role, label }) => {
									const labelId = `dsh-${editableMode}-${role}-color-label`;
									const errorId = `dsh-${editableMode}-${role}-color-error`;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: skin_center_module_css_default.colorField,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												id: labelId,
												children: t(label)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: skin_center_module_css_default.colorControl,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													type: "color",
													value: config.colors[editableMode][role],
													"aria-label": `${t(editableMode === "light" ? "lightPalette" : "darkPalette")} — ${t(label)}`,
													onChange: (event) => {
														updateColorPicker(editableMode, role, event.currentTarget.value);
													}
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													className: skin_center_module_css_default.colorText,
													type: "text",
													value: colorDraftValues[editableMode][role],
													maxLength: 7,
													pattern: "#[0-9a-fA-F]{6}",
													"aria-labelledby": labelId,
													"aria-invalid": colorErrors[editableMode][role],
													"aria-describedby": colorErrors[editableMode][role] ? errorId : void 0,
													spellCheck: false,
													autoComplete: "off",
													onChange: (event) => {
														updateColorText(editableMode, role, event.currentTarget.value);
													},
													onBlur: () => {
														normalizeColorDraft(editableMode, role);
													}
												})]
											}),
											colorErrors[editableMode][role] && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												id: errorId,
												className: skin_center_module_css_default.fieldError,
												role: "alert",
												children: t("colorInvalid")
											})
										]
									}, role);
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: skin_center_module_css_default.sectionBlock,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: skin_center_module_css_default.blockHeading,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("fontsTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("fontsDescription") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: fontList.status === "denied" || fontList.status === "error" ? skin_center_module_css_default.fontAccessWarning : skin_center_module_css_default.fontAccessStatus,
								role: fontList.status === "denied" || fontList.status === "error" ? "alert" : "status",
								"aria-live": "polite",
								children: fontListStatusText()
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: skin_center_module_css_default.fontGrid,
								children: [{
									role: "ui",
									label: "uiFont",
									fallback: "uiFallback"
								}, {
									role: "code",
									label: "codeFont",
									fallback: "codeFallback"
								}].map(({ role, label, fallback }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: skin_center_module_css_default.fontField,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: skin_center_module_css_default.fontLabel,
											children: t(label)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "text",
											value: fontDrafts[role],
											list: fontList.status === "loaded" ? `dsh-${role}-font-families` : void 0,
											"aria-invalid": fontErrors[role],
											"aria-describedby": `dsh-${role}-font-fallback${fontErrors[role] ? ` dsh-${role}-font-status` : ""}`,
											spellCheck: false,
											autoComplete: "off",
											onFocus: loadLocalFonts,
											onClick: loadLocalFonts,
											onChange: (event) => {
												updateFont(role, event.currentTarget.value);
											},
											onBlur: () => {
												normalizeFontDraft(role);
											}
										}),
										fontList.status === "loaded" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("datalist", {
											id: `dsh-${role}-font-families`,
											children: fontList.families.map((family) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: family }, family))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											id: `dsh-${role}-font-fallback`,
											className: skin_center_module_css_default.fallbackText,
											children: t(fallback)
										}),
										fontErrors[role] && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											id: `dsh-${role}-font-status`,
											className: `${skin_center_module_css_default.fontStatus} ${skin_center_module_css_default.fontStatusWarning}`,
											role: "alert",
											children: t("fontInvalid")
										})
									]
								}, role))
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: skin_center_module_css_default.skinsBlock,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: skin_center_module_css_default.skinsDisclosure,
							"aria-expanded": otherSkinsOpen,
							"aria-controls": "dsh-other-skins",
							onClick: () => {
								setOtherSkinsOpen((open) => !open);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("otherSkins") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: t("otherSkinsDescription") })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: otherSkinsOpen ? skin_center_module_css_default.disclosureIconOpen : skin_center_module_css_default.disclosureIcon })]
						}), otherSkinsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							id: "dsh-other-skins",
							className: skin_center_module_css_default.skinsBody,
							children: [skinError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: skin_center_module_css_default.noticeError,
								role: "alert",
								children: skinError
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: skin_center_module_css_default.skinGrid,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
									className: skin_center_module_css_default.skinCard,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: skin_center_module_css_default.skinCardTitleRow,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: skin_center_module_css_default.skinSwatchOfficial,
													"aria-hidden": "true"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
													className: skin_center_module_css_default.skinName,
													children: t("official")
												}),
												(activePackage === void 0 || tryingOfficial) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: activePackage === void 0 ? skin_center_module_css_default.badgeActive : skin_center_module_css_default.badgeTrying,
													children: t(activePackage === void 0 ? "active" : "tryingOn")
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: skin_center_module_css_default.skinTagline,
											children: t("officialTagline")
										}),
										actionButtons({
											key: OFFICIAL,
											isActive: activePackage === void 0,
											isTrying: tryingOfficial,
											onTryOn: tryOnOfficial,
											applyLabel: t("restore")
										})
									]
								}), SKIN_CENTER_ENTRIES.map(skinCard)]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: importOpen,
						onClose: closeImport,
						title: t("importModalTitle"),
						closeLabel: t("close"),
						description: t("importModalDescription"),
						className: skin_center_module_css_default.importModal,
						contentClassName: skin_center_module_css_default.importModalContent,
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "outline",
							onClick: closeImport,
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							variant: "primary",
							disabled: importText.trim() === "",
							onClick: importConfig,
							children: t("import")
						})] }),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: skin_center_module_css_default.importField,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("importPasteLabel") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								value: importText,
								autoFocus: true,
								spellCheck: false,
								autoComplete: "off",
								rows: 7,
								wrap: "soft",
								placeholder: `${APPEARANCE_TRANSPORT_PREFIX}{…}`,
								"aria-invalid": importError !== null,
								"aria-describedby": importError === null ? void 0 : "dsh-appearance-import-error",
								onChange: (event) => {
									setImportText(event.currentTarget.value);
									setImportError(null);
								}
							})]
						}), importError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							id: "dsh-appearance-import-error",
							className: skin_center_module_css_default.noticeError,
							role: "alert",
							children: importError
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		const en = {
			title: "Appearance",
			navLabel: "Appearance",
			description: "Choose the Harness theme and configure the palette and fonts for compatible skins. Local values apply whenever a compatible skin is active.",
			import: "Import",
			copy: "Copy",
			copySuccess: "Appearance transport copied.",
			copyFailed: "Could not copy the appearance transport.",
			importSuccess: "Appearance imported and applied.",
			importRejected: "Import rejected. Paste a valid dsh-theme-v1 transport containing version 2 appearance JSON.",
			importModalTitle: "Import appearance",
			importModalDescription: "Paste the full transport string copied from this Appearance page.",
			importPasteLabel: "Appearance transport",
			cancel: "Cancel",
			close: "Close",
			saveFailed: "Could not save the appearance settings in this browser.",
			storedInvalid: "The saved appearance document is invalid. Safe defaults are active; the stored value was left untouched.",
			storageUnavailable: "Browser storage is unavailable. Safe defaults are active, and changes cannot be saved.",
			themeTitle: "Theme preference",
			themeDescription: "This follows the official Harness theme preference, including the operating system option.",
			themeSystem: "System",
			themeLight: "Light",
			themeDark: "Dark",
			themeFailed: "The Harness theme preference could not be changed.",
			colorsTitle: "Warm color palette",
			colorsDescription: "Edit the selected or system-resolved color scheme. Surface color is derived automatically.",
			lightPalette: "Light palette",
			darkPalette: "Dark palette",
			accent: "Accent",
			background: "Background",
			foreground: "Foreground",
			colorInvalid: "Enter a complete #RRGGBB color. The saved color remains active.",
			fontsTitle: "Local fonts",
			fontsDescription: "Focus or click a field to load installed families. Manual family entry remains available as a fallback.",
			uiFont: "Interface font",
			codeFont: "Code font",
			uiFallback: "Fallback: the Harness interface font stack.",
			codeFallback: "Fallback: the Harness code font stack.",
			fontListIdle: "Click a font field to load the local font dropdown. No permission is requested on page load.",
			fontListLoading: "Loading local font families…",
			fontListLoaded: "Local font list loaded. Both fields use the same installed-family dropdown.",
			fontListUnsupported: "Local Font Access is unsupported in this browser. Enter a family manually.",
			fontListDenied: "Local font access was denied. Enter a family manually; the fallback stack remains available.",
			fontListError: "The local font list could not be loaded. Enter a family manually.",
			fontInvalid: "Use a single font family name. The current saved font and fallback remain active.",
			otherSkins: "Other skins",
			otherSkinsDescription: "Try on or apply the installed full-interface skins.",
			official: "Official default",
			officialTagline: "The stock DSH look with no additional skin applied.",
			active: "Active",
			tryingOn: "Trying on",
			tryOn: "Try on",
			exitTryOn: "Exit try-on",
			apply: "Apply",
			applying: "Applying…",
			restore: "Restore",
			applyFailed: "Apply failed",
			appliedUnconfirmed: "Applied, but the change has not been confirmed; refresh the page if the skin did not switch",
			tryOnError: "Try-on failed. See the console for details."
		};
		const zh = {
			title: "外观",
			navLabel: "外观",
			description: "选择 Harness 主题，并配置兼容皮肤的配色与字体。本地设置会在兼容皮肤激活时生效。",
			import: "导入",
			copy: "复制",
			copySuccess: "外观传输文本已复制。",
			copyFailed: "无法复制外观传输文本。",
			importSuccess: "外观配置已导入并生效。",
			importRejected: "导入被拒绝。请粘贴包含第 2 版外观 JSON 的有效 dsh-theme-v1 传输文本。",
			importModalTitle: "导入外观",
			importModalDescription: "粘贴从此外观页复制的完整传输文本。",
			importPasteLabel: "外观传输文本",
			cancel: "取消",
			close: "关闭",
			saveFailed: "无法在当前浏览器中保存外观设置。",
			storedInvalid: "已保存的外观配置无效。当前使用安全默认值，原存储内容未被改写。",
			storageUnavailable: "浏览器存储不可用。当前使用安全默认值，且无法保存更改。",
			themeTitle: "主题偏好",
			themeDescription: "沿用 Harness 官方主题偏好，并支持跟随操作系统。",
			themeSystem: "跟随系统",
			themeLight: "浅色",
			themeDark: "深色",
			themeFailed: "无法切换 Harness 主题偏好。",
			colorsTitle: "暖色配色",
			colorsDescription: "编辑当前选择或系统解析后的配色；浮层底色会自动推导。",
			lightPalette: "浅色配色",
			darkPalette: "深色配色",
			accent: "强调色",
			background: "背景色",
			foreground: "前景色",
			colorInvalid: "请输入完整的 #RRGGBB 颜色；当前已保存颜色继续生效。",
			fontsTitle: "本地字体",
			fontsDescription: "聚焦或点击字段时加载本地字体族；不支持或未授权时仍可手动输入。",
			uiFont: "界面字体",
			codeFont: "代码字体",
			uiFallback: "回退：Harness 默认界面字体栈。",
			codeFallback: "回退：Harness 默认代码字体栈。",
			fontListIdle: "点击字体字段以加载本地字体下拉列表；页面加载时不会请求权限。",
			fontListLoading: "正在加载本地字体族…",
			fontListLoaded: "本地字体列表已加载；两个字段共用同一已安装字体下拉列表。",
			fontListUnsupported: "当前浏览器不支持 Local Font Access，请手动输入字体族。",
			fontListDenied: "本地字体访问被拒绝，请手动输入；回退字体栈仍可用。",
			fontListError: "无法加载本地字体列表，请手动输入字体族。",
			fontInvalid: "请输入单个字体族名称；当前已保存字体与回退字体继续生效。",
			otherSkins: "其他皮肤",
			otherSkinsDescription: "试穿或应用已安装的整套界面皮肤。",
			official: "官方默认",
			officialTagline: "恢复 DSH 官方界面，不应用其他皮肤。",
			active: "当前激活",
			tryingOn: "试穿中",
			tryOn: "试穿",
			exitTryOn: "退出试穿",
			apply: "应用",
			applying: "应用中…",
			restore: "恢复默认",
			applyFailed: "应用失败",
			appliedUnconfirmed: "已写入配置但尚未确认生效；若皮肤未切换，请手动刷新页面",
			tryOnError: "试穿失败，详情见控制台。"
		};
		//#endregion
		//#region src/client/index.ts
		/** Locale namespace owned by this plugin. */
		const NS = "skinCenter";
		/** Services used directly by the section. */
		const inject = [
			"slots",
			"locale",
			"theme"
		];
		const browserStorage = {
			getItem: (key) => window.localStorage.getItem(key),
			setItem: (key, value) => {
				window.localStorage.setItem(key, value);
			}
		};
		/** Register locale, reversible body configuration, and the official section. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-skin-center: dictionaries");
			const appearance = new AppearanceRuntime(document.body, browserStorage);
			const controller = new TryOnController({ afterRestore: () => {
				appearance.reapply();
			} });
			ctx.effect(() => () => {
				controller.exit();
				appearance.dispose();
			}, "ui-skin-center: appearance lifecycle");
			const theme = ctx.get("theme");
			const injected = () => ({
				controller,
				appearance,
				theme: {
					getTheme: () => theme.getTheme(),
					subscribe: (listener) => ctx.on("theme/change", listener),
					setTheme: (preference) => {
						theme.setTheme(preference);
					}
				}
			});
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skin-appearance",
				order: 5,
				label: () => t("navLabel"),
				locale: NS,
				inject: injected
			}, SkinCenter));
		}
		//#endregion
		exports.APPEARANCE_BODY_VARIABLES = APPEARANCE_BODY_VARIABLES;
		exports.APPEARANCE_FORMAT = APPEARANCE_FORMAT;
		exports.APPEARANCE_STORAGE_KEY = APPEARANCE_STORAGE_KEY;
		exports.APPEARANCE_TRANSPORT_PREFIX = APPEARANCE_TRANSPORT_PREFIX;
		exports.APPEARANCE_VERSION = APPEARANCE_VERSION;
		exports.AppearanceConfigError = AppearanceConfigError;
		exports.AppearanceRuntime = AppearanceRuntime;
		exports.DEFAULT_APPEARANCE_CONFIG = DEFAULT_APPEARANCE_CONFIG;
		exports.NS = NS;
		exports.TryOnController = TryOnController;
		exports.apply = apply;
		exports.browserLocalFontQuery = browserLocalFontQuery;
		exports.deriveAppearanceSurface = deriveAppearanceSurface;
		exports.enumerateLocalFonts = enumerateLocalFonts;
		exports.inject = inject;
		exports.normalizeAppearanceConfig = normalizeAppearanceConfig;
		exports.normalizeLocalFontFamilies = normalizeLocalFontFamilies;
		exports.parseAppearanceConfig = parseAppearanceConfig;
		exports.parseAppearanceTransport = parseAppearanceTransport;
		exports.serializeAppearanceConfig = serializeAppearanceConfig;
		exports.serializeAppearanceTransport = serializeAppearanceTransport;
		exports.updateAppearanceColor = updateAppearanceColor;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map