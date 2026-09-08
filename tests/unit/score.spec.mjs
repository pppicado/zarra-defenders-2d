/**
 * tests/unit/score.spec.mjs
 *
 * Pin score.addHit deltas + tryWriteBest overwrite rule.
 * Run with: node tests/unit/score.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { Score, BEST_KEY } from '../../src/score.js?v=19'

/** Fresh in-memory storage stub. */
function makeStorage(initial = {}) {
  const store = { ...initial }
  return {
    _store: store,
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null },
    setItem(k, v) { store[k] = v },
    removeItem(k) { delete store[k] },
    clear() { Object.keys(store).forEach(k => delete store[k]) },
  }
}

test('addHit applies the locked multiplier table', () => {
  const s = new Score({ storage: makeStorage() })
  s.addHit(1)    // standard
  assert.equal(s.read().score, 10)
  assert.equal(s.read().firmas, 1)
  s.addHit(1.5)  // tank
  assert.equal(s.read().score, 25)  // 10 + 15
  s.addHit(2)    // mini-boss
  assert.equal(s.read().score, 45)  // 25 + 20
  s.addHit(3)    // boss
  assert.equal(s.read().score, 75)  // 45 + 30
  assert.equal(s.read().firmas, 4)
})

test('reset() clears score + firmas but keeps best intact', () => {
  const s = new Score({ storage: makeStorage() })
  s.addHit(1)
  s.score = 100; s.firmas = 10  // arbitrary
  s.tryWriteBest()
  s.reset()
  assert.equal(s.read().score, 0)
  assert.equal(s.read().firmas, 0)
  assert.notEqual(s.read().best, null)
})

test('tryWriteBest writes when new firmas > stored firmas', () => {
  const s = new Score({ storage: makeStorage() })
  s.score = 30; s.firmas = 3
  const wrote = s.tryWriteBest()
  assert.equal(wrote, true)
  assert.deepEqual(s.read().best, { score: 30, firmas: 3, date: s.read().best.date })
  assert.equal(typeof s.read().best.date, 'string')
})

test('tryWriteBest writes when firmas tie AND new score > stored', () => {
  const s = new Score({ storage: makeStorage({ [BEST_KEY]: JSON.stringify({ score: 10, firmas: 3, date: 'old' }) }) })
  s.score = 30; s.firmas = 3
  const wrote = s.tryWriteBest()
  assert.equal(wrote, true)
  assert.equal(s.read().best.score, 30)
})

test('tryWriteBest does NOT write when new firmas < stored firmas', () => {
  const oldDate = 'old'
  const s = new Score({ storage: makeStorage({ [BEST_KEY]: JSON.stringify({ score: 100, firmas: 10, date: oldDate }) }) })
  s.score = 1000; s.firmas = 1
  const wrote = s.tryWriteBest()
  assert.equal(wrote, false)
  assert.equal(s.read().best.score, 100, 'best must remain the old record')
})

test('tryWriteBest does NOT write when firmas tie and new score <= stored', () => {
  const s = new Score({ storage: makeStorage({ [BEST_KEY]: JSON.stringify({ score: 100, firmas: 3, date: 'old' }) }) })
  s.score = 100; s.firmas = 3
  assert.equal(s.tryWriteBest(), false)
  s.score = 99; s.firmas = 3
  assert.equal(s.tryWriteBest(), false)
})

test('tryWriteBest swallows localStorage errors silently', () => {
  const throwingStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('SecurityError: storage disabled') },
    removeItem: () => {},
  }
  const s = new Score({ storage: throwingStorage })
  s.score = 10; s.firmas = 1
  // Should not throw, just return false.
  const wrote = s.tryWriteBest()
  assert.equal(wrote, false)
  assert.equal(s.read().best, null)
})

test('loadBest returns null for missing key', () => {
  const s = new Score({ storage: makeStorage() })
  assert.equal(s.loadBest(), null)
})

test('loadBest parses valid JSON record', () => {
  const rec = { score: 10, firmas: 3, date: '2026-09-07' }
  const s = new Score({ storage: makeStorage({ [BEST_KEY]: JSON.stringify(rec) }) })
  assert.deepEqual(s.loadBest(), rec)
})

test('loadBest returns null for corrupt JSON', () => {
  const s = new Score({ storage: makeStorage({ [BEST_KEY]: '{ broken json' }) })
  assert.equal(s.loadBest(), null)
})

test('loadBest returns null when storage throws', () => {
  const s = new Score({ storage: { getItem: () => { throw new Error('quota') }, setItem: () => {} } })
  assert.equal(s.loadBest(), null)
})
