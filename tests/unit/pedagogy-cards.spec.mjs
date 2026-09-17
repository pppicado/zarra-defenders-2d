/**
 * tests/unit/pedagogy-cards.spec.mjs
 *
 * Pin the F1.1 pedagogy cards contract:
 *  - buildCardPayload(enemy, clock, STRINGS) is a pure function returning
 *    { cardId, enemyId, spriteId, stageId, titulo, descripcion, datoTexto,
 *      fuente, url, timestamp, isHashLink } or null on bad input.
 *  - Known spriteId → uses STRINGS.pedagogy.enemigos[spriteId] + stage dato.
 *  - Unknown spriteId / null spriteId → generic fallback using stage 1 dato.
 *  - Hash URL (starts with #) → isHashLink = true (renders <span>, not <a>).
 *  - All 12 enemies in STRINGS.pedagogy.enemigos have valid { stageId, titulo, descripcion }.
 *  - All 6 stages in STRINGS.pedagogy.datos have valid { texto, fuente, url }.
 *  - URL invariant (A6): fuente URLs come from STRINGS only.
 *
 * DOM-dependent tests (show/hide/click/auto-dismiss) live in
 * tests/e2e/pedagogy-cards.spec.mjs (playwright).
 *
 * Run with: node tests/unit/pedagogy-cards.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCardPayload } from '../../src/pedagogy/cards.js?v=44'
import { STRINGS } from '../../src/i18n/es.js?v=44'

// Deterministic clock for predictable cardIds + timestamps
const CLOCK = () => 1_700_000_000_000

// ============================================================
// buildCardPayload — happy path
// ============================================================

test('buildCardPayload: known spriteId → uses enemy data + stage dato', () => {
  const enemy = { id: 'e01', spriteId: 'enemies_bidon_lixiviado', archetype: 'standard' }
  const p = buildCardPayload(enemy, CLOCK, STRINGS)
  assert.ok(p, 'payload should not be null')
  assert.equal(p.enemyId, 'e01')
  assert.equal(p.spriteId, 'enemies_bidon_lixiviado')
  assert.equal(p.stageId, 'stage2-lahoz')
  assert.equal(p.titulo, 'Bidón de lixiviados')
  assert.ok(p.descripcion.includes('acuífero'), 'description should mention acuífero')
  assert.ok(p.datoTexto.includes('8.500 km²'), 'dato should include the verified fact')
  assert.equal(p.fuente, 'Agencia del Agua de Castilla-La Mancha (s/f)')
  assert.ok(p.url.startsWith('https://agenciadelagua'))
  assert.equal(p.isHashLink, false)
  assert.equal(p.timestamp, 1_700_000_000_000)
  assert.ok(p.cardId.startsWith('card_1700000000000_'))
})

test('buildCardPayload: 12 enemies all resolve correctly', () => {
  const expected = [
    { spriteId: 'enemies_camion_treco',           stageId: 'stage1-lashoyas' },
    { spriteId: 'enemies_bidon_lixiviado',        stageId: 'stage2-lahoz' },
    { spriteId: 'enemies_bolsa_plastico',         stageId: 'stage1-lashoyas' },
    { spriteId: 'enemies_tubo_lixiviado',         stageId: 'stage2-lahoz' },
    { spriteId: 'enemies_valla_publicitaria',     stageId: 'stage1-lashoyas' },
    { spriteId: 'enemies_dron_fumigador',         stageId: 'stage3-lahunde' },
    { spriteId: 'enemies_camion_cisterna_residuos', stageId: 'stage2-lahoz' },
    { spriteId: 'enemies_topadora',               stageId: 'stage1-lashoyas' },
    { spriteId: 'enemies_incineradora',           stageId: 'stage3-lahunde' },
    { spriteId: 'enemies_trailer',                stageId: 'stage4-ayora' },
    { spriteId: 'enemies_planta_treco',           stageId: 'stage5-acuifero' },
    { spriteId: 'enemies_sello_burocratico',      stageId: 'stage4-ayora' },
  ]
  for (const { spriteId, stageId } of expected) {
    const p = buildCardPayload({ id: 'test', spriteId }, CLOCK, STRINGS)
    assert.ok(p, `${spriteId} should produce a payload`)
    assert.equal(p.stageId, stageId, `${spriteId} should map to ${stageId}`)
    assert.ok(p.titulo, `${spriteId} should have a non-empty titulo`)
    assert.ok(p.descripcion, `${spriteId} should have a non-empty descripcion`)
    assert.ok(p.url.startsWith('https://'), `${spriteId} URL must be https://`)
  }
})

// ============================================================
// buildCardPayload — fallback path
// ============================================================

test('buildCardPayload: unknown spriteId → generic fallback (stage 1 dato)', () => {
  const p = buildCardPayload({ id: 'eXX', spriteId: 'enemies_unknown' }, CLOCK, STRINGS)
  assert.ok(p)
  assert.equal(p.titulo, 'Papeleta firmada')
  assert.ok(p.descripcion.includes('Valle de Ayora-Cofrentes'))
  assert.equal(p.stageId, null, 'fallback has no stageId (no specific enemy mapped)')
  assert.equal(p.isHashLink, false)
  assert.ok(p.url.startsWith('https://'))
})

test('buildCardPayload: null spriteId → generic fallback', () => {
  const p = buildCardPayload({ id: 'eXX', spriteId: null }, CLOCK, STRINGS)
  assert.ok(p)
  assert.equal(p.titulo, 'Papeleta firmada')
  assert.equal(p.spriteId, null)
})

test('buildCardPayload: missing spriteId field → generic fallback', () => {
  const p = buildCardPayload({ id: 'eXX' }, CLOCK, STRINGS)
  assert.ok(p)
  assert.equal(p.titulo, 'Papeleta firmada')
})

// ============================================================
// buildCardPayload — error / bad input
// ============================================================

test('buildCardPayload: null enemy → null', () => {
  const p = buildCardPayload(null, CLOCK, STRINGS)
  assert.equal(p, null)
})

test('buildCardPayload: non-object enemy → null', () => {
  assert.equal(buildCardPayload('not-an-object', CLOCK, STRINGS), null)
  assert.equal(buildCardPayload(42, CLOCK, STRINGS), null)
  assert.equal(buildCardPayload(undefined, CLOCK, STRINGS), null)
})

// ============================================================
// Hash link detection (for final screen hashtag — Fase 1.7 prep)
// ============================================================

test('buildCardPayload: hash URL → isHashLink = true', () => {
  const strings = {
    pedagogy: {
      enemigos: {
        enemies_test: { stageId: 'stageX', titulo: 'X', descripcion: 'X' },
      },
      datos: {
        stageX: {
          texto: 'Some dato',
          fuente: '#Hashtag',
          url: '#HashtagValue',
        },
      },
    },
  }
  const p = buildCardPayload({ id: 'eXX', spriteId: 'enemies_test' }, CLOCK, strings)
  assert.ok(p)
  assert.equal(p.isHashLink, true)
  assert.equal(p.url, '#HashtagValue')
  assert.equal(p.fuente, '#Hashtag')
})

// ============================================================
// STRINGS.pedagogy invariants
// ============================================================

test('STRINGS.pedagogy.enemigos: all 12 enemies have valid { stageId, titulo, descripcion }', () => {
  const enemies = STRINGS.pedagogy.enemigos
  const keys = Object.keys(enemies)
  assert.equal(keys.length, 12, 'expected 12 enemies')
  const validStages = new Set([
    'stage1-lashoyas', 'stage2-lahoz', 'stage3-lahunde',
    'stage4-ayora', 'stage5-acuifero',
  ])
  for (const [key, e] of Object.entries(enemies)) {
    assert.ok(e.stageId, `${key} missing stageId`)
    assert.ok(validStages.has(e.stageId), `${key} stageId ${e.stageId} is not a valid stage`)
    assert.ok(e.titulo && e.titulo.length > 2, `${key} titulo too short or missing`)
    assert.ok(e.descripcion && e.descripcion.length > 10, `${key} descripcion too short or missing`)
    assert.ok(!e.titulo.includes('<script>'), `${key} titulo contains unsafe content`)
  }
})

test('STRINGS.pedagogy.datos: all 6 stages have valid { texto, fuente, url } (A5/A6)', () => {
  const datos = STRINGS.pedagogy.datos
  const keys = Object.keys(datos)
  assert.equal(keys.length, 6, 'expected 6 stage datos (5 stages + final)')
  for (const [key, d] of Object.entries(datos)) {
    assert.ok(d.texto && d.texto.length > 30, `${key} texto missing or too short`)
    assert.ok(d.fuente && d.fuente.length > 5, `${key} fuente missing or too short`)
    assert.ok(d.url.startsWith('https://') || d.url.startsWith('#'),
      `${key} url must be https:// or #hashtag (got ${d.url.slice(0, 30)})`)
    assert.ok(!d.texto.includes('<script>'), `${key} texto contains unsafe content`)
  }
})

test('STRINGS.pedagogy.datos: fuente URLs match research/fuentes.md (6 verificadas)', () => {
  // These are the 6 URLs copied verbatim from the 3D research/fuentes.md
  const expected = [
    'lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html',
    'agenciadelagua.castillalamancha.es/el-agua-en-castilla-la-mancha/situacion-del-agua-en-clm/acuiferos',
    'actualidadvalencia.com/macrovertedero-zarra-pp-exige-retirada-proyecto/',
    'lasprovincias.es/comarcas/valle-ayoracofrentes-moviliza-macrovertedero-proyectado-zarra-20260616173049-nt.html',
    'valenciaplaza.com/valenciaplaza/comarca-y-empresa/crece-el-rechazo-contra-el-macrovertedero-de-zarra-tras-la-ultima-concentracion-de-casi-mil-personas',
  ]
  const datos = STRINGS.pedagogy.datos
  for (const fragment of expected) {
    const found = Object.values(datos).some(d => d.url && d.url.includes(fragment))
    assert.ok(found, `expected URL fragment not found: ${fragment.slice(0, 60)}`)
  }
})

// ============================================================
// XSS / safety
// ============================================================

test('buildCardPayload: HTML in titulo is preserved as-is (caller is responsible for escaping)', () => {
  // buildCardPayload is pure data; the rendering function escapes HTML.
  // We just verify the field is round-tripped.
  const strings = {
    pedagogy: {
      enemigos: {
        enemies_xss: {
          stageId: 'stage1-lashoyas',
          titulo: '<script>alert("xss")</script>',
          descripcion: 'desc',
        },
      },
      datos: STRINGS.pedagogy.datos,
    },
  }
  const p = buildCardPayload({ id: 'eXX', spriteId: 'enemies_xss' }, CLOCK, strings)
  assert.ok(p)
  assert.equal(p.titulo, '<script>alert("xss")</script>')
  // Renders with escapeHtml — verified in the _render integration tests.
})