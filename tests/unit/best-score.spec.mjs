/**
 * tests/unit/best-score.spec.mjs
 *
 * Pin localStorage round-trip + corrupt / SecurityError silent fallback.
 * Run with: node tests/unit/best-score.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { Score, BEST_KEY } from '../../src/score.js?v=19'

class FakeStorage {
  constructor() { this._store = new Map(); this._throwOn = null }
  getItem(k) { if (this._throwOn === 'get') throw new Error('get-throw'); return this._store.has(k) ? this._store.get(k) : null }
  setItem(k, v) { if (this._throwOn === 'set') throw new Error('SecurityError: storage disabled'); this._store.set(k, v) }
  removeItem(k) { this._store.delete(k) }
  clear() { this._store.clear() }
}

test('round-trip: write then read', () => {
  const storage = new FakeStorage()
  const s1 = new Score({ storage })
  s1.score = 50; s1.firmas = 5
  s1.tryWriteBest()
  // New instance simulates a fresh page load
  const s2 = new Score({ storage })
  const best = s2.loadBest()
  assert.deepEqual(best, { score: 50, firmas: 5, date: best.date })
})

test('corrupt JSON in localStorage: loadBest returns null', () => {
  const storage = new FakeStorage()
  storage._store.set(BEST_KEY, '{ "score": 10, ')  // truncated JSON
  const s = new Score({ storage })
  assert.equal(s.loadBest(), null)
})

test('JSON.parse throws are caught silently', () => {
  const storage = new FakeStorage()
  storage._store.set(BEST_KEY, 'not even json')
  const s = new Score({ storage })
  assert.equal(s.loadBest(), null)
})

test('localStorage.setItem throws (SecurityError): silent fallback', () => {
  const storage = new FakeStorage()
  storage._throwOn = 'set'
  const s = new Score({ storage })
  s.score = 10; s.firmas = 1
  const wrote = s.tryWriteBest()
  assert.equal(wrote, false)
  assert.equal(s.read().best, null)
})

test('localStorage.getItem throws (quota): loadBest returns null', () => {
  const storage = new FakeStorage()
  storage._throwOn = 'get'
  const s = new Score({ storage })
  assert.equal(s.loadBest(), null)
})

test('record with wrong shape (missing date): loadBest returns null', () => {
  const storage = new FakeStorage()
  storage._store.set(BEST_KEY, JSON.stringify({ score: 10, firmas: 5 }))  // no date
  const s = new Score({ storage })
  assert.equal(s.loadBest(), null)
})
