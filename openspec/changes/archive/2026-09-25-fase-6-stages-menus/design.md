# Design — Fase 6 Per-stage rosters + menú visuals

## Architecture

```
src/levels/stage-rosters.js   — STAGE_ROSTERS registry + helpers
assets/menu_bg/*.png          — 4 dedicated menu backgrounds
vendor/pixi.min.js            — local Pixi.js bundle (F6.3)
openspec/specs/{stage-rosters,menu-visuals,pixi-offline}/spec.md
```

Plus minor modifications:
- `src/main.js` — `bootTestLevel` uses `getRosterForStage(bg.stageId)` when available
- `index.html` — `<script src="vendor/pixi.min.js" onerror=fallback>`
- `styles/main.css` — 4 menu roots point to dedicated backgrounds

## 6.1 Per-stage rosters

`STAGE_ROSTERS` is a frozen object with 5 entries:

```js
{
  'stage1-lashoyas': { railPath, railEndTime, enemies, finalBossId, finalBossSpriteId, backgroundPath, stageId },
  'stage2-lahoz': { ... },
  'stage3-lahunde': { ... },
  'stage4-ayora': { ... },
  'stage5-acuifero': { ... },
}
```

Each entry has ~24 enemies built via helper `_spread(archetype, spriteId, count, startDepth, step, idPrefix)`
which distributes enemies along the rail avoiding vertical alignment.

Composition per stage:
- 16 standard mobile (5 spriteIds distributed across the rail)
- 4 tank mobile
- 2 mini-boss (static)
- 2 boss (1 primary, 1 secondary — same pattern as TEST_LEVEL)

### Sprite coverage

All rosters use ONLY the 12 canonical enemy spriteIds:
- camion_treco, bidon_lixiviado, bolsa_plastico, tubo_lixiviado, dron_fumigador,
  valla_publicitaria, camion_cisterna_residuos, topadora, trailer,
  planta_treco, incineradora, sello_burocratico

ROADMAP §6.1 mentions sprites that don't exist yet (motosierra, plataforma_solar,
humo toxico, drones de vigilancia, extractores). The roster structure allows
expansion when those sprites are added — no code changes needed, just update
the roster files.

### Wire in main.js

```js
// In bootTestLevel, replace:
enemies.loadLevel(TEST_LEVEL.enemies)

// With:
const stageId = bg && bg.stageId
const roster = getRosterForStage(stageId)
if (roster) {
  enemies.loadLevel(roster.enemies)
} else {
  enemies.loadLevel(TEST_LEVEL.enemies)
}
```

## 6.2 Menu backgrounds

### Generation pipeline

1. `minimax_text_to_image` (minimax MCP) with 16:9 aspect ratio
   - 4 prompts (panorama, mapa, vertedero, río)
2. Save raw JPEGs to `assets/menu_bg/raw/` (gitignored)
3. PIL post-process:
   - `Image.NEAREST` resize 1280x720 → 640x360 (pixel-art)
   - Save as PNG with optimize=True
4. Final PNGs in `assets/menu_bg/*.png`

### CSS mapping

```css
#main-menu    { background-image: url('../assets/menu_bg/menu-panorama-cofrentes.png'); }
#data-screen  { background-image: url('../assets/menu_bg/menu-panorama-cofrentes.png'); }  /* reuses */
#biblioteca   { background-image: url('../assets/menu_bg/menu-mapa-cartografico.png'); }
#game-overlay { background-image: url('../assets/menu_bg/menu-vertedero-satirico.png'); }
#final-screen { background-image: url('../assets/menu_bg/menu-rio-cabriel.png'); }
```

## 6.3 Pixi offline

```html
<!-- index.html -->
<script src="vendor/pixi.min.js"
        onerror="this.onerror=null;
                 this.src='https://cdn.jsdelivr.net/npm/pixi.js@7.4.0/dist/pixi.min.js'"></script>
```

The `onerror` fallback only fires when the local file is missing (HTTP 404)
or fails to execute. The CDN fallback ensures the game still loads on
fresh deploys without `vendor/` populated.
