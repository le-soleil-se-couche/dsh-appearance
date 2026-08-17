/** Local Font Access enumeration, invoked only from a direct user gesture. */

export interface LocalFontRecord {
  family?: unknown
}

export type LocalFontQuery = () => Promise<Iterable<LocalFontRecord>>

export type LocalFontEnumeration =
  | { status: 'loaded'; families: string[] }
  | { status: 'unsupported' | 'denied' | 'error'; families: [] }

interface LocalFontWindow extends Window {
  queryLocalFonts?: () => Promise<LocalFontRecord[]>
}

interface LocalFontResponse {
  ok?: unknown
  families?: unknown
}

/** Dedupe families case-insensitively and sort them for the active locale. */
export function normalizeLocalFontFamilies(records: Iterable<LocalFontRecord>): string[] {
  const families = new Map<string, string>()
  for (const record of records) {
    if (typeof record.family !== 'string') continue
    const family = record.family.trim().replace(/\s+/g, ' ')
    if (family === '') continue
    const key = family.toLocaleLowerCase()
    if (!families.has(key)) families.set(key, family)
  }
  return [...families.values()].sort((left, right) => left.localeCompare(right, undefined, {
    sensitivity: 'base',
    numeric: true,
  }))
}

/** Resolve the browser API without calling it; permission stays gesture-gated. */
export function browserLocalFontQuery(): LocalFontQuery | undefined {
  if (typeof window === 'undefined') return undefined
  const query = (window as LocalFontWindow).queryLocalFonts
  if (typeof query !== 'function') return undefined
  return () => query.call(window)
}

/** Same-origin host fallback used when browser Local Font Access is empty or unavailable. */
export function hostLocalFontQuery(): LocalFontQuery | undefined {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return undefined
  return async () => {
    const response = await window.fetch('/api/skin-center/fonts', {
      method: 'GET',
      headers: { accept: 'application/json' },
    })
    const payload = await response.json().catch(() => null) as LocalFontResponse | null
    if (!response.ok || payload?.ok !== true || !Array.isArray(payload.families)) {
      throw new Error(`local font endpoint failed with HTTP ${response.status}`)
    }
    return payload.families.map(family => ({ family }))
  }
}

function denied(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) return false
  const name = (error as { name?: unknown }).name
  return name === 'NotAllowedError' || name === 'SecurityError'
}

/**
 * Enumerate through an injectable query. Undefined means unsupported; browser
 * permission rejection is kept distinct from other runtime failures.
 */
export async function enumerateLocalFonts(
  query: LocalFontQuery | undefined = browserLocalFontQuery(),
  fallback: LocalFontQuery | undefined = hostLocalFontQuery(),
): Promise<LocalFontEnumeration> {
  let failure: Exclude<LocalFontEnumeration['status'], 'loaded'> = query === undefined ? 'unsupported' : 'error'
  if (query !== undefined) {
    try {
      const families = normalizeLocalFontFamilies(await query())
      if (families.length > 0) return { status: 'loaded', families }
    } catch (error) {
      failure = denied(error) ? 'denied' : 'error'
    }
  }
  if (fallback !== undefined) {
    try {
      const families = normalizeLocalFontFamilies(await fallback())
      if (families.length > 0) return { status: 'loaded', families }
    } catch {
      // Preserve the more useful primary capability status below.
    }
  }
  return { status: failure, families: [] }
}
