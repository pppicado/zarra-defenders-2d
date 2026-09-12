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

import { isoToScreen, screenToIso, computeTileSize, computeWorldOrigin, escapeFrontDepth, ISO_STEP } from './iso-math.js?v=44'
import { Tilemap, computeCullRange, computeZIndex, Z_BANDS } from './tilemap.js?v=44'

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

    // F2.5.15: tiles are SQUARE PNGs rotated 45° INDIVIDUALLY by the Tile
    // class (see src/iso/tilemap.js Tile constructor). The `_worldLayer`
    // does NOT rotate — rotating the layer would move the tiles around the
    // (0,0) world origin, not around their centers, breaking tessellation.
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
    // CAM-001: rail direction is monotonic non-decreasing in depth. A regression
    // (sum drops below the previous frame) means the camera moved backward
    // unexpectedly — warn.
    if (sum < this._lastCameraSum && this._lastCameraSum !== -Infinity) {
      console.warn(`[IsoWorld] camera depth regressed: ${this._lastCameraSum} → ${sum}`)
    }
    this._lastCameraSum = sum

    // F4i: anchor the world container so the iso (camIsoX, camIsoY) lands at
    // tileWorldOrigin (NOT viewport center). The Tile constructor renders
    // each tile in local space as isoToScreen(gx, gy, ..., tileWorldOrigin)
    // — i.e. with the Y-mirror baked into tileWorldOrigin.y but NOT inverted
    // a second time by a separate viewOrigin. Keeping the container anchor
    // aligned with tileWorldOrigin means world_y of a tile = local_y +
    // container.y = (tileWorldOrigin.y + sum*step) + (sum·step_offset) =
    // tileWorldOrigin.y + sum·(step + step_offset).
    //
    // F4i: the +camIsoSum term on the Y side makes container.y INCREASE as
    // the rail advances, so fixed tiles migrate DOWN on screen — the
    // "world scrolls DOWN past the player" feel described in F3.10.
    // A fixed tile (sum=S) is at world_y = tileWorldOrigin.y + (S-camIsoSum)*step,
    // which moves DOWN with time. Tiles ahead of the camera (S > camIsoSum)
    // render BELOW tileWorldOrigin.y; tiles behind (S < camIsoSum) render
    // ABOVE it. New tiles (larger S) appear from above the anchor as
    // camIsoSum grows.
    const step = this.tileSize / Math.SQRT2
    this.container.position.set(
      this.tileWorldOrigin.x - (this.tileWorldOrigin.x + (camIsoX - camIsoY) * step),
      this.tileWorldOrigin.y - (this.tileWorldOrigin.y - (camIsoX + camIsoY) * step)
    )

    if (this._activeTilemap) {
      const range = computeCullRange(camIsoX, camIsoY, this.viewportWidth, this.viewportHeight, this.tileSize, this.tileWorldOrigin)
      this._activeTilemap.cullAndRender(this._tileLayer, range, pickVariantFlat)
    }

    for (const { gx, gy, sprite, offset = Z_BANDS.decoration } of verticalSprites) {
      // F2.5.10: tiles are SQUARE PNGs rotated 45° INDIVIDUALLY (Tile.rotation
      // = π/4 around each tile's own center). The `_worldLayer` does not
      // rotate, so the sprite (in `container`) is unaffected by any world
      // transforms. F4g: enemies anchor at center (0.5, 0.5) and sit on the
      // iso cell center so the visible sprite lines up with the AABB the
      // player aims at; the previous (anchor 0.5, 1.0) + southOffset rendered
      // the sprite 1 tile ABOVE the iso center, leaving the AABB and the
      // visible sprite disjoint.
      const { sx: csx, sy: csy } = isoToScreen(gx, gy, this.tileSize, this.tileWorldOrigin, this._viewOrigin)
      sprite.position.set(csx, csy)
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
  isoToScreen(ix, iy) { return isoToScreen(ix, iy, this.tileSize, this.tileWorldOrigin, this._viewOrigin) }

  /**
   * Camera-aware iso -> screen inverse (mirror of `screenToIsoWithCamera`).
   *
   * `isoToScreen(ix, iy)` is pure math anchored at `tileWorldOrigin`; it returns
   * the position INSIDE the world container, NOT on screen. The live world
   * container translates by `-isoToScreen(camIso)` (so the camera iso lands at
   * the container's local origin), which means on the world CANVAS the camera
   * iso sits at the local origin offset — which equals `(tileWorldOrigin.x,
   * flippedYOrigin)`, NOT `(vc.x, vc.y)`.
   *
   * F5: corrected anchor — the world container is positioned so that
   * `isoToScreen(camIso)` (in container-local coords) lands at the container's
   * own origin, which renders on the canvas at the tileWorldOrigin (X) and
   * flippedYOrigin (Y). The previous `vc.x / vc.y` anchor put the camera iso
   * 144 px above the actual rendered location, which the old iso-plane AABB
   * (1.5-tile footprint) tolerated but the screen-space resolver cannot.
   *
   * @param {number} ix
   * @param {number} iy
   * @param {{isoX:number, isoY:number}} cameraIso       current camera iso position
   * @param {{x:number, y:number}} [viewportCenter]      unused; kept for back-compat
   * @returns {{sx:number, sy:number}}                   position in screen (logical 1280x720) space
   */
  isoToScreenWithCamera(ix, iy, cameraIso, viewportCenter) {
    const vc = viewportCenter ?? this._viewOrigin
    const camIso = cameraIso ?? { isoX: 0, isoY: 0 }
    const camScreen = isoToScreen(camIso.isoX, camIso.isoY, this.tileSize, this.tileWorldOrigin, vc)
    const targetScreen = isoToScreen(ix, iy, this.tileSize, this.tileWorldOrigin, vc)
    // Anchor: the camera iso (cx, cy) renders on the canvas at the world
    // container's origin point, which is (tileWorldOrigin.x, flippedYOrigin).
    // flippedYOrigin = 2 * vc.y - tileWorldOrigin.y (Y-mirror line is vc.y).
    const anchorX = this.tileWorldOrigin.x
    const anchorY = 2 * vc.y - this.tileWorldOrigin.y
    return {
      sx: anchorX + (targetScreen.sx - camScreen.sx),
      sy: anchorY + (targetScreen.sy - camScreen.sy),
    }
  }

  /**
   * @deprecated Since F3: use `screenToIsoWithCamera(sx, sy, cameraIso, viewportCenter)`.
   *             Legacy pure-math helper; ignores world-container translation.
   */
  screenToIso(sx, sy) { return screenToIso(sx, sy, this.tileSize, this.tileWorldOrigin, this._viewOrigin) }

  /**
   * Camera-aware screen -> iso inverse (CAM-002 / F3 hit detection).
   *
   * The base `screenToIso` is a pure math transform anchored at `tileWorldOrigin`
   * (a HUD-strip tile origin). The live world container translates by
   *   container.position = (anchorX - isoToScreen(camIso).sx, anchorY - isoToScreen(camIso).sy)
   * where `(anchorX, anchorY) = (tileWorldOrigin.x, flippedYOrigin)`. A click in
   * screen-space must first be un-translated by the same anchor delta before the
   * pure inverse returns the correct world iso coord.
   *
   * F5: corrected anchor — see `isoToScreenWithCamera` above. The previous
   * `vc.x / vc.y` anchor produced iso coords that were 1.6 tiles off from
   * what the screen-space resolver now needs to hit accurately.
   *
   * @param {number} sx          screen X (already relative to canvas)
   * @param {number} sy          screen Y (already relative to canvas)
   * @param {{isoX:number, isoY:number}} cameraIso  current camera iso position
   * @param {{x:number, y:number}} viewportCenter   same as `this._viewOrigin`
   * @returns {{isoX:number, isoY:number}}
   */
  screenToIsoWithCamera(sx, sy, cameraIso, viewportCenter) {
    const vc = viewportCenter ?? this._viewOrigin
    const camIso = cameraIso ?? { isoX: 0, isoY: 0 }
    const { sx: csx, sy: csy } = isoToScreen(camIso.isoX, camIso.isoY, this.tileSize, this.tileWorldOrigin, vc)
    const anchorX = this.tileWorldOrigin.x
    const anchorY = 2 * vc.y - this.tileWorldOrigin.y
    const worldX = anchorX - csx
    const worldY = anchorY - csy
    const localX = sx - worldX
    const localY = sy - worldY
    return screenToIso(localX, localY, this.tileSize, this.tileWorldOrigin, vc)
  }
}

/** Deterministic checkerboard picker. F4+ stages plug in path-aware logic. */
function pickVariantFlat(gx, gy, variants) {
  const pool = variants ?? ['pino_clear_grass_rojizo', 'suelo_arcilloso_rojizo']
  return pool[Math.abs(gx + gy) % pool.length]
}

// Re-export helpers for callers that already imported IsoWorld.
export { isoToScreen, screenToIso, computeTileSize, computeWorldOrigin, computeZIndex, computeCullRange, Z_BANDS, escapeFrontDepth, ISO_STEP }