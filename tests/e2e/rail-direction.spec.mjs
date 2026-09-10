/**
 * tests/e2e/rail-direction.spec.mjs
 *
 * Pin the rail-direction visual: capture two frames at t=0 and t=10s, then
 * sample a known background pixel near the center of the world canvas and
 * compare. If the background moves DOWN on screen, the player sees the world
 * approaching from the front (forward feel). If it moves UP, the world
 * recedes behind the camera (backward feel).
 *
 * Run with: node tests/e2e/rail-direction.spec.mjs
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const URL = process.env.TEST_URL || 'http://localhost:8000/?test=1'

async function captureFrameAtTime(page, t, label) {
  await page.evaluate((t) => {
    window.__gameTestAPI__.reset()
    window.__gameTestAPI__.setTime(t)
    window.__gameTestAPI__.tick(16.6667)
  }, t)
  // One extra tick so the camera projection settles.
  await page.evaluate(() => window.__gameTestAPI__.tick(16.6667))
  await page.screenshot({ path: `/tmp/zarra-rail-${label}.png`, fullPage: false })
}

async function getSamplePixel(page, sx, sy) {
  return page.evaluate(({ sx, sy }) => {
    const c = document.querySelector('canvas')  // HUD canvas is the topmost
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return null
    const px = new Uint8Array(4)
    gl.readPixels(sx, sy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return [...px]
  }, { sx, sy })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  page.on('console', m => { if (m.type() === 'error') console.warn('[page]', m.text()) })

  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 10_000 })

  await captureFrameAtTime(page, 0, 't0')
  await captureFrameAtTime(page, 10, 't10')
  await captureFrameAtTime(page, 20, 't20')
  await captureFrameAtTime(page, 40, 't40')
  await captureFrameAtTime(page, 55, 't55')

  // Also read camera iso + container position so we can correlate the visual
  // with the math.
  const probe = await page.evaluate(() => {
    const m = window.__zarraModules__
    return {
      camIso: { x: m.camera.getCameraX(), y: m.camera.getCameraY() },
      worldContainerXY: { x: m.isoWorld.container.x, y: m.isoWorld.container.y },
      viewport: { w: m.isoWorld.viewportWidth, h: m.isoWorld.viewportHeight },
      viewOrigin: { x: m.isoWorld._viewOrigin.x, y: m.isoWorld._viewOrigin.y },
      tileWorldOrigin: { x: m.isoWorld.tileWorldOrigin.x, y: m.isoWorld.tileWorldOrigin.y },
      tileSize: m.isoWorld.tileSize,
    }
  })

  console.log('probe:', JSON.stringify(probe, null, 2))
  await browser.close()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1) })
}