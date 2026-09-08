/**
 * src/combat.js
 *
 * Combat orchestration (F3 combat-core spec).
 *
 * Owns:
 *   - Projectile pool (PIXI.Graphics papeleta: 4×6 cream + 1px outline + diagonal signature)
 *   - Cooldown gate (333 ms fixed; spec REQ-CMB-001)
 *   - Hit-resolution pipeline (footprint AABB + reverse-depth sort + HP decrement)
 *   - Score/firmas deltas (delegated to caller via callback or via direct EventBus emit)
 *
 * Emits:
 *   - combat:fire     { isoX, isoY, sourceScreen }
 *   - combat:hit      { enemyId, hpRemaining, archetype, damage, scoreDelta, firmasDelta }
 *   - combat:miss     { isoX, isoY }
 *   - enemy:destroyed { enemyId, archetype, score, firmas }   (only when HP transitions to 0)
 *
 * Consumes:
 *   - Input.setGate from main.js (when menu/overlay visible, fireAtIso still works — only the
 *     pointer tap pipeline is gated; this is for tests + UI button "fire" hooks).
 */
import { emit } from './event-bus.js?v=10'
import { ARCHETYPES } from './enemies.js?v=10'

export const FIRE_COOLDOWN_MS = 333
export const PROJECTILE_SPEED = 800          // world-units / sec
export const PROJECTILE_LIFETIME_MS = 1500   // ms
export const SINE_AMPLITUDE_PX = 2           // paper flutter ±2 px
export const SINE_PERIOD_MS = 400            // 0.4 s

/**
 * Pure helper: compute the projectile's velocity vector from origin screen point to
 * the target iso coord's screen position, normalized to PROJECTILE_SPEED.
 * @returns {{vx:number, vy:number, dist:number}}
 */
export function projectVelocity(originScreen, targetScreen) {
  const dx = targetScreen.x - originScreen.x
  const dy = targetScreen.y - originScreen.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return { vx: 0, vy: 0, dist: 0 }
  return { vx: (dx / dist) * PROJECTILE_SPEED, vy: (dy / dist) * PROJECTILE_SPEED, dist }
}

class Projectile {
  constructor({ origin, target, isoX, isoY }) {
    this.origin = { ...origin }
    this.target = { ...target }
    this.isoX = isoX
    this.isoY = isoY
    this.elapsedMs = 0
    this.alive = true
    this.hit = false  // resolves hit synchronously on spawn (Combat.fireAtIso)

    // Visual: PIXI.Graphics — cream 4x6 rectangle + 1 px black outline + diagonal signature line
    this.gfx = new PIXI.Graphics()
    this._redraw()
    this.gfx.x = origin.x
    this.gfx.y = origin.y
  }

  _redraw() {
    const g = this.gfx
    g.clear()
    // 1 px black outline
    g.lineStyle(1, 0x111111, 1)
    g.beginFill(0xfff5d6, 1)  // cream
    g.drawRect(-2, -3, 4, 6)
    g.endFill()
    // diagonal signature
    g.lineStyle(1, 0x2a4d8f, 1)
    g.moveTo(-1, 1)
    g.lineTo(1, -1)
  }

  /**
   * Advance one frame.
   * @param {number} dtMs
   * @param {{x:number, y:number}} frustumMin
   * @param {{x:number, y:number}} frustumMax
   * @returns {boolean} true if still alive
   */
  tick(dtMs, frustumMin, frustumMax) {
    if (!this.alive) return false
    this.elapsedMs += dtMs
    const dtSec = dtMs / 1000
    // straight-line motion toward target
    const { vx, vy, dist } = projectVelocity(this.origin, this.target)
    const moveX = vx * dtSec
    const moveY = vy * dtSec
    this.gfx.x += moveX
    this.gfx.y += moveY
    // sine flutter perpendicular to travel axis
    if (dist > 0) {
      const nx = -((this.target.y - this.origin.y) / dist)
      const ny = (this.target.x - this.origin.x) / dist
      const phase = (this.elapsedMs / SINE_PERIOD_MS) * Math.PI * 2
      const offset = Math.sin(phase) * SINE_AMPLITUDE_PX
      this.gfx.x += nx * offset * (dtMs / 16.6667)  // sine is dt-independent; render at every frame
      this.gfx.y += ny * offset * (dtMs / 16.6667)
    }
    // despawn conditions
    if (this.elapsedMs >= PROJECTILE_LIFETIME_MS) return this._kill()
    if (this.gfx.x < frustumMin.x || this.gfx.x > frustumMax.x) return this._kill()
    if (this.gfx.y < frustumMin.y || this.gfx.y > frustumMax.y) return this._kill()
    return true
  }

  _kill() {
    this.alive = false
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx)
    this.gfx.destroy()
    return false
  }
}

export class Combat {
  /**
   * @param {Object} opts
   * @param {PIXI.Container} opts.scene        hud/world container to mount projectile gfx
   * @param {Object} opts.isoWorld             IsoWorld instance (camera-aware inverse)
   * @param {{isoX:number, isoY:number}=} opts.cameraIso  camera iso position { isoX, isoY }
   * @param {{x:number,y:number}} opts.viewportCenter   for screenToIsoWithCamera
   * @param {EventTarget} [opts.eventBus]      unused; singleton eventBus is used
   * @param {{onHit:Function, onMiss:Function, onFire:Function}} [opts.callbacks]  optional
   *        direct callbacks (used by tests; production goes through eventBus)
   * @param {Object} [opts.score]              Score instance — Combat delegates addHit here
   * @param {Object} [opts.enemies]            EnemyManager — Combat reads readAll() for hits
   * @param {{x:number, y:number}} [opts.viewportSize]   canvas viewport size (for frustum)
   * @param {number} [opts.tileSize]
   * @param {{x:number, y:number}} [opts.tileWorldOrigin]
   * @param {number} [opts.frustumMarginTiles=1]
   */
  constructor(opts) {
    if (!opts || !opts.scene || !opts.isoWorld) {
      throw new Error('Combat requires scene and isoWorld')
    }
    this.scene = opts.scene
    this.isoWorld = opts.isoWorld
    this.cameraIso = opts.cameraIso ?? { isoX: 0, isoY: 0 }
    this.viewportCenter = opts.viewportCenter ?? { x: 0, y: 0 }
    this.score = opts.score ?? null
    this.enemies = opts.enemies ?? null
    this.viewportSize = opts.viewportSize ?? { x: 1280, y: 720 }
    this.frustumMarginTiles = opts.frustumMarginTiles ?? 1
    this.callbacks = opts.callbacks ?? {}

    this._projectiles = []
    this._lastFireMs = -Infinity
    // For tests: `?test=1` sets this so simulated taps share the same clock as setTime().
    this.nowMs = () => performance.now()
  }

  /**
   * Set the camera iso position (called from main.js each frame).
   */
  setCameraIso(iso) { this.cameraIso = iso }

  setViewportSize(w, h) { this.viewportSize = { x: w, y: h } }

  setViewportCenter(c) { this.viewportCenter = c }

  /**
   * Set the function that returns current time in ms (used for cooldown + projectile lifetime).
   * Tests inject a 60Hz fixed clock here.
   */
  setClock(fn) { this.nowMs = fn }

  /**
   * Fire a papeleta toward the iso target.
   * @param {number} isoX
   * @param {number} isoY
   * @param {{x:number,y:number}} originScreen   hand sprite screen position
   * @param {{bypassCooldown?:boolean}=} [opts]  if true, skips cooldown (used by tests)
   * @returns {{hit:boolean, enemyId:(string|null)}}
   */
  fireAtIso(isoX, isoY, originScreen, opts = {}) {
    const now = this.nowMs()
    if (!opts.bypassCooldown) {
      if ((now - this._lastFireMs) < FIRE_COOLDOWN_MS) {
        return { hit: false, enemyId: null }   // silent drop
      }
    }
    this._lastFireMs = now

    emit('combat:fire', { isoX, isoY, sourceScreen: { ...originScreen } })
    if (this.callbacks.onFire) this.callbacks.onFire(isoX, isoY, originScreen)

    // Resolve hit synchronously (footprint AABB + reverse-depth)
    const target = this._resolveHit(isoX, isoY)
    const targetScreen = this.isoWorld.isoToScreen(isoX, isoY)

    // Spawn projectile (visual)
    const proj = new Projectile({
      origin: { x: originScreen.x, y: originScreen.y },
      target: { x: targetScreen.sx, y: targetScreen.sy },
      isoX, isoY,
    })
    this.scene.addChild(proj.gfx)
    proj.hit = target != null
    this._projectiles.push(proj)

    if (target) {
      const result = target.applyHit(1)
      const mult = ARCHETYPES[target.archetype].multiplier
      const scoreDelta = Math.round(10 * mult)
      const firmasDelta = 1
      emit('combat:hit', {
        enemyId: target.id,
        hpRemaining: result.hpRemaining,
        archetype: target.archetype,
        damage: 1,
        scoreDelta,
        firmasDelta,
      })
      if (this.score) this.score.addHit(mult)
      if (result.destroyed) {
        emit('enemy:destroyed', {
          enemyId: target.id,
          archetype: target.archetype,
          score: scoreDelta,
          firmas: firmasDelta,
        })
      }
      if (this.callbacks.onHit) this.callbacks.onHit(target.id, result.hpRemaining, target.archetype)
      return { hit: true, enemyId: target.id }
    } else {
      emit('combat:miss', { isoX, isoY })
      if (this.callbacks.onMiss) this.callbacks.onMiss(isoX, isoY)
      return { hit: false, enemyId: null }
    }
  }

  /**
   * Pure hit-resolution: read enemies, collect footprint-AABB candidates, sort by depth desc
   * (tie-break: id asc).
   * @private
   */
  _resolveHit(isoX, isoY) {
    if (!this.enemies) return null
    const all = this.enemies._live?.() ?? null
    if (!all) return null

    const candidates = []
    for (const enemy of all) {
      if (enemy.state !== 'alive') continue
      const fp = ARCHETYPES[enemy.archetype].footprint
      if (Math.abs(enemy.isoX - isoX) <= fp.hw && Math.abs(enemy.isoY - isoY) <= fp.hh) {
        candidates.push(enemy)
      }
    }
    if (candidates.length === 0) return null
    candidates.sort((a, b) => {
      const da = a.isoX + a.isoY
      const db = b.isoX + b.isoY
      if (da !== db) return db - da                  // depth desc
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0  // id asc
    })
    return candidates[0]
  }

  /**
   * Per-frame update — advance all live projectiles.
   * @param {number} dtMs
   */
  update(dtMs) {
    const margin = this.frustumMarginTiles * (this.isoWorld.tileSize ?? 64)
    const min = { x: -margin, y: -margin }
    const max = { x: this.viewportSize.x + margin, y: this.viewportSize.y + margin }
    const next = []
    for (const p of this._projectiles) {
      if (p.tick(dtMs, min, max)) next.push(p)
    }
    this._projectiles = next
  }

  /** Wipe all live projectiles. Used by Reintentar. */
  reset() {
    for (const p of this._projectiles) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx)
      p.gfx.destroy()
    }
    this._projectiles = []
    this._lastFireMs = -Infinity
  }

  /** Read-only snapshot for __gameTestAPI__.getProjectiles() */
  readProjectiles() {
    return Object.freeze(this._projectiles.map(p => ({
      isoX: p.isoX,
      isoY: p.isoY,
      elapsedMs: p.elapsedMs,
      x: p.gfx.x,
      y: p.gfx.y,
      hit: p.hit,
      alive: p.alive,
    })))
  }
}
