# Design: F2.5.2 — Square Iso Rotation

> **Change**: fase-2.5.2-square-iso-rotation · **Project**: zarra-defenders-2d
> **Base**: main @ 253c4a2 (F2.5.1 archived) · **Mode**: hybrid · **Strategy**: single-pr
> **Specs**: iso-tile-system (TILE-001/002/003 MODIFIED), iso-asset-pipeline (ASSET-001/002/007 MODIFIED + ASSET-009/010 ADDED), iso-gallery (GAL-001/002/003 ADDED)

## Technical Approach

Pivot from F2.5.1's 2:1 diamond to **"square iso falso"**: ship 64×64 square PNGs on disk, transform them into apparent diamonds at runtime by setting `Container.rotation = π/4` on a new wrapper layer. The on-disk texture stays top-down so the gallery's `Vista isométrica 45°` toggle is a pure CSS rotate. Iso-math collapses to `hh = hw = tileSize/2` (symmetric square iso). The asset pipeline gains a `--shape {diamond|square}` flag (default `square`) and a final NEAREST downsample step. Manifest invariant pivots to `totals.active === 40` (40 discarded diamonds become unbounded audit trail). Gallery (`tests/tile-gallery.html`) is rewritten with rotation toggle, Sprites section, and mini-iso-demo canvas.

## Architecture Decisions

| # | Decision | Option | Tradeoff | Choice |
|---|---|---|---|---|
| ADR-1 | Rotation surface | (a) Container rotation, (b) per-Sprite rotation, (c) texture bake | (a) keeps PNG top-down → gallery toggle works; zIndex stays on unrotated world space; 1 rotation vs N | **Container** (`_tileLayer.rotation = π/4` after introducing `_worldLayer` wrapper) |
| ADR-2 | Tile PNG size | 32² / 64² / 128² | 32² = 880 tiles/viewport (excess); 128² = 50 (sparse); 64² = ~112 at 90×90 footprint | **64×64** (balances detail + cull budget) |
| ADR-3 | Downsample filter | LANCZOS / NEAREST | LANCZOS blurs 16-bit pixel art (breaks Diablo-2 look); NEAREST preserves blocky pixels, 45° rotation masks aliasing | **NEAREST** (Pillow `Image.Resampling.NEAREST`) |
| ADR-4 | Manifest invariant | (a) `active === 40`, (b) `active + discarded === 40` | (b) is too strict for unbounded audit trail; (a) is honest about working set vs history | **`totals.active === 40`** (ASSET-007 MODIFIED) |
| ADR-5 | Sprites gallery count | 4 demo / 21 full catalogue | User-confirmed: full catalogue visibility (matches "cannot see" complaint) | **21 sprites** (GAL-001) |
| ADR-6 | Mini-iso-demo content | Real IsoWorld + 4 sprites / synthetic placeholder | Real = proves engine end-to-end; placeholder = no signal | **Real IsoWorld** + 3 pinos + 1 castillo, idle bobbing |
| ADR-7 | Container hierarchy | Add `_worldLayer` wrapper vs rotate `_tileLayer` directly | Rotating `_tileLayer` requires `tileWorldOrigin` recompute in pre-rot space; `_worldLayer` wrapper keeps `_tileLayer` math untouched | **`_worldLayer` wrapper** containing existing `_tileLayer` + `_spriteLayer` |
| ADR-8 | Postprocess output size | 128 / 64 | postprocess_v4 already supports `--size` arg; caller picks | **`--size 64`** at call site; downstream NEAREST step covers the 128→64 case when minimax returns 128×128 |

## Data Flow

```
┌─────────────────────────────────┐
│           main.js                │  unchanged
│  bootstrap → IsoWorld + Tilemap  │
└────────────────┬─────────────────┘
                 ▼
┌─────────────────────────────────┐
│      IsoWorld (orchestrator)     │  MODIFIED
│  container (PIXI.Container)      │
│    └── _worldLayer  ◄── rotation=π/4
│         ├── _tileLayer           │  (unchanged anchor math)
│         └── _spriteLayer         │  (rotation OK: sprites are anchored at feet)
└────────────────┬─────────────────┘
                 ▼
┌─────────────────────────────────┐
│        Tilemap (renderer)        │  MODIFIED position formula
│  64×64 px square tiles          │  (sprite.anchor = 0.5,0.5 unchanged)
│  zIndex = (gx+gy)*1000+offset    │  (painter's algorithm unchanged)
└────────────────┬─────────────────┘
                 ▼
┌─────────────────────────────────┐
│       iso-math (pure)            │  MODIFIED
│  hw = tileSize/2                 │  (was /2 — same)
│  hh = tileSize/2                 │  (was /4 → /2, square ratio)
│  isoToScreen, screenToIso        │  (unchanged signature)
└─────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/iso/iso-math.js` | MODIFY | `hh = tileSize / 2` (line 24, 41, 83); `getTileHalf()` returns symmetric halves |
| `src/iso/world.js` | MODIFY | New `_worldLayer` PIXI.Container with `rotation = Math.PI/4` wraps `_tileLayer` + `_spriteLayer`; `container.addChild(_worldLayer)` |
| `tests/iso-smoke.js` | MODIFY | Mock canvas `128×64` → `64×64`; default `tileSize = 64` (was 128) |
| `tools/generate-iso-tiles.py` | MODIFY | New `--shape {diamond,square}` arg (default `square`); `TILE_W, TILE_H` derived from shape; new `PROMPT_TEMPLATE_SQUARE` with "64×64 px square tile, top-down view, isometric pixel art, flat magenta #FF00FF background, Diablo 2 tile style, 16-bit pixel art, no anti-aliasing"; `run_postprocess()` passes `--size 64` + applies final NEAREST 128→64 downsample; smoke-test gate for `pino_clear_grass_rojizo` |
| `tools/postprocess_v4.py` | NO CHANGE | Caller controls `--size`; ASSET-002 unchanged |
| `src/iso/tilemap.js` | NO CHANGE | Sprite anchor (0.5, 0.5) already works for square; cull + zIndex unchanged |
| `src/main.js` | NO CHANGE | Texture-agnostic loader picks up new 64×64 PNGs on reload |
| `tests/tile-gallery.html` | REWRITE (~107 → ~250 LOC) | Add rotation toggle (CSS `transform: rotate(45deg)` on `.iso-rotated` body class); Sprites section enumerates `assets/sprites/*.png` (21 cards, blue border); Discarded section wrapped in `<details>` collapsed by default; mini-iso-demo canvas (480×270) instantiates real `IsoWorld` + `Tilemap('stage1-bosque')` + 4 demo sprites with idle bobbing; error badge for failed assets |
| `assets/tiles/stage{1-5}-*/<variant>.png` | REPLACE | 40 new 64×64 PNGs (regenerated) |
| `assets/tiles/_discarded/diamond-r2/` | CREATE | 40 archived 128×64 diamond PNGs moved from `stage{1-5}-*/` |
| `assets/tiles/manifest.json` | REGENERATE | 40 active swap; 40 new `discarded[]` entries with `regeneratedFrom` provenance; `totals.active === 40` |
| **Total authored LOC** | **~180** | well under 5000 budget |

## Interfaces / Contracts

```js
// iso-math.js (TILE-001)
export function isoToScreen(isoX, isoY, tileSize, origin) {
  const hw = tileSize / 2  // square iso — both halves equal
  const hh = tileSize / 2
  return { sx: origin.x + (isoX - isoY) * hw, sy: origin.y + (isoX + isoY) * hh }
}

export function getTileHalf(tileSize) {
  return { tileHalfWidth: tileSize / 2, tileHalfHeight: tileSize / 2 }  // symmetric
}
```

```js
// world.js — new wrapper layer (TILE-002)
this._worldLayer = new PIXI.Container()
this._worldLayer.name = 'worldRotated'
this._worldLayer.rotation = Math.PI / 4  // 45° — "square iso falso"
this._worldLayer.sortableChildren = false
this.container.addChild(this._worldLayer)
// _tileLayer, _spriteLayer move from this.container → this._worldLayer
```

```js
// tile-gallery.html — rotation toggle (GAL-002)
document.getElementById('iso-toggle').addEventListener('click', () => {
  document.body.classList.toggle('iso-rotated')
})
// CSS: body.iso-rotated figure.tile-card img { transform: rotate(45deg); transform-origin: center; }
```

## Sequence: gallery rotation toggle (GAL-002)

```
user clicks "Vista isométrica 45°" toggle
       │
       ▼
JS: body.classList.toggle('iso-rotated')
       │
       ▼
CSS rule: body.iso-rotated .tile-card img { transform: rotate(45deg) }
       │
       ▼
All 40 accepted-tile <img> rotate 45° instantly (GPU compositing)
       │
       ▼
Toggle button label flips to "Vista top-down" for next click
```

## Sequence: pipeline regeneration (ASSET-009/010)

```
sdd-apply (human-in-loop):
  for stage in stage1..stage5:
    for variant in stage.variants[0..7]:
      minimax MCP → generate-iso-tiles.py build-prompt --shape square
      minimax MCP → text_to_image(aspect_ratio="1:1", prompt)
      save → assets/tiles/<stage>/raw/<variant>.png (128×128 or 64×64)
      run_postprocess(stage, variants=[variant])
        → postprocess_v4.py --size 64   (chroma-key magenta → alpha)
        → NEAREST downsample 128→64     (ASSET-010)
        → validate: corners α=0, center α=255
      commit per-tile
      smoke-test gate (first iteration only): pino_clear_grass_rojizo
        → load in mini-iso-demo canvas → human visual review → proceed
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (headless) | `isoToScreen`/`screenToIso` round-trip, `getTileHalf` symmetry | `tests/iso-smoke.js` Playwright check (`__isoSmokeOK === true`) |
| Integration | Mini-iso-demo renders `IsoWorld` + 4 demo sprites, rotation toggle rotates tile cards | Playwright headless: assert 0 `console.error`/`console.warn`; capture screenshot of gallery top-down + iso-rotated |
| Visual | 40 new PNGs are 64×64, corners α=0, center α=255, no magenta fringe | Pillow in `generate-iso-tiles.py --validate`; human visual review of mini-iso-demo |
| Manual | Game loads new tiles; pinos + castillo render on rotated plane | Boot `python http.server 8000`; open `http://localhost:8000` |
| Rollback | `git revert` + `mv _discarded/diamond-r2/*.png assets/tiles/stage*-*/` restores F2.5.1 | Documented in `proposal.md` §7 |

## Threat Matrix

**N/A** — design does not introduce new routing, shell command, subprocess, VCS/PR automation, executable-file classification, or process-integration boundaries. `generate-iso-tiles.py` reuses the existing `subprocess.run(POSTPROCESS_SCRIPT)` call from F2.5.1 (only `--size` flag changes). No new external execution paths.

## Migration / Rollout

No feature flag required. Pipeline is sequenced to allow per-tile commits so a mid-flight minimax transport failure does not lose previously-accepted tiles. The `_discarded/diamond-r2/` archive is the explicit rollback path: `mv` of 40 PNGs + manifest revert restores F2.5.1 state. Smoke-test gate (`pino_clear_grass_rojizo` first) blocks batch progression if the first regenerated tile fails the visual gate.

## Open Questions

- **Q1 (defaults to 45°)**: rotation angle — design picks `π/4` (Habbo-style square iso falso). User can request 30° later; one-line change in `world.js`.
- **Q2 (defaults to idle bobbing)**: mini-iso-demo camera — design picks idle bobbing only (no user-controlled camera in 480×270 canvas). User can extend later.
- **Q3 (defaults to no shadows)**: sprite shadows under demo sprites — design picks no shadow for simplicity. F2.5.1 visual screenshots confirm sprites read fine without shadows.

---

## Key Learnings

1. Container rotation (`_worldLayer.rotation = π/4`) keeps the PNG on disk top-down, enabling the gallery's CSS-only rotation toggle without re-rasterising.
2. NEAREST downsample 128→64 must run AFTER `postprocess_v4.py` because smoothing on chroma-keyed alpha produces magenta fringes; LANCZOS would re-blend the boundary.
3. Manifest invariant pivots from `active + discarded === 40` to `active === 40` because `_discarded[]` is now the unbounded audit trail (40 F2.5.1 diamonds + future regen cycles).
4. `Tile.anchor = (0.5, 0.5)` is symmetric for both diamond and square PNGs — `tilemap.js` requires no change despite the geometry pivot.
5. Per-tile commits during the minimax regeneration batch protect against transport failures: 39 accepted tiles survive if tile #40 transport-fails mid-flight.