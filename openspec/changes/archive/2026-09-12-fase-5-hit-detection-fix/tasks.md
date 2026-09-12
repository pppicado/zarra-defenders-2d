# Tasks: fase-5-hit-detection-fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280 (combat ~120, enemies ~40, main ~5, test-api ~15, spec ~120 new) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Screen-space hit detection with TDD | PR 1 | `node tests/e2e/hit-detection.spec.mjs` | dev server `python3 -m http.server 8000` | Revert PR restores iso-plane AABB |

## Phase RED — Failing tests first (TDD strict)

- [x] **TASK-R1** `tests/e2e/hit-detection.spec.mjs` — Add scenario "screen-space hit at visible sprite center": spawn e01 standard, query `__gameTestAPI__.getScreenBounds(e01.id)` center, call `fireAtScreen(center.x, center.y)`, assert `hit=true` & `enemyId==='e01'`. **Verify**: `node tests/e2e/hit-detection.spec.mjs` MUST fail with `Cannot read fireAtScreen`. **+30 LOC**.
- [x] **TASK-R2** `tests/e2e/hit-detection.spec.mjs` — Add scenario "screen-space miss outside sprite": click 50 px offset from center, assert `hit=false` & no `combat:hit` event fires. **Verify**: fails with `Cannot read fireAtScreen`. **+20 LOC**.
- [x] **TASK-R3** `tests/e2e/hit-detection.spec.mjs` — Add scenario "all 4 archetypes hit": use `__gameTestAPI__.spawnEnemy()` to create standard/tank/mini-boss/boss at iso cells near the camera, read each `getScreenBounds` center, fire at each, assert all 4 `hit=true`. **Verify**: fails with `getScreenBounds is not a function`. **+40 LOC**.
- [x] **TASK-R4** `tests/e2e/hit-detection.spec.mjs` — Add scenario "resolution independence": loop over viewports `[1280x720, 1920x1080]`, re-create page each iteration, assert same enemy hit at same logical-screen center. **Verify**: fails at `fireAtScreen` call. **+30 LOC**.

## Phase GREEN — Implementation to pass tests

- [x] **TASK-G1** `src/enemies.js` (after `markDestroyed` ~L94) — Add `Enemy.getScreenBounds(enemy, isoWorld, cameraIso, viewportCenter)`. Sprite path: `enemy.sprite.getBounds()`. Null sprite: `isoToScreenWithCamera(enemy.isoX, enemy.isoY) ± TILE_SIZE/2`. Export function. **Verify**: R3 partial passes. **+25 LOC**.
- [x] **TASK-G2** `src/combat.js` — Replace `_resolveHit(isoX, isoY)` with `_resolveHitAtScreenPoint(sx, sy, cameraIso, vc, isoWorld)`. For each alive enemy: `getScreenBounds`, AABB containment test (sx in [x,x+w] && sy in [y,y+h]), sort `(isoX+isoY) desc, id asc`. **Verify**: R1 passes. **+30 LOC**.
- [x] **TASK-G3** `src/combat.js` — Add `fireAtScreen(sx, sy, originScreen, opts={})` public API. Cooldown gate, `combat:fire` emit, call `_resolveHitAtScreenPoint`, convert `(sx,sy)` → iso for projectile homing via `screenToIsoWithCamera`. Keep `fireAtIso` as thin wrapper: convert iso→screen via `isoToScreenWithCamera`, delegate to `fireAtScreen`. **Verify**: R1, R2 pass. **+40 LOC**.
- [x] **TASK-G4** `src/main.js` (L261-269) — Tap handler: drop `screenToIsoWithCamera` call, pass `logicalX, logicalY` directly to `combat.fireAtScreen(logicalX, logicalY, handPos)`. **Verify**: smoke + hit-detection pass. **+5/-5 LOC**.
- [x] **TASK-G5** `src/test-api.js` (after `fireAtIso` L111) — Add `fireAtScreen(x, y, opts)`: `ctx.combat.fireAtScreen(x, y, {x:0,y:0}, {bypassCooldown:true, ...opts})`. Add `getScreenBounds(enemyId)` reading `Enemy.getScreenBounds`. Keep `fireAtIso` / `simulateTap`. **Verify**: R1-R4 pass. **+10 LOC**.

## Phase REFACTOR — Make tests robust

- [x] **TASK-X1** `tests/e2e/hit-detection.spec.mjs` — Add depth-sort scenario: spawn two enemies at the same iso cell (overlapping `getScreenBounds`), fire at overlap center, assert lower-id wins (RE-CMB-003 reverse-depth tie-break). **Verify**: `node tests/e2e/hit-detection.spec.mjs` all green. **+20 LOC**.
- [x] **TASK-X2** `tests/e2e/hit-detection.spec.mjs` — Add sprite-null fallback: `spawnEnemy({archetype:'standard', spriteId:'NONEXISTENT'})`, fire at iso-projected center `±TILE_SIZE/2`, assert hit. **Verify**: all green. **+20 LOC**.

## Dependency Order

R1-R4 → G1 → G2 → G3 → G4 → G5 → X1 → X2

## Total LOC: ~280 (under 400 budget)
