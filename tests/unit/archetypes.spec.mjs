/**
 * tests/unit/archetypes.spec.mjs
 *
 * Pin the 4-archetype HP/footprint/multiplier table + dron_fumigador→tank binding.
 * Run with: node tests/unit/archetypes.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHETYPES, assertArchetype, ConfigError } from '../../src/enemies.js?v=17'

test('ARCHETYPES table is frozen', () => {
  assert.equal(Object.isFrozen(ARCHETYPES), true)
})

test('standard: hp=1, mult=1, footprint 1.0/1.0', () => {
  const a = ARCHETYPES.standard
  assert.equal(a.hp, 1)
  assert.equal(a.multiplier, 1)
  assert.equal(a.footprint.hw, 1.0)
  assert.equal(a.footprint.hh, 1.0)
})

test('tank: hp=3, mult=1.5, footprint 1.2/1.2', () => {
  const a = ARCHETYPES.tank
  assert.equal(a.hp, 3)
  assert.equal(a.multiplier, 1.5)
  assert.equal(a.footprint.hw, 1.2)
  assert.equal(a.footprint.hh, 1.2)
})

test('mini-boss: hp=10, mult=2, footprint 1.5/1.5', () => {
  const a = ARCHETYPES['mini-boss']
  assert.equal(a.hp, 10)
  assert.equal(a.multiplier, 2)
  assert.equal(a.footprint.hw, 1.5)
  assert.equal(a.footprint.hh, 1.5)
})

test('boss: hp=30, mult=3, footprint 2.0/2.0', () => {
  const a = ARCHETYPES.boss
  assert.equal(a.hp, 30)
  assert.equal(a.multiplier, 3)
  assert.equal(a.footprint.hw, 2.0)
  assert.equal(a.footprint.hh, 2.0)
})

test('assertArchetype: accepts all 4 ids', () => {
  for (const id of ['standard', 'tank', 'mini-boss', 'boss']) {
    assert.doesNotThrow(() => assertArchetype(id))
  }
})

test('assertArchetype: rejects unknown ids with ConfigError', () => {
  assert.throws(() => assertArchetype('dragon'), (err) => {
    return err instanceof ConfigError && err.message.includes('dragon')
  })
})

test('manifest binds dron_fumigador to tank', async () => {
  // Read the JSON file directly (no fetch in node test).
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const url = await import('node:url')
  const here = url.fileURLToPath(new URL('.', import.meta.url))
  const manifestPath = path.resolve(here, '../../assets/sprites/manifest.json')
  const json = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
  assert.equal(json.active.dron_fumigador.archetype, 'tank',
    'dron_fumigador must be bound to tank per user lock 2026-09-07')
})

test('manifest: plataforma_solar is deprecated', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const url = await import('node:url')
  const here = url.fileURLToPath(new URL('.', import.meta.url))
  const manifestPath = path.resolve(here, '../../assets/sprites/manifest.json')
  const json = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
  assert.ok(json.deprecated?.plataforma_solar, 'plataforma_solar must be marked deprecated')
})

test('manifest: camion_cisterna_residuos is placeholder=true tank', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const url = await import('node:url')
  const here = url.fileURLToPath(new URL('.', import.meta.url))
  const manifestPath = path.resolve(here, '../../assets/sprites/manifest.json')
  const json = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
  const e = json.active.camion_cisterna_residuos
  assert.equal(e.placeholder, true)
  assert.equal(e.archetype, 'tank')
})
