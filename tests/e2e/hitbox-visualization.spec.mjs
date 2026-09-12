/**
 * tests/e2e/hitbox-visualization.spec.mjs
 *
 * Playwright headless tests for the debug hitbox overlay (REQ-CMB-007).
 *
 * Covers three scenarios (all RED before fase-5-hitbox-visualization lands):
 *   - R1: click 5px outside an enemy's shrunk AABB = miss (REQ-CMB-003 + REQ-CMB-006).
 *         Today getScreenBounds() returns the FULL sprite bounds, so a click
 *         5px outside the visible sprite body still lands inside the sprite
 *         bounds — this assertion FAILS until the hitInset is applied.
 *   - R2: ?test=1&hitboxes=1 → __gameTestAPI__.getHitboxRects() returns one
 *         entry per live enemy with { enemyId, archetype, x, y, w, h, color }.
 *         FAILS today because getHitboxRects() does not exist.
 *   - R3: setHitboxesEnabled(false) → getHitboxRects() returns [].
 *         FAILS today because the toggle method does not exist.
 *
 * Run: node tests/e2e/hitbox-visualization.spec.mjs
 */
import { chromium } from 'playwright'

const URL_BASE = process.env.TEST_URL || 'http://localhost:8000'

async function ensureDevServer(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (res.ok) return
  } catch (e) { /* fall through */ }
  throw new Error(`Dev server not reachable at ${url}`)
}

/**
 * Spawn a fresh `standard` enemy at iso(3,2) and read its current getScreenBounds().
 * Used by R1 to compute the click-outside-inset coordinates.
 */
async function bootStandardEnemyAndReadBounds(page) {
  await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(5.0)
    api.tick(16.6667)
  })
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const e01 = api.getEnemies().find(e => e.id === 'e01')
    if (!e01) throw new Error('R1 setup: e01 not found')
    const bounds = api.getScreenBounds(e01.id)
    if (!bounds) throw new Error('R1 setup: getScreenBounds returned null')
    return { bounds, enemyId: e01.id, archetype: e01.archetype }
  })
}

/**
 * R1 — Click 5px outside the visible sprite on the left-top corner. With the
 *      new hitInset (16,16,16,16 standard), the shrunk AABB should start
 *      16 px inside the visible sprite — a click 5 px outside the visible
 *      body lands OUTSIDE the shrunk AABB and must miss.
 */
async function runR1MissOutsideInset(page) {
  const { bounds, enemyId } = await bootStandardEnemyAndReadBounds(page)
  // 5 px outside the top-left of the visible sprite — well clear of the
  // hitInset (16 px) but still inside the legacy full-sprite bounds.
  const fireX = bounds.x - 5
  const fireY = bounds.y - 5
  const result = await page.evaluate(({ x, y }) => {
    return window.__gameTestAPI__.fireAtScreen(x, y, { bypassCooldown: true })
  }, { x: fireX, y: fireY })
  return { bounds, enemyId, firedAt: { x: fireX, y: fireY }, ...result }
}

/**
 * R2 — Boot under ?hitboxes=1, advance one frame, read getHitboxRects().
 *      Expect one entry per alive enemy with the documented shape.
 */
async function runR2OverlayRects(page) {
  await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.reset()
    api.setTime(5.0)
    api.tick(16.6667)
  })
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    const rects = api.getHitboxRects()
    const alive = api.getEnemies().filter(e => e.state === 'alive')
    return { rects, aliveCount: alive.length, aliveIds: alive.map(e => e.id) }
  })
}

/**
 * R3 — Toggle off via setHitboxesEnabled(false), read getHitboxRects(),
 *      expect an empty array.
 */
async function runR3ToggleOffEmpty(page) {
  return await page.evaluate(() => {
    const api = window.__gameTestAPI__
    api.setHitboxesEnabled(false)
    return api.getHitboxRects()
  })
}

export async function runHitboxVisualizationSpec() {
  const url = `${URL_BASE}/?test=1&hitboxes=1`
  await ensureDevServer(url)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  await page.goto(url, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })

  const r1 = await runR1MissOutsideInset(page)
  if (r1.hit) {
    throw new Error(`R1 expected miss 5px outside sprite bounds, got hit enemyId=${r1.enemyId}`)
  }
  if (r1.enemyId !== null) {
    throw new Error(`R1 expected enemyId=null on miss, got ${r1.enemyId}`)
  }

  const r2 = await runR2OverlayRects(page)
  if (!Array.isArray(r2.rects)) {
    throw new Error(`R2 expected getHitboxRects() to return an array, got ${typeof r2.rects}`)
  }
  if (r2.rects.length !== r2.aliveCount) {
    throw new Error(`R2 expected ${r2.aliveCount} rects (one per live enemy), got ${r2.rects.length}`)
  }
  for (const rect of r2.rects) {
    for (const key of ['enemyId', 'archetype', 'x', 'y', 'w', 'h', 'color']) {
      if (!(key in rect)) {
        throw new Error(`R2 rect missing key "${key}": ${JSON.stringify(rect)}`)
      }
    }
    if (typeof rect.color !== 'number') {
      throw new Error(`R2 rect.color expected number, got ${typeof rect.color} (${rect.color})`)
    }
  }

  const r3 = await runR3ToggleOffEmpty(page)
  if (!Array.isArray(r3)) {
    throw new Error(`R3 expected getHitboxRects() to return an array when disabled, got ${typeof r3}`)
  }
  if (r3.length !== 0) {
    throw new Error(`R3 expected empty rects when overlay disabled, got ${r3.length}`)
  }

  await browser.close()
  return { r1, r2, r3 }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHitboxVisualizationSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}
