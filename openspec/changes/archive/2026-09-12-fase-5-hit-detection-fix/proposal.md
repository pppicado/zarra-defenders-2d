# Proposal: fase-5-hit-detection-screen-bounds

## Intent

Current hit detection in `src/combat.js` `_resolveHit()` uses an **iso-plane AABB** with fixed half-extents (`hw`, `hh`) per archetype (standard 1.5/2.5, boss 2.5/3.5). This is independent of the visible sprite's actual screen footprint, so:

- It does not match the visible sprite at the current `tileSize` (tileSize scales 64-256)
- It does not account for DPR (high-DPR screens have visually bigger sprites)
- Different enemy sizes (boss vs standard) get fixed iso AABBs that don't reflect their actual on-screen footprint

The fix: replace iso-plane AABB with **screen-space sprite bounds** hit testing using the enemy's current screen position from `isoToScreenWithCamera` plus its visible sprite extents from `enemy.sprite.getBounds()`. A click registers a hit iff the screen-space cursor falls inside any live enemy's screen-space AABB.

This guarantees: **if you can see it, you can hit it** — regardless of resolution, DPR, or tile size.

## Scope

### In Scope
- `src/combat.js`: `_resolveHit()` — replace iso-plane AABB with screen-space per-enemy bounds check using `isoToScreenWithCamera(enemy.isoX, enemy.isoY)` + sprite bounds
- `src/combat.js`: `fireAtIso()` — pass screen-coords input (already have `originScreen`) — adjust the resolution flow so cursor screen coordinates drive hit testing instead of iso-plane coords
- `src/enemies.js`: Add a helper `getHitScreenBounds(enemy, isoWorld, viewportCenter)` that returns screen AABB {x, y, w, h} from `enemy.sprite.getBounds()` (fallback to a default AABB if no sprite)
- `src/iso/world.js`: Add `screenToIsoWithCamera` already exists; reuse for forward projection (already used)

### Out of Scope
- Ally hit logic (no allies in current gameplay)
- Multi-shot / volley attacks
- Projectile trajectory changes (already fixed in fase-5-projectile-homing)
- Sprite regen / asset pipeline

## Approach

### New hit-resolution pipeline

```
_ResolveHitAtScreenPoint(cursorScreenX, cursorScreenY):
  candidates = []
  for each live enemy with sprite:
    bounds = enemy.sprite.getBounds()  // PIXI returns world-space AABB
                  OR compute from iso-projection of (isoX, isoY) + tileSize
    if cursorScreenX in [bounds.x, bounds.x + bounds.width]
       AND cursorScreenY in [bounds.y, bounds.y + bounds.height]:
      candidates.push(enemy)
  return candidates sorted by depth desc (closest first)
```

### Why per-sprite screen bounds

- `enemy.sprite.getBounds()` returns the visible AABB after all transforms (anchor, scale, world container position)
- It automatically handles DPR (because PIXI knows the resolution)
- It automatically handles `tileSize` variation (sprite scale is `TILE_SIZE / baseSize`)
- It automatically handles different enemy visual sizes

### Fallback for enemies without sprite

If `enemy.sprite` is null (texture failed to load), use a default screen AABB derived from `isoToScreenWithCamera(enemy.isoX, enemy.isoY)` +/- `tileSize / 2` per axis.

### Refactor fireAtIso entry point

Currently `fireAtIso(isoX, isoY, originScreen)` does sync hit resolution. We need to convert the cursor's screen position to screen space for the hit test (already have `originScreen` from hand, need screen-space cursor position too).

Add a new public method `_screenX/_screenY` parameter or compute from `originScreen` initially. Simpler: callers pass screen coords directly:

```
fireAtScreen(screenX, screenY, originScreen)
  cursorScreen = { x: screenX, y: screenY }
  target = _resolveHitAtScreenPoint(cursorScreen)
  ...rest unchanged
```

Keep `fireAtIso(isoX, isoY, originScreen)` for backward compat — it converts screenX→iso first via `screenToIsoWithCamera`, then calls the new screen-based resolver.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/combat.js` | Modified | `_resolveHit()` → `_resolveHitAtScreenPoint()`; add `fireAtScreen()` |
| `src/enemies.js` | Modified | Add `getHitScreenBounds(enemy, isoWorld, cameraIso, viewportCenter)` |
| `src/main.js` | Modified | Wire tap handler to compute screen coords + call `fireAtScreen` |
| `src/test-api.js` | Modified | Add `fireAtScreen(x, y)` test entry point |
| `tests/e2e/hit-detection.spec.mjs` | Modified | Rewrite to use screen-coord firing; add scenarios for all 4 archetypes + multi-resolution |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `sprite.getBounds()` returns stale bounds during camera animation | Low | PIXI's `getBounds()` evaluates at call time; if dirty, call `updateTransform` |
| Iso-projection fallback might not match visible sprite when anchor is non-center | Low | Fallback uses screen center +/- half tile in screen coords (pre-computed) |
| Sorting (depth desc) breaks under screen-space hit test | Low | Keep depth sort — `enemy.depth = enemy.isoX + enemy.isoY` is invariant |
| `fireAtIso` backward compat breaks existing tests | Medium | Keep `fireAtIso` working via internal conversion to screen |

## Rollback Plan

Single `git revert <merge-commit>`. No new files. The refactor swaps one hit algorithm for another; reverting restores the iso-plane AABB.

## Dependencies

- `PIXI.Sprite.getBounds()` — already used elsewhere
- `isoToScreenWithCamera` — already in iso/world.js
- No new modules required

## Success Criteria

- [ ] All 4 archetypes (standard, tank, mini-boss, boss) hit-test against their **visible** sprite bounds
- [ ] Click on visible sprite = hit, click outside = miss (resolution-independent)
- [ ] Tests pass at 1280x720, 1920x1080, and 3840x2160 (DPR 2x)
- [ ] `tests/e2e/hit-detection.spec.mjs` covers all 4 archetypes + 3 resolutions
- [ ] No console errors during gameplay
- [ ] Manual smoke: fire 20 shots at moving enemies across all 4 archetypes, all hit
