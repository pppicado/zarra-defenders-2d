/**
 * tests/e2e/enemy-movement.spec.mjs
 *
 * Fase-5 (REQ-CMB-009 + REQ-CMB-010) — per-instance enemy self-translation.
 *
 * RED scenarios (TDD STRICT, written BEFORE implementation):
 *   TASK-R1: TEST_LEVEL.enemies.length === 120 (currently 24 → FAILS)
 *   TASK-R2: static valla_publicitaria isoX unchanged over 10 ticks (FAILS — no per-instance config)
 *   TASK-R3: dron_fumigador with sine pattern oscillates isoY (FAILS)
 *   TASK-R4: lateral clamp reflects velocity at viewport edge (FAILS)
 *   TASK-R5: hit detection still works on a moving enemy (FAILS — depends on movement)
 *
 * Run: node tests/e2e/enemy-movement.spec.mjs
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TAILSCALE_URL = process.env.TEST_URL || 'http://localhost:8000/?test=1'

async function ensureDevServer() {
  try {
    const res = await fetch(TAILSCALE_URL, { method: 'HEAD' })
    if (res.ok) return
  } catch (e) { /* fall through */ }
  try {
    const res2 = await fetch('http://localhost:8000/?test=1', { method: 'HEAD' })
    if (res2.ok) return
  } catch (e) { /* fall through */ }
  throw new Error(`Dev server not reachable at ${TAILSCALE_URL}`)
}

export async function runEnemyMovementSpec() {
  await ensureDevServer()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  await page.goto(TAILSCALE_URL, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })

  const inTestMode = await page.evaluate(() => window.__gameTestAPI__.getStatus().inTestMode)
  if (!inTestMode) throw new Error('test API did not initialize')

  // TASK-R1: roster size = 120
  const r1 = await runR1RosterSize(page)
  if (r1.enemies.length !== 120) {
    throw new Error(`TASK-R1: expected TEST_LEVEL.enemies.length === 120, got ${r1.enemies.length}`)
  }

  // TASK-R2: static valla isoX constant over 10 ticks (camera advancing)
  const r2 = await runR2StaticIsoXConstant(page)
  if (!r2.passed) {
    throw new Error(`TASK-R2: static valla_publicitaria must keep speed=0/pattern='static' AND isoX constant — got dx=${r2.dx}, speed=${r2.speedOnInstance}, pattern=${r2.patternOnInstance}`)
  }

  // TASK-R3: dron_fumigador sine — isoY oscillates around spawn isoY (sign flip at frame 30)
  const r3 = await runR3SineOscillation(page)
  if (r3.signFlips < 1) {
    throw new Error(`TASK-R3: sine dron_fumigador did not oscillate (sign flips: ${r3.signFlips})`)
  }
  if (r3.advanceDelta <= 0) {
    throw new Error(`TASK-R3: sine dron_fumigador did not advance isoX (delta: ${r3.advanceDelta})`)
  }

  // TASK-R4: lateral clamp — mobile enemy at edge gets velocity reflected
  const r4 = await runR4LateralClamp(page)
  if (!r4.reflected) {
    throw new Error(`TASK-R4: lateral clamp did not reflect velocity (startS=${r4.startS}, endS=${r4.endS})`)
  }
  if (r4.endS > r4.maxBound) {
    throw new Error(`TASK-R4: post-clamp sx=${r4.endS} exceeds maxBound=${r4.maxBound}`)
  }

  // TASK-R5: hit detection still works on moving enemy
  const r5 = await runR5HitOnMovingEnemy(page)
  if (!r5.hit) {
    throw new Error(`TASK-R5: hit missed on moving sine dron_fumigador`)
  }

  await browser.close()
  return { r1, r2, r3, r4, r5 }
}

// ----------------------------------------------------------------
// TASK-R1 — TEST_LEVEL roster scale
// ----------------------------------------------------------------
async function runR1RosterSize(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const tl = api.getTestLevel?.()
    return { enemies: tl?.enemies ?? [], length: tl?.enemies?.length ?? 0 }
  })
}

// ----------------------------------------------------------------
// TASK-R2 — static spriteIds MUST NOT self-translate, even if the spawn
//   definition explicitly passes speed > 0 + a non-static pattern.
//
//   Hard rule from REQ-CMB-009: valla_publicitaria / billboard_* / signage_*
//   / incineradora / planta_treco / sello_burocratico / castillo_cofrentes
//   MUST keep speed=0, pattern='static'. A spawn that tries to make them
//   move MUST be downgraded by the implementation. Until that enforcement
//   exists, an "ignored" speed/pattern silently behaves the same way
//   (also no motion) — this test detects it by also asserting the enemy
//   instance has speed=0/pattern='static' AFTER spawn.
// ----------------------------------------------------------------
async function runR2StaticIsoXConstant(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(0)
    // Spawn with movement config that WOULD make the enemy move if applied.
    // The implementation MUST enforce the static hard rule and downgrade
    // this to speed=0/pattern='static'.
    const fixture = api.spawnEnemy({
      id: 'r2_static_valla',
      archetype: 'standard',
      isoX: 3,
      isoY: 2,
      spriteId: 'enemies_valla_publicitaria',
      speed: 999,
      movementPattern: 'sine',
    })
    if (!fixture) throw new Error('R2 setup: spawn returned null')
    const enemies = window.__zarraModules__.enemies
    const live = enemies.get('r2_static_valla')
    const ixBefore = live?.isoX
    const speedOnInstance = live?.speed
    const patternOnInstance = live?.movementPattern
    for (let i = 0; i < 10; i++) api.tick(16.6667)
    const after = enemies.get('r2_static_valla')
    const ixAfter = after?.isoX
    const ixDx = (ixAfter ?? NaN) - (ixBefore ?? NaN)
    // Pass = (a) isoX did not change over 10 ticks, AND (b) the instance
    // was downgraded to speed=0/pattern='static' (the hard rule).
    const passed = ixDx === 0 && speedOnInstance === 0 && patternOnInstance === 'static'
    return {
      ixBefore, ixAfter, dx: ixDx,
      speedOnInstance, patternOnInstance,
      passed,
    }
  })
}

// ----------------------------------------------------------------
// TASK-R3 — dron_fumigador with sine: isoY oscillates around spawn, isoX advances.
//
//   To isolate the movement math from the escape detection AND the lateral
//   clamp, we invoke `enemy.tick()` DIRECTLY on the live enemy instance and
//   pass `viewportBounds: null` so the clamp doesn't reflect ix. This proves
//   the per-instance movement code is correct — production code wires
//   tick() into update() in TASK-G5.
// ----------------------------------------------------------------
async function runR3SineOscillation(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const enemies = window.__zarraModules__.enemies
    const isoWorld = window.__zarraModules__.isoWorld
    const camera = window.__zarraModules__.camera
    const viewportCenter = { x: 640, y: 360 }

    api.reset()
    api.setTime(0)
    const fixture = api.spawnEnemy({
      id: 'r3_sine_dron',
      archetype: 'tank',
      isoX: 3,
      isoY: 3,
      spriteId: 'enemies_dron_fumigador',
      speed: 70,
      movementPattern: 'sine',
    })
    if (!fixture) throw new Error('R3 setup: spawn returned null')

    const live = enemies.get('r3_sine_dron')
    if (!live) throw new Error('R3 setup: live enemy not found')
    const spawnIsoY = live.isoY
    const spawnIsoX = live.isoX

    const samples = []
    // 60 ticks @ 16.67 ms = 1 s. With SINE_FREQ_HZ=1.0, this covers a full
    // sine period so we see sign flips (one full cycle 0 → +max → 0 → -max → 0).
    for (let i = 0; i < 60; i++) {
      const camIso = { isoX: camera.getCameraX(), isoY: camera.getCameraY() }
      // viewportBounds=null → clamp branch skipped; pure sine math.
      live.tick(16.6667, camIso, null, isoWorld, viewportCenter)
      samples.push({ ix: live.isoX, iy: live.isoY })
    }

    // Detect oscillation: count sign flips of (iy - spawnIsoY).
    let signFlips = 0
    let lastSign = 0
    for (const s of samples) {
      const d = s.iy - spawnIsoY
      if (Math.abs(d) < 1e-6) continue
      const sign = d > 0 ? 1 : -1
      if (lastSign !== 0 && sign !== lastSign) signFlips++
      lastSign = sign
    }
    const advanceDelta = samples[samples.length - 1].ix - spawnIsoX
    return { samples: samples.length, signFlips, advanceDelta, spawnIsoY, spawnIsoX }
  })
}

// ----------------------------------------------------------------
// TASK-R4 — lateral clamp at right edge: velocity reflected + sx clamped.
//
//   Spawn a mobile enemy with `skipEscape: true` (test mode) so escape
//   detection doesn't kill the enemy before we observe the clamp. We tick
//   until the projected sx first crosses the right bound (≈ viewportW - 79),
//   then verify the NEXT tick brings sx back to ≤ viewportW - 80 via the
//   lateral clamp reflection.
// ----------------------------------------------------------------
async function runR4LateralClamp(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const isoWorld = window.__zarraModules__.isoWorld
    const camera = window.__zarraModules__.camera
    const viewportCenter = { x: 640, y: 360 }
    api.reset()
    api.setTime(0)
    const fixture = api.spawnEnemy({
      id: 'r4_lateral',
      archetype: 'standard',
      isoX: 3,
      isoY: 0,
      spriteId: 'enemies_topadora',
      speed: 200,
      movementPattern: 'zigzag',
    })
    if (!fixture) throw new Error('R4 setup: spawn returned null')

    const maxBound = 1280 - 80
    const camIso = () => ({ isoX: camera.getCameraX(), isoY: camera.getCameraY() })

    let crossed = false
    let preTickSx = null
    for (let i = 0; i < 30; i++) {
      api.tick(16.6667, { skipEscape: true })
      const e = api.getEnemies().find(x => x.id === 'r4_lateral')
      if (!e) return { startS: null, endS: null, maxBound, reflected: false, error: `vanished at i=${i}` }
      const { sx } = isoWorld.isoToScreenWithCamera(e.isoX, e.isoY, camIso(), viewportCenter)
      preTickSx = sx
      if (sx >= maxBound - 1) { crossed = true; break }
    }
    if (!crossed) return { startS: preTickSx, endS: null, maxBound, reflected: false, error: 'never crossed bound' }

    // One more tick — clamp MUST fire and bring sx back to ≤ maxBound.
    api.tick(16.6667, { skipEscape: true })
    const after = api.getEnemies().find(x => x.id === 'r4_lateral')
    let endS = null
    if (after) {
      const r = isoWorld.isoToScreenWithCamera(after.isoX, after.isoY, camIso(), viewportCenter)
      endS = r.sx
    }
    const reflected = endS !== null && endS <= maxBound
    return { startS: preTickSx, endS, maxBound, reflected }
  })
}

// ----------------------------------------------------------------
// TASK-R5 — hit detection on a moving enemy (sine dron_fumigador).
//   Fire at the live sprite bounds after a few ticks; the bounds read from
//   getScreenBounds() must still register a hit even though isoX changed.
//   We use `skipEscape: true` because the moving enemy would otherwise be
//   removed by escape detection before we can fire.
// ----------------------------------------------------------------
async function runR5HitOnMovingEnemy(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(0)
    const fixture = api.spawnEnemy({
      id: 'r5_moving',
      archetype: 'tank',
      isoX: 5,
      isoY: 5,
      spriteId: 'enemies_dron_fumigador',
      speed: 70,
      movementPattern: 'sine',
    })
    if (!fixture) throw new Error('R5 setup: spawn returned null')
    // Advance a few ticks so isoX changes meaningfully. Disable escape
    // detection so the moving enemy survives long enough to hit-test.
    for (let i = 0; i < 10; i++) api.tick(16.6667, { skipEscape: true })
    const e = api.getEnemies().find(x => x.id === 'r5_moving')
    if (!e) throw new Error('R5: enemy vanished during tick')
    const bounds = api.getScreenBounds(e.id)
    if (!bounds) throw new Error('R5: getScreenBounds returned null')
    const cx = bounds.x + bounds.w / 2
    const cy = bounds.y + bounds.h / 2
    const result = api.fireAtScreen(cx, cy, { bypassCooldown: true })
    return { bounds, firedAt: { x: cx, y: cy }, ...result }
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEnemyMovementSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}
