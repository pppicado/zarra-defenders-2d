# Tasks: fase-5-enemy-movement

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 320–420 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No (single PR with size:exception OK — pure game-logic, no migration) |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Movement engine + roster scale (all 14 tasks) | PR 1 | `node tests/e2e/enemy-movement.spec.mjs` | Playwright headless + `?test=1` boot | One `git revert` — `Enemy.tick` is dead code without step-0 motion loop; with loop removed, 120-enemy roster reverts to F4b static behavior |

## Phase 1: RED — Tests that fail first

- [x] **1.1 (RED)** Create `tests/e2e/enemy-movement.spec.mjs` — read `window.__gameTestAPI__.testLevel.enemies.length`, assert `=== 120`. Currently FAILS (24). ~10 LOC.
- [x] **1.2 (RED)** Add to `tests/e2e/enemy-movement.spec.mjs` — spawn `valla_publicitaria` (default config), tick 10 frames with camera advancing, assert `isoX` unchanged. FAILS (no per-instance movement config). ~15 LOC.
- [x] **1.3 (RED)** Add to `tests/e2e/enemy-movement.spec.mjs` — spawn `dron_fumigador` with `speed: 70, movementPattern: 'sine'`, tick 60 frames, assert `isoY` oscillates (sign flip at frame 30). FAILS. ~20 LOC.
- [x] **1.4 (RED)** Add to `tests/e2e/enemy-movement.spec.mjs` — spawn `camion_treco` at projected `sx = viewportSize.x - 79`, tick 1 frame, assert velocity reflected + `sx <= viewportSize.x - 80`. FAILS. ~15 LOC.
- [x] **1.5 (RED)** Add to `tests/e2e/enemy-movement.spec.mjs` — spawn sine `dron_fumigador`, fire at live sprite bounds via `fireAtScreen`, assert hit registers. FAILS (depends on movement code). ~15 LOC.

Verify RED: `node tests/e2e/enemy-movement.spec.mjs` → 5 failures.

## Phase 2: GREEN — Implementation

- [x] **2.1 (GREEN)** `src/enemies.js` line 97 — extend `Enemy` ctor with `speed = 0, movementPattern = 'static'` kwargs; store `this.speed`, `this.movementPattern`, `this._elapsedMs = 0`, `this._arcCenter = null`. ~10 LOC.
- [x] **2.2 (GREEN)** `src/enemies.js` ~line 188 — add `Enemy.tick(dtMs, cameraIso, viewportBounds)`; static pattern early-returns O(1). ~25 LOC.
- [x] **2.3 (GREEN)** `src/enemies.js` ~line 220 — implement movement math (linear/sine/zigzag/arc) inside `tick`. Module-private consts: `SINE_AMP=0.6`, `SINE_FREQ_HZ=1.0`, `ZIGZAG_AMP=0.4`, `ZIGZAG_PERIOD_MS=1000`, `ARC_RADIUS=0.8`, `ARC_OMEGA=0.6`. ~50 LOC.
- [x] **2.4 (GREEN)** `src/enemies.js` ~line 280 — add `Enemy._lateralClamp(isoWorld, cameraIso, viewportBounds)`; project via `isoToScreenWithCamera`, reflect `_vxIso` if `sx < minX || sx > maxX`, snap isoX to bound. Static path never reaches it. ~20 LOC.
- [x] **2.5 (GREEN)** `src/enemies.js` line 362 — wire step-0 motion loop at top of `EnemyManager.update` before escape block: `for (e of _live()) if (e.state === 'alive') e.tick(dtMs, cameraIso, viewportBounds, isoWorld, viewportCenter)`. Extend signature with `viewportBounds` param. ~8 LOC.
- [x] **2.6 (GREEN)** `src/main.js` line 390 — build `viewportBounds = { minX: 80, maxX: LOGICAL_W - 80 }` once, pass as 7th arg to `enemies.update(...)`. Update `test-api.js` line 101 tick helper to mirror. ~6 LOC.
- [x] **2.7 (GREEN)** `src/levels/test-level.js` line 38 — extend `_buildEnemyDefs` to 120 entries (20 static + 70 standard mobile + 20 tank mobile + 8 mini-boss + 2 boss); add `_MOBILE_DEFAULT` table applying per-spriteId `speed`/`movementPattern` from spec. Deterministic (no Math.random). ~110 LOC.
- [x] **2.8 (GREEN)** `src/levels/test-level.js` line 101 — add `assertStaticSpriteIds()`: validate every `valla_publicitaria`/`billboard_*`/`signage_*`/`incineradora`/`planta_treco`/`sello_burocratico`/`castillo_cofrentes` spawn resolves to `speed: 0, movementPattern: 'static'`. Call from `bootTestLevel` in `main.js`. Update `assertTestLevel` counts to 70/40/8/2. ~25 LOC.

Verify GREEN: `node tests/e2e/enemy-movement.spec.mjs` → 0 failures. Existing `hit-detection.spec.mjs` still green.

## Phase 3: REFACTOR

- [x] **3.1 (REFACTOR)** `src/enemies.js` top — extract `LATERAL_MIN_PX = 80` and `LATERAL_MAX_PX = LOGICAL_W - 80` module-private consts; replace magic numbers in `_lateralClamp` and `Enemy.tick` clamp branch. No behavior change. ~5 LOC.

Verify: all tests still green; `git diff --stat` shows ≤ 420 LOC added.

## Total: 14 tasks (5 RED + 8 GREEN + 1 REFACTOR)
