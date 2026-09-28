# Spec — Combat 1-Shot-Kill + Hitbox=Sprite + Nearest-Center Tie-Break

This delta spec captures the three combat refinements landed in F6.1
(2026-09-28): uniform hp=1 for non-boss, hitbox equality with sprite
bounds, and nearest-center overlap resolution.

## Purpose

Fix the "a veces hay algunos enemigos que no mueren aunque les impactes"
bug. Three inter-related causes:
1. Non-boss archetypes required multiple shots (tank: 3, mini-boss: 10)
2. Hitbox was inset from the visible sprite (transparent-padding shrinkage)
3. Overlap resolver picked by depth-desc instead of nearest-center

## Requirements

### Requirement: Non-boss enemies die in 1 shot

`ARCHETYPES` in `src/enemies.js` MUST define `hp: 1` for `standard`,
`tank`, and `mini-boss`. Only `boss` (the final stage boss, spriteId
`enemies_sello_burocratico`) keeps a multi-HP value (30).

#### Scenario: tank enemy (dron_fumigador) hit

When the player fires at a dron_fumigador, `target.applyHit(1)` reduces
hp to 0 and marks the enemy as destroyed (or desactivated, depending on
lifecycle). The enemy disappears on the next frame.

Pre-fix: required 3 hits. Post-fix: 1 hit.

#### Scenario: mini-boss enemy (planta_treco as mini-boss) hit

When the player fires at the mini-boss archetype, 1 hit kills the enemy.

Note: the `planta_treco` spriteId is used with the `mini-boss` archetype
in TEST_LEVEL's static enemy roster (e23, e_miniboss_001..006). Those
instances are NOT the final boss and MUST die in 1 hit. Only the
`boss`-archetype instance (e12, e24) keeps HP 30.

#### Scenario: Final boss (sello_burocratico as boss archetype) hit

When the player fires at the final boss, `target.applyHit(1)` reduces
hp to 29 (not 0). The boss stays alive.

Pre-fix: same behavior. Post-fix: same behavior. Boss kill contract
unchanged.

### Requirement: Multiplier preserved across archetypes

Each archetype's `multiplier` MUST be preserved. The visual hierarchy and
score reward survive:

- standard: ×1 → 10 pts
- tank: ×1.5 → 15 pts
- mini-boss: ×2 → 20 pts
- boss: ×3 → 30 pts

#### Scenario: tank enemy killed

Player fires once at dron_fumigador. `combat.js` reads
`ARCHETYPES[target.archetype].multiplier === 1.5`, computes
`scoreDelta = Math.round(10 * 1.5) = 15`. `score.addHit(1.5)` is called.
Total +15 pts, +1 firma.

### Requirement: Hitbox equals sprite bounds (no inset)

`hitInset` MUST be `0` on all archetypes. Concretely:
- standard: `{ top: 0, right: 0, bottom: 0, left: 0 }`
- tank: same
- mini-boss: same
- boss: same

`Enemy.getScreenBounds(enemy, isoWorld, cameraIso, viewportCenter)` MUST
NOT subtract any `hitInset` from the AABB returned by
`enemy.sprite.getBounds()`.

#### Scenario: Click on visible sprite body

When the player clicks anywhere inside the PIXI sprite's visible bounds
(as rendered by PIXI with post-translate, post-scale, post-anchor
applied), the click MUST register as a hit. Lo que ves es lo que golpeás.

Pre-fix: a click within the visible sprite's transparent padding area
(16/12/10/8 px border depending on archetype) would whiff because the
AABB was shrunk by `hitInset`.

Post-fix: a click anywhere inside the PIXI `getBounds()` rectangle is a hit.

#### Scenario: Click on transparent margin OUTSIDE the sprite

When the player clicks outside the PIXI sprite's `getBounds()` rectangle
(even if visually adjacent), the click is NOT a hit. The hitbox is the
PIXI bounds, not the visible bounds — these usually coincide but PIXI
already accounts for any anchor / scale / transparency correctly.

### Requirement: Overlap resolver picks nearest-center-to-click

`Combat._resolveHitAtScreenPoint` MUST sort candidates by ascending
squared distance from each candidate's AABB center to the click point.
The first candidate wins. Tie-breaks:
1. depth desc (preserves legacy rail-front bias on equidistant ties)
2. id asc (stable sort)

#### Scenario: Standard enemy behind tank, click on tank center

Two enemies with overlapping AABBs:
- `e_std_005` (camion_treco) at depth 38.4, bounds (539, 223, 128, 128)
- `e_tank_001` (dron_fumigador) at depth 38.348, bounds (544, 228, 128, 128)

Player clicks at (611.6, 295.5) — inside both AABBs.

Pre-fix (sort by depth desc): `e_std_005` wins (greater depth). Hit goes
to the standard. Tank survives despite being the visible target.

Post-fix (sort by nearest-center-to-click):
- `e_std_005` center: (603.4, 287.5), distance² to (611.6, 295.5): 121
- `e_tank_001` center: (608.4, 292.4), distance² to (611.6, 295.5): 17.5

`e_tank_001` wins. Hit goes to the tank. The visible target dies.

#### Scenario: Two sprites equidistant from click

When two candidates have the same distance² (rare), the depth-desc
tie-break picks the one with greater depth (legacy rail-front bias).

## Acceptance

- `tests/e2e/one-shot-kill.spec.mjs`: 98 asserts in 4 parts
  - **Part A** (walk-through, 81 frames × multiple fires):
    every non-boss spriteId encountered in the time range, all die in
    1 shot. Boss survives.
  - **Part B** (hitbox coverage): for each spriteId, spawn 1 isolated
    instance at iso (2,2) (Manhattan=4, below escape threshold), fire at
    5 AABB points (center, topLeft, topRight, bottomLeft, bottomRight).
    All 55 hits register on the correct enemy and destroy it.
  - **Part C** (overlap tie-break): find 2 enemies with overlapping
    AABBs. Fire at the aimed (visible) sprite's center. Assert the
    aimed enemy dies; the deeper (occluded) survives.
  - **Part D** (boss kill contract): boss survives 29 hits, dies on hit
    #30. `stage:cleared` fires (requires `setTime(125)` to exceed
    `railEndTime=120`).
- `tests/e2e/hit-detection.spec.mjs`: still PASS (R3 part covers all
  archetypes including tank/mini-boss/boss hit-testability)
- `tests/e2e/enemy-movement.spec.mjs`: still PASS (R10 oscillation
  behavior unchanged)
- `tests/e2e/projectile-direction.spec.mjs`: still PASS
- `tests/e2e/rail-direction.spec.mjs`: still PASS

## References

- `src/enemies.js` `ARCHETYPES` table — hp:1 for non-boss, hitInset:0 for all
- `src/combat.js` `_resolveHitAtScreenPoint` — nearest-center sort with
  depth-desc + id-asc tie-breaks
- `tests/e2e/one-shot-kill.spec.mjs` — 98 asserts across 4 parts
- Commit `24376b4 fix(combat): F6.1 1-shot-kill + hitbox=sprite + nearest-center tie-break`
