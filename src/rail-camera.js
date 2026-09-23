/**
 * src/rail-camera.js
 *
 * Rail shooter camera for Zarra Defenders 2D.
 *
 * In a rail shooter, the camera follows a FIXED path predefined per stage.
 * The player does NOT control movement — only aim and fire.
 *
 * This class:
 *   - Defines a path as a list of waypoints (each with `t` in seconds
 *     and `x`/`y` in world pixels).
 *   - Linearly interpolates between waypoints based on elapsed time.
 *   - Exposes `getCameraX()` and `getCameraY()` so the renderer positions
 *     sprites by subtracting the camera position (parallax effect).
 *
 * Extensible design: for Phase 1 we use a straight path of 2 waypoints.
 * In future phases we can add Bezier curves, easing, trigger pauses, etc.
 */

export class RailCamera {
  /**
   * @param {Object} config
   * @param {Array<{t: number, x: number, y: number}>} config.waypoints
   *        Ordered list of path points. `t` is time in seconds from
   *        the start of the stage. `x` and `y` are position in world pixels.
   * @param {boolean} config.loop  If true, the camera wraps back to start at end.
   */
  constructor(config) {
    if (!config || !Array.isArray(config.waypoints) || config.waypoints.length < 2) {
      throw new Error('RailCamera: at least 2 waypoints are required')
    }
    this.waypoints = config.waypoints
    this.loop = config.loop ?? true
    this.elapsed = 0
    this.startTime = performance.now()
  }

  /**
   * Advance the camera by delta time. Call from the game loop.
   * No-op when halted (F3 halt semantics — see halt()).
   * @param {number} dt  Delta time in seconds.
   */
  update(dt) {
    if (this._halted) return
    this.elapsed += dt
  }

  /** Reset the camera to the start of the path (for stage restart). */
  reset() {
    this.elapsed = 0
    this.startTime = performance.now()
  }

  // ====== F3 additive methods (CAM-001 zero-diff preserved, additions below) ======

  /**
   * Seek the camera to a specific time (in seconds). Respects halt state
   * (does not auto-resume). Used by __gameTestAPI__.setTime and Reintentar.
   * @param {number} t  seconds
   */
  setTime(t) {
    if (typeof t !== 'number' || !Number.isFinite(t)) return
    if (t < 0) t = 0
    this.elapsed = t
  }

  /** @returns {number} current elapsed time in seconds */
  getTime() { return this.elapsed }

  /** Freeze the ticker. update(dt) becomes a no-op until unHalt() is called. */
  halt() { this._halted = true }

  /** Resume the ticker. */
  unHalt() { this._halted = false }

  /** @returns {boolean} */
  isHalted() { return !!this._halted }

  /** Current camera X position in world pixels. */
  getCameraX() {
    return this._interpolate('x')
  }

  /** Current camera Y position in world pixels. */
  getCameraY() {
    return this._interpolate('y')
  }

  /**
   * @returns {number} path progress from 0 to 1 (or more if loop is active)
   */
  getProgress() {
    return this.elapsed / this._totalDuration()
  }

  /**
   * @returns {number} total path duration in seconds
   */
  _totalDuration() {
    return this.waypoints[this.waypoints.length - 1].t
  }

  /**
   * Linear interpolation between the pair of waypoints that contain
   * the current time.
   * @param {'x'|'y'} prop
   * @returns {number}
   */
  _interpolate(prop) {
    const t = this.elapsed
    const totalT = this._totalDuration()

    // If loop and we overshoot, wrap
    let localT = t
    if (this.loop && t > totalT) {
      localT = t % totalT
    } else if (!this.loop && t > totalT) {
      // No loop: stay at the last waypoint
      const last = this.waypoints[this.waypoints.length - 1]
      return last[prop]
    }

    // Find the active segment
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const a = this.waypoints[i]
      const b = this.waypoints[i + 1]
      if (localT >= a.t && localT <= b.t) {
        const span = b.t - a.t
        if (span === 0) return a[prop]
        const k = (localT - a.t) / span
        return a[prop] + (b[prop] - a[prop]) * k
      }
    }

    // Edge case: negative time or before the first waypoint
    return this.waypoints[0][prop]
  }
}
