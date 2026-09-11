/**
 * src/combat.js
 *
 * Combat orchestration (F3 combat-core spec + F4d papeleta sprite).
 *
 * Owns:
 *   - Projectile pool (F4d: PIXI.Sprite papeleta_firmada.png, 20x24 RGBA;
 *     fallback to PIXI.Graphics procedural if the texture fails to load)
 *   - Cooldown gate (F4d: 200 ms, was 333 ms in F3 — ~40% faster fire rate)
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
import { emit } from './event-bus.js?v=34'
import { ARCHETYPES } from './enemies.js?v=29'
import { LOGICAL_W, LOGICAL_H } from './canvas.js?v=29'

export const FIRE_COOLDOWN_MS = 200          // F4d: was 333 (F3) — ~40% faster fire rate
export const PROJECTILE_SPEED = 2400         // F4f: was 800 (F3-F4d) — 3x faster per user request
export const PROJECTILE_LIFETIME_MS = 1500   // ms (fallback if a projectile never reaches its target)
export const SINE_AMPLITUDE_PX = 4           // F4f: was 2 — paper flutter ±4 px (proportional to bigger sprite)
export const SINE_PERIOD_MS = 400            // 0.4 s
const ARRIVAL_EPSILON_PX_SQ = 4 * 4         // F4g: despawn projectile when within 4 px of its target screen position
const PAPELETA_TEX_URL = 'assets/sprites/papeleta_firmada.png'

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
  constructor({ origin, target, isoX, isoY, texture }) {
    this.origin = { ...origin }
    this.target = { ...target }
    this.isoX = isoX
    this.isoY = isoY
    this.elapsedMs = 0
    this.alive = true
    this.hit = false  // resolves hit synchronously on spawn (Combat.fireAtIso)

    // F4d: prefer the papeleta_firmada sprite (20x24 RGBA, generated via tools/generate-papeleta-firmada.py).
    // Fallback to PIXI.Graphics procedural if the texture is missing or still loading.
    if (texture) {
      this.gfx = new PIXI.Sprite(texture)
      this.gfx.anchor.set(0.5, 0.5)
    } else {
      // Fallback: PIXI.Graphics — cream 4x6 rectangle + 1 px black outline + diagonal signature line
      this.gfx = new PIXI.Graphics()
      this._redrawGraphics()
    }
    this.gfx.x = origin.x
    this.gfx.y = origin.y
  }

  _redrawGraphics() {
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
    // F4g: kill when the projectile reaches (or passes) its target. The hit
    // was already resolved synchronously in Combat.fireAtIso, so this is a
    // visual despawn cue — the sprite disappears at the impact point instead
    // of continuing to fly until lifetime or frustum exit.
    const dx = this.gfx.x - this.target.x
    const dy = this.gfx.y - this.target.y
    if (dx * dx + dy * dy < ARRIVAL_EPSILON_PX_SQ) return this._kill()
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
    this.viewportSize = opts.viewportSize ?? { x: LOGICAL_W, y: LOGICAL_H }
    this.frustumMarginTiles = opts.frustumMarginTiles ?? 1
    this.callbacks = opts.callbacks ?? {}

    this._projectiles = []
    this._lastFireMs = -Infinity
    // For tests: `?test=1` sets this so simulated taps share the same clock as setTime().
    this.nowMs = () => performance.now()

    // F4d: lazy-load the papeleta_firmada sprite. Fire-and-forget — the first few
    // Projectile instances may spawn before the texture is ready and fall back to
    // the PIXI.Graphics procedural rendering. By the time the player is actively
    // firing (boot + first frame), the texture is ready.
    this._papeletaTex = null
    if (typeof PIXI !== 'undefined' && PIXI.Assets && typeof PIXI.Assets.load === 'function') {
      PIXI.Assets.load(PAPELETA_TEX_URL)
        .then(tex => {
          if (tex && tex.baseTexture) tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
          this._papeletaTex = tex
        })
        .catch(err => {
          console.warn('[Combat] papeleta_firmada texture failed to load, falling back to procedural Graphics:', err?.message ?? err)
        })
    }
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
    // Camera-aware: origin (hand) and projectile gfx both use SCREEN coords
    // (hudContainer is in the HUD canvas, not the world canvas), so the target
    // must also be in screen coords. `isoWorld.isoToScreen` returns container-
    // internal world coords anchored at tileWorldOrigin — mixing those with
    // screen-coord origin is the projectile-direction bug. Use the camera-aware
    // variant: target = isoToScreen(ix, iy) + container.position
    //                          = isoToScreen(ix, iy) + viewOrigin - isoToScreen(camIso)
    const targetScreen = this.isoWorld.isoToScreenWithCamera(isoX, isoY, this.cameraIso, this.viewportCenter)

    // Spawn projectile (visual)
    const proj = new Projectile({
      origin: { x: originScreen.x, y: originScreen.y },
      target: { x: targetScreen.sx, y: targetScreen.sy },
      isoX, isoY,
      texture: this._papeletaTex,
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
