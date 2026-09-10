# Proposal: F4b — Level extension (Phase B)

**Change**: `fase-4b-level-extension` (display name: F4b)
**Project**: zarra-defenders-2d · **Base**: main @ `23d9ccf` (F4a archived) · **Mode**: hybrid · **Strategy**: single PR, no `size:exception` · **LOC target**: ~80 · **Status**: ready for sdd-spec / sdd-design

---

## 1. Intent

The current test level is rail `(0,0) → (18,18)` (depth 36) over 60 s with 12 enemies. The user pain is concrete: the corridor is too short to feel like a "stage" and the rail-camera has too little visible distance to traverse. F4b doubles the rail length and the enemy roster (24 enemies, 16+4+2+2 archetype distribution) while keeping the rail-camera speed (0.6 tile/s) and the per-enemy hittable window unchanged. F4b also verifies that the F3.5 camera-aware `computeCullRange` covers every visible iso position along the new corridor without gaps.

This is **Phase B of a 4-phase visual rework** (A: canvas 1080→720, archived; B: this; C: hand size +20%; D: papeleta sprite + cooldown). A is merged to main.

F4a's coverage analysis was over-stated: actual visible vertical tiles at `LOGICAL_H=720, TILE_SIZE=128` is **~8**, not the ~5.6 estimated in F4a's exploration. **TILE_SIZE stays at 128** — no need to reduce.

## 2. Scope

### In scope (F4b ships this single PR)

| # | Capability | Files (approx.) | Acceptance |
|---|---|---|---|
| 1 | Extend `TEST_LEVEL.railPath` to `(0,0) → (36,36)` (depth 72) over 120 s | `src/levels/test-level.js` | `TEST_LEVEL.railEndTime === 120`, rail has 2 waypoints summing to depth 72 |
| 2 | Update `_spawnTimeFromDepth` to the new depth range | `src/levels/test-level.js` | formula yields `t=0` for depth-5 enemies, `t≈115` for depth-72 enemies |
| 3 | Add 12 more enemies (16 standard + 4 tank + 2 mini-boss + 2 boss = 24 total), spread across the new depth range | `src/levels/test-level.js` | `TEST_LEVEL.enemies.length === 24` |
| 4 | Update `assertTestLevel()` to the new composition | `src/levels/test-level.js` | composition assertion passes for the new counts |
| 5 | Re-align `tests/e2e/hit-detection.spec.mjs` comments + assertion math to the new rail length (depth 72 over 120 s); the `e01..e24` ids and `t=20, t=25` timings stay valid because escape times depend on Manhattan distance, not rail length | `tests/e2e/hit-detection.spec.mjs` | comments mention `(0,0) → (36,36)` and `120 s` |
| 6 | Add `tools/f4b-capture.mjs` (Playwright smoke that captures t=0, t=60, t=120 screenshots) to verify the tileador covers the entire new corridor | `tools/f4b-capture.mjs` (new), `tests/playwright-screenshots/f4b-t{00,60,120}-*.png` (new) | 3 PNGs saved, zero `console.error` at each capture point |
| 7 | Optional: bump `MAX_VISIBLE_TILES` in `src/iso/tilemap.js` only if the cull cap is hit at the new rail length (worst-case viewport + overshoot is ~192 tiles; current 400 has headroom — likely NO-OP) | `src/iso/tilemap.js` (only if needed) | cull cap check passes |

### Out of scope (deferred to F4c / F4d / F4+)

- Hand size +20% (F4c)
- Papeleta sprite + cooldown (F4d)
- Reducing TILE_SIZE to recover coverage (F4a carry-forward; deferred to a future tile-system change, NOT this PR)
- New tile variants (8 `stage1-bosque` variants reused as-is)
- Multi-waypoint / non-monotonic rail (Approach C — would break CAM-001 and require `src/rail-camera.js` edit; deferred)
- `tests/e2e/smoke.spec.mjs` re-alignment (carry-forward to `fase-3.5.1-escape-test-align`; pre-existing failure)
- Asset regen for the new enemies (we reuse the existing 11 sprite ids in `assets/sprites/manifest.json`)

## 3. Capabilities

### New capabilities

None.

### Modified capabilities

None (at the spec level — the cull math and escape rule are length-agnostic).

The `iso-camera-integration` CAM-004 scenario "Rail-aligned enemy in TEST_LEVEL escapes at the documented time" pins `e01` at depth 5 with escape at `t ≈ 18.33s`. With the rail depth 72 (vs 36) and speed 0.6 tile/s, the escape time stays at `t = (camDepth_target − 5) / 0.6 = (11 − 5) / 0.6 ≈ 10s` (camera depth 11 from enemy depth 5). Wait — let me re-derive. The scenario says `t ≈ 18.33 s` for `camDepth > 11`. With speed 0.6 tile/s, camDepth=11 at t=18.33s. With the new rail also 0.6 tile/s, camDepth=11 is also at t=18.33s. **The scenario is invariant.** No MODIFIED needed for CAM-004.

## 4. Approach

1. **Edit `src/levels/test-level.js`**:
   - `railPath`: extend to `[(0,0) → (36,36)]`, `railEndTime: 60 → 120`.
   - `_spawnTimeFromDepth`: update to `((depth - 5) / 72) * 120` (was `((depth - 5) / 36) * 60`).
   - Extend `_buildEnemyDefs` with 12 more enemies distributed across depths 19-71 (the existing 12 cover depths 5-31). Composition scales linearly: 8+8 standard, 2+2 tank, 1+1 mini-boss, 1+1 boss.
   - Update `assertTestLevel()` to expect 16/4/2/2.

2. **Re-align `tests/e2e/hit-detection.spec.mjs`**:
   - Update the comment at line 12 from "rail (0,0) → (18,18) over 60s" to "rail (0,0) → (36,36) over 120s".
   - The escape-time calculations for e01 (depth 5, escape at t≈18.33s) and e02 (depth 8, escape at t≈23.33s) remain valid; the assertions at t=20, t=25 do not change.

3. **`tools/f4b-capture.mjs`** (mirrors `tools/f4a-capture.mjs`):
   - Boot `?test=1` headless; capture screenshots at t=0, t=60, t=120.
   - Assert zero `console.error` at each capture point.
   - This is the visual-evidence gate for "tileador dibuja bien a lo largo de todo el recorrido".

4. **Verification**:
   - `node tests/e2e/projectile-direction.spec.mjs` continues to pass (no change to that spec).
   - `node tests/e2e/hit-detection.spec.mjs` continues to fail (carry-forward F3.5, expected).
   - `node tests/e2e/smoke.spec.mjs` continues to fail (carry-forward F3.5, expected).
   - `node tools/f4b-capture.mjs` is the new focused test.
   - `node tests/unit/archetypes.spec.mjs` continues to pass (no change).

## 5. Decisions made in this proposal

| # | Decision | Choice | Reason |
|---|---|---|---|
| 1 | Rail extension | **2× depth** (depth 72, 120s, 24 enemies) | User chose this in exploration. Substantially longer corridor; rail speed unchanged at 0.6 tile/s. |
| 2 | TILE_SIZE | **Keep 128** | Corrected F4a math: ~8 vertical tiles visible at 720p, not ~5.6. Sufficient coverage. |
| 3 | Enemy composition | **16 standard + 4 tank + 2 mini-boss + 2 boss** | Linear scaling of F3's 8/2/1/1. Maintains the 4-archetype distribution. |
| 4 | Rail shape | **Linear (0,0) → (36,36)** | Approach C (multi-waypoint) deferred — would break CAM-001 monotonic-depth invariant. |
| 5 | Tile variants | **Keep the 8 `stage1-bosque` variants** | No asset work; the longer rail reuses the same visual vocabulary. |
| 6 | Locked-file exceptions | **None needed** | Only `src/levels/test-level.js` (NOT locked), `tests/e2e/hit-detection.spec.mjs` (NOT locked), and a new `tools/f4b-capture.mjs` are touched. The `rules.apply` locked list (rail-camera.js, input.js, player.js, index.html, styles/main.css) is not affected. |
| 7 | `MAX_VISIBLE_TILES` | **Keep 400** | Worst-case viewport + 1-tile overshoot at the new rail is ~192 tiles; 400 has headroom. |

## 6. Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/levels/test-level.js` | Modified | Extend `railPath`, bump `railEndTime` to 120, scale `_spawnTimeFromDepth` to depth 72, add 12 enemies, update `assertTestLevel()`. |
| `tests/e2e/hit-detection.spec.mjs` | Modified | Update header comment to mention the new rail. Assertions on e01..e24 timings stay valid. |
| `tools/f4b-capture.mjs` | New | Playwright capture at t=0, t=60, t=120 for visual verification. |
| `tests/playwright-screenshots/f4b-t{00,60,120}-*.png` | New | Playwright output. |

No spec file under `openspec/specs/` needs to change.

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `computeCullRange` cull coverage is broken at the new rail length (tileador leaves gaps in the corridor) | Low | Closed-form formula in F3.5; cull math is length-agnostic. Visual verification via `f4b-capture.mjs` at t=0, t=60, t=120 covers the full depth range. |
| The new 12 enemies use sprite ids that are not in the manifest | Low | Reuse the existing 11 sprite ids from `assets/sprites/manifest.json` (rotation, not new ids). |
| `assertTestLevel()` throws on the new composition and breaks `?test=1` boot | Low | Update the function in lock-step with the enemy list (single commit). |
| `hit-detection.spec.mjs` continues to fail with the new rail length, plus more drift from F3.5 escape rule | Medium | Documented as carry-forward. The F4b fix is comment-only; assertion math is invariant. |
| 24 enemies feel too dense visually (8-variant tile pool repeats) | Medium | The `pickVariantFlat` checkerboard (`src/iso/world.js:204`) ensures variety; users see enemies as foreground sprites, not tile variants. Acceptable. |
| The `_spawnTimeFromDepth` formula's `(depth - 5)` buffer assumes depth ≥ 5; enemies with depth < 5 (none in the new roster) would spawn at t=0 (clamped by `Math.max(0, t)`) | Low | All new enemies have depth ≥ 19. |

## 8. Rollback Plan

1. `git revert` the F4b merge restores `23d9ccf` (F4a archived) state in one step.
2. New files: `tools/f4b-capture.mjs`, 3 PNGs — removed by revert.
3. No data, no persistent state, no schema.
4. The enemy roster reverts to 12 with the locked composition.

## 9. Dependencies

- **Playwright**: same harness as F4a (already in `node_modules/`).
- **Python http.server**: same as F4a (already running on 8000).
- **No new assets**: the 11 sprite ids in `manifest.json` cover all 24 enemies (rotation).
- **No minimax calls**: zero AI generation in this PR.

## 10. Success Criteria

- [ ] `TEST_LEVEL.railPath = [(0,0) → (36,36)]`, `railEndTime = 120`.
- [ ] `TEST_LEVEL.enemies.length === 24` with composition 16 standard + 4 tank + 2 mini-boss + 2 boss.
- [ ] `assertTestLevel()` passes.
- [ ] `_spawnTimeFromDepth(5) === 0` and `_spawnTimeFromDepth(72) === 115` (within ±1 s).
- [ ] `node tests/unit/archetypes.spec.mjs` passes (no change to ARCHETYPES table).
- [ ] `node tests/e2e/projectile-direction.spec.mjs` passes (no change to that spec).
- [ ] `node tools/f4b-capture.mjs` captures 3 PNGs, zero `console.error` at t=0, t=60, t=120.
- [ ] `git diff 23d9ccf -- src/{rail-camera,input,player}.js index.html styles/main.css` returns empty (locked-files contract).
- [ ] No MODIFIED delta specs needed.
- [ ] Total diff ≤ 100 LOC across 3 files (`test-level.js`, `hit-detection.spec.mjs`, new `tools/f4b-capture.mjs`).

## 11. Open questions for sdd-spec

These are decisions the proposal adopted a recommended default for. Spec phase should challenge each one before locking.

1. **Enemy distribution along the new depth range.** Proposing linear spacing: 24 enemies uniformly across depths 5-72 (≈2.8 tiles apart). Alternative: cluster enemies near the rail end (difficulty ramp). Proposing linear for simplicity.
2. **`_spawnTimeFromDepth` buffer**. Current `(depth - 5)` buffer gives ~5 tiles of "pre-spawn" visibility per enemy. With the new rail, this is unchanged. Should the buffer scale with rail length? Proposing NO.
3. **Multi-stage transitions.** Should the rail trigger `isoWorld.setStage()` when crossing into a different stage? Proposing NO — we keep `stage1-bosque` for the entire rail in F4b. Stage transitions are F4+ polish.

### Resolved by user 2026-09-10 (no longer open)

- ~~**Rail extension multiplier**~~ → 2× depth.
- ~~**TILE_SIZE adjustment**~~ → keep 128.
- ~~**Enemy composition rule**~~ → linear scaling (16+4+2+2).

## 12. Next phase

`sdd-spec` produces **no MODIFIED deltas** for this change — the cull math and escape rule are length-agnostic. Spec phase should verify this claim and explicitly write `## MODIFIED Requirements: None` in the (empty) change folder, OR skip the `specs/` folder entirely if the project convention allows.

Then `sdd-design` → `sdd-tasks` → `sdd-apply` → `sdd-verify` → `sdd-archive`.

## 13. Size exception

Not needed. Estimated ~80 LOC across 3 files, well under the 400-line PR budget. Single PR, no chained splits.
