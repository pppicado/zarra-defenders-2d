# F2.5.4 — Tile overlap fix + level demo

## Why
Three critical bugs surfaced during demo review:

1. **Tiles overlapped by 50%**: `isoToScreen` used `hw = hh = tileSize/2` (F2.5.2
   symmetric halves). With square 64×64 PNGs rotated 45° by `_worldLayer`,
   adjacent tiles needed center-to-center separation of `tileSize/√2 ≈ 45.25`,
   not `tileSize/2 = 32`. The result was visible tile-on-tile overlap.

2. **Sprites tilted sideways**: `IsoWorld._spriteLayer` lived inside
   `_worldLayer` (the 45° rotation wrapper), so every tree/building/enemy
   inherited the 45° rotation. Tilted pinos looked wrong.

3. **Game main page was 404'd**: `src/main.js:131` loaded
   `assets/tiles/stage1-bosque/${variant}.png` but the F2.5.3 regeneration
   named files `${variant}_alt1.png`. The game has been broken since F2.5.3.

Plus: user requested a 4x larger world and sprites distributed across the map.

## What
- `src/iso/iso-math.js`: `hw = hh = tileSize / sqrt(2)` (was `/2`). Same change
  in `getTileHalf()`.
- `src/iso/world.js`: `_spriteLayer` moved out of `_worldLayer` into the
  unrotated `container`. Sprite positions offset by `+tileSize/√2` in y so
  the base lands on the south point of each rotated tile diamond.
- `src/iso/tilemap.js`: `MAX_VISIBLE_TILES` 100 → 400.
- `src/main.js`: texture resolver loads `_alt1.png`.
- `tests/tile-gallery.html`: canvas 800×500 → 1024×640, 14 → 18 sprites per
  stage, 5 stage layouts, per-stage `CAM_DEFAULTS`.

## Result
Commit 27052e2 on main. Game main page loads. Demo shows 400 tiles + 18 sprites
in proper iso layout, no overlap, no rotation.
