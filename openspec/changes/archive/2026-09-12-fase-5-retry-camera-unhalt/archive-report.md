# Archive Report — fase-5-retry-camera-unhalt

**Change**: fase-5-retry-camera-unhalt
**Closed**: 2026-09-12
**Owner**: gentle-ai SDD cycle
**Status**: COMPLETE — all 7 SDD phases passed, TDD evidence captured, single PR shipped to `main`.

## Goal

Eliminate the post-`Reintentar` frozen-camera bug: after the player lost all
3 lives and clicked `Reintentar test level`, the production ticker stopped
advancing the camera because `bootTestLevel` called `camera.setTime(0)` but
never `camera.unHalt()`. Result was an unmoving tile scroll and a "frozen
game" UX.

## Instructions

Strict TDD (RED → GREEN → VERIFY) per house rules; production fix must NOT
touch test infrastructure; archival after the diff -r empty-readback of the
change folder.

## Discoveries

- `RailCamera.unHalt()` already existed at `src/rail-camera.js:74` — the
  F5 layer already had the primitive, the bug was purely a missed call site
  inside `bootTestLevel`.
- `Integrity.reset()` already clears `_frozen` at `src/integrity.js:73` —
  REQ-CMB-013's integrity half is automatically satisfied by the existing
  reset call (no source change needed for integrity).
- `__gameTestAPI__.reset()` already calls `camera.unHalt()` at
  `src/test-api.js:176`. That is why previous regression tests didn't
  notice the production bug — tests were cleaning up the camera through the
  test-api helper before exercising retry paths. The R13 scenario now
  forces the production click flow WITHOUT calling `reset()`.

## Accomplished

- ✅ Phase 1 — SPEC delta with REQ-CMB-013 + 4 scenarios
- ✅ Phase 2 — DESIGN (architecture decisions + data flow + threat-matrix N/A)
- ✅ Phase 3 — TASKS TDD-strict (Phase 1 RED, Phase 2 GREEN, Phase 3 verify)
- ✅ Phase 4 — APPLY: RED test added → confirmed exit 1 → 1-line fix in
  `src/main.js` `bootTestLevel` → GREEN (exit 0)
- ✅ Phase 5 — VERIFY: `enemy-movement.spec.mjs` exit 0, `hit-detection.spec.mjs`
  exit 0, screenshot `/tmp/opencode/verify-unhalt.png` shows post-retry state
  at `t = 2.06 s`
- ✅ Phase 6 — ARCHIVE: change folder moved to
  `openspec/changes/archive/2026-09-12-fase-5-retry-camera-unhalt`,
  `diff -r` readback was EMPTY (passing evidence), REQ-CMB-013 promoted to
  canonical `openspec/specs/combat-core/spec.md`
- ✅ Phase 7 — 2 commits pushed to `origin/main`

## TDD Evidence

| Phase | State | Test | Exit | Evidence |
|-------|-------|------|------|----------|
| Before fix | RED | `runR13_RetryUnhaltsCamera` | 1 | `FAIL TASK-R13: camera still halted after Reintentar` |
| After fix | GREEN | `runR13_RetryUnhaltsCamera` | 0 | `cameraTime: 2.0527…, halted: false, integrityFresh: true` |
| After fix | GREEN | `runEnemyMovementSpec` (full) | 0 | All R1–R13 passed |
| After fix | GREEN | `runHitDetectionSpec` (regression) | 0 | All hit-detection scenarios passed |

## Next Steps

None. The change closed cleanly. Future enhancements (alternate reset
paths, dedicated `_onRetry` instrumentation) are out of scope per
`proposal.md`.

## Relevant Files

- `src/main.js` — `bootTestLevel` now calls `camera.unHalt()` before `setTime(0)`
- `tests/e2e/enemy-movement.spec.mjs` — added `runR13_RetryUnhaltsCamera(page)`
- `openspec/specs/combat-core/spec.md` — REQ-CMB-013 promoted to canonical
- `openspec/changes/archive/2026-09-12-fase-5-retry-camera-unhalt/` —
  proposal + design + tasks + delta spec archived
