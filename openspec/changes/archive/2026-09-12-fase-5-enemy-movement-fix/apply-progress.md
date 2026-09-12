# Apply Progress: fase-5-enemy-movement-fix

**Change**: fase-5-enemy-movement-fix
**Mode**: Strict TDD
**Date**: 2026-09-12

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| R1 (existing) | `tests/e2e/enemy-movement.spec.mjs` | E2E | n/a (was prior batch) | n/a (was prior) | ✅ | ✅ | n/a |
| R2 (existing) | `tests/e2e/enemy-movement.spec.mjs` | E2E | n/a (was prior batch) | n/a (was prior) | ✅ | ✅ | n/a |
| R3 (existing) | `tests/e2e/enemy-movement.spec.mjs` | E2E | n/a (was prior batch) | n/a (was prior) | ✅ | ✅ | n/a |
| R4 (existing) | `tests/e2e/enemy-movement.spec.mjs` | E2E | n/a (was prior batch) | n/a (was prior) | ✅ | ✅ | n/a |
| R5 (existing) | `tests/e2e/enemy-movement.spec.mjs` | E2E | n/a (was prior batch) | n/a (was prior) | ✅ | ✅ | n/a |
| **R6** | `tests/e2e/enemy-movement.spec.mjs` `runR6_CamionTrecoDefaults` | E2E | ✅ 5/5 baseline | ✅ Wrote first; ran; observed `pattern='static'` | ✅ After G1+G2: `speed=50, pattern='zigzag'` | ✅ Same enemy class as R7 (different defaulting path) | n/a |
| **R7** | `tests/e2e/enemy-movement.spec.mjs` `runR7_ExplicitStaticRespected` | E2E | ✅ 5/5 baseline | ✅ Wrote first; green coincidentally on pre-fix code (returns 0/static by accident — same wrong answer for a different reason) | ✅ After G1+G2: `speed=0, pattern='static'` (now because resolver honors explicit values) | ✅ Triangulates R6 (same spriteId, different intent: omit vs explicit) | n/a |
| **R8** | `tests/e2e/enemy-movement.spec.mjs` `runR8_RetryReloadsLevel` | E2E | ✅ 5/5 baseline | ✅ Wrote first; observed `queueLen=0` after overlay Reintentar click | ✅ After G3+G4: `queueLen=120`, `overlayHidden=true` | ✅ Different code path (overlay click vs test-api.reset) | n/a |
| **G1** | `src/enemies.js` `resolveMovementConfig` | Unit (pure) | ✅ R1–R5 still 5/5 | ✅ | ✅ typeof + nullish coalescing | ✅ R6 + R7 cover omit/explicit | ✅ JSDoc added in same edit (X1) |
| **G2** | `src/enemies.js` `Enemy` ctor | Unit | ✅ 5/5 | ✅ | ✅ Ctor passes undefined to resolver | ✅ Covered by R6+R7 | ✅ JSDoc updated |
| **G3** | `src/main.js` `busOn('bootTestLevel:request')` | Integration | ✅ 5/5 | ✅ | ✅ Bus listener routes to bootTestLevel | ✅ R8 exercises the real bus flow | ✅ |
| **G4** | `src/ui/overlay.js` `_onRetry` | Unit | ✅ 5/5 | ✅ | ✅ Overlay emits event only; no inline resets | ✅ R8 covers click path | ✅ |
| **X1** | `src/enemies.js` `resolveMovementConfig` JSDoc | Refactor | ✅ 8/8 after G4 | n/a | n/a | n/a | ✅ Tests still green after JSDoc added (8/8) |

## Test Results

### Safety Net (baseline before any changes)
- `node tests/e2e/enemy-movement.spec.mjs` → exit 0, 5/5 scenarios (R1–R5) passing

### RED phase (after writing R6/R7/R8, before implementation)
- `node tests/e2e/enemy-movement.spec.mjs` → exit 1
- **R6 FAIL** — `expected MOBILE_DEFAULT[camion_treco].movementPattern === 'zigzag', got 'static'`
  - Cause: `Enemy` ctor destructured `speed = 0, movementPattern = 'static'`, which short-circuited `resolveMovementConfig` before MOBILE_DEFAULT could apply.
- **R7** — `speed: 0, pattern: 'static'` (coincidentally passes pre-fix because pre-defaults already yield 0/static; real value emerges only after the resolver distinguishes omit from explicit).
- **R8 FAIL** — `queueLen: 0` after `overlay.showGameOver()` + click Reintentar.
  - Cause: old `_onRetry` called `enemies.reset()` (clears queue) but never reloaded `TEST_LEVEL`.

### GREEN phase (after G1+G2+G3+G4)
- `node tests/e2e/enemy-movement.spec.mjs` → exit 0, 8/8 scenarios (R1–R8) passing
  - R6: `speed=50, pattern='zigzag'` (MOBILE_DEFAULT applied via resolver)
  - R7: `speed=0, pattern='static'` (explicit user values respected, not overridden by MOBILE_DEFAULT)
  - R8: `queueLen=120, overlayHidden=true, cameraTime=0` (bootTestLevel:request → bus → bootTestLevel → loadLevel)

### REFACTOR phase (X1 — JSDoc on resolveMovementConfig)
- `node tests/e2e/enemy-movement.spec.mjs` → exit 0, 8/8 still passing

### Regression check
- `node tests/e2e/hit-detection.spec.mjs` → exit 0, all scenarios passing

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `node tests/e2e/enemy-movement.spec.mjs` → exit 0 (8/8) |
| Runtime harness | `node tests/e2e/hit-detection.spec.mjs` → exit 0 (regression) |
| Rollback boundary | Single `git revert <merge-commit>` on `enemies.js`, `main.js`, `overlay.js`, `enemy-movement.spec.mjs` restores all behavior |

## Deviations from Design

None — implementation matches design.md exactly.

## Issues Found

None.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/enemies.js` | Modified | `resolveMovementConfig` uses `typeof/Number.isFinite` + nullish coalescing; `Enemy` ctor drops `speed=0`/`movementPattern='static'` pre-defaults; JSDoc on resolver documents the undefined-vs-explicit contract (X1) |
| `src/main.js` | Modified | Added `busOn('bootTestLevel:request', …)` listener next to `menu:startRequested`, invoking the same `bootTestLevel` |
| `src/ui/overlay.js` | Modified | `_onRetry` keeps only `hide() + gameState + emit('bootTestLevel:request', {})`; removed inline resets |
| `tests/e2e/enemy-movement.spec.mjs` | Modified | Added `runR6_CamionTrecoDefaults`, `runR7_ExplicitStaticRespected`, `runR8_RetryReloadsLevel`; wired into runner; assertions on `pattern`, `speed`, `queueLen`, `overlayHidden` |

## Visual Verification

Screenshot: `/tmp/opencode/verify-movement.png` (1280x720, 387882 bytes)

State after 60 ticks @ 16.67 ms with `skipEscape: true`:

| id | spriteId | speed | pattern | start isoX | end isoX | moved |
|---|---|---|---|---|---|---|
| v_camion | `enemies_camion_treco` | 50 | zigzag | 0 | 5.187 | ✅ |
| v_dron | `enemies_dron_fumigador` | 70 | sine | 0 | 7.187 | ✅ |
| v_top | `enemies_topadora` | 40 | linear | 1 | 29.284 | ✅ |
| v_valla | `enemies_valla_publicitaria` | 0 | static | 2 | 2 | ✅ (static hard rule preserved) |

3 mobile enemies with speed>0 confirmed moving;1 static stays at spawn iso. Visual verification PASS.

## Status

8/8 tasks complete (R1–R5 pre-existing + R6–R8 new, G1–G4 done, X1 done). Ready for sdd-verify.