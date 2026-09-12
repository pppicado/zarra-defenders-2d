# Tasks: fase-5-hitbox-visualization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~210 (4 new, 4 modified) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Hitbox viz + tightened hit detection | PR 1 | `node tests/e2e/hitbox-visualization.spec.mjs` | `python3 -m http.server 8000` | Drop `debug-hitboxes.js`, the `index.html` script tag, revert `getScreenBounds` inset, remove new test-api methods |

## Phase RED — Failing tests first (TDD strict)

- [x] **TASK-R1** `[RED]` `tests/e2e/hitbox-visualization.spec.mjs` (NEW) — spawn `standard` at iso(3,2), read `getScreenBounds('e01')` shrunk AABB, fire at `bounds.x - 5` (5px outside left inset). Assert `{hit:false}`. LOC +60. **Verify**: `node tests/e2e/hitbox-visualization.spec.mjs` → FAILS (current bounds = full sprite).

- [x] **TASK-R2** `[RED]` `tests/e2e/hitbox-visualization.spec.mjs` — nav to `?test=1&hitboxes=1`, tick 1 frame, read `__gameTestAPI__.getHitboxRects()`. Assert `length === alive` and each entry has `{enemyId, archetype, x, y, w, h, color}`. LOC +15. **Verify**: FAILS (`getHitboxRects` undefined).

- [x] **TASK-R3** `[RED]` `tests/e2e/hitbox-visualization.spec.mjs` — call `api.setHitboxesEnabled(false)`, read `getHitboxRects()`. Assert `length === 0`. LOC +6. **Verify**: FAILS (no toggle method).

- [x] **TASK-R4** `[RED]` `tests/e2e/hit-detection.spec.mjs` (MODIFY, line ~226) — after R2's 50px miss, add: fire at `bounds.x + 16` (exact inset edge of `standard`). Assert `{hit:true, enemyId:'e01'}`. LOC +6. **Verify**: currently passes by accident; locks the boundary once inset lands.

## Phase GREEN — Implementation

- [x] **TASK-G1** `[GREEN]` `src/enemies.js` lines 34–37 — add `hitInset: Object.freeze({top,right,bottom,left})` to each archetype: `standard={16,16,16,16}`, `tank={12,12,12,12}`, `'mini-boss'={10,10,10,10}`, `boss={8,8,8,8}`. LOC +4. **Verify**: existing tests still pass.

- [x] **TASK-G2** `[GREEN]` `src/enemies.js` lines 115–129 — inside `Enemy.getScreenBounds`, after computing `raw` bounds (both sprite + fallback branches), apply `ins = ARCHETYPES[enemy.archetype].hitInset` → return `{x: raw.x+ins.left, y: raw.y+ins.top, w: raw.w-ins.left-ins.right, h: raw.h-ins.top-ins.bottom}`. LOC +6. **Verify**: R1 + R4 pass; hit-detection R2 (50px miss) still passes.

- [x] **TASK-G3** `[GREEN]` `src/debug-hitboxes.js` (NEW, ~45 LOC) — `class DebugHitboxes { constructor({hudContainer, enemies, isoWorld, viewportCenter}) { this._enabled=false; this._container=new PIXI.Container(); this._gfxByArch={} } setEnabled(b){this._enabled=!!b} update(cameraIso){ /* clear → each live enemy → bounds=Enemy.getScreenBounds(...) → drawRect */ } readRects(){return [...]} }`. Export `ARCHETYPE_COLORS = {standard:0x00FFFF, tank:0xFFFF00, 'mini-boss':0xFF00FF, boss:0xFF8000}`. **Verify**: R2+R3 pass.

- [x] **TASK-G4** `[GREEN]` `src/debug-hitboxes.js` — in `update()`, pool one `PIXI.Graphics` per archetype (lazy-init), `lineStyle(2, COLOR[arch])`, `drawRect(b.x, b.y, b.w, b.h)`. `clear()` at frame start. LOC +15. **Verify**: `getHitboxRects()` returns correct colors.

- [x] **TASK-G5** `[GREEN]` `src/main.js` lines 32, 351–361 — import `DebugHitboxes`; parse `params.has('hitboxes')` via `URLSearchParams`; instantiate `debugHitboxes = new DebugHitboxes({hudContainer:hud.stage, enemies, isoWorld, viewportCenter})` with initial enabled flag; call `debugHitboxes.update(camIso)` in ticker after `isoWorld.update()`; add `window.addEventListener('keydown', e => { if (e.key==='h'||e.key==='H') debugHitboxes.setEnabled(!debugHitboxes._enabled) })`. LOC +16. **Verify**: R2+R3 pass.

- [ ] **TASK-G6** `[GREEN]` `index.html` line 67 — add `<script type="module" src="src/debug-hitboxes.js?v=45"></script>` after main.js tag. LOC +1. **Verify**: dev server loads module without 404. *(DEVIATION: skipped — main.js already imports the module; a separate `<script>` tag with `?v=45` would create a duplicate module instance. Module is loaded exactly once via main.js's import.)*

- [x] **TASK-G7** `[GREEN]` `src/test-api.js` lines 63, 316–329 — pass `debugHitboxes` into `mountTestAPI` ctx; expose `setHitboxesEnabled(b){ctx.debugHitboxes?.setEnabled(b)}` and `getHitboxRects(){return ctx.debugHitboxes?.readRects() ?? []}`. LOC +10. **Verify**: R2+R3 pass deterministically (no keyboard events needed).

## Phase REFACTOR

- [x] **TASK-X1** `[REFACTOR]` `src/enemies.js` line 47 — extend `assertArchetype(name)` to validate `ARCHETYPES[name].hitInset` exists and `top/right/bottom/left` are finite numbers; throw `ConfigError` otherwise. LOC +8. **Verify**: existing tests green; manual boot smoke OK.

- [x] **TASK-X2** `[REFACTOR]` `src/debug-hitboxes.js` — co-locate `ARCHETYPE_COLORS` near `ARCHETYPES` use (top of file, just under the class); consumer and palette live together. LOC ±0. **Verify**: visual smoke test shows 4 colors at `?test=1&hitboxes=1`.

## Implementation Order

RED (R1→R4, all red) → G1+G2 unlock R1+R4 → G3+G4 build overlay → G5+G6+G7 wire it → X1+X2 refactor. Each GREEN flips one or more RED tests green.

## Verification

1. `node tests/e2e/hit-detection.spec.mjs` — all R1-R4 + X1+X2 pass after G2
2. `node tests/e2e/hitbox-visualization.spec.mjs` — R1-R3 pass after G7
3. Manual: `python3 -m http.server 8000` → `?test=1&hitboxes=1` → 4 colored rects; `H` toggles.
