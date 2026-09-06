# Proposal: F2.5 — Tile System Isométrico

**Status**: ready for sdd-spec / sdd-design
**Change**: `fase-2.5-tile-system`
**Project**: `zarra-defenders-2d`
**Tag base**: `v0.1` (commit `d533567`)

---

## Why

The project shipped Fase 1+2 as a **lateral rail shooter** (tagged `v0.1`). Memory **#107** records the user's pivot decision: replace the lateral rendering with an **isometric Diablo-2-style** world — same rail-shooter mechanic, same first-person view (hand+pen, crosshair on HUD), but the rendered ground plane becomes a tiled iso map with vertical sprites standing on it. Memory **#109** confirms the final spec: rail shooter is preserved; only the WORLD changes.

The pivot creates a structural gap: there is **no tile system, no isometric coordinate transform, and no Z-ordering** in the codebase today. `src/main.js` boots with a flat-color `bg` placeholder + four `DEMO_SPRITES` laid out on a 2D world (`assets/sprites/trees_pino.png` ×3 + `assets/sprites/buildings_castillo_cofrentes.png` ×1). F2.5 closes that gap so Fase 3+ can layer disparo + hit-detection + hand+pen on top of a real iso plane without rework.

## What changes (delta from v0.1)

### New modules

| Module | Responsibility | LOC budget |
|---|---|---|
| `src/iso/iso-math.js` | `isoToScreen()` / `screenToIso()` per PLAN.md §13; tile size constants | ~50 |
| `src/iso/tilemap.js` | `Tile` class + `Tilemap` container (grid, culling, zIndex) | ~180 |
| `src/iso/world.js` | `IsoWorld` orchestrator (camera-driven world transform + sprite layer) | ~150 |

### New assets (~35 tiles, 5 stages × ~7 variants)

`assets/tiles/stage{1-5}-{name}/{variant}.png` — generated autonomously with **minimax MCP** + postprocessed with `tools/postprocess_v4.py` (reuse existing magenta-key pipeline).

| Stage | Variant scope |
|---|---|
| Stage 1 — Bosque | 6-8 tiles (grass / grass_dark / dirt_path / stone / leaf_litter / moss / fallen_log / water_edge) |
| Stage 2 — Pueblo | 6-8 tiles (cobblestone / cobble_dark / wood_plank / dirt / sand / wall_base / fountain / puddle) |
| Stage 3 — Río | 6-8 tiles (river_shallow / river_deep / bank_grass / reeds / mud / rock_wet / bridge / foam) |
| Stage 4 — Vertedero | 6-8 tiles (concrete / cracked_concrete / oil_stain / trash_pile / scrap_metal / hazard_strip / puddle_toxic / dirt_packed) |
| Stage 5 — Castillo | 6-8 tiles (stone_block / stone_worn / tile_floor / carpet / torch_holder / iron_grate / marble / stairs) |

User-confirmed scope (2026-09-05): **all 5 stages complete**, NOT Stage 1 only. Variants per stage: **6-8**, pick ~7 for Diablo-2 richness.

### Modified

- `src/main.js` — MINIMAL changes only (per `openspec/config.yaml` `rules.apply`):
  - Add `loadTilemap()` sibling to `loadSprites()` (same `PIXI.Assets.load` + `scaleMode = NEAREST` pattern).
  - Replace `bg` placeholder draw with `IsoWorld` instance on the `world` container.
  - Switch game-loop `world.x = -camera.getCameraX()` → `world.position.set(-camX, -camY)` for two-axis iso scrolling.
  - Replace `DEMO_SPRITES` placement with iso demo: 10×10 grass plane + 4 sprites anchored at iso corners.

## What does NOT change

| Area | Why |
|---|---|
| `src/rail-camera.js` | Reused as-is; only reinterprets `(x, y)` waypoints as iso coords (per locked decision #1 + 3.A.1) |
| `src/input.js` | Input layer stays screen-space; tap/drag detection unchanged |
| `src/player.js` | Crosshair stays on `hud` layer (screen-space); no edits |
| `index.html`, `styles/main.css` | Out of scope; cache-bust `?v=6` → `?v=7` only if browser cache becomes an issue |
| Crosshair behaviour | HUD layer; never moves with camera (commit d533567 fix preserved) |
| First-person view (hand+pen) | F3, not F2.5 |
| Pedagogy cards / "Novel" screens | F5 / F7 |
| Stages 2-5 gameplay | F4-F6 (F2.5 only ships their tiles) |
| Audio (music + SFX) | Separate plan, not part of SDD scope |

## Impact

| Area | Impact | Notes |
|---|---|---|
| `src/main.js` | Modified (minimal) | `bootstrap()` + game-loop only; container order preserved |
| `src/iso/*` | New | 3 modules, ~380 LOC |
| `assets/tiles/` | New | ~35 PNG files across 5 stage folders |
| `tools/postprocess_v4.py` | Unchanged but reused | chroma-key on minimax-generated tiles |
| `openspec/specs/` | New capability | `iso-tile-system`, `iso-camera-integration`, `iso-asset-pipeline` |

## Capabilities (contract with sdd-spec)

### New Capabilities

- **`iso-tile-system`**: isometric tile grid, Z-ordering via zIndex, culling by camera viewport; Tile + Tilemap classes
- **`iso-camera-integration`**: reinterpret RailCamera waypoints as iso coords; world.position transform; monotonic x+y advance
- **`iso-asset-pipeline`**: minimax MCP autonomous generation + postprocess_v4.py chroma-key; stage-folder convention; variant naming

### Modified Capabilities

- None. Existing camera/input/player specs are unchanged at the spec level.

## Approach

1. **Iso math first** (`iso-math.js`) — pure functions, locked formulas from PLAN.md §13. Zero dependencies; testable in isolation.
2. **Tile + Tilemap** (`tilemap.js`) — per-tile `PIXI.Sprite` with `zIndex = (gx + gy) * 1000`; culling window = visible viewport + 1 tile overshoot per side.
3. **IsoWorld orchestrator** (`world.js`) — owns the world container; applies `world.position.set(-camX, -camY)` each tick; exposes `screenToIso()` and `isoToScreen()`.
5. **5 stages × 7 variants** generated autonomously with minimax; postprocessed in batch with `tools/postprocess_v4.py`; staged into per-stage folders.
6. **DEMO migration** — `DEMO_SPRITES` (3 pinos + 1 castillo) re-anchored at iso `(x, y)` corners over a 10×10 grass plane; visual smoke test for iso correctness.
7. **Acceptance run** — Playwright headless screenshot + console-error capture; manual comparison against expected Diablo-2 look-and-feel.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| minimax-generated tiles don't tile seamlessly (visible seams) | High | Pair-generation (2×2 sampling); pick best seam-free set per variant; fallback to procedural noise tile if user rejects batch |
| `postprocess_v4.py` eats purple-family pixels in legitimate tile content | Medium | Visual inspection of first batch in Playwright; fallback to flat chroma-key (no flood-fill) if needed |
| 3000-LOC budget tight for 35 tiles + 3 modules + integration + Playwright tests | Medium | Pre-confirmed `delivery_strategy = auto-chain` → multiple chained PRs per `sdd-phase-common.md` §E (workload guard) |
| Existing sprites anchor incorrectly on iso floor (e.g., trees with no visible roots) | Low for F2.5 | Defer per-sprite `footOffsetIso` to F4 (when Stage 1 enemies land); F2.5 uses only flat-ground placement |
| Cached browsers load old `src/main.js` after edits | Low | Cache-bust `?v=6` → `?v=7` during apply phase |
| Z-sort flicker when `sortableChildren` reorders mid-frame | Low | Use explicit `zIndex` (no `sortableChildren`) per decision Q12 |

## Rollback plan

1. `git checkout v0.1` — return to the lateral rail shooter demo (commit `d533567`).
2. Delete branch / revert F2.5 commits.
3. If only F2.5 changes need reverting mid-flight: `git revert <commit-range>` keeps v0.1 tag intact.
4. Asset rollback: `git clean -fd assets/tiles/` removes any committed-but-untracked tiles.

## Dependencies

- minimax MCP for tile generation (already wired in this session per memory #109)
- `tools/postprocess_v4.py` (existing; reused, not modified)
- 21 existing sprites under `assets/sprites/` (reused; no regeneration)
- Python `http.server` for local dev (existing)
- Playwright for verification (existing)

## Success Criteria

- [ ] `IsoWorld` renders correctly with 5 stages × ~7 variants loaded from `assets/tiles/stage{1-5}-*/`
- [ ] Rail camera scrolls smoothly through isometric tiles; `world.position` updates each frame; no jitter
- [ ] Crosshair tracks mouse correctly in iso coords (visual verification via Playwright screenshot)
- [ ] Z-order correct: closer tiles occlude farther; sprites interleave with tiles at the right depth
- [ ] DEMO_SPRITES migrated: 3 pinos + 1 castillo anchored at iso corners over 10×10 grass plane
- [ ] Playwright: console-error = 0, console-warning = 0
- [ ] Visual screenshot matches Diablo-2 iso look-and-feel (manual review against `assets/references/zarra-v01-final.png` or equivalent)
- [ ] No modifications to `rail-camera.js`, `input.js`, `player.js`, `index.html`, `styles/main.css` (except optional cache-bust)

## Open questions for sdd-spec / sdd-design

These are NOT proposal blockers; they need resolution in the next phases:

1. **Tile atlas vs individual files**: load each tile as its own `PIXI.Sprite` (~35 small texture loads) OR atlas-pack per stage into one baseTexture? Affects first-load time and Pixi memory.
2. **minimax prompt template per variant**: exact prompt string for each of the 7 variants per stage (style seed, palette guidance, magenta-bg requirement, iso perspective hint).
3. **Sprite overlap depth tie-breaker**: when two sprites share the same `(gx + gy)`, which renders on top? Default: explicit `spriteOffset` parameter on the sprite anchor (e.g., `zIndex = (gx + gy) * 1000 + spriteOffset`); needs decision on offset value range and ordering convention.
4. **Camera waypoint authoring format**: are iso waypoints authored in JSON / YAML / inline array in `main.js`? Affects how F4+ stages plug in their own paths.
5. **Iso origin offset constant**: confirm `HUD_RESERVED_HEIGHT_PX = 0.30 * screenHeight` (3.E.3) is the right reserved-strip size — may need visual tuning once HUD (F3) lands.

## Next recommended phase

`sdd-spec` — write delta specs under `openspec/changes/zarra-defenders-2d/fase-2.5-tile-system/specs/{iso-tile-system,iso-camera-integration,iso-asset-pipeline}/spec.md` with Given/When/Then scenarios per `openspec/config.yaml` `rules.specs`. Then `sdd-design` for ADR-style architecture, then `sdd-tasks` to forecast the 3000-LOC budget.