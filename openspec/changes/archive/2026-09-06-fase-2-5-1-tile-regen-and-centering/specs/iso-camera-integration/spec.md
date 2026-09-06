# Delta for `iso-camera-integration`

**Change**: `fase-2.5.1-tile-regen-and-centering`
**Capability**: `iso-camera-integration` (MODIFIED)

## MODIFIED Requirements

### Requirement: CAM-002 — World container anchor and camera projection

The world container's `position` MUST equal `(viewOrigin.x − camScreenX, viewOrigin.y − camScreenY)` where:
- `viewOrigin = { x: W/2, y: H/2 }` is the **viewport center** (the world-container anchor).
- `(camScreenX, camScreenY) = isoToScreen(camera.getCameraX(), camera.getCameraY(), tileSize, tileWorldOrigin)` uses `tileWorldOrigin = { x: W/2, y: H*0.30 }` (the HUD-strip tile origin — unchanged).
- The world-container `position` thus lands the camera-projected iso position at the viewport center, not at the HUD strip.

The `hud` and `ui` layers MUST remain siblings of `world` at `(0, 0)` — unchanged. The `tileWorldOrigin` (HUD strip) is preserved for F3 hit-detection (`screenToIso` snap), so existing round-trip semantics still hold (TILE-001).

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

## Scope boundary and rollback note

**Out of scope**: `src/rail-camera.js`, `src/input.js`, `src/player.js`, `styles/main.css`, `index.html` (locked per `openspec/config.yaml` `rules.apply`).

**Rollback**: `git revert <commit>` keeps the F2.5 modules + tiles intact and restores the previous top-left anchoring. `tileWorldOrigin` is preserved as a separate concept, so reverting CAM-002 alone cannot regress TILE-001 round-trip semantics.

## ADDED Requirements

None.

## REMOVED Requirements

None.

## RENAMED Requirements

None.