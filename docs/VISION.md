# Visión consolidada — zarra-defenders-2d

> **Documento maestro** que reúne:
> - Conceptos del proyecto hermano 3D (`zarra-defenders`) aplicables a este.
> - Conceptos propios del proyecto 2D (`zarra-defenders-2d`) que ya existen documentados.
> - La intención pedagógica unificada de ambos.
>
> **No es un plan de implementación** — para eso ver [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md) y [`ROADMAP.md`](./ROADMAP.md).
>
> **Última actualización**: 2026-09-28 (post sign-off pedagógico)
> **Fuentes documentales consultadas**:
> - `/projects/personal/zarra-defenders/` (proyecto 3D, **PASS verificado**)
> - `/projects/personal/zarra-defenders-2d/` (este proyecto, **F0-F6.1 implementadas** + **sign-off pedagógico firmado**)

> **Cambios recientes**:
> - §4.1: 11/11 mecanismos pedagógicos marcados como ✅
> - §7.1: HP base actualizado post-F6.1 (todos los no-boss = 1 hit)
> - §9: arquitectura real al HEAD actual (13 specs SDD, 27 sprites, 7 backgrounds)
> - §11.3-11.4: 11 decisiones tomadas + 3 pendientes para v1
> - 2026-09-28: Pedagogical sign-off firmado (los 6 dato strings revisados)

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

### 4.1. Mecanismos pedagógicos implementados (Fase 1 ✅)

| # | Mecanismo | Estado | Módulo | Notas |
|---|---|---|---|---|
| 1 | **Card in-game al destruir enemigo** (Título + descripción + fuente citada) | ✅ Implementado (F1.1) | `src/pedagogy/cards.js` | Card flotante con dato + fuente + link clickeable + TTS button |
| 2 | **Modal intermedio cada 5 enemigos** | ✅ Implementado (F1.2) | `src/pedagogy/modal-intermedio.js` | "Has destruido 5 lixiviados, contaminando 1000 L del río Cabriel" |
| 3 | **Resumen completo navegable al final del stage** | ✅ Implementado (F1.3) | `src/pedagogy/resumen-final.js` | Debrief con cards acumuladas, prev/next |
| 4 | **Biblioteca pedagógica accesible desde menú** | ✅ Implementado (F1.4) | `src/pedagogy/biblioteca.js` | Acumula cards desbloqueadas en localStorage |
| 5 | **Dato pre-nivel con citation + botón Continuar** | ✅ Implementado (F1.5) | `src/pedagogy/data-screen.js` | Antes de cada stage, dato + botón "Continuar" |
| 6 | **Pantalla final con 4 enlaces** (plataforma, alegaciones, asociación, hashtag) | ✅ Implementado (F1.6) | `src/pedagogy/final-screen.js` | Cierre del loop pedagógico → 4 URLs verificadas |
| 7 | **TTS accesibilidad con Web Speech API** | ✅ Implementado (F5.1) | `src/accessibility/tts.js` | Botón 🔊 Escuchar en cada card, voz `es-ES`, configurable en PauseOverlay |
| 8 | **Sharing en redes sociales** (`?ref=<base64-score>`) | ✅ Implementado (F5.4) | `src/sharing/share.js` | Link compartible Twitter/Facebook/clipboard/native |
| 9 | **Disclaimer TRECO modal en splash + Acerca de** | ✅ Implementado (F3.3) | `src/ui/disclaimer-splash.js` | Splash modal + accesible desde "Acerca de" |
| 10 | **High-contrast mode toggleable** | ✅ Implementado (F5.2) | `src/accessibility/contrast.js` | Toggle desde PauseOverlay a11y panel |
| 11 | **Reduced-motion toggleable** | ✅ Implementado (F5.3) | `src/accessibility/reduced-motion.js` | Toggle desde PauseOverlay a11y panel |

> **Decisión consciente (no aplicar)**: las pantallas "Novel" entre stages no se implementan porque el flow stage-select → data-screen → gameplay ya cubre el espacio narrativo sin añadir fricción.

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

**HP base** actualizado post-F6.1 y F7.3: todos los no-boss mueren en 1 disparo. `planta_treco` mini-boss estático (stages 1-4) tiene `hp:1`. `planta_treco_boss` final-boss del stage5 tiene `archetype:'boss'` → `hp:30`. `sello_burocratico` (boss archetype en stages 1-5 como boss secundario) también mantiene `hp:30`. El "boss fight" dramático del stage5 ahora existe (30 hits, lifecycle='desactivacion').

| ID | Nombre | Tipo | HP base | Puntos × mult | Dato pedagógico |
|---|---|---|---|---|---|
| `camion_treco` | Camión TRECO | standard | 1 | 10 | Logística del proyecto |
| `bidon_lixiviado` | Bidón lixiviado | standard | 1 | 10 | Lixiviados tóxicos al acuífero |
| `bolsa_plastico` | Bolsa de plástico | standard | 1 | 10 | Contaminación cotidiana |
| `valla_publicitaria` | Valla publicitaria | static | — | 10 | Eufemismo del proyecto |
| `dron_fumigador` | Dron fumigador | tank | **1** (F6.1) | 15 | Fumigación industrial |
| `camion_cisterna_residuos` | Camión cisterna | tank | **1** (F6.1) | 15 | Sustituye plataforma_solar (decisión 2026-09-03) |
| `tubo_lixiviado` | Tubo lixiviado | standard | 1 | 10 | Descarga clandestina |
| `sello_burocratico` | Sello burocrático | boss | **1** (F6.1) | 30 | Burocracia que aprueba |
| `topadora` | Topadora | standard | **1** (F6.1) | 10 | Destrucción de encinas |
| `incineradora` | Incineradora móvil | standard | **1** (F6.1) | 10 | Quema residuos |
| `trailer` | Trailer | standard | **1** (F6.1) | 10 | Ruta junto a colegio |
| `planta_treco_boss` | Planta TRECO (final boss del stage5) | boss | **30** | 30 | **Se desactiva, NO muere** |
| `planta_treco` | Planta TRECO (mini-boss estático stages 1-4) | mini-boss | 1 | 20 | Se destruye normal (sin desactivación) |

> **Nota F6.1**: el archetype `tank`/`mini-boss`/`boss` (excepto `planta_treco` como final boss) se unificó a `hp: 1` porque los enemigos multi-hit generaban bugs de UX (algunos enemigos no morían con 1 disparo por overlap con sprite oculto detrás). El `multiplier` (1.5×, 2×, 3×) preserva la jerarquía de score: el `dron_fumigador` (tank) sigue dando 15 pts vs 10 pts del standard.

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

## 9. Arquitectura de archivos (real al HEAD actual)

```
zarra-defenders-2d/
├── README.md
├── PLAN.md                         (existente, 874 líneas)
├── LICENSE                         (MIT)
├── index.html                      (Pixi.js@8 CDN + vendor/pixi.min.js fallback)
├── start_server.sh                 (dev server helper)
├── AGENTS.md                       (convenciones de agente — URLs, port, format)
├── MANUAL_PLAYTHROUGH.md           (acceptance formal, 17 secciones)
├── docs/
│   ├── VISION.md                   ← este archivo
│   ├── IMPLEMENTATION-STATUS.md    (estado técnico al HEAD actual)
│   ├── ROADMAP.md                  (plan priorizado en fases + polish iterations)
│   └── pedagogy-data.json          (legacy — data vive ahora en src/i18n/es.js)
├── assets/
│   ├── sprites/                    (27 PNGs)
│   ├── backgrounds/                (5 PNGs stages + manifest.json)
│   ├── menu_bg/                    (2 backgrounds de menú dedicada)
│   ├── raw/                        (originales minimax MCP — gitignored, regenerable)
│   ├── ui/                         (crosshair, hearts, papeleta_firmada)
│   ├── explosions/                 (no usado — disciplina 3D sin partículas)
│   ├── references/                 (NOTES.md por stage)
│   └── tiles/                      (tile variants — algunos en _discarded/)
├── vendor/
│   └── pixi.min.js                 (Pixi.js@8 offline fallback, F6)
├── src/
│   ├── main.js                     (bootstrap, game loop, ?test=1 wiring, F3.5.1bis/ter)
│   ├── canvas.js                   (legacy, no usado en main)
│   ├── rail-camera.js              (cámara path-based, waypoints)
│   ├── input.js                    (mouse + touch + light-gun HID unificado)
│   ├── player.js                   (crosshair)
│   ├── combat.js                   (papeleta pool, AABB hit, F6.1 nearest-center tie-break)
│   ├── enemies.js                  (4 archetypes + 4 movement patterns + F6.1 hp/hitInset)
│   ├── integrity.js                (3-segment state machine + freeze-on-gameover)
│   ├── score.js                    (firmas + best localStorage + cardsShown[])
│   ├── backgrounds.js              (BackgroundLayer parallax 0.2 + freeze)
│   ├── event-bus.js                (EventTarget singleton + pedagogy:visibility)
│   ├── sprite-loader.js            (manifest + preload)
│   ├── test-api.js                 (window.__gameTestAPI__ — 20+ métodos)
│   ├── random.js                   (mulberry32 PRNG)
│   ├── debug-hitboxes.js           (?hitboxes=1 + tecla H)
│   ├── engine/
│   │   └── dom-debug.js            (A8 — __zr debug utility, console gate)
│   ├── iso/
│   │   ├── iso-math.js             (iso↔screen transforms, depth, escape-front)
│   │   ├── tilemap.js              (DEPRECATED en main — conservado para demos)
│   │   └── world.js                (IsoWorld container)
│   ├── levels/
│   │   ├── test-level.js           (roster 120 enemigos determinista)
│   │   └── stage-rosters.js        (5 production stages — F6)
│   ├── pedagogy/
│   │   ├── cards.js                (card in-game + F3.5.4 compact + expand + pedagogy:visibility emit)
│   │   ├── modal-intermedio.js     (cada 5 hits + F3.5.4 stacking + DOM-peek boot)
│   │   ├── resumen-final.js        (debrief post-stage)
│   │   ├── biblioteca.js           (biblioteca navegable)
│   │   ├── data-screen.js          (F1.5 pre-nivel)
│   │   └── final-screen.js         (F1.6 post-boss con 4 enlaces)
│   ├── audio/
│   │   ├── music.js                (F4 — MusicEngine jota procedural)
│   │   ├── sfx.js                  (F4 — SFXEngine procedurales Web Audio)
│   │   └── audio-context.js        (singleton + master volume)
│   ├── accessibility/
│   │   ├── tts.js                  (F5.1 — Web Speech API es-ES)
│   │   ├── contrast.js             (F5.2 — high-contrast toggle)
│   │   └── reduced-motion.js       (F5.3 — prefers-reduced-motion)
│   ├── sharing/
│   │   └── share.js                (F5.4 — Twitter/Facebook/clipboard/native)
│   ├── i18n/
│   │   └── es.js                   (A2+A6 — STRINGS centralizado, 84 refs)
│   └── ui/
│       ├── hud.js                  (hearts + hand sprite + viewport-aware)
│       ├── menu.js                 (main menu + stage select)
│       ├── overlay.js              (game-over + victory + share)
│       ├── pause.js                (pause overlay + F3.5.1bis orientation gate + a11y panel)
│       ├── disclaimer-splash.js    (F3.3 — Art. 20 CE + Art. 11 CDFUE)
│       └── i18n-bootstrap.js       (aplica STRINGS al DOM estático)
├── openspec/
│   ├── config.yaml
│   ├── specs/                      (13 specs canónicas — ver §B.4 de IMPLEMENTATION-STATUS)
│   └── changes/
│       └── archive/                (21 changes F0-F6 cerrados)
└── scripts/
    └── verify.sh                   (8 checks estructurales — 8/8 PASS)
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
- **Boss desactivación (A7 contract)**: `lifecycle='desactivacion'` se aplica al **final-boss** del stage5 (`enemies_planta_treco_boss`). Se setea tanto en `src/levels/test-level.js:184` (modo `?test=1`, para `enemies_planta_treco`) como en `src/levels/stage-rosters.js` (production, para `enemies_planta_treco_boss`). El listener en `main.js:436` discrimina via `FINAL_BOSS_SPRITE_IDS.includes(detail.spriteId)`.
- **No explosión**, no partículas, no debris — solo desaturación + halt motion
- **Final screen** tras desactivar el final-boss del stage5: dato + 3 enlaces web + 1 hashtag. **Todas las URLs verificadas con `curl -L`** (ver `IMPLEMENTATION-STATUS.md §L`).

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

### 11.3. Decisiones tomadas

| # | Decisión | Opciones | Resolución |
|---|---|---|---|
| D1 | ¿Música procedural o Suno? | (A) Web Audio procedural jota, (B) Suno Pro | **A implementado** — `src/audio/music.js` jota procedural (F4) |
| D2 | ¿Variantes de proyectil? | (A) 1 sola papeleta, (B) sello + super-firma | **A confirmado** para v1; B futuro |
| D3 | ¿Power-ups del 3D? | (A) sí como drops, (B) no, (C) como opciones de gameplay | **B confirmado** — disparo ya ES la firma (VISION §8) |
| D4 | ¿Sprite explosion? | (A) sí, (B) no (coherente con 3D no-particles) | **B confirmado** — sin explosiones (mantiene disciplina 3D) |
| D5 | ¿Light gun support? | (A) sí (3D parity), (B) no (mouse-only) | **B confirmado** — sin pointer lock no aplica |
| D6 | ¿TTS accesibilidad? | (A) sí con Web Speech API, (B) no | **A implementado** — `src/accessibility/tts.js` (F5.1) |
| D7 | ¿Sharing en redes? | (A) sí, (B) no | **A implementado** — `src/sharing/share.js` (F5.4) |
| D8 | ¿HP multi-hit para `tank`/`mini-boss`? | (A) sí (balance), (B) no (1-shot-kill) | **B implementado F6.1** — tank/mini-boss ahora HP 1, todos mueren en 1 disparo (boss `sello_burocratico` mantiene HP 30). El `planta_treco_boss` final-boss del stage5 (F7.3) ahora tiene `archetype:'boss'` → HP 30 (boss fight real). |
| D9 | ¿Per-stage rosters específicos o TEST_LEVEL compartido? | (A) específicos, (B) TEST_LEVEL compartido | **B con A como defer** — `getRosterForStage()` enruta a stage-rosters.js específicos; TEST_LEVEL es fallback |
| D10 | ¿Pedagogy card compact footprint o full-size? | (A) compact ~96px (F3.5.4), (B) full-size legacy | **A implementado F3.5.4** — compact a la derecha de la mano + expand-on-click |
| D11 | ¿Pause overlay Continuar siempre enabled o gated? | (A) always enabled, (B) gated en portrait (F3.5.1bis) | **B implementado F3.5.1bis** — gated con hint "Girá el móvil para continuar" |

### 11.4. Decisiones pendientes (post-v1)

| # | Decisión | Estado |
|---|---|---|
| P1 | ¿Crear change SDD formal para los 4 refinements pre-fase7 (F3.5.1bis, F3.5.1ter, F3.5.4, F6.1)? | 🔲 Pendiente para Fase 7.2 archive |
| P2 | ¿Suno Pro para reemplazar jota procedural? | ⚪ Diferido — fase B opcional |
| P3 | ¿Boss desactivación para los 4 bosses intermedios (no solo final)? | 🔄 Diferido — A7 aplica solo al final-boss del stage5 (`planta_treco_boss`). Los `sello_burocratico` bosses intermedios se destruyen normal (sin desactivación). |

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

---

## 13. Auditoría 2026-09-28 — bugs pedagógicos RESUELTOS el 2026-09-29

Durante el refactor de docs (unificación bajo `docs/`, agregación de índice en
AGENTS.md) se contrastó esta visión y los otros documentos contra el código
real. Se identificaron **4 bugs pedagógicos** que **fueron resueltos el
2026-09-29** en el change
[`openspec/changes/archive/2026-09-29-fix-pedagogical-bugs/`](../../openspec/changes/archive/2026-09-29-fix-pedagogical-bugs/)
(verdict PASS):

1. **✅ Resuelto** — Contrato A7 desactivación roto en producción: `planta_treco_boss` (spriteId distinto) ahora se desactiva correctamente en stage5 production, emitiendo `zarra:desactivacion` que dispara el `final-screen`. Listener discrimina mini-boss vs final-boss con `FINAL_BOSS_SPRITE_IDS = ['enemies_planta_treco', 'enemies_planta_treco_boss']`.
2. **✅ Resuelto** — `planta_treco` con `hp:30`: en stage5 production ahora se carga con `archetype:'boss'` (hp:30). El "boss fight" dramático existe (30 hits).
3. **✅ Resuelto** — 2 enlaces del final-screen 404 reemplazados por comunicados públicos reales (200 OK): `nomacrovertederozarra.com/alegaciones` → Valencia Plaza "Crece el rechazo..."; `nomacrovertederozarra.com/asociacion` → Las Provincias "La plataforma acuerda...".
4. **✅ Resuelto** — Pedagogical sign-off futuro: proceso institucionalizado en `IMPLEMENTATION-STATUS.md §L.3` (bloque `curl -L` obligatorio antes de firmar).

Detalles completos del fix en [`IMPLEMENTATION-STATUS.md §K`](./IMPLEMENTATION-STATUS.md#k-bugs-pedag%C3%B3gicos-resueltos-en-el-change-2026-09-29-fix-pedagogical-bugs).
Spec nuevo de regresión: [`tests/e2e/final-screen-production.spec.mjs`](../../tests/e2e/final-screen-production.spec.mjs).