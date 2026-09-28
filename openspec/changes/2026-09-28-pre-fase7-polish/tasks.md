# Tasks: pre-fase7 polish

This change was implemented directly on `main` as 5 polish commits during a
pre-fase7 audit. This tasks file documents the completed work retroactively
+ remaining archive steps.

## Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1 800 (across 4 refinements + 4 specs) |
| 400-line budget risk | Low (each refinement < 600 LOC) |
| Chained PRs | No (single archive change) |

## Phase 1: Implementation (already on `main`)

### R1 — Pause overlay orientation gate (F3.5.1bis)

Commit: `e4c0c58 feat(orientation): F3.5.1bis pause card gate + unified predicate`

- [x] RED: extend `tests/e2e/orientation-autopause.spec.mjs` with assertions
      for gate state (button.disabled, hint visibility, manual Esc bypass).
- [x] GREEN: `PauseOverlay.show({ auto: true })`, `setOrientation(isLandscape)`,
      `_applyOrientationGate()`, `pause.rotarMovil` i18n key.
- [x] REFACTOR: unify `syncOrientationAutoPause` and `setupOrientationLock`
      on `w > h` aspect-ratio predicate.

### R2 — Overlay viewport-fit (F3.5.1ter)

Commit: `79fe33f test(overlay): F3.5.1ter viewport-fit coverage` (test) +
        `e4c0c58` (CSS)

- [x] RED: write `tests/e2e/overlay-fits-viewport.spec.mjs` with 24 asserts
      across 4 viewports × 2 variants (gameover + victory+share).
- [x] GREEN: `clamp()` for padding/font/gap, `max-height: calc(100dvh - 32px)`,
      `display: flex; flex-direction: column` on card.
- [x] REFACTOR: remove redundant `media (max-width: 600px)` overlay override
      (clamp() covers the responsive range).

### R3 — Pedagogy card + modal compact footprint (F3.5.4)

Commit: `0dc4b05 feat(pedagogy): F3.5.4 compact card+modal at hand's right`

- [x] RED: write `tests/e2e/pedagogy-card-position.spec.mjs` (29 asserts) for
      footprint, expand-on-click, stacking, bottom-right anchor.
- [x] GREEN: `clamp(80px, 9vw, 110px)` footprint, `.expanded` modifier class,
      `pedagogy:visibility` event bus, `_peekCardVisibleFromDom()` for
      boot-time state seed.
- [x] REFACTOR: fix listener leak (removeEventListener before addEventListener
      on every `_render()`).

### R4 — Combat 1-shot-kill + hitbox=sprite + nearest-center (F6.1)

Commit: `24376b4 fix(combat): F6.1 1-shot-kill + hitbox=sprite + nearest-center tie-break`

- [x] RED: write `tests/e2e/one-shot-kill.spec.mjs` (98 asserts) in 4 parts:
      walk-through, hitbox coverage, overlap tie-break, boss kill contract.
- [x] GREEN: `ARCHETYPES` hp:1 for non-boss, `hitInset: 0` for all,
      `_resolveHitAtScreenPoint` rewritten with nearest-center sort.
- [x] REFACTOR: keep `multiplier` so visual hierarchy and score reward
      survive (tank 15 pts, mini-boss 20 pts vs standard 10 pts).

## Phase 2: Spec formalization (in this change)

- [x] `openspec/changes/2026-09-28-pre-fase7-polish/proposal.md` — Intent,
      discovered bugs, scope, rollback plan, acceptance criterios.
- [x] `openspec/changes/2026-09-28-pre-fase7-polish/tasks.md` — this file.
- [x] `openspec/changes/2026-09-28-pre-fase7-polish/design.md` — architecture
      decisions + diagrams for each refinement.
- [x] `openspec/changes/2026-09-28-pre-fase7-polish/specs/pause-orientation-gate/spec.md`
- [x] `openspec/changes/2026-09-28-pre-fase7-polish/specs/overlay-viewport-fit/spec.md`
- [x] `openspec/changes/2026-09-28-pre-fase7-polish/specs/pedagogy-card-footprint/spec.md`
- [x] `openspec/changes/2026-09-28-pre-fase7-polish/specs/combat-1shot-kill/spec.md`
- [x] `openspec/changes/2026-09-28-pre-fase7-polish/verify-report.md` — link to
      `bash scripts/verify.sh` output + e2e pass/fail count.
- [x] `openspec/changes/2026-09-28-pre-fase7-polish/archive-report.md` — final
      status.

## Phase 3: Archive (pending)

- [ ] Move `openspec/changes/2026-09-28-pre-fase7-polish/` to
      `openspec/changes/archive/2026-09-28-pre-fase7-polish/` once
      Phase 2 is reviewed.
- [ ] Tag `v1.0.0` after archive.
- [ ] Push tag to GitHub.
