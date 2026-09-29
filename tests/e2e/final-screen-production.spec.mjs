/**
 * tests/e2e/final-screen-production.spec.mjs
 *
 * F7.3 (B1+B2+B4) e2e: the final-screen MUST appear in **production mode**
 * (per-stage rosters) when the player destroys the final-boss of stage5.
 *
 * Pre-fix bug: the A7 desactivacion lifecycle was only set in TEST_LEVEL
 * (?test=1 mode) but not in `stage-rosters.js`. As a result, killing the
 * `planta_treco_boss` in production did NOT emit `zarra:desactivacion`,
 * and the final-screen never appeared — the pedagogical closure of the
 * game was broken in production.
 *
 * Scenarios:
 *   1. Final-boss in production (stage5) is `spriteId='enemies_planta_treco_boss'`
 *      with `archetype='boss'` (hp:30) and `lifecycle='desactivacion'`.
 *   2. Killing it with 30 hits emits `zarra:desactivacion` and shows the
 *      final-screen.
 *   3. The final-screen has 4 enlaces with non-404 URLs.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8765/?unlock=all \
 *     node tests/e2e/final-screen-production.spec.mjs
 */
import { chromium } from 'playwright'

const DEFAULT_URL = 'http://127.0.0.1:8765/'
const URL_BASE = process.env.TEST_URL || DEFAULT_URL
// NOT ?test=1 — this spec validates production mode (per-stage rosters).
const URL_PROD = URL_BASE.includes('?') ? URL_BASE : `${URL_BASE}?unlock=all`

async function ensureServer() {
  for (const url of [URL_BASE, 'http://100.116.137.66:8000/']) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (_) { /* next */ }
  }
  throw new Error(`Dev server not reachable. Tried ${URL_BASE}`)
}

async function dismissDisclaimer(page) {
  await page.evaluate(() => {
    const splash = document.getElementById('disclaimer-splash')
    if (splash && !splash.classList.contains('hidden')) {
      const btn = splash.querySelector('button')
      if (btn) btn.click()
      else splash.classList.add('hidden')
    }
  })
  await page.waitForTimeout(200)
}

async function clickStage5(page) {
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('El Acuífero') || b.textContent.includes('Acuífero'))
    if (btn) { btn.click(); return true }
    return false
  })
  if (!clicked) throw new Error('Stage5 button not found')
  await page.waitForTimeout(800)
  // Skip data screen if visible
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continuar'))
    if (btn) btn.click()
  })
  await page.waitForTimeout(1000)
}

async function forceFinalBossSpawn(page) {
  await page.evaluate(() => {
    const camera = window.__zarraModules__?.camera
    if (camera && typeof camera.setTime === 'function') {
      // Stage5 final-boss spawns at depth 71 (iso 35+36 or 36+35) → t ≈ 110s.
      camera.setTime(110)
    }
  })
  await page.waitForTimeout(1500)
}

async function findFinalBoss(page) {
  return await page.evaluate(() => {
    const live = window.__zarraModules__?.enemies?._live?.() || []
    const boss = live.find(e =>
      e.spriteId === 'enemies_planta_treco_boss' &&
      e.archetype === 'boss' &&
      e.lifecycle === 'desactivacion' &&
      e.state === 'alive'
    )
    if (!boss) return null
    return {
      id: boss.id,
      spriteId: boss.spriteId,
      hp: boss.hp,
      archetype: boss.archetype,
      lifecycle: boss.lifecycle,
      state: boss.state,
    }
  })
}

async function killFinalBoss(page) {
  return await page.evaluate(async () => {
    let fired = false
    let detail = null
    const bus = window.__zarraEventBus__
    if (bus) {
      bus.addEventListener('zarra:desactivacion', (e) => {
        fired = true
        detail = e.detail
      })
    }

    // Pause the game so the boss doesn't escape during the hit loop.
    if (window.__zarraGameState__) {
      window.__zarraGameState__.state = 'paused'
    }

    let hitsApplied = 0
    for (let i = 0; i < 50; i++) {
      const live = window.__zarraModules__?.enemies?._live?.() || []
      const boss = live.find(e => e.id === 'stage5_boss_1')
      if (!boss || boss.state !== 'alive') break
      boss.applyHit(1)
      hitsApplied++
      if (boss.state === 'desactivated') break
    }
    // Wait for the event listener to fire (microtask order)
    await new Promise(r => setTimeout(r, 500))

    return {
      hitsApplied,
      fired,
      detail,
    }
  })
}

async function getFinalScreenState(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('final-screen')
    if (!el || el.classList.contains('hidden')) return null
    const links = Array.from(el.querySelectorAll('.final-screen-link')).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
    }))
    const hashtags = Array.from(el.querySelectorAll('.final-screen-hashtag')).map(s => s.textContent.trim())
    return {
      title: el.querySelector('.final-screen-title')?.textContent || '',
      dato: el.querySelector('.final-screen-dato')?.textContent || '',
      ariaHidden: el.getAttribute('aria-hidden'),
      linkCount: links.length,
      hashtagCount: hashtags.length,
      links,
      hashtags,
    }
  })
}

async function main() {
  await ensureServer()
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()

  const errs = []
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(`CONSOLE: ${m.text()}`)
  })

  let pass = true

  console.log('\n=== Scenario 1: stage5 production — final-boss setup ===')
  await page.goto(URL_PROD, { waitUntil: 'load', timeout: 15_000 })
  await page.waitForFunction(() => !!window.__zarraModules__, { timeout: 15_000 })
  await page.waitForTimeout(1000)
  await dismissDisclaimer(page)
  await clickStage5(page)
  await forceFinalBossSpawn(page)

  const bossInfo = await findFinalBoss(page)
  if (!bossInfo) {
    console.log('  ✗ FAIL: final-boss not found (expected enemies_planta_treco_boss)')
    pass = false
  } else {
    console.log(`  boss: id=${bossInfo.id}, spriteId=${bossInfo.spriteId}, hp=${bossInfo.hp}, archetype=${bossInfo.archetype}, lifecycle=${bossInfo.lifecycle}`)
    if (bossInfo.spriteId !== 'enemies_planta_treco_boss') {
      console.log('  ✗ FAIL: spriteId should be enemies_planta_treco_boss')
      pass = false
    } else if (bossInfo.archetype !== 'boss') {
      console.log(`  ✗ FAIL: archetype should be 'boss' (hp:30), got '${bossInfo.archetype}'`)
      pass = false
    } else if (bossInfo.lifecycle !== 'desactivacion') {
      console.log(`  ✗ FAIL: lifecycle should be 'desactivacion', got '${bossInfo.lifecycle}'`)
      pass = false
    } else if (bossInfo.hp !== 30) {
      console.log(`  ✗ FAIL: hp should be 30 (boss archetype), got ${bossInfo.hp}`)
      pass = false
    } else {
      console.log('  ✓ final-boss setup correct')
    }
  }

  console.log('\n=== Scenario 2: kill final-boss → final-screen appears ===')
  if (bossInfo) {
    const killResult = await killFinalBoss(page)
    console.log(`  hitsApplied=${killResult.hitsApplied}, fired=${killResult.fired}`)
    console.log(`  detail: ${JSON.stringify(killResult.detail)}`)
    if (!killResult.fired) {
      console.log('  ✗ FAIL: zarra:desactivacion event was not emitted')
      pass = false
    } else if (killResult.detail?.spriteId !== 'enemies_planta_treco_boss') {
      console.log(`  ✗ FAIL: detail.spriteId should be enemies_planta_treco_boss, got ${killResult.detail?.spriteId}`)
      pass = false
    } else if (killResult.detail?.archetype !== 'boss') {
      console.log(`  ✗ FAIL: detail.archetype should be 'boss', got ${killResult.detail?.archetype}`)
      pass = false
    } else {
      console.log('  ✓ desactivacion event fired correctly')
    }

    const fsState = await getFinalScreenState(page)
    if (!fsState) {
      console.log('  ✗ FAIL: final-screen not visible')
      pass = false
    } else {
      console.log(`  title="${fsState.title}", dato="${fsState.dato.substring(0, 60)}..."`)
      console.log(`  linkCount=${fsState.linkCount}, hashtagCount=${fsState.hashtagCount}`)
      if (fsState.ariaHidden === 'true') {
        console.log('  ✗ FAIL: aria-hidden should be "false"')
        pass = false
      } else if (fsState.linkCount !== 3) {
        console.log(`  ✗ FAIL: expected 3 <a> links, got ${fsState.linkCount}`)
        pass = false
      } else if (fsState.hashtagCount !== 1) {
        console.log(`  ✗ FAIL: expected 1 hashtag, got ${fsState.hashtagCount}`)
        pass = false
      } else {
        console.log('  ✓ final-screen visible with 3 <a> links + 1 hashtag')
      }
    }
  } else {
    console.log('  SKIPPED (boss not found)')
  }

  console.log('\n=== Scenario 3: final-screen links have valid (non-404) URLs ===')
  const fsState = await getFinalScreenState(page)
  if (fsState) {
    // The two replaced URLs (alegaciones + asociacion) must NOT be the original 404 ones.
    const old404Urls = [
      'https://nomacrovertederozarra.com/alegaciones',
      'https://nomacrovertederozarra.com/asociacion',
    ]
    let urlsOk = true
    for (const oldUrl of old404Urls) {
      const found = fsState.links.some(l => l.href === oldUrl)
      if (found) {
        console.log(`  ✗ FAIL: old 404 URL still present: ${oldUrl}`)
        pass = false
        urlsOk = false
      }
    }
    if (urlsOk) {
      console.log('  ✓ no 404 URLs in final-screen')
    }
    // Validate each link returns 200 (HEAD request, max 10s each)
    for (const link of fsState.links) {
      if (!link.href || link.href.startsWith('#')) continue
      try {
        const res = await fetch(link.href, { method: 'HEAD', redirect: 'follow' })
        if (!res.ok) {
          console.log(`  ✗ FAIL: ${link.text} → ${link.href} returns ${res.status}`)
          pass = false
        } else {
          console.log(`  ✓ ${link.text} → ${res.status}`)
        }
      } catch (e) {
        console.log(`  ✗ FAIL: ${link.text} → ${link.href} fetch error: ${e.message}`)
        pass = false
      }
    }
  } else {
    console.log('  SKIPPED (final-screen not visible)')
  }

  console.log(`\n=== Page errors ===`)
  if (errs.length === 0) {
    console.log('  none')
  } else {
    errs.forEach(e => console.log('  ', e))
    pass = false
  }

  await browser.close()
  console.log(`\n=== ${pass ? 'PASS' : 'FAIL'} ===`)
  process.exit(pass ? 0 : 1)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
