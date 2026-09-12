# Tasks: fase-5-retry-camera-unhalt

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~30 (1-line production fix + 35-line test + spec delta) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Unhalt camera on retry + regression test | PR 1 | `node tests/e2e/enemy-movement.spec.mjs` | Playwright headless against http://localhost:8000/?test=1 | `src/main.js` `bootTestLevel` body — 1-line revert |

## Phase 1: RED — failing test

- [ ] 1.1 Add `runR13_RetryUnhaltsCamera(page)` to `tests/e2e/enemy-movement.spec.mjs` (drives the user flow: boot → drain×3 → click retry → assert camera.isHalted() === false && camera.getTime() >= 1.0 after a 2 s wait)
- [ ] 1.2 Wire `runR13_RetryUnhaltsCamera(page)` into `runEnemyMovementSpec` (call it after R12; throw on failure)
- [ ] 1.3 Confirm RED: run `node tests/e2e/enemy-movement.spec.mjs` and observe the script exits with code 1 + error message naming R13

## Phase 2: GREEN — minimal production fix

- [ ] 2.1 In `src/main.js` `bootTestLevel`, insert `if (camera.unHalt) camera.unHalt()` BEFORE `camera.setTime(0)`
- [ ] 2.2 Confirm GREEN: re-run `node tests/e2e/enemy-movement.spec.mjs` and observe exit code 0

## Phase 3: Regression + verify

- [ ] 3.1 Run `node tests/e2e/hit-detection.spec.mjs` (regression green)
- [ ] 3.2 Take screenshot `verify-unhalt.png` at `/tmp/opencode/verify-unhalt.png` with retry-flow state captured at `t > 1.5s` after retry

## Phase 4: Archive + commit

- [ ] 4.1 Sync REQ-CMB-013 into canonical `openspec/specs/combat-core/spec.md`
- [ ] 4.2 Move change folder `openspec/changes/fase-5-retry-camera-unhalt` → `openspec/changes/archive/2026-09-12-fase-5-retry-camera-unhalt` (today's date)
- [ ] 4.3 `diff -r` readback (must be empty diff)
- [ ] 4.4 Write `openspec/changes/archive/2026-09-12-fase-5-retry-camera-unhalt/archive-report.md`
- [ ] 4.5 Commit 1: `fix(retry): unhalt camera after Reintentar so tile scroll resumes` (source + spec + test)
- [ ] 4.6 Commit 2: `archive(fase-5-retry-camera-unhalt): chronicle camera-unhalt SDD cycle` (archive folder)
- [ ] 4.7 `git push origin main`
