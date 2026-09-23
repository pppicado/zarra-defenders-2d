/**
 * src/player.js
 *
 * Crosshair and aiming logic for Zarra Defenders 2D.
 *
 * Confirmed view (2026-09-03): FIRST PERSON with hand + pen.
 *   - The player sees their own pixel-art hand holding a pen (managed by HUD).
 *   - The crosshair is the primary aiming indicator (sprite since F3.4).
 *   - Tap on target = "the pen signs a slip and throws it" = fire.
 *
 * IMPORTANT — Layers:
 *   The crosshair lives in the `hud` layer (NOT in `world`). It does NOT
 *   move with the camera. If it were in `world`, when the camera scrolled
 *   the crosshair would drift with it even though the user did not move the
 *   mouse. The crosshair must always be under the mouse cursor in screen
 *   coordinates, not world coordinates.
 *
 * F3.4 — crosshair asset:
 *   The crosshair is now a PNG sprite (assets/sprites/crosshair.png,
 *   128x128 native, 32x32 conceptual) loaded from the sprite manifest.
 *   Replaces the previous PIXI.Graphics vector implementation. Sprite has
 *   transparent background (chroma-key magenta removed during asset gen).
 *
 * 3D-rule deviation:
 *   The 3D convention says "the crosshair sprite is only visible during
 *   menus/pause" — the 3D relied on the bullet trajectory to show direction
 *   during gameplay. The 2D differs: it is a mouse-aimed rail shooter that
 *   keeps the crosshair on screen during gameplay, overlaid with the hand
 *   sprite. The sprite is also available for menu/pause decoration. See
 *   ROADMAP F3.4 / Engram for the rationale.
 */
import { __zr } from './engine/dom-debug.js?v=44'

const CROSSHAIR_DISPLAY = 24           // px on screen (matches prior vector size)

export class Player {
  /**
   * @param {PIXI.Application} app
   * @param {Input} input
   * @param {PIXI.Container} hud       HUD layer (fixed, not affected by camera)
   * @param {RailCamera} camera        Reference only
   * @param {PIXI.Texture} [crosshairTexture] optional sprite texture (F3.4)
   */
  constructor(app, input, hud, camera, crosshairTexture) {
    this.app = app
    this.input = input
    this.hud = hud
    this.camera = camera

    this.crosshair = this._buildCrosshair(crosshairTexture)
    this.hud.addChild(this.crosshair)

    this._onMove = this._handleMove.bind(this)
    this._onTap = this._handleTap.bind(this)
    this._onPause = this._handlePause.bind(this)
    input.on('move', this._onMove)
    input.on('tap', this._onTap)
    input.on('pause', this._onPause)

    this._paused = false
    this._lastTapTime = 0
    this._tapCount = 0

    app.ticker.add(() => this._update())
  }

  /** @returns {boolean} */
  isPaused() { return this._paused }

  /** @returns {{x: number, y: number}} crosshair position in screen coords */
  getCrosshairScreenPos() {
    return { x: this.crosshair.x, y: this.crosshair.y }
  }

  // =================== Internal ===================

  _buildCrosshair(texture) {
    if (texture) {
      const sprite = new PIXI.Sprite(texture)
      sprite.anchor.set(0.5, 0.5)
      sprite.width = CROSSHAIR_DISPLAY
      sprite.height = CROSSHAIR_DISPLAY
      return sprite
    }
    // Fallback: PIXI.Graphics cross (used if sprite manifest is missing
    // the crosshair entry, e.g. during asset regen or test failures).
    __zr.warn('[Player] crosshair texture missing — using vector fallback')
    return this._buildVectorCrosshair()
  }

  _buildVectorCrosshair() {
    const g = new PIXI.Graphics()
    const half = CROSSHAIR_DISPLAY / 2
    const gap = 4
    const thickness = 2
    g.lineStyle({ width: thickness + 2, color: 0x000000, alpha: 1, cap: 'round' })
    g.moveTo(-half, 0).lineTo(-gap, 0)
    g.moveTo(gap, 0).lineTo(half, 0)
    g.moveTo(0, -half).lineTo(0, -gap)
    g.moveTo(0, gap).lineTo(0, half)
    g.lineStyle({ width: thickness, color: 0x00ffff, alpha: 1, cap: 'round' })
    g.moveTo(-half, 0).lineTo(-gap, 0)
    g.moveTo(gap, 0).lineTo(half, 0)
    g.moveTo(0, -half).lineTo(0, -gap)
    g.moveTo(0, gap).lineTo(0, half)
    return g
  }

  _handleMove(screenX, screenY) {
    this.crosshair.x = screenX
    this.crosshair.y = screenY
  }

  _handleTap(screenX, screenY) {
    if (this._paused) return
    this._lastTapTime = performance.now()
    this._tapCount++
    __zr.log(`[Player] Tap #${this._tapCount} at (${Math.round(screenX)}, ${Math.round(screenY)})`)
  }

  _handlePause() {
    this._paused = !this._paused
    __zr.log(`[Player] Pausa: ${this._paused}`)
  }

  _update() {
    // Reserved for future crosshair animations.
  }
}
