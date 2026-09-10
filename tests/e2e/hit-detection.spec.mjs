/**
 * tests/e2e/hit-detection.spec.mjs
 *
 * Playwright headless test: load ?test=1, fire a tap at a known enemy iso position,
 * assert hit lands and integrity stays at 3. Then advance the camera past the
 * escape threshold and assert integrity drains.
 *
 * Escape rule under test (CAM-004 in openspec/specs/iso-camera-integration/spec.md):
 *   isEscaped(enemy, cameraIso) === |ex - cx| + |ey - cy| > 6
 *   — Manhattan distance from enemy iso to camera iso > 6 tiles.
 *
 * For the rail (0,0) -> (18,18) over 60s and enemy e01 at iso (3,2):
 *   spawn  at t=0     (spawnTime = (depth-5)/36 * 60 = 0s for depth-5 enemy)
 *   escape at t ~ 18.33s   (camera depth > 11; iso depth growth 0.6 tile/s)
 * -> choose t=5 for part 1 (well before escape), t=20 for part 2 (e01 escaped).
 *
 * Runtime: dev server on http://localhost:8000 (start via start_server.sh).
 * Boots PIXI Application + IsoWorld + Combat + EnemyManager + Integrity.
 *
 * Run: npx playwright test tests/e2e/hit-detection.spec.mjs
 *      (or node tests/e2e/hit-detection.spec.mjs — the latter requires a running browser harness)
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

  // Wait for the boot to expose the REAL __gameTestAPI__ (not the production stub).
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })

  // Skip the menu (test branch auto-skips it; assert that).
  const inTestMode = await page.evaluate(() => window.__gameTestAPI__.getStatus().inTestMode)
  if (!inTestMode) throw new Error('test API did not initialize')

  // --- Part 1: hit detection on a live enemy ---
  // Advance just past e01's spawnTimeSec (=0s for depth-5 enemy) so e01 is the
  // only live enemy, and well before its escape boundary at t~18.33s.
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(5.0)
    window.__gameTestAPI__.tick(16.6667)
  })

  // Fire at e01's iso position (3,2). With camera at t=5 still near spawn,
  // e01 is the only live enemy — verify hit lands and integrity stays at 3.
  const result1 = await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const hits = []
    for (const [x, y] of [[3, 2]]) {
      const r = api.fireAtIso(x, y, { bypassCooldown: true })
      hits.push({ x, y, ...r })
    }
    return { hits, integrity: api.getIntegrity(), score: api.getScore() }
  })

  if (result1.hits.length !== 1) throw new Error('expected 1 fire call')
  if (result1.hits.filter(h => h.hit).length !== 1) {
    throw new Error(`expected 1 hit, got ${result1.hits.filter(h => h.hit).length}: ${JSON.stringify(result1.hits)}`)
  }
  if (result1.integrity.current !== 3) throw new Error('integrity must remain at 3 after destruction')

  // --- Part 2: escape detection drains integrity (t=20) ---
  // Rail: 0..60s iso (0,0) -> (18,18). Camera depth grows at 0.6 tile/s.
  //   e01 (depth 5):  Manhattan > 6 with camera at (X,X) means 2X - 5 > 6 -> X > 5.5,
  //                   i.e. camera depth > 11 -> t > 11/0.6 ~ 18.33s.
  //   e02 (depth 8):  X > 7  -> t > 23.33s.
  //   e03 (depth 11): X > 8.5 -> t > 28.33s.
  // At t=20s, only e01 has escaped -> integrity 3 - 1 = 2.
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(20)
    // tick to trigger enemies.update escape detection
    window.__gameTestAPI__.tick(16.6667)
  })

  const result2 = await page.evaluate(() => ({
    integrity: window.__gameTestAPI__.getIntegrity(),
    enemies: window.__gameTestAPI__.getEnemies(),
  }))

  // e01 has escaped -> exactly 1 drain.
  if (result2.integrity.current !== 2) {
    throw new Error(`expected exactly one escape at t=20 (e01), integrity=${result2.integrity.current}`)
  }
  if (result2.integrity.current < 0) {
    throw new Error(`integrity went negative: ${result2.integrity.current}`)
  }

  // --- Part 3: more time -> more escapes (t=25) ---
  // At t=25s, e01 + e02 have escaped; e03 (depth 11) not yet (t < 28.33s).
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(25)
    window.__gameTestAPI__.tick(16.6667)
  })

  const result3 = await page.evaluate(() => ({
    integrity: window.__gameTestAPI__.getIntegrity(),
    enemies: window.__gameTestAPI__.getEnemies(),
  }))

  if (result3.integrity.current !== 1) {
    throw new Error(`expected two escapes at t=25 (e01+e02), integrity=${result3.integrity.current}`)
  }

  await browser.close()
  return { result1, result2, result3 }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  runHitDetectionSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}