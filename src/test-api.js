/**
 * src/test-api.js
 *
 * window.__gameTestAPI__ surface (F3 game-test-api spec).
 *
 * Activated by `?test=1` query parameter. Auto-skips main menu and boots the test
 * level directly. Production boot uses the menu.
 *
 * Method surface (locked):
 *   getStatus()       -> { pixiLoaded, pixiVersion, stage, inTestMode }
 *   getSeed()         -> number
 *   setSeed(n)        -> void   (re-creates the mulberry32 PRNG)
 *   setTime(t)        -> void   (seconds; seeks the deterministic clock + camera)
 *   tick(dtMs)        -> void   (advances the fixed clock by dtMs; production path unaffected)
 *   fireAtIso(x,y,o?) -> { hit, enemyId }  bypasses cooldown
 *   simulateTap(sx,sy)-> void             respects cooldown
 *   getEnemies()      -> frozen snapshot
 *   getIntegrity()    -> { current, max, exhausted }
 *   getScore()        -> { score, firmas, best }
 *   getProjectiles()  -> frozen snapshot
 *   on(topic, cb)     -> unsub   (passthrough to eventBus)
 *   off(topic, cb)    -> void
 *
 * PRNG: when in ?test=1, production Math.random is REPLACED by a mulberry32(seed)
 * at the boot site. Default seed = 0xC0FFEE, override via &seed=N.
 */
import { mulberry32 } from './random.js?v=44'
import { on as busOn } from './event-bus.js?v=44'
import { LOGICAL_W, LOGICAL_H } from './canvas.js?v=44'
import { Enemy } from './enemies.js?v=44'

export const DEFAULT_TEST_SEED = 0xC0FFEE

/**
 * Read query-string flags. Returns { inTestMode, seed }.
 */
export function parseTestFlags(search = window.location.search) {
  const params = new URLSearchParams(search)
  const inTestMode = params.has('test')
  let seed = DEFAULT_TEST_SEED
  if (params.has('seed')) {
    const raw = params.get('seed')
    const n = Number(raw)
    if (Number.isFinite(n)) seed = n >>> 0
  }
  return { inTestMode, seed }
}

/**
 * Mount the __gameTestAPI__ object on window.
 * @param {Object} ctx
 * @param {Object} ctx.bus         eventBus
 * @param {Object} ctx.camera      RailCamera
 * @param {Object} ctx.combat      Combat
 * @param {Object} ctx.enemies     EnemyManager
 * @param {Object} ctx.integrity   Integrity
 * @param {Object} ctx.score       Score
 * @param {Object} ctx.rng         mulberry32 instance (the active seeded PRNG)
 * @param {Object} ctx.clock       { now(), advance(dtMs), setTime(ms) } fixed clock for tests
 * @param {Object} ctx.testLevel   TEST_LEVEL constant
 * @param {Object} ctx.bootLevel   fn() -> void   spawns the level (test branch)
 * @param {Object} [ctx.debugHitboxes]   DebugHitboxes instance (REQ-CMB-007)
 */
export function mountTestAPI(ctx) {
  const api = {
    getStatus() {
      return {
        pixiLoaded: typeof PIXI !== 'undefined',
        pixiVersion: typeof PIXI !== 'undefined' ? PIXI?.VERSION : null,
        stage: 'F3 — shooter rail gameplay',
        inTestMode: true,
      }
    },
    getSeed() { return ctx.rng ? ctx.rng.seed : DEFAULT_TEST_SEED },
    setSeed(n) {
      const fresh = mulberry32(n >>> 0)
      fresh.seed = n >>> 0
      ctx.rng = fresh
      if (ctx.combat?.setRng) ctx.combat.setRng(fresh)
      if (ctx.enemies?.rng !== undefined) ctx.enemies.rng = fresh
    },
    setTime(t) {
      ctx.clock?.setTime?.(Math.max(0, t * 1000))
      if (ctx.camera?.setTime) ctx.camera.setTime(t)
    },
    tick(dtMs) {
      ctx.clock?.advance?.(dtMs)
      // In test mode we always advance the camera regardless of halt state,
      // so tests can simulate an entire level from start to finish without
      // getting stuck after the integrity is exhausted. The halt is only
      // relevant for the production game loop, which the test bypasses.
      if (ctx.camera) {
        const tBefore = ctx.camera.getTime?.() ?? 0
        ctx.camera.setTime?.(tBefore + dtMs / 1000)
        // Also drive escape detection so tests can step past enemies deterministically.
        // Fase-5 REQ-CMB-008: pass isoWorld + viewport geometry so the
        // screen-space escape test runs alongside the Manhattan fallback.
        const camIso = { isoX: ctx.camera.getCameraX(), isoY: ctx.camera.getCameraY() }
        const vc = ctx.viewportCenter ?? { x: LOGICAL_W / 2, y: LOGICAL_H / 2 }
        const vs = ctx._viewportSize ?? { x: LOGICAL_W, y: LOGICAL_H }
        ctx.enemies?.update?.(dtMs, camIso, tBefore + dtMs / 1000, ctx.isoWorld, vc, vs)
      }
      // F4g: also drive isoWorld.update() so the world container's position
      // and the enemy sprite positions stay in sync with the camera. Without
      // this, headless probes that don't yield to the Pixi ticker see stale
      // container position and `screenToIsoWithCamera` returns the wrong iso
      // coord — making the hit AABB miss every visible sprite.
      if (ctx.isoWorld && ctx.camera && ctx.enemies) {
        const camIso = { isoX: ctx.camera.getCameraX(), isoY: ctx.camera.getCameraY() }
        if (ctx.combat) ctx.combat.setCameraIso(camIso)
        const verticalSprites = ctx.enemies.getAliveSprites().map(e => ({
          gx: e.def.isoX, gy: e.def.isoY, sprite: e.sprite,
        }))
        ctx.isoWorld.update(ctx.camera, verticalSprites)
      }
    },
    fireAtIso(x, y, opts) {
      return ctx.combat?.fireAtIso?.(x, y, { x: 0, y: 0 }, { bypassCooldown: true, ...(opts ?? {}) })
    },
    /**
     * F5 (REQ-CMB-003): fire at a logical screen point. The new resolver
     * compares the click to each enemy's screen-space sprite bounds, so
     * callers pass canvas px (not iso coords). `bypassCooldown` defaults to
     * true so tests can rapid-fire without the 200 ms gate.
     */
    fireAtScreen(x, y, opts) {
      return ctx.combat?.fireAtScreen?.(x, y, { x: 0, y: 0 }, { bypassCooldown: true, ...(opts ?? {}) })
    },
    /**
     * F5 (REQ-CMB-003): read the current screen-space AABB of an enemy.
     * Returns `{x,y,w,h}` in logical canvas px. Returns null if the enemy id
     * is unknown.
     */
    getScreenBounds(enemyId) {
      if (!ctx.enemies) return null
      const enemy = ctx.enemies.get?.(enemyId)
      if (!enemy) return null
      const camIso = ctx.camera ? { isoX: ctx.camera.getCameraX(), isoY: ctx.camera.getCameraY() } : { isoX: 0, isoY: 0 }
      const vc = ctx.viewportCenter ?? { x: LOGICAL_W / 2, y: LOGICAL_H / 2 }
      return Enemy.getScreenBounds(enemy, ctx.isoWorld, camIso, vc)
    },
    simulateTap(screenX, screenY) {
      const isoWorld = ctx.isoWorld
      const camIso = ctx.camera ? { isoX: ctx.camera.getCameraX(), isoY: ctx.camera.getCameraY() } : { isoX: 0, isoY: 0 }
      const vc = ctx.viewportCenter ?? { x: LOGICAL_W / 2, y: LOGICAL_H / 2 }
      const iso = isoWorld.screenToIsoWithCamera(screenX, screenY, camIso, vc)
      return ctx.combat?.fireAtIso?.(iso.isoX, iso.isoY, { x: screenX, y: screenY })
    },
    getEnemies() { return ctx.enemies?.readAll?.() ?? [] },
    getIntegrity() { return ctx.integrity?.read?.() ?? { current: 3, max: 3, exhausted: false } },
    getScore() { return ctx.score?.read?.() ?? { score: 0, firmas: 0, best: null } },
    getProjectiles() { return ctx.combat?.readProjectiles?.() ?? [] },
    on(topic, cb) { return busOn(topic, cb) },
    off(topic, cb) { /* not implemented (single-page tests); events are fire-and-forget */ },
    // Helper for tests that want to set up from scratch.
    // Note: bootLevel is async, but we don't await it here to keep the
    // synchronous surface that some tests rely on. Tests that need the
    // post-reset state should `await` an additional tick + read.
    reset() {
      ctx.integrity?.reset?.()
      ctx.score?.reset?.()
      ctx.combat?.reset?.()
      ctx.enemies?.reset?.()
      // Unhalt the camera so the test can drive it from t=0 even if it
      // was halted by a previous game-over (in ?test=1 production the halt
      // would have stopped the ticker).
      if (ctx.camera?.unHalt) ctx.camera.unHalt()
      ctx.camera?.setTime?.(0)
      // Reload the test level so reset() leaves a fully-bootable state.
      // bootLevel() handles spawning (including time-gated spawns); the manual
      // fallback below is only for tests that bypass bootLevel entirely.
      if (ctx.bootLevel) {
        try { ctx.bootLevel() } catch (e) { /* boot may already be in progress */ }
      } else if (ctx.testLevel?.enemies) {
        for (const def of ctx.testLevel.enemies) ctx.enemies.spawn(def)
      }
    },
    spawnEnemy(def) { return ctx.enemies?.spawn?.(def) ?? null },
    /**
     * F5 (REQ-CMB-007): toggle the debug hitbox overlay at runtime. Used by
     * e2e tests to drive the overlay without firing keyboard events. No-op
     * if `debugHitboxes` was not passed into the test-api ctx (e.g. the
     * production stub).
     */
    setHitboxesEnabled(b) {
      ctx.debugHitboxes?.setEnabled?.(b)
    },
    /**
     * F5 (REQ-CMB-007): read the current per-archetype hitbox rectangles.
     * Returns `[]` when the overlay is disabled. Each entry has
     * `{ enemyId, archetype, x, y, w, h, color }`.
     */
    getHitboxRects() {
      return ctx.debugHitboxes?.readRects?.() ?? []
    },
    /**
     * Fase-5 (REQ-CMB-008): resize the viewport for screen-space escape tests.
     * Delegates to the existing `__zarraModules__.setViewportSize` flow (rewires
     * isoWorld + combat) and stores the size on ctx so `enemies.update` reads
     * the current size on subsequent ticks.
     */
    setViewportSize(w, h) {
      ctx._viewportSize = { x: w, y: h }
      ctx._viewportCenter = { x: w / 2, y: h / 2 }
      window.__zarraModules__?.setViewportSize?.(w, h)
    },
    /**
     * Fase-5 (REQ-CMB-008): return the list of enemies that screen-escaped
     * on the most recent `update()` tick. Each entry is
     * `{ enemyId, reason: 'screen' | 'manhattan' }`. Empty when the screen-
     * space test wasn't run (no isoWorld/viewport supplied).
     */
    getScreenEscapedRects() {
      return ctx.enemies?._lastScreenEscaped ?? []
    },
  }
  window.__gameTestAPI__ = api
  return api
}
