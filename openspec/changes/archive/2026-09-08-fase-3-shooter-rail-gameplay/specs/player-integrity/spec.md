# `player-integrity` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: player-integrity (NEW)

## Purpose

Define the 3-segment integrity state machine. Each enemy that escapes (crosses the iso depth corridor front — see `iso-camera-integration` REQ-CAM-003) costs exactly one segment. When integrity reaches `0`, the system SHALL emit `integrity:exhausted` and trigger the game-over flow (see `game-over-flow`). The HUD SHALL render three horizontal segments in the top-right of the canvas (200×24 px, 4 px gap, pixel-art style).

## Requirements

### REQ-INT-001: 3-segment integrity state

The system SHALL initialize integrity to `{ current: 3, max: 3 }` at the start of every test-level run. Integrity SHALL be a single source of truth (a module-level state machine); the HUD SHALL render from it, the game-over flow SHALL react to it, and the test API SHALL expose it via `__gameTestAPI__.getIntegrity()`.

#### Scenario: Initial state is 3 segments

- GIVEN a fresh test-level boot (no `?test=1`)
- WHEN `__gameTestAPI__.getIntegrity()` is read
- THEN it returns `{ current: 3, max: 3 }`.

#### Scenario: Reintentar resets integrity to 3

- GIVEN integrity is `0` (game over just happened)
- WHEN the user clicks "Reintentar test level" in the game-over overlay
- THEN integrity returns to `{ current: 3, max: 3 }`
- AND `score` resets to `0`
- AND `firmasRecogidas` resets to `0`.

### REQ-INT-002: Escape penalty

When an enemy is detected as escaped (its iso center crosses the corridor front — see `iso-camera-integration` REQ-CAM-003), the system SHALL decrement integrity by exactly `1` segment, SHALL despawn the enemy without awarding points, and SHALL emit `enemy:escaped` with `{ enemyId, archetype }`. Integrity SHALL NOT go below `0`; a redundant escape when integrity is already `0` SHALL be silently ignored (no second `integrity:exhausted` event).

#### Scenario: One escape costs one segment

- GIVEN integrity is `{ current: 3, max: 3 }`
- WHEN an enemy at iso `(5, 5)` is detected as escaped
- THEN integrity becomes `{ current: 2, max: 3 }`
- AND `enemy:escaped` fires once
- AND the enemy's `firmasRecogidas` is unchanged (no points awarded on escape).

#### Scenario: Integrity floors at 0

- GIVEN integrity is `{ current: 1, max: 3 }`
- WHEN three enemies escape in quick succession
- THEN integrity becomes `{ current: 0, max: 3 }` after the first
- AND `integrity:exhausted` fires once (see REQ-INT-003)
- AND the second and third escape events are silently dropped from the integrity side (the enemies themselves still despawn).

#### Scenario: No penalty for hitting an enemy

- GIVEN an enemy is hit (HP decreases)
- WHEN the hit resolves
- THEN integrity is unchanged
- AND `score` and `firmasRecogidas` increase per `combat-core` REQ-CMB-004.

### REQ-INT-003: integrity:exhausted event triggers game-over flow

The system SHALL emit `integrity:exhausted` exactly once when `current` transitions from `> 0` to `0`. The event payload SHALL be `{ current: 0, max: 3, score, firmasRecogidas }`. The game-over flow module SHALL subscribe to this event, halt the rail camera, and render the game-over overlay (see `game-over-flow`). The event SHALL NOT fire if integrity never reached 0 (e.g., victory path — see `victory-flow`).

#### Scenario: Game over fires once per transition

- GIVEN integrity is `{ current: 1, max: 3 }`
- WHEN the third escape resolves
- THEN `integrity:exhausted` fires exactly once with `{ current: 0, max: 3, ... }`
- AND no second `integrity:exhausted` fires until integrity resets to `> 0` and back to `0`.

#### Scenario: integrity:exhausted is suppressed on victory

- GIVEN all 12 enemies are destroyed (integrity still `> 0`)
- WHEN the camera reaches the end of the rail
- THEN `integrity:exhausted` does NOT fire
- AND `victory` triggers the victory flow (see `victory-flow`).

### REQ-INT-004: HUD rendering (3 horizontal segments)

The system SHALL render the integrity HUD on the `hud` layer (NOT the `world` layer — it must not inherit the iso container transform), top-right of the canvas, sized `200 × 24 px` total. The HUD SHALL consist of exactly three horizontal rectangles, each `64 × 24 px` (rounded down for the gap math: 200 - 2×4 = 192 / 3 = 64), separated by a `4 px` gap. The full segment color SHALL be green (`#3FB950` or project-equivalent); the empty segment color SHALL be dark gray (`#3A3A3A` or project-equivalent). The HUD SHALL be hidden while the main menu, game-over overlay, or victory overlay is visible. On a viewport narrower than `600 px` (per proposal §7 risk), the HUD SHALL shrink to `160 × 20 px` to avoid overlapping the overlays.

#### Scenario: 3 segments visible at full integrity

- GIVEN integrity is `{ current: 3, max: 3 }` and the test level is running (no overlay visible)
- WHEN the HUD renders
- THEN the canvas top-right shows 3 green rectangles (64×24 px each, 4 px gap)
- AND no gray rectangles.

#### Scenario: 1 segment green, 2 gray at integrity = 1

- GIVEN integrity is `{ current: 1, max: 3 }`
- WHEN the HUD renders
- THEN 1 rectangle is green (leftmost) and 2 are dark gray.

#### Scenario: All segments gray at game over

- GIVEN integrity just hit `0` and the game-over overlay is now visible
- WHEN the HUD renders
- THEN all 3 rectangles are dark gray
- AND the HUD may be hidden behind the overlay z-index (overlay z-index > HUD z-index).

#### Scenario: HUD hidden during main menu

- GIVEN the main menu is the first-paint screen (no `?test=1`)
- WHEN the HUD renders
- THEN the integrity HUD is `display: none` (or has `visibility: hidden`)
- AND no green or gray rectangles appear.

#### Scenario: HUD shrinks on narrow viewport

- GIVEN the viewport is `400 × 800` (mobile portrait)
- WHEN the HUD renders
- THEN the total HUD size is `160 × 20 px` (not `200 × 24`)
- AND the 3 segments + 4 px gap math preserves the visible proportion.

## Out of scope

- Ally-hit penalty — out per `proposal.md` §2. The F3 test fixture has no allies.
- Variable starting integrity per stage — out. F3 always starts at 3.
- Power-ups, repair kits, or temporary shields — out.
- Animated "damage taken" pulse on the HUD beyond a brief 200 ms highlight on the affected segment (optional polish; not load-bearing for F3).