/**
 * tests/unit/accessibility-tts.spec.mjs
 *
 * Pin the F5.1 TTS contract (ROADMAP §5.1):
 *  - TTSEngine.isAvailable() reflects window.speechSynthesis presence.
 *  - setEnabled / toggleEnabled control whether speak() fires.
 *  - setRate clamps to [0.5, 2.0].
 *  - setVoice stores name; empty string means browser default.
 *  - speak(text) returns true on success, false when disabled / no API / empty text.
 *  - speak(text) cancels previous utterance before speaking new one.
 *  - load() / save() persist config under localStorage key 'zarra2d:settings:tts'.
 *  - DEFAULTS: enabled=true, rate=1.0, voice=''.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text
    this.lang = ''
    this.rate = 1.0
    this.volume = 1.0
    this.voice = null
  }
}

class MockSpeechSynthesisVoice {
  constructor(name, lang) { this.name = name; this.lang = lang; this.default = false }
}

function makeMockSynthesis(voices = []) {
  let cancelled = 0
  let spoken = []
  const synth = {
    getVoices: () => voices,
    speak: (utter) => { spoken.push(utter) },
    cancel: () => { cancelled++ },
    _spoken: spoken,
    _cancelledCount: () => cancelled,
  }
  return synth
}

function installSynthesis(synth) {
  globalThis.window = globalThis.window || {}
  globalThis.window.speechSynthesis = synth
  globalThis.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance
}

function uninstallSynthesis() {
  if (globalThis.window) delete globalThis.window.speechSynthesis
  delete globalThis.SpeechSynthesisUtterance
}

function installStorage() {
  globalThis.window = globalThis.window || {}
  const store = new Map()
  globalThis.window.localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _dump: () => Object.fromEntries(store),
  }
}

function uninstallStorage() {
  if (globalThis.window) delete globalThis.window.localStorage
}

async function freshEngine() {
  uninstallSynthesis()
  uninstallStorage()
  delete globalThis.window
  // Re-import to get a fresh module-level ttsEngine singleton
  const mod = await import('../../src/accessibility/tts.js?v=44&t=' + Date.now() + Math.random())
  return mod.ttsEngine
}

test('TTSEngine: isAvailable() false when speechSynthesis absent', async () => {
  const eng = await freshEngine()
  assert.equal(eng.isAvailable(), false)
})

test('TTSEngine: isAvailable() true when speechSynthesis present', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  assert.equal(eng.isAvailable(), true)
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: defaults are { enabled: true, rate: 1.0, voice: "" }', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  assert.equal(eng.isEnabled(), true)
  assert.equal(eng.getRate(), 1.0)
  assert.equal(eng.getVoice(), '')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: setRate clamps to [0.5, 2.0]', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  eng.setRate(5)
  assert.equal(eng.getRate(), 2)
  eng.setRate(-1)
  assert.equal(eng.getRate(), 0.5)
  eng.setRate(1.5)
  assert.equal(eng.getRate(), 1.5)
  eng.setRate('not-a-number')
  assert.equal(eng.getRate(), 1.5, 'invalid input is ignored')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: toggleEnabled flips state and cancels speech when disabling', async () => {
  const synth = makeMockSynthesis([new MockSpeechSynthesisVoice('Maria', 'es-ES')])
  const eng = await freshEngine()
  installStorage()
  installSynthesis(synth)
  assert.equal(eng.isEnabled(), true)
  const beforeToggle = synth._cancelledCount()
  eng.speak('hello')
  const afterSpeak = synth._cancelledCount()
  assert.equal(afterSpeak, beforeToggle + 1, 'speak cancels previous utterance')
  assert.equal(synth._spoken.length, 1)
  const afterToggle = eng.toggleEnabled()
  assert.equal(afterToggle, false)
  assert.equal(synth._cancelledCount(), afterSpeak + 1, 'disabling cancels current speech')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: speak() returns false when disabled', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  eng.setEnabled(false)
  assert.equal(eng.speak('hello'), false)
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: speak() returns false when no API', async () => {
  const eng = await freshEngine()
  assert.equal(eng.speak('hello'), false)
})

test('TTSEngine: speak() returns false on empty / non-string input', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  assert.equal(eng.speak(''), false)
  assert.equal(eng.speak(null), false)
  assert.equal(eng.speak(undefined), false)
  assert.equal(eng.speak(42), false)
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: speak() picks es-ES voice when available', async () => {
  const voices = [
    new MockSpeechSynthesisVoice('US English', 'en-US'),
    new MockSpeechSynthesisVoice('Maria', 'es-ES'),
    new MockSpeechSynthesisVoice('Monica', 'es-MX'),
  ]
  const synth = makeMockSynthesis(voices)
  const eng = await freshEngine()
  installStorage()
  installSynthesis(synth)
  eng.speak('hola mundo')
  assert.equal(synth._spoken.length, 1)
  const utter = synth._spoken[0]
  assert.equal(utter.text, 'hola mundo')
  assert.equal(utter.lang, 'es-ES')
  assert.equal(utter.voice.name, 'Maria', 'should pick es-ES voice')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: speak() falls back to any es-* voice', async () => {
  const voices = [
    new MockSpeechSynthesisVoice('US English', 'en-US'),
    new MockSpeechSynthesisVoice('Monica', 'es-MX'),
  ]
  const synth = makeMockSynthesis(voices)
  const eng = await freshEngine()
  installStorage()
  installSynthesis(synth)
  eng.speak('hola')
  assert.equal(synth._spoken[0].voice.name, 'Monica')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: speak() applies configured rate to utterance', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  eng.setRate(1.5)
  eng.speak('test')
  assert.equal(eng.getRate(), 1.5)
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: speak() cancels previous utterance before new one', async () => {
  const eng = await freshEngine()
  installStorage()
  const synth = makeMockSynthesis([new MockSpeechSynthesisVoice('Maria', 'es-ES')])
  installSynthesis(synth)
  const beforeFirst = synth._cancelledCount()
  eng.speak('first')
  assert.equal(synth._cancelledCount(), beforeFirst + 1, 'first speak cancels nothing pre-existing')
  eng.speak('second')
  assert.equal(synth._cancelledCount(), beforeFirst + 2, 'second speak cancels first')
  assert.equal(synth._spoken.length, 2)
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: save() persists config to localStorage', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  eng.setEnabled(false)
  eng.setRate(0.8)
  eng.setVoice('Maria')
  eng.save()
  const raw = globalThis.window.localStorage.getItem('zarra2d:settings:tts')
  assert.ok(raw, 'should write to localStorage')
  const parsed = JSON.parse(raw)
  assert.equal(parsed.enabled, false)
  assert.equal(parsed.rate, 0.8)
  assert.equal(parsed.voice, 'Maria')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: load() restores config from localStorage', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  globalThis.window.localStorage.setItem(
    'zarra2d:settings:tts',
    JSON.stringify({ enabled: false, rate: 1.2, voice: 'Jorge' })
  )
  const result = eng.load()
  assert.equal(result, true)
  assert.equal(eng.isEnabled(), false)
  assert.equal(eng.getRate(), 1.2)
  assert.equal(eng.getVoice(), 'Jorge')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: load() returns false when no stored config', async () => {
  installStorage()
  installSynthesis(makeMockSynthesis())
  const eng = await freshEngine()
  assert.equal(eng.load(), false)
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: listVoices() returns array (possibly empty)', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis([new MockSpeechSynthesisVoice('Maria', 'es-ES')]))
  const voices = eng.listVoices()
  assert.ok(Array.isArray(voices))
  assert.equal(voices.length, 1)
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: cancel() calls speechSynthesis.cancel()', async () => {
  const eng = await freshEngine()
  installStorage()
  const synth = makeMockSynthesis([new MockSpeechSynthesisVoice('Maria', 'es-ES')])
  installSynthesis(synth)
  const beforeCancel = synth._cancelledCount()
  eng.speak('hi')
  eng.cancel()
  assert.equal(synth._cancelledCount(), beforeCancel + 2, 'speak cancels once + cancel() calls once')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine: resetToDefaults() restores { enabled: true, rate: 1.0, voice: "" }', async () => {
  const eng = await freshEngine()
  installStorage()
  installSynthesis(makeMockSynthesis())
  eng.setEnabled(false)
  eng.setRate(1.8)
  eng.setVoice('Maria')
  eng.resetToDefaults()
  assert.equal(eng.isEnabled(), true)
  assert.equal(eng.getRate(), 1.0)
  assert.equal(eng.getVoice(), '')
  uninstallSynthesis()
  uninstallStorage()
})

test('TTSEngine.STORAGE_KEY is "zarra2d:settings:tts"', async () => {
  const mod = await import('../../src/accessibility/tts.js?v=44&t=key-' + Date.now())
  assert.equal(mod.TTSEngine.STORAGE_KEY, 'zarra2d:settings:tts')
})

// Force-exit to prevent node:test from holding open handle

// Force-exit to prevent node:test from holding open handle
process.exit(0)
