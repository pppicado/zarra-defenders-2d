# Delta for `combat-core`

**Capability**: combat-core (NEW, then MODIFIED across F3 → F5)

## Purpose

Define the contract for the smallest end-to-end rail-shooter combat loop. The system
SHALL translate a tap into a signed "papeleta" projectile emitted from the hand sprite,
fly the projectile (homing toward the target's live screen position each frame),
resolve clicks against each enemy's shrunk screen-space AABB (reverse-depth), award
points and decrement HP on hit, and silently despawn on miss. The capability exposes a
deterministic event bus: `fire:requested`, `projectile:spawned`, `hit`, `miss`,
`enemy:escaped`, `enemy:destroyed`.

## ADDED Requirements

### REQ-CMB-001: Fire trigger and cooldown

The system SHALL accept a fire request only when the cool-down gate is open and SHALL
emit `fire:requested` exactly once per accepted request. The cool-down SHALL be
`333 ms` (3 shots/sec, `FIRE_COOLDOWN_MS = 333`). A second fire request issued while
the gate is closed SHALL be silently dropped — no projectile is spawned, no event
fires, no penalty accrues. The first request after the gate opens SHALL succeed; the
gate SHALL be opened again `333 ms` after that success.

#### Scenario: First request passes the gate

- GIVEN the gate has been open since boot
- WHEN the user taps the canvas at `(screenX, screenY)`
- THEN `fire:requested` fires exactly once
- AND `projectile:spawned` fires exactly once
- AND a `Projectile` instance exists in the projectile manager.

#### Scenario: Second request inside cooldown is dropped

- GIVEN a fire request that just opened and closed the gate (`t = 0`)
- WHEN the user taps again at `t = 100 ms`
- THEN no `projectile:spawned` event fires
- AND no second `Projectile` exists
- AND the cooldown timestamp remains `t = 333 ms` (unchanged).

#### Scenario: Cooldown resets after 333 ms

- GIVEN a fire request at `t = 0`
- WHEN the user taps at `t = 334 ms`
- THEN `fire:requested` fires
- AND a new `Projectile` is spawned.

### REQ-CMB-002: Projectile lifecycle (papeleta, homing)

The system SHALL spawn one "papeleta" sprite (16×16 PNG, ≤ 24 px on screen), storing
the tap target's iso world coords (`isoX`, `isoY`). Each tick the projectile SHALL
recompute the target screen position via
`isoToScreenWithCamera(isoX, isoY, cameraIso, viewportCenter)` against the live iso
coords, rebuild its velocity from its current position toward that recomputed target
(normalized × `800 world units / second`), and apply a sine-wave offset perpendicular
to the travel axis (amplitude `±2 px`, period `0.4 s`). The projectile SHALL despawn
on the first of: (a) `1.5 s` lifetime elapsed, (b) enemy collision (REQ-CMB-003),
(c) leaving the camera frustum (AABB + 1-tile margin), (d) reaching the recomputed
target within `8 px`. Spawn point SHALL be the hand sprite's screen-space center.

(Originally F3: straight-line flight toward a static target set at spawn time; no
per-frame target recalculation. F5-projectile-homing switched to homing + arrival
despawn.)

#### Scenario: Spawn stores iso target; initial velocity is rebuilt

- GIVEN hand at `(hx, hy)`, tap iso target `(gx, gy)`
- WHEN the projectile is spawned
- THEN `isoX = gx`, `isoY = gy` are stored
- AND initial velocity points toward `isoToScreenWithCamera(gx, gy, ...)`,
  normalized × 800 u/s
- AND sine offset starts at `0`, oscillates ±2 px over 0.4 s.

#### Scenario: Projectile homes toward a moved target each tick

- GIVEN a projectile at `isoX=5, isoY=5` and an enemy moved off the spawn-time
  screen target by `t = 200 ms`
- WHEN `tick()` runs that frame
- THEN `target = isoToScreenWithCamera(isoX, isoY, cameraIso, viewportCenter)`
  returns the enemy's LIVE screen position
- AND velocity is rebuilt from current position toward that recomputed target.

#### Scenario: Despawn on lifetime, frustum exit, or arrival fires no `hit`

- GIVEN a projectile spawned at `t = 0` with no enemy collision
- WHEN simulation reaches `t = 1500 ms` OR the trajectory exits the camera frustum
  + 1-tile margin OR the projectile reaches the recomputed target within `8 px`
- THEN the projectile is removed
- AND no `hit` event fires (miss, no card awarded).

#### Scenario: Cooldown applies regardless of projectile outcome

- GIVEN a fire at `t = 0` that misses (no enemy in path)
- WHEN the user taps at `t = 200 ms`
- THEN the tap is dropped (cooldown still active)
- AND the `t = 0` miss does NOT shorten the cooldown.

#### Scenario: NaN iso coordinates do not corrupt velocity

- GIVEN a projectile whose stored `isoX` or `isoY` becomes `NaN`
- WHEN `tick()` runs
- THEN target recalculation is skipped that frame
- AND the projectile retains its previous valid velocity vector.

### REQ-CMB-004: Hit resolution (HP, score, "Firmas recogidas")

The system SHALL decrement the hit enemy's HP by `1` per hit, SHALL award points
using the formula `points = 10 × archetype_multiplier`, where `standard = 1`,
`tank = 1.5`, `mini-boss = 2`, `boss = 3`, and SHALL increment the
`firmasRecogidas` counter by exactly `1` on each successful hit. When the enemy's HP
reaches `0`, the enemy SHALL transition to the `destroyed` state, SHALL remain in the
active list for `200 ms` while a destruction animation plays, and SHALL be removed
from the active list at the end of that window. A `enemy:destroyed` event SHALL fire
on the transition to `destroyed`.

#### Scenario: Standard enemy destroyed in one hit

- GIVEN a `standard` enemy at iso `(5, 5)` with `hp = 1`
- WHEN one hit resolves
- THEN the enemy's HP becomes `0`
- AND `score` increases by `10` (10 × 1)
- AND `firmasRecogidas` increases by `1`
- AND `enemy:destroyed` fires with `{ enemyId, archetype: "standard" }`.

#### Scenario: Tank enemy takes three hits

- GIVEN a `tank` enemy at iso `(6, 5)` with `hp = 3`
- WHEN hit 1 fires
- THEN HP becomes `2`, score increases by `15`, `firmasRecogidas += 1`, no
  `destroyed` event yet.
- WHEN hit 2 fires (after 200 ms or later — same tick is fine)
- THEN HP becomes `1`, score +15, `firmasRecogidas += 1`.
- WHEN hit 3 fires
- THEN HP becomes `0`, score +15, `firmasRecogidas += 1`, `enemy:destroyed` fires.

#### Scenario: Mini-boss award uses ×2 multiplier

- GIVEN a `mini-boss` enemy with `hp = 10`
- WHEN one hit resolves
- THEN score increases by `20` (10 × 2), `firmasRecogidas += 1`.

#### Scenario: Boss award uses ×3 multiplier

- GIVEN a `boss` enemy with `hp = 30`
- WHEN one hit resolves
- THEN score increases by `30` (10 × 3), `firmasRecogidas += 1`.

#### Scenario: Destroyed enemy remains 200 ms for animation

- GIVEN an enemy transitioned to `destroyed`
- WHEN 199 ms elapses with no further hit
- THEN the enemy is STILL in the active list (animation playing).
- WHEN 200 ms elapses
- THEN the enemy is removed from the active list.

### REQ-CMB-005: Determinism under `?test=1`

When the `?test=1` query parameter is active, the system SHALL use a seeded PRNG
(`mulberry32`, seed `0xC0FFEE` by default; overridable via `?test=1&seed=N`) for any
random selection inside combat paths, SHALL NOT call `Math.random()` inside combat
paths (the production PRNG is `Math.random()`; tests use the seeded one), and SHALL
run the simulation at a fixed 60 Hz tick (`FIRE_COOLDOWN_MS`, `PROJECTILE_SPEED`,
`LIFETIME_MS`, and footprint dimensions are all constant — no per-tick randomness).
The seeded PRNG MUST be injected at boot from `__gameTestAPI__.setSeed(n)` so a test
can fix the seed before the level starts.

#### Scenario: No Math.random in combat when ?test=1

- GIVEN the URL contains `?test=1`
- WHEN the combat module loads
- THEN any `Math.random()` call site in `src/enemies.js`, `src/projectile.js`,
  `src/hit-detection.js`, and `src/main.js` combat paths is replaced by the seeded
  PRNG
- AND the seed defaults to `0xC0FFEE`.

#### Scenario: Deterministic level re-runs identically

- GIVEN a test fixture booted with `?test=1&seed=12345`
- WHEN the test fires `simulateTap(x1, y1)`, `simulateTap(x2, y2)`, etc.
- AND records `readEnemies()`, `readIntegrity()`, `readScore()` after each tap
- THEN a fresh page load with the same `?test=1&seed=12345` and the same tap
  sequence produces byte-identical observation arrays.

### REQ-CMB-006: Per-archetype hitInset

Each archetype in `ARCHETYPES` MUST define
`hitInset: { top, right, bottom, left }` in screen-pixels. Shrunken AABB =
`{ x + left, y + top, width − left − right, height − top − bottom }`. Values:
`standard={16,16,16,16}`, `tank={12,12,12,12}`, `mini-boss={10,10,10,10}`,
`boss={8,8,8,8}`. The `assertArchetype(name)` validator MUST reject any archetype
whose `hitInset` is missing or whose sides are non-finite numbers.

#### Scenario: All four archetypes declare hitInset

- GIVEN the `ARCHETYPES` table
- WHEN each archetype is inspected
- THEN values match `standard={16,16,16,16}`, `tank={12,12,12,12}`,
  `mini-boss={10,10,10,10}`, `boss={8,8,8,8}`.

#### Scenario: Missing hitInset fails ConfigError

- GIVEN an `ARCHETYPES` entry with no `hitInset`
- WHEN `assertArchetype(name)` runs at boot
- THEN a `ConfigError` is thrown
- AND the game fails to start (defensive guard).

### REQ-CMB-007: Debug hitbox overlay (non-production)

Render a debug overlay: one colored rectangle per live enemy at its shrunk AABB
(the AABB returned by `Enemy.getScreenBounds`, which already applies `hitInset`).
Colors: `standard` cyan `#00FFFF`, `tank` yellow `#FFFF00`, `mini-boss` magenta
`#FF00FF`, `boss` orange `#FF8000`; `2 px` stroke, no fill. One `PIXI.Graphics` is
pooled per archetype (4 total) and redrawn each frame; positions track camera
movement. Enabled iff `?hitboxes=1` is present in the URL OR the user presses `H`
to toggle at runtime. In production (`?test=0`, no `?hitboxes=1`, no `H` pressed) the
overlay MUST NOT render.

#### Scenario: Overlay renders when ?hitboxes=1

- GIVEN URL contains `?test=1&hitboxes=1`
- WHEN one frame advances
- THEN for each live enemy a rectangle renders at its shrunk AABB in the
  archetype's color.

#### Scenario: Overlay does NOT render in production

- GIVEN URL is `?test=0` and `H` has not been pressed
- WHEN one frame advances
- THEN no overlay rectangle draws.

#### Scenario: Toggle clears overlay immediately

- GIVEN the overlay is enabled (via `?hitboxes=1`)
- WHEN `__gameTestAPI__.setHitboxesEnabled(false)` runs
- THEN the next frame's `getHitboxRects()` returns `[]`
- AND no overlay rectangle draws.

### REQ-CMB-008: Screen-space escape detection

The system SHALL declare an enemy escaped when EITHER:

1. The enemy's projected screen-Y exceeds `viewportSize.y + 32 px` (south
   screen-space test), OR
2. Manhattan distance from enemy iso to camera iso exceeds `6 tiles`
   (off-axis fallback).

The south screen-space test SHALL run via
`isoToScreenWithCamera(enemy.isoX, enemy.isoY, cameraIso, viewportCenter)`
projection. The `32 px` margin MUST give a brief visual warning (~0.5 s at
0.6 tile/s rail speed). When `isoWorld`, `viewportCenter`, or `viewportSize`
are unavailable, the system SHALL fall back to the Manhattan test only (no
false escape for in-frame enemies).

#### Scenario: Enemy directly behind camera escapes within 1 frame

- GIVEN an enemy at iso `(5, 5)` and the camera advanced south past that tile
- WHEN one tick runs with `isoWorld`, `viewportCenter`,
  `viewportSize = { x: 1280, y: 720 }` supplied
- THEN `isoToScreenWithCamera` returns `sy > 720 + 32 = 752`
- AND `enemy:escaped` fires immediately
- AND the enemy is removed from the active list.

#### Scenario: Enemy at the top of the viewport does not escape

- GIVEN an enemy whose projected `sy` is below `viewportSize.y + 32 px`
- WHEN `update()` runs that frame
- THEN the screen-space test returns false
- AND Manhattan distance is ≤ 6 tiles
- AND the enemy is NOT removed
- AND no `enemy:escaped` event fires.

#### Scenario: Enemy far off-axis escapes via Manhattan fallback

- GIVEN an enemy at iso `(camera.isoX + 10, camera.isoY - 10)`
  (10 north, 10 east)
- WHEN `update()` runs
- THEN screen-space Y is still inside viewport (no south-escape)
- AND Manhattan distance = 20 tiles > 6
- AND the enemy IS removed
- AND `enemy:escaped` fires.

#### Scenario: `?test=1` exposes helpers to mount enemies and advance the camera

- GIVEN `?test=1` is active
- WHEN a test calls `__gameTestAPI__.setViewportSize(w, h)` and mounts an
  enemy at known iso coords
- THEN `enemies.update(...)` accepts
  `{ isoWorld, viewportCenter, viewportSize, cameraIso }`
- AND `__gameTestAPI__.advanceCameraTo(isoX, isoY)` repositions the camera
  for the next tick
- AND `getScreenEscapedRects()` returns the list of enemies flagged escaped
  this frame.

### REQ-CMB-009: Per-instance enemy movement config

Per-instance spawn definitions MAY include `speed` (number) and `movementPattern`
(one of `static` | `linear` | `sine` | `zigzag` | `arc`). `ARCHETYPES` MUST NOT
carry these fields.

**Pattern semantics (Fase-5-calibration):** All mobile patterns SHALL oscillate
around the enemy's SPAWN iso position (`spawnIsoX`, `spawnIsoY` captured at
construction time). The system SHALL NOT apply any per-tick self-translation
along the rail direction (no `+dx / +dy` advance in iso-sum). Visible motion
SHALL come from camera-induced tile scrolling AND per-pattern oscillation
perpendicular (isoY) or radial (arc) to the rail axis.

- `static` — no self-motion at all; camera alone drives apparent motion.
- `linear` — no self-motion (identical to `static` for self-translation;
  enemy scrolls with camera). `speed` is ignored.
- `sine` — `isoX` locked to `spawnIsoX`. `isoY` oscillates as
  `spawnIsoY + amplitudeIsoY * sin(2π * speed * elapsedSec)` where `speed` is
  oscillation frequency in Hz.
- `zigzag` — `isoX` locked to `spawnIsoX`. `isoY` flips between
  `spawnIsoY + amplitudeIsoY` and `spawnIsoY − amplitudeIsoY` every half-period.
- `arc` — orbital motion around a captured `_arcCenter` fixed at construction.
  `radius` is bounded (~0.25 iso tiles); `speed` is rotation rate (rad/s).

**Why oscillation, not advance.** A linear advance against a moving camera always
wins the iso-distance race. At `speed: 50` the enemy advances ~35 iso tiles/sec
vs the camera's 0.6 tile/sec, so within one second of gameplay the enemy is more
than 6 tiles away and escapes via REQ-CMB-008. Oscillation keeps the enemy
inside the camera's tile column indefinitely — the player shoots it as the
camera passes.

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

**`MOBILE_DEFAULT`** (Fase-5-calibration; speeds are OSCILLATION RATE not
linear velocity):

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

(Updated 2026-09-12 by fase-5-movement-calibration: replaced linear
iso-units/sec advance with oscillation around spawn iso. Speed semantics
reinterpreted per pattern (Hz for sine/zigzag, rad/s for arc). MOBILE_DEFAULT
recalibrated to 0.0-1.2 Hz/rad/s. Bug fixed: pre-calibration mobile enemies
outran the 0.6 tile/sec camera and escaped via REQ-CMB-008 within ~1 s of
spawn. Updated 2026-09-12 by fase-5-enemy-movement-fix: explicit resolver
contract — `Enemy` ctor no longer pre-defaults `speed/pattern`.)

#### Scenario: Static enemy isoX stays constant across 10 frames

- GIVEN a `valla_publicitaria` enemy spawned with default movement config
- WHEN the simulation advances 10 frames with the camera moving south-east
- THEN `enemy.isoX` at frame 10 equals `enemy.isoX` at frame 0.

#### Scenario: Static enemy depth-of-life unchanged

- GIVEN a static `valla_publicitaria` at iso `(12, 7)`
- WHEN the camera advances past it
- THEN the enemy remains hittable via REQ-CMB-003
- AND escape detection still fires per REQ-CMB-008.

#### Scenario: Mobile linear enemy does not self-advance isoX

- GIVEN a `topadora` with `speed: 0, movementPattern: 'linear'`
- WHEN 3 ticks elapse at 16.67 ms each with no camera motion
- THEN `enemy.isoX` at frame 3 equals `enemy.isoX` at frame 0 (oscillation
  model: linear pattern carries no self-motion; apparent scroll is from
  camera alone).

#### Scenario: Sine wave enemy oscillates isoY around SPAWN, isoX LOCKED

- GIVEN a `dron_fumigador` (sine pattern, `speed: 0.8` Hz) spawning at
  iso `(spawnIsoX, spawnIsoY)`
- WHEN 60 ticks elapse at 16.67 ms each
- THEN `enemy.isoY` deviates from `spawnIsoY` AND the sign of that deviation
  flips at least once (full sine period)
- AND `enemy.isoX` equals `spawnIsoX` at every tick (oscillation is isoY-only).
- AND no escape fires during the 1 s window.

#### Scenario: Zigzag enemy flips isoY sign over period

- GIVEN a `camion_treco` (zigzag, `speed: 0.4` Hz period)
- WHEN 50 ticks elapse at 16.67 ms each
- THEN `enemy.isoY` flips between roughly `spawnIsoY + A` and `spawnIsoY − A`
  at least once
- AND `enemy.isoX` is locked to `spawnIsoX` throughout.

#### Scenario: Arc enemy stays bounded around capture point

- GIVEN a `bidon_lixiviado` (arc, `speed: 1.0` rad/s)
- WHEN 60 ticks elapse at 16.67 ms each
- THEN `sqrt((isoX − arcCenter.isoX)^2 + (isoY − arcCenter.isoY)^2)`
  stays within `±20%` of the configured radius (~0.25 iso tiles).
- AND no escape fires.

#### Scenario: Static-rule enforcement at boot

- GIVEN the boot sequence loads the spawn list
- WHEN each `spriteId` is checked against the static list
- THEN every match resolves to `speed: 0` and `movementPattern: 'static'`.

#### Scenario: TEST_LEVEL has 120 enemies

- GIVEN the level module loads
- WHEN `TEST_LEVEL.enemies.length` is read
- THEN the value equals `120`.

### REQ-CMB-012: Test-mode auto-advance (camera + enemies)

When `?test=1` is active and the production game loop runs, the system SHALL
auto-advance both the camera and the enemies each frame WITHOUT requiring the
user to call `__gameTestAPI__.tick(dt)` manually. The production ticker
(`appWorld.ticker`, `appHud.ticker`) SHALL call `camera.update(dt)` and
`enemies.update(...)` in test mode, using the live `dt` reported by
`performance.now()` deltas.

Auto-advance SHALL spawn time-gated enemies as the camera's elapsed time
crosses their `atSec` threshold, run the escape detection pipeline
(`isScreenEscaped` / `isEscaped`), and coexist with
`__gameTestAPI__.setTime(t)` + `__gameTestAPI__.tick(dt)` manual control —
when a test calls `setTime`, the next auto-advance tick observes the new
time and continues from there.

In production (`?test=0`): no behavior change. The pre-existing
`if (!inTestMode)` guards on `camera.update` and `enemies.update` were
unconditionally removed in fase-5-movement-calibration (a safe simplification:
production already advanced them, so the guards were redundant for that path).

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
- AND e01 has NOT escaped (oscillation keeps it within 6-tile Manhattan
  radius of the camera).

#### Scenario: Lateral clamp is amplitude-aware

- GIVEN a mobile enemy whose spawn iso projects to screen X well inside the
  `[LATERAL_MIN_PX, LATERAL_MAX_PX]` corridor (e.g. mid-screen)
- WHEN 30 ticks elapse (oscillation only — amplitude ≤0.5 iso tiles)
- THEN the enemy stays inside the corridor — no clamp fires (clamp is a
  guard, not the primary motion driver).

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

## MODIFIED Requirements

### REQ-CMB-003: Tightened screen-space hit detection (reverse-depth, hitInset)

Resolve a click against its **screen-space coordinate**. For each live enemy, compute
an AABB from `sprite.getBounds()` and **shrink by the archetype's `hitInset`**
(REQ-CMB-006). Cursor is a candidate iff inside the **shrunk** AABB —
transparent-padding clicks miss. If `sprite` is null, fall back to
`isoToScreenWithCamera(...) ± tileSize/2`, also shrunk. Sort by
`depth = isoX + isoY` desc; tie by ID asc. First wins. Misses fire `miss`.

(Originally F3: continuous iso-plane footprint AABB test against the click's
iso-world coord. F5-hit-detection-fix switched to screen-space `sprite.getBounds()`
AABB; F5-hitbox-visualization shrinks that AABB by per-archetype `hitInset`.)

#### Scenario: Click on visible body hits

- GIVEN a `standard` enemy (`hitInset = {16,16,16,16}`)
- WHEN the user clicks at the sprite center
- THEN the enemy is a candidate
- AND `hit` fires.

#### Scenario: Click 5px outside inset edge misses

- GIVEN a `standard` enemy with shrunk AABB `x ∈ [280, 320]`
- WHEN the user clicks at `(275, 200)`
- THEN no candidate
- AND `miss` fires
- AND no HP changes.

#### Scenario: Click on inset edge hits (regression-safe)

- GIVEN the same enemy
- WHEN the user clicks at `(280, 200)` (exact edge)
- THEN the enemy is a candidate
- AND `hit` fires.

#### Scenario: All four archetypes honor hitInset

- GIVEN one live enemy per archetype
- WHEN the user clicks inside each enemy's shrunk AABB
- THEN each click hits.

#### Scenario: Resolution & DPR independence

- GIVEN the same enemy at `1280×720` and `3840×2160` (DPR 2)
- WHEN the user clicks the same logical point on the visible body
- THEN both clicks hit.

#### Scenario: Reverse-depth on overlap

- GIVEN two enemies whose shrunk AABBs both contain the click, equal `isoX + isoY`
- WHEN the user clicks
- THEN the lower-ID enemy wins.

## Out of scope

- Ally hit logic — explicitly out per `proposal.md` §2. F3 has no allies in the
  test fixture; allies arrive in F5.
- Per-pixel alpha-mask picking — out per `proposal.md` §4 (Approach 1 is canonical).
- Multi-shot volley or charge-up attacks — out. The cooldown is fixed at 333 ms.
- Projectile–projectile collision — out. Two papeletas can fly through each other.
- Audio feedback on hit/miss — out. F3 has no audio (F7 owns audio).
