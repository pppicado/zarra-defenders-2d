# Archive Report: fase-5-screen-space-escape

**Change**: fase-5-screen-space-escape
**Archived**: 2026-09-12
**Mode**: openspec
**Cycle outcome**: PASS — implementation matches spec, design, tasks. All 4 spec scenarios have a covering test that passed at runtime. No regressions detected.

## Change Summary

Add a **screen-space escape test** alongside the existing Manhattan iso-plane fallback in `EnemyManager.update()`. Enemies exiting the visible viewport bottom (south) now deduct integrity within a single frame, instead of waiting ~10s for the old 6-tile Manhattan buffer to drain. The 32 px south margin preserves a brief visual warning (~0.5 s at 0.6 tile/s rail speed). The Manhattan test is retained as a fallback for off-axis escapes (north/east) where the screen-space test would still register eventually but later.

## Files Changed (LOC delta)

| File | Action | +LOC | −LOC | Notes |
|---|---|---:|---:|---|
| `src/enemies.js` | Modify | +66 | −1 | Added `SOUTH_MARGIN_PX = 32` const + JSDoc; exported `isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize)` pure helper; extended `EnemyManager.update()` signature with 3 optional positional params (`isoWorld`, `viewportCenter`, `viewportSize`); combined `screenEscaped || manhattanEscaped` in the escape loop with `_lastScreenEscaped` per-tick trace. |
| `src/main.js` | Modify | +9 | −2 | Production call site (line 388): now passes `isoWorld, {x: LOGICAL_W/2, y: LOGICAL_H/2}, {x: LOGICAL_W, y: LOGICAL_H}` to `enemies.update()`. |
| `src/test-api.js` | Modify | +26 | −1 | `tick(dtMs)` internal call now passes `ctx.isoWorld, vc, vs` to `enemies.update`. Exposed `setViewportSize(w, h)` (delegates to `__zarraModules__.setViewportSize`) and `getScreenEscapedRects()` (returns `ctx.enemies._lastScreenEscaped ?? []`). |
| `tests/unit/escape-detection.spec.mjs` | Modify | +93 | −2 | New `REQ-CMB-008` unit suite: 3 RED tests covering screen-space hit, no-escape-at-top, off-axis Manhattan fallback. PIXI-free inlined stub of `isoToScreenWithCamera` using pure math from `iso-math.js`. |
| `tests/e2e/hit-detection.spec.mjs` | Modify | +25 | −11 | Part 2 timing updated from `t=20` to `t=13` (new screen-space fast path catches e01 at ≈13s, not ≈20s); Part 3 timing updated from `t=25` to `t=20` (exactly e01+e02 escape under new logic). |
| `openspec/specs/combat-core/spec.md` | Modify | +56 | −0 | Appended new `### REQ-CMB-008: Screen-space escape detection` requirement with 4 scenarios under `## ADDED Requirements`. All existing requirements (001–007, modified 003) preserved unchanged. |
| **Total** | | **+275** | **−17** | **+258 net LOC** — well under the 400-line budget. |

## Spec Additions

### REQ-CMB-008: Screen-space escape detection

Appended to `openspec/specs/combat-core/spec.md` (after REQ-CMB-007, line 239; before `## MODIFIED Requirements`).

**Requirement body**: The system SHALL declare an enemy escaped when EITHER:
1. The enemy's projected screen-Y exceeds `viewportSize.y + 32 px` (south screen-space test), OR
2. Manhattan distance from enemy iso to camera iso exceeds `6 tiles` (off-axis fallback).

The south screen-space test SHALL run via `isoToScreenWithCamera(enemy.isoX, enemy.isoY, cameraIso, viewportCenter)` projection. The `32 px` margin MUST give a brief visual warning (~0.5 s at 0.6 tile/s rail speed). When `isoWorld`, `viewportCenter`, or `viewportSize` are unavailable, the system SHALL fall back to the Manhattan test only (no false escape for in-frame enemies).

**Scenarios** (4, all PASS at runtime):
- **Scenario 1 — Enemy directly behind camera escapes within 1 frame**: `isoToScreenWithCamera` returns `sy > 752`; `enemy:escaped` fires; enemy removed.
- **Scenario 2 — Enemy at the top of the viewport does not escape**: `sy < 752`; Manhattan ≤ 6; no event; enemy retained.
- **Scenario 3 — Enemy far off-axis escapes via Manhattan fallback**: `sy` inside viewport; Manhattan = 20 > 6; enemy removed.
- **Scenario 4 — `?test=1` exposes helpers**: `setViewportSize(w, h)`, `advanceCameraTo(isoX, isoY)`, `getScreenEscapedRects()` wired; `enemies.update(...)` accepts the four-arg surface.

## Test Coverage

### Unit (`tests/unit/escape-detection.spec.mjs`)

TAP `9/9 pass, 0 fail`:
- 6 existing CAM-004 regression tests still pass (`isEscaped` Manhattan > 6 path unchanged)
- 3 new REQ-CMB-008 tests added:
  - `REQ-CMB-008 — enemy directly behind camera escapes within 1 frame (screen-space)` — PASS (sy=866 > 752)
  - `REQ-CMB-008 — enemy at top of viewport does NOT escape` — PASS (sy=504 < 752)
  - `REQ-CMB-008 — enemy far off-axis escapes via Manhattan fallback` — PASS (sy=-1306, Manhattan=20 > 6)

Output hash (sha256): `f6544a072a896050d4a153a7ab2c55e4358fba2198cb79f9ace18dbeacd527c9`

### E2E (`tests/e2e/hit-detection.spec.mjs`)

All phases return `OK`:
- **Part 1**: hit detection on live enemy (`hit=true`, enemyId=`e01`, integrity stays at 3)
- **Part 2**: escape detection at `t=13` → integrity drains to 2 (single escape via screen-space, was `t=20` before)
- **Part 3**: more time at `t=20` → integrity drains to 1 (e01+e02 escaped via screen-space)
- **R1** (screen-space hit at center): hit, enemyId=`e01`
- **R2** (50 px outside sprite): miss, enemyId=`null`
- **R3** (4 archetypes at sprite center): all 4 hit
- **R4** (resolution independence 1280x720 + 1920x1080): both hit
- **R5** (click on shrunk AABB inset edge): hit, enemyId=`e01`
- **X1** (reverse-depth tie-break, lower-id wins): hit, enemyId=`e_tie_a`
- **X2** (sprite-null fallback): hit, enemyId=`e_null_a`

Output hash (sha256): `dcca2f05393660ccd4b891b515031431c72633e767d6b1794bd679802fb9c3ea`

### Pre-existing failures (NOT caused by this work)

Verified via `git stash` comparison (per `apply-progress.md`):
- `tests/unit/integrity.spec.mjs` — 3 fails (event-bus assertions on exhaust latch)
- `tests/e2e/smoke.spec.mjs` — "Expected 12 enemies to spawn over the level, got 24"
- `tests/e2e/projectile-direction.spec.mjs` — "HOMING FAIL: target screen position did not change between frames"

All present on `main` BEFORE this apply batch; unrelated to REQ-CMB-008.

## Source-Inspection Evidence

| Requirement | File | Lines | Notes |
|---|---|---|---|
| `SOUTH_MARGIN_PX = 32` exported | `src/enemies.js` | 34 | Module-level named export, JSDoc rationale above |
| `isScreenEscaped(...)` exported | `src/enemies.js` | 226–231 | Pure helper, unit-testable |
| `update()` signature extension | `src/enemies.js` | 362 | `(dtMs, cameraIso, elapsedSec = 0, isoWorld = null, viewportCenter = null, viewportSize = null)` |
| Combined check `screenEscaped \|\| manhattanEscaped` | `src/enemies.js` | 392–406 | Per-tick `_lastScreenEscaped` trace with `{enemyId, reason}` |
| Production call site passes all 3 params | `src/main.js` | 390–395 | `isoWorld`, `{x: LOGICAL_W/2, y: LOGICAL_H/2}`, `{x: LOGICAL_W, y: LOGICAL_H}` |

## Rollback Instructions

Single `git revert <merge-commit>` restores:
1. `src/enemies.js` — removes `SOUTH_MARGIN_PX` const, removes `isScreenEscaped` export, restores `update()` to `(dtMs, cameraIso, elapsedSec)` signature, removes the `screenEscaped || manhattanEscaped` combined check.
2. `src/main.js` — removes the 3 extra positional args at line 388.
3. `src/test-api.js` — removes `setViewportSize(w, h)`, `getScreenEscapedRects()` exports; reverts `tick(dtMs)` internal call.
4. `tests/unit/escape-detection.spec.mjs` — removes 3 new REQ-CMB-008 tests (CAM-004 suite remains intact).
5. `tests/e2e/hit-detection.spec.mjs` — reverts Part 2 timing to `t=20`, Part 3 timing to `t=25`.
6. `openspec/specs/combat-core/spec.md` — removes the appended `### REQ-CMB-008` block.

No data migration. No feature flag. Behavior change is single-frame: enemies that previously waited ~10s for the 6-tile Manhattan buffer now deduct integrity within 1 frame of crossing the viewport bottom.

## Mechanical Copy Verification

```text
$ diff -r <snapshot> openspec/changes/archive/2026-09-12-fase-5-screen-space-escape/
(empty)
diff_status=0  →  PASS
```

Source snapshot captured pre-move via `cp -R` into a temp dir (`mktemp -d "${TMPDIR:-/tmp}/sdd-archive.XXXXXX"`). After `mv openspec/changes/fase-5-screen-space-escape openspec/changes/archive/2026-09-12-fase-5-screen-space-escape` (the change folder is **untracked** in git, so `git mv` was not applicable — plain `mv` used per SKILL fallback), the snapshot was compared recursively against the destination. Empty output = byte-identity confirmed.

The archived folder contains exactly 6 files (all MD artifacts):
- `proposal.md` (115 LOC)
- `design.md` (108 LOC)
- `tasks.md` (48 LOC, all 9 tasks `[x]`)
- `apply-progress.md` (90 LOC)
- `verify-report.md` (120 LOC)
- `specs/combat-core/spec.md` (53 LOC)
- `archive-report.md` (this file — additive, excluded from `diff -r`)

## Final State Notes

- **Tasks gate**: PASS. All 9 tasks in `tasks.md` are marked `[x]` (R1–R4 RED, G1–G4 GREEN, X1 REFACTOR). Source of truth confirmed by `verify-report.md` PASS verdict.
- **Native Review Receipt Gate**: not applicable. No `reviewGate` present (kill switch off for this candidate; no review ever started).
- **Final-state authority**: archive report reflects the verify-report PASS verdict and the post-apply e2e timing settled at Part 2=`t=13` and Part 3=`t=20` (the verify report's e2e evidence supersedes the apply-progress's earlier `t=2` user-suggested timing). No unrankable contradictions.
- **CRITICAL issues**: None. `verify-report.md` reports `CRITICAL: None`, `WARNING: None`, `SUGGESTION: None`.
- **Spec sync completed**: REQ-CMB-008 appended to `openspec/specs/combat-core/spec.md` before the folder move.

## SDD Cycle Complete

The change has been fully planned (proposal + design + tasks), implemented (5 files, +258 net LOC), verified (PASS verdict, 9/9 unit + 8/8 e2e), and archived. Source of truth (`openspec/specs/combat-core/spec.md`) now reflects the new behavior. Ready for the next change.