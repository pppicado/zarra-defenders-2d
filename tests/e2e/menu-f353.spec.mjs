/**
 * tests/e2e/menu-f353.spec.mjs
 *
 * F3.5.3 e2e: menu restructure + dedicated background image.
 *
 * Scenarios:
 *   1. Production URL cold-load: menu visible, body has menu-mode, canvases
 *      hidden (display:none), #main-menu has bg image set.
 *   2. Layout fits within viewport on multiple sizes (desktop, mobile,
 *      small phone) WITHOUT scroll (nav.scrollHeight <= nav.clientHeight).
 *   3. Module buttons (Acerca de, Disclaimer, Biblioteca pedagógica) are visible.
 *   4. (Sanity) No console errors.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8000/ \
 *     node tests/e2e/menu-f353.spec.mjs
 */
import { chromium } from 'playwright'

const DEFAULT_URL = 'http://127.0.0.1:8000/'
const URL_BASE = process.env.TEST_URL || DEFAULT_URL
const URL_PROD = URL_BASE.includes('?') ? URL_BASE.split('?')[0] : URL_BASE

async function ensureServer() {
  for (const url of [URL_BASE, 'http://100.116.137.66:8000/']) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (_) { /* next */ }
  }
  throw new Error(`Dev server not reachable. Tried ${URL_BASE}`)
}

const VIEWPORTS = [
  { name: 'desktop 1280x720', w: 1280, h: 720 },
  { name: 'mobile 414x736', w: 414, h: 736 },
  { name: 'tablet 768x1024', w: 768, h: 1024 },
  { name: 'small 320x568', w: 320, h: 568 },
]

const report = []
function check(name, ok, detail) {
  report.push({ name, ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const serverUrl = await ensureServer()
console.log(`Using server: ${serverUrl}`)

const browser = await chromium.launch({ headless: true })

try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
    const page = await ctx.newPage()

    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })

    // Skip the cold-load disclaimer splash so it doesn't stack on top of menu
    await page.addInitScript(() => {
      try { localStorage.setItem('zarra2d:disclaimer:suppressed', '1') } catch {}
    })

    await page.goto(URL_PROD, { waitUntil: 'load' })
    await page.waitForTimeout(2200)

    const state = await page.evaluate(() => {
      const menu = document.getElementById('main-menu')
      const canvasWrapper = document.getElementById('game-canvas-wrapper')
      const hudWrapper = document.getElementById('game-hud-wrapper')
      const menuStyle = getComputedStyle(menu)
      const cwStyle = getComputedStyle(canvasWrapper)
      const hwStyle = getComputedStyle(hudWrapper)
      const navEl = document.querySelector('#main-menu .menu-nav')
      const buttons = Array.from(document.querySelectorAll('#main-menu .menu-btn')).map(b => b.textContent.trim())

      let bgImageLoaded = true
      Array.from(document.images).forEach(img => {
        if (!img.complete) bgImageLoaded = false
      })

      return {
        menuHidden: menu.classList.contains('hidden'),
        bodyHasMenuMode: document.body.classList.contains('menu-mode'),
        canvasDisplay: cwStyle.display,
        hudDisplay: hwStyle.display,
        bgImage: menuStyle.backgroundImage.includes('menu_bg.png'),
        bgImageLoaded,
        navScrollH: navEl?.scrollHeight,
        navClientH: navEl?.clientHeight,
        vh: window.innerHeight,
        buttons,
      }
    })

    check(`[${vp.name}] 1. menu visible + body.menu-mode`, !state.menuHidden && state.bodyHasMenuMode)
    check(`[${vp.name}] 2. canvas + hud hidden`, state.canvasDisplay === 'none' && state.hudDisplay === 'none', JSON.stringify({c: state.canvasDisplay, h: state.hudDisplay}))
    check(`[${vp.name}] 3. bg image set on main-menu`, state.bgImage && state.bgImageLoaded)
    check(
      `[${vp.name}] 4. no nav overflow (navH <= clientH)`,
      (state.navScrollH ?? 0) <= (state.navClientH ?? 0),
      `scrollH=${state.navScrollH} clientH=${state.navClientH} vh=${state.vh}`,
    )
    check(`[${vp.name}] 5. all 8 buttons present`, state.buttons.length === 8, state.buttons.join(' | ').slice(0, 120))
    check(`[${vp.name}] 6. no console errors`, errors.length === 0, errors.slice(0, 2).join(' / '))

    await ctx.close()
  }
} finally {
  await browser.close()
}

const failed = report.filter((r) => !r.ok)
console.log(`\n${report.length - failed.length}/${report.length} checks PASS`)
if (failed.length) {
  console.log(`\nFAIL: ${failed.length} checks failed`)
  process.exit(1)
}
console.log(`\nmenu-f353 e2e done`)
