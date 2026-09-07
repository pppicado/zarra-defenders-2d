# `combat-core` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: combat-core (NEW)

## Purpose

Define the contract for the smallest end-to-end rail-shooter combat loop. The system SHALL translate a tap into a signed "papeleta" projectile emitted from the hand sprite, fly the projectile in a straight line toward the click target, run a continuous iso-plane footprint hit test with reverse-depth selection, award points and decrement HP on hit, and silently despawn on miss. The capability exposes a deterministic event bus: `fire:requested`, `projectile:spawned`, `hit`, `miss`, `enemy:escaped`, `enemy:destroyed`.

## Requirements

### REQ-CMB-001: Fire trigger and cooldown

The system SHALL accept a fire request only when the cool-down gate is open and SHALL emit `fire:requested` exactly once per accepted request. The cool-down SHALL be `333 ms` (3 shots/sec, `FIRE_COOLDOWN_MS = 333`). A second fire request issued while the gate is closed SHALL be silently dropped — no projectile is spawned, no event fires, no penalty accrues. The first request after the gate opens SHALL succeed; the gate SHALL be opened again `333 ms` after that success.

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

### REQ-CMB-002: Projectile lifecycle (papeleta)

The system SHALL spawn exactly one projectile variant: a signed "papeleta" sprite rendered via a 16×16 PNG (small enough to look like paper fluttering; final dimensions are whatever `minimax_text_to_image` outputs, but the sprite SHALL be sized so its largest dimension ≤ 24 px on screen). The projectile SHALL travel in a straight line from the hand-sprite center to the click/tap iso target with a sine-wave offset applied perpendicular to the travel axis, amplitude `±2 px`, period `0.4 s`. Speed SHALL be `800 world units / second` (≈ 1 tile every 90 ms at `tileSize = 64`). The projectile SHALL be despawned on the first of: (a) `1.5 s` lifetime elapsed, (b) collision with a live enemy (see REQ-CMB-003), (c) projectile leaves the camera frustum (AABB check against the visible viewport plus a 1-tile margin). The spawn point SHALL be the hand sprite's screen-space center (see `hand-pen-sprite`).

#### Scenario: Papeleta flies from hand to target

- GIVEN the hand sprite's screen position is `(hx, hy)` and the tap iso target is `(gx, gy)`
- WHEN the projectile is spawned
- THEN the projectile's initial position is `(hx, hy)`
- AND the projectile's velocity vector points from `(hx, hy)` to `isoToScreen(gx, gy)`, normalized × 800 world-units/sec
- AND the sine offset starts at `0` and oscillates ±2 px with period 0.4 s.

#### Scenario: Projectile despawns on lifetime expiry

- GIVEN a projectile spawned at `t = 0`
- WHEN the simulation advances to `t = 1500 ms` with no enemy collision
- THEN the projectile is removed from the projectile manager
- AND no `hit` event fires (it was a miss, no card awarded).

#### Scenario: Projectile despawns on frustum exit

- GIVEN a projectile whose trajectory exits the camera frustum + 1-tile margin
- WHEN the next simulation tick runs
- THEN the projectile is removed
- AND no `hit` event fires.

#### Scenario: Cooldown applies regardless of projectile outcome

- GIVEN a fire at `t = 0` that misses (no enemy in path)
- WHEN the user taps at `t = 200 ms`
- THEN the tap is dropped (cooldown still active)
- AND the `t = 0` miss does NOT shorten the cooldown.

### REQ-CMB-003: Continuous iso-plane hit detection (footprint AABB, reverse-depth)

The system SHALL convert the click screen-space coordinate to an iso world coordinate using `screenToIsoWithCamera` (see `iso-camera-integration`), SHALL collect every live enemy whose archetype footprint AABB contains the click point, and SHALL select the hit target by sorting candidates by `depth = enemy.isoX + enemy.isoY` descending (the painter's-algorithm depth). The first candidate in that order wins; ties on depth SHALL be broken by enemy ID ascending (stable, deterministic). The default footprint is `1 × 1 tile`, axis-aligned in iso world space, centered on the enemy's iso position. Per-archetype footprint overrides (see `enemy-archetypes`) MAY enlarge the half-width / half-height. Misses SHALL fire `miss` and award nothing.

#### Scenario: Single enemy in path is hit

- GIVEN one live enemy at iso `(5, 5)` with `standard` archetype (`hw=hh=0.5`)
- WHEN the user clicks at the screen position that maps to iso `(5.0, 5.0)`
- THEN `screenToIsoWithCamera(...)` returns `(5.0, 5.0)`
- AND the enemy's footprint AABB contains the click
- AND the projectile collides: enemy HP decreases by 1, projectile is despawned, `hit` fires with `{ enemyId, damage: 1 }`.

#### Scenario: Reverse-depth selection picks closer enemy when multiple overlap

- GIVEN two live enemies at iso `(5, 5)` and `(4, 6)` whose footprints both contain the click point
- WHEN the user clicks
- THEN `(5, 5)` (depth 10) is selected over `(4, 6)` (depth 10 → tie, broken by ID ascending)
- AND the hit event fires for the selected enemy only.

#### Scenario: Click outside any footprint is a miss

- GIVEN no live enemy within `±0.5` iso units of the click point
- WHEN the user clicks
- THEN `miss` fires once
- AND no enemy HP changes
- AND the projectile is despawned silently (no card, no penalty).

#### Scenario: Tank archetype enlarged footprint is honored

- GIVEN a `tank` enemy at iso `(5, 5)` with `hw=hh=0.7` (footprint covers iso 4.3–5.7 × 4.3–5.7)
- WHEN the user clicks at the screen position mapping to iso `(5.0, 5.0)`
- THEN the click falls inside the AABB
- AND the hit resolves.

### REQ-CMB-004: Hit resolution (HP, score, "Firmas recogidas")

The system SHALL decrement the hit enemy's HP by `1` per hit, SHALL award points using the formula `points = 10 × archetype_multiplier`, where `standard = 1`, `tank = 1.5`, `mini-boss = 2`, `boss = 3`, and SHALL increment the `firmasRecogidas` counter by exactly `1` on each successful hit. When the enemy's HP reaches `0`, the enemy SHALL transition to the `destroyed` state, SHALL remain in the active list for `200 ms` while a destruction animation plays, and SHALL be removed from the active list at the end of that window. A `enemy:destroyed` event SHALL fire on the transition to `destroyed`.

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
- THEN HP becomes `2`, score increases by `15`, `firmasRecogidas += 1`, no `destroyed` event yet.
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

When the `?test=1` query parameter is active, the system SHALL use a seeded PRNG (`mulberry32`, seed `0xC0FFEE` by default; overridable via `?test=1&seed=N`) for any random selection inside combat paths, SHALL NOT call `Math.random()` inside combat paths (the production PRNG is `Math.random()`; tests use the seeded one), and SHALL run the simulation at a fixed 60 Hz tick (`FIRE_COOLDOWN_MS`, `PROJECTILE_SPEED`, `LIFETIME_MS`, and footprint dimensions are all constant — no per-tick randomness). The seeded PRNG MUST be injected at boot from `__gameTestAPI__.setSeed(n)` so a test can fix the seed before the level starts.

#### Scenario: No Math.random in combat when ?test=1

- GIVEN the URL contains `?test=1`
- WHEN the combat module loads
- THEN any `Math.random()` call site in `src/enemies.js`, `src/projectile.js`, `src/hit-detection.js`, and `src/main.js` combat paths is replaced by the seeded PRNG
- AND the seed defaults to `0xC0FFEE`.

#### Scenario: Deterministic level re-runs identically

- GIVEN a test fixture booted with `?test=1&seed=12345`
- WHEN the test fires `simulateTap(x1, y1)`, `simulateTap(x2, y2)`, etc.
- AND records `readEnemies()`, `readIntegrity()`, `readScore()` after each tap
- THEN a fresh page load with the same `?test=1&seed=12345` and the same tap sequence produces byte-identical observation arrays.

## Out of scope

- Ally hit logic — explicitly out per `proposal.md` §2. F3 has no allies in the test fixture; allies arrive in F5.
- Per-pixel alpha-mask picking — out per `proposal.md` §4 (Approach 1 is canonical).
- Multi-shot volley or charge-up attacks — out. The cooldown is fixed at 333 ms.
- Projectile–projectile collision — out. Two papeletas can fly through each other.
- Audio feedback on hit/miss — out. F3 has no audio (F7 owns audio).