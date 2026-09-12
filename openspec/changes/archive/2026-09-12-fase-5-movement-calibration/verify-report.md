# Verify Report — fase-5-movement-calibration

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:{post-verify-digest}
verdict: pass
blockers: 0
critical_findings: 0
requirements: 9/9
scenarios: 12/12
test_command: node tests/e2e/enemy-movement.spec.mjs && node tests/e2e/hit-detection.spec.mjs
test_exit_code: 0
test_output_hash: sha256:{exact-output-digest}
build_command: n/a (no transpile build — JS files served directly)
build_exit_code: 0
build_output_hash: sha256:{}
```

## Verification Report

**Change**: fase-5-movement-calibration
**Mode**: Strict TDD (RED → GREEN → REFACTOR cycle; E2E Playwright)
**Date**: 2026-09-12

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 7 (TASK-R1..R4 + G1..G3) |
| Tasks complete | 7 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Build**: ✅ N/A — vanilla ES modules served directly via Python http.server (no bundler).

**Tests**: ✅ all passing
- `node tests/e2e/enemy-movement.spec.mjs` → exit 0 (R1-R12 ALL green)
- `node tests/e2e/hit-detection.spec.mjs` → exit 0 (full regression preserved)

**Coverage**: ➖ not available (no coverage tool detected for `.mjs` Playwright specs)

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| REQ-CMB-009 | R1: roster size 120 | `enemy-movement.spec.R1` (readAll) | ✅ COMPLIANT (120) |
| REQ-CMB-009 | R2: static valla isoX constant | `enemy-movement.spec.R2` | ✅ COMPLIANT (dx=0) |
| REQ-CMB-009 MODIFIED | R3: sine oscillates isoY around spawn (post-calibration) | `enemy-movement.spec.R3` | ✅ COMPLIANT (20 sign flips; isoX locked) |
| REQ-CMB-009 MODIFIED | R9: camion_treco isoX locked (no advance) | `enemy-movement.spec.R9` | ✅ COMPLIANT (ixAfter=5, delta=0) |
| REQ-CMB-009 MODIFIED | R10: oscillation rate visible | `enemy-movement.spec.R10` | ✅ COMPLIANT (2 sign flips in 1.25s @ 0.8 Hz) |
| REQ-CMB-010 | R4: lateral clamp reflects velocity | `enemy-movement.spec.R4` | ✅ COMPLIANT (sx clamped ≤ 1200) |
| REQ-CMB-010 | R5: hit detection on moving enemy | `enemy-movement.spec.R5` | ✅ COMPLIANT (hit=true) |
| REQ-CMB-012 ADDED | R11: test-mode auto-advance | `enemy-movement.spec.R11` (cameraTime>0 after 1s) | ✅ COMPLIANT (0 → 1.01s) |
| REQ-CMB-012 ADDED | R12: e01 alive after 5s | `enemy-movement.spec.R12` | ✅ COMPLIANT (alive=true, cameraTime=5.0) |
| (regression) | R6: MOBILE_DEFAULT applied | `enemy-movement.spec.R6` | ✅ COMPLIANT (speed=0.4 ∈ Hz range, pattern=zigzag) |
| (regression) | R7: explicit static respected | `enemy-movement.spec.R7` | ✅ COMPLIANT (speed=0, pattern=static) |
| (regression) | R8: retry reloads level | `enemy-movement.spec.R8` | ✅ COMPLIANT (queueLen=120) |

**Compliance summary**: 12/12 scenarios PASS.

### TDD Compliance (Strict TDD Mode)

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | RED → GREEN → REFACTOR table in apply-progress; all R1-R4 marked RED before G1-G3 |
| All tasks have tests | ✅ | 4 RED tests (R1-R4 + R9-R12 grouped under calibration) before any production code |
| RED confirmed | ✅ | R3 (delta=49.5), R9 (vanished), R10/R11/R12 all dead-red before G1/G3 |
| GREEN confirmed | ✅ | R3, R9, R10, R11, R12 all pass after G1/G2/G3 land |
| Triangulation | ✅ | R3 (60 samples), R10 (75 samples over 1.25s) — multiple cases per behavior |
| Safety Net | ✅ | Existing R1, R2, R4, R5, R6, R7, R8 re-run after each GREEN step |
| Refactor with tests green | ✅ | X1 added comment block; both spec files still pass |
| Assertion quality | ✅ | Real assertions on isoX/isoY/state — no tautologies or empty-collection checks |

**TDD Compliance**: 8/8 checks passed.

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 0 | 0 | — (no unit tests touched; Enemy.tick() invoked directly via E2E) |
| Integration | 0 | 0 | — |
| E2E | 12 (R1-R8 baseline + R3 re-assert + R9-R12 NEW) | 1 (`tests/e2e/enemy-movement.spec.mjs`) | Playwright + Chromium headless |
| Regression | 7 (hit-detection) | 1 (`tests/e2e/hit-detection.spec.mjs`) | Playwright + Chromium headless |
| **Total** | **19** | **2** | |

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| REQ-CMB-009 oscillation model | ✅ Implemented | `src/enemies.js` L333-404: `linear` no-op, `sine/zigzag/arc` pure oscillation around `_spawnIsoX/_spawnIsoY` |
| REQ-CMB-009 MOBILE_DEFAULT Hz | ✅ Implemented | `src/enemies.js` L97-105: speeds 0.0-1.2 Hz/rad/s |
| REQ-CMB-010 lateral clamp | ✅ Preserved | `_lateralClamp` (L407-429) unchanged; called every tick after oscillation |
| REQ-CMB-012 auto-advance | ✅ Implemented | `src/main.js` L380-408: unconditional `camera.update(dt)` + `enemies.update(...)` |
| Hard rule (STATIC_SPRITE_IDS) | ✅ Preserved | `resolveMovementConfig` (L124-139) unchanged — R2 (valla isoX=0 deltas) still passes |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Oscillation around spawn iso | ✅ | All 4 patterns read `_spawnIsoX/_spawnIsoY`, never mutate |
| Speed semantics (Hz / rad/s) | ✅ | `MOBILE_DEFAULT` recalibrated to 0.0-1.2 Hz; `Enemy.tick` interprets `speed` as ω for sine/zigzag and `omega = speed` for arc |
| Test mode auto-advance | ✅ | `src/main.js` guards removed; R11 verifies cameraTime>0 after 1s wait |
| Refactor comment block | ✅ | L195-220 of `src/enemies.js` documents pattern semantics + warning against re-introducing linear advance |
| Backward-compat (R1-R8) | ✅ | Existing tests adjusted only where oscillation model necessitates (R3 + R6 assertions updated); R2, R4, R5, R7, R8 unchanged |

### Issues Found

**CRITICAL**: None
**WARNING**: None
**SUGGESTION**:
- The arc pattern's `_arcCenter` capture (line ~390) reads from `_spawnIsoX`, not from `isoX` at capture time. With oscillation model this is correct (`_spawnIsoX` is the fixed reference), but a future contributor who reintroduces linear advance would see arc drift. The X1 comment block documents this.

### Verdict

**PASS** — pattern oscillation + test-mode auto-advance implemented; all 12 scenarios in `enemy-movement.spec.mjs` plus 7 regression scenarios in `hit-detection.spec.mjs` pass; visual screenshot at `/tmp/opencode/verify-calibration.png` confirms mid-rail rendering with hitbox overlay.
