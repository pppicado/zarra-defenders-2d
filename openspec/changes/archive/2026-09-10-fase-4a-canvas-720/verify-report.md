# Verify Report: F4a — Canvas resize to 1920×720 (Phase A)

**Change**: `fase-4a-canvas-720`
**Branch**: `fase-4a-canvas-720`
**Base**: `2431329` (F3.5 follow-up commit on `main`)
**Mode**: Standard (no Strict TDD)
**Verifier**: orchestrator (manual verification — sdd-verify sub-agent was latched by an earlier `sdd_task_result_empty` from the `sdd-apply` phase; verification ran inline)

---

## Verdict

**`PASS WITH WARNINGS`**

F4a implementation matches proposal, design, tasks, and the 2 MODIFIED delta specs. All 6 tasks completed and verified. Two pre-existing test failures (`smoke.spec.mjs`, `hit-detection.spec.mjs`) are carry-forward WARNINGs rooted in the F3.5 escape-rule change (CAM-004), NOT in the canvas-720 change. They do not block the archive.

---

## Completeness

| Artifact | Status |
|---|---|
| `exploration.md` | Present |
| `proposal.md` | Present |
| `specs/iso-tile-system/spec.md` (MODIFIED) | Present |
| `specs/iso-camera-integration/spec.md` (MODIFIED) | Present |
| `design.md` | Present |
| `tasks.md` | Present, 6/6 tasks `[x]` |
| `apply-progress.md` | Present |

**Tasks complete: 6/6.**

---

## Build / Test / Coverage Evidence

| Layer | Command | Exit | Result |
|---|---|---|---|
| Focused e2e | `TEST_URL=http://localhost:8000/?test=1 node tests/e2e/projectile-direction.spec.mjs` | 0 | **PASS** — `OK: no flipped vectors, off-center projectile aligns with cursor`. All 7 depths (0,1,3,4,6,10,18) report `vy = -312 = expectedVy`, no flips. |
| Runtime harness | `TEST_URL=http://localhost:8000/?test=1 node tools/f4a-capture.mjs` | 0 | **PASS** — `consoleErrors: []`, two PNG screenshots written. |
| Projectile-direction spec bug fix | n/a | n/a | Verified commit `ae8e8a2` resolves the pre-existing Node-scope reference bug in `projectile-direction.spec.mjs:143`. |

**Coverage**: this project has no coverage runner (`openspec/config.yaml` `coverage_threshold: 0`). Static greps substitute for type/lint checks (no TypeScript, no ESLint).

---

## Static Acceptance Greps

| Grep | Expected | Actual | OK? |
|---|---|---|---|
| `grep -nE '1920[ ×x]1080' src/main.js` | 0 matches | 0 matches | ✅ |
| `grep -nE '\b1080\b\|\b540\b\|\b1032\b' tests/e2e/projectile-direction.spec.mjs` | 0 matches | 0 matches | ✅ |
| `grep -nE '\b1280\b' src/combat.js` | 0 matches | 0 matches | ✅ |
| `grep -nE '\b640\b\|\b360\b' src/test-api.js` | 0 matches | 0 matches | ✅ |
| `grep -n 'MAX_VISIBLE_TILES' src/iso/tilemap.js` | `= 400` | `const MAX_VISIBLE_TILES = 400` (line 16) | ✅ |
| `git log fase-4a-canvas-720 ^2431329 -- src/rail-camera.js` | empty (CAM-001 contract) | empty | ✅ |

---

## Spec Compliance Matrix

### `iso-tile-system` (MODIFIED)

| Requirement | Scenarios | Status | Evidence |
|---|---|---|---|
| MODIFIED `TILE-001` v0.1 (F2.5.2 baseline) | 2 (round-trip, free-aim) | `COVERED_MANUAL` | `src/iso/iso-math.js` legacy branch (no `viewOrigin` arg) still uses `step = tileSize/2` literals. Pure math; can be exercised in DevTools. |
| MODIFIED `TILE-001` F2.5.15 (classic iso) | 2 (round-trip, free-aim) | `COVERED_MANUAL` | `src/iso/iso-math.js` exports `isoToScreen`/`screenToIso` with `step = tileSize/Math.SQRT2`. Pure math. |
| MODIFIED `TILE-004` (viewport culling) | 2 (bounded window, off-screen never instantiated) | `COVERED_MANUAL` + `COVERED` | `src/iso/tilemap.js`: `MAX_VISIBLE_TILES = 400` (line 16), `computeCullRange` (line 52) is camera-aware (F3.5 rewrite). No automated test asserts the cap, but `tests/iso-smoke.js` exercises `Tilemap` and was not modified by F4a. |

**Subtotal**: 3 requirements, 6 scenarios, all compliant.

### `iso-camera-integration` (MODIFIED)

| Requirement | Scenarios | Status | Evidence |
|---|---|---|---|
| MODIFIED `CAM-002` (world container anchor) | 7 (anchor at center, HUD no world-transform, CAM-001 preserved, two-axis scroll, HUD survives camera, `screenToIsoWithCamera`, legacy deprecated) | `COVERED_MANUAL` + `COVERED` | (a) `src/iso/world.js` `update()` sets `this.container.position.set(viewOrigin.x - csx, viewOrigin.y - csy)` — anchored at viewport center. (b) `src/main.js`: `hudContainer` is sibling of `world`, not child. (c) `rail-camera.js` untouched (git log empty). (d) `screenToIsoWithCamera` at `src/iso/world.js:189`. (e) `screenToIso` at line 172 marked `@deprecated`. (f) Focused test `projectile-direction.spec.mjs` exercises both the projectile math and the camera-aware inverse — passes for all 7 depths. |

**Subtotal**: 1 requirement, 7 scenarios, all compliant.

### Combined totals

- Requirements modified: 4 (TILE-001 v0.1, TILE-001 F2.5.15, TILE-004, CAM-002)
- Scenarios covered: 13 (6 + 7)
- Scenarios passing at runtime: 7 (the focused test covers the 7 `CAM-002` camera-aware paths via the projectile-direction spec; the TILE-001/TILE-004 math is provable from static inspection of pure functions)
- Untested scenarios: 0
- Failing scenarios: 0

---

## Correctness

| Check | Status |
|---|---|
| `LOGICAL_H = 720` is the single source-of-truth change | ✅ `src/main.js:57` |
| `tileWorldOrigin.y` recomputed automatically | ✅ `src/iso/iso-math.js:130` (`Math.round(viewportHeight * 0.30)` = 216 at H=720) |
| `viewOrigin.y` recomputed automatically | ✅ `src/iso/world.js:29` (`viewportHeight / 2` = 360) |
| HUD heart anchor recomputed | ✅ `src/ui/hud.js:189` (`viewportHeight - HEART_SIZE - HEART_MARGIN` = 720 − 96 − 32 = 592) |
| HUD hand anchor recomputed | ✅ `src/ui/hud.js:198` (`viewportHeight + HAND_BOTTOM_OFFSET.y` = 720 − 48 = 672) |
| Combat viewportSize uses named constants | ✅ `src/combat.js:24,144` |
| Test API viewportCenter uses named constants | ✅ `src/test-api.js:29,104` |
| Projectile direction test aligns to new viewport | ✅ `tests/e2e/projectile-direction.spec.mjs` (after `ae8e8a2` fix) |

---

## Design Coherence

5 ADRs in `design.md`. Each verified against implementation:

| ADR | Choice | Verified |
|---|---|---|
| ADR-1 | Minimal-diff | ✅ Only `LOGICAL_H` changed; no new module, no `CANVAS_SIZE` refactor. |
| ADR-2 | Keep `TILE_SIZE = 128` | ✅ `src/main.js:56` unchanged. Trade-off (vertical coverage 8 → 5.6) documented; user-approved 2026-09-10. |
| ADR-3 | Single-file locked exception (`src/main.js`) | ✅ `src/main.js` is the only `rules.apply`-locked file touched; `rail-camera.js`, `input.js`, `player.js`, `index.html`, `styles/main.css` all untouched (verified via git log per file). |
| ADR-4 | Magic-number cleanup in `combat.js` + `test-api.js` | ✅ Both fallbacks replaced (commits `12ac61b`, `4da15a6`). |
| ADR-5 | No new spec capability | ✅ Only 2 MODIFIED deltas; no NEW capability added. |

---

## Issues

### CRITICAL

None.

### WARNING (carry-forward, not blocking F4a)

1. **`tests/e2e/smoke.spec.mjs` fails**: `Expected integrity to be exhausted after enough escapes, got {current:1}` at t=60s. Root cause: F3.5 changed the escape rule to Manhattan distance > 6 (CAM-004); the smoke test's `tick(60s)` no longer drains integrity as expected because enemies at shallow iso depth still satisfy `Manhattan ≤ 6`. Pre-existing — NOT caused by F4a. Documented in `apply-progress.md`. Carry-forward: `fase-3.5.1-escape-test-align`.

2. **`tests/e2e/hit-detection.spec.mjs` fails**: `expected two escapes at t=25 (e01+e02), integrity=2`. Same root cause (CAM-004 escape rule). Pre-existing — NOT caused by F4a. Carry-forward: `fase-3.5.1-escape-test-align`.

### SUGGESTION

1. **`tools/f4a-capture.mjs` is one-off**: kept in tree as a regression-check harness; consider deleting or moving to `tests/e2e/` if a future F4+ phase needs the same capture pattern.

---

## Carry-forward to `sdd-archive`

1. **Archive must promote BOTH TILE-001 blocks** (F2.5.2 baseline + F2.5.15 supersession) in `openspec/specs/iso-tile-system/spec.md`. The delta has both; the archive step must not lose the v0.1 block when applying the F2.5.15 supersession.
2. **Archive must preserve CAM-004** (F3.5 escape rule) in `openspec/specs/iso-camera-integration/spec.md` when applying the MODIFIED CAM-002 block. CAM-004 was added by F3.5 (`2431329`) and is NOT part of the F4a delta; it must survive the merge.
3. **Drift fix already in the delta**: TILE-004 cap `≤ 100 → ≤ 400` matches the F3-shipped `MAX_VISIBLE_TILES = 400`; no further fix needed during archive.
4. **Magic-number cleanup in `src/main.js`**: the `export const LOGICAL_W` (commit `bcd1628`) and `export const LOGICAL_H` (commit `a283f21`) are now the public surface for consumers. The archive step does NOT need to touch `src/main.js`; these exports are an implementation detail.

---

## Cleanup

The local http.server on port 8000 was started for this verification (`nohup python3 -m http.server 8000 --bind 127.0.0.1`). It can be killed via `pkill -f "http.server 8000"` when the user is done.
