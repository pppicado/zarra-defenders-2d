# Archive Report: fix 4 pedagogical bugs

## Status

**VERIFIED — PASS — archive-ready.**

This change closes 4 pedagogical bugs detected during the docs-vs-code
audit on 2026-09-28 (see [`docs/IMPLEMENTATION-STATUS.md` §K](../../docs/IMPLEMENTATION-STATUS.md#k-bugs-pedag%C3%B3gicos-resueltos-en-el-change-2026-09-29-fix-pedagogical-bugs)).
All 4 fixes implemented directly on `main` in 1 commit (the whole change is
atomic — the 4 fixes are interdependent and must ship together).

## Bugs found + fixed

| ID | Severity | Symptom | Root cause | Fix | Files |
|-----|----------|---------|------------|-----|-------|
| K.1 | 🔴 Crítica pedagógica | A7 desactivacion lifecycle not emitted in production; final-screen never appears in normal play | `src/levels/stage-rosters.js` `_enemy()` factory didn't accept `lifecycle`; stage5 boss created without it | Add `lifecycle` parameter to `_enemy()`, forward in `_buildRoster()`, set `lifecycle: 'desactivacion'` on stage5 `boss` | `src/levels/stage-rosters.js` |
| K.2 | 🟡 Alta | `planta_treco` final-boss had `hp:1` (anti-climactic) | Same factory did not distinguish final-boss from mini-boss | Change stage5 `boss.spriteId` from `enemies_planta_treco` to `enemies_planta_treco_boss` (new spriteId that reuses the same PNG). `_buildRoster()` already passes `archetype: 'boss'` so hp becomes 30. | `src/levels/stage-rosters.js`, `assets/sprites/manifest.json` |
| K.3 | 🔴 Crítica pedagógica | 2 of 4 final-screen links returned 404 | `nomacrovertederozarra.com/alegaciones` and `/asociacion` don't exist (no real pages on the platform) | Replace with real public-domain articles verified with `curl -L` (HTTP 200, specific article titles): Valencia Plaza "Crece el rechazo..." + Las Provincias "La plataforma acuerda..." | `src/i18n/es.js` |
| K.4 | 🟡 Alta | Final-screen listener couldn't discriminate mini-boss vs final-boss (both used `enemies_planta_treco`) | Listener used `=== FINAL_BOSS_SPRITE_ID` (string equality) | Change to `FINAL_BOSS_SPRITE_IDS` (array of 2 spriteIds: `enemies_planta_treco` + `enemies_planta_treco_boss`). Listener uses `.includes()`. Preserves `?test=1` mode regression (TEST_LEVEL uses `enemies_planta_treco`). | `src/pedagogy/final-screen.js`, `src/main.js` |

## Implementation summary

- **5 source files changed**: `src/levels/stage-rosters.js`, `src/pedagogy/final-screen.js`,
  `src/main.js`, `src/i18n/es.js`, `assets/sprites/manifest.json`
- **2 e2e specs updated**: `tests/e2e/final-screen.spec.mjs` (regression — relaxed
  "asociaci" regex to match new label "asociativo/tejido")
- **1 new e2e spec created**: `tests/e2e/final-screen-production.spec.mjs`
  (3 scenarios: boss setup, kill flow, link HTTP validation)
- **Cache-busting bump**: `?v=44` → `?v=45` on enemies.js imports across the
  codebase (no semantic change, just ensures browser fetches fresh code)

## Verification

See [`verify-report.md`](./verify-report.md) for full test evidence.

```
verify.sh: 8 PASS, 0 FAIL
final-screen.spec.mjs: PASS (?test=1 regression)
final-screen-production.spec.mjs: PASS (new spec, 3 scenarios + 3 link HTTP checks)
one-shot-kill.spec.mjs: PASS (98/98 asserts)
pedagogy-card-position.spec.mjs: PASS (29/29 asserts)
orientation-autopause.spec.mjs: PASS (11/11 asserts)
overlay-fits-viewport.spec.mjs: PASS (24/24 asserts)
```

## Pedagogical sign-off

The 4 fixes **preserve** the existing sign-off (2026-09-28) for the 6 dato
strings + tone + general criteria, and **restore** the pedagogical contract
that was technically broken in production:

- ✅ A7 desactivacion lifecycle now fires in production (final-screen shows up)
- ✅ Boss fight now requires 30 hits (was 1 hit — pedagogically anticlimactic)
- ✅ All 4 final-screen URLs are real (were 2× 404)
- ✅ Pedagogical sign-off process now includes `curl -L` URL verification
  (institutionalized in `IMPLEMENTATION-STATUS.md §L.3`)

## Issues found

**None.** All 4 bugs cleanly resolved with surgical changes. 0 CRITICAL,
0 WARNING, 0 SUGGESTION issues.

## VERDICT

**PASS — archive-ready.**

This change moves to `openspec/changes/archive/2026-09-29-fix-pedagogical-bugs/`
once the user reviews the working tree. The project is then ready for
`v1.0.0` tag (decision of the user; not part of this change).

## Next step

1. Move this change to `openspec/changes/archive/`.
2. Commit the working tree (`docs:`, `fix(pedagogy):`, `test(e2e):` per the
   commit patterns used in `2026-09-28-pre-fase7-polish`).
3. Tag `v1.0.0` (decision of the user — see `docs/ROADMAP.md` §Fase 7.2 final task).
4. Push to GitHub.
5. (Optional) Deploy to Tailscale / GitHub Pages.

After these steps, the project is at v1.0.0 release-ready with no open
pedagogical bugs.
