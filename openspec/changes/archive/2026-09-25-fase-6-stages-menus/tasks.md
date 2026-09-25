# Tasks — Fase 6 Per-stage rosters + menú visuals

## Implementation

### 6.1 Per-stage enemy rosters
- [x] Create `src/levels/stage-rosters.js` with `STAGE_ROSTERS` registry
- [x] Define 5 rosters (stage1-lashoyas through stage5-acuifero)
- [x] Each roster has unique finalBossSpriteId (topadora / tubo_lixiviado / incineradora / trailer / planta_treco)
- [x] Helper `getRosterForStage(stageId)` returns roster or null
- [x] Helper `listStagesWithRoster()` returns 5 stageIds
- [x] `assertAllRostersStatic()` validates REQ-CMB-009
- [x] Wire `bootTestLevel` in main.js to use roster matching `bg.stageId`, fallback to TEST_LEVEL

### 6.2 Backgrounds de menú (4 PNGs)
- [x] Generate menu-panorama-cofrentes with minimax text_to_image
- [x] Generate menu-mapa-cartografico with minimax text_to_image
- [x] Generate menu-vertedero-satirico with minimax text_to_image
- [x] Generate menu-rio-cabriel with minimax text_to_image
- [x] Download raw JPEGs from minimax signed URLs (immediate, before expiry)
- [x] Post-process with PIL NEAREST downsample 1280x720 → 640x360
- [x] Save PNGs to assets/menu_bg/*.png
- [x] Add `assets/menu_bg/raw/` to .gitignore (raw JPEGs regenerable)
- [x] CSS: #main-menu uses panorama
- [x] CSS: #biblioteca uses mapa
- [x] CSS: #game-overlay uses vertedero
- [x] CSS: #final-screen uses rio-cabriel
- [x] CSS: #data-screen reuses panorama

### 6.3 Pixi.js bundle offline fallback
- [x] Download pixi.js v7.4.0 from CDN
- [x] Save to vendor/pixi.min.js (446KB)
- [x] Update index.html: `<script src="vendor/pixi.min.js" onerror=fallback>`
- [x] Verify PIXI.VERSION === '7.4.0' loads from local in headless Chromium

## Tests

- [x] Unit test: 18 tests for stage-rosters (levels-stage-rosters.spec.mjs)
  - shape, count, sprite coverage, unique bosses, theme assertions
- [x] Headless: verify each menu asset HTTP 200
- [x] Headless: verify PIXI global available with version 7.4.0
- [x] 0 console errors in full flow

## Documentation

- [x] Update MANUAL_PLAYTHROUGH §21 with stage rosters + menu backgrounds verification
- [x] Update ROADMAP.md Fase 6 status to Cerrada
- [x] Add `assets/menu_bg/raw/` and `menu-*.jpeg` patterns to .gitignore
