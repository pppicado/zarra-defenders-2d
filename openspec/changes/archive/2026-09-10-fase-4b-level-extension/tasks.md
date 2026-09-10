# Tasks: F4b — Level extension (Phase B)

**Change**: `fase-4b-level-extension` · **Base**: main @ `23d9ccf` (F4a archived) · **Strategy**: single PR, no `size:exception` · **Source LOC**: ~80 across 3 files

Decision needed before apply: No
Chained PRs recommended: No (single PR, ~80 LOC — well under 400-line budget)
Chain strategy: pending
400-line budget risk: Low

## Phase 1 — Test level extension

- [ ] **TASK-001** `src/levels/test-level.js` MODIFIED · `railPath = [(0,0)→(36,36)]`, `railEndTime = 60 → 120`. Linear 2× extension; rail speed stays 0.6 tile/s. Commit: `feat(level): extend rail depth 36→72 over 60→120s`. Depends: —. LOC: 4. Tests: `?test=1` boot, `node tools/f4b-capture.mjs`.

- [ ] **TASK-002** `src/levels/test-level.js` MODIFIED · `_spawnTimeFromDepth(depth) = ((depth - 5) / 72) * 120` (was `((depth - 5) / 36) * 60`). Buffer `(depth - 5)` unchanged. Commit: `feat(level): scale spawn-time formula to depth-72 rail`. Depends: TASK-001. LOC: 2. Tests: `_spawnTimeFromDepth(5) === 0`, `_spawnTimeFromDepth(72) === 115` (within ±1s).

- [ ] **TASK-003** `src/levels/test-level.js` MODIFIED · extend `_buildEnemyDefs` from 12 to 24 enemies (16 standard + 4 tank + 2 mini-boss + 2 boss). New ids `e13..e24`, depths 19..71 (existing 12 cover depths 5..31). Reuse sprite ids from the existing 11-entry `manifest.json`. Commit: `feat(level): add 12 enemies (composition 16+4+2+2=24)`. Depends: TASK-001. LOC: 30. Tests: `TEST_LEVEL.enemies.length === 24`.

- [ ] **TASK-004** `src/levels/test-level.js` MODIFIED · `assertTestLevel()` composition assertion: `standard: 16`, `tank: 4`, `'mini-boss': 2`, `boss: 2`. Total count assertion: `length === 24` (was 12). Commit: `feat(level): update assertTestLevel composition to 16+4+2+2`. Depends: TASK-003. LOC: 4. Tests: `assertTestLevel()` throws no errors when `?test=1` boots.

## Phase 2 — Test alignment

- [ ] **TASK-005** `tests/e2e/hit-detection.spec.mjs` MODIFIED · header comment update: `rail (0,0) → (18,18) over 60s` → `rail (0,0) → (36,36) over 120s`. Assertion math on e01 (depth 5, escape at t≈18.33s) and e02 (depth 8, escape at t≈23.33s) is invariant — Manhattan-distance escape times don't depend on rail length. No assertion edits. Commit: `test(level): align hit-detection header comment to depth-72 rail`. Depends: TASK-001..TASK-004. LOC: 2. Tests: spec still parses; assertions on t=20, t=25 still target e01, e02 correctly.

## Phase 3 — Visual verification

- [ ] **TASK-006** `tools/f4b-capture.mjs` NEW + `tests/playwright-screenshots/f4b-t{00,60,120}-*.png` · Playwright headless capture at t=0, t=60, t=120 against `?test=1`. Asserts zero `console.error` at each capture point. Mirrors `tools/f4a-capture.mjs`. Commit: `test(level): add Playwright headless smoke for depth-72 rail coverage`. Depends: TASK-001..TASK-005. LOC: 60. Tests: this task IS the test.

## Review Workload Forecast

| Field | Value |
|---|---|
| Changed lines | ~80 source + ~60 test ≈ 140 |
| 400-line budget risk | Low (~35% of budget) |
| Chained PRs / split / delivery / chain | No · single PR · single-pr · pending |
| Locked-file exception | None needed (only `test-level.js`, `hit-detection.spec.mjs`, new `tools/f4b-capture.mjs` — none locked) |

- **Highest-risk**: TASK-003 (enemy roster) and TASK-006 (visual smoke — the only behavioral gate).
- **Apply order**: 1 → 2 → 3 → 4 → 5 → 6 (linear on TASK-001). **Rollback**: single `git revert` restores F4a state.
- **Carry-forward**: `tests/e2e/smoke.spec.mjs` + `tests/e2e/hit-detection.spec.mjs` continue to fail on F3.5 escape rule — out of F4b scope.

## Open questions

**Zero.** All resolved by user 2026-09-10 (rail multiplier, TILE_SIZE, composition).
