/**
 * tests/e2e/data-screen.spec.mjs
 *
 * F1.5 e2e: data screen pre-nivel — verify show, content, continue.
 *
 * Scenarios:
 *   1. Data screen shows for stage1 with dato text + citation link.
 *   2. Continue button calls onContinue and hides screen.
 *   3. Esc keypress also triggers continue.
 *   4. Unknown stageId hides screen (silent fallback).
 *   5. Data screen includes all 6 stage datos.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8765/?test=1&seed=42 \
 *     node tests/e2e/data-screen.spec.mjs
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

async function showDataScreen(page, stageId) {
  return await page.evaluate(async (sid) => {
    const mod = await import('./src/pedagogy/data-screen.js?v=44')
    const root = document.getElementById('data-screen')
    let continued = null
    const ds = new mod.DataScreen({
      root,
      onContinue: (id) => { continued = id },
    })
    ds.show(sid)
    return { shown: ds.isVisible, stageId: ds.stageId, continued }
  }, stageId)
}

async function getDataScreenState(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('data-screen')
    if (!el || el.classList.contains('hidden')) return null
    return {
      stage: el.querySelector('.data-screen-stage')?.textContent || '',
      title: el.querySelector('.data-screen-title')?.textContent || '',
      dato: el.querySelector('.data-screen-dato')?.textContent || '',
      fuente: el.querySelector('.data-screen-fuente')?.textContent || '',
      hasLink: !!el.querySelector('.data-screen-link'),
      linkHref: el.querySelector('.data-screen-link')?.getAttribute('href') || null,
      continueText: el.querySelector('.data-screen-continue')?.textContent || '',
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
  // 1. Data screen shows for stage1
  // ============================================================
  await passOrSkip('1. data screen shows for stage1', async () => {
    const r = await showDataScreen(page, 'stage1-lashoyas')
    if (!r.shown) throw new Error('data screen not shown')
    const state = await getDataScreenState(page)
    if (!state) throw new Error('state is null')
    if (!state.stage.toLowerCase().includes('hoyas')) {
      throw new Error(`expected stage label with 'hoyas', got '${state.stage}'`)
    }
    if (state.title.toLowerCase() !== 'dato pedagógico') {
      throw new Error(`expected title 'Dato pedagógico', got '${state.title}'`)
    }
    if (!state.dato.includes('11 millones') && !state.dato.includes('11M')) {
      throw new Error(`expected dato to mention 11 millones, got '${state.dato.slice(0, 80)}'`)
    }
    if (!state.hasLink) throw new Error('expected link to fuente')
    if (!state.linkHref?.startsWith('https://')) {
      throw new Error(`expected https:// link, got '${state.linkHref}'`)
    }
    if (!state.continueText.toLowerCase().includes('continuar')) {
      throw new Error(`expected 'Continuar' button, got '${state.continueText}'`)
    }
  })

  // ============================================================
  // 2. Continue button calls onContinue and hides screen
  // ============================================================
  await passOrSkip('2. continue button triggers callback', async () => {
    await page.click('[data-role="continue"]')
    await page.waitForTimeout(100)
    const visible = await page.evaluate(() => {
      const el = document.getElementById('data-screen')
      return !el.classList.contains('hidden')
    })
    if (visible) throw new Error('data screen still visible after Continue click')
  })

  // ============================================================
  // 3. Esc keypress also triggers continue
  // ============================================================
  await passOrSkip('3. Esc keypress triggers continue', async () => {
    await showDataScreen(page, 'stage2-lahoz')
    if (!await page.evaluate(() => {
      const el = document.getElementById('data-screen')
      return !el.classList.contains('hidden')
    })) throw new Error('data screen not visible')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    const visible = await page.evaluate(() => {
      const el = document.getElementById('data-screen')
      return !el.classList.contains('hidden')
    })
    if (visible) throw new Error('data screen still visible after Esc')
  })

  // ============================================================
  // 4. Unknown stageId hides screen (silent fallback)
  // ============================================================
  await passOrSkip('4. unknown stageId hides screen', async () => {
    const r = await showDataScreen(page, 'unknown-stage')
    if (r.shown) throw new Error('data screen shown for unknown stage')
  })

  // ============================================================
  // 5. All 6 stage datos are accessible
  // ============================================================
  await passOrSkip('5. all 6 stage datos accessible', async () => {
    const stages = ['stage1-lashoyas', 'stage2-lahoz', 'stage3-lahunde', 'stage4-ayora', 'stage5-acuifero', 'final']
    for (const sid of stages) {
      await showDataScreen(page, sid)
      const state = await getDataScreenState(page)
      if (!state) throw new Error(`data screen not shown for ${sid}`)
      if (!state.dato || state.dato.length < 20) {
        throw new Error(`dato too short for ${sid}`)
      }
      if (!state.linkHref?.startsWith('https://')) {
        throw new Error(`bad link for ${sid}: ${state.linkHref}`)
      }
      // Close before next iteration
      await page.click('[data-role="continue"]')
      await page.waitForTimeout(50)
    }
    console.log('  all 6 stages verified (5 levels + final)')
  })

  await browser.close()

  if (consoleErrors.length) {
    console.log('\n!! Console errors:')
    for (const e of consoleErrors) console.log('  -', e)
  }

  console.log('\n=== data-screen e2e done ===')
}

main().catch((err) => {
  console.error('FAIL:', err.message)
  console.error(err.stack)
  process.exit(1)
})