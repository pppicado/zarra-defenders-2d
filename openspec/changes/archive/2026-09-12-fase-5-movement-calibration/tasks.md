# Tasks: fase-5-movement-calibration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180 (src/enemies.js ~120, src/main.js ~10, test file ~50) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | N/A |
| Decision needed before apply | No |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | osc + test auto-advance | PR 1 (single) | `node tests/e2e/enemy-movement.spec.mjs && node tests/e2e/hit-detection.spec.mjs` | http://localhost:8000/?test=1 + Chromium headless | revert restores linear advance + guards |

## Phase 1: RED — Failing tests (TDD strict)

- [ ] 1.1 **TASK-R1** — `tests/e2e/enemy-movement.spec.mjs`: assert `camion_treco` (zigzag) at `t=0` vs `t=3` has SAME isoX (no rail advance). Spawn with `api.spawnEnemy({...spriteId:'enemies_camion_treco'})`, snapshot isoX, advance 3 s of simulation, assert delta == 0.
- [ ] 1.2 **TASK-R2** — `tests/e2e/enemy-movement.spec.mjs`: assert `dron_fumigador` (sine) isoY oscillates around spawn. 60 ticks @ 16.67 ms; count sign flips of `isoY − spawnIsoY` ≥ 1; assert isoX locked to spawn.
- [ ] 1.3 **TASK-R3** — `tests/e2e/enemy-movement.spec.mjs`: assert `?test=1` `cameraTime > 0` after 1 s wait. `page.waitForTimeout(1000)` + `api.getCameraTime()`.
- [ ] 1.4 **TASK-R4** — `tests/e2e/enemy-movement.spec.mjs`: assert `e01` alive at `cameraTime=5`. `api.setTime(0)` → wait 5 s (auto-advance) → assert `enemies._enemies.get('e01')?.state === 'alive'`.
- [ ] 1.5 Run `node tests/e2e/enemy-movement.spec.mjs` — confirm RED.

## Phase 2: GREEN — Make tests pass

- [ ] 2.1 **TASK-G1** — `src/enemies.js`: refactor `Enemy.tick()` (L333-392). Remove `dx / dy` rail advance. `linear`: no self-motion. `sine`: `isoY = spawnIsoY + amp*sin(2π*speed*t)`, isoX locked. `zigzag`: isoY sign flip every period. `arc`: orbital around `_arcCenter`. Capture `_spawnIsoX` in ctor.
- [ ] 2.2 **TASK-G2** — `src/enemies.js`: recalibrate `MOBILE_DEFAULT` (L91-100) to oscillation rates (Hz / rad/s), range 0.0-1.5.
- [ ] 2.3 **TASK-G3** — `src/main.js`: remove `if (!inTestMode)` guards on `camera.update(dt)` (L380) and `enemies.update(...)` (L394-407). Unconditional calls.
- [ ] 2.4 Run `node tests/e2e/enemy-movement.spec.mjs` — confirm GREEN.
- [ ] 2.5 Run `node tests/e2e/hit-detection.spec.mjs` — confirm regression GREEN.

## Phase 3: REFACTOR

- [ ] 3.1 **TASK-X1** — `src/enemies.js`: comment block above `Enemy` ctor explaining pattern semantics (oscillation, no rail advance). Surface the design intent so future readers don't reintroduce the linear advance.
- [ ] 3.2 Re-run both spec files after each refactor step (must stay green).

## Phase 4: Verify + Archive

- [ ] 4.1 Playwright visual screenshot at `/tmp/opencode/verify-calibration.png` (mobile enemies visible mid-rail).
- [ ] 4.2 Write `verify-report.md`.
- [ ] 4.3 Sync delta spec to canonical spec.md (MODIFIED REQ-CMB-009 + ADDED REQ-CMB-012).
- [ ] 4.4 Mechanical move change folder to `openspec/changes/archive/2026-09-12-fase-5-movement-calibration/` with `diff -r` readback.
- [ ] 4.5 Write `archive-report.md`.
- [ ] 4.6 Commit 1: feat/fix code changes.
- [ ] 4.7 Commit 2: archive folder.
- [ ] 4.8 `git push origin main`.
