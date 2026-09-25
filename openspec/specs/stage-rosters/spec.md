# Spec — Stage Rosters

This spec defines the per-stage enemy roster system. Phase 6 implementation:
2026-09-25, archived as `openspec/changes/archive/2026-09-25-fase-6-stages-menus/`.

## Purpose

Each of the 5 stages in Zarra Defenders 2D has a thematic enemy composition
that reflects the geographical and political nature of the location. A single
stage-rosters module exposes the registry; `bootTestLevel` selects the roster
based on the active stage.

## Requirements

### Requirement: 5 Stage Rosters

The game SHALL define 5 rosters, one per stage, in a frozen registry
`STAGE_ROSTERS`:

| Stage | finalBossSpriteId |
|---|---|
| stage1-lashoyas | `enemies_topadora` |
| stage2-lahoz | `enemies_tubo_lixiviado` |
| stage3-lahunde | `enemies_incineradora` |
| stage4-ayora | `enemies_trailer` |
| stage5-acuifero | `enemies_planta_treco` |

#### Scenario: Each roster has required shape

Each roster SHALL have: `railPath` (≥2 waypoints), `railEndTime` (number),
`enemies` (array, ≥20 entries), `finalBossId` (string), `finalBossSpriteId`
(string), `stageId` (string).

#### Scenario: Each roster has unique finalBossSpriteId

No two stages SHALL share the same `finalBossSpriteId`.

#### Scenario: Each roster includes a boss + mini-boss

Each roster SHALL include at least one `archetype: 'boss'` and at least one
`archetype: 'mini-boss'` entry.

### Requirement: Roster Selection by Stage ID

`getRosterForStage(stageId)` SHALL return the matching roster, or `null` if
no roster exists for the given stageId.

#### Scenario: Wire in bootTestLevel

When `bootTestLevel` runs with `bg.stageId` set, the game SHALL call
`enemies.loadLevel(roster.enemies)` instead of the default `TEST_LEVEL.enemies`.

When `bg.stageId` is null or unknown, the game SHALL fall back to
`TEST_LEVEL.enemies` to preserve the canonical `?test=1` path.

### Requirement: Sprite Coverage

Each roster SHALL only use spriteIds from the canonical 12-enemy catalog
defined in `src/enemies.js`. Sprites mentioned in ROADMAP §6.1 that don't
exist yet (motosierra, plataforma_solar, humo toxico, drones de vigilancia,
extractores) are NOT used — they're future assets.

#### Scenario: Each enemy has valid spriteId

For every enemy in every roster, the `spriteId` SHALL be one of:
- camion_treco, bidon_lixiviado, bolsa_plastico, tubo_lixiviado,
  dron_fumigador, valla_publicitaria, camion_cisterna_residuos, topadora,
  trailer, planta_treco, incineradora, sello_burocratico.

### Requirement: REQ-CMB-009 Static Sprite Compliance

The rosters SHALL NOT cause static spriteIds (those in `STATIC_SPRITE_IDS` set)
to have non-zero speed or non-static movement pattern after
`resolveMovementConfig` is applied.

#### Scenario: assertAllRostersStatic does not throw

`assertAllRostersStatic()` SHALL throw if any roster has a static spriteId
with non-static movement config. For the current rosters, this function
does not throw.

### Requirement: List Stages with Roster

`listStagesWithRoster()` SHALL return an array of 5 stageIds:
`['stage1-lashoyas', 'stage2-lahoz', 'stage3-lahunde', 'stage4-ayora', 'stage5-acuifero']`.

## Out of Scope

- New sprite assets (ROADMAP mentions sprites that don't exist; this spec
  uses the existing 12)
- Per-stage music (F4 uses a single procedural template with tempo variations)
- Difficulty scaling (current rosters are similar size; future enhancement)
