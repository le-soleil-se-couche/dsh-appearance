import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/client/SkinCenter.tsx', import.meta.url), 'utf8')
const fontBlockStart = source.indexOf('<div className={css.fontGrid}>')
const fontBlockEnd = source.indexOf('<div className={css.skinsBlock}>', fontBlockStart)

expect(fontBlockStart, 'font controls start').toBeGreaterThanOrEqual(0)
expect(fontBlockEnd, 'font controls end').toBeGreaterThan(fontBlockStart)

const fontControls = source.slice(fontBlockStart, fontBlockEnd)

describe('appearance font controls', () => {
  it('keeps both font roles on the same manually editable input path', () => {
    expect(fontControls).toContain("{ role: 'ui' as const")
    expect(fontControls).toContain("{ role: 'code' as const")
    expect(fontControls).toContain('type="text"')
    expect(fontControls).not.toContain('<select')
    expect(fontControls).toContain('onChange={event => { updateFont(role, event.currentTarget.value) }}')
    expect(fontControls).toContain('onBlur={() => { normalizeFontDraft(role) }}')
    expect(fontControls).toContain('aria-invalid={fontErrors[role]}')
  })

  it('associates each loaded local-family list with its editable input', () => {
    expect(fontControls).toContain(
      "list={fontList.status === 'loaded' ? `dsh-${role}-font-families` : undefined}",
    )
    expect(fontControls).toContain("{fontList.status === 'loaded' && (")
    expect(fontControls).toContain('<datalist id={`dsh-${role}-font-families`}>')
    expect(fontControls).toContain(
      '{fontList.families.map(family => <option value={family} key={family} />)}',
    )
  })
})
