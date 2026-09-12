/**
 * tests/e2e/smoke.spec.mjs
 *
 * Final smoke test for F3:
 *   1. Boot ?test=1&seed=12345 with no console errors
 *   2. Verify __gameTestAPI__ exposes the locked 13+ method surface
 *   3. Reset state, tick 60s — verify all 12 enemies spawned and then escaped
 *      (no shots were fired in this smoke, so integrity drains to 0)
 *   4. Capture screenshot for visual inspection
 */
import { chromium } from 'playwright'

const TAILSCALE_URL = 'http://100.116.137.66:8000/?test=1&seed=12345'
const SCREENSHOT_PATH = '/projects/personal/zarra-defenders-2d/tests/playwright-screenshots/f3-boot.png'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()

  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  await page.goto(TAILSCALE_URL, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 15_000 })
  await new Promise(r => setTimeout(r, 500))   // let bootstrap finish wiring bootTestLevel

  // Verify API surface
  const apiKeys = await page.evaluate(() => Object.keys(window.__gameTestAPI__).sort())
  const required = ['fireAtIso', 'getEnemies', 'getIntegrity', 'getProjectiles', 'getScore', 'getSeed', 'getStatus', 'off', 'on', 'reset', 'setSeed', 'setTime', 'simulateTap', 'spawnEnemy', 'tick']
  for (const k of required) {
    if (!apiKeys.includes(k)) throw new Error(`__gameTestAPI__ missing method: ${k}`)
  }

  // Track time-gated spawn + immediate spawn count, dedupe by id
  await page.evaluate(() => {
    window.__spawnedIds = new Set()
    const enemies = window.__zarraModules__.enemies
    const origSpawn = enemies.spawn.bind(enemies)
    enemies.spawn = (def) => {
      const r = origSpawn(def)
      if (def && def.id) window.__spawnedIds.add(def.id)
      return r
    }
    const origUpdate = enemies.update.bind(enemies)
    enemies.update = function (dtMs, camIso, elapsedSec) {
      const r = origUpdate(dtMs, camIso, elapsedSec)
      return r
    }
  })

  // Reset the level (this calls spawn() for each enemy — counted above)
  await page.evaluate(() => window.__gameTestAPI__.reset())

  // Step the camera forward 60 seconds in 60Hz ticks (3600 ticks × 16.6667ms = 60s).
  await page.evaluate(() => {
    for (let i = 0; i < 3600; i++) window.__gameTestAPI__.tick(16.6667)
  })

  const spawnedIds = await page.evaluate(() => [...window.__spawnedIds])
  console.log(`Spawned enemies: ${spawnedIds.length} (${spawnedIds.join(',')})`)
  // Fase-5 REQ-CMB-009: roster scale from 24 (F4b) to 120 (5×). Smoke test
  // expects the full roster to spawn over the camera run.
  if (spawnedIds.length !== 120) {
    throw new Error(`Expected 120 enemies to spawn over the level, got ${spawnedIds.length}`)
  }

  // Step the camera forward 60 seconds in 60Hz ticks
  await page.evaluate(() => {
    for (let i = 0; i < 3600; i++) window.__gameTestAPI__.tick(16.6667)
  })

  const result = await page.evaluate(() => ({
    integrity: window.__gameTestAPI__.getIntegrity(),
    score: window.__gameTestAPI__.getScore(),
    enemies: window.__gameTestAPI__.getEnemies(),
    projectiles: window.__gameTestAPI__.getProjectiles(),
    inTestMode: window.__gameTestAPI__.getStatus().inTestMode,
  }))

  console.log('SMOKE RESULT:', JSON.stringify(result, null, 2))
  console.log('Console errors:', consoleErrors.length === 0 ? '(none)' : consoleErrors)

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false })
  console.log(`Screenshot: ${SCREENSHOT_PATH}`)

  await browser.close()

  // Spec assertions: 120 enemies spawn + at least some escape + integrity drops.
  // F3.2 changed escape detection from depth-only to Manhattan > 6 tiles, so the
  // last few enemies (deepest in iso, behind the rail end) may survive past t=60.
  // Fase-5: roster is 120 (depth 5..70); survivors at t=60 can include the
  // deepest enemies (depth > 24 = camera sum at t=60). Bump the survivor cap.
  if (result.enemies.length > 30) {
    throw new Error(`Expected at most 30 enemies alive at t=60, got ${result.enemies.length}`)
  }
  if (!result.integrity.exhausted) {
    throw new Error(`Expected integrity to be exhausted after enough escapes, got ${JSON.stringify(result.integrity)}`)
  }
  if (consoleErrors.length > 0) {
    console.error('FAIL: console errors detected')
    process.exit(1)
  }
  console.log('SMOKE PASS')
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
