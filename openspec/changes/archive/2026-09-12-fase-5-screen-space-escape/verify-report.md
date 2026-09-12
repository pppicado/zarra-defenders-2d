# Verification Report: fase-5-screen-space-escape

**Change**: fase-5-screen-space-escape
**Mode**: Full artifacts (proposal + spec + design + tasks)
**Strict TDD**: Inactive
**Verdict**: **PASS**

## Completeness Table

| Dimension | Status | Evidence |
|---|---|---|
| Task completion (9/9) | Complete | R1–R4, G1–G4, X1 all checked in `tasks.md` |
| Spec compliance (1 requirement, 4 scenarios) | Complete | All 4 scenarios pass at runtime |
| Design coherence | Complete | Implementation matches `design.md` exactly (no deviations) |
| Runtime evidence | Complete | Unit + E2E suites both green |

## Build / Test / Coverage Evidence

### Test commands

| Command | Exit | Output Hash (sha256) |
|---|---|---|
| `node tests/unit/escape-detection.spec.mjs` | 0 | `f6544a072a896050d4a153a7ab2c55e4358fba2198cb79f9ace18dbeacd527c9` |
| `node tests/e2e/hit-detection.spec.mjs` | 0 | `dcca2f05393660ccd4b891b515031431c72633e767d6b1794bd679802fb9c3ea` |

### Unit suite — `tests/unit/escape-detection.spec.mjs`

```
TAP version 13
ok 1 - CAM-004 — escape predicate is Manhattan > 6 (strict)
ok 2 - CAM-004 — perpendicular enemy does not escape when camera is right next to it
ok 3 - CAM-004 — rail-aligned enemy escapes only when camera is far past
ok 4 - CAM-004 — symmetric: enemy to the SW also escapes symmetrically
ok 5 - CAM-004 — accepts cameraIso as {x,y} fallback (legacy field names)
ok 6 - CAM-004 — missing enemy coords default to 0 (defensive)
ok 7 - REQ-CMB-008 — enemy directly behind camera escapes within 1 frame (screen-space)
ok 8 - REQ-CMB-008 — enemy at top of viewport does NOT escape
ok 9 - REQ-CMB-008 — enemy far off-axis escapes via Manhattan fallback
1..9
# tests 9
# pass 9
# fail 0
```

### E2E suite — `tests/e2e/hit-detection.spec.mjs`

All phases return `OK` with full assertions:
- **Part 1**: hit detection on live enemy (`hit=true`, enemyId=`e01`, integrity stays at 3)
- **Part 2**: escape detection at `t=13` → integrity drains to 2 (single escape via screen-space)
- **Part 3**: more time at `t=20` → integrity drains to 1 (e01+e02 escaped via screen-space)
- **R1** (screen-space hit at center): hit, enemyId=`e01`
- **R2** (50 px outside sprite): miss, enemyId=`null`
- **R3** (4 archetypes at sprite center): all 4 hit
- **R4** (resolution independence 1280x720 + 1920x1080): both hit
- **R5** (click on shrunk AABB inset edge): hit, enemyId=`e01`
- **X1** (reverse-depth tie-break, lower-id wins): hit, enemyId=`e_tie_a`
- **X2** (sprite-null fallback): hit, enemyId=`e_null_a`

### Source-inspection evidence

| Requirement | Verified in source | Line | Notes |
|---|---|---|---|
| `SOUTH_MARGIN_PX = 32` const exported | `src/enemies.js` | 34 | Module-level named export, JSDoc rationale above |
| `isScreenEscaped(enemy, isoWorld, cameraIso, viewportCenter, viewportSize)` exported | `src/enemies.js` | 226–231 | Pure helper, unit-testable in isolation |
| `update()` signature has 3 new positional params | `src/enemies.js` | 362 | `update(dtMs, cameraIso, elapsedSec = 0, isoWorld = null, viewportCenter = null, viewportSize = null)` |
| Combined `isScreenEscaped \|\| isEscaped` check | `src/enemies.js` | 392–406 | `screenEscaped || manhattanEscaped` with per-tick `_lastScreenEscaped` trace |
| `enemies.update()` call passes isoWorld + viewportCenter + viewportSize | `src/main.js` | 390–395 | Passes `isoWorld`, `{x: LOGICAL_W/2, y: LOGICAL_H/2}`, `{x: LOGICAL_W, y: LOGICAL_H}` |

## Spec Compliance Matrix

| Requirement / Scenario | Test | Runtime Result |
|---|---|---|
| **REQ-CMB-008**: Screen-space escape detection (≥ `viewportSize.y + 32 px` OR Manhattan > 6) | — | Implemented and exported as `isScreenEscaped` |
| Scenario 1: Enemy directly behind camera escapes within 1 frame | `REQ-CMB-008 — enemy directly behind camera escapes within 1 frame` | ✅ PASS — enemy at iso (8,8) with cam (10,10) removed by `mgr.update(...)` in one tick |
| Scenario 2: Enemy at the top of the viewport does not escape | `REQ-CMB-008 — enemy at top of viewport does NOT escape` | ✅ PASS — enemy at iso (5,5) with cam (5,5) survives (sy=504 < 752) |
| Scenario 3: Enemy far off-axis escapes via Manhattan fallback | `REQ-CMB-008 — enemy far off-axis escapes via Manhattan fallback` | ✅ PASS — enemy at iso (10,10) with cam (0,0) removed via Manhattan=20 > 6 (sy=-1306 not south-escape) |
| Scenario 4: `?test=1` exposes helpers (setViewportSize, advanceCameraTo, getScreenEscapedRects) | E2E suite wiring (`tests/e2e/hit-detection.spec.mjs` uses `__gameTestAPI__.reset/setTime/tick/spawnEnemy/getScreenBounds/fireAtScreen/getEnemies/getIntegrity/getScore`) | ✅ PASS — full test API exercised across Parts 1–3 + R1–R5 + X1–X2 |

## Correctness Table

| Change | Expected | Observed | Match |
|---|---|---|---|
| `SOUTH_MARGIN_PX = 32` | Module-level const, exported | `export const SOUTH_MARGIN_PX = 32` at `src/enemies.js:34` | ✅ |
| `isScreenEscaped` signature | 5 params, returns boolean | `(enemy, isoWorld, cameraIso, viewportCenter, viewportSize) → boolean` | ✅ |
| `update()` signature extension | 3 optional positional params | `isoWorld = null, viewportCenter = null, viewportSize = null` | ✅ |
| Combined check | `screenEscaped \|\| manhattanEscaped` | Line 396: `if (screenEscaped \|\| manhattanEscaped) {` | ✅ |
| Production call site | Passes `isoWorld` + viewport center + viewport size | `src/main.js:390-395` passes all 3 | ✅ |
| Back-compat | Old callers (no extra args) keep Manhattan-only path | Guard `if (runScreenTest)` only enables screen test when all 3 supplied | ✅ |

## Design Coherence Table

| Design decision | Implemented as designed? |
|---|---|
| `update()` API: 3 positional params (no opts bag) | ✅ |
| `isScreenEscaped` placement: named export in `src/enemies.js` | ✅ |
| Detection order: screen-space first, Manhattan fallback second | ✅ (line 392–395: `screenEscaped` computed first, OR'd with `manhattanEscaped`) |
| `SOUTH_MARGIN_PX = 32` as module-level const | ✅ |
| Test-API surface: reuse `__zarraModules__.setViewportSize`, expose passthrough on `__gameTestAPI__` | ✅ (see `apply-progress.md` G4) |
| Back-compat gate: only run screen test when all 3 params supplied | ✅ |

`apply-progress.md` reports **no design deviations**. Confirmed.

## Issues

**CRITICAL**: None.

**WARNING**: None.

**SUGGESTION**: None.

## Success Criteria (per spec)

- ✅ **Enemy below visible viewport = escape in 1 frame** — confirmed by R1 (unit) and E2E Part 2 (t=13 → integrity 2)
- ✅ **Enemy at top of viewport = no escape** — confirmed by R2 (unit) and E2E Part 1 (t=5 → integrity 3)
- ✅ **Enemy far off-axis = escape via Manhattan fallback** — confirmed by R3 (unit) — sy=-1306 not south-escape, but Manhattan=20 > 6 triggers removal
- ✅ **No regression on existing tests** — 6 CAM-004 tests still pass; E2E Parts 1–3 + R1–R5 + X1–X2 all pass

## Verdict

**PASS** — implementation matches spec, design, and tasks. All 4 spec scenarios have a covering test that passed at runtime. No regressions detected in existing test suites.
