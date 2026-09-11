/**
 * tests/unit/archetypes.spec.mjs
 *
 * Pin the 4-archetype HP/footprint/multiplier table + enemies_dron_fumigador→tank binding.
 * Run with: node tests/unit/archetypes.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHETYPES, assertArchetype, ConfigError } from '../../src/enemies.js?v=26'

test('ARCHETYPES table is frozen', () => {
  assert.equal(Object.isFrozen(ARCHETYPES), true)
})

test('standard: hp=1, mult=1, footprint 1.5/2.5 (F4f widened)', () => {
  const a = ARCHETYPES.standard
  assert.equal(a.hp, 1)
  assert.equal(a.multiplier, 1)
  assert.equal(a.footprint.hw, 1.5)
  assert.equal(a.footprint.hh, 2.5)
})

test('tank: hp=3, mult=1.5, footprint 1.7/2.7 (F4f widened)', () => {
  const a = ARCHETYPES.tank
  assert.equal(a.hp, 3)
  assert.equal(a.multiplier, 1.5)
  assert.equal(a.footprint.hw, 1.7)
  assert.equal(a.footprint.hh, 2.7)
})

test('mini-boss: hp=10, mult=2, footprint 2.0/3.0 (F4f widened)', () => {
  const a = ARCHETYPES['mini-boss']
  assert.equal(a.hp, 10)
  assert.equal(a.multiplier, 2)
  assert.equal(a.footprint.hw, 2.0)
  assert.equal(a.footprint.hh, 3.0)
})

test('boss: hp=30, mult=3, footprint 2.5/3.5 (F4f widened)', () => {
  const a = ARCHETYPES.boss
  assert.equal(a.hp, 30)
  assert.equal(a.multiplier, 3)
  assert.equal(a.footprint.hw, 2.5)
  assert.equal(a.footprint.hh, 3.5)
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

test('manifest binds enemies_dron_fumigador to tank', async () => {
  // Read the JSON file directly (no fetch in node test).
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const url = await import('node:url')
  const here = url.fileURLToPath(new URL('.', import.meta.url))
  const manifestPath = path.resolve(here, '../../assets/sprites/manifest.json')
  const json = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
  assert.equal(json.active.enemies_dron_fumigador.archetype, 'tank',
    'enemies_dron_fumigador must be bound to tank per user lock 2026-09-07')
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

test('manifest: enemies_camion_cisterna_residuos is placeholder=true tank', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const url = await import('node:url')
  const here = url.fileURLToPath(new URL('.', import.meta.url))
  const manifestPath = path.resolve(here, '../../assets/sprites/manifest.json')
  const json = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
  const e = json.active.enemies_camion_cisterna_residuos
  assert.equal(e.placeholder, true)
  assert.equal(e.archetype, 'tank')
})
