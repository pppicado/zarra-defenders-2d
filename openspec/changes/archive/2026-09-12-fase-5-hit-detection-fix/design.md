# Design: fase-5-hit-detection-screen-bounds

## Technical Approach

Replace the iso-plane AABB check (`ARCHETYPES[arch].footprint.hw/hh`) in `Combat._resolveHit` with screen-space sprite bounds hit testing. Cursor reaches the resolver as **logical screen px** (already converted by `_toLogical` in `src/input.js`); resolver compares it to each live enemy's `PIXI.Sprite.getBounds()` AABB — single source of truth handling tileSize scaling, anchor, world-container translation, and DPR. Null sprite → fallback `isoToScreenWithCamera(isoX,isoY) ± tileSize/2`. Depth tie-break (`isoX+isoY` desc, id asc) unchanged. Maps to REQ-CMB-003.

## Architecture Decisions

| # | Choice | Alternatives | Rationale |
|---|--------|--------------|-----------|
| 1 | `enemy.sprite.getBounds()` primary; iso fallback | (a) iso-plane AABB (current), (b) manual screen AABB only | Canonical post-transform AABB; handles DPR+scale+anchor+world translation. Fallback covers sprite=null. |
| 2 | New `Combat.fireAtScreen(sx, sy, originScreen)`; `fireAtIso` keeps working via internal convert | (a) parallel `cursorScreen` param, (b) iso only for homing | Resolver never sees iso; legacy path converts internally. |
| 3 | `fireAtScreen` receives logical px; PIXI handles canvas scaling | Manual DPR multiply | `getBounds()` returns logical canvas px; manual math double-scales. |
| 4 | Keep `isoX+isoY` desc + id asc | Screen-Y sort | Iso-sum invariant under camera motion. |
| 5 | Helper in `src/enemies.js` (`Enemy.getScreenBounds`) | Inline in combat.js | `combat.js` already imports `ARCHETYPES` from `enemies.js`. |

## Data Flow (Tap)

```
CSS px  ──► _toLogical  ──► (logicalX, logicalY)  ──► fireAtScreen(logicalX, logicalY, handPos)
                                                                │
                                                                ▼
                                              _resolveHitAtScreenPoint(sx, sy, cameraIso, vc)
                                                                │ for each alive enemy:
                                                                ▼
                                              enemy.getScreenBounds() ──► sprite.getBounds()
                                                                          │ null → fallback
                                                                          ▼
                                                          isoToScreenWithCamera ± tileSize/2
                                                                ▼ AABB containment
                                                                ▼ sort(depth desc, id asc)
                                                                ▼ target.applyHit(1)
```

PIXI render-time: `isoWorld.update()` (per-frame in `main.js`) sets `container.position` so `getBounds()` evaluates against current camera — already in place.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/enemies.js` | Modify | Add `Enemy.getScreenBounds(enemy, isoWorld, cameraIso, viewportCenter) → {x,y,w,h}`; sprite path → `sprite.getBounds()`; null sprite → `isoToScreenWithCamera(isoX,isoY) ± tileSize/2`. |
| `src/combat.js` | Modify | Replace `_resolveHit(isoX,isoY)` with `_resolveHitAtScreenPoint(sx, sy, cameraIso, vc, isoWorld)` using `getScreenBounds` + depth sort. Add `fireAtScreen(sx, sy, originScreen, opts)` (cooldown, emit, resolver, homing target via `isoToScreenWithCamera`). `fireAtIso` delegates to `fireAtScreen` after `screenToIsoWithCamera`. `update(dtMs)` unchanged — already passes `cameraIso/vc/isoWorld`. |
| `src/main.js` | Modify | Tap L261-269: skip `screenToIsoWithCamera`; call `combat.fireAtScreen(logicalX, logicalY, handPos)`. |
| `src/test-api.js` | Modify | Add `fireAtScreen(x, y, opts)` → `ctx.combat.fireAtScreen(x, y, {x:0,y:0}, {bypassCooldown:true, ...opts})`. Keep `fireAtIso` / `simulateTap`. |
| `tests/e2e/hit-detection.spec.mjs` | Modify | Click inside via `fireAtScreen(sx, sy)`; assert hit for all 4 archetypes; 3-resolution sweep (1280×720, 1920×1080, 3840×2160@DPR2). |

## Interfaces / Contracts

```js
// src/enemies.js
Enemy.getScreenBounds(enemy, isoWorld, cameraIso, viewportCenter) → {x,y,w,h}

// src/combat.js
Combat.fireAtScreen(screenX, screenY, originScreen, opts={bypassCooldown?:boolean})
  → {hit:boolean, enemyId:(string|null)}

Combat._resolveHitAtScreenPoint(screenX, screenY, cameraIso, viewportCenter, isoWorld)
  → Enemy|null
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `getScreenBounds` sprite / null paths | Playwright `__gameTestAPI__` reads bounds |
| Integration | Inside vs outside AABB per archetype | `fireAtScreen` at center → hit; +1px out → miss |
| E2E | 4 archetypes × 3 resolutions | `tests/e2e/hit-detection.spec.mjs` rewrite |
| Manual | 20 shots vs moving enemies | Playwright loop |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No data migration. Single `git revert <merge-commit>` restores iso-plane AABB. Backward compat: `fireAtIso` + `simulateTap` continue working; only the internal resolver changes.

## Open Questions

None — all spec scenarios covered by helper + new resolver.
