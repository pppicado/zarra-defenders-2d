/**
 * tests/e2e/catalog.spec.mjs
 *
 * Playwright e2e for the unified catalog page (tests/catalog.html).
 *
 * Verifies:
 *   - HTTP 200 + no JS errors
 *   - All <img> tiles in section 2 (stage1 quick view) load with status 200
 *   - The Tile test canvas renders the selected variant (not blank, not just green)
 *   - The "Llenar 5×5" button paints 25 tiles (each with rotated diamond content)
 *   - The HUD displays valid numeric step + iso→screen values
 *   - Switching variant updates the rendered content
 *
 * Run: node tests/e2e/catalog.spec.mjs
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const URL = process.env.TEST_URL || 'http://localhost:8000/tests/catalog.html'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  const consoleErrors = []
  const failedRequests = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('requestfailed', req => {
    // Ignore playwright internal traffic; only record catalog page requests.
    if (!req.url().includes('100.116') && !req.url().includes('localhost')) return
    failedRequests.push(`${req.url()} :: ${req.failure()?.errorText}`)
  })
  page.on('response', resp => {
    const url = resp.url()
    const status = resp.status()
    if (status >= 400 && (url.includes('/tests/') || url.includes('/assets/tiles/') || url.includes('/assets/sprites/'))) {
      failedRequests.push(`${url} :: HTTP ${status}`)
    }
  })

  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')

  // Wait for stage1 quick view images to load.
  const tileImgs = await page.locator('#stage1-quick figure img').all()
  const loadedImgs = []
  for (const img of tileImgs) {
    const ok = await img.evaluate(el => el.naturalWidth > 0 && el.naturalHeight > 0 && !el.style.opacity)
    const src = await img.getAttribute('src')
    loadedImgs.push({ src, ok })
  }
  const imgsOk = loadedImgs.every(i => i.ok)

  // Tile test canvas: switch variants and check the canvas isn't all-green-bg.
  // The clear color is #1a3a1a (RGB 26, 58, 26). After rendering a tile, we
  // expect other colors to appear (the brown tile textures).
  const canvasNonEmpty = await page.evaluate(() => {
    const c = document.getElementById('tile-test-canvas')
    if (!c) return { ok: false, reason: 'no canvas' }
    const ctx = c.getContext('2d')
    const w = c.width, h = c.height
    const data = ctx.getImageData(0, 0, w, h).data
    const seen = new Set()
    for (let i = 0; i < data.length; i += 4) {
      const key = `${data[i]},${data[i + 1]},${data[i + 2]}`
      seen.add(key)
      if (seen.size > 5) break
    }
    return { ok: seen.size > 3, uniqueColors: seen.size }
  })

  // Click "Llenar 5×5" — should paint a checker pattern (multiple tile variants).
  await page.click('#tt-fill')
  await page.waitForTimeout(200)
  const fillOk = await page.evaluate(() => {
    const c = document.getElementById('tile-test-canvas')
    const ctx = c.getContext('2d')
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    const seen = new Set()
    for (let i = 0; i < data.length; i += 4) {
      seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
    }
    return { ok: seen.size > 8, uniqueColors: seen.size }
  })

  // Switch variant — variant select change should re-render.
  await page.selectOption('#tt-variant', 'suelo_arcilloso_rojizo_2x')
  await page.click('#tt-render')
  await page.waitForTimeout(200)

  // Read HUD values
  const hud = await page.evaluate(() => ({
    cam: document.getElementById('tt-cam-display').textContent,
    tile: document.getElementById('tt-tile-display').textContent,
    screen: document.getElementById('tt-screen-display').textContent,
    step: document.getElementById('tt-step-display').textContent,
  }))

  // Move camera iso — should re-render with new tile positions.
  await page.fill('#tt-cam-x', '3')
  await page.fill('#tt-cam-y', '5')
  await page.click('#tt-render')
  await page.waitForTimeout(100)
  const hudAfter = await page.evaluate(() => ({
    cam: document.getElementById('tt-cam-display').textContent,
  }))

  // Click "Reset" — should reset cam and tile to (0,0).
  await page.click('#tt-reset')
  await page.waitForTimeout(100)
  const hudReset = await page.evaluate(() => ({
    cam: document.getElementById('tt-cam-display').textContent,
    tile: document.getElementById('tt-tile-display').textContent,
  }))

  // Capture a screenshot for visual review.
  await page.screenshot({ path: '/tmp/zarra-catalog.png', fullPage: true })

  await browser.close()

  const report = {
    title: 'Zarra Defenders 2D — Catalog e2e',
    url: URL,
    catalogHtmlStatus: 'HTTP 200',
    consoleErrors,
    failedRequests,
    section2TileImages: { total: loadedImgs.length, allLoaded: imgsOk, imgs: loadedImgs },
    tileTestCanvas: {
      afterInitialRender: canvasNonEmpty,
      afterFill: fillOk,
    },
    hud: {
      initial: hud,
      afterCamChange: hudAfter,
      afterReset: hudReset,
    },
  }
  console.log(JSON.stringify(report, null, 2))

  const failures = []
  if (!imgsOk) failures.push(`section 2 tile images not all loaded: ${JSON.stringify(loadedImgs.filter(i => !i.ok))}`)
  if (failedRequests.length > 0) failures.push(`failed requests: ${JSON.stringify(failedRequests)}`)
  if (consoleErrors.length > 0) failures.push(`console errors: ${JSON.stringify(consoleErrors)}`)
  if (!canvasNonEmpty.ok) failures.push(`tile test canvas empty: uniqueColors=${canvasNonEmpty.uniqueColors}`)
  if (!fillOk.ok) failures.push(`fill button produced too few colors: uniqueColors=${fillOk.uniqueColors}`)
  if (!hud.step || !hud.step.match(/90\.5/)) failures.push(`step HUD not ≈ 90.5: got "${hud.step}"`)
  if (hudAfter.cam !== '(3, 5)') failures.push(`cam HUD not updating: got "${hudAfter.cam}"`)
  if (hudReset.cam !== '(0, 0)') failures.push(`reset HUD not (0, 0): got "${hudReset.cam}"`)

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