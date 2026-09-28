# Archive Report: pre-fase7 polish

## Status

**VERIFIED — all 4 refinements GREEN, 8/8 verify.sh PASS, 4 e2e specs
add PASS, 13 existing e2e specs unchanged. Pedagogical sign-off firmado
2026-09-28.**

This change is archive-ready.

## Summary

A pre-fase7 audit surfaced 4 UX polish refinements (R1-R4) that, while not
breaking the game loop, made the experience feel less polished than the rest
of the codebase. All 4 were implemented directly on `main` in 5 polish
commits during the audit. This SDD change captures them retroactively so the
contract is documented in OpenSpec.

## Bugs found + fixed

| Ref | Symptom | Fix | Files |
|-----|---------|-----|-------|
| R1 — F3.5.1bis | Pause overlay "Continuar" still clickable in portrait (game resumes into broken state) | `show({ auto: true })` flag + `setOrientation()` + `_applyOrientationGate()` + `pause.rotarMovil` i18n key + defense-in-depth in `_onContinue()` + fallback focus to `back` button | `src/ui/pause.js`, `src/main.js`, `src/i18n/es.js`, `styles/main.css`, `tests/e2e/orientation-autopause.spec.mjs` |
| R2 — F3.5.1ter | Game-over / victory overlay overflows iPhone SE viewport | `clamp()` for padding/font/gap + `max-height: calc(100dvh - 32px)` + `flex: 0 1 auto; min-height: 0` on card | `styles/main.css`, `tests/e2e/overlay-fits-viewport.spec.mjs` |
| R3 — F3.5.4 | Pedagogy card + modal-intermedio unaligned with hand sprite | Card compact footprint + expand-on-click + `pedagogy:visibility` event bus + boot-time DOM peek + listener leak fix + `.stacked` modifier for modal stacking | `src/pedagogy/cards.js`, `src/pedagogy/modal-intermedio.js`, `styles/main.css`, `tests/e2e/pedagogy-card-position.spec.mjs` |
| R4 — F6.1 | Some enemies don't die in 1 shot (tank: 3, mini-boss: 10); hitbox shrunk from sprite; overlap resolver picks hidden sprite | All non-boss `hp: 1` (multiplier preserved); `hitInset: 0` for all; nearest-center-to-click sort with depth-desc + id-asc tie-breaks | `src/enemies.js`, `src/combat.js`, `tests/e2e/one-shot-kill.spec.mjs` |

## Commits captured

```
e4c0c58 feat(orientation): F3.5.1bis pause card gate + unified predicate
79fe33f test(overlay): F3.5.1ter viewport-fit coverage
0dc4b05 feat(pedagogy): F3.5.4 compact card+modal at hand's right
24376b4 fix(combat): F6.1 1-shot-kill + hitbox=sprite + nearest-center tie-break
ed20238 docs: mark pedagogical sign-off as firmado (2026-09-28)
```

## RED → GREEN evidence

Each refinement has a corresponding dedicated e2e spec:

```
$ TEST_URL=http://127.0.0.1:8000/?test=1 node tests/e2e/orientation-autopause.spec.mjs
orientation-autopause e2e done (11/11 PASS)

$ TEST_URL=http://127.0.0.1:8000/?test=1 node tests/e2e/overlay-fits-viewport.spec.mjs
overlay-fits-viewport e2e done (24/24 PASS)

$ TEST_URL=http://127.0.0.1:8000/?test=1 node tests/e2e/pedagogy-card-position.spec.mjs
pedagogy-card-position e2e done (29/29 PASS)

$ TEST_URL=http://127.0.0.1:8000/?test=1 node tests/e2e/one-shot-kill.spec.mjs
one-shot-kill e2e done (98/98 PASS)
```

## Structural verification

```
$ bash scripts/verify.sh
verify.sh: 8 PASS, 0 FAIL
```

C1 (STRINGS): 84 refs in src/, well above the 30 minimum.
C2 (Spanish prose): 0 leaks outside `src/i18n/es.js`.
C3 (Sprites): 27 PNGs, above the 26 minimum.
C4 (Backgrounds): 5 stages in `assets/backgrounds/manifest.json`.
C5 (Fuentes): 6 `fuente:` data entries in `src/i18n/es.js`.
C6 (https://): 0 literals outside `src/i18n/es.js`.
C7 (A7 desactivacion): 1 lifecycle entry (planta_treco mini-boss).
C8 (A8 console.*): 0 console calls outside `src/engine/dom-debug.js`.

## No-regression check (13 existing e2e specs)

```
PASS hit-detection.spec.mjs
PASS enemy-movement.spec.mjs
PASS projectile-direction.spec.mjs
PASS rail-direction.spec.mjs
PASS smoke.spec.mjs
PASS modal-intermedio.spec.mjs
PASS pedagogy-cards.spec.mjs
PASS pedagogy-card-f352.spec.mjs
PASS pause.spec.mjs
PASS orientation-autopause.spec.mjs
PASS overlay-fits-viewport.spec.mjs
PASS banco-bg-render-order.spec.mjs
PASS banco-overlay-retry-label.spec.mjs
PASS banco-esc-to-menu.spec.mjs
```

All exit 0.

## Pedagogical sign-off

Signed by pedagogo (usuario) on 2026-09-28. All 6 dato strings in
`src/i18n/es.js` were reviewed and approved. See `docs/IMPLEMENTATION-STATUS.md
§D.3` for the full sign-off table.

## Issues found

**None.** This was a polish-pass archive with no regressions. 0 CRITICAL,
0 WARNING, 0 SUGGESTION issues.

## VERDICT

**PASS — archive-ready.**

This change can be moved to `openspec/changes/archive/2026-09-28-pre-fase7-polish/`
once the next phase begins.

## Next step

1. Move this change to `openspec/changes/archive/`.
2. Tag `v1.0.0` on the current HEAD (next commit, e.g. `docs: archive pre-fase7 polish`).
3. Push tag to GitHub.
4. Optional: deploy to GitHub Pages / Tailscale VPS.

After these steps, the project is at v1.0.0 release.
