/**
 * src/iso/iso-math.js
 *
 * Pure isometric ↔ screen transforms (F2.5.2 square iso falso).
 * Zero Pixi imports by design (TILE-001): exercisable from DevTools,
 * reusable by hit-detection (F3) and hand+pen (F3).
 *
 * Conventions (F2.5.2 MODIFIED TILE-001):
 *   tileHalfWidth  = tileSize / 2
 *   tileHalfHeight = tileSize / 2   (was /4 in F2.5.1 — now symmetric)
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
  const hw = tileSize / 2
  const hh = tileSize / 2  // F2.5.2: square iso — symmetric halves
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
  const hh = tileSize / 2  // F2.5.2: square iso — symmetric halves
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
  return { tileHalfWidth: tileSize / 2, tileHalfHeight: tileSize / 2 }  // F2.5.2: square
}