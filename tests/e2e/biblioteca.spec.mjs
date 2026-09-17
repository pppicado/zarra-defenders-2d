/**
 * tests/e2e/biblioteca.spec.mjs
 *
 * F1.4 e2e: biblioteca pedagógica — verify show, filter, detail view, close.
 *
 * Scenarios:
 *   1. Biblioteca shows with 12 initial cards.
 *   2. Filter by stage works.
 *   3. Click on card opens detail view.
 *   4. Back button returns to grid.
 *   5. Close button hides biblioteca.
 *   6. recordCards persists to localStorage.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8765/?test=1&seed=42 \
 *     node tests/e2e/biblioteca.spec.mjs
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

async function showBiblioteca(page) {
  return await page.evaluate(async () => {
    const mod = await import('./src/pedagogy/biblioteca.js?v=44')
    const root = document.getElementById('biblioteca')
    const b = new mod.Biblioteca({ root })
    b.show()
    return { shown: b.isVisible }
  })
}

async function getBibliotecaState(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('biblioteca')
    if (!el || el.classList.contains('hidden')) return null
    const items = el.querySelectorAll('.biblioteca-grid-item')
    return {
      title: el.querySelector('.biblioteca-title')?.textContent || '',
      counter: el.querySelector('.biblioteca-counter')?.textContent || '',
      itemCount: items.length,
      filterCount: el.querySelectorAll('.biblioteca-filter').length,
      activeFilter: el.querySelector('.biblioteca-filter--active')?.textContent || '',
    }
  })
}

async function getBibliotecaDetail(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('biblioteca')
    if (!el || el.classList.contains('hidden')) return null
    return {
      title: el.querySelector('.biblioteca-detail-title')?.textContent || '',
      descripcion: el.querySelector('.biblioteca-detail-description')?.textContent || '',
      dato: el.querySelector('.biblioteca-detail-dato')?.textContent || '',
      fuente: el.querySelector('.biblioteca-detail-fuente')?.textContent || '',
      hasLink: !!el.querySelector('.biblioteca-detail-link'),
      counter: el.querySelector('.biblioteca-counter')?.textContent || '',
    }
  })
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
  // 1. Biblioteca shows with 12 initial cards
  // ============================================================
  await passOrSkip('1. biblioteca shows with 12 initial cards', async () => {
    const r = await showBiblioteca(page)
    if (!r.shown) throw new Error('biblioteca not shown')
    const state = await getBibliotecaState(page)
    if (state.title !== 'Biblioteca pedagógica') throw new Error('expected title')
    if (!state.counter.includes('12')) throw new Error(`expected counter to include 12, got "${state.counter}"`)
    if (state.itemCount !== 12) throw new Error(`expected 12 items, got ${state.itemCount}`)
    if (state.filterCount !== 6) throw new Error(`expected 6 filters, got ${state.filterCount}`)
    if (state.activeFilter !== 'Todas') throw new Error(`expected active filter 'Todas', got '${state.activeFilter}'`)
  })

  // ============================================================
  // 2. Filter by stage works
  // ============================================================
  await passOrSkip('2. filter by stage', async () => {
    await page.click('[data-role="filter-stage2-lahoz"]')
    await page.waitForTimeout(100)
    const state = await getBibliotecaState(page)
    if (!state.counter.includes('3')) {
      // stage2 has bidon_lixiviado, tubo_lixiviado, camion_cisterna_residuos = 3
      throw new Error(`expected counter to include 3, got "${state.counter}"`)
    }
    if (state.activeFilter !== '2. La Hoz') throw new Error(`expected active filter '2. La Hoz', got '${state.activeFilter}'`)
    if (state.itemCount !== 3) throw new Error(`expected 3 items, got ${state.itemCount}`)
  })

  // Reset to all
  await page.click('[data-role="filter-all"]')
  await page.waitForTimeout(100)

  // ============================================================
  // 3. Click on card opens detail view
  // ============================================================
  await passOrSkip('3. click on card opens detail', async () => {
    // First grid item is camion_treco
    await page.click('[data-role="grid-item-0"]')
    await page.waitForTimeout(100)
    const state = await getBibliotecaDetail(page)
    if (!state) throw new Error('detail view not shown')
    if (state.title !== 'Camión TRECO') throw new Error(`expected 'Camión TRECO', got '${state.title}'`)
    if (state.descripcion.length < 10) throw new Error('descripcion too short')
    if (state.dato.length < 20) throw new Error('dato too short')
    if (!state.hasLink) throw new Error('expected link')
    if (!state.counter.includes('/')) throw new Error(`expected counter with '/', got '${state.counter}'`)
  })

  // ============================================================
  // 4. Back button returns to grid
  // ============================================================
  await passOrSkip('4. back button returns to grid', async () => {
    await page.click('#biblioteca [data-role="back"]')
    await page.waitForTimeout(100)
    const state = await getBibliotecaState(page)
    if (!state) throw new Error('grid not shown after back')
    if (state.itemCount !== 12) throw new Error(`expected 12 items in grid, got ${state.itemCount}`)
  })

  // ============================================================
  // 5. Close button hides biblioteca
  // ============================================================
  await passOrSkip('5. close button hides biblioteca', async () => {
    await page.click('[data-role="cerrar"]')
    await page.waitForTimeout(100)
    const visible = await page.evaluate(() => {
      const el = document.getElementById('biblioteca')
      return !el.classList.contains('hidden')
    })
    if (visible) throw new Error('biblioteca not hidden after close click')
  })

  // ============================================================
  // 6. recordCards persists to localStorage
  // ============================================================
  await passOrSkip('6. recordCards persists to localStorage', async () => {
    // Clear localStorage first
    await page.evaluate(() => localStorage.removeItem('zarra2d:biblioteca:unlocked'))
    await page.waitForTimeout(100)
    // Show biblioteca and call recordCards
    await page.evaluate(async () => {
      const mod = await import('./src/pedagogy/biblioteca.js?v=44')
      const root = document.getElementById('biblioteca')
      const b = new mod.Biblioteca({ root })
      b.recordCards([
        {
          cardId: 'test_001',
          enemyId: 'e_test',
          spriteId: 'enemies_camion_treco',
          stageId: 'stage1-lashoyas',
          titulo: 'Test Card',
          descripcion: 'Test desc',
          datoTexto: 'Test dato',
          fuente: 'Test fuente',
          url: 'https://example.com',
          timestamp: 1,
        },
      ])
    })
    await page.waitForTimeout(100)
    // Verify localStorage
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('zarra2d:biblioteca:unlocked')
      return raw ? JSON.parse(raw) : null
    })
    if (!stored) throw new Error('localStorage empty after recordCards')
    if (!stored.some(c => c.cardId === 'test_001')) {
      throw new Error('test card not persisted')
    }
    // Note: catalog cards are always loaded fresh from STRINGS, NOT persisted
    // to localStorage. They're the "initial biblioteca" available even on
    // first play without ever having played.
  })

  await browser.close()

  if (consoleErrors.length) {
    console.log('\n!! Console errors:')
    for (const e of consoleErrors) console.log('  -', e)
  }

  console.log('\n=== biblioteca e2e done ===')
}

main().catch((err) => {
  console.error('FAIL:', err.message)
  console.error(err.stack)
  process.exit(1)
})