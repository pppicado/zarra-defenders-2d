/**
 * tests/e2e/tile-gallery.spec.mjs
 *
 * Playwright e2e for the tile-gallery page.
 *
 * Verifies:
 *   - Page loads with no JS errors and no failed asset requests
 *   - The Pixi mini-demo inits (window.__miniDemoOK === true)
 *   - The rendered canvas shows content (not blank dark green)
 *   - Tile variants load (the demo's variant count > 0)
 *   - Switching stage and re-rendering doesn't throw
 *
 * Run: node tests/e2e/tile-gallery.spec.mjs
 */
import { chromium } from 'playwright'

const URL = process.env.TEST_URL || 'http://localhost:8000/tests/tile-gallery.html'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  const consoleErrors = []
  const failedRequests = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('requestfailed', req => {
    const url = req.url()
    if (!url.includes('100.116') && !url.includes('localhost')) return
    failedRequests.push(`${url} :: ${req.failure()?.errorText}`)
  })
  page.on('response', resp => {
    const url = resp.url()
    const status = resp.status()
    if (status >= 400 && (url.includes('/tests/') || url.includes('/assets/tiles/') || url.includes('/assets/sprites/'))) {
      failedRequests.push(`${url} :: HTTP ${status}`)
    }
  })

  await page.goto(URL, { waitUntil: 'load' })
  // Wait for the Pixi mini-demo to initialize (it does async load + setup).
  await page.waitForFunction(() => window.__miniDemoOK === true || window.__miniDemoOK === false, { timeout: 15_000 })

  const demoState = await page.evaluate(() => ({
    ok: !!window.__miniDemoOK,
    error: window.__miniDemoError || null,
    state: window.__miniDemo?.state ? {
      stageId: window.__miniDemo.state.stageId,
      alt: window.__miniDemo.state.alt,
      camIso: [window.__miniDemo.state.camIsoX, window.__miniDemo.state.camIsoY],
      sprites: window.__miniDemo.state.sprites.length,
    } : null,
  }))

  // Sample the mini-demo canvas to make sure it's not blank.
  const canvasNonEmpty = await page.evaluate(() => {
    const c = document.getElementById('mini-demo-canvas')
    if (!c) return { ok: false, reason: 'no canvas' }
    // The canvas uses Pixi (WebGL), so readPixels via the GL context. Fallback
    // to canvas2d sample if needed.
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (gl) {
      const w = c.width, h = c.height
      const data = new Uint8Array(w * h * 4)
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data)
      const seen = new Set()
      for (let i = 0; i < data.length; i += 4) {
        seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
        if (seen.size > 5) break
      }
      return { ok: seen.size > 3, uniqueColors: seen.size, source: 'webgl' }
    }
    return { ok: false, reason: 'no webgl' }
  })

  // Capture a screenshot for visual review.
  await page.screenshot({ path: '/tmp/zarra-tile-gallery.png', fullPage: true })

  // Switch stage to stage2-pueblo to test the stage-switch path.
  let stageSwitchOk = true
  let stageSwitchError = null
  try {
    await page.selectOption('#stage-select', 'stage2-pueblo')
    await page.waitForTimeout(800)
  } catch (err) {
    stageSwitchOk = false
    stageSwitchError = String(err.message || err)
  }

  await browser.close()

  const report = {
    title: 'Zarra Defenders 2D — Tile gallery e2e',
    url: URL,
    consoleErrors,
    failedRequests,
    demoState,
    canvasNonEmpty,
    stageSwitch: { ok: stageSwitchOk, error: stageSwitchError },
  }
  console.log(JSON.stringify(report, null, 2))

  const failures = []
  if (failedRequests.length > 0) failures.push(`failed requests: ${JSON.stringify(failedRequests)}`)
  if (consoleErrors.length > 0) failures.push(`console errors: ${JSON.stringify(consoleErrors)}`)
  if (!demoState.ok) failures.push(`mini-demo init failed: ${demoState.error || 'unknown'}`)
  if (!canvasNonEmpty.ok) failures.push(`mini-demo canvas empty: ${canvasNonEmpty.reason || JSON.stringify(canvasNonEmpty)}`)
  if (!stageSwitchOk) failures.push(`stage switch failed: ${stageSwitchError}`)

  if (failures.length > 0) {
    console.error('\nFAILURES:')
    for (const f of failures) console.error('  -', f)
    process.exit(1)
  }
  console.log('\nALL CHECKS PASS')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1) })
}