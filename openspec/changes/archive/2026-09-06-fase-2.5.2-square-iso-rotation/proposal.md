# Proposal: F2.5.2 — Square Iso Rotation

**Change**: `fase-2.5.2-square-iso-rotation` (display name: F2.5.2)
**Project**: zarra-defenders-2d · **Base**: main @ 253c4a2 (F2.5.1 archived at `openspec/changes/archive/2026-09-06-fase-2-5-1-tile-regen-and-centering/`)
**Mode**: hybrid · **Strategy**: single-pr · **Review budget**: 5000 LOC
**Status**: ready for sdd-spec / sdd-design

---

## 1. Intent

The F2.5.1 diamond (2:1) tiles ship, but the user has reviewed them and decided the visual is the wrong direction. We pivot to **"square iso falso"** — top-down square textures rotated 45° on screen at the PIXI container level (Habbo / FarmVille-style). The 5 stages × 8 variants = **40 tile identities** stay identical (F2.5.1's `tools/variants.json` reused verbatim); only the tile shape, engine math, and gallery UX change.

Concretely:

- The 40 diamond PNGs are **moved to** `assets/tiles/_discarded/diamond-r2/` (audit-preserving, NOT deleted).
- The engine pivots from `128×64` diamond to `64×64` square (1:1 PNG, `aspect_ratio="1:1"`).
- The gallery (`tests/tile-gallery.html`) is curated: rotation toggle (45° vs top-down), a Sprites section surfacing the 21 `assets/sprites/` PNGs the user said they "cannot see", and a mini-iso-demo canvas running real `IsoWorld` + 4 demo sprites.

---

## 2. Scope

### In scope (6 deliverables)

| # | Capability | Files | Acceptance |
|---|---|---|---|
| 1 | Engine pivot (square iso falso) | `src/iso/iso-math.js` (~3 LOC), `src/iso/world.js` (~1 LOC), `tests/iso-smoke.js` (~2 LOC comment) | `hh = tileSize/2`; `_tileLayer.rotation = Math.PI/4`; round-trip iso↔screen still holds; mock canvas 64×64 |
| 2 | Regenerate 40 square tiles | `tools/generate-iso-tiles.py` (new `--shape` flag), `tools/postprocess_v4.py` (caller `--size 64` then NEAREST 128→64 downsample), 40 new PNGs under `assets/tiles/stage{1-5}-*/` | 40 PNGs are 64×64, corners α=0, center α=255, no magenta fringe |
| 3 | Manifest reconcile | `assets/tiles/manifest.json` | `totals.active === 40` (MODIFIED invariant); 40 new `discarded[]` entries with `regeneratedFrom` provenance |
| 4 | Archive old diamonds | `assets/tiles/_discarded/diamond-r2/` (NEW sibling to existing `_regen_attempt_1/2`, `raw/`) | 40 PNGs moved (not deleted); manifest `archivedPath` references resolve |
| 5 | Gallery overhaul | `tests/tile-gallery.html` rewrite (107 → ~250 LOC) | Rotation toggle (CSS `transform: rotate(45deg)`), Sprites section, mini-iso-demo canvas; 0 `console.error` |
| 6 | Mini-iso-demo canvas | inline in gallery | 480×270 PIXI canvas: `IsoWorld` + `Tilemap('stage1-bosque')` + 4 demo sprites (3 pinos + 1 castillo) on 6×6 plane |

### Out of scope

- Re-touching `src/main.js`, `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css` (locked by `openspec/config.yaml` `rules.apply`).
- Sprite re-authoring (the 21 existing sprites work on the rotated plane; they're vertically-anchored, not tile-bound).
- Camera math changes (F2.5.1's `_viewOrigin` separation makes the pivot trivial).
- Top-down pure (no iso feel) — user explicitly chose "square iso falso" with 45° rotation.
- New automation test runner (project uses Playwright headless + visual review).

---

## 3. Capabilities (contract with sdd-spec)

### Modified capabilities

- **`iso-tile-system`**:
  - **MODIFIED TILE-001**: `hh = tileSize/2` (was `tileSize/4`); round-trip identity scenario stays the same.
  - **MODIFIED TILE-002**: tile PNG is `64×64` square (was `128×64` diamond); on-screen bounding box is `128×128` after `scale` (was `256×128`); cached texture count `=== 40` (was `=== 35`).
  - **MODIFIED TILE-003**: `_tileLayer.rotation = Math.PI/4` applied at container level (texture on disk stays unrotated); zIndex formula and painter's algorithm behavior unchanged.

- **`iso-asset-pipeline`**:
  - **MODIFIED ASSET-001**: prompt template "64×64 px square (1:1), flat magenta #FF00FF background" (was "128×64 px diamond"); corner-pixel scenario validates square corners, not diamond edges.
  - **MODIFIED ASSET-002**: postprocess flow adds final NEAREST downsample 128→64 in `generate-iso-tiles.py run_postprocess` (LANCZOS 128→64 softens pixel art); `tools/postprocess_v4.py` caller passes `--size 64`.
  - **MODIFIED ASSET-007**: invariant becomes `totals.active === 40` (was `active + discarded === 40`); `discarded[]` is now the unbounded audit trail; `regeneratedFrom` provenance semantics unchanged.

### Added requirements (within existing capabilities)

- **`iso-asset-pipeline` ADDED ASSET-009**: regeneration workflow MUST support a `--shape {diamond|square}` flag (default `square`); smoke-test gate MUST regenerate `stage1-bosque/pino_clear_grass_rojizo` first (no negative prompt, baseline terrain) and verify in the gallery's mini-iso-demo before any of the other 39.
- **`iso-asset-pipeline` ADDED ASSET-010**: postprocess pipeline MUST apply a final NEAREST downsample 128×128 → 64×64 after `tools/postprocess_v4.py` to preserve 16-bit pixel-art sharpness.

### New capability

- **`iso-gallery`**: NEW spec covering `tests/tile-gallery.html`'s contract — rotation toggle (45° vs top-down), Sprites section (manifest-driven from `assets/sprites/`), mini-iso-demo canvas (real `IsoWorld` instance with 4 demo sprites), discarded section wrapped in `<details>` collapsed by default.

---

## 4. Tradeoffs considered

- **Square iso falso vs top-down puro** — user picked square-iso-falso to preserve the isometric feel (Habbo / FarmVille look). Top-down puro would drop the iso aesthetic entirely.
- **64×64 vs 32 or 128** — 64×64 is the smallest size that still reads at 1080p with 8× scale on a 1080p viewport (cull window stays ≤ 100 tiles). 32 would be too small; 128 would inflate the cull window past the 100-tile invariant.
- **Container rotation vs texture rotation** — `_tileLayer.rotation = Math.PI/4` (picked) keeps the PNG on disk as top-down (gallery toggle works) and keeps zIndex math stable. Texture rotation would force the gallery to re-rotate at CSS anyway, breaking the "Vista top-down" comparison.
- **Extend `generate-iso-tiles.py` vs new script** — extend with `--shape` flag (picked). Single CLI, manifest schema unchanged. `--shape diamond` keeps F2.5.1 path alive as legacy fallback.
- **Move-to-discarded vs delete** — move (picked). User was explicit: "descartar", not "borrar". ~1.2 MB disk cost for full audit trail.
- **Manifest invariant change vs schema v2** — modify invariant semantically (picked). `totals.active === 40` is honest; `discarded[]` becomes unbounded audit trail. Schema v2 would be over-engineering.

---

## 5. Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/iso/iso-math.js` | Modified | `hh = tileSize/2`; `getTileHalf()` returns both halves = `tileSize/2` |
| `src/iso/world.js` | Modified | `_tileLayer.rotation = Math.PI/4` in constructor |
| `src/iso/tilemap.js` | None | Anchor `(0.5, 0.5)` already correct for square texture |
| `src/main.js` | None | Texture-agnostic loader picks up new PNGs on reload |
| `tools/generate-iso-tiles.py` | Modified | `--shape` flag, prompt template, drop diamond-crop branch, NEAREST downsample after postprocess |
| `tools/postprocess_v4.py` | None | Caller passes `--size 64` |
| `tools/variants.json` | None | 40 variants shape-agnostic |
| `assets/tiles/stage{1-5}-*/<variant>.png` | Replaced | 40 new 64×64 square PNGs |
| `assets/tiles/_discarded/diamond-r2/` | New | 40 archived 128×64 diamond PNGs |
| `assets/tiles/manifest.json` | Modified | 40 active swap + 40 new discarded entries |
| `tests/tile-gallery.html` | Rewritten | Toggle + Sprites section + mini-iso-demo (107→~250 LOC) |
| `tests/iso-smoke.html` + `tests/iso-smoke.js` | Modified | Mock canvas 128×64 → 64×64 |
| `openspec/specs/iso-tile-system/spec.md` | Modified | TILE-001/002/003 |
| `openspec/specs/iso-asset-pipeline/spec.md` | Modified | ASSET-001/002/007 + new ASSET-009/010 |
| `openspec/specs/iso-gallery/spec.md` | New | Gallery contract (rotation toggle, sprites section, mini-iso-demo) |
| `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css` | None | Locked; not touched |

---

## 6. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| minimax 64×64 tiles leave magenta corners that break the 45° rotation illusion | Medium | Smoke-test `stage1-bosque/pino_clear_grass_rojizo` first; `validate` asserts 4 corners α=0 + center α=255; visual check in mini-iso-demo |
| 128×128 → 64×64 LANCZOS downsample softens 16-bit pixel art | Medium | Final NEAREST downsample in `generate-iso-tiles.py run_postprocess` (not LANCZOS) |
| Existing 21 vertical sprites look off on the rotated 45° plane | Low | Sprites are vertically anchored at their own bottom — not tile-bound. F2.5.1 visual screenshots confirm they read fine on the rotated plane |
| Container rotation breaks future `cullArea` if F8 polish enables it | Low | Not enabled today; document in `design.md` that the rotation must be undone before any future `cullArea` is set |
| Gallery's mini-iso-demo fails to load `IsoWorld` due to module import path | Low | Reuse the same import pattern as `src/main.js`; Playwright headless screenshot gate before commit |
| 40 discarded entries bloat `_discarded/` folder and the gallery's discarded section | Low | Wrap discarded section in `<details>` collapsed by default; ~1.2 MB total disk is acceptable |
| 8 variants × 5 stages regenerated in parallel overwhelms minimax rate limits | Low | Generate serially (F2.5.1 already did this successfully); per-tile commits so transport failure doesn't lose previous work |
| User wants a different rotation angle (e.g. 30° instead of 45°) | Low | One-line change in `world.js`; 45° is what user implied ("rotación 45°" / "Habbo-style") |

---

## 7. Rollback Plan

1. **Revert commits** — `git revert` the F2.5.2 merge commit restores the engine + assets + gallery to F2.5.1 state on `main`.
2. **Restore diamond PNGs** — `mv assets/tiles/_discarded/diamond-r2/*.png assets/tiles/stage{1-5}-*/` recovers the original 40 diamond tiles from the archived folder.
3. **Restore manifest** — `_discarded/diamond-r2/` PNGs are referenced by `archivedPath` in the current manifest, so the loader resolves them automatically. If the manifest was overwritten, check the F2.5.1 archive at `openspec/changes/archive/2026-09-06-fase-2-5-1-tile-regen-and-centering/` for the prior baseline.
4. **Spec baseline untouched** — the F2.5.1 `openspec/specs/iso-tile-system/spec.md` and `iso-asset-pipeline/spec.md` live in main specs, not in this change folder. The MODIFIED deltas only apply when this change is archived (merged into main). Pre-archive rollback is automatic.
5. **Cost** — rollback is a single revert + one `mv` per stage (5 commands). No data loss.

---

## 8. Dependencies

- **minimax MCP** — image generation (`minimax_text_to_image`) with `aspect_ratio="1:1"` for 64×64 square tiles (proven in F2.5.1 smoke-test).
- **Playwright** — headless screenshot + `console.error` capture for gallery and mini-iso-demo validation.
- **Python `http.server`** — dev server already bound to `0.0.0.0:8000` via `start_server.sh`; no infra change.
- **Pillow (PIL)** — already a dep of `tools/postprocess_v4.py`; `generate-iso-tiles.py` reuses it for the NEAREST downsample.
- **Pixi.js v7.4.0** — supports `Container.rotation` natively; no version bump.

---

## 9. Success Criteria

- [ ] 40 new tiles regenerated: `64×64` PNG, 4 corners α=0, center α=255, no magenta fringe
- [ ] `src/iso/iso-math.js`: `hh = tileSize/2`; round-trip iso↔screen identity still holds within ±0.001
- [ ] `src/iso/world.js`: `_tileLayer.rotation = Math.PI/4`; visible 45° rotation in game + mini-iso-demo
- [ ] `tests/tile-gallery.html`: Accepted grid renders all 40 new tiles, rotation toggle switches between 45° iso and top-down views, Sprites section shows all 21 `assets/sprites/` PNGs, mini-iso-demo renders `IsoWorld` with 4 demo sprites on a 6×6 plane, 0 `console.error` / 0 `console.warn` in Playwright headless
- [ ] `_discarded/diamond-r2/` contains 40 archived diamond PNGs; manifest `archivedPath` references resolve
- [ ] Manifest `totals.active === 40`; 40 new `discarded[]` entries with `regeneratedFrom.previousVariantId` provenance
- [ ] `tests/iso-smoke.js`: mock canvas 64×64; 8-variant load assertion + cull-cap `live <= 100` still pass
- [ ] No edits to `src/main.js`, `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css` (verified by `git diff --stat` on those paths)
- [ ] Single PR, well under 5000-LOC review budget (~250 LOC of authored code + 40 generated PNGs)

---

## 10. Open questions for `sdd-spec`

The `sdd-explore` phase flagged 7 open questions; 6 have technical defaults already chosen in this proposal:

- **5.A** Container rotation + future `cullArea` — documented in design.md, no spec change.
- **5.B** Manifest invariant — resolved as MODIFIED ASSET-007 (§3 above).
- **5.C** iso-smoke mock canvas — trivial same-commit update.
- **5.D** Smoke-test one tile first — `pino_clear_grass_rojizo` is the new ASSET-009 gate.
- **5.F** Postprocess resample — NEAREST downsample in `generate-iso-tiles.py` (new ASSET-010).
- **5.G** Folder name — `fase-2.5.2-square-iso-rotation/`.

**The one product decision the explore could not resolve alone (§5.E) — please confirm:**

> **Gallery Sprites section: render all 21 `assets/sprites/*.png`, or only the 4 demo sprites (3 pinos + 1 castillo) used in `IsoWorld.spriteLayer`?**

Explore's recommendation: **render all 21** — gives full catalog visibility (matches the "curate the test level" intent), keeps the 4 demo sprites in the mini-iso-demo where they're shown in real iso context. Alternative: render only the 4 demo sprites (smaller page, less noise, but the 17 unused sprites stay invisible to the user).

If not confirmed before `sdd-spec` lands, `sdd-spec` will write the spec for **21 sprites** and `sdd-apply` will note the alternative in `tasks.md` as a fast follow-up.

---

## 11. Next phase

**`sdd-spec`** writes delta specs under `openspec/changes/zarra-defenders-2d/fase-2.5.2-square-iso-rotation/specs/`:

- `iso-tile-system/spec.md` — MODIFIED TILE-001, TILE-002, TILE-003
- `iso-asset-pipeline/spec.md` — MODIFIED ASSET-001, ASSET-002, ASSET-007; ADDED ASSET-009, ASSET-010
- `iso-gallery/spec.md` — NEW (gallery contract)

Then `sdd-design` → `sdd-tasks` → `sdd-apply` → `sdd-verify` → `sdd-archive` to fold the MODIFIED deltas into main specs.
