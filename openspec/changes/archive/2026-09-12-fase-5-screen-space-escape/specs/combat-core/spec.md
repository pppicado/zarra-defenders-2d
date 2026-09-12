# Delta for `combat-core`

**Capability**: combat-core (MODIFIED for change "fase-5-screen-space-escape")
**Change**: fase-5-screen-space-escape

## Purpose

Add a screen-space escape test so enemies exiting the visible viewport bottom deduct integrity within a single frame, while preserving the existing Manhattan iso-plane fallback for off-axis escapes.

## ADDED Requirements

### REQ-CMB-008: Screen-space escape detection

The system SHALL declare an enemy escaped when EITHER:

1. The enemy's projected screen-Y exceeds `viewportSize.y + 32 px` (south screen-space test), OR
2. Manhattan distance from enemy iso to camera iso exceeds `6 tiles` (off-axis fallback).

The south screen-space test SHALL run via `isoToScreenWithCamera(enemy.isoX, enemy.isoY, cameraIso, viewportCenter)` projection. The `32 px` margin MUST give a brief visual warning (~0.5 s at 0.6 tile/s rail speed). When `isoWorld`, `viewportCenter`, or `viewportSize` are unavailable, the system SHALL fall back to the Manhattan test only (no false escape for in-frame enemies).

#### Scenario: Enemy directly behind camera escapes within 1 frame

- GIVEN an enemy at iso `(5, 5)` and the camera advanced south past that tile
- WHEN one tick runs with `isoWorld`, `viewportCenter`, `viewportSize = { x: 1280, y: 720 }` supplied
- THEN `isoToScreenWithCamera` returns `sy > 720 + 32 = 752`
- AND `enemy:escaped` fires immediately
- AND the enemy is removed from the active list.

#### Scenario: Enemy at the top of the viewport does not escape

- GIVEN an enemy whose projected `sy` is below `viewportSize.y + 32 px`
- WHEN `update()` runs that frame
- THEN the screen-space test returns false
- AND Manhattan distance is ≤ 6 tiles
- AND the enemy is NOT removed
- AND no `enemy:escaped` event fires.

#### Scenario: Enemy far off-axis escapes via Manhattan fallback

- GIVEN an enemy at iso `(camera.isoX + 10, camera.isoY - 10)` (10 north, 10 east)
- WHEN `update()` runs
- THEN screen-space Y is still inside viewport (no south-escape)
- AND Manhattan distance = 20 tiles > 6
- AND the enemy IS removed
- AND `enemy:escaped` fires.

#### Scenario: `?test=1` exposes helpers to mount enemies and advance the camera

- GIVEN `?test=1` is active
- WHEN a test calls `__gameTestAPI__.setViewportSize(w, h)` and mounts an enemy at known iso coords
- THEN `enemies.update(...)` accepts `{ isoWorld, viewportCenter, viewportSize, cameraIso }`
- AND `__gameTestAPI__.advanceCameraTo(isoX, isoY)` repositions the camera for the next tick
- AND `getScreenEscapedRects()` returns the list of enemies flagged escaped this frame.