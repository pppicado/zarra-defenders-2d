/**
 * tests/e2e/banco-overlay-retry-label.spec.mjs
 *
 * Bug fix B2 (fase-6.1): the game-over overlay's retry button MUST read
 * `Reintentar` in production boot (no flag). The legacy dev label
 * `Reintentar test level` MUST only appear when `?test=1` is set.
 *
 * Run: node tests/e2e/banco-overlay-retry-label.spec.mjs
 */
import { chromium } from 'playwright'

const BASE_URL = process.env.TEST_URL || 'http://100.116.137.66:8000/'

async function ensureServer() {
  for (const url of [BASE_URL, BASE_URL.replace('8000', '8000')]) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (e) { /* next */ }
  }
  throw new Error(`Dev server not reachable at ${BASE_URL}`)
}

/** Boot the given URL and read the retry button text. */
async function readRetryButtonText(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })
  await page.goto(url, { waitUntil: 'load' })
  // The overlay card is built inside the bootstrap (after the bg loads);
  // we wait for the retry button to actually appear in the DOM.
  await page.waitForSelector('[data-role="retry"]', { timeout: 5000 }).catch(() => {})
  const text = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-role="retry"]')]
    return btns.length > 0 ? btns[0].textContent : null
  })
  await ctx.close()
  return text
}

export async function runBancoOverlayRetryLabelSpec() {
  const baseUrl = await ensureServer()
  const browser = await chromium.launch({ headless: true })

  // Production boot (no flag): label MUST be "Reintentar".
  const prodLabel = await readRetryButtonText(browser, baseUrl + '?unlock=all')
  if (prodLabel !== 'Reintentar') {
    throw new Error(
      `OVERLAY LABEL BUG (B2): production retry button reads "${prodLabel}", expected "Reintentar".`
    )
  }

  // Test boot (?test=1): label MUST be "Reintentar test level".
  const testLabel = await readRetryButtonText(browser, baseUrl + '?test=1&seed=12345')
  if (testLabel !== 'Reintentar test level') {
    throw new Error(
      `OVERLAY LABEL BUG (B2): ?test=1 retry button reads "${testLabel}", expected "Reintentar test level".`
    )
  }

  await browser.close()
  return { prodLabel, testLabel, baseUrl }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBancoOverlayRetryLabelSpec()
    .then(r => { console.log('OK', JSON.stringify(r, null, 2)); process.exit(0) })
    .catch(err => { console.error('FAIL', err.message ?? err); process.exit(1) })
}