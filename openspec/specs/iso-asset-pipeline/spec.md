# Delta for `iso-asset-pipeline`

## Purpose

Produce 40 square 64×64 tile PNGs autonomously and wire them into the bootstrap loader. The pipeline MUST keep tile visuals coherent (Diablo-2 pixel-art, magenta chroma-key BG, NEAREST downsample — no smoothing), naming predictable (`{stage}_{variant}.png`), and cold-start time under control.

## ADDED Requirements

### Requirement: ASSET-001 — Tile generation (square 64×64 PNG)

The system MUST generate 40 tile PNGs via the `minimax` MCP image generator in batch — 5 stages × 8 variants. Each tile MUST be a `64×64` px SQUARE (1:1 aspect ratio) with a flat magenta background (#FF00FF) as chroma key. Per-stage variant palette MUST be:

| Stage | Required variants (8 each, terrain-faithful to Valle de Ayora) |
|---|---|
| 1 — Bosque | `pino_clear_grass_rojizo`, `pino_underbrush_dark`, `encina_redonda_sombra`, `suelo_arcilloso_rojizo`, `trocha_forestal_compactada`, `matorral_coscoja_romero`, `arroyo_barranco_edge`, `hojarasca_pino_seca` |
| 2 — Pueblo | `cal_blanca_pared`, `teja_arabe_roja`, `adoquin_calle_empedrada`, `asfalto_N330_circulado`, `acera_baldosa_hidraulica`, `sombra_calle_estrecha`, `balcon_hierro_forjado`, `porton_madera_pueblo` |
| 3 — Río | `agua_cristalina_verde_azul`, `cortado_vertical_karstico`, `roca_chorrera_humeda`, `sedimento_aluvial_rio`, `chopo_ribera_densa`, `canto_rodado_orilla`, `musgo_humedo_roca`, `ladera_matorral_seca` |
| 4 — Vertedero | `cement_pad_crack`, `gravel_dust_industrial`, `dirt_oily_contaminated`, `plastic_debris_mixed`, `container_lixiviado_stain`, `metal_scrap_rust`, `asphalt_cracked_heavy_truck`, `weeds_through_pavement` |
| 5 — Castillo | `peñon_basalto_volcanico`, `cal_castillo_blanca`, `torre_homenaje_reloj`, `mamposteria_antigua_ocre`, `patio_armas_adoquines`, `sendero_subida_peñon`, `pino_peñon_mediterraneo`, `aljibe_boveda_subterraneo` |

The prompt template MUST include the substring `"64×64 px square tile, top-down view, isometric pixel art, flat magenta #FF00FF background, Diablo 2 tile style, 16-bit pixel art, no anti-aliasing"` in every tile prompt. The prompt MUST NOT reference "diamond", "2:1 ratio", or "128×64".

> Total: 40 tiles (5 stages × 8 variants). The variant names MUST encode terrain-faithful identity (flora, geology, man-made features) — NOT generic RPG vocabulary like `grass` or `dirt`. The pedagogical mission requires each tile to be visually recognisable as the real Valle de Ayora location it represents.

(Previously: tiles were `128×64` px diamond (2:1 iso ratio); prompt referenced "diamond" and "2:1".)

#### Scenario: 40 tiles generated (square)

- GIVEN the asset generator script invoked once per stage with `--shape square`
- WHEN it completes
- THEN 40 PNG files exist under `assets/tiles/stage{1-5}-*/` and each PNG is exactly `64×64` px.

#### Scenario: Magenta background for chroma key (square)

- GIVEN any generated tile PNG
- WHEN its corner pixels are sampled
- THEN the four corners are `#FF00FF` so `postprocess_v4.py` can key them.

#### Scenario: Prompt template is square-aware

- GIVEN `tools/generate-iso-tiles.py` building a prompt for any variant
- WHEN the prompt string is captured
- THEN it contains "64×64 px square tile"
- AND does NOT contain "diamond", "2:1", or "128×64".

### Requirement: ASSET-002 — Post-processing (NEAREST downsample added)

The system MUST invoke `tools/postprocess_v4.py` against every generated tile to replace the magenta background with a transparent alpha channel. The caller MUST pass `--size 64` so the postprocess writes a 64×64 output. After `postprocess_v4.py` resolves, the pipeline MUST apply a final NEAREST downsample from 128×128 to 64×64 (ASSET-010) when the source is 128×128. After post-processing, the magenta MUST NOT remain anywhere in the tile body. Every processed tile MUST be visually validated via Playwright screenshot before commit; a tile that fails visual inspection MUST be regenerated.

(Previously: postprocess wrote 128×64 directly with no NEAREST step; the source from `minimax` was already 128×64.)

#### Scenario: Transparent alpha after postprocess (square)

- GIVEN a raw tile with magenta corners
- WHEN `postprocess_v4.py --size 64` runs against it AND the NEAREST downsample finishes
- THEN the output PNG has `alpha = 0` in the four corners and the square centre keeps full opacity

#### Scenario: Visual validation gate (square)

- GIVEN a batch of 8 Bosque tiles
- WHEN the Playwright screenshot is captured
- THEN the human reviewer confirms each tile looks like a top-down square ground patch with no magenta fringe AND no smoothing artefact (visible as blocky 2×2 NEAREST pixels).

### Requirement: ASSET-003 — Asset organisation

Processed tiles MUST live under `assets/tiles/stage{N}-{name}/{variant}.png` where `{N}` is the stage number and `{name}` is the stage short name in lowercase Spanish (`bosque`, `pueblo`, `rio`, `vertedero`, `castillo`). The variant filename MUST match `{stage_id}_{variant}.png` (e.g., `stage1_grass.png`) so the loader can derive a stable cache key.

#### Scenario: Folder structure matches convention

- GIVEN the asset layout after F2.5 lands
- WHEN `ls assets/tiles/` is run
- THEN exactly 5 sub-directories exist, one per stage, each with 7 PNGs

#### Scenario: Cache-key determinism

- GIVEN the file `assets/tiles/stage1-bosque/grass.png`
- WHEN the loader requests it via `PIXI.Assets.load(url)`
- THEN the cache key is `assets/tiles/stage1-bosque/grass.png` and re-requests return the same texture

### Requirement: ASSET-004 — Asset loading

The bootstrap phase MUST load all 35 tiles via `PIXI.Assets.load` with progress reporting (logged to console) and MUST complete before the first frame is rendered. The full tile set MUST load in under 3 seconds on broadband. If the F8 polish round adds a loading screen, F2.5 MAY just log progress to console.

#### Scenario: Bootstrap blocks first frame

- GIVEN the `bootstrap()` function awaits `loadTilemap()` before creating `IsoWorld`
- WHEN the user opens `index.html`
- THEN the canvas stays black until all 35 tiles resolve, after which the iso world appears in one frame

#### Scenario: Cold-start budget

- GIVEN a local `http.server` serving the project and broadband latency ≤ 100 ms
- WHEN the first paint occurs
- THEN elapsed time from `DOMContentLoaded` to first iso frame is ≤ 3 seconds, with console log of `% progress` at every 10% step

## ADDED Requirements (F2.5.1 — `fase-2-5-1-tile-regen-and-centering`)

### Requirement: ASSET-006 — Tile regeneration workflow

The system MUST provide a regeneration workflow for tiles that fail the terrain-fidelity check, using `aspect_ratio=1:1` (the closest accepted ratio to 2:1; 2:1 is REJECTED by minimax MCP) and the verbatim phrase `"flat magenta #FF00FF background"` in every prompt. The workflow MUST enforce a **smoke-test gate**: it SHALL regenerate the lowest-risk variant (`stage1-bosque/pino_underbrush_dark`) first and verify the result is a 2:1 diamond after Pillow crop (alpha = 0 at 4 corners, alpha = 255 at center pixel) before regenerating any of the other 6 flagged variants. Per-tile commits SHALL be used so a mid-flight transport failure does not lose previously-accepted tiles.

#### Scenario: Regenerate flagged variant successfully

- GIVEN a tile listed in `_discarded[]` with `discriminator: terrain-fidelity-fail`
- WHEN the regeneration workflow runs with `aspect_ratio=1:1` and the verbatim "flat magenta #FF00FF background" phrase
- THEN the regenerated PNG, after `tools/postprocess_v4.py`, MUST be 128×64 px with `alpha = 0` at the 4 corner pixels and `alpha = 255` at the center pixel.

#### Scenario: Smoke-test gate blocks premature batch

- GIVEN the smoke-test variant `stage1-bosque/pino_underbrush_dark`
- WHEN the regen output fails the diamond-shape assertion (any corner alpha ≠ 0 or center alpha ≠ 255)
- THEN the workflow MUST halt and surface the failure; no further tiles are regenerated until the smoke test passes.

### Requirement: ASSET-007 — Manifest totals invariant (`totals.active === 40`)

`assets/tiles/manifest.json` MUST maintain the invariant `totals.active === 40`. The `discarded[]` array is the unbounded audit trail — it records every variant that was ever archived, including the 40 F2.5.1 diamond tiles now moved to `_discarded/diamond-r2/`. The invariant MUST NOT sum `active + discarded`; the `discarded[]` count MAY exceed 40 and MUST NOT cause manifest validation to fail. When a tile is regenerated and accepted, the previous active entry MUST move to `discarded[]` with `regeneratedFrom.regeneratedAt` (ISO 8601 timestamp) and `regeneratedFrom.reason`. The newly-accepted entry MUST be added to `active[]` with `regeneratedFrom.previousVariantId` pointing to the discarded entry.

(Previously: invariant was `totals.active + totals.discarded === 40`; `discarded[]` was treated as a finite set summing to 40.)

#### Scenario: Regenerated tile tracked with provenance

- GIVEN a tile is regenerated and accepted
- WHEN the manifest is written
- THEN the discarded entry MUST carry `regeneratedFrom.regeneratedAt` set to the regeneration timestamp
- AND the new active entry MUST carry `regeneratedFrom.previousVariantId` equal to the discarded entry's id
- AND the invariant `totals.active === 40` MUST hold (regardless of how many entries `discarded[]` contains).

#### Scenario: 40 archived diamonds do not break the invariant

- GIVEN the 40 F2.5.1 diamond tiles are moved to `_discarded/diamond-r2/` and listed in `discarded[]`
- WHEN the manifest is validated
- THEN `totals.active === 40` (still exactly 40 active)
- AND `discarded.length === 40` (the 40 archived diamonds)
- AND validation passes even though `active + discarded === 80`, NOT 40.

### Requirement: ASSET-008 — Tile gallery reads manifest at runtime

`tests/tile-gallery.html` MUST read `assets/tiles/manifest.json` at runtime (no hardcoded tile paths or counts) and render:
- An **Accepted** section containing every entry from `active[]` (40 tiles; orange border on regenerated tiles).
- A **Discarded** section containing every entry from `discarded[]` (initial state: 0; grows as regen fails).
- 0 `console.error` and 0 `console.warn` events when loaded in Playwright headless.

#### Scenario: Gallery renders accepted and discarded

- GIVEN `tests/tile-gallery.html` is loaded
- WHEN the page fetches `manifest.json`
- THEN every entry from `active[]` MUST render in the Accepted grid
- AND every entry from `discarded[]` MUST render in the Discarded grid
- AND tiles with `regeneratedFrom.regeneratedAt` MUST display an orange border.

#### Scenario: Gallery handles empty discarded list

- GIVEN `discarded[]` is empty (no regeneration attempts have failed)
- WHEN the page renders
- THEN the Discarded section MUST show a "No discarded tiles" placeholder
- AND MUST NOT raise a `console.error` or `console.warn`.

## ADDED Requirements (F2.5.2 — `fase-2.5.2-square-iso-rotation`)

### Requirement: ASSET-009 — Square tile regeneration workflow

The system MUST provide a regeneration workflow for tiles that fail the terrain-fidelity check, using `aspect_ratio="1:1"` for 64×64 squares. The workflow MUST enforce a **smoke-test gate**: it SHALL regenerate `stage1-bosque/pino_clear_grass_rojizo` first (no negative prompt, baseline terrain, lowest-risk variant) and verify the result is a 64×64 square after Pillow crop (alpha = 0 at 4 corners, alpha = 255 at center pixel) before regenerating any of the other 39 variants. `tools/generate-iso-tiles.py` MUST accept a `--shape {diamond|square}` flag with `square` as the F2.5.2 default. Per-tile commits SHALL be used so a mid-flight transport failure does not lose previously-accepted tiles.

(Previously: smoke-test variant was `stage1-bosque/pino_underbrush_dark`; regeneration was diamond-only.)

#### Scenario: Regenerate flagged variant successfully (square)

- GIVEN a tile listed in `_discarded[]` with `discriminator: terrain-fidelity-fail`
- WHEN the regeneration workflow runs with `aspect_ratio="1:1"` and the verbatim "flat magenta #FF00FF background" phrase
- THEN the regenerated PNG, after `tools/postprocess_v4.py` and the NEAREST downsample (ASSET-010), MUST be `64×64` px with `alpha = 0` at the 4 corner pixels and `alpha = 255` at the center pixel.

#### Scenario: Smoke-test gate blocks premature batch

- GIVEN the smoke-test variant `stage1-bosque/pino_clear_grass_rojizo`
- WHEN the regen output fails the square-shape assertion (any corner alpha ≠ 0 or center alpha ≠ 255)
- THEN the workflow MUST halt and surface the failure; no further tiles are regenerated until the smoke test passes.

#### Scenario: --shape flag selects shape

- GIVEN `tools/generate-iso-tiles.py` invoked with `--shape square`
- WHEN the prompt template is built
- THEN the prompt MUST include the substring "64×64 px square tile"
- AND MUST NOT include any substring referencing "diamond", "128×64", or "2:1 ratio".

### Requirement: ASSET-010 — NEAREST downsample for pixel-art preservation

When a square tile arrives from `minimax` as a `128×128` source, the postprocess pipeline MUST apply a final NEAREST (nearest-neighbour) downsample from `128×128` to `64×64` after `tools/postprocess_v4.py` runs. The downsample MUST be the last step before the PNG is written to `assets/tiles/stage{N}-{name}/`. The system MUST NOT use LANCZOS, BICUBIC, or any smoothing filter for this resample — LANCZOS softens 16-bit pixel art and breaks the Diablo-2 look.

#### Scenario: 128×128 source becomes 64×64 with NEAREST

- GIVEN a raw `128×128` PNG exiting `tools/postprocess_v4.py`
- WHEN `generate-iso-tiles.py run_postprocess` finishes its NEAREST downsample step
- THEN the written PNG is `64×64` px, every original pixel maps to a 2×2 block of identical pixels, and no chroma fringe or smoothing artefact appears at the block boundaries.

#### Scenario: NEAREST filter rejects LANCZOS fallback

- GIVEN a `128×128` tile
- WHEN the postprocess resample runs
- THEN the call uses Pillow `Image.Resampling.NEAREST`
- AND does NOT use `LANCZOS`, `BICUBIC`, `BILINEAR`, `BOX`, or `HAMMING`.

## MODIFIED Requirements

None.

## REMOVED Requirements

None.

## RENAMED Requirements

None.

### Requirement: ASSET-005 — Terrain fidelity from NOTES.md references

Every tile variant MUST be derived from the real-world terrain documented in `assets/references/stage{N}-{name}/NOTES.md`. The `minimax` generation prompt for each tile MUST include, at minimum:

- The stage's real location (e.g., "Valle de Ayora, Cofrentes", "Hoces del Cabriel", "Cerro de Agras").
- The stage's distinctive terrain features from `NOTES.md` (flora species, soil color, geology, man-made elements).
- Reference to any photographic assets present in the reference folder (e.g., `stage5-castillo/castillo_vista_carretera.jpg`).

A tile that is generated without consulting `NOTES.md` first, or that does NOT visually reflect the documented terrain, MUST be regenerated. Stage 4 (Vertedero) carries an additional constraint from `NOTES.md`: the visual MUST feel oppressive and dirty — it MUST NOT glorify the dump.

#### Scenario: Prompt template includes NOTES.md content

- GIVEN the generator script for stage `stage4-vertedero`
- WHEN it builds the prompt for variant `cement_pad_crack`
- THEN the prompt string contains the substring "vertedero de Zarra", references the documented color palette "gris-marrón opresivo", and includes the keyword "sin verde ni azul" to enforce the no-nature palette

#### Scenario: Variant name encodes terrain identity

- GIVEN any of the 40 tile filenames
- WHEN reviewed against `assets/references/stage{N}-{name}/NOTES.md`
- THEN the filename's snake_case tokens MUST be traceable to a flora, geology, or man-made feature documented in the NOTES.md of that stage (e.g., `cortado_vertical_karstico` traces to "hoces/cañones fluviales" + "cortados verticales" in stage3-rio NOTES.md)

#### Scenario: Stage 4 anti-glorification gate

- GIVEN the 8 tiles for `stage4-vertedero`
- WHEN reviewed by the user
- THEN the visual review confirms each tile looks dirty/industrial (NOT lush, NOT inviting, NOT aesthetically pleasing in a conventional sense)