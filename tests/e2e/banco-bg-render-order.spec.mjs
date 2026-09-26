/**
 * tests/e2e/banco-bg-render-order.spec.mjs
 *
 * Bug fix B1 (fase-6.1): bg sprite MUST be a child of `isoWorld._worldLayer`
 * (not directly of `isoWorld.container`) so PIXI renders it BEFORE
 * `isoWorld.spriteLayer` (enemies). Otherwise the opaque bg occludes
 * all enemy sprites.
 *
 * Run: node tests/e2e/banco-bg-render-order.spec.mjs
 */
import { chromium } from 'playwright'

const TAILSCALE_URL = process.env.TEST_URL || 'http://100.116.137.66:8000/'

async function ensureServer() {
  for (const url of [TAILSCALE_URL, TAILSCALE_URL.replace('8000', '8000')]) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (e) { /* next */ }
  }
  throw new Error(`Dev server not reachable at ${TAILSCALE_URL}`)
}

export async function runBancoBgRenderOrderSpec() {
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
  await page.waitForFunction(() =>
    document.getElementById('main-menu')?.classList.contains('hidden'), { timeout: 5_000 })
  // Wait for enemies to spawn (post-finale wave + standard roster).
  await page.waitForFunction(() => window.__zarraModules__?.enemies?._enemies?.size > 0, { timeout: 10_000 })

  // B1 assertion: bg sprite's parent must be isoWorld._worldLayer, not isoWorld.container.
  const bgParent = await page.evaluate(() => {
    const m = window.__zarraModules__
    const bg = m.bg
    if (!bg?.sprite) return { ok: false, reason: 'bg.sprite is null' }
    return {
      parentName: bg.sprite.parent?.name || null,
      parentClass: bg.sprite.parent?.constructor?.name || null,
      stageId: bg.stageId,
      spriteVisible: bg.sprite.visible,
    }
  })
  if (!bgParent.parentName) throw new Error('bg sprite has no parent — bg never mounted?')
  if (bgParent.parentName !== 'worldLayer') {
    throw new Error(
      `BG RENDER ORDER BUG (B1): bg sprite parent is "${bgParent.parentName}" — ` +
      `expected "worldLayer" (isoWorld._worldLayer). If the parent is the unnamed ` +
      `isoWorld.container, the bg is rendered AFTER enemies and occludes them.`
    )
  }

  // Also assert at least one enemy is rendered (the bug manifested as zero enemies visible).
  const enemiesVisible = await page.evaluate(() => {
    const m = window.__zarraModules__
    return m.enemies._enemies.size
  })
  if (enemiesVisible === 0) {
    throw new Error('No enemies alive — too early in the rail (race). Re-run or wait longer.')
  }

  await browser.close()
  return { bgParent, enemiesVisible, baseUrl }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBancoBgRenderOrderSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}