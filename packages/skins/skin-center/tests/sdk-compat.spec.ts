// @vitest-environment jsdom
/** Load the checked-in artifact with the actual NPM renderer/locale/theme SDK. */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Cordis from '@deepseek-ai/cordis'
import * as Primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as Slots from '@deepseek-ai/dsh-client-ui-slots'
import * as Store from '@deepseek-ai/dsh-client-store'
import type { ClientModuleLoaderTarget } from '@deepseek-ai/dsh-client-modules/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ThemeSettings } from '@deepseek-ai/dsh-client-ui-theme/client'
import type { SkinCenterInjected } from '../src/client/SkinCenter.tsx'
import { en, zh } from '../src/client/locales.ts'
import { SKIN_CENTER_ENTRIES } from '../src/client/generated/skins.ts'

const nativeRequire = createRequire(import.meta.url)
// react-dom is an explicit dependency of the published primitives package.
const platformRequire = createRequire(nativeRequire.resolve('@deepseek-ai/dsh-client-ui-primitives'))
const platform = new Map<string, unknown>([
  ['@deepseek-ai/cordis', Cordis],
  ['@deepseek-ai/dsh-client-ui-primitives', Primitives],
  ['@deepseek-ai/dsh-client-ui-slots', Slots],
  ['@deepseek-ai/dsh-client-store', Store],
  ...['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client']
    .map(id => [id, platformRequire(id)] as const),
])

/** The host's documented closure-factory handoff, with no SDK replacement. */
function loadBundle<T>(file: string): T {
  let loaded: unknown
  window.__ModuleLoader__ = {
    load({ factory }) {
      loaded = factory(id => {
        if (!platform.has(id)) throw new Error(`undeclared platform module: ${id}`)
        return platform.get(id)
      })
    },
  }
  // jsdom cannot fetch script tags; evaluate exactly the published script text.
  ;(0, eval)(readFileSync(file, 'utf8'))
  if (loaded === undefined) throw new Error(`bundle did not register: ${file}`)
  return loaded as T
}

const fibers: Cordis.Fiber[] = []
let unmount: (() => void) | undefined

afterEach(async () => {
  unmount?.()
  unmount = undefined
  for (const fiber of fibers.reverse()) await fiber.dispose()
  fibers.length = 0
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
  localStorage.clear()
  delete window.__ModuleLoader__
  vi.restoreAllMocks()
})

describe('official 0.1.2-rc.1 SDK and published Appearance bundle', () => {
  it('registers after slot declaration, renders native controls, forwards theme changes and retracts', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    document.body.style.setProperty('--dsh-appearance-light-accent', '#123456', 'important')
    const renderer = loadBundle<typeof import('@deepseek-ai/dsh-client-ui-renderer/client')>(
      nativeRequire.resolve('@deepseek-ai/dsh-client-ui-renderer/client'),
    )
    const { LocaleRuntime } = loadBundle<typeof import('@deepseek-ai/dsh-client-locale/client')>(
      nativeRequire.resolve('@deepseek-ai/dsh-client-locale/client'),
    )
    const { ThemeRuntime } = loadBundle<typeof import('@deepseek-ai/dsh-client-ui-theme/client')>(
      nativeRequire.resolve('@deepseek-ai/dsh-client-ui-theme/client'),
    )
    const appearance = loadBundle<typeof import('../src/client/index.ts')>(
      nativeRequire.resolve('../lib/client.js'),
    )
    const moduleSdk = loadBundle<typeof import('@deepseek-ai/dsh-client-modules/client')>(
      nativeRequire.resolve('@deepseek-ai/dsh-client-modules/client'),
    )
    const target: ClientModuleLoaderTarget = {
      mode: 'queue', pendingQueue: [],
      load(registration) { this.pendingQueue.push(registration) },
      create() { throw new Error('the test constructs the native module system directly') },
    }
    const modules = new moduleSdk.ClientModuleSystem({
      manifest: { rev: 'appearance-sdk-test', modules: [], plugins: [] },
      staticModules: Object.fromEntries(platform),
      registrationTarget: target,
      bootstrapModule: { id: '@deepseek-ai/dsh-client-modules', exports: moduleSdk },
    })
    window.__ModuleLoader__ = target
    // Only the durable Host transport is replaced, so this test never reads or
    // writes a real DSH profile. The native theme service owns the behavior.
    const write = vi.fn(async () => {})
    const host: SettingsScope<ThemeSettings> = {
      getSnapshot: () => ({
        status: 'ready', value: { preference: 'light', fontSize: 14 },
        base: {}, user: {}, revision: 0, writable: true, mode: 'host',
      }),
      subscribe: () => () => {},
      set: write,
      unset: async () => {},
      mutate: async () => {},
    }
    const root = new Cordis.Context()
    const sdk = root.plugin({
      apply(ctx: Cordis.Context) {
        renderer.apply(ctx)
        const locale = new LocaleRuntime(ctx)
        ctx.provide('locale', locale)
        ctx.provide('theme', new ThemeRuntime(ctx, host))
        ctx.provide('modules', modules)
        ctx.slots.installLocale(locale)
        const absentSession: Slots.StandardSourceBinding = {
          key: undefined, hooks: {}, keyedHooks: {}, props: {},
        }
        ctx.slots.installScope('session', {
          current: { getSnapshot: () => absentSession, subscribe: () => () => {} },
          resolve: () => undefined,
        })
      },
    })
    fibers.push(sdk)
    await sdk.await()
    root.locale.setLocale('en')
    const feature = root.plugin(appearance)
    fibers.push(feature)
    await feature.await()
    expect(root.slots.entries('settings.section')).toHaveLength(0)

    const shell = root.plugin({
      inject: ['slots'],
      apply(ctx: Cordis.Context) {
        ctx.slots.register({
          name: 'root',
          children: { 'settings.section': { kind: 'list', scope: 'root' } },
        }, ({ renderSlot }) => renderSlot('settings.section', { close: () => {} }))
      },
    })
    fibers.push(shell)
    await shell.await()
    const entry = root.slots.entries('settings.section')[0]!
    expect(entry.options.id).toBe('skin-appearance')
    expect(entry.options.order).toBe(5)
    expect(Slots.resolveSlotLabel(entry.options.label)).toBe(en.navLabel)
    const injected = entry.inject!() as unknown as SkinCenterInjected
    const changed = vi.fn()
    const unsubscribe = injected.theme.subscribe(changed)
    injected.theme.setTheme('dark')
    expect(write).toHaveBeenCalledWith('preference', 'dark')
    expect(injected.theme.getTheme().active.colorScheme).toBe('dark')
    expect(changed).toHaveBeenCalledTimes(1)
    unsubscribe()

    unmount = root.uiRenderer.mount(document.getElementById('root')!)
    expect(document.body.textContent).toContain(en.fontsTitle)
    expect(document.body.textContent).toContain(en.otherSkins)
    expect(document.querySelectorAll('input[type="color"]')).toHaveLength(3)
    expect(document.querySelectorAll('input[type="text"][list]')).toHaveLength(0)
    root.locale.setLocale('zh')
    expect(Slots.resolveSlotLabel(entry.options.label)).toBe(zh.navLabel)
    await vi.waitFor(() => expect(document.body.textContent).toContain(zh.fontsTitle))

    // Exercise the default same-origin script transport with the native
    // module service. Only jsdom's unavailable HTTP script fetch is supplied.
    const append = document.head.append.bind(document.head)
    const requests: string[] = []
    vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
      append(...nodes)
      for (const node of nodes) {
        if (!(node instanceof HTMLScriptElement)) continue
        requests.push(new URL(node.src).pathname)
        queueMicrotask(() => {
          ;(0, eval)(readFileSync(nativeRequire.resolve('../../claude-code/lib/client.js'), 'utf8'))
          node.dispatchEvent(new Event('load'))
        })
      }
    })
    const skin = SKIN_CENTER_ENTRIES[0]!
    for (let pass = 0; pass < 2; pass += 1) {
      await injected.controller.tryOn(skin)
      expect(document.body.hasAttribute(skin.bodyAttr)).toBe(true)
      expect(modules.loadCache.has(skin.package)).toBe(true)
      injected.controller.exit()
      expect(document.body.hasAttribute(skin.bodyAttr)).toBe(false)
      expect(modules.loadCache.has(skin.package)).toBe(false)
      expect(document.querySelector(`[data-skin-chrome]`)).toBeNull()
    }
    expect(requests).toEqual(['/api/skin-center/bundle/claude-code', '/api/skin-center/bundle/claude-code'])

    unmount()
    unmount = undefined
    await feature.dispose()
    expect(root.slots.entries('settings.section')).toHaveLength(0)
    expect(document.body.style.getPropertyValue('--dsh-appearance-light-accent')).toBe('#123456')
    expect(document.body.style.getPropertyPriority('--dsh-appearance-light-accent')).toBe('important')
  })
})
