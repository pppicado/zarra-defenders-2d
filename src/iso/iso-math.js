/**
 * src/iso/iso-math.js
 *
 * Pure isometric ↔ screen transforms (F2.5.9 iso classic + container rotation).
 * Zero Pixi imports by design (TILE-001): exercisable from DevTools,
 * reusable by hit-detection (F3) and hand+pen (F3).
 *
 * Conventions (F2.5.9 MODIFIED TILE-001):
 *   - Each tile is a `tileSize × tileSize` square PNG rotated 45° at runtime.
 *   - The grid of tile CENTERS follows the classic iso formula:
 *       sx = origin.x + (gx - gy) * (tileSize × √2 / 2)
 *       sy = origin.y + (gx + gy) * (tileSize × √2 / 2)
 *   - This puts centers on a perfect rhombic lattice. After rotating each
 *     tile 45° (via `_worldLayer.rotation = π/4`), the resulting diamonds
 *     tessellate perfectly — adjacent corners touch at exactly one point.
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
  // F2.5.9: classic iso formula with step = tileSize × √2 / 2.
  // After rotation of each tile by 45° (via `_worldLayer`), adjacent diamonds
  // tessellate perfectly. See test `iso-classic-rotated.png` for proof.
  const step = (tileSize * Math.SQRT2) / 2
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
  const step = (tileSize * Math.SQRT2) / 2
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
  // F2.5.9: classic iso step = tileSize × √2 / 2.
  return { tileHalfWidth: (tileSize * Math.SQRT2) / 2, tileHalfHeight: (tileSize * Math.SQRT2) / 2 }
}