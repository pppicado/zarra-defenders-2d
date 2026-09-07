/**
 * src/design-viewport.js?v=9
 *
 * Resolution-independent scaling. The game is designed for a 1280x720 reference
 * viewport; everything that lives in the HUD layer (hand sprite, integrity hearts,
 * future overlays) scales by `scale = min(actualW / 1280, actualH / 720)` so it
 * looks identical on a 4K monitor, a 1080p desktop, or a 414x233 mobile letterbox.
 *
 * The iso world does NOT use this scale (its tileSize is computed from the
 * viewport directly by `computeTileSize`, so it adapts naturally).
 *
 * Why "min" not "max": a portrait mobile letterbox is e.g. 414x233, and
 * `Math.min(414/1280, 233/720) = 0.323` — small, so the HUD doesn't overflow.
 * A 4K display is 3840x2160, giving `min(3.0, 3.0) = 3.0` — the HUD triples
 * in size, matching the world's scale.
 *
 * Why floor at 64px: on a sub-1280x720 viewport, the iso world still needs to
 * be readable; we keep the design tileSize at 64 and only scale the HUD.
 *
 * Usage:
 *   const dv = new DesignViewport(actualW, actualH)
 *   hudContainer.scale.set(dv.scale, dv.scale)
 *   const cx = dv.designWidth / 2   // always 640
 *   const cy = dv.designHeight - 32 // always 688
 */
export const DESIGN_W = 1280
export const DESIGN_H = 720

export class DesignViewport {
  /**
   * @param {number} actualWidth
   * @param {number} actualHeight
   */
  constructor(actualWidth, actualHeight) {
    this.actualWidth = actualWidth
    this.actualHeight = actualHeight
    this.scale = Math.min(actualWidth / DESIGN_W, actualHeight / DESIGN_H)
    // The HUD lives in "design space" (1280x720), then is scaled into the actual viewport.
    // This means the HUD can be positioned with constants like 640 or 688 regardless of
    // the actual viewport size, and the world can use the real viewport size freely.
    this.designWidth = DESIGN_W
    this.designHeight = DESIGN_H
    // Offset to center the scaled HUD inside the actual viewport (for non-16:9
    // displays the wrapper already centers, so this is 0; kept for completeness).
    this.offsetX = (actualWidth - DESIGN_W * this.scale) / 2
    this.offsetY = (actualHeight - DESIGN_H * this.scale) / 2
  }
}
