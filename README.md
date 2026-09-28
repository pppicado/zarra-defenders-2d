# Zarra Defenders 2D

> **On-rails shooter pedagógico sobre el impacto del macrovertedero de TRECO en el Valle de Ayora-Cofrentes.**
>
> HTML + JS sin build step. Jugar con mouse (o pistola de luz HID) en PC, táctil en móvil.

![Status](https://img.shields.io/badge/status-v1%20ready--pedagogical%20sign--off-green)
![Fases cerradas](https://img.shields.io/badge/fases-F0%E2%80%93F6-green)
![Tech](https://img.shields.io/badge/tech-HTML5%20%2B%20Pixi.js%208-blue)
![e2e tests](https://img.shields.io/badge/e2e-31_specs%20%2F%20100%25%20pass-brightgreen)

---

## ⚠️ Aviso Legal · Disclaimer

Este juego es una obra de **ficción con fines educativos y cívicos**.

- ✗ **NO promueve la violencia.** La mecánica de "disparar" es una **metáfora de la acción documental**: cada "firma" representa el apoyo vecinal a la defensa del territorio.
- ✓ Promueve la **lucha legal**: recogida de firmas, alegaciones administrativas, movilización ciudadana, documentación de impactos.
- **TRECO GESTIÓN DE RESIDUOS S.L.** es una empresa REAL. El nombre "TRECO", "TRECO GESTIÓN DE RESIDUOS S.L." y cualquier variación son **propiedad de sus respectivos titulares**. Este juego la menciona exclusivamente con fines de **crítica documentada y educación cívica**, en ejercicio del derecho a la libertad de expresión e información (Art. 20 CE), de forma nominativa (para identificar la entidad criticada), **sin endorsement, patrocinio ni asociación** con su titular.
- Los datos mostrados (volúmenes, daños, cuantías) provienen de **fuentes citadas en cada card pedagógica** del juego.
- Si TRECO o sus titulares consideran que el uso excede el ámbito de la crítica documentada, pueden solicitar la modificación de textos vía GitHub Issues. Se atenderá cualquier petición razonable.

Ver el disclaimer completo y la política de contenido en [`PLAN.md`](./PLAN.md#-disclaimer-y-política-de-contenido).

---

## 🎮 Jugar en desarrollo

```bash
./start_server.sh 8000    # o python3 -m http.server 8000
# abrir http://127.0.0.1:8000/
```

URLs útiles en [`AGENTS.md`](./AGENTS.md):
- `http://127.0.0.1:8000/?test=1&seed=42&hitboxes=1&unlock=all` — modo test, todos los stages desbloqueados, hitbox overlay
- `http://100.116.137.66:8000/` — desde Tailscale (mismo sandbox)
- `http://127.0.0.1:8000/catalog.html` — lightbox de todos los sprites

---

## 📋 Estado del proyecto

🟢 **v1 ready** — Fases 0–6 cerradas, refinamientos pre-fase7 aplicados, sign-off pedagógico firmado (2026-09-28). Pendiente: `sdd-archive` final + tag v1.0.0.

### Fases cerradas (ver [`docs/IMPLEMENTATION-STATUS.md`](./docs/IMPLEMENTATION-STATUS.md))

| Fase | Foco | Estado |
|------|------|--------|
| F0   | Bootstrap (Pixi, rail-camera, first-paint) | ✅ |
| F1   | Pedagogía (cards, modal firmas, resumen, biblioteca, data-screen, final-screen) | ✅ |
| F2   | Asset pipeline isométrico + galería | ✅ |
| F3   | Shooter rail + gameplay core (player, combat, enemigos, HUD, integrity, menus) | ✅ |
| F4   | Audio procedural (jota regional MusicEngine + SFXEngine) | ✅ |
| F5   | Accesibilidad (TTS, contraste, reduced-motion) + sharing (Twitter/Facebook/clipboard/native) | ✅ |
| F6   | Stages + menú selector (5 stages, 4 backgrounds dedicada Valle panorámica) + Pixi offline | ✅ |

### Refinamientos pre-fase 7 (este release)

| Ref | Foco | Commit pattern |
|-----|------|----------------|
| F3.5.1bis | Pause overlay: botón "Continuar" deshabilitado mientras viewport portrait, con hint "Girá el móvil para continuar" | `feat(orientation)` |
| F3.5.1ter | Game-over / victory overlay cabe en cualquier viewport (clamp() + max-height:100dvh) | `fix(overlay)` + `test(overlay)` |
| F3.5.4   | Pedagogy card + modal-intermedio compactos a la derecha de la mano (clamp footprint ~96px + expand-on-click + stacking) | `feat(pedagogy)` |
| F6.1     | Combat: 1-shot-kill para todos los no-boss + hitbox = sprite bounds + nearest-center tie-break (overlap resolution) | `fix(combat)` |

Detalles completos de cada refinamiento en [`docs/ROADMAP.md`](./docs/ROADMAP.md) (secciones 3.5.1bis, 3.5.1ter, 3.5.4, F6.1).

### ✅ Pedagogical sign-off (firmado 2026-09-28)

Los 6 dato strings en `src/i18n/es.js` fueron revisados por el pedagogo (usuario) y aprobados por exactitud, citation specificity, no caricature, y desactivación framing:

- Stage 1 (Las Hoyas de Caballero): 11M m³ residuos, Las Provincias 24/06/2026
- Stage 2 (La Hoz del río Zarra): Acuífero 8.500 km², Agencia del Agua CLM
- Stage 3 (La Hunde y Palomera): zona de sacrificio, actualidadvalencia.com
- Stage 4 (Casco urbano de Ayora): ruta camiones + colegio + Plan Emergencia Nuclear
- Stage 5 (El Acuífero): 10.700 firmas en 2002, Las Provincias 16/06/2026
- Final: alegaciones en información pública, Valencia Plaza 31/07/2026

Detalle completo en `docs/IMPLEMENTATION-STATUS.md §D.3`. Esto desbloquea el `sdd-archive` final.

---

## 🎯 Contexto

On-rails shooter pedagógico sobre el impacto del macrovertedero de Zarra (TRECO) en el Valle de Ayora-Cofrentes. HTML5 + JS sin build step, con sprites 2D isométricos estilo 16-bit pixel art.

**Metáfora central — disparos como firmas:** Los proyectiles NO son balas ni láseres. Son **documentos con firmas**: papeletas de recogida, escritos de alegaciones, instancias administrativas. Cada disparo = una firma vecinal que se suma a la lucha colectiva. La mano en primer plano sostiene un bolígrafo que firma sobre un papel que sale volando. HUD muestra "Firmas recogidas: N".

**Por qué 2D + Pixi.js:**
- Visualmente "retro" (16-bit pixel art)
- Pistolas de luz HID se reconocen como mouse → experiencia nativa en PC
- Touch unificado en móvil
- Pixi.js maneja z-sorting isométrico + 120 enemigos sin frame drops

---

## 🧱 Stack

- **HTML5 + JavaScript** vanilla, **sin build step** (abrir `index.html` directamente)
- **Pixi.js 8** vía CDN (loader local fallback en `vendor/pixi.min.js`)
- **Sprites isométricos** pre-generados (21 assets en `assets/sprites/`)
- **Mouse / touch** unificados bajo `InputManager`
- **e2e tests** con Playwright (Chromium headless), 26 specs, **100% pass**
- **SDD** (Spec-Driven Development) con OpenSpec — Fases 4–6 archivadas

---

## 📁 Estructura

```
zarra-defenders-2d/
├── README.md              ← este archivo
├── PLAN.md                ← diseño original + decisiones de scope
├── AGENTS.md              ← convenciones de agente (URLs, port, format)
├── LICENSE                ← CC BY-NC-SA 4.0 (assets) + MIT (code)
├── MANUAL_PLAYTHROUGH.md  ← guía de juego + URLs verificadas + pedagogía por enemy
├── index.html             ← entry point (Pixi loader, DISCLAIMER, modals)
├── styles/
│   └── main.css           ← pixel-perfect, image-rendering: pixelated, clamp() responsive
├── src/
│   ├── main.js            ← bootstrap, game loop, ?test=1 wiring
│   ├── rail-camera.js     ← cámara con path fijo por stage
│   ├── player.js          ← crosshair + hand sprite
│   ├── combat.js          ← fire resolution (screen-space AABB, nearest-center tie-break)
│   ├── enemies.js         ← 4 archetypes (standard/tank/mini-boss/boss) + lifecycle
│   ├── backgrounds.js     ← parallax scrolling de fondos
│   ├── input.js           ← mouse + touch + light-gun HID unified
│   ├── integrity.js       ← 3 hearts + drain-on-escape
│   ├── score.js           ← firmas + score + cardsShown tracking
│   ├── random.js          ← seeded RNG (Mulberry32) para ?test=1 determinism
│   ├── debug-hitboxes.js  ← ?hitboxes=1 overlay (F5 REQ-CMB-007)
│   ├── event-bus.js       ← pub/sub singleton
│   ├── sprite-loader.js   ← preloader con PIXI.Assets
│   ├── test-api.js        ← __gameTestAPI__ surface (F3)
│   ├── iso/
│   │   ├── iso-math.js    ← iso<->screen, depth, escape-front
│   │   ├── world.js       ← IsoWorld (camera-aware transforms)
│   │   └── tilemap.js     ← diamond tile rendering
│   ├── ui/
│   │   ├── hud.js         ← 3 hearts + hand sprite + viewport-aware layout
│   │   ├── pause.js       ← pause overlay + F3.5.1bis orientation gate
│   │   ├── overlay.js     ← game-over / victory + share block
│   │   ├── menu.js        ← main menu + stage selector (F6)
│   │   ├── disclaimer-splash.js ← Art. 20 CE / Art. 11 CDFUE (F3.3)
│   │   └── i18n-bootstrap.js     ← applies STRINGS to static DOM
│   ├── pedagogy/
│   │   ├── cards.js       ← enemy card + F3.5.4 compact + expand
│   │   ├── modal-intermedio.js  ← firmas modal + F3.5.4 stacking
│   │   ├── biblioteca.js   ← galería pedagógica (F1.4)
│   │   ├── data-screen.js  ← pre-stage data screen (F1.5)
│   │   ├── final-screen.js ← final boss data screen (F1.6)
│   │   └── resumen-final.js ← post-stage navigable summary (F1.3)
│   ├── levels/
│   │   ├── test-level.js  ← TEST_LEVEL deterministic 120-enemy roster
│   │   └── stage-rosters.js ← 5 production stages (F6)
│   ├── audio/             ← procedural jota MusicEngine + SFXEngine (F4)
│   ├── accessibility/     ← TTS + contrast + reduced-motion (F5)
│   ├── sharing/           ← Twitter/Facebook/clipboard/native (F5.4)
│   ├── engine/            ← dom-debug, error boundary
│   └── i18n/
│       └── es.js          ← ALL user-facing strings (A6 contract: zero free Spanish in index.html)
├── assets/
│   ├── sprites/           ← 21 sprites isométricos (manifest.json)
│   ├── backgrounds/       ← 4 backgrounds dedicadas Valle panorámica
│   ├── menu_bg/           ← 2 backgrounds menú (vertedero satírico + panorama Cofrentes)
│   ├── raw/               ← originales minimax MCP (referencia, regenerable)
│   ├── ui/                ← crosshair, hearts, papeleta_firmada
│   └── particles/         ← sprites de explosión
├── vendor/
│   └── pixi.min.js        ← offline Pixi fallback (F6 Pixi offline)
├── tools/
│   ├── postprocess_v4.py  ← pipeline alpha channel (sprite generator)
│   ├── make_gallery.py    ← genera preview HTML de assets
│   └── minimax_mcp_*.py   ← sprite generation pipeline (regenerable)
├── docs/
│   ├── ROADMAP.md         ← decisiones de fase + refinements
│   ├── IMPLEMENTATION-STATUS.md ← qué está cerrado y qué falta
│   └── VISION.md          ← visión del proyecto a largo plazo
├── openspec/              ← SDD artifact store (cambios archivados por fase)
│   ├── config.yaml        ← OpenSpec config
│   ├── specs/             ← delta specs archivadas (Fases 0–6)
│   └── changes/           ← changes activos (vacío pre-fase7)
├── start_server.sh        ← dev server helper (kills old, binds 0.0.0.0:8000)
└── tests/
    └── e2e/               ← 26 Playwright specs (one-shot-kill, orientation-autopause, etc.)
```

---

## 🧪 Tests

```bash
TEST_URL=http://127.0.0.1:8000/?test=1 node tests/e2e/<spec>.spec.mjs
```

**Suite actual: 26 specs, 100% pass.** Destacados:

- `one-shot-kill.spec.mjs` — 98 asserts: cada no-boss muere en 1 hit, hitbox = sprite, nearest-center overlap tie-break, boss kill contract.
- `pedagogy-card-position.spec.mjs` — 29 asserts: card compact footprint, expand-on-click, stacking con modal firmas.
- `overlay-fits-viewport.spec.mjs` — 24 asserts: game-over/victory card cabe en iPhone SE, Pixel, desktop.
- `orientation-autopause.spec.mjs` — 11 asserts: portrait auto-pause + landscape auto-resume + botón Continue gated.

Otros specs notables: `hit-detection`, `enemy-movement`, `projectile-direction`, `rail-direction`, `modal-intermedio`, `pedagogy-cards`, `pedagogy-card-f352`, `pause`, `smoke`, `data-screen`, `biblioteca`, `final-screen`, `menu-flow`, `menu-f353`, `capture-flow`, `audio-flow`, `disclaimer-splash`, `banco-*`.

---

## 🤝 Contribuir

Issues bienvenidos. Para cambios grandes, abrir issue primero para discutir scope.

**Reglas del proyecto:**
- **A2**: zero free Spanish en `index.html` — todo user-facing va en `src/i18n/es.js`
- **A6**: zero `https://` literals fuera de `src/i18n/es.js` — URLs pedagogía viven en i18n
- Conventional commits (no `Co-Authored-By` / AI attribution)
- TDD cuando sea posible (mirrors SDD strict mode cuando active)
- E2E tests con Playwright antes de PR (ver suite arriba)

---

## 📚 Documentación adicional

- [`PLAN.md`](./PLAN.md) — diseño original, mecánicas, fases, assets
- [`MANUAL_PLAYTHROUGH.md`](./MANUAL_PLAYTHROUGH.md) — guía de juego + URLs verificadas + pedagogía por enemigo
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — decisiones de fase + refinements (3.5.1bis, 3.5.1ter, 3.5.4, F6.1)
- [`docs/IMPLEMENTATION-STATUS.md`](./docs/IMPLEMENTATION-STATUS.md) — qué está cerrado y qué falta
- [`docs/VISION.md`](./docs/VISION.md) — visión a largo plazo
- [`AGENTS.md`](./AGENTS.md) — convenciones de agente (URLs, port, format)
- [`openspec/`](./openspec/) — SDD artifact store (cambios archivados)

---

## 📜 Licencia

Pendiente de definir. Provisional:
- **Código**: MIT
- **Assets**: CC BY-NC-SA 4.0

---

## ✨ Changelog resumido

### v1.0-rc.1 — pre-fase 7 + pedagogical sign-off (2026-09-28, HEAD `9e36c64`)

- **F3.5.1bis**: pause overlay Continuar deshabilitado en portrait, hint "Girá el móvil para continuar"
- **F3.5.1ter**: game-over / victory overlay cabe en cualquier viewport (clamp + max-height:100dvh)
- **F3.5.4**: pedagogy card + modal-intermedio compactos a la derecha de la mano (~96px footprint), expand-on-click, stacking con 8px gap
- **F6.1**: combat 1-shot-kill para todos los no-boss, hitbox = sprite bounds (sin hitInset), nearest-center tie-break para overlap
- **31 e2e specs, 100% pass** (incluyendo 98 asserts nuevos en `one-shot-kill`)
- **17 unit specs, todos PASS**
- **`bash scripts/verify.sh` → 8/8 PASS** (C1-C8: STRINGS, prose, sprites, stages, fuentes, https://, desactivacion, console)
- **✅ Pedagogical sign-off firmado** — los 6 dato strings revisados y aprobados por el pedagogo

### Fases 0–6 (commit history)

Ver `git log --oneline` para el detalle. Highlights:
- `1fd8456 docs(archive): Fase 4 + 5 + 6 cerradas bajo SDD`
- `faba09b feat(stages+menu+pixi): Fase 6 cerrada`
- `27f325a feat(a11y+share): Fase 5 accesibilidad + sharing cerrada`
- `46859fc feat(audio): MusicEngine + SFXEngine procedurales + jota regional`
- `801cf18 feat(menu): F3.5.3 restructure + bg image dedicada`
- `eedd6d5 feat(card): F3.5.2 compact bottom-right + click-pauses + click-outside-closes`
- `5b9e6d1 feat(orientation): auto-pause en portrait via matchMedia (F3.5.1)`

### Fases 0–3 (init → gameplay)

- `79e0052 feat(enemies): per-instance movement patterns + lateral clamp + 5x roster`
- `2431329 feat(f3.5): rail direction Y-mirror, projectile direction fix, escape rule`
- Fases 0–2: bootstrap, asset pipeline, pedagogy cards, resumen, biblioteca, data-screen, final-screen
