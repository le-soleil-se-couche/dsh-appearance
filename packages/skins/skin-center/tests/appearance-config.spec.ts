// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  APPEARANCE_FORMAT,
  APPEARANCE_STORAGE_KEY,
  APPEARANCE_TRANSPORT_PREFIX,
  APPEARANCE_VERSION,
  AppearanceConfigError,
  DEFAULT_APPEARANCE_CONFIG,
  deriveAppearanceSurface,
  migrateLegacyAppearanceConfig,
  parseAppearanceConfig,
  parseStoredAppearanceConfig,
  parseAppearanceTransport,
  serializeAppearanceConfig,
  serializeAppearanceTransport,
  updateAppearanceColor,
} from '../src/client/appearance-config.ts'
import { APPEARANCE_BODY_VARIABLES, AppearanceRuntime, type AppearanceStorage } from '../src/client/appearance-runtime.ts'

class MemoryStorage implements AppearanceStorage {
  readonly values = new Map<string, string>()
  writes = 0

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.writes += 1
    this.values.set(key, value)
  }
}

beforeEach(() => {
  document.body.removeAttribute('style')
  document.body.removeAttribute('data-dsh-claude-code')
  document.body.removeAttribute('data-dsh-ewin-warm')
})

function legacyAppearanceConfig(): Record<string, unknown> {
  return {
    format: APPEARANCE_FORMAT,
    version: APPEARANCE_VERSION,
    colors: {
      light: { accent: '#DA7756', canvas: '#F5F3EE', surface: '#ECE8E0', foreground: '#1D1B16' },
      dark: { accent: '#DA7756', canvas: '#1D1B16', surface: '#2E2820', foreground: '#F5F3EE' },
    },
    fonts: { ui: '  思源宋体   VF ', code: 'SF Mono' },
  }
}

describe('appearance config format', () => {
  it('matches the Claude Code skin fallback palette and font defaults', () => {
    expect(DEFAULT_APPEARANCE_CONFIG).toEqual({
      format: 'dsh-claude-code-appearance',
      version: 2,
      colors: {
        light: { accent: '#da7756', canvas: '#f5f3ee', surface: '#f1eee8', foreground: '#1d1b16' },
        dark: { accent: '#da7756', canvas: '#1d1b16', surface: '#262119', foreground: '#f5f3ee' },
      },
      fonts: { ui: '思源宋体 VF', code: 'SF Mono' },
    })
  })

  it('round-trips through canonical two-space JSON and normalization', () => {
    const source = {
      format: APPEARANCE_FORMAT,
      version: APPEARANCE_VERSION,
      colors: {
        light: { accent: '#DA7756', canvas: '#F5F3EE', surface: '#F1EEE8', foreground: '#1D1B16' },
        dark: { accent: '#DA7756', canvas: '#1D1B16', surface: '#262119', foreground: '#F5F3EE' },
      },
      fonts: { ui: '  思源宋体   VF ', code: 'SF Mono' },
    }
    const canonical = serializeAppearanceConfig(source)
    expect(canonical).toContain('\n  "format": "dsh-claude-code-appearance"')
    expect(canonical).toContain('"accent": "#da7756"')
    expect(canonical).toContain('"ui": "思源宋体 VF"')
    expect(parseAppearanceConfig(canonical)).toEqual(JSON.parse(canonical))
    expect(serializeAppearanceConfig(parseAppearanceConfig(canonical))).toBe(canonical)
  })

  it('migrates the early version 2 editable surfaces without mutating the source', () => {
    const legacy = legacyAppearanceConfig()
    const before = JSON.stringify(legacy)
    const migrated = migrateLegacyAppearanceConfig(legacy)

    expect(migrated).not.toBeNull()
    expect(migrated?.colors.light.surface).toBe(deriveAppearanceSurface('#f5f3ee', '#1d1b16'))
    expect(migrated?.colors.dark.surface).toBe(deriveAppearanceSurface('#1d1b16', '#f5f3ee'))
    expect(migrated?.colors.light.accent).toBe('#da7756')
    expect(migrated?.fonts.ui).toBe('思源宋体 VF')
    expect(JSON.stringify(legacy)).toBe(before)
    expect(() => { parseAppearanceConfig(before) }).toThrowError(/surface must be/)
  })

  it('round-trips migrated storage into strict current storage without a second migration', () => {
    const loaded = parseStoredAppearanceConfig(JSON.stringify(legacyAppearanceConfig()))
    expect(loaded.migrated).toBe(true)

    const canonical = serializeAppearanceConfig(loaded.config)
    expect(parseAppearanceConfig(canonical)).toEqual(loaded.config)
    expect(parseStoredAppearanceConfig(canonical)).toEqual({ config: loaded.config, migrated: false })
  })

  it('does not classify unknown or damaged documents as legacy', () => {
    const legacy = legacyAppearanceConfig()
    const candidates = [
      { ...legacy, version: 99 },
      { ...legacy, unknown: true },
      {
        ...legacy,
        colors: {
          ...(legacy.colors as Record<string, unknown>),
          light: { accent: '#da7756', canvas: '#f5f3ee', surface: 'transparent', foreground: '#1d1b16' },
        },
      },
    ]
    for (const candidate of candidates) {
      expect(migrateLegacyAppearanceConfig(candidate)).toBeNull()
    }
  })

  it('round-trips the exact Copy/Import transport string', () => {
    const transport = serializeAppearanceTransport(DEFAULT_APPEARANCE_CONFIG)
    expect(transport.startsWith(APPEARANCE_TRANSPORT_PREFIX)).toBe(true)
    expect(transport).not.toContain('\n')
    expect(serializeAppearanceTransport(parseAppearanceTransport(transport))).toBe(transport)
    expect(() => { parseAppearanceTransport(serializeAppearanceConfig(DEFAULT_APPEARANCE_CONFIG)) })
      .toThrowError(/must start with dsh-theme-v1:/)
  })

  it('derives warm surfaces deterministically from background and foreground', () => {
    expect(deriveAppearanceSurface('#f5f3ee', '#1d1b16')).toBe('#f1eee8')
    expect(deriveAppearanceSurface('#1d1b16', '#f5f3ee')).toBe('#262119')
    const updated = updateAppearanceColor(DEFAULT_APPEARANCE_CONFIG, 'light', 'canvas', '#ffffff')
    expect(updated.colors.light.surface).toBe(deriveAppearanceSurface('#ffffff', '#1d1b16'))
  })

  it('rejects incomplete text colors without mutating the input config', () => {
    const before = serializeAppearanceConfig(DEFAULT_APPEARANCE_CONFIG)
    expect(() => {
      updateAppearanceColor(DEFAULT_APPEARANCE_CONFIG, 'light', 'accent', '#12345')
    }).toThrowError(/six-digit hex color/)
    expect(serializeAppearanceConfig(DEFAULT_APPEARANCE_CONFIG)).toBe(before)
  })

  it('rejects unknown future versions', () => {
    const future = { ...DEFAULT_APPEARANCE_CONFIG, version: 3 }
    expect(() => { parseAppearanceConfig(JSON.stringify(future)) }).toThrowError(AppearanceConfigError)
    try {
      parseAppearanceConfig(JSON.stringify(future))
    } catch (error) {
      expect((error as AppearanceConfigError).code).toBe('unsupported-version')
    }
  })

  it('rejects invalid values and unknown fields', () => {
    const invalidColor = {
      ...DEFAULT_APPEARANCE_CONFIG,
      colors: {
        ...DEFAULT_APPEARANCE_CONFIG.colors,
        light: { ...DEFAULT_APPEARANCE_CONFIG.colors.light, accent: 'tomato' },
      },
    }
    const extraField = { ...DEFAULT_APPEARANCE_CONFIG, surprise: true }
    expect(() => { parseAppearanceConfig(JSON.stringify(invalidColor)) }).toThrowError(/six-digit hex color/)
    expect(() => { parseAppearanceConfig(JSON.stringify(extraField)) }).toThrowError(/unexpected or missing fields/)
  })
})

describe('appearance runtime atomicity and restoration', () => {
  it('migrates recognized saved storage once and persists canonical current JSON', () => {
    const storage = new MemoryStorage()
    const raw = JSON.stringify(legacyAppearanceConfig())
    storage.values.set(APPEARANCE_STORAGE_KEY, raw)

    const runtime = new AppearanceRuntime(document.body, storage)
    const config = runtime.getConfig()

    expect(runtime.initialIssue).toBeNull()
    expect(storage.writes).toBe(1)
    expect(storage.getItem(APPEARANCE_STORAGE_KEY)).toBe(serializeAppearanceConfig(config))
    expect(config.colors.light.surface).toBe(deriveAppearanceSurface(config.colors.light.canvas, config.colors.light.foreground))
    expect(document.body.style.getPropertyValue('--dsh-appearance-light-surface')).toBe(config.colors.light.surface)
  })

  it('leaves unknown invalid saved storage byte-for-byte untouched', () => {
    const invalidDocuments = [
      '{not-json',
      JSON.stringify({ ...legacyAppearanceConfig(), version: 99 }),
      JSON.stringify({ ...legacyAppearanceConfig(), unknown: true }),
    ]

    for (const raw of invalidDocuments) {
      document.body.removeAttribute('style')
      const storage = new MemoryStorage()
      storage.values.set(APPEARANCE_STORAGE_KEY, raw)

      const runtime = new AppearanceRuntime(document.body, storage)
      expect(runtime.initialIssue).toBe('invalid-stored-config')
      expect(runtime.getConfig()).toEqual(DEFAULT_APPEARANCE_CONFIG)
      expect(storage.writes).toBe(0)
      expect(storage.getItem(APPEARANCE_STORAGE_KEY)).toBe(raw)
      runtime.dispose()
    }
  })

  it('loads canonical current storage without rewriting it', () => {
    const storage = new MemoryStorage()
    const canonical = serializeAppearanceConfig(DEFAULT_APPEARANCE_CONFIG)
    storage.values.set(APPEARANCE_STORAGE_KEY, canonical)

    const runtime = new AppearanceRuntime(document.body, storage)
    expect(runtime.initialIssue).toBeNull()
    expect(runtime.getConfig()).toEqual(DEFAULT_APPEARANCE_CONFIG)
    expect(storage.writes).toBe(0)
    expect(storage.getItem(APPEARANCE_STORAGE_KEY)).toBe(canonical)
  })

  it('accepts the exact copied transport and persists canonical JSON', () => {
    const storage = new MemoryStorage()
    const runtime = new AppearanceRuntime(document.body, storage)
    const candidate = updateAppearanceColor(DEFAULT_APPEARANCE_CONFIG, 'dark', 'accent', '#abcdef')
    const transport = serializeAppearanceTransport(candidate)

    expect(runtime.import(transport)).toEqual(candidate)
    expect(storage.getItem(APPEARANCE_STORAGE_KEY)).toBe(serializeAppearanceConfig(candidate))
    expect(document.body.style.getPropertyValue('--dsh-appearance-dark-accent')).toBe('#abcdef')
  })

  it('does not change current state, storage, or body variables for a rejected import', () => {
    const storage = new MemoryStorage()
    const runtime = new AppearanceRuntime(document.body, storage)
    const before = runtime.getConfig()
    const bodyBefore = APPEARANCE_BODY_VARIABLES.map(name => document.body.style.getPropertyValue(name))

    const invalid = `${APPEARANCE_TRANSPORT_PREFIX}${JSON.stringify({ ...DEFAULT_APPEARANCE_CONFIG, version: 99 })}`
    expect(() => { runtime.import(invalid) }).toThrowError(AppearanceConfigError)
    expect(runtime.getConfig()).toBe(before)
    expect(storage.writes).toBe(0)
    expect(storage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull()
    expect(APPEARANCE_BODY_VARIABLES.map(name => document.body.style.getPropertyValue(name))).toEqual(bodyBefore)
  })

  it('restores pre-existing private variables without owning supported skin attributes', () => {
    const storage = new MemoryStorage()
    document.body.setAttribute('data-dsh-claude-code', 'existing')
    document.body.setAttribute('data-dsh-ewin-warm', 'existing')
    document.body.style.setProperty('--dsh-appearance-ui-font', 'Existing UI', 'important')
    document.body.style.setProperty('--dsh-appearance-dark-canvas', '#010203')

    const runtime = new AppearanceRuntime(document.body, storage)
    expect(document.body.getAttribute('data-dsh-claude-code')).toBe('existing')
    expect(document.body.getAttribute('data-dsh-ewin-warm')).toBe('existing')
    expect(document.body.style.getPropertyValue('--dsh-appearance-ui-font')).toBe('思源宋体 VF')
    expect(document.body.style.getPropertyValue('--dsh-appearance-light-accent')).toBe('#da7756')

    runtime.dispose()
    expect(document.body.getAttribute('data-dsh-claude-code')).toBe('existing')
    expect(document.body.getAttribute('data-dsh-ewin-warm')).toBe('existing')
    expect(document.body.style.getPropertyValue('--dsh-appearance-ui-font')).toBe('Existing UI')
    expect(document.body.style.getPropertyPriority('--dsh-appearance-ui-font')).toBe('important')
    expect(document.body.style.getPropertyValue('--dsh-appearance-dark-canvas')).toBe('#010203')
    expect(document.body.style.getPropertyValue('--dsh-appearance-light-accent')).toBe('')
  })

  it('never creates or removes supported skin attributes', () => {
    const runtime = new AppearanceRuntime(document.body, new MemoryStorage())
    expect(document.body.hasAttribute('data-dsh-claude-code')).toBe(false)
    expect(document.body.hasAttribute('data-dsh-ewin-warm')).toBe(false)
    runtime.dispose()
    expect(document.body.hasAttribute('data-dsh-claude-code')).toBe(false)
    expect(document.body.hasAttribute('data-dsh-ewin-warm')).toBe(false)
  })
})
