/**
 * tests/e2e/resumen-final.spec.mjs
 *
 * F1.3 e2e: resumen final navegable — verify show + navigate + close.
 *
 * Scenarios:
 *   1. Resumen shows with cardsShown array (synthesized via direct call).
 *   2. Counter shows "X / N" correctly.
 *   3. Prev / Next buttons navigate.
 *   4. Dots indicator works.
 *   5. Close button hides resumen.
 *   6. Empty state (no cards) shows fallback message.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8765/?test=1&seed=42 \
 *     node tests/e2e/resumen-final.spec.mjs
 */
import { chromium } from 'playwright'

const DEFAULT_URL = 'http://127.0.0.1:8765/'
const URL_BASE = process.env.TEST_URL || DEFAULT_URL
const URL_TEST = URL_BASE.includes('?') ? URL_BASE : `${URL_BASE}?test=1&seed=42`

async function ensureServer() {
  for (const url of [URL_BASE, 'http://100.116.137.66:8000/']) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (_) { /* next */ }
  }
  throw new Error(`Dev server not reachable. Tried ${URL_BASE}`)
}

async function bootGame(page) {
  await page.goto(URL_TEST, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 15_000 })
  await page.waitForTimeout(500)
}

async function getResumenState(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('resumen-final')
    if (!el || el.classList.contains('hidden')) return null
    return {
      title: el.querySelector('.resumen-card-title')?.textContent || '',
      descripcion: el.querySelector('.resumen-card-description')?.textContent || '',
      dato: el.querySelector('.resumen-card-dato')?.textContent || '',
      fuente: el.querySelector('.resumen-card-fuente')?.textContent || '',
      counter: el.querySelector('.resumen-counter')?.textContent || '',
      hasLink: !!el.querySelector('.resumen-card-link'),
      prevDisabled: el.querySelector('[data-role="prev"]')?.disabled ?? null,
      nextDisabled: el.querySelector('[data-role="next"]')?.disabled ?? null,
      dotCount: el.querySelectorAll('.resumen-dot').length,
      activeDotIdx: Array.from(el.querySelectorAll('.resumen-dot')).findIndex(d => d.classList.contains('resumen-dot--active')),
    }
  })
}

async function synthesizeResumen(page, cards) {
  return await page.evaluate(async (c) => {
    const mod = await import('./src/pedagogy/resumen-final.js?v=44')
    const root = document.getElementById('resumen-final')
    const r = new mod.ResumenFinal({ root })
    r.show(c)
    return { shown: r.isVisible, total: r.totalCards }
  }, cards)
}

async function passOrSkip(name, fn) {
  console.log(`\n=== ${name} ===`)
  await fn()
  console.log(`✓ ${name}`)
}

async function main() {
  await ensureServer()
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()

  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  await bootGame(page)

  // ============================================================
  // 1. Resumen shows with 3 cards
  // ============================================================
  const sampleCards = [
    {
      cardId: 'c1', enemyId: 'e01', spriteId: 'enemies_camion_treco',
      stageId: 'stage1-lashoyas', titulo: 'Camión TRECO',
      descripcion: 'Has firmado contra la logística del proyecto.',
      datoTexto: 'El proyecto prevé 11 millones de metros cúbicos de residuos.',
      fuente: 'Las Provincias, 24/06/2026',
      url: 'https://www.lasprovincias.es/.../20260624183217-nt.html',
      timestamp: 1,
    },
    {
      cardId: 'c2', enemyId: 'e02', spriteId: 'enemies_bidon_lixiviado',
      stageId: 'stage2-lahoz', titulo: 'Bidón de lixiviados',
      descripcion: 'Has firmado contra la contaminación del acuífero.',
      datoTexto: 'El Acuífero tiene 8.500 km².',
      fuente: 'Agencia del Agua de CLM',
      url: 'https://agenciadelagua.castillalamancha.es/.../acuiferos',
      timestamp: 2,
    },
    {
      cardId: 'c3', enemyId: 'e03', spriteId: 'enemies_topadora',
      stageId: 'stage1-lashoyas', titulo: 'Topadora',
      descripcion: 'Has firmado contra la destrucción de encinas.',
      datoTexto: 'Las encinas tienen siglos.',
      fuente: 'Las Provincias, 24/06/2026',
      url: 'https://www.lasprovincias.es/.../20260624183217-nt.html',
      timestamp: 3,
    },
  ]

  await passOrSkip('1. resumen shows with 3 cards', async () => {
    const result = await synthesizeResumen(page, sampleCards)
    if (!result.shown) throw new Error('resumen not shown')
    if (result.total !== 3) throw new Error(`expected 3 cards, got ${result.total}`)
    const state = await getResumenState(page)
    if (state.counter !== '1 / 3') throw new Error(`expected counter '1 / 3',', got '${state.counter}'`)
    if (state.title !== 'Camión TRECO') throw new Error(`expected first card titulo`)
    if (!state.hasLink) throw new Error('expected link in card')
    if (state.prevDisabled !== true) throw new Error('expected prev disabled at index 0')
    if (state.nextDisabled !== false) throw new Error('expected next enabled')
    if (state.dotCount !== 3) throw new Error(`expected 3 dots, got ${state.dotCount}`)
    if (state.activeDotIdx !== 0) throw new Error(`expected active dot 0, got ${state.activeDotIdx}`)
  })

  // ============================================================
  // 2. Next button navigates to card 2
  // ============================================================
  await passOrSkip('2. next button navigates', async () => {
    await page.click('[data-role="next"]')
    await page.waitForTimeout(100)
    const state = await getResumenState(page)
    if (state.counter !== '2 / 3') throw new Error(`expected '2 / 3', got '${state.counter}'`)
    if (state.title !== 'Bidón de lixiviados') throw new Error('expected second card')
    if (state.prevDisabled !== false) throw new Error('expected prev enabled at index 1')
    if (state.activeDotIdx !== 1) throw new Error('expected active dot 1')
  })

  // ============================================================
  // 3. Prev button navigates back
  // ============================================================
  await passOrSkip('3. prev button navigates back', async () => {
    await page.click('[data-role="prev"]')
    await page.waitForTimeout(100)
    const state = await getResumenState(page)
    if (state.counter !== '1 / 3') throw new Error(`expected '1 / 3', got '${state.counter}'`)
    if (state.title !== 'Camión TRECO') throw new Error('expected first card')
  })

  // ============================================================
  // 4. Click on dot 2 jumps to card 3
  // ============================================================
  await passOrSkip('4. click on dot 2 jumps to card 3', async () => {
    await page.click('[data-role="dot-2"]')
    await page.waitForTimeout(100)
    const state = await getResumenState(page)
    if (state.counter !== '3 / 3') throw new Error(`expected '3 / 3', got '${state.counter}'`)
    if (state.title !== 'Topadora') throw new Error('expected third card')
    if (state.nextDisabled !== true) throw new Error('expected next disabled at last index')
    if (state.activeDotIdx !== 2) throw new Error('expected active dot 2')
  })

  // ============================================================
  // 5. Close button hides resumen
  // ============================================================
  await passOrSkip('5. close button hides resumen', async () => {
    await page.click('[data-role="cerrar-bottom"]')
    await page.waitForTimeout(100)
    const visible = await page.evaluate(() => {
      const el = document.getElementById('resumen-final')
      return !el.classList.contains('hidden')
    })
    if (visible) throw new Error('resumen not hidden after close click')
  })

  // ============================================================
  // 6. Empty state shows fallback
  // ============================================================
  await passOrSkip('6. empty state shows fallback', async () => {
    const result = await synthesizeResumen(page, [])
    if (!result.shown) throw new Error('resumen not shown with empty cards')
    if (result.total !== 0) throw new Error(`expected 0 cards, got ${result.total}`)
    const emptyTitle = await page.evaluate(() => {
      const el = document.querySelector('.resumen-empty-title')
      return el?.textContent || ''
    })
    if (!emptyTitle.toLowerCase().includes('sin cards')) {
      throw new Error(`expected empty title, got "${emptyTitle}"`)
    }
  })

  await browser.close()

  if (consoleErrors.length) {
    console.log('\n!! Console errors:')
    for (const e of consoleErrors) console.log('  -', e)
  }

  console.log('\n=== resumen-final e2e done ===')
}

main().catch((err) => {
  console.error('FAIL:', err.message)
  console.error(err.stack)
  process.exit(1)
})