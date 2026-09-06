# Tasks: F2.5.2 — Square Iso Rotation

> **Change**: fase-2.5.2-square-iso-rotation · **Project**: zarra-defenders-2d
> **Base**: main @ 253c4a2 (F2.5.1 archived)
> **Mode**: hybrid (OpenSpec + Engram) · **Delivery strategy**: single-pr · **Review budget**: 5000 LOC

---

## Review Workload Forecast

| Field | Value |
|---|---|
| Files modified | 5 (iso-math.js, world.js, tilemap.js, generate-iso-tiles.py, iso-smoke.js) + 1 rewrite (tile-gallery.html) + 1 regen (manifest.json) |
| LOC delta (excluding regenerated assets) | ~180 authored |
| Binary assets | 40 PNGs nuevos (64×64) + 40 PNGs sprites preexistentes (no modificados) |
| Tests | 1 manual test path (Playwright headless) + iso-smoke.js mock canvas update |
| New dependencies | 0 |
| Chained PRs recommended | **No** (single-pr per preflight) |
| 5000-line budget risk | Low (~180 LOC + 40 binarios) |
| Decision needed before apply | No |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
500-line budget risk: Low

### Suggested Work Units

Single-PR per preflight. No chained work units. Internal sequencing below.

---

## Phase 0 — Preparation

- [x] **F2.5.2.0.1** Crear branch `feat/fase-2-5-2-square-iso` desde `main @ 253c4a2`
- [x] **F2.5.2.0.2** Crear directorio `assets/tiles/_discarded/diamond-r2/` para preservar los 40 PNGs viejos
- [x] **F2.5.2.0.3** `git mv` los 40 PNGs diamond a `_discarded/diamond-r2/` (preservar como evidencia, no `rm`)

## Phase 1 — Engine (square iso falso)

- [x] **F2.5.2.1.1** MODIFICAR `src/iso/iso-math.js`: cambiar `tileHalfHeight` a `tileSize/2` en líneas 24, 41, 83 (cuadrado simétrico)
- [x] **F2.5.2.1.2** MODIFICAR `src/iso/tilemap.js`: confirmar anchor (0.5, 0.5) y position formula siguen válidos para textura cuadrada (no requiere cambio funcional)
- [x] **F2.5.2.1.3** MODIFICAR `src/iso/world.js`: agregar `_worldLayer` entre `container` y `_tileLayer`+`_spriteLayer`, con `rotation = Math.PI/4`, `sortableChildren = false`
- [x] **F2.5.2.1.4** MODIFICAR `tests/iso-smoke.js`: mock canvas `128×64` → `64×64`, default `tileSize = 64`
- [x] **F2.5.2.1.5** VALIDAR con game running que no hay errores en consola (Playwright headless)

## Phase 2 — Asset pipeline (regeneración)

- [x] **F2.5.2.2.1** MODIFICAR `tools/generate-iso-tiles.py`: agregar flag `--shape {diamond|square}` (default `square`)
- [x] **F2.5.2.2.2** MODIFICAR `tools/generate-iso-tiles.py`: agregar función `resize_nearest()` con `PIL.Image.Resampling.NEAREST` para downsample 128→64
- [x] **F2.5.2.2.3** MODIFICAR `tools/generate-iso-tiles.py`: prompt template cambia a "64×64 px square tile, top-down view, isometric pixel art, flat magenta #FF00FF background, Diablo 2 tile style, 16-bit pixel art, no anti-aliasing"
- [x] **F2.5.2.2.4** MODIFICAR `tools/generate-iso-tiles.py`: caller pasa `--size 64` a `postprocess_v4.py` + aplica NEAREST downsample post-postprocess
- [x] **F2.5.2.2.5** MODIFICAR `tools/generate-iso-tiles.py`: smoke-test gate regenera `stage1-bosque/pino_clear_grass_rojizo` PRIMERO y valida `64×64`, corners α=0, center α>200
- [x] **F2.5.2.2.6** REGENERAR `stage1-bosque`: 8 tiles con commits per-tile (después del smoke-test gate pasa)
- [x] **F2.5.2.2.7** REGENERAR `stage2-pueblo`: 8 tiles con commits per-tile
- [x] **F2.5.2.2.8** REGENERAR `stage3-rio`: 8 tiles con commits per-tile
- [x] **F2.5.2.2.9** REGENERAR `stage4-vertedero`: 8 tiles con commits per-tile (anti-glorification prompts)
- [x] **F2.5.2.2.10** REGENERAR `stage5-castillo`: 8 tiles con commits per-tile

## Phase 3 — Manifest reconcile

- [x] **F2.5.2.3.1** REGENERAR `assets/tiles/manifest.json`: 40 active swap (nuevos IDs); `discarded: []` per orchestrator instruction (F2.5.1 diamonds archived in `_discarded/diamond-r2/` filesystem-only, not in manifest)
- [x] **F2.5.2.3.2** VALIDAR manifest: `python -c "import json; m=json.load(open('assets/tiles/manifest.json')); assert m['totals']['active']==40; assert len(m['discarded'])==0; print('OK')"`

## Phase 4 — Gallery (tile-gallery.html rewrite)

- [x] **F2.5.2.4.1** REWRITE `tests/tile-gallery.html` (107 → 355 LOC): sección Accepted (40 cards, orange border si regeneratedFrom)
- [x] **F2.5.2.4.2** AGREGAR sección Sprites en gallery: enumera `assets/sprites/*.png` (21 cards con borde azul)
- [x] **F2.5.2.4.3** AGREGAR sección Discarded en `<details>` colapsada por default
- [x] **F2.5.2.4.4** AGREGAR toggle "Vista isométrica 45° / Vista top-down": CSS class `body.iso-rotated` aplica `transform: rotate(45deg)` a `.tile-card img`
- [x] **F2.5.2.4.5** AGREGAR mini-iso-demo canvas 480×270: instancia real `IsoWorld` + `Tilemap('stage1-bosque')` + 4 sprites (3 pinos + 1 castillo) con idle bobbing
- [x] **F2.5.2.4.6** AGREGAR error badge (red banner) si mini-iso-demo falla al cargar asset
- [x] **F2.5.2.4.7** VALIDAR con Playwright headless: 40 tiles + 21 sprites + 0 console errors + rotation toggle funciona + mini-demo renderiza

## Phase 5 — Verificación final

- [x] **F2.5.2.5.1** JUGAR el juego completo (Playwright screenshot): tiles se ven como diamantes rotados 45°, pinos/castillo aparecen sobre tiles, sin errores
- [x] **F2.5.2.5.2** Validar invariantes: `totals.active === 40`, 21 sprites visibles, `_worldLayer.rotation === Math.PI/4`
- [x] **F2.5.2.5.3** Validar `git diff --stat` sobre paths locked (`src/main.js`, `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css`) — debe estar vacío
- [x] **F2.5.2.5.4** Commit final + push + abrir PR

---

## Acceptance Criteria

> Reconciled at archive time (2026-09-06) from `verify-report` (Engram #155, verdict PASS,
> 0 CRITICAL / 0 WARNING). Each box below cites the verify test that proves it.

- [x] 40 tiles regenerados: 64×64 px, corners α=0, center α>200, NO magenta fringe — verify test 7 (40 PNGs × 64×64 via Pillow) + ASSET-002 matrix
- [x] Engine: square iso renderiza con rotación 45° correcta, sin errores — verify tests 10/11 (`world.js:44` `_worldLayer.rotation = Math.PI/4`; `iso-math.js` symmetric halves) + test 6 (0 console errors)
- [x] Galería: 40 tiles + 21 sprites + rotation toggle + mini-demo + 0 console errors — verify tests 1/3/4/5/8 (61 figures, toggle round-trip, `__miniDemoOK === true`)
- [x] Manifest: `totals.active === 40` — verify test 2. **NOT met as originally written**: the criterion also demanded `discarded.length === 40`; actual is `discarded.length === 0` because the 40 F2.5.1 diamonds were archived filesystem-only under `_discarded/diamond-r2/` per orchestrator instruction during apply (task F2.5.2.3.1). Recorded as known spec-vs-implementation drift — see `verify-report` SUGGESTION #1 and the F2.5.2 archive report.
- [x] `_discarded/diamond-r2/` con 40 PNGs viejos preservados — verify test 15 (`ls | wc -l` → 40; 40 files git-tracked)
- [x] Game playable, sprites visibles sobre tiles — verify test 6 (title + canvas 1280×720, 0 errors / 0 warnings)
- [x] Paths locked intactos: `src/main.js`, `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css` — verify test 14 (empty `git diff main..HEAD` on locked paths)
- [x] Branch `feat/fase-2-5-2-square-iso` lista para PR — PR #6 opened, merged to `main` at `a36194b`, PR closed

---

## Estimated LOC

| Category | LOC |
|---|---|
| Engine (iso-math + world + iso-smoke.js) | ~15 |
| Tools (generate-iso-tiles.py — --shape + NEAREST + smoke gate) | ~30 |
| Tests (tile-gallery.html rewrite 107→~250) | ~140 |
| Manifest (regenerated, not authored) | ~0 |
| **Total authored** | **~185** |
| Binary assets (40 PNGs nuevos) | 40 files |
| Archived assets (40 PNGs viejos movidos) | 40 files |
| **Review budget consumption** | **~3.7% of 5000 LOC budget** |

---

## Risks priorizados

| Risk | Likelihood | Mitigation |
|---|---|---|
| minimax 64×64 tiles dejan magenta corners que rompen ilusión 45° | Medium | Smoke-test `pino_clear_grass_rojizo` PRIMERO; `validate` asserts 4 corners α=0 + center α=255; visual check en mini-iso-demo |
| 128→64 LANCZOS downsample suaviza pixel art 16-bit | Medium | NEAREST final downsample en `run_postprocess` (no LANCZOS) |
| Pixijs Container.rotation interfiere con future `cullArea` | Low | Documentado en design.md: rotation debe deshacerse antes de setear `cullArea` en F8 polish |
| Existing 21 vertical sprites se ven mal en plano rotado 45° | Low | Sprites anclados verticalmente al pie, no al tile; screenshots F2.5.1 confirman lectura correcta |
| 21 sprites + 40 tiles = galería lenta en cargar | Low | Lazy-load + grid 8 cols; `<details>` colapsado para discarded |
| 8 variants × 5 stages overwhelms minimax rate limits | Low | Generar serial (F2.5.1 probó exitoso); per-tile commits |

---

## Out of scope (NO en este PR)

- Cambio a `cullArea` (F8 polish)
- Animaciones de sprites complejas (idle bobbing es suficiente)
- Sound effects
- Cambios en `rail-camera.js`, `input.js`, `player.js`, `main.js`, `index.html`, `styles/main.css` (locked per `openspec/config.yaml`)
- Tutorial / pedagogy cards

---

## Next phase

`sdd-apply` → ejecutar tareas en orden, con commits per-tile durante regeneración, manifest reconcile al final, gallery rewrite, abrir PR.