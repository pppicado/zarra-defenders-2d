# Apply Progress — Fase 6 Per-stage rosters + menú visuals

## Implementation Result

All 27 tasks marked complete in `tasks.md`.

## Files Created
- `src/levels/stage-rosters.js` — STAGE_ROSTERS registry + 5 rosters (~280 LOC)
- `assets/menu_bg/menu-panorama-cofrentes.png` (383KB)
- `assets/menu_bg/menu-mapa-cartografico.png` (558KB)
- `assets/menu_bg/menu-vertedero-satirico.png` (552KB)
- `assets/menu_bg/menu-rio-cabriel.png` (512KB)
- `vendor/pixi.min.js` (446KB, pixi.js v7.4.0)

## Files Modified
- `src/main.js` — import getRosterForStage + 3-line wire in bootTestLevel
- `index.html` — script tag with vendor/pixi.min.js + onerror CDN fallback
- `styles/main.css` — 4 menu roots get dedicated background-image
- `.gitignore` — `assets/menu_bg/raw/` and `menu-*.jpeg` patterns

## Files Added (Tests)
- `tests/unit/levels-stage-rosters.spec.mjs` — 18 tests

## Commits
- `faba09b feat(stages+menu+pixi): Fase 6 cerrada — rosters + 4 backgrounds + offline pixi`
  18 files changed, 1667 insertions(+), 11 deletions(-)
- `fe94948 chore(gitignore): exclude raw menu backgrounds (regenerable from minimax MCP)`
  9 files changed, 4 insertions(+)
