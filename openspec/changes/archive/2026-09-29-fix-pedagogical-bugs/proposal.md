# Proposal: fix 4 pedagogical bugs (post-sign-off audit)

## Intent

Una auditoría docs-vs-código realizada el 2026-09-28 detectó 4 bugs pedagógicos
críticos que NO se detectaron en el sign-off del 2026-09-28 (ver
[`docs/IMPLEMENTATION-STATUS.md` §K](../../docs/IMPLEMENTATION-STATUS.md#k-bugs-pedag%C3%B3gicos-conocidos-bloqueantes)).
Este change los arregla retroactivamente para que el proyecto pueda llegar a
v1.0.0 sin bugs pedagógicos abiertos.

## Bugs a corregir

| ID | Bug | Severidad | Dominio |
|-----|-----|-----------|---------|
| B1 | **Contrato A7 desactivación NO se dispara en producción** — el final-screen pedagógico ("El Valle se planta" con dato + 4 enlaces) no aparece cuando se mata `planta_treco` en cualquier stage de producción. Solo funciona en `?test=1` mode. | 🔴 Crítica pedagógica | `src/levels/stage-rosters.js` + listener |
| B2 | **`planta_treco` con `hp:1` (no `hp:30`)** — se carga como `archetype:'mini-boss'` (hp:1) en vez de `archetype:'boss'` (hp:30). El "boss fight" dramático no existe en la práctica: muere en 1 disparo. | 🟡 Alta | `src/levels/stage-rosters.js` |
| B3 | **2 de los 4 enlaces del final-screen dan 404** — `nomacrovertederozarra.com/alegaciones` y `/asociacion` no existen (no son páginas reales de la plataforma vecinal). | 🔴 Crítica pedagógica | `src/i18n/es.js` `pedagogy.final.enlaces` |
| B4 | **`planta_treco` no se discrimina del final-boss** — los 5 stages tienen un mini-boss `planta_treco` (stages 1-4) más el final-boss `planta_treco` (stage 5). Si todos se desactivan, los de stages 1-4 también dispararían final-screen. | 🟡 Alta (necesario para que B1 funcione sin falsos positivos) | `src/pedagogy/final-screen.js` |

## Approach

1. **B4** (resuelve el "false positive" del listener): cambiar el spriteId del
   final-boss del stage5 a `enemies_planta_treco_boss` (mismo PNG
   `enemies_planta_treco.png`, spriteId distinto). El listener de final-screen
   usa `spriteId === FINAL_BOSS_SPRITE_ID` para discriminar. Stages 1-4 siguen
   usando `enemies_planta_treco` (mini-boss estático sin desactivación).
2. **B1** (root cause): agregar parámetro `lifecycle` opcional al factory
   `_enemy()` en `src/levels/stage-rosters.js`, y setear
   `lifecycle:'desactivacion'` solo en el boss del stage5.
3. **B2**: cambiar `archetype:'mini-boss'` → `archetype:'boss'` para el
   final-boss del stage5 (hp:1 → hp:30).
4. **B3**: reemplazar las 2 URLs 404 por comunicados públicos reales
   verificados con `curl -L` (HTTP 200, título específico):
   - `alegaciones` → Valencia Plaza "Crece el rechazo..." (movilización)
   - `asociacion` → Las Provincias "La plataforma acuerda..." (tejido asociativo)
5. Update `assets/sprites/manifest.json` para reflejar el nuevo spriteId.
6. Tests: añadir spec e2e que valide el final-screen aparece cuando se mata
   `enemies_planta_treco_boss` en production.

## Why now

- El proyecto está en pre-release (`sdd-archive` ya cerrado el 2026-09-28 con
  verdict PASS, pendiente tag `v1.0.0`).
- Resolver estos bugs es **bloqueante pedagógico** — sin B1 el cierre cívico
  del juego (4 enlaces a plataforma + alegaciones + asociación + final screen)
  no se muestra en production.
- B3 es bloqueante de credibility pedagógica: 2 enlaces rotos en la pantalla
  final contradicen el principio de "fuentes públicas verificables".
- B2 es cosmético pero importante: el "boss fight" dramático es parte del
  tono heroico-esperanzado (no catastrofista) del proyecto.

## Out of scope

- Crear las páginas reales `/alegaciones` y `/asociacion` en
  `nomacrovertederozarra.com` — depende del equipo de la Plataforma vecinal,
  no del proyecto.
- Refactor de los 6 mini-bosses `planta_treco` en TEST_LEVEL (test-level.js
  líneas 173-186) — sigue funcionando en `?test=1` mode, no afecta production.
- Refactor de cómo se detecta el "final-boss death" en
  `main.js:maybeFireVictory()` (líneas 894-927) — funciona correctamente con
  el fix; no requiere cambios.

## Compatibility

- **No rompe** tests existentes (`one-shot-kill.spec.mjs` apunta a
  `enemies_sello_burocratico`, no a `planta_treco`).
- **No rompe** e2e specs (`final-screen.spec.mjs` testea el screen en `?test=1`
  donde TEST_LEVEL sigue intacto).
- **Sí cambia** el listener `zarra:desactivacion` para que solo se dispare el
  final-screen con el spriteId nuevo `enemies_planta_treco_boss`. Esto es
  correcto pedagógicamente: stages 1-4 NO deben disparar final-screen al matar
  a un mini-boss `planta_treco`.
- **Cambia** los labels de los enlaces del final-screen para que coincidan
  con el contenido real de las URLs.
