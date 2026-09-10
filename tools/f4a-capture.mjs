/**
 * tools/f4a-capture.mjs
 *
 * Captures two Playwright screenshots specific to Fase 4a (LOGICAL_H=720):
 *   - f4a-t00-boot.png  (boot frame, hand+hearts at the lower band)
 *   - f4a-t15-mid.png   (camera at ~t=15s, corridor visible)
 *
 * Used as the visual-evidence artifact for sdd-apply TASK-006.
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
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(0)
    window.__gameTestAPI__.tick(16.6667)
  })
  await new Promise(r => setTimeout(r, 300))
  await page.screenshot({ path: `${OUT_DIR}/f4a-t00-boot.png`, fullPage: false })

  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(15)
    window.__gameTestAPI__.tick(16.6667 * 60)
  })
  await new Promise(r => setTimeout(r, 300))
  await page.screenshot({ path: `${OUT_DIR}/f4a-t15-mid.png`, fullPage: false })

  await browser.close()

  console.log(JSON.stringify({
    consoleErrors,
    screenshots: ['f4a-t00-boot.png', 'f4a-t15-mid.png'],
    url: URL,
  }, null, 2))
}

main().catch(err => { console.error(err); process.exit(1) })
