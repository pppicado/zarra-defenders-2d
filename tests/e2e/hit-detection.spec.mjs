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
 * For the rail (0,0) -> (36,36) over 120s (F4b) and enemy e01 at iso (3,2):
 *   spawn  at t=0     (spawnTime = (depth-5)/36 * 60 = 0s for depth-5 enemy)
 *   escape at t ~ 18.33s   (camera depth > 11; iso depth growth 0.6 tile/s)
 * -> choose t=5 for part 1 (well before escape), t=20 for part 2 (e01 escaped).
 *
 * Fase-5 (REQ-CMB-003): screen-space hit detection via __gameTestAPI__.fireAtScreen
 * and Enemy.getScreenBounds(). These scenarios cover the iso-plane AABB fix:
 *   - R1: click on the visible sprite center -> hit (standard archetype)
 *   - R2: click 50px outside any visible sprite -> miss
 *   - R3: all 4 archetypes (standard/tank/mini-boss/boss) are hit-testable
 *   - R4: resolution independence (1280x720 + 1920x1080)
 *   - X1: reverse-depth tie-break (lower-id wins on overlapping getBounds)
 *   - X2: sprite-null fallback (uses isoToScreen ± tileSize/2)
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

  // ============================================================
  // Legacy iso-plane AABB scenarios (kept for regression)
  // ============================================================

  // --- Part 1: hit detection on a live enemy (iso-plane) ---
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(5.0)
    window.__gameTestAPI__.tick(16.6667)
  })

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

  // --- Part 2: escape detection drains integrity (Fase-5 screen-space) ---
  // Old rule: e01 at iso (3,2) escaped at t~18.33s via Manhattan > 6 (rail depth growth).
  // New rule (REQ-CMB-008): when the camera moves south past the enemy, the
  // screen-space projection crosses viewportSize.y + 32 px within 1 frame —
  // so the escape fires as soon as the camera sum passes e01's iso sum (5).
  // At rail speed 0.6 tile/s, that's t > 5/0.6 ≈ 8.33s; with the +32 px
  // margin and the camera's actual screen anchor, e01's sy crosses 752 at
  // t≈13s, well before the old Manhattan buffer (t≈18.33s). We pick t=13
  // so the test asserts the new fast path with a clean single-escape result.
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(13)
    window.__gameTestAPI__.tick(16.6667)
  })

  const result2 = await page.evaluate(() => ({
    integrity: window.__gameTestAPI__.getIntegrity(),
    enemies: window.__gameTestAPI__.getEnemies(),
  }))

  if (result2.integrity.current !== 2) {
    throw new Error(`expected exactly one escape at t=13 (e01 screen-space), integrity=${result2.integrity.current}`)
  }
  if (result2.integrity.current < 0) {
    throw new Error(`integrity went negative: ${result2.integrity.current}`)
  }

  // --- Part 3: more time -> more escapes (t=20) ---
  // With the Fase-5 screen-space escape test, e01 (sum=5) and e02 (sum=8) both
  // escape by t=20s — e01 via screen-space (camera sum=12 > e01 sum=5), e02
  // also via screen-space (sy > 752 once the camera has moved past). e03
  // (sum=11) does NOT escape until t=23s, so the integrity count at t=20
  // cleanly reflects exactly two escapes.
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(20)
    window.__gameTestAPI__.tick(16.6667)
  })

  const result3 = await page.evaluate(() => ({
    integrity: window.__gameTestAPI__.getIntegrity(),
    enemies: window.__gameTestAPI__.getEnemies(),
  }))

  if (result3.integrity.current !== 1) {
    throw new Error(`expected two escapes at t=20 (e01+e02), integrity=${result3.integrity.current}`)
  }

  // ============================================================
  // Fase-5 screen-space scenarios
  // ============================================================

  // --- R1: screen-space hit at visible sprite center (TASK-R1) ---
  const r1 = await runR1ScreenHitAtCenter(page)
  if (!r1.hit) throw new Error(`R1 expected hit at visible sprite center, got miss`)
  if (r1.enemyId !== 'e01') throw new Error(`R1 expected enemyId='e01', got ${r1.enemyId}`)

  // --- R2: screen-space miss outside sprite (TASK-R2) ---
  // The current iso-AABB resolver still matches a hit inside the 1.5/2.5 footprint
  // tile even when the click is 50px outside the visible sprite, so this
  // assertion MUST read the sprite bounds via getScreenBounds() and fire at
  // center + 50px on both axes to verify the new screen-space AABB rejects it.
  const r2 = await runR2ScreenMissOutsideSprite(page)
  if (r2.hit) throw new Error(`R2 expected miss 50px outside sprite bounds, got hit enemyId=${r2.enemyId}`)

  // --- R3: all 4 archetypes hit at sprite center (TASK-R3) ---
  const r3 = await runR3AllArchetypesHit(page)
  for (const [arch, result] of Object.entries(r3)) {
    if (!result.hit) throw new Error(`R3 archetype=${arch} expected hit at sprite center, got miss`)
  }

  // --- R4: resolution independence (TASK-R4) ---
  const r4 = await runR4ResolutionIndependence(browser)
  for (const [res, result] of Object.entries(r4)) {
    if (!result.hit) throw new Error(`R4 resolution=${res} expected hit at sprite center, got miss`)
    if (result.enemyId !== 'e01') throw new Error(`R4 resolution=${res} expected enemyId='e01', got ${result.enemyId}`)
  }

  // --- X1: reverse-depth tie-break (closer enemy wins) ---
  const x1 = await runX1DepthSortTieBreak(page)
  if (!x1.hit) throw new Error(`X1 expected hit on overlap, got miss`)
  if (x1.enemyId !== 'e_tie_a') throw new Error(`X1 expected lower-id 'e_tie_a' to win tie-break, got ${x1.enemyId}`)

  // --- X2: sprite-null fallback (isoToScreenWithCamera ± tileSize/2) ---
  const x2 = await runX2SpriteNullFallback(page)
  if (!x2.hit) throw new Error(`X2 expected hit on fallback AABB for sprite-null enemy, got miss`)
  if (x2.enemyId !== 'e_null_a') throw new Error(`X2 expected enemyId='e_null_a', got ${x2.enemyId}`)

  // --- R5 (TASK-R4): click exactly on shrunk-AABB inset edge = hit ---
  const r5 = await runR5ClickOnInsetEdge(page)
  if (!r5.hit) throw new Error(`R5 expected hit at shrunk-AABB top-left edge, got miss`)
  if (r5.enemyId !== 'e01') throw new Error(`R5 expected enemyId='e01', got ${r5.enemyId}`)

  await browser.close()
  return { result1, result2, result3, r1, r2, r3, r4, r5, x1, x2 }
}

// ============================================================
// Fase-5 helper scenarios
// ============================================================

/**
 * R1 — fire at the visible sprite center of the standard enemy e01.
 * Resets the level, advances the camera so only e01 is alive, reads
 * getScreenBounds(e01.id), fires at its center via fireAtScreen, asserts hit.
 */
async function runR1ScreenHitAtCenter(page) {
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(5.0)
    window.__gameTestAPI__.tick(16.6667)
  })

  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const e01 = api.getEnemies().find(e => e.id === 'e01')
    if (!e01) throw new Error('R1 setup: e01 not found')
    const bounds = api.getScreenBounds(e01.id)
    if (!bounds) throw new Error('R1 setup: getScreenBounds returned null')
    const cx = bounds.x + bounds.w / 2
    const cy = bounds.y + bounds.h / 2
    const result = api.fireAtScreen(cx, cy, { bypassCooldown: true })
    return { bounds, firedAt: { x: cx, y: cy }, ...result }
  })
}

/**
 * R2 — fire at center + 50px offset on both axes from the sprite bounds.
 * With the screen-space resolver this MUST be a miss; with the legacy
 * iso-plane AABB this would still register as a hit (footprint extends
 * beyond the visible sprite).
 */
async function runR2ScreenMissOutsideSprite(page) {
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(5.0)
    window.__gameTestAPI__.tick(16.6667)
  })

  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const e01 = api.getEnemies().find(e => e.id === 'e01')
    const bounds = api.getScreenBounds(e01.id)
    // 50 px outside the visible sprite bounds along the +x axis — well clear
    // of the rendered body, but still inside the legacy 1.5/2.5 footprint
    // tile (which extends 1.5 iso tiles ≈ 192 logical px past the visible
    // sprite). The screen-space resolver should reject this.
    const missX = bounds.x + bounds.w + 50
    const cy = bounds.y + bounds.h / 2
    return api.fireAtScreen(missX, cy, { bypassCooldown: true })
  })
}

/**
 * R3 — spawn one of each archetype (standard/tank/mini-boss/boss) at known
 * iso coords, read each sprite center, fire at it, assert all 4 hit.
 * Re-uses the e01 (standard) from the test level, plus 3 spawned extras.
 */
async function runR3AllArchetypesHit(page) {
  await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(5.0)
    api.tick(16.6667)
    // Spawn one of each remaining archetype near the camera so they survive
    // the escape-detection tick (manhattan ≤ 6 from camIso at t=5).
    api.spawnEnemy({ id: 'arch_tank',      archetype: 'tank',      isoX: 4, isoY: 4, spriteId: 'enemies_dron_fumigador' })
    api.spawnEnemy({ id: 'arch_miniboss',  archetype: 'mini-boss', isoX: 5, isoY: 4, spriteId: 'enemies_planta_treco' })
    api.spawnEnemy({ id: 'arch_boss',      archetype: 'boss',      isoX: 4, isoY: 5, spriteId: 'enemies_sello_burocratico' })
    api.tick(16.6667)
  })

  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const out = {}
    const targets = ['e01', 'arch_tank', 'arch_miniboss', 'arch_boss']
    for (const id of targets) {
      const enemy = api.getEnemies().find(e => e.id === id)
      if (!enemy) { out[enemy.archetype] = { hit: false, enemyId: null, error: 'not found' }; continue }
      const bounds = api.getScreenBounds(id)
      if (!bounds) { out[enemy.archetype] = { hit: false, enemyId: null, error: 'no bounds' }; continue }
      const cx = bounds.x + bounds.w / 2
      const cy = bounds.y + bounds.h / 2
      out[enemy.archetype] = { hit: true, bounds, firedAt: { x: cx, y: cy }, ...api.fireAtScreen(cx, cy, { bypassCooldown: true }) }
    }
    return out
  })
}

/**
 * R4 — same e01 standard enemy at two different viewport resolutions. The
 * click is at the logical center of the same getScreenBounds(), so the
 * hit/miss result MUST be identical regardless of the rendered canvas size.
 */
async function runR4ResolutionIndependence(browser) {
  const out = {}
  for (const [w, h, label] of [[1280, 720, '1280x720'], [1920, 1080, '1920x1080']]) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    await page.goto(TAILSCALE_URL, { waitUntil: 'load' })
    await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })
    const result = await page.evaluate(() => {
      const api = window.__gameTestAPI__
      api.reset()
      api.setTime(5.0)
      api.tick(16.6667)
      const e01 = api.getEnemies().find(e => e.id === 'e01')
      const bounds = api.getScreenBounds(e01.id)
      const cx = bounds.x + bounds.w / 2
      const cy = bounds.y + bounds.h / 2
      return { bounds, firedAt: { x: cx, y: cy }, ...api.fireAtScreen(cx, cy, { bypassCooldown: true }) }
    })
    out[label] = result
    await context.close()
  }
  return out
}

/**
 * X1 — spawn two enemies at the same iso-sum (so depth tie-break fires),
 * overlapping bounds, fire at the overlap center, lower-id wins.
 */
async function runX1DepthSortTieBreak(page) {
  await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(5.0)
    api.tick(16.6667)
    // iso-sum = 7 for both, same iso coord so their 128-px sprites overlap
    // on screen. Both survive escape detection (manhattan ≤ 6 from camIso at t=5).
    // Tie-break: lower id ('e_tie_a') must win over 'e_tie_b' even when 'b'
    // renders on top.
    api.spawnEnemy({ id: 'e_tie_a', archetype: 'standard', isoX: 4, isoY: 3, spriteId: 'enemies_camion_treco' })
    api.spawnEnemy({ id: 'e_tie_b', archetype: 'standard', isoX: 4, isoY: 3, spriteId: 'enemies_bolsa_plastico' })
    api.tick(16.6667)
  })

  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const a = api.getScreenBounds('e_tie_a')
    const b = api.getScreenBounds('e_tie_b')
    // Compute the intersection AABB — empty if the two rectangles don't overlap.
    const x0 = Math.max(a.x, b.x)
    const y0 = Math.max(a.y, b.y)
    const x1 = Math.min(a.x + a.w, b.x + b.w)
    const y1 = Math.min(a.y + a.h, b.y + b.h)
    const overlaps = x1 > x0 && y1 > y0
    const click = overlaps
      ? { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
      // Fallback: midpoint between the two AABB centers (must lie in both by construction).
      : { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: (a.y + a.h / 2 + b.y + b.h / 2) / 2 }
    return { click, a, b, overlaps, ...api.fireAtScreen(click.x, click.y, { bypassCooldown: true }) }
  })
}

/**
 * X2 — spawn an enemy whose spriteId is not preloaded, so its sprite stays
 * null. Fire at the iso-projected fallback AABB (center ± tileSize/2), assert
 * hit.
 */
async function runX2SpriteNullFallback(page) {
  await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(5.0)
    api.tick(16.6667)
    // spriteId 'NONEXISTENT' is not preloaded, so enemy.sprite stays null.
    api.spawnEnemy({ id: 'e_null_a', archetype: 'standard', isoX: 4, isoY: 4, spriteId: 'NONEXISTENT' })
    api.tick(16.6667)
  })

  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const e = api.getEnemies().find(x => x.id === 'e_null_a')
    if (!e) throw new Error('X2 setup: e_null_a not found')
    const bounds = api.getScreenBounds(e.id)
    if (!bounds) throw new Error('X2 setup: fallback bounds missing')
    // Fallback AABB = isoToScreen(isoX, isoY) ± tileSize/2 — the click inside
    // the bounds must hit. Use the center to land in the safe interior.
    const cx = bounds.x + bounds.w / 2
    const cy = bounds.y + bounds.h / 2
    return { bounds, firedAt: { x: cx, y: cy }, ...api.fireAtScreen(cx, cy, { bypassCooldown: true }) }
  })
}

/**
 * R5 (TASK-R4) — fire exactly at the shrunk AABB top-left corner (the inset edge).
 *      For a `standard` archetype (hitInset 16,16,16,16), the shrunk AABB's left-top
 *      corner sits 16 px inside the visible sprite. Clicking that exact edge must
 *      hit. Today (before hitInset lands) this still passes by accident because
 *      the bounds equal the full sprite bounds and the edge is inside. Once the
 *      inset is applied this asserts the boundary remains inclusive.
 */
async function runR5ClickOnInsetEdge(page) {
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(5.0)
    window.__gameTestAPI__.tick(16.6667)
  })

  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const e01 = api.getEnemies().find(e => e.id === 'e01')
    if (!e01) throw new Error('R5 setup: e01 not found')
    const bounds = api.getScreenBounds(e01.id)
    // Click the top-left corner of the shrunk AABB itself. After hitInset is
    // applied, this sits 16 px inside the visible sprite top-left, but it's
    // still inside the shrunk AABB and must hit.
    const fx = bounds.x + 0
    const fy = bounds.y + 0
    return { bounds, firedAt: { x: fx, y: fy }, ...api.fireAtScreen(fx, fy, { bypassCooldown: true }) }
  })
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  runHitDetectionSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}