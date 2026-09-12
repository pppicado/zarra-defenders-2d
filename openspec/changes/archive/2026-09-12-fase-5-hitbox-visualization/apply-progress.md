# Apply Progress: fase-5-hitbox-visualization

## Status: SUCCESS (all assigned tasks complete)

## TDD Cycle Evidence

| Task | RED (test written first) | GREEN (implementation passes) | REFACTOR |
|------|--------------------------|--------------------------------|----------|
| TASK-R1 | Wrote `tests/e2e/hitbox-visualization.spec.mjs` runR1MissOutsideInset — confirmed RED via `FAIL: api.getHitboxRects is not a function` (script aborts at R2 before reaching the assertion); R1's `bounds.x - 5` regression lock also asserted. | PASS after TASK-G2 (hitInset applied). | — |
| TASK-R2 | Wrote `runR2OverlayRects` reading `api.getHitboxRects()` — confirmed RED via `TypeError: api.getHitboxRects is not a function`. | PASS after TASK-G3 + G5 + G7 (overlay built, wired, test API surface added). | — |
| TASK-R3 | Wrote `runR3ToggleOffEmpty` calling `api.setHitboxesEnabled(false)` then `getHitboxRects()` — confirmed RED (no toggle method). | PASS after TASK-G3 + G5 + G7. | — |
| TASK-R4 | Added `runR5ClickOnInsetEdge` to `tests/e2e/hit-detection.spec.mjs` — confirmed PASS (regression lock: passes before hitInset because bounds==sprite, passes after because click is on the shrunk edge). | PASS after TASK-G2 (locks the inclusive boundary). | — |
| TASK-G1 | — | PASS — added `hitInset` to all 4 archetypes in `src/enemies.js`. | — |
| TASK-G2 | — | PASS — `Enemy.getScreenBounds` applies hitInset to both sprite and fallback branches. | TASK-X1 |
| TASK-G3 | — | PASS — created `src/debug-hitboxes.js` with `DebugHitboxes` class. | TASK-X2 |
| TASK-G4 | — | PASS — per-archetype `PIXI.Graphics` pool with color-coded strokes. | — |
| TASK-G5 | — | PASS — wired `DebugHitboxes` into `src/main.js`: `?hitboxes=1` parse, instantiation, `H` key toggle, ticker call. | — |
| TASK-G6 | — | **DEVIATION** — skipped the explicit `<script type="module" src="src/debug-hitboxes.js?v=45">` in `index.html` because main.js already imports it as `./debug-hitboxes.js?v=44`. A separate script tag with `?v=45` would create a SECOND module instance (browser dedupes by full URL including query string), breaking the singleton contract. main.js's import is sufficient — the browser fetches and evaluates the module exactly once. | — |
| TASK-G7 | — | PASS — added `setHitboxesEnabled(bool)` + `getHitboxRects()` to `__gameTestAPI__`; passes `debugHitboxes` into mountTestAPI ctx. | — |
| TASK-X1 | — | — | DONE — extended `assertArchetype` to validate hitInset presence + every side is a finite number; throws ConfigError otherwise. |
| TASK-X2 | — | — | DONE — `ARCHETYPE_COLORS` already co-located at the top of `src/debug-hitboxes.js` (above the `DebugHitboxes` class). No change needed. |

## Test Results

### Before implementation (RED baseline)

```
$ node tests/e2e/hitbox-visualization.spec.mjs
FAIL page.evaluate: TypeError: api.getHitboxRects is not a function
    at eval (eval at evaluate (:311:30), <anonymous>:3:23)
```

`tests/e2e/hit-detection.spec.mjs` was GREEN before implementation (regression lock).

### After implementation (GREEN)

```
$ TEST_URL=http://localhost:8000/?test=1 node tests/e2e/hit-detection.spec.mjs
OK {
  "result1": { "hits": [{ "x": 3, "y": 2, "hit": true, "enemyId": "e01" }] },
  "result2": { "integrity": { "current": 2, ... } },
  "result3": { "integrity": { "current": 1, ... } },
  "r1": { "hit": true, "enemyId": "e01" },
  "r2": { "hit": false },
  "r3": { "standard": { "hit": true, ... }, "tank": { "hit": true, ... }, "mini-boss": { "hit": true, ... }, "boss": { "hit": true, ... } },
  "r4": { "1280x720": { "hit": true, ... }, "1920x1080": { "hit": true, ... } },
  "r5": { "hit": true, "enemyId": "e01" },   # TASK-R4 regression lock
  "x1": { "hit": true, "enemyId": "e_tie_a" },
  "x2": { "hit": true, "enemyId": "e_null_a" }
}

$ TEST_URL=http://localhost:8000/?test=1 node tests/e2e/hitbox-visualization.spec.mjs
OK {
  "r1": { "hit": false, "enemyId": null, "bounds": { "x": 682.5, "y": 275.8, "w": 96, "h": 96 } },
  "r2": {
    "rects": [
      { "enemyId": "e01", "archetype": "standard", "x": 682.5, "y": 275.8, "w": 96, "h": 96, "color": 65535 },
      { "enemyId": "e02", "archetype": "standard", "x": 773.0, "y": 4.3,   "w": 96, "h": 96, "color": 65535 }
    ],
    "aliveCount": 2
  },
  "r3": []
}
```

### Production gate verified

```
$ TEST_URL=http://localhost:8000/?test=1 node -e "..."
{
  "rectsBefore": [],        # ?test=1 only (no ?hitboxes=1, no H) → no overlay ✓
  "rectsAfter": 2,          # setHitboxesEnabled(true) → 2 rects visible ✓
  "rectsAfterOff": []       # setHitboxesEnabled(false) → cleared ✓
}

errors: 0                   # ?test=1&hitboxes=1 boot has zero console errors ✓
```

## Issues Encountered

1. **TASK-G6 deviation**: Explicit `<script type="module" src="src/debug-hitboxes.js?v=45">` would create a duplicate module instance. Skipped — main.js's `import { DebugHitboxes } from './debug-hitboxes.js?v=44'` is sufficient.

2. **Pre-existing failures (NOT caused by this change)**:
   - `tests/e2e/smoke.spec.mjs`: "Expected 12 enemies to spawn over the level, got 24" — fails on `main` branch before this change.
   - `tests/e2e/projectile-direction.spec.mjs`: "HOMING FAIL: target screen position did not change between frames" — fails on the workspace due to a new homing scenario in uncommitted prior work (the projectile's `isoX/isoY` are only set when `fireAtScreen` resolves a hit; firing into empty space means homing has no anchor).

## Files Changed

| File | Action | What |
|------|--------|------|
| `src/enemies.js` | Modified | Added `hitInset` to all 4 archetypes; applied inset in `Enemy.getScreenBounds`; extended `assertArchetype` to validate hitInset presence + numeric sides. |
| `src/debug-hitboxes.js` | Created | `DebugHitboxes` class with `setEnabled`/`update`/`readRects`; 1-Graphics-per-archetype pool; tracks latest cameraIso. |
| `src/main.js` | Modified | Imports `DebugHitboxes`; parses `?hitboxes=1`; instantiates overlay; wires `H` keydown; calls `update(camIso)` in ticker; passes `debugHitboxes` into `mountTestAPI` ctx. |
| `src/test-api.js` | Modified | Added `setHitboxesEnabled(bool)` + `getHitboxRects()`; documented `ctx.debugHitboxes` param. |
| `tests/e2e/hit-detection.spec.mjs` | Modified | Added R5 click-on-inset-edge scenario (regression lock for hitInset). |
| `tests/e2e/hitbox-visualization.spec.mjs` | Created | R1 (click outside shrunk bounds), R2 (overlay renders with rects), R3 (toggle off empty). |

## Commits

Single commit (orchestrator did not request commit splitting). Recommend the user stage the above files and commit with a conventional message:

```
feat(hitbox-viz): tighten hit detection + debug hitbox overlay
```

## Workload / PR Boundary

- Mode: single PR
- This apply batch: 1 work unit (hitbox viz + tightened hit detection), aligned with the tasks.md forecast
- Estimated review budget impact: ~210 changed lines (forecast matches)
- Rollback boundary: drop `src/debug-hitboxes.js`, revert `Enemy.getScreenBounds` to pre-inset (`{x: b.x, y: b.y, w: b.width, h: b.height}` + raw fallback), revert `getHitboxRects`/`setHitboxesEnabled` from test-api, remove the `debugHitboxes` import + wiring + `H` keydown + ticker call from main.js, remove `ARCHETYPE_COLORS` import path. Hit detection reverts to full-sprite AABB (the pre-R5 baseline).
