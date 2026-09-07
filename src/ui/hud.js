/**
 * src/ui/hud.js
 *
 * Integrity HUD + hand sprite pointer tracking (F3 player-integrity + hand-pen-sprite spec).
 *
 * Visual contract:
 *   - 3 horizontal PIXI.Graphics rectangles (200x24 px total layout, 64x24 each, 4 px gap)
 *   - On viewports < 600 px wide: shrink to 160x20 (40x20 + 4 px gap)
 *   - Green #3FB950 filled / dark gray #3A3A3A empty
 *   - Top-right corner of the canvas wrapper
 *
 * Hand sprite:
 *   - PIXI.Sprite loaded from assets/sprites/hand_pen.png (TASK-013)
 *   - zIndex = 1000
 *   - Follows pointer + HAND_POINTER_OFFSET = (24, 16)
 *   - Hidden during main-menu / overlay states
 *
 * If hand sprite fails to load (missing PNG), a procedural 32x32 magenta-chroma square is
 * drawn as fallback (visible to the developer, never blocks the game).
 */
import { on } from '../event-bus.js'

export const HAND_POINTER_OFFSET = Object.freeze({ x: 24, y: 16 })

export class HUD {
  /**
   * @param {Object} opts
   * @param {PIXI.Container} opts.hudContainer    hud layer
   * @param {Object} opts.integrity               Integrity instance
   * @param {Object} [opts.score]                 Score instance (for HUD counter display)
   * @param {Object} [opts.camera]                RailCamera (for halts)
   * @param {PIXI.Sprite} [opts.handSprite]       preloaded hand sprite (loaded by main.js)
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
    this.viewportWidth = opts.viewportWidth
    this.viewportHeight = opts.viewportHeight

    this._segments = []
    this._lastIntegrity = null
    this._hudGroup = new PIXI.Container()
    this._hudGroup.name = 'integrity-hud'
    this.hudContainer.addChild(this._hudGroup)
    this._hudGroup.zIndex = 50  // above world, below hand

    this._buildSegments()
    this._positionGroup()

    if (this.handSprite) {
      this.handSprite.zIndex = 1000
      this.hudContainer.addChild(this.handSprite)
      // visible only when there's a real sprite (not the placeholder magenta square)
      this.handSprite.visible = false
    }

    this._unsubs = []
    this._unsubs.push(on('integrity:changed', () => this._buildSegments()))
    this._unsubs.push(on('integrity:exhausted', () => this._buildSegments()))
    this._unsubs.push(on('score:changed', () => {/* HUD counter (optional) updated by main.js if wired */}))

    this._lastPointer = { x: -1, y: -1 }
  }

  // ============== Public API =================

  /**
   * Track pointer position. Sets hand sprite location if visible.
   * @param {number} screenX
   * @param {number} screenY
   */
  setPointer(screenX, screenY) {
    this._lastPointer.x = screenX
    this._lastPointer.y = screenY
    if (this.handSprite && this.handSprite.visible) {
      this.handSprite.x = screenX + HAND_POINTER_OFFSET.x
      this.handSprite.y = screenY + HAND_POINTER_OFFSET.y
    }
  }

  /** Show / hide hand sprite. Call this from main.js on state changes. */
  setHandVisible(v) {
    if (!this.handSprite) return
    this.handSprite.visible = !!v
    if (v && this._lastPointer.x >= 0) this.setPointer(this._lastPointer.x, this._lastPointer.y)
  }

  setHandSprite(sprite) {
    if (this.handSprite && this.handSprite.parent) this.handSprite.parent.removeChild(this.handSprite)
    this.handSprite = sprite
    if (sprite) {
      sprite.zIndex = 1000
      this.hudContainer.addChild(sprite)
      sprite.visible = false
    }
  }

  setViewportSize(w, h) {
    this.viewportWidth = w
    this.viewportHeight = h
    this._buildSegments()
    this._positionGroup()
  }

  destroy() {
    for (const u of this._unsubs) u()
    this._unsubs = []
    if (this._hudGroup.parent) this._hudGroup.parent.removeChild(this._hudGroup)
    this._hudGroup.destroy({ children: true })
  }

  // ============== Internal =================

  _buildSegments() {
    while (this._hudGroup.children.length > 0) {
      const c = this._hudGroup.children[0]
      this._hudGroup.removeChild(c); c.destroy()
    }
    this._segments = []

    const integrity = this.integrity?.read?.() ?? { current: 3, max: 3 }
    const max = integrity.max ?? 3
    const current = integrity.current ?? max

    const small = (this.viewportWidth ?? window.innerWidth) < 600
    const segW = small ? 40 : 64
    const segH = small ? 20 : 24
    const gap = 4
    const totalW = segW * max + gap * (max - 1)

    for (let i = 0; i < max; i++) {
      const g = new PIXI.Graphics()
      const filled = i < current
      const color = filled ? 0x3FB950 : 0x3A3A3A
      g.lineStyle(1, 0x111111, 1)
      g.beginFill(color, 1)
      g.drawRect(0, 0, segW, segH)
      g.endFill()
      g.x = i * (segW + gap)
      g.y = 0
      this._hudGroup.addChild(g)
      this._segments.push(g)
    }

    // Group dimensions for positioning
    this._hudGroup._w = totalW
    this._hudGroup._h = segH
    this._lastIntegrity = { current, max }
    this._positionGroup()
  }

  _positionGroup() {
    const margin = 16
    const w = this._hudGroup._w ?? 200
    const h = this._hudGroup._h ?? 24
    this._hudGroup.position.set(this.viewportWidth - w - margin, margin)
  }
}
