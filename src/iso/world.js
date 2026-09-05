/**
 * src/iso/world.js
 *
 * IsoWorld orchestrator (CAM-001..CAM-003). Owns the PIXI.Container
 * that gets injected into the existing `world` layer of `src/main.js`.
 * - `container` is the only thing main.js adds to the existing `world`.
 * - `update(camera, sprites?)` applies `position.set(-csx, -csy)` and runs cull.
 * - `setStage(stageId)` swaps active tilemap + disposes previous (hard cut).
 *
 * The orchestrator does NOT mutate the camera or HUD — same separation
 * that `src/rail-camera.js` enforces.
 */

import { isoToScreen, screenToIso, computeTileSize, computeWorldOrigin } from './iso-math.js'
import { Tilemap, computeCullRange, computeZIndex, Z_BANDS } from './tilemap.js'

export class IsoWorld {
  constructor(opts) {
    if (!opts || typeof opts.viewportWidth !== 'number' || typeof opts.viewportHeight !== 'number') {
      throw new Error('IsoWorld requires viewportWidth and viewportHeight')
    }
    this.viewportWidth = opts.viewportWidth
    this.viewportHeight = opts.viewportHeight
    this.tileSize = opts.tileSize ?? computeTileSize(opts.viewportWidth, opts.viewportHeight)
    this.tileWorldOrigin = opts.tileWorldOrigin ?? computeWorldOrigin(opts.viewportWidth, opts.viewportHeight)

    this.container = new PIXI.Container()
    this.container.name = 'isoWorld'
    this.container.sortableChildren = false  // explicit zIndex (ADR #1)

    this._tileLayer = new PIXI.Container()
    this._tileLayer.name = 'tiles'; this._tileLayer.sortableChildren = false
    this.container.addChild(this._tileLayer)

    this._spriteLayer = new PIXI.Container()
    this._spriteLayer.name = 'verticalSprites'; this._spriteLayer.sortableChildren = false
    this.container.addChild(this._spriteLayer)

    this._tilemaps = new Map()
    this._activeTilemap = null
    this._activeStageId = null
    this._lastCameraSum = -Infinity
  }

  registerTilemap(tilemap) {
    if (!(tilemap instanceof Tilemap)) throw new Error('registerTilemap expects Tilemap')
    if (this._tilemaps.has(tilemap.stageId)) throw new Error(`tilemap "${tilemap.stageId}" already registered`)
    this._tilemaps.set(tilemap.stageId, tilemap)
  }

  /** CAM-003: hard cut, dispose previous tilemap, mount new. */
  setStage(stageId) {
    const next = this._tilemaps.get(stageId)
    if (!next) throw new Error(`no tilemap for "${stageId}"`)
    if (this._activeTilemap && this._activeTilemap !== next) this._activeTilemap.destroy()
    while (this._tileLayer.children.length > 0) {
      const c = this._tileLayer.children[0]; this._tileLayer.removeChild(c); c.destroy()
    }
    this._activeTilemap = next; this._activeStageId = stageId
  }

  get activeTilemap() { return this._activeTilemap }
  get activeStageId() { return this._activeStageId }

  /**
   * Per-frame update. Camera is duck-typed on getCameraX/getCameraY so
   * `src/rail-camera.js` stays untouched (CAM-001).
   */
  update(camera, verticalSprites = []) {
    const camIsoX = camera.getCameraX(), camIsoY = camera.getCameraY()
    const sum = camIsoX + camIsoY
    if (sum < this._lastCameraSum) {
      console.warn(`[IsoWorld] camera depth regressed: ${this._lastCameraSum} → ${sum}`)
    }
    this._lastCameraSum = sum

    const { sx: csx, sy: csy } = isoToScreen(camIsoX, camIsoY, this.tileSize, this.tileWorldOrigin)
    this.container.position.set(-csx, -csy)  // CAM-002

    if (this._activeTilemap) {
      const range = computeCullRange(camIsoX, camIsoY, this.viewportWidth, this.viewportHeight, this.tileSize, this.tileWorldOrigin)
      this._activeTilemap.cullAndRender(this._tileLayer, range, pickVariantFlat)
    }

    for (const { gx, gy, sprite, offset = Z_BANDS.decoration } of verticalSprites) {
      const { sx, sy } = isoToScreen(gx, gy, this.tileSize, this.tileWorldOrigin)
      sprite.position.set(sx, sy)
      sprite.zIndex = computeZIndex(gx, gy, offset)
    }
  }

  destroy() {
    for (const tm of this._tilemaps.values()) tm.destroy()
    this._tilemaps.clear()
    this._activeTilemap = null; this._activeStageId = null
    this.container.destroy({ children: true })
  }

  /** Convenience passthroughs so callers don't import iso-math directly. */
  isoToScreen(ix, iy) { return isoToScreen(ix, iy, this.tileSize, this.tileWorldOrigin) }
  screenToIso(sx, sy) { return screenToIso(sx, sy, this.tileSize, this.tileWorldOrigin) }
}

/** Deterministic checkerboard picker. F4+ stages plug in path-aware logic. */
function pickVariantFlat(gx, gy, variants) {
  const pool = variants ?? ['pino_clear_grass_rojizo', 'suelo_arcilloso_rojizo']
  return pool[Math.abs(gx + gy) % pool.length]
}

// Re-export helpers for callers that already imported IsoWorld.
export { isoToScreen, screenToIso, computeTileSize, computeWorldOrigin, computeZIndex, computeCullRange, Z_BANDS }