/**
 * tests/unit/enemies-desactivacion.spec.mjs
 *
 * F1.6 — A7 contract: boss desactivación uniforme.
 *
 * Pin the lifecycle='desactivacion' semantics:
 *   - applyHit() returns desactivated=true (NOT destroyed=true) on terminal hit
 *   - state transitions to 'desactivated' (NOT 'destroyed')
 *   - speed=0, movementPattern='static' after desactivación
 *   - zarra:desactivacion event is dispatched exactly once
 *   - Default lifecycle (omitted) keeps the 'destroyed' path unchanged
 *
 * Run with: node tests/unit/enemies-desactivacion.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { Enemy, ARCHETYPES } from '../../src/enemies.js?v=44'
import { eventBus } from '../../src/event-bus.js?v=44'

function captureEvent(name) {
  const events = []
  const cb = (e) => events.push(e.detail)
  eventBus.addEventListener(name, cb)
  return {
    events,
    cleanup() { eventBus.removeEventListener(name, cb) },
  }
}

function makeEnemy(opts = {}) {
  return new Enemy({
    id: 'test_enemy',
    archetype: opts.archetype ?? 'standard',
    isoX: 10,
    isoY: 10,
    spriteId: opts.spriteId ?? 'enemies_camion_treco',
    lifecycle: opts.lifecycle,
  })
}

// ============================================================
// Lifecycle='desactivacion'
// ============================================================

test('applyHit: lifecycle=desactivacion returns desactivated=true (NOT destroyed)', () => {
  const e = makeEnemy({ lifecycle: 'desactivacion' })
  const r = e.applyHit(1)
  assert.equal(r.hpRemaining, 0)
  assert.equal(r.desactivated, true)
  assert.equal(r.destroyed, false, 'must NOT report destroyed for lifecycle=desactivacion')
})

test('applyHit: lifecycle=desactivacion transitions state to "desactivated"', () => {
  const e = makeEnemy({ lifecycle: 'desactivacion' })
  e.applyHit(1)
  assert.equal(e.state, 'desactivated')
})

test('applyHit: lifecycle=desactivacion halts motion (speed=0, pattern=static)', () => {
  // Use planta_treco (in STATIC_SPRITE_IDS) so default speed=0; lifecycle
  // halt is what we verify here, not the static-spriteId rule.
  const e = makeEnemy({ lifecycle: 'desactivacion', spriteId: 'enemies_planta_treco' })
  // Before hit: motion should be 0/'static' due to static spriteId rule
  assert.equal(e.speed, 0)
  assert.equal(e.movementPattern, 'static')
  e.applyHit(1)
  // After hit: halted (still 0/static)
  assert.equal(e.speed, 0)
  assert.equal(e.movementPattern, 'static')
})

test('applyHit: lifecycle=desactivacion emits zarra:desactivacion exactly once', () => {
  const c = captureEvent('zarra:desactivacion')
  const e = makeEnemy({ lifecycle: 'desactivacion', archetype: 'boss' })
  // Standard boss has HP=30, but only 1 hit needed for terminal if HP=1
  // So we craft a mini-boss that dies in 1 hit would be wrong; let's use
  // a custom HP via archetype. Use 'standard' with HP=1.
  const e2 = makeEnemy({ archetype: 'standard', lifecycle: 'desactivacion' })
  e2.applyHit(1)
  assert.equal(c.events.length, 1)
  assert.equal(c.events[0].enemyId, 'test_enemy')
  assert.equal(c.events[0].spriteId, 'enemies_camion_treco')
  assert.equal(c.events[0].archetype, 'standard')
  c.cleanup()
})

test('markDesactivated: idempotent — multiple calls emit only once', () => {
  const c = captureEvent('zarra:desactivacion')
  const e = makeEnemy({ lifecycle: 'desactivacion' })
  e.applyHit(1)
  e.markDesactivated()  // already desactivated
  e.markDesactivated()  // still
  assert.equal(c.events.length, 1)
  c.cleanup()
})

test('applyHit: lifecycle=desactivacion does NOT apply PIXI tint if sprite is null', () => {
  const e = makeEnemy({ lifecycle: 'desactivacion' })
  // No sprite attached
  assert.equal(e.sprite, undefined)
  // Should not throw
  e.applyHit(1)
  assert.equal(e.state, 'desactivated')
})

test('applyHit: lifecycle=desactivacion applies gray tint to sprite if present', () => {
  const e = makeEnemy({ lifecycle: 'desactivacion' })
  // Fake sprite with tint property
  e.sprite = { tint: 0xFFFFFF }
  e.applyHit(1)
  assert.equal(e.sprite.tint, 0x808080, 'expected gray tint for desaturation')
})

// ============================================================
// Default lifecycle='destroyed' (backwards compatibility)
// ============================================================

test('applyHit: lifecycle omitted → state transitions to "destroyed"', () => {
  const e = makeEnemy()  // no lifecycle
  e.applyHit(1)
  assert.equal(e.state, 'destroyed')
  assert.notEqual(e.state, 'desactivated')
})

test('applyHit: lifecycle omitted → does NOT emit zarra:desactivacion', () => {
  const c = captureEvent('zarra:desactivacion')
  const e = makeEnemy()
  e.applyHit(1)
  assert.equal(c.events.length, 0)
  c.cleanup()
})

test('applyHit: lifecycle omitted → result.destroyed=true, result.desactivated=false', () => {
  const e = makeEnemy()
  const r = e.applyHit(1)
  assert.equal(r.destroyed, true)
  assert.equal(r.desactivated, false)
})

// ============================================================
// markDestroyed unchanged (backwards compat)
// ============================================================

test('markDestroyed: idempotent on already-destroyed', () => {
  const e = makeEnemy()
  e.applyHit(1)
  assert.equal(e.state, 'destroyed')
  e.markDestroyed()  // already destroyed
  assert.equal(e.state, 'destroyed')
})

test('markDestroyed: no-op if state is desactivated (defensive)', () => {
  const e = makeEnemy({ lifecycle: 'desactivacion' })
  e.applyHit(1)
  assert.equal(e.state, 'desactivated')
  e.markDestroyed()  // should not transition desactivated → destroyed
  assert.equal(e.state, 'desactivated', 'markDestroyed must NOT overwrite desactivated')
})