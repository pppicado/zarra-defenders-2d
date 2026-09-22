# Visión consolidada — zarra-defenders-2d

> **Documento maestro** que reúne:
> - Conceptos del proyecto hermano 3D (`zarra-defenders`) aplicables a este.
> - Conceptos propios del proyecto 2D (`zarra-defenders-2d`) que ya existen documentados.
> - La intención pedagógica unificada de ambos.
>
> **No es un plan de implementación** — para eso ver [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md) y [`ROADMAP.md`](./ROADMAP.md).
>
> **Última actualización**: 2026-09-17
> **Fuentes documentales consultadas**:
> - `/projects/personal/zarra-defenders/` (proyecto 3D, **PASS verificado**)
> - `/projects/personal/zarra-defenders-2d/` (este proyecto, **F1-F6.1 implementadas**)

---

## 0. Resumen ejecutivo en una línea

Videojuego web 2D (HTML5 + Pixi.js v7) estilo *on-rails shooter* isométrico pixel art, cívico-pedagógico, sobre el conflicto del macrovertedero de residuos que **TRECO GESTIÓN DE RESIDUOS S.L.** quiere instalar en Zarra (Valle de Ayora-Cofrentes, Valencia, España). El jugador encarna a un vecino/a que defiende 5 lugares reales del Valle de lugares reales, dispara **papeletas firmadas** como gesto cívico, y al terminar se abre una pantalla final con enlaces a la plataforma vecinal real `nomacrovertederozarra.com`.

---

## 1. Identidad y propósito del proyecto

### 1.1. Por qué existe

El **macrovertedero de Zarra** es un proyecto de **TRECO GESTIÓN DE RESIDUOS S.L.** que prevé:
- **11 millones de m³ de residuos** (más del doble del vertedero de Dos Aguas)
- En el **Polígono 11 de Zarra**, en pleno **Acuífero de la Mancha Oriental** (8.500 km², una de las mayores masas de agua subterránea de Europa)
- Con ruta de camiones que pasa **junto al colegio y al polideportivo de Ayora**, atravesando el Plan de Emergencia Nuclear de la central nuclear de Cofrentes

La **Plataforma No al Macrovertedero de Zarra** lucha en la calle con firmas, alegaciones y manifestaciones. Este juego es un **altavoz** de esa lucha — no un sustituto. La victoria real está en las alegaciones y en la movilización, no en derrotar al vertedero en el juego.

### 1.2. Tono

> **Heroico pero esperanzado**, no catastrofista.
> **Adversario = la máquina industrial impersonal**, no "los malos".
> **Mensaje final**: el juego es un altavoz, no un sustituto. La victoria real está en la calle y en las alegaciones.

### 1.3. Lo que el juego NO es

- ❌ No promueve la violencia. La mecánica de "disparar" es **metáfora de la acción documental**: cada "firma" representa apoyo vecinal.
- ❌ No caricaturiza personas. Los enemigos son máquinas (camiones, bidones, taladros, incineradoras), nunca vecinos, guardias, políticos ni trabajadores de TRECO.
- ❌ No usa el patrimonio como daño. Castillo de Cofrentes, casas de Ayora, encinas, almendros, pinos pueden aparecer como aliados ambientales; si el jugador les dispara, **pierde vida**.
- ❌ No pretende "ganar" la batalla legal. El boss final **se desactiva**, no muere en una explosión.

### 1.4. Disclaimer legal

**TRECO GESTIÓN DE RESIDUOS S.L.** es una empresa REAL. Este juego la menciona exclusivamente con fines de **crítica documentada y educación cívica**:
- En ejercicio del derecho a la libertad de expresión e información (**Art. 20 CE** + **Art. 11 CDFUE**)
- De forma **nominativa** (para identificar la entidad criticada)
- **Sin endorsement, patrocinio ni asociación** con su titular
- Citando **fuentes públicas verificables** en cada dato mostrado

---

## 2. Stack técnico

| Capa | Decisión | Por qué |
|---|---|---|
| Runtime | ES modules nativos, **sin build step** | El código debe ser ejecutable sin webpack/vite/npm |
| Engine gráfico | **Pixi.js v7.4.0** vía CDN | 2D batched rendering, simple, eficiente |
| Test runner unit | `node:test` nativo (Node ≥18) | Cero dependencias, simple |
| Test runner e2e | **Playwright** | Cobertura de UI realista |
| Servidor dev | `python3 -m http.server` | Idéntico al 3D, sin fricción |
| Sin TypeScript | Comentarios como única doc | Mantener simplicidad |
| Sin `package.json` | Dependencias manuales | Compatibilidad con flujo 3D |

**Tamaño objetivo**: el proyecto actual pesa 332 MB en disco (mayormente backgrounds iterativos). El budget estricto de **2 MB del 3D no aplica al 2D** porque la naturaleza pixel-art requiere PNGs pre-generados, pero se persigue mantener backgrounds ≤ 1 MB y regenerar paletas para cuantizar agresivamente.

---

## 3. Mecánicas centrales

### 3.1. Rail shooter isométrico

- **Cámara automática** que recorre un path predefinido por cada stage (120 s, iso `(0,0)` → `(36,36)`)
- El jugador **NO controla el movimiento** — solo la **mira** y el **disparo**
- **Vista primera persona con mano pixel art sosteniendo un bolígrafo** (`hand_pen.png`) — refuerza la metáfora "estoy firmando un documento, no apretando un gatillo"
- **Crosshair** sigue al puntero, visible durante menús/pausa (durante gameplay es la mano)

### 3.2. Apuntado y disparo

| Input | Acción |
|---|---|
| Mouse move | Apuntar |
| Click izquierdo | Disparar (= lanzar papeleta firmada) |
| Touch drag | Apuntar (móvil) |
| Touch tap (sin drag) | Disparar (móvil, sin auto-fire) |
| Esc / botón | Pausa |

- **Cooldown**: 333 ms = 3 disparos/seg (200 ms = 5 disparos/seg confirmado en F4d)
- **Sin magazine, sin reload** — racionado por cooldown simple
- **Proyectil**: papeleta firmada con sine flutter ±4 px, lifetime 1500 ms, velocidad 2400 u/s, **homing per-frame** hacia objetivo

### 3.3. Sistema de "firmas recogidas"

- Cada impacto en enemigo = **+1 firma** (narrativo: "se suma a la lucha vecinal")
- HUD muestra **"Firmas recogidas: N"** en vez de "Balas: N"
- **Score base**: `points = 10 × archetype_multiplier`
  - standard: ×1 → 10 pts
  - tank: ×1.5 → 15 pts
  - mini-boss: ×2 → 20 pts
  - boss: ×3 → 30 pts

### 3.4. Vidas e integridad

- **3 vidas** (3 hearts) por stage
- **Integridad 3-segmento**: drena al chocar enemigo escapado o al disparar a aliado
- **Game-over** al llegar a 0 → overlay con 2 botones: Reintentar / Volver al menú
- **Best firmas per stage** persiste en `localStorage` (`zarra2d:best:stage_<n>`)

### 3.5. Stages con lock progression

| # | Stage | Topónimo real | Boss | Dato pedagógico |
|---|---|---|---|---|
| 1 | **Las Hoyas de Caballero** | Polígono 11, Zarra — encinas, almendros | topadora arrancando encinas | 11M m³ de residuos |
| 2 | **La Hoz del río Zarra** | Barranco del Agua (13 km), río Zarra, cañón | tubería lixiviados | Acuífero 8.500 km² |
| 3 | **Sierra de La Hunde y Palomera** | Pinar denso, Ayora | incineradora móvil | Convive con central nuclear Cofrentes |
| 4 | **Casco urbano de Ayora** | Casas encaladas, colegio, polideportivo | convoy de trailers | Ruta camiones pasa junto a colegio |
| 5 | **El Acuífero** (jefe final) | Acuífero de la Mancha Oriental | planta TRECO | 2002, 10.700 firmas, ya rechazaron |

- Stages se desbloquean al completar el anterior (`?unlock=all` debug shortcut)
- Stages 2-5 muestran candado hasta que se completa el anterior
- Final boss **se desactiva** (no muere) → abre pantalla final pedagógica

---

## 4. Pedagogía integrada (la pieza central)

### 4.1. Mecanismos pedagógicos deseados

| # | Mecanismo | Estado actual | Notas |
|---|---|---|---|
| 1 | **Card in-game al destruir enemigo** (Título + descripción + fuente citada) | ❌ No implementado | Cada impacto debería mostrar card con dato + URL de fuente |
| 2 | **Modal intermedio cada 5 enemigos** | ❌ No implementado | "Has destruido 5 lixiviados, contaminando 1000 L del río Cabriel" |
| 3 | **Resumen completo navegable al final del stage** | ❌ No implementado | Debrief con cards acumuladas, prev/next |
| 4 | **Biblioteca pedagógica accesible desde menú** | ❌ No implementado | Acumula cards desbloqueadas en localStorage |
| 5 | **Pantalla Novel entre stages** | ❌ No implementado | Visual novel con texto + fondo + música |
| 6 | **Pantalla final con 4 enlaces** (plataforma, alegaciones, asociación, hashtag) | ❌ No implementado | Cierre del loop pedagógico → nomacrovertederozarra.com |
| 7 | **TTS accesibilidad con Web Speech API** | ❌ No implementado | Botón 🔊 Escuchar en cada card, voz `es-ES` |
| 8 | **Sharing en redes sociales** (`?ref=<base64-score>`) | ❌ No implementado | Link compartible con texto pre-formateado |
| 9 | **Disclaimer TRECO modal en splash + Acerca de** | 🟡 Parcial | Texto en README + ui/menu.js, sin modal splash |
| 10 | **Dato pre-nivel con citation + botón Continuar** | ❌ No implementado | Antes de cada stage, 5-10s pedagógico |

### 4.2. Datos pedagógicos por stage (6 fuentes verificadas)

Copiar de `/projects/personal/zarra-defenders/research/fuentes.md` al directorio `research/` del 2D como **primer paso pedagógico**.

| Stage | Texto del dato | Fuente | URL |
|---|---|---|---|
| 1 | "El proyecto prevé 11 millones de metros cúbicos de residuos, más del doble del vertedero de Dos Aguas." | Las Provincias, 24/06/2026 | https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html |
| 2 | "El Acuífero de la Mancha Oriental tiene 8.500 km² — una de las mayores masas de agua subterránea de Europa. Abastece a Ayora, Zarra, Teresa de Cofrentes y Jarafuel." | Agencia del Agua de CLM (s/f) | https://agenciadelagua.castillalamancha.es/el-agua-en-castilla-la-mancha/situacion-del-agua-en-clm/acuiferos |
| 3 | "La comarca ya convive con la central nuclear de Cofrentes, parques eólicos y plantas fotovoltaicas. La llaman zona de sacrificio." | actualidadvalencia.com, 05/08/2026 | https://actualidadvalencia.com/macrovertedero-zarra-pp-exige-retirada-proyecto/ |
| 4 | "La ruta de camiones pasa junto al colegio y el polideportivo de Ayora, y atraviesa el Plan de Emergencia Nuclear de la central de Cofrentes." | Las Provincias, 24/06/2026 | (mismo URL nivel 1) |
| 5 | "En 2002 los vecinos del Valle ya rechazaron un vertedero igual en la misma zona. 10.700 firmas, manifestación con ataúd frente a la Diputación. Se puede volver a parar." | Las Provincias, 16/06/2026 | https://www.lasprovincias.es/comarcas/valle-ayoracofrentes-moviliza-macrovertedero-proyectado-zarra-20260616173049-nt.html |
| final | "A fecha de hoy, la solicitud está en información pública. Puedes presentar alegaciones." | Valencia Plaza, 31/07/2026 | https://valenciaplaza.com/valenciaplaza/comarca-y-empresa/crece-el-rechazo-contra-el-macrovertedero-de-zarra-tras-la-ultima-concentracion-de-casi-mil-personas |

---

## 5. Conceptos heredados del proyecto 3D (aplicables)

### 5.1. Sistema de "disparos como firmas" (refinamiento del 3D)

El 3D dispara balas/láseres como cualquier rail shooter. El 2D **eleva la metáfora** haciendo que cada proyectil sea **literalmente una papeleta firmada** visible, con sine flutter, que sale volando de la mano del jugador. Esto refuerza pedagógicamente "estoy firmando un documento, no apretando un gatillo".

### 5.2. Boss desactivación (contrato pedagógico del 3D)

> **A7 del 3D**: los 5 bosses setean `userData.lifecycle='desactivacion'`. `enemies.js destroyEnemy()` chequea la flag uniformemente y aplica **desaturation + motion halt + dispatch `zarra:desactivacion`**. Los niveles 1-4 bosses también desaturan (sin explosión) cuando destruidos.

**Aplicar al 2D**: la planta_treco del nivel 5 **se desactiva con animación 1.5s de desaturación + halt**, sin explosión, abriendo inmediatamente la pantalla final con dato + 4 enlaces. La pedagogía: "el último boss no muere — la lucha sigue en la calle".

### 5.3. STRINGS centralizado (A2 del 3D)

> **A2 del 3D**: STRINGS en `src/content/data.js`. Ningún otro archivo bajo `src/` puede contener prosa española libre. `verify.sh check 2` confirma zero Spanish prose fuera de `data.js`.

**Aplicar al 2D**: crear `src/i18n/es.js` con todos los strings en castellano (cards pedagógicas, menús, overlays, HUD labels, disclaimer). Refactorizar todos los strings hardcoded a referencias `STRINGS.foo.bar`. Habilitar i18n futuro.

### 5.4. URLs centralizadas (A6 del 3D)

> **A6 del 3D**: All URLs en STRINGS, zero literals en code. `STRINGS.final.enlaces.*_url` schema.

**Aplicar al 2D**: una vez creado el módulo i18n, los 4 enlaces finales deben vivir en `STRINGS.final.enlaces.*_url`. Ningún `https://...` literal en código.

### 5.5. Fuentes pre-researched (A5 del 3D)

> **A5 del 3D**: las 6 `.fuente` strings populated verbatim desde `research/fuentes.md`. **Sin TODO pedagogía** markers.

**Aplicar al 2D**: copiar `research/fuentes.md` del 3D y embeber los 6 pares `texto + fuente + url` en el módulo pedagógico del 2D. Firmar pedagógicamente cada uno antes de mergear.

### 5.6. Zero console.* con `__zarra.debug` (A8 del 3D)

> **A8 del 3D**: cero `console.*` calls en production `src/`. No `console.log/warn/error` en ningún source file a menos que esté gated detrás de `__zarra.debug` flag.

**Aplicar al 2D**: crear `src/engine/dom-debug.js` con `__zr = { debug, log, warn, error }`. Reemplazar todos los `console.*` actuales (`combat.js:207`, `main.js:18-19`, `sprite-loader.js:40`).

### 5.7. Pedagogical sign-off antes de apply (ver del 3D)

> **El 3D exige**: en el MANUAL_PLAYTHROUGH.md §12, cada uno de los 6 dato strings debe ser revisado por el pedagogo (usuario) para: data accuracy, citation specificity, no caricature, desactivación framing. **Sin este sign-off, no se puede hacer sdd-apply**.

**Aplicar al 2D**: crear `MANUAL_PLAYTHROUGH.md` con sección `§ Pedagogical Sign-Off` con 6 checkboxes (5 niveles + final) + sección `§ Console Discipline Sign-Off` con checks de A8 + sección `§ i18n Sign-Off` con checks de strings extraídos.

### 5.8. Verify estructural (D16 del 3D)

> **D16 del 3D**: cero tests / no build. Verificación = manual playthrough + `scripts/verify.sh` (8 checks estructurales).

**Aplicar al 2D**: crear `scripts/verify.sh` con checks adaptados al 2D:
1. STRINGS isolation (zero Spanish prose fuera de `src/i18n/es.js`)
2. Zero `https://` literals fuera de `src/i18n/es.js`
3. Zero `console.*` fuera de `src/engine/dom-debug.js`
4. 5 backgrounds PNG presentes
5. 6 `.fuente` populated desde `research/fuentes.md`
6. Pixi.js bundle presente (CDN o local)
7. Hand + papeleta + heart PNGs presentes

---

## 6. Conceptos específicos del 2D (no en el 3D)

### 6.1. Vista isométrica pixel art

- **Perspectiva isométrica 3/4** (estilo Diablo 2 con techo bajo)
- **Backgrounds**: PNGs generados por minimax MCP con post-process de magenta → alpha + NEAREST downsample
- **Z-ordering**: por `isoX + isoY` (depth sort manual)
- **Tilemap**: DEPRECATED en main game desde F6; conservado solo para demo standalone
- **Background scroll**: parallax 0.2, `BG_SCALE=2`, 5 PNGs `640×1120` source

### 6.2. TTS accesibilidad (Web Speech API)

> Botón 🔊 "Escuchar" en cada card pedagógica, voz `es-ES`, configurable desde pause menu, persistente en `localStorage` (`zarra2d:settings:tts`).

### 6.3. Sharing en redes sociales

> Link compartible `https://<host>/?ref=<base64-score>` con texto sugerido "Acabo de recoger N firmas contra TRECO GESTIÓN DE RESIDUOS S.L. en el Valle de Ayora-Cofrentes..." Botones: Twitter, Facebook, Copiar al portapapeles, `navigator.share()` cuando disponible. **Sin tracking, sin backend.**

### 6.4. Mobile-first con portrait lock

- Mobile portrait con side < 360 px: modal fullscreen "Gira el móvil" con SVG de rotación inline
- Canvas responsivo 16:9 con letterbox/pillarbox + DPR-aware
- Tap vs drag detection: distancia < umbral y duración < 300 ms → dispara
- **Auto-fire OFF** confirmado — disparo manual siempre

### 6.5. Folklore del Valle (jota regional)

Música del juego basada en **música popular del Valle de Ayora-Cofrentes**:
- **Fondo de Música Tradicional IMF-CSIC** (dominio público) — jota con dulzaina de Cofrentes (1980)
- **Antología del Folklore Musical de España** (1959) — La Despertá (Valencia), Per La Valenciana, Nana (Valencia)
- **Estrategia en dos fases**:
  - **Fase A**: placeholders de dominio público (CSIC, Mutopia Project)
  - **Fase B**: pistas Suno Pro (con credenciales del usuario) reemplazan Fase A

### 6.6. Disclaimer TRECO formal

Modal completo con **Art. 20 CE** + **Art. 11 CDFUE** + uso nominativo + respeto a marca + cesión a petición razonable de modification vía GitHub Issues. Splash al cargar `index.html`, accesible desde menú "Acerca de".

### 6.7. Determinismo para testing

- `?test=1` reemplaza PRNG con mulberry32 seed `0xC0FFEE`
- Override: `?test=1&seed=N`
- Test API: `__gameTestAPI__` con 17+ métodos (`getScore, getFirmas, setMousePosition, clickAt, skipToTime, advanceCameraTo, getEnemies, getIntegrity, getProjectiles, setTime, tick, setSeed, setHitboxesEnabled, getHitboxRects, setViewportSize, setViewportBounds, getScreenBounds, spawnEnemy, reset`)
- Logs estructurados: `console.log('[TEST_EVENT]', JSON.stringify({...}))`

---

## 7. Enemigos y amenazas (11 + 5 bosses)

### 7.1. Catálogo

| ID | Nombre | Tipo | HP base | Puntos × mult | Dato pedagógico |
|---|---|---|---|---|---|
| `camion_treco` | Camión TRECO | standard | 1 | 10 | Logística del proyecto |
| `bidon_lixiviado` | Bidón lixiviado | standard | 1 | 10 | Lixiviados tóxicos al acuífero |
| `bolsa_plastico` | Bolsa de plástico | standard | 1 | 10 | Contaminación cotidiana |
| `valla_publicitaria` | Valla publicitaria | static | — | 10 | Eufemismo del proyecto |
| `dron_fumigador` | Dron fumigador | tank | 3 | 15 | Fumigación industrial |
| `camion_cisterna_residuos` | Camión cisterna | tank | 3 | 15 | Sustituye plataforma_solar (decisión 2026-09-03) |
| `tubo_lixiviado` | Tubo lixiviado | tank | 3 | 15 | Descarga clandestina |
| `sello_burocratico` | Sello burocrático | boss | 5 | 30 | Burocracia que aprueba |
| `topadora` | Topadora | mini-boss | 10 | 20 | Destrucción de encinas |
| `incineradora` | Incineradora móvil | boss | 10 | 30 | Quema residuos |
| `trailer` | Trailer | boss | 8 | 30 | Ruta junto a colegio |
| `planta_treco` | Planta TRECO (final) | boss | 30 | 30 | **Se desactiva, NO muere** |

### 7.2. NO-enemigos (regla pedagógica)

- ❌ Personas (ni vecinos, ni guardias civiles, ni políticos, ni trabajadores de TRECO)
- ❌ Animales del Valle (cabras montesas, jabalíes, águilas — aliados ambientales)
- ❌ Patrimonio (castillos, iglesias, casas — aliados, pueden aparecer como aliado ambiental; si disparas, **pierdes vida**)

### 7.3. Aliados ambientales (penalizan si disparas)

- `encina` (árbol) — `assets/sprites/trees_encina.png`
- `almendro` (árbol) — `assets/sprites/trees_almendro.png`
- `pino` (árbol) — `assets/sprites/trees_pino.png`
- `casa_ayora` (edificio) — `assets/sprites/buildings_casa_ayora.png`
- `castillo_cofrentes` (edificio) — `assets/sprites/buildings_castillo_cofrentes.png`
- `torre_central` (edificio) — `assets/sprites/buildings_torre_central.png`

---

## 8. Power-ups (decisión: no aplicar drops del 3D)

> El 3D tiene 6 power-ups (FIRMA, ALEGACIÓN, MANIFESTACIÓN, ALIANZA, DATO, HITO) como **acciones cívicas reales fuera del juego**. El 2D **NO los implementa como drops** porque el disparo ya ES el gesto cívico (papeleta firmada visible).
>
> Si en el futuro se quieren power-ups, deben ser **opciones de gameplay** (ej. escudo tras 50 firmas, slow-mo tras manifestación) — NO drops aleatorios.

---

## 9. Arquitectura de archivos (target)

```
zarra-defenders-2d/
├── README.md
├── PLAN.md                         (existente, 874 líneas)
├── LICENSE                         (MIT)
├── index.html                      (existente)
├── start_server.sh                 (existente)
├── MANIFEST.md                     (este documento — visión)
├── MANUAL_PLAYTHROUGH.md           (acceptance formal, tipo 3D — raíz)
├── docs/
│   ├── VISION.md                   ← este archivo
│   ├── IMPLEMENTATION-STATUS.md    (qué está hecho, qué no)
│   ├── ROADMAP.md                  (plan priorizado en fases)
│   ├── pedagogy-data.json          (datos pedagógicos con citas)
│   └── i18n/es.json                (strings centralizados)
├── research/
│   └── fuentes.md                  (copiar del 3D)
├── assets/
│   ├── sprites/                    (26 PNGs actuales)
│   ├── backgrounds/                (5 PNGs por stage + 4 pendientes menú)
│   ├── ui/                         (crosshair, icons)
│   ├── explosions/                 (pendiente)
│   └── references/                 (5 NOTES.md por stage)
├── src/
│   ├── main.js                     (bootstrap)
│   ├── canvas.js                   (LOGICAL_W=1280, LOGICAL_H=720)
│   ├── rail-camera.js              (cámara path-based)
│   ├── input.js                    (mouse + touch unificado)
│   ├── player.js                   (crosshair)
│   ├── combat.js                   (papeleta pool, cooldown, AABB)
│   ├── enemies.js                  (archetypes + 4 movement patterns)
│   ├── integrity.js                (3-segment state machine)
│   ├── score.js                    (firmas + best localStorage)
│   ├── backgrounds.js              (BackgroundLayer parallax 0.2)
│   ├── event-bus.js                (EventTarget singleton)
│   ├── sprite-loader.js            (manifest + preload)
│   ├── test-api.js                 (window.__gameTestAPI__)
│   ├── random.js                   (mulberry32 PRNG)
│   ├── debug-hitboxes.js           (?hitboxes=1 + tecla H)
│   ├── engine/
│   │   └── dom-debug.js            (NUEVO — __zr debug utility, A8)
│   ├── iso/
│   │   ├── iso-math.js             (iso↔screen transforms)
│   │   ├── tilemap.js              (DEPRECATED en main)
│   │   └── world.js                (IsoWorld container)
│   ├── levels/
│   │   └── test-level.js           (roster 120 enemigos determinista)
│   ├── pedagogy/                   (NUEVO módulo pedagógico)
│   │   ├── es.js                   (i18n strings)
│   │   ├── cards.js                (card flotante post-hit)
│   │   ├── modal-intermedio.js     (cada 5 enemigos)
│   │   ├── resumen-final.js        (debrief post-stage)
│   │   └── biblioteca.js           (biblioteca navegable)
│   ├── audio/                      (NUEVO módulo audio)
│   │   ├── music.js                (jota regional o Suno)
│   │   └── sfx.js                  (SFX procedurales Web Audio)
│   ├── accessibility/              (NUEVO módulo accesibilidad)
│   │   ├── tts.js                  (Web Speech API)
│   │   ├── contrast.js             (modo alto contraste)
│   │   └── motion.js               (prefers-reduced-motion)
│   ├── sharing/                    (NUEVO módulo sharing)
│   │   └── share.js                (navigator.share + fallback)
│   └── ui/
│       ├── hud.js                  (hearts + hand sprite)
│       ├── menu.js                 (main menu + stage select)
│       ├── overlay.js              (game-over + victory)
│       ├── pause.js                (NUEVO — pause overlay)
│       └── novel.js                (NUEVO — visual novel entre stages)
├── openspec/
│   ├── specs/                      (6 actuales, planeando 4 más)
│   │   ├── combat-core/
│   │   ├── iso-asset-pipeline/
│   │   ├── iso-camera-integration/
│   │   ├── iso-gallery/
│   │   ├── scrolling-background/
│   │   ├── iso-tile-system/        (DEPRECATED)
│   │   ├── pedagogy-cards/         (NUEVO)
│   │   ├── pedagogy-data-screen/   (NUEVO)
│   │   ├── audio-strategy/         (NUEVO)
│   │   └── accessibility/          (NUEVO)
│   └── changes/
│       └── 2026-09-17-vision-consolidation/   (este change)
└── scripts/
    └── verify.sh                   (NUEVO — 8 checks estructurales)
```

---

## 10. Reglas contractuales del proyecto

### 10.1. Strings y i18n (A2/A6)

- **Cero prosa española libre** fuera de `src/i18n/es.js`
- **Cero `https://` literales** fuera de `src/i18n/es.js`
- Cada string visible debe vivir como clave en `STRINGS` y referenciarse desde ahí
- URLs de pedagogía (4 enlaces finales) en `STRINGS.final.enlaces.*_url`

### 10.2. Console discipline (A8)

- **Cero `console.*`** fuera de `src/engine/dom-debug.js`
- `__zr.debug` flag activable por `?debug=1` o `localStorage.__zr.debug = '1'`
- Producción: todos los logs gateados atrás del flag

### 10.3. Determinismo (D3)

- Modo `?test=1` con seed `0xC0FFEE` para PRNG mulberry32
- Roster de TEST_LEVEL determinista (no `Math.random` en spawns)
- Logs estructurados `[TEST_EVENT]` para parsing Playwright

### 10.4. Pedagogía (A5/A7)

- **6 dato strings** populated desde `research/fuentes.md`, sin TODO markers
- **Boss desactivación** uniforme: `lifecycle='desactivacion'` en planta_treco + (opcional) otros 4 bosses
- **No explosión**, no partículas, no debris — solo desaturación + halt motion
- **Final screen** tras desactivar plant_treco: dato + 4 enlaces

### 10.5. Pedagogical sign-off antes de apply

- `MANUAL_PLAYTHROUGH.md` debe estar firmado (6 datos pedagógicos + i18n + console discipline)
- Sin sign-off, **no se puede hacer sdd-apply**

### 10.6. Asset budget

- 5 backgrounds < 1 MB total
- 26 sprites < 6 MB total
- Pixi.js bundle: CDN o local fallback

---

## 11. Riesgos y decisiones pendientes

### 11.1. Riesgos pedagógicos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Tono lee como propaganda / caricature | Manual playthrough sign-off, pedagogy reviewer |
| R2 | Datos incorrectos / sin fuente | Pedagogical sign-off antes de apply |
| R3 | Conflicto evoluciona (aprobación/rechazo/nuevas noticias) | Strings centralizados en `src/i18n/es.js` permiten actualizar sin tocar JS |
| R4 | Jugador no entiende que la papeleta es metáfora | UI copy explícito ("Firmas recogidas" no "Balas"), card explicativa al primer hit |

### 11.2. Riesgos técnicos

| # | Riesgo | Mitigación |
|---|---|---|
| R5 | Pixi.js CDN falla sin internet | Bundle local fallback |
| R6 | Mobile performance < 30 fps | Object pooling, sprite batching, profile en dispositivos reales |
| R7 | Cache-busting mismatch (`?v=26` vs `?v=44`) | Bug ya diagnosticado en `tests/unit/integrity.spec.mjs` — fix trivial |
| R8 | TEST_LEVEL único para 5 stages | Generar per-stage rosters (F7+ planeado) |

### 11.3. Decisiones pendientes

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | ¿Música procedural o Suno? | (A) Web Audio procedural jota, (B) Playwright + Suno | **B confirmado 2026-09-03** — depende de credenciales usuario |
| D2 | ¿Variantes de proyectil? | (A) 1 sola papeleta, (B) sello + super-firma | **A confirmado** para v1; B futuro |
| D3 | ¿Power-ups del 3D? | (A) sí como drops, (B) no, (C) como opciones de gameplay | **B confirmado** — disparo ya ES la firma |
| D4 | ¿Sprite explosion? | (A) sí, (B) no (coherente con 3D no-particles) | **B recomendado** — mantener disciplina 3D |
| D5 | ¿Light gun support? | (A) sí (3D parity), (B) no (mouse-only) | **B confirmado** — sin pointer lock no aplica |
| D6 | ¿TTS accesibilidad? | (A) sí con Web Speech API, (B) no | **A recomendado** — inclusividad es pedagogía |
| D7 | ¿Sharing en redes? | (A) sí, (B) no | **A recomendado** — extiende alcance pedagógico |

---

## 12. Referencias cruzadas

### 12.1. Documentos del proyecto 2D

- `README.md` — Pitch + disclaimer + stack
- `PLAN.md` — 874 líneas, documento madre de mecánicas y fases
- `LICENSE` — MIT
- `openspec/config.yaml` — Configuración SDD
- `openspec/specs/README.md` — Índice de 6 specs canónicas

### 12.2. Especs activas del 2D

- `combat-core/spec.md` — 669 líneas, 13 REQ-CMB-001..013 (combat, hit resolution, determinismo, hitInset, escape)
- `iso-asset-pipeline/spec.md` — 308 líneas, 11 ASSET-001..011 (generación assets, postprocess, manifest)
- `iso-tile-system/spec.md` — 226 líneas, **DEPRECATED** en main (mantenido para demo)
- `iso-gallery/spec.md` — 185 líneas, 5 entries (gallery HTML para dev)
- `scrolling-background/spec.md` — 178 líneas, 7 BG-001..007 (parallax, freeze, lock progression)
- `iso-camera-integration/spec.md` — 165 líneas, 4 CAM-001..004 (RailCamera reinterpretation)

### 12.3. Cambios SDD archivados del 2D (21)

- `2026-09-06-fase-2-5-1-tile-regen-and-centering/`
- `2026-09-06-fase-2.5-tile-system/`
- `2026-09-06-fase-2.5.2-square-iso-rotation/`
- `2026-09-06-fase-2.5.3-tile-variants/`
- `2026-09-06-fase-2.5.4-tile-overlap-and-level-demo/`
- `2026-09-07-fase-2.5.5-tessellation-tuning/`
- `2026-09-08-fase-3-shooter-rail-gameplay/`
- `2026-09-10-fase-4a-canvas-720/`
- `2026-09-10-fase-4b-level-extension/`
- `2026-09-10-fase-4c-hand-size/`
- `2026-09-10-fase-4d-papeleta-sprite/`
- `2026-09-12-fase-5-enemy-movement/`
- `2026-09-12-fase-5-enemy-movement-fix/`
- `2026-09-12-fase-5-hit-detection-fix/`
- `2026-09-12-fase-5-hitbox-visualization/`
- `2026-09-12-fase-5-movement-calibration/`
- `2026-09-12-fase-5-projectile-homing/`
- `2026-09-12-fase-5-retry-camera-unhalt/`
- `2026-09-12-fase-5-screen-space-escape/`
- `2026-09-12-fase-6-scrolling-background/`
- `2026-09-13-fase-6.1-bg-bugfixes/`

### 12.4. Documentos del proyecto 3D (referencia)

- `zarra-defenders/README.md`
- `zarra-defenders/plan.md` — 334 líneas, diseño original
- `zarra-defenders/MANUAL_PLAYTHROUGH.md` — 242 líneas, REQ-15
- `zarra-defenders/docs/models-catalog/README.md` — 547 líneas, 22 modelos
- `zarra-defenders/research/fuentes.md` — **6 fuentes verificadas** (CRÍTICO: copiar a este proyecto)
- `zarra-defenders/openspec/specs/` — 10 specs (5 pedagógicas)
- `zarra-defenders/scripts/verify.sh` — 206 líneas, 8 checks

---

**Próximos pasos**: ver [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md) para el inventario ✅/🟡/❌, y [`ROADMAP.md`](./ROADMAP.md) para el plan priorizado en fases.