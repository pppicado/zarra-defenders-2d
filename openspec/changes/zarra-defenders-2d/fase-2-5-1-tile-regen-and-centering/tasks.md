# Tasks: F2.5.1 — Tile Regeneration + Iso Centering

> **Change**: `fase-2-5-1-tile-regen-and-centering` (display name: F2.5.1) · **Project**: `zarra-defenders-2d` · **Base**: `main` @ `8d78885` (F2.5 already merged) · **Mode**: hybrid · **Delivery strategy**: `auto-chain` · **Per-PR budget**: 3000 LOC (user-chosen)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~140 LOC + 7 PNGs + 1 manifest |
| Estimated new files | 1 (`assets/tiles/_discarded/_regen_attempt_2/` dir + 7 PNGs); possibly `tests/tile-gallery.js` |
| Estimated modified files | 3 (`assets/tiles/manifest.json`, `src/iso/world.js`, `tests/tile-gallery.html`); possibly `src/main.js` |
| Estimated new asset files | 7 PNGs |
| Decision needed before apply | No (under 3000-line budget; auto-chain already resolved) |
| Chained PRs recommended | Yes (2 PRs) |
| Suggested split | T0 → F2.5.1.a (assets + manifest) → F2.5.1.b (centering + gallery) |
| Chain strategy | stacked-to-main (each PR merges independently; F2.5.1.b depends on F2.5.1.a only for the manifest-driven gallery to surface regenerated tiles) |
| 400-line budget risk | Low |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units (chained PRs)

| PR | Files | LOC | Autonomous scope | Verification | Rollback boundary |
|----|-------|-----|------------------|--------------|-------------------|
| T0 | `openspec/specs/{iso-asset-pipeline,iso-camera-integration,iso-tile-system}/spec.md` + `README.md` | ~0 (cp) | Mechanical copy of F2.5 specs to baseline; F2.5.1 deltas need a real baseline | `diff -r openspec/changes/zarra-defenders-2d/fase-2.5-tile-system/specs/iso-asset-pipeline/spec.md openspec/specs/iso-asset-pipeline/spec.md` empty | `git rm -r openspec/specs/iso-*` |
| F2.5.1.a | 7 PNGs + `_regen_attempt_2/` evidence + `manifest.json` | 7 binaries + ~50 LOC | Assets + manifest ONLY; no code edits; per-tile commits | Playwright per-tile shape assert (128×64, α<16 corners, α>200 center); gallery 7 orange borders; `totals.active + totals.discarded === 40` | `git checkout 8d78885 -- assets/tiles/ && git rm -r assets/tiles/_discarded/_regen_attempt_2/` |
| F2.5.1.b | `src/iso/world.js` (~5 LOC) + `src/main.js` (0–3 LOC) + `tests/tile-gallery.html` (~80 LOC) | ~85 LOC | Centering + gallery rewrite; ortho to F2.5.1.a code-wise | `tests/out/iso-centered.png` at viewport center; HUD crosshair tracks mouse at 3 positions; gallery 0 console errors; `git diff 8d78885 -- src/{rail-camera,input,player}.js` empty | `git revert <commit>` |

---

## Phase T0 — Spec promotion (mechanical pre-PR)

- [ ] **T0.1** — Promote F2.5 specs to `openspec/specs/` baseline
  - **Files**: copy `openspec/changes/zarra-defenders-2d/fase-2.5-tile-system/specs/{iso-asset-pipeline,iso-camera-integration,iso-tile-system}/spec.md` + `README.md` → `openspec/specs/iso-{asset-pipeline,camera-integration,tile-system}/spec.md` and `README.md`
  - **LOC**: +0 (mechanical copy) · **Depends**: none
  - **Verify**: `diff -r openspec/changes/zarra-defenders-2d/fase-2.5-tile-system/specs/ openspec/specs/` returns empty
  - **Deliverable**: 1 commit `chore(specs): promote F2.5 tile-system specs to baseline` — required so F2.5.1 deltas (ASSET-006/007/008, CAM-002) operate against a real baseline.

---

## Phase F2.5.1.a — Asset regeneration (per-tile, smoke-test gated)

Tasks F2.5.1.a.1–a.7 are **per-tile regen tasks**. They MUST run sequentially (one tile at a time, commit per tile) — never batch.

- [ ] **F2.5.1.a.0** — Smoke-test the strategy with 1 tile
  - **Files**: `assets/tiles/stage1-bosque/pino_underbrush_dark.png` (overwrite if PASS, restore if FAIL) · **Depends**: T0.1
  - **Verify**: regen tile is 128×64, α<16 at 4 corners, α>200 at center pixel. If FAIL, **halt** — the other 6 tiles MUST NOT be attempted; surface raw output to user.
  - **Deliverable**: smoke-test PASS or HALT. On halt, no further tile commits. **Highest-leverage gate** of F2.5.1.a — if the 1:1 + verbatim magenta phrase doesn't work, NOTHING else can proceed.

- [x] **F2.5.1.a.1** — Regenerate `stage1-bosque/pino_underbrush_dark`
  - **Files**: `assets/tiles/stage1-bosque/pino_underbrush_dark.png` (overwrite); `assets/tiles/_discarded/_regen_attempt_2/stage1-bosque_pino_underbrush_dark_v3.png` (evidence); `assets/tiles/manifest.json` (1 entry → `discarded[]`, 1 new → `active[]`) · **Depends**: F2.5.1.a.0 PASS
  - **Verify**: Playwright: 128×64, α<16 corners, α>200 center. Manifest: `totals.active + totals.discarded === 40`; new active has `regeneratedFrom.previousVariantId`.
  - **Deliverable**: 1 commit `chore(tiles): regenerate stage1-bosque/pino_underbrush_dark via 1:1 strategy`.

- [x] **F2.5.1.a.2** — Regenerate `stage3-rio/roca_chorrera_humeda`
  - **Files**: same shape as F2.5.1.a.1 · **Depends**: F2.5.1.a.1 commit landed · **Deliverable**: `chore(tiles): regenerate stage3-rio/roca_chorrera_humeda via 1:1 strategy`.

- [x] **F2.5.1.a.3** — Regenerate `stage4-vertedero/cement_pad_crack`
  - **Files**: same shape · **Depends**: F2.5.1.a.2 · **Deliverable**: `chore(tiles): regenerate stage4-vertedero/cement_pad_crack via 1:1 strategy`.

- [x] **F2.5.1.a.4** — Regenerate `stage4-vertedero/plastic_debris_mixed` (higher risk)
  - **Files**: same shape; FIRST strengthen `tools/variants.json` `negative_prompt` with "ONLY concrete/grey-brown, no living plants at all" (mitigates prior green-vegetation model bias)
  - **Depends**: F2.5.1.a.3 · **Verify**: shape + 0 green-vegetation pixels (`#00FF00` count = 0) + 0 blue-sky pixels (`#0000FF` count = 0) (ASSET-005 inherited).
  - **Deliverable**: `chore(tiles): regenerate stage4-vertedero/plastic_debris_mixed via 1:1 strategy (anti-glorification)` — bundled with the `variants.json` negative_prompt tightening commit.

- [x] **F2.5.1.a.5** — Regenerate `stage4-vertedero/weeds_through_pavement`
  - **Files**: same shape · **Depends**: F2.5.1.a.4 · **Verify**: same anti-glorification checks as F2.5.1.a.4.
  - **Deliverable**: `chore(tiles): regenerate stage4-vertedero/weeds_through_pavement via 1:1 strategy (anti-glorification)`.

- [x] **F2.5.1.a.6** — Regenerate `stage5-castillo/pino_penon_mediterraneo`
  - **Files**: same shape · **Depends**: F2.5.1.a.5 · **Deliverable**: `chore(tiles): regenerate stage5-castillo/pino_penon_mediterraneo via 1:1 strategy`.

- [x] **F2.5.1.a.7** — Regenerate `stage5-castillo/sendero_subida_penon`
  - **Files**: same shape · **Depends**: F2.5.1.a.6 · **Deliverable**: `chore(tiles): regenerate stage5-castillo/sendero_subida_penon via 1:1 strategy`.

- [x] **F2.5.1.a.8** — Manifest invariants check + commit
  - **Files**: `assets/tiles/manifest.json` (final state) · **Depends**: F2.5.1.a.7
  - **Verify**: `python3 -c "import json; m=json.load(open('assets/tiles/manifest.json')); assert m['totals']['active']+m['totals']['discarded']==40"` passes; exactly 7 active entries have `regeneratedFrom.regeneratedAt`.
  - **Deliverable**: 1 commit `chore(manifest): reconcile after F2.5.1 regen — 7 entries tagged regeneratedFrom`.

---

## Phase F2.5.1.b — Centering + Gallery

- [ ] **F2.5.1.b.1** — Apply centering fix in `src/iso/world.js`
  - **Files**: `src/iso/world.js` (modify, +5 LOC) · **Depends**: F2.5.1.a.8 (ortho code-wise; only needs a.8 if gallery must surface regenerated tiles, which F2.5.1.b.3 handles)
  - **Verify**: diff is exactly the `viewOrigin` field + the `position.set` line; `git diff 8d78885 -- src/{rail-camera,input,player}.js` empty.
  - **Deliverable**: 1 commit `feat(iso): center iso world at viewport (viewOrigin split from tileWorldOrigin)`.

- [ ] **F2.5.1.b.2** — Possibly adjust `src/main.js` (only if needed)
  - **Files**: `src/main.js` (modify, 0–3 LOC) · **Depends**: F2.5.1.b.1
  - **Verify**: F2.5 integration (commit `432dac9`) already uses `world.position.set(-camScreenX, -camScreenY)`. If F2.5.1.b.1 moves this into `IsoWorld.update()`, `src/main.js` may already simplify to just `isoWorld.update(camera)` (already present) — no further change. Edit only if necessary.
  - **Deliverable**: only commit if change needed; otherwise note "no main.js change required — centering already in IsoWorld.update()" in PR description.

- [ ] **F2.5.1.b.3** — Rewrite `tests/tile-gallery.html` as manifest-driven
  - **Files**: `tests/tile-gallery.html` (rewrite, ~80 LOC); `tests/tile-gallery.js` (new, +0–20 LOC for fetch + render) · **Depends**: F2.5.1.a.8 (so manifest has the 7 regenerated entries to surface)
  - **Verify**: Playwright at `/tests/tile-gallery.html`: `console.error = 0`, `console.warn = 0`; Accepted grid = 40 tiles; 7 with orange border; Discarded grid renders placeholder when empty.
  - **Deliverable**: 1 commit `test(gallery): rewrite tile-gallery as manifest-driven with accepted + discarded sections`.

- [ ] **F2.5.1.b.4** — Final visual verification
  - **Files**: none (verify-only) · **Depends**: F2.5.1.b.1, b.2, b.3
  - **Verify**: Playwright at `http://localhost:8000/` captures `tests/out/iso-centered.png` with camera at iso `(5, 5)` — 10×10 grass plane framed at viewport center, not HUD strip. Mouse moves to 3 positions; crosshair tracks each (HUD invariant). `git diff 8d78885 -- src/{rail-camera,input,player}.js` empty.
  - **Deliverable**: 1 commit `docs(sdd): F2.5.1.b complete — centering + gallery verified` (records verification artifacts).

---

## Verify phase preview (`sdd-verify`)

- `console.error = 0`, `console.warn = 0` in Playwright across 60 fps × 30 s demo run.
- All 7 regen PNGs: 128×64, α<16 at 4 corners, α>200 at center pixel (ASSET-006).
- `totals.active + totals.discarded === 40` (ASSET-007).
- Gallery: 40 tiles in Accepted grid, 7 with orange border, 0 console errors (ASSET-008).
- `tests/out/iso-centered.png` shows iso world at viewport center (CAM-002).
- HUD crosshair tracks mouse in screen-space across 3 positions (CAM-002 invariant).
- `git diff 8d78885 -- src/{rail-camera,input,player}.js` empty (CAM-001 contract).
- Stage 4 anti-glorification: regen tiles in `stage4-vertedero/` show NO green vegetation, NO blue sky pixels (ASSET-005 inherited).

## Archive phase preview (`sdd-archive`) — DOUBLE-PROMOTION WARNING

F2.5.1 archive MUST handle a **double-promotion** because F2.5 was never archived (`openspec/specs/` is empty as of `8d78885`):

- **Path A** (preferred): run `sdd-archive fase-2.5-tile-system` FIRST (promotes F2.5 specs to baseline + moves F2.5 folder to `archive/2026-09-05-fase-2.5-tile-system/`), THEN `sdd-archive fase-2.5.1-tile-regen-and-centering` normally. Requires user to acknowledge F2.5's incomplete archive state.
- **Path B** (fallback): archive F2.5.1 by treating the F2.5 change-folder specs as the de facto baseline — copy F2.5 specs to `openspec/specs/`, then apply F2.5.1 deltas in one archive step. Riskier audit trail (skips the formal F2.5 archive event).

Either way, **the user MUST confirm the archive strategy before `sdd-archive` runs**. Engram observations tagged `sdd/zarra-defenders-2d/fase-2.5.1-tile-regen-and-centering/*` retained as audit trail. Tag `v0.3` cut from main after F2.5.1.b merge (only if user opts in — not default).