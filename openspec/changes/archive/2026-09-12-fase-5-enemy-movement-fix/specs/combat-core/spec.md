# Delta for combat-core

**Change**: fase-5-enemy-movement-fix
**Status**: MODIFIED for "fase-5-enemy-movement-fix"

## MODIFIED Requirements

### REQ-CMB-009: Per-instance enemy movement config

Per-instance spawn definitions MAY include `speed` (number, iso-units/sec, `>= 0`)
and `movementPattern` (one of `static` | `linear` | `sine` | `zigzag` | `arc`).
`ARCHETYPES` MUST NOT carry these fields.

**Resolution rule:** `resolveMovementConfig(spriteId, speed?, pattern?)` SHALL
resolve the effective config. The `Enemy` constructor MUST NOT pre-default
`speed` or `movementPattern` — both MUST pass through as `undefined` when
omitted so the resolver can distinguish "user omitted" from "user chose static":

- If `spriteId` is in `STATIC_SPRITE_IDS` → return `{ speed: 0, movementPattern: 'static' }`
  (hard rule, beats any user values).
- Else: `userSpeed` = `speed` when `typeof speed === 'number' && Number.isFinite(speed)`,
  else `undefined`. `userPattern` = `pattern` when `typeof pattern === 'string'`,
  else `undefined`.
- `effSpeed = userSpeed ?? MOBILE_DEFAULT[spriteId]?.speed ?? 0`
- `effPattern = userPattern ?? MOBILE_DEFAULT[spriteId]?.movementPattern ?? 'static'`

**`MOBILE_DEFAULT`** (applied when user omitted the field):

| SpriteId | speed | pattern |
|---|---|---|
| `dron_fumigador` | 70 | sine |
| `camion_treco` | 50 | zigzag |
| `topadora` | 40 | linear |
| `bidon_lixiviado` | 35 | arc |
| `camion_cisterna_residuos` | 30 | linear |
| `trailer` | 45 | zigzag |
| `tubo_lixiviado` | 25 | sine |
| `bolsa_plastico` | 60 | sine |

**Hard rule:** `STATIC_SPRITE_IDS` (`valla_publicitaria`, `billboard_*`,
`signage_*`, `incineradora`, `planta_treco`, `sello_burocratico`,
`castillo_cofrentes`) MUST resolve to `speed: 0, movementPattern: 'static'`
regardless of user-supplied values. Apparent motion comes from camera-induced
tile scrolling only and MUST NOT change.

When `movementPattern === 'static'` the system SHALL NOT apply any per-tick
self-translation to `enemy.isoX` or `enemy.isoY`.

(Previously: the `Enemy` constructor pre-defaulted `speed = 0, movementPattern = 'static'`,
which short-circuited the resolver before `MOBILE_DEFAULT` could apply — every
mobile spriteId spawned with `speed: 0, pattern: 'static'`.)

#### Scenario: Spawn without speed/pattern uses MOBILE_DEFAULT

- GIVEN an `Enemy` constructed with `{ archetype, isoX, isoY, spriteId: 'camion_treco' }`
  and no `speed` / `movementPattern`
- WHEN construction completes
- THEN `enemy.speed === 50`
- AND `enemy.movementPattern === 'zigzag'`.

#### Scenario: Explicit speed=0 + pattern='static' is respected

- GIVEN `{ archetype, isoX, isoY, spriteId: 'camion_treco', speed: 0, movementPattern: 'static' }`
- WHEN construction completes
- THEN `enemy.speed === 0` AND `enemy.movementPattern === 'static'`
- AND `tick()` performs no self-translation.

#### Scenario: Static spriteId forces static regardless of override

- GIVEN `{ archetype, isoX, isoY, spriteId: 'valla_publicitaria', speed: 100, movementPattern: 'zigzag' }`
- WHEN construction completes
- THEN `enemy.speed === 0` AND `enemy.movementPattern === 'static'`.

#### Scenario: Static enemy isoX stays constant across 10 frames

- GIVEN a `valla_publicitaria` spawned with default movement config
- WHEN the simulation advances 10 frames with camera moving south-east
- THEN `enemy.isoX` at frame 10 equals `enemy.isoX` at frame 0.

#### Scenario: Static enemy depth-of-life unchanged

- GIVEN a static `valla_publicitaria` at iso `(12, 7)`
- WHEN the camera advances past it
- THEN it remains hittable via REQ-CMB-003
- AND escape detection still fires per REQ-CMB-008.

#### Scenario: Mobile linear enemy advances isoX each frame

- GIVEN a `topadora` with `speed: 40, movementPattern: 'linear'`
- WHEN 3 ticks elapse at 16.67 ms each
- THEN `enemy.isoX` decreases monotonically (toward the camera)
- AND the per-frame delta is non-zero and constant within tolerance.

#### Scenario: Sine wave enemy oscillates around spawn isoY

- GIVEN a `dron_fumigador` with `speed: 70, movementPattern: 'sine'`
- WHEN 60 ticks elapse at 16.67 ms each
- THEN `enemy.isoY` oscillates around its spawn isoY
- AND frame N and frame N+30 differ in sign of deviation.

#### Scenario: Arc enemy follows curved path

- GIVEN a `bidon_lixiviado` with `speed: 35, movementPattern: 'arc'`
- WHEN the enemy moves for 60 frames
- THEN `sqrt((isoX - arcCenter.isoX)^2 + (isoY - arcCenter.isoY)^2)`
  stays within `+/- 10%` of the spawn-time radius.

#### Scenario: Static-rule enforcement at boot

- GIVEN the boot sequence loads the spawn list
- WHEN each `spriteId` is checked against the static list
- THEN every match resolves to `speed: 0` and `movementPattern: 'static'`.

#### Scenario: TEST_LEVEL has 120 enemies

- GIVEN the level module loads
- WHEN `TEST_LEVEL.enemies.length` is read
- THEN the value equals `120`.

## ADDED Requirements

### REQ-CMB-011: Reintentar must reload test level

When the user clicks `Reintentar test level` in the game-over overlay, the
system MUST fully reset state AND reload the `TEST_LEVEL` enemy roster so
that enemies re-spawn over time as the camera advances. The overlay MUST
emit a single `bootTestLevel:request` event; `main.js`'s `bootTestLevel`
handler MUST perform the reset + level reload. The overlay MUST NOT contain
inline reset logic.

#### Scenario: Reintentar from game-over overlay reloads the level

- GIVEN the game-over overlay is visible
- WHEN the user clicks `Reintentar test level`
- THEN `bootTestLevel:request` fires exactly once
- AND `enemies._timeGatedSpawns.length > 0` after the handler completes
- AND the camera time resets to `0`.

#### Scenario: After Reintentar + 5s wait, enemies spawn at camera time

- GIVEN the game-over overlay was visible and the user clicked `Reintentar`
- WHEN the camera advances for 5 seconds
- THEN `enemies._timeGatedSpawns` materializes time-gated spawns as the
  camera time crosses each spawn's `atSec`
- AND `enemies._enemies.size > 0`.

#### Scenario: Overlay emits single event (no inline reset)

- GIVEN the `Overlay._onRetry` handler
- WHEN the retry button is clicked
- THEN the handler emits `bootTestLevel:request` exactly once
- AND does NOT call `enemies.reset()`, `integrity.reset()`, `score.reset()`,
  `combat.reset()`, or `camera.setTime(0)` directly.