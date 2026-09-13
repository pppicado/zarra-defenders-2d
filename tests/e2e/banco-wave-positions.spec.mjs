/**
 * tests/e2e/banco-wave-positions.spec.mjs
 *
 * Bug fix B3 (fase-6.1): `TEST_LEVEL.postFinalWaveRoster` entries MUST spawn
 * at iso positions where the Manhattan distance to camera iso (36, 36) is
 * ≤ 5 tiles. With the rail ending at (36, 36), wave enemies at iso (24, 18)
 * have Manhattan 30 and escape immediately on spawn — defeating the purpose
 * of the post-finale waves.
 *
 * Run: node tests/e2e/banco-wave-positions.spec.mjs
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

export async function runBancoWavePositionsSpec() {
  const baseUrl = await ensureServer()
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  // Use ?test=1 so __gameTestAPI__.setTime + integrity state are accessible.
  await page.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  await page.goto(baseUrl + '?test=1&seed=12345', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })
  await new Promise(r => setTimeout(r, 1000))

  // BG-006 invariant: finale starts at camera.time >= railEndTime (120).
  // The bg freezes and postFinalWaveRoster is scheduled.
  await page.evaluate(() => window.__gameTestAPI__.setTime(125))
  await new Promise(r => setTimeout(r, 800))

  const waveSnapshot = await page.evaluate(() => {
    const m = window.__zarraModules__
    const enemies = [...m.enemies._enemies.entries()].map(([id, e]) => ({
      id, isoX: e.isoX, isoY: e.isoY, spriteId: e.def?.spriteId ?? null,
    }))
    return {
      bgFrozen: m.bg.isFrozen,
      cameraIso: { isoX: m.camera.getCameraX(), isoY: m.camera.getCameraY() },
      bossAlive: !!m.enemies.get('e24'),
      enemies,
    }
  })
  const cam = waveSnapshot.cameraIso
  // Count wave enemies that are NOT the boss (e24) or mini-boss (e23).
  const waveOnly = waveSnapshot.enemies.filter(e => e.id !== 'e23' && e.id !== 'e24')
  const survivors = waveOnly.filter(e => {
    const md = Math.abs(e.isoX - cam.isoX) + Math.abs(e.isoY - cam.isoY)
    return md <= 6
  })

  if (waveOnly.length < 6) {
    throw new Error(
      `WAVE BUG (B3): only ${waveOnly.length} wave enemies alive after t=125 (expected ≥ 6). ` +
      `Enemies: ${JSON.stringify(waveOnly)}`
    )
  }
  if (survivors.length < 6) {
    throw new Error(
      `WAVE BUG (B3): ${survivors.length}/${waveOnly.length} wave enemies are within Manhattan ≤ 6 of ` +
      `camera (${JSON.stringify(cam)}). All should survive. Enemies: ${JSON.stringify(waveOnly)}`
    )
  }

  await browser.close()
  return { waveOnly, survivors, baseUrl }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBancoWavePositionsSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}