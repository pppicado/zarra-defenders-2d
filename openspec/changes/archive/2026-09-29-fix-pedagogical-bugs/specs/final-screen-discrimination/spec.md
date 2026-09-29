# Delta Spec: final-screen boss spriteId discrimination

## MODIFIED Requirements

### REQ-FS-001: Final-screen trigger discrimination

**Description**: The final-screen ("El Valle se planta") MUST only appear
when the player destroys the **final-boss of the active stage roster**
(identified by `spriteId` matching one of `FINAL_BOSS_SPRITE_IDS`). Mini-boss
encounters of the same spriteId in earlier stages MUST NOT trigger the
final-screen.

**Rationale**: Before this fix, the listener used
`spriteId === 'enemies_planta_treco'`, which matched both mini-boss and
final-boss instances of `planta_treco`. The proposed `?test=1` level
(`TEST_LEVEL`) used the same spriteId for both. To preserve backward
compatibility with `?test=1` while enabling production discrimination, the
listener MUST match against **both** spriteIds.

**Scenarios**:

#### Scenario: Final-screen appears in production mode when killing final-boss

- GIVEN the player has loaded `?stage=stage5-acuifero` (production mode)
- AND the stage5 roster is loaded via `getRosterForStage('stage5-acuifero')`
- WHEN the player destroys `enemies_planta_treco_boss` (the final-boss of stage5)
- AND the enemy's `lifecycle === 'desactivacion'` triggers `zarra:desactivacion` event
- THEN the listener at `src/main.js:436` MUST show the final-screen
- AND the final-screen MUST have `aria-hidden="false"`
- AND the final-screen MUST contain the dato + 4 enlaces

#### Scenario: Final-screen does NOT appear when killing mini-boss planta_treco in stages 1-4

- GIVEN the player has loaded `?stage=stage1-lashoyas` (production mode)
- AND the stage1 roster is loaded (includes mini-boss `enemies_planta_treco` in stages 1-4)
- WHEN the player destroys `enemies_planta_treco` (mini-boss)
- THEN the listener MUST NOT show the final-screen
- AND the final-screen MUST remain `aria-hidden="true"`

#### Scenario: Final-screen still appears in `?test=1` mode (backward compatibility)

- GIVEN the player has loaded `?test=1` mode
- AND TEST_LEVEL is loaded (includes 6 instances of `enemies_planta_treco` with `lifecycle: 'desactivacion'`)
- WHEN the player destroys any `enemies_planta_treco` instance
- THEN the listener MUST show the final-screen
- AND this MUST NOT regress any existing `final-screen.spec.mjs` assertions

### REQ-FS-002: Final-boss of stage5 has `lifecycle='desactivacion'`

**Description**: The final-boss entry of stage5 roster MUST have
`lifecycle='desactivacion'` so that the A7 contract (boss desactivación
uniforme) holds in production.

**Scenarios**:

#### Scenario: stage5 boss definition includes lifecycle

- GIVEN the stage5 roster is built by `_buildRoster()` in
  `src/levels/stage-rosters.js`
- THEN the `boss` entry MUST include `lifecycle: 'desactivacion'`
- AND the factory `_enemy()` MUST forward the `lifecycle` parameter to the
  returned definition object

### REQ-FS-003: Final-boss of stage5 uses spriteId `enemies_planta_treco_boss`

**Description**: The final-boss entry of stage5 roster MUST use the
spriteId `enemies_planta_treco_boss` (distinct from
`enemies_planta_treco`) so that the final-screen listener can discriminate
final-boss vs mini-boss instances.

**Scenarios**:

#### Scenario: stage5 boss spriteId is `enemies_planta_treco_boss`

- GIVEN the stage5 roster is built by `_buildRoster()`
- THEN the `boss.spriteId` MUST be `'enemies_planta_treco_boss'`
- AND the manifest at `assets/sprites/manifest.json` MUST include an entry
  for `enemies_planta_treco_boss` with `path: 'assets/sprites/enemies_planta_treco.png'`
  (reusing the same PNG)

### REQ-FS-004: Final-boss of stage5 has `archetype='boss'` (hp:30)

**Description**: The final-boss of stage5 MUST be a multi-HP boss fight,
not a 1-shot kill mini-boss. The archetype MUST be `'boss'` (hp:30) per
`ARCHETYPES.boss` in `src/enemies.js`.

**Scenarios**:

#### Scenario: stage5 boss takes 30 hits to destroy

- GIVEN the player has loaded the stage5 roster
- WHEN the player fires 29 hits at the final-boss
- THEN the final-boss MUST still be alive (hp > 0)
- WHEN the player fires the 30th hit
- THEN the final-boss MUST transition to `state='desactivated'` (A7 contract)
- AND `zarra:desactivacion` MUST be emitted
