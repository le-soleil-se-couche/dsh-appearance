/** Host-side local font enumeration with a fast fontconfig path and macOS fallback. */

import { execFile } from 'node:child_process'

const FONT_COMMAND_TIMEOUT_MS = 15000
const FONT_COMMAND_MAX_BUFFER = 8 * 1024 * 1024

/** One executable invocation; injectable for deterministic tests. */
export type LocalFontCommand = (file: string, args: string[]) => Promise<string>

const execLocalFontCommand: LocalFontCommand = (file, args) => new Promise((resolve, reject) => {
  execFile(file, args, {
    timeout: FONT_COMMAND_TIMEOUT_MS,
    maxBuffer: FONT_COMMAND_MAX_BUFFER,
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

/** Normalize a system font list for a compact, stable dropdown. */
export function normalizeHostFontFamilies(values: Iterable<unknown>): string[] {
  const families = new Map<string, string>()
  for (const value of values) {
    if (typeof value !== 'string') continue
    const family = value.trim().replace(/\s+/g, ' ')
    if (family === '' || family.startsWith('.') || family.length > 120 || /[\u0000-\u001f\u007f]/.test(family)) continue
    const key = family.toLocaleLowerCase()
    if (!families.has(key)) families.set(key, family)
  }
  return [...families.values()].sort((left, right) => left.localeCompare(right, undefined, {
    sensitivity: 'base',
    numeric: true,
  }))
}

/** Parse `fc-list --format %{family[0]}` output. */
export function parseFontconfigFamilies(stdout: string): string[] {
  return normalizeHostFontFamilies(stdout.split(/\r?\n/))
}

/** Parse `system_profiler SPFontsDataType -json` without trusting its shape. */
export function parseSystemProfilerFamilies(stdout: string): string[] {
  let decoded: unknown
  try {
    decoded = JSON.parse(stdout) as unknown
  } catch {
    return []
  }
  if (typeof decoded !== 'object' || decoded === null || !('SPFontsDataType' in decoded)) return []
  const entries = (decoded as { SPFontsDataType?: unknown }).SPFontsDataType
  if (!Array.isArray(entries)) return []
  const families: unknown[] = []
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null || !('typefaces' in entry)) continue
    const typefaces = (entry as { typefaces?: unknown }).typefaces
    if (!Array.isArray(typefaces)) continue
    for (const face of typefaces) {
      if (typeof face !== 'object' || face === null) continue
      const record = face as { enabled?: unknown; family?: unknown }
      if (record.enabled === 'no') continue
      families.push(record.family)
    }
  }
  return normalizeHostFontFamilies(families)
}

/** Parse font display names from `reg.exe query ...\\Fonts` output. */
export function parseWindowsRegistryFontFamilies(stdout: string): string[] {
  const families: string[] = []
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^\s{2,}(.+?)\s{2,}REG_(?:SZ|EXPAND_SZ)\s{2,}.+$/i.exec(line)
    if (match?.[1] === undefined) continue
    families.push(match[1].replace(/\s+\((?:TrueType|OpenType)\)$/i, ''))
  }
  return normalizeHostFontFamilies(families)
}

/**
 * Build a cached local-font lister. Fontconfig is fast when present; macOS's
 * system profiler is the dependency-free fallback. Failed attempts are not
 * cached so a later request can recover after the environment changes.
 */
export function createLocalFontLister(
  command: LocalFontCommand = execLocalFontCommand,
  platform: NodeJS.Platform = process.platform,
): () => Promise<string[]> {
  let cached: Promise<string[]> | undefined
  return () => {
    cached ??= (async () => {
      if (platform === 'win32') {
        const families: string[] = []
        for (const key of [
          'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
          'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
        ]) {
          try {
            families.push(...parseWindowsRegistryFontFamilies(await command('reg.exe', ['query', key])))
          } catch {
            // One hive may be absent or inaccessible; keep the other result.
          }
        }
        const windowsFonts = normalizeHostFontFamilies(families)
        if (windowsFonts.length === 0) throw new Error('local font enumeration returned no families')
        return windowsFonts
      }

      try {
        const fontconfig = parseFontconfigFamilies(await command('fc-list', ['--format', '%{family[0]}\n']))
        if (fontconfig.length > 0) return fontconfig
      } catch {
        // macOS has a dependency-free fallback below; Linux reports unavailable.
      }

      if (platform !== 'darwin') throw new Error('local font enumeration returned no families')
      const profiler = parseSystemProfilerFamilies(await command(
        'system_profiler',
        ['SPFontsDataType', '-json', '-detailLevel', 'mini'],
      ))
      if (profiler.length === 0) throw new Error('local font enumeration returned no families')
      return profiler
    })().catch(error => {
      cached = undefined
      throw error
    })
    return cached
  }
}

/** Process-wide cached system font list used by the HTTP route. */
export const listLocalFontFamilies = createLocalFontLister()
