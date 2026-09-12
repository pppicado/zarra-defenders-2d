# Delta for `combat-core`

Change: fase-5-hitbox-visualization. Capability: combat-core (MODIFIED).

## MODIFIED Requirements

### REQ-CMB-003: Tightened screen-space hit detection (reverse-depth, hitInset)

Resolve a click against its **screen-space coordinate**. For each live enemy, compute an AABB from `sprite.getBounds()` and **shrink by the archetype's `hitInset`** (REQ-CMB-006). Cursor is a candidate iff inside the **shrunk** AABB — transparent-padding clicks miss. If `sprite` is null, fall back to `isoToScreenWithCamera(...) ± tileSize/2`, also shrunk. Sort by `depth = isoX + isoY` desc; tie by ID asc. First wins. Misses fire `miss`.
(Previously: hit = click inside full `getBounds()`; transparent-margin clicks falsely hit.)

#### Scenario: Click on visible body hits

- GIVEN a `standard` enemy (`hitInset = {16,16,16,16}`)
- WHEN the user clicks at the sprite center
- THEN the enemy is a candidate
- AND `hit` fires.

#### Scenario: Click 5px outside inset edge misses (NEW)

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
- WHEN the user clicks the same logical point
- THEN both clicks hit.

#### Scenario: Reverse-depth on overlap

- GIVEN two enemies whose shrunk AABBs both contain the click, equal `isoX + isoY`
- WHEN the user clicks
- THEN the lower-ID enemy wins.

## ADDED Requirements

### REQ-CMB-006: Per-archetype hitInset

Each archetype in `ARCHETYPES` MUST define `hitInset: { top, right, bottom, left }` in screen-pixels. Shrunken AABB = `{ x + left, y + top, width − left − right, height − top − bottom }`. Values: `standard={16,16,16,16}`, `tank={12,12,12,12}`, `mini-boss={10,10,10,10}`, `boss={8,8,8,8}`.

#### Scenario: All four archetypes declare hitInset

- GIVEN the `ARCHETYPES` table
- WHEN each archetype is inspected
- THEN values match `standard={16,16,16,16}`, `tank={12,12,12,12}`, `mini-boss={10,10,10,10}`, `boss={8,8,8,8}`.

### REQ-CMB-007: Debug hitbox overlay (non-production)

Render a debug overlay: one colored rectangle per live enemy at its shrunk AABB. Colors: `standard` cyan `#00FFFF`, `tank` yellow `#FFFF00`, `mini-boss` magenta `#FF00FF`, `boss` orange `#FF8000`; `2 px` stroke, no fill. Enabled iff `?hitboxes=1` in URL OR user presses `H` to toggle. In production (`?test=0`, no `?hitboxes=1`, no `H`) the overlay MUST NOT render. Tracks movement each frame.

#### Scenario: Overlay renders when ?hitboxes=1

- GIVEN URL contains `?test=1&hitboxes=1`
- WHEN one frame advances
- THEN for each live enemy a rectangle renders at its shrunk AABB in the archetype's color.

#### Scenario: Overlay does NOT render in production

- GIVEN URL is `?test=0` and `H` not pressed
- WHEN one frame advances
- THEN no overlay rectangle draws.