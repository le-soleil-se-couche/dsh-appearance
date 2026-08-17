import { execFile } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
//#region src/local-fonts-host.ts
/** Host-side local font enumeration with a fast fontconfig path and macOS fallback. */
const FONT_COMMAND_TIMEOUT_MS = 15e3;
const FONT_COMMAND_MAX_BUFFER = 8388608;
const execLocalFontCommand = (file, args) => new Promise((resolve, reject) => {
	execFile(file, args, {
		timeout: FONT_COMMAND_TIMEOUT_MS,
		maxBuffer: FONT_COMMAND_MAX_BUFFER
	}, (error, stdout, stderr) => {
		if (error === null) {
			resolve(stdout);
			return;
		}
		const failure = error;
		failure.stderr = stderr;
		reject(failure);
	});
});
/** Normalize a system font list for a compact, stable dropdown. */
function normalizeHostFontFamilies(values) {
	const families = /* @__PURE__ */ new Map();
	for (const value of values) {
		if (typeof value !== "string") continue;
		const family = value.trim().replace(/\s+/g, " ");
		if (family === "" || family.startsWith(".") || family.length > 120 || /[\u0000-\u001f\u007f]/.test(family)) continue;
		const key = family.toLocaleLowerCase();
		if (!families.has(key)) families.set(key, family);
	}
	return [...families.values()].sort((left, right) => left.localeCompare(right, void 0, {
		sensitivity: "base",
		numeric: true
	}));
}
/** Parse `fc-list --format %{family[0]}` output. */
function parseFontconfigFamilies(stdout) {
	return normalizeHostFontFamilies(stdout.split(/\r?\n/));
}
/** Parse `system_profiler SPFontsDataType -json` without trusting its shape. */
function parseSystemProfilerFamilies(stdout) {
	let decoded;
	try {
		decoded = JSON.parse(stdout);
	} catch {
		return [];
	}
	if (typeof decoded !== "object" || decoded === null || !("SPFontsDataType" in decoded)) return [];
	const entries = decoded.SPFontsDataType;
	if (!Array.isArray(entries)) return [];
	const families = [];
	for (const entry of entries) {
		if (typeof entry !== "object" || entry === null || !("typefaces" in entry)) continue;
		const typefaces = entry.typefaces;
		if (!Array.isArray(typefaces)) continue;
		for (const face of typefaces) {
			if (typeof face !== "object" || face === null) continue;
			const record = face;
			if (record.enabled === "no") continue;
			families.push(record.family);
		}
	}
	return normalizeHostFontFamilies(families);
}
/** Parse font display names from `reg.exe query ...\\Fonts` output. */
function parseWindowsRegistryFontFamilies(stdout) {
	const families = [];
	for (const line of stdout.split(/\r?\n/)) {
		const match = /^\s{2,}(.+?)\s{2,}REG_(?:SZ|EXPAND_SZ)\s{2,}.+$/i.exec(line);
		if (match?.[1] === void 0) continue;
		families.push(match[1].replace(/\s+\((?:TrueType|OpenType)\)$/i, ""));
	}
	return normalizeHostFontFamilies(families);
}
/**
* Build a cached local-font lister. Fontconfig is fast when present; macOS's
* system profiler is the dependency-free fallback. Failed attempts are not
* cached so a later request can recover after the environment changes.
*/
function createLocalFontLister(command = execLocalFontCommand, platform = process.platform) {
	let cached;
	return () => {
		cached ??= (async () => {
			if (platform === "win32") {
				const families = [];
				for (const key of ["HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts", "HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"]) try {
					families.push(...parseWindowsRegistryFontFamilies(await command("reg.exe", ["query", key])));
				} catch {}
				const windowsFonts = normalizeHostFontFamilies(families);
				if (windowsFonts.length === 0) throw new Error("local font enumeration returned no families");
				return windowsFonts;
			}
			try {
				const fontconfig = parseFontconfigFamilies(await command("fc-list", ["--format", "%{family[0]}\n"]));
				if (fontconfig.length > 0) return fontconfig;
			} catch {}
			if (platform !== "darwin") throw new Error("local font enumeration returned no families");
			const profiler = parseSystemProfilerFamilies(await command("system_profiler", [
				"SPFontsDataType",
				"-json",
				"-detailLevel",
				"mini"
			]));
			if (profiler.length === 0) throw new Error("local font enumeration returned no families");
			return profiler;
		})().catch((error) => {
			cached = void 0;
			throw error;
		});
		return cached;
	};
}
/** Process-wide cached system font list used by the HTTP route. */
const listLocalFontFamilies = createLocalFontLister();
//#endregion
//#region src/routes.ts
/**
* Skin-center HTTP routes — the browser half talks to the host through plain
* same-origin endpoints: JSON for state/apply, plus the bundle route serving
* each skin's prebuilt `lib/client.js` as a same-origin script for live
* try-on (the GUI never embeds the ~700KB of art base64 in its own bundle).
* The host half delegates skin switching to the `dsh-skin` CLI
* (the single authority over the `dsh-skin managed` section of
* `~/.dsh/cordis.patch.yml` and the profile symlink), so switching skins from
* the GUI is exactly `dsh-skin use <name>` — the config watcher hot-reloads
* the patch within seconds and the frontend reloads the page to pick up the
* new boot graph. Same pattern as dsh-pet's `/api/pet` family.
*
* Unlike pet's behavioral endpoints, `/apply` writes the user's boot config,
* so every route also rejects cross-site requests (Sec-Fetch-Site / Origin
* fence) — a malicious webpage must not be able to switch the user's skin
* through a localhost CSRF post.
* @module @deepseek-ai/dsh-client-ui-skin-center/routes
*/
/** Browser-facing base path of the skin-center API. */
const SKIN_CENTER_API_PREFIX = "/api/skin-center";
/** Cap a dsh-skin invocation; a hung CLI must never block the server. */
const DSH_SKIN_TIMEOUT_MS = 15e3;
/** Checkout fallback used only when PATH cannot resolve the published CLI. */
const DSH_SKIN_REPO_FALLBACK = fileURLToPath(new URL("../../../../scripts/dsh-skin", import.meta.url));
/** One JSON response. */
function json(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}
/** Require the method or answer 405. */
function requireMethod(req, res, method) {
	if (req.method === method) return true;
	json(res, 405, {
		ok: false,
		error: "method-not-allowed"
	});
	return false;
}
/**
* Same-origin fence. Browsers send `Sec-Fetch-Site` on every fetch: same-site
* and cross-site pages both resolve their `Origin` here, so the checks are:
* a `cross-site` fetch is always rejected, and an `Origin` that does not
* match the request `Host` is rejected. Requests without either header
* (curl, node http, old browsers) pass — this is a local single-user tool,
* and the fence only targets the cross-site browser vector.
*/
function isSameOriginRequest(req) {
	const site = req.headers["sec-fetch-site"];
	if (typeof site === "string" && site === "cross-site") return false;
	const origin = req.headers.origin;
	if (typeof origin === "string" && origin !== "" && origin !== "null") {
		const host = req.headers.host;
		if (typeof host !== "string" || host === "") return false;
		try {
			if (new URL(origin).host !== host) return false;
		} catch {
			return false;
		}
	}
	return true;
}
/** Reject cross-site requests with 403. */
function requireSameOrigin(req, res) {
	if (isSameOriginRequest(req)) return true;
	json(res, 403, {
		ok: false,
		error: "cross-site-request-rejected"
	});
	return false;
}
/** Read a JSON request body (bounded). */
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		let size = 0;
		const chunks = [];
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > 65536) {
				reject(/* @__PURE__ */ new Error("body-too-large"));
				queueMicrotask(() => req.destroy());
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			if (chunks.length === 0) {
				resolve({});
				return;
			}
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
			} catch {
				reject(/* @__PURE__ */ new Error("invalid-json"));
			}
		});
		req.on("error", reject);
	});
}
/** Resolve one CLI call without relying on a POSIX shebang on Windows. */
function resolveDshSkinInvocation(file, args, fallbackPath = DSH_SKIN_REPO_FALLBACK, platform = process.platform) {
	if (file === fallbackPath) return {
		file: process.execPath,
		args: [fallbackPath, ...args],
		shell: false
	};
	return {
		file,
		args,
		shell: platform === "win32"
	};
}
function createExecDshSkinCommand(fallbackPath, platform) {
	return (file, args) => new Promise((resolve, reject) => {
		if (file === fallbackPath && !statSync(fallbackPath, { throwIfNoEntry: false })) {
			reject(Object.assign(/* @__PURE__ */ new Error(`missing ${fallbackPath}`), { code: "ENOENT" }));
			return;
		}
		const invocation = resolveDshSkinInvocation(file, args, fallbackPath, platform);
		execFile(invocation.file, invocation.args, {
			timeout: DSH_SKIN_TIMEOUT_MS,
			shell: invocation.shell,
			windowsHide: true
		}, (error, stdout, stderr) => {
			if (error === null) {
				resolve(stdout);
				return;
			}
			const failure = error;
			failure.stderr = stderr;
			reject(failure);
		});
	});
}
function isMissingExecutable(error) {
	return errorCode(error) === "ENOENT";
}
function errorCode(error) {
	return error instanceof Error ? error.code : void 0;
}
function commandFailure(error, file, args) {
	const failure = error;
	const stderr = typeof failure?.stderr === "string" ? failure.stderr.trim() : "";
	const message = typeof failure?.message === "string" ? failure.message : "";
	return new Error(stderr || message || `${file} ${args.join(" ")} failed`);
}
/**
* Build a portable runner. POSIX keeps PATH-first behavior; Windows uses the
* repository script through Node first so `.cmd` shims and shebang support are
* never prerequisites for a normal source-checkout install.
*/
function createDshSkinRunner(command, fallbackPath = DSH_SKIN_REPO_FALLBACK, platform = process.platform) {
	const execute = command ?? createExecDshSkinCommand(fallbackPath, platform);
	const files = platform === "win32" ? [fallbackPath, "dsh-skin"] : ["dsh-skin", fallbackPath];
	return async (args) => {
		try {
			return await execute(files[0], args);
		} catch (error) {
			if (!isMissingExecutable(error)) throw commandFailure(error, files[0], args);
		}
		try {
			return await execute(files[1], args);
		} catch (error) {
			if (isMissingExecutable(error)) throw new Error(`dsh-skin CLI not found on PATH and repo fallback is unavailable at ${fallbackPath}`);
			throw commandFailure(error, files[1], args);
		}
	};
}
/** Run `dsh-skin <args>` using the platform-appropriate runner. */
function runDshSkin(args) {
	return createDshSkinRunner()(args);
}
/** A GET route wrapping one async call, fenced to same-origin requests. */
function getRoute(path, run) {
	return {
		kind: "exact",
		path,
		handler: (req, res) => {
			if (!requireMethod(req, res, "GET")) return;
			if (!requireSameOrigin(req, res)) return;
			run().then((value) => json(res, 200, value), (error) => {
				json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		}
	};
}
/** A POST JSON route wrapping one async call, fenced to same-origin requests. */
function postRoute(path, run) {
	return {
		kind: "exact",
		path,
		handler: (req, res) => {
			if (!requireMethod(req, res, "POST")) return Promise.resolve();
			if (!requireSameOrigin(req, res)) return Promise.resolve();
			return readJsonBody(req).then((body) => {
				return run(typeof body === "object" && body !== null ? body : {}).then((value) => json(res, 200, value), (error) => {
					json(res, 400, {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					});
				});
			}, (error) => {
				json(res, 400, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		}
	};
}
/** Repo layout: skin bundles live at packages/skins/<id>/lib/client.js. */
const SKINS_DIR = fileURLToPath(new URL("../../../skins/", import.meta.url));
/**
* Map skin id -> directory under packages/skins/, scanned from each
* skin.json. The id is validated against this map (never used as a raw
* path) so the bundle route cannot be walked off the skins tree.
* @returns skin id -> directory name.
*/
function skinDirectories() {
	const out = /* @__PURE__ */ new Map();
	for (const dir of readdirSync(SKINS_DIR)) {
		const metaFile = join(SKINS_DIR, dir, "skin.json");
		if (!statSync(metaFile, { throwIfNoEntry: false })) continue;
		let meta;
		try {
			meta = JSON.parse(readFileSync(metaFile, "utf8"));
		} catch {
			continue;
		}
		if (typeof meta.id === "string" && /^[a-z0-9-]+$/.test(meta.id)) out.set(meta.id, dir);
	}
	return out;
}
/**
* The on-demand bundle route: serve packages/skins/<id>/lib/client.js as a
* same-origin script. Try-on loads it through a script tag (the kernel's
* own bundle-loading mechanism), so the body registers the skin factory on
* `window.__ModuleLoader__` without any eval.
* @returns the prefix route (matches /api/skin-center/bundle/<id>).
*/
function bundleRoute() {
	const prefix = `${SKIN_CENTER_API_PREFIX}/bundle`;
	return {
		kind: "prefix",
		path: prefix,
		handler: (req, res) => {
			if (!requireMethod(req, res, "GET")) return;
			if (!requireSameOrigin(req, res)) return;
			let id;
			try {
				id = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname.slice(prefix.length + 1));
			} catch {
				json(res, 400, {
					ok: false,
					error: "invalid-skin-id"
				});
				return;
			}
			if (!/^[a-z0-9-]+$/.test(id)) {
				json(res, 400, {
					ok: false,
					error: "invalid-skin-id"
				});
				return;
			}
			try {
				const dir = skinDirectories().get(id);
				if (dir === void 0) {
					json(res, 404, {
						ok: false,
						error: "skin-not-found"
					});
					return;
				}
				const bundle = join(SKINS_DIR, dir, "lib", "client.js");
				if (!statSync(bundle, { throwIfNoEntry: false })) {
					json(res, 404, {
						ok: false,
						error: "skin-bundle-missing"
					});
					return;
				}
				res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
				res.end(readFileSync(bundle, "utf8"));
			} catch (error) {
				json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	};
}
/**
* Build the skin-center route family.
* @param deps - optional runner override (tests).
*/
function makeSkinCenterRoutes(deps = {}) {
	const run = deps.run ?? runDshSkin;
	const fontFamilies = deps.fontFamilies ?? listLocalFontFamilies;
	const current = () => run(["current"]).then((out) => out.trim() || "none");
	return [
		getRoute(`${SKIN_CENTER_API_PREFIX}/state`, async () => ({
			ok: true,
			active: await current()
		})),
		getRoute(`${SKIN_CENTER_API_PREFIX}/fonts`, async () => ({
			ok: true,
			families: await fontFamilies()
		})),
		bundleRoute(),
		postRoute(`${SKIN_CENTER_API_PREFIX}/apply`, async (body) => {
			const skin = body.skin;
			const official = body.official === true;
			let target;
			if (official) {
				if (skin !== void 0) throw new Error("invalid-skin: skin and official are mutually exclusive");
				target = "official";
			} else {
				if (typeof skin !== "string" || skin === "") throw new Error("invalid-skin: pass a skin name or official: true");
				target = skin;
			}
			const out = await run(["use", target]);
			return {
				ok: true,
				active: await current(),
				message: out.trim()
			};
		})
	];
}
//#endregion
//#region src/index.ts
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
const name = "ui-skin-center";
/** Services required before the skin-center can mount its routes. */
const inject = ["webServer"];
/**
* Register the skin-center API routes.
*
* Failure policy: route mounting problems are logged, never thrown — the web
* shell fails the whole boot when a plugin apply throws, and the skin center
* must not take the GUI down.
* @param ctx - cordis context.
*/
function apply(ctx) {
	const routes = makeSkinCenterRoutes();
	try {
		ctx.effect(() => {
			const disposers = [];
			try {
				for (const route of routes) disposers.push(ctx.webServer.register(route));
			} catch (error) {
				for (const dispose of disposers) dispose();
				throw error;
			}
			return () => {
				for (const dispose of disposers) dispose();
			};
		}, "ui-skin-center: routes");
	} catch (error) {
		console.error("[ui-skin-center] route registration failed:", error);
	}
}
//#endregion
export { SKIN_CENTER_API_PREFIX, apply, inject, makeSkinCenterRoutes, name };
