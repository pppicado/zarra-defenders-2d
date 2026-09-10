/**
 * tests/e2e/capture-flow.spec.mjs
 *
 * Capture the rail direction flow at multiple t values to feed the unified
 * catalog (tests/catalog.html). Visual proof that the world scrolls DOWN past
 * the camera as it advances (the "advancing" feel — F3.11).
 *
 * Run with: node tests/e2e/capture-flow.spec.mjs
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const URL = process.env.TEST_URL || 'http://localhost:8000/?test=1'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })

  const captures = [
    { t: 0,  name: 't00-boot',           note: 'Boot, camera at iso (0,0) — world extends down from origin' },
    { t: 8,  name: 't08-spawn-window',   note: 'First enemy spawns ~t=0; camera approaches iso depth 5 at t=8.3s' },
    { t: 16, name: 't16-escape-window',  note: 'First enemies escape when Manhattan > 6 tiles (e01 escapes ~t=18.3s)' },
    { t: 30, name: 't30-mid-rail',       note: 'Camera at iso (9,9); enemies have rolled past, deeper ones approaching' },
    { t: 50, name: 't50-late-rail',      note: 'Camera at iso (15,15); mini-boss and boss visible ahead' },
    { t: 58, name: 't58-rail-end',       note: 'Camera near (17.4, 17.4); last enemies hittable' },
  ]
  for (const c of captures) {
    await page.evaluate((t) => {
      window.__gameTestAPI__.reset()
      window.__gameTestAPI__.setTime(t)
      window.__gameTestAPI__.tick(16.6667)
      window.__gameTestAPI__.tick(16.6667)
    }, c.t)
    await page.screenshot({ path: `/tmp/zarra-${c.name}.png`, fullPage: false })
    console.log(`captured ${c.name}.png`)
  }

  // Off-center cursor for projectile test screenshot
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(15)
    window.__gameTestAPI__.tick(16.6667)
    window.__gameTestAPI__.tick(16.6667)
  })
  await page.mouse.move(1100, 350)
  await page.screenshot({ path: '/tmp/zarra-cursor-right.png', fullPage: false })
  console.log('captured cursor-right.png')

  await browser.close()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1) })
}