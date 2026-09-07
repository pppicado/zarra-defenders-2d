/**
 * src/enemies.js
 *
 * Enemy archetypes + Enemy + EnemyManager (F3 enemy-archetypes spec).
 *
 * Archetype table — locked:
 *   standard    : HP 1,  multiplier 1,   footprint hw=0.5 hh=0.5, flash 200 ms
 *   tank        : HP 3,  multiplier 1.5, footprint hw=0.7 hh=0.7, flash 200 ms
 *   'mini-boss' : HP 10, multiplier 2,   footprint hw=0.8 hh=0.8, flash 200 ms
 *   boss        : HP 30, multiplier 3,   footprint hw=1.0 hh=1.0, flash 200 ms
 *
 * dron_fumigador -> tank (locked by user 2026-09-07).
 *
 * Escape detection: enemy escapes when its iso center crosses
 *   escapeFrontDepth = cameraIsoX + cameraIsoY + 1
 * (one iso row past the active front edge — see iso-camera-integration / CAM-003).
 * Enemies are static in F3 (no movement); only the camera moves.
 */
import { emit } from './event-bus.js'
import { escapeFrontDepth } from './iso/iso-math.js'

export const ARCHETYPES = Object.freeze({
  standard:    Object.freeze({ hp: 1,  multiplier: 1,   footprint: Object.freeze({ hw: 0.5, hh: 0.5 }), flashMs: 200 }),
  tank:        Object.freeze({ hp: 3,  multiplier: 1.5, footprint: Object.freeze({ hw: 0.7, hh: 0.7 }), flashMs: 200 }),
  'mini-boss': Object.freeze({ hp: 10, multiplier: 2,   footprint: Object.freeze({ hw: 0.8, hh: 0.8 }), flashMs: 200 }),
  boss:        Object.freeze({ hp: 30, multiplier: 3,   footprint: Object.freeze({ hw: 1.0, hh: 1.0 }), flashMs: 200 }),
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
 * Iso-escape detection: returns true if (enemy.isoX + enemy.isoY) exceeds the
 * camera-relative front edge by more than 1.
 */
export function isEscaped(enemy, cameraIso) {
  const front = escapeFrontDepth(cameraIso.isoX ?? cameraIso.x, cameraIso.isoY ?? cameraIso.y)
  return (enemy.isoX + enemy.isoY) > front
}

export class EnemyManager {
  /**
   * @param {Object} opts
   * @param {PIXI.Container} [opts.scene]      world/sprite container (optional; visual layer)
   * @param {Function} [opts.rng]            seeded PRNG (mulberry32) — used only for non-combat visuals
   */
  constructor(opts = {}) {
    this.scene = opts.scene ?? null
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
    this._enemies.set(enemy.id, enemy)
    return enemy
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
          this._enemies.delete(enemy.id)
        }
      }
    }

    // Garbage-collect expired destroyed enemies
    const now = performance.now()
    for (const enemy of this._live()) {
      if (enemy.state === 'destroyed' && enemy.isExpired(now)) {
        this._enemies.delete(enemy.id)
      }
    }
  }

  /** Wipe all enemies + queue. Used by Reintentar. */
  reset() {
    this._enemies.clear()
    this._timeGatedSpawns = []
    this._spawnQueue = []
  }
}
