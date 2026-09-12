# Proposal: fase-5-enemy-movement-fix

## Intent

The enemy movement implementation in fase-5-enemy-movement has TWO bugs uncovered via active Playwright debugging:

**Bug 1**: `resolveMovementConfig()` doesn't fall back to MOBILE_DEFAULT when the enemy constructor default `movementPattern = 'static'` is passed. Result: ALL mobile enemies (camion_treco, dron_fumigador, topadora, bidon, trailer, etc.) spawn with `speed: 0, movementPattern: 'static'` — they appear on screen but don't move.

**Bug 2**: The `Reintentar test level` handler in `src/ui/overlay.js _onRetry()` calls `enemies.reset()` (which clears `_enemies` + `_timeGatedSpawns`) but does NOT reload the test level. Result: after clicking Reintentar, the screen stays empty (queue is empty, camera at t=0, nothing ever spawns again).

Verified via Playwright on `index.html` production boot:
- After 6 seconds of camera advance: only `e01` + `e02` alive, BOTH with `speed: 0, pattern: 'static'`
- Expected: e01 (camion_treco) at `speed: 50, pattern: 'zigzag'` per MOBILE_DEFAULT

## Scope

### In Scope
- `src/enemies.js`: Fix `resolveMovementConfig()` — when `speed` is 0 (or any valid value) AND `pattern` is `'static'`, fall back to MOBILE_DEFAULT for that spriteId. When `speed` is explicitly set OR `pattern` is non-static, respect the user value.
- `src/enemies.js`: Fix `Enemy` constructor — don't pre-default `speed = 0, movementPattern = 'static'` (pass `undefined` to resolver so it can fall back). Default values from MOBILE_DEFAULT at resolver level.
- `src/main.js`: Expose `bootTestLevel` via eventBus so `overlay.js` can trigger it on Reintentar
- `src/ui/overlay.js _onRetry()`: Replace inline reset with emit `bootTestLevel:request` event; main.js handles full reset + reload
- `tests/e2e/enemy-movement.spec.mjs`: Update R3 test to verify mobile enemy has non-zero speed after construction
- `tests/e2e/_debug-flow.mjs` (NEW): Reusable Playwright debug script for future field analysis

### Out of Scope
- Any other source changes from existing combat-core spec
- Changes to existing test pass/fail expectations

## Approach

### 1. `resolveMovementConfig` logic fix

```js
export function resolveMovementConfig(spriteId, speed, pattern) {
  const sid = spriteId ?? null
  if (sid && STATIC_SPRITE_IDS.has(sid)) {
    return { speed: 0, movementPattern: 'static' }
  }
  const defaults = sid ? MOBILE_DEFAULT[sid] : null
  // User-explicit: any valid number (including 0) for speed, any string for pattern.
  // We differentiate "user didn't specify" (undefined) from "user chose static" by
  // NOT pre-defaulting the params in the Enemy constructor.
  const userSpeed = (typeof speed === 'number' && Number.isFinite(speed))
    ? speed : null
  const userPattern = (typeof pattern === 'string') ? pattern : null
  // Fall back to MOBILE_DEFAULT for mobile spriteIds; static spriteIds forced 0/static above.
  const effSpeed = userSpeed ?? defaults?.speed ?? 0
  const effPattern = userPattern ?? defaults?.movementPattern ?? 'static'
  return { speed: effSpeed, movementPattern: effPattern }
}
```

### 2. `Enemy` constructor fix

```js
constructor({ id, archetype, isoX, isoY, spriteId, speed, movementPattern }) {
  // Do NOT default speed/movementPattern — let resolveMovementConfig decide.
  ...
}
```

### 3. `Reintentar` event-based reload

Replace inline reset with:
```js
// in overlay.js _onRetry()
this._resetLocalState()
emit('bootTestLevel:request', {})
this.gameState.state = 'gameplay'
```

And in `main.js`:
```js
busOn('bootTestLevel:request', async () => {
  await bootTestLevel({ combat, isoWorld, enemies, camera, score, integrity, hud: hudModule, world, overlay })
})
```

The existing `bootTestLevel` already does reset + loadLevel + camera.setTime(0), so no duplication.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/enemies.js` | Modified | resolveMovementConfig + Enemy constructor |
| `src/main.js` | Modified | Add bootTestLevel:request listener |
| `src/ui/overlay.js` | Modified | _onRetry emits event |
| `tests/e2e/enemy-movement.spec.mjs` | Modified | R3 test verifies non-zero speed |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Fix breaks existing R2/R3 unit tests | Low | R2 tests "speed=0 forces static" still works (speed=0 + pattern='sine' → speed=0, pattern='sine' from user explicit) |
| Other callers pass `speed: 0, pattern: 'static'` explicitly | Low | Audit showed only the Enemy constructor defaults to these values |
| Overlay event listener never fires in some code path | Low | bootTestLevel is the canonical reset path |

## Rollback Plan

Single `git revert <merge-commit>`:
- Restores old `resolveMovementConfig` (with broken defaults logic)
- Restores Enemy constructor defaults
- Restores `overlay._onRetry` inline reset

## Dependencies

- `busOn` from `./event-bus.js` — already used

## Success Criteria

- [ ] Mobile enemy (camion_treco) spawns with `speed: 50, pattern: 'zigzag'`
- [ ] Reintentar from game-over overlay reloads the level and enemies reappear
- [ ] Manual smoke: e01 visibly sways on screen within 2 seconds of game start
- [ ] All existing tests still pass
