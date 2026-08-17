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

import { execFile } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { listLocalFontFamilies } from './local-fonts-host.ts'

/** Browser-facing base path of the skin-center API. */
export const SKIN_CENTER_API_PREFIX = '/api/skin-center'

/** Cap a dsh-skin invocation; a hung CLI must never block the server. */
const DSH_SKIN_TIMEOUT_MS = 15000

/** Checkout fallback used only when PATH cannot resolve the published CLI. */
export const DSH_SKIN_REPO_FALLBACK = fileURLToPath(new URL('../../../../scripts/dsh-skin', import.meta.url))

/** One JSON response. */
function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** Require the method or answer 405. */
function requireMethod(req: IncomingMessage, res: ServerResponse, method: string): boolean {
  if (req.method === method) return true
  json(res, 405, { ok: false, error: 'method-not-allowed' })
  return false
}

/**
 * Same-origin fence. Browsers send `Sec-Fetch-Site` on every fetch: same-site
 * and cross-site pages both resolve their `Origin` here, so the checks are:
 * a `cross-site` fetch is always rejected, and an `Origin` that does not
 * match the request `Host` is rejected. Requests without either header
 * (curl, node http, old browsers) pass — this is a local single-user tool,
 * and the fence only targets the cross-site browser vector.
 */
function isSameOriginRequest(req: IncomingMessage): boolean {
  const site = req.headers['sec-fetch-site']
  if (typeof site === 'string' && site === 'cross-site') return false
  const origin = req.headers.origin
  if (typeof origin === 'string' && origin !== '' && origin !== 'null') {
    const host = req.headers.host
    if (typeof host !== 'string' || host === '') return false
    try {
      if (new URL(origin).host !== host) return false
    } catch {
      return false
    }
  }
  return true
}

/** Reject cross-site requests with 403. */
function requireSameOrigin(req: IncomingMessage, res: ServerResponse): boolean {
  if (isSameOriginRequest(req)) return true
  json(res, 403, { ok: false, error: 'cross-site-request-rejected' })
  return false
}

/** Read a JSON request body (bounded). */
function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 64 * 1024) {
        reject(new Error('body-too-large'))
        queueMicrotask(() => req.destroy())
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('invalid-json'))
      }
    })
    req.on('error', reject)
  })
}

/** One executable invocation; injectable so fallback routing is unit-testable. */
export type DshSkinCommand = (file: string, args: string[]) => Promise<string>

export interface DshSkinInvocation {
  file: string
  args: string[]
  shell: boolean
}

/** Resolve one CLI call without relying on a POSIX shebang on Windows. */
export function resolveDshSkinInvocation(
  file: string,
  args: string[],
  fallbackPath = DSH_SKIN_REPO_FALLBACK,
  platform: NodeJS.Platform = process.platform,
): DshSkinInvocation {
  if (file === fallbackPath) {
    return { file: process.execPath, args: [fallbackPath, ...args], shell: false }
  }
  return { file, args, shell: platform === 'win32' }
}

function createExecDshSkinCommand(
  fallbackPath: string,
  platform: NodeJS.Platform,
): DshSkinCommand {
  return (file, args) => new Promise((resolve, reject) => {
    if (file === fallbackPath && !statSync(fallbackPath, { throwIfNoEntry: false })) {
      reject(Object.assign(new Error(`missing ${fallbackPath}`), { code: 'ENOENT' }))
      return
    }
    const invocation = resolveDshSkinInvocation(file, args, fallbackPath, platform)
    execFile(invocation.file, invocation.args, {
      timeout: DSH_SKIN_TIMEOUT_MS,
      shell: invocation.shell,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error === null) {
        resolve(stdout)
        return
      }
      const failure = error as NodeJS.ErrnoException & { stderr?: string }
      failure.stderr = stderr
      reject(failure)
    })
  })
}

function isMissingExecutable(error: unknown): boolean {
  return errorCode(error) === 'ENOENT'
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined
}

function commandFailure(error: unknown, file: string, args: string[]): Error {
  const failure = error as { message?: unknown; stderr?: unknown }
  const stderr = typeof failure?.stderr === 'string' ? failure.stderr.trim() : ''
  const message = typeof failure?.message === 'string' ? failure.message : ''
  return new Error(stderr || message || `${file} ${args.join(' ')} failed`)
}

/**
 * Build a portable runner. POSIX keeps PATH-first behavior; Windows uses the
 * repository script through Node first so `.cmd` shims and shebang support are
 * never prerequisites for a normal source-checkout install.
 */
export function createDshSkinRunner(
  command?: DshSkinCommand,
  fallbackPath = DSH_SKIN_REPO_FALLBACK,
  platform: NodeJS.Platform = process.platform,
): (args: string[]) => Promise<string> {
  const execute = command ?? createExecDshSkinCommand(fallbackPath, platform)
  const files = platform === 'win32'
    ? [fallbackPath, 'dsh-skin']
    : ['dsh-skin', fallbackPath]
  return async args => {
    try {
      return await execute(files[0]!, args)
    } catch (error) {
      if (!isMissingExecutable(error)) throw commandFailure(error, files[0]!, args)
    }

    try {
      return await execute(files[1]!, args)
    } catch (error) {
      if (isMissingExecutable(error)) {
        throw new Error(`dsh-skin CLI not found on PATH and repo fallback is unavailable at ${fallbackPath}`)
      }
      throw commandFailure(error, files[1]!, args)
    }
  }
}

/** Run `dsh-skin <args>` using the platform-appropriate runner. */
export function runDshSkin(args: string[]): Promise<string> {
  return createDshSkinRunner()(args)
}

/** A GET route wrapping one async call, fenced to same-origin requests. */
function getRoute(path: string, run: () => Promise<unknown>): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (!requireMethod(req, res, 'GET')) return
      if (!requireSameOrigin(req, res)) return
      run().then((value) => json(res, 200, value), (error) => {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

/** A POST JSON route wrapping one async call, fenced to same-origin requests. */
function postRoute(path: string, run: (body: Record<string, unknown>) => Promise<unknown>): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      if (!requireMethod(req, res, 'POST')) return Promise.resolve()
      if (!requireSameOrigin(req, res)) return Promise.resolve()
      return readJsonBody(req).then((body) => {
        const record = (typeof body === 'object' && body !== null) ? body as Record<string, unknown> : {}
        return run(record).then(
          (value) => json(res, 200, value),
          (error) => {
            json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
          },
        )
      }, (error) => {
        json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

/** Injectable dsh-skin runner (tests substitute a stub). */
export interface SkinCenterRoutesDeps {
  /** Run `dsh-skin <args>`, resolving stdout; defaults to the real CLI. */
  run?: (args: string[]) => Promise<string>
  /** Enumerate local font families; tests substitute a deterministic stub. */
  fontFamilies?: () => Promise<string[]>
}

/** Repo layout: skin bundles live at packages/skins/<id>/lib/client.js. */
const SKINS_DIR = fileURLToPath(new URL('../../../skins/', import.meta.url))

/**
 * Map skin id -> directory under packages/skins/, scanned from each
 * skin.json. The id is validated against this map (never used as a raw
 * path) so the bundle route cannot be walked off the skins tree.
 * @returns skin id -> directory name.
 */
function skinDirectories(): Map<string, string> {
  const out = new Map<string, string>()
  for (const dir of readdirSync(SKINS_DIR)) {
    const metaFile = joinPath(SKINS_DIR, dir, 'skin.json')
    if (!statSync(metaFile, { throwIfNoEntry: false })) continue
    let meta: { id?: unknown }
    try {
      meta = JSON.parse(readFileSync(metaFile, 'utf8'))
    } catch {
      continue
    }
    if (typeof meta.id === 'string' && /^[a-z0-9-]+$/.test(meta.id)) out.set(meta.id, dir)
  }
  return out
}

/**
 * The on-demand bundle route: serve packages/skins/<id>/lib/client.js as a
 * same-origin script. Try-on loads it through a script tag (the kernel's
 * own bundle-loading mechanism), so the body registers the skin factory on
 * `window.__ModuleLoader__` without any eval.
 * @returns the prefix route (matches /api/skin-center/bundle/<id>).
 */
function bundleRoute(): WebRoute {
  const prefix = `${SKIN_CENTER_API_PREFIX}/bundle`
  return {
    kind: 'prefix',
    path: prefix,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (!requireMethod(req, res, 'GET')) return
      if (!requireSameOrigin(req, res)) return
      let id: string
      try {
        id = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname.slice(prefix.length + 1))
      } catch {
        json(res, 400, { ok: false, error: 'invalid-skin-id' })
        return
      }
      if (!/^[a-z0-9-]+$/.test(id)) {
        json(res, 400, { ok: false, error: 'invalid-skin-id' })
        return
      }
      try {
        const dir = skinDirectories().get(id)
        if (dir === undefined) {
          json(res, 404, { ok: false, error: 'skin-not-found' })
          return
        }
        const bundle = joinPath(SKINS_DIR, dir, 'lib', 'client.js')
        if (!statSync(bundle, { throwIfNoEntry: false })) {
          json(res, 404, { ok: false, error: 'skin-bundle-missing' })
          return
        }
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
        res.end(readFileSync(bundle, 'utf8'))
      } catch (error) {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }
}

/**
 * Build the skin-center route family.
 * @param deps - optional runner override (tests).
 */
export function makeSkinCenterRoutes(deps: SkinCenterRoutesDeps = {}): WebRoute[] {
  const run = deps.run ?? runDshSkin
  const fontFamilies = deps.fontFamilies ?? listLocalFontFamilies
  const current = (): Promise<string> => run(['current']).then(out => out.trim() || 'none')
  return [
    getRoute(`${SKIN_CENTER_API_PREFIX}/state`, async () => ({
      ok: true,
      active: await current(),
    })),
    getRoute(`${SKIN_CENTER_API_PREFIX}/fonts`, async () => ({
      ok: true,
      families: await fontFamilies(),
    })),
    bundleRoute(),
    postRoute(`${SKIN_CENTER_API_PREFIX}/apply`, async (body) => {
      const skin = body.skin
      const official = body.official === true
      let target: string
      if (official) {
        if (skin !== undefined) {
          throw new Error('invalid-skin: skin and official are mutually exclusive')
        }
        target = 'official'
      } else {
        if (typeof skin !== 'string' || skin === '') {
          throw new Error('invalid-skin: pass a skin name or official: true')
        }
        target = skin
      }
      const out = await run(['use', target])
      return {
        ok: true,
        active: await current(),
        message: out.trim(),
      }
    }),
  ]
}
