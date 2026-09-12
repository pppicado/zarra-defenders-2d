# Design: fase-5-screen-space-escape

## Technical Approach

Add a screen-space escape test alongside the existing Manhattan fallback in `EnemyManager.update()`. Project each enemy to screen via the already-shipped `isoWorld.isoToScreenWithCamera()` (used by `Enemy.getScreenBounds` and `Combat.tick`) and compare against the viewport bottom. Trigger escape on either test. Keep `isEscaped` unchanged for back-compat with the existing F3 path. Signature change is positional-only (no opts bag) to minimize churn at the single production call site (`main.js:388`) and the test-api call (`test-api.js:97`).

## Architecture Decisions

| Decision | Choice | Alternatives | Why |
|---|---|---|---|
| `update()` API shape | Add 3 positional params: `(dtMs, cameraIso, elapsedSec, isoWorld, viewportCenter, viewportSize)` | Options bag `update(dtMs, opts)` | Less surgery; one production caller + one test caller. Existing positional `cameraIso` keeps tests readable. |
| `isScreenEscaped` placement | Named export in `src/enemies.js`, top-level alongside `isEscaped` | Inline in `EnemyManager.update` | Pure helper, unit-testable in isolation, mirrors `isEscaped` discoverability. |
| Detection order | Screen-space first (early exit on common south exit), Manhattan fallback second | Either test only | Spec REQ-CMB-008: both must run; common case is the viewport-bottom one. |
| `SOUTH_MARGIN_PX` constant | Module-level `const SOUTH_MARGIN_PX = 32` in `enemies.js` | Hardcoded literal | Surfaces as 1 tile of forgiveness; spec REQ-CMB-008 fixes the value, single source. |
| Test-API surface | Reuse existing `__zarraModules__.setViewportSize`; expose passthrough `setViewportSize(w,h)` on `__gameTestAPI__` | New stateful test field | `combat.setViewportSize` + `isoWorld._viewOrigin` already wired — just delegate. |
| Back-compat gate | `if (isoWorld && viewportCenter && viewportSize) { run screen-space test }` | Always run; require params | Existing callers (none today, but matches F3 contract) keep working without forcing migration. |

## Data Flow

```
  main.js ticker (line ~388)
      │
      ├─ enemies.update(dt*1000, camIso, elapsedSec,
      │                  isoWorld, viewportCenter, viewportSize)
      │
      └─> EnemyManager.update
            ├─ time-gated spawn materialization     (unchanged)
            └─ for each live enemy:
                 │
                 ├─ if state !== 'alive' → skip
                 │
                 ├─ screenEscaped = isScreenEscaped(enemy, isoWorld, cameraIso,
                 │                               viewportCenter, viewportSize)
                 │     └─ isoWorld.isoToScreenWithCamera(enemy.isoX, enemy.isoY,
                 │                                       cameraIso, viewportCenter)
                 │        returns { sx, sy }
                 │     └─ return sy > viewportSize.y + SOUTH_MARGIN_PX
                 │
                 ├─ isIsoEscaped = isEscaped(enemy, cameraIso)    (Manhattan > 6)
                 │
                 └─ if (screenEscaped || isIsoEscaped):
                       emit('enemy:escaped', { enemyId, archetype })
                       _destroySprite(enemy) + _enemies.delete(id)
            │
            └─ GC destroyed enemies past 200 ms     (unchanged)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/enemies.js` | Modify | Add `SOUTH_MARGIN_PX = 32` const; export `isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize)`; extend `update()` signature to `(dtMs, cameraIso, elapsedSec = 0, isoWorld = null, viewportCenter = null, viewportSize = null)`; in escape loop, compute `screenEscaped` first when all three params supplied, then `||` with `isEscaped`. |
| `src/main.js` | Modify | Pass `isoWorld, { x: LOGICAL_W/2, y: LOGICAL_H/2 }, { x: LOGICAL_W, y: LOGICAL_H }` to `enemies.update()` on line 388. (Constants already imported, already used on line 436.) |
| `src/test-api.js` | Modify | (1) `tick()` internal call at line 97 → add `ctx.isoWorld, vc, vs` so test-driven ticks also exercise the screen-space path. (2) Add `setViewportSize(w, h)` method delegating to the existing `__zarraModules__.setViewportSize` flow (rewire isoWorld + combat); store on `ctx._viewportSize` so `enemies.update` reads the current size. (3) Add `getScreenEscapedRects()` returning `ctx.enemies._lastScreenEscaped ?? []`. |
| `tests/e2e/escape-detection.spec.mjs` | Modify | Add 3 RED scenarios per spec: enemy behind camera → escapes within 1 frame; enemy at top → no escape; enemy far off-axis → Manhattan fallback fires. |

## Interfaces / Contracts

```js
// src/enemies.js
export const SOUTH_MARGIN_PX = 32  // ~1 tile of visual warning

export function isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize) {
  const { sy } = isoWorld.isoToScreenWithCamera(
    enemy.isoX ?? 0, enemy.isoY ?? 0, cameraIso, viewportCenter,
  )
  return sy > viewportSize.y + SOUTH_MARGIN_PX
}

// Back-compat: old callers pass nothing new → only Manhattan runs.
update(dtMs, cameraIso, elapsedSec = 0, isoWorld = null, viewportCenter = null, viewportSize = null) {
  ...
  for (const enemy of this._live()) {
    if (enemy.state !== 'alive') continue
    const screenEscaped = (isoWorld && viewportCenter && viewportSize)
      ? isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize)
      : false
    const isoEscaped = isEscaped(enemy, cameraIso)
    if (screenEscaped || isoEscaped) {
      this._lastScreenEscaped ??= []
      this._lastScreenEscaped.push({ enemyId: enemy.id, sy: ..., reason: screenEscaped ? 'screen' : 'manhattan' })
      emit('enemy:escaped', { enemyId: enemy.id, archetype: enemy.archetype })
      this._destroySprite(enemy)
      this._enemies.delete(enemy.id)
    }
  }
}
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `isScreenEscaped` direct: iso(5,5) behind camera at (10,10), viewport 1280×720 → `sy > 752` → true | New spec in `tests/e2e/escape-detection.spec.mjs`. |
| Integration | `EnemyManager.update` w/ all 3 params → RED: enemy at viewport-bottom projected `sy > 752` removed within 1 tick | Mount enemy via `spawnEnemy`, call `update` once, assert `getEnemies()` no longer contains it. |
| Regression | Existing tests (F3 escape via Manhattan > 6) still pass | Existing assertions unchanged; only additional case added. |

## Threat Matrix

N/A — change is pure game-logic projection. No routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary touched.

## Migration / Rollout

No data migration. No feature flag. Single-frame behavior change: enemies that previously waited ~10s for the 6-tile Manhattan buffer to drain now deduct integrity within 1 frame of crossing the viewport bottom. The 32 px margin preserves a ~0.5 s visual warning. **Rollback**: `git revert <merge-commit>` — single revert removes the helper, restores the original `(dtMs, cameraIso, elapsedSec)` signature, and removes the three new positional args from `main.js` / `test-api.js` without side effects.

## Open Questions

None.