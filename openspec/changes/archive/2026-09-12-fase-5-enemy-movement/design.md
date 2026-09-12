# Design: fase-5-enemy-movement

## Technical Approach

Extend `Enemy` (instance, not archetype) with per-spawn `speed` + `movementPattern`, add `Enemy.tick(dtMs, cameraIso, viewportBounds)` that computes self-translation in iso space (PIXI sprite position is recomputed each frame by `IsoWorld.update()` from live `enemy.isoX/isoY`). Static enemies opt out of `tick` entirely — preserving the camera-induced tile-scroll behavior the user forbids changing. Wire the tick into `EnemyManager.update` as step 0 (before escape detection), pass `viewportBounds` from `main.js`, scale `TEST_LEVEL` to 120 entries with the static-vs-mobile split from the proposal table.

## Architecture Decisions

| Decision | Option chosen | Tradeoff | Why |
|---|---|---|---|
| Where speed/pattern live | Per-instance spawn defs (NOT in `ARCHETYPES`) | ARCHETYPES stays a pure-data table; test fixtures override per case | Spec REQ-CMB-009 hard rule; lets `hit-detection.spec.mjs` mark fixtures `static` |
| Method name | `Enemy.tick` (PIXI convention) | Avoids shadowing `EnemyManager.update` | Spec suggestion; clear separation of concerns |
| Movement frame of reference | Iso coords, projected to screen for clamp | Avoids separate screen-space velocity; uses proven `isoToScreenWithCamera` math | Same math `getScreenBounds` + `isScreenEscaped` already use |
| Clamp algorithm | Project → if outside `[80, viewportW-80]`, invert iso X velocity, set iso X so projected sx sits at bound | Simple, deterministic, mirrors existing F5 `isScreenEscaped` pattern | Tested with sine/zigzag; arc has its own radius so its iso X is bounded naturally — clamp applies as safety net |
| Roster generation | Deterministic in `_buildEnemyDefs` (no Math.random) | Matches existing F3 determinism contract | Mulberry32 reserved for runtime non-combat visuals |
| Spec coverage | REQ-CMB-009 + REQ-CMB-010 scenarios all map to RED tests in `enemy-movement.spec.mjs` | No gap between spec and verification | Spec demands this; e2e mirrors it |

## Data Flow — movement tick per frame

```
main.js ticker
   │
   ├─→ camIso = { isoX, isoY }
   ├─→ verticalSprites = enemies.getAliveSprites()  // reads live isoX/isoY
   ├─→ isoWorld.update(camera, verticalSprites)    // sprite.x/y re-anchored
   │
   └─→ enemies.update(dtMs, camIso, elapsedSec, isoWorld, vc, vs)
            │
            ├─ step 0 (NEW) ──────────────────────────────────────┐
            │  for (e of _live()) if (e.state==='alive')          │
            │    e.tick(dtMs, camIso, viewportBounds)             │
            │      ├ static → no-op
            │      ├ linear  → isoX/Y -= dir * speed * dtSec
            │      ├ sine    → linear + isoY += amp*sin(ω*t)
            │      ├ zigzag  → linear + isoY += sign(t%2<1)*amp
            │      └ arc     → ix = cx + r*cos(ωt)
            │                   iy = cy + r*sin(ωt)
            │      then _lateralClamp(isoWorld, camIso, viewportBounds)
            ├─ step 1: materialize time-gated spawns (existing)
            ├─ step 2: escape detection (existing)
            └─ step 3: GC destroyed (existing)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/enemies.js` | Modify | Add `speed`/`movementPattern`/`_elapsedMs`/`_arcCenter` to ctor; add `Enemy.tick` + private `_lateralClamp`; insert step-0 motion loop at top of `EnemyManager.update` (before escape block) |
| `src/levels/test-level.js` | Modify | Add `_MOBILE_DEFAULT` table; `_buildEnemyDefs` returns 120 entries (20 static + 70 standard mobile + 20 tank mobile + 8 mini-boss + 2 boss); `assertTestLevel` updates counts to 70/40/8/2 |
| `src/main.js` | Modify | Build `viewportBounds = { minX: 80, maxX: LOGICAL_W - 80 }` once; pass as 7th arg to `enemies.update` |
| `tests/e2e/enemy-movement.spec.mjs` | Create | RED tests: roster=120, valla isoX constant over 10 frames, linear advance, sine oscillation, arc radius ±10%, lateral clamp reflection, 600-frame corridor sweep, hit-detection on moving enemy, 60fps sanity |
| `tests/e2e/hit-detection.spec.mjs` | Modify | Add `speed: 0, movementPattern: 'static'` to every fixture `spawnEnemy({...})` call so fixture coords stay deterministic |
| `openspec/specs/combat-core/spec.md` | Modify (already done) | REQ-CMB-009 + REQ-CMB-010 with hard-rule clause |

## Interfaces / Contracts

```js
// Enemy ctor additions
new Enemy({ id, archetype, isoX, isoY, spriteId,
            speed = 0,              // iso-units/sec
            movementPattern = 'static' })  // 'static'|'linear'|'sine'|'zigzag'|'arc'

// Instance method (PIXI convention)
enemy.tick(dtMs, cameraIso, viewportBounds)
  // dtMs: number
  // cameraIso: { isoX, isoY }
  // viewportBounds: { minX: 80, maxX: LOGICAL_W - 80 }
  // Side-effects: mutates enemy.isoX, enemy.isoY, enemy._elapsedMs
  // Static path: O(1) early return — preserves camera-tile-scroll behavior

// EnemyManager.update signature gains 7th arg
enemies.update(dtMs, camIso, elapsedSec, isoWorld, viewportCenter, viewportSize, viewportBounds?)
```

Movement math constants (module-private): `SINE_AMP = 0.6`, `SINE_FREQ_HZ = 0.5`, `ZIGZAG_AMP = 0.4`, `ZIGZAG_PERIOD_MS = 1000`, `ARC_RADIUS = 0.8`, `ARC_OMEGA = 0.6` rad/s.

`_lateralClamp(isoWorld, camIso, viewportBounds, viewportCenter)`: project → if sx < minX or sx > maxX, reflect `_vxIso` and snap isoX so projected sx sits at the bound. Static enemies never reach this branch (tick returns early).

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit (e2e harness) | Roster count = 120 | `enemy-movement.spec.mjs` reads `__gameTestAPI__.testLevel.enemies.length` |
| Unit | Static `valla_publicitaria` isoX constant over 10 ticks | Spawn manually, advance camera, assert isoX unchanged (proves hard rule) |
| Unit | Linear `topadora` isoX delta > 0 each tick | Spawn with `speed: 40, movementPattern: 'linear'`; sample 3 frames |
| Unit | Sine `dron_fumigador` isoY oscillation sign flip at frame 30 | `dron_fumigador` with default sine |
| Unit | Arc `bidon_lixiviado` radius within ±10% over 60 frames | compute `sqrt((ix-cx)^2 + (iy-cy)^2)` each frame |
| Integration | Lateral clamp: spawn `camion_treco` at projected `sx = viewportW - 79`, advance 1 tick, assert velocity reflected + `sx <= viewportW - 80` |
| Integration | 600-frame corridor sweep: tick full roster 10 s, assert every alive mobile `80 <= sx <= viewportW - 80` |
| Integration | Hit detection on moving enemy: spawn sine `dron_fumigador`, fire at live sprite bounds, assert hit registers |
| Smoke | 60fps over 10 s with 120 simultaneous enemies | `performance.now()` deltas; warn on dropped frames |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is touched. Pure game-logic change inside the Pixi tick.

## Migration / Rollout

- `ARCHETYPES` table is frozen — adding fields there would break the spec. Per-instance config avoids any data migration.
- `assertTestLevel` count check (24 → 120) is the only contract change; tests gate it.
- **Rollback**: single `git revert <merge-commit>`. Enemy.tick is dead code without the step-0 motion loop; with the loop removed, the 120-enemy roster still spawns (default `static`/`speed=0` makes them identical to F4b behavior). One commit revert restores all behavior.

## Open Questions

None — all decisions are pinned by the proposal + spec.