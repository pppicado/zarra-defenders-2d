# Delta for `combat-core` — REQ-CMB-013

## ADDED Requirements

### REQ-CMB-013: Reintentar must unHalt camera + unfreeze integrity

When the user clicks `Reintentar test level` in the game-over overlay and the
`bootTestLevel` handler runs, the system MUST resume all per-frame simulation
that was paused by the game-over flow. Concretely, AFTER the `bootTestLevel`
handler completes:

- `camera.isHalted() === false` (the rail-camera ticker is unfrozen).
- `integrity.read().exhausted === false` AND the integrity state machine is
  unfrozen (no further `drain()` calls are no-ops).

The system MUST NOT require the user (or a test) to invoke
`__gameTestAPI__.reset()` to recover from a halted camera; `Reintentar` is the
production path.

The producer MUST guarantee `camera.unHalt()` is called inside `bootTestLevel`
BEFORE `camera.setTime(0)`, so that the first production ticker frame after
retry advances `elapsed` from 0 again. The producer MUST also guarantee that
`integrity.reset()` (already part of `bootTestLevel`) clears `_frozen`.

#### Scenario: Camera unHalted after Reintentar (production path)

- GIVEN the player lost all 3 lives and the game-over overlay is visible
- WHEN the user clicks `Reintentar test level`
- THEN `camera.isHalted() === false` once the overlay's `bootTestLevel:request`
  listener has run
- AND after a 1 s wait the production ticker advances `camera.getTime()` by
  `>= 1.0 s` (proving the halt was lifted AND the ticker is running).

#### Scenario: Integrity unfrozen after Reintentar

- GIVEN integrity hit 0 (overlay visible)
- WHEN the user clicks `Reintentar test level`
- THEN `integrity.read().current === 3` (refilled)
- AND `integrity.read().exhausted === false`
- AND a subsequent `integrity.drain('post-retry sanity')` returns
  `{current: 2, max: 3, exhausted: false}` (proving `_frozen` is clear).

#### Scenario: Reintentar unhalts when `__gameTestAPI__.reset()` had not been called

- GIVEN a fresh boot of `?test=1` and the player drained integrity 3 times to
  force game-over (overlay's `integrity:exhausted` listener halted the camera)
- WHEN the user clicks `Reintentar test level` WITHOUT calling `reset()` in
  between
- THEN `camera.isHalted() === false`
- AND `camera.getTime()` advances from 0 in subsequent ticks.

#### Scenario: First production ticker frame after retry advances camera time

- GIVEN the camera was halted at `time = 4.7 s` by game-over
- AND `bootTestLevel` ran (camera.time is reset to 0 by `setTime(0)`)
- WHEN the production ticker fires once after the retry handler returned
- THEN `camera.update(dt)` was invoked without early-returning
- AND `camera.getTime() > 0` after a single frame (proving `unHalt` ran
  before `setTime(0)`).
