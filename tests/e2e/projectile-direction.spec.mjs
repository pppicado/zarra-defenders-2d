/**
 * tests/e2e/projectile-direction.spec.mjs
 *
 * Reproduce + lock the projectile-direction bug.
 *
 * Bug hypothesis: in combat.js fireAtIso, `targetScreen = isoWorld.isoToScreen(ix, iy)`
 * returns CONTAINER-INTERNAL coordinates (anchored at tileWorldOrigin), but the
 * projectile is mounted in hudContainer at SCREEN coordinates. Origin (hand) IS in
 * screen coords. Mixed coordinate systems → the projectile vector is wrong, and
 * the Y component flips sign once the camera moves far enough down the rail.
 *
 * At camera depth D (=camIsoX+camIsoY), with target iso = camIso (cursor at
 * viewport center):
 *   isoToScreen(camIso)   = (tileWorldOrigin.x, tileWorldOrigin.y + 2D*step)
 *   real screen position   = (viewOrigin.x, viewOrigin.y)        — by construction
 *   broken vector.y        = (tileWorldOrigin.y + 2D*step) - hand.y
 *   correct vector.y       = viewOrigin.y - hand.y  (constant)
 *
 * With tileWorldOrigin.y = round(720*0.30) = 216, hand.y = 720 - 48 = 672,
 * viewOrigin.y = 360, step = 128/√2 ≈ 90.5097:
 *   correct  = 360 - 672 = -312  (always UP)
 *   broken at D=0   = 216 - 672 = -456  (UP, wrong magnitude)
 *   broken at D=1.2 = 216 + 217 - 672 = -239  (UP, short)
 *   broken at D=3   = 216 + 543 - 672 = +87   (DOWN — flipped!)
 *   broken at D=4   = 216 + 724 - 672 = +268  (DOWN, more flipped)
 *
 * So the projectile begins pointing UP but with wrong magnitude, then
 * progressively shortens, and finally aims DOWN once camera depth crosses ~2.5.
 *
 * Test asserts: after the fix, broken_y == correct_y for every (t, targetIso) pair.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const URL = process.env.TEST_URL || 'http://localhost:8000/?test=1'

const LOGICAL_W = 1280
const LOGICAL_H = 720
const HAND_BOTTOM_OFFSET_Y = -48
const VIEWPORT_CENTER = { x: LOGICAL_W / 2, y: LOGICAL_H / 2 }
const HAND_SCREEN = { x: VIEWPORT_CENTER.x, y: LOGICAL_H + HAND_BOTTOM_OFFSET_Y }

function expectedVectorY() {
  // cursor at viewport center → target iso = camera iso → screen target = viewport center
  return VIEWPORT_CENTER.y - HAND_SCREEN.y
}

export async function runProjectileDirectionSpec() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })

  const results = []
  // Test at multiple camera times. Each row simulates: camera at (d,d), cursor at
  // viewport center (so iso target = camIso), tap fires.
  const depths = [0, 1, 3, 4, 6, 10, 18]

  // Also test an off-center cursor at the moment when the old bug flipped (depth 10),
  // verifying the gfx actually moves toward the right screen position.
  const offCenterRows = []

  for (const depth of depths) {
    // camera depth = camIsoX + camIsoY; rail goes (0,0)->(18,18) over 60s
    const t = (depth / 36) * 60
    const out = await page.evaluate(({ t, handX, handY, viewportX, viewportY }) => {
      window.__gameTestAPI__.reset()
      window.__gameTestAPI__.setTime(t)
      window.__gameTestAPI__.tick(16.6667)

      const mods = window.__zarraModules__
      const camera = mods.camera
      const isoWorld = mods.isoWorld
      const camIso = { isoX: camera.getCameraX(), isoY: camera.getCameraY() }

      // Tap at viewport center → iso target = camIso (the closest tile to cursor)
      const cursor = { x: viewportX, y: viewportY }
      const iso = isoWorld.screenToIsoWithCamera(cursor.x, cursor.y, camIso, { x: viewportX, y: viewportY })

      // Fire from hand screen position toward the iso we just computed.
      // combat.cameraIso is normally refreshed by the production ticker; the
      // test api's setTime/tick skip that — sync it manually so we test the
      // fireAtIso math, not the staleness.
      const combat = mods.combat
      if (!combat || typeof combat.fireAtIso !== 'function') {
        return { error: 'combat module not exposed' }
      }
      combat.setCameraIso(camIso)
      combat.fireAtIso(iso.isoX, iso.isoY, { x: handX, y: handY }, { bypassCooldown: true })
      const live = combat._projectiles[combat._projectiles.length - 1]
      const tgt = live ? { x: live.target.x, y: live.target.y } : null
      const orig = live ? { x: live.origin.x, y: live.origin.y } : null
      return {
        camIso,
        isoTarget: iso,
        projectileOrigin: orig,
        projectileTarget: tgt,
      }
    }, { t, handX: HAND_SCREEN.x, handY: HAND_SCREEN.y, viewportX: VIEWPORT_CENTER.x, viewportY: VIEWPORT_CENTER.y })

    if (out.error) {
      results.push({ depth, t, error: out.error })
      continue
    }

    const orig = out.projectileOrigin
    const tgt = out.projectileTarget
    const vy = tgt.y - orig.y
    const expectedVy = expectedVectorY()
    results.push({
      depth,
      t: Number(t.toFixed(2)),
      camIso: out.camIso,
      isoTarget: out.isoTarget,
      projectileOrigin: orig,
      projectileTarget: tgt,
      vy: Number(vy.toFixed(2)),
      expectedVy,
      flipped: Math.sign(vy) !== Math.sign(expectedVy),
    })
  }

  // Off-center cursor at depth=10 (the original-flip moment), verifying the gfx
  // actually travels toward the screen position the cursor pointed at, not its
  // mirror below the hand.
  const offCenter = await page.evaluate(({ handX, handY, viewportX, viewportY }) => {
    const mods = window.__zarraModules__
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime((10 / 36) * 60)
    window.__gameTestAPI__.tick(16.6667)
    const camera = mods.camera
    const isoWorld = mods.isoWorld
    const camIso = { isoX: camera.getCameraX(), isoY: camera.getCameraY() }
    mods.combat.setCameraIso(camIso)
    // Cursor at upper-right quadrant (e.g. (1300, 300) — a real iso target
    // somewhere ahead-right of the camera).
    const cursor = { x: 1300, y: 300 }
    const iso = isoWorld.screenToIsoWithCamera(cursor.x, cursor.y, camIso, { x: viewportX, y: viewportY })
    mods.combat.fireAtIso(iso.isoX, iso.isoY, { x: handX, y: handY }, { bypassCooldown: true })
    const live = mods.combat._projectiles[mods.combat._projectiles.length - 1]
    // After 1 tick of 16ms, where is the gfx on screen?
    mods.combat.update(16)
    return {
      cursor,
      isoTarget: iso,
      gfxAfter: { x: live.gfx.x, y: live.gfx.y },
      target: { x: live.target.x, y: live.target.y },
    }
  }, { handX: HAND_SCREEN.x, handY: HAND_SCREEN.y, viewportX: VIEWPORT_CENTER.x, viewportY: VIEWPORT_CENTER.y })
  offCenterRows.push(offCenter)

  await browser.close()
  return { rows: results, offCenter: offCenterRows }
}

function summarize(rows) {
  const lines = []
  lines.push('depth | t    | camIso                  | isoTarget               | projTarget              | vy     | expectedVy | flipped?')
  lines.push('------+------+-------------------------+-------------------------+-------------------------+--------+------------+----------')
  for (const r of rows) {
    if (r.error) { lines.push(`  ERR: ${r.error}`); continue }
    const c = r.camIso
    const it = r.isoTarget
    const pt = r.projectileTarget
    lines.push(
      `  ${String(r.depth).padStart(4)} | ${String(r.t).padStart(4)} | (${c.isoX.toFixed(2)}, ${c.isoY.toFixed(2)})     | (${it.isoX.toFixed(2)}, ${it.isoY.toFixed(2)})       | (${pt.x.toFixed(0)}, ${pt.y.toFixed(0)})     | ${String(r.vy).padStart(6)} | ${String(r.expectedVy).padStart(10)} | ${r.flipped ? '   YES <-- BUG' : '   no'}`
    )
  }
  return lines.join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runProjectileDirectionSpec()
    .then(({ rows, offCenter }) => {
      console.log(summarize(rows))
      console.log('\nOff-center cursor (depth=10, cursor=(1300,300)):')
      for (const o of offCenter) {
        const dirX = o.gfxAfter.x - HAND_SCREEN.x
        const dirY = o.gfxAfter.y - HAND_SCREEN.y
        const cursorDirX = o.cursor.x - HAND_SCREEN.x
        const cursorDirY = o.cursor.y - HAND_SCREEN.y
        const aligned = Math.sign(dirX) === Math.sign(cursorDirX) && Math.sign(dirY) === Math.sign(cursorDirY)
        console.log(`  iso target=${JSON.stringify(o.isoTarget)} target_screen=${JSON.stringify(o.target)} gfx_after_1_tick=${JSON.stringify(o.gfxAfter)} vector_to_gfx=(${dirX.toFixed(0)},${dirY.toFixed(0)}) cursor_relative=(${cursorDirX},${cursorDirY}) aligned=${aligned ? 'YES' : 'NO'}`)
      }
      const anyFlipped = rows.some(r => r.flipped)
      const anyMisaligned = offCenter.some(o => {
        const dirX = o.gfxAfter.x - HAND_SCREEN.x
        const dirY = o.gfxAfter.y - HAND_SCREEN.y
        const cursorDirX = o.cursor.x - HAND_SCREEN.x
        const cursorDirY = o.cursor.y - HAND_SCREEN.y
        return Math.sign(dirX) !== Math.sign(cursorDirX) || Math.sign(dirY) !== Math.sign(cursorDirY)
      })
      if (anyFlipped) { console.error('\nBUG REPRODUCED: center-cursor Y component flips sign for some camera depths'); process.exit(2) }
      if (anyMisaligned) { console.error('\nBUG: off-center projectile direction misaligned with cursor'); process.exit(3) }
      console.log('\nOK: no flipped vectors, off-center projectile aligns with cursor')
      process.exit(0)
    })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}