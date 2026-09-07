# `enemy-archetypes` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: enemy-archetypes (NEW)

## Purpose

Define the four enemy archetypes (`standard`, `tank`, `mini-boss`, `boss`) as a single source of truth for HP, footprint, score multiplier, visual flash duration, and assignment of named sprites to archetypes. The capability SHALL be consumed by `combat-core` (HP, footprint), `player-integrity` (escape detection), the test fixture (`?test=1`), and the asset manifest (sprite → archetype binding).

## Requirements

### REQ-ENM-001: Archetype HP table (locked)

The system SHALL define exactly four archetypes with the following HP values:

| Archetype | HP |
|---|---|
| `standard` | `1` |
| `tank` | `3` |
| `mini-boss` | `10` |
| `boss` | `30` |

The table SHALL live as a single constant (`ARCHETYPES`) exported from `src/enemies.js`. Every other module (combat, integrity, test API) SHALL read HP from this constant, never hardcode numbers. `dron_fumigador` SHALL be assigned the `tank` archetype (HP = 3) — locked by user decision 2026-09-07; this assignment SHALL be reflected in `assets/sprites/manifest.json` and in the test-fixture roster.

#### Scenario: Tank archetype for dron_fumigador

- GIVEN `assets/sprites/manifest.json` contains `dron_fumigador`
- WHEN the manifest is loaded by `EnemyManager`
- THEN the entry's `archetype` field equals `"tank"`
- AND `Enemy.spawn({ archetype: "tank" })` produces an enemy with `hp === 3`.

#### Scenario: Single source of truth — no hardcoded HP

- GIVEN `src/enemies.js` exports `ARCHETYPES.tank.hp === 3`
- WHEN a developer changes the value to `5` for an experiment
- THEN all consumers (`combat-core`, `player-integrity`, test API) observe `5` without further edits
- AND the change is reverted before commit (verified by `git grep "hp: 3"`).

#### Scenario: Mini-boss and boss HP table

- GIVEN `ARCHETYPES["mini-boss"].hp === 10` and `ARCHETYPES.boss.hp === 30`
- WHEN the test fixture spawns one of each
- THEN the mini-boss instance starts at `hp = 10`
- AND the boss instance starts at `hp = 30`.

### REQ-ENM-002: Footprint configuration per archetype

The system SHALL define a footprint half-width and half-height (in iso tile units) per archetype. Default footprint for all archetypes SHALL be `1 × 1 tile` (`hw = hh = 0.5`). Archetypes MAY override `hw` / `hh` to widen the click-hit box; the value `ARCHETYPES[X].footprint` SHALL be the source of truth.

Recommended overrides (locked for F3):

| Archetype | `hw` | `hh` |
|---|---|---|
| `standard` | `0.5` | `0.5` |
| `tank` | `0.7` | `0.7` |
| `mini-boss` | `0.8` | `0.8` |
| `boss` | `1.0` | `1.0` |

#### Scenario: Tank footprint is wider than standard

- GIVEN `ARCHETYPES.tank.footprint === { hw: 0.7, hh: 0.7 }`
- WHEN the hit-test runs at iso `(5.3, 5.0)` against a tank at `(5, 5)`
- THEN the click point falls inside the AABB (distance 0.3 ≤ hw 0.7)
- AND the same click against a standard at `(5, 5)` falls outside (0.3 > 0.5 → miss).

#### Scenario: Standard footprint is the smallest

- GIVEN `ARCHETYPES.standard.footprint === { hw: 0.5, hh: 0.5 }`
- WHEN a click lands at iso `(5.4, 5.0)` against a standard at `(5, 5)`
- THEN the click misses (0.4 < 0.5 — still inside) — verify the boundary: a click at `(5.51, 5.0)` misses.

### REQ-ENM-003: Score multiplier per archetype

The system SHALL award `points = 10 × multiplier` per hit, with the following multipliers:

| Archetype | Multiplier |
|---|---|
| `standard` | `1` |
| `tank` | `1.5` |
| `mini-boss` | `2` |
| `boss` | `3` |

The multiplier SHALL live alongside HP and footprint in `ARCHETYPES[X].multiplier`.

#### Scenario: Tank hit awards 15 points

- GIVEN a tank enemy
- WHEN one hit resolves
- THEN `score` increases by `15` (10 × 1.5).

#### Scenario: Boss hit awards 30 points

- GIVEN a boss enemy
- WHEN one hit resolves
- THEN `score` increases by `30` (10 × 3).

### REQ-ENM-004: Destruction animation duration

When an enemy transitions to `destroyed` (HP reaches 0), the system SHALL play a destruction animation lasting exactly `200 ms` (`DESTRUCTION_ANIM_MS = 200`) and SHALL keep the enemy in the active list until that window elapses. The default visual flash SHALL be a 1-tint recolor (e.g., the enemy sprite's tint cycles white → transparent over the 200 ms). The exact tint animation is implementation detail; the observable contract is the `200 ms` window and the single `enemy:destroyed` event firing at HP = 0.

#### Scenario: Enemy remains for 200 ms after HP = 0

- GIVEN an enemy's HP just became 0
- WHEN 199 ms elapses
- THEN the enemy is still present in `__gameTestAPI__.readEnemies()` (status `destroyed`).
- WHEN 200 ms elapses
- THEN the enemy is removed from the active list.

### REQ-ENM-005: Asset → archetype bindings

`assets/sprites/manifest.json` SHALL declare the archetype binding for every enemy sprite used in the test fixture. The binding SHALL be a top-level field `archetype` per sprite entry (e.g., `"dron_fumigador": { ..., "archetype": "tank" }`). The loader SHALL refuse to spawn an enemy whose manifest archetype is missing or unknown — it SHALL throw a `ConfigError` listing the offending sprite id. `plataforma_solar` SHALL be marked `"deprecated": true` in the manifest (kept on disk for F4 audit trail; not used in F3 test fixture).

#### Scenario: Manifest binds dron_fumigador to tank

- GIVEN `assets/sprites/manifest.json`
- WHEN the JSON is parsed by `EnemyManager`
- THEN the entry `dron_fumigador` has `archetype === "tank"`.

#### Scenario: Loader rejects unknown archetype

- GIVEN a manifest entry with `archetype: "glass-cannon"`
- WHEN `EnemyManager` parses it
- THEN a `ConfigError` is thrown naming the sprite id
- AND no enemy is spawned.

## Out of scope

- AI behavior (waves, formations, movement patterns) — F5.
- Per-enemy audio cues — F7.
- Multiple HP bars / shield layers — out. Each enemy has one HP value.
- Sprite regeneration of `camion_cisterna_residuos` — F4. F3 uses a 64×64 magenta-chroma placeholder PNG.