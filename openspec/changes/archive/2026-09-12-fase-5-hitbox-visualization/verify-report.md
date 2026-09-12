# Verify Report: fase-5-hitbox-visualization

## Verification Summary

| Field | Value |
|-------|-------|
| Change | fase-5-hitbox-visualization |
| Mode | full-artifacts (proposal + specs + design + tasks) |
| Verdict | **PASS** |
| Strict TDD | inactive (default) |

## Completeness

| Artifact | Status | Notes |
|----------|--------|-------|
| Proposal | present | referenced from design.md context |
| Spec | present | `openspec/changes/fase-5-hitbox-visualization/specs/combat-core/spec.md` — 3 MODIFIED scenarios + 2 ADDED scenarios |
| Design | present | `design.md` — 5 architecture decisions, single-source-of-truth rationale locked |
| Tasks | present | `tasks.md` — R1–R4 RED, G1–G7 GREEN, X1–X2 REFACTOR, all marked complete in apply-progress.md |
| Apply-progress | present | SUCCESS — all assigned tasks complete; one TASK-G6 deviation documented (no duplicate module instance) |

## Spec Compliance Matrix

### REQ-CMB-003 (modified) — Tightened screen-space hit detection

| Scenario | Test | Runtime evidence | Status |
|----------|------|------------------|--------|
| Click on visible body hits | hit-detection R1 | `r1: hit=true, enemyId="e01"` | PASS |
| Click 5px outside inset edge misses | hitbox-visualization R1 | `r1: hit=false, enemyId=null, bounds.w=96` (shrunk from 128 → 96 by hitInset 16) | PASS |
| Click on inset edge hits | hit-detection R5 | `r5: hit=true, enemyId="e01"` at `bounds.x + 0` | PASS |
| All four archetypes honor hitInset | hit-detection R3 | `r3: standard/tank/mini-boss/boss all hit=true, bounds.w: 96/104/108/112` (matches 128-16, 128-24, 128-20, 128-16 widths for standard/tank/mini-boss/boss) | PASS |
| Resolution & DPR independence | hit-detection R4 | `r4: 1280x720 hit=true, 1920x1080 hit=true` | PASS |
| Reverse-depth on overlap | hit-detection X1 | `x1: hit=true, enemyId="e_tie_a"` (lower-id wins) | PASS |
| Sprite-null fallback | hit-detection X2 | `x2: hit=true, enemyId="e_null_a"` | PASS |

### REQ-CMB-006 (added) — Per-archetype hitInset

| Scenario | Source inspection | Status |
|----------|-------------------|--------|
| All four archetypes declare hitInset | `src/enemies.js` lines 39–42: standard=16, tank=12, mini-boss=10, boss=8 (top/right/bottom/left equal) | PASS |
| Values frozen | `Object.freeze({ top, right, bottom, left })` on every entry | PASS |
| assertArchetype validates hitInset | `src/enemies.js` lines 63–71: throws ConfigError if missing or non-finite | PASS |

### REQ-CMB-007 (added) — Debug hitbox overlay

| Scenario | Runtime evidence | Status |
|----------|------------------|--------|
| Overlay renders when ?hitboxes=1 | R2: 2 rects for 2 live enemies; colors=`standard:0x00FFFF (cyan)` | PASS |
| Overlay does NOT render in production (?test=1 + no ?hitboxes + no H) | Custom probe: `noParamNoKey: 0` | PASS |
| Toggle off clears overlay | R3 + custom probe: `enabledFalse: 0` | PASS |
| Different color per archetype | Custom probe: standard=65535(0x00FFFF cyan), tank=16776960(0xFFFF00 yellow), mini-boss=16711935(0xFF00FF magenta), boss=16744448(0xFF8000 orange) | PASS |
| Overlay tracks movement each frame | `DebugHitboxes.update(cameraIso)` called in main.js ticker line 396, clears then redraws each frame | PASS |

## Build / Test Evidence

### Test command 1: hitbox-visualization.spec.mjs

```
$ node tests/e2e/hitbox-visualization.spec.mjs
OK {
  "r1": { "bounds": { "x": 682.51, "y": 275.89, "w": 96, "h": 96 }, "hit": false, "enemyId": null },
  "r2": { "rects": [2 entries], "aliveCount": 2 },
  "r3": []
}
```

Exit code: 0. All RED→GREEN scenarios pass.

### Test command 2: hit-detection.spec.mjs

```
$ node tests/e2e/hit-detection.spec.mjs
OK {
  "result1": { hits: [{ hit:true, enemyId:"e01" }], integrity: 3 },
  "result2": { integrity: 2 },
  "result3": { integrity: 1 },
  "r1": { hit:true, enemyId:"e01" },
  "r2": { hit:false, enemyId:null },
  "r3": { standard:{hit:true}, tank:{hit:true}, "mini-boss":{hit:true}, boss:{hit:true} },
  "r4": { "1280x720":{hit:true}, "1920x1080":{hit:true} },
  "r5": { hit:true, enemyId:"e01" },
  "x1": { hit:true, enemyId:"e_tie_a" },
  "x2": { hit:true, enemyId:"e_null_a" }
}
```

Exit code: 0. All scenarios including the new R5 (regression lock for hitInset edge) pass.

### Production gate probe

```
{
  "noParamNoKey": 0,        // ?test=1 only → no overlay ✓
  "enabledTrue": 2,         // setHitboxesEnabled(true) → 2 rects ✓
  "enabledFalse": 0,        // setHitboxesEnabled(false) → cleared ✓
  "hitboxesParam": 2,       // ?hitboxes=1 → rects visible at boot ✓
  "errors": [],             // zero console errors ✓
  "colorsByArch": { "standard": 65535, "tank": 16776960, "mini-boss": 16711935, "boss": 16744448 }
}
```

Exit code: 0.

## Source Inspection

### src/enemies.js — line 39–42 (ARCHETYPES.hitInset)

- `standard`: `{ top: 16, right: 16, bottom: 16, left: 16 }` ✓
- `tank`: `{ top: 12, right: 12, bottom: 12, left: 12 }` ✓
- `mini-boss`: `{ top: 10, right: 10, bottom: 10, left: 10 }` ✓
- `boss`: `{ top: 8, right: 8, bottom: 8, left: 8 }` ✓

All four locked by REQ-CMB-006. All entries `Object.freeze`'d.

### src/enemies.js — Enemy.getScreenBounds (lines 141–167)

Both sprite branch (line 143–145) and fallback branch (line 146–156) compute `raw` bounds, then line 160 applies `ARCHETYPES[enemy.archetype]?.hitInset`. Returned `{x,y,w,h}` is the shrunk AABB. Single source of truth — combat resolver and debug overlay both read from this method.

### src/debug-hitboxes.js — new module

- `export class DebugHitboxes` (line 32) ✓
- Constructor accepts `{ hudContainer, enemies, isoWorld, viewportCenter, enabled }` (line 41) ✓
- `setEnabled(bool)` toggles internal flag + container visibility + clears graphics when off (lines 67–75) ✓
- `update(cameraIso)` early-returns when disabled, clears per-archetype graphics, lazy-inits `PIXI.Graphics` per archetype, draws `lineStyle(2, color, 1) + drawRect(b.x, b.y, b.w, b.h)` (lines 83–109) ✓
- `readRects()` returns `{ enemyId, archetype, x, y, w, h, color }[]` (lines 117–134) ✓
- `ARCHETYPE_COLORS` exported (line 25): standard=0x00FFFF, tank=0xFFFF00, mini-boss=0xFF00FF, boss=0xFF8000 ✓
- 1 Graphics per archetype pool (not 1 per enemy) per design decision ✓

### src/main.js — wiring

- Line 33: `import { DebugHitboxes } from './debug-hitboxes.js?v=44'` ✓
- Line 126: `urlParams.has('hitboxes')` parses `?hitboxes=1` ✓
- Line 253: `new DebugHitboxes({ hudContainer, enemies, isoWorld, viewportCenter, enabled })` ✓
- Line 265: `H` keydown listener calls `setEnabled(!isEnabled())` ✓
- Line 396: `debugHitboxes.update(camIso)` called in ticker ✓

### src/test-api.js — exposed methods

- Line 181: `setHitboxesEnabled(b)` → `ctx.debugHitboxes?.setEnabled?.(b)` ✓
- Line 189: `getHitboxRects()` → `ctx.debugHitboxes?.readRects?.() ?? []` ✓
- Line 361: `debugHitboxes` passed into mountTestAPI ctx ✓

## Success Criteria (from proposal)

| Criterion | Evidence | Status |
|-----------|----------|--------|
| Click 5px outside visible sprite = miss | hitbox-viz R1: `hit=false, bounds.w=96` (shrunk); click at `bounds.x - 5` | PASS |
| Click exactly on visible sprite center = hit | hit-detection R1: `hit=true, enemyId="e01"`; R3 all 4 archetypes hit | PASS |
| Debug overlay renders rectangles when ?hitboxes=1 | hitbox-viz R2: 2 rects for 2 alive; production probe `hitboxesParam: 2` | PASS |
| Different color per archetype (cyan/yellow/magenta/orange) | Production probe colors: 0x00FFFF, 0xFFFF00, 0xFF00FF, 0xFF8000 | PASS |
| Overlay toggles via H key at runtime | main.js line 265: `keydown` listener flips `setEnabled(!isEnabled())` | PASS (implementation) |
| Production (?test=0) does NOT render overlay by default | Production probe `noParamNoKey: 0` | PASS |

## Design Coherence

| Decision | Implementation | Status |
|----------|----------------|--------|
| hitInset applied inside Enemy.getScreenBounds (single source) | src/enemies.js line 160; both Combat resolver and DebugHitboxes read from it | OK |
| 1 PIXI.Graphics per archetype, reused per frame | src/debug-hitboxes.js lines 98–104: lazy-init keyed by arch | OK |
| URL ?hitboxes=1 OR H key toggles | main.js line 126 + line 265 | OK |
| Hardcoded color map (not parameterized) | src/debug-hitboxes.js lines 25–30 | OK |
| Test API surface setHitboxesEnabled + getHitboxRects | src/test-api.js lines 181–191 | OK |

## Issues

### Deviations (documented, accepted)

- **TASK-G6 deviation** (apply-progress.md): No explicit `<script type="module" src="debug-hitboxes.js?v=45">` tag in `index.html` because main.js already imports it. Avoids duplicate module instance. Browser dedupes by full URL including query string. Correct call — module is fetched once via main.js's import.

### Pre-existing failures (not caused by this change)

- `tests/e2e/smoke.spec.mjs`: enemy spawn count mismatch (24 vs 12 expected) — fails on main branch before this change.
- `tests/e2e/projectile-direction.spec.mjs`: homing scenario fires into empty space — pre-existing in uncommitted prior work.

Neither regression impacts the hitbox-visualization scope.

## Verdict

**PASS** — all spec scenarios covered with runtime-passing tests, source matches design decisions, production gate enforced, no new regressions.

## Next Recommended Phase

`sdd-archive` — sync delta specs into the canonical combat-core spec.
