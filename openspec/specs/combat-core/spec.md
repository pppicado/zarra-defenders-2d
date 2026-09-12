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
