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
import { mulberry32 } from './random.js'
import { on as busOn } from './event-bus.js'

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
      // Also drive the camera by dt (so deterministic clock + camera stay in sync)
      if (ctx.camera && !ctx.camera.isHalted?.()) {
        const tBefore = ctx.camera.getTime?.() ?? 0
        ctx.camera.setTime?.(tBefore + dtMs / 1000)
      }
    },
    fireAtIso(x, y, opts) {
      return ctx.combat?.fireAtIso?.(x, y, { x: 0, y: 0 }, { bypassCooldown: true, ...(opts ?? {}) })
    },
    simulateTap(screenX, screenY) {
      const isoWorld = ctx.isoWorld
      const camIso = ctx.camera ? { isoX: ctx.camera.getCameraX(), isoY: ctx.camera.getCameraY() } : { isoX: 0, isoY: 0 }
      const vc = ctx.viewportCenter ?? { x: 640, y: 360 }
      const iso = isoWorld.screenToIsoWithCamera(screenX, screenY, camIso, vc)
      return ctx.combat?.fireAtIso?.(iso.isoX, iso.isoY, { x: screenX, y: screenY })
    },
    getEnemies() { return ctx.enemies?.readAll?.() ?? [] },
    getIntegrity() { return ctx.integrity?.read?.() ?? { current: 3, max: 3, exhausted: false } },
    getScore() { return ctx.score?.read?.() ?? { score: 0, firmas: 0, best: null } },
    getProjectiles() { return ctx.combat?.readProjectiles?.() ?? [] },
    on(topic, cb) { return busOn(topic, cb) },
    off(topic, cb) { /* not implemented (single-page tests); events are fire-and-forget */ },
    // Helper for tests that want to set up from scratch:
    reset() {
      ctx.integrity?.reset?.()
      ctx.score?.reset?.()
      ctx.combat?.reset?.()
      ctx.enemies?.reset?.()
      ctx.camera?.setTime?.(0)
    },
    spawnEnemy(def) { return ctx.enemies?.spawn?.(def) ?? null },
  }
  window.__gameTestAPI__ = api
  return api
}
