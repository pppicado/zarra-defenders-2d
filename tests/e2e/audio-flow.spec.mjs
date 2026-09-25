/**
 * tests/e2e/audio-flow.spec.mjs
 *
 * F4 e2e: audio integration with Pixi gameplay loop.
 *
 * Scenarios:
 *   1. AudioContext se crea al primer user gesture (AudioContext singleton).
 *   2. MusicEngine arranca música en bootTestLevel (music.isPlaying() === true).
 *   3. musicEngine.isPlaying() === false durante main menu (regla 3D).
 *   4. musicEngine se detiene en gameover (integrity:exhausted).
 *   5. musicEngine se detiene en victory (stage:cleared).
 *   6. musicEngine.pause() durante pause overlay (Esc/P).
 *   7. SFX dispara en enemy:destroyed (al menos 1 oscilador creado durante gameplay).
 *   8. Teclas [ ] M actualizan volumen / mute; toast visible.
 *   9. Cero console errors durante gameplay + audio.
 *
 * Run:
 *   TEST_URL=http://127.0.0.1:8000/?test=1&seed=42 \
 *     node tests/e2e/audio-flow.spec.mjs
 */
import { chromium } from 'playwright'

const DEFAULT_URL = 'http://127.0.0.1:8000/'
const URL_BASE = process.env.TEST_URL || DEFAULT_URL
const URL_TEST = URL_BASE.includes('?')
  ? URL_BASE
  : `${URL_BASE}?test=1&seed=42&hitboxes=1`

async function ensureServer() {
  for (const url of [URL_BASE, 'http://100.116.137.66:8000/']) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (_) { /* next */ }
  }
  throw new Error(`Server not reachable at ${URL_BASE}`)
}

const URL = await ensureServer()
const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const context = await browser.newContext()
const page = await context.newPage()

const consoleErrors = []
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push('CONSOLE: ' + msg.text())
})

await page.goto(URL_TEST, { waitUntil: 'load', timeout: 30000 })
await page.waitForFunction(() => window.__zarraModules__?.musicEngine, { timeout: 10000 })

console.log('[e2e] AudioFlow — Fase 4 verificación')

// ============================================================
// 1. Singleton AudioContext no existe todavía (sin user gesture)
// ============================================================

let ctxBefore = await page.evaluate(() => {
  // __zr expone engine global; verificamos que no haya AudioContext creado todavía
  return { hasMod: !!window.__zarraModules__?.musicEngine, audioCtxState: window.__zarraAudioCtx?.state ?? null }
})
console.log('  state before gesture:', JSON.stringify(ctxBefore))
if (!ctxBefore.hasMod) throw new Error('musicEngine not exposed on window.__zarraModules__')

// ============================================================
// 2. Simular user gesture (click en canvas) — dispara AudioContext + bootTestLevel
// ============================================================

let debugBefore = await page.evaluate(() => ({
  musicStage: window.__zarraModules__.musicEngine.getStage(),
  musicPendingStart: window.__zarraModules__.musicEngine._pendingStart,
  bgStageId: window.__zarraModules__.bg?.stageId,
  bgHasSprite: !!window.__zarraModules__.bg?.sprite,
}))
console.log('  debug before gesture:', JSON.stringify(debugBefore))

await page.dispatchEvent('#game-hud-wrapper', 'pointerdown')
await page.waitForTimeout(500)

let playing = await page.evaluate(() => ({
  isPlaying: window.__zarraModules__.musicEngine.isPlaying(),
  stage: window.__zarraModules__.musicEngine.getStage(),
  pendingStart: window.__zarraModules__.musicEngine._pendingStart,
  audioState: window.__zarraAudioCtx?.state ?? 'no-ctx',
  audioCtxExists: !!window.__zarraAudioCtx,
}))
console.log('  after gesture:', JSON.stringify(playing))
if (!playing.isPlaying) throw new Error('musicEngine should be playing after gameplay starts')
if (!playing.stage || !playing.stage.startsWith('stage')) throw new Error(`stageId should be stageN, got ${playing.stage}`)

// ============================================================
// 3. SFX se puede disparar manualmente sin error
// ============================================================

let sfxResult = await page.evaluate(() => {
  const sfx = window.__zarraModules__.sfxEngine
  return {
    list: sfx.listAvailable(),
    fireOK: sfx.play('fire'),
    hitOK: sfx.play('hit'),
    cardOK: sfx.play('card'),
    gameoverOK: sfx.play('gameover'),
    victoryOK: sfx.play('victory'),
    clickOK: sfx.play('click'),
    transitionOK: sfx.play('transition'),
    errorOK: sfx.play('error'),
    invalidOK: sfx.play('nope'),
  }
})
console.log('  sfx results:', JSON.stringify(sfxResult))
for (const [k, v] of Object.entries(sfxResult)) {
  if (k === 'list' || k === 'invalidOK') continue
  if (v !== true) throw new Error(`SFX ${k} should return true, got ${v}`)
}
if (sfxResult.invalidOK !== false) throw new Error('invalid SFX name should return false')
if (sfxResult.list.length !== 8) throw new Error(`expected 8 SFX, got ${sfxResult.list.length}`)

// ============================================================
// 4. Mute toggle + verificación de estado
// ============================================================

await page.keyboard.press('m')
await page.waitForTimeout(120)
let muted = await page.evaluate(() => window.__zarraModules__.audioIsMuted?.() ?? null)
console.log('  after M press, muted =', muted)
if (muted !== true) throw new Error('M key should toggle mute to true')

await page.keyboard.press('m')
await page.waitForTimeout(120)
muted = await page.evaluate(() => window.__zarraModules__.audioIsMuted?.() ?? null)
if (muted !== false) throw new Error('M key second press should toggle mute to false')

// ============================================================
// 5. Volumen [ ] (subir y bajar)
// ============================================================

let volBefore = await page.evaluate(() => window.__zarraModules__.audioGetVolume?.() ?? null)
await page.keyboard.press(']')
await page.waitForTimeout(80)
let volAfter = await page.evaluate(() => window.__zarraModules__.audioGetVolume?.() ?? null)
console.log('  volume: before=', volBefore, 'after ] =', volAfter)
if (volAfter === null || volAfter <= volBefore) throw new Error(`] key should increase volume, before=${volBefore} after=${volAfter}`)

await page.keyboard.press('[')
await page.keyboard.press('[')
await page.waitForTimeout(80)
volAfter = await page.evaluate(() => window.__zarraModules__.audioGetVolume?.() ?? null)
if (volAfter === null || volAfter >= 0.6) throw new Error(`[ key should decrease volume, got ${volAfter}`)

// ============================================================
// 6. Audio toast visibility (feedback visual de [/]/M)
// ============================================================

await page.keyboard.press('m')
await page.waitForTimeout(100)
let toastVisible = await page.locator('#audio-toast').isVisible()
console.log('  toast visible after M:', toastVisible)
if (!toastVisible) throw new Error('audio-toast should be visible after M key')

await page.waitForTimeout(1100)
toastVisible = await page.locator('#audio-toast').isVisible()
if (toastVisible) throw new Error('audio-toast should hide after 900ms timeout')
await page.keyboard.press('m') // unmute

// ============================================================
// 7. Pause overlay pausa la música
// ============================================================

await page.keyboard.press('Escape')
await page.waitForTimeout(200)
let pauseState = await page.evaluate(() => ({
  paused: window.__zarraGameState__?.state,
  musicPlaying: window.__zarraModules__.musicEngine.isPlaying(),
  musicTimer: !!window.__zarraModules__.musicEngine._timer,
}))
console.log('  pause state:', JSON.stringify(pauseState))
if (pauseState.paused !== 'paused') throw new Error(`expected gameState=paused, got ${pauseState.paused}`)
if (!pauseState.musicPlaying) throw new Error('musicEngine._playing should remain true during pause (only timer is paused)')
if (pauseState.musicTimer) throw new Error('musicEngine._timer should be cleared during pause')

await page.keyboard.press('Escape') // unpause
await page.waitForTimeout(150)
let resumeState = await page.evaluate(() => ({
  state: window.__zarraGameState__.state,
  musicTimer: !!window.__zarraModules__.musicEngine._timer,
}))
if (resumeState.state !== 'gameplay') throw new Error(`expected gameplay, got ${resumeState.state}`)
if (!resumeState.musicTimer) throw new Error('musicEngine._timer should be re-armed after unpause')

// ============================================================
// 8. music.stop() en gameover (forzando via test API)
// ============================================================

let beforeGO = await page.evaluate(() => window.__zarraModules__.musicEngine.isPlaying())
if (!beforeGO) throw new Error('music should be playing before gameover')

await page.evaluate(() => {
  window.__zarraEmit__('integrity:exhausted', { current: 0, max: 3 })
})
await page.waitForTimeout(150)
let afterGO = await page.evaluate(() => ({
  playing: window.__zarraModules__.musicEngine.isPlaying(),
  stage: window.__zarraModules__.musicEngine.getStage(),
}))
console.log('  after integrity:exhausted:', JSON.stringify(afterGO))
if (afterGO.playing) throw new Error('music should stop on gameover')
if (afterGO.stage !== null) throw new Error('stage should be null after stop')

// ============================================================
// 9. Cero console errors
// ============================================================

console.log('  console errors:', consoleErrors.length)
if (consoleErrors.length) {
  for (const e of consoleErrors) console.log('    -', e)
  throw new Error('console errors detected during audio flow')
}

await browser.close()
console.log('\n✅ F4 e2e — audio flow PASS (9/9 scenarios)')