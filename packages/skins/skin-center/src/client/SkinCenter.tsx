/** First-class Appearance settings section for the DeepSeek Harness UI. */

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  Button,
  IconChevronDownOutline14,
  IconCopyOutline16,
  IconDarkOutline16,
  IconDownloadOutline16,
  IconFollowsystemOutline16,
  IconLightOutline16,
  Modal,
  writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ThemePreference } from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  APPEARANCE_TRANSPORT_PREFIX,
  AppearanceConfigError,
  normalizeAppearanceConfig,
  serializeAppearanceTransport,
  updateAppearanceColor,
  type AppearanceConfig,
  type AppearanceEditableColorRole,
} from './appearance-config.ts'
import { AppearanceRuntime } from './appearance-runtime.ts'
import { enumerateLocalFonts, type LocalFontEnumeration } from './local-fonts.ts'
import { handleNestedDialogKeyDown } from './modal-keyboard.ts'
import { SKIN_CENTER_ENTRIES, type SkinCenterEntry } from './generated/skins.ts'
import { activeSkinEntry, TryOnController } from './try-on.ts'
import css from './skin-center.module.css'

/** Business face injected into the section registration. */
export interface SkinCenterInjected {
  controller: TryOnController
  appearance: AppearanceRuntime
  theme: {
    getTheme(): { preference: ThemePreference; active: { colorScheme: 'light' | 'dark' } }
    subscribe(listener: () => void): () => void
    setTheme(id: ThemePreference): void
  }
}

/** Full official settings-section props plus this feature's locale and face. */
export type SkinCenterComponentProps =
  PropsRuntime<'settings.section'> & PropsLocale<'skinCenter'> & SkinCenterInjected

const OFFICIAL = 'official'
type PaletteMode = 'light' | 'dark'
type ColorRole = AppearanceEditableColorRole
type FontRole = keyof AppearanceConfig['fonts']
type Notice = { kind: 'success' | 'error'; text: string } | null
type LocalFontLoadState = { status: 'idle' | 'loading'; families: [] } | LocalFontEnumeration
type ColorDrafts = Record<PaletteMode, Record<ColorRole, string>>
type ColorErrors = Record<PaletteMode, Record<ColorRole, boolean>>

const THEME_OPTIONS: ReadonlyArray<{
  id: ThemePreference
  label: 'themeLight' | 'themeDark' | 'themeSystem'
  Icon: typeof IconLightOutline16
}> = [
  { id: 'system', label: 'themeSystem', Icon: IconFollowsystemOutline16 },
  { id: 'light', label: 'themeLight', Icon: IconLightOutline16 },
  { id: 'dark', label: 'themeDark', Icon: IconDarkOutline16 },
]

const COLOR_ROLES: ReadonlyArray<{ role: ColorRole; label: 'accent' | 'background' | 'foreground' }> = [
  { role: 'accent', label: 'accent' },
  { role: 'canvas', label: 'background' },
  { role: 'foreground', label: 'foreground' },
]

function colorDrafts(config: AppearanceConfig): ColorDrafts {
  return {
    light: {
      accent: config.colors.light.accent,
      canvas: config.colors.light.canvas,
      foreground: config.colors.light.foreground,
    },
    dark: {
      accent: config.colors.dark.accent,
      canvas: config.colors.dark.canvas,
      foreground: config.colors.dark.foreground,
    },
  }
}

function emptyColorErrors(): ColorErrors {
  return {
    light: { accent: false, canvas: false, foreground: false },
    dark: { accent: false, canvas: false, foreground: false },
  }
}

/** Render the complete Appearance page; host settings owns navigation/chrome. */
export function SkinCenter({ t, controller, appearance, theme }: SkinCenterComponentProps): ReactNode {
  const themeSnapshot = useSyncExternalStore(theme.subscribe, theme.getTheme)
  const [config, setConfig] = useState<AppearanceConfig>(() => appearance.getConfig())
  const [colorDraftValues, setColorDraftValues] = useState<ColorDrafts>(() => colorDrafts(appearance.getConfig()))
  const [colorErrors, setColorErrors] = useState<ColorErrors>(emptyColorErrors)
  const [fontDrafts, setFontDrafts] = useState(() => ({ ...appearance.getConfig().fonts }))
  const [fontErrors, setFontErrors] = useState<Record<FontRole, boolean>>({ ui: false, code: false })
  const [fontList, setFontList] = useState<LocalFontLoadState>({ status: 'idle', families: [] })
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [otherSkinsOpen, setOtherSkinsOpen] = useState(false)
  const [tryingId, setTryingId] = useState<string | null>(null)
  const [tryingOfficial, setTryingOfficial] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [skinError, setSkinError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(() => {
    if (appearance.initialIssue === 'invalid-stored-config') return { kind: 'error', text: t('storedInvalid') }
    if (appearance.initialIssue === 'storage-unavailable') return { kind: 'error', text: t('storageUnavailable') }
    return null
  })
  const fontLoadGeneration = useRef(0)
  const fontLoadStarted = useRef(false)
  const headerActionsRef = useRef<HTMLDivElement>(null)
  const importWasOpen = useRef(false)

  useEffect(() => () => { fontLoadGeneration.current += 1 }, [])

  useEffect(() => {
    if (!importOpen) return
    const onKeyDown = (event: KeyboardEvent): void => {
      handleNestedDialogKeyDown(
        event,
        document.querySelector<HTMLElement>(`.${css.importModal}`),
        () => {
          setImportOpen(false)
          setImportError(null)
        },
      )
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => { document.removeEventListener('keydown', onKeyDown, true) }
  }, [importOpen])

  useEffect(() => {
    if (importWasOpen.current && !importOpen) {
      headerActionsRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    }
    importWasOpen.current = importOpen
  }, [importOpen])

  const editableMode: PaletteMode = themeSnapshot.preference === 'system'
    ? themeSnapshot.active.colorScheme
    : themeSnapshot.preference
  const activePackage = activeSkinEntry()?.package

  const publish = (candidate: AppearanceConfig): boolean => {
    try {
      const next = appearance.update(candidate)
      setConfig(next)
      return true
    } catch {
      setNotice({ kind: 'error', text: t('saveFailed') })
      return false
    }
  }

  const setColorError = (mode: PaletteMode, role: ColorRole, invalid: boolean): void => {
    setColorErrors(current => ({
      ...current,
      [mode]: { ...current[mode], [role]: invalid },
    }))
  }

  const commitColor = (mode: PaletteMode, role: ColorRole, value: string, normalizeDraft: boolean): void => {
    let next: AppearanceConfig
    try {
      next = updateAppearanceColor(appearance.getConfig(), mode, role, value)
    } catch {
      setColorError(mode, role, true)
      return
    }
    setColorError(mode, role, false)
    if (publish(next)) {
      if (normalizeDraft) {
        setColorDraftValues(current => ({
          ...current,
          [mode]: { ...current[mode], [role]: next.colors[mode][role] },
        }))
      }
      setNotice(null)
    }
  }

  const updateColorText = (mode: PaletteMode, role: ColorRole, value: string): void => {
    setColorDraftValues(current => ({
      ...current,
      [mode]: { ...current[mode], [role]: value },
    }))
    commitColor(mode, role, value, false)
  }

  const updateColorPicker = (mode: PaletteMode, role: ColorRole, value: string): void => {
    setColorDraftValues(current => ({
      ...current,
      [mode]: { ...current[mode], [role]: value },
    }))
    commitColor(mode, role, value, true)
  }

  const normalizeColorDraft = (mode: PaletteMode, role: ColorRole): void => {
    setColorDraftValues(current => ({
      ...current,
      [mode]: { ...current[mode], [role]: config.colors[mode][role] },
    }))
    setColorError(mode, role, false)
  }

  const updateFont = (role: FontRole, value: string): void => {
    setFontDrafts(current => ({ ...current, [role]: value }))
    const current = appearance.getConfig()
    const candidate: AppearanceConfig = { ...current, fonts: { ...current.fonts, [role]: value } }
    try {
      normalizeAppearanceConfig(candidate)
      setFontErrors(current => ({ ...current, [role]: false }))
    } catch {
      setFontErrors(current => ({ ...current, [role]: true }))
      return
    }
    if (publish(candidate)) setNotice(null)
  }

  const normalizeFontDraft = (role: FontRole): void => {
    setFontDrafts(current => ({ ...current, [role]: appearance.getConfig().fonts[role] }))
    setFontErrors(current => ({ ...current, [role]: false }))
  }

  const fontListStatusText = (): string => {
    if (fontList.status === 'idle') return t('fontListIdle')
    if (fontList.status === 'loading') return t('fontListLoading')
    if (fontList.status === 'loaded') return t('fontListLoaded')
    if (fontList.status === 'unsupported') return t('fontListUnsupported')
    if (fontList.status === 'denied') return t('fontListDenied')
    return t('fontListError')
  }

  const loadLocalFonts = (): void => {
    if (fontLoadStarted.current) return
    fontLoadStarted.current = true
    const generation = ++fontLoadGeneration.current
    setFontList({ status: 'loading', families: [] })
    void enumerateLocalFonts().then(result => {
      if (fontLoadGeneration.current === generation) {
        setFontList(result)
        if (result.status !== 'loaded') fontLoadStarted.current = false
      }
    })
  }

  const selectTheme = (preference: ThemePreference): void => {
    try {
      theme.setTheme(preference)
      setNotice(null)
    } catch {
      setNotice({ kind: 'error', text: t('themeFailed') })
    }
  }

  const copyConfig = (): void => {
    void writeClipboard(serializeAppearanceTransport(config))
      .then(ok => {
        setNotice({ kind: ok ? 'success' : 'error', text: t(ok ? 'copySuccess' : 'copyFailed') })
      })
      .catch(() => { setNotice({ kind: 'error', text: t('copyFailed') }) })
  }

  const openImport = (): void => {
    setImportText('')
    setImportError(null)
    setImportOpen(true)
  }

  const closeImport = (): void => {
    setImportOpen(false)
    setImportError(null)
  }

  const importConfig = (): void => {
    try {
      const next = appearance.import(importText)
      setConfig(next)
      setColorDraftValues(colorDrafts(next))
      setColorErrors(emptyColorErrors())
      setFontDrafts({ ...next.fonts })
      setFontErrors({ ui: false, code: false })
      setNotice({ kind: 'success', text: t('importSuccess') })
      setImportOpen(false)
      setImportText('')
      setImportError(null)
    } catch (error) {
      setImportError(t(error instanceof AppearanceConfigError ? 'importRejected' : 'saveFailed'))
    }
  }

  const tryOn = (entry: SkinCenterEntry): void => {
    setSkinError(null)
    void controller.tryOn(entry)
      .then(() => {
        setTryingId(entry.id)
        setTryingOfficial(false)
      })
      .catch(() => {
        setSkinError(t('tryOnError'))
        setTryingId(null)
        setTryingOfficial(false)
      })
  }

  const tryOnOfficial = (): void => {
    setSkinError(null)
    try {
      controller.tryOnOfficial()
      setTryingId(null)
      setTryingOfficial(true)
    } catch {
      setSkinError(t('tryOnError'))
      setTryingOfficial(false)
    }
  }

  const exitTryOn = (): void => {
    controller.exit()
    setTryingId(null)
    setTryingOfficial(false)
  }

  const confirmActive = (target: string): Promise<boolean> => new Promise(resolve => {
    const expected = target === OFFICIAL ? 'none' : target
    let tries = 0
    const tick = (): void => {
      tries += 1
      void fetch('/api/skin-center/state')
        .then(async response => {
          const payload = await response.json().catch(() => null) as { ok?: boolean; active?: string } | null
          if (response.ok && payload?.ok === true && payload.active === expected) {
            resolve(true)
          } else if (tries >= 20) {
            resolve(false)
          } else {
            window.setTimeout(tick, 250)
          }
        })
        .catch(() => {
          if (tries >= 20) resolve(false)
          else window.setTimeout(tick, 250)
        })
    }
    tick()
  })

  const applySkin = (target: string): void => {
    setSkinError(null)
    setApplying(target)
    const body = target === OFFICIAL ? { official: true } : { skin: target }
    void fetch('/api/skin-center/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async response => {
        const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
        if (!response.ok || payload?.ok !== true) throw new Error(payload?.error ?? `HTTP ${response.status}`)
        setApplying(null)
        void confirmActive(target).then(confirmed => {
          if (confirmed) {
            window.location.reload()
          } else {
            const command = target === OFFICIAL ? 'dsh-skin use official' : `dsh-skin use ${target}`
            setSkinError(`${t('appliedUnconfirmed')} — ${command}`)
          }
        })
      })
      .catch((cause: unknown) => {
        setApplying(null)
        const detail = cause instanceof Error ? cause.message : String(cause)
        const command = target === OFFICIAL ? 'dsh-skin use official' : `dsh-skin use ${target}`
        setSkinError(`${t('applyFailed')} (${detail}) — ${command}`)
      })
  }

  const actionButtons = (opts: {
    key: string
    isActive: boolean
    isTrying: boolean
    onTryOn: () => void
    applyLabel: string
  }): ReactNode => (
    <div className={css.skinActions}>
      {opts.isActive
        ? <Button type="button" size="sm" variant="ghost" disabled>{t('active')}</Button>
        : opts.isTrying
          ? <Button type="button" size="sm" variant="primary" onClick={exitTryOn}>{t('exitTryOn')}</Button>
          : <Button type="button" size="sm" variant="primary" onClick={opts.onTryOn}>{t('tryOn')}</Button>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={applying !== null}
        onClick={() => { applySkin(opts.key) }}
      >
        {applying === opts.key ? t('applying') : opts.applyLabel}
      </Button>
    </div>
  )

  const skinCard = (entry: SkinCenterEntry): ReactNode => {
    const isActive = entry.package === activePackage
    const isTrying = entry.id === tryingId
    return (
      <article className={css.skinCard} key={entry.id}>
        <div className={css.skinCardTitleRow}>
          <span className={css.skinSwatch} style={{ backgroundColor: entry.accent }} aria-hidden="true" />
          <strong className={css.skinName}>{entry.nameEn}</strong>
          {(isActive || isTrying) && (
            <span className={isActive ? css.badgeActive : css.badgeTrying}>
              {t(isActive ? 'active' : 'tryingOn')}
            </span>
          )}
        </div>
        <p className={css.skinTagline}>{entry.tagline}</p>
        {actionButtons({
          key: entry.id,
          isActive,
          isTrying,
          onTryOn: () => { tryOn(entry) },
          applyLabel: t('apply'),
        })}
      </article>
    )
  }

  return (
    <section className={css.page} aria-labelledby="dsh-appearance-title">
      <header className={css.pageHeader}>
        <div className={css.titleGroup}>
          <h2 id="dsh-appearance-title" className={css.pageTitle}>{t('title')}</h2>
          <p className={css.pageDescription}>{t('description')}</p>
        </div>
        <div className={css.headerActions} ref={headerActionsRef}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon={<IconDownloadOutline16 />}
            onClick={openImport}
          >
            {t('import')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon={<IconCopyOutline16 />}
            onClick={copyConfig}
          >
            {t('copy')}
          </Button>
        </div>
      </header>

      {notice !== null && (
        <div
          className={notice.kind === 'error' ? css.noticeError : css.noticeSuccess}
          role={notice.kind === 'error' ? 'alert' : 'status'}
          aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}
        >
          {notice.text}
        </div>
      )}

      <div className={css.sectionBlock}>
        <div className={css.blockHeading}>
          <h3>{t('themeTitle')}</h3>
          <p>{t('themeDescription')}</p>
        </div>
        <div className={css.themeGrid}>
          {THEME_OPTIONS.map(({ id, label, Icon }) => {
            const selected = themeSnapshot.preference === id
            return (
              <button
                type="button"
                key={id}
                className={`${css.themeChoice} ${selected ? css.themeChoiceSelected : ''}`}
                aria-pressed={selected}
                onClick={() => { selectTheme(id) }}
              >
                <Icon size={18} />
                <span>{t(label)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={css.sectionBlock}>
        <div className={css.blockHeading}>
          <h3>{t('colorsTitle')}</h3>
          <p>{t('colorsDescription')}</p>
        </div>
        <fieldset className={css.paletteCard}>
          <legend>{t(editableMode === 'light' ? 'lightPalette' : 'darkPalette')}</legend>
          <div className={css.colorGrid}>
            {COLOR_ROLES.map(({ role, label }) => {
              const labelId = `dsh-${editableMode}-${role}-color-label`
              const errorId = `dsh-${editableMode}-${role}-color-error`
              return (
                <div className={css.colorField} key={role}>
                  <span id={labelId}>{t(label)}</span>
                  <span className={css.colorControl}>
                    <input
                      type="color"
                      value={config.colors[editableMode][role]}
                      aria-label={`${t(editableMode === 'light' ? 'lightPalette' : 'darkPalette')} — ${t(label)}`}
                      onChange={event => { updateColorPicker(editableMode, role, event.currentTarget.value) }}
                    />
                    <input
                      className={css.colorText}
                      type="text"
                      value={colorDraftValues[editableMode][role]}
                      maxLength={7}
                      pattern="#[0-9a-fA-F]{6}"
                      aria-labelledby={labelId}
                      aria-invalid={colorErrors[editableMode][role]}
                      aria-describedby={colorErrors[editableMode][role] ? errorId : undefined}
                      spellCheck={false}
                      autoComplete="off"
                      onChange={event => { updateColorText(editableMode, role, event.currentTarget.value) }}
                      onBlur={() => { normalizeColorDraft(editableMode, role) }}
                    />
                  </span>
                  {colorErrors[editableMode][role] && (
                    <span id={errorId} className={css.fieldError} role="alert">{t('colorInvalid')}</span>
                  )}
                </div>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className={css.sectionBlock}>
        <div className={css.blockHeading}>
          <h3>{t('fontsTitle')}</h3>
          <p>{t('fontsDescription')}</p>
        </div>
        <div
          className={fontList.status === 'denied' || fontList.status === 'error'
            ? css.fontAccessWarning
            : css.fontAccessStatus}
          role={fontList.status === 'denied' || fontList.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {fontListStatusText()}
        </div>
        <div className={css.fontGrid}>
          {([
            { role: 'ui' as const, label: 'uiFont' as const, fallback: 'uiFallback' as const },
            { role: 'code' as const, label: 'codeFont' as const, fallback: 'codeFallback' as const },
          ]).map(({ role, label, fallback }) => (
            <label className={css.fontField} key={role}>
              <span className={css.fontLabel}>{t(label)}</span>
              <input
                type="text"
                value={fontDrafts[role]}
                list={fontList.status === 'loaded' ? `dsh-${role}-font-families` : undefined}
                aria-invalid={fontErrors[role]}
                aria-describedby={`dsh-${role}-font-fallback${fontErrors[role] ? ` dsh-${role}-font-status` : ''}`}
                spellCheck={false}
                autoComplete="off"
                onFocus={loadLocalFonts}
                onClick={loadLocalFonts}
                onChange={event => { updateFont(role, event.currentTarget.value) }}
                onBlur={() => { normalizeFontDraft(role) }}
              />
              {fontList.status === 'loaded' && (
                <datalist id={`dsh-${role}-font-families`}>
                  {fontList.families.map(family => <option value={family} key={family} />)}
                </datalist>
              )}
              <span id={`dsh-${role}-font-fallback`} className={css.fallbackText}>{t(fallback)}</span>
              {fontErrors[role] && (
                <span
                  id={`dsh-${role}-font-status`}
                  className={`${css.fontStatus} ${css.fontStatusWarning}`}
                  role="alert"
                >
                  {t('fontInvalid')}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className={css.skinsBlock}>
        <button
          type="button"
          className={css.skinsDisclosure}
          aria-expanded={otherSkinsOpen}
          aria-controls="dsh-other-skins"
          onClick={() => { setOtherSkinsOpen(open => !open) }}
        >
          <span>
            <strong>{t('otherSkins')}</strong>
            <small>{t('otherSkinsDescription')}</small>
          </span>
          <IconChevronDownOutline14 className={otherSkinsOpen ? css.disclosureIconOpen : css.disclosureIcon} />
        </button>
        {otherSkinsOpen && (
          <div id="dsh-other-skins" className={css.skinsBody}>
            {skinError !== null && <div className={css.noticeError} role="alert">{skinError}</div>}
            <div className={css.skinGrid}>
              <article className={css.skinCard}>
                <div className={css.skinCardTitleRow}>
                  <span className={css.skinSwatchOfficial} aria-hidden="true" />
                  <strong className={css.skinName}>{t('official')}</strong>
                  {(activePackage === undefined || tryingOfficial) && (
                    <span className={activePackage === undefined ? css.badgeActive : css.badgeTrying}>
                      {t(activePackage === undefined ? 'active' : 'tryingOn')}
                    </span>
                  )}
                </div>
                <p className={css.skinTagline}>{t('officialTagline')}</p>
                {actionButtons({
                  key: OFFICIAL,
                  isActive: activePackage === undefined,
                  isTrying: tryingOfficial,
                  onTryOn: tryOnOfficial,
                  applyLabel: t('restore'),
                })}
              </article>
              {SKIN_CENTER_ENTRIES.map(skinCard)}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={importOpen}
        onClose={closeImport}
        title={t('importModalTitle')}
        closeLabel={t('close')}
        description={t('importModalDescription')}
        className={css.importModal}
        contentClassName={css.importModalContent}
        footer={(
          <>
            <Button type="button" variant="outline" onClick={closeImport}>{t('cancel')}</Button>
            <Button
              type="button"
              variant="primary"
              disabled={importText.trim() === ''}
              onClick={importConfig}
            >
              {t('import')}
            </Button>
          </>
        )}
      >
        <label className={css.importField}>
          <span>{t('importPasteLabel')}</span>
          <textarea
            value={importText}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            rows={7}
            wrap="soft"
            placeholder={`${APPEARANCE_TRANSPORT_PREFIX}{…}`}
            aria-invalid={importError !== null}
            aria-describedby={importError === null ? undefined : 'dsh-appearance-import-error'}
            onChange={event => {
              setImportText(event.currentTarget.value)
              setImportError(null)
            }}
          />
        </label>
        {importError !== null && (
          <div id="dsh-appearance-import-error" className={css.noticeError} role="alert">{importError}</div>
        )}
      </Modal>
    </section>
  )
}
