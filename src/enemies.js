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
 */
import { emit } from './event-bus.js?v=34'
import { TILE_SIZE } from './canvas.js?v=31'

export const ARCHETYPES = Object.freeze({
  // F4f: footprints widened on the iso-sum axis (hh) to cover the full vertical
  // extent of the visible sprite. Each enemy sprite is anchored at bottom-center
  // (0.5, 1.0) and offset by `southOffset = tileSize / √2` upward from the iso
  // center, so the visible sprite extends ~1 tile ABOVE the iso cell. The F3.5
  // footprints (1.0/1.0 standard, up to 2.0/2.0 boss) only captured the bottom
  // half of the sprite — clicking on the visible sprite body missed the AABB
  // and the projectile whiffed. Widening hh to ~2.5 tiles makes the hit box
  // cover the sprite from iso center up to the sprite top.
  standard:    Object.freeze({ hp: 1,  multiplier: 1,   footprint: Object.freeze({ hw: 1.5, hh: 2.5 }), flashMs: 200 }),
  tank:        Object.freeze({ hp: 3,  multiplier: 1.5, footprint: Object.freeze({ hw: 1.7, hh: 2.7 }), flashMs: 200 }),
  'mini-boss': Object.freeze({ hp: 10, multiplier: 2,   footprint: Object.freeze({ hw: 2.0, hh: 3.0 }), flashMs: 200 }),
  boss:        Object.freeze({ hp: 30, multiplier: 3,   footprint: Object.freeze({ hw: 2.5, hh: 3.5 }), flashMs: 200 }),
})

export const ARCHETYPE_IDS = Object.freeze(Object.keys(ARCHETYPES))

export class ConfigError extends Error {}

/**
 * Validate that an archetype id is in the locked table. Throws ConfigError otherwise.
 */
export function assertArchetype(name) {
  if (!ARCHETYPES[name]) {
    throw new ConfigError(`Unknown archetype "${name}" — must be one of ${ARCHETYPE_IDS.join(', ')}`)
  }
}

let _idCounter = 0
function _nextId() { return `e${String(++_idCounter).padStart(3, '0')}` }

export class Enemy {
  /**
   * @param {Object} opts
   * @param {string} [opts.id]           auto-generated if omitted
   * @param {keyof ARCHETYPES} opts.archetype
   * @param {number} opts.isoX
   * @param {number} opts.isoY
   * @param {string} [opts.spriteId]
   */
  constructor({ id, archetype, isoX, isoY, spriteId }) {
    assertArchetype(archetype)
    this.id = id ?? _nextId()
    this.archetype = archetype
    this.isoX = isoX
    this.isoY = isoY
    this.spriteId = spriteId ?? null
    this.hp = ARCHETYPES[archetype].hp
    this.state = 'alive'   // 'alive' | 'destroyed'
    this._destroyedAt = 0  // performance.now() ms when transitioned to destroyed
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
   * Has the 200 ms post-destruction window elapsed?
   * @param {number} now  performance.now() in ms
   */
  isExpired(now) {
    if (this.state !== 'destroyed') return false
    return (now - this._destroyedAt) >= 200
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
   *   1. Materialize any time-gated spawns whose time has arrived.
   *   2. Evaluate escape for every live enemy.
   *   3. Garbage-collect destroyed enemies whose 200 ms animation window expired.
   *
   * @param {number} dtMs                delta time in milliseconds
   * @param {{isoX:number, isoY:number}} cameraIso  current camera iso position
   * @param {number} [elapsedSec]        current simulation time (used for time-gated spawns)
   */
  update(dtMs, cameraIso, elapsedSec = 0) {
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
      for (const enemy of this._live()) {
        if (enemy.state !== 'alive') continue
        if (isEscaped(enemy, cameraIso)) {
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
