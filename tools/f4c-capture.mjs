/**
 * tools/f4c-capture.mjs
 *
 * Captures one Playwright screenshot for Fase 4c (hand +20% scale):
 *   - f4c-t00-boot.png  (boot frame, hand visible at 1.2× scale)
 *
 * Used as visual evidence that the hand sprite renders correctly at the
 * new scale without overlapping the integrity hearts or exiting the
 * viewport bottom edge.
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
  await page.screenshot({ path: `${OUT_DIR}/f4c-t00-boot.png`, fullPage: false })

  await browser.close()

  console.log(JSON.stringify({
    consoleErrors,
    screenshots: ['f4c-t00-boot.png'],
    url: URL,
    handScale: '1.2 (was 1.0 in F3)',
  }, null, 2))
}

main().catch(err => { console.error(err); process.exit(1) })
