# Tasks: fase-5-screen-space-escape

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~95 (enemies.js ~40, main.js ~5, test-api.js ~30, escape-detection.spec.mjs ~60, hit-detection.spec.mjs ~10) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase RED — Write failing tests first (TDD strict)

- [x] **TASK-R1** — RED · `tests/unit/escape-detection.spec.mjs` (new test, ~15 LOC) · add test `REQ-CMB-008 — enemy directly behind camera escapes within 1 frame`: import `EnemyManager`, spawn enemy at iso `(5,5)`, call `mgr.update(16, {isoX:20, isoY:20}, 0, isoWorld, {x:640,y:360}, {x:1280,y:720})`, assert `mgr.readAll()` does NOT contain the id · verify: `node --test tests/unit/escape-detection.spec.mjs` fails on this test only (other tests still pass) · ~15 LOC · RED
- [x] **TASK-R2** — RED · `tests/unit/escape-detection.spec.mjs` (new test, ~12 LOC) · add test `REQ-CMB-008 — enemy at top of viewport does not escape`: spawn enemy at iso `(10,10)` where `isoToScreenWithCamera` projects `sy < 752`, call `update(...)` after camera advances 5 tiles, assert enemy STILL in `mgr.readAll()` · verify: same command, only R2 fails · ~12 LOC · RED
- [x] **TASK-R3** — RED · `tests/unit/escape-detection.spec.mjs` (new test, ~15 LOC) · add test `REQ-CMB-008 — off-axis Manhattan fallback still fires`: spawn enemy at iso `(camera.isoX+10, camera.isoY-10)`, call `update(...)`, assert enemy removed via Manhattan path (screen-Y test returns false but `isEscaped` returns true) · verify: same command, R3 fails · ~15 LOC · RED
- [x] **TASK-R4** — RED · `tests/e2e/hit-detection.spec.mjs` (modify Part 2, ~10 LOC delta) · replace the `t=20` camera-past-escape assertion with `t=2`: expect `__gameTestAPI__.getIntegrity()` to have deducted an escape event by `t=3s` with the new screen-space logic (old buffer gave `t~18.33s`) · verify: `node tests/e2e/hit-detection.spec.mjs` fails on the modified Part 2 · ~10 LOC · RED

## Phase GREEN — Make tests pass

- [x] **TASK-G1** — GREEN · `src/enemies.js` (top-level export, ~10 LOC) · add `export const SOUTH_MARGIN_PX = 32` and `export function isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize)` returning `isoWorld.isoToScreenWithCamera(enemy.isoX??0, enemy.isoY??0, cameraIso, viewportCenter).sy > viewportSize.y + SOUTH_MARGIN_PX` · verify: R1 passes, R2 passes · ~10 LOC · GREEN
- [x] **TASK-G2** — GREEN · `src/enemies.js` line 317 (signature + escape loop, ~15 LOC) · change `update(dtMs, cameraIso, elapsedSec = 0)` → `update(dtMs, cameraIso, elapsedSec = 0, isoWorld = null, viewportCenter = null, viewportSize = null)`; inside loop compute `screenEscaped` when all 3 params supplied, `||` with `isEscaped`, push `{enemyId, sy, reason}` into `this._lastScreenEscaped` · verify: R1, R2, R3 all pass · ~15 LOC · GREEN
- [x] **TASK-G3** — GREEN · `src/main.js` line 388 (~5 LOC delta) · change `enemies.update(dt * 1000, camIso, elapsedSec)` → `enemies.update(dt * 1000, camIso, elapsedSec, isoWorld, {x: LOGICAL_W/2, y: LOGICAL_H/2}, {x: LOGICAL_W, y: LOGICAL_H})` · verify: `node tests/e2e/hit-detection.spec.mjs` Part 2 passes · ~5 LOC · GREEN
- [x] **TASK-G4** — GREEN · `src/test-api.js` (~20 LOC) · (a) at line 97 internal `tick()` call add `ctx.isoWorld, vc, vs`; (b) expose `setViewportSize(w, h)` delegating to `__zarraModules__.setViewportSize` + storing `ctx._viewportSize`; (c) expose `getScreenEscapedRects()` returning `ctx.enemies._lastScreenEscaped ?? []` · verify: `__gameTestAPI__.setViewportSize(1280,720)` callable in `?test=1`, R4 passes · ~20 LOC · GREEN

## Phase REFACTOR — Clean up

- [x] **TASK-X1** — REFACTOR · `src/enemies.js` top (~3 LOC) · `SOUTH_MARGIN_PX` const already added in G1; add rationale JSDoc comment `// ~1 tile visual warning (REQ-CMB-008); 0.6 tile/s × 32 px ≈ 0.5 s buffer` above it · verify: all tests still green · ~3 LOC · REFACTOR

## Test commands per phase

- Unit: `node --test tests/unit/escape-detection.spec.mjs`
- E2E: serve `python3 -m http.server 8000` then `node tests/e2e/hit-detection.spec.mjs`

## Dependency order

R1–R4 must be committed failing before G1–G4. G1 unblocks R1+R2. G2 unblocks R3. G3+G4 unblock R4. X1 last.

## Status

All 9 tasks (R1–R4, G1–G4, X1) complete. See `apply-progress.md` for the TDD cycle evidence table and full test results.
