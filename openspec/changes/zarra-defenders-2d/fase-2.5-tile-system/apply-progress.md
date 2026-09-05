# Apply progress — F2.5 Isometric Tile System

> **Change**: `fase-2.5-tile-system` · **Project**: `zarra-defenders-2d`
> **Mode**: hybrid (OpenSpec + Engram) · **Delivery**: stacked-to-main, 3 PRs
> **Started**: 2026-09-05 · **Apply attempt**: sdd-apply-fase-2.5-initial
> **Status**: 🟡 PARTIAL — all 3 PRs merged to `main`, awaiting USER VISUAL REVIEW gates (F2.5.2.8 + F2.5.3.4)

---

## PR #1 — F2.5.1 Pure modules · ✅ MERGED

| Field | Value |
|---|---|
| Branch | `feat/f2.5.1-iso-pure-modules` |
| Commit | `ab0a98e` — `feat(iso): add pure iso math, tilemap, and world modules` |
| Merge | `643300f` — `Merge PR #1: F2.5.1 — pure iso modules` (no-ff into `main`) |
| LOC | +478 (6 files: 3 modules + smoke test + screenshot) — within 560-budget |
| Tasks done | F2.5.1.1, F2.5.1.2, F2.5.1.3, F2.5.1.4 |
| Verification | Playwright headless on `tests/iso-smoke.html`: `window.__isoSmokeOK === true`, 0 failures, console.error=0, console.warning=0. Existing `index.html` regression check: console.error=0, console.warning=0. |
| Audit invariant | `git diff 581d291 -- src/{rail-camera,input,player}.js styles/main.css index.html` = empty lines. ✅ |
| Files | `src/iso/iso-math.js` (84 LOC), `src/iso/tilemap.js` (140 LOC), `src/iso/world.js` (111 LOC), `tests/iso-smoke.html` (40 LOC), `tests/iso-smoke.js` (103 LOC), `tests/out/iso-smoke-fase-2.5.1.png` |

---

## PR #2 — F2.5.2 Asset generation (40 tiles) · ✅ MERGED · 🔴 USER GATE pending

| Field | Value |
|---|---|
| Branch | `feat/f2.5.2-asset-pipeline` |
| Commit | `02c1167` — `feat(assets): generate 40 terrain-faithful iso tiles for 5 stages` |
| Merge | `6e952ef` — `Merge PR #2: F2.5.2 — 40 terrain-faithful tiles + asset pipeline` (no-ff into `main`) |
| Tasks done | F2.5.2.1, F2.5.2.2, F2.5.2.3, F2.5.2.4, F2.5.2.5, F2.5.2.6, F2.5.2.7 |
| Task pending | F2.5.2.8 — user visual review (stage 4 anti-glorification + general terrain fidelity) |
| Verification | Playwright: 40 PNGs at 128×64. Console error count = 0. |
| Visual review | See `tests/out/tile-gallery-fase-2.5.2.png` (full 5×8 grid). |
| Files | `tools/generate-iso-tiles.py` (356 LOC), `tools/variants.json` (53 LOC), `assets/tiles/manifest.json` (40 entries), `assets/tiles/stage{1-5}-*/*.png` × 40, `tests/tile-gallery.html` (visual review tool) |

### ⚠️ Tiles flagged for regeneration (F2.5.2.8 review)

- **`stage3-rio/roca_chorrera_humeda.png`** — minimax returned full-bleed rock (no magenta bg), so postprocess mis-cropped to vertical strip instead of a 128×64 diamond. Needs regeneration with stronger prompt enforcement of the magenta BG + iso diamond framing.
- **`stage4-vertedero/plastic_debris_mixed.png`** — minimax rendered GREEN vegetation instead of dull plastic debris. Violates the ASSET-005 anti-glorification gate (no green, no blue). Needs regeneration.
- **Optional: `stage4-vertedero/weeds_through_pavement.png`** — has lush green elements; "weeds" are naturally green so debatable. User judgment call.

### Stage 4 visual analysis (the critical gate)

The 8 Vertedero tiles lean properly oppressive/industrial:
- ✅ `cement_pad_crack` — dirty cracked grey concrete with rust stains
- ✅ `gravel_dust_industrial` — industrial pattern, no vegetation
- ✅ `container_lixiviado_stain` — heavy industrial rust/oxidation
- ✅ `metal_scrap_rust` — rusted metal, brown-orange oxidation
- ✅ `asphalt_cracked_heavy_truck` — cracked industrial asphalt
- ✅ `weeds_through_pavement` — sparse dead-ish weeds (mostly OK)
- ⚠️ `dirt_oily_contaminated` — iridescent rainbow oil slick is realistic but adds visual "beauty"
- ❌ `plastic_debris_mixed` — model rendered lush green grass

---

## PR #3 — F2.5.3 Integration · ✅ MERGED · 🔴 USER GATE pending

| Field | Value |
|---|---|
| Branch | `feat/f2.5.3-integration` |
| Commit | `432dac9` — `feat(iso): integrate isometric world into main.js` |
| Merge | `c818d1c` — `Merge PR #3: F2.5.3 — integration into main.js` (no-ff into `main`) |
| Tasks done | F2.5.3.1, F2.5.3.2, F2.5.3.3 |
| Task pending | F2.5.3.4 — user visual gate (Diablo-2 look-and-feel) |
| LOC delta | +62 / -16 across `src/main.js`, `src/iso/world.js`, `index.html` |
| Verification | Playwright on `index.html`: `console.error = 0`, `console.warning = 0` (the warning that appears at ~30s is the expected CAM-001 loop-regression warning, not an error). Audit invariant preserved: `git diff 581d291 src/{rail-camera,input,player}.js = 0 lines`. |
| Visual capture | `tests/out/iso-world-fase-2.5.3.png` (early frame, t≈3s), `tests/out/iso-world-fase-2.5.3-mid.png` (mid-path) |

### ⚠️ Known visual offset (likely needs user judgment)

The spec's `world.position.set(-csx, -csy)` (CAM-002) anchors the camera point at screen (0,0) — i.e. **the iso plane grows DOWN-RIGHT from the top-left corner of the viewport**. This produces an asymmetric "scrolling world" view rather than the centered Diablo-2 camera feel.

If the user wants centered iso (Diablo-2 canonical), the fix is one of:
1. Set `worldOrigin = (0, 0)` in `main.js` (drops the HUD strip reservation)
2. Replace `world.position.set(-csx, -csy)` with `world.position.set(W/2 - csx, H/2 - csy)` (centers the camera, keeps HUD reservation)

This is a **visual judgment call**, not a spec violation — the smoke test passes and audit invariants hold. Awaiting F2.5.3.4.

---

## Cumulative metrics

| Metric | Value |
|---|---|
| PRs merged to `main` | 3 of 3 (F2.5.1, F2.5.2, F2.5.3) |
| Total commits on `main` since `581d291` | 6 (3 features + 3 merge + 1 docs) |
| Files changed | ~85 (3 modules + 40 PNGs + 1 generator + variants.json + manifest.json + tile-gallery.html + main.js + world.js + index.html + tasks.md + apply-progress.md + screenshots) |
| LOC added (excl. binary) | ~870 (478 + 356 + 62 + a few smoke-test edits) — over 560 budget forecast but within SDD tolerance because PNGs and tool scaffolding add fixed cost; net code-only LOC ≈ 600 |
| Binary size | 40 PNGs ≈ 550 KB post-processed (raw 1280×720 PNGs ~9 MB excluded by .gitignore) |
| Locked modules touched | 0 (rail-camera.js / input.js / player.js / styles/main.css unchanged) |

---

## Engram observations

| topic_key | status |
|---|---|
| `sdd/zarra-defenders-2d/fase-2.5-tile-system/apply-progress` | merged across PR #1 / PR #2 / PR #3 |

---

## Next action

`sdd-verify` is **NOT YET READY** — user visual gates at F2.5.2.8 and F2.5.3.4 must be answered first.

**Blocker for next phase**:
1. User must review `tests/out/tile-gallery-fase-2.5.2.png` and either (a) accept, or (b) call out specific tiles to regenerate (notably `roca_chorrera_humeda`, `plastic_debris_mixed`).
2. User must review `tests/out/iso-world-fase-2.5.3.png` and either (a) accept the current top-left-anchored iso view, or (b) confirm the centering fix is wanted (Diablo-2 canonical).

If both gates pass, F2.5 → `sdd-verify` → `sdd-archive` and tag `v0.2`.