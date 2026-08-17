/**
 * Portable, versioned appearance configuration.
 *
 * This module is deliberately browser-free: parsing, validation and
 * serialization can be tested without DOM or storage. The JSON shape is a
 * public interchange contract, so every object is exact and every value is
 * normalized before it crosses the boundary.
 */

/** Stable format discriminator written into copied/imported JSON. */
export const APPEARANCE_FORMAT = 'dsh-claude-code-appearance' as const

/** Current interchange schema version. Future versions fail closed. */
export const APPEARANCE_VERSION = 2 as const

/** Stable local-first persistence key. */
export const APPEARANCE_STORAGE_KEY = 'dsh-claude-code-appearance' as const

/** Local clipboard/paste envelope. This does not claim Codex interoperability. */
export const APPEARANCE_TRANSPORT_PREFIX = 'dsh-theme-v1:' as const

/** One light or dark palette. */
export interface AppearancePalette {
  accent: string
  canvas: string
  surface: string
  foreground: string
}

/** Requested local font families. Browser fallback remains a CSS concern. */
export interface AppearanceFonts {
  ui: string
  code: string
}

/** Version 2 appearance interchange document. */
export interface AppearanceConfig {
  format: typeof APPEARANCE_FORMAT
  version: typeof APPEARANCE_VERSION
  colors: {
    light: AppearancePalette
    dark: AppearancePalette
  }
  fonts: AppearanceFonts
}

/** Result of decoding local persistence, including whether it needs rewrite. */
export interface StoredAppearanceConfig {
  config: AppearanceConfig
  migrated: boolean
}

/** The three user-editable color roles; surface is always derived. */
export type AppearanceEditableColorRole = 'accent' | 'canvas' | 'foreground'

/** Validation failure categories surfaced by import UI and tests. */
export type AppearanceConfigErrorCode =
  | 'invalid-json'
  | 'invalid-transport'
  | 'invalid-shape'
  | 'invalid-format'
  | 'unsupported-version'
  | 'invalid-color'
  | 'invalid-font'

/** Typed fail-closed parser error. */
export class AppearanceConfigError extends Error {
  constructor(
    readonly code: AppearanceConfigErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AppearanceConfigError'
  }
}

/** Warm, legible defaults used when no valid local document exists. */
export const DEFAULT_APPEARANCE_CONFIG: AppearanceConfig = Object.freeze({
  format: APPEARANCE_FORMAT,
  version: APPEARANCE_VERSION,
  colors: Object.freeze({
    light: Object.freeze({
      accent: '#da7756',
      canvas: '#f5f3ee',
      surface: '#f1eee8',
      foreground: '#1d1b16',
    }),
    dark: Object.freeze({
      accent: '#da7756',
      canvas: '#1d1b16',
      surface: '#262119',
      foreground: '#f5f3ee',
    }),
  }),
  fonts: Object.freeze({
    ui: '思源宋体 VF',
    code: 'SF Mono',
  }),
})

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const FONT_FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} ._+\-]{0,79}$/u

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Require exactly the declared keys; additions need a schema version bump. */
function assertExactKeys(value: unknown, keys: readonly string[], path: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AppearanceConfigError('invalid-shape', `${path} must be an object`)
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new AppearanceConfigError('invalid-shape', `${path} has unexpected or missing fields`)
  }
}

function normalizeColor(value: unknown, path: string): string {
  if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
    throw new AppearanceConfigError('invalid-color', `${path} must be a six-digit hex color`)
  }
  return value.toLowerCase()
}

function normalizeFont(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new AppearanceConfigError('invalid-font', `${path} must be a font family name`)
  }
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!FONT_FAMILY.test(normalized)) {
    throw new AppearanceConfigError('invalid-font', `${path} contains unsupported characters or is too long`)
  }
  return normalized
}

function channel(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(offset, offset + 2), 16)
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
}

/**
 * Derive a warm raised surface from background and foreground only.
 * Light canvases move slightly toward foreground with a cooler depth bias;
 * dark canvases use a warmer red-weighted lift. The established Claude Code
 * defaults therefore resolve exactly to #f1eee8 and #262119.
 */
export function deriveAppearanceSurface(canvasValue: unknown, foregroundValue: unknown): string {
  const canvas = normalizeColor(canvasValue, 'canvas')
  const foreground = normalizeColor(foregroundValue, 'foreground')
  const backgroundChannels = [channel(canvas, 1), channel(canvas, 3), channel(canvas, 5)]
  const foregroundChannels = [channel(foreground, 1), channel(foreground, 3), channel(foreground, 5)]
  const lightCanvas = backgroundChannels.reduce((sum, value) => sum + value, 0)
    >= foregroundChannels.reduce((sum, value) => sum + value, 0)
  const weights = lightCanvas ? [0.02, 0.025, 0.03] : [0.04, 0.03, 0.015]
  return `#${backgroundChannels.map((value, index) => (
    toHex(value + (foregroundChannels[index]! - value) * weights[index]!)
  )).join('')}`
}

function normalizePalette(value: unknown, path: string): AppearancePalette {
  assertExactKeys(value, ['accent', 'canvas', 'surface', 'foreground'], path)
  const accent = normalizeColor(value.accent, `${path}.accent`)
  const canvas = normalizeColor(value.canvas, `${path}.canvas`)
  const foreground = normalizeColor(value.foreground, `${path}.foreground`)
  const surface = normalizeColor(value.surface, `${path}.surface`)
  const expectedSurface = deriveAppearanceSurface(canvas, foreground)
  if (surface !== expectedSurface) {
    throw new AppearanceConfigError(
      'invalid-color',
      `${path}.surface must be ${expectedSurface}, derived from canvas and foreground`,
    )
  }
  return {
    accent,
    canvas,
    surface,
    foreground,
  }
}

interface LegacyPaletteMigration {
  palette: AppearancePalette
  changed: boolean
}

/**
 * Normalize the early version 2 palette where surface was independently
 * editable. Its field set is otherwise identical to the current contract.
 */
function migrateLegacyPalette(value: unknown, path: string): LegacyPaletteMigration {
  assertExactKeys(value, ['accent', 'canvas', 'surface', 'foreground'], path)
  const accent = normalizeColor(value.accent, `${path}.accent`)
  const canvas = normalizeColor(value.canvas, `${path}.canvas`)
  const foreground = normalizeColor(value.foreground, `${path}.foreground`)
  const legacySurface = normalizeColor(value.surface, `${path}.surface`)
  const surface = deriveAppearanceSurface(canvas, foreground)
  return {
    palette: { accent, canvas, surface, foreground },
    changed: legacySurface !== surface,
  }
}

/**
 * Validate and normalize an already-decoded candidate.
 * @param value - untrusted decoded JSON value.
 * @returns a fresh canonical version 2 config.
 */
export function normalizeAppearanceConfig(value: unknown): AppearanceConfig {
  if (!isRecord(value)) {
    throw new AppearanceConfigError('invalid-shape', 'appearance config must be an object')
  }
  if (value.format !== APPEARANCE_FORMAT) {
    throw new AppearanceConfigError('invalid-format', `format must be ${APPEARANCE_FORMAT}`)
  }
  if (value.version !== APPEARANCE_VERSION) {
    throw new AppearanceConfigError(
      'unsupported-version',
      `version ${String(value.version)} is not supported; expected ${APPEARANCE_VERSION}`,
    )
  }

  assertExactKeys(value, ['format', 'version', 'colors', 'fonts'], 'appearance config')
  assertExactKeys(value.colors, ['light', 'dark'], 'colors')
  assertExactKeys(value.fonts, ['ui', 'code'], 'fonts')

  return {
    format: APPEARANCE_FORMAT,
    version: APPEARANCE_VERSION,
    colors: {
      light: normalizePalette(value.colors.light, 'colors.light'),
      dark: normalizePalette(value.colors.dark, 'colors.dark'),
    },
    fonts: {
      ui: normalizeFont(value.fonts.ui, 'fonts.ui'),
      code: normalizeFont(value.fonts.code, 'fonts.code'),
    },
  }
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
export function migrateLegacyAppearanceConfig(value: unknown): AppearanceConfig | null {
  try {
    assertExactKeys(value, ['format', 'version', 'colors', 'fonts'], 'appearance config')
    if (value.format !== APPEARANCE_FORMAT || value.version !== APPEARANCE_VERSION) return null
    assertExactKeys(value.colors, ['light', 'dark'], 'colors')
    assertExactKeys(value.fonts, ['ui', 'code'], 'fonts')

    const light = migrateLegacyPalette(value.colors.light, 'colors.light')
    const dark = migrateLegacyPalette(value.colors.dark, 'colors.dark')
    if (!light.changed && !dark.changed) return null

    return normalizeAppearanceConfig({
      format: APPEARANCE_FORMAT,
      version: APPEARANCE_VERSION,
      colors: {
        light: light.palette,
        dark: dark.palette,
      },
      fonts: {
        ui: normalizeFont(value.fonts.ui, 'fonts.ui'),
        code: normalizeFont(value.fonts.code, 'fonts.code'),
      },
    })
  } catch (error) {
    if (error instanceof AppearanceConfigError) return null
    throw error
  }
}

/** Decode local persistence, migrating only the recognized legacy document. */
export function parseStoredAppearanceConfig(text: string): StoredAppearanceConfig {
  let decoded: unknown
  try {
    decoded = JSON.parse(text) as unknown
  } catch {
    throw new AppearanceConfigError('invalid-json', 'appearance config is not valid JSON')
  }

  try {
    return { config: normalizeAppearanceConfig(decoded), migrated: false }
  } catch (error) {
    if (!(error instanceof AppearanceConfigError)) throw error
    const migrated = migrateLegacyAppearanceConfig(decoded)
    if (migrated === null) throw error
    return { config: migrated, migrated: true }
  }
}

/** Parse untrusted JSON and fail closed on any schema or value mismatch. */
export function parseAppearanceConfig(text: string): AppearanceConfig {
  let decoded: unknown
  try {
    decoded = JSON.parse(text) as unknown
  } catch {
    throw new AppearanceConfigError('invalid-json', 'appearance config is not valid JSON')
  }
  return normalizeAppearanceConfig(decoded)
}

/** Serialize in stable field order with canonical two-space indentation. */
export function serializeAppearanceConfig(value: unknown): string {
  return JSON.stringify(normalizeAppearanceConfig(value), null, 2)
}

/** Parse the local clipboard/paste envelope used by both page actions. */
export function parseAppearanceTransport(text: string): AppearanceConfig {
  const transport = text.trim()
  if (!transport.startsWith(APPEARANCE_TRANSPORT_PREFIX)) {
    throw new AppearanceConfigError(
      'invalid-transport',
      `appearance transport must start with ${APPEARANCE_TRANSPORT_PREFIX}`,
    )
  }
  return parseAppearanceConfig(transport.slice(APPEARANCE_TRANSPORT_PREFIX.length))
}

/** Serialize the exact string Copy emits and Import accepts. */
export function serializeAppearanceTransport(value: unknown): string {
  return `${APPEARANCE_TRANSPORT_PREFIX}${JSON.stringify(normalizeAppearanceConfig(value))}`
}

/**
 * Atomically validate one editable color and re-derive the hidden surface.
 * The input config is never mutated.
 */
export function updateAppearanceColor(
  value: unknown,
  mode: keyof AppearanceConfig['colors'],
  role: AppearanceEditableColorRole,
  colorValue: unknown,
): AppearanceConfig {
  const current = normalizeAppearanceConfig(value)
  const color = normalizeColor(colorValue, `colors.${mode}.${role}`)
  const palette = { ...current.colors[mode], [role]: color }
  palette.surface = deriveAppearanceSurface(palette.canvas, palette.foreground)
  return normalizeAppearanceConfig({
    ...current,
    colors: { ...current.colors, [mode]: palette },
  })
}
