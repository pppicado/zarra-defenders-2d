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

### Requirement: CAM-002 — World container mapping

The game loop MUST replace `world.x = -camera.getCameraX()` with `world.position.set(-camScreenX, -camScreenY)` where `camScreenX` and `camScreenY` are the iso-to-screen projections of the current camera position. The `world` container MUST continue to host all iso tiles and iso-anchored sprites; the `hud` and `ui` containers MUST remain on screen-space coordinates and MUST NOT inherit any camera transform.

#### Scenario: Two-axis iso scroll

- GIVEN the camera at iso `(4, 2)` with `tileSize = 128` and viewport `1920×1080`
- WHEN the game loop applies the camera
- THEN `world.position` equals `(tileWorldOrigin.x − (4 − 2)·64, tileWorldOrigin.y − (4 + 2)·32)`, the HUD does NOT move, and the iso plane scrolls smoothly

#### Scenario: HUD survives camera transform

- GIVEN the crosshair at screen `(960, 540)` on `hud`
- WHEN the camera advances 10 tiles north-east
- THEN the crosshair stays at `(960, 540)` because `hud` is a sibling of `world`, not a child

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

## MODIFIED Requirements

None — camera/input/player specs at v0.1 remain the contract; F2.5 only reinterprets `RailCamera` semantics from the renderer side.

## REMOVED Requirements

None.

## RENAMED Requirements

None.