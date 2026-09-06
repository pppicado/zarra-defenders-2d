# Delta for `iso-asset-pipeline`

**Change**: `fase-2.5.1-tile-regen-and-centering`
**Capability**: `iso-asset-pipeline` (MODIFIED — new requirements only; existing ASSET-001..005 unchanged)

## ADDED Requirements

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

### Requirement: ASSET-007 — Manifest totals invariant and regeneratedFrom provenance

`assets/tiles/manifest.json` MUST maintain the invariant `totals.active + totals.discarded === 40`. When a tile is regenerated and accepted, the previous active entry MUST move to `discarded[]` with `regeneratedFrom.regeneratedAt` (ISO 8601 timestamp) and `regeneratedFrom.reason`. The newly-accepted entry MUST be added to `active[]` with `regeneratedFrom.previousVariantId` pointing to the discarded entry.

#### Scenario: Regenerated tile tracked with provenance

- GIVEN a tile is regenerated and accepted
- WHEN the manifest is written
- THEN the discarded entry MUST carry `regeneratedFrom.regeneratedAt` set to the regeneration timestamp
- AND the new active entry MUST carry `regeneratedFrom.previousVariantId` equal to the discarded entry's id
- AND the invariant `totals.active + totals.discarded === 40` MUST hold.

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

## Scope boundary and rollback note

**Out of scope**: `src/rail-camera.js`, `src/input.js`, `src/player.js`, `styles/main.css`, `index.html` (locked per `openspec/config.yaml` `rules.apply`); F3+ collision/F4 enemy/F5 pedagogy.

**Rollback per tile**: the prior version (`*_v2.png` evidence file currently in `_discarded/_regen_attempt_1/`) moves to `discarded[]` with `discriminator: regen-v2-failed`; the pre-F2.5.1 restored original at `stage{N}-*/{variant}.png` becomes active again; any further regen attempt is preserved in `_discarded/_regen_attempt_2/`. NOTE: the proposal's item-1 rollback language said `*_discarded.png`; actual evidence filenames are `*_v2.png` (corrected here).

**Full F2.5.1 rollback**: `git checkout 8d78885 -- assets/tiles/ src/iso/world.js src/main.js tests/tile-gallery.html` returns to the F2.5 partial state.

## MODIFIED Requirements

None — F2.5.1 only adds new requirements (ASSET-006/007/008). Existing ASSET-001 through ASSET-005 remain unchanged.

## REMOVED Requirements

None.

## RENAMED Requirements

None.