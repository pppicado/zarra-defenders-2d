# Verify Report: fix 4 pedagogical bugs

## Status

**VERIFIED — all 4 fixes implemented + tested. `verify.sh` 8/8 PASS.
3 critical e2e specs + 1 new spec all PASS. 0 console errors.**

## Bug-by-bug verification

### B1 — A7 desactivación lifecycle in production

**Verification** (`tests/e2e/final-screen-production.spec.mjs` — new spec):
- ✅ Stage5 final-boss setup correct: `spriteId='enemies_planta_treco_boss'`, `archetype='boss'`, `hp=30`, `lifecycle='desactivacion'`
- ✅ Killing final-boss with 30 hits emits `zarra:desactivacion` event with `detail.spriteId='enemies_planta_treco_boss'`
- ✅ Final-screen becomes visible (`aria-hidden='false'`) with title "El Valle se planta"

**Source change**: `src/levels/stage-rosters.js`
- Added `lifecycle` parameter to `_enemy()` factory (line 47-53)
- `_buildRoster()` forwards `bossEntry.lifecycle` to `_enemy()` for the boss (line 108)
- Stage5 `boss` now has `lifecycle: 'desactivacion'` (line 290)

### B2 — planta_treco boss archetype (hp:30)

**Verification** (covered by B1 spec):
- ✅ `stage5_boss_1` has `archetype='boss'` (set by `_buildRoster()` since boss entries always use 'boss' archetype)
- ✅ `hp=30` per `ARCHETYPES.boss.hp` in `src/enemies.js:155`
- ✅ Takes 30 hits to deactivate (vs 1 hit for non-boss)

**Source change**: `src/levels/stage-rosters.js`
- Stage5 `boss.spriteId` changed from `'enemies_planta_treco'` to `'enemies_planta_treco_boss'` (line 289)
- Combined with spriteId change in `assets/sprites/manifest.json`

### B3 — 2 of 4 final-screen links return 404

**Verification** (Scenario 3 of new spec):
- ✅ No old 404 URLs (`/alegaciones`, `/asociacion`) present in final-screen
- ✅ All 3 `<a>` links return HTTP 200:
  - Plataforma: `nomacrovertederozarra.com` → 200
  - Alegaciones: Valencia Plaza "Crece el rechazo..." → 200
  - Asociación: Las Provincias "La plataforma acuerda..." → 200
- ✅ Hashtag is selectable text (no URL)

**Source change**: `src/i18n/es.js`
- `pedagogy.final.enlaces.alegaciones.url` → Valencia Plaza real article
- `pedagogy.final.enlaces.alegaciones.label` → "Movilización vecinal y alegaciones"
- `pedagogy.final.enlaces.asociacion.url` → Las Provincias real article
- `pedagogy.final.enlaces.asociacion.label` → "Plataforma y tejido asociativo"

### B4 — Final-screen listener discrimination

**Verification** (covered by B1 spec + regression on `?test=1` mode):
- ✅ `?test=1` mode (TEST_LEVEL uses `enemies_planta_treco` with `lifecycle:'desactivacion'`): `final-screen.spec.mjs` PASS (regression)
- ✅ Production mode (stage-rosters uses `enemies_planta_treco_boss` with `lifecycle:'desactivacion'`): `final-screen-production.spec.mjs` PASS

**Source change**: `src/pedagogy/final-screen.js` + `src/main.js`
- `FINAL_BOSS_SPRITE_ID` (string) → `FINAL_BOSS_SPRITE_IDS` (array of 2 strings)
- `src/main.js:441` uses `FINAL_BOSS_SPRITE_IDS.includes(detail.spriteId)` instead of `===`

## Structural verification

```
$ bash scripts/verify.sh
✓ PASS  STRINGS references = 84
✓ PASS  Spanish prose leaks = 0
✓ PASS  sprites = 27
✓ PASS  stages = 5
✓ PASS  fuente: data entries = 6
✓ PASS  https:// literals outside i18n = 0
✓ PASS  desactivacion lifecycle = 2  (test-level + stage-rosters)
✓ PASS  console.* leaks = 0
verify.sh: 8 PASS, 0 FAIL
```

## No-regression check (existing e2e specs)

```
PASS smoke.spec.mjs
PASS one-shot-kill.spec.mjs                  (98/98 asserts)
PASS pedagogy-card-position.spec.mjs        (29/29 asserts)
PASS orientation-autopause.spec.mjs          (11/11 asserts)
PASS overlay-fits-viewport.spec.mjs          (24/24 asserts)
PASS final-screen.spec.mjs                  (?test=1 mode regression)
PASS final-screen-production.spec.mjs        (new, 3 scenarios + 3 link checks)
```

## Pedagogical sign-off

The 4 fixes preserve the existing sign-off (2026-09-28) and add:
- ✅ Production mode now triggers final-screen correctly (previously broken)
- ✅ Boss fight now requires 30 hits (previously 1 hit — anti-climactic)
- ✅ All 4 final-screen URLs are real (previously 2 were 404)

The pedagogical contract is fully restored in production.

## Issues found

**None.** All 4 bugs cleanly resolved. 0 CRITICAL, 0 WARNING, 0 SUGGESTION issues.
