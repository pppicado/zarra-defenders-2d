# Spec — Menu Visuals

This spec defines the dedicated background images for each in-game menu.
Phase 6 implementation: 2026-09-25, archived as
`openspec/changes/archive/2026-09-25-fase-6-stages-menus/`.

## Purpose

Each of the 5 main menu surfaces (main menu, data screen, biblioteca,
game overlay, final screen) gets its own thematic background image,
giving each surface a distinct visual identity aligned with the project's
pedagogical and regional context.

## Requirements

### Requirement: 4 Dedicated Background PNGs

The game SHALL ship 4 dedicated background PNGs in `assets/menu_bg/`:

1. `menu-panorama-cofrentes.png` — Wide panoramic view of the Valle
   from Castillo de Cofrentes at golden hour
2. `menu-mapa-cartografico.png` — Stylized cartographic map of the Valle
   (aged parchment style)
3. `menu-vertedero-satirico.png` — Satirical toxic waste dump (dark humor)
4. `menu-rio-cabriel.png` — Cabriel canyon river view at golden hour

#### Scenario: All 4 PNGs exist

Each of the 4 PNGs SHALL be a valid image file served via HTTP 200 from
`assets/menu_bg/`.

### Requirement: Background-to-Menu Mapping

Each in-game menu SHALL use exactly one dedicated background:

| Menu root | Background |
|---|---|
| `#main-menu` | `menu-panorama-cofrentes.png` |
| `#data-screen` | `menu-panorama-cofrentes.png` (reuses) |
| `#biblioteca` | `menu-mapa-cartografico.png` |
| `#game-overlay` | `menu-vertedero-satirico.png` |
| `#final-screen` | `menu-rio-cabriel.png` |

#### Scenario: CSS background-image applies on each menu

When a menu surface is visible, its root element SHALL have
`background-image: url('../assets/menu_bg/<mapped-file>.png')` set via CSS.

### Requirement: Pixel-Art Style Consistency

All backgrounds SHALL be post-processed with PIL NEAREST downsample
(1280×720 → 640×360) for pixel-art consistency with the stage backgrounds.

#### Scenario: Same dimension for all 4

All 4 PNGs SHALL be 640×360 pixels.

### Requirement: No Hardcoded URLs in Source

The URL to each background PNG SHALL be referenced in `styles/main.css` only.
Source files in `src/` SHALL NOT contain `assets/menu_bg/` literals (per
ROADMAP A6 contract — URLs only in i18n/es.js).

## Out of Scope

- Animated backgrounds
- Per-stage distinct backgrounds (only 5 menu surfaces get dedicated bgs)
- Backgrounds that respond to game state (e.g. different bg for victory vs defeat)
