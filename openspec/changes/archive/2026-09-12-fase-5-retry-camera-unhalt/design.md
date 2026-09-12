# Design: fase-5-retry-camera-unhalt

## Technical Approach

The root cause is in `src/main.js`'s `bootTestLevel`: it calls `camera.setTime(0)`
but never `camera.unHalt()`, so the camera stays frozen (REQ-CMB-013 gap).
Fix is a 1-line addition to `bootTestLevel` plus an RED regression test.

`integrity.reset()` already does `this._frozen = false` (verified at
`src/integrity.js:73`), so the integrity half of REQ-CMB-013 is **already
satisfied** by the existing reset call. We verify that with the spec scenario
and add an explicit `frozen` reader only if a future test needs it; for now
the canonical proof is "drain after retry returns `{current: 2}`".

## Architecture Decisions

### Decision: UnHalt inside `bootTestLevel`, not in the overlay

**Choice**: Add `if (camera.unHalt) camera.unHalt()` inside `bootTestLevel`
BEFORE `camera.setTime(0)`.
**Alternatives considered**: (a) unhalt in `Overlay._onRetry` directly —
rejected: REQ-CMB-011 mandates the overlay stays UI-only and emits
`bootTestLevel:request`. (b) unhalt in the `bootTestLevel:request` listener
in `main.js` — rejected: the existing listener just delegates to
`bootTestLevel`, so any reset-state logic belongs inside the function being
called from multiple paths (test-mode boot, menu:startRequested,
bootTestLevel:request).
**Rationale**: Single source of truth — every code path that re-enters
gameplay goes through the same reset function.

### Decision: Guard `unHalt` with `if (camera.unHalt)`

**Choice**: `if (camera.unHalt) camera.unHalt()`.
**Rationale**: Defensive — graceful if a future test stub swaps in a camera
without the method. F5 already uses the same pattern for `if (camera.unHalt) camera.unHalt()`
in `test-api.js:176`.

## Data Flow

```
integrity.drain() × 3 → integrity:exhausted
   ↓
overlay listener → camera.halt()  + integrity.freeze()
   ↓
[overlay visible — camera halted]
   ↓ user clicks Reintentar
Overlay._onRetry → emit('bootTestLevel:request')
   ↓
main.js listener → bootTestLevel(ctx)
   ├─ if (combat) combat.reset()
   ├─ enemies.reset()
   ├─ integrity.reset()        ← already clears _frozen
   ├─ score.reset()
   ├─ ** camera.unHalt() **   ← NEW: one-liner fix
   ├─ camera.setTime(0)
   ├─ enemies.loadLevel(...)
   └─ gameState.state = 'gameplay'
   ↓
production ticker → camera.update(dt)   ← no longer early-returns
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/main.js` | Modify | Insert `if (camera.unHalt) camera.unHalt()` in `bootTestLevel` between `score.reset()` and `camera.setTime(0)` |
| `tests/e2e/enemy-movement.spec.mjs` | Modify | Add `runR13_RetryUnhaltsCamera(page)` and call it in `runEnemyMovementSpec` |

## Interfaces / Contracts

No new interfaces. `RailCamera.unHalt()` exists at `src/rail-camera.js:74`
(verified). `Integrity.reset()` already sets `_frozen = false` at
`src/integrity.js:73` (verified — no change).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | n/a | All state lives in Pixi-coupled modules; e2e is the right layer |
| E2E | Boot, force game-over, click retry, assert camera not halted and advances | TDD-RED via `runR13_RetryUnhaltsCamera` in `tests/e2e/enemy-movement.spec.mjs` |
| Regression | `hit-detection.spec.mjs` + `enemy-movement.spec.mjs` | Both already exist; rerun after fix to ensure no collateral |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary touched. This is a 1-line
JS guard + a Playwright assertion.

## Migration / Rollout

No migration required. The fix is unconditional; the guarded `if
(camera.unHalt)` ensures production remains a no-op if the method is absent.

## Open Questions

None.
