# Design: fase-5-movement-calibration

## Technical Approach

Refactor `Enemy.tick()` to OSCILLATE around the captured spawn iso position (no
rail-direction advance), recalibrate `MOBILE_DEFAULT` to oscillation rates (Hz /
rad/s), and remove the `if (!inTestMode)` guards from `main.js` so test mode
auto-advances camera and enemies every frame. Existing R1-R8 tests are
preserved by adjusting expectations to oscillation behavior (no linear advance,
speed semantics shift from "iso-units/sec" to "Hz / rad/s").

## Architecture Decisions

### Decision: OSCILLATION around spawn iso (no linear advance)

**Choice**: All mobile patterns read `this._spawnIsoX / this._spawnIsoY` (captured
at construction) and apply deviations around that fixed point. `_elapsedMs` is the
sole time parameter; `_spawnIsoX / _spawnIsoY` is never mutated by `Enemy.tick()`.

**Alternatives considered**:
- Keep linear advance but clamp `dx / dy` to ≤ camera speed (0.6 tile/s).
  Rejected: amplitude still drifts, requiring constant escape clamp; the
  iso-distance escape test fires any time the enemy lags by >6 tiles.
- Decay `speed` over time (mobile enemies slow to match camera).
  Rejected: visually misleading (drons slow down randomly); fails the
  "player must shoot" success criterion.

**Rationale**: Oscillation decouples self-motion from rail direction. The camera
is the only actor that translates along `(1,1)/√2`; mobile enemies stay inside
the camera's column indefinitely. Pattern amplitudes (±0.3-0.5 iso tiles) are
small enough to never trip the 80 px lateral clamp and large enough to be
visually obvious at 60 fps.

### Decision: Speed semantics = oscillation rate (Hz / rad/s)

**Choice**: `speed` parameter is reinterpreted per pattern:
- `sine` / `zigzag`: oscillation frequency in Hz (cycles per second)
- `arc`: rotational rate in rad/s (omega)
- `linear`: ignored (motion = camera)
- `static`: ignored

`MOBILE_DEFAULT` is recalibrated to these ranges (0.0-1.5 Hz for sine/zigzag,
0-1.0 rad/s for arc). Existing linear-velocity values (25-70) are NO LONGER
in the table.

**Alternatives considered**:
- Keep speed as linear velocity, compute oscillation amplitude as `speed /
  camera_speed` × 0.5. Rejected: coupling to camera makes oscillation
  viewport-dependent and breaks the "Hz" mental model.
- Two-field config (`speed` for advance, `oscillationRate` for sway). Rejected:
  doubles the surface area; old tests break in unexpected ways.

**Rationale**: Hz is the standard physics unit for periodic motion. Tests that
asserted `speed > 30` (e.g. R6) need to be updated to `speed > 0 && speed < 2`,
which is the new oscillation regime. The shape (positive finite number, not
zero) is preserved.

### Decision: Test mode auto-advance

**Choice**: Remove the two `if (!inTestMode)` guards around `camera.update(dt)`
and `enemies.update(...)` in `main.js`. The production ticker then drives both
in test mode and production identically. The test-api's
`__gameTestAPI__.tick(dt)` continues to work — it delegates to the same code
path via `enemies.update(...)`, so manual ticks and auto-advance compose
harmoniously.

**Alternatives considered**:
- Drive auto-advance from a `setInterval(16.67)` set only in test mode.
  Rejected: PIXI's `app.ticker` is the production frame source; running a
  parallel setInterval drifts out of sync with `dt`-based game state.
- Add a `inTestMode ? 16.67 : dt` switch like the proposal's draft.
  Rejected: 16.67 ms is just `dt` at 60 fps; using the real `dt` is
  equivalent at 60 fps and more correct when the page is backgrounded.

**Rationale**: Identical ticker for test and prod removes a class of
"looks different in test mode vs production" bugs. The `__gameTestAPI__`
introspection surface still gives tests deterministic levers (`setTime`,
`advanceCameraTo`, `tick`). The `bootLevel` helper remains the cycle reset.

## Data Flow

```
boot() → bootTestLevel()
  ├─ enemies.reset() + loadLevel(TEST_LEVEL.enemies)
  │   for each def:
  │     └─ spawn(def) → new Enemy(def) → resolveMovementConfig → MOBILE_DEFAULT
  │                     → this._spawnIsoX = def.isoX, _spawnIsoY = def.isoY
  └─ ticker loop (60 fps):
      ├─ camera.update(dt)               ← UNCONDITIONAL (was if !inTestMode)
      ├─ enemies.update(dt*1000, camIso, elapsedSec, isoWorld, vc, vs, bounds)
      │   for each live enemy:
      │     └─ enemy.tick(dtMs, cameraIso, bounds, isoWorld, vc)
      │         ├─ this._elapsedMs += dtMs
      │         ├─ sine: isoY = spawnIsoY + amp*sin(2π*speed*_elapsedMs/1000)
      │         ├─ zigzag: isoY = spawnIsoY + sign*amp (sign flips every period)
      │         ├─ arc: isoX/Y = arcCenter ± radius*(cos, sin)
      │         └─ _lateralClamp(...) [if amplitude + camIso exits corridor]
      └─ emit('enemy:escaped') if isScreenEscaped || isEscaped
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/enemies.js` | Modify | `Enemy.tick()` (L333-392): remove `dx / dy` rail advance; rewrite all pattern branches as pure oscillation around `_spawnIsoX / _spawnIsoY`. Capture `_spawnIsoX` in ctor (currently only `_spawnIsoY`). |
| `src/enemies.js` | Modify | `MOBILE_DEFAULT` (L91-100): recalibrate speeds to oscillation Hz / rad/s. Update doc-comment + scenario text. |
| `src/enemies.js` | Modify | Comment block (above `Enemy` ctor) explaining pattern semantics (REFACTOR task X1). |
| `src/main.js` | Modify | Remove `if (!inTestMode)` guards on `camera.update(dt)` (L380) and `enemies.update(...)` (L394-407). Replace with unconditional calls. |
| `tests/e2e/enemy-movement.spec.mjs` | Modify | Replace linear-advance assertions with oscillation assertions (TASK-R1/R2/R3/R4 rewrite). |

## Interfaces / Contracts

`Enemy.tick(dtMs, cameraIso, viewportBounds, isoWorld, viewportCenter)` contract
(unchanged signature; new semantics):

- Input: `dtMs` (ms), `cameraIso` (used only by `_lateralClamp`),
  `viewportBounds` / `isoWorld` / `viewportCenter` for clamp.
- Output: mutates `this.isoX` / `this.isoY` and `this._elapsedMs`.
- Invariant: `this._spawnIsoX` and `this._spawnIsoY` are NEVER mutated after
  the ctor captures them.

`resolveMovementConfig(spriteId, speed, pattern)` returns:

- `{ speed: number, movementPattern: 'static' | 'linear' | 'sine' | 'zigzag' | 'arc' }`
- For sine/zigzag: `speed ∈ [0.0, 1.5]` Hz typical.
- For arc: `speed ∈ [0.5, 2.0]` rad/s typical.
- For linear/static: `speed` value is unused (kept for resolver compatibility).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|---------|
| E2E | TASK-R1: `camion_treco` at t=0 vs t=3 has SAME isoX | Playwright `evaluate()`: spawn, tick 180ms, assert isoX delta == 0 |
| E2E | TASK-R2: `dron_fumigador` isoY oscillates (sign flips) | 60 ticks @ 16.67 ms; count sign flips of `isoY - spawnIsoY` |
| E2E | TASK-R3: `?test=1` `cameraTime > 0` after 1s wait | `evaluate()` → `api.getCameraTime()` after `page.waitForTimeout(1000)` |
| E2E | TASK-R4: e01 alive at cameraTime=5 | `evaluate()` → `enemies._enemies.get('e01')?.state` after auto-advance |
| E2E | Lateral clamp amplitude-aware | 30 ticks of oscillation → assert sx ∈ [80, 1200] always |
| E2E | Hit detection on oscillating enemy | fireAtScreen at AABB center, assert hit |
| Regression | R6 (MOBILE_DEFAULT applied), R7 (explicit 0/static respected) | unchanged behavior — resolver unchanged |
| Regression | R8 (retry reloads level), R5 (hit on moving), R2 (static isoX constant) | update expected values to oscillation; preserve behavior |
| Regression | `tests/e2e/hit-detection.spec.mjs` | re-run; assertions stay valid (escape timing shifts, see verify report) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary in this change.

## Migration / Rollout

No migration required. The change is in-memory only:

- `MOBILE_DEFAULT` value swap: no persistence; first boot uses new values.
- `Enemy.tick()` behavior change: observable in animation only, not in saves.
- `main.js` test-mode guard removal: observable for tests (auto-advance) and
  for production (no behavior change — guards previously always-true for
  production since `inTestMode = false`).

Rollback: `git revert <merge-commit>` restores the previous `dx / dy +=` linear
advance, the old MOBILE_DEFAULT speeds, and the `if (!inTestMode)` guards.

## Open Questions

None — proposal, spec, and design align. Existing R1-R8 tests need value
updates (`speed > 30` → `0 < speed < 2`) but the test structure stays.
