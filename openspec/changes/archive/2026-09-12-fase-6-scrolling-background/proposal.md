# Proposal: fase-6-scrolling-background

## Intent

The tile-based isometric ground system (fase-2.5-*) produces tiles that look poor and tileable artifacts. The user has decided to abandon it for a single long per-stage background image that scrolls along the rail.

The new system MUST:

1. Disable the tile renderer in the main game (keep `iso-math.js` pure functions, keep `spriteLayer`, keep `isoToScreenWithCamera` / `screenToIsoWithCamera` for hit detection).
2. Introduce a `BackgroundLayer` module that loads one background PNG per stage and scrolls it at a parallax factor (0.2) so the image stays in viewport for the whole rail.
3. Hide the test-level button from the main menu; show 5 stage buttons (stage 1 unlocked, 2-5 locked).
4. At `camera.time >= railEndTime`: freeze the background, emit `stage:finaleStarted`, and spawn continuous waves of mobile enemies while the final boss remains hittable. When the boss is destroyed, the existing victory overlay fires.
5. Backgrounds are generated with the Minimax MCP `text_to_image` API using rich prompts that reference the real-world Valle de Ayora descriptions in `assets/references/stage{1-5}-*/NOTES.md` and the existing sprites in `assets/sprites/`.

## Scope

### In Scope
- New module `src/backgrounds.js` exporting `BackgroundLayer` class
- `src/main.js`: instantiate `BackgroundLayer` after the sprite manifest loads; mount it as a child of `isoWorld.container`; swap textures on stage change
- `src/iso/world.js`: remove `cullAndRender` call from `update()`; `setStage` / `registerTilemap` become no-ops (kept for back-compat with `tests/tile-gallery.html` standalone demo)
- `src/ui/menu.js`: replace single "Iniciar test level" button with 5 stage buttons (locked/unlocked state from localStorage)
- `src/levels/test-level.js`: extend `TEST_LEVEL` with `finalBossId` and `postFinalWaveRoster` (mobile enemies that spawn while boss is alive)
- `src/enemies.js`: new `EnemyManager.spawnWave(roster)` method to spawn fixed-position waves at fixed times
- `assets/backgrounds/stage{1-5}.png`: one 640×1120 source PNG per stage, scaled 2× on screen for pixel-art look (NEAREST filter)
- `tools/generate-stage-backgrounds.py`: driver script that builds prompts from `NOTES.md`, invokes minimax MCP, post-processes to NEAREST-downsampled 640×1120 PNGs
- New spec `openspec/specs/scrolling-background/spec.md` (BG-001..BG-005)
- Mark `openspec/specs/iso-tile-system/spec.md` as DEPRECATED (append banner, do NOT delete)
- RED-then-GREEN unit tests: `tests/unit/background-layer.spec.mjs` covering load / scroll / freeze / setStage

### Out of Scope
- Changes to combat / hit detection / enemy escape rules (unchanged from fase-5-*)
- Sprite regeneration (sprites are referenced by the bg prompt for visual consistency)
- Boss archetype behaviour changes (sello_burocratico, planta_treco unchanged)
- Per-stage enemy rosters (all 5 stages use the same TEST_LEVEL roster for fase-6; per-stage rosters are a future fase)
- Sound, music, score-sharing (out of fase-6 scope)
- Any change to the player hand, papeleta, hearts (HUD layer unchanged)

## Approach

### 1. Disable the tile system in main.js (preserve module)

`src/iso/world.js` `update()` will no longer call `this._activeTilemap.cullAndRender(...)`. The `_tileLayer` / `_worldLayer` containers stay mounted with zero children. `setStage()` and `registerTilemap()` become no-ops (with a `@deprecated` JSDoc comment). The standalone demo `tests/tile-gallery.html` keeps importing `../src/iso/tilemap.js` directly so it is unaffected.

`src/main.js`: delete the `new Tilemap(...)` + `await tilemap.load(...)` + `isoWorld.registerTilemap(tilemap)` + `isoWorld.setStage('stage1-bosque')` block.

### 2. BackgroundLayer module (BG-001..BG-005)

```js
// src/backgrounds.js
import { TILE_SIZE, LOGICAL_H } from './canvas.js?v=N'
import { isoToScreen } from './iso/iso-math.js?v=N'

const PARALLAX = 0.2                                  // BG-002
const BG_SOURCE_HEIGHT_PX = 1120                       // minimax 9:16 resized to 640 wide
const BG_SCALE = 2                                     // pixel-art 2× upscale
const RAIL_DEPTH_TILES = 72                            // (36, 36) over 120 s
const MAX_WORLD_SCROLL_PX = RAIL_DEPTH_TILES * (TILE_SIZE / Math.SQRT2) // ≈ 6516
const BG_RENDERED_HEIGHT = BG_SOURCE_HEIGHT_PX * BG_SCALE              // 2240
const BG_INITIAL_OFFSET_PX = MAX_WORLD_SCROLL_PX * PARALLAX            // 1303

export class BackgroundLayer {
  constructor({ container, viewportWidth }) {
    this.container = container
    this.viewportWidth = viewportWidth
    this.parallax = PARALLAX
    this._sprite = new PIXI.Sprite()
    this._sprite.scaleMode = PIXI.SCALE_MODES.NEAREST
    this._texture = null
    this._frozen = false
    this._stageId = null
  }

  async load(stageId, assetPath) {
    if (this._texture) { this._texture.destroy(true); this._texture = null }
    const tex = await PIXI.Assets.load(assetPath)
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
    this._sprite.texture = tex
    this._sprite.scale.set(BG_SCALE, BG_SCALE)
    this._sprite.x = 0                              // anchor top-left
    this._sprite.y = -BG_INITIAL_OFFSET_PX
    this._frozen = false
    this._stageId = stageId
  }

  update(cameraIso) {
    if (this._frozen || !this._texture) return
    const step = TILE_SIZE / Math.SQRT2
    const worldScrollPx = (cameraIso.isoX + cameraIso.isoY) * step
    // bg is child of isoWorld.container → inherits container.position.y (= worldScrollPx).
    // We counter-translate (1-parallax) so the bg scrolls slower than the world,
    // keeping it inside the viewport for the whole rail.
    this._sprite.y = -BG_INITIAL_OFFSET_PX - worldScrollPx * (1 - this.parallax)
  }

  freeze()  { this._frozen = true }
  unfreeze() {
    this._frozen = false
    // Re-anchor to current camera position so resume is seamless.
    this._sprite.y = -BG_INITIAL_OFFSET_PX
  }

  get isFrozen() { return this._frozen }
  get stageId()  { return this._stageId }
  destroy() {
    if (this._texture) this._texture.destroy(true)
    if (this._sprite) this._sprite.destroy()
  }
}
```

**Math verification (parallax=0.2, BG_SOURCE_HEIGHT_PX=1120, BG_SCALE=2, rail 0→36 iso at step ≈ 90.5 px):**

| t (s) | W (px) | bg.y | bg_screen_top | bg_screen_bottom | visible ⊂ bg? |
|---|---|---|---|---|---|
| 0    | 0    | -1303 | -1303 | 937  | ✓ (bg_screen_bottom 937 ≥ viewport 720) |
| 60   | 3258 | -3909 | -651  | 1589 | ✓ |
| 120  | 6516 | -6516 | 0    | 2240 | ✓ |

The bg stays in the viewport for the entire 120 s rail.

### 3. Menu changes (BG-005)

`src/ui/menu.js` new `STAGES`:
```js
const STAGES = [
  { id: 'stage1-bosque',    label: '1 · Bosque mediterráneo', locked: false },
  { id: 'stage2-pueblo',    label: '2 · Pueblo de Cofrentes', locked: true  },
  { id: 'stage3-rio',       label: '3 · Río Cabriel',         locked: true  },
  { id: 'stage4-vertedero', label: '4 · Vertedero TRECO',     locked: true  },
  { id: 'stage5-castillo',  label: '5 · Castillo de Cofrentes', locked: true  },
]
```

Locked state read from `localStorage.getItem('zarra2d:stageClear:<stageId>')`. On click of an unlocked stage, emit `menu:startStage` with `{ stageId }`. main.js wires it: swap bg texture, reset enemy roster, boot level.

For fase-6, all 5 stages use the same `TEST_LEVEL` enemies (the lock/unlock progression is only about which bg is shown).

### 4. Final-boss + post-freeze wave mechanic

`src/levels/test-level.js` exports extended `TEST_LEVEL`:
```js
{
  railPath: [...],
  railEndTime: 120,
  enemies: [...],                      // 120 unchanged
  finalBossId: 'e_boss_002',           // deepest enemy in original roster
  postFinalWaveRoster: [               // 3 waves of 3 mobile enemies
    { id: 'wave1_e1', spawnAtSec: 122, spriteId: 'enemies_dron_fumigador', isoX: 10, isoY: 10, archetype: 'tank' },
    ...
  ],
}
```

`src/enemies.js` `EnemyManager`:
- Track `state: 'rolling' | 'finale'`
- When `camera.time >= railEndTime`: set state to 'finale', emit `stage:finaleStarted`. main.js calls `bg.freeze()`.
- In 'finale' state: spawn the `postFinalWaveRoster` at the configured `spawnAtSec` times at fixed iso positions.
- When `finalBossId` enemy is destroyed: emit `stage:cleared` (existing).

### 5. Asset generation workflow

`tools/generate-stage-backgrounds.py`:
- Reads `assets/references/stage{1-5}-*/NOTES.md`
- Builds prompt per stage (see Approach §6 for full prompts)
- Aspect ratio: `9:16` (~1024×1792 from minimax)
- Post-process: Pillow NEAREST resize to 640 wide → 640×1120. Save to `assets/backgrounds/stage{N}-{theme}.png`
- Manifest `assets/backgrounds/manifest.json`:
  ```json
  { "stage1-bosque": "assets/backgrounds/stage1-bosque.png", ... }
  ```

### 6. Per-stage Minimax prompts (preview)

- **Stage 1 — Bosque mediterráneo**: "Pixel art 16-bit retro RPG landscape, Mediterranean pine forest of Valle de Ayora, dry red clay soil, dappled sunlight, scattered stone pines and holm oaks, distant blue mountains, sky gradient, vertical strip showing sky at top, distant forest, then foreground dirt path at bottom. Palette consistent with sprites `trees_pino`, `trees_encina`, `trees_almendro`. Final Fantasy Tactics / Diablo 2 aesthetic."
- **Stage 2 — Pueblo de Cofrentes**: whitewashed houses, Arabic tiles, central church, N-330 road, iron balconies, plaza
- **Stage 3 — Río Cabriel**: river gorges, blue-green water, vertical cliffs, riverside poplars
- **Stage 4 — Vertedero TRECO**: grey-brown, garbage mountains, chimney with smoke, oxidised fencing (oppressive, NOT glorified)
- **Stage 5 — Castillo de Cofrentes**: white castle on red-brown volcanic peñón, river below, town in distance

### 7. Spec openspec

`openspec/specs/scrolling-background/spec.md` with BG-001..BG-005 (see Approach §2 and §3). Mark `iso-tile-system/spec.md` as DEPRECATED (banner comment, do NOT delete).

## Technical Risks

| Risk | Mitigation |
|---|---|
| Minimax generates poor composition (character in foreground, busy details) | Generate `n=4` per stage, cherry-pick the best; iterate prompt |
| Background palette clashes with foreground sprites | Include "palette consistent with sprites X, Y, Z" in prompt; verify in Playwright |
| Background stays in viewport for the whole rail | Math-verified at parallax=0.2 with 1120 source; verified t=0/60/120 in Approach §2 table |
| Localized strings for stage names need i18n later | Stage labels in single `STAGES` array; no inline strings |
| Boss / wave mechanic adds significant new code | Phased delivery: 6a disable tile + bg placeholder, 6b minimax generation, 6c finale + waves + boss |
| Performance: large bg texture causes GPU pressure | Single 640×1120 texture (~720 KB at 32bpp), NEAREST, no mipmaps — minimal |
| `tests/tile-gallery.html` breaks when tilemap.js moved | Keep `src/iso/tilemap.js` in place; just don't instantiate it in main.js |

## Success Criteria

1. `/?test=1&seed=12345` boots without console errors; tile renderer is NOT instantiated.
2. BackgroundLayer loads `assets/backgrounds/stage1-bosque.png`, renders at 2× with NEAREST, scrolls at parallax 0.2.
3. At `camera.time === 120s`: bg freezes, `stage:finaleStarted` fires.
4. While finale active: 3 waves × 3 mobile enemies spawn at fixed iso positions.
5. Killing the deepest enemy in the original TEST_LEVEL roster (`finalBossId`) emits `stage:cleared`.
6. Main menu shows 5 stage buttons; clicking stage 1 boots gameplay; stages 2-5 show locked icon.
7. Playwright smoke (`tests/e2e/smoke.spec.mjs`) passes GREEN.
8. New unit tests pass: `tests/unit/background-layer.spec.mjs`.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~520 (backgrounds.js ~130, main.js ~30, world.js ~10, menu.js ~60, test-level.js ~40, enemies.js ~30, test specs ~120, asset pipeline ~100) |
| 400-line budget risk | Medium-High |
| Chained PRs recommended | YES — 3 PRs: (a) disable tile + bg placeholder, (b) minimax bg integration per stage, (c) finale + waves + boss |