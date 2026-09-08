/**
 * tests/unit/integrity.spec.mjs
 *
 * Pin integrity drain semantics: floors at 0; emits once on >0 -> 0.
 * Run with: node tests/unit/integrity.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { Integrity } from '../../src/integrity.js?v=19'
import { eventBus } from '../../src/event-bus.js?v=19'

function captureEvents() {
  const events = []
  const cb = (e) => events.push({ topic: e.type, detail: e.detail })
  eventBus.addEventListener('integrity:changed', cb)
  eventBus.addEventListener('integrity:exhausted', cb)
  return {
    events,
    cleanup() {
      eventBus.removeEventListener('integrity:changed', cb)
      eventBus.removeEventListener('integrity:exhausted', cb)
    },
  }
}

test('initial state: 3/3 segments, not exhausted', () => {
  const c = captureEvents()
  const i = new Integrity({ scoreReader: () => ({ score: 0, firmas: 0 }) })
  assert.deepEqual(i.read(), { current: 3, max: 3, exhausted: false })
  c.cleanup()
})

test('drain decrements by 1 each call', () => {
  const c = captureEvents()
  const i = new Integrity({ scoreReader: () => ({ score: 0, firmas: 0 }) })
  i.drain()
  assert.equal(i.read().current, 2)
  i.drain()
  assert.equal(i.read().current, 1)
  c.cleanup()
})

test('drain floors at 0 — no negative', () => {
  const c = captureEvents()
  const i = new Integrity({ scoreReader: () => ({ score: 0, firmas: 0 }) })
  i.drain(); i.drain(); i.drain()
  assert.equal(i.read().current, 0)
  i.drain()  // extra drain
  assert.equal(i.read().current, 0)
  c.cleanup()
})

test('emits integrity:exhausted exactly once on >0 -> 0', () => {
  const c = captureEvents()
  const i = new Integrity({ scoreReader: () => ({ score: 50, firmas: 5 }) })
  i.drain()
  i.drain()
  i.drain()  // 0
  i.drain()  // extra — should NOT re-emit exhausted
  const exhausted = c.events.filter(e => e.topic === 'integrity:exhausted')
  assert.equal(exhausted.length, 1)
  assert.equal(exhausted[0].detail.current, 0)
  assert.equal(exhausted[0].detail.max, 3)
  assert.equal(exhausted[0].detail.score, 50)
  assert.equal(exhausted[0].detail.firmasRecogidas, 5)
  c.cleanup()
})

test('emits integrity:changed on every drain that actually changed state', () => {
  const c = captureEvents()
  const i = new Integrity({ scoreReader: () => ({ score: 0, firmas: 0 }) })
  i.drain()
  i.drain()
  i.drain()
  i.drain()  // floor — no change
  const changed = c.events.filter(e => e.topic === 'integrity:changed')
  assert.equal(changed.length, 3)
  assert.deepEqual(changed.map(e => e.detail.current), [2, 1, 0])
  c.cleanup()
})

test('reset() returns to { current: 3, max: 3 } and clears exhausted latch', () => {
  const c = captureEvents()
  const i = new Integrity({ scoreReader: () => ({ score: 0, firmas: 0 }) })
  i.drain(); i.drain(); i.drain()
  assert.equal(i.read().exhausted, true)
  i.reset()
  assert.deepEqual(i.read(), { current: 3, max: 3, exhausted: false })
  // Exhausted events should not re-emit on subsequent drains until reset.
  i.drain(); i.drain(); i.drain()
  const exhaustedCount = c.events.filter(e => e.topic === 'integrity:exhausted').length
  // 1 from first cycle + 1 from second cycle = 2 total (reset clears the latch).
  assert.equal(exhaustedCount, 2)
  c.cleanup()
})

test('freeze() prevents further drains', () => {
  const c = captureEvents()
  const i = new Integrity({ scoreReader: () => ({ score: 0, firmas: 0 }) })
  i.freeze()
  i.drain()
  assert.equal(i.read().current, 3, 'frozen integrity must not drain')
  c.cleanup()
})
