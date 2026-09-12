# Delta for `combat-core`

**Capability**: combat-core (MODIFIED)
**Change**: fase-5-enemy-movement

## Purpose

Extend combat-core so mobile enemies gain self-translation in iso coordinates while
static-world enemies keep their existing zero-self-velocity behavior. Apparent
motion for static enemies continues to come from camera-induced tile scrolling.

## ADDED Requirements

### REQ-CMB-009: Per-instance enemy movement config

Per-instance spawn definitions MAY include `speed` (number, iso-units/sec, `>= 0`)
and `movementPattern` (one of `static` | `linear` | `sine` | `zigzag` | `arc`).
`ARCHETYPES` MUST NOT carry these fields — per-spawn properties only. Defaults
when omitted: `speed: 0`, `movementPattern: 'static'`.

**Hard rule (must not be violated):** enemies representing static-world objects
(`valla_publicitaria`, `billboard_*`, `signage_*`, `incineradora`, `planta_treco`,
`sello_burocratico`, `castillo_cofrentes`) MUST keep `speed: 0` and
`movementPattern: 'static'`. Their apparent motion comes from camera-induced
tile scrolling only and MUST NOT be changed.

**Default per mobile spriteId** (applied at spawn when omitted):

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

When `movementPattern === 'static'` the system SHALL NOT apply any per-tick
self-translation to `enemy.isoX` or `enemy.isoY`.

#### Scenario: Static enemy isoX stays constant across 10 frames

- GIVEN a `valla_publicitaria` enemy spawned with default movement config
- WHEN the simulation advances 10 frames with the camera moving south-east
- THEN `enemy.isoX` at frame 10 equals `enemy.isoX` at frame 0.

#### Scenario: Static enemy depth-of-life unchanged

- GIVEN a static `valla_publicitaria` at iso `(12, 7)`
- WHEN the camera advances past it
- THEN the enemy remains hittable via REQ-CMB-003
- AND escape detection still fires per REQ-CMB-008.

#### Scenario: Mobile linear enemy advances isoX each frame

- GIVEN a `topadora` with `speed: 40, movementPattern: 'linear'`
- WHEN 3 ticks elapse at 16.67 ms each
- THEN `enemy.isoX` decreases monotonically (toward the camera)
- AND the per-frame delta is non-zero and constant within tolerance.

#### Scenario: Sine wave enemy oscillates perpendicular to advance direction

- GIVEN a `dron_fumigador` with `speed: 70, movementPattern: 'sine'`
- WHEN 60 ticks elapse at 16.67 ms each
- THEN `enemy.isoY` oscillates around its spawn isoY
- AND frame N and frame N+30 differ in sign of deviation.

#### Scenario: Arc enemy follows curved path (radius approx constant)

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
- THEN the value equals `120` (5x of the prior 24).

### REQ-CMB-010: Lateral screen-bounds clamp (mobile enemies only)

For every enemy whose `movementPattern !== 'static'`, after self-translation each
tick the system SHALL project to logical screen pixels via
`isoToScreenWithCamera(isoX, isoY, cameraIso, viewportCenter)` and clamp lateral
screen X to `[LATERAL_MIN_PX, LATERAL_MAX_PX]` where `LATERAL_MIN_PX = 80` and
`LATERAL_MAX_PX = viewportSize.x - 80`. When the bound is reached, the enemy's
iso X velocity SHALL be reflected (sign inverted) so the next frame's iso X
moves back into the corridor, and iso X SHALL be clamped so the projected screen
X sits at the bound. The clamp MUST NOT apply to `movementPattern === 'static'`.

#### Scenario: Mobile enemy at lateral bound gets velocity reflected

- GIVEN a `camion_treco` (`zigzag`, `speed: 50`) whose projected screen X is
  `viewportSize.x - 79`
- WHEN one tick elapses
- THEN the next tick's iso X velocity is inverted relative to the prior tick
- AND the projected screen X is `<= viewportSize.x - 80`.

#### Scenario: Mobile enemy stays inside lateral corridor over 600 frames

- GIVEN 120 enemies spawned per REQ-CMB-009 with mixed mobile patterns
- WHEN 600 ticks elapse at 16.67 ms each (10 s)
- THEN for every tick `t`, every alive mobile enemy's projected screen X
  satisfies `80 <= sx <= viewportSize.x - 80`.

#### Scenario: Static enemy is exempt from the lateral clamp

- GIVEN a `valla_publicitaria` whose iso X would project to `sx < 80` if clamped
- WHEN one tick elapses with no self-translation
- THEN the clamp code path is skipped
- AND `enemy.isoX` is unchanged.

#### Scenario: Hit detection still works on moving enemies

- GIVEN a mobile enemy mid-arc whose iso X changed this tick
- WHEN a click resolves against the live sprite bounds
- THEN the hit semantics from REQ-CMB-003 apply
- AND `hit` fires iff the click is inside the shrunk AABB.