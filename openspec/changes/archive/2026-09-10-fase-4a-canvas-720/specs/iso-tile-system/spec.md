# Delta for `iso-tile-system`

**Change**: fase-4a-canvas-720
**Capability**: iso-tile-system (MODIFIED — viewport literal sweep 1920×1080 → 1920×720)

## MODIFIED Requirements

### Requirement: TILE-001 — Isometric coordinate transform (v0.1 / F2.5.2 baseline)

The system MUST provide pure functions `isoToScreen(isoX, isoY, tileSize, tileWorldOrigin)` and `screenToIso(sx, sy, tileSize, tileWorldOrigin)` matching the F2.5.2 square ratio:

- `tileHalfWidth = tileHalfHeight = tileSize / 2` (square iso — both halves equal)
- `sx = tileWorldOrigin.x + (isoX − isoY) * tileHalfWidth`
- `sy = tileWorldOrigin.y + (isoX + isoY) * tileHalfHeight`
- Inverse uses the same constants to recover `(isoX, isoY)`.

`tileSize` MUST be proportional to the viewport (yielding ≥ 64 px on the target viewport 1920×720). The functions MUST be pure — no globals, no Pixi import — so they can be exercised from DevTools.

(Previously F4a: viewport literal was `1920×1080`; `LOGICAL_H` dropped 1080→720 in `src/main.js:57` so the example GIVEN matches the active logical canvas. Math is viewport-agnostic.)

#### Scenario: Round-trip identity on the grid (square ratio)

- GIVEN a tile at iso `(3, 5)`, viewport `1920×720`, `tileSize = 64`
- WHEN the renderer converts to screen and back
- THEN the recovered iso coord equals `(3, 5)` within ±0.001

#### Scenario: Free-aim screen-to-iso on a non-aligned click (square ratio)

- GIVEN the camera at iso `(5, 5)`, click at screen `(640, 480)`, `tileSize = 64`
- WHEN `screenToIso` runs
- THEN the returned world coord is `(5.0, 5.0)`

### Requirement: TILE-001 — Isometric coordinate transform (F2.5.15 — classic iso formula)

The system MUST provide pure functions `isoToScreen(isoX, isoY, tileSize, tileWorldOrigin)` and `screenToIso(sx, sy, tileSize, tileWorldOrigin)` matching the F2.5.15 classic iso formula:

- `step = tileSize / Math.SQRT2` (= `tileHalfWidth = tileHalfHeight = tileSize / √2`)
- `sx = tileWorldOrigin.x + (isoX − isoY) * step`
- `sy = tileWorldOrigin.y + (isoX + isoY) * step`
- Inverse uses the same constants to recover `(isoX, isoY)`.

`tileSize` MUST be proportional to the viewport (yielding ≥ 64 px on the target viewport 1920×720). The functions MUST be pure — no globals, no Pixi import — so they can be exercised from DevTools.

(Previously F4a: viewport literal was `1920×1080`; `LOGICAL_H` dropped 1080→720. `tileSize = 64` is not viewport-derived and is unchanged.)

#### Scenario: Round-trip identity on the grid (F2.5.15 classic iso)

- GIVEN a tile at iso `(3, 5)`, viewport `1920×720`, `tileSize = 64`
- WHEN the renderer converts to screen and back
- THEN the recovered iso coord equals `(3, 5)` within ±0.001
- AND `step === tileSize / Math.SQRT2 ≈ 45.2548`

#### Scenario: Free-aim screen-to-iso on a non-aligned click (F2.5.15)

- GIVEN the camera at iso `(5, 5)`, click at screen `(640, 480)`, `tileSize = 64`
- WHEN `screenToIso` runs with `step = tileSize / Math.SQRT2`
- THEN the returned world coord is `(5.0, 5.0)`

### Requirement: TILE-004 — Viewport culling

The system MUST instantiate `PIXI.Sprite` only for tiles inside the camera viewport plus a 1-tile overshoot margin on every side. The visible range `(gxMin, gxMax, gyMin, gyMax)` MUST be recomputed each frame from the camera center `(camIsoX, camIsoY)` and viewport size `(W, H)`. The system MUST keep the visible tile count ≤ 400 at all times (constant exported as `MAX_VISIBLE_TILES` from `src/iso/tilemap.js`).

(Previously F4a: viewport literal in the GIVEN was `1920×1080`. With `LOGICAL_H = 720` the visible window is shorter vertically. The cap was also bumped `≤ 100 → ≤ 400` because the cull is now camera-aware (closed-form formula) and the budget must fit the wider iso plane — the v0.1 cap was a v0.1 placeholder.)

#### Scenario: Visible window bounded by overshoot

- GIVEN viewport `1920×720`, `tileSize = 128`, camera at iso `(10, 10)`
- WHEN the cull pass runs
- THEN the window covers at most `(11, 11)` tiles with 1 tile margin per edge

#### Scenario: Off-screen tile never instantiated

- GIVEN a `1000×1000` tile grid and a camera at iso `(0, 0)`
- WHEN only the visible window is iterated
- THEN `Tile` instances alive in the world container is ≤ 400, not 1,000,000
