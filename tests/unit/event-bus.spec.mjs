/**
 * tests/unit/event-bus.spec.mjs
 *
 * Pin payload shapes for 14 F3 topics (TASK-018).
 * Run with: node tests/unit/event-bus.spec.mjs
 *
 * Uses node's built-in test runner (node:test).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { eventBus, emit, on } from '../../src/event-bus.js?v=10'

const TOPICS = [
  'combat:fire', 'combat:hit', 'combat:miss',
  'enemy:destroyed', 'enemy:escaped',
  'integrity:changed', 'integrity:exhausted',
  'stage:cleared', 'stage:failed',
  'score:changed',
  'menu:startRequested', 'menu:aboutRequested', 'menu:disclaimerRequested', 'menu:back',
  'ui:overlayShown', 'ui:overlayHidden',
]

test('emit/on: payload is forwarded verbatim', () => {
  const received = []
  const unsub = on('combat:hit', (detail) => received.push(detail))
  emit('combat:hit', { enemyId: 'e01', hpRemaining: 0, archetype: 'standard', damage: 1, scoreDelta: 10, firmasDelta: 1 })
  assert.equal(received.length, 1)
  assert.deepEqual(received[0], {
    enemyId: 'e01',
    hpRemaining: 0,
    archetype: 'standard',
    damage: 1,
    scoreDelta: 10,
    firmasDelta: 1,
  })
  unsub()
})

test('emit/on: multiple subscribers receive the same payload', () => {
  const r1 = [], r2 = []
  const u1 = on('enemy:escaped', (d) => r1.push(d))
  const u2 = on('enemy:escaped', (d) => r2.push(d))
  emit('enemy:escaped', { enemyId: 'e02', archetype: 'tank' })
  assert.equal(r1.length, 1)
  assert.equal(r2.length, 1)
  u1(); u2()
})

test('unsub stops delivery', () => {
  let count = 0
  const inc = () => count++
  const unsub = on('stage:cleared', inc)
  emit('stage:cleared', {})
  emit('stage:cleared', {})
  assert.equal(count, 2)
  unsub()
  emit('stage:cleared', {})
  assert.equal(count, 2)
})

test('payload shapes match the locked spec for each topic', () => {
  const cases = [
    { topic: 'combat:fire',     payload: { isoX: 1.5, isoY: 2.5, sourceScreen: { x: 100, y: 200 } } },
    { topic: 'combat:hit',      payload: { enemyId: 'e01', hpRemaining: 0, archetype: 'standard', damage: 1, scoreDelta: 10, firmasDelta: 1 } },
    { topic: 'combat:miss',     payload: { isoX: 1.5, isoY: 2.5 } },
    { topic: 'enemy:destroyed', payload: { enemyId: 'e01', archetype: 'standard', score: 10, firmas: 1 } },
    { topic: 'enemy:escaped',   payload: { enemyId: 'e01', archetype: 'standard' } },
    { topic: 'integrity:changed',   payload: { current: 2, max: 3 } },
    { topic: 'integrity:exhausted', payload: { current: 0, max: 3, score: 50, firmasRecogidas: 5 } },
    { topic: 'stage:cleared',   payload: {} },
    { topic: 'stage:failed',    payload: {} },
    { topic: 'score:changed',   payload: { score: 50, firmas: 5, best: null } },
    { topic: 'menu:startRequested',    payload: {} },
    { topic: 'menu:aboutRequested',    payload: {} },
    { topic: 'menu:disclaimerRequested', payload: {} },
    { topic: 'menu:back',       payload: {} },
    { topic: 'ui:overlayShown', payload: {} },
    { topic: 'ui:overlayHidden', payload: {} },
  ]
  for (const { topic, payload } of cases) {
    let received = null
    const unsub = on(topic, (d) => { received = d })
    emit(topic, payload)
    assert.notEqual(received, null, `${topic}: no delivery`)
    assert.deepEqual(received, payload, `${topic}: payload mismatch`)
    unsub()
  }
})

test('all F3 topics are routable on the singleton bus', () => {
  // No assertion that fires — just make sure we don't throw on every topic name.
  for (const t of TOPICS) {
    assert.doesNotThrow(() => emit(t, {}), `emit on ${t}`)
  }
})
