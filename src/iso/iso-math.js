/**
 * src/iso/iso-math.js
 *
 * Pure isometric ↔ screen transforms (F2.5.6 square iso — NO tile rotation).
 * Zero Pixi imports by design (TILE-001): exercisable from DevTools,
 * reusable by hit-detection (F3) and hand+pen (F3).
 *
 * Conventions (F2.5.6 MODIFIED TILE-001):
 *   - Each tile is a `tileSize × tileSize` square PNG, NOT rotated at runtime.
 *   - Tiles are arranged in a dimetric (2:1) grid so the corners of
 *     adjacent tiles touch exactly: `sx = origin.x + (gx - gy) * tileSize/2`,
 *     `sy = origin.y + (gx + gy) * tileSize/2`.
 *   - isoToScreen(0, 0) === tileWorldOrigin.
 *
 * Why "square iso" without rotation: previous attempts rotated each tile
 * 45° around `_worldLayer`, which produced visible BLUE GAPS between
 * rotated diamonds (the rotated diamond's diagonal corners are at
 * `tileSize/√2` from center, not `tileSize/2`). Storing tiles as top-down
 * squares in a dimetric grid gives the same isometric look with no gaps.
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
  // F2.5.6: square iso — tile is `tileSize × tileSize`, no rotation.
  // Half-offset in each axis produces the standard 2:1 dimetric grid.
  const hw = tileSize / 2
  const hh = tileSize / 2
  return {
    sx: tileWorldOrigin.x + (isoX - isoY) * hw,
    sy: tileWorldOrigin.y + (isoX + isoY) * hh,
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
  const hw = tileSize / 2
  const hh = tileSize / 2
  const lx = sx - tileWorldOrigin.x
  const ly = sy - tileWorldOrigin.y
  return {
    isoX: (lx / hw + ly / hh) / 2,
    isoY: (ly / hh - lx / hw) / 2,
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
  return { tileHalfWidth: tileSize / 2, tileHalfHeight: tileSize / 2 }
}