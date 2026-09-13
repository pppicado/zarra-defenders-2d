# Delta for `fase-6.1-bg-bugfixes`

## MODIFIED Requirements

### Requirement: BG-008 — BackgroundLayer render order (FIXED)

`BackgroundLayer._setTexture` MUST mount the bg sprite in a layer that
renders BEFORE the enemy sprites. Concretely: in the main game the bg
sprite is attached to `isoWorld._worldLayer` (the layer that previously
held the tilemap; empty since fase-6) so it renders before
`isoWorld.spriteLayer` (enemies). Adding the bg sprite directly to
`isoWorld.container` would render it AFTER enemies (PIXI add-order),
occluding them.

This invariant is enforced by `tests/e2e/banco-bg-render-order.spec.mjs`
which asserts the bg sprite's `parent === isoWorld._worldLayer`.

### Requirement: BG-009 — Overlay retry button label

The game-over overlay's primary button text MUST be `Reintentar` in
production boot (`?test=0`). The legacy dev label `Reintentar test level`
MUST only appear when `?test=1` is set. The label is resolved at boot
time via the `data-role="retry"` element and rendered as either:

- `Reintentar` — production / `?test=0`
- `Reintentar test level` — `?test=1`

### Requirement: BG-010 — Post-finale wave positions

`TEST_LEVEL.postFinalWaveRoster` entries MUST spawn at iso positions
where the Manhattan distance to camera iso (36, 36) is ≤ 5 tiles (i.e.,
NOT escaped on spawn). Positions with Manhattan > 6 cause immediate
escape, defeating the purpose of the post-finale waves.

Each wave gets 3 mobile enemies in a deterministic triangle around the
camera. For example, wave 1: (33, 35), (35, 33), (34, 34).

### Requirement: BG-011 — Esc-to-menu during gameplay

The game MUST listen for Escape key during `gameState === 'gameplay'`
and emit `menu:back` to return to the main menu. The binding MUST NOT
trigger when an overlay is visible (game-over, victory) or when a modal
is open (Acerca de, Disclaimer).

Tested in `tests/e2e/banco-esc-to-menu.spec.mjs`: open `?unlock=all`,
click stage 1, press Escape, assert `#main-menu:not(.hidden)`.

## REMOVED Requirements

None.

## RENAMED Requirements

None.