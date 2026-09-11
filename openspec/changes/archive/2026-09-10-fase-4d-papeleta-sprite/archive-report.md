# Archive Report: F4d — Papeleta sprite + cooldown (Phase D)

**Change**: `fase-4d-papeleta-sprite` → archived as `2026-09-10-fase-4d-papeleta-sprite`
**Date archived**: 2026-09-10
**Branch**: `fase-4d-papeleta-sprite`
**Base**: `67aa162` (F4c merged to main)
**Verdict**: `PASS` (see `verify-report.md`)

---

## What was archived

F4d is the most artistically-inclined of the 4-phase visual rework changes. The change folder holds:

```
openspec/changes/archive/2026-09-10-fase-4d-papeleta-sprite/
├── apply-progress.md   ← orchestrator's task ledger
├── verify-report.md    ← orchestrator's PASS verification
└── archive-report.md   ← this file
```

No `exploration.md`, `proposal.md`, `design.md`, `tasks.md`, or `specs/` artifact — F4d was scoped to asset generation + manifest update + 1 source file + capture script, all inlined into `apply-progress.md`.

---

## Spec merges applied

**None.** No main spec exists for `combat-core` (the F3 spec lives at `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/combat-core/spec.md` and was never promoted to main). F4d changes the projectile visual (PIXI.Graphics → PIXI.Sprite) and the cooldown constant (333 → 200 ms), which would warrant a MODIFIED delta if the project later promotes `combat-core` to main.

---

## Source LOC delta

| File | LOC delta | Type |
|---|---|---|
| `assets/sprites/papeleta_firmada.png` | binary 198 bytes | new asset |
| `assets/sprites/manifest.json` | +5 −0 | new `papeleta_firmada` active entry |
| `src/combat.js` | +30 −9 | cooldown, sprite, lazy-load, fallback |
| `tools/generate-papeleta-firmada.py` | +35 | new (reproducibility) |
| `tools/f4d-capture.mjs` | +77 | new (Playwright smoke) |
| `tests/playwright-screenshots/f4d-t00-boot.png` | binary | new |
| `tests/playwright-screenshots/f4d-t05-fire.png` | binary | new |
| `tests/playwright-screenshots/f4d-t15-burst.png` | binary | new |

**Total**: 1 source file modified, 7 new files. ~155 LOC net (excluding binaries).

---

## Commit ledger

| Hash | Subject |
|---|---|
| `cc05920` | feat(papeleta): sprite + cooldown 333→200ms |
| `e1ffe65` | test(papeleta): Playwright headless smoke for sprite + cooldown gate |
| `c621ef2` | docs(papeleta): apply-progress + verify-report (PASS) |

---

## Carry-forward to future phases

1. **The `combat-core` capability** has no main spec. If the project wants main-spec visibility into the projectile visual contract, it should promote `combat-core` from the F3 archive as a separate change (and either MODIFY the projectile visual scenario to `PIXI.Sprite papeleta_firmada.png, 20×24, NEAREST` or split out a `papeleta-sprite` capability).

2. **`tools/{f4a,f4b,f4c,f4d}-capture.mjs`** are one-off harnesses. Consider consolidating to a parameterized `tools/capture.mjs` (saves duplication across 4 files).

3. **Cooldown tuning**: `FIRE_COOLDOWN_MS = 200` is hard-coded. Future F4+ polish may want a tunable (e.g., difficulty setting, or a power-up that temporarily reduces cooldown).

4. **Carry-forwards from prior phases (unchanged by F4d)**:
   - `fase-3.5.1-escape-test-align` (smoke.spec.mjs + hit-detection.spec.mjs fail on F3.5 CAM-004).

---

## Rollback

Single `git revert` of the merge (or revert each of the 3 commits in reverse order) restores `67aa162` (F4c merged) state in one step. New files (`papeleta_firmada.png`, `generate-papeleta-firmada.py`, `f4d-capture.mjs`, 3 PNGs) are removed by the revert. The `manifest.json` revert removes the `papeleta_firmada` entry; the `combat.js` revert restores the cooldown to 333 ms and the Graphics projectile.

---

## Audit trail

The 3 commits in chronological order are preserved in the branch history; `git log fase-4d-papeleta-sprite ^67aa162 --oneline` reproduces them. The branch is ready for merge to `main`.

---

## 🎬 4-Phase Visual Rework — Complete

| Phase | Commit | Verdict |
|---|---|---|
| **A** Canvas 1080→720 | `23d9ccf` | PASS WITH WARNINGS |
| **B** Rail 2× depth + 24 enemies | `929d03a` | PASS WITH WARNINGS |
| **C** Hand +20% | `67aa162` | PASS |
| **D** Papeleta sprite + cooldown | (this PR) | PASS |

All 4 phases closed. Carry-forwards documented:
- `fase-3.5.1-escape-test-align` (F3.5 escape-rule drift)
- `combat-core` spec promotion (F3 archive → main, optional polish)
- `tools/capture.mjs` consolidation (4 capture scripts → 1 parameterized tool, optional polish)
