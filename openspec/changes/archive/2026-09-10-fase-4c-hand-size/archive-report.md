# Archive Report: F4c — Hand size +20% (Phase C)

**Change**: `fase-4c-hand-size` → archived as `2026-09-10-fase-4c-hand-size`
**Date archived**: 2026-09-10
**Branch**: `fase-4c-hand-size`
**Base**: `929d03a` (F4b merged to main)
**Verdict**: `PASS` (see `verify-report.md`)

---

## What was archived

F4c is the smallest of the 4-phase visual rework changes. The change folder holds:

```
openspec/changes/archive/2026-09-10-fase-4c-hand-size/
├── apply-progress.md   ← orchestrator's task ledger
├── verify-report.md    ← orchestrator's PASS verification
└── archive-report.md   ← this file
```

No `exploration.md`, `proposal.md`, `design.md`, `tasks.md`, or `specs/` artifact — F4c was scoped to a single numeric edit + visual evidence capture, all inlined into `apply-progress.md` (the orchestrator skipped the full SDD document chain because the change is 1 line of code + 1 capture script). No spec needed because no main spec exists for `hand-pen-sprite`.

---

## Spec merges applied

**None.** No main spec exists for `hand-pen-sprite` — the F3 spec lives at `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/hand-pen-sprite/spec.md` and was never promoted to `openspec/specs/`. F4c refines an existing scale parameter (1.0 → 1.2), which is a numerical adjustment, not a contract change.

If a future phase promotes `hand-pen-sprite` to a main spec, it should include both the F3 baseline scale (1.0) and the F4c refinement (1.2) as separate scenarios or as a single scenario with a wider scale range.

---

## Source LOC delta

| File | LOC delta | Type |
|---|---|---|
| `src/main.js` | +1 −1 | locked-file exception (single numeric line, F4a precedent) |
| `tools/f4c-capture.mjs` | +44 | new (Playwright smoke) |
| `tests/playwright-screenshots/f4c-t00-boot.png` | binary | new (Playwright output) |

**Total**: 1 source file modified, 2 new files. ~45 LOC net.

---

## Commit ledger

| Hash | Subject |
|---|---|
| `348c851` | feat(hand): scale +20% (1.0 → 1.2) |
| `7f211fe` | test(hand): Playwright headless smoke + apply-progress + verify-report |

---

## Carry-forward to future phases

1. **Fase D — papeleta sprite + cooldown**: the final phase of the 4-phase visual rework. No carry-forwards from F4c affect F4d.

2. **`tools/{f4a,f4b,f4c}-capture.mjs`** are one-off harnesses. Consider consolidating to a parameterized `tools/capture.mjs` (saves duplication across 3 files).

3. **The `hand-pen-sprite` capability** has no main spec. If the project wants a hand-pen main spec (recommended for visibility into the asset + scale + anchor contract), it should be promoted from the F3 archive as a separate change.

---

## Rollback

Single `git revert` of the merge (or revert each of the 2 commits in reverse order) restores `929d03a` (F4b merged) state in one step. New files (`tools/f4c-capture.mjs`, 1 PNG) are removed by the revert.

---

## Audit trail

The 2 commits in chronological order are preserved in the branch history; `git log fase-4c-hand-size ^929d03a --oneline` reproduces them. The branch is ready for merge to `main`.
