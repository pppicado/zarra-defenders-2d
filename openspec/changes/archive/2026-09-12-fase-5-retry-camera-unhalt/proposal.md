# Proposal: fase-5-retry-camera-unhalt

## Intent

After clicking `Reintentar test level` (game-over overlay), the camera stays halted → tile scroll does not advance → game is frozen.

## Root cause (verified via Playwright debug)

When the player loses all 3 lives:
1. `integrity.drain()` reaches 0 → `integrity:exhausted` event fires
2. The overlay's listener calls `this.camera.halt()` setting `camera.isHalted = true`
3. Player clicks `Reintentar` → `bootTestLevel:request` event fires
4. main.js `bootTestLevel()` runs: `camera.setTime(0)`, `enemies.reset()`, `enemies.loadLevel(...)`, etc.
5. **`camera.unHalt()` is NEVER called** — the camera remains halted
6. Production ticker still runs each frame, but `camera.update(dt)` checks `isHalted` and returns early without advancing time
7. **`enemies.update()` reads `elapsedSec = camera.getTime()` = 0**, so no time-gated spawns fire, no movement patterns tick
8. Same enemy snapshot stays on screen forever, no scroll, no new spawns

## Scope

### In Scope
- `src/main.js`: Add `camera.unHalt()` to `bootTestLevel()` after `camera.setTime(0)`
- `src/main.js`: Verify that integrity is also unfrozen (the existing `integrity.reset()` should handle this — check the implementation)
- `tests/e2e/enemy-movement.spec.mjs` (or new `tests/e2e/retry.spec.mjs`): Add RED test that fails before the fix:
  - Boot test mode
  - Force game over (integrity.drain × 3)
  - Click Reintentar
  - Verify camera advances after 2s (cameraTime > 1.0)

### Out of Scope
- Other reset paths (menu:back already unhalted in overlay._onBack)
- New game-over overlay UX

## Approach

Minimal fix in `bootTestLevel`:

```js
async function bootTestLevel(ctx) {
  if (combat) { combat.reset() }
  enemies.reset()
  integrity.reset()
  score.reset()
  // REQ-CMB-013: ensure camera is unfrozen after retry (was halted by game-over)
  if (camera.unHalt) camera.unHalt()
  camera.setTime(0)
  ...
}
```

Add REQ-CMB-013 to canonical combat-core spec: "After Reintentar, camera MUST be unHalted and ready to advance; verify integrity.frozen() is false before resuming ticker."

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/main.js` | Modified | bootTestLevel adds camera.unHalt() |
| `tests/e2e/enemy-movement.spec.mjs` | Modified | Add R13 scenario for retry-unhalts-camera |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `camera.unHalt` doesn't exist on the rail-camera class | Low | Verified by grep — rail-camera.js has `unHalt()` since F3 |
| Tests rely on halted camera after game over | None | The retry path is the only production flow that unhalts |
| integrity.reset() doesn't unfreeze | Low | Already called before unHalt; check by reading src/integrity.js |

## Rollback Plan

Single `git revert <merge-commit>`:
- Restores bootTestLevel without camera.unHalt()
- Reverts test additions

## Success Criteria

- [ ] `?test=1`: force game over, click Reintentar → camera advances within 1s
- [ ] Production: same flow works
- [ ] All existing tests still pass
- [ ] Verify with Playwright that `cameraHalted` flag is false after retry
