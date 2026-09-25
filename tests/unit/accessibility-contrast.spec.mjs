/**
 * tests/unit/accessibility-contrast.spec.mjs
 *
 * Pin the F5.2 ContrastEngine contract (ROADMAP §5.2):
 *  - Default state: disabled, no class on documentElement.
 *  - setEnabled(true) adds 'contrast-high' class to <html>.
 *  - setEnabled(false) removes the class.
 *  - toggle() flips state + persists.
 *  - load() restores from localStorage 'zarra2d:settings:contrast'.
 *  - save() persists current state.
 *  - Detects pre-existing class on construction (constructor picks up DOM).
 */
import test from 'node:test'
import assert from 'node:assert/strict'

function makeDOM() {
  globalThis.window = globalThis.window || {}
  globalThis.window.document = {
    documentElement: {
      classList: makeClassList(),
      _classes: new Set(),
    },
  }
  globalThis.document = globalThis.window.document
}

function makeClassList() {
  const set = new Set()
  return {
    _classes: set,
    contains: (c) => set.has(c),
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    toggle: (c, force) => {
      if (force === true) { set.add(c); return true }
      if (force === false) { set.delete(c); return false }
      if (set.has(c)) { set.delete(c); return false }
      set.add(c); return true
    },
  }
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

async function freshEngine() {
  delete globalThis.window
  delete globalThis.document
  const mod = await import('../../src/accessibility/contrast.js?v=44&t=' + Date.now() + Math.random())
  return mod.contrastEngine
}

test('ContrastEngine: isAvailable() false without document', async () => {
  const eng = await freshEngine()
  assert.equal(eng.isAvailable(), false)
})

test('ContrastEngine: defaults to disabled when no localStorage and no DOM class', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  assert.equal(eng.isEnabled(), false)
  assert.equal(eng.isAvailable(), true)
})

test('ContrastEngine: setEnabled(true) adds contrast-high class to documentElement', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  eng.setEnabled(true)
  assert.equal(eng.isEnabled(), true)
  assert.ok(globalThis.document.documentElement.classList._classes.has('contrast-high'))
})

test('ContrastEngine: setEnabled(false) removes the class', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  eng.setEnabled(true)
  eng.setEnabled(false)
  assert.equal(eng.isEnabled(), false)
  assert.ok(!globalThis.document.documentElement.classList._classes.has('contrast-high'))
})

test('ContrastEngine: toggle() flips state and persists', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  const result = eng.toggle()
  assert.equal(result, true)
  assert.equal(eng.isEnabled(), true)
  const stored = JSON.parse(globalThis.window.localStorage.getItem('zarra2d:settings:contrast'))
  assert.equal(stored.enabled, true)
  eng.toggle()
  assert.equal(eng.isEnabled(), false)
  const stored2 = JSON.parse(globalThis.window.localStorage.getItem('zarra2d:settings:contrast'))
  assert.equal(stored2.enabled, false)
})

test('ContrastEngine: save() persists current state without flipping it', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  eng.setEnabled(true)
  eng.save()
  const stored = JSON.parse(globalThis.window.localStorage.getItem('zarra2d:settings:contrast'))
  assert.equal(stored.enabled, true)
})

test('ContrastEngine: load() restores true from localStorage', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  globalThis.window.localStorage.setItem('zarra2d:settings:contrast', JSON.stringify({ enabled: true }))
  const result = eng.load()
  assert.equal(result, true)
  assert.equal(eng.isEnabled(), true)
  assert.ok(globalThis.document.documentElement.classList._classes.has('contrast-high'))
})

test('ContrastEngine: load() restores false from localStorage', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  globalThis.window.localStorage.setItem('zarra2d:settings:contrast', JSON.stringify({ enabled: false }))
  assert.equal(eng.load(), true)
  assert.equal(eng.isEnabled(), false)
})

test('ContrastEngine: load() returns false when no stored config', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  assert.equal(eng.load(), false)
})

test('ContrastEngine: load() returns false on malformed JSON', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  globalThis.window.localStorage.setItem('zarra2d:settings:contrast', 'not-json')
  assert.equal(eng.load(), false)
})

test('ContrastEngine: STORAGE_KEY is "zarra2d:settings:contrast"', async () => {
  const mod = await import('../../src/accessibility/contrast.js?v=44&t=key-' + Date.now())
  assert.equal(mod.ContrastEngine.STORAGE_KEY, 'zarra2d:settings:contrast')
})

test('ContrastEngine: CLASS_NAME is "contrast-high"', async () => {
  const mod = await import('../../src/accessibility/contrast.js?v=44&t=cls-' + Date.now())
  assert.equal(mod.ContrastEngine.CLASS_NAME, 'contrast-high')
})

test('ContrastEngine: setEnabled is idempotent — calling twice does not double-add', async () => {
  const eng = await freshEngine()
  makeDOM()
  installStorage()
  eng.setEnabled(true)
  eng.setEnabled(true)
  assert.ok(globalThis.document.documentElement.classList._classes.has('contrast-high'))
  assert.equal(globalThis.document.documentElement.classList._classes.size, 1)
})


process.exit(0)
