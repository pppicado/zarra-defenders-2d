# Exploration: fase-4b-level-extension

## Current State

The test level is locked at iso `(0,0) → (18,18)` (depth 36) over 60 seconds, with 12 enemies (8 standard + 2 tank + 1 mini-boss + 1 boss). The rail-camera advances at 0.6 tile/s. `TILE_SIZE = 128`, `LOGICAL_W = 1920`, `LOGICAL_H = 720` (post-F4a). Stage `stage1-bosque` has 8 tile variants (`src/iso/tilemap.js:181`). The tileador (`Tilemap.cullAndRender` + `computeCullRange`) is camera-aware (F3.5 rewrite, closed-form formula in `src/iso/tilemap.js:52`) with `MAX_VISIBLE_TILES = 400`.

## Visible vertical coverage (corrected)

**F4a's "~8 → ~5.6 tiles" estimate was wrong.** Recomputing with the actual cull math at `LOGICAL_H = 720`, `TILE_SIZE = 128`, `step = 128 / √2 ≈ 90.5097`:

- `vhHalfIso = LOGICAL_H / (2 · step) = 720 / 181.019 ≈ 3.98`
- Visible iso depth range around the camera = `camDepth ± 3.98`, so **~7.96 tiles visible vertically**.
- Previous F3.5 state at `LOGICAL_H = 1080`: `vhHalfIso ≈ 5.97`, ~12 tiles visible.

**Actual drop: ~12 → ~8 tiles visible** (not 8 → 5.6 as F4a reported). **TILE_SIZE adjustment is NOT necessary for coverage reasons**; the level extension can proceed without changing TILE_SIZE.

## Affected Areas

- **`src/levels/test-level.js`** — extend `railPath` (more waypoints or longer iso coordinates), bump `railEndTime` proportionally, add enemies, optionally update `_spawnTimeFromDepth` if the spawn-buffer changes.
- **`tests/unit/archetypes.spec.mjs`** — currently pins `TEST_LEVEL_ENEMY_COUNT` indirectly through `assertTestLevel`. The locked 12-enemy composition rule may need to relax (8 standard + 2 tank + 1 mini-boss + 1 boss) → e.g. (16 standard + 4 tank + 2 mini-boss + 2 boss) for a 2× extension.
- **`tests/e2e/hit-detection.spec.mjs`** — references specific enemy ids (`e01`, `e02`, etc.) and t=25 escape expectations; needs re-alignment (and was already flagged as a Fase A carry-forward for the F3.5 escape rule).
- **`openspec/specs/iso-tile-system/spec.md`** — `MAX_VISIBLE_TILES = 400` cap; with the camera-aware closed-form cull, the cap is "closest to center wins" — needs to remain ≥ the theoretical visible tile count for the new viewport + overshoot. Quick math: viewport 1920×720 + 1-tile overshoot at step=90.5 yields ~24×8 = ~192 tiles worst case. Cap 400 has plenty of headroom.
- **`openspec/specs/iso-camera-integration/spec.md`** — CAM-002 (already updated by F4a); CAM-004 (escape rule) — the spawn-time-to-escape-time math depends on the rail length; if we keep the 0.6 tile/s speed, the escape times scale linearly with depth.
- **`tests/e2e/smoke.spec.mjs`** — already a carry-forward from F4a (F3.5 escape rule failure); will need re-alignment after F4b anyway.
- **`tests/e2e/rail-direction.spec.mjs`** — likely unaffected (it tests rail direction sense, not length).

No new spec capability needed — the changes are scope extensions to existing `iso-tile-system` and `iso-camera-integration`.

## Approaches

| # | Approach | Description | Pros | Cons | Effort |
|---|---|---|---|---|---|
| **A** | **1.5× depth** (recommended) | Rail `(0,0) → (27,27)` over 90 s, ~18 enemies (12 standard + 4 tank + 2 mini-boss + 2 boss). Speed stays 0.6 tile/s. | 50% longer playtime; balanced enemy density; minimal test churn (12 → 18); the 8 tile variants have plenty of room for variation | Modest extension; user may want more | **Low** |
| **B** | **2× depth** | Rail `(0,0) → (36,36)` over 120 s, ~24 enemies (16+4+2+2). | Substantially longer; feels like a real "stage" | 24 enemies is dense; the 8-variant pool may start repeating; more test churn | Medium |
| **C** | Multi-waypoint path | 3 segments of (0,0)→(12,12)→(24,4)→(36,18) over 90 s, ~18 enemies. | Adds variety; non-linear rail; better narrative pacing | `RailCamera` is monotonic in depth (CAM-001); a non-monotonic path may need a CAM-001 MODIFIED spec | High |

## Recommendation

**Approach A** (1.5× depth). The user's pain is "el nivel sea más largo" — 1.5× gives 50% more rail + 50% more enemies without breaking the locked archetype composition rule (it scales by the same ratio as 8→12). Speed stays at 0.6 tile/s so the per-enemy hittable window is unchanged. The 8-variant `stage1-bosque` tile pool has plenty of visual variety for 18 enemies on a longer rail. The locked files (`rail-camera.js`, `input.js`, `player.js`, `index.html`, `styles/main.css`) do not need to be touched. `MAX_VISIBLE_TILES = 400` stays well above the worst-case viewport count (~192). CAM-002 + CAM-004 spec updates are pure literal sweeps.

**TILE_SIZE: KEEP AT 128.** The corrected coverage math (~8 vertical tiles) is acceptable; reducing TILE_SIZE would force `step` (and every downstream `isoToScreen`/`screenToIso`/`computeCullRange`/`escapeFrontDepth` consumer) to scale and would risk F2.5.15 tessellation regressions.

## Open questions for the user (REQUIRED before sdd-propose)

1. **Rail extension multiplier: A (1.5×), B (2×), or C (multi-waypoint)?** Orchestrator recommends A.
2. **TILE_SIZE: keep 128, or reduce to 96 / 80?** Orchestrator recommends keeping 128 (the F4a coverage concern was over-stated; actual is ~12 → ~8 vertical tiles).
3. **Enemy composition rule: relax the locked `assertTestLevel` (12 enemies → 18 or 24), or keep `assertTestLevel` and just bump enemy count?**
   - If A (1.5×) is chosen, the composition scales: 12 standard + 3 tank + 2 mini-boss + 1 boss = 18.
   - If B (2×) is chosen: 16 standard + 4 tank + 2 mini-boss + 2 boss = 24.
   - Alternative: keep the 4-archetype distribution but pick concrete numbers per your preference.
4. **Tile variants: keep the existing 8 `stage1-bosque` variants, or generate more?** Orchestrator recommends keeping 8 (no asset work; the rail extension reuses the same visual vocabulary).

## Risks

- **R1**: extending the rail to depth 54 (1.5×) means the camera spends more time at any given iso depth, increasing the per-enemy hittable window. This may make the test level feel easier — the spawn cadence may need re-tuning.
- **R2**: the existing 12-enemy `assertTestLevel` is referenced by `tests/unit/archetypes.spec.mjs`; relaxing it requires updating that unit test (or keeping the rule at 12 and adding a separate count assertion).
- **R3**: if the user chooses Approach C (multi-waypoint), `RailCamera`'s monotonic-depth invariant (CAM-001) breaks; this needs a CAM-001 MODIFIED spec, which would require touching the locked `src/rail-camera.js` — request scoped exception.
- **R4**: `computeCullRange` was tested at the existing rail length only; verifying it covers a longer rail is part of F4b verification (a Playwright smoke at t=0, t=45, t=90 should show consistent tile coverage).
- **R5**: locked-file exceptions: only `src/main.js` needed a scoped exception in F4a. F4b may need one for `src/levels/test-level.js` only IF the locked-files rule extends to it (it doesn't — `test-level.js` is not in the locked list, so no exception needed).
- **R6**: pre-existing F3.5 test failures (`smoke.spec.mjs`, `hit-detection.spec.mjs`) will resurface and may need additional patching during F4b verification. Documented carry-forward.

## Ready for Proposal

**Yes, pending resolution of the 4 open questions above.** Once user answers, sdd-propose can produce `proposal.md` (scope + approach + locked-file exception if needed + rollback + success criteria). Expected total: ~250-350 LOC across 3-5 files (test-level, 1-2 specs, 1-2 tests). Single PR, no chained, no `size:exception`. ~30 minutes of work.
