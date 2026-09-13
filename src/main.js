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
import { RailCamera } from './rail-camera.js?v=44'
import { Input } from './input.js?v=44'
import { Player } from './player.js?v=44'
import { IsoWorld } from './iso/world.js?v=44'
import { Tilemap } from './iso/tilemap.js?v=44' // eslint-disable-line no-unused-vars -- kept for tests/iso-tile-system references; no longer instantiated in main game (fase-6 BG-005)
import { Integrity } from './integrity.js?v=44'
import { Score } from './score.js?v=44'
import { EnemyManager, ARCHETYPES, LATERAL_MIN_PX, LATERAL_MAX_PX } from './enemies.js?v=44'
import { Combat } from './combat.js?v=44'
import { MainMenu } from './ui/menu.js?v=44'
import { Overlay } from './ui/overlay.js?v=44'
import { HUD } from './ui/hud.js?v=44'
import { TEST_LEVEL, testLevelWaypoints, assertTestLevel, assertStaticSpriteIds, TEST_LEVEL_ENEMY_COUNT } from './levels/test-level.js?v=44'
import { parseTestFlags, mountTestAPI } from './test-api.js?v=44'
import { DebugHitboxes } from './debug-hitboxes.js?v=44'
import { mulberry32, fixedClock } from './random.js?v=44'
import { loadSpriteManifest, preloadManifestTextures } from './sprite-loader.js?v=44'
import { on as busOn, emit } from './event-bus.js?v=44'
import { LOGICAL_W, LOGICAL_H } from './canvas.js?v=44'
import { BackgroundLayer, BG_SOURCE_HEIGHT_PX, BG_SCALE, BG_RENDERED_HEIGHT_PX } from './backgrounds.js?v=44'

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

/**
 * Load a procedural placeholder bg into the given BackgroundLayer.
 * Used during PR-1 (disable tile system + add bg placeholder) before
 * the Minimax-generated assets land in PR-2. The placeholder is a
 * solid-color sprite with the canonical BG_SOURCE_HEIGHT_PX × LOGICAL_W/2
 * dimensions so it visually fills the canvas after BG_SCALE=2 upscale.
 *
 * Per-stage placeholder palette: sky-blue for bosque, warm-cream for
 * pueblo, etc. (mapped via simple switch so each stage is recognisable).
 */
/**
 * Load `assets/backgrounds/manifest.json` (BG-004). The manifest maps
 * stageId → relative path to the Minimax-generated PNG. Returns an empty
 * object if the file is missing (fallback to placeholder).
 */
async function _loadBackgroundManifest() {
  try {
    const res = await fetch('assets/backgrounds/manifest.json', { cache: 'no-cache' })
    if (!res.ok) return {}
    return await res.json()
  } catch (err) {
    console.warn('[main] bg manifest load failed:', err?.message ?? err)
    return {}
  }
}

/**
 * Load a procedural placeholder bg into the given BackgroundLayer.
 * Fallback when the Minimax-generated asset fails to load.
 *
 * Per-stage placeholder palette: olive-green for bosque, warm-cream for
 * pueblo, etc.
 */
function _loadPlaceholderBg(bg, stageId) {
  const palettes = {
    'stage1-bosque':    { top: 0x7eaa5a, bottom: 0x4a6b30 },  // forest gradient
    'stage2-pueblo':    { top: 0xf0d8b8, bottom: 0xb89868 },  // whitewashed village
    'stage3-rio':       { top: 0x6ab0c8, bottom: 0x2e6680 },  // river water
    'stage4-vertedero': { top: 0x6a6058, bottom: 0x3a3530 },  // landfill
    'stage5-castillo':  { top: 0xd4b88c, bottom: 0x8a6c4c },  // volcanic peñón
  }
  const { top, bottom } = palettes[stageId] ?? { top: 0x2a3a4a, bottom: 0x182028 }

  // Build the placeholder texture via a PIXI.Graphics rendered once into a
  // RenderTexture. The resulting texture is 640×1120 (matches the future
  // Minimax asset dimensions) so BG_SCALE=2 produces the canonical 1280×2240
  // on-screen footprint.
  const w = LOGICAL_W / 2
  const h = BG_SOURCE_HEIGHT_PX
  const g = new PIXI.Graphics()
  g.beginFill(top, 1)
  g.drawRect(0, 0, w, h / 2)
  g.endFill()
  g.beginFill(bottom, 1)
  g.drawRect(0, h / 2, w, h / 2)
  g.endFill()
  const renderer = PIXI.autoDetectRenderer(w, h)
  const tex = PIXI.RenderTexture.create({ width: w, height: h })
  renderer.render(g, { renderTexture: tex, clear: true })
  bg.setTexture(stageId, tex)
}

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

  // F5 (REQ-CMB-007): parse ?hitboxes=1 once at boot. The keyboard `H` toggle
  // also flips the flag at runtime. Production (`?test=0` + no `?hitboxes=1`
  // + no `H`) MUST stay clean.
  const urlParams = new URLSearchParams(window.location.search)
  const hitboxesInitiallyEnabled = urlParams.has('hitboxes')

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

  // fase-6 (BG-005): the tile renderer is disabled in the main game. The
  // BackgroundLayer (loaded below) replaces it. The standalone demo at
  // `tests/tile-gallery.html` still instantiates Tilemap directly from
  // `../src/iso/tilemap.js` — that path is unaffected.
  //
  // (Previously: const tilemap = new Tilemap('stage1-bosque', ...) and
  //  isoWorld.registerTilemap/isoWorld.setStage(...) — both removed.)

  // --- Background layer (BG-001..BG-005) ---
  // The bg is a child of `isoWorld.container` so it inherits world translation.
  // Procedural placeholder (solid color sprite) until Minimax-generated assets
  // land in `assets/backgrounds/`. See tools/generate-stage-backgrounds.py.
  // The bg is attached to `isoWorld._worldLayer` (the layer that used to hold
  // the tilemap; now empty since the tile renderer is disabled) so it renders
  // BEHIND the enemies in `isoWorld.spriteLayer`. Adding it to `isoWorld.container`
  // would render it on top of the enemies (PIXI renders children in add order).
  const bg = new BackgroundLayer({ container: isoWorld._worldLayer, viewportWidth: LOGICAL_W })
  // PR-2: load the real Minimax-generated background from `assets/backgrounds/`.
  // The placeholder path is kept for offline / first-boot fallback (see _loadPlaceholderBg).
  const _bgManifest = await _loadBackgroundManifest()
  const stage1Path = _bgManifest['stage1-bosque'] ?? 'assets/backgrounds/stage1-bosque.png'
  try {
    await bg.load('stage1-bosque', stage1Path)
  } catch (err) {
    console.warn('[main] bg load failed, falling back to procedural placeholder:', err?.message ?? err)
    _loadPlaceholderBg(bg, 'stage1-bosque')
  }

  // --- HUD: mano + corazones + papeleta (en appHud.stage) ---
  const hudContainer = new PIXI.Container(); hudContainer.name = 'hud'; hudContainer.sortableChildren = true; appHud.stage.addChild(hudContainer)

  // F5 (REQ-CMB-007): debug hitbox overlay. Mounted on the HUD canvas so it
  // draws above world sprites. Initial state honors the ?hitboxes=1 param;
  // the keyboard `H` toggle flips it at runtime. The container is created
  // once and reused — `setEnabled(false)` just hides it.
  const viewportCenter = { x: LOGICAL_W / 2, y: LOGICAL_H / 2 }
  let debugHitboxes = null

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

  // F5 (REQ-CMB-007): instantiate the debug hitbox overlay now that enemies +
  // isoWorld + viewportCenter are all defined. Initial flag honors ?hitboxes=1.
  debugHitboxes = new DebugHitboxes({
    hudContainer: appHud.stage,
    enemies,
    isoWorld,
    viewportCenter,
    enabled: hitboxesInitiallyEnabled,
  })

  // F5 (REQ-CMB-007): keyboard `H` toggles the overlay at runtime. Only
  // attached once — repeated `H` presses flip the flag.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
      if (debugHitboxes) debugHitboxes.setEnabled(!debugHitboxes.isEnabled())
    }
  })

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

  // BG-011 — Escape (or P) during gameplay returns to the main menu.
  // The 'pause' event is already emitted by Input._handleKeyDown when the
  // player presses Escape / P; we map it to `menu:back` here so the player
  // can switch stages without having to die first.
  input.on('pause', () => {
    if (gameState.state === 'gameplay') {
      emit('menu:back', {})
    }
  })

  // Tap handler: the input handler has already converted CSS px → logical
  // 1920x720 px (see _toLogical in input.js). F5 (REQ-CMB-003): the combat
  // resolver now compares against each enemy's screen-space sprite bounds,
  // so we pass the logical screen coords straight through — no iso conversion
  // here.
  input.on('tap', (logicalX, logicalY) => {
    if (gameState.state !== 'gameplay') return
    if (!combat) return
    const handPos = hudModule.getHandScreenPosition() ?? { x: logicalX, y: logicalY }
    combat.fireAtScreen(logicalX, logicalY, handPos)
  })

  const player = new Player(appWorld, input, hudContainer, camera)

  let combat = null
  let finaleStarted = false  // BG-006 — true after the first finale frame; reset on boot

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
    isTestMode: inTestMode,  // BG-009 — context-aware retry label
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

  // BG-005 — fase-6 stage selector. Each unlocked stage button emits this.
  busOn('menu:startStage', async ({ stageId }) => {
    mainMenu.hide()
    // Swap the bg texture for the requested stage (if it differs).
    const newPath = _bgManifest[stageId]
    if (newPath && stageId !== bg.stageId) {
      try {
        await bg.setStage(stageId, newPath)
      } catch (err) {
        console.warn(`[main] bg.setStage(${stageId}) failed:`, err?.message ?? err)
        _loadPlaceholderBg(bg, stageId)
      }
    }
    await bootTestLevel({ combat, isoWorld, enemies, camera, score, integrity, hud: hudModule, world, overlay })
  })

  // REQ-CMB-011: Overlay emits `bootTestLevel:request` when the user clicks
  // Reintentar. We invoke the same `bootTestLevel` used for menu-start so
  // the retry path gets a full state reset + level reload — the overlay no
  // longer needs to know about integrity/score/combat/enemies/camera.
  busOn('bootTestLevel:request', async () => {
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
      debugHitboxes,
    })
  }

  // --- Game loop (drives both apps in lockstep) ---
  let lastTime = performance.now()
  const ticker = () => {
    const now = performance.now()
    const dt = (now - lastTime) / 1000
    lastTime = now

    // Fase-5-calibration (REQ-CMB-012): unconditionally advance the camera
    // in both production and `?test=1`. The pre-calibration
    // `if (!inTestMode) camera.update(dt)` guard froze the camera in test
    // mode — tests had to manually call `__gameTestAPI__.tick(dt)` to see
    // any motion. Now the production ticker drives both modes identically,
    // and `tick()` still works as a deterministic override for tests.
    camera.update(dt)

    const camIso = { isoX: camera.getCameraX(), isoY: camera.getCameraY() }
    if (combat) combat.setCameraIso(camIso)
    // BG-002 — scroll the background layer at parallax 0.2.
    bg.update(camIso)
    // Pass the enemies as verticalSprites so IsoWorld repositions their
    // sprites on each frame (anchoring them at the south point of their
    // iso cell, like the tile decorations in F2.5).
    const verticalSprites = enemies.getAliveSprites().map(e => ({
      gx: e.def.isoX,
      gy: e.def.isoY,
      sprite: e.sprite,
    }))
    isoWorld.update(camera, verticalSprites)

    // Fase-5-calibration (REQ-CMB-012): unconditionally update enemies every
    // frame. The pre-calibration `if (!inTestMode)` guard kept enemies frozen
    // in test mode unless tests manually called `__gameTestAPI__.tick(dt)`.
    // Now enemies spawn and react identically in both modes.
    const elapsedSec = camera.getTime ? camera.getTime() : 0
    // Fase-5 REQ-CMB-008: pass isoWorld + viewport geometry so the
    // screen-space escape test runs alongside the Manhattan fallback.
    // Fase-5 REQ-CMB-010: viewportBounds drives the lateral clamp for
    // mobile enemies. Bounds = [80, LOGICAL_W - 80].
    const viewportBounds = { minX: LATERAL_MIN_PX, maxX: LATERAL_MAX_PX }
    enemies.update(
      dt * 1000, camIso, elapsedSec,
      isoWorld,
      { x: LOGICAL_W / 2, y: LOGICAL_H / 2 },
      { x: LOGICAL_W, y: LOGICAL_H },
      viewportBounds,
    )

    if (combat) combat.update(dt * 1000)

    // F5 (REQ-CMB-007): debug hitbox overlay runs after world + enemies so
    // getScreenBounds() sees the post-tick container positions. update() is
    // a no-op when disabled (early return).
    if (debugHitboxes) debugHitboxes.update(camIso)

    // BG-006 — fire the finale BEFORE checking victory so the bg can freeze
    // and waves can spawn even if integrity has already drained (e.g. when
    // tests skip time). The finale is a one-shot event.
    maybeFireFinale({ camera, bg })
    maybeFireVictory({ camera, enemies, integrity })
  }
  appWorld.ticker.add(ticker)
  appHud.ticker.add(ticker)

  busOn('enemy:escaped', () => {
    integrity.drain('enemy:escaped')
  })

  busOn('stage:cleared', ({ stageId }) => {
    // BG-005 — persist stage clear to localStorage so the next stage unlocks.
    if (stageId) {
      try {
        localStorage.setItem(`zarra2d:stageClear:${stageId}`, JSON.stringify({ firmas: score.read().firmas }))
      } catch (err) {
        console.warn('[main] localStorage write failed:', err?.message ?? err)
      }
    }
    overlay.showVictory()
  })

  console.log('[ZarraDefenders2D] Bootstrap OK. F3.5 two-canvas + tileSize=128.')

  async function bootTestLevel(ctx) {
    if (combat) { combat.reset() }
    enemies.reset()
    integrity.reset()
    score.reset()
    // BG-006 — reset finale flag + unfreeze bg so it scrolls again on retry.
    finaleStarted = false
    bg.unfreeze()
    // REQ-CMB-013: ensure camera is unfrozen after retry (was halted by game-over)
    if (camera.unHalt) camera.unHalt()
    camera.setTime(0)

    assertTestLevel()
    assertStaticSpriteIds()
    enemies.loadLevel(TEST_LEVEL.enemies)

    // F4h: do NOT re-create the Combat instance on every reset. The test-api
    // captures `combat` once at mount-time and rebinding it via
    // `ctx.combat = combat` would silently break the tick→combat wiring when
    // the test-api's tick runs `ctx.combat.setCameraIso(...)`. Combat.reset()
    // already clears projectiles and lastFireMs, which is all reset() needs.
    if (!combat) {
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
    }
    if (ctx?.overlay) ctx.overlay.combat = combat
    if (overlay) overlay.combat = combat

    hudModule.setHandVisible(true)
    gameState.state = 'gameplay'
  }

  function maybeFireFinale({ camera, bg }) {
    // Note: this fires regardless of gameState so the finale can trigger
    // even when integrity:exhausted has already flipped gameState to
    // 'overlay' (e.g. when tests skip time without firing). The bg.freeze()
    // and wave queue still take effect for the duration of the overlay.
    const timeAtEnd = camera.getTime?.() ?? 0
    if (timeAtEnd < TEST_LEVEL.railEndTime) return
    if (finaleStarted) return
    finaleStarted = true
    // BG-006 — freeze the bg, schedule the post-finale wave roster.
    bg.freeze()
    const queued = enemies.spawnWave(TEST_LEVEL.postFinalWaveRoster)
    emit('stage:finaleStarted', { stageId: bg.stageId, wavesQueued: queued })
    console.log(`[ZarraDefenders2D] finale started — bg frozen, ${queued} wave enemies scheduled`)
  }

  function maybeFireVictory({ camera, enemies, integrity }) {
    // Note: fires regardless of gameState (same reasoning as maybeFireFinale).
    // gameState.state = 'overlay' is still set so the overlay UI shows.
    const timeAtEnd = camera.getTime?.() ?? 0
    const finalBossAlive = enemies.get(TEST_LEVEL.finalBossId) != null
    // BG-006/BG-007 — stage clears when the final boss is destroyed
    // (regardless of remaining wave enemies). This lets the boss fight
    // happen with continuous waves in the background.
    if (timeAtEnd >= TEST_LEVEL.railEndTime && !finalBossAlive) {
      emit('stage:cleared', { stageId: bg.stageId })
      gameState.state = 'overlay'
    }
  }

  window.__zarraGameState__ = gameState
  window.__zarraModules__ = { integrity, score, enemies, camera, input, isoWorld, hud: hudModule, overlay, appWorld, appHud, get combat() { return combat }, bg, setViewportSize: (w, h) => { isoWorld.viewportWidth = w; isoWorld.viewportHeight = h; isoWorld._viewOrigin = { x: w / 2, y: h / 2 }; isoWorld.tileWorldOrigin = { x: Math.round(w / 2), y: Math.round(h * 0.30) }; if (combat) combat.setViewportSize(w, h); if (combat) combat.setViewportCenter({ x: w / 2, y: h / 2 }) } }
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
