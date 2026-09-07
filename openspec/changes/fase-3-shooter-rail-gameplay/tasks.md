# Tasks: F3 — Shooter Rail Gameplay

**Change**: `fase-3-shooter-rail-gameplay` · **Base**: main @ `d93ff08` · **Strategy**: single-pr with `size:exception` (user-approved 2026-09-07, proposal §13) · **Source LOC**: ~1005

Decision needed before apply: No
Chained PRs recommended: No (user-approved size:exception, single PR)
Chain strategy: size-exception
400-line budget risk: High (forecast ~1005 LOC vs 400 budget, mitigated by user-approved size:exception 2026-09-07)

## Phase A — Foundation

- [x] **TASK-001** `src/event-bus.js` NEW · shared `EventTarget`; `bus.emit/on` matches standard; payload verbatim. Commit: `feat(combat): add event bus singleton for combat/integrity/score decoupling`. Depends: —. LOC: 30. Tests: TASK-018.
- [x] **TASK-002** `src/integrity.js` NEW · 3-segment state; `drain()` floors at 0; `integrity:exhausted` emits once on `>0→0`; `reset()` → 3. Commit: `feat(integrity): add 3-segment state machine with exhaust-once semantics`. Depends: TASK-001. LOC: 80. Tests: TASK-020.
- [x] **TASK-003** `src/score.js` NEW · `addHit(mult)` deltas score/firmas; `tryWriteBest()` victory-only with firmas>stored OR (firmas tie AND score>stored); `loadBest()` null on corrupt/throw; all `localStorage` in try/catch. Commit: `feat(score): add score/firmas counter with silent best-score localStorage persistence`. Depends: TASK-001. LOC: 90. Tests: TASK-020.
- [x] **TASK-004** `assets/sprites/manifest.json` + `camion_cisterna_residuos.png` NEW · manifest declares `dron_fumigador→tank`, `plataforma_solar` deprecated, `camion_cisterna_residuos` placeholder; 64×64 magenta PNG. Commit: `feat(asset): add sprite manifest + camion_cisterna_residuos magenta placeholder PNG`. Depends: —. LOC: 25. Tests: TASK-019.
- [x] **TASK-005** `src/enemies.js` NEW · `ARCHETYPES` table (HP `1/3/10/30`, footprint `0.5/0.7/0.8/1.0`, mult `1/1.5/2/3`); `Enemy.applyHit(1)`; `EnemyManager.spawn/update/readAll/reset`; escape via `camIsoX+camIsoY+1`. Commit: `feat(enemies): add archetype table + Enemy + EnemyManager with iso escape detection`. Depends: TASK-001, TASK-004. LOC: 180. Tests: TASK-019, TASK-021.

## Phase B — Combat core

- [x] **TASK-006** `src/combat.js` NEW · `fireAtIso(isoX, isoY, originScreen)` with 333 ms cooldown, footprint-AABB candidates, reverse-depth sort (depth desc, id asc), HP decrement, score/firmas deltas, projectile pool (PIXI.Graphics papeleta: 4×6 cream + 1px outline + diagonal signature line per design §10); despawn on first of (1500 ms, hit, frustum+1-tile exit). Commit: `feat(combat): add Combat class with cooldown + footprint hit test + reverse-depth selection + papeleta pool`. Depends: TASK-001..TASK-005. LOC: 220. Tests: TASK-018, TASK-021.
- [x] **TASK-007** `src/iso/world.js` + `iso-math.js` MODIFIED (additive) · `IsoWorld.screenToIsoWithCamera(sx, sy, camIsoX, camIsoY, viewportCenter)` subtracts `worldContainer.position` before delegating; re-export `escapeFrontDepth`; mark `screenToIso` `@deprecated`. Commit: `feat(iso): add camera-aware screenToIsoWithCamera helper + escapeFrontDepth constant`. Depends: —. LOC: 35. Tests: TASK-017 (regression), TASK-021.

## Phase C — HUD + main menu + overlay

- [x] **TASK-008** `src/ui/menu.js` NEW · DOM overlay with 3 buttons (`Iniciar test level`, `Acerca de`, `Disclaimer`), default focus on first, Up/Down/Enter/Esc nav, scrollable Acerca de/Disclaimer inline modals, tap-friendly 64×64 targets (90% width on <600 px), `Iniciar` emits `menu:startRequested` + `RailCamera.setTime(0)`. Commit: `feat(ui): add main menu with 3 buttons + keyboard + touch nav + Acerca de/Disclaimer modals`. Depends: TASK-001, TASK-003. LOC: 130. Tests: TASK-023.
- [x] **TASK-009** `src/ui/overlay.js` NEW · centered 480×320 modal (full-width +16 px on mobile); title + score + `Firmas recogidas: N` + `Mejor: M firmas` + new-record badge; `Reintentar test level` resets integrity/score/firmas/enemies/camera + hides overlay + resumes; `Volver al menú principal` emits `menu:back`; world dim opacity 0.5; idempotent trigger; victory copy positive + calls `score.tryWriteBest()`. Commit: `feat(ui): add game-over + victory overlays with Reintentar/Volver buttons and new-record badge`. Depends: TASK-001..TASK-003, TASK-008. LOC: 160. Tests: TASK-023.
- [x] **TASK-010** `src/ui/hud.js` NEW · 3 horizontal `PIXI.Graphics` rectangles (64×24, 4 px gap) on `hud` top-right, green `#3FB950` / gray `#3A3A3A`, shrink to 160×20 on <600 px; hand sprite (PIXI.Sprite placeholder until TASK-013) at `zIndex=1000`, follows pointer + `(24, 16)` offset, hidden pre-pointer-event and during overlays; export `HAND_POINTER_OFFSET`. Commit: `feat(ui): add integrity HUD (3 segments) + hand sprite pointer tracking`. Depends: TASK-002. LOC: 120. Tests: TASK-021.

## Phase D — Test level + test API

- [x] **TASK-011** `src/levels/test-level.js` + `assets/levels/test-level.json` NEW · `TEST_LEVEL` (rail 0→60s iso (0,0)→(18,18); 12 enemies: 8 standard + 2 tank + 1 mini-boss + 1 boss, `dron_fumigador`→tank + `camion_cisterna_residuos`→tank placeholder); JSON mirror. Commit: `feat(level): add deterministic 12-enemy test level (TEST_LEVEL + JSON mirror)`. Depends: TASK-005. LOC: 115. Tests: TASK-021, TASK-022.
- [x] **TASK-012** `src/test-api.js` + RNG injection in `src/event-bus.js` NEW/MODIFIED · `mountTestAPI()` attaches 13-method surface (`getStatus`, `getSeed`, `setSeed`, `setTime`, `tick`, `fireAtIso` cooldown-bypass, `simulateTap` cooldown-respect, `getEnemies`, `getIntegrity`, `getScore`, `getProjectiles`, `on`, `off`); frozen snapshots; `mulberry32` injected at PRNG boundary under `?test=1` (default `0xC0FFEE`, override `&seed=N`); 60 Hz fixed clock honored over `performance.now()`. Commit: `feat(test-api): add __gameTestAPI__ surface with seeded PRNG injection and 60Hz fixed clock`. Depends: TASK-001, TASK-006, TASK-011. LOC: 150. Tests: TASK-021, TASK-022.

## Phase E — Asset generation

- [x] **TASK-013** `assets/sprites/hand_pen.png` NEW (binary, AI-generated) · one-shot `minimax_text_to_image` with verbatim prompt `"64×64 px square sprite, top-down view, pixel art, flat magenta #FF00FF background, hand holding a pen, no anti-aliasing"` + `aspect_ratio="1:1"`; post-process `tools/postprocess_v4.py --size 64`; 3-attempt regen; on full failure magenta silhouette + `console.warn` (never block PR per proposal §7). Commit: `feat(asset): generate hand_pen sprite via minimax_text_to_image + magenta post-process`. Depends: TASK-004. LOC: 5. Tests: manual Playwright screenshot only.
- [x] **TASK-014** `src/main.js` + `assets/sprites/manifest.json` MODIFIED · extend `loadSprites` to pull `hand_pen` (mount `hud` zIndex 1000) + `manifest.active` archetype entries (cache by spriteId); manifest gains `hand_pen.real:true`. Commit: `feat(asset): wire hand_pen + manifest enemy sprites into boot loader`. Depends: TASK-013. LOC: 35. Tests: TASK-023 (boot, no console errors).

## Phase F — Spec drift + locked-file exceptions

- [x] **TASK-015** `src/rail-camera.js` MODIFIED (additive only) · add `setTime/getTime/halt/unHalt/isHalted`; `update(dt)` no-op when halted; `setTime(0)` resets for Reintentar; CAM-001 zero-diff preserved. Commit: `feat(camera): add RailCamera.setTime/halt/unHalt/isHalted (additive, scoped exception)`. Depends: —. LOC: 30. Tests: TASK-022.
- [x] **TASK-016** `src/input.js` MODIFIED (additive only) · `setGate(predicate)` drops tap events when predicate false; pointermove still fires (HUD hand needs position). Commit: `feat(input): add Input.setGate predicate for menu/overlay tap suppression`. Depends: —. LOC: 15. Tests: TASK-023.
- [x] **TASK-017** `tests/iso-smoke.js` MODIFIED · assertion `live > 100` → `live > 400`; status label `(cap 100)` → `(cap 400)`; F2.5.15 regression smoke green. Commit: `test(iso): reconcile iso-smoke cull cap 100→400 with F2.5.15 live engine`. Depends: —. LOC: 5. Tests: this task IS the regression smoke.

## Phase G — Tests (8 implied: 5 unit + 3 e2e)

- [x] **TASK-018** `tests/unit/event-bus.spec.mjs` NEW · pin payload shapes for 14 F3 topics. Command: `node tests/unit/event-bus.spec.mjs`. Commit: `test(combat): add event-bus payload shape spec for all 14 F3 topics`. Depends: TASK-001. LOC: 80. Tests: this task IS the test.
- [x] **TASK-019** `tests/unit/archetypes.spec.mjs` NEW · pin 4-archetype HP/footprint/multiplier; assert `dron_fumigador→tank` in manifest; loader rejects unknown archetype with `ConfigError`. Command: `node tests/unit/archetypes.spec.mjs`. Commit: `test(combat): add archetypes table integrity spec (HP + footprint + manifest binding)`. Depends: TASK-004, TASK-005. LOC: 60. Tests: this task IS the test.
- [x] **TASK-020** `tests/unit/{integrity,score,best-score}.spec.mjs` NEW ×3 · integrity drain floors at 0 emits-once on transition; score `addHit` deltas; `tryWriteBest` overwrite rule + corrupt/SecurityError silent fallback. Command: `node tests/unit/{integrity,score,best-score}.spec.mjs`. Commit: `test(combat): add integrity + score + best-score unit specs`. Depends: TASK-002, TASK-003. LOC: 180. Tests: this task IS the test.
- [x] **TASK-021** `tests/e2e/hit-detection.spec.mjs` NEW · headless Chromium `?test=1`; 4 fires → 4 destroyed + integrity unchanged; advance camera past 1 enemy → integrity=2. Command: `npx playwright test tests/e2e/hit-detection.spec.mjs`. Runtime: headless Chromium boot `http://localhost:8000/?test=1` via `python3 -m http.server 8000`. Commit: `test(combat): add Playwright hit-detection spec (4 fires + escape drain)`. Depends: TASK-006, TASK-011, TASK-012. LOC: 90. Tests: this task IS the test.
- [x] **TASK-022** `tests/e2e/deterministic-test-level.spec.mjs` NEW · `?test=1&seed=12345` boots twice → byte-identical observation arrays; 60 × `tick(16.6667)` → `getTime()===1.0`; `setTime(45)` + `tick(16.6667)` → `getTime()===45.0166667`. Command: `npx playwright test tests/e2e/deterministic-test-level.spec.mjs`. Runtime: same headless harness. Commit: `test(combat): add deterministic test-level spec (seeded PRNG + 60Hz clock)`. Depends: TASK-012, TASK-015. LOC: 75. Tests: this task IS the test.
- [x] **TASK-023** `tests/e2e/menu-flow.spec.mjs` NEW · production boot → menu visible with `Iniciar` focused; ArrowDown+Enter+Esc on modals; Iniciar tap → gameplay; drain integrity → game-over; Reintentar → reset; Volver → menu. Command: `npx playwright test tests/e2e/menu-flow.spec.mjs`. Runtime: same headless harness. Commit: `test(ui): add Playwright menu-flow spec (menu + overlay + Reintentar/Volver)`. Depends: TASK-008, TASK-009, TASK-016. LOC: 110. Tests: this task IS the test.

## Phase H — Polish + bootstrap wiring

- [x] **TASK-024** `index.html` + `styles/main.css` MODIFIED · 3 DOM containers (`#main-menu`, `#game-overlay`, `#integrity-hud`); load 3 new `<script type="module">`; z-index `canvas < #integrity-hud(50) < #main-menu(100) < #game-overlay(200) < #orientation-warning(9999)`; touch targets 64×64; `@media (max-width:600px)` shrinks HUD to 160×20 + buttons to 90% width; reuse `.hidden`. Commit: `feat(ui): add DOM containers + z-index + responsive CSS for menu/overlay/hud`. Depends: TASK-008..TASK-010. LOC: 90. Tests: TASK-023 (visual).
- [x] **TASK-025** `src/main.js` MODIFIED · replace `app.ticker.add(...)` with F3 orchestrator (design §5): boot order (orientation lock → menu mount → manifest load → tilemap load → sprites load → test API mount → ticker start); `?test=1` branch skips menu + mounts test level + injects seeded PRNG; state machine `{main-menu, gameplay, overlay}`; `Input.setGate(state==='gameplay')`; `__gameTestAPI__.setTime` honored over `performance.now()` under `?test=1`. Commit: `feat(main): wire F3 modules into bootstrap with state machine + ?test=1 branch + ticker orchestrator`. Depends: TASK-001..TASK-017. LOC: 220. Tests: all e2e.

## Review Workload Forecast

- **Total estimated changed lines**: ~1205 (source ~1005 + already-authored proposal/design/specs ~200)
- **Total committed LOC** (source only): **~1005**
- **Chained PRs recommended**: **No** (user-approved `size:exception` 2026-09-07)
- **400-line budget risk**: **High** (forecast ~1005 LOC vs 400 budget, mitigated by user-approved `size:exception`)
- **Decision needed before apply**: **No** (decision made in proposal §13)
- **Highest-risk tasks** (top 3): **TASK-013** (minimax external dependency + 3-attempt regen fallback), **TASK-005** (iso escape detection off-by-one risk; cross-cuts integrity via event bus), **TASK-008** (main menu DOM/Pixi interaction + z-index + state machine — multi-file wiring with edge cases)
- **Suggested apply order**: Phases **A → B → C → D → E → F → G → H** in this exact order; each phase produces a runnable increment.
- **Rollback granularity**: Riskiest partial revert is **TASK-025 (main.js wiring)** — reverts ticker orchestrator but keeps modules intact (usable in unit tests). Phases A–G each revert individually without breaking the F2.5.15 base.

## Review Budget Summary

| Phase | Tasks | Source LOC | Tests | Risk |
|-------|-------|------------|-------|------|
| A: Foundation | 5 | 405 | 0 (covered G) | low |
| B: Combat | 2 | 255 | 0 (covered G) | high |
| C: HUD + menu + overlay | 3 | 410 | 0 (covered G) | high |
| D: Test level + test API | 2 | 265 | 0 (covered G) | medium |
| E: Assets | 2 | 40 | 0 (manual) | medium |
| F: Drift + locked exceptions | 3 | 50 | 1 (regression) | low |
| G: Tests | 6 | 595 | 8 (5u+3e2e) | medium |
| H: Polish + bootstrap | 2 | 310 | implicit | high |
| **TOTAL** | **25** | **~2330** (incl tests+CSS+HTML) | **8** | — |

**Source-only total** (excl tests, HTML, CSS, JSON, binary): **~1005** (matches proposal §13).

## Test count target

**8 test files** per design §13: 5 unit (event-bus TASK-018, archetypes TASK-019, integrity/score/best-score TASK-020) + 3 e2e (hit-detection TASK-021, deterministic-test-level TASK-022, menu-flow TASK-023). All 8 listed above and in the per-task "Tests" row.

## Open questions

**Zero.** Design §16 closed all 6 of proposal §11's open questions; user locked `dron_fumigador = tank` and full game-over menu in F3 on 2026-09-07.