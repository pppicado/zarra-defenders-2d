# Proposal: fase-5-screen-space-escape

## Intent

Current escape detection in `src/enemies.js` `isEscaped()` uses **Manhattan distance in iso-plane** (`|ex - cx| + |ey - cy| > 6`). This means enemies that fall south of the camera remain "alive" for 6 tiles (~10 seconds at 0.6 tile/sec rail speed). The user reports: enemies exiting the bottom of the visible screen take too long to deduct a life.

The fix: **screen-space escape detection** — an enemy escapes the moment its projected screen-Y exceeds the visible viewport bottom. Plus a fallback so off-axis escapes still register.

## Scope

### In Scope
- `src/enemies.js`: New `isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize)` pure helper that projects the enemy's iso position to screen and compares against viewport bounds
- `src/enemies.js`: Modify `EnemyManager.update()` to also accept `isoWorld`, `viewportCenter`, `viewportSize` parameters and run screen-space escape in addition to Manhattan
- `src/main.js`: Pass new params to `enemies.update()`
- `src/test-api.js`: Expose `setViewportSize(w, h)` for tests + `getScreenEscapedRects()` if applicable
- `tests/e2e/escape-detection.spec.mjs`: New spec verifying:
  - RED: enemy below viewport = escapes immediately (current behavior: takes 6-tile buffer)
  - RED: enemy at top of screen = does not escape
  - RED: enemy off-axis (far north or east) = still detected via Manhattan fallback
- Delta spec: `combat-core` — new REQ-CMB-008: Screen-space escape detection

### Out of Scope
- Changes to enemy spawn logic
- Changes to projectile homing / hit detection
- Asset generation
- Changes to integrity drain behavior (already wired to `enemy:escaped`)

## Approach

### 1. New `isScreenEscaped()` helper

```js
export function isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize) {
  const screen = isoWorld.isoToScreenWithCamera(enemy.isoX, enemy.isoY, cameraIso, viewportCenter)
  // South = bottom of screen (high screen Y in screen coords)
  // After F3.11 Y-flip: enemies BEHIND the camera have high screen Y
  return screen.sy > viewportSize.y + SOUTH_MARGIN_PX
}
```

`SOUTH_MARGIN_PX = 32` (1 tile at low res, gives player a frame of visual warning before the escape fires).

### 2. Combined detection in `EnemyManager.update()`

Replace the single `isEscaped()` check with:
```js
if (isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize) ||
    isEscaped(enemy, cameraIso)) {
  emit('enemy:escaped', ...)
  destroy + remove
}
```

Screen-space check catches the common case immediately; Manhattan fallback handles enemies that are far off-axis (north/east) which might not register screen-bottom escape until much later.

### 3. Function signature change

`EnemyManager.update(dtMs, cameraIso, elapsedSec = 0)` becomes:

```
EnemyManager.update(dtMs, opts = {}) {
  opts = {
    cameraIso: { isoX, isoY },
    elapsedSec: 0,
    isoWorld: <IsoWorld>,    // new
    viewportCenter: { x, y }, // new
    viewportSize: { x, y },   // new
  }
}
```

Backward-compat: if `cameraIso` is passed positionally (not in opts), use it but skip screen-space check.

### 4. Test integration

`tests/e2e/escape-detection.spec.mjs` is already a unit spec (per the registry). Add scenarios that mount an enemy at known iso position, advance camera to specific depth, verify escape fires correctly.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/enemies.js` | Modified | New isScreenEscaped helper + update() accepts opts |
| `src/main.js` | Modified | Pass isoWorld/viewportCenter/viewportSize to enemies.update |
| `src/test-api.js` | Modified | Expose setViewportSize + helpers if needed |
| `tests/e2e/escape-detection.spec.mjs` | Modified | Add 3 new scenarios |
| `openspec/specs/combat-core/spec.md` | Modified | New REQ-CMB-008 |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `isoWorld` not available in some contexts | Low | Backward-compat: opts with isoWorld is optional; without it, fall back to old isEscaped |
| Camera changes DPR/margins → screen Y threshold wrong | Low | Use viewportSize.y + fixed SOUTH_MARGIN_PX regardless of DPR; PIXI handles coord scaling |
| Player wants more "forgiveness" for fast-action gameplay | Low | SOUTH_MARGIN_PX = 32 px gives ~0.5s visual warning at 0.6 tile/s |

## Rollback Plan

Single `git revert <merge-commit>` restores:
- `isScreenEscaped` removed from enemies.js
- `update()` signature reverted to `(dtMs, cameraIso, elapsedSec)` 
- main.js / test-api.js unchanged

## Dependencies

- `isoWorld.isoToScreenWithCamera()` — already used in combat.js
- viewport size from `LOGICAL_W` / `LOGICAL_H` — already constants
- Existing `enemy:escaped` event — already drains integrity

## Success Criteria

- [ ] Enemy below visible viewport by 32px = escape within 1 frame
- [ ] Enemy at top of viewport = no escape
- [ ] Enemy far off-axis (north/east) = still detected via Manhattan fallback
- [ ] No regression on existing tests
- [ ] Manual smoke: 5 enemies exit bottom → 5 integrity drains within 1 second
