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
import { RailCamera } from './rail-camera.js?v=26'
import { Input } from './input.js?v=26'
import { Player } from './player.js?v=26'
import { IsoWorld } from './iso/world.js?v=26'
import { Tilemap } from './iso/tilemap.js?v=26'
import { Integrity } from './integrity.js?v=26'
import { Score } from './score.js?v=26'
import { EnemyManager, ARCHETYPES } from './enemies.js?v=32'
import { Combat } from './combat.js?v=31'
import { MainMenu } from './ui/menu.js?v=26'
import { Overlay } from './ui/overlay.js?v=26'
import { HUD } from './ui/hud.js?v=26'
import { TEST_LEVEL, testLevelWaypoints, assertTestLevel, TEST_LEVEL_ENEMY_COUNT } from './levels/test-level.js?v=26'
import { parseTestFlags, mountTestAPI } from './test-api.js?v=28'
import { mulberry32, fixedClock } from './random.js?v=26'
import { loadSpriteManifest, preloadManifestTextures } from './sprite-loader.js?v=26'
import { on as busOn, emit } from './event-bus.js?v=26'
import { LOGICAL_W, LOGICAL_H } from './canvas.js?v=28'

// ============================================================
// Configuration
// ============================================================

/**
 * LOGICAL_W × LOGICAL_H is the fixed internal rendering resolution. Every game
 * coordinate (hand position, hearts, projectile origin, tile sizes, viewport
 * center) is expressed in this space. CSS `transform: scale()` on the wrapper
 * then visual-scales the 1280x720 buffer to fit any browser viewport.
 *
 * F4e: LOGICAL_W is now 1280 (16:9 standard 720p), imported from ./canvas.js.
 */
const TILE_SIZE = 128

/**
 * Fit a fixed-size logical canvas into the actual viewport by setting the
 * wrapper's CSS transform to a uniform scale. The canvas inside stays 1920x720
 * (logical px); the transform only scales the visible rendering.
 *
 * F3.5: applied to BOTH the world canvas wrapper and the HUD canvas wrapper
 * (kept in lockstep so they overlay pixel-perfect on every viewport).
 */
function applyCssScale(wrappers, logicalW, logicalH) {
  const list = Array.isArray(wrappers) ? wrappers : [wrappers]
  for (const w of list) {
    if (!w) continue
    w.style.position = 'fixed'
    w.style.left = '0'
    w.style.top = '0'
    w.style.width = logicalW + 'px'
    w.style.height = logicalH + 'px'
    w.style.transformOrigin = '0 0'
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!vw || !vh) return
  const scale = Math.min(vw / logicalW, vh / logicalH)
  const xOff = (vw - logicalW * scale) / 2
  const yOff = (vh - logicalH * scale) / 2
  const transform = `translate(${xOff}px, ${yOff}px) scale(${scale})`
  for (const w of list) if (w) w.style.transform = transform
  window.__cssScale__ = { scale, xOff, yOff }
}

/**
 * Convert a mouse coordinate reported in the wrapper's CSS space into the
 * game's logical 1920x720 space. Used by the tap handler so screenToIso
 * projects from the cursor position to the right iso cell regardless of the
 * CSS scale applied for the current viewport.
 */
export function toLogical(cssX, cssY) {
  const cs = window.__cssScale__
  if (!cs || !cs.scale) return { x: cssX, y: cssY }
  return {
    x: (cssX - cs.xOff) / cs.scale,
    y: (cssY - cs.yOff) / cs.scale,
  }
}

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

  // --- Pixi Application (WORLD) ---
  // F3.5: TWO separate Pixi apps stacked via CSS z-index.
  //   appWorld: iso tiles + enemy sprites (z-index 1, behind)
  //   appHud:   hand sprite + integrity hearts + papeleta (z-index 2, on top)
  // Both run at LOGICAL_W x LOGICAL_H (1920x720). Both CSS wrappers get the
  // same transform: scale() so they overlay pixel-perfect.
  const worldWrapper = document.getElementById('game-canvas-wrapper')
  const hudWrapper = document.getElementById('game-hud-wrapper')

  const appWorld = new PIXI.Application({
    width: LOGICAL_W,
    height: LOGICAL_H,
    background: 0x1a3a1a,
    antialias: false,
    resolution: 1,
    autoDensity: false,
  })
  worldWrapper.appendChild(appWorld.view)

  const appHud = new PIXI.Application({
    width: LOGICAL_W,
    height: LOGICAL_H,
    background: 0x000000,
    backgroundAlpha: 0,             // transparent so the world shows through
    antialias: false,
    resolution: 1,
    autoDensity: false,
  })
  hudWrapper.appendChild(appHud.view)

  // --- CSS scale: fit the 1920x720 logical canvas into the actual viewport.
  // Same transform applied to both wrappers — they overlay exactly.
  applyCssScale([worldWrapper, hudWrapper], LOGICAL_W, LOGICAL_H)

  // Listen for resize / orientation change and reapply the transform.
  window.addEventListener('resize', () => applyCssScale([worldWrapper, hudWrapper], LOGICAL_W, LOGICAL_H))
  window.addEventListener('orientationchange', () => applyCssScale([worldWrapper, hudWrapper], LOGICAL_W, LOGICAL_H))

  // --- World: iso tiles + enemies ---
  const world = new PIXI.Container(); world.name = 'world'; appWorld.stage.addChild(world)

  const isoWorld = new IsoWorld({
    viewportWidth: LOGICAL_W,
    viewportHeight: LOGICAL_H,
    // F3.5: tileSize is fixed at 128 px logical regardless of viewport. The
    // canvas is always 1920x720 so this is a stable value (≈15 tiles wide).
    tileSize: TILE_SIZE,
  })
  world.addChild(isoWorld.container)

  // F3.5: pass TILE_SIZE explicitly so the tilemap renders at the same
  // scale as IsoWorld expects for screenToIsoWithCamera / hit detection.
  const tilemap = new Tilemap('stage1-bosque', LOGICAL_W, LOGICAL_H, { tileSize: TILE_SIZE })
  await tilemap.load(async (variant) => {
    const url = `assets/tiles/stage1-bosque/${variant}_alt1.png`
    const tex = await PIXI.Assets.load(url)
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
    return tex
  })
  isoWorld.registerTilemap(tilemap)
  isoWorld.setStage('stage1-bosque')

  // --- HUD: mano + corazones + papeleta (en appHud.stage) ---
  const hudContainer = new PIXI.Container(); hudContainer.name = 'hud'; hudContainer.sortableChildren = true; appHud.stage.addChild(hudContainer)

  // --- Manifest + sprites ---
  let manifest = { active: {}, deprecated: {} }
  try {
    manifest = await loadSpriteManifest()
  } catch (err) {
    console.warn('[main] sprite manifest load failed:', err?.message ?? err)
  }
  const textureMap = await preloadManifestTextures(manifest)

  // Build a spriteId → Texture map for enemy spawn (enemies load by their
  // manifest spriteId, e.g. 'enemies_camion_treco', 'enemies_dron_fumigador').
  // The map only contains textures whose keys actually look like enemy sprites.
  const enemyTextures = new Map()
  for (const [key, tex] of textureMap) {
    if (key.startsWith('enemies_')) enemyTextures.set(key, tex)
  }

  // --- Hand sprite ---
  let handSprite = null
  const handTex = textureMap.get('hand_pen')
  if (handTex) {
    handSprite = new PIXI.Sprite(handTex)
    handSprite.anchor.set(0.5, 0.85)
    handSprite.scale.set(1.2)
  } else {
    console.warn('[main] hand_pen texture missing — using procedural fallback')
    const g = new PIXI.Graphics()
    g.lineStyle(1, 0x111111, 1)
    g.beginFill(0xfff5d6, 1)
    g.drawRect(-16, -16, 32, 32)
    g.endFill()
    handSprite = g
  }

  // --- Heart textures ---
  const heartFullTex = textureMap.get('heart_full') ?? null
  const heartEmptyTex = textureMap.get('heart_empty') ?? null
  if (!heartFullTex) console.warn('[main] heart_full texture missing — using procedural fallback')
  if (!heartEmptyTex) console.warn('[main] heart_empty texture missing — using procedural fallback')

  // --- Modules ---
  const integrity = new Integrity({ scoreReader: () => score.read() })
  const score = new Score({})
  score.loadBest()
  const enemies = new EnemyManager({
    rng: inTestMode ? mulberry32(seed) : Math.random,
    scene: isoWorld.spriteLayer,
    textures: enemyTextures,
  })
  enemies.rng = inTestMode ? mulberry32(seed) : Math.random

  const camera = new RailCamera({ waypoints: buildTestLevelPath(), loop: false })
  const input = new Input()
  // Input reads events from BOTH canvases (world and HUD); clicks on the HUD
  // canvas are the gameplay ones.
  input.setCanvas(appHud.view)

  input.setGate(() => gameState.state === 'gameplay')

  const hudModule = new HUD({
    hudContainer,
    integrity,
    score,
    camera,
    handSprite,
    heartFullTex,
    heartEmptyTex,
    viewportWidth: LOGICAL_W,
    viewportHeight: LOGICAL_H,
  })

  input.on('move', (x, y) => hudModule.setPointer(x, y))

  // Tap handler: the input handler has already converted CSS px → logical
  // 1920x720 px (see _toLogical in input.js). Pass through to isoWorld.
  input.on('tap', (logicalX, logicalY) => {
    if (gameState.state !== 'gameplay') return
    if (!combat) return
    const camIso = { isoX: camera.getCameraX(), isoY: camera.getCameraY() }
    const vc = { x: LOGICAL_W / 2, y: LOGICAL_H / 2 }
    const iso = isoWorld.screenToIsoWithCamera(logicalX, logicalY, camIso, vc)
    const handPos = hudModule.getHandScreenPosition() ?? { x: logicalX, y: logicalY }
    combat.fireAtIso(iso.isoX, iso.isoY, handPos)
  })

  const player = new Player(appWorld, input, hudContainer, camera)

  let combat = null

  // --- Overlay (DOM) ---
  const overlayRoot = document.getElementById('game-overlay')
  const overlay = new Overlay({
    root: overlayRoot,
    integrity,
    score,
    camera,
    combat: null,
    enemies,
    gameState,
  })

  // --- Boot test level now (test branch) or wait for menu (production) ---
  if (inTestMode) {
    await bootTestLevel({ combat: null, isoWorld, enemies, camera, score, integrity, hud: hudModule, world, overlay })
  }

  // --- Main menu (production boot) ---
  const menuRoot = document.getElementById('main-menu')
  const mainMenu = new MainMenu({ root: menuRoot, score })
  mainMenu.mount()
  if (!inTestMode) mainMenu.show()
  else mainMenu.hide()

  busOn('menu:startRequested', async () => {
    mainMenu.hide()
    await bootTestLevel({ combat, isoWorld, enemies, camera, score, integrity, hud: hudModule, world, overlay })
  })

  busOn('menu:back', () => {
    if (combat) { combat.reset(); combat = null; overlay.combat = null }
    enemies.reset()
    integrity.reset()
    score.reset()
    camera.setTime(0)
    gameState.state = 'main-menu'
    mainMenu.show()
  })

  // --- Test API ---
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
      viewportCenter: { x: LOGICAL_W / 2, y: LOGICAL_H / 2 },
    })
  }

  // --- Game loop (drives both apps in lockstep) ---
  let lastTime = performance.now()
  const ticker = () => {
    const now = performance.now()
    const dt = (now - lastTime) / 1000
    lastTime = now

    if (!inTestMode) camera.update(dt)

    const camIso = { isoX: camera.getCameraX(), isoY: camera.getCameraY() }
    if (combat) combat.setCameraIso(camIso)
    // Pass the enemies as verticalSprites so IsoWorld repositions their
    // sprites on each frame (anchoring them at the south point of their
    // iso cell, like the tile decorations in F2.5).
    const verticalSprites = enemies.getAliveSprites().map(e => ({
      gx: e.def.isoX,
      gy: e.def.isoY,
      sprite: e.sprite,
    }))
    isoWorld.update(camera, verticalSprites)

    if (!inTestMode) {
      const elapsedSec = camera.getTime ? camera.getTime() : 0
      enemies.update(dt * 1000, camIso, elapsedSec)
    }

    if (combat) combat.update(dt * 1000)

    maybeFireVictory({ camera, enemies, integrity })
  }
  appWorld.ticker.add(ticker)
  appHud.ticker.add(ticker)

  busOn('enemy:escaped', () => {
    integrity.drain('enemy:escaped')
  })

  busOn('stage:cleared', () => {
    overlay.showVictory()
  })

  console.log('[ZarraDefenders2D] Bootstrap OK. F3.5 two-canvas + tileSize=128.')

  async function bootTestLevel(ctx) {
    if (combat) { combat.reset() }
    enemies.reset()
    integrity.reset()
    score.reset()
    camera.setTime(0)

    assertTestLevel()
    enemies.loadLevel(TEST_LEVEL.enemies)

    // Combat fires its papeleta into the HUD canvas (on top of the world).
    combat = new Combat({
      scene: hudContainer,
      isoWorld,
      cameraIso: { isoX: 0, isoY: 0 },
      viewportCenter: { x: LOGICAL_W / 2, y: LOGICAL_H / 2 },
      score,
      enemies,
      viewportSize: { x: LOGICAL_W, y: LOGICAL_H },
      callbacks: {
        onHit: (id, hp, arch) => { /* hook for HUD later */ },
        onMiss: () => {},
        onFire: () => {},
      },
    })
    if (ctx?.overlay) ctx.overlay.combat = combat
    if (overlay) overlay.combat = combat

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

  window.__zarraGameState__ = gameState
  window.__zarraModules__ = { integrity, score, enemies, camera, input, isoWorld, hud: hudModule, overlay, appWorld, appHud, get combat() { return combat }, setViewportSize: (w, h) => { isoWorld.viewportWidth = w; isoWorld.viewportHeight = h; isoWorld._viewOrigin = { x: w / 2, y: h / 2 }; isoWorld.tileWorldOrigin = { x: Math.round(w / 2), y: Math.round(h * 0.30) }; if (combat) combat.setViewportSize(w, h); if (combat) combat.setViewportCenter({ x: w / 2, y: h / 2 }) } }
}

/** Victory detector helper — emits stage:cleared exactly once. */
let _victoryEmitted = false

// ============================================================
// Mobile / fullscreen helpers (unchanged from F2.5.15)
// ============================================================

function setupOrientationLock() {
  const modal = document.getElementById('orientation-warning')
  if (!modal) return
  // F3.5: orient via aspect ratio. w > h = horizontal (landscape) where
  // the 16:9 game canvas has full horizontal real estate. w < h = vertical
  // (portrait), canvas letterboxes at the top, game playable but small.
  // Modal shows when the viewport is portrait AND the smaller side is too
  // small to be worth playing (< 360 px), otherwise the modal is hidden
  // and the user can play in either orientation.
  // The resize/orientationchange listeners below call update() on rotation,
  // so the modal updates live when the user rotates their phone.
  function update() {
    const w = window.innerWidth
    const h = window.innerHeight
    const isLandscape = w > h
    const smallerSide = Math.min(w, h)
    if (!isLandscape && smallerSide < 360) {
      modal.classList.remove('hidden')
    } else {
      modal.classList.add('hidden')
    }
  }
  update()
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
