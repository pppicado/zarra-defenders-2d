# Delta for `iso-asset-pipeline`

**Change**: fase-3-shooter-rail-gameplay
**Capability**: iso-asset-pipeline (MODIFIED — F3 catalog additions + dron_fumigador assignment + plataforma_solar deprecation + hand_pen generation)

## Purpose

Extend the asset catalog to cover the F3 test-fixture roster. Add `camion_cisterna_residuos` (placeholder, magenta-chroma, NOT AI-generated in this PR), add `hand_pen` (real asset generated via `minimax_text_to_image` in this PR), mark `plataforma_solar` as deprecated (PNG kept on disk for F4 audit trail), and bind `dron_fumigador` to the `tank` archetype.

## MODIFIED Requirements

### Requirement: ASSET-004 — Asset loading + F3 catalog

The bootstrap phase MUST load all tiles AND the F3 enemy roster via `PIXI.Assets.load` with progress reporting (logged to console) and MUST complete before the first frame is rendered. The full set (tiles + enemy sprites) MUST load in under 5 seconds on broadband. The `assets/sprites/manifest.json` SHALL declare:

| Sprite id | File | Status | Archetype | Notes |
|---|---|---|---|---|
| `camion_cisterna_residuos` | `assets/sprites/camion_cisterna_residuos.png` | placeholder | `tank` | 64×64 magenta-chroma `#FF00FF` PNG (NO AI generation in F3 — F4 regen). Manifest entry tagged `placeholder: true`. |
| `dron_fumigador` | (existing file) | active | `tank` | Archetype assignment locked by user decision 2026-09-07; HP = 3. |
| `plataforma_solar` | (existing file) | deprecated | n/a | PNG kept on disk for F4 audit trail; manifest entry tagged `deprecated: true`. NOT used in F3 test fixture. |
| `hand_pen` | `assets/sprites/hand_pen.png` | active | n/a | New real asset generated in F3 PR via `minimax_text_to_image` per ASSET-001 conventions. |

The bootstrap loader SHALL refuse to mount any sprite whose manifest entry is missing or whose archetype binding is unknown — same `ConfigError` contract as `enemy-archetypes` REQ-ENM-005.

(Previously F2.5.2: the bootstrap loaded 35 tiles; F3 expands the asset surface to tiles + enemy roster + hand sprite. The "35 tiles" text in the prior ASSET-004 is OUT OF DATE — the live count is 40 tiles per `iso-tile-system` TILE-001 / TILE-002. The same-commit update rule applies to ASSET-004 as to the rest of the catalog.)

#### Scenario: Bootstrap loads tiles + enemy roster

- GIVEN the F3 asset manifest
- WHEN `loadAssets()` resolves
- THEN `PIXI.Assets.cache` contains every entry from `manifest.active[]` — tiles (40) + enemy sprites (the F3 roster) + `hand_pen`.
- AND the elapsed time from `DOMContentLoaded` to first iso frame is ≤ 5 seconds.

#### Scenario: dron_fumigador is bound to tank

- GIVEN `assets/sprites/manifest.json`
- WHEN the JSON is parsed
- THEN the `dron_fumigador` entry has `archetype === "tank"`.

#### Scenario: plataforma_solar is marked deprecated

- GIVEN `assets/sprites/manifest.json`
- WHEN the JSON is parsed
- THEN the `plataforma_solar` entry has `deprecated === true`
- AND the PNG file still exists on disk (verified by `fs.access`).

#### Scenario: camion_cisterna_residuos is a placeholder

- GIVEN `assets/sprites/manifest.json`
- WHEN the JSON is parsed
- THEN the `camion_cisterna_residuos` entry has `placeholder === true`
- AND the PNG is `64×64` with `alpha = 0` at the four corners (magenta chroma key already replaced).

#### Scenario: hand_pen is generated and loaded

- GIVEN F3 lands
- WHEN `loadAssets()` resolves
- THEN `assets/sprites/hand_pen.png` exists, is `64×64`, has transparent corners, and is in `PIXI.Assets.cache`.

#### Scenario: Loader refuses unknown archetype

- GIVEN a manifest entry whose `archetype` is not one of `standard`, `tank`, `mini-boss`, `boss`
- WHEN `loadAssets()` parses it
- THEN a `ConfigError` is thrown naming the sprite id and the offending archetype value.

## ADDED Requirements

### Requirement: ASSET-011 — Hand sprite generation (one-shot minimax, F3)

The system SHALL generate `assets/sprites/hand_pen.png` exactly ONCE during the F3 PR via `minimax_text_to_image`. The generation SHALL use `aspect_ratio="1:1"` (the only accepted ratio for minimax sprite generation — `2:1` is rejected per the F2.5.1 ASSET-006 lessons). The prompt template SHALL include the verbatim substring:

> `64×64 px square sprite, top-down view, pixel art, flat magenta #FF00FF background, hand holding a pen, no anti-aliasing`

The prompt SHALL NOT reference "diamond", "2:1 ratio", or any non-square shape language. After generation, the file SHALL be post-processed with `tools/postprocess_v4.py` to replace the magenta background with transparent alpha.

(Previously: no hand sprite existed. F3 ships a real asset, NOT a magenta placeholder — magenta is reserved for the `camion_cisterna_residuos` placeholder only.)

#### Scenario: hand_pen.png is a real asset

- GIVEN the F3 PR lands
- WHEN `identify assets/sprites/hand_pen.png` (or Pillow) reads it
- THEN the file is `64×64`, has transparent corners (`alpha = 0`), and the center pixels are NOT solid magenta (the sprite body shows the hand + pen).

#### Scenario: Minimax invocation is one-shot

- GIVEN the F3 PR includes one and only one `minimax_text_to_image` call for sprites
- WHEN `git grep minimax_text_to_image` runs on the F3 commit
- THEN exactly one match exists (the hand sprite generation)
- AND `camion_cisterna_residuos` is hand-authored (no minimax call site for it).

#### Scenario: tools/generate-iso-tiles.py is NOT invoked

- GIVEN the F3 PR scope is combat + UI overlays + hand sprite only (no tile regeneration)
- WHEN `git grep generate-iso-tiles` runs
- THEN zero matches exist for the F3 PR's diff.

## REMOVED Requirements

None.

## RENAMED Requirements

None.