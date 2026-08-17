import { readFileSync } from 'node:fs'
import { transform } from 'lightningcss'
import { describe, expect, it } from 'vitest'

const cssSource = readFileSync(new URL('../src/client/skin-center.module.css', import.meta.url), 'utf8')
const componentSource = readFileSync(new URL('../src/client/SkinCenter.tsx', import.meta.url), 'utf8')

function declarations(selector: string): string {
  const start = cssSource.indexOf(`${selector} {`)
  expect(start, `${selector} rule`).toBeGreaterThanOrEqual(0)
  const end = cssSource.indexOf('}', start)
  expect(end, `${selector} closing brace`).toBeGreaterThan(start)
  return cssSource.slice(start, end)
}

describe('appearance page CSS scope', () => {
  it('compiles as a CSS Module with the package build transformer', () => {
    expect(() => transform({
      filename: 'skin-center.module.css',
      code: Buffer.from(cssSource),
      cssModules: true,
    })).not.toThrow()
  })

  it('keeps the page usable without activating or depending on the Claude skin', () => {
    expect(cssSource).toContain('.page {')
    expect(cssSource).not.toContain('body[data-dsh-claude-code]')
    expect(cssSource).not.toContain('--dsh-claude-')
  })

  it('retains narrow-screen and reduced-motion treatments', () => {
    expect(cssSource).toContain('@media (max-width: 520px)')
    expect(cssSource).toContain('@media (prefers-reduced-motion: reduce)')
    expect(cssSource).toContain(':focus-visible')
  })

  it('keeps import content fluid and scrollable inside narrow or short host dialogs', () => {
    const shell = declarations('.importModal')
    const modal = declarations('.importModalContent')
    expect(shell).toContain('max-inline-size: calc(100vw - 2rem)')
    expect(shell).toContain('max-block-size: calc(100dvh - 2rem)')
    expect(shell).toContain('overflow: hidden')
    expect(modal).toContain('container: import-modal / inline-size')
    expect(modal).toContain('inline-size: min(35rem, 100%)')
    expect(modal).toContain('max-inline-size: 100%')
    expect(modal).toContain('min-inline-size: 0')
    expect(modal).toContain('max-block-size: min(70dvh, 42rem)')
    expect(modal).toContain('overflow-y: auto')
    expect(modal).toContain('overflow-wrap: anywhere')
    expect(cssSource).not.toContain('min-width: min(560px, calc(100vw - 48px))')
  })

  it('bounds both import control variants and lets a tall textarea resize safely', () => {
    const controls = declarations('.importField :is(input, textarea)')
    const textarea = declarations('.importField textarea')
    expect(controls).toContain('inline-size: 100%')
    expect(controls).toContain('max-inline-size: 100%')
    expect(controls).toContain('min-inline-size: 0')
    expect(textarea).toContain('min-block-size: clamp(')
    expect(textarea).toContain('max-block-size: min(45dvh, 24rem)')
    expect(textarea).toContain('resize: vertical')
    expect(cssSource).toContain('@container import-modal (max-width: 28rem)')
    expect(componentSource).toContain('<textarea')
    expect(componentSource).toContain('rows={7}')
    expect(componentSource).not.toContain('<input\n            type="text"\n            value={importText}')
  })

  it('allows enlarged or wrapped footer actions without horizontal overflow', () => {
    const footer = declarations('.importModalContent + div')
    const button = declarations('.importModalContent + div > button')
    expect(footer).toContain('max-inline-size: 100%')
    expect(footer).toContain('flex-wrap: wrap')
    expect(button).toContain('max-inline-size: 100%')
    expect(button).toContain('white-space: normal')
  })
})
