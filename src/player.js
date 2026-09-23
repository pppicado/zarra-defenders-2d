/**
 * src/player.js
 *
 * Crosshair and aiming logic for Zarra Defenders 2D.
 *
 * Confirmed view (2026-09-03): FIRST PERSON with hand + pen.
 *   - The player sees their own pixel-art hand holding a pen at the
 *     bottom-center of the screen (managed in Phase 3 with a hand
 *     sprite; today Phase 2 is just the crosshair).
 *   - The crosshair is the primary aiming indicator. The hand appears
 *     overlaid when the pen is active.
 *   - Tap on target = "the pen signs a slip and throws it" = fire (Phase 3).
 *
 * IMPORTANT — Layers:
 *   The crosshair lives in the `hud` layer (NOT in `world`). This means
 *   it does NOT move with the camera. If it were in `world`, when the
 *   rail camera scrolled the crosshair would drift with it even though
 *   the user did not move the mouse. The crosshair must always be under
 *   the mouse cursor in screen coordinates, not world coordinates.
 *
 * In this Phase 2 we only create the crosshair. The hand is added in Phase 3
 * once we have the hand+pen sprite (to be generated with minimax).
 *
 * Crosshair style:
 *   - Pixel-art cross ~24x24 px, contrasting color (cyan or white)
 *   - 1px black outer line to stand out against any background
 *   - Hide the system cursor during gameplay (`cursor: none`)
 */

const CROSSHAIR_SIZE = 24               // px en pantalla (no mundo)
const CROSSHAIR_COLOR = 0x00ffff        // cyan
const CROSSHAIR_OUTLINE = 0x000000      // negro

import { __zr } from './engine/dom-debug.js?v=44'

export class Player {
  /**
   * @param {PIXI.Application} app
   * @param {Input} input
   * @param {PIXI.Container} hud    HUD layer (fixed, does NOT move with the camera)
   * @param {RailCamera} camera   Reference only; the crosshair does not use it for anything visual
   */
  constructor(app, input, hud, camera) {
    this.app = app
    this.input = input
    this.hud = hud
    this.camera = camera

    // Create crosshair with Graphics (vector) — faster than sprite
    this.crosshair = this._buildCrosshair()
    this.hud.addChild(this.crosshair)

    // Suscribirse a eventos de input
    this._onMove = this._handleMove.bind(this)
    this._onTap = this._handleTap.bind(this)
    this._onPause = this._handlePause.bind(this)
    input.on('move', this._onMove)
    input.on('tap', this._onTap)
    input.on('pause', this._onPause)

    // Estado interno
    this._paused = false
    this._lastTapTime = 0
    this._tapCount = 0

    // Reservado para futuras animaciones
    app.ticker.add(() => this._update())
  }

  // =================== Public API ===================

  /**
   * @returns {boolean} true if the game is paused.
   */
  isPaused() { return this._paused }

  /**
   * @returns {{x: number, y: number}} crosshair position in screen coordinates
   */
  getCrosshairScreenPos() {
    return { x: this.crosshair.x, y: this.crosshair.y }
  }

  // =================== Internal ===================

  _buildCrosshair() {
    const g = new PIXI.Graphics()
    const half = CROSSHAIR_SIZE / 2
    const gap = 4          // center gap
    const thickness = 2    // line thickness

    // Draw cross with outline (two passes: outline first, color on top)
    g.lineStyle({ width: thickness + 2, color: CROSSHAIR_OUTLINE, alpha: 1, cap: 'round' })
    // Horizontal line
    g.moveTo(-half, 0).lineTo(-gap, 0)
    g.moveTo(gap, 0).lineTo(half, 0)
    // Vertical line
    g.moveTo(0, -half).lineTo(0, -gap)
    g.moveTo(0, gap).lineTo(0, half)

    // Color pass
    g.lineStyle({ width: thickness, color: CROSSHAIR_COLOR, alpha: 1, cap: 'round' })
    g.moveTo(-half, 0).lineTo(-gap, 0)
    g.moveTo(gap, 0).lineTo(half, 0)
    g.moveTo(0, -half).lineTo(0, -gap)
    g.moveTo(0, gap).lineTo(0, half)

    g.x = 0
    g.y = 0
    return g
  }

  _handleMove(screenX, screenY) {
    // The crosshair is on the HUD layer, NOT in the world.
    // So we use screen coords directly, without compensating the camera.
    // This is correct: the crosshair must always be UNDER the mouse cursor,
    // regardless of how the rail camera moves.
    this.crosshair.x = screenX
    this.crosshair.y = screenY
  }

  _handleTap(screenX, screenY) {
    if (this._paused) return
    // In Phase 2 we only register the tap. In Phase 3 we fire the projectile here.
    this._lastTapTime = performance.now()
    this._tapCount++
    __zr.log(`[Player] Tap #${this._tapCount} at (${Math.round(screenX)}, ${Math.round(screenY)})`)
  }

  _handlePause() {
    this._paused = !this._paused
    __zr.log(`[Player] Pausa: ${this._paused}`)
    // In Phase 7: show pause overlay
  }

  _update() {
    // Reserved for future crosshair animations (hover, pulse, etc.)
  }
}
