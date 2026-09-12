# Archive Report: fase-6-scrolling-background

## Status

**VERIFIED — all 3 PRs landed and GREEN.**

## Summary

Replaced the tile-based isometric ground (fase-2.5 `iso-tile-system`) with a
per-stage scrolling background PNG. The new system:

- Disables the tile renderer in the main game (`src/iso/world.js` cullAndRender
  no-op, `src/main.js` no longer instantiates `Tilemap`).
- Loads one Minimax-generated PNG per stage (`assets/backgrounds/stage{1-5}.png`,
  640×1120 source, NEAREST scale, BG_SCALE=2 upscale on screen).
- Scrolls the bg at parallax 0.2 via `BackgroundLayer.update(cameraIso)` so
  the same image covers the entire 120 s rail without leaving the viewport.
- Replaces the single "Iniciar test level" button with 5 stage buttons that
  unlock progressively via `localStorage.setItem('zarra2d:stageClear:<id>')`.
- At `camera.time >= railEndTime`: freezes the bg (`bg.freeze()`), schedules
  `TEST_LEVEL.postFinalWaveRoster` via `EnemyManager.spawnWave()`, emits
  `stage:finaleStarted`.
- Killing the final boss (`TEST_LEVEL.finalBossId === 'e24'`) emits
  `stage:cleared`, which writes the localStorage clear key and shows the
  victory overlay.

## PRs landed

| PR | Commit | Description |
|---|---|---|
| PR-1 | `a82a451` | Disable tile system, BackgroundLayer placeholder, 10 unit tests |
| PR-2a | `fdaef1f` | Stage 1 (bosque) Minimax PNG + manifest + load wiring |
| PR-2b | `<after PR-2a>` | Stages 2-5 Minimax PNGs |
| PR-3 | `a3c116a` | Stage menu, finale + waves + boss mechanic, menu-flow spec |

## Verification

- **Unit tests** (7 files): 53/56 pass; 3 pre-existing failures in
  `integrity.spec.mjs` (unrelated, verified via `git stash`).
- **BackgroundLayer unit tests** (10 tests, all new): 10/10 pass.
- **e2e tests**:
  - `smoke.spec.mjs` — PASS (no console errors, 120 enemies spawn,
    API surface unchanged).
  - `tile-gallery.spec.mjs` — PASS (standalone demo still works after
    duck-typed `registerTilemap`).
  - `menu-flow.spec.mjs` — PASS (rewritten for BG-005; 7 buttons,
    lock state, modal toggles).
  - `catalog.spec.mjs` — PASS (standalone).
  - `deterministic-test-level.spec.mjs` — pre-existing failure (unrelated).
  - `projectile-direction.spec.mjs` — pre-existing failure (unrelated).
- **End-to-end finale flow** (Playwright):
  - `setTime(120)` → `stage:finaleStarted` fires, `bg.isFrozen === true`,
    boss `e24` still alive.
  - `boss.applyHit(30)` → `stage:cleared` fires, `localStorage` contains
    `zarra2d:stageClear:stage1-bosque`.

## Specs migrated to `openspec/specs/`

- `openspec/specs/scrolling-background/spec.md` (new, BG-001..BG-007).

## Specs marked DEPRECATED

- `openspec/specs/iso-tile-system/spec.md` (banner added at the top).
  Module and file are preserved for the standalone demo.

## Code changes (final diff stat)

```
openspec/changes/2026-09-12-fase-6-scrolling-background/{proposal,specs/scrolling-background.md -> spec.md, tasks}.md
openspec/specs/scrolling-background/spec.md
openspec/specs/iso-tile-system/spec.md (banner)
src/backgrounds.js                 (new, ~190 LOC)
src/iso/world.js                    (tilemap cull no-op, deprecated banner)
src/main.js                         (Tilemap removed, bg wired, finale + victory + menu:startStage)
src/ui/menu.js                      (5 stage buttons + lock progression)
src/enemies.js                      (EnemyManager.spawnWave with archetype whitelist)
src/levels/test-level.js            (finalBossId + postFinalWaveRoster)
tests/tile-gallery.html             (cache-buster removal — fixed standalone demo)
tests/e2e/menu-flow.spec.mjs        (rewritten for BG-005)
tests/unit/background-layer.spec.mjs (new, 10 tests)
assets/backgrounds/manifest.json
assets/backgrounds/stage{1-5}-*.png (Minimax outputs)
assets/backgrounds/raw/*.jpeg       (originals)
```

Approximate total: ~700 LOC added, ~50 LOC removed across 12 files.

## Pre-existing failures (NOT introduced by this change)

These were failing before fase-6 and remain unchanged:

- `tests/unit/integrity.spec.mjs` (3 failures)
- `tests/e2e/deterministic-test-level.spec.mjs` (1 failure)
- `tests/e2e/projectile-direction.spec.mjs` (1 failure: homing)

## Open follow-ups (NOT in this change)

- Per-stage enemy rosters (all 5 stages use the same TEST_LEVEL roster).
- Stage clear UI feedback (currently just an unlock on next menu mount).
- Sound/music for finale + boss.

## SDD artifact paths

- Change folder: `openspec/changes/2026-09-12-fase-6-scrolling-background/` (to be moved to archive by the orchestrator)
- Spec destination: `openspec/specs/scrolling-background/spec.md` ✅
- Archived DEPRECATED banner: `openspec/specs/iso-tile-system/spec.md` ✅
- Archive report: this file