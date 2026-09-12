# Proposal: fase-5-hitbox-visualization

## Intent

After fase-5-hit-detection-fix, hit detection uses `Enemy.getScreenBounds()` which returns `sprite.getBounds()` — the full post-transform sprite AABB. **This includes transparent padding around the visible sprite**, so clicks NEAR the enemy (within transparent margins) still register as hits. The user reports this as bug — "disparo cerca muchas veces y acierta igual aunque no le esté dando realmente".

Also: there is **no way to visualize the hit box** to verify or tune it. The user wants a debug overlay (colored rectangles) showing each enemy's actual hit area, toggleable for testing then disabled.

## Scope

### In Scope
- `src/enemies.js`: tighten `Enemy.getScreenBounds()` by adding per-archetype `hitInset` configuration so hit area = visible sprite bounds − inset margin
- `src/enemies.js`: add `ARCHETYPES[arch].hitInset` config to all 4 archetypes (smaller standard enemies, larger bosses)
- `src/main.js`: add `src/debug-hitboxes.js` overlay module; toggle via URL param (`?test=1&hitboxes=1`) or keyboard `H` key
- `src/debug-hitboxes.js`: NEW module — draws colored rectangles (one per enemy) over each enemy's current hit area; different colors per archetype for easy debugging
- `tests/e2e/hitbox-visualization.spec.mjs`: NEW spec verifying:
  - Hit boxes render when `?hitboxes=1` is enabled
  - Different colors per archetype
  - Click 5px outside hit box = miss (new RED test)
  - Click exactly on hit box edge = hit

### Out of Scope
- Changes to projectile homing or trajectory
- Changes to per-archetype HP/multiplier
- Per-pixel alpha-mask picking (too expensive, deferred)
- Ally hit logic

## Approach

### 1. Tighten hit detection via `hitInset`

Each archetype gets `hitInset: { top, right, bottom, left }` in pixels (in screen-space at current tileSize). The hit box is computed as:

```
visibleBounds = sprite.getBounds()
hitBox = {
  x: visibleBounds.x + hitInset.left,
  y: visibleBounds.y + hitInset.top,
  w: visibleBounds.width - hitInset.left - hitInset.right,
  h: visibleBounds.height - hitInset.top - hitInset.bottom,
}
```

Defaults by archetype (proportional to arch visual size):
- `standard`: `hitInset = { top: 16, right: 16, bottom: 16, left: 16 }` — tight 16px padding
- `tank`: `hitInset = { top: 12, right: 12, bottom: 12, left: 12 }` — slightly larger hit area
- `mini-boss`: `hitInset = { top: 10, right: 10, bottom: 10, left: 10 }` — most of sprite
- `boss`: `hitInset = { top: 8, right: 8, bottom: 8, left: 8 }` — nearly full sprite

These values shrink each frame relative to visible bounds, ensuring only clicks ON the visible pixel-art register as hits.

### 2. Debug hitbox visualization

NEW module `src/debug-hitboxes.js`:
- Imports `Enemy.getScreenBounds()` to draw rectangles at each enemy's hit box
- Colors per archetype for easy identification:
  - `standard`: cyan `#00FFFF`
  - `tank`: yellow `#FFFF00`
  - `mini-boss`: magenta `#FF00FF`
  - `boss`: orange `#FF8000`
- 2px stroke, no fill (transparent interior)
- Updates every frame (positions track camera movement)
- Toggle via:
  - URL param: `?hitboxes=1` (auto-enables on test mode + this flag)
  - Keyboard: `H` key toggles at runtime (debug only)
- Mounted at the HUD layer (above world, below overlay)

### 3. Backward compat for existing tests

The change affects `_resolveHitAtScreenPoint` via `getScreenBounds`. Existing tests that pass because of wide bounds may now correctly miss when clicking outside. Update existing hit-detection tests to:
- Test hit-at-center still works (regression)
- Test miss-outside-failsafe (new)

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/enemies.js` | Modified | Add `hitInset` to archetype table; `Enemy.getScreenBounds()` applies inset |
| `src/main.js` | Modified | Wire `debug-hitboxes.js` |
| `src/debug-hitboxes.js` | New | Hit box overlay renderer |
| `index.html` | Modified | Load `<script type="module" src="src/debug-hitboxes.js?v=44">` |
| `tests/e2e/hitbox-visualization.spec.mjs` | New | New test spec |
| `tests/e2e/hit-detection.spec.mjs` | Modified | Tighten "hit at center" assertion + add "miss outside" regression |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `hitInset` values too aggressive → player can't hit enemies | Low | Start with conservative values (16px) and refine via play testing |
| `hitInset` values too loose → same "near-hit" bug recurs | Low | Verify via Playwright tests + visual debug overlay |
| Debug overlay stays on in production | Low | URL param gating + keyboard toggle + auto-disable in production builds |
| Renderer performance impact when many boxes drawn | Low | 1 Graphics object per enemy, redrawn each frame |
| `src/main.js` change violates config "do not modify" rule | Low | Proposal explicitly approves main.js change |

## Rollback Plan

Single `git revert <merge-commit>` restores:
- Archetype table (no `hitInset`)
- `getScreenBounds` returns full sprite bounds
- `debug-hitboxes.js` module removed (verifies via `diff -r`)
- `index.html` script tag removed

## Dependencies

- Existing `Enemy.getScreenBounds` — modified in this change
- PIXI.Graphics for hit box rendering — already available (PIXI v7)
- HUD layer for overlay — already in main.js

## Success Criteria

- [ ] Click 5px outside visible sprite = miss (was previously a hit)
- [ ] Click exactly on visible sprite center = hit (regression-safe)
- [ ] Debug overlay renders rectangles when `?hitboxes=1` enabled
- [ ] Different color per archetype (cyan/yellow/magenta/orange)
- [ ] Overlay toggles via `H` key at runtime
- [ ] Production (?test=0) does NOT render overlay by default
- [ ] Manual smoke: fire 20 shots at varying distances, only on-target ones hit
