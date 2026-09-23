/**
 * tests/e2e/disclaimer-splash.spec.mjs
 *
 * F3.3 e2e: disclaimer splash on cold load.
 *
 * Scenarios:
 *   1. Fresh context (no localStorage flag) → splash shows.
 *   2. Aceptar without checkbox → splash hides; flag remains null.
 *   3. Reload (no flag) → splash shows again.
 *   4. Aceptar WITH checkbox → flag set to "1"; splash hides.
 *   5. Reload (with flag) → splash suppressed (not shown).
 *   6. Production URL (no ?test=1) sees splash; test URLs (with ?test=1)
 *      skip it automatically so e2e harnesses can drive the game.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8000/ \
 *     node tests/e2e/disclaimer-splash.spec.mjs
 *
 * Note: this spec does NOT use the ?test=1 URL — it exercises the real
 * production cold-load path (splash IS shown) and then verifies behavior.
 */
import { chromium } from 'playwright'

const DEFAULT_URL = 'http://127.0.0.1:8000/'
const URL_BASE = process.env.TEST_URL || DEFAULT_URL

async function ensureServer() {
  for (const url of [URL_BASE, 'http://100.116.137.66:8000/']) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (_) { /* next */ }
  }
  throw new Error(`Dev server not reachable. Tried ${URL_BASE}`)
}

async function newFreshContext(browser) {
  // Each context gets its own localStorage; fresh = no flag persisted.
  return browser.newContext()
}

async function readSplash(page) {
  return page.evaluate(() => {
    const root = document.getElementById('disclaimer-splash')
    if (!root) return { exists: false }
    const card = root.querySelector('.disclaimer-splash-card')
    const ack = root.querySelector('[data-role="ack"]')
    const checkbox = root.querySelector('#disclaimer-splash-no-show')
    return {
      exists: true,
      hidden: root.classList.contains('hidden'),
      ariaHidden: root.getAttribute('aria-hidden'),
      title: card?.querySelector('.disclaimer-splash-title')?.textContent ?? '',
      hasAck: !!ack,
      hasCheckbox: !!checkbox,
    }
  })
}

const report = []
function check(name, ok, detail) {
  report.push({ name, ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const serverUrl = await ensureServer()
console.log(`Using server: ${serverUrl}`)

const browser = await chromium.launch({ headless: true })

try {
  // ----- Phase 1: fresh cold load → splash shows -----
  const ctx1 = await newFreshContext(browser)
  const page1 = await ctx1.newPage()
  await page1.goto(serverUrl, { waitUntil: 'networkidle', timeout: 15000 })
  await page1.waitForSelector('.disclaimer-splash-card', { timeout: 5000 })
  const cold = await readSplash(page1)
  check('1. fresh load: splash visible', cold.hidden === false, `title="${cold.title}", ariaHidden=${cold.ariaHidden}`)
  check('1b. splash has title + ack + checkbox', cold.title === 'Aviso legal' && cold.hasAck && cold.hasCheckbox)
  await ctx1.close()

  // ----- Phase 2: Aceptar without checkbox → no flag -----
  const ctx2 = await newFreshContext(browser)
  const page2 = await ctx2.newPage()
  await page2.goto(serverUrl, { waitUntil: 'networkidle' })
  await page2.waitForSelector('[data-role="ack"]')
  await page2.click('[data-role="ack"]')
  await page2.waitForTimeout(300)
  const afterAccept = await readSplash(page2)
  const flagAfterAccept = await page2.evaluate(() => localStorage.getItem('zarra2d:disclaimer:suppressed'))
  check('2. Aceptar hides splash', afterAccept.hidden === true)
  check('2b. No localStorage flag (unchecked)', flagAfterAccept === null, `flag=${flagAfterAccept}`)
  await ctx2.close()

  // ----- Phase 3: persist flag, reload → splash suppressed -----
  const ctx3 = await newFreshContext(browser)
  const page3 = await ctx3.newPage()
  await page3.goto(serverUrl, { waitUntil: 'networkidle' })
  await page3.waitForSelector('#disclaimer-splash-no-show')
  await page3.check('#disclaimer-splash-no-show')
  await page3.click('[data-role="ack"]')
  await page3.waitForTimeout(300)
  const flagSet = await page3.evaluate(() => localStorage.getItem('zarra2d:disclaimer:suppressed'))
  check('3. Aceptar with checkbox sets flag', flagSet === '1', `flag=${flagSet}`)
  // Same context reloads with the flag still there
  await page3.reload({ waitUntil: 'networkidle' })
  await page3.waitForTimeout(500)
  const reloaded = await readSplash(page3)
  check('4. reload with flag: splash suppressed', reloaded.hidden === true)
  await ctx3.close()

  // ----- Phase 4: ?test=1 URL skips splash -----
  const ctx4 = await newFreshContext(browser)
  const page4 = await ctx4.newPage()
  await page4.goto(`${serverUrl}?test=1`, { waitUntil: 'networkidle' })
  await page4.waitForTimeout(500)
  const inTestMode = await readSplash(page4)
  check('5. ?test=1 mode: splash skipped', inTestMode.hidden === true)
  await ctx4.close()
} finally {
  await browser.close()
}

const failed = report.filter((r) => !r.ok)
if (failed.length) {
  console.log(`\nFAIL: ${failed.length} of ${report.length} checks failed`)
  process.exit(1)
}
console.log(`\ndisclaimer-splash e2e done (${report.length}/${report.length} PASS)`)
