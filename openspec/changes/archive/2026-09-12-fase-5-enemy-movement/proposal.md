# Proposal: fase-5-enemy-movement

## Intent

Current enemy roster is 24 enemies at FIXED iso coordinates — only the camera moves. Static-world objects (vallas, billboards, signage) get their apparent motion from camera-driven tile scrolling — **this behavior must be preserved UNCHANGED**. But for enemies that represent real-world moving things (drone fumigador, camiones, topadoras, bidones), we add self-translation with visually appealing patterns.

User's hard rule: **do not touch the behavior of enemies that represent things that don't move in the real world** (vallas, billboards, signage, incineradora, planta_treco — basically any decorative or static infrastructure). Currently they "move" via camera-induced tile scrolling, which is the correct behavior. They MUST stay at their `isoX/isoY` and have no self-translation.

This change adds:
1. **5x more enemies** (24 → ~120) — populate the rail with more density
2. **Self-translation for mobile enemies only** — drones fly in patterns, camiones drive, bidones roll
3. **Visually appealing movement patterns** — sine wave, zigzag, arc
4. **Lateral screen-bounds clamp for moving enemies** — never escape through sides

Static enemies (vallas, billboards, signage) keep their current zero-self-velocity behavior unchanged.

## Scope

### In Scope
- `src/enemies.js`: 
  - Add per-instance `speed` and `movementPattern` fields to Enemy
  - Add `Enemy.update(dtMs, cameraIso, viewportBounds)` for self-translation in iso coords (ONLY when movementPattern != 'static')
  - Add screen-bounds clamping (project enemy to screen, reflect vy at edge)
  - `ARCHETYPES` does NOT get speed/pattern fields — these are per-instance spawn properties
  - `assertArchetype()` validates archetype fields (no change)
- `src/levels/test-level.js`:
  - Increase enemy count to 120
  - Distinguish static vs mobile enemies explicitly per spriteId
  - Static spriteIds: `valla_publicitaria`, `incineradora`, `planta_treco`, etc. — speed=0, movementPattern='static'
  - Mobile spriteIds: `dron_fumigador`, `camion_treco`, `topadora`, `bidon_lixiviado`, `camion_cisterna_residuos`, `trailer`, `tubo_lixiviado`, `bolsa_plastico` — speed>0 + pattern
- `tests/e2e/enemy-movement.spec.mjs` (NEW): verify
  - RED: 120 enemies in TEST_LEVEL
  - RED: static enemies (vallas) isoX stays constant when camera advances
  - RED: linear enemies advance each frame
  - RED: sine enemies oscillate
  - RED: arc enemies follow curved path
  - RED: no enemy ever reaches screen X < 80 or > viewport_w - 80
  - RED: hit detection still works on moving enemies
- `tests/e2e/hit-detection.spec.mjs` (MODIFIED): mark fixture enemies as static
- `openspec/specs/combat-core/spec.md` (MODIFIED):
  - New REQ-CMB-009: Per-instance enemy movement config
  - New REQ-CMB-010: Lateral screen-bounds clamp for mobile enemies
  - REQ-CMB-009 MUST include the rule: "enemies representing static-world objects (vallas, billboards, signage) MUST keep movementPattern='static' and speed=0; their apparent motion comes from camera-induced tile scrolling"

### Out of Scope
- Ally (civilian) hit logic
- Per-pixel alpha-mask picking
- Stage-specific level layouts
- Audio feedback
- Any change to static-enemy behavior (forbidden by user)

## Approach

### 1. Per-instance movement config (NOT per-archetype)

Each spawn definition can include:
```js
{ id, archetype, isoX, isoY, spriteId, speed: 60, movementPattern: 'sine' }
```

Defaults if omitted: `speed: 0, movementPattern: 'static'`.

This keeps `ARCHETYPES` immutable (pure data) and lets each spawn site decide.

### 2. Static vs mobile sprite IDs

Hard-coded mapping in `test-level.js`:

| SpriteId | Static? | Default speed | Default pattern |
|---|---|---|---|
| `valla_publicitaria` | YES | 0 | static |
| `incineradora` | YES | 0 | static |
| `planta_treco` | YES | 0 | static |
| `sello_burocratico` | YES | 0 | static |
| `castillo_cofrentes` | YES | 0 | static |
| `dron_fumigador` | NO | 70 | sine |
| `camion_treco` | NO | 50 | zigzag |
| `topadora` | NO | 40 | linear |
| `bidon_lixiviado` | NO | 35 | arc |
| `camion_cisterna_residuos` | NO | 30 | linear |
| `trailer` | NO | 45 | zigzag |
| `tubo_lixiviado` | NO | 25 | sine |
| `bolsa_plastico` | NO | 60 | sine |

Any other spriteId defaults to static.

### 3. Enemy class extension

`Enemy` gains:
```js
this.speed = speed    // iso-units/sec, 0 = static
this.movementPattern = movementPattern  // 'static', 'linear', 'sine', 'zigzag', 'arc'
this._elapsedMs = 0
this._arcCenter = { ix, iy }  // only for arc
```

`Enemy.tick(dtMs, cameraIso, viewportBounds)` (renamed to avoid conflict with potential EnemyManager.update):
- If `movementPattern === 'static'`: do nothing (preserves current behavior, no self-translation)
- If `linear`: decrement isoX/isoY toward camera direction at constant speed
- If `sine`: decrement isoX/isoY + oscillate perpendicular
- If `zigzag`: decrement isoX/isoY + discrete sway flips every 1s
- If `arc`: parameterize position by time on a circle around spawn center

After movement, run screen-bounds clamp:
```js
const screen = isoWorld.isoToScreenWithCamera(...)
if (screen.sx < LATERAL_MIN_PX || screen.sx > LATERAL_MAX_PX) {
  // push isoX back into corridor (clamp)
  this.isoX = clamp(this.isoX, MIN_IX, MAX_IX)
  // reflect iso velocity so next frame goes the other way
}
```

Where `LATERAL_MIN_PX = 80` and `LATERAL_MAX_PX = viewportW - 80`.

### 4. Roster scale to 120

`_buildEnemyDefs` generates 120 enemies distributed across depth 5..71:
- Static: 20 (vallas, billboards, signage)
- Mobile standard: 70 (cycling sprite IDs, varying speeds)
- Mobile tank: 20
- Mobile mini-boss: 8
- Mobile boss: 2
- Total: 120

Spread by depth zones:
- depth 5-15: linear (entry)
- depth 15-30: sine (rising)
- depth 30-50: zigzag + arc (peak)
- depth 50-71: arc + static targets (finale)

### 5. Wire update into EnemyManager.update

Existing flow:
```js
update(dtMs, cameraIso, elapsedSec = 0, isoWorld = null, viewportCenter = null, viewportSize = null) {
  // 1. materializes time-gated spawns
  // 2. escape detection
  // 3. garbage collect destroyed
}
```

Add step 0 BEFORE escape detection:
```js
// Move mobile enemies
for (const enemy of this._live()) {
  if (enemy.state !== 'alive') continue
  enemy.tick(dtMs, cameraIso, viewportBounds)
}
```

Where `viewportBounds = { minX: 80, maxX: viewportSize.x - 80 }`.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/enemies.js` | Modified | Enemy.tick + lateral clamp |
| `src/levels/test-level.js` | Modified | 120 enemies, static-vs-mobile split |
| `tests/e2e/enemy-movement.spec.mjs` | New | 5+ scenarios |
| `tests/e2e/hit-detection.spec.mjs` | Modified | Mark fixtures static |
| `openspec/specs/combat-core/spec.md` | Modified | REQ-CMB-009 + REQ-CMB-010 (with static-rule clause) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| 120 enemies tank performance | Medium | Object pool reuse; mobile update only computes per-tick deltas (cheap) |
| Off-axis escape for mobile enemies | Low | Lateral clamp via isoToScreenWithCamera projection |
| Static enemies start moving accidentally | Low | Movement code only runs if `movementPattern !== 'static'`; default is static |
| Hit-detection on moving enemies breaks | Low | Hit boxes use live isoX/isoY; sprite follows via isoWorld.update() |
| `Enemy.tick` conflicts with EnemyManager.update naming | Low | Use `tick` for instance method (PIXI convention) vs `update` on manager |
| 120 enemies FOV interactions | Medium | Z-sort already handles overlap |

## Rollback Plan

Single `git revert <merge-commit>`:
- ARCHETYPES: no change (already unmodified)
- Enemy.tick: removed
- test-level: 24 enemies, no pattern
- Canonical spec: REQ-CMB-009 + REQ-CMB-010 removed
- Static enemies revert to zero-self-velocity behavior (already the default)

## Dependencies

- `isoWorld.isoToScreenWithCamera` — already used
- `Enemy.getScreenBounds` — already implemented; uses same projection

## Success Criteria

- [ ] 120 enemies in TEST_LEVEL (5x of 24)
- [ ] valla_publicitaria isoX stays constant across 10 frames (no self-translation)
- [ ] Mobile linear enemy advances each frame (isoX delta > 0)
- [ ] Sine wave enemy oscillates (isoY delta alternates sign)
- [ ] Arc enemy follows curved path (radius ≈ constant within tolerance)
- [ ] No mobile enemy reaches screen X < 80 or > viewport_w - 80
- [ ] Hit detection works on moving enemies
- [ ] Game runs at 60fps with 120 simultaneous enemies
- [ ] Manual smoke: visible wave diversity (5 mobile patterns simultaneously)
