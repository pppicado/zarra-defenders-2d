/**
 * tests/e2e/hit-detection.spec.mjs
 *
 * Playwright headless test: load ?test=1, fire 4 taps at known enemy iso positions,
 * assert destroyed + integrity unchanged. Advance camera past an enemy to drain integrity.
 *
 * Runtime: dev server on http://localhost:8000 (start via start_server.sh).
 * Boots PIXI Application + IsoWorld + Combat + EnemyManager + Integrity.
 *
 * Run: npx playwright test tests/e2e/hit-detection.spec.mjs
 *      (or node --test tests/e2e/hit-detection.spec.mjs — the latter requires a running browser harness)
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TAILSCALE_URL = process.env.TEST_URL || 'http://100.116.137.66:8000/?test=1'

async function ensureDevServer() {
  // Quick HEAD probe — no-op if server already up.
  try {
    const res = await fetch(TAILSCALE_URL, { method: 'HEAD' })
    if (res.ok) return
  } catch (e) { /* fall through */ }
  // Local fallback
  try {
    const res2 = await fetch('http://localhost:8000/?test=1', { method: 'HEAD' })
    if (res2.ok) return
  } catch (e) { /* fall through */ }
  throw new Error(`Dev server not reachable at ${TAILSCALE_URL}`)
}

export async function runHitDetectionSpec() {
  await ensureDevServer()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  await page.goto(TAILSCALE_URL, { waitUntil: 'load' })

  // Wait for the boot to expose __gameTestAPI__
  await page.waitForFunction(() => !!window.__gameTestAPI__, { timeout: 10_000 })

  // Skip the menu (test branch auto-skips it; assert that).
  const inTestMode = await page.evaluate(() => window.__gameTestAPI__.getStatus().inTestMode)
  if (!inTestMode) throw new Error('test API did not initialize')

  // Snap time to 0 and reset state.
  await page.evaluate(() => window.__gameTestAPI__.reset())

  // 4 fires at known iso positions — all standard (1 HP each), should all be destroyed.
  // We use the bypass-cooldown path so the test is deterministic and fast.
  const result1 = await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const hits = []
    // 4 known standard enemies at iso (3,2), (5,3), (7,4), (9,5)
    for (const [x, y] of [[3, 2], [5, 3], [7, 4], [9, 5]]) {
      const r = api.fireAtIso(x, y, { bypassCooldown: true })
      hits.push({ x, y, ...r })
    }
    return { hits, integrity: api.getIntegrity(), score: api.getScore() }
  })

  if (result1.hits.length !== 4) throw new Error('expected 4 fire calls')
  if (result1.hits.filter(h => h.hit).length !== 4) {
    throw new Error(`expected 4 hits, got ${result1.hits.filter(h => h.hit).length}: ${JSON.stringify(result1.hits)}`)
  }
  if (result1.integrity.current !== 3) throw new Error('integrity must remain at 3 after destruction')

  // Advance camera past 1 enemy — should drain 1 integrity segment.
  // The test level rail runs 0..60s iso (0,0) -> (18,18) (depth 0 -> 36).
  // Enemy at iso (3,2) — depth 5 — escapes when camera depth >= 6.
  // Camera depth 6 = t = 6/36 * 60 = 10s. Set time to 11s.
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(11)
    // tick to trigger enemies.update escape detection
    window.__gameTestAPI__.tick(16.6667)
  })

  const result2 = await page.evaluate(() => ({
    integrity: window.__gameTestAPI__.getIntegrity(),
    enemies: window.__gameTestAPI__.getEnemies(),
  }))

  // After advancing to t=11, multiple low-depth enemies (depth <= 6) should have escaped.
  // Initial depth 5 (e01) is at the boundary — depending on inclusive/exclusive, may or may not escape.
  // We just assert integrity.current <= 3 - 1 (at least one drain).
  if (result2.integrity.current > 2) {
    throw new Error(`expected at least one escape after t=11, integrity=${result2.integrity.current}`)
  }
  if (result2.integrity.current < 0) {
    throw new Error(`integrity went negative: ${result2.integrity.current}`)
  }

  await browser.close()
  return { result1, result2 }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  runHitDetectionSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}
