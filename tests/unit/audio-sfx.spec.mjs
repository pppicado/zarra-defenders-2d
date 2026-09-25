/**
 * tests/unit/audio-sfx.spec.mjs
 *
 * Pin the F4.2 SFXEngine contract (ROADMAP §4.2):
 *  - play(name) acepta exactamente los 8 nombres: fire, hit, card, gameover,
 *    victory, click, transition, error.
 *  - play(name) con nombre inválido → false (no lanza excepción).
 *  - listAvailable() devuelve los 8 nombres en cualquier orden.
 *  - Sin AudioContext: play() devuelve false silenciosamente (no lanza).
 *  - Con AudioContext mockeado: play(name) devuelve true.
 *
 * Cada SFX es una llamada que se dispatcha internamente — no verificamos DSP
 * (eso ocurre en tests/e2e/audio-flow.spec.mjs con Chromium real).
 *
 * Run: node tests/unit/audio-sfx.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import * as audioCtx from '../../src/audio/audio-context.js?v=44'
import { SFXEngine } from '../../src/audio/sfx.js?v=44'

class MockOscillator {
  constructor() { this.started = 0; this.stopped = 0; this.onended = null; this.type = 'sine'; this.frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} } }
  start() { this.started++ }
  stop() { this.stopped++ }
  connect(dest) { return dest }
}

class MockGain {
  constructor() { this.gain = { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} } }
  connect(dest) { return dest }
}

class MockFilter {
  constructor(type) { this.type = type; this.frequency = { value: 1000, setValueAtTime() {}, exponentialRampToValueAtTime() {} }; this.Q = { value: 1 } }
  connect(dest) { return dest }
}

class MockBuffer {
  constructor(channels, length, sr) { this.channels = channels; this.length = length; this.sampleRate = sr }
  getChannelData() { return new Float32Array(this.length) }
}

class MockBufferSource {
  constructor() { this.buffer = null; this.onended = null }
  connect(dest) { return dest }
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() { this.sampleRate = 44100; this.currentTime = 0; this.state = 'running' }
  createOscillator() { return new MockOscillator() }
  createGain() { return new MockGain() }
  createBiquadFilter(type) { return new MockFilter(type) }
  createBuffer(c, l, sr) { return new MockBuffer(c, l, sr) }
  createBufferSource() { return new MockBufferSource() }
  resume() { return Promise.resolve() }
  suspend() { return Promise.resolve() }
}

globalThis.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
}

// ============================================================
// Catálogo de SFX
// ============================================================

test('SFXEngine: listAvailable() contiene los 8 SFX del ROADMAP §4.2', () => {
  const sfx = new SFXEngine()
  const names = sfx.listAvailable()
  const expected = ['fire', 'hit', 'card', 'gameover', 'victory', 'click', 'transition', 'error']
  assert.equal(names.length, 8, `expected 8 SFX, got ${names.length}`)
  for (const n of expected) {
    assert.ok(names.includes(n), `missing SFX: ${n}`)
  }
})

// ============================================================
// play(name) — happy path con AudioContext mockeado
// ============================================================

test('SFXEngine: play(name) con AudioContext válido devuelve true para los 8 nombres', () => {
  audioCtx._resetForTests()
  const sfx = new SFXEngine()
  for (const n of ['fire', 'hit', 'card', 'gameover', 'victory', 'click', 'transition', 'error']) {
    assert.equal(sfx.play(n), true, `play(${n}) should return true`)
  }
})

test('SFXEngine: play(name) múltiples veces seguidas funciona', () => {
  audioCtx._resetForTests()
  const sfx = new SFXEngine()
  assert.equal(sfx.play('fire'), true)
  assert.equal(sfx.play('fire'), true)
  assert.equal(sfx.play('hit'), true)
})

// ============================================================
// play(name) — error path
// ============================================================

test('SFXEngine: play(nombre-inválido) devuelve false (no lanza)', () => {
  audioCtx._resetForTests()
  const sfx = new SFXEngine()
  for (const bad of ['foo', 'FIRE', '', 'firee', 'shoot', null, undefined, 42]) {
    assert.equal(sfx.play(bad), false, `play(${JSON.stringify(bad)}) should return false`)
  }
})

test('SFXEngine: play() sin AudioContext devuelve false silenciosamente', () => {
  delete globalThis.window.AudioContext
  delete globalThis.window.webkitAudioContext
  audioCtx._resetForTests()
  const sfx = new SFXEngine()
  for (const n of ['fire', 'hit', 'card', 'gameover', 'victory', 'click', 'transition', 'error']) {
    assert.equal(sfx.play(n), false, `play(${n}) without context should return false`)
  }
  globalThis.window.AudioContext = MockAudioContext
  globalThis.window.webkitAudioContext = MockAudioContext
})

// ============================================================
// Cada SFX genera osciladores/buffers correctos
// ============================================================

test('SFXEngine: fire genera 1 oscilador + 1 buffer source (noise + sine sweep)', () => {
  audioCtx._resetForTests()
  const ctx = audioCtx.ensureAudioContext()
  let oscCount = 0
  let bufferCount = 0
  const origCreateOsc = ctx.createOscillator.bind(ctx)
  const origCreateBuf = ctx.createBufferSource.bind(ctx)
  ctx.createOscillator = () => { oscCount++; return origCreateOsc() }
  ctx.createBufferSource = () => { bufferCount++; return origCreateBuf() }
  const sfx = new SFXEngine()
  sfx.play('fire')
  assert.equal(oscCount, 1, 'fire should create 1 oscillator (sine sweep)')
  assert.equal(bufferCount, 1, 'fire should create 1 buffer source (noise)')
})

test('SFXEngine: victory genera 4 osciladores (arpegio C5 E5 G5 C5)', () => {
  audioCtx._resetForTests()
  const ctx = audioCtx.ensureAudioContext()
  let oscCount = 0
  const origCreateOsc = ctx.createOscillator.bind(ctx)
  ctx.createOscillator = () => { oscCount++; return origCreateOsc() }
  const sfx = new SFXEngine()
  sfx.play('victory')
  assert.equal(oscCount, 4, 'victory should create 4 oscillators (4-note fragment)')
})

test('SFXEngine: card genera 3 osciladores (arpegio do-mi-sol)', () => {
  audioCtx._resetForTests()
  const ctx = audioCtx.ensureAudioContext()
  let oscCount = 0
  const origCreateOsc = ctx.createOscillator.bind(ctx)
  ctx.createOscillator = () => { oscCount++; return origCreateOsc() }
  const sfx = new SFXEngine()
  sfx.play('card')
  assert.equal(oscCount, 3, 'card should create 3 oscillators (C5, E5, G5)')
})

test('SFXEngine: gameover genera 2 osciladores (acorde disonante E4+F4)', () => {
  audioCtx._resetForTests()
  const ctx = audioCtx.ensureAudioContext()
  let oscCount = 0
  const origCreateOsc = ctx.createOscillator.bind(ctx)
  ctx.createOscillator = () => { oscCount++; return origCreateOsc() }
  const sfx = new SFXEngine()
  sfx.play('gameover')
  assert.equal(oscCount, 2, 'gameover should create 2 oscillators (segunda menor)')
})

test('SFXEngine: click genera 1 oscilador breve', () => {
  audioCtx._resetForTests()
  const ctx = audioCtx.ensureAudioContext()
  let oscCount = 0
  const origCreateOsc = ctx.createOscillator.bind(ctx)
  ctx.createOscillator = () => { oscCount++; return origCreateOsc() }
  const sfx = new SFXEngine()
  sfx.play('click')
  assert.equal(oscCount, 1, 'click should create 1 oscillator')
})

test('SFXEngine: error genera 2 osciladores sawtooth (disonancia)', () => {
  audioCtx._resetForTests()
  const ctx = audioCtx.ensureAudioContext()
  let oscCount = 0
  const origCreateOsc = ctx.createOscillator.bind(ctx)
  ctx.createOscillator = () => { oscCount++; return origCreateOsc() }
  const sfx = new SFXEngine()
  sfx.play('error')
  assert.equal(oscCount, 2, 'error should create 2 oscillators')
})

// ============================================================
// audio-context helpers
// ============================================================

test('audio-context: ensureAudioContext() retorna el mismo singleton', () => {
  audioCtx._resetForTests()
  const a = audioCtx.ensureAudioContext()
  const b = audioCtx.ensureAudioContext()
  assert.equal(a, b)
})

test('audio-context: getMasterVolume() refleja setMasterVolume()', () => {
  audioCtx._resetForTests()
  audioCtx.ensureAudioContext()
  assert.equal(audioCtx.getMasterVolume(), 0.6, 'default volume = 0.6')
  audioCtx.setMasterVolume(0.3)
  assert.equal(audioCtx.getMasterVolume(), 0.3)
  audioCtx.setMasterVolume(1.5)
  assert.equal(audioCtx.getMasterVolume(), 1, 'clamps to 1')
  audioCtx.setMasterVolume(-0.5)
  assert.equal(audioCtx.getMasterVolume(), 0, 'clamps to 0')
})

test('audio-context: setMuted / toggleMute', () => {
  audioCtx._resetForTests()
  audioCtx.ensureAudioContext()
  assert.equal(audioCtx.isMuted(), false)
  audioCtx.setMuted(true)
  assert.equal(audioCtx.isMuted(), true)
  audioCtx.setMuted(true)
  assert.equal(audioCtx.isMuted(), true)
  assert.equal(audioCtx.toggleMute(), false)
  assert.equal(audioCtx.toggleMute(), true)
})

test('audio-context: isAudioAvailable() true con AudioContext mockeado', () => {
  assert.equal(audioCtx.isAudioAvailable(), true)
})
// Force-exit to prevent node:test from holding open handle
process.exit(0)
