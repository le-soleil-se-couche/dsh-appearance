/** DOM and localStorage lifecycle for the appearance configuration. */

import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_CONFIG,
  AppearanceConfigError,
  normalizeAppearanceConfig,
  parseStoredAppearanceConfig,
  parseAppearanceTransport,
  serializeAppearanceConfig,
  type AppearanceConfig,
} from './appearance-config.ts'

/** The only body CSS variables this plugin is allowed to write. */
export const APPEARANCE_BODY_VARIABLES = [
  '--dsh-appearance-ui-font',
  '--dsh-appearance-code-font',
  '--dsh-appearance-light-accent',
  '--dsh-appearance-light-canvas',
  '--dsh-appearance-light-surface',
  '--dsh-appearance-light-foreground',
  '--dsh-appearance-dark-accent',
  '--dsh-appearance-dark-canvas',
  '--dsh-appearance-dark-surface',
  '--dsh-appearance-dark-foreground',
] as const

export type AppearanceBodyVariable = (typeof APPEARANCE_BODY_VARIABLES)[number]

/** Minimal storage surface, injectable for deterministic tests. */
export interface AppearanceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type AppearanceInitialIssue = 'invalid-stored-config' | 'storage-unavailable' | null

interface PreviousVariable {
  value: string | null
  priority: string
}

function cloneDefault(): AppearanceConfig {
  return normalizeAppearanceConfig(DEFAULT_APPEARANCE_CONFIG)
}

/**
 * Own the private body variables and local persistence as one reversible unit.
 * Invalid imports are parsed before storage, state or DOM is touched.
 */
export class AppearanceRuntime {
  private config: AppearanceConfig
  private readonly previous = new Map<AppearanceBodyVariable, PreviousVariable>()
  private disposed = false
  readonly initialIssue: AppearanceInitialIssue

  constructor(
    private readonly body: HTMLElement,
    private readonly storage: AppearanceStorage,
  ) {
    for (const variable of APPEARANCE_BODY_VARIABLES) {
      const value = body.style.getPropertyValue(variable)
      this.previous.set(variable, {
        value: value === '' ? null : value,
        priority: body.style.getPropertyPriority(variable),
      })
    }

    let config = cloneDefault()
    let issue: AppearanceInitialIssue = null
    try {
      const stored = storage.getItem(APPEARANCE_STORAGE_KEY)
      if (stored !== null) {
        try {
          const loaded = parseStoredAppearanceConfig(stored)
          config = loaded.config
          if (loaded.migrated) {
            storage.setItem(APPEARANCE_STORAGE_KEY, serializeAppearanceConfig(config))
          }
        } catch (error) {
          if (!(error instanceof AppearanceConfigError)) throw error
          issue = 'invalid-stored-config'
        }
      }
    } catch {
      issue = 'storage-unavailable'
    }
    this.config = config
    this.initialIssue = issue
    this.applyVariables(config)
  }

  /** Current immutable-by-convention config snapshot. */
  getConfig(): AppearanceConfig {
    return this.config
  }

  /** Validate, persist canonically, then publish to state and the live body. */
  update(value: unknown): AppearanceConfig {
    this.assertLive()
    const config = normalizeAppearanceConfig(value)
    const canonical = serializeAppearanceConfig(config)
    this.storage.setItem(APPEARANCE_STORAGE_KEY, canonical)
    this.config = config
    this.applyVariables(config)
    return config
  }

  /** Parse first, so rejected imports leave storage, state and DOM untouched. */
  import(text: string): AppearanceConfig {
    this.assertLive()
    const config = parseAppearanceTransport(text)
    return this.update(config)
  }

  /** Re-assert the current variables after a skin try-on restores body style. */
  reapply(): void {
    if (!this.disposed) this.applyVariables(this.config)
  }

  /** Restore every exact pre-plugin inline value. Skin attributes are never owned here. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const variable of APPEARANCE_BODY_VARIABLES) {
      const previous = this.previous.get(variable)
      if (previous?.value === null || previous === undefined) {
        this.body.style.removeProperty(variable)
      } else {
        this.body.style.setProperty(variable, previous.value, previous.priority)
      }
    }
  }

  private assertLive(): void {
    if (this.disposed) throw new Error('appearance runtime is disposed')
  }

  private applyVariables(config: AppearanceConfig): void {
    const values: Record<AppearanceBodyVariable, string> = {
      '--dsh-appearance-ui-font': config.fonts.ui,
      '--dsh-appearance-code-font': config.fonts.code,
      '--dsh-appearance-light-accent': config.colors.light.accent,
      '--dsh-appearance-light-canvas': config.colors.light.canvas,
      '--dsh-appearance-light-surface': config.colors.light.surface,
      '--dsh-appearance-light-foreground': config.colors.light.foreground,
      '--dsh-appearance-dark-accent': config.colors.dark.accent,
      '--dsh-appearance-dark-canvas': config.colors.dark.canvas,
      '--dsh-appearance-dark-surface': config.colors.dark.surface,
      '--dsh-appearance-dark-foreground': config.colors.dark.foreground,
    }
    for (const variable of APPEARANCE_BODY_VARIABLES) {
      this.body.style.setProperty(variable, values[variable])
    }
  }
}
