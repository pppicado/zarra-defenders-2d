/**
 * src/rail-camera.js
 *
 * Cámara de rail shooter para Zarra Defenders 2D.
 *
 * En un rail shooter, la cámara sigue un path FIJO predefinido por el stage.
 * El jugador NO controla el movimiento — solo la mira y el disparo.
 *
 * Esta clase:
 *   - Define un path como lista de waypoints (cada uno con `t` en segundos
 *     y `x` en píxeles del mundo, `y` en píxeles del mundo).
 *   - Interpola linealmente entre waypoints según el tiempo elapsed.
 *   - Expone `getCameraX()` y `getCameraY()` para que el renderer posicione
 *     sprites restándoles la posición de la cámara (efecto parallax).
 *
 * Diseño extensible: para Fase 1 usamos un path recto de 2 waypoints.
 * En Fases futuras podemos añadir curvas Bezier, easing, pausas por trigger, etc.
 */

export class RailCamera {
  /**
   * @param {Object} config
   * @param {Array<{t: number, x: number, y: number}>} config.waypoints
   *        Lista ordenada de puntos del path. `t` es tiempo en segundos desde
   *        el inicio del stage. `x` y `y` son posición en píxeles del mundo.
   * @param {boolean} config.loop  Si true, la cámara vuelve al inicio al llegar al final.
   */
  constructor(config) {
    if (!config || !Array.isArray(config.waypoints) || config.waypoints.length < 2) {
      throw new Error('RailCamera: se requieren al menos 2 waypoints')
    }
    this.waypoints = config.waypoints
    this.loop = config.loop ?? true
    this.elapsed = 0
    this.startTime = performance.now()
  }

  /**
   * Avanza la cámara según el delta time. Llamar desde el game loop.
   * @param {number} dt  Delta time en segundos.
   */
  update(dt) {
    this.elapsed += dt
  }

  /** Reinicia la cámara al inicio del path (para reinicio de stage). */
  reset() {
    this.elapsed = 0
    this.startTime = performance.now()
  }

  /** Posición X actual de la cámara en píxeles del mundo. */
  getCameraX() {
    return this._interpolate('x')
  }

  /** Posición Y actual de la cámara en píxeles del mundo. */
  getCameraY() {
    return this._interpolate('y')
  }

  /**
   * @returns {number} progreso del path de 0 a 1 (o más si loop está activo)
   */
  getProgress() {
    return this.elapsed / this._totalDuration()
  }

  /**
   * @returns {number} duración total del path en segundos
   */
  _totalDuration() {
    return this.waypoints[this.waypoints.length - 1].t
  }

  /**
   * Interpolación lineal entre el par de waypoints que contienen
   * el tiempo actual.
   * @param {'x'|'y'} prop
   * @returns {number}
   */
  _interpolate(prop) {
    const t = this.elapsed
    const totalT = this._totalDuration()

    // Si loop y nos pasamos, hacemos wrap
    let localT = t
    if (this.loop && t > totalT) {
      localT = t % totalT
    } else if (!this.loop && t > totalT) {
      // Sin loop: nos quedamos en el último waypoint
      const last = this.waypoints[this.waypoints.length - 1]
      return last[prop]
    }

    // Buscar segmento activo
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

    // Edge case: tiempo negativo o anterior al primer waypoint
    return this.waypoints[0][prop]
  }
}
