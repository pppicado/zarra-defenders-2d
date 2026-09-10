# Apply Progress: F4b — Level extension (Phase B)

**Change**: `fase-4b-level-extension`
**Branch**: `fase-4b-level-extension`
**Base**: `23d9ccf` (F4a merged to main)
**Mode**: Standard (no Strict TDD; `openspec/config.yaml` has `tdd: false`)
**Status**: 6/6 tasks complete. Ready for `sdd-verify`.

---

## Commits

| Hash | Subject |
|---|---|
| `6db7441` | feat(level): extend rail depth 36→72 over 60→120s (2× extension, 24 enemies) |

The single commit covers TASK-001..TASK-005 (test-level.js, hit-detection.spec.mjs, tools/f4b-capture.mjs) plus the capture-script creation. TASK-006 (Playwright capture run) is verified below — its artifacts (`f4b-t{00,60,120}-*.png` + this report + `verify-report.md`) are committed in the next commit.

## Task Status

| Task | Files | Status | Acceptance |
|---|---|---|---|
| TASK-001 | `src/levels/test-level.js` railPath + railEndTime | ✅ | `TEST_LEVEL.railEndTime === 120`, `railPath.length === 2`, sums to depth 72. |
| TASK-002 | `_spawnTimeFromDepth` rescales | ✅ | Formula `((depth - 5) / 72) * 120` verified: `e01.depth=5 → t=0`, `e24.depth=71 → t=110`. |
| TASK-003 | 12 additional enemies (16+4+2+2=24) | ✅ | `TEST_LEVEL.enemies.length === 24`, spriteIds reuse the 11-entry manifest. |
| TASK-004 | `assertTestLevel()` composition | ✅ | Throws no errors when called; `16 standard + 4 tank + 2 mini-boss + 2 boss`. |
| TASK-005 | `hit-detection.spec.mjs` header | ✅ | Comment updated to `(0,0) → (36,36) over 120s`; assertion math invariant. |
| TASK-006 | `tools/f4b-capture.mjs` + Playwright run | ✅ | 3 PNGs captured (t=0, t=60, t=120), zero `console.error`. |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command | `node -e "import('./src/levels/test-level.js').then(m => m.assertTestLevel())"` |
| Focused test result | **PASS** — `OK: 24 enemies, composition OK` |
| Runtime harness | `TEST_URL=http://localhost:8000/?test=1 node tools/f4b-capture.mjs` |
| Runtime harness result | **PASS** — `consoleErrors: []`, 3 PNG screenshots written |
| Regression test | `TEST_URL=http://localhost:8000/?test=1 node tests/e2e/projectile-direction.spec.mjs` — exit 0, no flipped vectors |
| Unit test | `node tests/unit/archetypes.spec.mjs` — exit 0, 11 tests pass (skipped 0, todo 0, 35.9 ms) |
| Rollback boundary | `git revert <merge>` restores F4a state in one step. New files: `tools/f4b-capture.mjs`, 3 PNGs — all removed by the revert. |

## Files Changed (single commit `6db7441`)

| File | Action | Lines (delta) |
|---|---|---|
| `src/levels/test-level.js` | Modify | +71 −14 |
| `tests/e2e/hit-detection.spec.mjs` | Modify | +1 −1 |
| `tools/f4b-capture.mjs` | Create | +51 |

**Total**: 2 source/test files modified, 1 new file. ~109 LOC net (over the ~80 estimate in `tasks.md` due to extensive JSDoc comments on the 12 new enemies).

## Deviations from Design

None — implementation matches `design.md` exactly.

The enemy distribution (`e13..e24` depths 36..71) follows the F4b proposal's "linear scaling" recommendation: each pair `(isoX, isoY)` has `(isoX + isoY)` increasing by 1-3 per step. No clustering near the rail end (the design's "linear spacing" choice).

## Issues Found

None. The F3.5 carry-forward failures (`smoke.spec.mjs`, `hit-detection.spec.mjs`'s second assertion on `t=25`) are documented as pre-existing in F4a archive; F4b does not regress them further.

## Status

**6/6 tasks complete.** Ready for `sdd-verify`.
