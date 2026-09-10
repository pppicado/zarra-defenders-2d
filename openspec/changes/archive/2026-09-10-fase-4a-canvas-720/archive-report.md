# Archive Report: F4a — Canvas resize to 1920×720 (Phase A)

**Change**: `fase-4a-canvas-720` → archived as `2026-09-10-fase-4a-canvas-720`
**Date archived**: 2026-09-10
**Branch**: `fase-4a-canvas-720`
**Base**: `2431329` (F3.5 follow-up commit on `main`)
**Verdict**: `PASS WITH WARNINGS` (see `verify-report.md`)

---

## What was archived

The complete audit trail for the F4a change (10 implementation commits + 4 orchestrator-fixes + the planning artifacts):

```
openspec/changes/archive/2026-09-10-fase-4a-canvas-720/
├── exploration.md          ← sdd-explore output
├── proposal.md             ← sdd-propose output
├── design.md               ← sdd-design output (5 ADRs, 791 words)
├── tasks.md                ← sdd-tasks output (6 tasks, 522 words)
├── apply-progress.md       ← orchestrator's task ledger
├── verify-report.md        ← orchestrator's PASS-WITH-WARNINGS verification
├── specs/
│   ├── iso-tile-system/spec.md         ← MODIFIED (TILE-001×2 + TILE-004)
│   └── iso-camera-integration/spec.md  ← MODIFIED (CAM-002)
└── archive-report.md       ← this file
```

---

## Spec merges applied

### `openspec/specs/iso-tile-system/spec.md` — 3 MODIFIED requirements promoted

| Requirement | What changed |
|---|---|
| TILE-001 (v0.1 / F2.5.2 baseline) | Viewport literal `1920×1080` → `1920×720` in the `tileSize` paragraph and the round-trip scenario. "1080p" → "target viewport 1920×720". Added `(Previously F4a: ...)` annotation above the original `(Previously: ...)` annotation. |
| TILE-001 (F2.5.15 classic iso) | Same viewport literal sweep. `tileSize = 64` is NOT viewport-derived; left untouched per ADR-2. |
| TILE-004 (viewport culling) | Cap `≤ 100` → `≤ 400` (matches F3-shipped `MAX_VISIBLE_TILES = 400`). Both scenarios updated: viewport literal `1920×720` and instance cap `≤ 400`. |

TILE-002, TILE-003, TILE-005 — NOT modified by F4a. Untouched.

### `openspec/specs/iso-camera-integration/spec.md` — 1 MODIFIED requirement promoted

| Requirement | What changed |
|---|---|
| CAM-002 (world container anchor) | All 7 scenarios updated to viewport `1920×720`, `viewOrigin = {960, 360}` (was `{960, 540}`), and crosshair at `(960, 360)` (was `(960, 540)`). `(Previously F4a: ...)` annotation added above the original `(Originally F2.5.1: ...)` annotation. |

CAM-001, CAM-003, CAM-004 — NOT modified by F4a. CAM-004 (F3.5 escape rule) preserved verbatim — verified via grep.

### `openspec/specs/README.md` — capability table updated

| Spec | Last change row |
|---|---|
| iso-tile-system | `F4a (TILE-001×2, TILE-004 MODIFIED — viewport 1080→720, cull cap 100→400)` |
| iso-camera-integration | `F4a (CAM-002 MODIFIED — viewport 1080→720)` |

The "Totals" line still reads `21 requirements` (F4a MODIFIED, not ADDED).

---

## Source LOC delta (commits vs F3.5 base)

| File | LOC delta | Type |
|---|---|---|
| `src/main.js` | +3 −2 | locked-file exception (LOGICAL_W/LOGICAL_H exports, LOGICAL_H=720, 8 comment sweeps) |
| `src/combat.js` | +4 −3 | magic-number fallback cleanup |
| `src/test-api.js` | +4 −3 | magic-number fallback cleanup |
| `tests/e2e/projectile-direction.spec.mjs` | +19 −19 (literal sweep) +4 −4 (page.evaluate fix) | test alignment |
| `tools/f4a-capture.mjs` | +50 | new (one-off Playwright capture) |
| `tests/playwright-screenshots/f4a-t00-boot.png` | binary | new (Playwright output) |
| `tests/playwright-screenshots/f4a-t15-mid.png` | binary | new (Playwright output) |

**Total**: 4 source/test files modified, 3 new files (1 script + 2 screenshots). ~80 LOC net (excluding screenshots and capture script).

---

## Carry-forward to future phases

1. **`fase-3.5.1-escape-test-align`** — `tests/e2e/smoke.spec.mjs` and `tests/e2e/hit-detection.spec.mjs` were authored against the pre-F3.5 depth-based escape rule. They fail under the new Manhattan-distance > 6 rule (CAM-004) but the failure is orthogonal to F4a. Documented as `WARNING` in `verify-report.md`. Suggested follow-up: re-align the expected escape times and integrity counts in both specs.

2. **`tools/f4a-capture.mjs`** is a one-off harness. Options for follow-up:
   - Keep as a regression-check tool (low cost; ~50 LOC).
   - Promote to `tests/e2e/canvas-720-smoke.spec.mjs` with `expect(consoleErrors).toEqual([])` assertions and the captured screenshots committed as references.
   - Delete in a future cleanup change.

3. **TILE_SIZE reduction (128 → 96 or similar)** — user-approved for Phase B (`fase-4b-level-extension`). With `LOGICAL_H = 720`, vertical coverage dropped from ~8 to ~5.6 tiles. Phase B will revisit when extending the rail length; if the rail grows beyond ~36 depth, the vertical coverage concern becomes more pronounced.

---

## Rollback

Single `git revert` of the merge (or revert each of the 10 implementation commits in reverse order) restores `2431329` (F3.5) state in one step. New files (`tools/f4a-capture.mjs`, 2 PNGs) are removed by the revert. No data, no persistent state, no schema.

---

## Audit trail

The 10 commits in chronological order are preserved in the branch history; `git log fase-4a-canvas-720 ^2431329 --oneline` reproduces them. The branch is ready for merge to `main`.
