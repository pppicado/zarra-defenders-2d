# Tasks: fix 4 pedagogical bugs

## Phase 1: Implement fixes (1 sesión)

- [ ] **T1.1** Modificar `src/levels/stage-rosters.js`:
  - [ ] T1.1a: agregar parámetro `lifecycle` opcional a `_enemy()` (línea 46-48)
  - [ ] T1.1b: pasar `lifecycle` en la llamada del boss principal en `_buildRoster()` (línea 103-106)
  - [ ] T1.1c: en el stage5 `boss:` cambiar `spriteId: 'enemies_planta_treco'` → `'enemies_planta_treco_boss'` y agregar `lifecycle: 'desactivacion'` (líneas 275-285)

- [ ] **T1.2** Modificar `src/pedagogy/final-screen.js`:
  - [ ] T1.2a: cambiar `const FINAL_BOSS_SPRITE_ID = 'enemies_planta_treco'` → `const FINAL_BOSS_SPRITE_IDS = ['enemies_planta_treco', 'enemies_planta_treco_boss']`
  - [ ] T1.2b: actualizar el listener en `main.js:437` para que use `FINAL_BOSS_SPRITE_IDS.includes(detail.spriteId)` en vez de `=== FINAL_BOSS_SPRITE_ID`

- [ ] **T1.3** Modificar `src/i18n/es.js` (ya editado en este pase):
  - ✅ URL `alegaciones` → `https://valenciaplaza.com/.../crece-el-rechazo-contra-el-macrovertedero-zarra-tras-la-ultima-concentracion-de-casi-mil-personas`
  - ✅ URL `asociacion` → `https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html`
  - ✅ Label `alegaciones` → "Movilización vecinal y alegaciones"
  - ✅ Label `asociacion` → "Plataforma y tejido asociativo"

- [ ] **T1.4** Modificar `assets/sprites/manifest.json`:
  - [ ] T1.4a: agregar entry `enemies_planta_treco_boss` con `path: assets/sprites/enemies_planta_treco.png`

## Phase 2: Add production-mode spec (0.5 sesión)

- [ ] **T2.1** Crear `tests/e2e/final-screen-production.spec.mjs`:
  - [ ] T2.1a: arrancar en `http://127.0.0.1:8000/?stage=stage5-acuifero&unlock=all`
  - [ ] T2.1b: usar `__gameTestAPI__.tick()` para avanzar al final del rail
  - [ ] T2.1c: matar al `enemies_planta_treco_boss` con `fireAtIso()`
  - [ ] T2.1d: assert que `#final-screen` tiene `aria-hidden="false"`
  - [ ] T2.1e: assert que los 4 enlaces están presentes con URLs no-404 (validar vía fetch HEAD a las URLs reales o assert que la URL no contiene `nomacrovertederozarra.com/alegaciones` ni `/asociacion`)

## Phase 3: Verification (0.5 sesión)

- [ ] **T3.1** `bash scripts/verify.sh` → 8/8 PASS
- [ ] **T3.2** `node tests/unit/levels-stage-rosters.spec.mjs` → PASS
- [ ] **T3.3** `TEST_URL=http://127.0.0.1:8000/?test=1 node tests/e2e/final-screen.spec.mjs` → PASS (sin cambios)
- [ ] **T3.4** `TEST_URL=http://127.0.0.1:8000/?test=1&stage=stage5-acuifero node tests/e2e/final-screen-production.spec.mjs` → PASS (nuevo)
- [ ] **T3.5** `TEST_URL=http://127.0.0.1:8000/?test=1 node tests/e2e/one-shot-kill.spec.mjs` → PASS (sin cambios)
- [ ] **T3.6** Ejecutar los demás 28 e2e specs en `?test=1` mode → todos PASS
- [ ] **T3.7** Validar las 4 URLs del final-screen con `curl -L` desde el sandbox → 200 OK

## Phase 4: Update docs (0.5 sesión)

- [ ] **T4.1** `docs/IMPLEMENTATION-STATUS.md`:
  - [ ] T4.1a: eliminar §K.1, §K.2, §K.3, §K.4 (bugs resueltos)
  - [ ] T4.1b: actualizar §L para reflejar que las 4 URLs del final-screen son 200
  - [ ] T4.1c: agregar nota en §J: "Bugs pedagógicos K resueltos en change 2026-09-29-fix-pedagogical-bugs"

- [ ] **T4.2** `docs/ROADMAP.md`:
  - [ ] T4.2a: marcar el change como cerrado en el resumen ejecutivo

- [ ] **T4.3** `docs/VISION.md`:
  - [ ] T4.3a: actualizar §7.1: `planta_treco` con `archetype:'boss'` (hp:30)
  - [ ] T4.3b: actualizar §10.4 (Pedagogía A5/A7) para reflejar que A7 funciona en production
  - [ ] T4.3c: eliminar §13 (ya está resuelto)

- [ ] **T4.4** `docs/MANUAL_PLAYTHROUGH.md`:
  - [ ] T4.4a: actualizar §12.6 (final-screen sign-off): los 4 enlaces están OK ahora
  - [ ] T4.4b: eliminar la nota ⚠️ sobre bugs pedagógicos del §12

- [ ] **T4.5** `docs/PLAN.md`:
  - [ ] T4.5a: actualizar el banner histórico: quitar la nota sobre bugs

- [ ] **T4.6** `README.md`:
  - [ ] T4.6a: eliminar la nota ⚠️ sobre bugs pedagógicos (están resueltos)
  - [ ] T4.6b: actualizar el changelog con la entrada del fix

## Phase 5: Archive SDD change (0.25 sesión)

- [ ] **T5.1** Crear `openspec/changes/2026-09-29-fix-pedagogical-bugs/verify-report.md` con resultados de los tests
- [ ] **T5.2** Crear `openspec/changes/2026-09-29-fix-pedagogical-bugs/archive-report.md` con verdict PASS
- [ ] **T5.3** Mover el change de `openspec/changes/` a `openspec/changes/archive/`
- [ ] **T5.4** Commit con conventional commit + push
- [ ] **T5.5** Tag `v1.0.0` (opcional, decisión del usuario)

## Acceptance criteria

- ✅ Los 4 bugs pedagógicos §K resueltos
- ✅ `verify.sh` 8/8 PASS
- ✅ Todos los e2e specs (32 totales, 31 originales + 1 nuevo) PASS
- ✅ Todos los unit specs (17) PASS
- ✅ Las 4 URLs del final-screen devuelven 200 OK verificadas con `curl -L`
- ✅ Las 5 URLs de fuentes pedagógicas siguen devolviendo 200
- ✅ `?test=1` mode sigue funcionando (TEST_LEVEL intacto)
- ✅ production mode (stage5-acuifero) ahora dispara final-screen correctamente
