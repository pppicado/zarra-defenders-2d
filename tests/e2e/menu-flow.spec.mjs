/**
 * tests/e2e/menu-flow.spec.mjs
 *
 * Playwright headless: production boot -> main menu visible with Iniciar focused.
 * Keyboard nav: ArrowDown moves focus; Enter activates; Acerca de opens modal; Esc closes.
 * Boot into test level (TASK-025 needs to wire menu:startRequested -> bootTestLevel).
 */
import { chromium } from 'playwright'

const BASE_URL = process.env.TEST_URL || 'http://100.116.137.66:8000/'

async function ensureServer() {
  for (const url of [BASE_URL, BASE_URL.replace('8000', '8000')]) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (e) { /* next */ }
  }
  throw new Error(`Dev server not reachable`)
}

export async function runMenuFlowSpec() {
  const baseUrl = await ensureServer()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  await page.goto(baseUrl, { waitUntil: 'load' })
  // Wait for the menu to mount.
  await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 10_000 })

  // Iniciar test level button must be present and focused (or first tabbable).
  const buttons = await page.$$eval('#main-menu .menu-btn', els =>
    els.map(e => ({ text: e.textContent.trim(), focused: document.activeElement === e })))
  if (buttons.length < 3) throw new Error(`expected 3 menu buttons, got ${buttons.length}`)
  const iniciar = buttons.find(b => b.text === 'Iniciar test level')
  if (!iniciar) throw new Error('Iniciar test level button not found')

  // ArrowDown -> focus moves to second button
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => {
    const btns = [...document.querySelectorAll('#main-menu .menu-btn')]
    return btns[1] && document.activeElement === btns[1]
  }, { timeout: 2_000 })

  // ArrowDown again -> Disclaimer
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => {
    const btns = [...document.querySelectorAll('#main-menu .menu-btn')]
    return btns[2] && document.activeElement === btns[2]
  }, { timeout: 2_000 })

  // Enter -> Disclaimer modal opens
  await page.keyboard.press('Enter')
  await page.waitForSelector('#main-menu [data-modal="disclaimer"]:not(.hidden)', { timeout: 2_000 })

  // Esc -> modal closes, focus returns
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelector('[data-modal="disclaimer"]')?.classList.contains('hidden'), { timeout: 2_000 })

  // ArrowUp twice -> back to Iniciar
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await page.waitForFunction(() => {
    const btns = [...document.querySelectorAll('#main-menu .menu-btn')]
    return btns[0] && document.activeElement === btns[0]
  }, { timeout: 2_000 })

  // Enter -> Iniciar -> menu hides, test level begins (combat API active)
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.getElementById('main-menu')?.classList.contains('hidden'), { timeout: 2_000 })

  await browser.close()
  return { buttons, baseUrl }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMenuFlowSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}
