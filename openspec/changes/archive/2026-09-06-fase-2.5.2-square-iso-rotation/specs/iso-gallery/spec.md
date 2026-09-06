# `iso-gallery` Specification

**Change**: fase-2.5.2-square-iso-rotation
**Capability**: iso-gallery (NEW)

## Purpose

Define the contract for `tests/tile-gallery.html`, the dev-only HTML page that visualises every tile and sprite asset in the project. The gallery is the human review surface: it shows accepted tiles, archived (discarded) tiles, every sprite the user said they "cannot see", and a live mini-iso-demo canvas that proves the rotated-container iso look works end-to-end. The gallery MUST render zero `console.error` and zero `console.warn` under Playwright headless.

## Requirements

### Requirement: GAL-001 — Gallery reads manifest and sprite directory

The gallery MUST read `assets/tiles/manifest.json` at runtime AND list every PNG under `assets/sprites/` via a manifest-driven enumeration (no hardcoded sprite paths). The page MUST render three sections:

- **Accepted tiles** — one card per entry from `manifest.active[]` (40 cards after F2.5.2 archives).
- **Discarded tiles** — one card per entry from `manifest.discarded[]`, wrapped in a `<details>` element collapsed by default; renders a "No discarded tiles" placeholder when the list is empty.
- **Sprites** — one card per PNG found in `assets/sprites/`. The user-confirmed target is **all 21 sprites** (full catalogue), not just the 4 demo sprites used in the mini-iso-demo.

Each sprite card MUST have a **blue border**. Each regenerated accepted tile MUST have an **orange border** (carried over from F2.5.1's ASSET-008 contract). Cards MUST be grouped in a CSS grid.

#### Scenario: Gallery enumerates 21 sprites

- GIVEN `assets/sprites/` contains 21 PNG files (per `ls assets/sprites/*.png`)
- WHEN the gallery page loads
- THEN the Sprites section renders exactly 21 cards
- AND every card shows the sprite image, its filename, and a blue border.

#### Scenario: Gallery enumerates 40 accepted tiles

- GIVEN `manifest.active.length === 40`
- WHEN the gallery page loads
- THEN the Accepted section renders exactly 40 cards
- AND every card shows the tile image, its stage + variant label, and an orange border if `regeneratedFrom.regeneratedAt` is present.

#### Scenario: Gallery handles empty discarded list gracefully

- GIVEN `manifest.discarded.length === 0`
- WHEN the page renders
- THEN the Discarded `<details>` element shows a "No discarded tiles" placeholder
- AND no `console.error` or `console.warn` fires.

#### Scenario: Gallery handles 40 archived diamonds (F2.5.2 audit trail)

- GIVEN `manifest.discarded.length === 40` (the archived F2.5.1 diamonds)
- WHEN the page renders
- THEN the Discarded `<details>` element expands to show 40 archived cards
- AND the section is collapsed by default (no visual noise on initial page load).

#### Scenario: Zero console errors under Playwright headless

- GIVEN `tests/tile-gallery.html` loaded in Playwright headless
- WHEN `console.error` and `console.warn` events are captured for 5 seconds
- THEN the count of each MUST be 0.

### Requirement: GAL-002 — Rotation toggle (45° vs top-down)

The gallery MUST expose a control (button or checkbox) labelled **"Vista isométrica 45°"** that toggles the display of every accepted tile between two modes:

- **Vista top-down** (default) — the tile's PNG is rendered exactly as it exists on disk, with no transform. This is the canonical "what's in the file" view.
- **Vista isométrica 45°** — every accepted tile `<img>` receives a CSS `transform: rotate(45deg)`, previewing how the texture looks when the engine applies `_tileLayer.rotation = Math.PI / 4` at the container level.

The toggle MUST apply to every accepted tile card simultaneously (single global state). The default view on page load MUST be "Vista top-down" because the on-disk PNG is top-down and that is the most informative default for terrain review.

#### Scenario: Default view is top-down

- GIVEN a fresh page load
- WHEN the user has not interacted with the toggle
- THEN every accepted tile `<img>` has `transform: none` (or no `transform` style)
- AND the toggle shows the "Vista top-down" state.

#### Scenario: Toggle switches every tile to 45°

- GIVEN the page in "Vista top-down" mode
- WHEN the user clicks the toggle
- THEN every accepted tile `<img>` gets a CSS `transform: rotate(45deg)` applied
- AND the toggle shows the "Vista isométrica 45°" state.

#### Scenario: Toggle back to top-down restores PNG view

- GIVEN the page in "Vista isométrica 45°" mode
- WHEN the user clicks the toggle a second time
- THEN the CSS `transform: rotate(45deg)` is removed from every accepted tile `<img>`
- AND the tiles again render top-down.

### Requirement: GAL-003 — Mini-iso-demo canvas (live `IsoWorld` with demo sprites)

The gallery MUST embed a `<canvas>` (default size `480×270`) that renders a live mini isometric map using the project's actual `IsoWorld` module. The demo canvas MUST:

- Instantiate `IsoWorld` and a `Tilemap` for `stage1-bosque`.
- Mount exactly **4 demo sprites** — 3 pino sprites at iso positions on a 6×6 plane and 1 castillo sprite — animated with simple idle bobbing (vertical oscillation, amplitude ≈ 4 px, period ≈ 2 s).
- Use the **accepted** 64×64 square tiles and the regenerated assets (NOT placeholders).
- Apply `_tileLayer.rotation = Math.PI / 4` so the user sees the same rotated-plane look as the game.

The demo MUST validate end-to-end that the 21 sprites and 40 tiles render correctly in the real isometric context. If any sprite fails to load or any tile fails to render, the demo MUST surface a visible error badge (e.g., a red banner) rather than failing silently.

#### Scenario: Mini-iso-demo instantiates IsoWorld with 40 cached tiles

- GIVEN `IsoWorld` and `Tilemap('stage1-bosque')` mounted in the demo canvas
- WHEN the demo's first frame renders
- THEN the canvas shows a `6×6` iso plane with the Bosque variant tiles
- AND `_tileLayer.rotation === Math.PI / 4` (visible 45° rotation).

#### Scenario: 4 demo sprites animate on the iso plane

- GIVEN the demo canvas mounted with 3 pino + 1 castillo sprites
- WHEN the demo runs for 4 seconds
- THEN each sprite MUST be visible at its iso position
- AND each sprite MUST bob vertically (idle animation)
- AND no sprite MUST be missing or stuck at default (0, 0) screen position.

#### Scenario: Mini-iso-demo fails loudly on missing asset

- GIVEN a demo sprite path that 404s (or a tile missing from the cache)
- WHEN the demo tries to mount it
- THEN a visible red error badge MUST appear inside or above the canvas
- AND a `console.error` MUST fire (acceptable because this is a deliberate failure signal for the reviewer).

#### Scenario: Demo uses accepted tiles, not placeholders

- GIVEN the demo's `Tilemap` instance
- WHEN the `Tile.sprite.texture` of any visible tile is inspected
- THEN the texture MUST be one of the 40 cached assets under `assets/tiles/stage1-bosque/`
- AND MUST NOT be a coloured rectangle or `<canvas>`-drawn fallback.