/**
 * src/integrity.js
 *
 * 3-segment integrity state machine for Zarra Defenders 2D (F3).
 *
 * Contract (player-integrity spec):
 *   - max = 3 segments, current starts at 3.
 *   - drain(reason) subtracts 1 each call, floors at 0.
 *   - Emits integrity:changed { current, max } on every drain that actually changes state.
 *   - Emits integrity:exhausted { current, max, score, firmasRecogidas } exactly once
 *     on the >0 -> 0 transition. Idempotent: subsequent drain() calls do NOT re-emit
 *     integrity:exhausted.
 *   - reset() returns to { current: 3, max: 3 } and clears the exhausted latch.
 *   - stage:cleared / stage:failed freeze the state (further drain() calls no-op).
 */
import { emit } from './event-bus.js?v=15'

export const INTEGRITY_MAX = 3

export class Integrity {
  /**
   * @param {Object} opts
   * @param {EventTarget} [opts.eventBus]  unused — kept for symmetry, we import singleton
   * @param {() => {score:number, firmas:number}} [opts.scoreReader]  optional, used in
   *        integrity:exhausted payload so the overlay can show the final score/firmas
   *        without circular dependency on src/score.js
   * @param {number} [opts.max=3]
   */
  constructor(opts = {}) {
    const max = opts.max ?? INTEGRITY_MAX
    this.max = max
    this.current = max
    this._exhausted = false
    this._frozen = false
    this._scoreReader = opts.scoreReader ?? (() => ({ score: 0, firmas: 0 }))
  }

  /** @returns {{current:number, max:number, exhausted:boolean}} */
  read() {
    return { current: this.current, max: this.max, exhausted: this._exhausted }
  }

  /**
   * Subtract 1 segment. Floors at 0.
   * @param {string} reason  human label, currently unused but kept for debug logs
   * @returns {{current:number, max:number, exhausted:boolean}}
   */
  drain(reason = 'enemy:escaped') {
    if (this._frozen) return this.read()
    if (this._exhausted) return this.read()
    if (this.current <= 0) return this.read()

    this.current -= 1
    emit('integrity:changed', { current: this.current, max: this.max })

    if (this.current === 0 && !this._exhausted) {
      this._exhausted = true
      const { score, firmas } = this._scoreReader()
      emit('integrity:exhausted', {
        current: this.current,
        max: this.max,
        score,
        firmasRecogidas: firmas,
      })
    }
    return this.read()
  }

  /** Returns to { current: 3, max: 3 }. Used by Reintentar. */
  reset() {
    this.current = this.max
    this._exhausted = false
    this._frozen = false
    emit('integrity:changed', { current: this.current, max: this.max })
  }

  /** Freeze further drains (called on stage:cleared / stage:failed). */
  freeze() { this._frozen = true }
}
