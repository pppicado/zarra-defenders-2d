/**
 * tests/e2e/deterministic-test-level.spec.mjs
 *
 * Playwright headless: ?test=1&seed=12345 boots deterministically.
 * Same tap sequence produces same observations on two boots.
 * Pin clock: 60 ticks of 16.6667 ms = 1.0 s.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const TAILSCALE_URL = process.env.TEST_URL || 'http://100.116.137.66:8000/?test=1&seed=12345'

async function captureSnapshot(page) {
  return await page.evaluate(() => ({
    seed: window.__gameTestAPI__.getSeed(),
    time: window.__zarraModules__.camera.getTime(),
    integrity: window.__gameTestAPI__.getIntegrity(),
    score: window.__gameTestAPI__.getScore(),
    enemies: window.__gameTestAPI__.getEnemies(),
    projectiles: window.__gameTestAPI__.getProjectiles(),
  }))
}

async function runOnce() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })
  await page.goto(TAILSCALE_URL, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })

  // Reset and capture initial state.
  await page.evaluate(() => window.__gameTestAPI__.reset())
  const snap0 = await captureSnapshot(page)

  // Drive the simulation 60 ticks @ 16.6667 ms -> 1.0 s
  await page.evaluate(() => {
    for (let i = 0; i < 60; i++) window.__gameTestAPI__.tick(16.6667)
  })
  const snap1 = await captureSnapshot(page)

  // Pin the clock math: setTime(45) then tick(16.6667) -> elapsed = 45.0166667
  await page.evaluate(() => window.__gameTestAPI__.setTime(45))
  await page.evaluate(() => window.__gameTestAPI__.tick(16.6667))
  const timeAfter = await page.evaluate(() => window.__zarraModules__.camera.getTime())

  await browser.close()
  return { snap0, snap1, timeAfter }
}

export async function runDeterministicSpec() {
  // Two boots with identical seed and tap sequence must produce byte-identical observations.
  const a = await runOnce()
  const b = await runOnce()
  if (JSON.stringify(a.snap0) !== JSON.stringify(b.snap0)) {
    throw new Error('snap0 not deterministic across two boots')
  }
  if (JSON.stringify(a.snap1) !== JSON.stringify(b.snap1)) {
    throw new Error('snap1 not deterministic across two boots')
  }
  if (Math.abs(a.timeAfter - 45.0166667) > 0.001) {
    throw new Error(`setTime/tick clock math broken: timeAfter=${a.timeAfter}`)
  }
  return { snap0: a.snap0, snap1: a.snap1, timeAfter: a.timeAfter }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDeterministicSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}
