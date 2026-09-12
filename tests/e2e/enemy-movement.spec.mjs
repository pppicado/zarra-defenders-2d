/**
 * tests/e2e/enemy-movement.spec.mjs
 *
 * Fase-5 (REQ-CMB-009 + REQ-CMB-010 + REQ-CMB-012) — per-instance enemy
 * self-translation + test-mode auto-advance.
 *
 * RED scenarios (TDD STRICT, written BEFORE implementation):
 *   TASK-R1: TEST_LEVEL.enemies.length === 120 (FAILS until F5.5)
 *   TASK-R2: static valla_publicitaria isoX unchanged over 10 ticks
 *   TASK-R3: dron_fumigador with sine pattern oscillates isoY around spawn
 *            (Fase-5-calibration redefinition: isoX is LOCKED, only isoY
 *             oscillates around spawn — REQ-CMB-009 oscillation model)
 *   TASK-R4: lateral clamp reflects velocity at viewport edge
 *   TASK-R5: hit detection still works on a moving enemy
 *   TASK-R9 (fase-5-calibration NEW): camion_treco at t=0 vs t=3 has SAME
 *            isoX (no linear advance — oscillation model)
 *   TASK-R10 (fase-5-calibration NEW): dron_fumigador isoY sign-flip rate
 *             matches MOBILE_DEFAULT[...].speed (Hz)
 *   TASK-R11 (fase-5-calibration NEW): ?test=1 cameraTime > 0 after 1s
 *             wait without manual tick() (REQ-CMB-012 auto-advance)
 *   TASK-R12 (fase-5-calibration NEW): e01 alive at cameraTime=5 (REQ-CMB-012
 *             + REQ-CMB-009 oscillation — enemy must survive auto-advance)
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

  // TASK-R3: dron_fumigador sine — isoY oscillates around spawn, isoX LOCKED.
  // Fase-5-calibration: oscillation model replaces linear advance; isoX must
  // remain at spawn value across all 60 ticks. (Pre-calibration this asserted
  // `advanceDelta > 0` — that was the BUG that caused enemies to escape.)
  const r3 = await runR3SineOscillation(page)
  if (r3.signFlips < 1) {
    throw new Error(`TASK-R3: sine dron_fumigador did not oscillate (sign flips: ${r3.signFlips})`)
  }
  if (r3.advanceDelta !== 0) {
    throw new Error(`TASK-R3: oscillation model — isoX must be LOCKED to spawn; got delta=${r3.advanceDelta}`)
  }
  if (r3.maxIsoXDrift > 1e-9) {
    throw new Error(`TASK-R3: isoX must remain constant across all ticks; maxIsoXDrift=${r3.maxIsoXDrift}`)
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

  // TASK-R6: spawning a mobile spriteId WITHOUT speed/pattern must apply
  //   MOBILE_DEFAULT (not the ctor's pre-defaults). Fase-5-calibration:
  //   speed is now oscillation frequency in Hz — expect 0 < speed < 2 (the
  //   pre-calibration test asserted speed > 30, which was the linear-
  //   velocity range).
  const r6 = await runR6_CamionTrecoDefaults(page)
  if (r6.pattern !== 'zigzag') {
    throw new Error(`TASK-R6: expected MOBILE_DEFAULT[camion_treco].movementPattern === 'zigzag', got '${r6.pattern}'`)
  }
  if (!(r6.speed > 0 && r6.speed < 2)) {
    throw new Error(`TASK-R6: expected MOBILE_DEFAULT[camion_treco].speed ∈ (0, 2) Hz (oscillation), got ${r6.speed}`)
  }

  // TASK-R7: explicit speed=0 + pattern='static' MUST be respected on a
  //   mobile spriteId (no implicit MOBILE_DEFAULT override).
  const r7 = await runR7_ExplicitStaticRespected(page)
  if (r7.pattern !== 'static') {
    throw new Error(`TASK-R7: explicit speed=0 + pattern='static' not respected; got pattern='${r7.pattern}'`)
  }
  if (r7.speed !== 0) {
    throw new Error(`TASK-R7: explicit speed=0 not respected; got speed=${r7.speed}`)
  }

  // TASK-R8: triggering reset (the test-api's retry proxy) must reload the
  //   TEST_LEVEL enemy roster — queue must be non-empty afterwards.
  const r8 = await runR8_RetryReloadsLevel(page)
  if (r8.queueLen < 50) {
    throw new Error(`TASK-R8: expected enemies._timeGatedSpawns.length > 50 after reset/retry, got ${r8.queueLen}`)
  }

  // ----------------------------------------------------------------
  // Fase-5-calibration RED scenarios (TDD STRICT — written before G1/G2/G3)
  // ----------------------------------------------------------------

  // TASK-R9: oscillation model — camion_treco isoX locked across 3s.
  const r9 = await runR9NoAdvance(page)
  if (!r9.passed) {
    throw new Error(`TASK-R9: oscillation model — camion_treco isoX must equal spawn after 3s; before=${r9.ixBefore} after=${r9.ixAfter} delta=${r9.ixDelta}`)
  }

  // TASK-R10: dron_fumigador oscillation rate + isoX locked.
  const r10 = await runR10OscillationRate(page)
  if (!r10.passed) {
    throw new Error(`TASK-R10: oscillation rate mismatch — speed=${r10.observedSpeed} pattern=${r10.observedPattern} signFlips=${r10.signFlips} maxIxDrift=${r10.maxIxDrift}`)
  }

  // TASK-R11: ?test=1 auto-advance — cameraTime > 0 after 1s wait.
  const r11 = await runR11TestModeAutoAdvance(page)
  if (!r11.passed) {
    throw new Error(`TASK-R11: ?test=1 must auto-advance camera; tBefore=${r11.tBefore} tAfter=${r11.tAfter}`)
  }

  // TASK-R12: e01 still alive at cameraTime=5s (no immediate escape).
  const r12 = await runR12E01AliveAt5s(page)
  if (!r12.passed) {
    throw new Error(`TASK-R12: e01 must remain alive at cameraTime≈5s; state=${r12.e01State} isoX=${r12.e01IsoX} cameraTime=${r12.cameraTime}`)
  }

  await browser.close()
  return { r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12 }
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
    let maxIsoXDrift = 0
    for (const s of samples) {
      const d = s.iy - spawnIsoY
      if (Math.abs(d) < 1e-6) continue
      const sign = d > 0 ? 1 : -1
      if (lastSign !== 0 && sign !== lastSign) signFlips++
      lastSign = sign
      const ixDrift = Math.abs(s.ix - spawnIsoX)
      if (ixDrift > maxIsoXDrift) maxIsoXDrift = ixDrift
    }
    const advanceDelta = samples[samples.length - 1].ix - spawnIsoX
    return { samples: samples.length, signFlips, advanceDelta, maxIsoXDrift, spawnIsoY, spawnIsoX }
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

// ----------------------------------------------------------------
// TASK-R6 — spawn a mobile spriteId WITHOUT speed/pattern: the resolver
//   MUST apply MOBILE_DEFAULT[spriteId] (not the ctor's pre-defaults of
//   speed=0/pattern='static'). Pre-fix this returns {speed:0, pattern:'static'}
//   because the ctor destructures `speed=0, movementPattern='static'` BEFORE
//   resolveMovementConfig gets a chance to apply MOBILE_DEFAULT.
// ----------------------------------------------------------------
async function runR6_CamionTrecoDefaults(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(0)
    const e = api.spawnEnemy({
      id: 'r6_camion_treco_defaults',
      archetype: 'standard',
      isoX: 10,
      isoY: 10,
      spriteId: 'enemies_camion_treco',
      // NOTE: deliberately no speed / no movementPattern here.
    })
    if (!e) throw new Error('R6 setup: spawnEnemy returned null')
    return {
      id: e.id,
      speed: e.speed,
      pattern: e.movementPattern,
    }
  })
}

// ----------------------------------------------------------------
// TASK-R7 — explicit user-supplied speed=0 + pattern='static' on a mobile
//   spriteId MUST be respected (not overridden by MOBILE_DEFAULT). Pre-fix
//   the ctor pre-defaults short-circuit the resolver, but even after the
//   fix the resolver must distinguish "user chose 0/static" from
//   "user omitted", which means `typeof speed === 'number' && Number.isFinite`
//   — undefined MUST NOT pass that gate, but 0 MUST.
// ----------------------------------------------------------------
async function runR7_ExplicitStaticRespected(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(0)
    const e = api.spawnEnemy({
      id: 'r7_explicit_static',
      archetype: 'standard',
      isoX: 10,
      isoY: 10,
      spriteId: 'enemies_camion_treco',
      speed: 0,
      movementPattern: 'static',
    })
    if (!e) throw new Error('R7 setup: spawnEnemy returned null')
    return { speed: e.speed, pattern: e.movementPattern }
  })
}

// ----------------------------------------------------------------
// TASK-R8 — Reintentar equivalent (overlay._onRetry) must populate the
//   time-gated spawn queue. Pre-fix, `overlay._onRetry` only called
//   `enemies.reset()` (clears) but never `bootTestLevel` (loads).
//   After the fix, overlay emits `bootTestLevel:request` and main.js
//   listens for it — the level reload must leave the queue populated.
//
//   We exercise the REAL overlay click path (not the test-api reset
//   shortcut) so we cover the SPEC-CMB-011 wiring end-to-end: bus
//   event → main.js listener → bootTestLevel → loadLevel.
// ----------------------------------------------------------------
async function runR8_RetryReloadsLevel(page) {
  // Step 1: show the overlay via its public API (the same path the game
  // takes when integrity hits zero).
  await page.evaluate(() => {
    window.__zarraModules__.overlay.showGameOver()
  })
  // Step 2: click Reintentar — the user-facing retry button.
  await page.click('[data-role="retry"]')
  // Step 3: give the bus listener + bootTestLevel a moment to settle.
  await page.waitForTimeout(500)

  return await page.evaluate(() => ({
    queueLen: window.__zarraModules__.enemies._timeGatedSpawns?.length ?? 0,
    alive: window.__zarraModules__.enemies._enemies?.size ?? 0,
    cameraTime: window.__zarraModules__.camera?.getTime?.() ?? null,
    overlayHidden: window.__zarraModules__.overlay?.isVisible === false,
  }))
}

// ----------------------------------------------------------------
// TASK-R9 (fase-5-calibration NEW) — camion_treco (zigzag, 0.4 Hz): with
//   the oscillation model, isoX must be IDENTICAL at t=0 and t=3.
//   Pre-calibration the linear advance pushed isoX forward by
//   ~3 × 0.707 × 50 × 16.67ms ≈ 1.77 iso tiles per second, so this
//   assertion FAILS until G1 lands.
//
//   Spawn position chosen at iso (5, 5) — well within camera reach
//   (Manhattan 10 tiles initially, but R9 uses `skipEscape: true` on
//   each tick to isolate the oscillation behavior from the escape
//   detector; production escape is exercised by R12).
// ----------------------------------------------------------------
async function runR9NoAdvance(page) {
  return await page.evaluate(async () => {
    const api = window.__gameTestAPI__
    const enemies = window.__zarraModules__.enemies
    api.reset()
    api.setTime(0)
    const fixture = api.spawnEnemy({
      id: 'r9_camion',
      archetype: 'standard',
      isoX: 5,
      isoY: 5,
      spriteId: 'enemies_camion_treco',
    })
    if (!fixture) throw new Error('R9 setup: spawn returned null')
    const before = enemies.get('r9_camion')
    const ixBefore = before.isoX
    const iyBefore = before.isoY
    // 3 seconds of simulation — skipEscape isolates the oscillation
    // behavior from the screen-space escape detector (otherwise the
    // enemy at iso (5,5) would escape via Manhattan > 6 after the
    // camera advances).
    for (let i = 0; i < 18; i++) api.tick(180, { skipEscape: true })
    const after = enemies.get('r9_camion')
    const ixAfter = after?.isoX
    const iyAfter = after?.isoY
    const ixDelta = (ixAfter ?? NaN) - ixBefore
    const iyDelta = (iyAfter ?? NaN) - iyBefore
    return {
      ixBefore, ixAfter, iyBefore, iyAfter,
      ixDelta, iyDelta,
      passed: after !== null && after !== undefined && Math.abs(ixDelta) < 1e-9 && ixAfter === ixBefore,
    }
  })
}

// ----------------------------------------------------------------
// TASK-R10 (fase-5-calibration NEW) — dron_fumigador oscillation rate
//   matches MOBILE_DEFAULT[...].speed (oscillation Hz). With speed=0.8 Hz,
//   a 1.25 s sweep should produce ≥ 1 full cycle of sign flips. Sign
//   flips per half-period tracked via samples. Pre-calibration the sine
//   was applied around an advancing center so the sign-flip rate was
//   unreachable — the linear advance made the isoY walkout constant
//   around an unobservable sine drift.
// ----------------------------------------------------------------
async function runR10OscillationRate(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const enemies = window.__zarraModules__.enemies
    api.reset()
    api.setTime(0)
    const fixture = api.spawnEnemy({
      id: 'r10_dron',
      archetype: 'tank',
      isoX: 5,
      isoY: 5,
      spriteId: 'enemies_dron_fumigador',
    })
    if (!fixture) throw new Error('R10 setup: spawn returned null')
    const live = enemies.get('r10_dron')
    const spawnIsoY = live.isoY
    const spawnIsoX = live.isoX
    const observedSpeed = live.speed
    const observedPattern = live.movementPattern
    let tMs = 0
    const samples = []
    // Sample every 50 ms for 1.25 s — should cover ≥ 1 full period at 0.8 Hz.
    const dtMs = 16.6667
    for (let i = 0; i < 75; i++) {
      api.tick(dtMs, { skipEscape: true })
      tMs += dtMs
      samples.push({ tMs, iy: live.isoY, ix: live.isoX })
    }
    let signFlips = 0
    let lastSign = 0
    for (const s of samples) {
      const d = s.iy - spawnIsoY
      if (Math.abs(d) < 1e-6) continue
      const sign = d > 0 ? 1 : -1
      if (lastSign !== 0 && sign !== lastSign) signFlips++
      lastSign = sign
    }
    let maxIxDrift = 0
    for (const s of samples) {
      const drift = Math.abs(s.ix - spawnIsoX)
      if (drift > maxIxDrift) maxIxDrift = drift
    }
    return {
      observedSpeed, observedPattern, signFlips, maxIxDrift,
      passed: signFlips >= 2 && maxIxDrift < 1e-9 && observedPattern === 'sine' && observedSpeed > 0,
    }
  })
}

// ----------------------------------------------------------------
// TASK-R11 (fase-5-calibration NEW) — ?test=1 auto-advance: after 1s
//   of waiting WITHOUT manual tick() calls, the camera time must
//   have advanced. Pre-calibration: cameraTime stayed 0 because
//   the test-mode `if (!inTestMode) camera.update(dt)` guard skipped
//   the advance. Fails until G3 lands.
// ----------------------------------------------------------------
async function runR11TestModeAutoAdvance(page) {
  const tBefore = await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(0)
    return window.__zarraModules__.camera.getTime()
  })
  await page.waitForTimeout(1000)
  const tAfter = await page.evaluate(() => window.__zarraModules__.camera.getTime())
  return {
    tBefore, tAfter,
    advanced: (tAfter - tBefore) > 0,
    passed: (tAfter - tBefore) > 0,
  }
}

// ----------------------------------------------------------------
// TASK-R12 (fase-5-calibration NEW) — production camera traversal:
//   after 5 seconds of auto-advance via ?test=1, e01 must still be
//   alive (oscillation keeps it within camera reach). Pre-calibration
//   e01 escaped within 1s because the linear advance outran the
//   camera. Fails until G1+G2+G3 land.
// ----------------------------------------------------------------
async function runR12E01AliveAt5s(page) {
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(0)
  })
  await page.waitForTimeout(5000)
  return await page.evaluate(() => {
    const enemies = window.__zarraModules__.enemies
    const e01 = enemies.get?.('e01')
    const cameraTime = window.__zarraModules__.camera.getTime?.() ?? null
    return {
      e01State: e01?.state ?? 'missing',
      e01IsoX: e01?.isoX ?? null,
      e01IsoY: e01?.isoY ?? null,
      cameraTime,
      passed: !!e01 && e01.state === 'alive' && cameraTime > 4,
    }
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEnemyMovementSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}
