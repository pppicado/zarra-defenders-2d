# Delta for `combat-core`

**Change**: `fase-5-movement-calibration`
**Status**: DRAFT (TDD-RED pending apply)

## MODIFIED Requirements

### REQ-CMB-009: Per-instance enemy movement config

Per-instance spawn definitions MAY include `speed` (number) and `movementPattern` (one
of `static` | `linear` | `sine` | `zigzag` | `arc`). `ARCHETYPES` MUST NOT carry these
fields.

**Pattern semantics — Fase-5 calibration:**

All mobile patterns SHALL oscillate around the enemy's SPAWN iso position
(`spawnIsoX`, `spawnIsoY` captured at construction time). The system SHALL NOT apply
any per-tick self-translation along the rail direction (no `+dx / +dy` advance in
iso-sum). Visible motion SHALL come from camera-induced tile scrolling AND per-pattern
oscillation perpendicular (isoY) or radial (arc) to the rail axis.

- `static`: no self-motion at all. Camera alone drives apparent motion.
- `linear`: no self-motion. Identical to `static` for self-translation; the enemy
  scrolls with the camera. `speed` is ignored.
- `sine`: `isoX` is locked to `spawnIsoX`. `isoY` oscillates as
  `spawnIsoY + amplitudeIsoY * sin(2π * speed * elapsedSec)` where `speed` is the
  oscillation frequency in Hz (typically 0.3 - 1.5).
- `zigzag`: `isoX` is locked to `spawnIsoX`. `isoY` flips between
  `spawnIsoY + amplitudeIsoY` and `spawnIsoY − amplitudeIsoY` every half-period
  (period = 1000 ms default; `speed` scales the rate).
- `arc`: orbital motion around a captured `_arcCenter` fixed at construction time.
  `radius` is bounded (~0.25 iso tiles) and `speed` is the rotational rate
  (rad/s).

**Why oscillation, not advance.** A linear advance against a moving camera always
wins the iso-distance race — at `speed: 50` (camion_treco) the enemy advances at
~35 iso tiles/sec vs the camera's 0.6 tile/sec, so within one second of gameplay
the enemy is more than 6 tiles away and escapes via REQ-CMB-008. Oscillation keeps
the enemy inside the camera's tile column indefinitely — the player shoots it as the
camera passes.

**Resolution rule:** `resolveMovementConfig(spriteId, speed?, pattern?)` SHALL resolve
the effective config. The `Enemy` constructor MUST NOT pre-default `speed` or
`movementPattern` — both MUST pass through as `undefined` when omitted so the resolver
can distinguish "user omitted" from "user chose static":

- If `spriteId` is in `STATIC_SPRITE_IDS` → return `{ speed: 0, movementPattern: 'static' }`
  (hard rule, beats any user values).
- Else: `userSpeed` = `speed` when `typeof speed === 'number' && Number.isFinite(speed)`,
  else `undefined`. `userPattern` = `pattern` when `typeof pattern === 'string'`,
  else `undefined`.
- `effSpeed = userSpeed ?? MOBILE_DEFAULT[spriteId]?.speed ?? 0`
- `effPattern = userPattern ?? MOBILE_DEFAULT[spriteId]?.movementPattern ?? 'static'`

**`MOBILE_DEFAULT`** (recalibrated to oscillation rate; Fase-5):

| SpriteId | speed | pattern | semantic |
|---|---|---|---|
| `dron_fumigador` | 0.8 | sine | 0.8 Hz isoY oscillation |
| `camion_treco` | 0.4 | zigzag | 0.4 Hz isoY sway |
| `topadora` | 0 | linear | camera-driven only |
| `bidon_lixiviado` | 1.0 | arc | 1.0 rad/s orbit |
| `camion_cisterna_residuos` | 0 | linear | camera-driven only |
| `trailer` | 0.3 | zigzag | 0.3 Hz sway |
| `tubo_lixiviado` | 0.6 | sine | 0.6 Hz sway |
| `bolsa_plastico` | 1.2 | sine | 1.2 Hz sway |

**Hard rule:** `STATIC_SPRITE_IDS` (`valla_publicitaria`, `billboard_*`,
`signage_*`, `incineradora`, `planta_treco`, `sello_burocratico`,
`castillo_cofrentes`) MUST resolve to `speed: 0, movementPattern: 'static'`
regardless of user-supplied values. When `movementPattern === 'static'` the system
SHALL NOT apply any per-tick self-translation to `enemy.isoX` or `enemy.isoY`.

(Previously: linear advance at `speed` iso-units/sec along `(1,1)/√2` direction.
MOBILE_DEFAULT used speeds 25-70. Sine/zigzag oscillated around an advancing iso
center, not the spawn iso. This caused mobile enemies to outrun the camera and
trigger REQ-CMB-008 escape detection within 1 second of spawn.)

#### Scenario: Static enemy isoX stays constant across 10 frames

- GIVEN a `valla_publicitaria` enemy spawned with default movement config
- WHEN the simulation advances 10 frames with the camera moving south-east
- THEN `enemy.isoX` at frame 10 equals `enemy.isoX` at frame 0.

#### Scenario: Mobile linear enemy does not advance isoX with the camera alone

- GIVEN a `topadora` with `speed: 0, movementPattern: 'linear'`
- WHEN 3 ticks elapse at 16.67 ms each with no camera motion
- THEN `enemy.isoX` at frame 3 equals `enemy.isoX` at frame 0 (camera-induced
  visual scroll does not change isoX, because the enemy does not self-translate).

#### Scenario: Sine wave enemy oscillates isoY around SPAWN, isoX locked

- GIVEN a `dron_fumigador` (sine pattern, `speed: 0.8` Hz) spawning at
  iso `(spawnIsoX, spawnIsoY)`
- WHEN 60 ticks elapse at 16.67 ms each
- THEN `enemy.isoY` deviates from `spawnIsoY` AND the sign of that deviation
  flips at least once (full sine period)
- AND `enemy.isoX` equals `spawnIsoX` at every tick (oscillation is isoY-only).
- AND no escape fires during the 1 s window (enemy stays within camera reach).

#### Scenario: Zigzag enemy flips isoY sign over period

- GIVEN a `camion_treco` (zigzag, `speed: 0.4` Hz period)
- WHEN 50 ticks elapse at 16.67 ms each (~833 ms ≈ period)
- THEN `enemy.isoY` flips between roughly `spawnIsoY + A` and `spawnIsoY − A`
  at least once
- AND `enemy.isoX` is locked to `spawnIsoX` throughout.

#### Scenario: Arc enemy stays bounded around capture point

- GIVEN a `bidon_lixiviado` (arc, `speed: 1.0` rad/s)
- WHEN 60 ticks elapse at 16.67 ms each
- THEN `sqrt((isoX − arcCenter.isoX)^2 + (isoY − arcCenter.isoY)^2)` stays
  within `±20%` of the configured radius (≈0.25 iso tiles).
- AND no escape fires — the enemy remains inside camera reach the full second.

#### Scenario: Static-rule enforcement at boot

- GIVEN the boot sequence loads the spawn list
- WHEN each `spriteId` is checked against the static list
- THEN every match resolves to `speed: 0` and `movementPattern: 'static'`.

#### Scenario: TEST_LEVEL has 120 enemies

- GIVEN the level module loads
- WHEN `TEST_LEVEL.enemies.length` is read
- THEN the value equals `120`.

## ADDED Requirements

### REQ-CMB-012: Test-mode auto-advance (camera + enemies)

When `?test=1` is active and the production game loop runs, the system SHALL auto-
advance both the camera and the enemies each frame WITHOUT requiring the user to
call `__gameTestAPI__.tick(dt)` manually. The production ticker (`appWorld.ticker`,
`appHud.ticker`) SHALL call `camera.update(dt)` and `enemies.update(...)` in test
mode, using the live `dt` reported by `performance.now()` deltas.

Auto-advance in test mode SHALL:

- Use the real `dt` (no fixed `16.67 ms` override; the live frame delta drives
  simulation speed so 60 fps → ~0.6 tile/s camera advance, matching production).
- Spawn time-gated enemies as the camera's elapsed time crosses their `atSec`
  threshold (`_timeGatedSpawns` materializes them).
- Trigger the escape detection pipeline (`isScreenEscaped` /
  `isEscaped`) so enemies that drift out of camera reach are removed and
  integrity drains as it would in production.
- Coexist with `__gameTestAPI__.setTime(t)` + `__gameTestAPI__.tick(dt)`
  manual control: when a test calls `setTime`, the next auto-advance tick
  observes the new time and continues from there — tests retain the ability to
  seek deterministically.

In production (`?test=0`): no behavior change. The pre-existing `if (!inTestMode)`
guards on `camera.update` and `enemies.update` are replaced by unconditional calls
(a safe simplification: production was already advancing them, so removing the
guard is non-breaking).

#### Scenario: `?test=1` advances the camera without manual tick

- GIVEN the URL is `http://localhost:8000/?test=1`
- WHEN the user waits ~1 second on the page (no test-api interaction)
- THEN `camera.getTime() > 0` (camera advanced)
- AND `__gameTestAPI__.getCameraTime()` reflects that elapsed time.

#### Scenario: `?test=1` spawns time-gated enemies automatically

- GIVEN the URL is `?test=1` and the test level has time-gated spawns
- WHEN 5 seconds elapse on the page
- THEN `enemies._timeGatedSpawns.length` decreased (spawns materialized as
  camera time crossed their `atSec`)
- AND `enemies._enemies.size > 0`.

#### Scenario: e01 visible for ≥5 seconds in production camera traversal

- GIVEN `?test=1` and `setTime(0)`
- WHEN 5 seconds of auto-advance elapse
- THEN `e01` is alive (`enemies._enemies.get('e01')?.state === 'alive'`)
- AND e01 has NOT escaped (oscillation keeps it within 6 tile Manhattan
  radius of the camera).

#### Scenario: Lateral clamp is amplitude-aware

- GIVEN a mobile enemy whose spawn iso projects to screen X well inside the
  `[LATERAL_MIN_PX, LATERAL_MAX_PX]` corridor (e.g. mid-screen)
- WHEN 30 ticks elapse (oscillation only — oscillation amplitude ≤0.5 iso tiles)
- THEN the enemy stays inside the corridor — no clamp fires (clamp is a guard,
  not the primary motion driver).
