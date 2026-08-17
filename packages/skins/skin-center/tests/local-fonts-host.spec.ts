import { describe, expect, it } from 'vitest'
import {
  createLocalFontLister,
  normalizeHostFontFamilies,
  parseFontconfigFamilies,
  parseSystemProfilerFamilies,
  parseWindowsRegistryFontFamilies,
  type LocalFontCommand,
} from '../src/local-fonts-host.ts'

describe('host local font enumeration', () => {
  it('normalizes, dedupes, sorts and hides private families', () => {
    expect(normalizeHostFontFamilies([
      ' SF Mono ',
      'pingfang  SC',
      'PINGFANG SC',
      '.SF Private',
      '',
      42,
    ])).toEqual(['pingfang SC', 'SF Mono'])
  })

  it('parses fontconfig first-family output', () => {
    expect(parseFontconfigFamilies('YuMincho\nSF Mono\nYuMincho\n')).toEqual(['SF Mono', 'YuMincho'])
  })

  it('parses enabled typeface families from system_profiler JSON', () => {
    expect(parseSystemProfilerFamilies(JSON.stringify({
      SPFontsDataType: [
        { typefaces: [{ enabled: 'yes', family: 'PingFang SC' }, { enabled: 'no', family: 'Disabled' }] },
        { typefaces: [{ family: 'SF Mono' }] },
      ],
    }))).toEqual(['PingFang SC', 'SF Mono'])
  })

  it('parses Windows registry font display names', () => {
    expect(parseWindowsRegistryFontFamilies([
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
      '    Arial (TrueType)    REG_SZ    arial.ttf',
      '    Cascadia Mono (OpenType)    REG_SZ    CascadiaMono.ttf',
    ].join('\r\n'))).toEqual(['Arial', 'Cascadia Mono'])
  })

  it('uses fontconfig when available and caches the result', async () => {
    const calls: string[] = []
    const command: LocalFontCommand = async file => {
      calls.push(file)
      return 'SF Mono\nPingFang SC\n'
    }
    const list = createLocalFontLister(command, 'linux')
    await expect(list()).resolves.toEqual(['PingFang SC', 'SF Mono'])
    await expect(list()).resolves.toEqual(['PingFang SC', 'SF Mono'])
    expect(calls).toEqual(['fc-list'])
  })

  it('falls back to system_profiler when fontconfig is unavailable', async () => {
    const calls: string[] = []
    const command: LocalFontCommand = async file => {
      calls.push(file)
      if (file === 'fc-list') throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      return JSON.stringify({ SPFontsDataType: [{ typefaces: [{ family: 'Menlo' }] }] })
    }
    const list = createLocalFontLister(command, 'darwin')
    await expect(list()).resolves.toEqual(['Menlo'])
    expect(calls).toEqual(['fc-list', 'system_profiler'])
  })

  it('enumerates both Windows font registry hives and caches the result', async () => {
    const calls: string[] = []
    const command: LocalFontCommand = async (file, args) => {
      calls.push(`${file} ${args[1]}`)
      return args[1]?.startsWith('HKLM')
        ? '    Segoe UI (TrueType)    REG_SZ    segoeui.ttf\r\n'
        : '    Cascadia Mono (OpenType)    REG_SZ    CascadiaMono.ttf\r\n'
    }
    const list = createLocalFontLister(command, 'win32')
    await expect(list()).resolves.toEqual(['Cascadia Mono', 'Segoe UI'])
    await expect(list()).resolves.toEqual(['Cascadia Mono', 'Segoe UI'])
    expect(calls).toHaveLength(2)
  })
})
