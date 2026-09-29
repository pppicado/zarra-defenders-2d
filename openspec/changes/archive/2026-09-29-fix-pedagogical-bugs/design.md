# Design: fix 4 pedagogical bugs

## Archivos a tocar

| Archivo | Cambio |
|---|---|
| `src/levels/stage-rosters.js` | Agregar parámetro `lifecycle` a `_enemy()` y `_buildRoster()`. Para el boss del stage5: `lifecycle:'desactivacion'` + cambiar spriteId a `enemies_planta_treco_boss` + cambiar `archetype:'mini-boss'` → `'boss'`. |
| `src/levels/stage-rosters.js` | Para los mini-bosses `enemies_planta_treco` de stages 1-4: nada (siguen como están, no se desactivan). |
| `src/pedagogy/final-screen.js` | Cambiar `FINAL_BOSS_SPRITE_ID = 'enemies_planta_treco'` → `'enemies_planta_treco_boss'`. |
| `src/i18n/es.js` | Cambiar URL de `final.enlaces.alegaciones` y `final.enlaces.asociacion`. Ajustar labels. |
| `assets/sprites/manifest.json` | Agregar entry `enemies_planta_treco_boss` con `path: assets/sprites/enemies_planta_treco.png` (reuso del mismo PNG). |
| `tests/e2e/final-screen-production.spec.mjs` | Spec nuevo: validar final-screen aparece cuando se mata `enemies_planta_treco_boss` en production mode. |

## Cambios en código

### `src/levels/stage-rosters.js`

```js
// Antes (línea 46-48):
function _enemy(archetype, isoX, isoY, spriteId, idSuffix, spawnTimeSec) {
  return { archetype, isoX, isoY, spriteId, id: idSuffix, spawnTimeSec }
}

// Después:
function _enemy(archetype, isoX, isoY, spriteId, idSuffix, spawnTimeSec, lifecycle) {
  const def = { archetype, isoX, isoY, spriteId, id: idSuffix, spawnTimeSec }
  if (lifecycle) def.lifecycle = lifecycle
  return def
}
```

```js
// Antes (línea 103-106):
const bossEntry = boss
const bossDepth = bossEntry.isoX + bossEntry.isoY
const bossSpawnTime = Math.max(0, ((bossDepth - 5) / 72) * 120)
items.push(_enemy('boss', bossEntry.isoX, bossEntry.isoY, bossEntry.spriteId, bossEntry.id, bossSpawnTime))

// Después: pasar lifecycle del bossEntry
items.push(_enemy('boss', bossEntry.isoX, bossEntry.isoY, bossEntry.spriteId, bossEntry.id, bossSpawnTime, bossEntry.lifecycle))
```

```js
// Antes (stage5, líneas 275-285):
boss: {
  id: 'stage5_boss_1',
  isoX: 35, isoY: 36,
  spriteId: 'enemies_planta_treco',
  secondary: {
    id: 'stage5_boss_2',
    isoX: 36, isoY: 35,
    spriteId: 'enemies_sello_burocratico',
  },
},

// Después:
boss: {
  id: 'stage5_boss_1',
  isoX: 35, isoY: 36,
  spriteId: 'enemies_planta_treco_boss',     // ← spriteId único para el listener
  archetype: 'boss',                          // ← redundante con _buildRoster, pero explícito
  lifecycle: 'desactivacion',                  // ← fix B1
  secondary: {
    id: 'stage5_boss_2',
    isoX: 36, isoY: 35,
    spriteId: 'enemies_sello_burocratico',
  },
},
```

**Nota sobre `archetype`**: el factory `_buildRoster` siempre pasa `'boss'` al `_enemy` para el boss principal (línea modificada arriba). Por lo tanto el `archetype:'boss'` en el literal del stage5 es redundante pero se mantiene por claridad documental.

### `src/pedagogy/final-screen.js`

```js
// Antes (línea 28):
const FINAL_BOSS_SPRITE_ID = 'enemies_planta_treco'

// Después:
const FINAL_BOSS_SPRITE_ID = 'enemies_planta_treco_boss'
```

### `src/i18n/es.js`

```js
// Ver src/i18n/es.js líneas 302-309 (ya editado en este pase)
```

### `assets/sprites/manifest.json`

```json
"enemies_planta_treco_boss": {
  "path": "assets/sprites/enemies_planta_treco.png",
  "archetype": "boss",
  "real": true,
  "note": "Fase 7.3 — spriteId distinto para el final-boss del stage5 (mismo PNG que enemies_planta_treco). Permite al listener del final-screen discriminar entre mini-boss planta_treco (stages 1-4) y final-boss (stage 5)."
}
```

## Specs a actualizar

| Spec | Cambio |
|---|---|
| `openspec/specs/stage-rosters/spec.md` | Agregar campo `lifecycle` opcional al factory + nota sobre final-boss `planta_treco_boss`. |
| `openspec/specs/scrolling-background/spec.md` o nueva spec `final-screen-contract` | Documentar que final-screen solo se dispara cuando `spriteId === 'enemies_planta_treco_boss'`. |

## Tests a añadir/modificar

### Nuevo: `tests/e2e/final-screen-production.spec.mjs`

Specs mínimos:
1. Arrancar en `?stage=stage5-acuifero` (production mode, no test mode).
2. Matar al `enemies_planta_treco_boss` del stage5.
3. Verificar que `final-screen` se vuelve visible (no `hidden`).
4. Verificar que los 4 enlaces (plataforma, alegaciones, asociación, hashtag) renderizan con URLs no-404.

### Test existente: `tests/e2e/final-screen.spec.mjs`

Sigue funcionando porque TEST_LEVEL sigue usando `enemies_planta_treco` con
`lifecycle:'desactivacion'` (test-level.js líneas 173-186). Verificar que no
se rompe. **OJO**: el listener actual discrimina por spriteId
`enemies_planta_treco_boss`, no por `enemies_planta_treco`. Si el test
existente mata un `planta_treco` de TEST_LEVEL, el listener NO disparará
final-screen porque el spriteId es `enemies_planta_treco` (no `_boss`).

**Decisión**: actualizar `test-level.js` para que sus `planta_treco` con
`lifecycle:'desactivacion'` también usen el spriteId `enemies_planta_treco_boss`.
O: añadir un TEST_LEVEL separado. O: cambiar el listener para que también
matche `enemies_planta_treco` con `lifecycle:'desactivacion'` (más flexible).

**Recomendación pragmática**: cambiar el listener para que matche por `lifecycle`:
si el boss destruido tiene `lifecycle === 'desactivacion'` Y
`spriteId === 'enemies_planta_treco'` O `spriteId === 'enemies_planta_treco_boss'`,
disparar final-screen. Esto preserva TEST_LEVEL tal cual y funciona para
stage-rosters.js con el spriteId nuevo.

Pero esa lógica complica el listener. Más simple: cambiar spriteId en
TEST_LEVEL también (líneas 173-186 → `enemies_planta_treco_boss`). El cambio
es mínimo: solo en las líneas que tienen `spriteId: 'enemies_planta_treco'`
Y `lifecycle: 'desactivacion'`.

**Decisión final**: cambiar el listener para que matche por **ambos spriteIds**:
```js
if (detail.spriteId !== FINAL_BOSS_SPRITE_ID) return
```
donde
```js
const FINAL_BOSS_SPRITE_IDS = ['enemies_planta_treco', 'enemies_planta_treco_boss']
```
Esto preserva TEST_LEVEL sin tocarlo y funciona para ambos casos.

## Compatibility con código existente

- **`src/main.js:maybeFireVictory()`** (líneas 894-927): busca `finalBossId`
  via `getRosterForStage(bg.stageId).finalBossId`. El final-boss del stage5
  sigue siendo `stage5_boss_1`, solo cambia su spriteId. **No requiere cambio.**
- **`src/enemies.js:markDesactivated()`** (líneas 339-360): emite
  `zarra:desactivacion` con `{enemyId, spriteId}`. El listener del
  final-screen discrimina por `spriteId`. **No requiere cambio.**
- **`src/ui/overlay.js`** (líneas 169, 326, etc.): usan `TEST_LEVEL` para
  `?test=1` mode y `getRosterForStage(bg.stageId)` para production. **No
  requiere cambio.**
- **`tests/e2e/final-screen.spec.mjs`**: testea el flow completo de
  final-screen en `?test=1` mode. Como cambia `FINAL_BOSS_SPRITE_IDS`, el
  listener matchea por `enemies_planta_treco` también (manteniendo
  retrocompatibilidad). **No requiere cambio.**

## Verification plan

1. `bash scripts/verify.sh` → 8/8 PASS
2. `tests/e2e/final-screen.spec.mjs` → PASS (sin cambios)
3. `tests/e2e/final-screen-production.spec.mjs` (nuevo) → PASS
4. `tests/unit/levels-stage-rosters.spec.mjs` → PASS (sin cambios; verifica
   composición de roster, no spriteId específico)
5. `tests/e2e/one-shot-kill.spec.mjs` → PASS (sin cambios; apunta a sello,
   no a planta)
6. Todos los demás 29 e2e specs → PASS (sin cambios)
7. Test manual con Playwright: arrancar `http://127.0.0.1:8000/?stage=stage5-acuifero&test=1`,
   ir al final del rail, matar al boss `enemies_planta_treco_boss`, verificar
   que final-screen aparece.
