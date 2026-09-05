# Design: F2.5.1 — Tile Regeneration + Iso Centering

> **Change**: `fase-2-5-1-tile-regen-and-centering` (display name: F2.5.1) · **Project**: `zarra-defenders-2d` · **Base**: `main` @ `8d78885` (F2.5 merged) · **Mode**: hybrid · **Strategy**: `auto-chain` · **Delta**: corrective patch on F2.5 baseline.
> Specs: `CAM-002` MODIFIED · `ASSET-006/007/008` ADDED. ADRs #1–#5 inherited.

## 1. Architecture (delta-only)

F2.5.1 adds one world transform (centering) and tightens the asset pipeline (smoke-test gate + manifest sync). Container topology unchanged.

```
app.stage
├── world (position (0,0)) → isoWorld.container (NEW position formula)
│     ├── tiles (≤100)
│     └── verticalSprites (≤30)
├── hud (sibling, (0,0) — CAM-002 invariant)
└── ui  (sibling, (0,0))
```

`IsoWorld` gains one local concept: `viewOrigin = {x: W/2, y: H/2}`, distinct from `tileWorldOrigin = {x: W/2, y: H*0.30}`. The split isolates the world-container anchor (CAM-002) from the iso↔screen math origin (TILE-001) — memory #125 recommends this split.

## 2. Math — the centering fix

```
viewOrigin        = { x: W/2,     y: H/2 }                    // NEW (viewport center)
tileWorldOrigin   = { x: W/2,     y: H*0.30 }                 // F2.5, HUD strip — UNCHANGED
csx               = tileWorldOrigin.x + (camIsoX − camIsoY)·(tileSize/2)
csy               = tileWorldOrigin.y + (camIsoX + camIsoY)·(tileSize/4)
world.position.set(viewOrigin.x − csx, viewOrigin.y − csy)   // F2.5 line 84 → NEW
```

**Why it fixes the anchor.** Old `position.set(-csx, -csy)` placed iso `(0,0)` at the HUD strip. With the offset, iso `(camIsoX, camIsoY)` projects to `world.position + isoToScreen(cam) = viewOrigin` exactly. TILE-001 round-trip preserved (`screenToIso` still uses `tileWorldOrigin`).

**Verified** at W=1920, H=1080, tileSize=128: cam `(0,0)` and cam `(5,5)` both project their respective iso point to `(960, 540)` ✓ viewport center.

## 3. Z-order & culling — unchanged

F2.5 §3 (`zIndex = (gx+gy)*1000 + offset`, `sortableChildren = false`) and F2.5 §4 (`cullAndRender`, ≤100 tiles) apply verbatim. No `Tilemap` / `Z_BANDS` edits.

## 4. Container anchor — corrected

| Anchor | Old (F2.5) | New (F2.5.1) |
|---|---|---|
| iso↔screen math origin | `tileWorldOrigin` | `tileWorldOrigin` (unchanged) |
| World container offset | `(−csx, −csy)` | `(viewOrigin.x − csx, viewOrigin.y − csy)` |
| Camera-projected iso lands at | HUD strip `y = H*0.30` | Viewport center `viewOrigin` |

Only `isoWorld.container.position` moves. `world`, `hud`, `ui` untouched.

## 5. Asset regeneration pipeline

```
sdd-apply launches regen task
  ↓
--regenerate --stage stage1-bosque --variants pino_underbrush_dark
  ↓
minimax_generate_image(aspect_ratio=1:1, prompt with verbatim magenta phrase)
  ↓
subprocess tools/postprocess_v4.py → cropped 128×64
  ↓
[ASSET-006 gate] Playwright: 128×64 + α<16 at 4 corners + center α>200
  ├── PASS → git commit single tile → --mark-regenerated → next
  └── FAIL → move to _discarded/_regen_attempt_2/, halt, surface to user
  ↓
repeat for stage3-rio/roca_chorrera_humeda, stage4-vertedero/{cement_pad_crack, plastic_debris_mixed, weeds_through_pavement}, stage5-castillo/{pino_penon_mediterraneo, sendero_subida_penon}
```

**No new tool code**: `--regenerate` / `--mark-regenerated` already exist; per-variant negative prompts already in `tools/variants.json`. Per-tile commits (`chore(tiles): regenerate {stage}/{variant} via 1:1 strategy`) — never batch.

## 6. Tile gallery — manifest-driven

`tests/tile-gallery.html` rewritten (~80 LOC). Page-load sequence: `fetch('../assets/tiles/manifest.json')` → split into `accepted` (`active[]`) and `discarded` (`discarded[]`) → render Accepted grid (4×N `<figure>`s, orange border when `regeneratedFrom.regeneratedAt` exists) + Discarded grid (placeholder if empty). Plain ES + DOM. Playwright asserts `console.error = 0`, `console.warn = 0` (ASSET-008). Legacy `tests/f2.5.4-preview.html` stays untouched.

## 7. Threat matrix

**N/A** — no routing, shell, runtime subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary changes. The only subprocess invocation is the existing `tools/postprocess_v4.py` call inside `--postprocess`, unchanged from F2.5 §10. Minimax MCP call pattern identical to F2.5 §7.

## 8. Migration / PR split

**T0 prerequisite (mechanical pre-PR):** `cp openspec/changes/zarra-defenders-2d/fase-2.5-tile-system/specs/*/spec.md openspec/specs/iso-*/`; commit `chore(specs): promote F2.5 tile-system specs to baseline`.

**F2.5.1.a — assets + manifest** (~50 LOC + 7 binaries). 7 PNGs overwritten; `_discarded/_regen_attempt_2/` evidence; `manifest.json` regenerated timestamps + `previousVariantId` schema migration. Verify: per-tile Playwright shape; gallery shows 7 orange borders; `totals.active + totals.discarded === 40`. Rollback: `git checkout 8d78885 -- assets/tiles/ && git rm -r assets/tiles/_discarded/_regen_attempt_2/`.

**F2.5.1.b — code + gallery** (~85 LOC). `src/iso/world.js` (~5 LOC: `viewOrigin` in `update()`); `src/main.js` (0 LOC); `tests/tile-gallery.html` rewrite (~80 LOC). Verify: `tests/out/iso-centered.png` at viewport center; HUD crosshair tracks mouse at 3 positions; `git diff 8d78885 -- src/{rail-camera,input,player}.js` empty. Rollback: `git revert <commit>`.

**Chain**: stacked-to-main. 400-line budget risk: **Low** (~140 LOC + 7 PNGs).

## 9. ADRs (F2.5.1 additions)

| # | Decision | Rationale |
|---|---|---|
| 6 | `viewOrigin` separate from `tileWorldOrigin` | World container anchor (viewport center) differs from iso↔screen math origin (HUD strip). Splitting keeps TILE-001 round-trip intact (memory #125, option (a)). |
| 7 | Smoke-test gate before batch regen | minimax MCP aspect_ratio rejection caused the previous `sdd_task_result_empty` partial failure (commit 99ae457). Smoke-testing 1 low-risk tile catches strategy failures early; per-tile commits keep blast radius to 1 PNG. |
| 8 | Manifest-driven gallery | Current `tests/tile-gallery.html` hardcodes 5×8 variant lists that drift from `manifest.json`. A manifest-driven gallery survives tile count changes and surfaces regenerated + discarded tiles (ASSET-008). |
| 9 | Reuse F2.5 prompt template verbatim | `PROMPT_TEMPLATE` already contains `"flat magenta #FF00FF background"` (post-revert restored). More prompt changes risk new regressions; smoke-test gate validates end-to-end. |

## 10. Verification

| Layer | What | Approach |
|---|---|---|
| Asset | 7 regen tiles 128×64, 4-corner α<16, center α>200 | Playwright per-tile (ASSET-006) |
| Asset | Gallery 0 console errors, 7 orange borders | Playwright (ASSET-008) |
| Asset | `totals.active + totals.discarded === 40` | JSON parse (ASSET-007) |
| Camera | `tests/out/iso-centered.png` at viewport center | Playwright at iso `(5,5)` (CAM-002) |
| Camera | HUD crosshair tracks mouse at 3 positions (screen-space) | Playwright mouse moves (CAM-002 invariant) |
| Camera | `git diff 8d78885 -- src/{rail-camera,input,player}.js` empty | shell (CAM-001) |

## 11. Open questions (carry to sdd-tasks)

- Smoke-test variant hardcoded or config-driven? Default: hardcoded `pino_underbrush_dark`.
- Gallery render `_discarded/_regen_attempt_2/` PNGs? Default: no — only manifest-tracked.
- Schema migration: existing 7 active entries carry `originalDiscardedAt / originalDiscardReason / regeneratedAt`. Migrate to spec's `previousVariantId` form? Default: yes, fold into F2.5.1.a.

## Next phase

`sdd-tasks` — T0 (spec promotion), F2.5.1.a (per-tile sub-tasks × 7), F2.5.1.b; 400-line budget forecast per `sdd-phase-common.md` §E.