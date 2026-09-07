/**
 * src/iso/iso-math.js
 *
 * Pure isometric ↔ screen transforms (F2.5.13 grid-with-stagger + per-tile rotation).
 * Zero Pixi imports by design (TILE-001): exercisable from DevTools,
 * reusable by hit-detection (F3) and hand+pen (F3).
 *
 * Conventions (F2.5.13 MODIFIED TILE-001):
 *   - Each tile is a `tileSize × tileSize` square PNG rotated 45° INDIVIDUALLY
 *     in its own `Tile` constructor (rotation = π/4 around its own center).
 *   - The `_worldLayer` does NOT rotate — rotating the layer shifts the
 *     contents around the layer's (0,0), which breaks tessellation.
 *   - The grid of tile CENTERS uses LINEAR step + horizontal stagger:
 *       sx = origin.x + gx * step + (gy % 2) * (step / 2)
 *       sy = origin.y + gy * step
 *     with step = tileSize × √2 (= full rotated-diamond diagonal).
 *   - This places centers on a horizontal-staggered grid. When each tile is
 *     rotated 45° around its own center, the resulting diamonds tessellate
 *     perfectly: the right corner of one diamond exactly touches the left
 *     corner of the next one, AND the bottom corner of row N touches the
 *     left corner of row N+1 (because of the stagger).
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
  // F2.5.13: linear grid with horizontal stagger (every other row shifts by
  // half the row width). step = full diagonal of the rotated diamond so
  // adjacent diamonds in the same row have their side corners exactly
  // touching. Combined with each tile's own rotation = π/4 (set in Tile
  // constructor), tessellation is perfect. See Python verification at
  // `python3 -c "..."` for math proof.
  const step = tileSize * Math.SQRT2
  const rowOffset = (Math.abs(isoY) % 2) * (step / 2)
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
  const step = tileSize * Math.SQRT2
  const ly = sy - tileWorldOrigin.y
  const gy = Math.round(ly / step)
  const rowOffset = (Math.abs(gy) % 2) * (step / 2)
  const lx = sx - tileWorldOrigin.x - rowOffset
  const isoX = Math.round(lx / step)
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
  // F2.5.13: full diagonal step.
  return { tileHalfWidth: tileSize * Math.SQRT2, tileHalfHeight: tileSize * Math.SQRT2 }
}