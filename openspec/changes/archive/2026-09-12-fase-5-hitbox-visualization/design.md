# Design: fase-5-hitbox-visualization

## Technical Approach

Tighten hit detection by adding a per-archetype `hitInset` that `Enemy.getScreenBounds()` applies to its AABB (single source of truth), and ship a new `src/debug-hitboxes.js` overlay module that draws color-coded rectangles at each enemy's shrunk AABB. Toggle on by URL param `?hitboxes=1` or `H` key. Default OFF, never renders in production (`?test=0`).

## Architecture Decisions

| Decision | Choice | Alternative | Why |
|---|---|---|---|
| Where to apply `hitInset` | Inside `Enemy.getScreenBounds()` | Inside `Combat._resolveHitAtScreenPoint()` | Single source of truth — both hit resolver AND debug overlay see the same shrunk AABB |
| Overlay Graphics strategy | 1 `PIXI.Graphics` per archetype, reused per frame (4 total) | 1 `Graphics` per enemy, recreated each frame | Pool by archetype — fewer draw calls, simpler lifecycle, enemies change archetype at spawn not at runtime |
| Toggle mechanism | URL `?hitboxes=1` (parse once) OR `H` keydown (runtime) | Always-on in test mode | Honors REQ-CMB-007 production gate: `?test=0` + no `?hitboxes=1` + no `H` → no render |
| Color per archetype | Hardcoded map `standard:cyan / tank:yellow / mini-boss:magenta / boss:orange` | Pass palette via constructor | Locked by spec REQ-CMB-007 — no need to parameterize |
| Test API surface | `setHitboxesEnabled(bool)` + `getHitboxRects()` | Read DOM only | Drives e2e tests deterministically without keyboard events |

## Data Flow

```
main.js ticker (per frame)
    │
    ├─► debugHitboxes.update(cameraIso, viewportCenter)
    │       ├─ for each live enemy
    │       │    ├─ bounds = Enemy.getScreenBounds(enemy, ...)   ← returns shrunk AABB
    │       │    └─ gfx.lineStyle(2, COLOR[arch]); gfx.drawRect(b.x, b.y, b.w, b.h)
    │       └─ if !enabled: gfx.clear() + gfx.visible = false
    │
    └─► test-api.setHitboxesEnabled(true)
            └─ debugHitboxes.setEnabled(true)   ← re-renders next frame
```

## File Changes

| File | Action | Description |
|---|---|---|
| `openspec/changes/fase-5-hitbox-visualization/design.md` | Create | This document |
| `src/enemies.js` | Modify | Add `hitInset` to all 4 `ARCHETYPES` entries; apply inset inside `Enemy.getScreenBounds()` (both sprite branch and fallback branch) |
| `src/debug-hitboxes.js` | Create | New module: `class DebugHitboxes` with `setEnabled(bool)` + `update(cameraIso, viewportCenter)`; uses `Enemy.getScreenBounds()` + `EnemyManager._live()` |
| `src/main.js` | Modify | Import `DebugHitboxes`; parse `?hitboxes=1` from URL; instantiate overlay; call `debugHitboxes.update()` inside the ticker after `isoWorld.update()`; wire `H` keydown listener |
| `src/test-api.js` | Modify | Add `setHitboxesEnabled(bool)` + `getHitboxRects()` methods to `__gameTestAPI__`; pass `debugHitboxes` instance into `mountTestAPI` ctx |
| `index.html` | Modify | Add `<script type="module" src="src/debug-hitboxes.js?v=45">` after main.js tag |
| `tests/e2e/hitbox-visualization.spec.mjs` | Create | New e2e: overlay renders under `?hitboxes=1`, distinct colors per archetype, click 5px outside shrunk AABB = miss |
| `tests/e2e/hit-detection.spec.mjs` | Modify | Tighten "hit at center" to require click on shrunk AABB; add regression for miss-outside-5px |

## Interfaces / Contracts

```js
// src/enemies.js — ARCHETYPES (add hitInset to each entry)
hitInset: { top: 16, right: 16, bottom: 16, left: 16 }   // standard
hitInset: { top: 12, right: 12, bottom: 12, left: 12 }   // tank
hitInset: { top: 10, right: 10, bottom: 10, left: 10 }   // mini-boss
hitInset: { top:  8, right:  8, bottom:  8, left:  8 }   // boss

// src/enemies.js — Enemy.getScreenBounds (apply inset after computing raw bounds)
const raw = enemy.sprite ? sprite.getBounds() : fallbackAabb
const ins = ARCHETYPES[enemy.archetype].hitInset
return { x: raw.x + ins.left, y: raw.y + ins.top,
         w: raw.width - ins.left - ins.right,
         h: raw.height - ins.top - ins.bottom }

// src/debug-hitboxes.js
class DebugHitboxes {
  constructor({ hudContainer, enemies, isoWorld, viewportCenter })
  setEnabled(bool)        // flips internal flag; next update() shows/hides
  update(cameraIso)       // called per frame from main.js ticker
}

// src/test-api.js — additions
__gameTestAPI__.setHitboxesEnabled(bool)   // → debugHitboxes.setEnabled(bool)
__gameTestAPI__.getHitboxRects()           // → [{ enemyId, arch, x, y, w, h, color }][]
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `ARCHETYPES[*].hitInset` matches spec values | Read-only assertion in e2e via `getEnemies()` + new `getArchetype()` |
| E2E | Overlay renders under `?hitboxes=1`; 4 colors visible | New `hitbox-visualization.spec.mjs` — `__gameTestAPI__.getHitboxRects()` |
| E2E | Click 5px outside shrunk AABB = miss | New spec scenario + extend `hit-detection.spec.mjs` |
| E2E | Production gate: `?test=0` + no param + no `H` = no rects | New spec asserts `getHitboxRects() === []` |
| Regression | Hit-at-center still works | Existing R1 in `hit-detection.spec.mjs` continues to pass (sprite center is well inside any 8–16px inset) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Pure PIXI rendering + DOM keydown listener inside the same page.

## Migration / Rollout

No data migration. URL param + keyboard toggle are opt-in. Production users see no change. To rollback: `git revert <merge-commit>` removes `src/debug-hitboxes.js`, restores `ARCHETYPES` to no-inset (full `sprite.getBounds()`), drops the script tag in `index.html`, reverts the ticker wiring in `main.js`, and reverts the two new test-api methods.

## Open Questions

None — all decisions locked by REQ-CMB-003/006/007 and the orchestrator's design constraints.