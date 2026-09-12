# Delta for `scrolling-background`

## Purpose

Replace the tile-based isometric ground (fase-2.5 `iso-tile-system`) with a single per-stage background image that scrolls along the rail. The system MUST keep `isoToScreenWithCamera` / `screenToIsoWithCamera` working for hit detection, but MUST NOT render any tiles in the main game.

## ADDED Requirements

### Requirement: BG-001 — BackgroundLayer loads per-stage PNG

The system MUST provide `BackgroundLayer` class in `src/backgrounds.js` with a `load(stageId, assetPath)` method that:

- Loads the asset via `PIXI.Assets.load(assetPath)` exactly once
- Sets `texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST` for pixel-art crispness
- Creates a single `PIXI.Sprite` child of the `isoWorld.container` (inherits world translation)
- Scales the sprite to `(BG_SCALE, BG_SCALE) = (2, 2)` so a 640-wide source renders 1280 px on the 1280-wide canvas
- Anchors the sprite at `(0, 0)` (top-left)
- Sets initial `sprite.y = -BG_INITIAL_OFFSET_PX` (see BG-002 derivation)
- Destroys the previous texture on re-load so the GPU does not leak

#### Scenario: Load replaces previous texture

- GIVEN a BackgroundLayer already loaded with stage1
- WHEN `load('stage2', 'assets/backgrounds/stage2-pueblo.png')` resolves
- THEN the previous stage1 texture is destroyed (no GPU leak)
- AND the sprite now renders stage2's texture

#### Scenario: Source is 640×1120, on-screen is 1280×2240

- GIVEN `load('stage1', 'assets/backgrounds/stage1-bosque.png')` resolves with a 640×1120 source
- WHEN the sprite's `scale.x` and `scale.y` are inspected
- THEN both equal `2`
- AND the visible footprint on the canvas is 1280 px wide × 2240 px tall

### Requirement: BG-002 — Parallax scroll inside viewport for full rail

The system MUST scroll the bg on each tick based on the camera's iso depth with parallax factor `0.2` such that the bg remains inside the viewport for the entire 120 s rail.

Formula: `sprite.y = -BG_INITIAL_OFFSET_PX - worldScrollPx * (1 - parallax)`, where:
- `worldScrollPx = (cameraIso.isoX + cameraIso.isoY) * step` and `step = TILE_SIZE / Math.SQRT2 ≈ 90.5`
- `BG_INITIAL_OFFSET_PX = MAX_WORLD_SCROLL_PX * PARALLAX = 6516 * 0.2 = 1303`
- The bg is a child of `isoWorld.container`; the container's `position.y = worldScrollPx` adds to `sprite.y` to compute the screen position.

#### Scenario: bg_screen_top and bg_screen_bottom cover viewport at t=0

- GIVEN camera at iso (0, 0), bg loaded with source 640×1120, scale (2, 2)
- WHEN `update({ isoX: 0, isoY: 0 })` runs
- THEN `sprite.y === -1303`
- AND the bg's screen top is at `-1303`, screen bottom at `937`
- AND visible viewport `[0, 720]` is inside `[−1303, 937]` ✓

#### Scenario: bg covers viewport at t=120s (rail end)

- GIVEN camera at iso (36, 36), bg loaded
- WHEN `update({ isoX: 36, isoY: 36 })` runs
- THEN `worldScrollPx === 72 * 90.5 ≈ 6516`
- AND `sprite.y === -1303 - 6516 * 0.8 = -6516`
- AND the bg's screen top is at `6516 + (-6516) = 0`, screen bottom at `2240`
- AND visible viewport `[0, 720]` is inside `[0, 2240]` ✓

#### Scenario: bg covers viewport at t=60s (mid-rail)

- GIVEN camera at iso (18, 18)
- WHEN `update({ isoX: 18, isoY: 18 })` runs
- THEN `worldScrollPx === 36 * 90.5 ≈ 3258`
- AND `sprite.y === -1303 - 3258 * 0.8 = -3909`
- AND bg covers screen y `[-651, 1589]`, viewport `[0, 720]` inside ✓

### Requirement: BG-003 — Freeze at rail end

The system MUST expose `freeze()` / `unfreeze()` methods that stop / resume the parallax scroll. While frozen, `update()` MUST NOT change `sprite.y`. `unfreeze()` MUST re-anchor to the current camera position so the resume is seamless (no visual jump).

The main game MUST call `bg.freeze()` in response to the `stage:finaleStarted` event (emitted when `camera.time >= TEST_LEVEL.railEndTime`).

#### Scenario: freeze stops scroll

- GIVEN bg loaded, camera at iso (10, 10)
- WHEN `freeze()` is called
- AND `update({ isoX: 20, isoY: 20 })` runs
- THEN `sprite.y` does NOT change from its frozen value

#### Scenario: unfreeze re-anchors seamlessly

- GIVEN bg frozen at camera iso (10, 10)
- WHEN `unfreeze()` is called
- AND `update({ isoX: 10, isoY: 10 })` runs
- THEN `sprite.y === -BG_INITIAL_OFFSET_PX - worldScrollPx * (1 - parallax)` (same as a fresh load)

### Requirement: BG-004 — setStage swaps texture

The system MUST expose `setStage(stageId)` that:
- Reads `assets/backgrounds/manifest.json` to resolve the asset path
- Calls `load(stageId, resolvedPath)` internally

The main game MUST call `bg.setStage(stageId)` whenever the active stage changes (menu button click).

#### Scenario: setStage swaps visible texture

- GIVEN bg loaded with stage1
- WHEN `bg.setStage('stage2-pueblo')` resolves
- THEN the rendered sprite shows stage2's PNG (not stage1's)
- AND `bg.stageId === 'stage2-pueblo'`

### Requirement: BG-005 — Stage menu with lock progression

The main menu MUST show 5 stage buttons in the order `stage1-bosque`, `stage2-pueblo`, `stage3-rio`, `stage4-vertedero`, `stage5-castillo`. Stage 1 is unlocked by default; stages 2-5 are locked until the previous stage's `localStorage` clear key (`zarra2d:stageClear:<stageId>`) is set.

A locked button MUST show a lock icon (🔒) and MUST NOT emit `menu:startStage` on click. An unlocked button emits `menu:startStage` with `{ stageId }`.

The main game MUST handle `menu:startStage` by:
1. Calling `bg.setStage(stageId)`
2. Calling `enemies.loadLevel(TEST_LEVEL.enemies)`
3. Resetting camera time to 0 and starting the rail

For fase-6, all 5 stages use the same TEST_LEVEL enemy roster. Per-stage rosters are future scope.

#### Scenario: stage 2 locked by default

- GIVEN fresh localStorage (no clear keys)
- WHEN the menu renders
- THEN stage 2-5 buttons are visibly locked
- AND stage 1 button is unlocked

#### Scenario: stage 2 unlocks after stage 1 cleared

- GIVEN `localStorage.setItem('zarra2d:stageClear:stage1-bosque', JSON.stringify({ firmas: 10 }))`
- WHEN the menu renders
- THEN stage 2 button is unlocked
- AND stages 3-5 remain locked

## ADDED Requirements (finale + waves)

### Requirement: BG-006 — Finale starts at rail end

When `camera.time >= TEST_LEVEL.railEndTime`, the main game MUST emit `stage:finaleStarted` (one-shot) and call `bg.freeze()`.

While in the 'finale' state:
- The main game MUST spawn `TEST_LEVEL.postFinalWaveRoster` enemies at their configured `spawnAtSec` times at their fixed iso positions.
- All spawned enemies MUST be mobile archetypes (`standard` or `tank`); static spriteIds MUST NOT be used in the wave roster.
- The final boss (`TEST_LEVEL.finalBossId`) MUST remain hittable until destroyed.

#### Scenario: finale triggers at rail end

- GIVEN camera time = 119.99 s
- WHEN the next tick advances to 120.01 s
- THEN `stage:finaleStarted` fires exactly once
- AND `bg.freeze()` is called (bg no longer scrolls)

#### Scenario: wave spawns during finale

- GIVEN finale state active, camera time = 122 s
- WHEN the wave1 roster entry has `spawnAtSec: 122`
- THEN that enemy is spawned at its configured `isoX, isoY` position
- AND it is hittable by the player

### Requirement: BG-007 — Stage cleared when boss destroyed

When the enemy with `id === TEST_LEVEL.finalBossId` is destroyed, the main game MUST emit `stage:cleared` (one-shot). The existing victory overlay fires on this event.

#### Scenario: boss destroyed emits stage:cleared

- GIVEN the final boss enemy is alive with HP > 0
- WHEN its HP reaches 0
- THEN `stage:cleared` fires exactly once
- AND `localStorage.setItem('zarra2d:stageClear:<stageId>', ...)` is called

## MODIFIED Requirements

### Requirement: TILE-001..TILE-005 (iso-tile-system) — DEPRECATED

The `openspec/specs/iso-tile-system/spec.md` requirements are DEPRECATED for the main game. The standalone demo `tests/tile-gallery.html` MAY continue to use them. The main game MUST NOT instantiate `Tilemap` or call `cullAndRender`.

## REMOVED Requirements

None — the tile system code stays in `src/iso/tilemap.js` for the standalone demo.

## RENAMED Requirements

None.