/**
 * tools/f4b-capture.mjs
 *
 * Captures three Playwright screenshots specific to Fase 4b (depth-72 rail):
 *   - f4b-t00-boot.png       (boot frame, camera at depth 0)
 *   - f4b-t60-mid.png        (camera at t=60s, depth 36, mid-rail)
 *   - f4b-t120-rail-end.png  (camera at t=120s, depth 72, rail end)
 *
 * Used as the visual-evidence artifact for sdd-apply TASK-006: the
 * tileador must draw correctly along the entire new corridor (every
 * visible iso position covered by the cull range).
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

  // Capture points: t=0 (start), t=60 (mid), t=120 (end)
  const captures = [
    { t: 0,   name: 'f4b-t00-boot.png' },
    { t: 60,  name: 'f4b-t60-mid.png' },
    { t: 120, name: 'f4b-t120-rail-end.png' },
  ]

  for (const cap of captures) {
    await page.evaluate(({ t }) => {
      window.__gameTestAPI__.reset()
      window.__gameTestAPI__.setTime(t)
      window.__gameTestAPI__.tick(16.6667)
    }, { t: cap.t })
    await new Promise(r => setTimeout(r, 300))
    await page.screenshot({ path: `${OUT_DIR}/${cap.name}`, fullPage: false })
  }

  await browser.close()

  console.log(JSON.stringify({
    consoleErrors,
    screenshots: captures.map(c => c.name),
    url: URL,
    railLength: 'depth 72 over 120 s (24 enemies)',
  }, null, 2))
}

main().catch(err => { console.error(err); process.exit(1) })
