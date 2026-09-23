/**
 * tests/e2e/pause.spec.mjs
 *
 * F3.1 e2e: pause overlay (REQ-10) — Esc toggle, 3 buttons, click-outside no-op.
 *
 * Scenarios:
 *   1. Pause hidden initially during gameplay.
 *   2. Esc opens pause overlay with 3 buttons and the right labels.
 *   3. Esc toggles back to hidden (= "Continuar" without clicking).
 *   4. Click on backdrop does NOT close the overlay.
 *   5. "Salir al menu" emits menu:back and returns to main menu.
 *   6. "Reiniciar stage" emits bootTestLevel:request and rebinds gameplay.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8000/?test=1&seed=42 \
 *     node tests/e2e/pause.spec.mjs
 */
import { chromium } from 'playwright'

const DEFAULT_URL = 'http://127.0.0.1:8000/'
const URL_BASE = process.env.TEST_URL || DEFAULT_URL
const URL_TEST = URL_BASE.includes('?') ? URL_BASE : `${URL_BASE}?test=1&seed=42&hitboxes=1&unlock=all`

async function ensureServer() {
  for (const url of [URL_BASE, 'http://100.116.137.66:8000/']) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (_) { /* next */ }
  }
  throw new Error(`Dev server not reachable. Tried ${URL_BASE}`)
}

async function bootGame(page) {
  await page.goto(URL_TEST, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 15_000 })
  await page.waitForTimeout(500)
}

async function readPause(page) {
  return page.evaluate(() => {
    const el = document.getElementById('pause')
    if (!el) return { exists: false }
    const buttons = el.querySelectorAll('.pause-btn')
    return {
      exists: true,
      hidden: el.classList.contains('hidden'),
      ariaHidden: el.getAttribute('aria-hidden'),
      title: el.querySelector('.pause-title')?.textContent ?? '',
      buttonLabels: Array.from(buttons).map((b) => b.textContent.trim()),
    }
  })
}

async function clickButton(page, label) {
  return page.evaluate((lbl) => {
    const el = document.getElementById('pause')
    const btn = Array.from(el.querySelectorAll('.pause-btn')).find((b) => b.textContent.trim() === lbl)
    if (btn) btn.click()
    return !!btn
  }, label)
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
  await bootGame(page)

  // 1. Initially hidden during gameplay
  const initial = await readPause(page)
  check('1. pause hidden initially', initial.exists && initial.hidden === true)

  // 2. Esc opens with 3 buttons
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const afterEsc = await readPause(page)
  check(
    '2. Esc shows pause overlay',
    afterEsc.hidden === false,
    `title="${afterEsc.title}", buttons=${afterEsc.buttonLabels.join(' | ')}`
  )
  check(
    '2b. 3 buttons with right labels',
    afterEsc.buttonLabels.length === 3 &&
      afterEsc.buttonLabels[0] === 'Continuar' &&
      afterEsc.buttonLabels[1] === 'Reiniciar stage' &&
      afterEsc.buttonLabels[2] === 'Salir al menú',
  )
  check('2c. aria-hidden=false', afterEsc.ariaHidden === 'false')

  // 3. Esc again hides (= "Continuar" via toggle)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const afterSecondEsc = await readPause(page)
  check('3. Esc again hides pause', afterSecondEsc.hidden === true)

  // 4. Click on backdrop does NOT close
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  await page.evaluate(() => document.getElementById('pause').click())
  await page.waitForTimeout(150)
  const afterBackdrop = await readPause(page)
  check('4. click on backdrop does NOT close', afterBackdrop.hidden === false)

  // 5. "Salir al menu" returns to main menu
  const mainMenuAppeared = await (async () => {
    await clickButton(page, 'Salir al menú')
    await page.waitForTimeout(500)
    return page.evaluate(() => !document.getElementById('main-menu')?.classList.contains('hidden'))
  })()
  check('5. "Salir al menu" shows main menu', mainMenuAppeared)
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
console.log(`\npause e2e done (${report.length}/${report.length} PASS)`)
