/**
 * src/debug-hitboxes.js
 *
 * Debug hitbox overlay (REQ-CMB-007).
 *
 * Renders one PIXI.Graphics per archetype with color-coded rectangles at each
 * enemy's screen-space AABB. Toggle on by URL param `?hitboxes=1` or by the
 * `H` key (handled in main.js). Production (`?test=0`, no `?hitboxes=1`, no
 * `H`) MUST NOT render — `update()` early-returns and the container stays
 * invisible.
 *
 * Single source of truth for the rectangle geometry is
 * `Enemy.getScreenBounds(enemy, ...)` — which already applies `hitInset`
 * (REQ-CMB-003 + REQ-CMB-006). The overlay is purely visual; it does not
 * affect hit resolution.
 *
 * Architecture decision: pool 1 Graphics per archetype (4 total) instead of
 * 1 per enemy — fewer draw calls, simpler lifecycle, and enemies don't
 * change archetype at runtime.
 */
import { Enemy } from './enemies.js?v=44'

// Color per archetype — locked by REQ-CMB-007. Co-located with the only
// consumer so the palette + use stay together (TASK-X2).
export const ARCHETYPE_COLORS = Object.freeze({
  standard:    0x00FFFF,   // cyan
  tank:        0xFFFF00,   // yellow
  'mini-boss': 0xFF00FF,   // magenta
  boss:        0xFF8000,   // orange
})

export class DebugHitboxes {
  /**
   * @param {Object} opts
   * @param {PIXI.Container} opts.hudContainer   where to mount the overlay (typically hud.stage)
   * @param {EnemyManager}    opts.enemies       to read live enemies each frame
   * @param {Object}          opts.isoWorld      for getScreenBounds fallback
   * @param {{x:number,y:number}} opts.viewportCenter
   * @param {boolean}         [opts.enabled]     initial state (parsed from ?hitboxes=1)
   */
  constructor({ hudContainer, enemies, isoWorld, viewportCenter, enabled = false } = {}) {
    if (!hudContainer) throw new Error('DebugHitboxes requires hudContainer')
    if (!enemies) throw new Error('DebugHitboxes requires enemies (EnemyManager)')
    this._hudContainer = hudContainer
    this._enemies = enemies
    this._isoWorld = isoWorld
    this._viewportCenter = viewportCenter ?? { x: 0, y: 0 }
    this._enabled = !!enabled
    /** @type {{isoX:number, isoY:number}} tracked from the latest update() so readRects() returns current frame */
    this._cameraIso = { isoX: 0, isoY: 0 }

    /** @type {PIXI.Container} holds the per-archetype Graphics */
    this._container = new PIXI.Container()
    this._container.name = 'debug-hitboxes'
    this._container.visible = this._enabled
    this._hudContainer.addChild(this._container)

    /** @type {Object<string, PIXI.Graphics>} lazy-init: one Graphics per archetype */
    this._gfxByArch = {}
  }

  /**
   * Toggle the overlay. Next update() will show/hide accordingly. Safe to
   * call before the first frame.
   * @param {boolean} bool
   */
  setEnabled(bool) {
    this._enabled = !!bool
    this._container.visible = this._enabled
    // When toggled off, clear all rectangles so a stale frame doesn't linger
    // until the next update tick.
    if (!this._enabled) {
      for (const g of Object.values(this._gfxByArch)) g.clear()
    }
  }

  isEnabled() { return this._enabled }

  /**
   * Render the current frame. Cheap when disabled (early return).
   * @param {{isoX:number, isoY:number}} cameraIso
   */
  update(cameraIso) {
    if (!this._enabled) return
    if (cameraIso) this._cameraIso = cameraIso
    // Reset all per-archetype Graphics — they share a frame, so clear all
    // first, then redraw the live rects.
    for (const arch of Object.keys(this._gfxByArch)) {
      this._gfxByArch[arch].clear()
    }

    const live = this._enemies._live?.() ?? []
    for (const enemy of live) {
      if (enemy.state !== 'alive') continue
      const arch = enemy.archetype
      const color = ARCHETYPE_COLORS[arch]
      if (color == null) continue   // unknown archetype — skip
      let gfx = this._gfxByArch[arch]
      if (!gfx) {
        gfx = new PIXI.Graphics()
        gfx.name = `debug-hitbox-${arch}`
        this._gfxByArch[arch] = gfx
        this._container.addChild(gfx)
      }
      const b = Enemy.getScreenBounds(enemy, this._isoWorld, this._cameraIso, this._viewportCenter)
      gfx.lineStyle(2, color, 1)
      gfx.drawRect(b.x, b.y, b.w, b.h)
    }
  }

  /**
   * Snapshot of the current rectangles for test introspection (REQ-CMB-007).
   * Returns an array of `{ enemyId, archetype, x, y, w, h, color }`.
   * Empty when disabled.
   * @returns {Array<{enemyId:string, archetype:string, x:number, y:number, w:number, h:number, color:number}>}
   */
  readRects() {
    if (!this._enabled) return []
    const out = []
    const live = this._enemies._live?.() ?? []
    for (const enemy of live) {
      if (enemy.state !== 'alive') continue
      const color = ARCHETYPE_COLORS[enemy.archetype]
      if (color == null) continue
      const b = Enemy.getScreenBounds(enemy, this._isoWorld, this._cameraIso, this._viewportCenter)
      out.push({
        enemyId: enemy.id,
        archetype: enemy.archetype,
        x: b.x, y: b.y, w: b.w, h: b.h,
        color,
      })
    }
    return out
  }
}
