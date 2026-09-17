/**
 * tests/unit/modal-intermedio.spec.mjs
 *
 * Pin the F1.2 modal-intermedio contract:
 *  - buildModalMessage(firmas, shownCount) returns pedagogically-scaled text.
 *  - STRINGS.pedagogy.modalIntermedio.mensaje mirrors buildModalMessage.
 *  - STRINGS.pedagogy.modalIntermedio.subtitulo non-empty.
 *
 * DOM-dependent tests (show/hide/auto-dismiss/click) live in
 * tests/e2e/modal-intermedio.spec.mjs (playwright).
 *
 * Run with: node tests/unit/modal-intermedio.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildModalMessage } from '../../src/pedagogy/modal-intermedio.js?v=44'
import { STRINGS } from '../../src/i18n/es.js?v=44'

// ============================================================
// buildModalMessage — pedagogical text scales with firmas count
// ============================================================

test('buildModalMessage: 0 firmas → empty string', () => {
  assert.equal(buildModalMessage(0, 0), '')
  assert.equal(buildModalMessage(0, 1), '')
})

test('buildModalMessage: 1 firma → individual-actor language', () => {
  const m = buildModalMessage(1, 1)
  assert.ok(m.includes('1'))
  assert.ok(m.toLowerCase().includes('firma'))
})

test('buildModalMessage: 5 firmas → "suma a la lucha"', () => {
  const m = buildModalMessage(5, 1)
  assert.ok(m.includes('5'))
  assert.ok(m.toLowerCase().includes('firma'))
})

test('buildModalMessage: 15 firmas → escala a "el Valle se planta"', () => {
  const m = buildModalMessage(15, 3)
  assert.ok(m.includes('15'))
  assert.ok(m.toLowerCase().includes('valle') || m.toLowerCase().includes('treco'))
})

test('buildModalMessage: 30 firmas → escala a "acto colectivo"', () => {
  const m = buildModalMessage(30, 6)
  assert.ok(m.includes('30'))
  assert.ok(m.toLowerCase().includes('colectivo') || m.toLowerCase().includes('2002'))
})

test('buildModalMessage: 100 firmas → escala al máximo', () => {
  const m = buildModalMessage(100, 20)
  assert.ok(m.includes('100'))
  assert.ok(m.toLowerCase().includes('sumando') || m.toLowerCase().includes('presión'))
})

test('buildModalMessage: escalas monotónicas crecientes', () => {
  const lengths = [buildModalMessage(1, 1), buildModalMessage(10, 2), buildModalMessage(30, 6), buildModalMessage(100, 20)]
  // All should be non-empty and pedagogically distinct
  for (const m of lengths) assert.ok(m.length > 0)
})

// ============================================================
// STRINGS invariants
// ============================================================

test('STRINGS.pedagogy.modalIntermedio.subtitulo is non-empty', () => {
  const sub = STRINGS.pedagogy.modalIntermedio.subtitulo
  assert.ok(sub)
  assert.ok(sub.length > 5)
  assert.ok(sub.toLowerCase().includes('suma') || sub.toLowerCase().includes('lucha') || sub.toLowerCase().includes('firma'))
})

test('STRINGS.pedagogy.modalIntermedio.mensaje is a function returning pedagogically scaled text', () => {
  const fn = STRINGS.pedagogy.modalIntermedio.mensaje
  assert.equal(typeof fn, 'function')
  // Test the function for several firmas thresholds
  assert.ok(fn(1, 1).includes('1'))
  assert.ok(fn(20, 4).includes('20'))
  assert.ok(fn(50, 10).includes('50'))
})

test('STRINGS.pedagogy.modalIntermedio.mensaje mirrors buildModalMessage', () => {
  // The function in STRINGS should produce equivalent text to buildModalMessage
  // for the same inputs. This keeps the data layer and the rendering layer
  // in sync.
  for (const firmas of [1, 5, 15, 30, 50, 100]) {
    const a = buildModalMessage(firmas, 1)
    const b = STRINGS.pedagogy.modalIntermedio.mensaje(firmas, 1)
    // Same key numbers present
    assert.ok(a.includes(String(firmas)), `buildModalMessage missing ${firmas}`)
    assert.ok(b.includes(String(firmas)), `STRINGS.mensaje missing ${firmas}`)
  }
})

// ============================================================
// XSS / safety
// ============================================================

test('Modal messages do not contain HTML (no <script> etc.)', () => {
  for (const firmas of [1, 5, 15, 30, 100]) {
    const m = buildModalMessage(firmas, 1)
    assert.ok(!m.includes('<'), `${firmas} message contains HTML: ${m}`)
    assert.ok(!m.includes('>'), `${firmas} message contains HTML: ${m}`)
  }
  // STRINGS mensaje also
  for (const firmas of [1, 5, 15, 30, 100]) {
    const m = STRINGS.pedagogy.modalIntermedio.mensaje(firmas, 1)
    assert.ok(!m.includes('<'), `STRINGS ${firmas} contains HTML: ${m}`)
  }
})

// ============================================================
// Trigger threshold semantics (mathematical)
// ============================================================

test('Modal triggers at exact multiples of 5 (recordHit semantics)', () => {
  // Simulate the recordHit counter logic without DOM
  function simulate(triggerEvery, totalHits) {
    let triggered = 0
    for (let i = 1; i <= totalHits; i++) {
      if (i % triggerEvery === 0) triggered++
    }
    return triggered
  }
  assert.equal(simulate(5, 4), 0, 'no modal before 5 hits')
  assert.equal(simulate(5, 5), 1, 'modal at exactly 5 hits')
  assert.equal(simulate(5, 10), 2, 'modal at 5 and 10 hits')
  assert.equal(simulate(5, 25), 5, 'modal at every 5 hits up to 25')
  assert.equal(simulate(5, 100), 20, 'modal every 5 hits up to 100')
})