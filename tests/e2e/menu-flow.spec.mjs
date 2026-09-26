/**
 * tests/e2e/menu-flow.spec.mjs
 *
 * Playwright headless: production boot -> main menu visible with stage 1 focused.
 * Verifies BG-005 stage selector with lock progression:
 *   - 7 menu buttons (5 stages + Acerca de + Disclaimer)
 *   - Stage 1 unlocked by default, stages 2-5 locked
 *   - ArrowDown cycles focus
 *   - Enter on stage 1 boots the level (menu hides)
 *   - Enter on a locked stage does nothing
 *   - Acerca de / Disclaimer open as modals with Esc to close
 *
 * Updated for fase-6 (BG-005).
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
  // BG-005 — clear localStorage so stages start in the locked default state.
  await page.addInitScript(() => { try { localStorage.clear() } catch (e) {} })

  await page.goto(baseUrl, { waitUntil: 'load' })
  // Wait for the menu to mount.
  await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 10_000 })

  // Expect 8 menu buttons (5 stages + Acerca de + Disclaimer + Biblioteca — F3.5.3).
  const buttons = await page.$$eval('#main-menu .menu-btn', els =>
    els.map(e => ({
      text: e.textContent.trim(),
      kind: e.dataset.kind,
      locked: e.dataset.locked,
      focused: document.activeElement === e,
    })))
  if (buttons.length !== 8) throw new Error(`expected 8 menu buttons, got ${buttons.length}`)
  // Stage 1 must be the first button, unlocked.
  const stage1 = buttons[0]
  if (!stage1.text.includes('Las Hoyas')) throw new Error(`expected stage 1 first (Las Hoyas de Caballero), got ${stage1.text}`)
  if (stage1.locked !== 'false') throw new Error(`stage 1 should be unlocked, got locked=${stage1.locked}`)
  // Stages 2-5 must be locked.
  for (let i = 1; i <= 4; i++) {
    if (buttons[i].locked !== 'true') throw new Error(`stage ${i + 1} should be locked, got ${buttons[i].locked}`)
  }
  // Acerca de + Disclaimer are modals; Biblioteca opens its own surface.
  if (buttons[5].kind !== 'modal') throw new Error(`button 6 (Acerca de) should be modal, got ${buttons[5].kind}`)
  if (buttons[6].kind !== 'modal') throw new Error(`button 7 (Disclaimer) should be modal, got ${buttons[6].kind}`)
  if (buttons[7].kind !== 'biblioteca') throw new Error(`button 8 (Biblioteca) should be biblioteca, got ${buttons[7].kind}`)

  // ArrowDown → focus moves to second button (stage 2).
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => {
    const btns = [...document.querySelectorAll('#main-menu .menu-btn')]
    return btns[1] && document.activeElement === btns[1]
  }, { timeout: 2_000 })

  // Enter on stage 2 (locked) does nothing — menu stays visible.
  await page.keyboard.press('Enter')
  await new Promise(r => setTimeout(r, 300))
  const menuVisibleAfterLockedEnter = await page.evaluate(() =>
    !document.getElementById('main-menu')?.classList.contains('hidden'))
  if (!menuVisibleAfterLockedEnter) throw new Error('Enter on locked stage 2 should NOT hide the menu')

  // Navigate down to Acerca de (button index 5: stages 1-4 are 0-4, Acerca de is 5).
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => {
    const btns = [...document.querySelectorAll('#main-menu .menu-btn')]
    return btns[5] && document.activeElement === btns[5]
  }, { timeout: 2_000 })
  await page.keyboard.press('Enter')
  await page.waitForSelector('#main-menu [data-modal="about"]:not(.hidden)', { timeout: 2_000 })

  // Esc → modal closes.
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelector('[data-modal="about"]')?.classList.contains('hidden'), { timeout: 2_000 })

  // Navigate back to stage 1 (button index 0) — 5 ArrowUps.
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowUp')
  await page.waitForFunction(() => {
    const btns = [...document.querySelectorAll('#main-menu .menu-btn')]
    return btns[0] && document.activeElement === btns[0]
  }, { timeout: 2_000 })

  // Enter → data screen appears first (F1.5) → menu stays visible until
  // the user clicks "Continuar" which boots the stage and hides the menu.
  await page.keyboard.press('Enter')
  await page.waitForSelector('#data-screen:not(.hidden)', { timeout: 5_000 })
  // Menu is still visible during the data screen step.
  const menuHiddenAfterDataScreen = await page.evaluate(() =>
    document.getElementById('main-menu')?.classList.contains('hidden'))
  if (menuHiddenAfterDataScreen) throw new Error('menu should remain visible during data screen')
  // Click "Continuar" to actually start the stage.
  await page.click('#data-screen [data-role="continue"]')
  await page.waitForFunction(() => document.getElementById('main-menu')?.classList.contains('hidden'), { timeout: 5_000 })

  await browser.close()
  return { buttons, baseUrl }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMenuFlowSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}