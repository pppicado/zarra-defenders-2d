# Delta for `iso-camera-integration`

## Purpose

Bind the existing `RailCamera` to the new isometric world without rewriting the camera class. The world container MUST translate by `(-camX, -camY)` each tick so iso tiles and iso-anchored sprites scroll together, while the HUD layer remains screen-space.

## ADDED Requirements

### Requirement: CAM-001 — RailCamera reinterpretation

The system MUST reuse `src/rail-camera.js` exactly as it exists today — no new methods, no API change. Waypoint coordinates `(x, y)` MUST be reinterpreted as iso coords `(isoX, isoY)` by the renderer. The renderer MUST guarantee that `getCameraX() + getCameraY()` is monotonically non-decreasing along the path so the Z-order rule (`gx + gy`) stays consistent.

#### Scenario: Existing camera class untouched

- GIVEN `src/rail-camera.js` committed at v0.1
- WHEN F2.5 lands
- THEN the file diff against v0.1 is zero lines (verified via `git diff v0.1 -- src/rail-camera.js`)

#### Scenario: Monotonic depth advance

- GIVEN a waypoint path `(0,0) → (5,3) → (8,8)`
- WHEN the camera interpolates from start to end
- THEN `getCameraX() + getCameraY()` never decreases at any sample point

### Requirement: CAM-002 — World container anchor and camera projection (MODIFIED in F4a — viewport literal sweep)

The world container's `position` MUST equal `(viewOrigin.x − camScreenX, viewOrigin.y − camScreenY)` where:

- `viewOrigin = { x: W/2, y: H/2 }` is the **viewport center** (the world-container anchor).
- `(camScreenX, camScreenY) = isoToScreen(camera.getCameraX(), camera.getCameraY(), tileSize, tileWorldOrigin)` uses `tileWorldOrigin = { x: W/2, y: H*0.30 }` (the HUD-strip tile origin — unchanged).
- The world-container `position` thus lands the camera-projected iso position at the viewport center, not at the HUD strip.

The `hud` and `ui` layers MUST remain siblings of `world` at `(0, 0)` — unchanged. The `tileWorldOrigin` (HUD strip) is preserved for F3 hit-detection (`screenToIso` snap), so existing round-trip semantics still hold (TILE-001).

(Previously F4a: scenarios used viewport `W=1920, H=1080` and derived `viewOrigin = { x: 960, y: 540 }`. After `LOGICAL_H = 720`, the same formulas give `viewOrigin = { x: 960, y: 360 }` — anchor math is viewport-agnostic; only the example numbers shift.)

(Originally F2.5.1: world container's `position` equaled `(-camScreenX, -camScreenY)` directly, which anchored the iso projection at the HUD strip `y = H*0.30` instead of the viewport center.)

#### Scenario: World container centers camera-projected iso at viewport center

- GIVEN `IsoWorld.update()` runs with camera position `(5, 5)` and viewport `W=1920, H=720`
- WHEN the per-frame camera transform applies
- THEN `viewOrigin === { x: 960, y: 360 }`
- AND `world.container.position.x === viewOrigin.x − isoToScreen(5, 5).x`
- AND `world.container.position.y === viewOrigin.y − isoToScreen(5, 5).y`.

#### Scenario: HUD crosshair does not inherit world transform

- GIVEN the camera scrolls (any change to `getCameraX` or `getCameraY`)
- WHEN the next frame renders
- THEN `hud.position` MUST remain `(0, 0)` (unchanged)
- AND the crosshair MUST track mouse in screen-space without inheriting the world matrix.

#### Scenario: CAM-001 contract preserved

- GIVEN F2.5.1 closes
- WHEN `git diff 8d78885 -- src/{rail-camera,input,player}.js` runs
- THEN the diff MUST be empty (CAM-001 contract — zero edits to camera, input, player modules).

#### Scenario: Two-axis iso scroll (retained from CAM-002 v0.1)

- GIVEN the camera at iso `(4, 2)` with `tileSize = 128` and viewport `1920×720`
- WHEN the game loop applies the camera
- THEN the projected iso point lands at the viewport center, the HUD does NOT move, and the iso plane scrolls smoothly.

#### Scenario: HUD survives camera transform (retained from CAM-002 v0.1)

- GIVEN the crosshair at screen `(960, 360)` on `hud`
- WHEN the camera advances 10 tiles north-east
- THEN the crosshair stays at `(960, 360)` because `hud` is a sibling of `world`, not a child.

#### Scenario: screenToIsoWithCamera returns correct iso under camera translation (F3 new)

- GIVEN the camera is at iso `(5, 5)`, the world container has translated accordingly (computed by `IsoWorld.update()`), and the click is at screen `(640, 480)`
- WHEN `screenToIsoWithCamera(640, 480, 5, 5, { x: 960, y: 360 })` runs
- THEN the returned world coord is `(5.0, 5.0)` (matches the camera position — the click is at the viewport center where the iso projection lands)
- AND the helper is a pure function (no globals, no Pixi import).

#### Scenario: Legacy screenToIso is deprecated (F3)

- GIVEN F3 lands
- THEN every production code path that converts a click to iso (combat, hit detection) uses `screenToIsoWithCamera`
- AND a code comment marks `screenToIso` as `// @deprecated — use screenToIsoWithCamera; remove in F4`.

### Requirement: CAM-003 — Stage transitions

The system MUST support switching the active Tilemap when the rail camera exits the bounds of the current stage. The `IsoWorld` orchestrator MUST expose a `setStage(stageId)` method that swaps the active tilemap instance and disposes the previous one. In F2.5, the swap MAY produce a hard cut; a fade or scripted camera move is F4+ polish and is NOT required.

#### Scenario: Stage swap disposes previous tilemap

- GIVEN the camera at the exit boundary of Stage 1 (Bosque)
- WHEN `isoWorld.setStage("stage2-pueblo")` runs
- THEN the Bosque tilemap is destroyed, the Pueblo tilemap is mounted, and `world.children.length` reflects only the new tiles + active sprites

#### Scenario: Active tilemap reference is single-valued

- GIVEN the renderer is mid-frame
- WHEN it queries `isoWorld.activeTilemap`
- THEN the returned tilemap is exactly the one set by the last `setStage` call

### Requirement: CAM-004 — Iso-plane escape detection (F3 added)

The system MUST detect when a live enemy has left the rail corridor by computing the **Manhattan distance** from the enemy's iso center to the camera's iso position, and MUST treat an enemy as escaped when that distance is **strictly greater than `6` tiles**. The predicate lives in `src/enemies.js` as `isEscaped(enemy, cameraIso)` and is invoked once per tick from `EnemyManager.update`.

Formally: for an enemy at iso `(ex, ey)` and the camera at iso `(cx, cy)`,

```
isEscaped(enemy, cameraIso) === (|ex - cx| + |ey - cy|) > 6
```

The escape boundary MUST be direction-agnostic: an enemy placed off-rail in any direction MUST escape when the camera is far enough away, regardless of which way the rail points. The boundary MUST also be conservative at the perimeter: an enemy with Manhattan distance ≤ 6 (i.e. still within 6 tiles of the camera) MUST remain hittable.

The predicate SHALL accept `cameraIso` as either `{isoX, isoY}` (canonical, F3) or `{x, y}` (legacy field names from earlier iso-screen code). `cameraIso` MAY be `null` or `undefined`; in that case the predicate MUST treat the camera as the origin and apply the same rule.

(Previously: a depth-based rule `enemy.depth < camera.depth` was attempted, but it flagged perpendicular enemies — camera at `(3.0, 2.0)`, enemy at `(3.0, 2.0)`, depth-difference 0 yet iso-correct escape at depth > buffer — as escaped on frame 1. Manhattan distance > 6 correctly keeps perpendicular neighbours hittable. See `tests/unit/escape-detection.spec.mjs` and `tests/e2e/hit-detection.spec.mjs` for the canonical numeric tables.)

#### Scenario: Enemy with Manhattan distance 0 stays hittable

- GIVEN a live `standard` enemy at iso `(3, 2)` and the camera at iso `(3.0, 2.0)`
- WHEN `EnemyManager.update` ticks
- THEN `isEscaped` returns `false`
- AND no `enemy:escaped` event fires
- AND integrity is unchanged.

#### Scenario: Enemy with Manhattan distance exactly 6 stays hittable (strict `>`)

- GIVEN a live enemy at iso `(3, 2)` and the camera at iso `(9, 2)` (Manhattan = `|3-9| + |2-2| = 6`)
- WHEN `EnemyManager.update` ticks
- THEN `isEscaped` returns `false` (the threshold is **strict** greater-than)
- AND no `enemy:escaped` event fires.

#### Scenario: Enemy with Manhattan distance 7 escapes

- GIVEN a live enemy at iso `(3, 2)` and the camera at iso `(10, 2)` (Manhattan = 7)
- WHEN `EnemyManager.update` ticks
- THEN `isEscaped` returns `true`
- AND `enemy:escaped` fires exactly once with `{ enemyId, archetype }`
- AND the enemy's iso entry is removed from `EnemyManager._enemies`.

#### Scenario: Rail-aligned enemy in TEST_LEVEL escapes at the documented time

- GIVEN the TEST_LEVEL rail `(0,0) → (18,18)` over 60 s (camera depth grows at 0.6 tile/s)
- AND `e01` at iso `(3, 2)` (depth 5, spawn at t=0)
- WHEN the camera advances to `t ≈ 18.33 s` (camera depth > 11, Manhattan > 6)
- THEN `e01` MUST have escaped (one `enemy:escaped` event fired)
- AND integrity MUST have drained by exactly 1 segment.

#### Scenario: Perpendicular enemy in TEST_LEVEL stays hittable while the camera is near

- GIVEN `e01` at iso `(3, 2)` (one tile off the rail)
- AND the camera at iso `(5.0, 5.0)` (Manhattan = 4, well under threshold)
- WHEN `EnemyManager.update` ticks
- THEN `e01` is NOT escaped
- AND a hit lands and HP decrements.

## MODIFIED Requirements

None — camera/input/player specs at v0.1 remain the contract; F2.5 only reinterprets `RailCamera` semantics from the renderer side.

## REMOVED Requirements

None.

## RENAMED Requirements

None.