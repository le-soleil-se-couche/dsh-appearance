/**
 * Tests for scripts/dsh-skin: the pure managed-section helpers and the
 * `use official` command against a throwaway DSH_HOME, so the real Harness
 * configuration is never touched.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import dshSkin from './dsh-skin'

const {
  SKINS,
  MANAGED_START,
  MANAGED_END,
  renderManaged,
  stripManaged,
  stripLegacySkinRows,
  currentActive,
  resolveDshHome,
  packageTarget,
  symlinkType,
} = dshSkin

const SCRIPT = fileURLToPath(new URL('./dsh-skin', import.meta.url))

/** A throwaway HOME with a patch fixture; returns the patch path. */
function fakeDshHome() {
  const dshHome = mkdtempSync(join(tmpdir(), 'dsh-skin-test-'))
  mkdirSync(dshHome, { recursive: true })
  return dshHome
}

function patchPath(dshHome) {
  return join(dshHome, 'cordis.patch.yml')
}

test('renderManaged(null) disables every skin and inserts nothing', () => {
  const rendered = renderManaged(null)
  assert.ok(rendered.startsWith(MANAGED_START))
  assert.ok(rendered.endsWith(MANAGED_END))
  for (const name of Object.keys(SKINS)) {
    assert.ok(rendered.includes(`- id: ${SKINS[name].id}\n  disabled: true`), `expected ${name} disabled`)
  }
  assert.ok(!rendered.includes('- insert:'), 'official must carry no insert row')
})

test('renderManaged(name) keeps one insert row for the Claude Code skin', () => {
  const rendered = renderManaged('claude-code')
  assert.ok(rendered.includes('- insert:'))
  assert.ok(rendered.includes(`- id: ${SKINS['claude-code'].id}`))
  // The active skin itself must not be disabled.
  assert.ok(!rendered.includes(`- id: ${SKINS['claude-code'].id}\n  disabled: true`))
})

test('stripManaged removes only the managed section', () => {
  const patch = `# header\n- id: other\n\n${MANAGED_START}\n- id: ui-skin-xp\n  disabled: true\n${MANAGED_END}\n# footer\n`
  const stripped = stripManaged(patch)
  assert.ok(stripped.includes('# header'))
  assert.ok(stripped.includes('# footer'))
  assert.ok(!stripped.includes('ui-skin-xp'))
  assert.ok(!stripped.includes(MANAGED_START))
})

test('stripManaged throws on an unterminated managed section', () => {
  const patch = `${MANAGED_START}\n- id: ui-skin-xp\n  disabled: true\n`
  assert.throws(() => stripManaged(patch), /unterminated/)
})

test('currentActive returns null when every skin is disabled', () => {
  assert.equal(currentActive(renderManaged(null)), null)
})

test('registry includes the configurable Claude Code skin', () => {
  assert.equal(SKINS['claude-code'].pkg, '@deepseek-ai/dsh-client-ui-skin-claude-code')
  assert.equal(SKINS['claude-code'].id, 'ui-skin-claude-code')
})

test('portable path helpers cover missing HOME, scoped packages and Windows junctions', () => {
  const exampleHome = join(tmpdir(), 'example-home')
  assert.equal(resolveDshHome({}, exampleHome), join(exampleHome, '.dsh'))
  assert.equal(packageTarget('/tmp/modules', '@deepseek-ai/example'), join('/tmp/modules', '@deepseek-ai', 'example'))
  assert.equal(symlinkType('win32'), 'junction')
  assert.equal(symlinkType('linux'), 'dir')
})

test('use official restores the stock look on a throwaway DSH_HOME', () => {
  const dshHome = fakeDshHome()
  try {
    const patch = patchPath(dshHome)
    const fixture = `# custom row survives\n- id: ui-subagent-tree\n  name: '@deepseek-ai/dsh-client-ui-subagent-tree'\n`
    writeFileSync(patch, fixture)
    execFileSync(process.execPath, [SCRIPT, 'use', 'official'], {
      env: { ...process.env, DSH_HOME: dshHome },
    })
    const after = readFileSync(patch, 'utf8')
    assert.ok(after.includes('# custom row survives'), 'non-managed rows must be preserved')
    assert.ok(after.includes(MANAGED_START))
    for (const name of Object.keys(SKINS)) {
      assert.ok(after.includes(`- id: ${SKINS[name].id}\n  disabled: true`))
    }
    assert.ok(!after.includes('- insert:'), 'official must not insert any skin row')

    // The CLI's own reading agrees: current prints none.
    const current = execFileSync(process.execPath, [SCRIPT, 'current'], {
      env: { ...process.env, DSH_HOME: dshHome },
      encoding: 'utf8',
    })
    assert.equal(current.trim(), 'none')
  } finally {
    rmSync(dshHome, { recursive: true, force: true })
  }
})

test('use claude-code writes the configured insert row', () => {
  const dshHome = fakeDshHome()
  try {
    const patch = patchPath(dshHome)
    writeFileSync(patch, '')
    execFileSync(process.execPath, [SCRIPT, 'use', 'claude-code'], {
      env: { ...process.env, DSH_HOME: dshHome },
    })
    const after = readFileSync(patch, 'utf8')
    assert.ok(after.includes('- insert:'))
    assert.ok(after.includes(`- id: ${SKINS['claude-code'].id}`))
    const current = execFileSync(process.execPath, [SCRIPT, 'current'], {
      env: { ...process.env, DSH_HOME: dshHome },
      encoding: 'utf8',
    })
    assert.equal(current.trim(), 'claude-code')
  } finally {
    rmSync(dshHome, { recursive: true, force: true })
  }
})
