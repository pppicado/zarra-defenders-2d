/**
 * src/iso/iso-math.js
 *
 * Pure isometric ↔ screen transforms (F2.5.4 square iso falso).
 * Zero Pixi imports by design (TILE-001): exercisable from DevTools,
 * reusable by hit-detection (F3) and hand+pen (F3).
 *
 * Conventions (F2.5.4 MODIFIED TILE-001):
 *   separation between adjacent tile centers = tileSize / sqrt(2)
 *   so that after each tile (a `tileSize × tileSize` PNG) is rotated 45°
 *   by `_worldLayer.rotation`, the rotated diamonds touch without overlap.
 *   isoToScreen(0, 0) === tileWorldOrigin
 *
 * The on-disk texture is a square PNG; the visible diamond is created
 * by setting `_worldLayer.rotation = π/4` on the IsoWorld wrapper
 * (see src/iso/world.js). Iso math here works in pre-rotation world
 * space — square coordinates — so position/zIndex math stays untouched.
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
  // F2.5.4: square iso falso — separation between adjacent tile centers in
  // world-space is `tileSize / sqrt(2)` so that after each tile is rendered
  // as a square `tileSize × tileSize` PNG and rotated 45° by `_worldLayer`,
  // the rotated diamonds touch without overlap.
  const k = tileSize / Math.SQRT2
  return {
    sx: tileWorldOrigin.x + (isoX - isoY) * k,
    sy: tileWorldOrigin.y + (isoX + isoY) * k,
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
  // F2.5.4: must match isoToScreen's `k = tileSize / sqrt(2)`.
  const k = tileSize / Math.SQRT2
  const lx = sx - tileWorldOrigin.x
  const ly = sy - tileWorldOrigin.y
  return {
    isoX: (lx / k + ly / k) / 2,
    isoY: (ly / k - lx / k) / 2,
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
  // F2.5.4: square iso falso — center-to-center separation is `tileSize / sqrt(2)`.
  return { tileHalfWidth: tileSize / Math.SQRT2, tileHalfHeight: tileSize / Math.SQRT2 }
}