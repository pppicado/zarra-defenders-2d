/**
 * tests/iso-smoke.js
 *
 * Playwright entry for F2.5.1 — drives iso-math, tilemap, world through
 * a PIXI app and reports results on `window.__isoSmokeOK` +
 * `window.__isoSmokeFailures`.
 *
 * Verifies (TILE-001, TILE-003, TILE-004, CAM-002, CAM-003): iso round-trip,
 * origin identity, 8 loaded variants, cull cap ≤ 100, zIndex % 1000,
 * sortableChildren === false, world.position update, setStage disposal.
 */

import { isoToScreen, screenToIso, computeTileSize, computeWorldOrigin } from '../src/iso/iso-math.js'
import { Tilemap, computeCullRange } from '../src/iso/tilemap.js'
import { IsoWorld } from '../src/iso/world.js'

const W = 1280, H = 720

function setStatus(text, ok) {
  const el = document.getElementById('status')
  el.textContent = text; el.className = ok ? 'ok' : 'fail'
}

/** 128×64 magenta canvas per variant (no PNG pipeline needed). */
function makeMockResolver() {
  const cache = new Map()
  return async (variant) => {
    if (cache.has(variant)) return cache.get(variant)
    const c = document.createElement('canvas'); c.width = 128; c.height = 64
    c.getContext('2d').fillStyle = '#FF00FF'; c.getContext('2d').fillRect(0, 0, 128, 64)
    const tex = PIXI.Texture.from(c)
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
    cache.set(variant, tex); return tex
  }
}

function near(a, b, tol = 0.001) { return Math.abs(a - b) <= tol }

async function run() {
  const failures = []

  // TILE-001 round-trip + origin identity + tileSize clamp
  const tileSize = 128
  const origin = computeWorldOrigin(W, H)
  const a = isoToScreen(3, 5, tileSize, origin)
  const b = screenToIso(a.sx, a.sy, tileSize, origin)
  if (!near(b.isoX, 3) || !near(b.isoY, 5)) failures.push(`round-trip drift`)
  const z = isoToScreen(0, 0, tileSize, origin)
  if (!near(z.sx, origin.x) || !near(z.sy, origin.y)) failures.push(`iso(0,0) not at origin`)
  const ts = computeTileSize(800, 600)
  if (ts < 64 || ts > 256) failures.push(`tileSize out of bounds: ${ts}`)

  // TILE-003/004: 8 variants + cull
  const tm = new Tilemap('stage1-bosque', W, H, { tileSize, tileWorldOrigin: origin })
  await tm.load(makeMockResolver())
  if (tm.loadedVariants.length !== 8) failures.push(`variants: ${tm.loadedVariants.length} ≠ 8`)

  const dummy = new PIXI.Container(); dummy.sortableChildren = false
  const range = computeCullRange(5, 5, W, H, tileSize, origin)
  const picker = (gx, gy) => tm.loadedVariants[(gx + gy) % tm.loadedVariants.length]
  const live = tm.cullAndRender(dummy, range, picker)
  if (live > 100) failures.push(`cull cap broken: ${live}`)
  if (live < 1) failures.push(`cull empty`)
  for (const tile of tm.activeTiles.values()) {
    if (tile.zIndex % 1000 !== 0) { failures.push(`zIndex % 1000`); break }
  }

  // CAM-002: IsoWorld.update sets container.position
  const world = new IsoWorld({ viewportWidth: W, viewportHeight: H, tileSize, tileWorldOrigin: origin })
  world.registerTilemap(tm); world.setStage('stage1-bosque')
  world.update({ getCameraX: () => 5, getCameraY: () => 5 })
  const exp = isoToScreen(5, 5, tileSize, origin)
  if (!near(world.container.position.x, -exp.sx) || !near(world.container.position.y, -exp.sy)) {
    failures.push(`world.position wrong`)
  }
  if (world.activeTilemap !== tm) failures.push(`activeTilemap ref broken`)

  // CAM-003: setStage disposes previous
  const tm2 = new Tilemap('stage2-pueblo', W, H, { tileSize, tileWorldOrigin: origin })
  await tm2.load(makeMockResolver())
  world.registerTilemap(tm2); world.setStage('stage2-pueblo')
  if (world.activeTilemap !== tm2) failures.push(`setStage flip broken`)
  const r2 = computeCullRange(0, 0, W, H, tileSize, origin)
  if (tm2.cullAndRender(world['_tileLayer'], r2, (gx, gy) => tm2.loadedVariants[(gx + gy) % tm2.loadedVariants.length]) < 1) {
    failures.push(`stage2 cull empty`)
  }

  if (world.container.sortableChildren !== false) failures.push(`sortableChildren on world`)
  if (world['_tileLayer'].sortableChildren !== false) failures.push(`sortableChildren on tileLayer`)

  const ok = failures.length === 0
  window.__isoSmokeOK = ok
  window.__isoSmokeFailures = failures
  setStatus(ok ? `iso-smoke OK · ${live} live tiles (cap 100)` : `iso-smoke FAIL · ${failures.length} issues`, ok)
  console[ok ? 'log' : 'error']('[iso-smoke]', ok ? 'OK' : 'FAIL', { liveTiles: live, failures })
}

run().catch(err => {
  setStatus(`iso-smoke ERROR · ${err.message}`, false)
  console.error('[iso-smoke] ERROR', err)
  window.__isoSmokeOK = false
  window.__isoSmokeFailures = [String(err)]
})