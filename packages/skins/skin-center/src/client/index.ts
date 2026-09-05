/** Browser half: a first-class, host-navigated Appearance settings section. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-modules/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { AppearanceRuntime, type AppearanceStorage } from './appearance-runtime.ts'
import { SkinCenter, type SkinCenterInjected } from './SkinCenter.tsx'
import { en, zh, type SkinCenterKey } from './locales.ts'
import { TryOnController } from './try-on.ts'

export type {
  AppearanceConfig,
  AppearanceEditableColorRole,
  AppearanceFonts,
  AppearancePalette,
} from './appearance-config.ts'
export {
  APPEARANCE_FORMAT,
  APPEARANCE_STORAGE_KEY,
  APPEARANCE_TRANSPORT_PREFIX,
  APPEARANCE_VERSION,
  DEFAULT_APPEARANCE_CONFIG,
  AppearanceConfigError,
  deriveAppearanceSurface,
  normalizeAppearanceConfig,
  parseAppearanceConfig,
  parseAppearanceTransport,
  serializeAppearanceConfig,
  serializeAppearanceTransport,
  updateAppearanceColor,
} from './appearance-config.ts'
export { APPEARANCE_BODY_VARIABLES, AppearanceRuntime } from './appearance-runtime.ts'
export type { SkinCenterComponentProps, SkinCenterInjected } from './SkinCenter.tsx'
export { browserLocalFontQuery, enumerateLocalFonts, normalizeLocalFontFamilies } from './local-fonts.ts'
export type { LocalFontEnumeration, LocalFontQuery, LocalFontRecord } from './local-fonts.ts'
export { TryOnController } from './try-on.ts'

/** Locale namespace owned by this plugin. */
export const NS = 'skinCenter'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Appearance page and retained skin controls. */
    skinCenter: SkinCenterKey
  }
}

/** Services used directly by the section. */
export const inject = ['slots', 'locale', 'theme', 'modules']

const browserStorage: AppearanceStorage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => { window.localStorage.setItem(key, value) },
}

/** Register locale, reversible body configuration, and the official section. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-skin-center: dictionaries')

  const appearance = new AppearanceRuntime(document.body, browserStorage)
  const controller = new TryOnController({
    modules: ctx.modules,
    afterRestore: () => { appearance.reapply() },
  })
  ctx.effect(() => () => {
    controller.exit()
    appearance.dispose()
  }, 'ui-skin-center: appearance lifecycle')

  const theme = ctx.theme
  const injected = (): SkinCenterInjected => ({
    controller,
    appearance,
    theme: {
      getTheme: () => theme.getTheme(),
      subscribe: listener => ctx.on('theme/change', listener),
      setTheme: preference => { theme.setTheme(preference) },
    },
  })
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skin-appearance',
    order: 5,
    label: () => t('navLabel'),
    locale: NS,
    inject: injected,
  }, SkinCenter))
}
