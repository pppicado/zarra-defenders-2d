# `game-test-api` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: game-test-api (NEW)

## Purpose

Define the contract for `?test=1` query-parameter activation, the deterministic 60 Hz test fixture, and the `__gameTestAPI__` global object. The test API exists to enable Playwright headless verification of the combat loop without relying on real-time animations or randomness.

## Requirements

### REQ-TST-001: `?test=1` query-parameter activation

When the URL contains `?test=1`, the system SHALL boot directly into the test fixture, bypassing the main menu. The seed SHALL default to `0xC0FFEE` (overridable via `?test=1&seed=N` where `N` is a non-negative integer). The PRNG used in combat paths SHALL be the seeded `mulberry32` instance. `Math.random()` SHALL NOT be called inside combat paths under `?test=1` (see `combat-core` REQ-CMB-005).

#### Scenario: ?test=1 bypasses main menu

- GIVEN the URL is `http://localhost:8000/?test=1`
- WHEN the page loads
- THEN the main menu does NOT render (`display: none` or not in the DOM)
- AND the test-level scene mounts directly (12 enemies, rail camera, hand sprite visible).

#### Scenario: Seed defaults to 0xC0FFEE

- GIVEN the URL is `http://localhost:8000/?test=1`
- WHEN the boot completes
- THEN `__gameTestAPI__.getSeed() === 0xC0FFEE`.

#### Scenario: Seed override is honored

- GIVEN the URL is `http://localhost:8000/?test=1&seed=42`
- WHEN the boot completes
- THEN `__gameTestAPI__.getSeed() === 42`.

### REQ-TST-002: `__gameTestAPI__` surface

The system SHALL mount a `__gameTestAPI__` global object on `window` whenever `?test=1` is active. The object SHALL expose exactly the following methods (locked shape — additions are F4+; F3 ships this surface and nothing more):

| Method | Returns | Notes |
|---|---|---|
| `getStatus()` | `{ state, t, fps, integrity }` | Top-level snapshot for sanity tests. `state` is `"menu" \| "playing" \| "paused" \| "gameOver" \| "victory"`. |
| `getSeed()` | `number` | The current PRNG seed (default `0xC0FFEE`). |
| `setSeed(n)` | `void` | Re-seeds the PRNG; takes effect on the next call into a combat path. |
| `setTime(t)` | `void` | Forces `RailCamera` to time `t` (in seconds, e.g., `t = 0` for start, `t = 60` for end). |
| `tick(dtMs)` | `void` | Manually advances the simulation by `dtMs` milliseconds (deterministic stepping for tests; not the same as `setTime` which seeks). |
| `fireAtIso(x, y)` | `{ hit: boolean, enemyId: string \| null }` | Synthetically fires one shot at iso `(x, y)`; bypasses the cool-down gate (tests need precise control over fire timing). Returns whether any enemy was hit. |
| `simulateTap(screenX, screenY)` | `void` | Synthetically dispatches a pointer-down event at the given screen coords; goes through the input system but bypasses no cooldown (test mirrors user input). |
| `getEnemies()` | `Array<{ id, archetype, hp, isoX, isoY, depth, state }>` | Snapshot of every enemy, live and in the 200 ms destruction window. `state` is `"alive" \| "destroyed"`. |
| `getIntegrity()` | `{ current, max }` | Current integrity state. |
| `getScore()` | `{ score, firmas }` | Current run score and firmas counter. |
| `getProjectiles()` | `Array<{ id, x, y, targetIsoX, targetIsoY, ttlMs }>` | Snapshot of in-flight papeletas. |
| `on(event, cb)` | `void` | Subscribe to a combat / integrity / score event. `event` is one of `"hit" \| "miss" \| "enemy:escaped" \| "enemy:destroyed" \| "integrity:exhausted" \| "victory" \| "fire:requested" \| "projectile:spawned"`. Callback receives the event payload. |
| `off(event, cb)` | `void` | Unsubscribe. |

All snapshot methods SHALL return frozen objects (or new arrays) — mutating the returned value SHALL NOT mutate the game's internal state.

#### Scenario: getStatus returns snapshot

- GIVEN the test level is running at `t = 5.0`
- WHEN `__gameTestAPI__.getStatus()` is called
- THEN it returns `{ state: "playing", t: 5.0, fps: 60, integrity: { current: 3, max: 3 } }`.

#### Scenario: getEnemies returns deterministic roster

- GIVEN the test fixture's 12 enemies are loaded
- WHEN `__gameTestAPI__.getEnemies()` is called
- THEN it returns an array of 12 entries
- AND each entry has `{ id, archetype, hp, isoX, isoY, depth, state: "alive" }`
- AND the `archetype` values reflect the test-fixture roster (e.g., 8 standard, 2 tank, 1 mini-boss, 1 boss — the exact composition is implementation detail but MUST be documented in `assets/levels/test-level.json`).

#### Scenario: fireAtIso bypasses cooldown

- GIVEN `?test=1` is active and integrity = 3
- WHEN `fireAtIso(5, 5)` is called three times in immediate succession
- THEN all three fires resolve (cooldown bypassed — test API contract)
- AND the integrity remains unchanged if none of the three hit an enemy at iso `(5, 5)`.

#### Scenario: simulateTap respects cooldown

- GIVEN `?test=1` is active and the cooldown is open
- WHEN `simulateTap(640, 480)` is called once
- THEN `fire:requested` fires once
- AND the cooldown is now `333 ms` in the future.
- WHEN `simulateTap(640, 480)` is called again at `t = 100 ms`
- THEN the call is silently dropped (cooldown closed).

#### Scenario: setTime seeks camera

- GIVEN the test level is at `t = 5.0`
- WHEN `__gameTestAPI__.setTime(60.0)` is called
- THEN on the next tick, `RailCamera.getTime() === 60.0`
- AND if all 12 enemies are destroyed, the victory trigger fires.

#### Scenario: tick advances deterministically

- GIVEN the test level is at `t = 5.0`
- WHEN `__gameTestAPI__.tick(1000)` is called (1 second of simulation)
- THEN on return, `RailCamera.getTime() === 6.0`
- AND any spawn-by-time events in the `[5.0, 6.0]` window have fired.

#### Scenario: on/off subscribe

- GIVEN `?test=1` is active
- WHEN `__gameTestAPI__.on("hit", payload => console.log(payload))` is registered
- AND a hit resolves (e.g., `fireAtIso(5, 5)` against an enemy at `(5, 5)`)
- THEN the callback is invoked with `{ enemyId, damage: 1 }`.

### REQ-TST-003: 12-enemy deterministic fixture

The test fixture SHALL define exactly 12 enemies at fixed iso positions on the rail corridor. The fixture SHALL live at `assets/levels/test-level.json` and SHALL be loaded once at boot. The fixture SHALL NOT use `Math.random()` — all enemy positions, archetypes, and HP values are baked. The composition SHALL be documented in the fixture file (e.g., `8 standard, 2 tank, 1 mini-boss, 1 boss`; the exact count is implementation detail but MUST be ≥ 1 of each archetype except `boss`).

#### Scenario: 12 enemies load from fixture

- GIVEN `?test=1` is active
- WHEN the boot completes
- THEN `assets/levels/test-level.json` was fetched
- AND `__gameTestAPI__.getEnemies().length === 12`.

#### Scenario: Fixture has at least one boss

- GIVEN the test fixture
- WHEN `getEnemies()` is called
- THEN at least one enemy has `archetype === "boss"`.

#### Scenario: dron_fumigador is in the fixture

- GIVEN the test fixture
- WHEN `getEnemies()` is called
- THEN at least one enemy has `archetype === "tank"` (the dron_fumigador slot, per `enemy-archetypes` REQ-ENM-001).

#### Scenario: Same fixture, two boots → same enemies

- GIVEN the URL is `http://localhost:8000/?test=1&seed=42`
- WHEN the page is reloaded twice in succession
- THEN both boots produce identical `__gameTestAPI__.getEnemies()` arrays (same ids, same positions, same archetypes).

### REQ-TST-004: 60 Hz fixed clock (deterministic ticking)

The simulation SHALL step at a fixed `60 Hz` cadence under `?test=1` — `TICK_MS = 1000 / 60 ≈ 16.6667`. `setTime` and `tick` SHALL both honor this clock. The simulation SHALL NOT use `performance.now()` for combat state transitions under `?test=1`; the clock source SHALL be the test API's internal counter (advancing by `tick(dtMs)` or by `dtMs = TICK_MS * n` real-time ticks for live boot tests). In production (no `?test=1`), the simulation MAY use `performance.now()`.

#### Scenario: tick advances by exactly the requested amount

- GIVEN the test API clock is at `t = 0`
- WHEN `__gameTestAPI__.tick(16.6667)` is called
- THEN on return, `RailCamera.getTime() === 0.0166667`.

#### Scenario: 60 ticks advance by 1 second

- GIVEN the test API clock is at `t = 0`
- WHEN `__gameTestAPI__.tick(16.6667)` is called 60 times in a loop
- THEN on return, `RailCamera.getTime() === 1.0` (within floating-point tolerance).

#### Scenario: RailCamera honors setTime under ?test=1

- GIVEN `?test=1` is active and the camera is mid-rail
- WHEN `__gameTestAPI__.setTime(45.0)` is called
- AND `__gameTestAPI__.tick(16.6667)` is called once
- THEN on return, `RailCamera.getTime() === 45.0166667`
- AND the camera did NOT interpolate from the previous time using `performance.now()` (the setTime override took precedence).

## Out of scope

- Continuous integration test runner — out per `openspec/config.yaml` (`test_command: ""`).
- Visual screenshot regression suite — out. (Playwright headless screenshot is the verification tool per `openspec/config.yaml`, but no F3-owned visual-regression baseline ships.)
- Test API for `main-menu`, `game-over-flow`, `victory-flow` — out. F3 test API covers combat paths only.
- Mocked HTTP backend for high scores — out. Best score is `localStorage`-only.