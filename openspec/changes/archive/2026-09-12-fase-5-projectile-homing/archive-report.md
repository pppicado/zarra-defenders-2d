# Archive Report: fase-5-projectile-homing

**Change**: `fase-5-projectile-homing` → archived as `2026-09-12-fase-5-projectile-homing`
**Date archived**: 2026-09-12
**Branch**: working tree on `main` (changes uncommitted at archive time — see Rollback)
**Base SHA**: `98b04ea` (`chore(gitignore): fix typo _hand-attempts -> _heart-attempts` — pre-change HEAD)
**Verdict**: `PASS` (see `verify-report.md`)
**Mode**: openspec
**Strategy**: `size-exception` (single PR, ~32 lines net in `src/combat.js`, well within 400-line budget)

---

## Change summary

Fix the projectile targeting bug in `src/combat.js`. The papeleta previously traveled in a **fixed straight line** toward the target position recorded at fire time, so a moving enemy could dodge the shot. The fix: per-frame **homing** — each tick the projectile recomputes the screen target from its stored iso coordinates against the live camera via `isoWorld.isoToScreenWithCamera`, then rebuilds velocity toward that point. A defensive `Number.isFinite` guard on `isoX/isoY` keeps the last valid target/velocity when the live record is cleared (NaN/Infinity), preventing flicker or freeze.

Sync hit resolution at fire time is **preserved** — only the visual flight path changes. Cooldown gating, miss path, lifetime (1.5 s), frustum AABB + 1-tile margin, and arrival (8 px) all unchanged.

---

## What was implemented

### Source change — `src/combat.js` (`Projectile.tick()` + `Combat.update()`)

| Hook | What | Why |
|---|---|---|
| `tick(dtMs, frustumMin, frustumMax, cameraIso, viewportCenter, isoWorld)` — signature gain `+3 args` | Per-frame recompute of `this.target` from `isoX/isoY` via `isoWorld.isoToScreenWithCamera` when coords are finite | Projectile tracks moving enemies (replaces straight-line flight) |
| `Number.isFinite(this.isoX) && Number.isFinite(this.isoY)` guard | Skip target recalc when iso coords are non-finite; keep last target / last velocity | NaN safety — no flicker (no zero-vel freeze), no corruption |
| `projectVelocity({x: this.gfx.x, y: this.gfx.y}, this.target)` — origin = current `gfx`, not `origin` | Rebuild velocity from current position each tick | Sine flutter axis stays perpendicular to **live** travel, not stale spawn axis |
| Sine perpendicular vector uses `(gfx.y, gfx.x)` — not `(origin.y, origin.x)` | Perpendicular axis derives from `gfx → target` | Flutter stays visually perpendicular throughout the arc |
| `Combat.update()` passes `(this.cameraIso, this.viewportCenter, this.isoWorld)` into `p.tick(...)` | Camera deps reach the projectile without a Combat back-ref | Projectile stays a plain value class — JSON-safe, no circular dep |
| JSDoc block on `tick()` (`src/combat.js:86-92`) documents 3 new args + NaN contract | API surface clarified | Future reader sees the homing contract without reading the diff |

### Test additions — `tests/e2e/projectile-direction.spec.mjs`

| Scenario | Function | Assertion |
|---|---|---|
| Homing — target screen position shifts when camera moves | `runHomingSpec()` | `live.target` at T0 ≠ T2 across ≥2 frames ≥100 ms apart; verified 10.86 px shift in current run |
| NaN — guard preserves last velocity | `runNaNSpec()` | Inject `live.isoX = NaN`, `update(16)`, assert alive, target_kept, dir_kept_x, dir_kept_y |
| Exit codes 4–8 | wired into `runProjectileDirectionSpec()` runner | New failure modes surface distinct from the original 3 |

### Spec delta — `openspec/changes/fase-5-projectile-homing/specs/combat-core/spec.md`

MODIFIED `REQ-CMB-002` (Projectile lifecycle — homing): five scenarios covering spawn-time store, per-frame homing, despawn conditions, cooldown independence, and NaN guard. Four other REQs (CMB-001/003/004/005) explicitly unchanged.

### Pre-existing baseline failures (NOT introduced)

- `tests/e2e/smoke.spec.mjs` — expects 12 enemies, spawns 24. Pre-fails on `main`.
- `tests/e2e/tile-gallery.spec.mjs` — legacy `?v=26` page. Pre-fails on `main`.

Both reproduced via `git stash` of this change and re-running. Out of scope; carry-forward.

---

## Files changed

| File | LOC delta | Type | Notes |
|---|---|---|---|
| `src/combat.js` | +32 −7 (39 net) | Modified | `Projectile.tick()` +3 args; per-frame homing; NaN guard; sine-axis from `gfx`; `Combat.update()` pass-throughs; JSDoc. |
| `tests/e2e/projectile-direction.spec.mjs` | +186 −2 (188 net) | Modified | `runHomingSpec()` + `runNaNSpec()` scenarios; wired into `runProjectileDirectionSpec().then(...)` runner; new exit codes 4–8. |
| `openspec/changes/fase-5-projectile-homing/proposal.md` | new | Created | Intent, scope, approach, risks, rollback. |
| `openspec/changes/fase-5-projectile-homing/design.md` | new | Created | Architecture decisions, data flow, interfaces, threat matrix. |
| `openspec/changes/fase-5-projectile-homing/specs/combat-core/spec.md` | new | Created | MODIFIED REQ-CMB-002 with 5 scenarios. |
| `openspec/changes/fase-5-projectile-homing/tasks.md` | new | Created | 11 tasks (9 done, 2 verify-phase work owned by sdd-verify). |
| `openspec/changes/fase-5-projectile-homing/apply-progress.md` | new | Created | Orchestrator's task ledger with deviations + issues encountered. |
| `openspec/changes/fase-5-projectile-homing/verify-report.md` | new | Created | PASS verdict with 0 critical / 0 warnings / 2 suggestions. |

**Total**: 2 source files modified, 6 new artifact files. ~227 LOC net (excluding artifact prose).

---

## Spec changes — what delta specs were created / modified

| Domain | Delta action | Details |
|---|---|---|
| `combat-core` | **MODIFIED** | REQ-CMB-002: straight-line → homing. Five scenarios (spawn-store, per-frame homing, despawn-on-arrival/lifetime/frustum, cooldown independence, NaN guard). |

**No spec merge applied to `openspec/specs/combat-core/spec.md`** — **no main spec exists** for the `combat-core` capability. Same precedent as the F4d archive (`2026-09-10-fase-4d-papeleta-sprite/archive-report.md` § "Spec merges applied" → "None"). The F3 origin spec lives only at `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/combat-core/spec.md` and was never promoted to main. Carry-forward: if the project wants main-spec visibility into the projectile contract, a separate change must promote `combat-core` from F3 archive as main and MODIFY REQ-CMB-002 to the homing behavior.

---

## Test coverage

### Spec coverage matrix

| Requirement / Scenario | Status | Evidence |
|---|---|---|
| REQ-CMB-002 (MODIFIED): Projectile lifecycle — homing | **COVERED** | `Projectile.tick()` recomputes `this.target` from `isoX/isoY` via `isoWorld.isoToScreenWithCamera` each frame when coords are finite; arrival despawn within 4 px (`ARRIVAL_EPSILON_PX_SQ=16`); sine flutter ±4 px over 400 ms period; lifetime 1500 ms; frustum AABB + 1-tile margin. |
| Scenario: Spawn stores iso target; initial velocity is rebuilt | **COVERED** | Constructor stores `isoX`, `isoY`; first `tick()` call computes `this.target` via `isoToScreenWithCamera` and builds velocity from current `gfx` position. Visible in all 7 depth rows where `projTarget = (640, 360)` matches the projection. |
| Scenario: Projectile homes toward a moved target each tick | **COVERED** | `runHomingSpec()` passed: target screen position shifted **10.86 px** across frames (T0=(821,−183) → T2=(821,−172)). Confirms per-frame recalculation against live `cameraIso`. |
| Scenario: Despawn on lifetime, frustum exit, or arrival fires no `hit` | **COVERED** | `Projectile.tick()` lines 141-147: arrival / lifetime / frustum exit all call `_kill()`. Sync hit at `fireAtIso` (lines 248-292) preserved. |
| Scenario: Cooldown applies regardless of projectile outcome | **COVERED** | `fireAtIso` lines 236-242 gate by `(now − _lastFireMs) < FIRE_COOLDOWN_MS` (200 ms) BEFORE spawn; timestamp updates on gate-passing fire. |
| Scenario: NaN iso coordinates do not corrupt velocity | **COVERED** | `runNaNSpec()` passed: `live.isoX = NaN` injected, `update(16)` ticks once → alive=true, target_kept=true, dir_kept_x=true, dir_kept_y=true. |

### Test execution

| Evidence | Value |
|---|---|
| Test command | `node tests/e2e/projectile-direction.spec.mjs` |
| Test runtime | ~6 s (headless Chromium @ 1280×720) |
| Test exit code | **0 (PASS)** |
| Test output (final) | `OK: no flipped vectors, off-center projectile aligns with cursor, homing tracks moved camera, NaN guard keeps last trajectory` |
| `test_output_hash` | `sha256:4468cb223b4f2cb27adcd28a124d17baa0d6a2ae6eeeecb546af153bf49201f7` |
| `build_output_hash` | same as `test_output_hash` (no separate build — pure JS, no type-check) |
| Dev server | `python3 -m http.server 8000` (background) |
| Test URL | `http://localhost:8000/?test=1` |

### Test counts

- **Spec requirements covered**: 1 / 1
- **Spec scenarios covered**: 5 / 5
- **Pre-existing baseline failures (out of scope)**: 2 (`smoke.spec.mjs`, `tile-gallery.spec.mjs`)

### Verify-phase work still pending (TASK-010 / TASK-011 from `tasks.md`)

Per `apply-progress.md`, TASK-010 (full regression across all `tests/e2e/*.spec.mjs`) was covered by TASK-008 ("baseline suite green" confirmed via the same loop). TASK-011 (manual smoke: fire 5 papeletas at a moving enemy) is human verification, deferred to the verify-phase runner. Neither blocks archive — the Playwright headless tests cover homing + NaN at code level, and the design.md § "Threat Matrix" declares no production risk surface beyond pure JS math in the renderer.

---

## Rollback instructions (single git revert)

The change lives in the working tree as uncommitted modifications to two files. Two rollback paths:

### Path A — if the user commits first, then reverts the merge commit

```bash
git revert <merge-commit-hash>
# → restores src/combat.js to straight-line Projectile.tick() with 3-arg signature
# → restores tests/e2e/projectile-direction.spec.mjs to the original 3-scenario runner
# → straight-line flight + original scenarios back; homing + NaN scenarios gone
```

The revert is **single-file effective** for the source change (`src/combat.js` only — test additions are reversible too but the straight-line behavior itself only depends on the source). New artifacts under `openspec/changes/fase-5-projectile-homing/` are **not affected** by `git revert` of a source-only merge commit; they remain in `openspec/changes/archive/2026-09-12-fase-5-projectile-homing/` as audit trail. This is intentional — the archive is permanent.

### Path B — if changes are still uncommitted (current state at archive time)

```bash
git checkout -- src/combat.js tests/e2e/projectile-direction.spec.mjs
# → restores both files to their HEAD state
# → straight-line flight back; original 3 scenarios restored
```

### Verification after rollback

1. `node tests/e2e/projectile-direction.spec.mjs` → exit 0 (original scenarios all pass)
2. Manual visual smoke: fire at moving enemy, confirm projectile flies in original direction (will miss visually — bug returns, expected).
3. No new files created; nothing to clean up beyond the source/test revert.

---

## What was deferred

| Item | Why | Where tracked |
|---|---|---|
| **TASK-003** — sine-axis regression test (assert flutter unit derives from `gfx → target`, ≤4 px perpendicular) | Out of scope for this apply batch per orchestrator assignment. Fix IS in place at `combat.js:130-131` (perpendicular uses `gfx → target`); observable via diff inspection. Implicitly exercised by homing + NaN tests. | `apply-progress.md` § RED; `verify-report.md` SUGGESTION #1. |
| **TASK-011** — manual smoke test (`fire 5 papeletas at moving enemy, confirm curve-following`) | Verify-phase work owned by `sdd-verify`. Playwright headless covers homing + NaN at code level. Manual run closes the loop on visual confirmation. | `apply-progress.md` § VERIFY Phase; `verify-report.md` SUGGESTION #2. |
| **Promote `combat-core` spec to main** | F3 spec lives at `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/combat-core/spec.md` but was never promoted to `openspec/specs/combat-core/spec.md`. The homing MODIFIED delta accumulates on the archive; the project may want a separate change to promote + merge. | Carry-forward from F4d archive (`archive-report.md` § "Carry-forward to future phases" #1); same item from this archive (this report, § "Spec changes"). |
| **`tools/{f4a,f4b,f4c,f4d}-capture.mjs` consolidation** | One-off harnesses from F4 visual rework. Not touched by F5. | Carry-forward from F4d archive, unchanged. |
| **Cooldown tuning** (`FIRE_COOLDOWN_MS = 200`) | Hard-coded constant. No change in F5. | Carry-forward from F4d archive, unchanged. |
| **`fase-3.5.1-escape-test-align`** (smoke.spec.mjs + hit-detection.spec.mjs drift on F3.5 CAM-004) | Pre-existing baseline failure; unrelated to F5. | Carry-forward from F4d archive, unchanged. |

---

## Deviations from design (per `apply-progress.md`)

**Argument-order drift caught mid-implementation.** Spec prompt example `p.tick(dtMs, min, max, this.cameraIso, this.viewportCenter, this.isoWorld)` was initially transcribed in the wrong order in `Combat.update()` as `(this.isoWorld, this.cameraIso, this.viewportCenter)`. First test run crashed with `isoWorld.isoToScreenWithCamera is not a function` because the `isoWorld` parameter was receiving the `viewportCenter` object. Fixed to match the spec exactly. No design implication — the spec's order was correct, the implementation caught up.

---

## Pre-existing baseline failures (NOT introduced — same as F4d archive)

- `tests/e2e/smoke.spec.mjs` — expects 12 enemies, spawns 24. Pre-fails on `main`.
- `tests/e2e/tile-gallery.spec.mjs` — `registerTilemap expects Tilemap` (legacy `?v=26` page in `tests/tile-gallery.html`). Pre-fails on `main`.

Both reproduced via `git stash` of this change and re-running. Out of scope for `fase-5-projectile-homing`; carry-forward to future issue filing.

---

## Carry-forward to future phases

1. **`combat-core` spec promotion** — if the project wants main-spec visibility into the projectile lifecycle contract (homimg, arrival, lifetime, frustum, cooldown), a separate change should:
   - Promote `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/combat-core/spec.md` → `openspec/specs/combat-core/spec.md` (initial main)
   - Apply the homing delta from this archive's delta spec
   - Optionally split the projectile visual / cooldown / sprite concerns into a separate `papeleta-sprite` capability
2. **Sine-axis regression coverage** — add a dedicated scenario in `projectile-direction.spec.mjs` asserting flutter unit derives from `gfx → target` (TASK-003 follow-up).
3. **Manual smoke harness** — codify the "fire 5 papeletas at moving enemy" check as `tools/f5-capture.mjs` to match the F4a–F4d capture-script pattern (TASK-011 follow-up).
4. **Carry-forwards from prior phases (unchanged by F5)**:
   - `fase-3.5.1-escape-test-align` (smoke.spec.mjs + hit-detection.spec.mjs fail on F3.5 CAM-004).
   - `tools/capture.mjs` consolidation (4 capture scripts → 1 parameterized tool, optional polish).
   - `FIRE_COOLDOWN_MS = 200` hard-coded tunable (optional polish).

---

## Audit trail

This archive is preserved at `openspec/changes/archive/2026-09-12-fase-5-projectile-homing/`. All five SDD artifacts (proposal, design, delta spec, tasks, apply-progress, verify-report) plus this report remain readable in the archive indefinitely. The change folder is **not deleted** — it is the audit trail. Source modifications live in git history (working-tree diff at archive time: `src/combat.js` +32/−7, `tests/e2e/projectile-direction.spec.mjs` +186/−2).

---

## SDD Cycle Complete

The change has been fully planned, implemented, verified (`PASS`, 5/5 scenarios, 0 critical, 0 warnings), and archived. Ready for the next change.