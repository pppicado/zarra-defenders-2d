# Proposal: fase-5-projectile-homing

## Intent

Fix the projectile targeting bug in `src/combat.js`. When the player fires, the papeleta currently travels in a **fixed straight line** toward the target position recorded at fire time. If the target (enemy) moves after the shot, the projectile misses visually and exits the frustum without triggering the arrival despawn — appearing to the player as "flying in the direction it was launched until it disappears."

The fix: **per-frame target recalculation** (homing) using the iso coordinates stored at spawn time, so the projectile tracks the target's live screen position.

## Scope

### In Scope
- `src/combat.js`: `Projectile.tick()` — replace static `this.target` with per-frame recalculated target using `this.isoX/Y` + `isoToScreenWithCamera`
- `src/combat.js`: `Projectile` constructor — ensure `isoX`, `isoY` are always numeric (defensive: NaN guard on target recalculation)
- Delta spec: `combat-core` — update REQ-CMB-002 projectile lifecycle to require homing behavior
- E2E test: `tests/e2e/projectile-direction.spec.mjs` — add homing scenario (projectile tracks moving target)

### Out of Scope
- Changes to hit-resolution pipeline (sync hit at fire time is preserved)
- Changes to projectile speed, lifetime, or sine flutter
- Ally (civilian) hit logic

## Approach

**Per-frame target update in `Projectile.tick()`:**

Each tick, before computing velocity, recalculate `this.target` from stored iso coordinates:

```
targetScreen = isoWorld.isoToScreenWithCamera(this.isoX, this.isoY, cameraIso, viewportCenter)
```

`isoWorld`, `cameraIso`, and `viewportCenter` are already available via `Combat.update()` → `Projectile.tick()` parameters (or stored on the Projectile at construction).

For clicks on empty space (no enemy), `isoX/isoY` are the click's iso coordinates — the projectile travels to that exact point and despawns normally via the existing arrival check.

**Defensive**: if `isoX` or `isoY` is NaN (shouldn't happen), skip target recalculation and use the previous `this.target` — the projectile continues on its current trajectory.

**No changes to `fireAtIso`**: spawn behavior unchanged. The sync hit resolution remains at fire time.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/combat.js` | Modified | `Projectile.tick()` — homing each frame; NaN guard |
| Delta spec | Modified | `REQ-CMB-002` projectile lifecycle (straight line → homing) |
| `tests/e2e/projectile-direction.spec.mjs` | Modified | Add homing scenario |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Target recalculation every frame adds CPU cost | Low | isoToScreenWithCamera is pure math (no DOM/GPU); cheap per projectile |
| NaN isoX/isoY corrupts target | Low | Defensive NaN guard; log warning if detected |
| Test file references old straight-line behavior | Low | Update scenarios to reflect homing |

## Rollback Plan

Single `git revert` of the merge commit restores the straight-line projectile behavior. No new files created. Restoration steps:
1. `git revert <merge-commit-hash>` — reverts combat.js changes
2. Verify `tests/e2e/projectile-direction.spec.mjs` passes (old scenarios restored)
3. Manual visual smoke: fire at moving enemy, confirm projectile follows

## Dependencies

- `isoToScreenWithCamera` from `src/iso/world.js` — already imported/accessible in combat context
- `Combat` constructor already accepts `isoWorld` and `viewportCenter` — no new dependency injection needed

## Success Criteria

- [ ] Projectile visually tracks a moving enemy (reaches enemy's current position, not spawn position)
- [ ] Projectile fired at empty space still travels to click point and despawns normally
- [ ] `tests/e2e/projectile-direction.spec.mjs` passes with new homing scenario
- [ ] No console errors during gameplay (NaN guard verified)
- [ ] Manual smoke: fire 10 shots at moving enemies, all 10 projectiles visually reach their target
