/**
 * tests/e2e/overlay-fits-viewport.spec.mjs
 *
 * F3.5.1-ter e2e: the game-over / victory overlay card must always fit
 * inside the viewport, regardless of viewport size or whether the
 * sharing block is visible (victory variant).
 *
 * Tested viewports:
 *   - 320 x 568   (iPhone SE 1st gen, worst case)
 *   - 360 x 640   (small Android)
 *   - 480 x 900   (Pixel portrait)
 *   - 1280 x 720  (desktop landscape)
 *
 * For each viewport, two variants are checked:
 *   1. gameover  (integrity:exhausted)
 *   2. victory   (stage:cleared) — reveals the share block, the heaviest
 *      content variant
 *
 * The "fits" assertion requires:
 *   - cardRect.top >= 0 AND cardRect.bottom <= viewport.h  (vertical)
 *   - cardRect.left >= 0 AND cardRect.right <= viewport.w  (horizontal)
 *   - retry + back buttons are inside the viewport (cliccables)
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8000/ \
 *     node tests/e2e/overlay-fits-viewport.spec.mjs
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

async function readOverlay(page) {
  return page.evaluate(() => {
    const overlay = document.getElementById('game-overlay')
    const card = overlay?.querySelector('.overlay-card')
    const retry = overlay?.querySelector('[data-role="retry"]')
    const back = overlay?.querySelector('[data-role="back"]')
    return {
      overlayHidden: overlay?.classList.contains('hidden'),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      cardRect: card ? card.getBoundingClientRect().toJSON() : null,
      retryRect: retry ? retry.getBoundingClientRect().toJSON() : null,
      backRect: back ? back.getBoundingClientRect().toJSON() : null,
      shareHidden: (() => {
        const sb = overlay?.querySelector('[data-role="share-block"]')
        return sb ? sb.classList.contains('hidden') : null
      })(),
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

const VIEWPORTS = [
  { name: '320x568 (iPhone SE)',  w: 320,  h: 568 },
  { name: '360x640 (small And.)', w: 360,  h: 640 },
  { name: '480x900 (Pixel port.)',w: 480,  h: 900 },
  { name: '1280x720 (desktop)',   w: 1280, h: 720 },
]

async function assertFitsIn(page, viewportName, variantLabel) {
  const r = await readOverlay(page)
  if (!r.cardRect) {
    check(`${viewportName} ${variantLabel}: card exists`, false, 'no .overlay-card')
    return
  }
  const v = r.viewport
  const c = r.cardRect
  const withinV = c.top >= -0.5 && c.bottom <= v.h + 0.5
  const withinH = c.left >= -0.5 && c.right <= v.w + 0.5
  check(
    `${viewportName} ${variantLabel}: card within viewport`,
    withinV && withinH,
    `card.top=${c.top.toFixed(0)} bottom=${c.bottom.toFixed(0)} (vh=${v.h}) | left=${c.left.toFixed(0)} right=${c.right.toFixed(0)} (vw=${v.w})`
  )
  // Retry + back must be visible and clickable (i.e., inside viewport).
  if (r.retryRect) {
    const retryOk = r.retryRect.top >= -0.5 && r.retryRect.bottom <= v.h + 0.5
    check(
      `${viewportName} ${variantLabel}: retry button inside viewport`,
      retryOk,
      `retry.top=${r.retryRect.top.toFixed(0)} bottom=${r.retryRect.bottom.toFixed(0)} (vh=${v.h})`
    )
  }
  if (r.backRect) {
    const backOk = r.backRect.top >= -0.5 && r.backRect.bottom <= v.h + 0.5
    check(
      `${viewportName} ${variantLabel}: back button inside viewport`,
      backOk,
      `back.top=${r.backRect.top.toFixed(0)} bottom=${r.backRect.bottom.toFixed(0)} (vh=${v.h})`
    )
  }
}

try {
  await page.goto(URL_TEST, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 15_000 })
  await page.waitForTimeout(800)

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.waitForTimeout(300)

    // 1) gameover variant
    await page.evaluate(() => window.__zarraEmit__('integrity:exhausted', {}))
    await page.waitForTimeout(200)
    await assertFitsIn(page, vp.name, 'gameover')

    // hide before next variant so showVictory can be tested clean
    await page.evaluate(() => {
      const ov = document.getElementById('game-overlay')
      ov?.classList.add('hidden')
    })
    await page.waitForTimeout(150)

    // 2) victory variant (reveals share block — heaviest content)
    await page.evaluate(() => window.__zarraEmit__('stage:cleared', { stageId: 'stage1-lashoyas' }))
    await page.waitForTimeout(200)
    await assertFitsIn(page, vp.name, 'victory+share')

    // cleanup
    await page.evaluate(() => {
      const ov = document.getElementById('game-overlay')
      ov?.classList.add('hidden')
    })
    await page.waitForTimeout(150)
  }
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
console.log(`\noverlay-fits-viewport e2e done (${report.length}/${report.length} PASS)`)
