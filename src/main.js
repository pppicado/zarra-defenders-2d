/**
 * src/main.js
 *
 * Entry point de Zarra Defenders 2D — F3 shooter rail gameplay.
 *
 * Responsibilities (F3):
 *   1. Initialize Pixi.js Application (DPR-aware)
 *   2. Load sprite manifest + preload active textures
 *   3. Mount main menu as first-paint (production) or auto-skip under ?test=1
 *   4. Boot the test level on menu:startRequested
 *   5. Wire combat loop: input → camera → enemies → integrity → combat → score → HUD → render
 *   6. Mount __gameTestAPI__ for ?test=1 introspection
 *   7. Handle overlay state: showGameOver on integrity:exhausted, showVictory on all-destroyed
 *
 * Layer separation (preserved from F2.5.15):
 *   app.stage -> world (camera-driven) | hud (screen-space)
 *   UI overlays (menu / game-over / integrity HUD) are DOM siblings of #game-canvas-wrapper.
 */
import { RailCamera } from './rail-camera.js'
import { Input } from './input.js'
import { Player } from './player.js'
import { IsoWorld } from './iso/world.js'
import { Tilemap } from './iso/tilemap.js'
import { Integrity } from './integrity.js'
import { Score } from './score.js'
import { EnemyManager, ARCHETYPES } from './enemies.js'
import { Combat } from './combat.js'
import { MainMenu } from './ui/menu.js'
import { Overlay } from './ui/overlay.js'
import { HUD } from './ui/hud.js'
import { TEST_LEVEL, testLevelWaypoints, assertTestLevel, TEST_LEVEL_ENEMY_COUNT } from './levels/test-level.js'
import { parseTestFlags, mountTestAPI } from './test-api.js'
import { mulberry32, fixedClock } from './random.js'
import { loadSpriteManifest, preloadManifestTextures } from './sprite-loader.js'
import { on as busOn, emit } from './event-bus.js'

// ============================================================
// Configuration
// ============================================================

/** F3 test level rail path (iso coords; same shape as F2.5 DEMO_PATH_ISO). */
function buildTestLevelPath() {
  return testLevelWaypoints()
}

/** Mutated externally by main-menu + overlay. */
const gameState = { state: 'main-menu' }   // 'main-menu' | 'gameplay' | 'overlay'

// ============================================================
// Bootstrap
// ============================================================

async function bootstrap() {
  if (typeof PIXI === 'undefined') {
    console.error('Pixi.js no cargó desde el CDN. Verificar conexión o tag <script>')
    return
  }

  setupOrientationLock()
  setupFullscreenButton()

  const { inTestMode, seed } = parseTestFlags()

  // --- Pixi Application ---
  const wrapper = document.getElementById('game-canvas-wrapper')
  const app = new PIXI.Application({
    background: 0x1a3a1a,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: wrapper,
  })
  wrapper.appendChild(app.view)

  // --- World / hud containers ---
  const world = new PIXI.Container(); world.name = 'world'; app.stage.addChild(world)
  const hud = new PIXI.Container(); hud.name = 'hud'; hud.sortableChildren = true; app.stage.addChild(hud)

  // --- IsoWorld + Tilemap (F2.5 reused) ---
  const isoWorld = new IsoWorld({
    viewportWidth: wrapper.clientWidth,
    viewportHeight: wrapper.clientHeight,
  })
  world.addChild(isoWorld.container)

  const tilemap = new Tilemap('stage1-bosque', wrapper.clientWidth, wrapper.clientHeight)
  await tilemap.load(async (variant) => {
    const url = `assets/tiles/stage1-bosque/${variant}_alt1.png`
    const tex = await PIXI.Assets.load(url)
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
    return tex
  })
  isoWorld.registerTilemap(tilemap)
  isoWorld.setStage('stage1-bosque')

  // --- Manifest + sprites ---
  let manifest = { active: {}, deprecated: {} }
  try {
    manifest = await loadSpriteManifest()
  } catch (err) {
    console.warn('[main] sprite manifest load failed:', err?.message ?? err)
  }
  const textureMap = await preloadManifestTextures(manifest)

  // --- Hand sprite (F3 hand-pen-sprite) ---
  let handSprite = null
  const handTex = textureMap.get('hand_pen')
  if (handTex) {
    handSprite = new PIXI.Sprite(handTex)
    handSprite.anchor.set(0.5, 0.8)
    handSprite.scale.set(1.0)
  } else {
    // Procedural fallback: 32x32 magenta square so the slot is never empty.
    console.warn('[main] hand_pen texture missing — using procedural fallback')
    const g = new PIXI.Graphics()
    g.lineStyle(1, 0x111111, 1)
    g.beginFill(0xfff5d6, 1)
    g.drawRect(-16, -16, 32, 32)
    g.endFill()
    handSprite = g
  }

  // --- Modules ---
  const integrity = new Integrity({ scoreReader: () => score.read() })
  const score = new Score({})
  score.loadBest()  // populate in-memory best
  const enemies = new EnemyManager({ rng: inTestMode ? mulberry32(seed) : Math.random })
  // rng field is private in the manager; expose it for the test API
  enemies.rng = inTestMode ? mulberry32(seed) : Math.random

  const camera = new RailCamera({ waypoints: buildTestLevelPath(), loop: false })
  const input = new Input()
  input.setCanvas(app.view)

  // Wire input gate: taps only reach Player during gameplay state.
  input.setGate(() => gameState.state === 'gameplay')

  const hudModule = new HUD({
    hudContainer: hud,
    integrity,
    score,
    camera,
    handSprite,
    viewportWidth: wrapper.clientWidth,
    viewportHeight: wrapper.clientHeight,
  })

  // Forward pointer movement to HUD (hand sprite tracking).
  input.on('move', (x, y) => hudModule.setPointer(x, y))

  const player = new Player(app, input, hud, camera)

  // Combat is created when the level boots (needs isoWorld + enemies + score).
  let combat = null

  // --- Boot test level now (test branch) or wait for menu (production) ---
  if (inTestMode) {
    await bootTestLevel({ combat: null, isoWorld, enemies, camera, score, integrity, hud: hudModule, world })
  }

  // --- Main menu (production boot) ---
  const menuRoot = document.getElementById('main-menu')
  const mainMenu = new MainMenu({ root: menuRoot, score })
  mainMenu.mount()
  if (!inTestMode) mainMenu.show()
  else mainMenu.hide()

  // When player clicks "Iniciar test level"
  busOn('menu:startRequested', async () => {
    mainMenu.hide()
    await bootTestLevel({ combat, isoWorld, enemies, camera, score, integrity, hud: hudModule, world })
  })

  busOn('menu:back', () => {
    if (combat) { combat.reset(); combat = null }
    enemies.reset()
    integrity.reset()
    score.reset()
    camera.setTime(0)
    gameState.state = 'main-menu'
    mainMenu.show()
  })

  // --- Overlay ---
  const overlayRoot = document.getElementById('game-overlay')
  const overlay = new Overlay({
    root: overlayRoot,
    integrity,
    score,
    camera,
    combat,                       // may be null until first boot; refreshed on bootTestLevel
    enemies,
    gameState,
  })

  // Wire overlay's combat reference after first boot
  if (combat) overlay.combat = combat

  // --- Test API (mounts once isoWorld + camera exist) ---
  if (inTestMode) {
    mountTestAPI({
      bus: window.eventBus,
      camera,
      combat,
      enemies,
      integrity,
      score,
      rng: enemies.rng,
      clock: fixedClock(),
      testLevel: TEST_LEVEL,
      bootLevel: () => bootTestLevel({ combat, isoWorld, enemies, camera, score, integrity, hud: hudModule, world }),
      isoWorld,
      viewportCenter: { x: wrapper.clientWidth / 2, y: wrapper.clientHeight / 2 },
    })
  }

  // --- Game loop ---
  let lastTime = performance.now()
  app.ticker.add(() => {
    const now = performance.now()
    const dt = (now - lastTime) / 1000
    lastTime = now

    // Camera advance (skipped when halted)
    camera.update(dt)

    // IsoWorld + tilemap cull
    const camIso = { isoX: camera.getCameraX(), isoY: camera.getCameraY() }
    if (combat) combat.setCameraIso(camIso)
    isoWorld.update(camera, [])  // verticalSprites intentionally empty — no decorative sprites in F3 yet

    // Enemies (escape detection)
    const elapsedSec = camera.getTime ? camera.getTime() : 0
    enemies.update(dt * 1000, camIso, elapsedSec)

    // Integrity: explicit drain on enemy:escaped is handled via event bus listener below.
    // Combat ticks
    if (combat) combat.update(dt * 1000)

    // Victory detector
    maybeFireVictory({ camera, enemies, integrity })
  })

  // Integrity hookup: enemy:escaped -> integrity.drain
  busOn('enemy:escaped', () => {
    integrity.drain('enemy:escaped')
  })

  // Listen for victory detector
  busOn('stage:cleared', () => {
    overlay.showVictory()
  })

  console.log('[ZarraDefenders2D] Bootstrap OK. F3 shooter rail gameplay ready.')

  async function bootTestLevel(ctx) {
    if (combat) { combat.reset() }
    enemies.reset()
    integrity.reset()
    score.reset()
    camera.setTime(0)

    // Spawn enemies from the deterministic test level.
    assertTestLevel()
    enemies.loadLevel(TEST_LEVEL.enemies)

    // Create Combat if missing (first boot in test mode).
    combat = new Combat({
      scene: hud,
      isoWorld,
      cameraIso: { isoX: 0, isoY: 0 },
      viewportCenter: { x: wrapper.clientWidth / 2, y: wrapper.clientHeight / 2 },
      score,
      enemies,
      viewportSize: { x: wrapper.clientWidth, y: wrapper.clientHeight },
      callbacks: {
        onHit: (id, hp, arch) => { /* hook for HUD later */ },
        onMiss: () => {},
        onFire: () => {},
      },
    })
    if (overlay && ctx?.combat !== null) overlay.combat = combat

    hudModule.setHandVisible(true)
    gameState.state = 'gameplay'
  }

  function maybeFireVictory({ camera, enemies, integrity }) {
    if (gameState.state !== 'gameplay') return
    const allDestroyed = enemies._enemies.size === 0
    const timeAtEnd = camera.getTime?.() ?? 0
    if (allDestroyed && timeAtEnd >= TEST_LEVEL.railEndTime) {
      emit('stage:cleared', {})
      gameState.state = 'overlay'
    }
  }

  // Expose for Playwright tests (also used for `__gameTestAPI__`)
  window.__zarraGameState__ = gameState
  window.__zarraModules__ = { integrity, score, enemies, camera, input, isoWorld, hud: hudModule, overlay }
}

/** Victory detector helper — emits stage:cleared exactly once. */
let _victoryEmitted = false

// ============================================================
// Mobile / fullscreen helpers (unchanged from F2.5.15)
// ============================================================

function setupOrientationLock() {
  const modal = document.getElementById('orientation-warning')
  if (!modal) return
  const mq = window.matchMedia('(orientation: landscape)')
  function update() {
    if (mq.matches) modal.classList.add('hidden')
    else modal.classList.remove('hidden')
  }
  update()
  if (mq.addEventListener) mq.addEventListener('change', update)
  else if (mq.addListener) mq.addListener(update)
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
}

function setupFullscreenButton() {
  const btn = document.getElementById('fullscreen-btn')
  if (!btn) return
  btn.classList.remove('hidden')
  function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement) }
  function updateIcon() {
    if (isFullscreen()) {
      btn.classList.add('is-fullscreen')
      btn.setAttribute('aria-label', 'Salir de pantalla completa')
      btn.title = 'Salir de pantalla completa (Esc)'
    } else {
      btn.classList.remove('is-fullscreen')
      btn.setAttribute('aria-label', 'Pantalla completa')
      btn.title = 'Pantalla completa'
    }
  }
  async function toggle() {
    try {
      if (isFullscreen()) {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      } else {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
        else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen()
      }
    } catch (err) { console.warn('[ZarraDefenders2D] No se pudo alternar fullscreen:', err) }
  }
  btn.addEventListener('click', toggle)
  document.addEventListener('fullscreenchange', updateIcon)
  document.addEventListener('webkitfullscreenchange', updateIcon)
  updateIcon()
}

bootstrap().catch(err => {
  console.error('[ZarraDefenders2D] Error fatal en bootstrap:', err)
})

// ============================================================
// Test API stub for non-?test=1 boots (so manual play still has something to introspect).
// ============================================================
window.__gameTestAPI__ = window.__gameTestAPI__ ?? {
  getStatus: () => ({
    pixiLoaded: typeof PIXI !== 'undefined',
    pixiVersion: typeof PIXI !== 'undefined' ? PIXI.VERSION : null,
    stage: 'F3 — shooter rail gameplay (production boot)',
    inTestMode: false,
  }),
}
