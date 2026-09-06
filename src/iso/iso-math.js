/**
 * src/iso/iso-math.js
 *
 * Pure isometric ↔ screen transforms (F2.5.7 staggered diamond tessellation).
 * Zero Pixi imports by design (TILE-001): exercisable from DevTools,
 * reusable by hit-detection (F3) and hand+pen (F3).
 *
 * Conventions (F2.5.7 MODIFIED TILE-001):
 *   - Each tile is a `tileSize × tileSize` square PNG rotated 45° at runtime
 *     (the on-disk texture stays top-down; rotation is via `_worldLayer.rotation`).
 *   - After 45° rotation, each tile becomes a diamond with:
 *       horizontal radius = tileSize / √2
 *       vertical radius   = tileSize / √2
 *   - Adjacent diamonds in the SAME ROW have centers separated by `tileSize × √2 / 2`
 *     (one full diamond half-width) so left/right corners touch exactly.
 *   - Adjacent rows are staggered by half that horizontal step AND half the
 *     vertical step so the top/bottom corners interlock with the next row.
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
  // F2.5.7: staggered diamond tessellation.
  //   - Same-row step = tileSize × √2 / 2 ≈ 45.25 (half the diamond's diagonal).
  //   - Row stagger  = same as same-row step (half the row width).
  //   - Row vertical = tileSize × √2 / 2 (half the diamond's vertical diagonal).
  const step = (tileSize * Math.SQRT2) / 2  // ≈ tileSize / √2
  const rowOffset = (Math.abs(isoY) % 2) * step
  return {
    sx: tileWorldOrigin.x + isoX * step + rowOffset,
    sy: tileWorldOrigin.y + isoY * step,
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
  const step = (tileSize * Math.SQRT2) / 2
  const ly = sy - tileWorldOrigin.y
  const gy = Math.round(ly / step)
  const rowOffset = (Math.abs(gy) % 2) * step
  const lx = sx - tileWorldOrigin.x - rowOffset
  const isoX = lx / step
  return { isoX, isoY: gy }
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
  // F2.5.7: diamond tessellation step on both axes.
  return { tileHalfWidth: (tileSize * Math.SQRT2) / 2, tileHalfHeight: (tileSize * Math.SQRT2) / 2 }
}