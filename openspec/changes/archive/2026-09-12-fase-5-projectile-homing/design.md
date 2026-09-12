# Design: fase-5-projectile-homing

## Technical Approach

Per-frame homing in `Projectile.tick()`: each frame recompute target from stored `isoX/isoY` via `isoWorld.isoToScreenWithCamera(...)`, rebuild velocity toward that point. Sync hit at fire time stays untouched.

## Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| Camera deps in `tick()` | **3 args** from `Combat.update()` | Projectile stays a plain value class — no Combat back-ref, JSON-safe; deps already in scope |
| NaN on `isoX`/`isoY` | **Skip recalc, keep last vel** | Spec line 47–52. Not despawn: avoids flicker. Not zero: avoids freeze |
| `ARRIVAL_EPSILON_PX_SQ=16` at 2400 px/s | **Keep (4 px)** | ~40 px/frame at 60fps; lower → jitter, higher → overshoot |
| `projectVelocity()` reuse | **Keep**, origin = current `gfx` | Pure + exported + tested. Sine axes also from `gfx` (not `origin`) so flutter stays perpendicular |

## Data Flow

```
Combat.update(dtMs)
  for each Projectile p:
    p.tick(dtMs, frustumMin, frustumMax,
           isoWorld, cameraIso, viewportCenter)
      ├── if (finite(isoX) && finite(isoY))
      │     this.target = isoWorld.isoToScreenWithCamera(isoX, isoY, cameraIso, viewportCenter)
      ├── build vel from {x: gfx.x, y: gfx.y} → this.target
      ├── advance gfx + sine flutter
      └── despawn: arrival | lifetime | frustum
```

## File Changes

| File | Action | Description |
|---|---|---|
| `openspec/changes/fase-5-projectile-homing/design.md` | Create | This file |
| `src/combat.js` | Modify | `Projectile.tick()` +3 args; target recalc each frame from `isoX/isoY`; sine axis from `gfx` not `origin`; `Combat.update()` pass-throughs |
| `tests/e2e/projectile-direction.spec.mjs` | Modify | New homing scenario: enemy moves between fire and tick, assert velocity vector changes across ≥2 frames |

## Interfaces / Contracts

```js
tick(dtMs, frustumMin, frustumMax, isoWorld, cameraIso, viewportCenter)
// projectVelocity(originScreen, targetScreen) — unchanged
// Combat.update(dtMs) — unchanged signature, body passes 3 deps
```

Constructor stays as-is — `isoX/isoY` already stored at spawn.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| E2E (Playwright) | Homing: velocity vector changes when enemy moves | `projectile-direction.spec.mjs`: `getProjectiles()` twice ≥100 ms apart, compare deltas |
| E2E | NaN guard keeps last velocity | Inject `NaN` via `__gameTestAPI__`, assert velocity unchanged |
| Regression | Empty-space click despawns ≤8 px from static target | Existing scenario, unchanged |

## Threat Matrix

N/A — pure JS math in renderer; no routing/shell/subprocess/VCS/exec/process boundary.

## Migration / Rollout

No migration required. Single-commit, no API change for callers of `Combat.fireAtIso`. **Rollback**: single `git revert <merge-commit-hash>` — straight-line behavior + original test scenarios restored.

## Open Questions

None.
