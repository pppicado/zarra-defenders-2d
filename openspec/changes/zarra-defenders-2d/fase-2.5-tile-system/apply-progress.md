# sdd/zarra-defenders-2d/fase-2.5-tile-system/apply-progress

> **Change**: `fase-2.5-tile-system`
> **Project**: `zarra-defenders-2d` (`/projects/personal/zarra-defenders-2d/`)
> **Mode**: Standard (no test runner; verification = Playwright + visual review)
> **Strategy**: `auto-chain` (per user preflight)
> **Review budget**: 3000 lines

## Final state

**Status**: PARTIAL — 3 PRs landed, regeneration loop failed, deferred to F2.5.1

## PRs landed (stacked-to-main)

### PR #1 — F2.5.1 pure iso modules ✅
- Commit: `ab0a98e` → merge `643300f`
- Files: `src/iso/{iso-math,tilemap,world}.js` (478 LOC total)
- Smoke test via Playwright (DevTools eval): PASS
- console.error: 0
- Audit invariant: `git diff v0.1 -- src/{rail-camera,input,player}.js` = empty

### PR #2 — F2.5.2 40 terrain-faithful tiles + asset pipeline ✅
- Commit: `02c1167` → merge `6e952ef`
- 40 PNGs generated (5 stages × 8 variants)
- tools/generate-iso-tiles.py + tools/postprocess_v4.py pipeline
- 33 tiles met terrain-fidelity, 7 flagged in user visual review

### PR #3 — F2.5.3 integration into main.js ✅
- Commit: `432dac9` → merge `c818d1c`
- src/main.js: minimal surgical edit (~30 LOC)
- index.html: cache-bust `?v=6` → `?v=7`
- DEMO_PATH_ISO = (0,0) → (5,3) → (8,8) monotonic x+y
- console.error: 0

### PR #4 (deferred) — regeneration loop + iso centering + gallery ⚠️ FAILED
- Sub-agent attempt: blocked by `sdd_task_result_empty` transport error
- Partial work landed in commit `99ae457`:
  - 7 bad tiles moved to `assets/tiles/_discarded/*_discarded.png`
  - manifest.json restructured to v1 schema
  - tools/generate-iso-tiles.py extended with `--regenerate`, `--mark-regenerated`, `negative_prompt` support
  - tools/variants.json: 7 bad variants carry explicit `negative_prompt`
- Subsequent regeneration attempts produced visually broken tiles (vertical strips, not diamonds)
- Root cause: minimax MCP `aspect_ratio=2:1` rejected, 1:1 fallback crops to vertical strips
- **Decision**: restore 7 original tiles from `_discarded/`, defer regeneration to F2.5.1

### Restoration commit
- 7 original tiles restored from `assets/tiles/_discarded/*_discarded.png` to `stage*/{variant}.png`
- 40 active tiles (33 from PR #2 + 7 restored originals)
- `_regen_attempt_1/` preserved as evidence for F2.5.1

## Verification results

- ✅ console.error = 0 in Playwright (all 3 PRs)
- ✅ 33/40 tiles visually terrain-faithful (Stages 1-3, 5; some Stage 4 have minor green presence)
- ❌ 7 tiles fail terrain-fidelity (documented in `_discarded/_regen_attempt_1/` as v2 attempts)
- ❌ Iso world renders top-left-anchored, not centered (Diablo-2 canonical feel missing)
- ❌ Tile-gallery.html not implemented (only `tests/f2.5.4-preview.html` partial preview)

## Deferred to F2.5.1 (new dedicated change)

1. Regenerate 7 bad tiles with verified-working aspect ratio approach (NOT 2:1 — see minimax dev notes)
2. Iso world centering fix in `src/main.js` (`worldOrigin` + `tileSize` calibration)
3. Complete `tests/tile-gallery.html` with accepted + discarded sections + visual marking
4. Manifest sync after regeneration (move new accepted to active[], keep discarded[] accurate)

## Key Learnings

1. **minimax MCP aspect_ratio limits**: only `1:1`, `4:3`, `3:2`, `16:9`, `9:16`, etc. accepted; `2:1` rejected. Must design around available ratios.
2. **PR #2 succeeded** because the first run used a slightly different minimax call pattern (likely 1:1 or 4:3) that produced diamond-shaped content. Need to discover what made it work.
3. **Transport failures** can occur mid-apply; sub-agent produced partial work (commit + untracked files) before failing. Always check working tree state after `sdd_task_result_empty`.
4. **User-driven regeneration workflow** (move to `_discarded/`, regenerate, gallery with marks) is the right design but needs a different aspect ratio strategy.