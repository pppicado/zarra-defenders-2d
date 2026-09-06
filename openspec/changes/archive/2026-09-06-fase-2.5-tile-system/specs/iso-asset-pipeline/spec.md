# Delta for `iso-asset-pipeline`

## Purpose

Produce ~35 tile PNGs autonomously and wire them into the bootstrap loader. The pipeline MUST keep tile visuals coherent (Diablo-2 pixel-art, magenta chroma-key BG), naming predictable (`{stage}_{variant}.png`), and cold-start time under control.

## ADDED Requirements

### Requirement: ASSET-001 — Tile generation

The system MUST generate ~35 tile PNGs via the `minimax` MCP image generator in batch — 5 stages × 7 variants. Each tile MUST be a `128×64` px diamond (2:1 iso ratio) with a flat magenta background (#FF00FF) as chroma key. Per-stage variant palette MUST be:

| Stage | Required variants (8 each, terrain-faithful to Valle de Ayora) |
|---|---|
| 1 — Bosque | `pino_clear_grass_rojizo`, `pino_underbrush_dark`, `encina_redonda_sombra`, `suelo_arcilloso_rojizo`, `trocha_forestal_compactada`, `matorral_coscoja_romero`, `arroyo_barranco_edge`, `hojarasca_pino_seca` |
| 2 — Pueblo | `cal_blanca_pared`, `teja_arabe_roja`, `adoquin_calle_empedrada`, `asfalto_N330_circulado`, `acera_baldosa_hidraulica`, `sombra_calle_estrecha`, `balcon_hierro_forjado`, `porton_madera_pueblo` |
| 3 — Río | `agua_cristalina_verde_azul`, `cortado_vertical_karstico`, `roca_chorrera_humeda`, `sedimento_aluvial_rio`, `chopo_ribera_densa`, `canto_rodado_orilla`, `musgo_humedo_roca`, `ladera_matorral_seca` |
| 4 — Vertedero | `cement_pad_crack`, `gravel_dust_industrial`, `dirt_oily_contaminated`, `plastic_debris_mixed`, `container_lixiviado_stain`, `metal_scrap_rust`, `asphalt_cracked_heavy_truck`, `weeds_through_pavement` |
| 5 — Castillo | `peñon_basalto_volcanico`, `cal_castillo_blanca`, `torre_homenaje_reloj`, `mamposteria_antigua_ocre`, `patio_armas_adoquines`, `sendero_subida_peñon`, `pino_peñon_mediterraneo`, `aljibe_boveda_subterraneo` |

> Total: 40 tiles (5 stages × 8 variants). The variant names MUST encode terrain-faithful identity (flora, geology, man-made features) — NOT generic RPG vocabulary like `grass` or `dirt`. The pedagogical mission requires each tile to be visually recognisable as the real Valle de Ayora location it represents.

#### Scenario: 35 tiles generated

- GIVEN the asset generator script invoked once per stage
- WHEN it completes
- THEN 35 PNG files exist under `assets/tiles/stage{1-5}-*/` and each PNG is exactly `128×64` px

#### Scenario: Magenta background for chroma key

- GIVEN any generated tile PNG
- WHEN its corner pixels are sampled
- THEN pixels in the four corners are `#FF00FF` (so `postprocess_v4.py` can key them)

### Requirement: ASSET-002 — Post-processing

The system MUST invoke `tools/postprocess_v4.py` against every generated tile to replace the magenta background with a transparent alpha channel. After post-processing, the magenta MUST NOT remain anywhere in the tile body. Every processed tile MUST be visually validated via Playwright screenshot before commit; a tile that fails visual inspection MUST be regenerated.

#### Scenario: Transparent alpha after postprocess

- GIVEN a raw tile with magenta corners
- WHEN `postprocess_v4.py` runs against it
- THEN the output PNG has `alpha = 0` in the four corners and the diamond centre keeps full opacity

#### Scenario: Visual validation gate

- GIVEN a batch of 7 Bosque tiles
- WHEN the Playwright screenshot is captured
- THEN the human reviewer confirms each tile looks like an isometric ground patch with no magenta fringe

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