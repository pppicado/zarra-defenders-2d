// Test realista: simular mobile portrait, rotar a landscape con resize
// Y verificar que el juego CONTINÚA funcionando end-to-end (no solo el render).
import { chromium } from 'playwright'

const URL = 'http://100.116.137.66:8000/?test=1&seed=12345'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)',
  })
  const page = await ctx.newPage()
  const logs = []
  page.on('pageerror', e => logs.push(`ERR: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error') logs.push(`CONSOLE: ${m.text()}`) })

  await page.goto(URL)
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 15_000 })
  await new Promise(r => setTimeout(r, 2500))

  console.log('=== INITIAL (mobile portrait 412x915) ===')
  const initial = await page.evaluate(() => ({
    state: window.__zarraGameState__?.state,
    tileCount: window.__zarraModules__?.isoWorld?._tileLayer?.children?.length,
    handPos: { x: window.__zarraModules__?.hud?.handSprite?.x, y: window.__zarraModules__?.hud?.handSprite?.y },
    handVisible: window.__zarraModules__?.hud?.handSprite?.visible,
    cssScale: window.__cssScale__,
  }))
  console.log(JSON.stringify(initial))

  console.log('\n=== ROTATE TO LANDSCAPE (915x412) ===')
  await page.setViewportSize({ width: 915, height: 412 })
  await new Promise(r => setTimeout(r, 3000))
  
  const afterRotate = await page.evaluate(() => ({
    state: window.__zarraGameState__?.state,
    tileCount: window.__zarraModules__?.isoWorld?._tileLayer?.children?.length,
    handPos: { x: window.__zarraModules__?.hud?.handSprite?.x, y: window.__zarraModules__?.hud?.handSprite?.y },
    handVisible: window.__zarraModules__?.hud?.handSprite?.visible,
    heartPos: { x: window.__zarraModules__?.hud?._heartGroup?.position?.x, y: window.__zarraModules__?.hud?._heartGroup?.position?.y },
    heartVisible: window.__zarraModules__?.hud?._heartGroup?.visible,
    heartChildrenCount: window.__zarraModules__?.hud?._heartGroup?.children?.length,
    cssScale: window.__cssScale__,
  }))
  console.log(JSON.stringify(afterRotate, null, 2))
  
  // Verify that after rotation the game STILL responds to clicks
  // Compute the visual CSS position of an enemy
  await page.evaluate(() => {
    window.__gameTestAPI__.reset()
    for (let i = 0; i < 700; i++) window.__gameTestAPI__.tick(16.6667)
  })
  await new Promise(r => setTimeout(r, 500))
  
  const tileCss = await page.evaluate(() => {
    const m = window.__zarraModules__
    if (!m) return null
    const tile = [...m.isoWorld._tileLayer.children].find(t => t.gx === 3 && t.gy === 2)
    if (!tile) return null
    const cs = window.__cssScale__
    return {
      cssX: tile.worldTransform.tx * cs.scale + cs.xOff,
      cssY: tile.worldTransform.ty * cs.scale + cs.yOff,
    }
  })
  console.log('Tile CSS pos:', JSON.stringify(tileCss))
  
  if (tileCss) {
    await page.mouse.click(tileCss.cssX, tileCss.cssY)
    await new Promise(r => setTimeout(r, 500))
    const afterClick = await page.evaluate(() => ({
      e01: window.__gameTestAPI__.getEnemies().find(e => e.id === 'e01'),
      score: window.__gameTestAPI__.getScore(),
    }))
    console.log('After click @ landscape:', JSON.stringify(afterClick, null, 2))
  }
  
  await page.locator('#game-canvas-wrapper canvas').screenshot({ path: '/projects/personal/zarra-defenders-2d/.scratch/v10-world-landscape.png' })
  await page.locator('#game-hud-wrapper canvas').screenshot({ path: '/projects/personal/zarra-defenders-2d/.scratch/v10-hud-landscape.png' })
  
  console.log('\n=== LOGS ===')
  for (const l of logs) console.log(l)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
