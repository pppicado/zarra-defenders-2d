# `hand-pen-sprite` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: hand-pen-sprite (NEW)

## Purpose

Define the contract for the pointer-tracking hand sprite (`assets/sprites/hand_pen.png`). The sprite is generated once via `minimax_text_to_image` (per `iso-asset-pipeline` ASSET-001 / chroma-key conventions) and shipped in this PR — F3 ships a real asset, NOT a magenta placeholder. The sprite follows the pointer with a fixed offset so it sits beside the crosshair (not under it) and serves as the papeleta spawn origin (see `combat-core` REQ-CMB-002).

## Requirements

### REQ-HND-001: Sprite asset (real asset, one-shot minimax)

The hand sprite SHALL be a PNG file at `assets/sprites/hand_pen.png`. The asset SHALL be generated ONCE in this PR via `minimax_text_to_image` per the `iso-asset-pipeline` ASSET-001 chroma-key + style conventions. The prompt template SHALL include the verbatim substring `"64×64 px square sprite, top-down view, pixel art, flat magenta #FF00FF background, hand holding a pen, no anti-aliasing"`. Aspect ratio SHALL be `"1:1"`. After generation, the file SHALL be post-processed with the standard `tools/postprocess_v4.py` magenta-key replacement so the background is transparent and the hand reads against any tile.

#### Scenario: hand_pen.png exists and is real

- GIVEN F3 lands
- WHEN `ls -la assets/sprites/hand_pen.png` runs
- THEN the file exists, is non-empty, and is NOT a solid magenta rectangle.

#### Scenario: Post-processed alpha is correct

- GIVEN the raw PNG from minimax has `#FF00FF` corners
- WHEN `tools/postprocess_v4.py` runs
- THEN the four corners of the post-processed PNG have `alpha = 0`.

### REQ-HND-002: Pointer tracking with fixed offset

The sprite SHALL render on the `hud` layer (NOT the `world` layer — it must not inherit the iso container transform). The sprite's screen position SHALL track the pointer with a fixed offset of `HAND_POINTER_OFFSET = { x: 24, y: 16 }` — the hand is positioned `24 px` to the right and `16 px` below the pointer, so the hand sits beside the crosshair (lower-right) and is visible to the player. The offset SHALL be a named constant exported from `src/main.js` (or the hand module) so it can be tuned in one place. The sprite SHALL be hidden (set `visible = false`) whenever the main menu, game-over overlay, or victory overlay is shown.

#### Scenario: Hand tracks pointer with locked offset

- GIVEN the test level is running (no overlay visible) and the pointer is at screen `(640, 480)`
- WHEN the next frame renders
- THEN the hand sprite's `x === 640 + 24 === 664`
- AND the hand sprite's `y === 480 + 16 === 496`.

#### Scenario: Hand does not flip horizontally

- GIVEN the offset is locked to `{ x: 24, y: 16 }`
- WHEN the pointer moves to the right half of the screen (e.g., `(1800, 540)`)
- THEN the hand remains offset to the lower-right (the offset does NOT flip — proposal `§11.5` open question resolved: no flip in F3).

#### Scenario: Hand hidden during main menu

- GIVEN the main menu is the first-paint screen
- WHEN the menu renders
- THEN the hand sprite's `visible === false`.

#### Scenario: Hand hidden during game-over / victory

- GIVEN the game-over (or victory) overlay is visible
- WHEN the next frame renders
- THEN the hand sprite's `visible === false`.

### REQ-HND-003: Z-index and layering

The hand sprite SHALL be rendered on the `hud` layer with a z-index of `1000` (strictly greater than the crosshair's z-index, so the hand always sits on top of the crosshair visually). The hand SHALL NOT occlude the integrity HUD — both live on `hud`, but the HUD's render order keeps it pinned at the top-right corner regardless of pointer position.

#### Scenario: Hand z-index is 1000

- GIVEN the test level is running and the hand sprite is mounted
- WHEN the sprite's `zIndex` is inspected
- THEN `hand.zIndex === 1000`.

#### Scenario: Hand sits on top of crosshair

- GIVEN the crosshair is at pointer position `(640, 480)` and the hand is at `(664, 496)`
- WHEN the next frame renders
- THEN the hand sprite is visible above the crosshair in the z-stack (no clipping, no sub-pixel flicker).

### REQ-HND-004: Papeleta spawn origin

The papeleta spawn point SHALL be the hand sprite's screen-space CENTER, NOT the crosshair position and NOT a fixed HUD point. The center SHALL be computed from `hand.x + hand.width / 2, hand.y + hand.height / 2`. The center SHALL be passed into `combat-core` as the spawn origin so the projectile flies from the hand's center to the click target.

#### Scenario: Papeleta spawns from hand center

- GIVEN the hand sprite is at `(664, 496)` with width × height = `64 × 64`
- WHEN the user taps at screen `(700, 520)`
- THEN the papeleta spawn point is `(664 + 32, 496 + 32) === (696, 528)`
- AND the projectile's velocity vector points from `(696, 528)` toward `screenToIsoWithCamera(700, 520, ...)`.

### REQ-HND-005: Touch device behavior

On touch devices, the hand SHALL follow the most recent touch point. On mouse devices, the hand SHALL follow `pointermove`. There is no "snap to" or smoothing — the hand tracks the raw pointer position plus the locked offset. The hand SHALL NOT be visible until the first pointer event is received (before any pointer interaction, the sprite is `visible = false`).

#### Scenario: Hand follows touch on mobile

- GIVEN a touch device with the test level running
- WHEN the user touches the screen at `(300, 400)`
- THEN the hand sprite moves to `(300 + 24, 400 + 16) === (324, 416)`.

#### Scenario: Hand hidden until first pointer event

- GIVEN the test level just mounted (no pointer interaction yet)
- WHEN the first frame renders
- THEN the hand sprite's `visible === false`.

### REQ-HND-006: Sprite dimensions

The sprite SHALL be a `64 × 64 px` square PNG (per the minimax prompt — `1:1` aspect ratio). After post-processing with `tools/postprocess_v4.py --size 64`, the on-disk texture SHALL be `64 × 64`. The visible rendered footprint on screen MAY differ from `64 × 64` (the renderer MAY scale); the asset dimensions are the source of truth.

#### Scenario: hand_pen.png is 64x64 on disk

- GIVEN the post-processed PNG
- WHEN `identify` (ImageMagick) or `PIL.Image.open(...).size` reads it
- THEN `(width, height) === (64, 64)`.

## Out of scope

- Animated hand sprite (e.g., wave, point) — out. The sprite is a single static frame.
- Multiple hand sprites (e.g., a left-handed variant for southpaw players) — out.
- "Hand grab" animation when firing — out. F3 has no firing animation on the hand.
- Theme variants (e.g., a different hand color for accessibility) — out.