/**
 * tests/e2e/final-screen.spec.mjs
 *
 * F1.7 e2e: pantalla final con 4 enlaces — verify content + close.
 *
 * Scenarios:
 *   1. Final screen shows with title, dato, 4 enlaces.
 *   2. Each link has correct href (https:// or #hashtag).
 *   3. 4 links visible: plataforma, alegaciones, asociación, hashtag.
 *   4. Close button hides final screen.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8765/?test=1&seed=42 \
 *     node tests/e2e/final-screen.spec.mjs
 */
import { chromium } from 'playwright'

const DEFAULT_URL = 'http://127.0.0.1:8765/'
const URL_BASE = process.env.TEST_URL || DEFAULT_URL
const URL_TEST = URL_BASE.includes('?') ? URL_BASE : `${URL_BASE}?test=1&seed=42`

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

async function showFinalScreen(page) {
  return await page.evaluate(async () => {
    const mod = await import('./src/pedagogy/final-screen.js?v=44')
    const root = document.getElementById('final-screen')
    const fs = new mod.FinalScreen({ root })
    fs.show()
    return { shown: fs.isVisible }
  })
}

async function getFinalScreenState(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('final-screen')
    if (!el || el.classList.contains('hidden')) return null
    const links = Array.from(el.querySelectorAll('.final-screen-link')).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
    }))
    const hashtags = Array.from(el.querySelectorAll('.final-screen-hashtag')).map(s => s.textContent.trim())
    return {
      title: el.querySelector('.final-screen-title')?.textContent || '',
      dato: el.querySelector('.final-screen-dato')?.textContent || '',
      linkCount: links.length,
      hashtagCount: hashtags.length,
      links,
      hashtags,
      volverText: el.querySelector('.final-screen-volver')?.textContent || '',
    }
  })
}

async function passOrSkip(name, fn) {
  console.log(`\n=== ${name} ===`)
  await fn()
  console.log(`✓ ${name}`)
}

async function main() {
  await ensureServer()
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()

  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

  await bootGame(page)

  // ============================================================
  // 1. Final screen shows with title + dato
  // ============================================================
  await passOrSkip('1. final screen shows title + dato', async () => {
    const r = await showFinalScreen(page)
    if (!r.shown) throw new Error('final screen not shown')
    const state = await getFinalScreenState(page)
    if (!state.title || state.title.length < 5) {
      throw new Error(`expected non-empty title, got '${state.title}'`)
    }
    if (!state.dato || !state.dato.includes('alegaciones') && !state.dato.includes('informaci')) {
      throw new Error(`expected dato mentioning alegaciones/información, got '${state.dato}'`)
    }
    if (!state.volverText.toLowerCase().includes('volver')) {
      throw new Error(`expected volver button, got '${state.volverText}'`)
    }
  })

  // ============================================================
  // 2. 4 enlaces visible (3 URLs + 1 hashtag)
  // ============================================================
  await passOrSkip('2. 4 enlaces visible', async () => {
    const state = await getFinalScreenState(page)
    if (state.linkCount + state.hashtagCount !== 4) {
      throw new Error(`expected 4 enlaces total (${state.linkCount} links + ${state.hashtagCount} hashtag), got ${state.linkCount + state.hashtagCount}`)
    }
    console.log(`  links: ${state.linkCount}, hashtags: ${state.hashtagCount}`)
  })

  // ============================================================
  // 3. URLs are real (https:// or #hashtag)
  // ============================================================
  await passOrSkip('3. URLs are real https:// or #hashtag', async () => {
    const state = await getFinalScreenState(page)
    for (const l of state.links) {
      if (!l.href?.startsWith('https://')) {
        throw new Error(`bad href: ${l.href}`)
      }
      if (l.target !== '_blank') throw new Error(`bad target: ${l.target}`)
      if (!l.rel?.includes('noopener')) throw new Error(`bad rel: ${l.rel}`)
    }
    for (const h of state.hashtags) {
      if (!h.startsWith('#')) throw new Error(`bad hashtag: ${h}`)
    }
    console.log(`  all links have correct attrs`)
  })

  // ============================================================
  // 4. Close button hides final screen
  // ============================================================
  await passOrSkip('4. close button hides final screen', async () => {
    await page.click('[data-role="volver"]')
    await page.waitForTimeout(100)
    const visible = await page.evaluate(() => {
      const el = document.getElementById('final-screen')
      return !el.classList.contains('hidden')
    })
    if (visible) throw new Error('final screen not hidden after close')
  })

  // ============================================================
  // 5. Specific enlaces content
  // ============================================================
  await passOrSkip('5. specific enlaces content', async () => {
    await showFinalScreen(page)
    const state = await getFinalScreenState(page)
    const linkTexts = state.links.map(l => l.text.toLowerCase()).join(' | ')
    const hashtagTexts = state.hashtags.map(h => h.toLowerCase()).join(' | ')
    const allText = `${linkTexts} | ${hashtagTexts}`
    // Should contain: plataforma, alegaciones, asociación, hashtag
    const expected = ['plataforma', 'alegaciones', 'asociaci', 'noalmacrovertedero']
    for (const e of expected) {
      if (!allText.toLowerCase().includes(e)) {
        throw new Error(`expected '${e}' in enlaces, got '${allText}'`)
      }
    }
  })

  await browser.close()

  if (consoleErrors.length) {
    console.log('\n!! Console errors:')
    for (const e of consoleErrors) console.log('  -', e)
  }

  console.log('\n=== final-screen e2e done ===')
}

main().catch((err) => {
  console.error('FAIL:', err.message)
  console.error(err.stack)
  process.exit(1)
})