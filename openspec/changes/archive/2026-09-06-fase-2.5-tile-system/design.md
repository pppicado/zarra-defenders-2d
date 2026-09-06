# Design: F2.5 — Isometric Tile System

> **Change**: `fase-2.5-tile-system` · **Project**: `zarra-defenders-2d` · **Base**: tag `v0.1` (d533567)
> **Mode**: hybrid — `openspec/changes/zarra-defenders-2d/fase-2.5-tile-system/design.md` + Engram `sdd/zarra-defenders-2d/fase-2.5-tile-system/design`

HOW. Intent in `proposal.md`; contracts in `specs/*/spec.md`. References the 9 locked decisions (#106/#107/#109) and the terrain-fidelity constraint from this session.

---

## 1. Architecture

```
app.stage
├── world (MODIFIED) → IsoWorld.container → Tilemap.activeTiles[] (≤100) + verticalSprites[] (≤30)
├── hud (UNTOUCHED) crosshair + hand+pen screen-space
└── ui  (UNTOUCHED) modals

src/iso/iso-math.js   ~60  pure: isoToScreen, screenToIso, computeTileSize, computeWorldOrigin
src/iso/tilemap.js    ~180 Tile, Tilemap — grid, cull, zIndex
src/iso/world.js      ~150 IsoWorld orchestrator
tools/generate-iso-tiles.py  NEW — NOTES.md → prompt → minimax → postprocess_v4.py → commit
```

### `src/main.js` edits (minimal)

1. Add `loadTilemap()` sibling to `loadSprites()` (same `PIXI.Assets.load` + `scaleMode = NEAREST`).
2. Replace `bg` placeholder with `isoWorld = new IsoWorld(app, tilemaps)`; `world.addChild(isoWorld.container)`.
3. Replace `DEMO_SPRITES` with iso demo: 10×10 grass plane + 4 sprites at iso corners.
4. Reinterpret `DEMO_PATH` as iso `[{t:0,x:0,y:0}, {t:30,x:9,y:9}]` (monotonic `x+y`).
5. Game loop: `world.x = -camera.getCameraX()` → `world.position.set(-camScreenX, -camScreenY)` via `isoToScreen`.

No other `src/` file touched.

---

## 2. Coordinate math

**Formulas (PLAN.md §13, locked)** — 2:1 diamond via `tileHalfWidth = tileSize/2`, `tileHalfHeight = tileSize/4`:

| Transform | Formula |
|---|---|
| iso → screen | `sx = origin.x + (isoX − isoY)·(tileSize/2)`; `sy = origin.y + (isoX + isoY)·(tileSize/4)` |
| screen → iso | `isoX = (localX/(tileSize/2) + localY/(tileSize/4)) / 2`; `isoY = (localY/(tileSize/4) − localX/(tileSize/2)) / 2` |

Both pure — no globals, no Pixi import (TILE-001). **`tileSize`** = `clamp(round(min(W,H)/16), 64, 256)`. **`worldOrigin`** = `{ x: W/2, y: H·0.30 }` — vertical sprites with anchor `(0.5, 1.0)` place feet at `(isoX, isoY)` with no separate offset.

---

## 3. Z-order

`zIndex = (gx + gy) * 1000 + offset`.

| Range | Owner |
|---|---|
| 0–499 | Terrain tiles (default 0) |
| 500–699 | Decoration |
| 700–899 | Pedestrian / small enemies |
| 900–999 | Boss / large sprites |

**Why NOT `sortableChildren = true`**: Pixi v7 re-sorts children on every zIndex change — O(n log n) + GC churn/frame. Explicit zIndex with `sortableChildren = false` preserves order in `updateZOrder()` once/frame. ~10× saving for 130 children on mid-range mobile.

---

## 4. Culling

Inverse-project 4 screen corners to iso, take bounding box, ±1 tile overshoot (`M = 1`). Budget: ≤ 100 tiles alive (TILE-004). At `tileSize = 64` on 1920×1080 the visible window is ~15×15; hard-cap clips to 100.

---

## 5. Tilemap data structure

```
class Tile extends PIXI.Sprite     // anchor (0.5, 0.5); zIndex external
class Tilemap {
  constructor(stageId)
  async load(textureResolver)        // resolves 8 variants
  listVariants() → string[]
  getTile(variant) → Tile|null
  cullAndRender(container, {gxMin,gxMax,gyMin,gyMax}, pickVariant)
                                     // destroys off-screen, creates new with zIndex, ≤ 100
  destroy()
}
class IsoWorld {
  constructor(app, tilemaps)
  get container() → PIXI.Container
  update(camera)                     // per-frame cull + re-project sprite positions
  setStage(stageId)                  // CAM-003: destroys active, mounts new
  get activeTilemap()
  screenToIso(sx, sy) | isoToScreen(ix, iy)   // re-exports
}
```

Vertical sprites (pinos + castillo for F2.5): anchor `(0.5, 1.0)`, position = `isoToScreen(isoX, isoY)`, `zIndex = (isoX + isoY) * 1000 + 500`.

---

## 6. Camera integration

**CAM-001**: `RailCamera` reused verbatim; renderer treats `getCameraX/Y()` as iso coords. DEMO_PATH `[(0,0) → (9,9)]` keeps sum monotonically increasing (0 → 18). `IsoWorld.update()` asserts `getCameraX() + getCameraY()` ≥ previous frame.

**CAM-002 per-frame**: `(csx, csy) = isoToScreen(camera.getCameraX(), camera.getCameraY(), tileSize, worldOrigin)`; `world.position.set(-csx, -csy)`. `hud` and `ui` stay at `(0,0)`.

**CAM-003**: `IsoWorld.setStage(stageId)` destroys active Tilemap, mounts new; hard cut per spec.

---

## 7. ASSET PIPELINE (terrain fidelity — user constraint)

**Pipeline**: parse 5 × NOTES.md → 40 prompts (Vertedero gets `VERTEDERO_NEGATIVE`) → minimax_generate_image × 40 → `tools/postprocess_v4.py` × 5 batches → Playwright headless validation → manifest.json tracks `pending → generated → chroma-keyed → validated | failed` → commit-ready.

**NOTES.md parser**: regex-extracts `**Location:**`, bullets under `Hábito vegetal real documentado:` / `Componentes típicos:`, references (jpg/jpeg/png siblings), and `**Color palette:**` bullets. Returns `{location, features, refs, palette}` consumed by the prompt builder.

**Prompt template** (full version in `tools/generate-iso-tiles.py`):

```python
PROMPT_TEMPLATE = """
Isometric pixel art ground tile, 128×64 px diamond (2:1), flat magenta #FF00FF BG,
Diablo 2 ground tile style, 16-bit pixel art, NO anti-aliasing,
NO characters, NO items, NO text, NO UI, NO borders.

LOCATION: {location}
DISTINCTIVE TERRAIN FEATURES (must reflect): {features_block}
REFERENCE PHOTOS available: {refs_list}
COLOR PALETTE: {palette_block}
VARIANT-SPECIFIC NOTE: {variant_note}
"""
VERTEDERO_NEGATIVE = "no green vegetation, no blue sky, no natural beauty, oppressive grey-brown industrial palette, dirty and decayed feel, dump not resort"
```

`{variant_note}` is the only manual content — per-variant hand-authored sentence in `variants.json` next to NOTES.md.

**File layout** (ASSET-003): `assets/tiles/stage{1-5}-{name}/{variant}.png` × 8 each (40 total). Cache key = full URL → 40 unique `PIXI.Assets.load` keys (ASSET-001). **Validation gate** (ASSET-002 + ASSET-005): Playwright asserts console errors = 0, residual `#FF00FF` at 4 corners = 0, N distinct tile patches; failed variants re-queue. Stage 4 anti-glorification: user/`sdd-verify` reviews 8 vertedero tiles — no green, no blue.

---

## 8. Sequence diagrams

**Bootstrap**: `main.js → new PIXI.App → new IsoWorld → await Assets.load(40) → setStage("stage1-bosque") → ticker.add(camera.update + isoWorld.update) → first frame`.

**Per-frame camera**: `ticker → camera.update(dt) → isoWorld.update: range = cull(screenToIso corners), tilemap.cullAndRender(range, pickVariant) destroys stale + creates new (zIndex assigned), demo sprites re-projected, world.position.set(-camScreenX,-camScreenY) → Pixi renders back-to-front by zIndex (no sort)`.

**Tile generation**: `parse 5 NOTES.md → 40 prompts → manifest(pending) → minimax × 40 → raw PNGs → subprocess postprocess_v4.py × 5 → manifest(chroma-keyed) → Playwright load + screenshot + asserts → manifest(validated | failed) → git add assets/tiles/`.

---

## 9. ADRs

| # | Decision | Rationale |
|---|---|---|
| 1 | Explicit `zIndex` with `sortableChildren = false` | `sortableChildren=true` re-sorts children on every zIndex change (O(n log n) + GC/frame). Explicit zIndex preserves order in `updateZOrder()` once/frame. ~10× saving for 130 children. |
| 2 | Reinterpret `RailCamera`, no new class | `RailCamera` is generic; only consumer interpretation changes. CAM-001 mandates zero-line diff vs v0.1 (auditable). Avoids ~60 LOC duplication. |
| 3 | Standalone `iso-math.js`, zero Pixi import | Pure functions are testable without Pixi mocks, reusable by F3 hit-detection and hand+pen. TILE-001 mandates "exercisable from DevTools". |
| 4 | `PIXI.Assets.load` (cache) over atlas baking | `Assets.load` dedupes by URL — 100 Sprites share 1 Texture/variant. Atlas saves ~30% load time but adds a build step the project explicitly avoids. |
| 5 | Magenta chroma-key, reuse `postprocess_v4.py` | Existing tool is tuned for magenta corners (PURPLE_HUE 240/340 HSV) and 21 existing sprites pass through it. Reuse = zero new post-processing code. Transparent/green BGs rejected (edge artifacts, purple-hunt calibration). |

---

## 10. Migration

### Demo path (F2.5 acceptance scene)

10×10 grass plane + 4 vertical sprites at iso corners (pino ×3 at `(1,1)`, `(8,1)`, `(1,8)`; castillo at `(8,8)`). Each sprite: anchor `(0.5, 1.0)`, position = `isoToScreen(isoX, isoY)`, `zIndex = (isoX + isoY) * 1000 + 500`. `DEMO_PATH = [{t:0,x:0,y:0}, {t:30,x:9,y:9}]` (sum 0 → 18, monotonic).

### PR split (review-budget guard §E)

| PR | Files | Why split |
|---|---|---|
| F2.5.1 | `src/iso/{iso-math,tilemap,world}.js` (~400 LOC new) | Pure math + structure |
| F2.5.2 | `tools/generate-iso-tiles.py` + `assets/tiles/**` (40 PNGs ≈ 2 MB) | Heaviest commit — clean PR |
| F2.5.3 | `src/main.js` (~50 LOC modified) | Smallest behavioral change, highest-risk diff |

### Verification

`git diff v0.1 -- src/{rail-camera,input,player}.js` = empty; `src/main.js` edits only in `bootstrap()` + game-loop callback. Playwright screenshot: iso Diablo-2 view, 4 sprites at iso corners of 10×10 grass plane. HUD crosshair doesn't move when camera scrolls. `world.position` updates each frame; 60 fps; console errors = 0. No `#FF00FF` in committed PNGs. Stage 4 tiles reviewed: oppressive grey-brown, no green/blue.

### Threat matrix

**N/A** — design does not alter routing, shell, runtime subprocesses, VCS/PR automation, executable-file classification, or process integration. `generate-iso-tiles.py` uses `subprocess.run` only to invoke existing `postprocess_v4.py` (no new threat surface).

---

## 11. Open questions (carry to sdd-tasks — NOT design blockers)

1. `screenToIso` rounding for hit-detection: F3 may add `screenToTile` snap.
2. `tileSize` resize: full re-cull (≤100 ms) vs reposition-only — F2.5 re-culls.
3. Per-stage `pickVariant` strategy: F2.5 flat 10×10; F4 stages plug in path-aware logic via callback.
4. Cache bust on regeneration: `?v={timestamp}` in dev.

---

## Next phase

`sdd-tasks` — break into F2.5.1 (iso-math + tilemap + world), F2.5.2 (asset generator + 40 tiles), F2.5.3 (main.js integration + demo migration); Playwright verification per group; 400-line budget forecast per `sdd-phase-common.md` §E.