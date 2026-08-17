// @vitest-environment jsdom
/**
 * Claude Code skin apply spec — the template contract: the body
 * attribute the stylesheet is scoped on is set on apply and retracted on
 * dispose, and every injected chrome element (marked data-skin-chrome) is
 * removed. Extend with assertions specific to your surface.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import { apply } from '../src/client/index.ts'

let fiber: Fiber | undefined

// Keep the relative path in a variable so Vite does not rewrite the URL as an asset URL.
const cssRelative = '../src/client/claude-code.module.css'
const cssSource = readFileSync(new URL(cssRelative, import.meta.url), 'utf8')

const appearanceVariables = [
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

async function mount(): Promise<Fiber> {
  const f = new Context().plugin({ apply })
  await f.await()
  return f
}

afterEach(async () => {
  await fiber?.dispose()
  fiber = undefined
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
  document.title = ''
})

describe('Claude Code skin apply', () => {
  it('sets the body attribute and retracts it on dispose', async () => {
    fiber = await mount()
    expect(document.body.hasAttribute('data-dsh-claude-code')).toBe(true)
    await fiber.dispose()
    expect(document.body.hasAttribute('data-dsh-claude-code')).toBe(false)
  })

  it('injects the terminal title bar (dots + title) and retracts it on dispose', async () => {
    fiber = await mount()
    const chrome = document.body.querySelectorAll('[data-skin-chrome]')
    expect(chrome.length).toBe(5) // titlebar + 3 window dots + title
    expect(document.body.querySelector('[data-skin-chrome="dot-red"]')).not.toBeNull()
    expect(document.body.querySelector('[data-skin-chrome="dot-yellow"]')).not.toBeNull()
    expect(document.body.querySelector('[data-skin-chrome="dot-green"]')).not.toBeNull()
    await fiber.dispose()
    expect(document.body.querySelectorAll('[data-skin-chrome]').length).toBe(0)
  })

  it('pins the skin title and restores the original on dispose', async () => {
    document.title = 'original'
    fiber = await mount()
    expect(document.title).toBe('Claude Code · DeepSeek 在线')
    await fiber.dispose()
    expect(document.title).toBe('original')
  })

  it('leaves Skin Center Appearance variables intact on dispose', async () => {
    document.body.style.setProperty('--dsh-appearance-light-accent', '#123456')
    fiber = await mount()
    await fiber.dispose()
    expect(document.body.style.getPropertyValue('--dsh-appearance-light-accent')).toBe('#123456')
  })
})

describe('Claude Code skin appearance contract', () => {
  it('keeps the standalone warm serif defaults as private-variable fallbacks', () => {
    expect(cssSource).toContain('--claude-code-ui-font: var(--dsh-appearance-ui-font, "思源宋体 VF", "Source Han Serif SC VF", "思源宋体", "Songti SC", serif);')
    expect(cssSource).toContain('--claude-code-mono-font: var(--dsh-appearance-code-font, "SF Mono", "SFMono-Regular", Menlo, Consolas, monospace);')

    for (const declaration of [
      '--claude-code-accent: var(--dsh-appearance-light-accent, #da7756);',
      '--claude-code-canvas: var(--dsh-appearance-light-canvas, #f5f3ee);',
      '--claude-code-surface: var(--dsh-appearance-light-surface, #f1eee8);',
      '--claude-code-foreground: var(--dsh-appearance-light-foreground, #1d1b16);',
      '--claude-code-accent: var(--dsh-appearance-dark-accent, #da7756);',
      '--claude-code-canvas: var(--dsh-appearance-dark-canvas, #1d1b16);',
      '--claude-code-surface: var(--dsh-appearance-dark-surface, #262119);',
      '--claude-code-foreground: var(--dsh-appearance-dark-foreground, #f5f3ee);',
    ]) {
      expect(cssSource).toContain(declaration)
    }

    for (const color of [
      '#fffdf9', '#a95137', '#cc7d5e', '#ece8e0', '#e5e0d7', '#4a453c',
      '#6e675e', '#999087', '#d8d2c9', '#cfc7bc', '#c0b5a8', '#b0a494',
      '#e8e2d9', '#ded6cc', '#c9694d', '#f9f7f3', '#e89c81', '#d99a7e',
      '#2e2820', '#353028', '#d6cfc4', '#b8b0a4', '#8a8277', '#4a4236',
      '#57503f', '#6b6250', '#7d7360', '#3f3a30', '#e08a6a', '#171510',
    ]) {
      expect(cssSource).toMatch(new RegExp(`var\\(--dsh-appearance-(?:light|dark)-[^,]+, ${color}\\)`))
    }

    expect(cssSource).toContain('var(--dsh-appearance-light-accent, #da7756) 14%, transparent 86%')
    expect(cssSource).toContain('var(--dsh-appearance-light-accent, #da7756) 22%, transparent 78%')
    expect(cssSource).toContain('var(--dsh-appearance-light-accent, #da7756) 32%, transparent 68%')
    expect(cssSource).toContain('var(--dsh-appearance-dark-accent, #da7756) 18%, transparent 82%')
    expect(cssSource).toContain('var(--dsh-appearance-dark-accent, #da7756) 28%, transparent 72%')
    expect(cssSource).toContain('var(--dsh-appearance-dark-accent, #da7756) 26%, transparent 74%')
  })

  it('routes the visible typography and color surfaces through configurable tokens', () => {
    for (const binding of [
      '--dsw-font-family: var(--claude-code-ui-font);',
      '--ds-font-family-code: var(--claude-code-mono-font);',
      '--dsw-alias-brand-primary: var(--claude-code-accent);',
      '--dsw-alias-bg-base: var(--claude-code-canvas);',
      '--dsw-alias-bg-layer-1: var(--claude-code-surface);',
      '--dsw-alias-label-primary: var(--claude-code-foreground);',
      '--dsw-alias-button-primary-fill: var(--claude-code-accent);',
      'background: var(--claude-code-titlebar-surface);',
      'background: var(--claude-code-code-surface);',
      'background: var(--claude-code-selection);',
      'background: var(--claude-code-scrollbar-thumb);',
    ]) {
      expect(cssSource).toContain(binding)
    }
  })

  it('references private Appearance variables only inside the skin body scope', () => {
    const uncommented = cssSource.replace(/\/\*[\s\S]*?\*\//g, '')
    const blocks = [...uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)]

    for (const variable of appearanceVariables) {
      const referencingSelectors = blocks
        .filter(([, , declarations]) => declarations.includes(variable))
        .map(([, selector]) => selector.trim())
      expect(referencingSelectors.length).toBeGreaterThan(0)
      expect(referencingSelectors.every(selector => selector.includes('body[data-dsh-claude-code]'))).toBe(true)
    }
  })
})
