# Proposal: pre-fase7 polish (4 UX refinements)

## Intent

A pre-fase7 audit surfaced 4 UX bugs that, while not breaking the game loop,
make the experience feel less polished than the rest of the codebase. This
change captures them retroactively as a SDD change (the implementation was
done directly on `main` as 5 polish commits; this proposal + specs formalize
the contract).

## Refinements captured

| ID | Ref | Commit | Domain |
|-----|-----|--------|--------|
| R1 | F3.5.1bis | `e4c0c58` | Pause overlay gates "Continuar" while in portrait auto-pause |
| R2 | F3.5.1ter | `e4c0c58` + `79fe33f` | Game-over / victory overlay fits any viewport |
| R3 | F3.5.4 | `0dc4b05` | Pedagogy card + modal-intermedio compact footprint next to hand |
| R4 | F6.1 | `24376b4` | Combat: 1-shot-kill non-boss + hitbox=sprite + nearest-center tie-break |

## Discovered bugs

### R1 — Pause overlay "Continuar" still clickable in portrait

**Symptom**: F3.5.1 auto-pauses the game when the viewport goes portrait, but
the "Continuar" button stays enabled. The player can tap it and "resume" into
a portrait viewport where the canvas is letterboxed and the controls are
mis-calibrated — the game enters a broken state (audio playing, ticker running,
but gameplay effectively frozen).

**Root cause**: the `pauseOverlay.show()` path used by `syncOrientationAutoPause`
is the same path used by `Esc` (manual). There was no signal distinguishing
"auto-pause by orientation" from "manual pause by user", so the resume button
could not be conditionally gated.

**Fix (F3.5.1bis)**:
- `PauseOverlay.show(opts)` now accepts `{ auto: true }`.
- `PauseOverlay.setOrientation(isLandscape)` pushes the latest viewport state.
- `_applyOrientationGate()` toggles the disabled state on the continue button
  and shows/hides a `pause-orient-hint` element with text "Girá el móvil para
  continuar" (i18n key `pause.rotarMovil`).
- `_onContinue()` bails when gated (defense-in-depth — `.click()` programmatic
  bypass is blocked).
- `_focusPrimary()` falls back to the `back` button (always interactive) when
  the continue button is disabled, so screen-reader users aren't trapped.
- `syncOrientationAutoPause` and `setupOrientationLock` now share the same
  `w > h` predicate (unified aspect-ratio check; eliminates divergence between
  `matchMedia('(orientation: portrait)')` and `w > h`).

### R2 — Game-over / victory overlay overflows iPhone SE

**Symptom**: the overlay card (`#game-overlay .overlay-card`) has fixed
`width: 480px` + `padding: 28px` and grows unbounded vertically with content.
On a 320×568 viewport (iPhone SE 1st gen), the card overflows the bottom
edge; the box-shadow (`0 8px 0 rgba(0, 0, 0, 0.6)`) is clipped.

**Root cause**: hard-coded width with no `max-height`, no responsive font-size,
no responsive padding.

**Fix (F3.5.1ter)**:
- Card now uses `clamp()` for `padding`, `font-size`, `gap`, and button
  `min-height`.
- `max-height: calc(100dvh - 32px)` (with `100vh` fallback for browsers without
  `dvh`) as a hard backstop.
- `display: flex; flex-direction: column; flex: 0 1 auto; min-height: 0` lets
  the card shrink in the flex parent (`#game-overlay`) instead of overflowing.
- New e2e spec `tests/e2e/overlay-fits-viewport.spec.mjs` (24 asserts) covers
  4 viewports × 2 variants (gameover + victory with share block).

### R3 — Pedagogy card + modal-intermedio unaligned with hand

**Symptom**: the user observed that the pedagogy card (post-enemy-destroy) and
the modal-intermedio (every 5 hits) are not visually aligned with the hand
sprite (which sits at bottom-center). The card is bottom-right but tall
(~240px), and the modal is top-center paneled (~420px). They do not feel like
a paired element next to the hand.

**Root cause**: the card predates the hand-sprite era; the modal was always
top-center. Both lacked a unified compact footprint.

**Fix (F3.5.4)**:
- Card collapsed footprint: `width: clamp(220px, 30vw, 320px)`, `height:
  clamp(80px, 9vw, 110px)`, padding/gap/font all `clamp()`-scaled.
- Click on card body toggles `expanded` (height auto, all content visible);
  clicking again collapses and auto-resumes if we paused.
- Modal stackeada above card when both visible via `.stacked` CSS modifier
  (`bottom: calc(cardHeight + 24px)`). Boot-time DOM peek in
  `_peekCardVisibleFromDom()` ensures the modal seeds its stacked state when
  instantiated late (test scenarios, hot-reload).
- Truncation with `text-overflow: ellipsis` on the modal's mensaje/subtitulo
  (dismiss-only by design; the data is reinforcement, not new info).
- Fixed a listener leak discovered during this work: each `_render()` on
  the card was adding a fresh click handler without removing the previous.
  Three destroys = 3 handlers = 3 toggles per click → toggle returned to
  starting value. Fix: store handler reference and `removeEventListener`
  before `addEventListener`.

### R4 — Combat multi-HP + transparent-padding hitbox + wrong tie-break

**Symptom**: "a veces hay algunos enemigos que no mueren aunque les impactes,
sobre todo a mitad nivel al principio siempre funciona bien".

**Three inter-related bugs**:

1. **`tank` archetype had `hp: 3`, `mini-boss` had `hp: 10`** — dron_fumigador,
   camion_cisterna_residuos and planta_treco required 3 and 10 shots respectively.
2. **`hitInset` shrank the hitbox 16/12/10/8 px per side** — the AABB shrunk
   *inside* the visible sprite. On moving enemies (sine/zigzag/arc), the
   sprite slid out of the shrunk AABB between frames, so the first click
   whiffed and the enemy survived.
3. **Sort by depth-desc** when sprites visually overlap (standard passing
   behind a tank) — the resolver picked the sprite at greater depth, which
   is the one furthest from the camera (often the occluded one). Player
   aimed at the visible tank; hit landed on the hidden standard behind.

**Fix (F6.1)**:
- `ARCHETYPES` in `src/enemies.js`: all non-boss `hp: 1`. Only `boss`
  (the final stage boss, `sello_burocratico`) keeps `hp: 30`.
- `multiplier` preserved: standard ×1 → 10 pts, tank ×1.5 → 15 pts,
  mini-boss ×2 → 20 pts, boss ×3 → 30 pts. Visual hierarchy and score
  reward survive; only the kill threshold changes.
- `hitInset` set to `0` on every archetype: the hitbox equals the PIXI sprite
  bounds exactly (`getBounds()` returned by PIXI after post-translate /
  post-scale / post-anchor). Lo que ves es lo que golpeás.
- `_resolveHitAtScreenPoint` rewritten: computes squared distance from each
  candidate AABB's center to the click point, sorts ascending (nearest-center-
  to-click wins). Depth-desc retained as secondary tie-break; id-asc as
  final. Heuristic: "the sprite I SEE wins".

## Scope

### In Scope

- 4 polish refinements as documented above (already implemented in 5 commits).
- New e2e spec `tests/e2e/one-shot-kill.spec.mjs` (98 asserts) covering all 4.
- New e2e spec `tests/e2e/pedagogy-card-position.spec.mjs` (29 asserts) covering R3.
- New e2e spec `tests/e2e/overlay-fits-viewport.spec.mjs` (24 asserts) covering R2.
- Extension of `tests/e2e/orientation-autopause.spec.mjs` from 5 to 11 asserts covering R1.

### Out of Scope

- Combination of multiple disjoint issues (already in `1c814b7 fix(tests): cleanup 9 stale e2e tests`).
- Pixi.js version upgrade (separate concern).
- Pixi offline fallback (separate, already in F6).
- New UX (would require proposal from pedagogo).

## Rollback plan

Each refinement is already on `main`. To roll back:
- R1: revert `src/ui/pause.js`, `src/main.js`, `src/i18n/es.js`. Tests in
  `tests/e2e/orientation-autopause.spec.mjs` will fail with the new gates
  reverting to the old behavior (5/11 asserts).
- R2: revert `styles/main.css` overlay block. `overlay-fits-viewport.spec.mjs`
  will fail on iPhone SE viewport.
- R3: revert `src/pedagogy/cards.js`, `src/pedagogy/modal-intermedio.js`,
  `styles/main.css`. `pedagogy-card-position.spec.mjs` will fail on footprint
  and stacking asserts.
- R4: revert `src/enemies.js` (hp), `src/combat.js` (resolver), `src/enemies.js`
  (hitInset). `one-shot-kill.spec.mjs` will fail on all non-boss 1-shot
  asserts and on nearest-center tie-break.

## Acceptance criterios

- ✅ `bash scripts/verify.sh` → 8/8 PASS
- ✅ `tests/e2e/orientation-autopause.spec.mjs` → 11/11 PASS (R1)
- ✅ `tests/e2e/overlay-fits-viewport.spec.mjs` → 24/24 PASS (R2)
- ✅ `tests/e2e/pedagogy-card-position.spec.mjs` → 29/29 PASS (R3)
- ✅ `tests/e2e/one-shot-kill.spec.mjs` → 98/98 PASS (R4)
- ✅ `tests/e2e/pedagogy-cards.spec.mjs` → still PASS (no regression)
- ✅ `tests/e2e/modal-intermedio.spec.mjs` → still PASS (no regression)
- ✅ Pedagogical sign-off firmado (2026-09-28)

## Estimated changed lines

| Ref | Files changed | LOC delta |
|-----|---------------|-----------|
| R1 | src/ui/pause.js, src/main.js, src/i18n/es.js, styles/main.css, tests/e2e/orientation-autopause.spec.mjs | +302 / -107 |
| R2 | styles/main.css, tests/e2e/overlay-fits-viewport.spec.mjs | +167 / -188 (CSS diff vs legacy) |
| R3 | src/pedagogy/cards.js, src/pedagogy/modal-intermedio.js, styles/main.css, tests/e2e/pedagogy-card-position.spec.mjs | +407 / -15 |
| R4 | src/combat.js, src/enemies.js, tests/e2e/one-shot-kill.spec.mjs | +579 / -23 |

Total: ~1 800 LOC across 4 refinements + 4 specs.

## Notes

- All 4 commits were authored before this SDD change was created (the work
  was done directly on `main` during a pre-fase7 audit). This proposal +
  specs formalize the contract retroactively.
- No SDD changes between commit `1fd8456 docs(archive): Fase 4 + 5 + 6 cerradas`
  and this one. The audit polish lived in the commit history, not in OpenSpec.
- Pedagogical sign-off (signed 2026-09-28, see `docs/IMPLEMENTATION-STATUS.md
  §D.3`) confirms the 6 dato strings reviewed and approved by the pedagogo.
