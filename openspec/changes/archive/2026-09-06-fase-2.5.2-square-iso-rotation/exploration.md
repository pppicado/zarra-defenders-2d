# Exploration — F2.5.2 Square Iso (rotated) + Better Gallery

> **Status**: ready for `sdd-propose`.
> **Date**: 2026-09-06
> **Change**: `fase-2.5.2-square-iso-rotation`
> **Project**: `zarra-defenders-2d`
> **Scope**: read-only investigation. No source code or assets modified.
> **Tag base**: F2.5.1 archived at `openspec/changes/archive/2026-09-06-fase-2-5-1-tile-regen-and-centering/`.

---

## 1. Why

The user reviewed F2.5's diamond (2:1) tile batch and decided the visual is the wrong direction:

> "Bamos a descartar los tiles con forma de rombo que hemos hecho. Bamos a cambiar el motor para usar tiles cuadrados y bamos a generar otra ver todos los tiles pero esta vez cuadrados y actualizar el nivel de prueva para que podamos ver mejor los resultados, currate mas el nivel de prueba."

Three concrete consequences:

1. **Discard the 40 diamond PNGs** (5 stages × 8 variants) in `assets/tiles/stage{1-5}-*/` — do NOT delete, move to a sibling `_discarded/` folder for audit.
2. **Switch the tile engine from 2:1 diamond to "square iso falso"** — top-down square texture, rotated 45° on screen to keep the iso feel (Habbo / FarmVille-style). Tile size shrinks from 128×64 to **64×64 PNG** (1:1).
3. **Curate the gallery/test level** so the visual is actually usable for review: add a "rotated-iso vs top-down" toggle and surface the **vertical sprites** (3 pinos + 1 castillo loaded from `assets/sprites/` into `IsoWorld.spriteLayer`) that the user said they "cannot see" today.

The 5 stages and 40 variant names stay identical (F2.5.1's `tools/variants.json` is reused verbatim). Only the visual shape + gallery UX change.

## 2. What (technical approach)

### 2.1 Engine changes — small and local

The math module already accepts `tileSize` as a parameter. Adapting to "square iso rotated 45°" is a 2-line formula change + a `Math.PI/4` rotation applied at render time. No touched files in the locked set (`main.js`, `rail-camera.js`, `input.js`, `player.js`, `styles/main.css`, `index.html`).

**`src/iso/iso-math.js`** — replace `hh = tileSize/4` with `hh = tileSize/2`. Both `isoToScreen` and `screenToIso` derive `hh` from a single expression, so the inverse still holds (same constant; inverse uses division by `hh`, so it stays correct). `getTileHalf()` returns `{ tileHalfWidth: tileSize/2, tileHalfHeight: tileSize/2 }` — used by `computeCullRange` to inflate the cull window correctly (now square, so `hh==hw`).

```js
// before (diamond 2:1)
const hw = tileSize / 2
const hh = tileSize / 4
// after (square iso rotated 45° at render time)
const hw = tileSize / 2
const hh = tileSize / 2
```

**`src/iso/tilemap.js`** — no logic change to `Tile` / `Tilemap`. The `Tile` sprite's anchor stays `(0.5, 0.5)` (already correct for square texture rotated about its center). The 45° rotation is applied on the **texture** itself before the sprite is created, by rotating a wrapper container or by setting `tile.rotation = Math.PI/4`. A `PIXI.Container` per stage that holds `rotation = Math.PI/4` and contains the unrotated square sprites is the cleanest option — it keeps the per-tile `zIndex` math stable (because the container's children z-sort in screen-iso space, not in texture-local space). Alternative: rotate the texture at `PIXI.Texture` cache level (so `tilemap.js` is unaware). See Open Question §5.A.

**`src/iso/world.js`** — zero changes. `_viewOrigin`, `tileWorldOrigin`, `container.position.set(viewOrigin - camScreen)`, `computeCullRange`, `verticalSprites` positioning — all stay identical because `isoToScreen` is the only thing that needed to change and it was called everywhere it was needed.

**`src/main.js`** — already references `Tilemap('stage1-bosque', ...)` and the manifest-driven URL pattern; no edits needed. The texture resolver in `loadSprites` does NOT need to know about tiles. The bootstrap will pick up the new PNGs the next time the user reloads.

**Locked files (per `openspec/config.yaml` `rules.apply`):** `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css` are NOT touched. Verified by grep: `tileSize|isoMath|tileHalfWidth|tileHalfHeight` only appears in `src/iso/*`.

### 2.2 Asset regeneration — re-use F2.5.1 pipeline, drop the crop

**`tools/generate-iso-tiles.py`** — extend (do NOT duplicate). Replace the prompt template's diamond clause with the square-iso clause, drop the 128×128 intermediate + 128×64 crop step in `run_postprocess`, change `TILE_W, TILE_H = 128, 64` to `TILE_W, TILE_H = 64, 64`, and update the validation `img.size != (TILE_W, TILE_H)` gate.

**Prompt template** (one-line diff):
```
- "Isometric pixel art ground tile, 128x64 px diamond (2:1 ratio), flat magenta #FF00FF background, ..."
+ "Top-down pixel art ground tile, 64x64 px square (1:1), flat magenta #FF00FF background,
+  Diablo 2 ground tile style, 16-bit pixel art, no anti-aliasing, no characters, ..."
```

(`aspect_ratio = "1:1"` for minimax — same as the F2.5.1 smoke-test that was already proven to work.)

**`tools/postprocess_v4.py`** — unchanged. It already outputs a square (resized to `--size`, currently 128). We'll pass `--size 64` instead so the postprocessed PNG is already 64×64. The 128×128 → 64×64 LANCZOS resample sharpens without aliasing because the input is 128×128.

**Discard flow** — run `tools/generate-iso-tiles.py --regenerate --stage {1-5} --variants <all 8> --reason "F2.5.2 pivot: diamond 2:1 → square 64x64 (Habbo-style rotation)"` for each of the 5 stages (or once per stage). The script's existing `mark_regenerate()` already:
- moves the entry from `active[]` → `discarded[]` with `archivedPath` under `assets/tiles/_discarded/`,
- deletes the processed PNG,
- preserves `discardedAt` / `discardReason` / `archivedPath` provenance.

The 40 archived entries carry `archivedPath = assets/tiles/_discarded/{stage_num}_{variant}_discarded.png` — keeps the user's "discard, NOT delete" instruction honored.

**Manifest reconciliation** — after re-postprocess the script's `mark_regenerated()` promotes them back to `active[]` with `regeneratedFrom.previousVariantId` pointing to the discarded entry. The resulting manifest has **40 active + 40 discarded**, and the **ASSET-007 invariant `active + discarded === 40` is broken** by design here — see Open Question §5.B. The existing F2.5.1 manifest invariant was written assuming the discarded set is small. For F2.5.2 the invariant must become `active === 40` (the "expected" total of tiles we'll have) and `discarded` is the audit trail (can be anything). We accept that as the new shape.

**`assets/tiles/_discarded/`** — already exists with `_regen_attempt_1`, `_regen_attempt_2`, `raw/`. The 40 F2.5.1 diamond PNGs are already gone from the stage folders; only their manifest entries reference `archivedPath`. We need to **move the 40 .png files from `stage{1-5}-*/<variant>.png` to `assets/tiles/_discarded/diamond-r2/`** (or the manifest's existing `_discarded` folder) before regenerating, so we don't lose the audit PNGs. The script's `--regenerate` already deletes processed PNGs in place — we need a new flag (or a small shell step) that **moves** instead of deletes, or we run a one-off `mv assets/tiles/stage{1-5}-*/*.png assets/tiles/_discarded/diamond-r2/` BEFORE the regenerate. The latter is simpler; recommended for F2.5.2.

### 2.3 Gallery improvements (`tests/tile-gallery.html`)

The user explicitly asked: *"currate mas el nivel de prueba"*. The current 107-line manifest-driven gallery is OK but limited — accepted grid is fine, discarded section is text-only, **no sprites**, **no iso-vs-top-down toggle**. Plan:

1. **Keep the accepted/discarded grid logic as-is** (manifest-driven; works for both diamond and square PNGs).
2. **Add a top toolbar** with two toggles (radio buttons styled as a segmented control):
   - **"Vista isométrica 45°"** (default): each accepted `<img>` wrapped in a 64×64 wrapper `<div>` whose CSS `transform: rotate(45deg)` rotates the tile. Background: checkerboard. This proves the rotation visually.
   - **"Vista top-down"**: tiles shown unrotated (the raw 64×64 PNG as generated).
3. **Add a Sprites section** with the 21 existing `assets/sprites/*` PNGs grouped by category (reusing `tools/make_gallery.py`'s `CATEGORIES` + `LABELS` constants — they're already correct, just need the file to point at `assets/sprites/` instead of `/tmp/opencode/zarra-2d-sprites/sprites/`). The gallery already shows tiles from the manifest; the sprite section renders the 21 PNGs directly.
4. **Add a mini-iso-demo section** at the bottom: a single 480×270 canvas with `PIXI.Application` that instantiates `IsoWorld` with the active stage and renders 1 pinos + 1 castillo via `IsoWorld.spriteLayer` over a 6×6 tile plane. Lets the user see the rotated square tiles + sprites in actual iso context (which is what was missing).
5. The discarded section currently uses `opacity: 0.55`. Keep, but add a `<details>` collapse so it doesn't dominate the page (currently 40 discarded tiles would crush the layout).

File budget: `tests/tile-gallery.html` grows from ~107 LOC to ~250 LOC. Inline JS only — no new dependency.

### 2.4 Sprite visibility fix (related, small)

The user's complaint was *"no veo los sprites"* in the gallery. The current gallery only shows tiles. Adding the sprite section (above) addresses that for the gallery. For `src/main.js` playback, the 4 demo sprites (3 pinos + 1 castillo) are loaded via `loadSprites(...)` and mounted on `isoWorld.spriteLayer` — they should already render in the demo, but the user implied they're not visible. Likely cause: with the diamond tile texture (which only filled the central 128×64 area after the magenta chroma-key flood fill), the ground plane was visually noisy and small sprites got lost against it. With **square 64×64 tiles rotated 45°** filling more visual area, plus the **gallery's mini-iso-demo**, the sprites become self-evidently visible. We don't need to change `main.js` or the sprite load path; the pivot solves it implicitly.

## 3. Tradeoffs considered

### 3.A Where to apply the 45° rotation

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **A.1 Rotate the PIXI container per stage** (`tileLayer.rotation = Math.PI/4`) | One-line change; all child sprites inherit; zIndex math unchanged; `isoToScreen` keeps working in iso-space | The container's bounding box rotates too, which can affect Pixi culling (`cullArea`) if enabled; not an issue today (no `cullArea` set) | **Low** — 1 line |
| **A.2 Rotate the texture at PIXI.Texture cache level** (`new PIXI.Texture(baseTex, ...).rotate(8)`) | No container gymnastics; each tile is a self-contained rotated sprite | Pre-rotation breaks the diamond-vs-square comparison in the gallery (we need unrotated top-down view too); harder to debug visually | Medium — needs a helper, breaks the "top-down" toggle in the gallery |
| **A.3 Pre-rotate the PNG itself** (paint.rotate() in `postprocess_v4.py`) | PNG on disk matches what the engine renders | Discards the user's ability to compare top-down vs rotated in the gallery (the original unrotated PNG is lost); needs the gallery to re-rotate at CSS layer anyway for the toggle | Medium — pipeline change, gallery CSS already needed |

**Recommendation: A.1** — container rotation. Keeps the PNG on disk as a top-down square (great for the gallery "Vista top-down" view), keeps the engine change to one line, keeps the zIndex math stable. Pixi v7.4.0 supports container rotation natively; verified by reading the existing `_tileLayer = new PIXI.Container()` usage in `world.js`.

### 3.B Discard vs delete for the 40 PNGs

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **B.1 Move to `assets/tiles/_discarded/diamond-r2/`** + manifest tracks them | Audit trail preserved; can diff vs new square batch later; user's "discard, NOT delete" instruction honored | Disk cost: 40 × ~30KB = ~1.2MB; `_discarded/` folder grows | **Low** — one `mv` per stage |
| **B.2 Delete the PNGs, keep only the manifest `discarded[]` entries** | Clean folder; less disk | No PNG to compare to; if user wants to roll back to F2.5.1, must regenerate from scratch | Medium — needs a `--regenerate` flag that moves instead of deletes, OR manual pre-move |

**Recommendation: B.1** — explicit move. The user was explicit: "descartar", not "borrar". Adds a tiny shell step in apply.

### 3.C Pipeline: extend `generate-iso-tiles.py` vs new `generate-square-tiles.py`

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **C.1 Extend in place** with a `--shape {diamond|square}` flag (default `square` for F2.5.2, retain `diamond` as legacy fallback) | One script, one CLI surface; manifest schema unchanged | The crop-to-64-row-diamond path becomes dead code; needs `if shape=='diamond': crop(...)` branch in `run_postprocess` | Medium — ~30 LOC of branching |
| **C.2 Rename and rewrite**: keep `generate-iso-tiles.py` as the F2.5.1 diamond script (frozen), create `generate-square-tiles.py` for F2.5.2 square | Diamond path is fully preserved in git history; square script is single-purpose | Two scripts to maintain; future contributors may not know which to use; `variants.json` reader + manifest writer are duplicated | Medium — ~150 LOC new |
| **C.3 Generalize `generate-iso-tiles.py`**: prompt template parameterizes shape, postprocess branches on `--shape` | Cleanest long-term; one script, multiple shapes | Larger refactor; F2.5.1 archive's design said "diamond 2:1" so generalizing retroactively feels like scope creep | Medium-High |

**Recommendation: C.1** — single script with a `--shape` flag, default to the F2.5.2 square. Backwards-compatible (F2.5.1 calls `--shape diamond` if anyone needs to regenerate the old batch, but nobody will). Minimizes new code; keeps one CLI for ops.

### 3.D Manifest `totals` invariant

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **D.1 Change the invariant** to `totals.active === 40` (discarded is unbounded audit trail) | Honest about the new reality; no fake "expected" number | BREAKING change to ASSET-007 (F2.5.1 spec); need to MODIFIED the spec requirement | Low |
| **D.2 Keep `active + discarded === 40`**, accept that the new square batch will land in `active[]` and the old diamond batch stays in `discarded[]`, totalling 80 entries | Spec invariant unbroken; audit trail of "before F2.5.2 → after" is clean | The 40 active square tiles + 40 discarded diamond tiles = 80 total entries — `totals.expected` would need to be 80, which contradicts the "40 expected" meaning | Low |
| **D.3 New schema version** `tile-manifest/v2` with separate `totals.active = 40` and `totals.historicalDiscarded = 40` | Clean separation | Pipeline change; gallery has to handle v2 (forward-compatible JSON load is trivial though) | Medium |

**Recommendation: D.1** — change the invariant semantically. The spec ASSET-007 was written assuming a small `discarded[]`. For F2.5.2 the **invariant becomes** `totals.active === 40`. The `discarded[]` array becomes the historical audit trail (may grow unbounded). The MODIFIED spec delta in F2.5.2's `iso-asset-pipeline/spec.md` makes this explicit. This is the cleanest semantic.

## 4. Affected areas

| File | Why |
|---|---|
| `src/iso/iso-math.js` | Change `hh = tileSize/4` → `hh = tileSize/2`; update `getTileHalf()` |
| `src/iso/world.js` | Set `_tileLayer.rotation = Math.PI/4` in constructor (1 line) |
| `src/iso/tilemap.js` | No logic change (anchor (0.5, 0.5) already correct for square texture) |
| `src/main.js` | Already passes `viewportWidth/Height` to `IsoWorld`; no edit needed UNLESS the smoke-test needs updating (it asserts `cullAndRender` works with `tileSize` — see Open Question §5.C) |
| `tools/generate-iso-tiles.py` | Add `--shape` flag (default `square`); update prompt template; drop the 128×128→64×64 crop branch; update `TILE_W,TILE_H = 64,64`; update `--validate` |
| `tools/postprocess_v4.py` | Caller passes `--size 64` instead of `--size 128`; no code change |
| `tools/variants.json` | Unchanged (40 variant notes are shape-agnostic) |
| `assets/tiles/stage{1-5}-*/<variant>.png` | All 40 replaced; old moved to `_discarded/diamond-r2/` |
| `assets/tiles/manifest.json` | 40 active swap (with `regeneratedFrom.previousVariantId` → old discarded entries); 40 discarded entries created |
| `assets/tiles/_discarded/` | New subfolder `diamond-r2/` with 40 PNGs |
| `tests/tile-gallery.html` | Add rotation toggle, sprites section, mini-iso-demo |
| `tests/iso-smoke.html` + `tests/iso-smoke.js` | Update mock canvas from 128×64 to 64×64; verify `isoToScreen(0,0)` and round-trip still pass with `hh == hw` |
| `openspec/specs/iso-tile-system/spec.md` | MODIFIED TILE-001 (formula), TILE-002 (asset dimensions 64×64), MODIFIED TILE-003 (rotation) |
| `openspec/specs/iso-asset-pipeline/spec.md` | MODIFIED ASSET-001 (64×64 + 1:1), MODIFIED ASSET-002 (no diamond crop), MODIFIED ASSET-007 (invariant) |

**No edits to** `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css`. Verified by grep for `tileSize|isoMath|tileHalfWidth|tileHalfHeight`: zero hits in those files.

## 5. Open questions

### 5.A Container rotation vs texture rotation (re-asked for the apply phase)

The container approach (A.1) is recommended but has one edge case: when Pixi computes a `Container`'s `getLocalBounds()`, the children are measured AFTER the rotation is applied. If we ever enable `cullArea` on `_tileLayer` for optimization (F8 polish), the cull area would also rotate. For F2.5.2 we don't enable `cullArea` (F2.5.1 didn't), so this is moot today. **Apply phase should confirm `cullArea` stays undefined.**

### 5.B Manifest invariant (resolved in §3.D)

The spec ASSET-007 says `totals.active + totals.discarded === 40`. For F2.5.2 the new invariant is `totals.active === 40`; `totals.discarded` is an unbounded audit counter. **This is a MODIFIED spec requirement, not a violation.** The orchestrator should explicitly tell `sdd-propose` that the MODIFIED spec delta is mandatory.

### 5.C iso-smoke.js test canvas dimensions

`tests/iso-smoke.js` line 29-30 creates a 128×64 magenta canvas per variant. With F2.5.2 the texture is 64×64. The mock resolver needs to update to `c.width = 64; c.height = 64`. The math assertions don't depend on the canvas size, but the `makeMockResolver` docstring says "128×64 magenta canvas per variant" — needs a comment update. The cull-cap assertion (`live <= 100`) still holds because the visible window logic is unchanged. The 8-variant load assertion (`tm.loadedVariants.length !== 8`) is shape-agnostic and stays.

### 5.D Smoke-test one tile first vs batch-regenerate

F2.5.1's ASSET-006 mandated a smoke-test gate: regenerate `pino_underbrush_dark` first, verify it passes `validate` (corners transparent + center opaque), then proceed with the other 39. For F2.5.2 we should do the same: smoke-test `stage1-bosque/pino_clear_grass_rojizo` first (the most-pure variant — no negative prompt, baseline terrain). If that one passes `validate` AND the rotated-container renders correctly in the gallery's iso demo, proceed with the other 39. **This is non-negotiable for minimax cost reasons — one failed batch burns 40 credits.**

### 5.E Vertical sprite section in gallery: 21 PNGs or only the 4 demo sprites?

The current demo only loads 4 of the 21 sprites (`trees_pino` ×3, `buildings_castillo_cofrentes` ×1). The user complaint was "no veo los sprites" — could mean either "I can't see the demo sprites in the playback" or "I don't see the full sprite catalog in the gallery". Reading the user's words in context of "currate mas el nivel de prueba", I read it as the catalog (gallery) — so recommend showing all 21 in the gallery's Sprites section, AND showing the 4 demo sprites in the mini-iso-demo. **Orchestrator should confirm with user if uncertain.**

### 5.F `tools/postprocess_v4.py` output size

Currently called with `--size 128`. For F2.5.2 we need `--size 64`. The resample from 128×128 raw → 64×64 is 50% LANCZOS, which can soften 16-bit pixel art. The F2.5.1 batch already does 128×128 → 128×64 (asymmetric crop), which preserves sharpness. For F2.5.2 we'd be doing 128×128 → 64×64 (symmetric downscale). Alternative: change `postprocess_v4.py`'s `--size` default to 64 AND keep the resampling — OR add a `--size 128` flag to the call and downscale separately with NEAREST. **Recommendation: postprocess at 128×128 as today, then add a final NEAREST downscale to 64×64 in `generate-iso-tiles.py run_postprocess`** — preserves pixel-art sharpness. Apply phase should make this decision explicit.

### 5.G OpenSpec change folder naming

`openspec/changes/zarra-defenders-2d/fase-2.5.2-square-iso-rotation/` is the folder I propose. Follows the F2.5.1 pattern (`fase-2-5-1-tile-regen-and-centering`). Alternative: `pivot-square-iso`. The numeric version keeps the F2.5 lineage visible.

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| minimax generates 64×64 tiles where the magenta BG doesn't reach the corners (postprocess leaves magenta fringe that breaks the rotation illusion) | Medium | Medium | Smoke-test one tile first (§5.D); `validate` already checks 4 corners alpha=0 |
| Container rotation breaks `cullArea` or `getLocalBounds()` in future F8 polish | Low | Low | `cullArea` is not enabled today; document in design.md that the rotation must be undone before any future `cullArea` is set on `_tileLayer` |
| Existing 21 sprites (created for diamond iso) don't look right on a square-iso-45° plane | Medium | Medium | Sprites are vertical (anchored at their own bottom), not tile-bound; the pivot affects tiles only. Sprites' visual style was pixel art 3/4 perspective — should still read fine on the rotated plane. Verified by F2.5.1 visual screenshots already on disk |
| Manifest invariant change breaks the gallery's "expected count" assertion (if any) | Low | Low | Gallery currently doesn't assert; the JSON load is permissive (`Array.isArray(manifest.active) ? manifest.active : []`) |
| 40 discarded entries bloats `_discarded/` folder and the gallery's discarded section | Low | Low | Wrap discarded section in `<details>` collapsed by default; PNGs are ~30KB each = ~1.2MB total, acceptable |
| `tests/iso-smoke.js` test breaks (mock canvas dimensions wrong) | Low | Low | Update mock to 64×64 in the same commit as the iso-math change; trivial |
| `tools/postprocess_v4.py` LANCZOS 128→64 downsample softens pixel art | Medium | Medium | Use NEAREST downsample in `generate-iso-tiles.py run_postprocess` after postprocess (§5.F) |
| User wants a different rotation angle (e.g. 30° instead of 45°) | Low | Low | The rotation is one line; trivial to change. But 45° is what the user said ("rotación 45°" implied by "square iso falso estilo Habbo") |
| 8 variants per stage regenerated in parallel overwhelms minimax rate limits | Low | Medium | Generate serially, 5 stages × 8 variants = 40 calls; F2.5.1 already did this successfully |
| `_discarded/diamond-r2/` folder creation conflicts with existing `_regen_attempt_1/2` content | Low | Low | Use a NEW sibling folder `diamond-r2/`; existing folders stay as-is |

## 7. Recommendation

**Implement F2.5.2 as a focused 3-deliverable change:**

1. **Engine pivot** — `iso-math.js` `hh = tileSize/2`, `world.js` `_tileLayer.rotation = Math.PI/4`. ~3 LOC total. No touched locked files.
2. **Asset regeneration** — extend `generate-iso-tiles.py --shape square`, move 40 diamond PNGs to `_discarded/diamond-r2/`, regenerate 40 squares via minimax + postprocess (NEAREST downsample), reconcile manifest. Per-tile commits (per F2.5.1 convention).
3. **Gallery curation** — `tests/tile-gallery.html` gets: rotation toggle, sprites section (21 PNGs), mini-iso-demo canvas (Pixi + IsoWorld + 4 demo sprites on a 6×6 rotated plane). ~150 LOC growth.

**Smoke-test gate:** regenerate `stage1-bosque/pino_clear_grass_rojizo` first; verify corners transparent + center opaque + container rotation renders correctly in `tile-gallery.html` mini-iso-demo; only then proceed with the other 39.

**Module impact:** 2 src files (`iso-math.js`, `world.js`), 1 tool (`generate-iso-tiles.py`), 1 test (`tile-gallery.html`), 1 smoke-test (`iso-smoke.js`), 2 spec files (`iso-tile-system/spec.md`, `iso-asset-pipeline/spec.md`), 1 manifest (regenerated), 40 PNGs (regenerated), 40 PNGs (moved to `_discarded/diamond-r2/`).

**Total LOC budget:** ~250 LOC (engines + tools + gallery + specs). Well under the 3000-LOC review budget. **Single PR is feasible**; no chained PRs needed (recommendation for `delivery_strategy = single-pr`).

## 8. Ready for proposal

**Status**: ready.

`openspec/changes/zarra-defenders-2d/fase-2.5.2-square-iso-rotation/` will contain:
- `proposal.md` (pivot decision, scope, rollback plan)
- `design.md` (rotation strategy + manifest invariant)
- `specs/iso-tile-system/spec.md` (MODIFIED TILE-001/002/003)
- `specs/iso-asset-pipeline/spec.md` (MODIFIED ASSET-001/002/007)
- `tasks.md` (5-7 tasks: smoke-test, batch-regen, engine pivot, gallery overhaul, verify)
- `verify-report.md` (post-implementation)

The next phase (`sdd-propose`) should:
1. Resolve the 7 open questions in §5 (most are technical defaults; 5.E — "21 sprites vs 4 demo sprites" — is the only one the user might want to weigh in on).
2. Write `proposal.md` with: why (Habbo-style square iso vs diamond 2:1), scope (engine pivot + asset regen + gallery), affected files (above), rollback plan (revert to F2.5.1 archived tag + restore diamond PNGs from `_discarded/diamond-r2/`), risks from §6.

## 9. References

### Codebase files read
- `src/iso/iso-math.js` (84 lines) — current diamond formulas (will change `hh`)
- `src/iso/tilemap.js` (140 lines) — anchor (0.5, 0.5) already correct
- `src/iso/world.js` (123 lines) — `_viewOrigin` separation is preserved; rotation added at `_tileLayer`
- `src/main.js` (324 lines) — bootstrap needs no edit
- `src/rail-camera.js` (111 lines) — NOT touched
- `src/input.js` (181 lines) — NOT touched
- `src/player.js` (137 lines) — NOT touched
- `tests/tile-gallery.html` (107 lines) — needs toggle + sprites + mini-demo
- `tests/iso-smoke.html` (40 lines) — needs mock canvas size update
- `tests/iso-smoke.js` (103 lines, partial read) — needs mock canvas size + comment update
- `tools/generate-iso-tiles.py` (632 lines) — needs `--shape` flag + drop crop branch
- `tools/postprocess_v4.py` (228 lines) — unchanged (caller passes `--size 64`)
- `tools/make_gallery.py` (197 lines) — reference for Sprites section's category grouping
- `tools/variants.json` (74 lines) — unchanged
- `assets/tiles/manifest.json` (374 lines, fully read) — needs regenerate swap

### Specs / context read
- `openspec/config.yaml` — locked files list confirmed
- `openspec/specs/iso-tile-system/spec.md` (89 lines) — TILE-001..004 (will MODIFY 001/002/003)
- `openspec/specs/iso-asset-pipeline/spec.md` (173 lines) — ASSET-001..008 (will MODIFY 001/002/007)
- `openspec/specs/iso-camera-integration/spec.md` (95 lines) — NOT touched (no change to camera)
- `openspec/changes/archive/2026-09-06-fase-2.5-tile-system/explore.md` (287 lines) — F2.5 base context
- `openspec/changes/archive/2026-09-06-fase-2.5-tile-system/proposal.md` (142 lines) — F2.5 base decisions
- Memory #112 (project init context)

### CodeGraph
- Not initialized in this repo (no `.codegraph/`). Used direct file reads + grep. CodeGraph indexing would be useful for F4/F6 reuse, not necessary for F2.5.2 since the affected surface is < 5 files.

### Key Learnings

1. The `_viewOrigin` vs `tileWorldOrigin` separation in `world.js` is what makes this pivot trivial — only `isoToScreen`/`screenToIso` formulas change; the world container's anchor and camera math stay identical.
2. `getTileHalf()` in `iso-math.js` returns `{ tileHalfWidth, tileHalfHeight }` — both are now `tileSize/2` for square iso, which is the right shape for the `cullRange` viewport math.
3. The F2.5.1 manifest `totals.active + totals.discarded === 40` invariant must be MODIFIED to `totals.active === 40` for F2.5.2 because the discarded set becomes an unbounded audit trail.
4. The `tools/postprocess_v4.py` 128×128 → 64×64 LANCZOS resample softens pixel art; a NEAREST downsample in `generate-iso-tiles.py run_postprocess` after postprocess preserves sharpness.
5. Pixi v7.4.0 supports `Container.rotation` cleanly; `_tileLayer.rotation = Math.PI/4` is the recommended pivot strategy because it keeps the texture unrotated on disk (gallery "Vista top-down" toggle still works).
