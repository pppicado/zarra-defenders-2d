# Delta for `iso-tile-system`

**Change**: fase-3-shooter-rail-gameplay
**Capability**: iso-tile-system (MODIFIED — drift cleanup)

## Purpose

Reconcile the F2.5.15 `iso-tile-system` spec with the runtime engine that F3 depends on. The MODIFIED TILE-001 / TILE-002 changes are spec-only (no engine change — F2.5.15 already shipped the per-tile rotation and `tileSize / √2` step). The MODIFIED TILE-004 change lifts the runtime cull cap from `100` to `400` to accommodate larger test stages; the engine code is updated in the same commit so spec and code stay in lock-step.

## MODIFIED Requirements

### Requirement: TILE-001 — Isometric coordinate transform

The system MUST provide pure functions `isoToScreen(isoX, isoY, tileSize, tileWorldOrigin)` and `screenToIso(sx, sy, tileSize, tileWorldOrigin)` matching the canonical F2.5.15 iso formula:

- `step = tileSize / Math.SQRT2` (= `tileHalfWidth = tileHalfHeight = tileSize / √2`)
- `sx = tileWorldOrigin.x + (isoX − isoY) * step`
- `sy = tileWorldOrigin.y + (isoX + isoY) * step`
- Inverse uses the same constants to recover `(isoX, isoY)`.

`tileSize` MUST be proportional to the viewport (yielding ≥ 64 px on 1080p). The functions MUST be pure — no globals, no Pixi import — so they can be exercised from DevTools.

(Previously F2.5.2: `tileHalfWidth = tileHalfHeight = tileSize / 2`. The F2.5.2 step was the half-width of the square PNG; with a 45°-rotated container that produced overlapping diamonds because the iso grid spacing was wrong.)

#### Scenario: Round-trip identity on the grid (canonical)

- GIVEN a tile at iso `(3, 5)`, viewport `1920×1080`, `tileSize = 64`
- WHEN the renderer converts to screen and back
- THEN the recovered iso coord equals `(3, 5)` within ±0.001
- AND `step === tileSize / Math.SQRT2 ≈ 45.2548`.

#### Scenario: Free-aim screen-to-iso on a non-aligned click (canonical)

- GIVEN the camera at iso `(5, 5)`, click at screen `(640, 480)`, `tileSize = 64`
- WHEN `screenToIso` runs with `step = tileSize / Math.SQRT2`
- THEN the returned world coord is `(5.0, 5.0)`.

#### Scenario: Stale `tileSize / 2` references are out of date

- GIVEN any spec, test, or code comment that still references `tileHalfWidth = tileHalfHeight = tileSize / 2`
- WHEN `sdd-verify` runs
- THEN the reference SHALL be flagged as OUT OF DATE
- AND the offending file SHALL be updated to `tileSize / Math.SQRT2` before commit.

### Requirement: TILE-002 — Tile rendering (per-tile 45° rotation, unrotated container)

Each tile MUST render as a `PIXI.Sprite` whose `texture.baseTexture` is exactly `64×64` px (square). The on-screen iso look MUST be produced by setting `this.rotation = Math.PI / 4` on each individual `Tile` instance (around its own centre via `anchor.set(0.5, 0.5)`); the `_worldLayer` container that holds the tilemap MUST NOT rotate (`_worldLayer.rotation === 0`). The PNG on disk stays top-down (unrotated). Each tile variant MUST be loaded exactly once via `PIXI.Assets.load` and cached so multiple instances share the same `PIXI.Texture`. The system MUST load all 40 tile PNGs during bootstrap before the first frame.

(Previously F2.5.2: rotation was applied at the container level via `_worldLayer.rotation = Math.PI / 4`. The container approach had two problems: (1) tiles could not be rotated around their own centres, breaking free-aim hit detection; (2) anything added to the world container inherited the 45° tilt. F2.5.4 moved sprites out of `_worldLayer` to fix (2); F2.5.15 fixes (1) by rotating per-tile.)

#### Scenario: 40 tiles cached at startup

- GIVEN the bootstrap phase of `src/main.js`
- WHEN `loadTilemap()` resolves
- THEN `PIXI.Assets.cache` contains exactly 40 unique tile textures keyed by `{stage}_{variant}.png`.

#### Scenario: Apparent diamond via per-tile 45° rotation

- GIVEN a tile sprite of `tileSize = 64` with a `64×64` base texture
- AND the sprite's own `rotation === Math.PI / 4` (set in the `Tile` constructor)
- AND the parent `_worldLayer.rotation === 0` (unrotated container)
- WHEN the sprite is rendered
- THEN the visible footprint on screen is a rotated square whose bounding box is ≈ `90 × 90` px (the rotated square of side 64 has a diagonal of `64·√2 ≈ 90.51`).

#### Scenario: Container does NOT rotate

- GIVEN the active `IsoWorld` instance after `setStage(...)` mounts a tilemap
- WHEN `isoWorld._worldLayer.rotation` is inspected at runtime
- THEN `isoWorld._worldLayer.rotation === 0` (unrotated)
- AND the diamond look comes from `Tile.rotation === Math.PI / 4`, not from the container.

#### Scenario: On-disk texture is unrotated top-down

- GIVEN any cached tile texture
- WHEN its `baseTexture` is inspected via `PIXI.BaseTexture#source`
- THEN the source image is `64×64` px with NO rotation transform applied at the texture level (rotation lives on the `Tile` sprite, not on the texture).

### Requirement: TILE-004 — Viewport culling (400-tile cap)

The system MUST instantiate `PIXI.Sprite` only for tiles inside the camera viewport plus a 1-tile overshoot margin on every side. The visible range `(gxMin, gxMax, gyMin, gyMax)` MUST be recomputed each frame from the camera center `(camIsoX, camIsoY)` and viewport size `(W, H)`. The system MUST keep the visible tile count ≤ `400` at all times (raised from the F2.5.2 value of `100` to accommodate larger test stages; the live engine code is updated in the same commit so spec and code stay in lock-step).

#### Scenario: Visible window bounded by overshoot

- GIVEN viewport `1920×1080`, `tileSize = 64`, camera at iso `(10, 10)`
- WHEN the cull pass runs
- THEN the window covers at most `(23, 23)` tiles with 1 tile margin per edge (estimated upper bound; exact count depends on viewport aspect).

#### Scenario: Off-screen tile never instantiated

- GIVEN a `1000×1000` tile grid and a camera at iso `(0, 0)`
- WHEN only the visible window is iterated
- THEN `Tile` instances alive in the world container is ≤ 400, not 1,000,000.

#### Scenario: 100-tile cap references are out of date

- GIVEN any spec, test, or comment that still references `≤ 100` as the cull cap
- WHEN `sdd-verify` runs
- THEN the reference SHALL be flagged as OUT OF DATE
- AND the offending file SHALL be updated to `≤ 400` before commit.

## ADDED Requirements

### Requirement: TILE-005 — Step / cull constants exported

The system MUST export `ISO_STEP(tileSize) = tileSize / Math.SQRT2` and `MAX_VISIBLE_TILES = 400` as named constants from `src/iso/iso-math.js` (or the equivalent module — implementation detail). The constants SHALL be the single source of truth — no inline `Math.SQRT2` or magic `400` numbers anywhere else in the codebase. A `grep` for `Math.SQRT2` outside the constants file SHALL return zero hits; a `grep` for `400` outside the constants file SHALL return zero hits (excluding test assertions and ISO date strings).

#### Scenario: Step constant is exported

- GIVEN the F3 module graph
- WHEN a consumer needs the iso step
- THEN they import `ISO_STEP` and call it with `tileSize`
- AND the value is identical to `tileSize / Math.SQRT2` (verified by `===`).

#### Scenario: Cull cap constant is exported

- GIVEN the F3 module graph
- WHEN the cull pass computes its upper bound
- THEN the bound is `MAX_VISIBLE_TILES`
- AND no inline `400` literal exists in the cull code.

## REMOVED Requirements

None.

## RENAMED Requirements

None.