/**
 * src/canvas.js
 *
 * Canvas dimensions — single source of truth for LOGICAL_W and LOGICAL_H.
 *
 * F4e: LOGICAL_W 1920 → 1280 (16:9 standard aspect ratio, was 8:3 ultra-wide).
 *      Previously the user asked why we work at "720p" yet width was 1920;
 *      1280×720 is the canonical 720p definition and yields ~14 horizontal
 *      iso tiles (vs ~21 before) — still plenty for the rail corridor.
 *
 * F4e (bug fix): extracted from src/main.js to break the dual-load cycle that
 * caused double-bootstrap (4 canvases instead of 2). The bug was triggered by
 * `index.html` loading main.js with `?v=44` while combat.js + test-api.js
 * imported from `./main.js?v=44` — those query-string mismatches produced two
 * distinct module-graph copies of main.js, each running its own bootstrap().
 * Moving LOGICAL_W/LOGICAL_H to this standalone module lets consumers import
 * the constants without going through main.js, so all paths load exactly one
 * copy.
 *
 * No Pixi imports, no side effects — safe to import anywhere.
 */
export const LOGICAL_W = 1280
export const LOGICAL_H = 720
export const TILE_SIZE = 128
