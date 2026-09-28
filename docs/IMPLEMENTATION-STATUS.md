# Estado de implementación — zarra-defenders-2d

> **Inventario técnico** del proyecto al HEAD actual. Verifica qué está hecho y qué falta para v1 release.
>
> **Leyenda**:
> - ✅ **Implementado** — feature completa, validada por tests
> - 🔄 **Parcial** — algo funciona, falta cubrir el contrato
> - ❌ **No implementado** — no existe en código
> - ❓ **Por verificar** — necesita inspección directa
>
> **Última actualización**: 2026-09-28 (pre-fase7 audit + README + docs sync)
> **HEAD**: `4cf249f` (`docs: rewrite README + final ROADMAP update for pre-fase7 release`)
> **Working tree**: clean
>
> **Verificación estructural**: `bash scripts/verify.sh` → **8/8 PASS** (C1-C8).

---

## Resumen ejecutivo

| Categoría | Estado | Notas |
|---|---|---|
| **Pipeline técnico** (combat, integridad, score, menús, backgrounds, test API) | ✅ Completo | ~95% (ver §B) |
| **i18n + STRINGS centralizado** (A2 + A6) | ✅ Completo | `src/i18n/es.js`, 84 STRINGS refs, 0 leaks, 0 https:// literals fuera |
| **Console discipline** (A8) | ✅ Completo | `__zr` utility en `src/engine/dom-debug.js`, 0 console.* leaks |
| **Audio procedural** (F4) | ✅ Completo | MusicEngine (jota regional) + SFXEngine procedurales Web Audio |
| **Accesibilidad** (F5) | ✅ Completo | TTS (es-ES), high-contrast, reduced-motion |
| **Sharing** (F5.4) | ✅ Completo | Twitter/Facebook/clipboard/native (navigator.share) |
| **Stages + menú visuals** (F6) | ✅ Completo | 5 stages con backgrounds dedicada + menú selector |
| **Pixi offline fallback** (F6) | ✅ Completo | `vendor/pixi.min.js` local |
| **Pedagogía in-game** | ✅ Completo | Cards, modal-intermedio, biblioteca, data-screen, final-screen, resumen-final |
| **Refinements pre-fase7** | ✅ Cerrado | F3.5.1bis (pause gate) + F3.5.1ter (overlay fit) + F3.5.4 (compact pedagogy) + F6.1 (1-shot-kill) |
| **v1 release + archive SDD** | 🔄 Pendiente | Polish pedagógico sign-off + `sdd-archive` final |
| **Per-stage rosters específicos** | 🔄 Diferido | F6 BG-005 marca "future scope" — todos comparten TEST_LEVEL |

**Diagnóstico**: el juego está **completo end-to-end**. Pipeline, audio, accesibilidad, sharing, pedagogía in-game y polish UX están ✅. Lo único pendiente para v1 es el **sign-off pedagógico** (revisar 6 dato strings por exactitud + accesibilidad + tono) y **archivar bajo SDD** el último change pre-fase7.

---

## A. Conceptos del proyecto 3D (zarra-defenders) — Estado en 2D

### A.1. REQ-1..15 — Requisitos funcionales

| # | Concepto del 3D | Estado | Evidencia | Notas |
|---|---|---|---|---|
| REQ-1 | Compatibilidad navegadores + lanzamiento estático | ✅ | `index.html` carga Pixi.js@8 vía CDN con fallback `vendor/pixi.min.js` | F6 cerró el offline fallback |
| REQ-2 | Mouse + 4 light guns | 🔄 | `src/input.js` unifica mouse+touch+light-gun (HID = mouse) | Sin código específico para multi-light-gun |
| REQ-3 | 5 niveles Valle de Ayora | ✅ | `src/levels/stage-rosters.js` 5 stages con toponimias reales | Ver §B.3 |
| REQ-4 | 11 enemigos + 5 bosses | ✅ | `assets/sprites/manifest.json` 11 enemigos + 5 bosses (sello_burocratico en 5 stages) | `camion_cisterna_residuos` regenerado en F6 (sprite real, no placeholder) |
| REQ-5 | 6 power-ups cívicos | ❌ | **Decisión consciente**: NO aplicar drops. Disparo ya ES la firma. Ver `docs/VISION.md §8` | Disparo → papeleta firmada visible = gesto cívico |
| REQ-6 | 4-5 waves + 30s + 3 concurrent + boss | ✅ | `src/levels/test-level.js` 120 enemigos distribuidos en 4 waves (incluye post-final wave roster) | BG-006 BG-007 |
| REQ-7 | Boss FSM (entry→vulnerable→special→desactivación) | 🔄 | `lifecycle='desactivacion'` en mini-boss planta_treco (1 entry); otros bosses usan lifecycle default `destroyed` | Aplica al final boss; bosses intermedios destruyen con flash 200ms |
| REQ-8 | Crosshair/enemy flash + screen-shake | 🔄 | Crosshair ✅, enemy flash ✅ (200ms), screen-shake ❌ | Sin screen-shake intencional (decisión de polish) |
| REQ-9 | Ammo 12/12 + 1.2s reload + R | ❌ | `combat-core/spec.md` `FIRE_COOLDOWN_MS=333ms` cooldown global | 2D usa cooldown simple (3 disparos/seg) |
| REQ-10 | Pause 3 botones | ✅ | `src/ui/pause.js` 4 botones (Continuar/Reiniciar/Salir/Ajustes) + F3.5.1bis orientation gate | Ver §C.1 |
| REQ-11 | Retry preserva session score | ✅ | `src/score.js:60-130` best firmas per stage en localStorage (`zarra2d:best:stage_<n>`) | UI muestra best per stage en menú |
| REQ-12 | Combo ×5 cap + 2s decay | ❌ | Solo `points = 10 × archetype_multiplier` por hit | Sin combo — refuerzo pedagógico vía modal-intermedio cada 5 hits |
| REQ-13 | STRINGS centralizado en data.js | ✅ | `src/i18n/es.js` con 84 STRINGS refs, 0 prose leaks (verify.sh C1, C2 PASS) | Cierre F0.6-F0.7 |
| REQ-14 | Final screen + desactivación planta_treco + 4 enlaces | ✅ | `src/pedagogy/final-screen.js` con dato + 4 enlaces a fuentes verificadas | A7 contrato cumplido |
| REQ-15 | Manual playthrough + verify.sh | ✅ | `MANUAL_PLAYTHROUGH.md` + `scripts/verify.sh` (8 checks estructurales, todos PASS) | Sign-off pedagógico ⏳ |

### A.2. Decisiones arquitectónicas A1-A9

| # | Concepto | Estado | Evidencia | Notas |
|---|---|---|---|---|
| A1 | Model-blueprint registry | ✅ | `src/sprite-loader.js` + `assets/sprites/manifest.json` JSON-based | 2D usa JSON manifest (más portable) |
| A2 | STRINGS en `data.js` | ✅ | `src/i18n/es.js` con ~150 strings, verify.sh C1 PASS | Cierre F0.6-F0.7 |
| A3 | First-click atomic gesture | 🔄 | `src/main.js` orientation modal splash (F3.3) | Sin pointer lock (no aplica en 2D) |
| A4 | Light-gun absolute-cursor fallback | ✅ | `src/input.js` mouse-as-light-gun (HID detectado automáticamente) | Sin pointer lock = sin fallback específico |
| A5 | Fuentes pre-researched | ✅ | `src/i18n/es.js` con 6 `fuente:` entries verbatim de `research/fuentes.md` | verify.sh C5 PASS |
| A6 | URLs en STRINGS, cero literals | ✅ | verify.sh C6 PASS (0 https:// fuera de i18n/es.js) | Regla cumplida |
| A7 | Every boss desactivación lifecycle | 🔄 | `lifecycle='desactivacion'` aplicado a planta_treco (mini-boss en final stage) | Solo el final boss; bosses intermedios destruyen |
| A8 | Zero console.* via `__zr` | ✅ | `src/engine/dom-debug.js` con `__zr.debug/warn/error`, verify.sh C8 PASS | Cierre F0.4-F0.5 |
| A9 | ASCII comments en models | ✅ | `src/*.js` ASCII consistente | Idéntico |

### A.3. Decisiones de diseño D1-D21 (muestra crítica)

| # | Concepto | Estado | Notas |
|---|---|---|---|
| D11 | Wave scheduler state machine | ✅ | BG-006 BG-007 con post-final wave roster |
| D12 | Combo scoring cap ×5 | ❌ | No implementado (modal-intermedio cumple refuerzo pedagógico) |
| D13 | Zero persistence v1 | ❌ Inverso | 2D persiste best per stage en localStorage (REQ-11) |
| D15 | HTML entrypoint no bundler | ✅ | Mantiene identidad — abrir `index.html` directamente |
| D16 | No tests no build | ✅ | 31 e2e specs + 17 unit specs; sin bundler |
| D17 | `.fuente` strings populated | ✅ | 6 entries en i18n/es.js (verify.sh C5) |
| D18 | `STRINGS.final.enlaces.*_url` | ✅ | final-screen.js consume STRINGS.final.enlaces |
| D19 | All 5 bosses desactivación | 🔄 | Solo final boss; intermedios con destroyed lifecycle (decisión pedagógica) |
| D20 | `__zr` utility | ✅ | dom-debug.js implementado |
| D21 | ASCII transliterations | ✅ | Idéntico |

### A.4. Conceptos específicos del 3D

| Concepto | Estado | Notas |
|---|---|---|
| Dato screen pre-nivel (5s) | ✅ | `src/pedagogy/data-screen.js` (F1.5) |
| Volume + `[`/`]`/`M` en HUD | ✅ | `src/audio/audio-context.js` + shortcuts en PauseOverlay a11y panel |
| `puntos` y `combo` mecánico | 🔄 | Solo `firmas recogidas` + `archetype_multiplier` (sin combo) |
| Magazine 12/12 + 1.2s reload | ❌ | Solo cooldown 333ms (REQ-9 sin implementar) |
| No persistence v1 (D13) | ❌ Inverso | 2D persiste (REQ-11) |
| Cero partículas v1 | ✅ | Sin explosiones (mantiene disciplina) |
| Créditos formales con entidades reales | ✅ | Disclaimer completo en README + `src/ui/disclaimer-splash.js` (Art. 20 CE + Art. 11 CDFUE) |
| Pantalla de inicio con título | ✅ | Main menu DOM-overlay (`src/ui/menu.js`) |
| Dual modality PC (mouse + light gun) | ✅ | Mouse + touch + light-gun HID (input.js) |
| First-click atomic gesture A3 | 🔄 | Sin pointer lock, gesture implícito |
| **Power-ups como acciones cívicas** | ❌ | **Decisión consciente: NO aplicar drops** (VISION §8) |

---

## B. Pipeline técnico del 2D

### B.1. Features implementadas (✅)

| # | Feature | Evidencia | LOC |
|---|---|---|---|
| 1 | Bootstrap Pixi dual-app (world + HUD) | `src/main.js` | ~1100 |
| 2 | Canvas 1920×1080 logical + CSS scale (`applyCssScale`) | `src/main.js:84-105` | ~22 |
| 3 | Rail camera con path iso (0,0)→(36,36) en 120s | `src/rail-camera.js` | ~138 |
| 4 | Input unificado mouse+touch+light-gun con tap/drag detection | `src/input.js` | ~218 |
| 5 | Crosshair PIXI.Graphics vector | `src/player.js` | ~140 |
| 6 | Hand sprite en primera persona | `assets/sprites/hand_pen.png` + `src/ui/hud.js` | ~211 |
| 7 | Papeleta firmada visible (proyectil con sine flutter) | `assets/sprites/papeleta_firmada.png` + `src/combat.js` (Projectile class) | — |
| 8 | Combat: cooldown, pool, AABB hit resolution, nearest-center tie-break | `src/combat.js` | ~420 |
| 9 | Projectile homing per-frame + sine flutter perpendicular | `src/combat.js` (Projectile.tick) | — |
| 10 | 4 enemy archetypes (standard/tank/mini-boss/boss) | `src/enemies.js` | ~870 |
| 11 | 4 movement patterns (linear/sine/zigzag/arc) con oscilación | `src/enemies.js` (Enemy.tick + resolveMovementConfig) | — |
| 12 | Lateral screen-bounds clamp (REQ-CMB-010) | `src/enemies.js` | — |
| 13 | Screen-space hit detection + 1-shot-kill + nearest-center | `src/combat.js:_resolveHitAtScreenPoint` | — |
| 14 | Per-archetype hitInset=0 (F6.1: hitbox = sprite bounds) | `src/enemies.js:ARCHETYPES` | — |
| 15 | Determinismo `?test=1` + mulberry32 seed `0xC0FFEE` | `src/random.js` | ~32 |
| 16 | Test API `window.__gameTestAPI__` (20+ métodos) | `src/test-api.js` | ~240 |
| 17 | Integrity 3-segment state machine + freeze-on-gameover | `src/integrity.js` | ~80 |
| 18 | Score + firmas + best localStorage + cardsShown[] | `src/score.js` | ~140 |
| 19 | HUD: 3 hearts + hand sprite + viewport-aware layout | `src/ui/hud.js` | ~210 |
| 20 | Overlay game-over + victory + share block | `src/ui/overlay.js` | ~250 |
| 21 | Main menu + stage select + lock progression | `src/ui/menu.js` | ~320 |
| 22 | About + Disclaimer modales | `src/ui/menu.js` + `src/ui/disclaimer-splash.js` | — |
| 23 | BackgroundLayer parallax 0.2 + freeze/unfreeze + 4 backgrounds | `src/backgrounds.js` | ~250 |
| 24 | 5 stage backgrounds PNGs + manifest | `assets/backgrounds/` | — |
| 25 | Orientation lock portrait < 360 px + F3.5.1bis gate | `src/main.js` + `src/ui/pause.js` | — |
| 26 | Fullscreen button + Esc exit | `src/main.js` | — |
| 27 | Debug hitbox overlay (?hitboxes=1 + tecla H) | `src/debug-hitboxes.js` | ~140 |
| 28 | Event bus singleton (publish/subscribe) | `src/event-bus.js` | ~40 |
| 29 | Sprite loader con manifest + preload | `src/sprite-loader.js` | ~50 |
| 30 | Iso math (iso↔screen, depth, escape-front) | `src/iso/iso-math.js` | ~190 |
| 31 | IsoWorld container (camera-aware transforms) | `src/iso/world.js` | ~270 |
| 32 | Tilemap (DEPRECATED en main, conservado para demos) | `src/iso/tilemap.js` | ~200 |
| 33 | TEST_LEVEL roster 120 enemigos determinista | `src/levels/test-level.js` | ~330 |
| 34 | 5 production stage rosters | `src/levels/stage-rosters.js` | — |
| 35 | MusicEngine (jota regional procedural, F4) | `src/audio/music.js` | ~280 |
| 36 | SFXEngine (procedurales Web Audio, F4) | `src/audio/sfx.js` | ~250 |
| 37 | AudioContext singleton + master volume | `src/audio/audio-context.js` | — |
| 38 | TTS (Web Speech API es-ES, F5.1) | `src/accessibility/tts.js` | — |
| 39 | High-contrast mode toggleable | `src/accessibility/contrast.js` | — |
| 40 | Reduced-motion toggleable | `src/accessibility/reduced-motion.js` | — |
| 41 | ShareEngine (Twitter/Facebook/clipboard/native, F5.4) | `src/sharing/share.js` | — |
| 42 | PauseOverlay 4-button + F3.5.1bis orientation gate | `src/ui/pause.js` | ~260 |
| 43 | PedagogyCards compact footprint + expand-on-click + stacking (F3.5.4) | `src/pedagogy/cards.js` | ~340 |
| 44 | ModalIntermedio cada 5 hits + stacking arriba de card (F3.5.4) | `src/pedagogy/modal-intermedio.js` | ~190 |
| 45 | Biblioteca pedagógica navegable (F1.4) | `src/pedagogy/biblioteca.js` | — |
| 46 | DataScreen pre-nivel (F1.5) | `src/pedagogy/data-screen.js` | — |
| 47 | FinalScreen post-boss con 4 enlaces (F1.6) | `src/pedagogy/final-screen.js` | — |
| 48 | ResumenFinal post-stage navegable (F1.3) | `src/pedagogy/resumen-final.js` | — |
| 49 | i18n/es.js centralizado (A2 + A6) | `src/i18n/es.js` | ~380 |
| 50 | __zr debug utility (A8) | `src/engine/dom-debug.js` | — |
| 51 | Pixi.js offline fallback (F6) | `vendor/pixi.min.js` | — |
| 52 | Pedagogy card content adaptación (F3.5.4 — clamp footprint) | `styles/main.css` `#pedagogy-card` | — |
| 53 | Game-over overlay viewport-fit (F3.5.1ter — clamp + max-height) | `styles/main.css` `#game-overlay` | — |
| 54 | Combat 1-shot-kill + nearest-center tie-break (F6.1) | `src/combat.js` + `src/enemies.js` | — |

**Total implementado**: ~9 500 LOC JS en `src/` + 1 891 LOC CSS + ~80 LOC HTML = **~11 500 LOC**.

### B.2. Features pendientes (❌) — post-v1

| # | Feature | Razón |
|---|---|---|
| 1 | Combo ×5 cap + 2s decay (D12) | Reemplazado pedagógicamente por modal-intermedio cada 5 hits |
| 2 | Magazine 12/12 + 1.2s reload (REQ-9) | Cooldown simple es suficiente para el ritmo pedagógico |
| 3 | Boss FSM completa (REQ-7) | Solo final boss usa desactivación; intermedios con destroyed lifecycle |
| 4 | Crosshair/enemy screen-shake (REQ-8) | Decisión de polish — no priorizado para v1 |
| 5 | Power-ups drops (REQ-5) | **Decisión consciente NO aplicar** (VISION §8) |
| 6 | 6 light-gun specific paths (REQ-2) | Mouse-as-light-gun es suficiente |
| 7 | First-click pointer-lock (A3) | No aplica en 2D sin fullscreen pointer |

### B.3. Stages con producción (F6)

| # | Stage | Topónimo real | Boss | Dato pedagógico |
|---|---|---|---|---|
| 1 | Las Hoyas de Caballero | Polígono 11, Zarra — encinas, almendros | topadora | 11M m³ de residuos |
| 2 | La Hoz del río Zarra | Barranco del Agua (13 km), río Zarra | tubería lixiviados | Acuífero 8.500 km² |
| 3 | Sierra de La Hunde y Palomera | Pinar denso, Ayora | incineradora | Convive con central nuclear Cofrentes |
| 4 | Casco urbano de Ayora | Casas encaladas, colegio, polideportivo | convoy de trailers | Ruta camiones pasa junto a colegio |
| 5 | El Acuífero (jefe final) | Acuífero de la Mancha Oriental | **planta TRECO (se desactiva, NO muere)** | 2002: 10.700 firmas, ya rechazaron |

### B.4. SDD OpenSpec

**Specs canónicas** (`openspec/specs/`) — 13 archivos:

| Spec | Tema | Líneas |
|---|---|---|
| `accessibility/` | TTS + contraste + motion | — |
| `audio/` | MusicEngine + SFXEngine | — |
| `combat-core/` | 13 REQ-CMB-001..013 | ~670 |
| `iso-asset-pipeline/` | 11 ASSET-001..011 | ~310 |
| `iso-camera-integration/` | 4 CAM-001..004 | ~165 |
| `iso-gallery/` | 5 entries galería dev | ~185 |
| `iso-tile-system/` | DEPRECATED en main | ~226 |
| `menu-visuals/` | 4 backgrounds menú dedicada | — |
| `pixi-offline/` | Vendor bundle | — |
| `scrolling-background/` | 7 BG-001..007 parallax + freeze + lock progression | ~178 |
| `sharing/` | 4 share buttons + ?ref= | — |
| `stage-rosters/` | 5 production stages | — |
| `README.md` | Índice | — |

**Cambios archivados** (`openspec/changes/archive/`): 21 changes cerrados (F0-F6.1). Ver `1fd8456 docs(archive): Fase 4 + 5 + 6 cerradas bajo SDD`.

**Cambios activos** (`openspec/changes/`): **vacío** — los refinements pre-fase7 (F3.5.1bis, F3.5.1ter, F3.5.4, F6.1) se documentaron inline en `docs/ROADMAP.md` y no como changes SDD formales.

---

## C. UX overlays y pulido

### C.1. Pause overlay (REQ-10)

**Estado**: ✅ Implementado (`src/ui/pause.js`) con refinements F3.5.1bis.

| Feature | Estado | Notas |
|---|---|---|
| Botón "Continuar" | ✅ | Esc / P toggle |
| Botón "Reiniciar stage" | ✅ | bootTestLevel:request |
| Botón "Salir al menú" | ✅ | menu:back |
| Botón "Ajustes de accesibilidad" | ✅ | Abre panel con TTS toggle/rate, contraste, reduced-motion |
| **F3.5.1bis**: gate en portrait auto-pause | ✅ | Botón "disabled" + hint "Girá el móvil para continuar" hasta landscape |
| Defense-in-depth | ✅ | `_onContinue()` bail si gate activo (no bypass programático) |

### C.2. Game-over / Victory overlay (F3.5.1ter)

**Estado**: ✅ Implementado (`src/ui/overlay.js`) con refinements F3.5.1ter.

| Feature | Estado | Notas |
|---|---|---|
| Botón "Reintentar" / "Volver al menú" | ✅ | Ambos context-aware (`?test=1` muestra label diferente) |
| Share block en victory | ✅ | Twitter, Facebook, Copy, native (navigator.share) |
| **F3.5.1ter**: viewport-fit | ✅ | `clamp()` + `max-height: calc(100dvh - 32px)` + flex shrink — cabe en iPhone SE 320x568 con share visible |
| 24 asserts en `overlay-fits-viewport.spec.mjs` | ✅ | 4 viewports × 2 variantes (gameover + victory+share) |

### C.3. Pedagogy cards (F3.5.4)

**Estado**: ✅ Implementado (`src/pedagogy/cards.js`) con refinements F3.5.4.

| Feature | Estado | Notas |
|---|---|---|
| Card al destruir enemigo | ✅ | Dato + fuente + link + botón TTS |
| **F3.5.4**: compact footprint (~96px) | ✅ | `clamp(80px, 9vw, 110px)` |
| **F3.5.4**: expand-on-click | ✅ | Click → height auto, click otra vez → compact + resume |
| **F3.5.4**: stacking arriba de modal-intermedio | ✅ | 8px gap, modal arriba de card cuando ambas visibles |
| No overlap con corazones ni mano | ✅ | bottom-right anchor, right-gap ≤ 32px |
| 29 asserts en `pedagogy-card-position.spec.mjs` | ✅ | |

### C.4. Combat (F6.1)

**Estado**: ✅ Implementado con 3 refinements críticos.

| Bug original | Fix F6.1 |
|---|---|
| `tank` hp:3, `mini-boss` hp:10 | Todos no-boss hp:1 (multi-HP solo en boss final) |
| `hitInset` 16/12/10/8px achicaba hitbox | `hitInset=0` para todos: hitbox = sprite bounds |
| Sort by depth-desc en overlap | Sort by nearest-center-to-click (depth-desc + id-asc como tie-breaks) |
| 98 asserts en `one-shot-kill.spec.mjs` | ✅ |

---

## D. Pedagogía — Estado detallado

### D.1. Cobertura pedagógica actual: **100% implementado**

| Mecanismo | Estado | Módulo | Tests |
|---|---|---|---|
| Card in-game al destruir enemigo | ✅ | `src/pedagogy/cards.js` | `pedagogy-cards.spec.mjs` |
| Modal intermedio cada 5 enemigos | ✅ | `src/pedagogy/modal-intermedio.js` | `modal-intermedio.spec.mjs` |
| Resumen navegable al final del stage | ✅ | `src/pedagogy/resumen-final.js` | `resumen-final.spec.mjs` |
| Biblioteca pedagógica accesible desde menú | ✅ | `src/pedagogy/biblioteca.js` | `biblioteca.spec.mjs` |
| DataScreen pre-nivel (F1.5) | ✅ | `src/pedagogy/data-screen.js` | `data-screen.spec.mjs` |
| FinalScreen post-boss con 4 enlaces | ✅ | `src/pedagogy/final-screen.js` | `final-screen.spec.mjs` |
| TTS accesibilidad (F5.1) | ✅ | `src/accessibility/tts.js` | `accessibility-tts.spec.mjs` |
| Sharing en redes (F5.4) | ✅ | `src/sharing/share.js` | `sharing-share.spec.mjs` |
| Disclaimer TRECO modal splash (F3.3) | ✅ | `src/ui/disclaimer-splash.js` | `disclaimer-splash.spec.mjs` |
| Dato pre-nivel con citation + botón Continuar | ✅ | `src/pedagogy/data-screen.js` | `data-screen.spec.mjs` |
| Boss desactivación (planta_treco, F1.6) | ✅ | `src/enemies.js` lifecycle + `src/pedagogy/final-screen.js` | `enemies-desactivacion.spec.mjs` |

### D.2. Datos pedagógicos — ubicación

**Verificado**: las 6 fuentes viven en `src/i18n/es.js` bajo `pedagogy.datos[stageId].fuente/url`. Cero prosa española libre fuera de i18n (verify.sh C2 PASS).

| Stage | Texto del dato | Fuente | URL |
|---|---|---|---|
| 1 | "El proyecto prevé 11 millones de metros cúbicos de residuos, más del doble del vertedero de Dos Aguas." | Las Provincias, 24/06/2026 | https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html |
| 2 | "El Acuífero de la Mancha Oriental tiene 8.500 km² — una de las mayores masas de agua subterránea de Europa. Abastece a Ayora, Zarra, Teresa de Cofrentes y Jarafuel." | Agencia del Agua de CLM (s/f) | https://agenciadelagua.castillalamancha.es/el-agua-en-castilla-la-mancha/situacion-del-agua-en-clm/acuiferos |
| 3 | "La comarca ya convive con la central nuclear de Cofrentes, parques eólicos y plantas fotovoltaicas. La llaman zona de sacrificio." | actualidadvalencia.com, 05/08/2026 | https://actualidadvalencia.com/macrovertedero-zarra-pp-exige-retirada-proyecto/ |
| 4 | "La ruta de camiones pasa junto al colegio y el polideportivo de Ayora, y atraviesa el Plan de Emergencia Nuclear de la central de Cofrentes." | Las Provincias, 24/06/2026 | (mismo URL nivel 1) |
| 5 | "En 2002 los vecinos del Valle ya rechazaron un vertedero igual en la misma zona. 10.700 firmas, manifestación con ataúd frente a la Diputación. Se puede volver a parar." | Las Provincias, 16/06/2026 | https://www.lasprovincias.es/comarcas/valle-ayoracofrentes-moviliza-macrovertedero-proyectado-zarra-20260616173049-nt.html |
| final | "A fecha de hoy, la solicitud está en información pública. Puedes presentar alegaciones." | Valencia Plaza, 31/07/2026 | https://valenciaplaza.com/valenciaplaza/comarca-y-empresa/crece-el-rechazo-contra-el-macrovertedero-de-zarra-tras-la-ultima-concentracion-de-casi-mil-personas |

### D.3. Pedagogical sign-off — checklist

El sign-off pedagógico sigue **pendiente**: el usuario (pedagogo) debe revisar las 6 dato strings por exactitud, citation specificity, no caricature, y desactivación framing. Sin este sign-off, no se puede hacer `sdd-archive` final.

Ver `MANUAL_PLAYTHROUGH.md` §12 para el checklist completo.

---

## E. Assets — Estado

### E.1. Sprites (27 PNGs / ~5.5 MB)

| Categoría | Cantidad | Estado |
|---|---|---|
| Enemigos | 11 | ✅ Todos regenerados (incluye `camion_cisterna_residuos` que era placeholder en F2) |
| Buildings | 3 | ✅ |
| Trees | 3 | ✅ |
| Props | 3 | ✅ |
| UI (hand, papeleta, hearts×2) | 4 | ✅ |
| Crosshair | 1 (PIXI.Graphics vector) | ✅ Sin PNG necesario |

**Pendientes**: ninguno bloqueante para v1.

### E.2. Backgrounds (5 stages + 2 menús = 7 PNGs / ~1.3 MB)

**Definitivos** en `assets/backgrounds/`:
- `stage1-lashoyas.png` ~180 KB
- `stage2-lahoz.png` ~632 KB
- `stage3-lahunde.png` ~188 KB
- `stage4-ayora.png` ~200 KB
- `stage5-acuifero.png` ~152 KB

**Backgrounds de menú** en `assets/menu_bg/`:
- `menu-panorama-cofrentes.png` — Valle panorámica desde Castillo de Cofrentes
- `menu-vertedero-satirico.png` — Vertedero satírico para game-over

### E.3. Audio (procedural, F4)

**Estado**: 0 archivos `.mp3`/`.ogg`/`.wav` en repo. Todo el audio es **procedural via Web Audio API**:
- `MusicEngine` (`src/audio/music.js`) — jota regional con osciladores + envelopes. Tempo regional, escala modal.
- `SFXEngine` (`src/audio/sfx.js`) — fire/hit/card/gameover/victory/transition procedurales.

### E.4. Generación AI

- **minimax MCP `text_to_image`**: usado extensivamente para sprites y backgrounds (12 referencias en `tools/*.py`)
- **minimax MCP `text_to_audio`** / `voice_clone` / `generate_video` disponibles, no usados

---

## F. Tests — Estado

### F.1. Unit tests (17 specs)

| Spec | Cobertura | Estado |
|---|---|---|
| `accessibility-contrast.spec.mjs` | Contraste toggle + persistencia | ✅ |
| `accessibility-motion.spec.mjs` | Reduced-motion toggle | ✅ |
| `accessibility-tts.spec.mjs` | TTS Web Speech API | ✅ |
| `archetypes.spec.mjs` | 4 archetypes + lifecycle + assertArchetype | ✅ |
| `audio-music.spec.mjs` | MusicEngine jota procedural | ✅ |
| `audio-sfx.spec.mjs` | SFXEngine procedural | ✅ |
| `background-layer.spec.mjs` | Parallax + freeze + manifests | ✅ |
| `best-score.spec.mjs` | localStorage best per stage | ✅ |
| `enemies-desactivacion.spec.mjs` | A7 desactivación lifecycle | ✅ |
| `escape-detection.spec.mjs` | REQ-CMB-008 screen-escape + iso-escape | ✅ |
| `event-bus.spec.mjs` | Pub/sub singleton | ✅ |
| `integrity.spec.mjs` | 3-segment state machine | ✅ (bug cache-busting arreglado) |
| `levels-stage-rosters.spec.mjs` | 5 production stages | ✅ |
| `modal-intermedio.spec.mjs` | F1.2 trigger cada 5 hits | ✅ |
| `pedagogy-cards.spec.mjs` | F1.1 cards in-game | ✅ |
| `score.spec.mjs` | firmas + best + cardsShown | ✅ |
| `sharing-share.spec.mjs` | F5.4 Twitter/Facebook/clipboard/native | ✅ |

**Todos los unit specs PASS** (verify.sh los corre con `node:test` nativo).

### F.2. E2E tests (31 specs / 100% pass)

Specs destacados:

| Spec | Asserts | Estado |
|---|---|---|
| `one-shot-kill.spec.mjs` (F6.1) | 98 | ✅ |
| `pedagogy-card-position.spec.mjs` (F3.5.4) | 29 | ✅ |
| `overlay-fits-viewport.spec.mjs` (F3.5.1ter) | 24 | ✅ |
| `orientation-autopause.spec.mjs` (F3.5.1bis) | 11 | ✅ |
| `pedagogy-card-f352.spec.mjs` | 6 | ✅ |
| `pedagogy-cards.spec.mjs` | 7 | ✅ |
| `modal-intermedio.spec.mjs` | 4 | ✅ |
| `pause.spec.mjs` | 7 | ✅ |
| ... (23 specs más) | varies | ✅ |

**Requieren**: `TEST_URL` env var o `http://100.116.137.66:8000/` (Tailscale) — no se pueden ejecutar sin servidor dev.

**Para correr toda la suite**:
```bash
TEST_URL=http://127.0.0.1:8000/?test=1 for spec in tests/e2e/*.spec.mjs; do
  node "$spec" > /dev/null 2>&1 || echo "FAIL: $spec"
done
```

### F.3. Verificación estructural

```bash
$ bash scripts/verify.sh
✓ PASS  STRINGS references = 84
✓ PASS  Spanish prose leaks = 0
✓ PASS  sprites = 27
✓ PASS  stages = 5
✓ PASS  fuente: data entries = 6
✓ PASS  https:// literals outside i18n = 0
✓ PASS  desactivacion lifecycle = 1
✓ PASS  console.* leaks = 0
verify.sh: 8 PASS, 0 FAIL
```

---

## G. Bugs conocidos

**Ninguno bloqueante para v1.**

| Severidad | Bug | Ubicación | Notas |
|---|---|---|---|
| 🟡 Baja | `?test=1` URL-dependent tests pasan solo con `?test=1` | `tests/e2e/banco-*.spec.mjs` | Trabajan también con `?unlock=all`; documentado en AGENTS.md |
| 🟡 Baja | Tilemap code muerto en `src/iso/tilemap.js` (194 LOC) | `src/iso/tilemap.js` | Conservado para demos standalone; importable pero no usado en main game |
| 🟡 Baja | Manifest `assets/sprites/manifest.json:discarded:[]` | `assets/sprites/manifest.json` | Drift conocido (ASSET-007); los descartes viven en `assets/tiles/_discarded/` |

---

## H. Riesgos arquitectónicos

1. **Sin build step**: refactor cross-file requiere cache-busting manual (`?v=44`). Ya generó bug en `tests/unit/integrity.spec.mjs` — arreglado.
2. **Sin TypeScript / JSDoc**: comentarios son la única doc. ~70 archivos JS sin tipos = fricción de onboard.
3. **Sin `package.json`**: Playwright suelto en `node_modules/`. Reinstalar repo puede romper tests e2e.
4. **TEST_LEVEL único para 5 stages**: `src/levels/test-level.js` se usa como fallback; `stage-rosters.js` define per-stage rosters pero el gameplay fluye via `getRosterForStage()`.
5. **5 bosses con `discarded:[]`**: drift conocido en manifest.

---

## I. Métricas de calidad

| Métrica | Estado | Notas |
|---|---|---|
| **Cobertura pedagógica** | ✅ 100% | 11/11 mecanismos implementados (cards, modal, biblioteca, data-screen, final-screen, etc.) |
| **Determinismo** (`?test=1`) | ✅ | mulberry32 seed `0xC0FFEE`, 120-enemy TEST_LEVEL |
| **i18n-ready** | ✅ | 84 STRINGS refs, 0 leaks, 0 https:// literals fuera (verify.sh C1, C2, C6) |
| **Console discipline** (A8) | ✅ | `__zr` utility, 0 console.* leaks (verify.sh C8) |
| **Compatibilidad navegadores** | 🔄 | Chrome/Firefox/Safari últimas 2; Pixi.js@8 estable; no testeado formalmente con BrowserStack |
| **Pedagogical sign-off** | 🔄 Pendiente | Sin firma pedagogo en MANUAL_PLAYTHROUGH §12 (bloqueante de `sdd-archive` final) |
| **Asset budget** | ✅ | ~1.3 MB backgrounds + ~5.5 MB sprites = ~6.8 MB total en git |
| **Tests coverage** | ✅ | 31 e2e specs + 17 unit specs, todos PASS |
| **Verify estructural** | ✅ | `bash scripts/verify.sh` → 8/8 PASS |

---

## J. Próximo paso

**v1 release + SDD archive**:
1. ⏳ **Pedagogical sign-off**: revisar las 6 dato strings por exactitud + accesibilidad + tono (en `MANUAL_PLAYTHROUGH.md §12`).
2. ⏳ **Stage-rosters polish**: confirmar que `getRosterForStage()` enruta correctamente por stage (5 stages con rosters específicos o fallback a TEST_LEVEL).
3. ⏳ **Crear change SDD formal** para los 4 refinements pre-fase7 (F3.5.1bis, F3.5.1ter, F3.5.4, F6.1) — actualmente documentados inline en ROADMAP.
4. ⏳ **Release tag v1.0** y `sdd-archive` final.

Ver [`docs/ROADMAP.md`](./ROADMAP.md) para el plan priorizado en fases.
