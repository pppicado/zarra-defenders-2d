# Delta for `combat-core`

**Change**: fase-5-projectile-homing
**Capability**: combat-core (MODIFIED)

## Purpose

Modify REQ-CMB-002 so the papeleta **homes** toward the target's live screen position each frame instead of traveling in a fixed straight line set at spawn time. Each tick the projectile recomputes its target via `isoToScreenWithCamera` against stored `isoX/isoY`, tracking a moving enemy. REQ-CMB-001, 003, 004, 005 are unchanged.

## MODIFIED Requirements

### REQ-CMB-002: Projectile lifecycle (papeleta) — homing

The system SHALL spawn one "papeleta" sprite (16×16 PNG, ≤ 24 px on screen), storing the tap target's iso world coords (`isoX`, `isoY`). Each tick the projectile SHALL recompute the target screen position via `isoToScreenWithCamera(isoX, isoY, cameraIso, viewportCenter)` against the live iso coords, rebuild its velocity from its current position toward that recomputed target (normalized × `800 world units / second`), and apply a sine-wave offset perpendicular to the travel axis (amplitude `±2 px`, period `0.4 s`). The projectile SHALL despawn on the first of: (a) `1.5 s` lifetime elapsed, (b) enemy collision (REQ-CMB-003), (c) leaving the camera frustum (AABB + 1-tile margin), (d) reaching the recomputed target within `8 px`. Spawn point SHALL be the hand sprite's screen-space center.

(Previously: straight-line flight toward a static target set at spawn time; no per-frame target recalculation.)

#### Scenario: Spawn stores iso target; initial velocity is rebuilt

- GIVEN hand at `(hx, hy)`, tap iso target `(gx, gy)`
- WHEN the projectile is spawned
- THEN `isoX = gx`, `isoY = gy` are stored
- AND initial velocity points toward `isoToScreenWithCamera(gx, gy, ...)`, normalized × 800 u/s
- AND sine offset starts at `0`, oscillates ±2 px over 0.4 s.

#### Scenario: Projectile homes toward a moved target each tick

- GIVEN a projectile at `isoX=5, isoY=5` and an enemy moved off the spawn-time screen target by `t = 200 ms`
- WHEN `tick()` runs that frame
- THEN `target = isoToScreenWithCamera(isoX, isoY, cameraIso, viewportCenter)` returns the enemy's LIVE screen position
- AND velocity is rebuilt from current position toward that recomputed target.

#### Scenario: Despawn on lifetime, frustum exit, or arrival fires no `hit`

- GIVEN a projectile spawned at `t = 0` with no enemy collision
- WHEN simulation reaches `t = 1500 ms` OR the trajectory exits the camera frustum + 1-tile margin OR the projectile reaches the recomputed target within `8 px`
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
