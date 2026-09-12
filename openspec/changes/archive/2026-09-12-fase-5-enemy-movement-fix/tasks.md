# Tasks: fase-5-enemy-movement-fix

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~60 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | All three fixes + tests in one slice | PR 1 | `node tests/e2e/enemy-movement.spec.mjs` | manual: click Reintentar after game-over, observe enemies re-spawn | single revert restores `enemies.js`, `main.js`, `overlay.js`, `enemy-movement.spec.mjs` |

## Phase 1: RED — failing tests first (TDD strict)

- [x] 1.1 **TASK-R1**: In `tests/e2e/enemy-movement.spec.mjs`, add `runR6()` that spawns `{spriteId: 'enemies_camion_treco'}` with no speed/pattern and asserts `enemy.speed === 50 && enemy.movementPattern === 'zigzag'`. Wire into `runEnemyMovementSpec()`. Run `node tests/e2e/enemy-movement.spec.mjs` — must FAIL (current constructor pre-defaults short-circuit MOBILE_DEFAULT).
- [x] 1.2 **TASK-R2**: In same file, add `runR7()` that spawns `{spriteId: 'enemies_camion_treco', speed: 0, movementPattern: 'static'}` and asserts instance keeps `speed===0 && movementPattern==='static'`. Wire and run — must FAIL.
- [x] 1.3 **TASK-R3**: In same file, add `runR8()` that triggers `integrity:exhausted`, awaits overlay, clicks `Reintentar`, waits 200 ms, asserts `enemies._timeGatedSpawns.length > 0`. Wire and run — must FAIL (today retry clears queue but never reloads).

## Phase 2: GREEN — make RED tests pass

- [x] 2.1 **TASK-G1**: `src/enemies.js` — replace `resolveMovementConfig` body with `typeof speed === 'number' && Number.isFinite(speed)` check and `nullish` coalescing against `MOBILE_DEFAULT[sid]`.
- [x] 2.2 **TASK-G2**: `src/enemies.js` — in `Enemy` constructor, change destructured defaults from `speed = 0, movementPattern = 'static'` to `speed, movementPattern` (both `undefined`).
- [x] 2.3 **TASK-G3**: `src/main.js` — add `busOn('bootTestLevel:request', async () => { await bootTestLevel({ combat, isoWorld, enemies, camera, score, integrity, hud: hudModule, world, overlay }) })` next to existing `menu:startRequested` listener.
- [x] 2.4 **TASK-G4**: `src/ui/overlay.js _onRetry` — remove inline resets (`integrity.reset`, `score.reset`, `combat.reset`, `enemies.reset`, `camera.setTime(0)`, `camera.unHalt`); keep `this.hide()` + `this.gameState.state = 'gameplay'`; emit `'bootTestLevel:request', {}`. Run spec — R1, R2, R3 (existing), R6, R7, R8 all pass.

## Phase 3: REFACTOR

- [x] 3.1 **TASK-X1**: `src/enemies.js` — add comment block above `resolveMovementConfig` documenting the undefined-vs-explicit pattern (caller MUST NOT pre-default params; resolver is the single source of truth for MOBILE_DEFAULT). Re-run spec.

## Phase 4: Verify

- [x] 4.1 Run full spec: `node tests/e2e/enemy-movement.spec.mjs`. All R1–R8 green.
- [x] 4.2 Manual smoke on `?test=1`: e01 visibly sways within 2 s; trigger game-over, click Reintentar, confirm enemies re-spawn.

## Archive Reconciliation Note

Reconciliation reason: All checkboxes were left stale by `sdd-apply` after the implementation completed. Archive verified completion via:
- `apply-progress.md` (8/8 tasks complete, all TDD phases GREEN)
- `verify-report.md` (PASS verdict, 8/8 E2E scenarios green, regression green, no CRITICAL/WARNING/SUGGESTION issues)

Source-of-truth checkboxes corrected at archive time per the orchestrator's launch-prompt instruction (explicit archive override) and the exceptional mechanical reconciliation rule in the Task Completion Gate.
