# Proposal: fase-6.1-bg-bugfixes

## Intent

A complete Playwright + screenshot review of the fase-6 scrolling background
system surfaced 6 bugs. Two are critical (broken visual), two are medium
(player-facing UX), two are low priority. This change addresses them via 4
TDD cycles.

## Discovered bugs

| # | Severity | Symptom | Root cause |
|---|---|---|---|
| B1 | CRITICAL | No enemy / projectile / hand visible on screen | bg sprite added to `isoWorld.container`; PIXI renders children in add-order, so bg was drawn ON TOP of `_spriteLayer` (enemies) and the HUD. **FIXED in commit `afb3b8f`** by attaching bg to `isoWorld._worldLayer` (the empty layer that used to hold tilemap). |
| B2 | MEDIUM | Game-over button says "Reintentar test level" in production | `src/ui/overlay.js` line 104 hardcodes the label. The dev path (`menu:startRequested` → `bootTestLevel`) leaks its label. |
| B3 | MEDIUM | Wave enemies spawn at iso positions with Manhattan > 6 from the final camera (36, 36) → immediately escape → only 2 enemies alive during finale (boss + mini-boss) | `TEST_LEVEL.postFinalWaveRoster` positions (24,18), (18,24), (14,22) etc. are designed for camera at (18,18) but the finale has camera at (36,36). |
| B4 | MEDIUM | No way to return to menu during gameplay except via game-over/victory overlay | No Esc/keyboard handler bound when `gameState === 'gameplay'`. Players have to die to switch stages. |
| B5 | LOW | `bg.setStage('stageN', path)` after `bg._worldLayer.parent = null` (disposed IsoWorld) silently no-ops (destroys texture but doesn't mount new sprite). Edge case in the rare event of IsoWorld destruction. |
| B6 | LOW | The papeleta texture is a 20×24 cream square with a thin signature line — visually weak as "the shot". (Player UX feedback.) |

## Scope

### In Scope

- **Cycle 1 (B1)**: bg parent fix. **Already implemented** in `afb3b8f` — fix verified via Playwright across all 5 stages.
- **Cycle 2 (B2)**: overlay button label fix + a `data-mode` attribute so the overlay can show context-aware text ("Reintentar" vs "Reintentar test level").
- **Cycle 3 (B3)**: redesign `postFinalWaveRoster` so wave enemies spawn at iso positions visible from camera (36, 36). Each wave gets a deterministic set of 3 mobile enemies in the visible iso range.
- **Cycle 4 (B4)**: add Esc-to-menu keyboard binding in `Input` class (or `main.js`); verify via Playwright.

### Out of Scope

- B5 (IsoWorld disposal edge case): rare, hard to reach, leave for a future hardening pass.
- B6 (papeleta visual): would require regenerating the asset; defer to a future art pass.
- New stage rosters, boss behavior, audio.

## TDD cycles (RED → GREEN → REFACTOR)

### Cycle 1 — bg render order

- **RED**: add a Playwright check that asserts the bg sprite is a child of `isoWorld._worldLayer`, not `isoWorld.container` directly. The `e2e/banco-bg-render-order.spec.mjs` test boots `?unlock=all`, clicks stage 1, waits 8 s, then inspects the PIXI container tree.
- **GREEN**: change main.js to pass `isoWorld._worldLayer` to `new BackgroundLayer(...)`. (Already done in `afb3b8f` — test will pass.)
- **REFACTOR**: add JSDoc to `BackgroundLayer` explaining the render-order invariant.

### Cycle 2 — overlay button label

- **RED**: assert `document.querySelector('[data-role="retry"]').textContent === 'Reintentar'` in production boot (`?test=0`).
- **GREEN**: replace the hardcoded label with a `data-role` lookup that derives text from the current bg.stageId or a fallback. Always 'Reintentar' in production, 'Reintentar test level' only when `?test=1`.
- **REFACTOR**: clean up.

### Cycle 3 — wave positions

- **RED**: assert that `enemies.spawnWave(TEST_LEVEL.postFinalWaveRoster)` produces at least 6 enemies that survive 3 s after spawn (camera at (36, 36)).
- **GREEN**: redesign wave positions to be within Manhattan ≤ 5 of (36, 36). E.g., (33, 35), (35, 33), (34, 34) for wave 1; rotate for wave 2/3.
- **REFACTOR**: clean up.

### Cycle 4 — Esc to menu

- **RED**: assert that pressing Escape during gameplay emits `menu:back` and brings the menu back.
- **GREEN**: add Esc handler in `main.js` (or `Input` class) that emits `menu:back` when `gameState === 'gameplay'` and not in a modal/overlay.
- **REFACTOR**: extract to `Input` if reusable.

## Success criteria

- All 4 cycles GREEN.
- `?unlock=all` smoke test still PASSES.
- `?unlock=all` + click stage 1 + click `Volver al menú principal` (game over path) brings the menu back with all stages unlocked.
- `?unlock=all` + click stage 1 + Esc brings the menu back (new path).
- Clicking through stages 1 → 5 in sequence swaps the bg each time.
- During stage 5 finale (t > 120), 6+ wave enemies are visible on screen, not just the boss.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~120 (overlay ~10, test-level ~20, input ~30, main ~10, tests ~50) |
| 400-line budget risk | Low |
| Chained PRs recommended | No (single PR; small change) |