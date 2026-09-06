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
    // F2.5.1: viewOrigin is the world-container anchor (viewport center), distinct
    // from tileWorldOrigin (HUD-strip tile origin used by isoToScreen/screenToIso).
    // CAM-002 requires the camera-projected iso position to land at viewport center.
    this._viewOrigin = { x: opts.viewportWidth / 2, y: opts.viewportHeight / 2 }

    this.container = new PIXI.Container()
    this.container.name = 'isoWorld'
    this.container.sortableChildren = false  // explicit zIndex (ADR #1)

    // F2.5.6: tiles are SQUARE PNGs in a dimetric grid, NOT rotated.
    // The `_worldLayer` wrapper exists for future layering needs (e.g.
    // parallax background, ambient effects) but no longer applies a 45°
    // rotation — rotation caused visible BLUE GAPS between tiles because
    // the rotated diamond's corners don't tile without overlap.
    this._worldLayer = new PIXI.Container()
    this._worldLayer.name = 'worldLayer'
    this._worldLayer.rotation = 0
    this._worldLayer.sortableChildren = false
    this.container.addChild(this._worldLayer)

    this._tileLayer = new PIXI.Container()
    this._tileLayer.name = 'tiles'; this._tileLayer.sortableChildren = false
    this._worldLayer.addChild(this._tileLayer)

    // F2.5.6: sprites live in the world container (not inside `_worldLayer`)
    // so they render upright regardless of any future world-layer effects.
    // Their base lands on the front edge of each tile (see update() below).
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

  /** Public sub-layer where main.js mounts vertical sprites (3 pinos + 1 castillo for F2.5). */
  get spriteLayer() { return this._spriteLayer }

  /** Public sub-layer where the active Tilemap renders tiles. */
  get tileLayer() { return this._tileLayer }

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
    // CAM-002: world container anchor is viewOrigin (viewport center), NOT tileWorldOrigin.
    // camera-projected iso position lands at viewOrigin instead of the HUD strip.
    this.container.position.set(this._viewOrigin.x - csx, this._viewOrigin.y - csy)

    if (this._activeTilemap) {
      const range = computeCullRange(camIsoX, camIsoY, this.viewportWidth, this.viewportHeight, this.tileSize, this.tileWorldOrigin)
      this._activeTilemap.cullAndRender(this._tileLayer, range, pickVariantFlat)
    }

    for (const { gx, gy, sprite, offset = Z_BANDS.decoration } of verticalSprites) {
      // F2.5.6: tile is a `tileSize × tileSize` square (no rotation). Sprite
      // base (anchor y=1.0) lands at the FRONT edge of the tile, which is
      // `tileSize/2` below the tile's center in world-space.
      const { sx: csx, sy: csy } = isoToScreen(gx, gy, this.tileSize, this.tileWorldOrigin)
      const frontOffset = this.tileSize / 2
      sprite.position.set(csx, csy + frontOffset)
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