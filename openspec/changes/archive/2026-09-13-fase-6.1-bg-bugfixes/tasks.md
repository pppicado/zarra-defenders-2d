# Tasks: fase-6.1-bg-bugfixes

## Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~120 |
| 400-line budget risk | Low |
| Chained PRs | No |

## PR-1: All 4 cycles in one PR (~120 LOC)

### Cycle 1: bg render order (RED → GREEN → REFACTOR)
- [ ] RED: write `tests/e2e/banco-bg-render-order.spec.mjs` asserting bg sprite parent === isoWorld._worldLayer.
- [ ] GREEN: confirm main.js uses `isoWorld._worldLayer`. (Already done in `afb3b8f`.)
- [ ] REFACTOR: JSDoc the render-order invariant on BackgroundLayer.

### Cycle 2: overlay button label
- [ ] RED: assert `[data-role="retry"]`.textContent === 'Reintentar' in production.
- [ ] GREEN: read `?test=1` flag at boot, set retry text accordingly.
- [ ] REFACTOR: clean up.

### Cycle 3: wave positions
- [ ] RED: assert enemies alive after t > 120 (finale) is >= 8 (boss + 6 wave enemies).
- [ ] GREEN: redesign wave roster positions to Manhattan ≤ 5 from (36, 36).
- [ ] REFACTOR: extract position helper.

### Cycle 4: Esc to menu
- [ ] RED: assert menu:back emitted on Esc during gameplay.
- [ ] GREEN: bind Esc in `Input` or `main.js`.
- [ ] REFACTOR: extract to Input class.

### Verify
- [ ] All RED tests GREEN.
- [ ] Smoke + menu-flow + capture-flow still PASS.
- [ ] Playwright manual verification (open `?unlock=all`, click stage 1, Esc back to menu, click stage 5, jump to t=120 with `__gameTestAPI__.setTime`, observe finale waves on screen).
- [ ] SDD archive report.

## Reviewers

| PR | Lines | Reviewer focus |
|---|---|---|
| PR-1 | ~120 | Wave positions verified via Playwright at t > 120; Esc binding doesn't fire during overlays. |