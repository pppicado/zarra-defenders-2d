# Tasks: F2.5 — Isometric Tile System

> **Change**: `fase-2.5-tile-system` · **Project**: `zarra-defenders-2d` · **Base**: tag `v0.1` (d533567)
> **Mode**: hybrid (OpenSpec + Engram) · **Delivery strategy**: `auto-chain` · **Per-PR budget**: 400 LOC

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Decision needed before apply | No |
| Chained PRs recommended | Yes (3 PRs per design.md §10) |
| Chain strategy | stacked-to-main (each PR merges independently; F2.5.3 has the only runtime coupling) |
| 400-line budget risk | Low |
| Estimated total changed LOC | ~560 (3 modules 380 + generator 150 + main.js 30) |
| Estimated new files | 4 (3 iso modules + 1 generator script) |
| Estimated modified files | 1 (`src/main.js`) |
| Estimated new assets | 40 PNG files ≈ 3.2 MB (PR size, not LOC) |
| Non-author weight | Stage 4 user gate (anti-glorification); tile seam visual review |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units (chained PRs)

| PR | Files | LOC | Autonomous scope | Verification | Rollback boundary |
|----|-------|-----|------------------|--------------|-------------------|
| F2.5.1 | `src/iso/{iso-math,tilemap,world}.js` | ~390 new | Pure modules, no main.js edit | Playwright test page asserts TILE-001 round-trip + 35-sprite cull cap ≤100 | `git rm -r src/iso/` reverts |
| F2.5.2 | `tools/generate-iso-tiles.py` + `assets/tiles/**` (40 PNGs) | ~150 new + 40 binaries | Assets + generator; nothing runs them yet | Playwright loads 1 tile per stage, asserts no magenta fringe, 128×64 dims | `git rm -r assets/tiles/ tools/generate-iso-tiles.py` reverts |
| F2.5.3 | `src/main.js` | ~30 modified | Wires F2.5.1 + F2.5.2 into runtime; cache-bust `?v=6` → `?v=7` | Playwright screenshot of `/` shows iso world + 4 sprites + crosshair, console.error = 0 | `git revert` keeps F2.5.1 + F2.5.2 intact |

---

## Phase F2.5.1 — Pure modules (no assets, no main.js edit)

- [x] **F2.5.1.1** — Create `src/iso/iso-math.js` with pure coord transforms
  - **Files**: `src/iso/iso-math.js` (new) · **LOC**: +60 · **Depends**: none
  - **Verify**: Open a minimal HTML test page; in Playwright `page.evaluate(() => import('./src/iso/iso-math.js'))` returns `{sx, sy}` where `isoToScreen(3, 5, 128, {x:960,y:324})` round-trips through `screenToIso` within ±0.001 (TILE-001).
  - **Deliverable**: zero Pixi import; exports `isoToScreen`, `screenToIso`, `computeTileSize`, `computeWorldOrigin`; constants `TILE_HALF_W`, `TILE_HALF_H`.

- [x] **F2.5.1.2** — Create `src/iso/tilemap.js` (Tile + Tilemap)
  - **Files**: `src/iso/tilemap.js` (new) · **LOC**: +180 · **Depends**: F2.5.1.1
  - **Verify**: In test page, instantiate `Tilemap("stage1-bosque")` with 8 mock textures; call `cullAndRender({gxMin:0,gxMax:5,gyMin:0,gyMax:5})`; assert ≤100 children alive, every child has `zIndex` divisible by 1000, `sortableChildren === false` (TILE-003, TILE-004).
  - **Deliverable**: `class Tile extends PIXI.Sprite`, `class Tilemap { constructor, load, listVariants, getTile, cullAndRender, destroy }`; explicit zIndex only.

- [x] **F2.5.1.3** — Create `src/iso/world.js` (IsoWorld orchestrator)
  - **Files**: `src/iso/world.js` (new) · **LOC**: +150 · **Depends**: F2.5.1.2
  - **Verify**: Test page with real `PIXI.Application`; mount `IsoWorld` with mock tilemap; call `update({getCameraX: ()=>5, getCameraY: ()=>5})`; assert `world.container.position` reflects `isoToScreen(5,5)` negation, `activeTilemap` reference is single-valued, `setStage` disposes previous (CAM-002, CAM-003).
  - **Deliverable**: re-exports `isoToScreen`/`screenToIso`; `world.container` is the only thing main.js adds to the existing `world` container.

- [x] **F2.5.1.4** — Add Playwright smoke test page `tests/iso-smoke.html`
  - **Files**: `tests/iso-smoke.html`, `tests/iso-smoke.js` (new) · **LOC**: +40 · **Depends**: F2.5.1.1, F2.5.1.2, F2.5.1.3
  - **Verify**: Playwright navigates to `/tests/iso-smoke.html`; `page.evaluate(() => window.__isoSmokeOK)` returns `true`; `console.error` count = 0; screenshot saved to `tests/out/iso-smoke.png` shows a 10×10 mock tile grid.
  - **Deliverable**: test page reusable by `sdd-verify`; asserts the 3 modules compose without Pixi exceptions.

---

## Phase F2.5.2 — Asset generation (terrain-faithful, autonomous)

- [x] **F2.5.2.1** — Create `tools/generate-iso-tiles.py` (prompt builder + driver)
  - **Files**: `tools/generate-iso-tiles.py` (new), `tools/variants.json` (new — per-variant `{variant_note}` only) · **LOC**: +150 · **Depends**: none
  - **Verify**: `python3 tools/generate-iso-tiles.py --dry-run` prints 40 prompts (5 stages × 8 variants) to stdout; zero calls to `minimax_generate_image`; prompts contain the NOTES.md location string and palette bullets for each stage (ASSET-005).
  - **Deliverable**: pure-Python script using only stdlib; parser for the 5 NOTES.md files; `VERTEDERO_NEGATIVE` injected only for stage 4.

- [x] **F2.5.2.2** — Generate 8 tiles for `stage1-bosque`
  - **Files**: `assets/tiles/stage1-bosque/raw/*.png` (8 new, ~80 KB each) · **Depends**: F2.5.2.1
  - **Verify**: Playwright loads each PNG, asserts `naturalWidth === 128 && naturalHeight === 64`; assert `getImageData(0,0).data` matches `#FF00FF` for the 4 corner pixels (ASSET-001, ASSET-005).
  - **Deliverable**: 8 raw PNGs matching `pino_clear_grass_rojizo`, `pino_underbrush_dark`, `encina_redonda_sombra`, `suelo_arcilloso_rojizo`, `trocha_forestal_compactada`, `matorral_coscoja_romero`, `arroyo_barranco_edge`, `hojarasca_pino_seca`.

- [x] **F2.5.2.3** — Generate 8 tiles for `stage2-pueblo`
  - **Files**: `assets/tiles/stage2-pueblo/raw/*.png` (8 new) · **Depends**: F2.5.2.2
  - **Verify**: Same Playwright shape assertion as F2.5.2.2.
  - **Deliverable**: 8 raw PNGs (`cal_blanca_pared`, `teja_arabe_roja`, `adoquin_calle_empedrada`, `asfalto_N330_circulado`, `acera_baldosa_hidraulica`, `sombra_calle_estrecha`, `balcon_hierro_forjado`, `porton_madera_pueblo`).

- [x] **F2.5.2.4** — Generate 8 tiles for `stage3-rio`
  - **Files**: `assets/tiles/stage3-rio/raw/*.png` (8 new) · **Depends**: F2.5.2.3
  - **Verify**: Same Playwright shape assertion.
  - **Deliverable**: 8 raw PNGs (`agua_cristalina_verde_azul`, `cortado_vertical_karstico`, `roca_chorrera_humeda`, `sedimento_aluvial_rio`, `chopo_ribera_densa`, `canto_rodado_orilla`, `musgo_humedo_roca`, `ladera_matorral_seca`).

- [x] **F2.5.2.5** — Generate 8 tiles for `stage4-vertedero` (USER GATE)
  - **Files**: `assets/tiles/stage4-vertedero/raw/*.png` (8 new) · **Depends**: F2.5.2.4
  - **Verify**: Playwright loads 8 PNGs + asserts NO green vegetation and NO blue sky pixels (`#00FF00` and `#0000FF` counts = 0 across all 8 tiles); `VERTEDERO_NEGATIVE` appears in the saved prompt log.
  - **Deliverable**: 8 raw PNGs (`cement_pad_crack`, `gravel_dust_industrial`, `dirt_oily_contaminated`, `plastic_debris_mixed`, `container_lixiviado_stain`, `metal_scrap_rust`, `asphalt_cracked_heavy_truck`, `weeds_through_pavement`) — oppressive grey-brown palette (ASSET-005 anti-glorification).

- [x] **F2.5.2.6** — Generate 8 tiles for `stage5-castillo`
  - **Files**: `assets/tiles/stage5-castillo/raw/*.png` (8 new) · **Depends**: F2.5.2.5
  - **Verify**: Same Playwright shape assertion.
  - **Deliverable**: 8 raw PNGs (`peñon_basalto_volcanico`, `cal_castillo_blanca`, `torre_homenaje_reloj`, `mamposteria_antigua_ocre`, `patio_armas_adoquines`, `sendero_subida_peñon`, `pino_peñon_mediterraneo`, `aljibe_boveda_subterraneo`).

- [x] **F2.5.2.7** — Run `tools/postprocess_v4.py` on all 40 raw tiles (5 batches)
  - **Files**: `assets/tiles/stage{1-5}-*/*.png` (40 chroma-keyed) · **Depends**: F2.5.2.2–F2.5.2.6
  - **Verify**: Playwright loads each processed tile; assert NO `#FF00FF` pixel anywhere (corner + center samples); alpha at 4 corners = 0; alpha at center = 255 (ASSET-002).
  - **Deliverable**: 40 transparent PNGs under `assets/tiles/stage{1-5}-{name}/{variant}.png` ready for `PIXI.Assets.load`.

- [ ] **F2.5.2.8** — User visual review (stage-by-stage + stage 4 anti-glorification)
  - **Files**: none (gate only) · **Depends**: F2.5.2.7
  - **Verify**: `sdd-verify` captures a `tests/out/tile-gallery.html` montage (10×4 grid of all 40 tiles on a 1080p background); user reviews in Playwright screenshot. Stage 4 must look dirty (not resort). Reject loops back to F2.5.2.5.
  - **Deliverable**: `OK to commit` or `regenerate stage N variant M` decision.

---

## Phase F2.5.3 — Integration (TOUCH main.js, minimal)

- [x] **F2.5.3.1** — Modify `src/main.js`: wire `IsoWorld`, swap camera transform
  - **Files**: `src/main.js` (modified), `index.html` (cache-bust `?v=6` → `?v=7`) · **LOC**: +30 / −5 · **Depends**: F2.5.1.3, F2.5.2.7
  - **Verify**: Playwright navigates to `http://localhost:8000/`; `console.error` count = 0; `console.warn` count = 0; screenshot saved to `tests/out/iso-world.png` shows iso Diablo-2 view with 10×10 grass plane + 4 sprites at iso corners + crosshair on HUD (CAM-002, ASSET-004).
  - **Deliverable**: `loadTilemap()` sibling to `loadSprites()`; `bg` placeholder replaced with `isoWorld.container`; `world.x = -camera.getCameraX()` replaced with `world.position.set(-csx, -csy)`.

- [x] **F2.5.3.2** — Define `DEMO_PATH_ISO` (monotonic x+y)
  - **Files**: `src/main.js` (modified) · **LOC**: +10 · **Depends**: F2.5.3.1
  - **Verify**: Playwright records 10 frames at 1-second intervals while the demo runs; for each frame compute `camera.getCameraX() + camera.getCameraY()` and assert the sequence is non-decreasing (CAM-001 monotonic depth).
  - **Deliverable**: `DEMO_PATH_ISO = [{t:0,x:0,y:0}, {t:30,x:9,y:9}]`; sum 0 → 18.

- [x] **F2.5.3.3** — Crosshair sanity check (player.js unchanged, but verify)
  - **Files**: none (verify-only) · **Depends**: F2.5.3.2
  - **Verify**: Playwright moves the mouse across the canvas at 3 different positions; in each frame the crosshair `hud` child reads the mouse position in screen-space (not transformed by world matrix). Confirms `src/player.js` needs zero edits (CAM-002 HUD invariant).
  - **Deliverable**: documented assumption — if crosshair drifts, return to F2.5.3.1 to confirm `hud` is a sibling of `world`, not a child.

- [ ] **F2.5.3.4** — Final user visual gate (Diablo-2 look-and-feel)
  - **Files**: none (gate only) · **Depends**: F2.5.3.3
  - **Verify**: Playwright screenshot saved to `tests/out/iso-final.png`; user compares against `zarra-v01-final.png` (lateral reference). Accept → ready for `sdd-archive`. Reject → loop back to F2.5.2.8 to regenerate tiles.
  - **Deliverable**: explicit `accept` or `regenerate` decision recorded in the PR description.

---

## Verify phase preview (`sdd-verify`)

- `console.error = 0`, `console.warn = 0` across 60 fps × 30 s demo run.
- `PIXI.Assets.cache.size ≥ 40` (35 tile PNGs + 5 existing sprites re-keyed).
- Visible tile count `≤ 100` at any frame (TILE-004 cull cap).
- Camera `getCameraX() + getCameraY()` monotonic non-decreasing over the demo path (CAM-001).
- `world.position` updates each frame; HUD crosshair does NOT inherit world transform (CAM-002).
- `IsoWorld.setStage("stage2-pueblo")` disposes Stage 1 tilemap, mounts Stage 2, `activeTilemap` reference flips (CAM-003).
- Stage 4 visual: NO green vegetation, NO blue sky pixels in the 8 PNGs; palette is grey-brown (ASSET-005 anti-glorification).
- 4 demo sprites render at iso corners with correct Z-order (pino occludes tile behind it, not tile in front).
- `git diff v0.1 -- src/{rail-camera,input,player}.js` is empty (CAM-001 contract).
- Visual screenshot `tests/out/iso-final.png` matches Diablo-2 iso look-and-feel.

## Archive phase preview (`sdd-archive`)

- 3 spec files under `openspec/changes/zarra-defenders-2d/fase-2.5-tile-system/specs/` become the new baseline under `openspec/specs/iso-{tile-system,camera-integration,asset-pipeline}/` (no prior baseline to merge).
- `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md` move to `openspec/changes/archive/2026-09-05-fase-2.5-tile-system/`.
- Engram observations tagged `sdd/zarra-defenders-2d/fase-2.5-tile-system/*` retained as audit trail.
- Tag `v0.2` cut from main after F2.5.3 merge.
