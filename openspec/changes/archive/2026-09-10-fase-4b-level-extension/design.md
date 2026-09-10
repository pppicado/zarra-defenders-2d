# Design: F4b — Level extension (Phase B)

> **Change**: `fase-4b-level-extension` · **Base**: main @ `23d9ccf` (F4a archived) · **Strategy**: single PR · **LOC**: ~80 across 3 files
> **Source of truth**: `proposal.md` (no MODIFIED deltas — cull math + escape rule are length-agnostic)

## Technical Approach

Extend `TEST_LEVEL.railPath` from `(0,0) → (18,18)` to `(0,0) → (36,36)` (depth 72), bump `railEndTime` to 120 s, scale `_spawnTimeFromDepth` to the new depth range, add 12 enemies with composition `16 + 4 + 2 + 2` (linear scaling of F3's 8/2/1/1). Re-align one comment in `tests/e2e/hit-detection.spec.mjs` (header) — assertions stay valid because Manhattan-distance escape times are length-invariant. Add `tools/f4b-capture.mjs` (Playwright headless smoke at t=0, t=60, t=120) to prove the tileador covers the entire new corridor. See `proposal.md` §4.

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| ADR-1 | Rail extension multiplier | **2× depth** (depth 72) | User-approved 2026-09-10. Substantially longer corridor without changing the per-enemy hittable window. |
| ADR-2 | TILE_SIZE | **Keep 128** | Corrected F4a math: ~8 vertical tiles visible at LOGICAL_H=720. Sufficient. No risk of F2.5.15 tessellation regressions. |
| ADR-3 | Enemy composition | **16 standard + 4 tank + 2 mini-boss + 2 boss = 24** | Linear scaling of F3's locked 8/2/1/1. Maintains the 4-archetype distribution. |
| ADR-4 | Rail shape | **Linear (0,0) → (36,36)** | Approach C (multi-waypoint) deferred — breaks CAM-001 monotonic-depth invariant. |
| ADR-5 | Locked-file exceptions | **None** | Only `src/levels/test-level.js`, `tests/e2e/hit-detection.spec.mjs`, and new `tools/f4b-capture.mjs` are touched; none are on the locked list. |
| ADR-6 | `MAX_VISIBLE_TILES` | **Keep 400** | Worst-case viewport + 1-tile overshoot is ~192 tiles at the new rail; 400 has headroom. |

## Data Flow

```
TEST_LEVEL.railPath = [(0,0)→(36,36)] over 120s
        │
        ├─→ RailCamera waypoints (no edits — duck-typed)
        │       └─→ speed = 72 / 120 = 0.6 tile/s  (unchanged)
        │
        ├─→ TEST_LEVEL.railEndTime = 120
        │       └─→ main.js maybeFireVictory: triggers at camera.getTime() >= 120 AND all 24 enemies destroyed
        │
        ├─→ _spawnTimeFromDepth(depth) = ((depth - 5) / 72) * 120
        │       ├─→ depth 5  → t = 0
        │       ├─→ depth 36 → t = 51.67  (mid-rail)
        │       └─→ depth 71 → t = 110
        │
        └─→ 24 enemies (16+4+2+2) loaded via enemies.loadLevel(TEST_LEVEL.enemies)
                └─→ assertTestLevel() validates composition before boot
```

The tileador side is length-agnostic:

```
IsoWorld.update(camera)
        │
        ├─→ isoToScreen(camera)            ← pure math, viewport-derived (F4a)
        │
        ├─→ container.position.set(...)     ← anchor at viewport center (F4a CAM-002)
        │
        └─→ computeCullRange(camera, viewport, TILE_SIZE)
                ├─→ step = 128 / √2 ≈ 90.51  (unchanged)
                ├─→ vhHalfIso = 720 / (2·step) ≈ 3.98   (unchanged)
                └─→ worst-case visible = 2·vhHalfIso ≈ 7.96 iso tiles  (≤ MAX_VISIBLE_TILES 400)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/levels/test-level.js` | Modify | Extend `railPath`, bump `railEndTime` to 120, scale `_spawnTimeFromDepth` to depth 72, add 12 enemies (16+4+2+2 total), update `assertTestLevel()` composition. |
| `tests/e2e/hit-detection.spec.mjs` | Modify | Header comment: `rail (0,0) → (18,18) over 60s` → `rail (0,0) → (36,36) over 120s`. Assertion math on e01/e02 timings is invariant. |
| `tools/f4b-capture.mjs` | Create | Playwright headless capture at t=0, t=60, t=120. Mirrors `tools/f4a-capture.mjs` pattern. |
| `tests/playwright-screenshots/f4b-t{00,60,120}-*.png` | Create (Playwright output) | Visual evidence that the tileador covers the entire new corridor. |

**No spec files modified, no locked files modified.**

## Interfaces / Contracts

No new APIs. The `RailCamera` duck-typed interface (`getCameraX()`, `getCameraY()`) is unchanged. `assertTestLevel()` continues to throw `Error` on composition mismatch — that's the contract.

**Contract change (one sentence):** `TEST_LEVEL.railPath` and `TEST_LEVEL.enemies` are now 2× the F3 baseline; `_spawnTimeFromDepth` rescales linearly. The runtime invariants (CAM-001 monotonic depth, CAM-004 Manhattan-distance escape, TILE-004 cull cap) are unchanged.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `assertTestLevel()` composition pin | Called at `src/main.js:389` on every `?test=1` boot — passes for new counts |
| Unit | ARCHETYPES table pin | `node tests/unit/archetypes.spec.mjs` — unaffected, should continue to pass |
| E2E | Tileador coverage at 3 camera positions (start, mid, end) | `node tools/f4b-capture.mjs` — captures `f4b-t00-boot.png`, `f4b-t60-mid.png`, `f4b-t120-rail-end.png` |
| E2E | Projectile direction at new rail lengths | `node tests/e2e/projectile-direction.spec.mjs` — unaffected (rail-independent math), should continue to pass |
| E2E | Hit detection | `node tests/e2e/hit-detection.spec.mjs` — still fails on F3.5 carry-forward (escape rule); no regression expected |

## Threat Matrix

`N/A` — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Vanilla HTML5 + Pixi.js level-data change + Playwright smoke.

## Migration / Rollout

No migration required. No data, no persistent state, no schema, no `localStorage` keys, no asset paths. `git revert` the F4b merge restores F4a state in one step.

## Open Questions

- **None blocking.** All decisions resolved by user 2026-09-10 (rail multiplier, TILE_SIZE, composition).
- **Carry-forward**: `tests/e2e/smoke.spec.mjs` + `tests/e2e/hit-detection.spec.mjs` fail on F3.5 escape rule, not F4b. Documented in F4a archive; not in F4b scope.
