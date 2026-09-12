# Proposal: fase-5-movement-calibration

## Intent

Two bugs found via active Playwright debugging:

**Bug 1** (production after Iniciar): Mobile enemies spawn and IMMEDIATELY escape via Manhattan distance > 6. Verified: `enemiesAlive: 0, queueLen: 118, cameraTime: 7.3s` after 6s of gameplay.

**Root cause**: `tick()` applies `this.isoX += 0.707 * speed * dtSec` — at speed=50 (camion_treco), that's 35 iso tiles/sec forward in rail direction. Camera advances at 0.6 iso tiles/sec. After ~1 second, mobile enemies have flown past the camera into the distance. Manhattan distance (|enX-camX| + |enY-camY|) > 6 triggers escape → enemy removed → integrity drops. Player sees a flicker-disappear, no chance to shoot.

**Bug 2** (`?test=1` URL): No enemies appear, no scroll. Verified: `enemiesAlive: 0, queueLen: 120, cameraTime: 0` after 5s wait.

**Root cause**: In test mode, `if (!inTestMode) camera.update(dt)` and `if (!inTestMode) enemies.update(...)` are guarded. The game loop never calls them. Test-api only advances on user-driven `tick()` calls. So a user just opening the URL sees frozen state.

## Scope

### In Scope
- `src/enemies.js`: Refactor `Enemy.tick()` — REMOVE linear `dx/dy` advance. All patterns operate as **oscillations around SPAWN iso position**. Speed becomes oscillation rate, not linear velocity. Visible motion comes from camera scrolling + pattern oscillation, not from self-translation in rail direction.
- `src/enemies.js`: Recalibrate MOBILE_DEFAULT speeds — range 0.05-0.3 iso tiles/sec amplitude (visible at screen scale).
- `src/levels/test-level.js`: Same fix applies — patterns operate as oscillations.
- `src/main.js`: In test mode, ALSO call `camera.update(dt)` and `enemies.update(...)` so the screen scrolls and enemies spawn automatically. Test-api's `tick()` still works for manual override.

### Out of Scope
- Hit detection logic (already correct)
- Lateral clamp math (still useful — pattern oscillation can hit bounds)
- Other movement patterns (keep 4: linear, sine, zigzag, arc — but redefine "linear" as "no oscillation, just camera motion")

## Approach

### 1. Pattern overhaul: oscillation only

```js
// All patterns oscillate around spawn iso position; no rail-direction advance.
// Linear = camera-induced motion only (effectively static, the user sees them
// scroll past thanks to camera moving).
// Sine/Zigzag/Arc = oscillation perpendicular to rail direction (isoY primarily).
// Spawn isoX/isoY captured once; never change (camera brings them past).

if (pattern === 'linear') {
  // No self-motion — camera does all the work.
  // Enemy stays at spawn isoX/Y; visually scrolls down screen as camera passes.
  this._vxIso = 0
} else if (pattern === 'sine') {
  // Oscillate isoY around _spawnIsoY with sine wave
  const omega = 2 * Math.PI * speed  // speed = Hz (0.5-1.5 typical)
  const amplitudeIsoY = 0.3  // ±0.3 iso tiles = ~±27 px on screen
  this.isoY = this._spawnIsoY + amplitudeIsoY * Math.sin(elapsedMs * 0.001 * omega)
  this.isoX = this._spawnIsoX  // locked
} else if (pattern === 'zigzag') {
  // Discrete isoY steps every ZIGZAG_PERIOD_MS
  const period = 1500  // ms
  const amplitudeIsoY = 0.4
  const phase = (this._elapsedMs % period) / period
  const sign = phase < 0.5 ? 1 : -1
  this.isoY = this._spawnIsoY + sign * amplitudeIsoY
  this.isoX = this._spawnIsoX  // locked
} else if (pattern === 'arc') {
  // Orbit around spawn iso in a small circle (camera-relative)
  // Looks like the enemy is rotating in place
  const omega = 0.8  // rad/s
  const radius = 0.25  // iso tiles
  this.isoX = this._spawnIsoX + radius * Math.cos(this._elapsedMs * 0.001 * omega)
  this.isoY = this._spawnIsoY + radius * Math.sin(this._elapsedMs * 0.001 * omega)
}
```

### 2. Speed semantics: now "oscillation rate"

`MOBILE_DEFAULT`:
```js
dron_fumigador:        { speed: 0.8, movementPattern: 'sine' }     // 0.8 Hz oscillation
camion_treco:          { speed: 0.4, movementPattern: 'zigzag' }   // 0.4 Hz sway
topadora:              { speed: 0,   movementPattern: 'linear' }   // static-ish (camera scroll only)
bidon_lixiviado:       { speed: 1.0, movementPattern: 'arc' }       // 1 rad/s rotation
camion_cisterna_residuos: { speed: 0, movementPattern: 'linear' }
trailer:               { speed: 0.3, movementPattern: 'zigzag' }
tubo_lixiviado:        { speed: 0.6, movementPattern: 'sine' }
bolsa_plastico:        { speed: 1.2, movementPattern: 'sine' }
```

`speed` now means "oscillation frequency" (Hz) for sine/zigzag and "rotational rate" (rad/s) for arc. Linear ignores speed (static).

### 3. Lateral clamp still works

The clamp uses `isoToScreenWithCamera` projection. With pattern oscillation only:
- Sine/zigzag oscillate ~0.3 isoY → projected screen X varies ±~27 px (visible swing)
- Arc orbits ~0.25 radius → projected screen X varies ±~22 px (visible rotation)
- Camera scrolling moves the enemy in screen Y; oscillation adds subtle X movement
- Lateral bounds (80 px margin) are wide enough (2560 viewport = 1280 wide; 240 px of safe corridor)

### 4. Test mode auto-advance

```js
// In main.js production loop:
const tickRate = inTestMode ? 16.67 : dt * 1000  // ms per tick
camera.update(tickRate / 1000)
...
enemies.update(tickRate, camIso, elapsedSec, isoWorld, ...)
```

Now in test mode:
- Camera advances at 60 fps (continuous)
- Enemies spawn via time-gated spawns
- Everything visible like production
- Tests can still call `__gameTestAPI__.setTime(t)` to seek deterministically (overrides auto-advance for that frame)

### 5. Backward compat for existing tests

- `enemy-movement.spec.mjs` R1-R5 may need re-tuning if they asserted specific isoX deltas.
- Arc pattern R5 (radius constant) still works.
- Sine pattern sign flips work the same.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/enemies.js` | Modified | tick() refactored, MOBILE_DEFAULT recalibrated |
| `src/levels/test-level.js` | Modified | (no actual changes — patterns redefine meaning) |
| `src/main.js` | Modified | Test mode auto-advances camera + enemies |
| `tests/e2e/enemy-movement.spec.mjs` | Modified | R1-R8 expectations re-checked against new oscillation model |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Speed change breaks R6/R7 unit tests (those asserted speed=50/0) | Medium | Update test expectations to assert oscillation rate instead |
| Lateral clamp pushes oscillating enemies outward | Low | Amplitude 0.3 + spawn positions in corridor 0-36; clamp rarely fires |
| Static enemies unaffected (still no tick) | None | Verify with debug that vallas/billboards isoX stays constant |

## Rollback Plan

Single `git revert <merge-commit>`:
- Restores original `dx/dy += speed*dtSec/√2` linear advance
- Restores MOBILE_DEFAULT speed values
- Restores test-mode guard on enemies.update

## Success Criteria

- [ ] After clicking Iniciar in production, camera scrolls continuously
- [ ] Mobile enemies oscillate visibly (not fly past camera)
- [ ] e01 visible at center of screen for ≥5 seconds
- [ ] No automatic integrity drain during the camera traversal (player can shoot)
- [ ] `?test=1` shows enemies appearing and camera scrolling without manual `tick()`
- [ ] Lateral clamp fires only when oscillation amplitude + camera position exits [80, 1200]
- [ ] All existing tests still pass (with expectation updates where needed)
