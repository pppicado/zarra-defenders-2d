/**
 * src/enemies.js
 *
 * Enemy archetypes + Enemy + EnemyManager (F3 enemy-archetypes spec).
 *
 * Archetype table — F3.5 widened footprints:
 *   standard    : HP 1,  multiplier 1,   footprint hw=1.0 hh=1.0, flash 200 ms
 *   tank        : HP 3,  multiplier 1.5, footprint hw=1.2 hh=1.2, flash 200 ms
 *   'mini-boss' : HP 10, multiplier 2,   footprint hw=1.5 hh=1.5, flash 200 ms
 *   boss        : HP 30, multiplier 3,   footprint hw=2.0 hh=2.0, flash 200 ms
 *
 * F3.5: footprints enlarged from the original 0.5x0.5 / 0.7x0.7. At tileSize=128,
 * a 0.5 footprint = 64px hittable area, which required pixel-perfect clicks.
 * 1.0 footprint = 128px, matching the visible sprite size, so any click on or
 * near the visible enemy counts as a hit.
 *
 * dron_fumigador -> tank (locked by user 2026-09-07).
 *
 * Escape detection (F3.2): Manhattan distance from enemy to camera > 6 tiles.
 * Enemies are static in F3 (no movement); only the camera moves.
 *
 * Fase-5 REQ-CMB-008: added screen-space escape test that fires when the enemy
 * projects below `viewportSize.y + SOUTH_MARGIN_PX`. Combined with the
 * Manhattan fallback so off-axis escapes still work.
 */
import { emit } from './event-bus.js?v=44'
import { TILE_SIZE, LOGICAL_W } from './canvas.js?v=44'

/**
 * ~1 tile visual warning (REQ-CMB-008); 0.6 tile/s × 32 px ≈ 0.5 s buffer.
 * The south margin gives the player a brief moment to react before integrity
 * drains, instead of the enemy vanishing the instant the camera passes south.
 */
export const SOUTH_MARGIN_PX = 32

// ============================================================================
// Fase-5 (REQ-CMB-009 + REQ-CMB-010) — per-instance enemy movement
// ============================================================================

/**
 * Lateral screen-space clamp bounds (REQ-CMB-010). Mobile enemies whose
 * projected screen X falls outside `[LATERAL_MIN_PX, LATERAL_MAX_PX]` get
 * their iso X velocity reflected and snapped to the bound. Static enemies
 * never reach the clamp branch (their tick returns early).
 */
export const LATERAL_MIN_PX = 80
export const LATERAL_MAX_PX = LOGICAL_W - 80

/**
 * Movement-pattern math constants. Module-private — exposed for tests but
 * not part of the public API.
 *
 * Linear / sine / zigzag / arc pattern amplitudes and frequencies are tuned
 * so that mobile sprites feel responsive without leaving the corridor too
 * quickly. SINE_AMP = 0.6 means the perpendicular sway magnitude is 60% of
 * the per-tick advance — enough to see motion, small enough to stay in the
 * 80 px..viewportW-80 px clamp corridor.
 */
export const SINE_AMP = 0.6
export const SINE_FREQ_HZ = 1.0
export const ZIGZAG_AMP = 0.4
export const ZIGZAG_PERIOD_MS = 1000
export const ARC_RADIUS = 0.8
export const ARC_OMEGA = 0.6

/**
 * Sprite IDs that MUST stay static (REQ-CMB-009 hard rule). Apparent motion
 * comes from camera-induced tile scrolling only. Spawns that try to override
 * `speed` / `movementPattern` for these sprite IDs are silently downgraded
 * to `speed: 0, movementPattern: 'static'`.
 */
export const STATIC_SPRITE_IDS = Object.freeze(new Set([
  'enemies_valla_publicitaria',
  'enemies_billboard_nuclear',
  'enemies_billboard_sewer',
  'enemies_billboard_corporate',
  'enemies_signage_hotel',
  'enemies_signage_factory',
  'enemies_signage_office',
  'enemies_incineradora',
  'enemies_planta_treco',
  'enemies_sello_burocratico',
  'enemies_castillo_cofrentes',
]))

/**
 * Default per-mobile-spriteId movement config (REQ-CMB-009). When a spawn
 * definition omits `speed` / `movementPattern`, these defaults are applied
 * UNLESS the spriteId is in STATIC_SPRITE_IDS.
 */
export const MOBILE_DEFAULT = Object.freeze({
  enemies_dron_fumigador:           Object.freeze({ speed: 70, movementPattern: 'sine' }),
  enemies_camion_treco:             Object.freeze({ speed: 50, movementPattern: 'zigzag' }),
  enemies_topadora:                 Object.freeze({ speed: 40, movementPattern: 'linear' }),
  enemies_bidon_lixiviado:          Object.freeze({ speed: 35, movementPattern: 'arc' }),
  enemies_camion_cisterna_residuos: Object.freeze({ speed: 30, movementPattern: 'linear' }),
  enemies_trailer:                  Object.freeze({ speed: 45, movementPattern: 'zigzag' }),
  enemies_tubo_lixiviado:           Object.freeze({ speed: 25, movementPattern: 'sine' }),
  enemies_bolsa_plastico:           Object.freeze({ speed: 60, movementPattern: 'sine' }),
})

/**
 * Resolve the effective `speed` / `movementPattern` for a spawn def.
 *
 * Static spriteIds always resolve to `0` / `'static'` (hard rule).
 * Mobile spriteIds default to MOBILE_DEFAULT[spriteId] when the caller
 * OMITS the field — but the resolver MUST distinguish "user omitted"
 * (undefined) from "user explicitly chose 0/'static'". The caller MUST
 * NOT pre-default params to `0` / `'static'` at the constructor level,
 * because that short-circuits this resolver before MOBILE_DEFAULT can
 * apply and every mobile spriteId would spawn static.
 *
 * Rules (REQ-CMB-009):
 *   - `userSpeed`   = `speed` when `typeof speed === 'number' && Number.isFinite(speed)`,
 *                     else `null` (undefined / NaN / non-number).
 *   - `userPattern` = `pattern` when `typeof pattern === 'string'`,
 *                     else `null`.
 *   - `effSpeed   = userSpeed   ?? MOBILE_DEFAULT[spriteId]?.speed   ?? 0`
 *   - `effPattern = userPattern ?? MOBILE_DEFAULT[spriteId]?.movementPattern ?? 'static'`
 *
 * Single source of truth: this resolver. Callers pass through what they
 * received (no destructuring defaults).
 */
export function resolveMovementConfig(spriteId, speed, pattern) {
  const sid = spriteId ?? null
  if (sid && STATIC_SPRITE_IDS.has(sid)) {
    return { speed: 0, movementPattern: 'static' }
  }
  const defaults = sid ? MOBILE_DEFAULT[sid] : null
  const userSpeed = (typeof speed === 'number' && Number.isFinite(speed))
    ? speed
    : null
  const userPattern = (typeof pattern === 'string')
    ? pattern
    : null
  const effSpeed = userSpeed ?? defaults?.speed ?? 0
  const effPattern = userPattern ?? defaults?.movementPattern ?? 'static'
  return { speed: effSpeed, movementPattern: effPattern }
}

export const ARCHETYPES = Object.freeze({
  // F4f: footprints widened on the iso-sum axis (hh) to cover the full vertical
  // extent of the visible sprite. Each enemy sprite is anchored at bottom-center
  // (0.5, 1.0) and offset by `southOffset = tileSize / √2` upward from the iso
  // center, so the visible sprite extends ~1 tile ABOVE the iso cell. The F3.5
  // footprints (1.0/1.0 standard, up to 2.0/2.0 boss) only captured the bottom
  // half of the sprite — clicking on the visible sprite body missed the AABB
  // and the projectile whiffed. Widening hh to ~2.5 tiles makes the hit box
  // cover the sprite from iso center up to the sprite top.
  //
  // F5 (REQ-CMB-006): per-archetype `hitInset` shrinks the screen-space AABB
  // before hit testing, so transparent-padding clicks miss. Values match the
  // spec (16/12/10/8 px) — tighter for the larger archetypes because they have
  // proportionally less transparent margin around the visible body.
  standard:    Object.freeze({ hp: 1,  multiplier: 1,   footprint: Object.freeze({ hw: 1.5, hh: 2.5 }), flashMs: 200, hitInset: Object.freeze({ top: 16, right: 16, bottom: 16, left: 16 }) }),
  tank:        Object.freeze({ hp: 3,  multiplier: 1.5, footprint: Object.freeze({ hw: 1.7, hh: 2.7 }), flashMs: 200, hitInset: Object.freeze({ top: 12, right: 12, bottom: 12, left: 12 }) }),
  'mini-boss': Object.freeze({ hp: 10, multiplier: 2,   footprint: Object.freeze({ hw: 2.0, hh: 3.0 }), flashMs: 200, hitInset: Object.freeze({ top: 10, right: 10, bottom: 10, left: 10 }) }),
  boss:        Object.freeze({ hp: 30, multiplier: 3,   footprint: Object.freeze({ hw: 2.5, hh: 3.5 }), flashMs: 200, hitInset: Object.freeze({ top: 8,  right: 8,  bottom: 8,  left: 8  }) }),
})

export const ARCHETYPE_IDS = Object.freeze(Object.keys(ARCHETYPES))

export class ConfigError extends Error {}

/**
 * Validate that an archetype id is in the locked table. Throws ConfigError otherwise.
 *
 * F5 (REQ-CMB-006): also validates that the archetype's `hitInset` is present
 * and that every side (top/right/bottom/left) is a finite number. This keeps
 * the single source of truth honest — Enemy.getScreenBounds() reads
 * `ARCHETYPES[name].hitInset` on every hit test, so a missing or malformed
 * entry would silently break hit detection without surfacing an error.
 */
export function assertArchetype(name) {
  if (!ARCHETYPES[name]) {
    throw new ConfigError(`Unknown archetype "${name}" — must be one of ${ARCHETYPE_IDS.join(', ')}`)
  }
  const def = ARCHETYPES[name]
  if (!def.hitInset) {
    throw new ConfigError(`Archetype "${name}" is missing required "hitInset" — { top, right, bottom, left } expected`)
  }
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const v = def.hitInset[side]
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new ConfigError(`Archetype "${name}".hitInset.${side} must be a finite number, got ${v}`)
    }
  }
}

let _idCounter = 0
function _nextId() { return `e${String(++_idCounter).padStart(3, '0')}` }

export class Enemy {
  /**
   * @param {Object} opts
   * @param {string} [opts.id]                       auto-generated if omitted
   * @param {keyof ARCHETYPES} opts.archetype
   * @param {number} opts.isoX
   * @param {number} opts.isoY
   * @param {string} [opts.spriteId]
   * @param {number} [opts.speed]                    iso-units/sec. NOT pre-defaulted
   *        to 0 here — resolver (REQ-CMB-009) is the single source of truth for
   *        effective config. Passing `undefined` lets MOBILE_DEFAULT apply.
   * @param {'static'|'linear'|'sine'|'zigzag'|'arc'} [opts.movementPattern]
   *        NOT pre-defaulted to 'static' here — same reason as speed.
   */
  constructor({ id, archetype, isoX, isoY, spriteId, speed, movementPattern }) {
    assertArchetype(archetype)
    this.id = id ?? _nextId()
    this.archetype = archetype
    this.isoX = isoX
    this.isoY = isoY
    this.spriteId = spriteId ?? null
    this.hp = ARCHETYPES[archetype].hp
    this.state = 'alive'   // 'alive' | 'destroyed'
    this._destroyedAt = 0  // performance.now() ms when transitioned to destroyed
    // Fase-5 (REQ-CMB-009): resolve effective movement config (handles the
    // static-spriteId hard rule and per-spriteId defaults). Speed and
    // movementPattern are passed through undefined when omitted so the
    // resolver can distinguish "user omitted" from "user chose 0/static".
    const resolved = resolveMovementConfig(spriteId, speed, movementPattern)
    this.speed = resolved.speed
    this.movementPattern = resolved.movementPattern
    // Internal timing + arc center for parametric patterns.
    this._elapsedMs = 0
    this._arcCenter = null
    this._spawnIsoY = isoY        // captured for sine/zigzag oscillation reference
    // Velocity cache for lateral-clamp reflection (REQ-CMB-010). Signed
    // advance along isoX — positive means "advance toward rail end".
    this._vxIso = 0
  }

  /**
   * Apply a hit. Damage is fixed at 1 per spec.
   * @returns {{ hpRemaining:number, destroyed:boolean }}
   */
  applyHit(damage = 1) {
    if (this.state !== 'alive') return { hpRemaining: this.hp, destroyed: false }
    this.hp = Math.max(0, this.hp - damage)
    const destroyed = this.hp === 0
    if (destroyed) this.markDestroyed()
    return { hpRemaining: this.hp, destroyed }
  }

  /** Transition to destroyed (idempotent). Records destruction timestamp. */
  markDestroyed() {
    if (this.state === 'destroyed') return
    this.state = 'destroyed'
    this._destroyedAt = performance.now()
  }

  /**
   * F5 (REQ-CMB-003 + REQ-CMB-006): screen-space AABB of an enemy's visible
   * sprite, in logical canvas px. Used by Combat._resolveHitAtScreenPoint as
   * the single source of truth for hit testing — and by DebugHitboxes to
   * draw the overlay rectangle.
   *
   *   - When the enemy has a sprite (texture was preloaded), uses
   *     `sprite.getBounds()` — PIXI's post-translate, post-scale, post-anchor
   *     world AABB. This already accounts for DPR, tileSize, and the world-
   *     container translation. Returns it as `{x,y,w,h}`.
   *   - When `enemy.sprite === null` (texture failed to load / unknown spriteId),
   *     falls back to a default AABB centered at
   *     `isoToScreenWithCamera(enemy.isoX, enemy.isoY) ± tileSize/2`.
   *
   * Both branches return the SAME shrunk AABB after applying the archetype's
   * `hitInset` (REQ-CMB-006). The combat resolver and the debug overlay see
   * one source of truth — when hitInset changes, both update.
   *
   * @param {Enemy} enemy
   * @param {Object} isoWorld   IsoWorld (for isoToScreenWithCamera fallback)
   * @param {{isoX:number, isoY:number}} cameraIso  current camera iso position
   * @param {{x:number, y:number}} viewportCenter  same as isoWorld._viewOrigin
   * @returns {{x:number, y:number, w:number, h:number}}
   */
  static getScreenBounds(enemy, isoWorld, cameraIso, viewportCenter) {
    let raw
    if (enemy.sprite) {
      const b = enemy.sprite.getBounds()
      raw = { x: b.x, y: b.y, w: b.width, h: b.height }
    } else {
      // Sprite null — fallback to iso-projected default AABB.
      const screen = isoWorld.isoToScreenWithCamera(enemy.isoX, enemy.isoY, cameraIso, viewportCenter)
      const half = TILE_SIZE / 2
      raw = {
        x: screen.sx - half,
        y: screen.sy - half,
        w: TILE_SIZE,
        h: TILE_SIZE,
      }
    }
    // F5 (REQ-CMB-006): shrink by the archetype's hitInset so transparent-
    // padding clicks miss. Use the locked table value; assertArchetype()
    // already guarantees the archetype exists at construction time.
    const ins = ARCHETYPES[enemy.archetype]?.hitInset ?? { top: 0, right: 0, bottom: 0, left: 0 }
    return {
      x: raw.x + ins.left,
      y: raw.y + ins.top,
      w: Math.max(0, raw.w - ins.left - ins.right),
      h: Math.max(0, raw.h - ins.top - ins.bottom),
    }
  }

  /**
   * Has the 200 ms post-destruction window elapsed?
   * @param {number} now  performance.now() in ms
   */
  isExpired(now) {
    if (this.state !== 'destroyed') return false
    return (now - this._destroyedAt) >= 200
  }

  // ==========================================================================
  // Fase-5 (REQ-CMB-009 + REQ-CMB-010): per-instance self-translation
  // ==========================================================================

  /**
   * Per-tick self-translation. Static pattern returns early (O(1)).
   * Mobile patterns mutate `this.isoX` / `this.isoY` in place and are then
   * projected to screen-space via `_lateralClamp` so they stay inside the
   * `[LATERAL_MIN_PX, LATERAL_MAX_PX]` corridor.
   *
   * Camera iso is unused here (the enemy self-translates in WORLD iso, not
   * relative to the camera). It's accepted as part of the tick contract so
   * future camera-aware patterns can plug in without changing the call site.
   *
   * @param {number} dtMs            delta time in milliseconds
   * @param {{isoX:number, isoY:number}} [cameraIso]   current camera iso (unused for now)
   * @param {{minX:number, maxX:number}} [viewportBounds] lateral screen-bounds clamp
   * @param {Object} [isoWorld]      IsoWorld (needed by _lateralClamp for projection)
   * @param {{x:number, y:number}} [viewportCenter]   same as isoWorld._viewOrigin
   */
  tick(dtMs, cameraIso = null, viewportBounds = null, isoWorld = null, viewportCenter = null) {
    if (this.state !== 'alive') return
    if (this.movementPattern === 'static') return
    if (!Number.isFinite(dtMs) || dtMs <= 0) return

    this._elapsedMs += dtMs
    const dtSec = dtMs / 1000
    const pattern = this.movementPattern
    const speed = this.speed

    // The camera advances along the iso-sum axis (0,0) → (36,36). Enemies
    // advance in the same direction so they "approach the camera" from the
    // player's POV (their projected screen position drifts down-and-toward).
    // dir = (1, 1) / √2  in iso units.
    const dx = 0.7071067811865475 * speed * dtSec
    const dy = 0.7071067811865475 * speed * dtSec

    if (pattern === 'linear') {
      this.isoX += dx
      this.isoY += dy
      this._vxIso = +dx
    } else if (pattern === 'sine') {
      // Linear advance on isoX; isoY oscillates around SPAWN isoY (REQ-CMB-009
      // scenario: "oscillates around its spawn isoY"). Amplitude scales with
      // speed so faster drons sway more visibly, but stays bounded enough to
      // keep the enemy inside the lateral corridor.
      this.isoX += dx
      const omega = 2 * Math.PI * SINE_FREQ_HZ
      const ampIso = SINE_AMP * speed * 0.05      // empirical: speed=70 → amp≈2.1
      this.isoY = this._spawnIsoY + ampIso * Math.sin(this._elapsedMs * 0.001 * omega)
      this._vxIso = +dx
    } else if (pattern === 'zigzag') {
      // Linear advance on isoX; isoY sways between ±ampIso around SPAWN isoY
      // using a triangle wave that flips sign every ZIGZAG_PERIOD_MS.
      this.isoX += dx
      const ampIso = ZIGZAG_AMP * speed * 0.05
      const phase = (this._elapsedMs % (2 * ZIGZAG_PERIOD_MS)) / ZIGZAG_PERIOD_MS
      const sign = phase < 1 ? 1 : -1
      const ramp = phase < 1 ? phase : (2 - phase)   // 0..1 triangle wave
      this.isoY = this._spawnIsoY + sign * ampIso * ramp
      this._vxIso = +dx
    } else if (pattern === 'arc') {
      // Parametric around `_arcCenter` (captured at first tick). ix = cx + r*cos(ωt),
      // iy = cy + r*sin(ωt). No linear advance; radius is constant.
      if (!this._arcCenter) {
        this._arcCenter = { isoX: this.isoX - ARC_RADIUS, isoY: this.isoY }
      }
      const omega = ARC_OMEGA
      const phase = this._elapsedMs * 0.001 * omega
      this.isoX = this._arcCenter.isoX + ARC_RADIUS * Math.cos(phase)
      this.isoY = this._arcCenter.isoY + ARC_RADIUS * Math.sin(phase)
      this._vxIso = -ARC_RADIUS * omega * Math.sin(phase) * 0.001
    }

    // Apply lateral screen-bounds clamp (REQ-CMB-010). Skipped if no
    // isoWorld was provided (test harness may not always supply one).
    if (viewportBounds && isoWorld) {
      this._lateralClamp(isoWorld, cameraIso, viewportBounds, viewportCenter)
    }
  }

  /**
   * Project current isoX/isoY to screen space; if the projected screen X
   * falls outside `[viewportBounds.minX, viewportBounds.maxX]`, snap isoX so
   * the projected sx sits at the bound AND reflect `_vxIso` so the next tick
   * moves back into the corridor. Only mobile enemies reach this branch
   * (static pattern short-circuits in tick).
   *
   * @param {Object} isoWorld           IsoWorld (provides isoToScreenWithCamera)
   * @param {{isoX:number, isoY:number}} cameraIso
   * @param {{minX:number, maxX:number}} viewportBounds
   * @param {{x:number, y:number}} viewportCenter
   */
  _lateralClamp(isoWorld, cameraIso, viewportBounds, viewportCenter) {
    const vc = viewportCenter ?? { x: LOGICAL_W / 2, y: 360 }
    const camIso = cameraIso ?? { isoX: 0, isoY: 0 }
    const { sx, sy } = isoWorld.isoToScreenWithCamera(this.isoX, this.isoY, camIso, vc)

    if (sx < viewportBounds.minX) {
      // Walk isoX forward in small steps until projected sx sits at the bound.
      // Use the iso-projection X derivative: d(sx)/d(ix) ≈ step * 0.5 + step * 0.5
      // — derived from isoToScreenWithCamera; in practice the camera-anchored
      // projection has d(sx)/d(ix) ≈ TILE_SIZE / √2 / 2 with a small camIso
      // contribution. We approximate with a constant step to keep this O(1).
      const step = TILE_SIZE / Math.SQRT2
      const dIsoX = (viewportBounds.minX - sx) / step
      this.isoX += dIsoX
      // Reflect the velocity (we don't know the exact camIso sign — flip
      // the cache; next tick the pattern math recomputes it anyway).
      this._vxIso = -this._vxIso
    } else if (sx > viewportBounds.maxX) {
      const step = TILE_SIZE / Math.SQRT2
      const dIsoX = (viewportBounds.maxX - sx) / step
      this.isoX += dIsoX
      this._vxIso = -this._vxIso
    }
  }
}

/**
 * Iso-escape detection: returns true if the camera has moved PAST the enemy.
 *
 *   F3.2: Manhattan distance from enemy to camera > 6 tiles → escaped.
 *
 * Previous version used `enemy.depth < camera.depth` (iso-sum comparison),
 * which flagged perpendicular enemies (e.g. enemy at (3,2) with camera at
 * (2.7,2.7)) as escaped even though they were right next to the camera.
 * Manhattan distance > 6 tiles correctly captures "the camera has moved past
 * and is more than 6 tiles away in any direction".
 */
export function isEscaped(enemy, cameraIso) {
  const dx = Math.abs((enemy.isoX ?? 0) - (cameraIso.isoX ?? cameraIso.x ?? 0))
  const dy = Math.abs((enemy.isoY ?? 0) - (cameraIso.isoY ?? cameraIso.y ?? 0))
  return (dx + dy) > 6
}

/**
 * Fase-5 REQ-CMB-008: screen-space escape test. Projects the enemy to logical
 * canvas px via `isoWorld.isoToScreenWithCamera` (same math that Combat and
 * `Enemy.getScreenBounds` already use), then checks if it sits below the
 * viewport bottom + `SOUTH_MARGIN_PX`. Fires when the camera has moved south
 * past the enemy in screen space — common case is the visible enemy sliding
 * off the bottom of the viewport as the rail advances.
 *
 * This is the primary path for south-bound escapes; the iso Manhattan test
 * (`isEscaped`) remains as the off-axis fallback so enemies that drift
 * sideways out of the corridor still get cleaned up.
 *
 * @param {Object} enemy              Enemy or any object with `isoX`/`isoY`
 * @param {Object} isoWorld           IsoWorld (provides isoToScreenWithCamera)
 * @param {{isoX:number, isoY:number}} cameraIso  current camera iso position
 * @param {{x:number, y:number}} viewportCenter   same as isoWorld._viewOrigin
 * @param {{x:number, y:number}} viewportSize    logical canvas size
 * @returns {boolean}  true when the enemy's projected sy is below the south margin
 */
export function isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize) {
  const { sy } = isoWorld.isoToScreenWithCamera(
    enemy.isoX ?? 0, enemy.isoY ?? 0, cameraIso, viewportCenter,
  )
  return sy > viewportSize.y + SOUTH_MARGIN_PX
}

export class EnemyManager {
  /**
   * @param {Object} opts
   * @param {PIXI.Container} [opts.scene]      world/sprite container (optional; visual layer)
   * @param {Map<string,PIXI.Texture> [opts.textures]  preloaded enemy textures keyed by spriteId
   * @param {Function} [opts.rng]            seeded PRNG (mulberry32) — used only for non-combat visuals
   */
  constructor(opts = {}) {
    this.scene = opts.scene ?? null
    this.textures = opts.textures ?? new Map()
    this.rng = opts.rng ?? Math.random
    /** @type {Map<string, Enemy>} */
    this._enemies = new Map()
    /** @type {Array<Enemy>} spawn queue — definitions the manager will instantiate when matched */
    this._spawnQueue = []
    /** @type {Array<{atSec:number, def:Object}>} */
    this._timeGatedSpawns = []
  }

  /**
   * Queue a spawn definition. If `spawnTimeSec` is provided, def is gated to that time;
   * otherwise it spawns immediately when `update` is called.
   * @param {{id?:string, archetype:string, isoX:number, isoY:number, spriteId?:string, spawnTimeSec?:number}} def
   */
  spawn(def) {
    if (!def || typeof def.isoX !== 'number' || typeof def.isoY !== 'number') {
      throw new Error('EnemyManager.spawn requires def.isoX and def.isoY (numbers)')
    }
    if (def.spawnTimeSec != null) {
      this._timeGatedSpawns.push({ atSec: def.spawnTimeSec, def })
      return null
    }
    const enemy = new Enemy(def)
    this._createSpriteFor(enemy)
    this._enemies.set(enemy.id, enemy)
    return enemy
  }

  /**
   * Create a visual sprite for an enemy using the texture keyed by its spriteId.
   * If no texture is available, the enemy still spawns (state visible to game
   * logic) but has no graphical representation. Caller should still register
   * the enemy so escape / hit detection works.
   */
  _createSpriteFor(enemy) {
    if (!this.scene) return
    const tex = this.textures.get(enemy.spriteId)
    if (!tex) return
    const sprite = new PIXI.Sprite(tex)
    sprite.anchor.set(0.5, 0.5)  // F4g: centered on the iso cell, so the visible
                                  // sprite sits inside the AABB the player aims at.
                                  // The previous (0.5, 1.0) + southOffset placed
                                  // the sprite 1 tile ABOVE the iso center, so the
                                  // AABB and the visible sprite didn't overlap.
    // F4g: source textures are 512x512 (asset-pipeline generation); at 720p that
    // leaves most of the sprite off-screen. Normalize to TILE_SIZE so the sprite
    // visually matches one iso tile regardless of source resolution.
    const baseSize = Math.max(tex.width, tex.height) || 512
    sprite.scale.set(TILE_SIZE / baseSize)
    sprite.x = enemy.isoX
    sprite.y = enemy.isoY
    enemy.sprite = sprite
    this.scene.addChild(sprite)
  }

  /**
   * Bulk-load a deterministic level (e.g. TEST_LEVEL.enemies).
   * @param {Array<Object>} defs
   */
  loadLevel(defs) {
    this.reset()
    for (const def of defs) this.spawn(def)
  }

  /** @returns {Enemy|null} */
  get(id) { return this._enemies.get(id) ?? null }

  /** @returns {Enemy[]} frozen shallow snapshot */
  readAll() {
    return Object.freeze([...this._enemies.values()].map(e => ({
      id: e.id,
      archetype: e.archetype,
      isoX: e.isoX,
      isoY: e.isoY,
      spriteId: e.spriteId,
      hp: e.hp,
      state: e.state,
    })))
  }

  /** @returns {Array<Enemy>} mutable reference for in-frame iteration */
  _live() { return [...this._enemies.values()] }

  /**
   * Return alive enemies as `{ def, sprite }` records for IsoWorld's
   * vertical-sprite layout. `def` carries isoX/isoY/archetype for IsoWorld
   * to compute screen position; `sprite` is the PIXI.Sprite created at spawn.
   * Falsy sprites are filtered (texture unavailable).
   */
  getAliveSprites() {
    const out = []
    for (const e of this._live()) {
      if (!e.sprite) continue
      if (e.state !== 'alive') continue
      out.push({ def: e, sprite: e.sprite })
    }
    return out
  }

  remove(enemyId) { return this._enemies.delete(enemyId) }

  /**
   * Per-frame tick:
   *   0. (NEW Fase-5) Advance self-translation for every live mobile enemy.
   *   1. Materialize any time-gated spawns whose time has arrived.
   *   2. Evaluate escape for every live enemy.
   *   3. Garbage-collect destroyed enemies whose 200 ms animation window expired.
   *
   * Fase-5 (REQ-CMB-008): when the optional `isoWorld`/`viewportCenter`/
   * `viewportSize` are supplied, the screen-space escape test runs first
   * (south-bound slide-off) and is OR'd with the iso Manhattan fallback.
   * Old callers (no extra args) keep working with the Manhattan-only path.
   *
   * Fase-5 (REQ-CMB-009 + REQ-CMB-010): step 0 advances every live mobile
   * enemy's isoX/isoY through Enemy.tick() and applies the lateral clamp.
   * Static enemies early-return from tick in O(1) — no observable change vs F4b.
   *
   * @param {number} dtMs                delta time in milliseconds
   * @param {{isoX:number, isoY:number}} cameraIso  current camera iso position
   * @param {number} [elapsedSec]        current simulation time (used for time-gated spawns)
   * @param {Object} [isoWorld]          IsoWorld (enables screen-space escape test)
   * @param {{x:number, y:number}} [viewportCenter]   same as isoWorld._viewOrigin
   * @param {{x:number, y:number}} [viewportSize]     logical canvas size
   * @param {{minX:number, maxX:number}} [viewportBounds]   lateral clamp bounds (mobile only)
   */
  update(dtMs, cameraIso, elapsedSec = 0, isoWorld = null, viewportCenter = null, viewportSize = null, viewportBounds = null, opts = null) {
    // Fase-5 REQ-CMB-008: clear the per-tick "screen escaped" trace so callers
    // (e.g. test-api.getScreenEscapedRects) see only the enemies removed THIS frame.
    this._lastScreenEscaped = []

    // Step 0 (NEW Fase-5 REQ-CMB-009 + REQ-CMB-010): per-instance self-translation.
    // Runs BEFORE escape detection so a mobile enemy that moves into the lateral
    // clamp range is corrected before the next frame's projection is judged.
    if (cameraIso) {
      const runMotion = !!(isoWorld && viewportCenter)
      for (const enemy of this._live()) {
        if (enemy.state !== 'alive') continue
        if (enemy.movementPattern === 'static') continue   // O(1) skip for static
        if (runMotion) {
          enemy.tick(dtMs, cameraIso, viewportBounds, isoWorld, viewportCenter)
        }
      }
    }

    // Time-gated spawn materialization
    if (this._timeGatedSpawns.length > 0) {
      const remaining = []
      for (const tg of this._timeGatedSpawns) {
        if (elapsedSec >= tg.atSec) {
          const enemy = new Enemy(tg.def)
          // Create a visual sprite for the enemy using the preloaded texture.
          // Sprite lives in this.scene (the world's sprite layer) so it renders
          // above the iso tiles and z-sorts with them.
          this._createSpriteFor(enemy)
          this._enemies.set(enemy.id, enemy)
        } else {
          remaining.push(tg)
        }
      }
      this._timeGatedSpawns = remaining
    }

    // Escape detection (F3 enemies are static, only the camera moves)
    if (cameraIso) {
      const skipEscape = !!(opts && opts.skipEscape)
      const runScreenTest = !!(isoWorld && viewportCenter && viewportSize)
      if (!skipEscape) for (const enemy of this._live()) {
        if (enemy.state !== 'alive') continue
        // Fase-5 REQ-CMB-008: screen-space test runs first (common case is the
        // south slide-off). Off-axis escapes still hit the Manhattan fallback.
        const screenEscaped = runScreenTest
          ? isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize)
          : false
        const manhattanEscaped = isEscaped(enemy, cameraIso)
        if (screenEscaped || manhattanEscaped) {
          // Record the escape reason for debug overlays / tests to inspect.
          this._lastScreenEscaped ??= []
          this._lastScreenEscaped.push({
            enemyId: enemy.id,
            reason: screenEscaped ? 'screen' : 'manhattan',
          })
          emit('enemy:escaped', { enemyId: enemy.id, archetype: enemy.archetype })
          this._destroySprite(enemy)
          this._enemies.delete(enemy.id)
        }
      }
    }

    // Garbage-collect expired destroyed enemies
    const now = performance.now()
    for (const enemy of this._live()) {
      if (enemy.state === 'destroyed' && enemy.isExpired(now)) {
        this._destroySprite(enemy)
        this._enemies.delete(enemy.id)
      }
    }
  }

  /**
   * Remove and destroy the sprite for an enemy. Safe to call even if no
   * sprite exists (idempotent).
   */
  _destroySprite(enemy) {
    if (enemy.sprite && enemy.sprite.parent) {
      enemy.sprite.parent.removeChild(enemy.sprite)
    }
    if (enemy.sprite) {
      enemy.sprite.destroy()
      enemy.sprite = null
    }
  }

  /** Remove ALL enemy sprites from the scene (used by reset/loadLevel). */
  _removeAllSprites() {
    for (const enemy of this._live()) {
      this._destroySprite(enemy)
    }
  }

  /** Wipe all enemies + queue. Used by Reintentar. */
  reset() {
    this._removeAllSprites()
    this._enemies.clear()
    this._timeGatedSpawns = []
    this._spawnQueue = []
  }
}
