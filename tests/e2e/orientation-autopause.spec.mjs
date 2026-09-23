/**
 * tests/e2e/orientation-autopause.spec.mjs
 *
 * F3.5.1 e2e: orientation auto-pause.
 *
 * Scenarios:
 *   1. Portrait viewport on cold load with ?test=1: pause overlay auto-shown.
 *   2. Rotate to landscape: pause auto-closes (auto-pause flag clears).
 *   3. Rotate back to portrait: pause auto-reopens.
 *   4. Esc during gameplay (manual pause) is independent of orientation flag
 *      — landscape Esc shows pause, portrait Esc toggles pause via manual path.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8000/ \
 *     node tests/e2e/orientation-autopause.spec.mjs
 */
import { chromium } from 'playwright'

const DEFAULT_URL = 'http://127.0.0.1:8000/'
const URL_BASE = process.env.TEST_URL || DEFAULT_URL
const URL_TEST = `${URL_BASE}?test=1&seed=42&hitboxes=1&unlock=all`

async function ensureServer() {
  for (const url of [URL_BASE, 'http://100.116.137.66:8000/']) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (_) { /* next */ }
  }
  throw new Error(`Dev server not reachable. Tried ${URL_BASE}`)
}

async function readPause(page) {
  return page.evaluate(() => {
    const el = document.getElementById('pause')
    return {
      hidden: el?.classList.contains('hidden') ?? null,
      ariaHidden: el?.getAttribute('aria-hidden'),
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
const ctx = await browser.newContext()
const page = await ctx.newPage()

const errors = []
page.removeAllListeners('console')
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message))

try {
  // 1. Portrait cold load → pause overlay auto-shown
  await page.setViewportSize({ width: 480, height: 900 })
  await page.goto(URL_TEST, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })
  await page.waitForTimeout(800)
  const portrait = await readPause(page)
  check('1. portrait cold load auto-pauses', portrait.hidden === false, `ariaHidden=${portrait.ariaHidden}`)

  // 2. Landscape: pause auto-closes
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.waitForTimeout(500)
  const landscape = await readPause(page)
  check('2. landscape auto-closes pause', landscape.hidden === true)

  // 3. Rotate back to portrait: pause auto-reopens
  await page.setViewportSize({ width: 480, height: 900 })
  await page.waitForTimeout(500)
  const portraitAgain = await readPause(page)
  check('3. portrait again re-pauses', portraitAgain.hidden === false)

  // 4. After landscape Esc: manual pause independent
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.waitForTimeout(500)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const escPause = await readPause(page)
  check('4a. Esc in landscape shows pause', escPause.hidden === false)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const escResume = await readPause(page)
  check('4b. Esc again hides pause', escResume.hidden === true)
} finally {
  console.log(`console.error count: ${errors.length}`)
  if (errors.length) console.log('  ' + errors.slice(0, 5).join(' | '))
  await browser.close()
}

const failed = report.filter((r) => !r.ok)
if (failed.length) {
  console.log(`\nFAIL: ${failed.length} of ${report.length} checks failed`)
  process.exit(1)
}
console.log(`\norientation-autopause e2e done (${report.length}/${report.length} PASS)`)
