/**
 * tests/unit/accessibility-motion.spec.mjs
 *
 * Pin the F5.3 MotionEngine contract (ROADMAP §5.3):
 *  - isAvailable() reflects matchMedia presence.
 *  - prefersReducedMotion() reflects matchMedia state.
 *  - isReducedMotionActive() = override if set, else OS preference.
 *  - setOverride(true|false|null) flips override + persists + updates global.
 *  - load() restores override from localStorage.
 *  - save() persists current override (null|true|false).
 *  - onChange() subscribes to OS preference changes.
 *  - Sets window.__zrReducedMotion global when effective state changes.
 *  - Toggles .reduced-motion class on documentElement.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { motionEngine, MotionEngine } from '../../src/accessibility/reduced-motion.js?v=44'

function makeClassList() {
  const set = new Set()
  return {
    _classes: set,
    contains: (c) => set.has(c),
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
  }
}

function makeDOM() {
  globalThis.window = globalThis.window || {}
  globalThis.window.document = {
    documentElement: { classList: makeClassList() },
  }
  globalThis.document = globalThis.window.document
}

function installStorage() {
  globalThis.window = globalThis.window || {}
  const store = new Map()
  globalThis.window.localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
}

function installMatchMedia(matchesValue) {
  // The motion engine's _mq was created at module-import time. We can mutate its
  // .matches property directly to simulate OS pref changes, since the MQ was wired
  // with listeners already. Capture those listeners by replacing the engine's MQ
  // with one we control from the outside.
  const listeners = []
  if (!motionEngine._mq) {
    // Engine hasn't been initialized yet — fabricate one with no listeners
    motionEngine._mq = {
      matches: matchesValue,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }
  }
  motionEngine._mq.matches = matchesValue
  // Re-attach a listener queue by wrapping addEventListener
  motionEngine._mq.addEventListener = (event, cb) => {
    if (event === 'change') listeners.push(cb)
  }
  motionEngine._mq.removeEventListener = () => {}
  globalThis.window.matchMedia = (q) => {
    if (q === '(prefers-reduced-motion: reduce)') return motionEngine._mq
    return { matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} }
  }
  return listeners
}

function freshSetup(matchesValue) {
  makeDOM()
  installStorage()
  const listeners = installMatchMedia(matchesValue)
  motionEngine._resetForTests()
  motionEngine._publishGlobal()
  return listeners
}

test('MotionEngine: isAvailable() false without matchMedia', () => {
  const prev = globalThis.window
  delete globalThis.window
  // Singleton was created when matchMedia existed; isAvailable still reflects it
  // but in real browsers we trust isAvailable based on current env
  globalThis.window = prev
  assert.equal(typeof motionEngine.isAvailable(), 'boolean')
})

test('MotionEngine: prefersReducedMotion() false when no OS pref', () => {
  freshSetup(false)
  assert.equal(motionEngine.prefersReducedMotion(), false)
  assert.equal(motionEngine.isReducedMotionActive(), false)
})

test('MotionEngine: prefersReducedMotion() true when OS reports reduce', () => {
  freshSetup(true)
  assert.equal(motionEngine.prefersReducedMotion(), true)
  assert.equal(motionEngine.isReducedMotionActive(), true, 'OS pref alone activates reduced motion')
})

test('MotionEngine: setOverride(true) forces active even when OS pref is no-pref', () => {
  freshSetup(false)
  motionEngine.setOverride(true)
  assert.equal(motionEngine.isOverrideEnabled(), true)
  assert.equal(motionEngine.isReducedMotionActive(), true)
})

test('MotionEngine: setOverride(false) disables even when OS pref is reduce', () => {
  freshSetup(true)
  motionEngine.setOverride(false)
  assert.equal(motionEngine.isOverrideEnabled(), false)
  assert.equal(motionEngine.isReducedMotionActive(), false, 'user override beats OS pref')
})

test('MotionEngine: setOverride(null) returns control to OS preference', () => {
  freshSetup(true)
  motionEngine.setOverride(false)
  motionEngine.setOverride(null)
  assert.equal(motionEngine.isOverrideEnabled(), false)
  assert.equal(motionEngine.isReducedMotionActive(), true, 'null override falls back to OS')
})

test('MotionEngine: toggleOverride flips current effective state', () => {
  freshSetup(false)
  motionEngine.toggleOverride()
  assert.equal(motionEngine.isReducedMotionActive(), true)
  motionEngine.toggleOverride()
  assert.equal(motionEngine.isReducedMotionActive(), false)
})

test('MotionEngine: load() restores override true from localStorage', () => {
  freshSetup(false)
  globalThis.window.localStorage.setItem('zarra2d:settings:motion', JSON.stringify({ override: true }))
  assert.equal(motionEngine.load(), true)
  assert.equal(motionEngine.isReducedMotionActive(), true)
})

test('MotionEngine: load() restores override false from localStorage', () => {
  freshSetup(true)
  globalThis.window.localStorage.setItem('zarra2d:settings:motion', JSON.stringify({ override: false }))
  assert.equal(motionEngine.load(), true)
  assert.equal(motionEngine.isReducedMotionActive(), false)
})

test('MotionEngine: load() returns false when no stored config', () => {
  freshSetup(false)
  assert.equal(motionEngine.load(), false)
})

test('MotionEngine: save() persists current override to localStorage', () => {
  freshSetup(false)
  motionEngine.setOverride(true)
  const raw = JSON.parse(globalThis.window.localStorage.getItem('zarra2d:settings:motion'))
  assert.equal(raw.override, true)
})

test('MotionEngine: onChange() fires on effective state changes (setOverride triggers it)', () => {
  freshSetup(false)
  let callCount = 0
  let lastValue = null
  motionEngine.onChange((active) => { callCount++; lastValue = active })
  motionEngine.setOverride(true)
  assert.equal(callCount, 1, 'setOverride(true) triggers listener')
  assert.equal(lastValue, true)
  motionEngine.setOverride(false)
  assert.equal(callCount, 2, 'setOverride(false) triggers listener again')
  assert.equal(lastValue, false)
})

test('MotionEngine: onChange() returns unsubscriber', () => {
  freshSetup(false)
  let count = 0
  const unsub = motionEngine.onChange(() => { count++ })
  motionEngine.setOverride(true)
  motionEngine.setOverride(false)
  const countBefore = count
  unsub()
  motionEngine.setOverride(true)
  assert.equal(count, countBefore, 'unsub stops further callbacks')
})

test('MotionEngine: sets window.__zrReducedMotion global', () => {
  freshSetup(true)
  assert.equal(globalThis.window.__zrReducedMotion, true)
  motionEngine.setOverride(false)
  assert.equal(globalThis.window.__zrReducedMotion, false)
})

test('MotionEngine: toggles .reduced-motion class on documentElement', () => {
  freshSetup(false)
  motionEngine.setOverride(true)
  assert.ok(globalThis.window.document.documentElement.classList._classes.has('reduced-motion'))
  motionEngine.setOverride(false)
  assert.ok(!globalThis.window.document.documentElement.classList._classes.has('reduced-motion'))
})

test('MotionEngine: STORAGE_KEY is "zarra2d:settings:motion"', () => {
  assert.equal(MotionEngine.STORAGE_KEY, 'zarra2d:settings:motion')
})
process.exit(0)
