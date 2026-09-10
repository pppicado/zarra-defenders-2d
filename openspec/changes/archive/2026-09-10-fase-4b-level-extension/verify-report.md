# Verify Report: F4b — Level extension (Phase B)

**Change**: `fase-4b-level-extension`
**Branch**: `fase-4b-level-extension`
**Base**: `23d9ccf` (F4a merged to main)
**Mode**: Standard (no Strict TDD)
**Verifier**: orchestrator (inline — sdd-verify sub-agent was latched from the original sdd-apply failure)

---

## Verdict

**`PASS WITH WARNINGS`** — F4b implementation matches proposal, design, tasks. All 6 tasks complete. Two pre-existing F3.5 carry-forward failures (`smoke.spec.mjs`, `hit-detection.spec.mjs`) remain; F4b does not regress them.

---

## Completeness

| Artifact | Status |
|---|---|
| `exploration.md` | Present |
| `proposal.md` | Present |
| `specs/no-op-delta.md` | Present (explicitly empty MODIFIED lists for both `iso-tile-system` and `iso-camera-integration`) |
| `design.md` | Present |
| `tasks.md` | Present, 6/6 tasks completed in commit `6db7441` |
| `apply-progress.md` | Present |

**Tasks complete: 6/6.**

---

## Build / Test / Coverage Evidence

| Layer | Command | Exit | Result |
|---|---|---|---|
| Focused unit | `node -e "import('./src/levels/test-level.js').then(m => m.assertTestLevel())"` | 0 | **PASS** — `OK: 24 enemies, composition OK`. e01 depth 5 → t=0; e24 depth 71 → t=110 (matches proposal's `((71 - 5) / 72) * 120`). |
| Regression e2e | `TEST_URL=http://localhost:8000/?test=1 node tests/e2e/projectile-direction.spec.mjs` | 0 | **PASS** — `OK: no flipped vectors, off-center projectile aligns with cursor`. Rail length independence confirmed. |
| Unit pin | `node tests/unit/archetypes.spec.mjs` | 0 | **PASS** — 11 tests pass, 0 skipped, 0 todo, 35.9 ms. ARCHETYPES table unchanged. |
| Runtime harness | `TEST_URL=http://localhost:8000/?test=1 node tools/f4b-capture.mjs` | 0 | **PASS** — `consoleErrors: []`, 3 PNG screenshots (`f4b-t00-boot.png`, `f4b-t60-mid.png`, `f4b-t120-rail-end.png`). |

**Coverage**: this project has no coverage runner (`openspec/config.yaml` `coverage_threshold: 0`). Static greps + manual visual inspection substitute.

---

## Spec Compliance Matrix

F4b's `specs/no-op-delta.md` explicitly states no MODIFIED requirements for `iso-tile-system` or `iso-camera-integration`. The verification confirms this:

| Capability | Modified? | Evidence |
|---|---|---|
| `iso-tile-system` (TILE-001, TILE-002, TILE-003, TILE-004, TILE-005) | NO | `MAX_VISIBLE_TILES = 400` (line 16 of `src/iso/tilemap.js`) unchanged; `computeCullRange` is length-agnostic; worst-case viewport+overshoot at new rail is ~192 tiles (cap 400 has headroom). |
| `iso-camera-integration` (CAM-001, CAM-002, CAM-003, CAM-004) | NO | CAM-004 escape rule is `\|ex - cx\| + \|ey - cy\| > 6` (Manhattan distance, length-independent). CAM-002 anchor math is viewport-derived (unchanged by rail length). CAM-001 monotonic-depth invariant still holds (rail is linear). CAM-003 stage transitions unchanged (single stage used). |

**No spec scenario is regressed by F4b.** All F4a-promoted scenarios (CAM-002 viewport literals at 1920×720, TILE-004 cap=400, TILE-001×2 viewport literals) continue to hold.

**Subtotal**: 0 requirements modified, 0 scenarios changed.

---

## Correctness

| Check | Status |
|---|---|
| `TEST_LEVEL.railEndTime === 120` | ✅ |
| `TEST_LEVEL.railPath.length === 2` and sums to depth 72 | ✅ |
| `TEST_LEVEL.enemies.length === 24` | ✅ |
| Composition: 16 standard + 4 tank + 2 mini-boss + 2 boss | ✅ |
| `_spawnTimeFromDepth(5) === 0` and `_spawnTimeFromDepth(71) === 110` (within ±1s) | ✅ |
| `assertTestLevel()` passes | ✅ |
| No locked files touched (`src/{rail-camera,input,player}.js`, `index.html`, `styles/main.css`) | ✅ (verified via `git log fase-4b-level-extension ^23d9ccf -- src/rail-camera.js src/input.js src/player.js index.html styles/main.css` returns empty) |
| `tools/f4b-capture.mjs` captures 3 PNGs at t=0, t=60, t=120 | ✅ |
| Zero `console.error` during the 120 s boot under `?test=1` | ✅ |

---

## Design Coherence

5 ADRs in `design.md`. Each verified against implementation:

| ADR | Choice | Verified |
|---|---|---|
| ADR-1 | 2× depth rail extension (depth 72 over 120 s) | ✅ `railEndTime=120`, `railPath` sums to 72. |
| ADR-2 | Keep `TILE_SIZE = 128` | ✅ `src/main.js:56` unchanged. |
| ADR-3 | 16+4+2+2=24 enemy composition | ✅ `assertTestLevel()` validates. |
| ADR-4 | Linear rail (no multi-waypoint) | ✅ `railPath` has 2 waypoints, single segment. |
| ADR-5 | No locked-file exceptions | ✅ `git log` confirms only `test-level.js` + `hit-detection.spec.mjs` + new `tools/f4b-capture.mjs` modified. |
| ADR-6 | `MAX_VISIBLE_TILES = 400` | ✅ `src/iso/tilemap.js:16` unchanged. |

---

## Issues

### CRITICAL

None.

### WARNING (carry-forward, not blocking F4b)

1. **`tests/e2e/smoke.spec.mjs` fails**: pre-existing F3.5 CAM-004 escape rule drift. Documented in F4a archive (`openspec/changes/archive/2026-09-10-fase-4a-canvas-720/`). Not regressed by F4b.

2. **`tests/e2e/hit-detection.spec.mjs` second assertion fails** (`expected two escapes at t=25 (e01+e02), integrity=2`): pre-existing F3.5 escape rule drift. F4b only updated the header comment (line 12); the assertions on `e01` (depth 5) and `e02` (depth 8) remain correct under Manhattan-distance rule but the test was authored against the prior depth-based rule. Not regressed by F4b.

### SUGGESTION

1. **`tools/f4b-capture.mjs`** mirrors `tools/f4a-capture.mjs`. Both could be consolidated into a single `tools/capture.mjs` parameterized by change-id (`f4a` / `f4b`) and capture points. Optional follow-up.

---

## Carry-forward to `sdd-archive`

1. **No spec merges needed** — both `iso-tile-system` and `iso-camera-integration` are unchanged by F4b.
2. **Branch is ready for merge to `main`**: single commit `6db7441` + this verify-report + 3 PNGs + apply-progress.
3. **`openspec/specs/README.md`** does not need updating — the "Last change" column for both spec files remains F4a.

---

## Cleanup

The local http.server on port 8000 was started for this verification (`nohup python3 -m http.server 8000 --bind 127.0.0.1`). It can be killed via `pkill -f "http.server 8000"` when the user is done.
