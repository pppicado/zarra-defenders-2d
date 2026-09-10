# Tasks: F4a — Canvas resize to 1920×720 (Phase A)

**Change**: `fase-4a-canvas-720` · **Base**: main @ post-F3 archive · **Strategy**: single PR, no `size:exception` · **Source LOC**: ~15 across 4 files

Decision needed before apply: No
Chained PRs recommended: No (single PR, ~15 LOC — well under 400-line budget)
Chain strategy: pending
400-line budget risk: Low

## Phase 1 — Canvas constant (the actual change)

- [x] **TASK-001** `src/main.js` MODIFIED (locked — scoped exception per proposal §8) · L57: `LOGICAL_H = 1080` → `720`. Single numeric line that drives the change; every consumer (`applyCssScale`, `PIXI.Application`, `IsoWorld.viewportHeight`, `Tilemap`, HUD anchors, `Combat.viewportSize`) auto-recalculates. Commit: `feat(canvas): set LOGICAL_H to 720`. Depends: —. LOC: 1. Tests: TASK-005, TASK-006.
- [x] **TASK-002** `src/main.js` MODIFIED (same exception) · sweep 8 stale "1920×1080" comments at L45, L51, L61, L92, L132, L158, L173, L267 → "1920×720" and "~8 tiles tall" → "~5.6 tiles tall". Comment-only. Commit: `docs(canvas): sweep stale 1920×1080 comments for LOGICAL_H=720`. Depends: TASK-001. LOC: 8. Tests: `grep -nE '1920[ ×x]1080' src/main.js` returns 0.

## Phase 2 — Magic-number cleanup

- [x] **TASK-003** `src/combat.js` MODIFIED · L143: fallback `{ x: 1280, y: 720 }` → `{ x: LOGICAL_W, y: LOGICAL_H }` (import from `src/main.js`). Pre-existing drift; fixes stale-default bug class in unit tests. Commit: `refactor(combat): replace viewport-magic-number fallback with LOGICAL_W/LOGICAL_H`. Depends: TASK-001. LOC: 2. Tests: TASK-005.
- [x] **TASK-004** `src/test-api.js` MODIFIED · L103: fallback `{ x: 640, y: 360 }` → `{ x: LOGICAL_W / 2, y: LOGICAL_H / 2 }`. Commit: `refactor(test-api): replace viewport-magic-number fallback with LOGICAL_W/2, LOGICAL_H/2`. Depends: TASK-001. LOC: 2. Tests: TASK-005.

## Phase 3 — Test alignment

- [x] **TASK-005** `tests/e2e/projectile-direction.spec.mjs` MODIFIED · L19 worked-example recompute (`round(1080*0.30) = 324` → `round(720*0.30) = 216`, plus final-stop y) and L40 local `const LOGICAL_H = 1080` → `720`. Acceptance: `grep -nE '\b1080\b' tests/e2e/projectile-direction.spec.mjs` returns 0; `npx playwright test` passes headless. Commit: `test(canvas-720): align projectile-direction spec to LOGICAL_H=720`. Depends: TASK-001. LOC: 3. Tests: this task IS the test.

## Phase 4 — Verification

- [x] **TASK-006** `tools/f4a-capture.mjs` NEW + `tests/playwright-screenshots/f4a-t{00,15}-*.png` · Playwright headless boot under `?test=1` over `python3 -m http.server 8000`; captures two screenshots at the new 1920×720 aspect ratio. Zero `console.error`. Focused test `tests/e2e/projectile-direction.spec.mjs` passes (the spec was re-aligned to LOGICAL_H=720 in TASK-005). Commit: `test(canvas-720): add Playwright headless smoke for 1920x720 visual`. Depends: TASK-001..TASK-005. LOC: 50. Tests: this task IS the test.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Changed lines | ~15 source + ~60 test ≈ 75 |
| 400-line budget risk | Low (~19% of budget) |
| Chained PRs / split / delivery / chain | No · single PR · single-pr · pending |
| Locked-file exception | `src/main.js` only (1 numeric + 8 comment lines, proposal §8) |

- **Highest-risk**: TASK-001 (locked-file numeric); TASK-006 (visual smoke is the only behavioral gate).
- **Apply order**: 1 → 2 → 3 → 4 → 5 → 6 (linear on TASK-001). **Rollback**: single `git revert` restores F3 (proposal §9).
- **Orchestrator note**: `rules.apply` requires the `src/main.js` exception token recorded before `acquire` (no user decision needed).

## Open questions

**Zero.** TILE_SIZE kept at `128` per ADR-2 (user 2026-09-10); Phase B revisits.
