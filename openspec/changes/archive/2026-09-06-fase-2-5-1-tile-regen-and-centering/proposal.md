# Proposal: F2.5.1 — Tile Regeneration + Iso Centering

**Change**: `fase-2-5-1-tile-regen-and-centering` (display name: F2.5.1)
**Project**: `zarra-defenders-2d` · **Base**: `main` @ `8d78885` (F2.5 already merged)
**Mode**: hybrid · **Strategy**: `auto-chain` · **Review budget**: 3000 LOC
**Status**: ready for sdd-spec / sdd-design

---

## Why

F2.5 closed **partial**: 3 PRs landed, but `sdd_task_result_empty` killed the regeneration loop mid-flight. Restoration brought 7 originals back, but **root causes were never fixed**: (a) the regen prompt lost the verbatim "flat magenta #FF00FF background" phrase that makes minimax fill corners with chroma-key color (memory #124), and (b) the iso world renders top-left-anchored because `IsoWorld.update()` uses `tileWorldOrigin` (HUD strip `y = H*0.30`) as the world container anchor instead of the viewport center (memory #122). The `tests/tile-gallery.html` is also a legacy hardcoded partial.

## What changes (4 deliverables)

| # | Capability | Files | Acceptance |
|---|---|---|---|
| 1 | Regenerate 7 bad tiles | `assets/tiles/stage{1,3,4,5}-*/{variant}.png` (overwrite 7); `assets/tiles/_discarded/_regen_attempt_2/` (evidence) | 7 tiles → 2:1 diamonds after Pillow crop; Playwright: `naturalWidth === 128 && naturalHeight === 64`, alpha 0 at 4 corners; user sign-off via gallery |
| 2 | Iso world centering fix | `src/iso/world.js` (~5 LOC); possibly `src/main.js` (~3 LOC) | World container anchored at `viewOrigin = {x: W/2, y: H/2}` (NOT HUD strip); camera projected iso position tracks viewport center; `git diff 8d78885 -- src/{rail-camera,input,player}.js` empty |
| 3 | Complete tile gallery | `tests/tile-gallery.html` (rewrite ~80 LOC); `tests/f2.5.4-preview.html` left untouched | Reads `manifest.json` at runtime; renders Accepted (40) + Discarded sections; orange border on regenerated tiles; Playwright: 0 console errors |
| 4 | Manifest sync | `assets/tiles/manifest.json`; `tools/generate-iso-tiles.py` (extends `--mark-regenerated`) | 7 entries get `regeneratedFrom.regeneratedAt`; invariant `totals.active + totals.discarded === 40` |

**Regeneration strategy (item 1)**: `aspect_ratio=1:1` (closest accepted ratio to 2:1; 2:1 is **rejected** by minimax MCP per memory #124). Verbatim phrase **"flat magenta #FF00FF background"** in every prompt. **Smoke-test 1 tile first** (`stage1-bosque/pino_underbrush_dark` — lowest-risk) before committing to all 7. Per-tile commits avoid the previous `sdd_task_result_empty` partial-state failure.

**Centering strategy (item 2)**: introduce `viewOrigin = {x: W/2, y: H/2}` in `IsoWorld.update()`; replace `position.set(-csx, -csy)` with `position.set(viewOrigin.x - csx, viewOrigin.y - csy)`. `tileWorldOrigin` (W/2, H*0.30) stays for F3 HUD reservation but is no longer the world-container anchor — preserves TILE-001 round-trip semantics (iso↔screen still via `tileWorldOrigin`).

**The 7 flagged variants** (from `_regen_attempt_1/`): `stage1-bosque/pino_underbrush_dark`, `stage3-rio/roca_chorrera_humeda`, `stage4-vertedero/{cement_pad_crack,plastic_debris_mixed,weeds_through_pavement}`, `stage5-castillo/{pino_penon_mediterraneo,sendero_subida_penon}`.

## Scope boundaries

**Out of scope**: `src/rail-camera.js`, `src/input.js`, `src/player.js`, `styles/main.css`, `index.html` (locked per `openspec/config.yaml` `rules.apply`); F3+ collision/F4 enemy/F5 pedagogy; NOTES.md or palette changes; the 4 untracked files (`_discarded/_regen_attempt_1/`, `f2.5.4-preview.html`, `zarra-v01-*.png`) — remain as evidence, untouched.

## Capabilities (contract with sdd-spec)

### New Capabilities
None. F2.5.1 is a corrective patch on the F2.5 baseline.

### Modified Capabilities
- **`iso-asset-pipeline`**: ADDED `ASSET-006` (regen workflow + aspect_ratio strategy + smoke-test gate), ADDED `ASSET-007` (manifest totals invariant + `regeneratedFrom` block), ADDED `ASSET-008` (`tile-gallery.html` reads manifest, renders accepted + discarded).
- **`iso-camera-integration`**: MODIFIED `CAM-002` — world container anchor is `viewOrigin = {x: W/2, y: H/2}`, NOT `tileWorldOrigin`. Scenario updated: "world.position equals `(viewOrigin.x − csx, viewOrigin.y − csy)`; camera projected iso lands at viewport center, not HUD strip".

## Affected Areas

| Area | Impact |
|---|---|
| `assets/tiles/stage{1,3,4,5}-*/` | Modified (7 PNGs overwritten) |
| `assets/tiles/_discarded/_regen_attempt_2/` | New (evidence, like `_regen_attempt_1`) |
| `assets/tiles/manifest.json` | Modified (regen timestamps + totals reconcile) |
| `src/iso/world.js` | Modified (~5 LOC — viewOrigin) |
| `src/main.js` | Possibly modified (~3 LOC) |
| `tests/tile-gallery.html` | Rewritten (~80 LOC) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| minimax flake / broken tiles | Med | Smoke-test 1 tile first; per-tile commits so partial failure doesn't lose earlier accepted tiles |
| `aspect_ratio=1:1` crops poorly to 128×64 | Low | Fallback `4:3` with `(w*0.75) × (w*0.375)` Pillow crop |
| Centering breaks CAM-002 HUD invariant | Low | `viewOrigin` separate from `tileWorldOrigin`; `hud` is sibling of `world` (not child) — invariant holds by construction |
| Stage 4 `plastic_debris_mixed` regenerates GREEN again (model bias) | Med | Strengthen `NEGATIVE CONSTRAINTS` with "ONLY concrete/grey-brown, no living plants at all" |

## Rollback plan

1. **Item 1 per-tile rollback**: restore from `_discarded/_regen_attempt_1/*_discarded.png` (still present); set `discarded[]` entry.
2. **Item 2 rollback**: `git revert <commit>` keeps F2.5 modules + tiles intact.
3. **Item 3 rollback**: `tests/f2.5.4-preview.html` remains as legacy.
4. **Full rollback**: `git checkout 8d78885` returns to F2.5 partial state (same as before F2.5.1 started).

## Dependencies

- minimax MCP (1:1 + verbatim magenta phrase only); `tools/postprocess_v4.py` (reuse, no edit); `tools/generate-iso-tiles.py` `--regenerate` + `--mark-regenerated` (already landed in PR #4 partial, commit 99ae457); Playwright (existing).

## Success Criteria

- [ ] 7 regen tiles: 128×64, alpha 0 at 4 corners, no magenta fringe
- [ ] Gallery shows 40 accepted, 7 orange-bordered regen, 0 discarded
- [ ] `tests/out/iso-centered.png` shows iso world framed at viewport center
- [ ] `manifest.json` invariant: `totals.active + totals.discarded === 40`
- [ ] `console.error === 0`, `console.warn === 0` across DEMO_PATH_ISO loop
- [ ] `git diff 8d78885 -- src/{rail-camera,input,player}.js` empty (CAM-001 contract preserved)

## Chained PR recommendation

**Yes — 2 PRs, stacked-to-main**:

| PR | Files | LOC | Scope | Verification | Rollback |
|---|---|---|---|---|---|
| F2.5.1.a | 7 PNGs + `_regen_attempt_2/` + `manifest.json` update | 7 binary + ~50 LOC | Assets + manifest ONLY; no code edits | Playwright shape assert per tile; gallery preview | `git rm _discarded/_regen_attempt_2/ + git checkout 8d78885 -- manifest.json` |
| F2.5.1.b | `src/iso/world.js` (~5 LOC) + `src/main.js` (~3 LOC) + `tests/tile-gallery.html` (~80 LOC) | ~85 LOC | Centering + gallery rewrite | Playwright: centered iso world, 0 errors; HUD invariant | `git revert <commit>` |

**Justification for 2 PRs (not 3)**: items 1+4 are tightly coupled (regen → manifest update is one logical asset operation); items 2+3 are orthogonal (centering is `src/iso/world.js`, gallery is `tests/`). Splitting 4 ways would force a manifest-only PR with no runtime impact, which adds review burden without payoff. **400-line budget risk: Low** (~140 LOC + 7 PNGs total). Chain strategy: stacked-to-main, F2.5.1.a lands on its own visual merit, F2.5.1.b follows.

## Next phase

`sdd-spec` — write delta specs under `openspec/changes/zarra-defenders-2d/fase-2.5.1-tile-regen-and-centering/specs/{iso-asset-pipeline,iso-camera-integration}/spec.md` with `ADDED Requirements` (ASSET-006/007/008) and `MODIFIED Requirements` (CAM-002). Then `sdd-design` for centering math rationale, then `sdd-tasks` for budget forecast.
