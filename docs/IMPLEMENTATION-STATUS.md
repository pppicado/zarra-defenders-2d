# Estado de implementación — zarra-defenders-2d

> **Inventario técnico exhaustivo**: qué está hecho, qué está a medias, qué falta.
> Cruza **conceptos del 3D** + **conceptos propios del 2D** + **estado actual verificado**.
>
> **Leyenda**:
> - ✅ **Implementado idéntico** — feature completa, validada por tests
> - 🔄 **Adaptado al 2D** — concepto del 3D aplicado con modificaciones
> - 🟡 **Parcial** — algo funciona, falta la mayoría
> - ❌ **No implementado** — no existe en código
> - ❓ **Por verificar** — necesita inspección directa

> **Última actualización**: 2026-09-17
> **HEAD**: `ea5ac98` (`feat(backgrounds): 3D-aligned stages + LONG panoramic composites + tile-based catalog`)
> **Working tree**: clean

---

## Resumen ejecutivo

| Categoría | Total | ✅ | 🔄 | 🟡 | ❌ |
|---|---|---|---|---|---|
| **Conceptos del 3D** | 40 | 5 | 11 | 10 | 14 |
| **Conceptos propios del 2D** | 37 | 11 | 4 | 3 | 19 |
| **Conceptos pedagógicos** | 14 | 0 | 1 | 1 | 12 |
| **TOTAL** | **91** | **16 (18%)** | **16 (18%)** | **14 (15%)** | **45 (49%)** |

**El proyecto tiene el pipeline técnico completo (combat, integridad, scoring, backgrounds, menús, test API) pero la capa pedagógica y de polish están mayoritariamente pendientes.**

---

## A. Conceptos del proyecto 3D (zarra-defenders) — Estado en 2D

### A.1. REQ-1..15 — Requisitos funcionales

| # | Concepto del 3D | Estado en 2D | Evidencia | Notas |
|---|---|---|---|---|
| REQ-1 | Compatibilidad navegadores + lanzamiento estático | 🟡 | `index.html:65` carga Pixi.js@7.4.0 desde CDN; sin offline-fallback | Pixi.js CDN dependency; verificar offline en F7+ |
| REQ-2 | Mouse + 4 light guns | 🔄 | `PLAN.md:116` "asumir mouse siempre"; `src/input.js` unifica mouse+touch | Light-gun = mouse USB, sin código específico |
| REQ-3 | 5 niveles Valle de Ayora | ✅ | `src/ui/menu.js:36-40` stage1-lashoyas → stage5-acuifero; re-alineado con 3D | Mismas toponimias, mismos 5 bosses |
| REQ-4 | 11 enemigos + 5 bosses | 🔄 | `assets/sprites/manifest.json:1-69` 11 enemigos activos + helpers | Cambia `plataforma_solar` → `camion_cisterna_residuos` (decisión 2026-09-03) |
| REQ-5 | 6 power-ups cívicos | ❌ | `grep -r powerup\|FIRMA\|alegacion src/` = 0 hits | Disparar siempre mismo gesto, sin drops |
| REQ-6 | 4-5 waves + 30s + 3 concurrent + boss | 🟡 | `src/levels/test-level.js` 120 enemigos test; sin `mecanica.waveSec` ni dispatcher | Falta separar en waves |
| REQ-7 | Boss FSM (entry→vulnerable→special→desactivación) | ❌ | `combat-core/spec.md:115-120` solo "destroyed" genérico animation 200ms | Sin desactivación pedagógica, sin FSM |
| REQ-8 | Crosshair/enemy flash + screen-shake | 🟡 | `src/debug-hitboxes.js:2-8` overlay debug; `src/player.js:47-50` crosshair PIXI.Graphics | Crosshair flash ❌, enemy flash ❌, screen-shake ❌ |
| REQ-9 | Ammo 12/12 + 1.2s reload + R | ❌ | `combat-core/spec.md:18-25` `FIRE_COOLDOWN_MS=333ms` cooldown global, sin magazine | 2D usa cooldown simple |
| REQ-10 | Pause 3 botones | 🟡 | `src/ui/overlay.js:7-15` solo 2 botones (Reintentar/Volver); pause overlay dedicado ❌ | Falta dedicated pause overlay |
| REQ-11 | Retry preserva session score | 🔄 | `src/score.js:36-37` best firmas per stage en localStorage; session score en memoria | 2D persiste best per stage; 3D no persiste (D13) |
| REQ-12 | Combo ×5 cap + 2s decay | ❌ | `combat-core/spec.md:107` solo `points = 10 × archetype_multiplier` por hit | Sin combo, sin decay timer, sin cap |
| REQ-13 | STRINGS centralizado en data.js | ❌ | `grep -r STRINGS src/` = 0 hits; `docs/` directorio VACÍO | Strings hardcoded en `ui/menu.js`, `ui/overlay.js`, `ui/hud.js` |
| REQ-14 | Final screen + desactivación planta_treco + 4 enlaces | ❌ | `src/levels/test-level.js:265-266` `finalBossId:'e24'`; final screen NO existe | Sin dato final, sin links |
| REQ-15 | Manual playthrough + verify.sh | 🟡 | `MANUAL_PLAYTHROUGH.md` existe en raíz (Fase 2.1 ✅ ubicación, ⏳ sign-off pedagógico); `scripts/verify.sh` no existe (Fase 2.2 pendiente) | Aceptación es 16 Playwright e2e |

### A.2. Decisiones arquitectónicas A1-A9

| # | Concepto | Estado | Evidencia | Notas |
|---|---|---|---|---|
| A1 | Model-blueprint registry | 🔄 | `src/sprite-loader.js` + `assets/sprites/manifest.json` JSON-based | 2D usa JSON manifest vs 3D factory JS |
| A2 | STRINGS en `data.js` | ❌ | I18n planeado `PLAN.md:281-307` pero no creado | **Bloqueante pedagógico** |
| A3 | First-click atomic gesture | 🔄 | `src/main.js:670` orientation modal; sin pointer lock | 2D no necesita pointer lock |
| A4 | Light-gun absolute-cursor fallback | 🔄 | `src/input.js` "asumir mouse siempre" | 2D sin pointer lock = sin fallback |
| A5 | Fuentes pre-researched | 🟡 | `assets/backgrounds/manifest.json:1-7` 5 paths; `.fuente` strings no pobladas en JS | Falta `src/i18n/es.js` con las 6 fuentes |
| A6 | URLs en STRINGS, cero literals | ❌ | No hay STRINGS, no hay final-screen, no hay URLs | Aplica post-creación módulo i18n |
| A7 | Every boss desactivación lifecycle | ❌ | Sin desactivación pedagógica | **Bloqueante pedagógico** |
| A8 | Zero console.* via `__zarra.debug` | ❌ | `console.warn` libre en `combat.js:207`, `main.js:18-19`, `sprite-loader.js:40` | Sin `__zr` utility |
| A9 | ASCII comments en models | ✅ | `src/*.js` ASCII consistente | Idéntico |

### A.3. Decisiones de diseño D1-D21 (muestra crítica)

| # | Concepto | Estado | Notas |
|---|---|---|---|
| D11 | Wave scheduler state machine | ❌ | Solo `combat-core/spec.md:418-427` implícito en TEST_LEVEL |
| D12 | Combo scoring cap ×5 | ❌ | No hay combo |
| D13 | Zero persistence v1 | ❌ Inverso | 2D persiste best per stage |
| D15 | HTML entrypoint no bundler | ✅ | Mantiene identidad |
| D16 | No tests no build | 🔄 | 2D tiene 39 unit + 16 e2e (cubre acceptance) |
| D17 | `.fuente` strings populated | ❌ | Sin crear `src/i18n/es.js` |
| D18 | `STRINGS.final.enlaces.*_url` | ❌ | Sin crear i18n |
| D19 | All 5 bosses desactivación | ❌ | Sin mecánica |
| D20 | `__zarra.debug` utility | ❌ | Sin `__zr` |
| D21 | ASCII transliterations | ✅ | Idéntico |

### A.4. Conceptos específicos del 3D

| Concepto | Estado en 2D | Notas |
|---|---|---|
| Dato screen pre-nivel (5s) | ❌ | Planeado, no implementado |
| Volume + `[`/`]`/`M` en HUD | ❌ | Sin audio implementado |
| `puntos` y `combo` mecánico | 🔄 | Solo `firmas recogidas` + `archetype_multiplier` |
| Magazine 12/12 + 1.2s reload | ❌ | Solo cooldown 333ms |
| No persistence v1 (D13) | ❌ Inverso | 2D persiste |
| Cero partículas v1 | ✅ | Sin explosiones (mantiene disciplina) |
| Créditos formales con entidades reales | ❌ | PLAN §4.2 menciona, sin contenido |
| Pantalla de inicio con título | ✅ | Main menu DOM-overlay |
| Dual modality PC (mouse + light gun) | 🔄 | Mouse + touch |
| First-click atomic gesture A3 | 🔄 | Sin pointer lock, gesture implícito |
| **Power-ups como acciones cívicas** | ❌ | **Decisión consciente: NO aplicar drops** |

---

## B. Conceptos específicos del 2D — Estado

### B.1. Pipeline técnico (✅ implementado)

| # | Concepto | Evidencia | LOC |
|---|---|---|---|
| 1 | Bootstrap Pixi dual-app (world + HUD) | `src/main.js:174-637` | 720 |
| 2 | Canvas 1280×720 logical + CSS scale | `src/canvas.js:1-24` | 24 |
| 3 | Rail camera con path iso (0,0)→(36,36) en 120s | `src/rail-camera.js:1-138` | 138 |
| 4 | Input unificado mouse+touch con tap detection | `src/input.js:1-218` | 218 |
| 5 | Crosshair PIXI.Graphics vector | `src/player.js:47-50` | 137 |
| 6 | Hand sprite en primera persona | `assets/sprites/hand_pen.png` | — |
| 7 | Papeleta firmada visible (proyectil) | `assets/sprites/papeleta_firmada.png` + `combat.js:33` | — |
| 8 | Combat: cooldown, pool, AABB hit resolution | `src/combat.js:1-414` | 414 |
| 9 | Projectile homing per-frame + sine flutter | `combat.js:112-119` | — |
| 10 | Enemy archetypes (standard/tank/mini-boss/boss) | `src/enemies.js:149-167` | 814 |
| 11 | 4 movement patterns (linear/sine/zigzag/arc) | `src/enemies.js:200-236` | — |
| 12 | Lateral screen-bounds clamp | `src/enemies.js:46-47` | — |
| 13 | Screen-space hit detection | `src/combat.js:354-375` | — |
| 14 | Per-archetype hitInset | `src/enemies.js:163-166` | — |
| 15 | Determinismo `?test=1` + mulberry32 | `src/random.js:1-32` | 32 |
| 16 | Test API `window.__gameTestAPI__` (17 métodos) | `src/test-api.js:1-236` | 236 |
| 17 | Integrity 3-segment state machine | `src/integrity.js:1-79` | 79 |
| 18 | Score + firmas + best localStorage | `src/score.js:1-136` | 136 |
| 19 | HUD: 3 hearts + hand sprite | `src/ui/hud.js:1-211` | 211 |
| 20 | Overlay game-over + victory | `src/ui/overlay.js:1-181` | 181 |
| 21 | Main menu + stage select + lock progression | `src/ui/menu.js:1-315` | 315 |
| 22 | About + Disclaimer modales | `src/ui/menu.js:226-248` | — |
| 23 | BackgroundLayer parallax 0.2 + freeze/unfreeze | `src/backgrounds.js:120-243` | 243 |
| 24 | 5 backgrounds PNGs | `assets/backgrounds/stage{1-5}-*.png` | — |
| 25 | Orientation lock portrait < 360 px | `src/main.js:646-671` | — |
| 26 | Fullscreen button + Esc exit | `src/main.js:673-704` | — |
| 27 | Debug hitbox overlay (?hitboxes=1 + tecla H) | `src/debug-hitboxes.js:1-135` | 135 |
| 28 | Event bus singleton | `src/event-bus.js:1-37` | 37 |
| 29 | Sprite loader con manifest + preload | `src/sprite-loader.js:1-47` | 47 |
| 30 | Iso math (iso↔screen) | `src/iso/iso-math.js:1-184` | 184 |
| 31 | IsoWorld container | `src/iso/world.js:1-266` | 266 |
| 32 | Tilemap (DEPRECATED en main) | `src/iso/tilemap.js:1-194` | 194 |
| 33 | TEST_LEVEL roster 120 enemigos determinista | `src/levels/test-level.js:1-328` | 328 |

**Total implementado**: ~5 857 LOC en `src/` + 394 LOC CSS + 69 LOC HTML = **~6 320 LOC**

### B.2. Conceptos específicos del 2D — pendientes (❌)

| # | Concepto | Estado | Dependencias | Notas |
|---|---|---|---|---|
| 1 | **Card pedagógica in-game al destruir enemigo** | ❌ | Módulo `src/pedagogy/cards.js`, listener `combat:hit` | Dato + título + URL fuente flotante 3s |
| 2 | **Modal intermedio cada 5 enemigos** | ❌ | Contador en `Score` (ya tiene `firmas`); falta trigger + overlay | "Has destruido 5 lixiviados, contaminando 1000 L del río Cabriel" |
| 3 | **Resumen completo navegable al final del stage** | ❌ | Overlay post-`stage:cleared` con cards, scroll, prev/next | Debrief style "card stack" |
| 4 | **Biblioteca pedagógica accesible desde menú** | ❌ | Nuevo modal en `src/ui/menu.js`; persistir cards en `localStorage` | "Biblioteca" button en menú principal |
| 5 | **Pantalla Novel entre stages** | ❌ | Tipo novela visual fullscreen con texto + fondo + música | Cierre narrativo entre stages |
| 6 | **TTS accesibilidad con Web Speech API** | ❌ | `src/accessibility/tts.js`; botón 🔊 Escuchar en cada card | Voz `es-ES`, persistente en `zarra2d:settings:tts` |
| 7 | **Sharing en redes sociales** (`?ref=<base64-score>`) | ❌ | `src/sharing/share.js`; botón en victory overlay | Twitter/Facebook/Copy/navigator.share |
| 8 | **Disclaimer TRECO modal splash + footers** | 🟡 | Splash al cargar `index.html` con texto completo | Texto legal en README + ui/menu.js, sin modal splash |
| 9 | **Dato pre-nivel con citation + botón Continuar** | ❌ | 5s pedagógico antes de cada stage | Reemplaza pantalla de level-select actual |
| 10 | **Pantalla final con 4 enlaces** | ❌ | Post-boss desactivación → overlay con dato + 4 links | `nomacrovertederozarra.com` + alegaciones + asociación + hashtag |
| 11 | **Boss desactivación uniforme** | ❌ | `lifecycle='desactivacion'` en planta_treco | Desaturation + motion halt, NO explosión |
| 12 | **Per-stage enemigo rosters** | ❌ | `src/levels/stage{1-5}-*.js` específicos | Hoy todos comparten TEST_LEVEL 120-enemy |
| 13 | **Backgrounds de menú** (4 pendientes) | ❌ | Menú principal, stage select, game over, biblioteca |
| 14 | **Crosshair sprite real** | ❌ | PIXI.Graphics vector actual OK, sprite PNG futuro | Mejora visual menor |
| 15 | **Sprites de explosión** | ❌ | Pipeline asset + chroma-key | Disciplina 3D "no particles" sugiere NO implementar |
| 16 | **Iconos UI adicionales** | ❌ | pause, library, help, settings | Fullscreen ✅ existe |
| 17 | **Camión cisterna sprite real** | ❌ | Regenerar placeholder 390 bytes | `manifest.json:32-34` marca `placeholder: true` |
| 18 | **Pixi.js bundle offline fallback** | ❌ | Descargar `pixi.min.js` local | `index.html:65` solo CDN |
| 19 | **Variantes de proyectil** (sello/super-firma) | ❌ | Iteración futura confirmada para v1 |
| 20 | **Modo alto contraste daltonismo** | ❌ | CSS class toggleable | Accesibilidad |
| 21 | **`prefers-reduced-motion`** | ❌ | CSS media query + flag JS | Accesibilidad |
| 22 | **i18n extraction** (`src/i18n/es.js`) | ❌ | ~30 strings hardcoded a centralizar | **Bloqueante pedagógico** |
| 23 | **Mobile QA en varios dispositivos** | ❌ | Profile en iOS/Android varios | Performance |
| 24 | **Performance profiling** | ❌ | Sin benchmarks documentados | Sin budget explícito |
| 25 | **Audio/música** (jota o Suno) | ❌ | `src/audio/music.js` | 0 archivos audio en repo |
| 26 | **SFX procedurales** | ❌ | `src/audio/sfx.js` | Web Audio API procedural |
| 27 | **Pause overlay dedicado** (3 botones) | ❌ | `src/ui/pause.js` | Solo back-to-menu actual |
| 28 | **`MANUAL_PLAYTHROUGH.md`** formal | 🟡 | Ubicación ✅ raíz; secciones §0–§18 completas; sign-off pedagógico ⏳ | Aceptación pedagógica |
| 29 | **`scripts/verify.sh`** estructural | ❌ | 8 checks adaptados al 2D | Bloqueante de archive |
| 30 | **Folleto del Valle / QR imprimible** | ❌ | SVG estático | Del 3D: assets/qr-zarra-defenders.svg |
| 31 | **Volumen master + `[`/`]`/`M`** | ❌ | HUD overlay | Aplica post-audio |
| 32 | **Power-ups del 3D** | ❌ | **Decisión consciente NO aplicar drops** | Disparo ya ES firma |
| 33 | **Manifest-driven asset registry JS** | 🟡 | JSON actual vs 3D factories JS | Trade-off tooling |
| 34 | **Per-tile iso rotation π/4** | ✅ | `iso-gallery/spec.md:GAL-002 F2.5.15` | Implementado |
| 35 | **Manifest invariant `totals.active === 40`** | 🟡 | `ASSET-007`/`GAL-001` asertan `discarded.length===40` pero shipped `manifest.json` tiene `discarded:[]` | Drift conocido |
| 36 | **Cache-busting `?v=N` consistente** | 🟡 | `tests/unit/integrity.spec.mjs` usa `?v=26` vs código `?v=44` | Bug trivial fix |
| 37 | **Compatibilidad browsers** | 🟡 | Inferida por APIs usadas, no testeada | BrowserStack no disponible |

---

## C. Pedagogía — Estado detallado

### C.1. Cobertura pedagógica actual: **0% implementado / 80% documentado**

| Mecanismo | Estado | Detalle |
|---|---|---|
| Card in-game al destruir enemigo | ❌ 0% | Sin módulo, sin UI, sin datos cargados |
| Modal intermedio cada 5 enemigos | ❌ 0% | Sin módulo, sin UI, sin lógica |
| Resumen navegable al final del stage | ❌ 0% | Sin módulo, sin UI, sin lógica |
| Biblioteca pedagógica accesible desde menú | ❌ 0% | Sin módulo, sin UI, sin persistencia |
| Pantalla Novel entre stages | ❌ 0% | Sin módulo, sin UI, sin assets |
| Pantalla final con 4 enlaces | ❌ 0% | Sin módulo, sin UI, sin URLs |
| TTS accesibilidad | ❌ 0% | Sin módulo, sin UI, sin config |
| Sharing en redes | ❌ 0% | Sin módulo, sin UI, sin lógica |
| Disclaimer TRECO modal | 🟡 30% | Texto en `ui/menu.js:55-58` (acerca de); splash no implementado |
| Dato pre-nivel | ❌ 0% | Sin módulo, sin UI, sin lógica |

### C.2. Datos pedagógicos — dónde están

**Verificado**: `grep -r "fuente\|fuentes" src/` no encuentra ninguna referencia en código JS. Solo aparece en `ui/menu.js:55-58` (modal Disclaimer menciona "fuentes citadas" como promesa a futuro).

| Recurso | Ubicación | Estado |
|---|---|---|
| `research/fuentes.md` | **No existe en 2D** | Necesita copiarse del 3D |
| Datos por stage | `assets/references/stage{1-5}-*/NOTES.md` (47-54 líneas c/u) | **NO cargados en código JS** |
| Texto del dato | Solo en NOTES.md markdown | Sin extraer a runtime |
| URL de la fuente | Solo en NOTES.md markdown | Sin extraer a runtime |
| Display al jugador | N/A | Sin card, sin modal, sin overlay |

### C.3. Pedagogical sign-off — checklist

**Existe** en el 2D (`MANUAL_PLAYTHROUGH.md` en raíz, §12) pero **sin firmar**. El 3D tiene la misma sección §12 con 6 entradas que el pedagogo (usuario) debe firmar:

| Key | Revisado? | Pedagogo sign-off |
|---|---|---|
| `STRINGS.datos.nivel1.texto` + `.fuente` | ❌ | ❌ |
| `STRINGS.datos.nivel2.texto` + `.fuente` | ❌ | ❌ |
| `STRINGS.datos.nivel3.texto` + `.fuente` | ❌ | ❌ |
| `STRINGS.datos.nivel4.texto` + `.fuente` | ❌ | ❌ |
| `STRINGS.datos.nivel5.texto` + `.fuente` | ❌ | ❌ |
| `STRINGS.datos.final.texto` + `.fuente` | ❌ | ❌ |

---

## D. Game loop — Estado

### D.1. Estados actuales (3)

```js
// src/main.js:106
const gameState = { state: 'main-menu' }
// 'main-menu' | 'gameplay' | 'overlay'
```

### D.2. Transiciones implementadas

| From | Trigger | To | Estado |
|---|---|---|---|
| [main-menu] | Click "Jugar" → menu:startStage | [gameplay] | ✅ |
| [gameplay] | integrity:exhausted | [overlay] (gameover) | ✅ |
| [gameplay] | stage:cleared | [overlay] (victory) | ✅ |
| [gameplay] | Esc / BG-011 → menu:back | [main-menu] | ✅ |
| [overlay] | Click "Reintentar" | [gameplay] | ✅ |
| [overlay] | Click "Volver al menú" | [main-menu] | ✅ |

### D.3. Transiciones faltantes

| From | Trigger | To | Estado | Implementación estimada |
|---|---|---|---|---|
| [gameplay] | Esc / P → pause | [paused] | ❌ | 🟡 ~150 LOC |
| [overlay] victory | stage:cleared | [novel] | ❌ | 🟠 ~500 LOC |
| [main-menu] | Click "Biblioteca" | [library] (modal) | ❌ | 🟡 ~300 LOC |
| [main-menu] | Click "Ajustes" | [settings] (modal) | ❌ | 🟡 ~200 LOC |
| [main-menu] | Click "Disclaimer" | [disclaimer-modal] | ✅ | `src/ui/menu.js:241-248` |
| [main-menu] | Click "Acerca de" | [about-modal] | ✅ | `src/ui/menu.js:226-236` |

---

## E. Assets — Estado

### E.1. Sprites (26 PNGs / 5.7 MB)

**Activos** (verificado `manifest.json:2-69`):

| Categoría | Cantidad | Estado |
|---|---|---|
| Enemigos | 11 + 1 placeholder + 1 deprecated | 🟡 placeholder `camion_cisterna_residuos` (390 bytes) |
| Buildings | 3 | ✅ |
| Trees | 3 | ✅ |
| Props | 3 | ✅ |
| UI (hand, papeleta, hearts×2) | 4 | ✅ |

**Pendientes**:

- ❌ Camión cisterna sprite real (regenerar placeholder)
- ❌ Crosshair sprite real (PIXI.Graphics OK)
- ❌ Sprites de explosión (decisión: NO aplicar disciplina 3D)
- ❌ Iconos UI adicionales (pause, library, help, settings)

### E.2. Backgrounds (5/5 + iteraciones 143 MB)

**Definitivos** (en raíz `assets/backgrounds/`):
- `stage1-lashoyas.png` 180 KB
- `stage2-lahoz.png` 632 KB
- `stage3-lahunde.png` 188 KB
- `stage4-ayora.png` 200 KB
- `stage5-acuifero.png` 152 KB
- `manifest.json`

**Iteraciones descartadas** (preservadas en disco, NO en git):
- `v2-rpg/` (9.2 MB), `v3-rpg-isometric/` (5.8 MB)
- `v4-journey/` + `v4-journey-processed/`
- `v5-tiles/` + `v5-tiles-processed/`
- `long-bg/` + `long-bg-composites/` (74 MB)
- `raw/` (2.5 MB)

**Pendientes**:
- ❌ 4 backgrounds de menú (Valle panorámica, mapa cartográfico, vertedero, río Cabriel)

### E.3. Audio

**Estado**: 0 archivos `.mp3`/`.ogg`/`.wav` en repo. `find assets -name "*.mp3" -o -name "*.ogg" -o -name "*.wav"` retorna 0.

**Pendientes**:
- ❌ Música (Fase A: jota CSIC dominio público; Fase B: Suno Pro)
- ❌ SFX procedurales (Web Audio API)

### E.4. Generación AI

- **minimax MCP `text_to_image`**: usado extensivamente (12 referencias en `tools/*.py`)
- **minimax MCP `text_to_audio`** / `voice_clone` / `generate_video`: **NO usados** aún

---

## F. Tests — Estado

### F.1. Unit tests (58 tests / 55 PASS / 3 FAIL)

| Spec | Tests | Estado | Notas |
|---|---|---|---|
| `archetypes.spec.mjs` | 10 | ✅ 10/10 | — |
| `background-layer.spec.mjs` | 10 | ✅ 10/10 | — |
| `best-score.spec.mjs` | 6 | ✅ 6/6 | — |
| `escape-detection.spec.mjs` | 9 | ✅ 9/9 | — |
| `event-bus.spec.mjs` | 5 | ✅ 5/5 | — |
| **`integrity.spec.mjs`** | 7 | ❌ **4/7 PASS, 3 FAIL** | Bug `?v=26` vs `?v=44` cache-busting mismatch |
| `score.spec.mjs` | 11 | ✅ 11/11 | — |

**Bug activo**: `tests/unit/integrity.spec.mjs:9` importa `?v=26` pero el código usa `?v=44` → Node carga dos instancias distintas del módulo `event-bus.js` → eventos nunca llegan → falsos negativos.

**Fix trivial**: cambiar `?v=26` → `?v=44` en `tests/unit/integrity.spec.mjs`. 5 minutos.

### F.2. E2E tests (16 specs / 2 fallando conocidos)

| Spec | Estado |
|---|---|
| `smoke.spec.mjs` | ✅ |
| `menu-flow.spec.mjs` | ✅ |
| `catalog.spec.mjs` | ✅ |
| `tile-gallery.spec.mjs` | ✅ |
| `enemy-movement.spec.mjs` | ✅ |
| `hit-detection.spec.mjs` | ✅ |
| `hitbox-visualization.spec.mjs` | ✅ |
| `projectile-direction.spec.mjs` | ❌ falla conocido |
| `deterministic-test-level.spec.mjs` | ❌ falla conocido |
| `banco-bg-render-order.spec.mjs` | ✅ |
| `banco-overlay-retry-label.spec.mjs` | ✅ |
| `banco-wave-positions.spec.mjs` | ✅ |
| `banco-esc-to-menu.spec.mjs` | ✅ |
| `capture-flow.spec.mjs` | ✅ |
| `rail-direction.spec.mjs` | ✅ |
| `rotate-mobile.spec.mjs` | ✅ |

**Requieren**: `TEST_URL` env var o `http://100.116.137.66:8000/` (Tailscale) — **no se pueden ejecutar sin servidor dev**.

### F.3. Manual playthrough

**Existe** `MANUAL_PLAYTHROUGH.md` en raíz 2D (§0–§18). Comparación con 3D:

| Sección 3D | Estado 2D |
|---|---|
| Setup | 🟡 `start_server.sh` (12 líneas) |
| Smoke checks | ❌ |
| Combat feedback | ❌ |
| Power-ups (6) | ❌ N/A — power-ups no implementados |
| Wave system per stage | ❌ TEST_LEVEL único |
| Boss system | ❌ Sin desactivación |
| Pause menu | 🟡 Parcial (solo Esc-to-menu) |
| Game over flow | ✅ Implementado |
| Combo + scoring | ❌ Sin combo |
| Ammo system | ❌ N/A — cooldown simple |
| Final screen | ❌ |
| Light gun | ❌ Mouse-only |
| **Pedagogy sign-off** | ❌ |
| Asset budget | ❌ |
| Structural readback (`verify.sh`) | ❌ |

---

## G. Bugs conocidos

| Severidad | Bug | Ubicación | Notas |
|---|---|---|---|
| 🟡 Media | `tests/unit/integrity.spec.mjs` falla 3/7 por mismatch `?v=26` vs `?v=44` | `tests/unit/integrity.spec.mjs:9-10` | Fix trivial; 5 min |
| 🟡 Media | 2 e2e tests fallando conocidos | `tests/e2e/projectile-direction`, `tests/e2e/deterministic-test-level` | Necesita servidor dev |
| 🟠 Media | Pixi.js desde CDN sin fallback offline | `index.html:65` | Si no hay red → no arranca |
| 🟡 Media | 5 backgrounds en disco, 0 backgrounds de menú | — | Spec BG-005 menciona 4 pendientes |
| 🟡 Media | Best score `localStorage` clave `zarra2d:best:stage_<n>` implementada pero UI no muestra por stage | `score.js:60-130` | Persiste, no se enseña |
| 🟡 Baja | 3 enemies + trees + buildings + props declarados pero no usados | `manifest.json` | Sirven solo como referencia visual |

---

## H. Riesgos arquitectónicos

1. **Sin build step**: refactor cross-file requiere cache-busting manual (`?v=44`). Ya generó bug en tests §F.1.
2. **Sin TypeScript / JSDoc**: comentarios son la única doc. 21 archivos JS sin tipos = alta fricción para onboard.
3. **Sin `package.json`**: Playwright suelto en `node_modules/`. Reinstalar repo puede romper tests e2e.
4. **Estado global mutable**: `gameState = { state: 'main-menu' }` en `src/main.js:106` compartido por referencia.
5. **Tilemap code muerto**: `src/iso/tilemap.js` (194 LOC) + `src/iso/world.js` (266 LOC) deshabilitados en main pero importados.
6. **TEST_LEVEL único para 5 stages**: `src/levels/test-level.js` se usa tal cual; spec BG-005 marca "future scope" per-stage rosters.

---

## I. Métricas de calidad

| Métrica | Estado | Notas |
|---|---|---|
| **Cobertura pedagógica** | ❌ **0%** | 0 cards in-game, 0 fuentes mostradas, 0 i18n |
| **Determinismo** (`?test=1`) | ✅ Implementado | mulberry32, seed 0xC0FFEE, 120-enemy TEST_LEVEL |
| **Performance objetivo** | 🟡 Inferido | Sin métricas documentadas; Pixi + ~17KB código ≈ 1 MB bundle |
| **Accesibilidad** | 🟡 Parcial | Orientation lock ✅, keyboard menu ✅; TTS/contraste/motion ❌ |
| **i18n-ready** | ❌ No | ~30 strings hardcoded dispersos |
| **Compatibilidad navegadores** | 🟡 Inferido | Chrome/Firefox/Safari/Edge últimas 2; no testeado formalmente |
| **Pedagogical sign-off** | ❌ No existe | Sin checklist pedagógico |
| **Asset budget** | 🟡 332 MB | Mayoría backgrounds iterativos (no en git); 1.35 MB definitivos |
| **Console discipline** (A8) | ❌ Violado | `console.*` libre en `combat.js`, `main.js`, `sprite-loader.js` |

---

## J. Resumen por bloque

| Bloque | Estado | % |
|---|---|---|
| **Pipeline técnico** (combat, integridad, score, menús, backgrounds, test API) | ✅ Completo | 95% |
| **i18n / strings centralizados** (REQ-13, A2, A6) | ❌ Ausente | 0% |
| **Pedagogía in-game** (cards, modales, resumen, biblioteca) | ❌ Ausente | 0% |
| **Pantalla final con 4 enlaces** (REQ-14, A7) | ❌ Ausente | 0% |
| **Pedagogical sign-off** (REQ-15, D16) | ❌ Ausente | 0% |
| **Audio** (música, SFX) | ❌ Ausente | 0% |
| **Accesibilidad** (TTS, contraste, motion) | ❌ Ausente | 0% |
| **Sharing en redes** | ❌ Ausente | 0% |
| **Per-stage rosters** (BG-005) | ❌ Ausente | 0% |
| **Backgrounds de menú** (4) | ❌ Ausente | 0% |
| **Sprites pendientes** (cisterna, crosshair) | 🟡 Parcial | 50% |
| **Verify estructural** (verify.sh) | ❌ Ausente | 0% |
| **Docs formateadas** (PLAYTHROUGH, fuentes) | ❌ Ausente | 0% |
| **Tests** (39 unit + 16 e2e) | ✅ Implementados | 90% |

**Diagnóstico**: el juego está **técnicamente completo pero pedagógicamente vacío**. El pipeline de juego funciona end-to-end (start → play → game-over → retry), pero **no enseña nada, no cita fuentes, no invita a la acción real**.

---

**Próximo paso**: ver [`ROADMAP.md`](./ROADMAP.md) para el plan priorizado en fases.