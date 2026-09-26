/**
 * tests/e2e/banco-esc-to-menu.spec.mjs
 *
 * Bug fix B4 (fase-6.1): pressing Escape during gameplay MUST return to
 * the main menu. Currently the only way to return to menu is via the
 * game-over / victory overlay "Volver al menú principal" button — which
 * forces the player to die before switching stages.
 *
 * Run: node tests/e2e/banco-esc-to-menu.spec.mjs
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
  throw new Error(`Dev server not reachable at ${BASE_URL}`)
}

export async function runBancoEscToMenuSpec() {
  const baseUrl = await ensureServer()
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  await page.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  await page.goto(baseUrl + '?unlock=all', { waitUntil: 'load' })
  await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 10_000 })
  // F3.3: dismiss the cold-load disclaimer splash before clicking (it intercepts pointer events).
  await page.click('#disclaimer-splash [data-role="ack"]').catch(() => {})
  await new Promise(r => setTimeout(r, 200))
  // F1.5: clicking stage now shows the data screen first; click "Continuar" to actually boot.
  await page.click('[data-menu-id="stage1-lashoyas"]')
  await page.waitForSelector('#data-screen:not(.hidden)', { timeout: 5_000 })
  await page.click('#data-screen [data-role="continue"]')
  await page.waitForFunction(() => document.getElementById('main-menu')?.classList.contains('hidden'), { timeout: 5_000 })
  // Wait for the camera to advance past the first spawn (depth=6 → time≈1.67s).
  await new Promise(r => setTimeout(r, 2500))

  // Sanity: gameplay is active and menu is hidden.
  const preEscape = await page.evaluate(() => ({
    gameState: window.__zarraGameState__.state,
    menuHidden: document.getElementById('main-menu')?.classList.contains('hidden'),
  }))
  if (preEscape.gameState !== 'gameplay') throw new Error(`expected gameplay, got ${preEscape.gameState}`)
  if (!preEscape.menuHidden) throw new Error('menu should be hidden during gameplay')

  // Press Escape — F3.1 pause overlay appears (BG-011 / REQ-10). The pause overlay
  // has a "Salir al menú" button that emits menu:back.
  await page.keyboard.press('Escape')
  await page.waitForSelector('#pause:not(.hidden)', { timeout: 5_000 })
  // Click "Salir al menú" — third button in the pause card (after Continuar + Reiniciar).
  await page.click('#pause [data-role="back"]')
  // Verify menu is visible after returning from pause
  const menuVisible = await page.evaluate(() => !document.getElementById('main-menu').classList.contains('hidden'))
  if (!menuVisible) {
    throw new Error(
      `ESC BUG (B4): "Salir al menú" from pause overlay did NOT return to main menu. ` +
      `Player has no way to switch stages without dying first.`
    )
  }

  await browser.close()
  return { preEscape, menuVisible, baseUrl }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBancoEscToMenuSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}