/**
 * src/ui/hud.js
 *
 * Integrity HUD (3 hearts, bottom-left) + hand sprite (bottom-center, rotates to aim at cursor).
 *
 * Hand sprite:
 *   - PIXI.Sprite loaded from assets/sprites/hand_pen.png
 *   - Anchored at bottom-center of the canvas wrapper (with vertical offset)
 *   - Rotates so the pen tip points toward the pointer (cursor)
 *   - Fires (combat.fireAtIso) are launched from the hand's screen position
 *   - zIndex = 1000, on top of the world, below the integrity hearts
 *
 * Integrity hearts:
 *   - 3 PIXI.Sprite icons (heart_full.png / heart_empty.png), 48×48 each, 8px gap
 *   - Bottom-left of the canvas wrapper
 *   - zIndex = 50
 *
 * If heart sprite fails to load (missing PNG), a procedural red square is drawn as fallback.
 * If hand sprite fails to load, a procedural mitten square is drawn as fallback.
 */
import { on } from '../event-bus.js?v=9'

/** Hand anchor offset from canvas bottom-center. */
export const HAND_BOTTOM_OFFSET = Object.freeze({ x: 0, y: -32 })

/** Heart layout. */
export const HEART_SIZE = 48
export const HEART_GAP = 8
export const HEART_MARGIN = 16

export class HUD {
  /**
   * @param {Object} opts
   * @param {PIXI.Container} opts.hudContainer    hud layer
   * @param {Object} opts.integrity               Integrity instance
   * @param {Object} [opts.score]                 Score instance
   * @param {Object} [opts.camera]                RailCamera
   * @param {PIXI.Sprite} [opts.handSprite]       preloaded hand sprite
   * @param {PIXI.Texture} [opts.heartFullTex]    preloaded heart_full texture
   * @param {PIXI.Texture} [opts.heartEmptyTex]   preloaded heart_empty texture
   * @param {number} opts.viewportWidth
   * @param {number} opts.viewportHeight
   */
  constructor(opts) {
    if (!opts || !opts.hudContainer) throw new Error('HUD requires hudContainer')
    this.hudContainer = opts.hudContainer
    this.integrity = opts.integrity
    this.score = opts.score ?? null
    this.camera = opts.camera ?? null
    this.handSprite = opts.handSprite ?? null
    this.heartFullTex = opts.heartFullTex ?? null
    this.heartEmptyTex = opts.heartEmptyTex ?? null
    this.viewportWidth = opts.viewportWidth
    this.viewportHeight = opts.viewportHeight

    this._hearts = []
    this._lastIntegrity = null
    this._heartGroup = new PIXI.Container()
    this._heartGroup.name = 'integrity-hearts'
    this.hudContainer.addChild(this._heartGroup)
    this._heartGroup.zIndex = 50

    this._buildHearts()
    this._positionHeartGroup()

    if (this.handSprite) {
      this.handSprite.zIndex = 1000
      this.handSprite.anchor.set(0.5, 0.85)  // anchor near the wrist so the pen tip is at the top
      this.hudContainer.addChild(this.handSprite)
      this.handSprite.visible = false
    }

    this._unsubs = []
    this._unsubs.push(on('integrity:changed', () => this._buildHearts()))
    this._unsubs.push(on('integrity:exhausted', () => this._buildHearts()))

    this._lastPointer = { x: -1, y: -1 }
  }

  // ============== Public API =================

  /**
   * Track pointer position. Rotates the hand sprite to point at the cursor.
   * @param {number} screenX
   * @param {number} screenY
   */
  setPointer(screenX, screenY) {
    this._lastPointer.x = screenX
    this._lastPointer.y = screenY
    if (this.handSprite && this.handSprite.visible) {
      this._positionHand()
    }
  }

  /**
   * Get the current hand screen position (used by combat to spawn projectiles).
   * @returns {{x:number, y:number}|null}
   */
  getHandScreenPosition() {
    if (!this.handSprite) return null
    return { x: this.handSprite.x, y: this.handSprite.y }
  }

  /** Show / hide hand sprite. */
  setHandVisible(v) {
    if (!this.handSprite) return
    this.handSprite.visible = !!v
    if (v) this._positionHand()
  }

  setHandSprite(sprite) {
    if (this.handSprite && this.handSprite.parent) this.handSprite.parent.removeChild(this.handSprite)
    this.handSprite = sprite
    if (sprite) {
      sprite.zIndex = 1000
      sprite.anchor.set(0.5, 0.85)
      this.hudContainer.addChild(sprite)
      sprite.visible = false
    }
  }

  setViewportSize(w, h) {
    this.viewportWidth = w
    this.viewportHeight = h
    this._buildHearts()
    this._positionHeartGroup()
    this._positionHand()
  }

  destroy() {
    for (const u of this._unsubs) u()
    this._unsubs = []
    if (this._heartGroup.parent) this._heartGroup.parent.removeChild(this._heartGroup)
    this._heartGroup.destroy({ children: true })
    if (this.handSprite && this.handSprite.parent) {
      this.handSprite.parent.removeChild(this.handSprite)
    }
  }

  // ============== Internal =================

  _buildHearts() {
    while (this._heartGroup.children.length > 0) {
      const c = this._heartGroup.children[0]
      this._heartGroup.removeChild(c); c.destroy()
    }
    this._hearts = []

    const integrity = this.integrity?.read?.() ?? { current: 3, max: 3 }
    const max = integrity.max ?? 3
    const current = integrity.current ?? max

    for (let i = 0; i < max; i++) {
      const filled = i < current
      const tex = filled ? this.heartFullTex : this.heartEmptyTex
      let sprite
      if (tex) {
        sprite = new PIXI.Sprite(tex)
      } else {
        // Procedural fallback: red filled square or gray empty square.
        sprite = new PIXI.Graphics()
        const color = filled ? 0xE63946 : 0x3A3A3A
        sprite.lineStyle(1, 0x111111, 1)
        sprite.beginFill(color, 1)
        sprite.drawRect(0, 0, HEART_SIZE, HEART_SIZE)
        sprite.endFill()
      }
      sprite.width = HEART_SIZE
      sprite.height = HEART_SIZE
      sprite.x = i * (HEART_SIZE + HEART_GAP)
      sprite.y = 0
      this._heartGroup.addChild(sprite)
      this._hearts.push(sprite)
    }

    this._lastIntegrity = { current, max }
    this._positionHeartGroup()
  }

  _positionHeartGroup() {
    const totalW = this._hearts.length * HEART_SIZE + (this._hearts.length - 1) * HEART_GAP
    // Bottom-left anchor
    this._heartGroup.position.set(HEART_MARGIN, this.viewportHeight - HEART_SIZE - HEART_MARGIN)
    this._heartGroup._w = totalW
    this._heartGroup._h = HEART_SIZE
  }

  _positionHand() {
    if (!this.handSprite) return
    // Anchor: bottom-center of viewport, lifted up by HAND_BOTTOM_OFFSET.y
    const cx = this.viewportWidth / 2 + HAND_BOTTOM_OFFSET.x
    const cy = this.viewportHeight + HAND_BOTTOM_OFFSET.y
    this.handSprite.x = cx
    this.handSprite.y = cy
    // Rotate so the pen tip points toward the cursor
    if (this._lastPointer.x >= 0) {
      const dx = this._lastPointer.x - cx
      const dy = this._lastPointer.y - cy
      // Pen tip points "up" in the sprite by default (top of anchor at y < anchor.y)
      // Pixi rotation: 0 = +x right, positive = clockwise. We want the up-vector to point at the cursor.
      // angle = atan2(dy, dx) - (-PI/2) = atan2(dy, dx) + PI/2
      this.handSprite.rotation = Math.atan2(dy, dx) + Math.PI / 2
    }
  }
}
