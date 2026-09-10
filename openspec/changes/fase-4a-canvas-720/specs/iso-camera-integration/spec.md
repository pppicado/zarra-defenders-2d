# Delta for `iso-camera-integration`

**Change**: fase-4a-canvas-720
**Capability**: iso-camera-integration (MODIFIED — viewport literal sweep 1920×1080 → 1920×720)

## MODIFIED Requirements

### Requirement: CAM-002 — World container anchor and camera projection

The world container's `position` MUST equal `(viewOrigin.x − camScreenX, viewOrigin.y − camScreenY)` where:

- `viewOrigin = { x: W/2, y: H/2 }` is the **viewport center** (the world-container anchor).
- `(camScreenX, camScreenY) = isoToScreen(camera.getCameraX(), camera.getCameraY(), tileSize, tileWorldOrigin)` uses `tileWorldOrigin = { x: W/2, y: H*0.30 }` (the HUD-strip tile origin — unchanged).
- The world-container `position` thus lands the camera-projected iso position at the viewport center, not at the HUD strip.

The `hud` and `ui` layers MUST remain siblings of `world` at `(0, 0)` — unchanged. The `tileWorldOrigin` (HUD strip) is preserved for F3 hit-detection (`screenToIso` snap), so existing round-trip semantics still hold (TILE-001).

(Previously F4a: scenarios used viewport `W=1920, H=1080` and derived `viewOrigin = { x: 960, y: 540 }`. After `LOGICAL_H = 720`, the same formulas give `viewOrigin = { x: 960, y: 360 }` — anchor math is viewport-agnostic; only the example numbers shift.)

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
