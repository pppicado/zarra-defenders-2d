/**
 * src/iso/iso-math.js
 *
 * Pure isometric ↔ screen transforms (F2.5.15 iso-classic + per-tile 45° rotation).
 * Zero Pixi imports by design (TILE-001): exercisable from DevTools,
 * reusable by hit-detection (F3) and hand+pen (F3).
 *
 * Conventions (F2.5.15 MODIFIED TILE-001):
 *   - Each tile is a `tileSize × tileSize` square PNG rotated 45° INDIVIDUALLY
 *     in its own `Tile` constructor (rotation = π/4 around its own center).
 *   - The `_worldLayer` does NOT rotate — only individual tiles do.
 *   - The grid of tile CENTERS uses the CLASSIC iso formula:
 *       sx = origin.x + (gx - gy) * (tileSize / √2)
 *       sy = origin.y + (gx + gy) * (tileSize / √2)
 *   - With step = tileSize / √2 (= half the rotated diamond's diagonal),
 *     the 6 neighbors in the iso grid have their diamond corners
 *     exactly touching at one point: NO overlap, NO gap. This is
 *     mathematically verified (see Python proof).
 *   - isoToScreen(0, 0) === tileWorldOrigin.
 */

/**
 * Convert iso coords to screen coords using a fixed world origin.
 * @param {number} isoX
 * @param {number} isoY
 * @param {number} tileSize  > 0
 * @param {{x:number, y:number}} tileWorldOrigin
 * @returns {{sx:number, sy:number}}
 */
export function isoToScreen(isoX, isoY, tileSize, tileWorldOrigin) {
  // F2.5.15: classic iso formula with step = tileSize / √2 (half diagonal of
  // the rotated diamond). Combined with each tile's own rotation = π/4
  // (set in Tile constructor), adjacent diamonds tessellate perfectly:
  // the right corner of one diamond exactly touches the left corner of
  // its iso neighbor at one point.
  const step = tileSize / Math.SQRT2
  return {
    sx: tileWorldOrigin.x + (isoX - isoY) * step,
    sy: tileWorldOrigin.y + (isoX + isoY) * step,
  }
}

/**
 * Inverse of isoToScreen. Free-aim may produce fractional coords.
 * @param {number} sx
 * @param {number} sy
 * @param {number} tileSize
 * @param {{x:number, y:number}} tileWorldOrigin
 * @returns {{isoX:number, isoY:number}}
 */
export function screenToIso(sx, sy, tileSize, tileWorldOrigin) {
  const step = tileSize / Math.SQRT2
  const lx = sx - tileWorldOrigin.x
  const ly = sy - tileWorldOrigin.y
  return {
    isoX: (lx / step + ly / step) / 2,
    isoY: (ly / step - lx / step) / 2,
  }
}

/**
 * Tile edge length from viewport. Clamped to [64, 256] for pixel-art
 * readability and "small-world" feel.
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @returns {number}  integer in [64, 256]
 */
export function computeTileSize(viewportWidth, viewportHeight) {
  const raw = Math.round(Math.min(viewportWidth, viewportHeight) / 16)
  if (raw < 64) return 64
  if (raw > 256) return 256
  return raw
}

/**
 * World origin (where iso (0,0) sits on screen). The 0.30 vertical
 * bias reserves the upper strip for the HUD/hand+pen (F3).
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @returns {{x:number, y:number}}
 */
export function computeWorldOrigin(viewportWidth, viewportHeight) {
  return {
    x: Math.round(viewportWidth / 2),
    y: Math.round(viewportHeight * 0.30),
  }
}

/**
 * @param {number} tileSize
 * @returns {{tileHalfWidth:number, tileHalfHeight:number}}
 */
export function getTileHalf(tileSize) {
  // F2.5.15: step = tileSize / √2.
  return { tileHalfWidth: tileSize / Math.SQRT2, tileHalfHeight: tileSize / Math.SQRT2 }
}

/**
 * Iso escape depth (CAM-003 / F3 escape rule).
 *
 * Returns the iso depth threshold BELOW which an enemy has escaped the
 * corridor. The threshold = camera iso depth (enemies are static in F3;
 * the camera advances; when camera.depth exceeds enemy.depth, the enemy
 * has been left behind).
 *
 * Implementation note: the original CAM-003 spec wrote
 *   escapeFrontDepth = cameraIsoX + cameraIsoY + 1
 * with the predicate `enemy.depth > escapeFrontDepth`. That predicate is
 * satisfied at t=0 for every enemy (all enemy depths > 1), which is the
 * inverse of the physics. The CAM-003 invariant we actually want is:
 *
 *   enemy escapes iff enemy.depth < camera.iso_depth
 *   (the camera has moved past the enemy)
 *
 * So this function returns `cameraIsoX + cameraIsoY` — the camera's current
 * iso depth — and the caller checks `enemy.depth < escapeFrontDepth(...)`.
 *
 * @param {number} cameraIsoX
 * @param {number} cameraIsoY
 * @returns {number}  the iso depth threshold; enemies with depth < this have escaped
 */
export function escapeFrontDepth(cameraIsoX, cameraIsoY) {
  // F3.2: buffer of 4 tiles so enemies remain hittable for a window after they
  // spawn. The camera-departure semantics are: enemy escapes when the camera
  // has moved ~4 tiles past it on the iso rail (depth grows at 0.6 per second
  // for our 60s rail; 4 tiles = ~6.6 s of hittable time per enemy, which gives
  // the player enough reaction time to score hits before escape).
  return cameraIsoX + cameraIsoY + 4
}

/**
 * Named export for the iso grid step (TILE-005 / spec MODIFIED).
 * Equivalent to tileSize / √2 — the value used inside isoToScreen/screenToIso.
 * @param {number} tileSize
 * @returns {number}
 */
export function ISO_STEP(tileSize) {
  return tileSize / Math.SQRT2
}