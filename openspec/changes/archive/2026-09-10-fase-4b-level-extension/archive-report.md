# Archive Report: F4b — Level extension (Phase B)

**Change**: `fase-4b-level-extension` → archived as `2026-09-10-fase-4b-level-extension`
**Date archived**: 2026-09-10
**Branch**: `fase-4b-level-extension`
**Base**: `23d9ccf` (F4a merged to main)
**Verdict**: `PASS WITH WARNINGS` (see `verify-report.md`)

---

## What was archived

The complete audit trail for the F4b change (2 commits + the planning artifacts):

```
openspec/changes/archive/2026-09-10-fase-4b-level-extension/
├── exploration.md          ← orchestrator-written (sdd-explore was latched)
├── proposal.md             ← orchestrator-written (sdd-propose was latched)
├── design.md               ← orchestrator-written (sdd-design was latched)
├── tasks.md                ← orchestrator-written (sdd-tasks was latched)
├── apply-progress.md       ← orchestrator's task ledger
├── verify-report.md        ← orchestrator's PASS-WITH-WARNINGS verification
├── specs/
│   └── no-op-delta.md      ← explicit empty MODIFIED lists for both `iso-tile-system` and `iso-camera-integration`
└── archive-report.md       ← this file
```

---

## Spec merges applied

**None.** F4b explicitly produces no MODIFIED delta specs because the cull math (`computeCullRange` closed-form formula, F3.5) and the escape rule (CAM-004, Manhattan distance > 6) are both **length-agnostic**. Extending the rail from depth 36 to 72 does not change any spec contract.

The `specs/no-op-delta.md` artifact is preserved in the archive as audit-trail evidence that this decision was deliberate, not an oversight.

`openspec/specs/README.md` does not need updating — the "Last change" column for both spec files remains F4a.

---

## Source LOC delta (commits vs F4a merged base)

| File | LOC delta | Type |
|---|---|---|
| `src/levels/test-level.js` | +71 −14 | rail extension, enemy roster, composition assertion |
| `tests/e2e/hit-detection.spec.mjs` | +1 −1 | header comment only |
| `tools/f4b-capture.mjs` | +51 | new (Playwright smoke) |
| `tests/playwright-screenshots/f4b-t00-boot.png` | binary | new (Playwright output) |
| `tests/playwright-screenshots/f4b-t60-mid.png` | binary | new (Playwright output) |
| `tests/playwright-screenshots/f4b-t120-rail-end.png` | binary | new (Playwright output) |

**Total**: 2 source/test files modified, 4 new files. ~109 LOC net (excluding screenshots and capture script).

---

## Commit ledger (chronological)

| Hash | Subject |
|---|---|
| `6db7441` | feat(level): extend rail depth 36→72 over 60→120s (2× extension, 24 enemies) |
| `118b736` | test(level): Playwright headless smoke for depth-72 rail coverage |

---

## Carry-forward to future phases

1. **`fase-3.5.1-escape-test-align`** — `tests/e2e/smoke.spec.mjs` and `tests/e2e/hit-detection.spec.mjs` (second assertion at `t=25`) continue to fail under the F3.5 CAM-004 escape rule. Documented in F4a archive; F4b does not regress them further. Out of F4b scope.

2. **Fase C — hand size +20%**: the next phase of the 4-phase visual rework. No carry-forwards from F4b affect F4c.

3. **Fase D — papeleta sprite + cooldown**: the final phase. No carry-forwards from F4b affect F4d.

4. **`tools/{f4a,f4b}-capture.mjs`** are one-off harnesses. Options:
   - Keep both as regression-check tools (low cost; ~50 LOC each).
   - Consolidate into a parameterized `tools/capture.mjs` (saves duplication).
   - Promote to `tests/e2e/` with `expect(consoleErrors).toEqual([])` assertions and the captured PNGs as committed references.

5. **`MAX_VISIBLE_TILES = 400`** has headroom for further rail extensions if the user wants even longer stages in the future. Current rail uses ~192 tiles worst-case; cap supports up to ~2× more.

---

## Rollback

Single `git revert` of the merge (or revert each of the 2 commits in reverse order) restores `23d9ccf` (F4a merged) state in one step. New files (`tools/f4b-capture.mjs`, 3 PNGs) are removed by the revert. No data, no persistent state, no schema.

---

## Audit trail

The 2 commits in chronological order are preserved in the branch history; `git log fase-4b-level-extension ^23d9ccf --oneline` reproduces them. The branch is ready for merge to `main`.
