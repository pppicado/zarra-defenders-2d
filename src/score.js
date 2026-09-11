/**
 * src/score.js
 *
 * Score + "Firmas recogidas" counter with silent best-score localStorage persistence
 * (F3 best-score spec).
 *
 * Score state is in-memory; localStorage holds the best record across runs.
 *
 * Persistence schema:
 *   key:   "zarra2d:best:test_level"
 *   value: JSON.stringify({ score, firmas, date })  // date is ISO 8601
 *
 * Read/Write rules:
 *   - tryWriteBest(): only writes if new.firmas > stored.firmas
 *     OR (firmas equal AND new.score > stored.score).
 *     On exception (SecurityError, quota, JSON), swallows and in-memory best stays null.
 *   - loadBest(): returns { score, firmas, date } | null. Tries getItem + JSON.parse in
 *     one try/catch; failure yields null (treated as missing -> overwrite on next victory).
 *
 * Emits:
 *   - score:changed { score, firmas, best }
 *
 * Listens to (optional, attached by main.js):
 *   - combat:hit (handled by Combat / main.js calling addHit)
 *   - stage:cleared (handled by main.js calling tryWriteBest)
 */
import { emit } from './event-bus.js?v=34'

export const BEST_KEY = 'zarra2d:best:test_level'

const BASE_HIT_POINTS = 10

export class Score {
  constructor(opts = {}) {
    this.score = 0
    this.firmas = 0
    this.best = null  // { score, firmas, date } | null
    this._storage = opts.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  }

  /** @returns {{score:number, firmas:number, best: object|null}} */
  read() {
    return { score: this.score, firmas: this.firmas, best: this.best }
  }

  /**
   * Apply a successful hit.
   * @param {number} archetypeMultiplier  1 | 1.5 | 2 | 3
   * @returns {{scoreDelta:number, firmasDelta:number}}
   */
  addHit(archetypeMultiplier = 1) {
    const scoreDelta = Math.round(BASE_HIT_POINTS * archetypeMultiplier)
    const firmasDelta = 1
    this.score += scoreDelta
    this.firmas += firmasDelta
    emit('score:changed', { score: this.score, firmas: this.firmas, best: this.best })
    return { scoreDelta, firmasDelta }
  }

  /** Reset to { score:0, firmas:0 }. In-memory best is NOT cleared. */
  reset() {
    this.score = 0
    this.firmas = 0
    emit('score:changed', { score: this.score, firmas: this.firmas, best: this.best })
  }

  /**
   * Attempt to persist the current score to localStorage as the new best.
   * Called on stage:cleared (victory only).
   * Returns true if a write happened, false otherwise.
   */
  tryWriteBest() {
    if (!this._safeStorage()) return false
    const prev = this.loadBest()
    if (prev && !this._isBetter(prev)) return false
    const record = {
      score: this.score,
      firmas: this.firmas,
      date: new Date().toISOString(),
    }
    try {
      this._storage.setItem(BEST_KEY, JSON.stringify(record))
      this.best = record
      emit('score:changed', { score: this.score, firmas: this.firmas, best: this.best })
      return true
    } catch (err) {
      // quota / SecurityError / etc — silent fallback
      console.warn('[Score] localStorage write failed:', err?.message ?? err)
      return false
    }
  }

  /**
   * Load best record from localStorage.
   * @returns {{score:number, firmas:number, date:string} | null}
   */
  loadBest() {
    if (!this._safeStorage()) return null
    let raw
    try {
      raw = this._storage.getItem(BEST_KEY)
    } catch (err) {
      console.warn('[Score] localStorage read failed:', err?.message ?? err)
      return null
    }
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      if (
        parsed == null ||
        typeof parsed.score !== 'number' ||
        typeof parsed.firmas !== 'number' ||
        typeof parsed.date !== 'string'
      ) {
        return null
      }
      this.best = parsed
      return parsed
    } catch {
      // Corrupt JSON: treat as missing.
      return null
    }
  }

  /** @private */
  _isBetter(prev) {
    if (this.firmas > prev.firmas) return true
    if (this.firmas < prev.firmas) return false
    return this.score > prev.score
  }

  /** @private */
  _safeStorage() {
    return this._storage != null
  }
}
