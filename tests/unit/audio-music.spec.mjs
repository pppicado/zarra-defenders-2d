/**
 * tests/unit/audio-music.spec.mjs
 *
 * Pin the F4.1 MusicEngine contract (ROADMAP §4.1):
 *  - start(stageId) arranca loop para stages válidos; ignora 'menu'/'data'/'final'/'gameover'.
 *  - start(stageId) con stageId inválido → no-op.
 *  - stop() limpia timer y apaga playing.
 *  - pause()/resume() controla el timer.
 *  - isPlaying() refleja el estado real.
 *  - Tempo por stage: 110/118/124/130/138 BPM para stage1..stage5.
 *  - Lead melody = 24 beats (8 compases × 3/4), con G4 como primera y última nota
 *    (garantiza loop seamless).
 *  - Bass pattern = 24 beats, con alternancia G2/D3 en tiempos fuertes.
 *  - Palillo suena en beats 2, 5, 8, 11, ... (cada 3er beat empezando en 2).
 *
 * AudioContext se mockea para que ensureAudioContext() retorne un stub. La
 * verificación DSP real ocurre en tests/e2e/audio-flow.spec.mjs.
 *
 * Run: node tests/unit/audio-music.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import * as audioCtx from '../../src/audio/audio-context.js?v=44'
import { MusicEngine, _MUSIC_DEBUG } from '../../src/audio/music.js?v=44'

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
// Public API — silent stages + invalid stages
// ============================================================

test('MusicEngine: silent stages (menu/data/final/gameover) no inician loop', () => {
  for (const s of ['menu', 'data', 'final', 'gameover']) {
    audioCtx._resetForTests()
    const m = new MusicEngine()
    m.start(s)
    assert.equal(m.isPlaying(), false, `${s} should not start playback`)
    assert.equal(m.getStage(), null)
  }
})

test('MusicEngine: start(stageId) con stageId inválido no hace nada', () => {
  audioCtx._resetForTests()
  const m = new MusicEngine()
  m.start('stage-inexistente')
  assert.equal(m.isPlaying(), false)
})

// ============================================================
// Public API — start/stop/pause/resume
// ============================================================

test('MusicEngine: start(stage1) arranca loop y setea stageId + tempo', () => {
  audioCtx._resetForTests()
  const m = new MusicEngine()
  m.start('stage1')
  assert.equal(m.isPlaying(), true)
  assert.equal(m.getStage(), 'stage1')
  assert.equal(m._tempo, 110)
  assert.equal(m._beatDuration, 60 / 110)
  m.stop()
})

test('MusicEngine: tempo correcto por stage (5 stages)', () => {
  const expected = [
    ['stage1', 110],
    ['stage2', 118],
    ['stage3', 124],
    ['stage4', 130],
    ['stage5', 138],
  ]
  for (const [stage, bpm] of expected) {
    audioCtx._resetForTests()
    const m = new MusicEngine()
    m.start(stage)
    assert.equal(m._tempo, bpm, `${stage} should be ${bpm} BPM, got ${m._tempo}`)
    assert.ok(Math.abs(m._beatDuration - 60 / bpm) < 0.001)
    m.stop()
  }
})

test('MusicEngine: start(otro stage) reemplaza el actual', () => {
  audioCtx._resetForTests()
  const m = new MusicEngine()
  m.start('stage1')
  assert.equal(m.getStage(), 'stage1')
  m.start('stage4')
  assert.equal(m.getStage(), 'stage4')
  assert.equal(m._tempo, 130)
  m.stop()
})

test('MusicEngine: start(mismo stage) dos veces es idempotente', () => {
  audioCtx._resetForTests()
  const m = new MusicEngine()
  m.start('stage2')
  const firstTimer = m._timer
  m.start('stage2')
  assert.equal(m._timer, firstTimer, 'should not replace timer on same stage')
  m.stop()
})

test('MusicEngine: stop() limpia timer + playing', () => {
  audioCtx._resetForTests()
  const m = new MusicEngine()
  m.start('stage3')
  assert.ok(m._timer)
  m.stop()
  assert.equal(m.isPlaying(), false)
  assert.equal(m._timer, null)
  assert.equal(m.getStage(), null)
})

test('MusicEngine: pause()/resume() controla el timer', () => {
  audioCtx._resetForTests()
  const m = new MusicEngine()
  m.start('stage1')
  assert.ok(m._timer)
  m.pause()
  assert.equal(m._timer, null)
  assert.equal(m.isPlaying(), true, 'pause keeps _playing=true')
  m.resume()
  assert.ok(m._timer)
  m.stop()
  assert.equal(m._timer, null, 'stop must clear timer to prevent Node hanging')
})

// ============================================================
// Music constants — estructura de la melodía
// ============================================================

test('MusicEngine: lead melody tiene 24 beats, primera y última nota = G4 (seamless loop)', () => {
  assert.equal(_MUSIC_DEBUG.LEAD_MELODY.length, 24, 'melody must be 24 beats (8 × 3/4)')
  assert.equal(_MUSIC_DEBUG.LEAD_MELODY[0], 'G4')
  assert.equal(_MUSIC_DEBUG.LEAD_MELODY[23], 'G4', 'last note must match first for seamless loop')
})

test('MusicEngine: bass pattern tiene 24 beats', () => {
  assert.equal(_MUSIC_DEBUG.BASS_PATTERN.length, 24)
})

test('MusicEngine: palillo beats son {2, 5, 8, 11, 14, 17, 20, 23}', () => {
  const expected = [2, 5, 8, 11, 14, 17, 20, 23]
  for (const b of expected) {
    assert.ok(_MUSIC_DEBUG.PALILLO_BEATS.has(b), `beat ${b} should have palillo`)
  }
  assert.equal(_MUSIC_DEBUG.PALILLO_BEATS.size, 8)
})

test('MusicEngine: la melodía usa solo notas de Sol mayor (sin modulación)', () => {
  const solMayor = new Set(['G3','A3','B3','C4','D4','E4','Fs4','G4','A4','B4','C5','D5','E5','Fs5','G5'])
  for (const n of _MUSIC_DEBUG.LEAD_MELODY) {
    assert.ok(solMayor.has(n), `${n} should be in Sol mayor scale`)
  }
})

test('MusicEngine: bass pattern solo usa G2 y D3', () => {
  for (const n of _MUSIC_DEBUG.BASS_PATTERN) {
    if (n === null) continue
    assert.ok(n === 'G2' || n === 'D3', `bass note ${n} must be G2 or D3`)
  }
})

// ============================================================
// Comportamiento sin AudioContext
// ============================================================

test('MusicEngine: play() sin AudioContext devuelve no-op silencioso', () => {
  delete globalThis.window.AudioContext
  delete globalThis.window.webkitAudioContext
  audioCtx._resetForTests()
  const m = new MusicEngine()
  m.start('stage1')
  assert.equal(m.isPlaying(), false, 'should not start without AudioContext')
  assert.equal(m._timer, null)
  globalThis.window.AudioContext = MockAudioContext
  globalThis.window.webkitAudioContext = MockAudioContext
})

test('MusicEngine: stop() sin contexto previo no lanza excepción', () => {
  audioCtx._resetForTests()
  const m = new MusicEngine()
  assert.doesNotThrow(() => m.stop())
})
// Force-exit to prevent node:test from holding open handle
process.exit(0)
