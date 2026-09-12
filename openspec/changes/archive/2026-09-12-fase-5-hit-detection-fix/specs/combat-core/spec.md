# Delta for `combat-core`

**Change**: fase-5-hit-detection-screen-bounds
**Capability**: combat-core (MODIFIED — inherited from F3 combat-core spec)

## MODIFIED Requirements

### REQ-CMB-003: Screen-space sprite bounds hit detection (reverse-depth)

The system SHALL resolve a click hit against the click's **screen-space coordinate**, not an iso-plane AABB. For every live enemy, the system SHALL compute a screen-AABB from `enemy.sprite.getBounds()` (PIXI world-space AABB evaluated at call time, after all transforms). The cursor is a candidate hit iff it falls inside that AABB. If `enemy.sprite` is null (texture unavailable), the system SHALL fall back to a default screen-AABB derived from `isoToScreenWithCamera(enemy.isoX, enemy.isoY, cameraIso, viewportCenter)` extended by `±tileSize / 2` on each axis.

Candidates SHALL be sorted by `depth = enemy.isoX + enemy.isoY` descending (painter's-algorithm depth); ties SHALL be broken by enemy ID ascending. The first candidate wins. Misses SHALL fire `miss` and award nothing. The result SHALL be **resolution-independent**: the same click yields the same hit/miss at any canvas resolution or DPR, because the test compares screen coordinates to a screen-AABB derived from the rendered sprite. Per-archetype iso-footprint `hw/hh` values SHALL NOT be used for hit testing under this requirement.

#### Scenario: Click on visible sprite hits (standard archetype)

- GIVEN a `standard` enemy at iso `(5, 5)` with a rendered sprite scaled to the current `tileSize`
- WHEN the user clicks at a screen point inside `enemy.sprite.getBounds()`
- THEN that enemy is a candidate
- AND HP decreases by 1, projectile is despawned, `hit` fires with `{ enemyId }`.

#### Scenario: Click outside every sprite bounds is a miss

- GIVEN live enemies whose `getBounds()` AABBs cover disjoint screen regions
- WHEN the user clicks at a screen point outside every enemy's screen-AABB
- THEN `miss` fires once
- AND no enemy HP changes
- AND the projectile is despawned silently.

#### Scenario: All four archetypes are hit-testable

- GIVEN one live enemy of each archetype (`standard`, `tank`, `mini-boss`, `boss`) at the current `tileSize`
- WHEN the user clicks inside each enemy's `getBounds()` AABB
- THEN each of the four clicks resolves to a hit on the corresponding enemy
- AND no click misses due to fixed-extent iso AABB.

#### Scenario: Resolution and DPR independence

- GIVEN the same `standard` enemy rendered at `1280×720` and at `3840×2160` (DPR 2)
- WHEN the user clicks at the same logical screen point on the visible sprite in both renderings
- THEN both clicks resolve to a hit
- AND no `tileSize` or `hw/hh` iso-extent value is consulted in the hit decision.

#### Scenario: Sprite-null fallback uses iso-projected default AABB

- GIVEN a live enemy with `enemy.sprite === null` (texture failed to load)
- WHEN the user clicks inside the fallback AABB `isoToScreenWithCamera(enemy.isoX, enemy.isoY) ± tileSize/2` per axis
- THEN the enemy is a candidate
- AND the hit resolves normally.

#### Scenario: Reverse-depth selection picks closer enemy on overlap

- GIVEN two live enemies whose `getBounds()` AABBs both contain the click, with `isoX + isoY = 10` for both
- WHEN the user clicks
- THEN the enemy with the lower ID wins the tie-break
- AND `hit` fires for the selected enemy only.

## Unchanged in this delta

- REQ-CMB-001 — Fire trigger and cooldown (333 ms gate).
- REQ-CMB-002 — Projectile lifecycle (papeleta, homing, sine flutter).
- REQ-CMB-004 — Hit resolution (HP, score, "Firmas recogidas", 200 ms destruction window).
- REQ-CMB-005 — Determinism under `?test=1`.

Per-archetype iso `footprint.hw/hh` remain the contract for any future logic that needs a logical (non-rendered) enemy size — only hit-testing is replaced.
