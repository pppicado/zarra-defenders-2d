# Roadmap priorizado — zarra-defenders-2d

> **Plan de implementación** para llevar al juego de "técnicamente completo pero pedagógicamente vacío" → "juego pedagógicamente completo y archivable bajo SDD".
>
> **Última actualización**: 2026-09-23 (F3.2 marcada como rechazada; F3.1 implementada)
>
> **Criterios de decisión**:
> - **T-shirt sizing**: S (1 sesión), M (2-3 sesiones), L (4-6 sesiones), XL (>1 semana)
> - **Prioridad MoSCoW**: 🔴 Must, 🟠 Should, 🟡 Could, ⚪ Won't (this iteration)
> - **Bloqueante pedagógico**: el proyecto sin esto viola el contrato cívico
> - **Bloqueante técnico**: el proyecto sin esto no compila/rompe algo
> - **Bloqueante de archive**: el proyecto sin esto no puede pasar por `sdd-archive`

---

## Resumen ejecutivo del roadmap

| Fase | Nombre | T-shirt | Prioridad | Bloqueante | Estado |
|---|---|---|---|---|---|
| **0** | Pre-flight (quick wins) | S | 🔴 Must | — | 🔲 Por hacer |
| **1** | Pedagogía core (la "pía" del juego) | L | 🔴 Must | Pedagógico | 🔲 Por hacer |
| **2** | Aceptación formal (SDD) | M | 🔴 Must | Archive | 🔲 Por hacer |
| **3** | Polish pedagógico + UX | M | 🟠 Should | — | 🔲 Por hacer |
| **4** | Audio (jota regional + SFX) | L | 🟠 Should | — | 🔲 Por hacer |
| **5** | Accesibilidad + sharing | M | 🟡 Could | — | 🔲 Por hacer |
| **6** | Per-stage rosters + menú visuals | L | 🟡 Could | — | 🔲 Por hacer |
| **7** | v1 release + archive | S | 🔴 Must | — | 🔲 Por hacer |

**Total estimado**: ~12-17 sesiones de trabajo (3-4 semanas).

---

## Fase 0 — Pre-flight (quick wins)

**Goal**: desbloquear trabajo pedagógico y aplicar contratos del 3D que son triviales.

| Tarea | T-shirt | Prioridad | Dependencias | Entregable |
|---|---|---|---|---|
| **0.1** Copiar `research/fuentes.md` del 3D al 2D | S | 🔴 Must | — | `/research/fuentes.md` con las 6 fuentes verificadas |
| **0.2** Fix bug `?v=26` → `?v=44` en `tests/unit/integrity.spec.mjs` | S | 🟡 Could | — | 7/7 PASS en integrity.spec.mjs |
| **0.3** Regenerar sprite `camion_cisterna_residuos.png` (reemplazar placeholder 390 bytes) | S | 🟠 Should | minimax MCP | `assets/sprites/enemies_camion_cisterna_residuos.png` real (~200 KB) |
| **0.4** Crear `src/engine/dom-debug.js` con `__zr` utility | S | 🔴 Must | — | Aplica A8 contrato 3D |
| **0.5** Refactor `console.*` existentes a `__zr.warn`/`__zr.error` | S | 🔴 Must | 0.4 | 0 `console.*` fuera de `dom-debug.js` |
| **0.6** Crear `src/i18n/es.js` skeleton con tabla plana | M | 🔴 Must | — | Estructura `STRINGS = { menu, overlay, hud, pedagogy, audio, ... }` |
| **0.7** Refactor strings hardcoded (`ui/menu.js:48,58,61`, `ui/overlay.js:103-104,139`, `ui/hud.js`) a `STRINGS.*` | M | 🔴 Must | 0.6 | Aplica A2 contrato 3D |

**Acceptance criterios Fase 0**:
- ✅ `research/fuentes.md` existe con 6 fuentes verbatim del 3D
- ✅ `node tests/unit/integrity.spec.mjs` → 7/7 PASS
- ✅ `__zr.debug = true` activa logs (con `?debug=1`)
- ✅ `grep -rn "console\." src/` solo encuentra en `src/engine/dom-debug.js`
- ✅ `grep -rn "console\." src/ | grep -v "engine/dom-debug.js"` → 0 matches
- ✅ Todos los strings en castellano referencian `STRINGS.*`

**Estimación**: 1 sesión completa.

---

## Fase 1 — Pedagogía core (la pieza central del proyecto)

**Goal**: implementar los 6 mecanismos pedagógicos que hacen al juego un **altavoz de la lucha vecinal**, no un rail shooter vacío.

### 1.1 Cards pedagógicas in-game

**T-shirt**: M (~300-600 LOC)
**Prioridad**: 🔴 Must
**Dependencias**: Fase 0 (STRINGS centralizado + `research/fuentes.md`)

**Tareas**:
1. Crear `src/pedagogy/es.js` con los 6 datos (texto + fuente + URL)
2. Crear `src/pedagogy/cards.js` con clase `Card` (DOM overlay flotante)
3. En `src/combat.js`, escuchar evento `combat:hit` y disparar `cards.p.show(enemyId)`
4. Card UI: título + descripción + fuente citada como link clickeable + botón 🔊 TTS (Fase 5) + auto-dismiss 3s
5. Acumular cards en `score.cardsShown[]` para biblioteca y resumen final

**Acceptance criterios**:
- ✅ Al destruir cualquier enemigo, aparece card flotante con dato del conflicto + fuente
- ✅ Click en link de fuente abre nueva pestaña a la URL verificada
- ✅ Card se auto-dismiss a los 3s
- ✅ Score persiste array de `cardsShown` por stage
- ✅ 6 unit tests en `tests/unit/pedagogy-cards.spec.mjs`

**Archivos afectados**:
- `src/pedagogy/es.js` (NUEVO)
- `src/pedagogy/cards.js` (NUEVO)
- `src/combat.js` (modificar ~20 líneas para emitir evento)
- `src/score.js` (modificar para persistir `cardsShown`)
- `src/main.js` (wire card listener)
- `tests/unit/pedagogy-cards.spec.mjs` (NUEVO)

### 1.2 Modal intermedio cada 5 enemigos

**T-shirt**: S (~150 LOC)
**Prioridad**: 🟠 Should
**Dependencias**: 1.1 (cards subsystem)

**Tareas**:
1. Crear `src/pedagogy/modal-intermedio.js`
2. Trigger: cada 5 enemigos destruidos en stage
3. Overlay 5s con dato acumulado ("Has destruido 5 lixiviados, contaminando ~1000 L del río Cabriel")
4. Texto vivir en `STRINGS.pedagogy.modalIntermedio.{stageId}.{threshold}`

**Acceptance criterios**:
- ✅ Cada 5 enemigos aparece overlay con resumen acumulativo
- ✅ Texto se dismiss automáticamente a los 5s o con click
- ✅ Modal no bloquea disparo (pass-through de clicks)

### 1.3 Resumen completo navegable al final del stage

**T-shirt**: M (~400 LOC)
**Prioridad**: 🟠 Should
**Dependencias**: 1.1, 1.2

**Tareas**:
1. Crear `src/pedagogy/resumen-final.js`
2. Trigger: `stage:cleared` event ya emitido en `src/main.js:547-557`
3. Overlay con stack navegable de cards (prev/next + scroll)
4. Mostrar: total firmas, + cards mostradas, + mejor firma per stage, + fuentes citadas
5. Botones: "Volver al menú" + "Reintentar" + "Compartir" (Fase 5)

**Acceptance criterios**:
- ✅ Al completar un stage aparece overlay con todas las cards del stage
- ✅ Navegación prev/next funcional
- ✅ Click en fuente abre URL
- ✅ Persiste en `localStorage` (`zarra2d:cards:stage_<n>`)

### 1.4 Biblioteca pedagógica accesible desde menú

**T-shirt**: M (~300 LOC)
**Prioridad**: 🟠 Should
**Dependencias**: 1.1, 1.3

**Tareas**:
1. Crear `src/pedagogy/biblioteca.js`
3. Botón "Biblioteca" en main menu (`src/ui/menu.js`)
4. Modal fullscreen con grid de todas las cards desbloqueadas
5. Persistir en `localStorage` (`zarra2d:biblioteca:unlocked`)
6. Filtros: por stage, por fuente, por favorito

**Acceptance criterios**:
- ✅ Main menu tiene botón "Biblioteca"
- ✅ Modal muestra todas las cards desbloqueadas en partidas previas
- ✅ Click en card abre detalle
- ✅ Filtros funcionales

### 1.5 Dato pre-nivel con citation + botón Continuar

**T-shirt**: S (~200 LOC)
**Prioridad**: 🟠 Should
**Dependencias**: 1.1

**Tareas**:
1. Crear `src/pedagogy/data-screen.js`
2. Trigger: al iniciar un stage (después de stage select)
3. Overlay 5-10s con dato del stage + fuente + botón "Continuar"
4. Beep entry (Fase 4) opcional
5. Skip con Esc o click "Continuar"

**Acceptance criterios**:
- ✅ Al iniciar stage aparece dato screen con fuente
- ✅ Botón "Continuar" arranca gameplay
- ✅ Esc también funciona
- ✅ Sin música durante data screen (regla 3D)

### 1.6 Boss desactivación uniforme (A7 del 3D)

**T-shirt**: M (~250 LOC)
**Prioridad**: 🔴 Must (pedagógico)
**Dependencias**: 1.1, 1.5

**Tareas**:
1. En `src/levels/test-level.js`, marcar `planta_treco` con `lifecycle='desactivacion'`
2. En `src/enemies.js`, detectar lifecycle flag → animación 1.5s de desaturación + motion halt
3. NO explosión, NO debris, NO particles
4. Dispatch `zarra:desactivacion` event al completar
5. Listener abre final screen (1.7)

**Acceptance criterios**:
- ✅ `planta_treco` se desactiva con desaturación + halt, NO explota
- ✅ Evento `zarra:desactivacion` disparado
- ✅ 1 unit test verifica animación de desaturación

### 1.7 Pantalla final con 4 enlaces (REQ-14)

**T-shirt**: M (~300 LOC)
**Prioridad**: 🔴 Must (pedagógico)
**Dependencias**: 1.5, 1.6

**Tareas**:
1. Crear `src/pedagogy/final-screen.js`
2. Trigger: `zarra:desactivacion` event
3. Overlay fullscreen con:
   - Dato final del conflicto ("A fecha de hoy, la solicitud está en información pública")
   - 4 enlaces desde `STRINGS.final.enlaces.*_url`:
     - Plataforma: `nomacrovertederozarra.com`
     - Alegaciones: URL placeholder hasta que se concrete
     - Asociación: Asociación Naturalista de Ayora y la Valle
     - Hashtag: `#NoAlMacrovertederoDeZarra` (texto seleccionable)
   - Botón "Volver a jugar"
4. Sin música durante final screen (regla 3D)
5. **URLs centralizadas en `STRINGS.final.enlaces.*_url`** (A6)

**Acceptance criterios**:
- ✅ Final screen aparece tras desactivar planta_treco
- ✅ 4 enlaces visibles y funcionales
- ✅ URLs vienen de `STRINGS.final.enlaces.*_url`, NO literales
- ✅ `grep -rn "https://" src/ | grep -v "i18n/es.js"` → 0 matches

---

## Fase 2 — Aceptación formal (SDD)

**Goal**: cerrar el ciclo SDD con `MANUAL_PLAYTHROUGH.md` + `scripts/verify.sh` + pedagogical sign-off.

### 2.1 MANUAL_PLAYTHROUGH.md

**T-shirt**: M (~300 líneas markdown)
**Prioridad**: 🔴 Must (REQ-15)
**Dependencias**: Fase 1 completa

**Tareas**:
1. Crear `MANUAL_PLAYTHROUGH.md` siguiendo esqueleto del 3D
2. Secciones adaptadas:
   - **§0 Setup** — `python3 -m http.server 8000`, navegadores target
   - **§1 Smoke** — start menu → stage select → primer dato screen → primer wave
   - **§2 Combat feedback** — papeleta visible, sine flutter, homing, hit detection
   - **§3 Cards pedagógicas** — 6 checks (5 niveles + final) con texto + fuente + URL
   - **§4 Wave system** — 5 stages × waves deterministas
   - **§5 Boss system** — desactivación contract (A7)
   - **§6 Pause** — 3 botones (Continuar / Reiniciar stage / Salir al menú)
   - **§7 Game over** — 2 botones
   - **§8 Score + firmas** — localStorage best per stage
   - **§9 Cooldown + homing** — 200ms cooldown + paper flutter ±4px + lifetime 1500ms
   - **§10 Final screen** — dato + 4 enlaces (A6)
   - **§11 Light gun / mobile** — pointer movement + touch drag detection
   - **§12 Pedagogy sign-off** — 6 checks de data accuracy + citation specificity
   - **§13 Asset budget** — ≤ 2 MB runtime (excluyendo backgrounds iterativos)
   - **§14 Structural readback** — `bash scripts/verify.sh` debe pasar 8/8
   - **§15 Console discipline** — A8 zero `console.*` outside `dom-debug.js`
   - **§16 i18n isolation** — A2 zero Spanish prose outside `i18n/es.js`
   - **§17 URLs isolation** — A6 zero `https://` outside `i18n/es.js`

**Acceptance criterios**:
- ✅ MANUAL PlayTHROUGH.md creado con 17 secciones
- ✅ Cada sección tiene checkboxes para que pedagogo firme
- ✅ Sección §12 pedagógica es bloqueo de release

### 2.2 scripts/verify.sh

**T-shirt**: M (~150 líneas bash)
**Prioridad**: 🔴 Must (REQ-15, D16)
**Dependencias**: Fase 0 (i18n + console discipline)

**Tareas**:
1. Crear `scripts/verify.sh` con 8 checks adaptados al 2D:
   1. **STRINGS usage** — `grep -rn "STRINGS\." src/ | wc -l` ≥ 30
   2. **Spanish prose isolation** — `grep -rE "[áéíóúñ¿¡]" src/ | grep -v "i18n/es.js"` = 0
   3. **Sprite catalog count** — `ls assets/sprites/*.png | wc -l` ≥ 26
   4. **Background manifest** — `cat assets/backgrounds/manifest.json | jq '.stages | length'` = 5
   5. **A5 fuentes populated** — `grep -r "fuente:" src/i18n/es.js | wc -l` = 6
   6. **A6 zero https://** — `grep -rn "https://" src/ | grep -v "i18n/es.js"` = 0
   7. **A7 boss desactivación** — `grep "lifecycle.*desactivacion" src/levels/*.js` ≥ 1
   8. **A8 zero console.X** — `grep -rn "console\." src/ | grep -v "engine/dom-debug.js"` = 0
2. Exit code 0 si todo pasa
3. Output coloreado: ✅ PASS / ❌ FAIL

**Acceptance criterios**:
- ✅ `bash scripts/verify.sh` retorna exit 0
- ✅ Output muestra 8/8 PASS
- ✅ Cualquier violación A2/A6/A7/A8 marca FAIL inmediato

### 2.3 Pedagogical sign-off

**T-shirt**: S (manual)
**Prioridad**: 🔴 Must (D16)
**Dependencias**: Fase 1 completa, MANUAL_PLAYTHROUGH.md creado

**Tareas**:
1. Usuario (pedagogo) ejecuta MANUAL_PLAYTHROUGH.md end-to-end
2. Firma cada uno de los 6 datos pedagógicos (data accuracy + citation specificity + no caricature + desactivación framing)
3. Firma A5 (fuentes pre-researched), A6 (URLs centralizadas), A7 (boss desactivación), A8 (console discipline)
4. Sin sign-off, **no sdd-archive**

**Acceptance criterios**:
- ✅ 6 checks pedagógicos firmados
- ✅ 4 checks A5/A6/A7/A8 firmados
- ✅ Total: 10 sign-offs

---

## Fase 3 — Polish pedagógico + UX

**Goal**: completar la experiencia pedagógica con UX pulida, ali pedagogy, y modal overlays.

### 3.1 Pause overlay dedicado (REQ-10)

**T-shirt**: S (~150 LOC)
**Prioridad**: 🟠 Should
**Dependencias**: Fase 0 (i18n)

**Tareas**:
1. Crear `src/ui/pause.js` con overlay dedicado
2. Trigger: Esc o botón pausa durante gameplay
3. 3 botones exactos: Continuar / Reiniciar stage / Salir al menú
4. Labels desde `STRINGS.pause.*`
5. Mantiene session state (no destruye score)

**Acceptance criterios**:
- ✅ Esc durante gameplay abre pause overlay
- ✅ 3 botones funcionales
- ✅ Click fuera del overlay NO cierra (requiere acción explícita)

### 3.2 Aliados ambientales (penalizar disparo)

> ⚪ **Rechazada en esta iteración** (decisión del pedagogo, 2026-09-23).
> Ver Engram `#observation` para la rationale. Si se retoma en v2, revisar el
> conflicto pedagógico con la metáfora "cada firma = contra TRECO"; un aliado
> drenando integridad puede confundir el mensaje.

**T-shirt**: M (~300 LOC)
**Prioridad**: 🟠 Should (dejó de aplicar)
**Dependencias**: —

**Tareas**:
1. Cargar sprites `trees_*`, `buildings_*` en TEST_LEVEL
2. Marcarlos con `archetype='aliado'`, hitInset=8 (más permisivo)
3. Al dispararles: **drenar integridad** (-1 segmento) + card explicativa ("Castillo de Cofrentes: patrimonio protegido por ley. Disparar aquí te hace perder legitimidad cívica.")
4. NO emitir card pedagógica estándar (es feedback de "error")

**Acceptance criterios**:
- ✅ Trees y buildings aparecen en stages correspondientes
- ✅ Dispararles drena integridad + muestra card de feedback
- ✅ Card NO se acumula en `cardsShown` (no es dato pedagógico positivo)

### 3.3 Disclaimer TRECO modal splash + footers

**T-shirt**: S (~150 LOC)
**Prioridad**: 🟠 Should
**Dependencias**: Fase 0 (i18n)

**Tareas**:
1. Splash modal al cargar `index.html` primera vez
2. Texto completo desde `STRINGS.disclaimer.full`
3. Checkbox "No volver a mostrar" (persistir en `localStorage`)
4. Accesible siempre desde "Acerca de" (ya implementado, mejorar)
5. Footers en cada card pedagógica: "Datos basados en fuentes públicas verificables"

**Acceptance criterios**:
- ✅ Splash aparece primer load
- ✅ "No volver a mostrar" persiste
- ✅ Accesible siempre desde menú

### 3.4 Crosshair sprite real (opcional)

**T-shirt**: S (~100 LOC + asset gen)
**Prioridad**: 🟡 Could
**Dependencias**: minimax MCP

**Tareas**:
1. Generar sprite pixel art crosshair 32×32 con minimax
2. Reemplazar PIXI.Graphics actual con sprite PNG
3. Chroma-key magenta → alpha
4. Sprite solo visible durante menús/pausa (regla del 3D)

**Acceptance criterios**:
- ✅ Crosshair sprite PNG visible durante menús/pausa
- ✅ Oculto durante gameplay (mano es el indicador)

---

## Fase 4 — Audio (jota regional + SFX)

**Goal**: dar identidad sonora al Valle con música regional y SFX claros.

### 4.1 Música procedural jota regional (Fase A)

**T-shirt**: L (~400 LOC Web Audio API)
**Prioridad**: 🟠 Should
**Dependencias**: —

**Tareas**:
1. Crear `src/audio/music.js` con Web Audio API
2. Sintetizar jota valenciana con dulzaina (oscillator + envelope + filter)
3. Tempo por stage (más rápido en stages avanzados)
4. Loop seamless
5. Volumen master + `[` / `]` / `M` en HUD

**Acceptance criterios**:
- ✅ Música suena durante gameplay
- ✅ Sin música durante data screen y final screen (regla 3D)
- ✅ `[` / `]` ajusta volumen, `M` mutea
- ✅ Volumen persiste intra-sesión

### 4.2 SFX procedurales

**T-shirt**: M (~200 LOC)
**Prioridad**: 🟠 Should
**Dependencias**: 4.1 (AudioContext compartido)

**Tareas**:
1. Crear `src/audio/sfx.js` con `play(name)` API
2. SFX:
   - `fire` — ruido blanco breve + sine agudo (papeleta sale volando)
   - `hit` — sine modulado descendente + ruido breve
   - `card` — arpegio ascendente do-mi-sol (card aparece)
   - `gameover` — acorde disonante (segunda menor) fade out
   - `victory` — fragmento de jota en tono mayor
   - `click` — sine breve 100Hz 30ms (menú)
   - `transition` — crescendo instrumental corto
   - `error` — tono descendente disonante (disparar a aliado)

**Acceptance criterios**:
- ✅ SFX claros y diferenciados
- ✅ Volumen master afecta música + SFX
- ✅ `M` mutea ambos

### 4.3 Música Suno Pro (Fase B, opcional)

**T-shirt**: XL (~semana de setup + iteración)
**Prioridad**: 🟡 Could
**Dependencias**: credenciales Suno del usuario

**Tareas**:
1. Setup Playwright + Suno.com scraping (credenciales usuario)
2. Catálogo de prompts: 1 pista por stage + menú + game over + victoria = ~7-10 pistas
3. Pipeline `tools/suno-pipeline/generate.py`
4. Validación humana (usuario escucha cada MP3)
5. Reemplazar Fase A con MP3s Suno

**Acceptance criterios**:
- ✅ 7-10 pistas MP3 generadas con Suno Pro
- ✅ Cada pista revisada por usuario
- ✅ Integradas en `src/audio/music.js`

**Riesgos**:
- Suno cambia UI / rompe scraper → screenshots + actualizar script
- Credenciales filtradas en commits → `.env` en `.gitignore`
- Generación fuera de estilo jota → iteración prompts + revisión humana

---

## Fase 5 — Accesibilidad + sharing

**Goal**: hacer el juego inclusivo y compartible.

### 5.1 TTS accesibilidad con Web Speech API

**T-shirt**: S (~80 LOC)
**Prioridad**: 🟡 Could
**Dependencias**: 1.1 (cards subsystem)

**Tareas**:
1. Crear `src/accessibility/tts.js`
2. Botón 🔊 "Escuchar" en cada card pedagógica
3. Voz `es-ES` con fallback a `es`
4. Configurable desde pause menu (on/off + velocidad)
5. Persiste en `localStorage` (`zarra2d:settings:tts`)

**Acceptance criterios**:
- ✅ Botón 🔊 en cada card funciona
- ✅ Voz clara y natural
- ✅ Configuración persiste

### 5.2 Modo alto contraste

**T-shirt**: S (~100 LOC CSS)
**Prioridad**: 🟡 Could
**Dependencias**: —

**Tareas**:
1. CSS class `contrast-high` con paleta dalton
3. Botón en pause menu
2. Persiste en `localStorage`

**Acceptance criterios**:
- ✅ Toggle funcional
- ✅ Cambio visual perceptible

### 5.3 `prefers-reduced-motion`

**T-shirt**: S (~50 LOC)
**Prioridad**: 🟡 Could
**Dependencias**: —

**Tareas**:
1. CSS `@media (prefers-reduced-motion: reduce)` desactiva parallax + screen shake + sine flutter
2. JavaScript detecta media query y setea flag global
3. Persiste en `localStorage` para override manual

**Acceptance criterios**:
- ✅ Movimiento se reduce automáticamente
- ✅ Toggle manual funciona

### 5.4 Sharing en redes sociales

**T-shirt**: S (~150 LOC)
**Prioridad**: 🟡 Could
**Dependencias**: 1.3 (resumen final)

**Tareas**:
1. Crear `src/sharing/share.js`
2. Link compartible: `https://<host>/?ref=<base64-score>`
3. Texto: "Acabo de recoger N firmas contra TRECO GESTIÓN DE RESIDUOS S.L. en el Valle de Ayora-Cofrentes..."
4. Botones: Twitter, Facebook, Copiar al portapapeles, `navigator.share()`
5. **Sin tracking, sin backend**

**Acceptance criterios**:
- ✅ Share funcional desde victory overlay
- ✅ Texto pre-formateado incluye nombre del stage
- ✅ `navigator.share()` cuando está disponible

---

## Fase 6 — Per-stage rosters + menú visuals

**Goal**: diferenciar visualmente los 5 stages con rosters enemigos específicos.

### 6.1 Per-stage enemy rosters

**T-shirt**: L (~600 LOC)
**Prioridad**: 🟡 Could
**Dependencias**: —

**Tareas**:
1. Crear `src/levels/stage1-lashoyas.js` con roster específico (topadora boss, camion_treco, dron_fumigador)
2. Idem `stage2-lahoz.js` (tubo_lixiviado boss, bidon_lixiviado, dron_fumigador)
3. Idem `stage3-lahunde.js` (incineradora boss, motosierra, plataforma_solar)
4. Idem `stage4-ayora.js` (trailer boss, convoy de trailers, humo tóxico)
5. Idem `stage5-acuifero.js` (planta_treco boss, drones de vigilancia, extractores)
6. Actualizar `src/main.js:31` para cargar level específico por stage

**Acceptance criterios**:
- ✅ Cada stage tiene roster específico
- ✅ Boss de cada stage es único
- ✅ Pedagogía diferenciada por lugar

### 6.2 Backgrounds de menú (4 pendientes)

**T-shirt**: M (~300 LOC + asset gen)
**Prioridad**: 🟡 Could
**Dependencias**: minimax MCP

**Tareas**:
1. Generar 4 PNGs panorámicos con minimax:
   - Vista panorámica del Valle desde Castillo de Cofrentes
   - Mapa cartográfico del Valle de Ayora-Cofrentes
   - Vertedero TRECO (vista satírica)
   - Río Cabriel
2. Chroma-key + NEAREST downsample
3. Cargar en main menu / stage select / game over / biblioteca

**Acceptance criterios**:
- ✅ 4 backgrounds generados
- ✅ Cada menú tiene su background específico
- ✅ Estilo coherente con backgrounds de stage

### 6.3 Pixi.js bundle offline fallback

**T-shirt**: S (~200 LOC)
**Prioridad**: 🟡 Could
**Dependencias**: —

**Tareas**:
1. Descargar `pixi.min.js` local a `assets/lib/pixi.min.js`
2. `index.html` con `<script>` que prueba CDN, fallback a local
3. Error message claro si ambos fallan

**Acceptance criterios**:
- ✅ Funciona sin internet (después de primera carga)
- ✅ Fallback transparente

---

## Fase 7 — v1 release + archive

**Goal**: cerrar el ciclo SDD con `sdd-archive`.

### 7.1 sdd-archive

**T-shirt**: S (~100 LOC markdown)
**Prioridad**: 🔴 Must
**Dependencias**: Fases 0-2 completas + sign-off pedagógico

**Tareas**:
1. Ejecutar `bash scripts/verify.sh` → 8/8 PASS
2. Ejecutar `MANUAL_PLAYTHROUGH.md` end-to-end → todos los checks
3. Crear `openspec/changes/2026-09-17-pedagogical-v1/` con:
   - `proposal.md`
   - `specs/pedagogy-cards/spec.md` (NUEVO)
   - `specs/pedagogy-data-screen/spec.md` (NUEVO)
   - `specs/pedagogy-final-screen/spec.md` (NUEVO)
   - `specs/i18n-strings/spec.md` (NUEVO)
   - `design.md`
   - `tasks.md`
   - `archive-report.md`
4. Pedagogical sign-off (10 checks)
5. Commit + tag `v1.0.0`
6. Push a GitHub Pages / Tailscale VPS

**Acceptance criterios**:
- ✅ `verify.sh` 8/8 PASS
- ✅ `MANUAL_PLAYTHROUGH.md` 100% ejecutado y firmado
- ✅ Archive report con verdict PASS
- ✅ 0 CRITICAL, 0 WARNING issues
- ✅ v1.0.0 tag pushed

---

## Apéndice A — Resumen de archivos a crear/modificar

### A.1 Archivos NUEVOS

| Path | LOC estimado | Fase |
|---|---|---|
| `research/fuentes.md` | 40 (copia del 3D) | 0 |
| `src/engine/dom-debug.js` | ~70 | 0 |
| `src/i18n/es.js` | ~500 (todos los strings) | 0,1,3 |
| `src/pedagogy/es.js` | ~150 | 1 |
| `src/pedagogy/cards.js` | ~300 | 1 |
| `src/pedagogy/modal-intermedio.js` | ~150 | 1 |
| `src/pedagogy/resumen-final.js` | ~400 | 1 |
| `src/pedagogy/biblioteca.js` | ~300 | 1 |
| `src/pedagogy/data-screen.js` | ~200 | 1 |
| `src/pedagogy/final-screen.js` | ~300 | 1 |
| `src/ui/pause.js` | ~150 | 3 |
| `src/accessibility/tts.js` | ~80 | 5 |
| `src/accessibility/contrast.js` | ~100 | 5 |
| `src/accessibility/motion.js` | ~50 | 5 |
| `src/sharing/share.js` | ~150 | 5 |
| `src/audio/music.js` | ~400 | 4 |
| `src/audio/sfx.js` | ~200 | 4 |
| `src/levels/stage{1-5}-*.js` | ~600 (5 archivos) | 6 |
| `tests/unit/pedagogy-cards.spec.mjs` | ~100 | 1 |
| `tests/unit/pedagogy-i18n.spec.mjs` | ~80 | 0,1 |
| `tests/e2e/pedagogy-cards.spec.mjs` | ~150 | 1 |
| `tests/e2e/pedagogy-final-screen.spec.mjs` | ~100 | 1 |
| `scripts/verify.sh` | ~150 | 2 |
| `MANUAL_PLAYTHROUGH.md` | ~300 | 2 |
| `openspec/changes/2026-09-17-pedagogical-v1/*` | ~600 | 7 |
| `assets/sprites/enemies_camion_cisterna_residuos.png` (real) | asset | 0 |
| `assets/ui/crosshair.png` (opcional) | asset | 3 |
| `assets/menu/{main,stage-select,gameover,biblioteca}.png` | asset | 6 |

**Total NUEVO**: ~5 270 LOC código + ~600 LOC markdown + 6 assets

### A.2 Archivos MODIFICADOS

| Path | Cambio | Fase |
|---|---|---|
| `src/combat.js` | Emitir `combat:hit` con enemyId | 1 |
| `src/score.js` | Persistir `cardsShown[]` | 1 |
| `src/main.js` | Wire pedagogy listeners, console→__zr | 0,1,3 |
| `src/ui/menu.js` | Strings a STRINGS, agregar "Biblioteca" | 0,1 |
| `src/ui/overlay.js` | Strings a STRINGS, integrar resumen final | 0,1 |
| `src/ui/hud.js` | Strings a STRINGS | 0 |
| `src/enemies.js` | Desaturación en desactivación | 1 |
| `src/levels/test-level.js` | Marcar planta_treco con lifecycle='desactivacion' | 1 |
| `src/index.html` | Splash disclaimer modal | 3 |
| `index.html` | Pixi offline fallback | 6 |
| `tests/unit/integrity.spec.mjs` | Fix `?v=26` → `?v=44` | 0 |
| `README.md` | Actualizar estado + link a MANUAL_PLAYTHROUGH | 2,7 |
| `PLAN.md` | Marcar fases completadas | 7 |
| `LICENSE` | Mantener MIT | — |

### A.3 Archivos a NO tocar

- `src/iso/tilemap.js` (DEPRECATED, mantener para demo)
- `src/iso/world.js` (mantener)
- `src/iso/iso-math.js` (crítico para hit detection)
- `assets/raw/` (preservar originales Minimax)
- `assets/backgrounds/v{2,3,4,5}*/` (iteraciones, no en git)
- `assets/backgrounds/long-bg*/` (iteraciones)

---

## Apéndice B — Decisiones pendientes y tradeoffs

| # | Decisión | Opciones | Recomendación | Bloquea |
|---|---|---|---|---|
| D1 | ¿Música Suno o procedural? | (A) Web Audio procedural jota, (B) Playwright + Suno | **B confirmado** — depende de credenciales usuario | Fase 4 |
| D2 | ¿Variantes de proyectil? | (A) 1 sola papeleta, (B) sello + super-firma | **A confirmado** para v1; B futuro | Nada |
| D3 | ¿Power-ups del 3D? | (A) sí como drops, (B) no, (C) como opciones de gameplay | **B confirmado** — disparo ya ES firma | Nada |
| D4 | ¿Sprite explosion? | (A) sí, (B) no | **B recomendado** — disciplina 3D no-particles | Nada |
| D5 | ¿Light gun support? | (A) sí (3D parity), (B) no | **B confirmado** — sin pointer lock no aplica | Nada |
| D6 | ¿TTS accesibilidad? | (A) sí con Web Speech API, (B) no | **A recomendado** — inclusividad es pedagogía | Nada |
| D7 | ¿Sharing en redes? | (A) sí, (B) no | **A recomendado** — extiende alcance pedagógico | Nada |
| D8 | ¿Per-stage rosters en v1? | (A) sí, (B) no (TEST_LEVEL único) | **B confirmado v1, A en v2** | Fase 6 |
| D9 | ¿Backgrounds de menú en v1? | (A) sí (4 generados), (B) no | **B confirmado v1, A en v2** | Fase 6 |
| D10 | ¿Pixi offline fallback en v1? | (A) sí, (B) no | **A recomendado** — robustez | Fase 6 |

---

## Apéndice C — Cronología estimada

```
Hoy (2026-09-17) ────────────────────────────────────── v1.0.0 archive
                                                      
Fase 0 (1 sesión) ──── 2026-09-17 → 2026-09-17       i18n, console, fix bug
                                                      
Fase 1 (3-4 sesiones) ─ 2026-09-17 → 2026-09-22     Cards + modal + resumen + biblioteca + data screen + final screen + desactivación
                                                      
Fase 2 (1 sesión) ──── 2026-09-22 → 2026-09-23       MANUAL_PLAYTHROUGH + verify.sh + sign-off
                                                      
Fase 3 (1 sesión) ──── 2026-09-23 → 2026-09-24       Pause overlay + aliados + disclaimer splash + crosshair
                                                      
Fase 4 (2-3 sesiones) ─ 2026-09-24 → 2026-09-27     Música jota + SFX [+ opcional Suno]
                                                      
Fase 5 (1 sesión) ──── 2026-09-27 → 2026-09-28       TTS + contraste + reduced-motion + sharing
                                                      
Fase 6 (2-3 sesiones) ─ 2026-09-28 → 2026-10-02     Per-stage rosters + backgrounds menú + Pixi fallback
                                                      
Fase 7 (1 sesión) ──── 2026-10-02 → 2026-10-03       sdd-archive + tag v1.0.0
                                                      
Total: ~12-17 sesiones / ~3-4 semanas
```

**Nota**: Las sesiones se estiman en bloques de 2-4 horas de trabajo enfocado. Pueden comprimirse si el flujo lo permite.

---

## Apéndice D — Métricas de éxito del roadmap

| Métrica | Hoy | Después Fase 2 | Después Fase 7 (v1) |
|---|---|---|---|
| Cobertura pedagógica | 0% | 80% | 95% |
| Strings centralizados | 0% | 100% | 100% |
| Console discipline | 0% | 100% | 100% |
| Acceptance formal | 0% | 100% | 100% |
| Pedagogical sign-off | 0/6 | 6/6 | 6/6 |
| Tests passing | 55/58 | 58/58 | 58/58 + nuevos |
| `verify.sh` checks | 0/8 | 8/8 | 8/8 |
| Audio | 0% | 0% | 100% (Fase A) |
| Accesibilidad | 25% | 25% | 90% |
| Per-stage rosters | 0% | 0% | 100% |

---

**Próximo paso inmediato**: arrancar **Fase 0** (1 sesión) — quick wins + i18n skeleton + console discipline + fix bug trivial.