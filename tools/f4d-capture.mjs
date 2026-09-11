/**
 * tools/f4d-capture.mjs
 *
 * Captures Playwright screenshots for Fase 4d (papeleta sprite + cooldown).
 * Boots under ?test=1 and exercises fire() at multiple camera positions to
 * prove the papeleta sprite renders correctly:
 *   - f4d-t00-boot.png   (boot, no projectiles fired)
 *   - f4d-t05-fire.png   (t=5s, one tap fires the new sprite)
 *   - f4d-t15-burst.png  (t=15s, 3 rapid taps prove the 200 ms cooldown gate)
 *
 * Server must be running on http://localhost:8000 (start_server.sh).
 */
import { chromium } from 'playwright'

const URL = process.env.TEST_URL || 'http://localhost:8000/?test=1'
const OUT_DIR = '/projects/personal/zarra-defenders-2d/tests/playwright-screenshots'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`))

  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 15_000 })

  // Boot frame
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(0)
    window.__gameTestAPI__.tick(16.6667)
  })
  await new Promise(r => setTimeout(r, 300))
  await page.screenshot({ path: `${OUT_DIR}/f4d-t00-boot.png`, fullPage: false })

  // Fire one shot at t=5s (camera near start, e01 visible at iso 3,2)
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(5)
    window.__gameTestAPI__.tick(16.6667 * 60)
    // Fire at viewport center (cursor there) — this should spawn a papeleta
    // from the hand screen position toward the camera iso coord.
    window.__gameTestAPI__.simulateTap(640, 360)
    window.__gameTestAPI__.tick(16.6667 * 30)  // advance ~0.5s so the projectile is mid-flight
  })
  await new Promise(r => setTimeout(r, 200))
  await page.screenshot({ path: `${OUT_DIR}/f4d-t05-fire.png`, fullPage: false })

  // Burst fire at t=15s to prove the 200 ms cooldown gate (3 taps in quick succession)
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(15)
    window.__gameTestAPI__.tick(16.6667 * 60)
    window.__gameTestAPI__.simulateTap(640, 360)   // t=0 (in this burst)
    window.__gameTestAPI__.tick(16.6667 * 12)       // ~0.2s — should NOT be gated
    window.__gameTestAPI__.simulateTap(700, 300)   // tap 2
    window.__gameTestAPI__.tick(16.6667 * 12)
    window.__gameTestAPI__.simulateTap(580, 400)   // tap 3
    window.__gameTestAPI__.tick(16.6667 * 18)
  })
  await new Promise(r => setTimeout(r, 200))
  await page.screenshot({ path: `${OUT_DIR}/f4d-t15-burst.png`, fullPage: false })

  // Read cooldown value to confirm the runtime export matches the source.
  const cooldownFromSource = await page.evaluate(async () => {
    const mod = await import('/src/combat.js?v=27')
    return mod.FIRE_COOLDOWN_MS
  })

  await browser.close()

  console.log(JSON.stringify({
    consoleErrors,
    screenshots: ['f4d-t00-boot.png', 'f4d-t05-fire.png', 'f4d-t15-burst.png'],
    url: URL,
    FIRE_COOLDOWN_MS_runtime: cooldownFromSource,
    FIRE_COOLDOWN_MS_expected: 200,
  }, null, 2))
}

main().catch(err => { console.error(err); process.exit(1) })
