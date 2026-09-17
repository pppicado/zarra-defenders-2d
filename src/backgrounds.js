/**
 * src/backgrounds.js
 *
 * BackgroundLayer — per-stage scrolling background (BG-001..BG-005).
 *
 * Replaces the tile-based isometric ground (fase-2.5 `iso-tile-system`) with a
 * single long PNG per stage that scrolls at a parallax factor of 0.2 — the
 * bg is a child of `isoWorld.container` and counter-translates by
 * `(1 - parallax)` of the world scroll to stay inside the viewport for the
 * full rail.
 *
 * Math (see spec BG-002):
 *   worldScrollPx(t) = (cameraIso.isoX + cameraIso.isoY) * (TILE_SIZE / √2)
 *   sprite.y(t)      = -BG_INITIAL_OFFSET_PX - worldScrollPx(t) * (1 - parallax)
 *   bg_screen_top(t) = worldScrollPx(t) + sprite.y(t)  (since container.y = worldScrollPx)
 *                    = worldScrollPx(t) * parallax - BG_INITIAL_OFFSET_PX
 *
 * For parallax=0.2, BG_SOURCE_HEIGHT_PX=1120, BG_SCALE=2 (rendered 2240 px tall),
 * the bg covers viewport [0, 720] for the entire 120 s rail (verified t=0/60/120
 * in spec BG-002 scenarios).
 *
 * Pure math helpers are exported for unit tests (no PIXI import). The
 * `BackgroundLayer` class uses PIXI.Sprite + PIXI.Assets.load.
 *
 * No global side effects on import. Safe to import anywhere (main.js, tests).
 */
import { TILE_SIZE } from './canvas.js?v=44'

// ============================================================================
// BG-001 / BG-002 — constants
// ============================================================================

/** Parallax factor: bg scrolls at 20% of world speed (BG-002). */
export const BG_PARALLAX = 0.2

/** Source height in pixels. minimax text_to_image with aspect_ratio=9:16
 *  returns ~1024×1792; Pillow NEAREST-resized to 640 wide gives 640×1120. */
export const BG_SOURCE_HEIGHT_PX = 1120

/** Sprite scale on screen (BG-001): 2× gives the "pixel art 80s" upscale. */
export const BG_SCALE = 2

/** Rendered bg height on screen. */
export const BG_RENDERED_HEIGHT_PX = BG_SOURCE_HEIGHT_PX * BG_SCALE

/** Total iso depth travelled by the camera along the canonical rail
 *  (0,0) → (36,36) over 120 s. Depth = isoX + isoY at the end = 72. */
export const RAIL_DEPTH_TILES = 72

/** Max world translation on screen (px) = RAIL_DEPTH_TILES × (TILE_SIZE / √2). */
export const MAX_WORLD_SCROLL_PX = RAIL_DEPTH_TILES * (TILE_SIZE / Math.SQRT2)

/** Initial vertical offset (px). The bg starts with its top edge above the
 *  viewport; as the world scrolls, the top descends at the parallax rate.
 *  At t=120s the bg top is exactly at screen y=0, fully visible. */
export const BG_INITIAL_OFFSET_PX = MAX_WORLD_SCROLL_PX * BG_PARALLAX

// ============================================================================
// BG-002 — pure math helpers
// ============================================================================

/**
 * Compute the sprite's local Y at a given camera iso position.
 *
 * The bg is a child of `isoWorld.container` (whose `position.y = worldScrollPx`).
 * To make the bg cover the viewport with parallax, we counter-translate by
 * `(1 - parallax)` of the world scroll. Initial position is `-BG_INITIAL_OFFSET_PX`
 * so the bg starts above the viewport and descends at the parallax rate.
 *
 * @param {{isoX:number, isoY:number}} cameraIso
 * @param {number} [parallax=BG_PARALLAX]
 * @param {number} [initialOffset=BG_INITIAL_OFFSET_PX]
 * @returns {number} sprite.y in container-local px
 */
export function computeBgSpriteY(cameraIso, parallax = BG_PARALLAX, initialOffset = BG_INITIAL_OFFSET_PX) {
  const step = TILE_SIZE / Math.SQRT2
  const worldScrollPx = (cameraIso.isoX + cameraIso.isoY) * step
  return -initialOffset - worldScrollPx * (1 - parallax)
}

/**
 * Compute the initial offset for an arbitrary parallax + rail depth.
 * Used by tests and by future stage-specific configs.
 *
 * @param {number} parallax
 * @param {number} railDepth  iso depth at the end of the rail (= max isoX + max isoY)
 * @returns {number}
 */
export function computeBgInitialOffset(parallax, railDepth) {
  const maxScroll = railDepth * (TILE_SIZE / Math.SQRT2)
  return maxScroll * parallax
}

// ============================================================================
// BG-001 / BG-003 / BG-004 — BackgroundLayer class (PIXI-dependent)
// ============================================================================

/**
 * Scrolling background layer.
 *
 * Holds a single PIXI.Sprite child of the given `container` (should be
 * `isoWorld.container` so the bg inherits world translation). The sprite's
 * `scale.set(2, 2)` gives the pixel-art upscale; the sprite's `y` is animated
 * each tick by `update(cameraIso)` to add parallax.
 *
 * Lifecycle:
 *   const bg = new BackgroundLayer({ container: isoWorld.container, viewportWidth: LOGICAL_W })
 *   await bg.load('stage1-lashoyas', 'assets/backgrounds/stage1-lashoyas.png')
 *   // each tick:
 *   bg.update({ isoX: camera.getCameraX(), isoY: camera.getCameraY() })
 *   // at rail end:
 *   bg.freeze()           // bg stops updating
 *   // on retry:
 *   bg.unfreeze()         // bg resumes with current camera position
 *   // on stage swap:
 *   await bg.setStage('stage2-lahoz', 'assets/backgrounds/stage2-lahoz.png')
 *   // on teardown:
 *   bg.destroy()
 */
export class BackgroundLayer {
  /**
   * @param {Object} opts
   * @param {Object} opts.container  PIXI.Container parent (typically isoWorld.container)
   * @param {number} opts.viewportWidth  LOGICAL_W (used for sprite.x centering)
   * @param {number} [opts.parallax=BG_PARALLAX]
   */
  constructor({ container, viewportWidth, parallax = BG_PARALLAX }) {
    if (!container) throw new Error('BackgroundLayer: container is required')
    if (typeof viewportWidth !== 'number') throw new Error('BackgroundLayer: viewportWidth is required')
    this.container = container
    this.viewportWidth = viewportWidth
    this.parallax = parallax
    this._sprite = null
    this._texture = null
    this._frozen = false
    this._stageId = null
  }

  /**
   * BG-001 — load a single per-stage PNG, NEAREST scale, scale (2, 2).
   * Destroys the previous texture (no GPU leak on stage swap).
   *
   * @param {string} stageId
   * @param {string} assetPath  relative URL like 'assets/backgrounds/stage1-lashoyas.png'
   */
  async load(stageId, assetPath) {
    const tex = await PIXI.Assets.load(assetPath)
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
    this._setTexture(stageId, tex)
  }

  /**
   * Inject a pre-loaded PIXI.Texture directly. Used by the placeholder
   * path during PR-1 (before Minimax assets land) and by tests.
   * Same NEAREST + scale + anchor contract as `load`.
   * @param {string} stageId
   * @param {PIXI.Texture} texture
   */
  setTexture(stageId, texture) {
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
    this._setTexture(stageId, texture)
  }

  /** Internal: destroy previous + mount new sprite with NEAREST + scale + anchor. */
  _setTexture(stageId, tex) {
    if (this._texture) {
      this._texture.destroy(true)
      this._texture = null
    }
    if (this._sprite) {
      if (this._sprite.parent) this._sprite.parent.removeChild(this._sprite)
      this._sprite.destroy()
      this._sprite = null
    }
    this._texture = tex

    const sprite = new PIXI.Sprite(tex)
    sprite.scaleMode = PIXI.SCALE_MODES.NEAREST
    sprite.scale.set(BG_SCALE, BG_SCALE)
    sprite.anchor.set(0, 0)
    sprite.x = 0
    sprite.y = -BG_INITIAL_OFFSET_PX
    this.container.addChild(sprite)
    this._sprite = sprite

    this._frozen = false
    this._stageId = stageId
  }

  /**
   * BG-002 — per-tick scroll. No-op when frozen.
   * @param {{isoX:number, isoY:number}} cameraIso
   */
  update(cameraIso) {
    if (this._frozen) return
    if (!this._sprite) return
    this._sprite.y = computeBgSpriteY(cameraIso, this.parallax, BG_INITIAL_OFFSET_PX)
  }

  /** BG-003 — stop scrolling. */
  freeze() {
    this._frozen = true
  }

  /**
   * BG-003 — resume scrolling. Re-anchors to the current camera iso so the
   * resume is seamless (no visual jump).
   * @param {{isoX:number, isoY:number}} [cameraIso]  optional override
   */
  unfreeze(cameraIso) {
    this._frozen = false
    // If a cameraIso is given, use it for the re-anchor. Otherwise leave
    // the sprite at its current y — main.js will call update() next tick.
    if (cameraIso && this._sprite) {
      this._sprite.y = computeBgSpriteY(cameraIso, this.parallax, BG_INITIAL_OFFSET_PX)
    }
  }

  /** BG-004 — swap to a different stage. Wraps load(). */
  async setStage(stageId, assetPath) {
    await this.load(stageId, assetPath)
  }

  /** @returns {string|null} */
  get stageId() { return this._stageId }
  /** @returns {boolean} */
  get isFrozen() { return this._frozen }
  /** @returns {PIXI.Sprite|null} */
  get sprite() { return this._sprite }

  /** Teardown: destroy texture + sprite, remove from container. */
  destroy() {
    if (this._texture) {
      this._texture.destroy(true)
      this._texture = null
    }
    if (this._sprite) {
      if (this._sprite.parent) this._sprite.parent.removeChild(this._sprite)
      this._sprite.destroy()
      this._sprite = null
    }
    this._stageId = null
  }
}