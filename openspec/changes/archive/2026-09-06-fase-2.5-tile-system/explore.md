# Exploration — F2.5 Isometric Tile System

> **Status**: ready for `sdd-propose`.
> **Date**: 2026-09-05
> **Change**: `fase-2.5-tile-system`
> **Project**: `zarra-defenders-2d`
> **Scope**: read-only investigation of existing code + locked decisions + PLAN.md section 13.
> **No source code was modified.**

---

## 1. Current State

### 1.1 Runtime architecture (Phase 1+2, tag v0.1, commit `e110962`)

Single HTML entry point with Pixi.js v7.4.0 loaded from jsDelivr CDN. No bundler, no build step.
Four ES modules under `src/`:

| File | LOC | Responsibility | Touched in F2.5? |
|---|---|---|---|
| `src/main.js` | 284 | Bootstrap, world/hud/ui containers, sprite loader, camera wiring, game loop | **Partially** — must load tilemap + replace `bg` placeholder; keep container structure |
| `src/rail-camera.js` | 111 | Waypoint-based camera with `getCameraX/Y()`, linear interpolation, optional loop | **Likely unchanged** — same waypoint API; x/y semantics reinterpreted as iso coords |
| `src/input.js` | 181 | Unified pointer events (mouse + touch + pen), tap detection, ESC/P pause | **Unchanged** — input layer stays screen-space |
| `src/player.js` | 137 | Crosshair on `hud` layer (screen-space), tap logging | **Unchanged** — crosshair stays screen-space per locked decision #4 |

Container hierarchy (must be preserved):
```
app.stage
├── world       (camera-driven, contains iso tiles + vertical sprites)
├── hud         (screen-space, contains crosshair + hand+pen + projectiles)
└── ui          (modals, viewport coords)
```

Camera apply pattern: `world.x = -camera.getCameraX()` (one-axis parallax today; F2.5 needs **two-axis** iso scrolling).

### 1.2 Existing assets

- **21 sprites** in `assets/sprites/` — `{category}_{name}.png` convention, all 512×512, anchor `(0.5, 1.0)`, all chroma-keyed with `tools/postprocess_v4.py`.
  - `buildings_*`: casa_ayora, castillo_cofrentes, torre_central (3)
  - `enemies_*`: bidon_lixiviado, bolsa_plastico, camion_treco, dron_fumigador, incineradora, planta_treco, plataforma_solar, sello_burocratico, topadora, trailer, tubo_lixiviado, valla_publicitaria (12)
  - `props_*`: cartel, roca, valla (3)
  - `trees_*`: almendro, encina, pino (3)
- **5 stage reference notes** in `assets/references/stageN-*/NOTES.md` — Bosque, Pueblo, Río, Vertedero, Castillo. Only stage5 has a JPG reference photo.
- **Raw assets** in `assets/raw/` — sprites pre-chroma-key.
- **`assets/backgrounds/` exists but is empty** — designated home for tiles per PLAN.md.

### 1.3 Locked decisions (do NOT re-ask)

From memories #106, #107, #109 + session preflight (memory #112):

1. Rail shooter stays (no free movement); only the rendered world changes.
2. Tile size proportional to screen; existing sprites keep 512×512.
3. Map size depends on stage design.
4. Isometric Diablo-2 perspective + first-person view (hand+pen on screen bottom, crosshair on HUD).
5. Tiles generated autonomously with minimax MCP (no per-tile approval gate).
6. Each stage independent; "Novel" screen between stages (F7, out of F2.5 scope).
7. Enemies on separate tiles from terrain (JRPG/FF-Tactics style).
8. Pedagogy cards overlay world with pass-through input (F5, out of F2.5 scope).
9. Free-aim: click anywhere in iso world maps to world coord.

Plus pre-confirmed session preflight: artifact store = both, delivery = auto-chain, review budget = 3000 LOC.

### 1.4 Math already specified in PLAN.md section 13 (locked reference)

```
iso (x, y) → screen (sx, sy):
  sx = (x - y) * tileHalfWidth
  sy = (x + y) * tileHalfHeight

screen (sx, sy) → iso (x, y):
  x = (sx / tileHalfWidth + sy / tileHalfHeight) / 2
  y = (sy / tileHalfHeight - sx / tileHalfWidth) / 2
```

Where `tileHalfWidth = tileWidth / 2` and `tileHalfHeight = tileHeight / 2`.

**Z-order rule** (locked): depth = `x + y` in iso coords; render lower depth first (back-to-front painter's algorithm).

---

## 2. Affected Areas

### 2.1 Files that WILL be created (F2.5)

| File | Purpose |
|---|---|
| `src/tile.js` | `Tile` class — single iso tile sprite with (gx, gy) grid coords, screen-anchor point, optional terrain variant id |
| `src/tilemap.js` | `Tilemap` container — grid of tiles, Z-sorted render, culling by camera viewport |
| `src/world.js` | `IsoWorld` — owns tilemap + vertical sprite layer, applies camera transform, exposes `screenToIso()` / `isoToScreen()` |
| `src/sprite-iso.js` | (optional) helper that wraps a vertical sprite + its tile anchor point for clean Z-sort |
| `assets/tiles/stage1-bosque/*.png` | Tiles generated with minimax for Stage 1 (Bosque) — see Open Question §4.2 about scope |

### 2.2 Files that MUST stay unmodified (per `openspec/config.yaml` `rules.apply` and apply rule)

- `src/main.js` — only modifications inside `bootstrap()` that **add** tilemap load and replace the `bg` placeholder. Container creation order preserved.
- `src/rail-camera.js` — re-used as-is (waypoint API unchanged).
- `src/input.js` — fully out of scope.
- `src/player.js` — fully out of scope; crosshair stays on HUD.
- `styles/main.css` — out of scope.
- `index.html` — out of scope.

### 2.3 Files that MAY be touched (explicit scope decision needed)

- `src/main.js`'s `loadSprites()` — may need a sibling `loadTilemap()` that uses the same `PIXI.Assets.load` + NEAREST pattern.
- `src/main.js`'s game-loop `world.x = -camera.getCameraX()` — must become `world.position.set(-camX, -camY)` for two-axis iso scrolling.

### 2.4 Conventions to preserve (from `openspec/config.yaml` `stack.conventions`)

- Sprite anchor (0.5, 1.0) — center horizontal, base vertical (ground contact). **Works for iso** as long as iso plane origin is at `sprite.y` anchor point.
- Pixi `scaleMode = NEAREST` on `baseTexture` for pixel-perfect rendering.
- ES modules only; no bundler; no TypeScript.
- Asset naming `{category}_{name}.png`.
- Verification: Playwright headless screenshot + console-error capture, manual visual review.

---

## 3. Approaches (forks worth deciding in `sdd-propose`)

### 3.A Camera: reuse vs. new class

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **3.A.1 Reuse `RailCamera` as-is**, reinterpret `(x, y)` waypoints as iso coords | Zero new camera code; existing game loop stays; `getCameraX/Y()` already works for two-axis | Slightly misleading API (the class doesn't know it's iso); `getProgress()` becomes "iso path progress" not "screen X progress" | **Low** — 0 LOC |
| **3.A.2 New `RailIsoCamera` subclass / wrapper** with explicit `getIsoCameraX/Y()` | Clearer semantics; future-proof for 3D-style cameras | Duplicates interpolation logic; more files for no immediate win | Medium — ~60 LOC |
| **3.A.3 Parametric path** (distance along path → iso coord via lookup table) | Smooth easing per segment, catmull-rom curves, triggers at exact distances | Bigger refactor; breaks the current 2-waypoint demo | High — ~150 LOC |

**Recommendation:** **3.A.1** — re-use `RailCamera`. Its waypoint format is generic enough; the renderer decides how to interpret `getCameraX/Y()`. Rename `cameraX/Y` → `isoCamX/Y` if it bothers us. Add `RailIsoCamera` later if path ergonomics demand it.

### 3.B Tile rendering: individual sprites vs. baked background

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **3.B.1 One `PIXI.Sprite` per visible tile**, Z-sorted | Per-tile variations easy (grass, dirt, stone); matches Diablo 2 visual variety; cullable individually | Performance ceiling ~300-500 visible tiles on mid-range mobile | Medium — `Tilemap` container with `sortableChildren = true` and depth sort |
| **3.B.2 Pre-baked single PNG background** per stage (all tiles composited) | Fastest render; no sorting overhead | Inflexible (no per-tile variation after baking); regeneration needed for any change; doesn't scale to multiple stages | Low — but wrong long-term |
| **3.B.3 `PIXI.Mesh` with tile texture atlas** | Combines speed + flexibility | More complex; needs atlas generation; harder to debug | High |

**Recommendation:** **3.B.1** — start with individual sprites. With culling (only render tiles within `camIsoX ± camIsoY ± margin`), a typical visible window is **9×9 = 81 tiles max**. Pixi handles that trivially at 60fps even on low-end mobile. Optimize with `Mesh` later if profiling demands it.

### 3.C Click → iso: tile-snap vs. continuous world

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **3.C.1 Round to nearest tile** for hit detection | Cheap; matches JRPG feel | Feels "grid-locked"; doesn't match "free-aim" locked decision #9 | Low |
| **3.C.2 Continuous world coord** + raycast against sprite hitboxes | True free-aim; allows diagonal hits between tiles | Needs per-sprite hitbox (probably a footprint rectangle) | Medium |
| **3.C.3 Continuous world coord + Z-pick** (project click ray onto sprite bounds ordered by depth) | Best of both: smooth feel + correct depth ordering | Needs ray-vs-AABB implementation | Medium-High |

**Recommendation:** **3.C.3** — true free-aim with depth-correct picking. This is what makes "click on the back-most tree" feel right when overlapping sprites. Implementation cost is low: each sprite exposes a footprint AABB `{isoX, isoY, isoHalfWidth, isoHalfHeight}` and we test click against sprites in **reverse depth order** until a hit. The 9×9 visible window keeps the per-frame cost negligible.

### 3.D Sprite anchor: keep (0.5, 1.0) or per-sprite override?

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **3.D.1 Keep (0.5, 1.0)**, position sprite so its base sits on the iso floor point `(isoX, isoY)` | Matches the 21 existing sprites without re-export | Some sprites (e.g., dron hovering, far-away tree branches) may visually clip ground | **Zero** — convention unchanged |
| **3.D.2 Add per-sprite `footOffsetIso: {x, y}`** in sprite metadata | Allows trees with elevated canopies, floating drones | Requires metadata for every sprite; bigger asset schema | Medium |

**Recommendation:** **3.D.1 for F2.5**, **3.D.2 in F4** when Stage 1 enemies force the issue. For F2.5 we need only that the 21 existing sprites anchor correctly on a flat iso plane. Visual inspection of the sprite pack is needed during design phase.

### 3.E Path: where does the iso origin sit on screen?

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **3.E.1 Iso (0,0) at screen bottom-center** (anchored below HUD strip) | Standard "looking down a corridor" feel; matches Diablo 2 | Top half of screen may be empty until camera advances | Low |
| **3.E.2 Iso (0,0) at screen center** | Always-visible world; no empty top | Camera needs to look at "ahead" of path, not its own position | Medium |
| **3.E.3 Iso origin offset by `(screenH * 0.5, screenH * 0.7)`** (anchored below HUD, 70% down) | Best of both: world visible AND there's "horizon" space above | Magic number needs tuning | Low |

**Recommendation:** **3.E.3** with the magic number parameterized in a `HUD_RESERVED_HEIGHT_PX` constant. Default: `0.30 * screenHeight` reserved for HUD strip; iso plane sits on top of that.

---

## 4. Open Questions

These are the gaps that the 9 locked decisions + PLAN.md section 13 do NOT cover. The orchestrator should ask the user these in the propose phase (or pre-resolve with a sensible default).

### 4.1 Camera & path

- **Q1.** When the rail camera path is in iso coords, does it move along `(isoX, isoY)` waypoints freely (2D path), or do we keep it 1D (e.g., monotonically increasing along one axis with small lateral wobble)? The phrase *"avance diagonal o hacia adelante en lugar de lateral"* (PLAN.md L792) suggests 2D, but is the path **always** advancing "north" in iso space (so the world scrolls toward the viewer)?
  - **Default**: 2D path with monotonically increasing `x + y` (always advancing forward).
- **Q2.** Visibility culling margin: how many tiles outside the screen rect should we render to avoid pop-in when sprites stand on adjacent tiles? Diablo 2 used ~1 tile of overshoot.
  - **Default**: 1 tile of overshoot on each side.

### 4.2 Asset pipeline

- **Q3.** Where do new tiles live?
  - PLAN.md says `assets/backgrounds/tiles/`.
  - But `assets/backgrounds/` is currently empty and used for something different conceptually (full-scene backgrounds).
  - Proposed: create `assets/tiles/stageN-{name}/` (e.g., `assets/tiles/stage1-bosque/grass.png`). Naming inside: `{variant}.png` (e.g., `grass.png`, `dirt.png`, `stone.png`).
- **Q4.** Tile set scope for F2.5: just Stage 1 (Bosque), or all 5 stages up front?
  - PLAN.md lists "5 estilos: bosque, pueblo, río, vertedero, castillo".
  - For F2.5 (the **base tile system**, before F4 ships its playable stage), **only Stage 1 needs real tiles**. The other 4 can be 1-2 placeholder tiles generated later in F6.
  - Proposed: F2.5 generates **Stage 1 (Bosque) tile set** (~3-5 variants). F6 generates the other 4.
- **Q5.** Tile prompt format for minimax:
  - Output: 256×128 px PNG with magenta chroma key BG (matches `postprocess_v4.py` assumptions).
  - Visual: single isometric grass tile (diamond top-down view, slight 3/4 perspective).
  - Prompt seed: *"isometric grass tile, 256x128 px, pixel art, Diablo 2 style, 16-bit, magenta background for chroma key"*.
  - Variants: `grass`, `grass_dark`, `dirt`, `dirt_path`, `stone`.
  - **Confirm with user** whether 3 or 5 variants for Stage 1.
- **Q6.** Do tiles need the same chroma-key postprocess as sprites?
  - Yes if generated with magenta BG. `tools/postprocess_v4.py` is reusable.

### 4.3 Sprite integration

- **Q7.** Do the 21 existing sprites visually fit an iso floor with their current `(0.5, 1.0)` anchor? Or do some need re-anchoring (e.g., a tree's "base" is below the visible roots)?
  - Needs visual inspection in `sdd-design` phase. Not blocking for F2.5's tile system itself; blocking for F4 (Stage 1 enemies).
- **Q8.** For vertical sprites, do they stand on **the iso point** `(x, y)`, or on the **iso plane** under their bounding box? E.g., a tree's footprint is wider than 1 tile — do all tiles under the footprint get occluded by the tree sprite?
  - **Default**: footprint is 1 tile (the tile at `(x, y)`); sprite renders over it with Z = `x + y`. Adjacent tiles are not occluded by the sprite (Pixi draws tiles + sprites in the same Z-sorted container, so deeper tiles render first, and shallower sprites overlap them — this works correctly).

### 4.4 Free-aim & hit detection

- **Q9.** When the click ray hits an "occluded" sprite (a sprite behind a closer one in the same Z-tile), should the closer one always win?
  - **Default**: yes — depth-sorted picking (click hits the sprite with the highest depth that contains the click point).
- **Q10.** What is the per-sprite hitbox shape?
  - **Default**: rectangular footprint on the iso plane: `{isoX, isoY, isoHalfWidth, isoHalfHeight}`. For most sprites isoHalfWidth = isoHalfHeight = 1 (one tile). For "wide" sprites (e.g., `camion_treco`) it could be 2×1.

### 4.5 Performance budget

- **Q11.** Target tile count per visible frame on mid-range mobile?
  - **Default budget**: ≤ 100 tiles visible (≈ 10×10 grid + overshoot). ≤ 30 vertical sprites (enemies + decoration). Total ≤ 130 draw calls. Pixi v7 handles this at 60fps trivially.
- **Q12.** Sort strategy: dynamic `sortableChildren = true` vs. explicit `zIndex` per object?
  - **Default**: explicit `zIndex = (x + y) * 1000 + tileOffset` so we can interleave tiles and sprites without rebuilding the children array each frame. Tiles use even `zIndex`, sprites use odd `zIndex`.

### 4.6 Pedagogy & HUD layout

- **Q13.** The hand+pen overlay (HUD, F3) occupies the bottom ~20% of screen. The iso world extends to the bottom of screen too. Does the iso plane stop at the HUD boundary, or extend behind it (occluded)?
  - **Default**: iso plane extends edge-to-edge; HUD draws on top (locked layer order). This maximizes usable iso area.
- **Q14.** When the camera advances and a tile is at the bottom-center of the screen, the tile appears under the hand+pen. Is that acceptable or should we crop the iso plane to start above the HUD?
  - **Default**: acceptable for F2.5 (we don't have hand+pen sprite yet); revisit in F3.

### 4.7 Migration from F2 demo

- **Q15.** F2's `DEMO_SPRITES` (3 pinos + 1 castillo at fixed world coords) — drop them or migrate to iso coords?
  - **Default**: replace with an iso tilemap demo: a flat 10×10 grass plane + the 4 existing sprites placed at iso `(x, y)` corners. The demo now showcases the iso system instead of the lateral one.

---

## 5. Recommendation

**Implement F2.5 as a self-contained isometric tile system that:**

1. **Camera**: re-use `RailCamera` as-is (§3.A.1). Waypoints are `(isoX, isoY)` instead of screen coords.
2. **Tiles**: individual `PIXI.Sprite`s with `zIndex = (gx + gy) * 1000` (§3.B.1 + §3.12). Cull to a 11×11 window (~100 tiles max).
3. **Vertical sprites**: keep `(0.5, 1.0)` anchor, position so the anchor sits on the iso plane point `(isoX, isoY)`. Add `zIndex = (isoX + isoY) * 1000 + 1` to interleave with tiles.
4. **Click**: continuous screen → iso transform (§3.C.3), then test against sprites in reverse depth order for hit detection.
5. **Origin**: iso origin at `(screenW / 2, screenH * 0.70)` — reserves bottom 30% for HUD (§3.E.3).
6. **Stage 1 tile set**: 3 variants — `grass`, `grass_dark`, `dirt_path`. Generated autonomously with minimax + `postprocess_v4.py`.
7. **Demo replacement**: 10×10 grass plane + 4 existing sprites anchored at iso corners. Validates the system end-to-end and replaces the lateral demo from v0.1.

**Module additions:**
- `src/tile.js` (~50 LOC): `Tile` class with grid coords and screen transform.
- `src/tilemap.js` (~120 LOC): grid management, culling, Z-sort.
- `src/world.js` (~100 LOC): `IsoWorld` orchestrator + screenToIso/isoToScreen.

**No edits to:** `rail-camera.js`, `input.js`, `player.js`, `index.html`, `styles/main.css`.

**Minimal edits to:** `src/main.js` — replace `bg` placeholder with `IsoWorld`; switch `world.x` to `world.position.set(...)`.

---

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| minimax generates tiles that don't tile seamlessly | High | Generate in pairs (2×2 sampling) and pick best seam-free set; fallback to procedural noise tile if user rejects |
| minimax generates tiles with magenta BG that `postprocess_v4.py` mis-keys (because it expects specific palette) | Medium | Test postprocess on first batch; if purple-family detection eats legit pixels, fall back to plain chroma key (no flood-fill) |
| Existing sprites have anchor (0.5, 1.0) but the visible "ground line" doesn't match iso floor for some assets (e.g., trees with no visible roots, drones that should hover) | Medium | Defer per-sprite `footOffsetIso` to F4 when enemies land; F2.5 only needs flat-ground tiles and decoration |
| Performance on low-end mobile with full tile window | Low | Cap visible window to 11×11; only 81 tiles + ~30 sprites = trivial |
| Camera path with monotonic `x + y` advance feels too "straight" | Low | Locked decision #1 says rail shooter — straight diagonal is fine. Curves available via waypoints in F4+ |
| Z-sort with overlapping sprites shows flicker when `sortableChildren` reorders mid-frame | Low | Use explicit `zIndex` instead of `sortableChildren`; no reorder overhead |
| Free-aim click on far-away enemy through foreground occlusion picks the wrong target | Medium | Reverse-depth picking iterates sprites from highest `zIndex` to lowest; nearest non-occluded sprite wins. Iterates ≤ 30 sprites — cheap |
| Cached browsers keep loading the old `src/main.js` despite cache-bust | Low | Increment `?v=6` → `?v=7` in `index.html` during F2.5 apply phase |

---

## 7. Ready for Proposal

**Status:** Ready.

`openspec/changes/zarra-defenders-2d/fase-2.5-tile-system/` currently contains:
- `proposal.md` (placeholder)
- `design.md` (placeholder)
- `specs/` (empty)
- `tasks.md` (placeholder)

The next phase (`sdd-propose`) should:
1. Resolve the 14 open questions in §4 (mostly defaultable; Q4 and Q5 are the only ones needing explicit user confirmation).
2. Fill `proposal.md` with: why (Diablo-2 iso world replaces lateral v0.1 demo), scope (tile system + Stage 1 Bosque tiles + iso demo), affected files (new modules in §2.1 + minimal `main.js` edits in §2.3), rollback plan (revert to v0.1 tag + restore `bg` placeholder), risks from §6.

Then `sdd-design` writes the technical design, `sdd-spec` writes the delta specs under `specs/world/spec.md` + `specs/camera/spec.md`, `sdd-tasks` decomposes into ≤ 3000 LOC tasks.
