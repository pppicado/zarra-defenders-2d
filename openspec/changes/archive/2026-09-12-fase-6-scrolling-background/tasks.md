# Tasks: fase-6-scrolling-background

## Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~520 |
| 400-line budget risk | Medium-High |
| Chained PRs recommended | YES — 3 PRs |

## PR-1: Disable tile system + add bg placeholder (~150 LOC)

### 1.1 RED tests: BackgroundLayer contract
- [ ] Create `tests/unit/background-layer.spec.mjs` with failing tests for:
  - `load(stageId, assetPath)` swaps texture, destroys previous
  - `update(cameraIso)` computes correct `sprite.y` at t=0/60/120
  - `freeze()` stops `update` from changing `sprite.y`
  - `unfreeze()` re-anchors to current camera iso
  - `setStage(stageId)` reads manifest and calls `load`

### 1.2 GREEN: `src/backgrounds.js` minimal
- [ ] Implement `BackgroundLayer` class with stub PIXI texture (mock in test)
- [ ] Use PIXI.SCALE_MODES.NEAREST
- [ ] `sprite.scale.set(2, 2)`, `sprite.y = -BG_INITIAL_OFFSET_PX`
- [ ] Run unit tests → GREEN

### 1.3 Disable tile system in main game
- [ ] `src/iso/world.js`: comment out `cullAndRender` in `update()`; mark `setStage`/`registerTilemap` `@deprecated`
- [ ] `src/main.js`: delete `Tilemap` instantiation + `tilemap.load()` + `registerTilemap` + `setStage('stage1-bosque')` block
- [ ] Verify: `/?test=1` boots without errors, no `Tilemap` in `__zarraModules__`
- [ ] Run `tests/e2e/smoke.spec.mjs` → GREEN

### 1.4 Wire `BackgroundLayer` placeholder into main.js
- [ ] Instantiate `BackgroundLayer` with `isoWorld.container` as parent
- [ ] Use a 1×1 colored PIXI.Graphics placeholder for stage 1 (NEAREST, scale 2)
- [ ] Verify: bg visible in Playwright screenshot, no errors
- [ ] Commit PR-1

## PR-2: Minimax bg integration per stage (~100 LOC)

### 2.1 Asset pipeline
- [ ] `tools/generate-stage-backgrounds.py` driver:
  - Reads `assets/references/stage{1-5}-*/NOTES.md`
  - Builds per-stage prompt
  - Invokes minimax MCP `text_to_image` with `aspect_ratio=9:16`, `n=1`
  - Post-processes to 640×1120 with NEAREST via Pillow
  - Saves to `assets/backgrounds/stage{N}-{theme}.png`
- [ ] `assets/backgrounds/manifest.json` with 5 entries

### 2.2 Generate Stage 1 (bosque mediterráneo)
- [ ] Generate 4 candidates, pick best
- [ ] Verify in Playwright (visually correct composition, palette matches sprites)

### 2.3 Wire real bg into `BackgroundLayer`
- [ ] `src/backgrounds.js`: read manifest, lazy-load on `setStage()`
- [ ] `src/main.js`: call `bg.setStage('stage1-bosque')` on boot
- [ ] Verify Playwright screenshot

### 2.4 Generate Stages 2-5
- [ ] Repeat §2.2 for stages 2 (pueblo), 3 (río), 4 (vertedero), 5 (castillo)
- [ ] Verify each in Playwright
- [ ] Commit PR-2

## PR-3: Stage menu + finale + waves + boss (~270 LOC)

### 3.1 RED tests: stage menu lock progression
- [ ] `tests/unit/stage-menu.spec.mjs`: locked state from localStorage, unlock after clear
- [ ] `tests/unit/enemy-manager-spawn-wave.spec.mjs`: `spawnWave(roster)` spawns each entry at its iso position
- [ ] `tests/unit/test-level-extensions.spec.mjs`: `finalBossId` + `postFinalWaveRoster` validation

### 3.2 GREEN: stage menu
- [ ] `src/ui/menu.js`: 5 stage buttons, lock icons, localStorage read
- [ ] `src/main.js`: wire `menu:startStage` event → `bg.setStage` + `enemies.loadLevel` + camera reset
- [ ] `tests/e2e/menu-flow.spec.mjs`: update for new buttons, verify GREEN
- [ ] Run smoke → GREEN

### 3.3 GREEN: finale + waves + boss
- [ ] `src/levels/test-level.js`: add `finalBossId`, `postFinalWaveRoster` (3 waves × 3 mobile)
- [ ] `src/enemies.js`: `EnemyManager.spawnWave(roster)` method
- [ ] `src/main.js`: track `gameState.finale`, emit `stage:finaleStarted`, call `bg.freeze()`, spawn waves
- [ ] Wire boss destruction → `stage:cleared` → victory overlay
- [ ] Run smoke + Playwright → GREEN

### 3.4 Spec archive
- [ ] Move `iso-tile-system` requirements to DEPRECATED banner (append comment)
- [ ] Move `scrolling-background` specs from change folder to `openspec/specs/`
- [ ] Write archive report (`openspec/changes/2026-09-12-fase-6-scrolling-background/archive-report.md`)
- [ ] Verify all RED tests in PR-1/2/3 are GREEN
- [ ] Commit PR-3 + SDD archive

## Reviewers

| PR | Lines | Reviewer focus |
|---|---|---|
| PR-1 | ~150 | Math verification at t=0/60/120; tile module NOT removed (still imported by tile-gallery.html) |
| PR-2 | ~100 | Minimax prompts + post-process; visual quality of generated bgs |
| PR-3 | ~270 | Lock progression localStorage; finale trigger timing; wave roster archetype whitelist |