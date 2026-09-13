# Archive Report: fase-6.1-bg-bugfixes

## Status

**VERIFIED — all 4 cycles GREEN.**

## Summary

Banco completo Playwright + screenshot review of fase-6 scrolling-bg surfaced
4 reproducible bugs. Fixed via 4 TDD cycles (RED → GREEN → REFACTOR).

## Bugs found + fixed

| Cycle | Bug | Fix | Files |
|---|---|---|---|
| 1 | B1: bg sprite was a child of `isoWorld.container`; PIXI rendered it AFTER `_spriteLayer` → enemies invisible behind opaque bg | Attach bg to `isoWorld._worldLayer` (empty since fase-6 tile disable); PIXI renders it BEFORE enemies | `src/main.js` |
| 2 | B2: Overlay retry button hardcoded "Reintentar test level" in production | `Overlay` reads `isTestMode` option, sets text contextually | `src/ui/overlay.js`, `src/main.js` |
| 3 | B3: Wave roster positions like (24, 18) projected BELOW the viewport at rail-end camera (36, 36), killed by REQ-CMB-008 screen-Y escape | Redesigned wave positions to (38, 36), (36, 38), (37, 37) which project ABOVE the camera and survive escape | `src/levels/test-level.js` |
| 4 | B4: Pressing Escape during gameplay did nothing | `Input` already emitted 'pause' on Esc; main.js now maps 'pause' → `menu:back` when `gameState === 'gameplay'` | `src/main.js` |

## RED → GREEN evidence

Each cycle has a corresponding `tests/e2e/banco-*.spec.mjs`:

```
=== banco-bg-render-order.spec.mjs === OK { bgParent: { parentName: 'worldLayer', ... } }
=== banco-overlay-retry-label.spec.mjs === OK { prodLabel: 'Reintentar', testLabel: 'Reintentar test level' }
=== banco-wave-positions.spec.mjs === OK { waveOnly: [9 entries] }
=== banco-esc-to-menu.spec.mjs === OK { menuVisible: true }
```

## Visual verification (Playwright manual screenshots)

5 stages × 12s gameplay each — all show distinct bg, hearts, hand, enemies,
papeletas, and boss sprites. Saved to
`tests/playwright-screenshots/banco/final/`.

Finale flow at t=140 (stage 1, post-fix):
- 11 enemies alive (boss + mini-boss + 9 wave enemies)
- 9 wave enemies visible on screen at screen Y ≈ 323
- Bg frozen at sky portion of source

## Existing tests still PASS

- `smoke.spec.mjs` — 120 enemies spawn, API surface unchanged
- `menu-flow.spec.mjs` — 7 buttons, lock state, modal toggles
- `tile-gallery.spec.mjs` — standalone demo
- `background-layer.spec.mjs` — 10/10 unit tests
- 3 pre-existing failures in `integrity.spec.mjs` (unrelated)

## Code changes

```
openspec/changes/archive/2026-09-13-fase-6.1-bg-bugfixes/
  proposal.md, tasks.md, archive-report.md, specs/
src/main.js                    (~10 LOC: input.on('pause', ...) wiring)
src/ui/overlay.js              (~5 LOC: isTestMode option + conditional label)
src/levels/test-level.js       (~15 LOC: redesigned postFinalWaveRoster)
tests/e2e/banco-*.spec.mjs     (4 new RED-then-GREEN tests, ~250 LOC)
```

Approximate total: ~280 LOC added, 0 removed.

## Related

- B1 fix landed in commit `afb3b8f` BEFORE this change (during banco triage).
- The SDD change `fase-6-scrolling-background` set up the bg system; this
  change fixes the 4 bugs that became visible after that merge.

## Open follow-ups (NOT in this change)

- B5: `bg.setStage` after `_worldLayer.parent = null` (rare disposal edge case) — leave for future hardening.
- B6: papeleta texture is visually weak (cream square with thin line) — art pass needed.
- Per-stage enemy rosters (currently all 5 stages share TEST_LEVEL's 120-enemy roster).
- Stage-clear UI feedback (currently just unlocks next stage on next menu mount).