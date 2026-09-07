# Delta for `iso-camera-integration`

**Change**: fase-3-shooter-rail-gameplay
**Capability**: iso-camera-integration (MODIFIED — camera-aware inverse + escape boundary)

## Purpose

Add a camera-aware screen → iso inverse helper (`screenToIsoWithCamera`) that the combat layer uses for hit detection. Add the canonical definition of the iso depth escape boundary that `player-integrity` consumes for the -1-segment penalty. Both additions are F3-only contracts; the existing `screenToIso` (camera-ignoring) remains in place for tests and F2.5 retrofits but is marked deprecated.

## MODIFIED Requirements

### Requirement: CAM-002 — World container anchor and camera projection

The world container's `position` MUST equal `(viewOrigin.x − camScreenX, viewOrigin.y − camScreenY)` where:
- `viewOrigin = { x: W/2, y: H/2 }` is the **viewport center** (the world-container anchor).
- `(camScreenX, camScreenY) = isoToScreen(camera.getCameraX(), camera.getCameraY(), tileSize, tileWorldOrigin)` uses `tileWorldOrigin = { x: W/2, y: H*0.30 }` (the HUD-strip tile origin — unchanged).
- The world-container `position` thus lands the camera-projected iso position at the viewport center, not at the HUD strip.

The `hud` and `ui` layers MUST remain siblings of `world` at `(0, 0)` — unchanged. The `tileWorldOrigin` (HUD strip) is preserved for F3 hit-detection (`screenToIso` snap), so existing round-trip semantics still hold (TILE-001).

In addition, the system MUST expose `screenToIsoWithCamera(screenX, screenY, cameraIsoX, cameraIsoY, viewportCenter)` — a pure helper that converts a screen-space click to an iso world coord by subtracting `worldContainer.position` from `(screenX, screenY)` BEFORE delegating to `screenToIso`. The legacy `screenToIso` (no camera) is DEPRECATED for production paths in F3; it SHALL remain for tests and the F2.5 retrofits but MUST be removed in F4. New code (F3 combat, hit detection) MUST use `screenToIsoWithCamera`.

(Previously: world container's `position` equaled `(-camScreenX, -camScreenY)` directly, which anchored the iso projection at the HUD strip `y = H*0.30` instead of the viewport center.)

#### Scenario: World container centers camera-projected iso at viewport center

- GIVEN `IsoWorld.update()` runs with camera position `(5, 5)` and viewport `W=1920, H=1080`
- WHEN the per-frame camera transform applies
- THEN `viewOrigin === { x: 960, y: 540 }`
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

- GIVEN the camera at iso `(4, 2)` with `tileSize = 128` and viewport `1920×1080`
- WHEN the game loop applies the camera
- THEN the projected iso point lands at the viewport center, the HUD does NOT move, and the iso plane scrolls smoothly.

#### Scenario: HUD survives camera transform (retained from CAM-002 v0.1)

- GIVEN the crosshair at screen `(960, 540)` on `hud`
- WHEN the camera advances 10 tiles north-east
- THEN the crosshair stays at `(960, 540)` because `hud` is a sibling of `world`, not a child.

#### Scenario: screenToIsoWithCamera returns correct iso under camera translation (F3 new)

- GIVEN the camera is at iso `(5, 5)`, the world container has translated accordingly (computed by `IsoWorld.update()`), and the click is at screen `(640, 480)`
- WHEN `screenToIsoWithCamera(640, 480, 5, 5, { x: 960, y: 540 })` runs
- THEN the returned world coord is `(5.0, 5.0)` (matches the camera position — the click is at the viewport center where the iso projection lands)
- AND the helper is a pure function (no globals, no Pixi import).

#### Scenario: Three sample clicks pin the camera-aware inverse (F3 acceptance)

- GIVEN the camera at iso `(5, 5)`, `(8, 12)`, `(20, 0)` respectively
- AND a Playwright headless test fires clicks at three pre-computed screen positions per camera state
- WHEN `screenToIsoWithCamera` runs on each click
- THEN every returned iso coord matches the pre-computed expected value within ±0.001.

#### Scenario: Legacy screenToIso is deprecated

- GIVEN F3 lands
- THEN every production code path that converts a click to iso (combat, hit detection) uses `screenToIsoWithCamera`
- AND a code comment marks `screenToIso` as `// @deprecated — use screenToIsoWithCamera; remove in F4`.

## ADDED Requirements

### Requirement: CAM-003 — Iso depth escape boundary (corridor front)

The system SHALL define the active front edge of the rail corridor as the iso position one tile south-east of the camera's current iso projection. Concretely, the front edge iso coord is `(camera.isoX + 0.5, camera.isoY + 0.5)` — i.e., one tile along the camera's depth axis. An enemy is "escaped" when its iso center crosses that front edge: when `enemy.isoX + enemy.isoY > camera.isoX + camera.isoY + 1`. At the moment of escape, the system SHALL:
- Decrement `player-integrity` by 1 segment (see `player-integrity` REQ-INT-002).
- Despawn the enemy without awarding points.
- Emit `enemy:escaped` with `{ enemyId, archetype }`.

The escape check SHALL be evaluated on every tick AFTER the camera update. The definition SHALL be reusable: F4 stages (Bosque, Río, Vertedero, Castillo) MAY extend the rule but SHALL NOT replace the front-edge semantics.

#### Scenario: Enemy past the front edge is detected as escaped

- GIVEN the camera is at iso `(5, 5)` (front edge = `5 + 5 + 1 = 11` depth)
- AND an enemy at iso `(6, 6)` (depth `12 > 11`) is mid-flight (its iso position will continue moving south-east)
- WHEN the next tick processes
- THEN the enemy is flagged as escaped
- AND `enemy:escaped` fires
- AND integrity drops by 1.

#### Scenario: Enemy behind the front edge is not escaped

- GIVEN the camera is at iso `(5, 5)` (front edge depth = `11`)
- AND an enemy at iso `(3, 4)` (depth `7 < 11`)
- WHEN the next tick processes
- THEN no escape fires
- AND integrity is unchanged.

#### Scenario: Escape fires exactly once per enemy

- GIVEN an enemy was detected as escaped in the previous tick
- WHEN the next tick processes with the same enemy state
- THEN the enemy is despawned (no longer in the active list)
- AND no second `enemy:escaped` event fires.

#### Scenario: Boundary depth formula is the single source of truth

- GIVEN F3 ships
- WHEN a developer needs the front-edge iso coord for an escape check
- THEN they read `CAMERA_FRONT_DEPTH(camera) = camera.isoX + camera.isoY + 1`
- AND the formula is exported from the camera / world module
- AND no inline `+ 1` arithmetic exists elsewhere in the codebase.

## REMOVED Requirements

None.

## RENAMED Requirements

None.