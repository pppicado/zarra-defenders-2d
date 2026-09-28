/**
 * tests/e2e/pedagogy-card-position.spec.mjs
 *
 * F3.5.4 e2e: pedagogy card + modal-intermedio footprint + position.
 *
 * Contract (F3.5.4):
 *   1. The pedagogy card sits bottom-right (to the right of the hand
 *      sprite at bottom-center).
 *   2. In compact (collapsed) view, the card height matches the 3-hearts
 *      visual height (~80–110px). Title + 1-line description only.
 *   3. Clicking the card body expands it to full content (dato + fuente +
 *      TTS + footer) and pauses the game.
 *   4. Clicking the card body again collapses it and resumes the game.
 *   5. The card never overlaps the hearts (bottom-left) or the hand
 *      (bottom-center).
 *   6. When the modal-intermedio fires (every 5 hits) while the card is
 *      visible, the modal STACKS above the card (no overlap).
 *   7. When the card hides, the modal returns to its bottom-right anchor.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8000/?test=1 \
 *     node tests/e2e/pedagogy-card-position.spec.mjs
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

async function readCard(page) {
  return page.evaluate(() => {
    const el = document.getElementById('pedagogy-card')
    const title = el?.querySelector('.pedagogy-card-title')
    const desc = el?.querySelector('.pedagogy-card-description')
    const dato = el?.querySelector('.pedagogy-card-dato')
    const fuente = el?.querySelector('.pedagogy-card-fuente')
    const footer = el?.querySelector('.pedagogy-card-footer')
    const tts = el?.querySelector('.pedagogy-card-tts')
    return {
      hidden: el?.classList.contains('hidden') ?? true,
      expanded: el?.classList.contains('expanded') ?? false,
      ariaExpanded: el?.getAttribute('aria-expanded'),
      cardRect: el ? el.getBoundingClientRect().toJSON() : null,
      titleVisible: !!title && title.getBoundingClientRect().height > 0,
      descVisible: !!desc && desc.getBoundingClientRect().height > 0,
      datoVisible: !!dato && dato.getBoundingClientRect().height > 0,
      fuenteVisible: !!fuente && fuente.getBoundingClientRect().height > 0,
      ttsVisible: !!tts && tts.getBoundingClientRect().height > 0,
      footerVisible: !!footer && footer.getBoundingClientRect().height > 0,
    }
  })
}

async function readModal(page) {
  return page.evaluate(() => {
    const el = document.getElementById('modal-intermedio')
    return {
      hidden: el?.classList.contains('hidden') ?? true,
      stacked: el?.classList.contains('stacked') ?? false,
      modalRect: el ? el.getBoundingClientRect().toJSON() : null,
    }
  })
}

async function readHearts(page) {
  return page.evaluate(() => {
    const r = window.__zarraModules__?.hud?._heartGroup?.getBounds?.()
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
  })
}

async function readHand(page) {
  return page.evaluate(() => {
    const h = window.__zarraModules__?.hud?.handSprite
    if (!h) return null
    const b = h.getBounds()
    return { x: b.x, y: b.y, width: b.width, height: b.height }
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = await ctx.newPage()

const errors = []
page.removeAllListeners('console')
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message))

try {
  await page.goto(URL_TEST, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__gameTestAPI__?.reset, { timeout: 15_000 })
  await page.waitForTimeout(800)

  // 1. Trigger a pedagogy card directly
  await page.evaluate(() => {
    // find an enemy payload compatible with the card builder
    const api = window.__gameTestAPI__
    const enemies = api.getEnemies()
    const alive = enemies.find((e) => e.state === 'alive')
    if (!alive) return
    window.__zarraEmit__('enemy:destroyed', {
      enemyId: alive.id,
      spriteId: alive.spriteId ?? 'enemies_camion_treco',
      archetype: alive.archetype ?? 'standard',
    })
  })
  // wait past the slide-in animation (240ms) AND the 200ms transitions
  await page.waitForTimeout(800)

  const card = await readCard(page)
  check('1. card visible after enemy:destroyed', !card.hidden)

  // 2. Compact footprint: title + description visible, dato/fuente/footer/tts NOT visible
  check('2a. compact: title visible', card.titleVisible)
  check('2b. compact: description visible (1-line)', card.descVisible)
  check('2c. compact: dato hidden', !card.datoVisible)
  check('2d. compact: fuente hidden', !card.fuenteVisible)
  check('2e. compact: tts hidden', !card.ttsVisible)
  check('2f. compact: footer hidden', !card.footerVisible)
  check('2g. compact: aria-expanded=false', card.ariaExpanded === 'false')
  check('2h. compact: not expanded class', !card.expanded)

  // 3. Compact height in 80-110px range
  const cardH = card.cardRect?.height ?? 0
  check(
    '3. compact height matches hearts footprint (80-120px)',
    cardH >= 80 && cardH <= 120,
    `cardH=${cardH.toFixed(1)}px`
  )

  // 4. Bottom-right position: right edge near viewport right, bottom edge near viewport bottom
  const vp = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const rightGap = vp.w - card.cardRect.right
  const bottomGap = vp.h - card.cardRect.bottom
  check(
    '4a. bottom-right anchor (right gap <= 32px)',
    rightGap >= 0 && rightGap <= 32,
    `rightGap=${rightGap.toFixed(1)}px (vp.w=${vp.w})`
  )
  check(
    '4b. bottom-right anchor (bottom gap <= 32px)',
    bottomGap >= 0 && bottomGap <= 32,
    `bottomGap=${bottomGap.toFixed(1)}px (vp.h=${vp.h})`
  )

  // 5. No overlap with hearts (bottom-left)
  const hearts = await readHearts(page)
  if (hearts) {
    const overlapH = !(card.cardRect.right < hearts.x || card.cardRect.left > hearts.x + hearts.width)
    check(
      '5. card does NOT overlap hearts (bottom-left)',
      !overlapH,
      `hearts x=${hearts.x.toFixed(0)} w=${hearts.width.toFixed(0)} | card.right=${card.cardRect.right.toFixed(0)} card.left=${card.cardRect.left.toFixed(0)}`
    )
  } else {
    console.log('  (hearts rect unavailable — skipped overlap check)')
  }

  // 6. Expand on click
  await page.click('#pedagogy-card')
  await page.waitForTimeout(300)
  const expanded = await readCard(page)
  check('6a. click expands card', expanded.expanded)
  check('6b. expanded: aria-expanded=true', expanded.ariaExpanded === 'true')
  check('6c. expanded: dato visible', expanded.datoVisible)
  check('6d. expanded: fuente visible', expanded.fuenteVisible)
  check('6e. expanded: tts visible', expanded.ttsVisible)
  check('6f. expanded: footer visible', expanded.footerVisible)
  const expH = expanded.cardRect?.height ?? 0
  check(
    '6g. expanded height > compact height',
    expH > cardH + 50,
    `expanded=${expH.toFixed(1)}px compact=${cardH.toFixed(1)}px`
  )

  // 7. Collapse on second click
  await page.click('#pedagogy-card')
  await page.waitForTimeout(300)
  const collapsed2 = await readCard(page)
  check('7a. click again collapses', !collapsed2.expanded)
  check('7b. collapsed2: aria-expanded=false', collapsed2.ariaExpanded === 'false')
  check('7c. collapsed2: dato hidden again', !collapsed2.datoVisible)

  // 8. Trigger modal-intermedio while card is visible → stacked
  // Force 5 hits via the API to trigger the modal
  await page.evaluate(async () => {
    const mod = await import('./src/pedagogy/modal-intermedio.js?v=44')
    const root = document.getElementById('modal-intermedio')
    // Use the SAME instance already wired by main.js
    // (the API surface doesn't expose it, but recordHit is bound via combat:hit).
    // Simpler: directly emit combat:hit 5 times.
    for (let i = 0; i < 5; i++) window.__zarraEmit__('combat:hit', { enemyId: 'fake' })
  })
  await page.waitForTimeout(400)
  const modal = await readModal(page)
  check('8a. modal-intermedio visible after 5 hits', !modal.hidden)
  check(
    '8b. modal is .stacked (card visible)',
    modal.stacked,
    `stacked=${modal.stacked}`
  )
  check(
    '8c. modal stacked ABOVE card (modal.bottom <= card.top + 2px)',
    modal.modalRect && card.cardRect && (modal.modalRect.bottom <= card.cardRect.top + 2),
    `modal.bottom=${modal.modalRect?.bottom.toFixed(1)} card.top=${card.cardRect.top.toFixed(1)}`
  )

  // 9. Close card → modal returns to bottom-right anchor
  await page.evaluate(() => {
    const card = document.getElementById('pedagogy-card')
    card?.querySelector('.pedagogy-card-close')?.click()
  })
  await page.waitForTimeout(300)
  const modalAfter = await readModal(page)
  check('9a. modal still visible', !modalAfter.hidden)
  check(
    '9b. modal NOT .stacked (card hidden)',
    !modalAfter.stacked,
    `stacked=${modalAfter.stacked}`
  )
  // After card hides, modal.bottom should be ~16px from viewport bottom
  const vp2 = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const modalBottomGap = vp2.h - modalAfter.modalRect.bottom
  check(
    '9c. modal bottom gap ~16px (no stacking offset)',
    Math.abs(modalBottomGap - 16) <= 4,
    `bottomGap=${modalBottomGap.toFixed(1)}px (expected ~16px)`
  )
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
console.log(`\npedagogy-card-position e2e done (${report.length}/${report.length} PASS)`)
