# Tasks: fase-5-projectile-homing

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Work Unit

| Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|-----------|----------------------|-----------------|-------------------|
| homing + NaN live | PR 1 | `node tests/e2e/projectile-direction.spec.mjs` | `python3 -m http.server 8000` + Playwright | revert PR → straight-line restored |

Estimated ~30 changed lines. Strategy: ask-on-risk.

## IMPLEMENT Phase

### RED — failing tests
- [x] **TASK-001** Add homing scenario to `tests/e2e/projectile-direction.spec.mjs`: fire at fixed `isoX/isoY`, move camera iso between two `update()` calls, assert `gfx` velocity changes across ≥2 frames ≥100 ms apart. Expect FAIL.
- [x] **TASK-002** Add NaN scenario: inject `live.isoX = NaN` via `__gameTestAPI__`, one `update(16)`, assert `gfx.x/y` delta equals pre-injection velocity (kept last).
- [ ] **TASK-003** Add sine-axis regression: after 1st tick, verify flutter unit derives from `gfx→target` (not stale `origin→target`). Assert offset ≤4 px perpendicular.

### GREEN — implementation
- [x] **TASK-004** Modify `Projectile.tick()` signature `src/combat.js:93`: append `isoWorld, cameraIso, viewportCenter`.
- [x] **TASK-005** Inside `tick()` before `projectVelocity()` (`:98`): guard `Number.isFinite(this.isoX) && Number.isFinite(this.isoY)` → recompute `this.target = isoWorld.isoToScreenWithCamera(...)`.
- [x] **TASK-006** Replace `projectVelocity(this.origin, this.target)` → `projectVelocity({x: this.gfx.x, y: this.gfx.y}, this.target)` at `:98`. Sine-axis fix: origin = current `gfx` so flutter stays perpendicular to live travel.
- [x] **TASK-007** In `Combat.update()` `:307-316`: pass `this.isoWorld, this.cameraIso, this.viewportCenter` into `p.tick(...)`.
- [x] **TASK-008** Run all `tests/e2e/*.spec.mjs`. Baseline suite green; two unrelated pre-existing failures (`smoke`, `tile-gallery`) confirmed present on `main` via `git stash`.

### REFACTOR
- [x] **TASK-009** JSDoc on `tick()` `:86-92` documenting 3 new args + NaN contract.

## VERIFY Phase
- [ ] **TASK-010** Regression: `for f in tests/e2e/*.spec.mjs; do node "$f"; done`. No flipped vectors, no NaN corruption, off-center aligned, sine flutter ≤4 px.
- [ ] **TASK-011** Manual: `python3 -m http.server 8000`, fire 5 papeletas at moving enemy, confirm curve-following.

## Risks
- Sine-axis switch (TASK-006) alters flutter on FIRST tick — TASK-003 catches it.
- `setCameraIso` must run each frame; otherwise `Combat.update()` sees stale camera. Tests sync manually; production unchanged.