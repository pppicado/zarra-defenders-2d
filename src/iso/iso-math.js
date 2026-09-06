/**
 * src/iso/iso-math.js
 *
 * Pure isometric ↔ screen transforms (F2.5.8 staggered diamond tessellation).
 * Zero Pixi imports by design (TILE-001): exercisable from DevTools,
 * reusable by hit-detection (F3) and hand+pen (F3).
 *
 * Conventions (F2.5.8 MODIFIED TILE-001):
 *   - Each tile is a `tileSize × tileSize` square PNG rotated 45° at runtime.
 *   - After 45° rotation, each tile becomes a diamond whose:
 *       horizontal diagonal = tileSize × √2   (left-to-right)
 *       vertical diagonal   = tileSize × √2   (top-to-bottom)
 *   - Adjacent diamonds in the SAME ROW have centers separated by the FULL
 *     horizontal diagonal (`tileSize × √2`) so the right corner of one
 *     diamond EXACTLY touches the left corner of the next.
 *   - Adjacent rows are staggered by half that horizontal step (the diamond's
 *     half-width) so the bottom corner of one row interlocks with the left
 *     corner of the row below.
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
  // F2.5.8: step = full diagonal of the rotated diamond = tileSize × √2.
  // Row stagger = half that step (the half-diagonal width).
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
  // F2.5.8: diamond tessellation step = full diagonal = tileSize × √2.
  return { tileHalfWidth: tileSize * Math.SQRT2, tileHalfHeight: tileSize * Math.SQRT2 }
}