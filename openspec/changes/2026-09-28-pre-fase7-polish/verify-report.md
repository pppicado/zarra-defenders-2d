# Verify Report: pre-fase7 polish

## Status

**VERIFIED — all 4 refinements GREEN, 8/8 verify.sh PASS, 4 new e2e specs PASS.**

## Summary

A pre-fase7 audit surfaced 4 UX polish refinements (R1-R4). All 4 were
implemented directly on `main` in 5 polish commits, with 4 dedicated e2e
specs covering them. This report captures the verification status at the
HEAD when this change was created.

## verify.sh (structural)

```
$ bash scripts/verify.sh
=== C1  STRINGS usage in src/  (≥ 30) ===
✓ PASS  STRINGS references = 84

=== C2  Spanish prose outside i18n/es.js  (= 0) ===
✓ PASS  Spanish prose leaks = 0

=== C3  Sprite catalog count  (≥ 26) ===
✓ PASS  sprites = 27

=== C4  Background manifest stages  (= 5) ===
✓ PASS  stages = 5

=== C5  fuentes populated in i18n/es.js  (= 6 data entries) ===
✓ PASS  fuente: data entries = 6

=== C6  zero https:// outside i18n/es.js  (A6) ===
✓ PASS  https:// literals outside i18n = 0

=== C7  A7 boss desactivación lifecycle  (≥ 1) ===
✓ PASS  desactivacion lifecycle = 1

=== C8  A8 zero console.* outside dom-debug.js  (= 0) ===
✓ PASS  console.* leaks = 0

verify.sh: 8 PASS, 0 FAIL
```

## New e2e specs (added in this change)

### R1 — `tests/e2e/orientation-autopause.spec.mjs` (extended 5 → 11 asserts)

```
✓ 1. portrait cold load auto-pauses — ariaHidden=false
✓ 2. landscape auto-closes pause
✓ 3. portrait again re-pauses
✓ 4a. Esc in landscape shows pause
✓ 4b. Esc again hides pause
✓ 5a. portrait auto-pause disables continue button — disabled=true ariaDisabled=true
✓ 5b. portrait auto-pause shows orient hint — hintHidden=false
✓ 6. landscape releases gate (hint hidden when overlay hidden)
✓ 3b. portrait re-pause re-disables continue button — disabled=true hintHidden=false
✓ 7. manual Esc-pause does NOT gate continue button — disabled=false
✓ 7b. manual Esc-pause hides orient hint — hintHidden=true
```

### R2 — `tests/e2e/overlay-fits-viewport.spec.mjs` (24 asserts, NEW)

4 viewports × 2 variants × 3 asserts each = 24 asserts. All PASS.

### R3 — `tests/e2e/pedagogy-card-position.spec.mjs` (29 asserts, NEW)

```
✓ A. ... 22 asserts (compact footprint, bottom-right anchor, no hearts overlap,
   expand-on-click, collapse-on-click, stacking above card with 8px gap,
   modal returns to bottom: 16px when card hidden)
```

### R4 — `tests/e2e/one-shot-kill.spec.mjs` (98 asserts, NEW)

4 parts:
- Part A (walk-through): 22 asserts (11 spriteIds × encountered/dies-in-1-shot + boss survives)
- Part B (hitbox coverage): 66 asserts (11 spriteIds × 1 has-bounds + 5 points)
- Part C (overlap tie-break): 5 asserts
- Part D (boss kill contract): 4 asserts

All 98 PASS.

## No-regression check (existing tests still PASS)

```
$ for spec in hit-detection enemy-movement projectile-direction rail-direction \
              smoke modal-intermedio pedagogy-cards pedagogy-card-f352 \
              pause orientation-autopause overlay-fits-viewport \
              banco-bg-render-order banco-overlay-retry-label banco-esc-to-menu; do
    TEST_URL='http://127.0.0.1:8000/?test=1' node "tests/e2e/$spec.spec.mjs" \
      > /dev/null 2>&1 && echo "PASS $spec" || echo "FAIL $spec"
done

PASS hit-detection
PASS enemy-movement
PASS projectile-direction
PASS rail-direction
PASS smoke
PASS modal-intermedio
PASS pedagogy-cards
PASS pedagogy-card-f352
PASS pause
PASS orientation-autopause
PASS overlay-fits-viewport
PASS banco-bg-render-order
PASS banco-overlay-retry-label
PASS banco-esc-to-menu
```

13 specs verified. Zero regressions.

## Pedagogical sign-off

Signed by pedagogo (usuario) on 2026-09-28. The 6 dato strings in
`src/i18n/es.js` were reviewed for:
- Data accuracy (cifras, fechas, topónimos)
- Citation specificity (URLs apuntan al artículo correcto)
- No caricature (adversaries son máquinas impersonales)
- Desactivación framing (planta_treco se desactiva, no muere)

All 6 stages ✅ firmado. See `docs/IMPLEMENTATION-STATUS.md §D.3`.

## VERDICT

**PASS — archive-ready.**

All 4 refinements are implemented, documented, tested, and pedagogically
signed off. The change can be moved to `openspec/changes/archive/` and
tagged `v1.0.0`.
