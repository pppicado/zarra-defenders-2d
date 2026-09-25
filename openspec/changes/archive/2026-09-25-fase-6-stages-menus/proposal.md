# Proposal — Fase 6 Per-stage rosters + menú visuals

## Intent

Differentiate the 5 stages with unique enemy rosters + dedicated menu
backgrounds + offline Pixi.js bundle. ROADMAP §6.1 (rosters), §6.2 (menu bgs),
§6.3 (pixi offline). T-shirt: L+L+S.

## Scope

In scope:
- **6.1 Per-stage enemy rosters**: `src/levels/stage-rosters.js` with
  `STAGE_ROSTERS` registry. Each of the 5 stages has its own `railPath`,
  `railEndTime`, `enemies[]`, `finalBossId`, `finalBossSpriteId`. Bosses
  distinct per stage. Wire `bootTestLevel` to use the roster matching
  `bg.stageId`, falling back to `TEST_LEVEL` for the canonical test mode.
- **6.2 Backgrounds de menú (4 PNGs)**: Generated with minimax MCP
  (text_to_image 1280x720), post-processed with PIL NEAREST downsample
  to 640x360. Stored in `assets/menu_bg/*.png`. Each menu uses a dedicated
  background: main-menu (panorama), biblioteca (mapa), game-overlay (vertedero),
  final-screen (río Cabriel).
- **6.3 Pixi.js offline fallback**: `vendor/pixi.min.js` (446KB) bundled
  locally. `index.html` uses `<script src="vendor/pixi.min.js" onerror="fallback CDN">`.

Out of scope:
- Suno Pro music integration (separate optional phase, not in F4-6 cycle)
- Per-stage music tracks (F4 music uses procedural with single melodic template)
- Sprite assets for new enemy types mentioned in ROADMAP (motosierra,
  plataforma_solar, etc.) — using existing 12-sprite catalog as baseline

## Approach

### 6.1 — Per-stage rosters

A single `STAGE_ROSTERS` registry keyed by stageId. Each roster has a unique
`finalBossSpriteId` from the 12-sprite canon:

| stage | boss |
|---|---|
| stage1-lashoyas | `enemies_topadora` |
| stage2-lahoz | `enemies_tubo_lixiviado` |
| stage3-lahunde | `enemies_incineradora` |
| stage4-ayora | `enemies_trailer` |
| stage5-acuifero | `enemies_planta_treco` |

Each roster has ~24 enemies (16 standard + 4 tank + 2 mini-boss + 2 boss)
with thematic distribution matching the geographical nature of the stage.

The `bootTestLevel` in `main.js` queries `getRosterForStage(bg.stageId)` and
uses it when available, falling back to `TEST_LEVEL` when no roster matches
(preserves `?test=1` path that doesn't go through menu stage selection).

### 6.2 — Menu backgrounds

4 PNGs generated with `minimax_text_to_image` (minimax MCP) using Diablo 2
aesthetic prompts for each:

1. **menu-panorama-cofrentes.png** — Valle view from Castillo de Cofrentes
   at golden hour
2. **menu-mapa-cartografico.png** — Stylized cartographic map (aged parchment)
3. **menu-vertedero-satirico.png** — Satirical toxic waste dump (dark humor)
4. **menu-rio-cabriel.png** — Cabriel canyon at golden hour

All post-processed with PIL `Image.NEAREST` downsample 1280x720 → 640x360
for pixel-art consistency. Total size ~2MB.

CSS maps each menu root to its background:
- `#main-menu` → panorama-cofrentes
- `#data-screen` → panorama-cofrentes (reuses)
- `#biblioteca` → mapa-cartografico
- `#game-overlay` → vertedero-satirico
- `#final-screen` → rio-cabriel

### 6.3 — Pixi offline

`vendor/pixi.min.js` — copy of pixi.js v7.4.0 (the exact version used at CDN).
Local-first load with CDN fallback:

```html
<script src="vendor/pixi.min.js"
        onerror="this.onerror=null;
                 this.src='https://cdn.jsdelivr.net/npm/pixi.js@7.4.0/dist/pixi.min.js'"></script>
```

This enables deployment to Tailscale-only / offline environments without
sacrificing fallback to the CDN if the local copy is missing (e.g. fresh
deploy without `vendor/` populated).

## Acceptance

### 6.1 Per-stage enemy rosters
- ✅ Each of 5 stages has unique roster
- ✅ Each stage has unique finalBossSpriteId
- ✅ Each roster has 20+ enemies with at least 1 boss
- ✅ `assertAllRostersStatic()` passes (REQ-CMB-009: static spriteIds not self-translating)

### 6.2 Backgrounds de menú
- ✅ 4 PNGs generated (panorama, mapa, vertedero, río Cabriel)
- ✅ Each menu has its dedicated background
- ✅ Estilo coherente con backgrounds de stage (pixel-art NEAREST)

### 6.3 Pixi.js bundle offline fallback
- ✅ `vendor/pixi.min.js` (446KB) committed
- ✅ `index.html` uses local-first with CDN fallback
- ✅ PIXI.VERSION === '7.4.0' when loaded locally
- ✅ 0 console errors

## Risks

1. **Sprite coverage**: ROADMAP mentions sprites that don't exist in the current
   12-sprite catalog (motosierra, plataforma_solar, humo toxico, extractores).
   Roster structure allows future expansion without changes — when new sprites
   are added, the roster just references them.

2. **Background style consistency**: minimax-generated backgrounds may have
   visual drift between them. Mitigated by consistent Diablo 2 aesthetic prompt
   + NEAREST downsample for uniform pixel-art look.

3. **Pixi bundle size**: 446KB adds to repo size. Acceptable tradeoff for
   offline-first deployment. Mitigated by CDN fallback for when local copy
   is absent.
