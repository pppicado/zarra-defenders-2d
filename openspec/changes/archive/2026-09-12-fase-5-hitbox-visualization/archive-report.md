# Archive Report: fase-5-hitbox-visualization

**Change**: fase-5-hitbox-visualization
**Archived to**: `openspec/changes/archive/2026-09-12-fase-5-hitbox-visualization/`
**Date**: 2026-09-12
**Mode**: openspec
**Verdict at close**: PASS (per `verify-report.md` — all spec scenarios green at runtime, no CRITICAL issues, production gate enforced)

## Change Summary

Tighten hit detection in `zarra-defenders-2d` so transparent-padding clicks no longer
register as hits, and ship a debug overlay that visualises each enemy's actual hit
area. The user reported *"disparo cerca muchas veces y acierta igual aunque no le
esté dando realmente"*; root cause was `Enemy.getScreenBounds()` returning the full
post-transform sprite AABB, which includes the transparent margin around the visible
pixel art.

This change adds a per-archetype `hitInset` that `Enemy.getScreenBounds()` applies
to its AABB (single source of truth — both combat resolver and debug overlay read
the same shrunk box), and ships a new `src/debug-hitboxes.js` overlay module that
draws color-coded rectangles (one per archetype) at each enemy's hit area. The
overlay is opt-in via `?hitboxes=1` or the `H` keyboard toggle; production
(`?test=0`, no `?hitboxes=1`, no `H`) never renders it.

## What Was Implemented

| Task | Status | Evidence |
|------|--------|----------|
| TASK-R1 `[RED]` click 5px outside shrunk AABB = miss | DONE | `hitbox-visualization.spec.mjs runR1MissOutsideInset` → `r1: hit=false, bounds.w=96` |
| TASK-R2 `[RED]` overlay renders 1 rect per live enemy | DONE | `hitbox-visualization.spec.mjs runR2OverlayRects` → 2 rects for 2 alive enemies |
| TASK-R3 `[RED]` toggle off → empty rects | DONE | `hitbox-visualization.spec.mjs runR3ToggleOffEmpty` → `[]` |
| TASK-R4 `[RED]` click on inset edge = hit (regression lock) | DONE | `hit-detection.spec.mjs runR5ClickOnInsetEdge` → `r5: hit=true` |
| TASK-G1 `[GREEN]` add `hitInset` to all 4 archetypes | DONE | `src/enemies.js` lines 39–42 |
| TASK-G2 `[GREEN]` apply inset in `Enemy.getScreenBounds` (both branches) | DONE | `src/enemies.js` lines 141–167 |
| TASK-G3 `[GREEN]` create `DebugHitboxes` class | DONE | `src/debug-hitboxes.js` (135 LOC) |
| TASK-G4 `[GREEN]` per-archetype `PIXI.Graphics` pool with color strokes | DONE | `src/debug-hitboxes.js` lines 98–104 |
| TASK-G5 `[GREEN]` wire `DebugHitboxes` into `src/main.js` ticker + `H` key | DONE | `src/main.js` lines 33, 126, 253, 265, 396 |
| TASK-G6 `[GREEN]` add `<script>` tag in `index.html` | **DEVIATION — SKIPPED** | Module already imported by `main.js`'s `import { DebugHitboxes } from './debug-hitboxes.js?v=44'`. Adding a separate `<script>` tag with `?v=45` would create a duplicate module instance; main.js's import is sufficient. Browser dedupes by full URL including query string. |
| TASK-G7 `[GREEN]` add `setHitboxesEnabled` + `getHitboxRects` to `__gameTestAPI__` | DONE | `src/test-api.js` lines 181, 189; ctx param at line 361 |
| TASK-X1 `[REFACTOR]` `assertArchetype` validates `hitInset` presence + numeric sides | DONE | `src/enemies.js` lines 63–71 |
| TASK-X2 `[REFACTOR]` co-locate `ARCHETYPE_COLORS` at top of `src/debug-hitboxes.js` | DONE | No change needed — already co-located at the top of the file |

**Task Completion Gate note (archived for audit)**: `tasks.md` had 12 of 13
implementation-task checkboxes flipped from `- [ ]` to `- [x]` at archive time
because `apply-progress.md` and `verify-report.md` independently prove every
checkbox is complete. The one unchecked box is **TASK-G6** — left unchecked
intentionally because that task was deliberately skipped (deviation), not
completed. The deviation is documented in `apply-progress.md` and
`verify-report.md`. This is the audit-trail-safe state: the only `- [ ]` in the
archived `tasks.md` is a deliberate skip, not a stale unchecked completed task.

## Files Changed (this change only — LOC delta against `HEAD`)

| File | Action | LOC Δ vs HEAD | What changed |
|------|--------|---------------|--------------|
| `src/enemies.js` | Modified | **+81 / −1** (net +80) | Added `hitInset` to all 4 archetypes (`{top,right,bottom,left}` frozen per entry). Added static method `Enemy.getScreenBounds(enemy, isoWorld, cameraIso, viewportCenter)` that computes the AABB from `sprite.getBounds()` (or iso fallback) then shrinks by `hitInset`. Extended `assertArchetype` to validate `hitInset` presence + finite-numeric sides. |
| `src/main.js` | Modified | **+45 / −6** (net +39) | Imports `DebugHitboxes` from `./debug-hitboxes.js?v=44`. Parses `?hitboxes=1` from URL. Instantiates `debugHitboxes` after enemies + isoWorld + viewportCenter are ready. Adds `H` keydown listener. Calls `debugHitboxes.update(camIso)` in ticker after `isoWorld.update()`. Passes `debugHitboxes` into `mountTestAPI` ctx. *Note: this file also carries uncommitted changes from `fase-5-hit-detection-fix` (the `combat.fireAtIso` → `combat.fireAtScreen` tap-handler refactor) — those are not part of this change.* |
| `src/test-api.js` | Modified | **+41 / −0** (net +41) | Adds `Enemy` import. Adds `fireAtScreen(x, y, opts)` and `getScreenBounds(enemyId)` test-api methods (REQ-CMB-003 plumbing — also from `fase-5-hit-detection-fix`). Adds `setHitboxesEnabled(b)` and `getHitboxRects()` methods (REQ-CMB-007). Documents `ctx.debugHitboxes` parameter. *Note: this file also carries uncommitted changes from `fase-5-hit-detection-fix` — not part of this change.* |
| `tests/e2e/hit-detection.spec.mjs` | Modified | **+286 / −6** (net +280) | Carries the R1–R4, X1, X2 regression suite from `fase-5-hit-detection-fix` (screen-space hit detection scenarios) AND adds **R5** (`runR5ClickOnInsetEdge`) — the TASK-R4 regression lock for the hitInset boundary. *Note: most of the net LOC belongs to the prior change's scenarios; only R5 is new from this change.* |
| `src/debug-hitboxes.js` | Created | **+135** | NEW module. `class DebugHitboxes` with `setEnabled(bool)`, `update(cameraIso)`, `readRects()`. 1-`PIXI.Graphics`-per-archetype pool (lazy-init). Color map: `standard:0x00FFFF (cyan)`, `tank:0xFFFF00 (yellow)`, `mini-boss:0xFF00FF (magenta)`, `boss:0xFF8000 (orange)`. Exports `ARCHETYPE_COLORS` co-located at the top of the file. |
| `tests/e2e/hitbox-visualization.spec.mjs` | Created | **+155** | NEW spec: R1 (click outside shrunk bounds = miss), R2 (overlay renders rects per live enemy), R3 (toggle off → empty). |
| `index.html` | Not modified | **0 / 0** | TASK-G6 deviation — no `<script>` tag added; main.js's import is sufficient. |

**Net LOC for this change (excluding intermixed prior-change deltas in
`src/main.js`, `src/test-api.js`, `tests/e2e/hit-detection.spec.mjs`):**

- Pure-this-change additions: `src/debug-hitboxes.js` (+135) +
  `tests/e2e/hitbox-visualization.spec.mjs` (+155) = **+290 lines of new code/tests**
- Pure-this-change modifications: `src/enemies.js` lines for `hitInset` (+4),
  `getScreenBounds` (+27), `assertArchetype` extension (+16) ≈ **+47 lines net in
  `src/enemies.js`**
- `src/main.js` / `src/test-api.js` / `tests/e2e/hit-detection.spec.mjs`: only the
  lines tagged `F5 (REQ-CMB-007)` (and TASK-R4's R5 scenario) belong to this
  change; the rest is uncommitted leftover from `fase-5-hit-detection-fix` that
  was already archived under `2026-09-12-fase-5-hit-detection-fix/`

**Review-budget reconciliation**: The `tasks.md` forecast estimated ~210 changed
lines. The actually-changed lines counted above for this change (R5 + the two new
files + the REQ-CMB-006/007 wiring) ≈ 290 authored lines, ~120 of which are new
test scenarios. This exceeds the 400-line review-budget by a small margin ONLY if
the leftover uncommitted prior-change code is counted in; on the pure-this-change
delta, the budget is comfortably under 400 lines. The design forecast was right
that chained PRs were not needed; the archive is one work unit.

## Spec Changes

The delta file at
`openspec/changes/fase-5-hitbox-visualization/specs/combat-core/spec.md` declared:

- **MODIFIED REQ-CMB-003** — Tightened screen-space hit detection (reverse-depth,
  hitInset). Now: resolve click against screen-space coord; for each live enemy,
  compute AABB from `sprite.getBounds()` and **shrink by the archetype's
  `hitInset`** (REQ-CMB-006). Cursor is a candidate iff inside the **shrunk**
  AABB — transparent-padding clicks miss. Sort by `depth = isoX + isoY` desc; tie
  by ID asc. First wins. Misses fire `miss`.
  Previously: hit = click inside full `getBounds()`; transparent-margin clicks
  falsely hit.
  **NEW scenarios**: "Click 5px outside inset edge misses",
  "Click on inset edge hits (regression-safe)".
- **NEW REQ-CMB-006** — Per-archetype `hitInset`. Each archetype in `ARCHETYPES`
  MUST define `hitInset: { top, right, bottom, left }` in screen-pixels. Shrunken
  AABB = `{ x + left, y + top, width − left − right, height − top − bottom }`.
  Values: `standard={16,16,16,16}`, `tank={12,12,12,12}`,
  `mini-boss={10,10,10,10}`, `boss={8,8,8,8}`.
- **NEW REQ-CMB-007** — Debug hitbox overlay (non-production). One colored
  rectangle per live enemy at its shrunk AABB. Colors: standard cyan `#00FFFF`,
  tank yellow `#FFFF00`, mini-boss magenta `#FF00FF`, boss orange `#FF8000`;
  2 px stroke, no fill. Enabled iff `?hitboxes=1` in URL OR user presses `H` to
  toggle. In production (`?test=0`, no `?hitboxes=1`, no `H`) MUST NOT render.
  Tracks movement each frame.

### Spec Sync

This was the first archive that **established** the canonical `combat-core` spec
at `openspec/specs/combat-core/spec.md`. Prior combat-core changes
(`fase-3-shooter-rail-gameplay`, `fase-5-projectile-homing`,
`fase-5-hit-detection-fix`) only contributed delta files under their change
folders — no canonical `combat-core/spec.md` existed before this archive. The
canonical spec is composed from:

1. F3 baseline (REQ-CMB-001..005, original iso-plane REQ-CMB-003, straight-line
   REQ-CMB-002) — from `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/combat-core/spec.md`
2. F5-projectile-homing (REQ-CMB-002 → homing) — from
   `openspec/changes/archive/2026-09-12-fase-5-projectile-homing/specs/combat-core/spec.md`
3. F5-hit-detection-fix (REQ-CMB-003 → screen-space sprite bounds) — from
   `openspec/changes/archive/2026-09-12-fase-5-hit-detection-fix/specs/combat-core/spec.md`
4. **This change** (REQ-CMB-003 → add hitInset; ADD REQ-CMB-006, REQ-CMB-007) —
   from `openspec/changes/fase-5-hitbox-visualization/specs/combat-core/spec.md`

Final canonical file: `openspec/specs/combat-core/spec.md` (301 lines, 7
requirements: REQ-CMB-001 through REQ-CMB-007). The
`openspec/specs/README.md` index was updated to add the combat-core row and the
`Totals` count from 21 → 28 requirements across 5 capabilities.

## Test Coverage

**Test command 1**: `node tests/e2e/hit-detection.spec.mjs` — **PASS** (exit 0)

```
{
  "result1": { "hits": [{ "hit": true, "enemyId": "e01" }], "integrity": { "current": 3, ... } },
  "result2": { "integrity": { "current": 2, ... } },
  "result3": { "integrity": { "current": 1, ... } },
  "r1":  { "hit": true,  "enemyId": "e01" },                   # screen-space center hit
  "r2":  { "hit": false, "enemyId": null },                    # 50px miss
  "r3":  { "standard":   { "hit": true, "bounds.w": 96 },
           "tank":       { "hit": true, "bounds.w": 104 },
           "mini-boss":  { "hit": true, "bounds.w": 108 },
           "boss":       { "hit": true, "bounds.w": 112 } },   # all 4 archetypes honor hitInset
  "r4":  { "1280x720":   { "hit": true },
           "1920x1080":  { "hit": true } },                    # resolution & DPR independence
  "r5":  { "hit": true,  "enemyId": "e01" },                   # NEW: regression lock on inset edge
  "x1":  { "hit": true,  "enemyId": "e_tie_a" },               # reverse-depth tie-break
  "x2":  { "hit": true,  "enemyId": "e_null_a" }               # sprite-null fallback
}
```

**Test command 2**: `node tests/e2e/hitbox-visualization.spec.mjs` — **PASS** (exit 0)

```
{
  "r1": { "bounds": { "x": 682.51, "y": 275.89, "w": 96, "h": 96 },
          "hit": false, "enemyId": null },                    # 5px outside shrunk AABB = miss
  "r2": { "rects": [
            { "enemyId": "e01", "archetype": "standard", "x": 682.5, "y": 275.8, "w": 96, "h": 96, "color": 65535 },
            { "enemyId": "e02", "archetype": "standard", "x": 773.0, "y":   4.3, "w": 96, "h": 96, "color": 65535 }
          ],
          "aliveCount": 2 },                                  # overlay rendered 1 rect per live enemy
  "r3": []                                                    # toggle off → cleared
}
```

**Production-gate probe** (custom, post-test) — **PASS** (exit 0)

```
{
  "noParamNoKey": 0,          // ?test=1 only → no overlay ✓
  "enabledTrue":  2,          // setHitboxesEnabled(true)  → 2 rects visible ✓
  "enabledFalse": 0,          // setHitboxesEnabled(false) → cleared ✓
  "hitboxesParam": 2,         // ?hitboxes=1 → rects visible at boot ✓
  "errors": [],               // zero console errors ✓
  "colorsByArch": {
    "standard":   65535,      // 0x00FFFF cyan   ✓
    "tank":      16776960,    // 0xFFFF00 yellow ✓
    "mini-boss": 16711935,    // 0xFF00FF magenta ✓
    "boss":      16744448     // 0xFF8000 orange ✓
  }
}
```

**Spec-compliance summary**:

- REQ-CMB-003 (modified): all 6 scenarios PASS — including the 2 new scenarios
  (5px outside miss, edge hit) and 4 regression scenarios from
  `fase-5-hit-detection-fix`.
- REQ-CMB-006 (added): both scenarios PASS — all 4 archetypes declare hitInset,
  assertArchetype validates presence + finite numbers.
- REQ-CMB-007 (added): all 5 scenarios PASS — overlay renders when `?hitboxes=1`,
  production gate enforced, toggle clears, 4 distinct colors confirmed.

## Pre-existing Failures (NOT caused by this change)

Per `apply-progress.md` and `verify-report.md`, these failures exist on the
workspace prior to and independent of this change:

| Test | Failure | Root cause (confirmed in apply-progress) |
|------|---------|------------------------------------------|
| `tests/e2e/smoke.spec.mjs` | "Expected 12 enemies to spawn over the level, got 24" | Pre-existing on `main` branch before this change. |
| `tests/e2e/projectile-direction.spec.mjs` | "HOMING FAIL: target screen position did not change between frames" | Pre-existing in uncommitted prior work (`fase-5-projectile-homing`); projectile's `isoX/isoY` are only set when `fireAtScreen` resolves a hit, so firing into empty space leaves homing with no anchor. Not in scope of this change. |

Neither regression impacts the hitbox-visualization scope. Both should be
resolved by their own changes (`fase-5-smoke-fix` and the homing-edge-case fix
respectively).

## Final-State Authority (rank applied per Final-State Authority hierarchy)

The archive report reflects the **final state at close**:

- **Verdict**: PASS (verify-report result is final — no prompt override claimed)
- **Test counts**: 9 hit-detection scenarios (R1-R5, X1-X2, result1-3) +
  3 hitbox-visualization scenarios (R1-R3) + production-gate probe = all PASS
- **Completion**: 12 of 13 tasks complete; TASK-G6 documented as deliberate skip
- **Production gate**: enforced and verified (`noParamNoKey: 0`,
  `enabledFalse: 0`, `errors: []`)
- **No CRITICAL issues** in verify-report → archive proceeds under ordinary
  repository policy
- **No `reviewGate`** present in any structured status → kill switch off /
  receipt-driven development not active for this candidate; archive proceeds
  under ordinary policy

No contradiction between sources: `apply-progress.md` and `verify-report.md`
agree on every test result. The launch prompt instructed archive; verify-report
gave the verdict (PASS); no intermediate claim conflicts with final evidence.

## Rollback Instructions

Single `git revert <merge-commit>` (or `git revert` of the squash-commit for
this change) restores the pre-change state:

1. **Drop** `src/debug-hitboxes.js` (135 LOC).
2. **Revert** `src/enemies.js` — remove `hitInset` from each entry in
   `ARCHETYPES` (lines 39–42); revert `Enemy.getScreenBounds` to returning the
   raw `sprite.getBounds()` AABB without inset (lines 141–167); revert
   `assertArchetype` to the pre-hitInset validator (lines 63–71).
3. **Revert** `src/main.js` — remove the `DebugHitboxes` import (line 33),
   `?hitboxes=1` parse (line 126), `debugHitboxes` instantiation (line 253),
   `H` keydown listener (line 265), and ticker call (line 396); remove the
   `debugHitboxes` key from the `mountTestAPI` ctx (line 361).
4. **Revert** `src/test-api.js` — remove `setHitboxesEnabled` and
   `getHitboxRects` methods (lines 181, 189); remove the `Enemy` import and
   the `ctx.debugHitboxes` parameter doc.
5. **Remove** `tests/e2e/hitbox-visualization.spec.mjs` (155 LOC).
6. **Revert** `tests/e2e/hit-detection.spec.mjs` — remove `runR5ClickOnInsetEdge`
   scenario + its call site at the bottom of `runHitDetectionSpec` (net −13 LOC
   for THIS change's contribution; the rest of the file belongs to the prior
   `fase-5-hit-detection-fix` change).
7. **`index.html`** — no change in this commit (TASK-G6 deviation).

**Verification post-revert**:

- `node tests/e2e/hit-detection.spec.mjs` — R1-R4 should still pass (sprite
  center click hit, 50px miss), but R5 (inset edge) will FAIL because the
  boundary no longer matches (no inset to lock). Restore by re-adding the
  TASK-R4 regression at `bounds.x + 16` on the unshrunk AABB.
- `node tests/e2e/hitbox-visualization.spec.mjs` — will FAIL because
  `getHitboxRects` / `setHitboxesEnabled` are gone.

**Spec rollback**: revert `openspec/specs/combat-core/spec.md` to the F3-only
state (REQ-CMB-001..005 with original iso-plane REQ-CMB-003, straight-line
REQ-CMB-002) and remove the combat-core row from `openspec/specs/README.md`.

**Working-tree caveat**: as of 2026-09-12 the working tree also contains
uncommitted changes from `fase-5-projectile-homing` and `fase-5-hit-detection-fix`
(intermixed into `src/main.js`, `src/test-api.js`, `tests/e2e/hit-detection.spec.mjs`,
`src/combat.js`, `src/iso/world.js`, `tests/e2e/projectile-direction.spec.mjs`).
The `git revert` for THIS change's merge-commit will not touch those — they
need their own revert or commit cycle.

## Archive Contents

- `proposal.md` ✅
- `specs/combat-core/spec.md` ✅ (delta for REQ-CMB-003 MODIFIED + REQ-CMB-006, REQ-CMB-007 ADDED)
- `design.md` ✅
- `tasks.md` ✅ (12 of 13 checkboxes ticked; TASK-G6 deliberately unchecked as a documented deviation)
- `apply-progress.md` ✅
- `verify-report.md` ✅ (PASS verdict)
- `archive-report.md` ✅ (this file — additive, excluded from the diff-r readback against the pre-archive snapshot)

## Mechanical Archive Verification

```
$ diff -r /tmp/sdd-archive.XXXXXX/source openspec/changes/archive/2026-09-12-fase-5-hitbox-visualization/
(empty output — byte-identical)
$ diff -r exit code: 0
```

The archived tree is byte-identical to the source snapshot taken before the
move. The `archive-report.md` is additive-only and was written after the move
into the archived folder; it was not present in the snapshot and therefore was
excluded from the comparison. Active changes directory no longer contains
`fase-5-hitbox-visualization/`.

## SDD Cycle Complete

The change has been fully planned (proposal), specified (delta specs for
combat-core), designed (single-source-of-truth rationale locked), implemented
(12 tasks, 1 deliberate skip with documented deviation), verified (all spec
scenarios green at runtime, production gate enforced), and archived.

Ready for the next change.
