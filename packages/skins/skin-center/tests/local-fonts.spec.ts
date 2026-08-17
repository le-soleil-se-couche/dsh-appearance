import { describe, expect, it } from 'vitest'
import {
  enumerateLocalFonts,
  normalizeLocalFontFamilies,
  type LocalFontQuery,
} from '../src/client/local-fonts.ts'

describe('local font enumeration', () => {
  it('loads the available family list through an injected query', async () => {
    const query: LocalFontQuery = async () => [
      { family: 'Zebra Sans' },
      { family: 'alpha' },
    ]
    await expect(enumerateLocalFonts(query)).resolves.toEqual({
      status: 'loaded',
      families: ['alpha', 'Zebra Sans'],
    })
  })

  it('falls back to the host list when browser enumeration is empty', async () => {
    const browserQuery: LocalFontQuery = async () => []
    const hostQuery: LocalFontQuery = async () => [
      { family: 'PingFang SC' },
      { family: 'SF Mono' },
    ]
    await expect(enumerateLocalFonts(browserQuery, hostQuery)).resolves.toEqual({
      status: 'loaded',
      families: ['PingFang SC', 'SF Mono'],
    })
  })

  it('dedupes families case-insensitively and sorts locale-aware', () => {
    expect(normalizeLocalFontFamilies([
      { family: ' Zebra  Sans ' },
      { family: 'alpha' },
      { family: 'ALPHA' },
      { family: '' },
      { family: 42 },
    ])).toEqual(['alpha', 'Zebra Sans'])
  })

  it('reports unsupported without attempting a query', async () => {
    await expect(enumerateLocalFonts(undefined, undefined)).resolves.toEqual({ status: 'unsupported', families: [] })
  })

  it('distinguishes a denied Local Font Access request', async () => {
    const query: LocalFontQuery = async () => {
      throw Object.assign(new Error('permission denied'), { name: 'NotAllowedError' })
    }
    await expect(enumerateLocalFonts(query, undefined)).resolves.toEqual({ status: 'denied', families: [] })
  })
})
