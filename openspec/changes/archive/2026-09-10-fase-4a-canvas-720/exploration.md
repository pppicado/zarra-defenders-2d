# Exploration: fase-4a-canvas-720

> Phase A of a 4-phase plan. Single goal: change `LOGICAL_H` in `src/main.js` from **1080 → 720** so the iso corridor renders shorter on the vertical axis. Logical canvas stays 16:9 (now 1920×720 = 8:3). All hardcoded `1080` and stale "1920×1080" references must be cleaned up; everything inside the buffer auto-resizes through the existing `applyCssScale` + `computeWorldOrigin` plumbing.

---

## Current State

The game uses a **fixed logical canvas** (1920×1080) that the browser scales to fit any viewport via a CSS `transform: scale()`. The current state of the relevant subsystems:

### Entry point (`src/main.js`)
- **`LOGICAL_W = 1920`** at line 47 (stays).
- **`LOGICAL_H = 1080`** at line 57 (the single line we must change to **720**).
- Two `PIXI.Application` instances (world + HUD) both sized to `LOGICAL_W × LOGICAL_H` (lines 137-156).
- `applyCssScale([worldWrapper, hudWrapper], LOGICAL_W, LOGICAL_H)` (line 160) is the only consumer that matters — it computes `scale = min(vw/logicalW, vh/logicalH)` and re-applies on resize. **Already correct for any `LOGICAL_H`**; no edit needed beyond the constant itself.
- `setViewportSize` on `__zarraModules__` (line 425) recomputes `isoWorld._viewOrigin` and `isoWorld.tileWorldOrigin` from a runtime `w, h`. The literal `0.30` here is the only HUD-strip bias magic number.

### Iso math (`src/iso/iso-math.js`)
- **`computeWorldOrigin(W, H)`** at line 128-133 returns `{ x: round(W/2), y: round(H * 0.30) }`. With `H=720` this gives `y = 216` (was `324`). All downstream consumers recompute for free — no change needed.
- **`computeTileSize(W, H)`** at line 114-119 returns `round(min(W,H)/16)`. **Unused in production** — `TILE_SIZE = 128` is hardcoded in `main.js:56` and passed into both `IsoWorld` and `Tilemap`. The function is only exercised by `tests/iso-smoke.js` with arbitrary inputs (1280×720).
- `isoToScreen` / `screenToIso` / `ISO_STEP` / `escapeFrontDepth` — all viewport-agnostic, work for any `H`.

### Iso world (`src/iso/world.js`)
- All viewport-derived fields (`viewportWidth`, `viewportHeight`, `tileWorldOrigin`, `_viewOrigin`) take `opts.viewportWidth` / `opts.viewportHeight` and propagate them. Pass-through works for any `H`.
- Stale comment at line 155: "logical 1920x1080 space". Cosmetic only.

### Combat (`src/combat.js`)
- **Line 143** has a **pre-existing magic-number drift**: `this.viewportSize = opts.viewportSize ?? { x: 1280, y: 720 }`. The fallback is wrong (should reference `LOGICAL_W` / `LOGICAL_H`), but it's only triggered when no `viewportSize` is passed. The production caller (`main.js:400`) always passes `{ x: LOGICAL_W, y: LOGICAL_H }`, so the fallback is dead code in production — but it is invoked by unit tests that construct `new Combat({...})` without `viewportSize`. Worth cleaning up while we're here.

### HUD (`src/ui/hud.js`)
- Hearts anchor: `viewportHeight - HEART_SIZE - HEART_MARGIN` (line 189). With H=720: `720 - 96 - 32 = 592` (was 952). Auto-recalculates.
- Hand anchor: `viewportHeight + HAND_BOTTOM_OFFSET.y` (line 198) with `HAND_BOTTOM_OFFSET.y = -48`. With H=720: `672` (was 1032). Auto-recalculates.
- Stale comments at lines 24-25, 32: "logical 1920x1080 space". Cosmetic only.

### Input (`src/input.js`)
- `_toLogical()` (line 147-154) reads `window.__cssScale__` and applies inverse transform. **Already viewport-agnostic**; no edit needed.
- Stale comment at line 144: "logical 1920x1080 space". Cosmetic only.

### CSS (`styles/main.css`)
- **Line 40** has a stale comment: "The container is just the positioning root; the wrapper inside is sized to 1920x1080 by JS and then CSS-transform-scaled to fit the viewport." Cosmetic only. No CSS rules reference 1080 or 1920 numerically.

### `index.html`
- No references to 1080 or 1920. Untouched.

### Playwright tests (`tests/e2e/*.spec.mjs`)
- All three use **`viewport: { width: 1280, height: 720 }`** (browser window, NOT the logical canvas). The CSS `transform: scale()` adapts the logical buffer to this viewport. **No change needed.** This is independent of `LOGICAL_H`.
- `tests/e2e/projectile-direction.spec.mjs:19` — comment with worked example: "With tileWorldOrigin.y = round(1080*0.30) = 324, hand.y = 1080 - 48 = 1032, viewOrigin.y = 540, step = 128/√2 ≈ 90.5097". **Must update** these worked-example numbers AND the local `const LOGICAL_H = 1080` (line 40) and `HAND_SCREEN = { y: LOGICAL_H + (-48) }` (line 43).
- `tests/e2e/hit-detection.spec.mjs` — uses `iso (5,5)` etc. but does NOT reference LOGICAL_H. No change.
- `tests/e2e/smoke.spec.mjs` — uses `iso (5,5)` etc. but does NOT reference LOGICAL_H. No change.

### `tests/iso-smoke.js` (line 17)
- Local `const W = 1280, H = 720` for **pure-math round-trip testing** with arbitrary viewports. **NOT the logical canvas size.** This is fine and should not change — the test just exercises the transform with any reasonable viewport.

### `src/test-api.js` (line 103)
- `simulateTap` has `const vc = ctx.viewportCenter ?? { x: 640, y: 360 }`. The 360 was presumably hardcoded to 1280×720/2. When LOGICAL_H drops from 1080→720, `y: 360` is now actually correct for `LOGICAL_H/2` (was wrong before for 1080). But it remains a magic number that drifts if LOGICAL_H ever changes again. Should be cleaned up to reference `LOGICAL_H/2` or accept the new default.

### `tests/catalog.html` (lines 58, 75, 91, 108, 124)
- The five screenshot captions read "1280×720 · camera iso (0, 0)" etc. — these describe the **Playwright browser viewport** (1280×720), NOT the logical canvas. The browser viewport will not change. **No update needed** unless we want to refresh the screenshots after the resize, which is verification work — not exploration.

### OpenSpec specs (`openspec/specs/*`)
Only **4 specs exist in main** (not the 13 the orchestrator listed — that list includes F3-archived domains that have not yet been archived/merged into `openspec/specs/`):

1. `iso-asset-pipeline/` — does not mention 1080. Unaffected.
2. `iso-gallery/` — does not mention 1080. Unaffected.
3. `iso-tile-system/spec.md` — **3 GIVEN clauses name `1920×1080`** (lines 24, 87, 134). Lines 18 and 128 also reference "1080p". The spec content is about round-trip math which works for any viewport, but the GIVEN numbers are now stale. **Needs MODIFIED for TILE-001 and TILE-004** (the two requirements with stale scenarios).
4. `iso-camera-integration/spec.md` — **2 GIVEN clauses name `W=1920, H=1080`** (lines 38, 59). **Needs MODIFIED for CAM-002** (the only requirement with stale scenarios).

### `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/design.md`
Line 512 documents the design risk: "Test fixture too crowded at small viewports — Document minimum 1024×576; add `#viewport-warning` overlay if `innerWidth < 800 OR innerHeight < 500`". With H=720, the visible iso corridor shrinks from ~12 tiles to ~8 tiles vertically (at TILE_SIZE=128). The Playwright viewport at 1280×720 should still fit the fixture.

### Locked files (per `rules.apply`)
- `src/main.js` — **must edit** `LOGICAL_H` at line 57. This is the only "locked" file the change must touch. **Flag this to the user as the one required exception.**
- `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css` — **NOT edited** by the implementation plan. `styles/main.css:40` comment is cosmetic and skipping it is acceptable; it lives inside a locked file.

---

## Affected Areas

### Must edit (code)
| Path | Line(s) | Why |
|---|---|---|
| `src/main.js` | 57 | `const LOGICAL_H = 1080` → `720` — the single line that drives the change. **Locked file: requires explicit user approval.** |
| `src/main.js` | 51 | Comment "128-px tile yields ~15 tiles wide × ~8 tiles tall" → recompute for H=720 (now ~15 tiles wide × ~5.6 tiles tall, or "≈ 6 tiles tall"). |
| `src/main.js` | 45, 61, 92, 132, 158, 173, 267 | Stale "1920x1080" comments. 7 occurrences. |
| `src/combat.js` | 143 | Magic-number fallback `{ x: 1280, y: 720 }` → `{ x: LOGICAL_W, y: LOGICAL_H }`. Pre-existing drift, unrelated to canvas size, but cleaner now while we're here. (Requires importing `LOGICAL_W`/`LOGICAL_H` from main.js OR passing them in.) |
| `src/test-api.js` | 103 | Magic-number fallback `vc ?? { x: 640, y: 360 }` → reference `LOGICAL_W/2, LOGICAL_H/2` for `ctx.viewportCenter`. Same drift class as `combat.js`. |

### Must edit (tests)
| Path | Line(s) | Why |
|---|---|---|
| `tests/e2e/projectile-direction.spec.mjs` | 19 | Worked-example comment uses `round(1080*0.30) = 324`, `hand.y = 1080 - 48 = 1032`, `viewOrigin.y = 540`. Recompute for 720. |
| `tests/e2e/projectile-direction.spec.mjs` | 40 | `const LOGICAL_H = 1080` → `720`. |
| `tests/e2e/projectile-direction.spec.mjs` | 144 | Comment "viewport center where the iso projection lands" — verify post-edit, may need minor update for new aspect ratio. |

### Cosmetic edits (comments only — optional)
| Path | Line(s) | Why |
|---|---|---|
| `src/iso/world.js` | 155 | "logical 1920x1080 space". Cosmetic. |
| `src/input.js` | 144 | "logical 1920x1080 space". **Locked file: skip if policy strict.** Cosmetic. |
| `src/ui/hud.js` | 24, 25, 32 | "logical 1920x1080 space". 3 occurrences. Cosmetic. |
| `styles/main.css` | 40 | "sized to 1920x1080 by JS". **Locked file: skip if policy strict.** Cosmetic. |

### Auto-recalculated (verify nothing breaks, no edit needed)
| Path | Lines | What changes |
|---|---|---|
| `src/iso/world.js` | 22-29 | `_viewOrigin = { 960, 360 }` (was `{ 960, 540 }`); `tileWorldOrigin = { 960, 216 }` (was `{ 960, 324 }`). Passed in from main.js. |
| `src/ui/hud.js` | 189 | Hearts anchor: `y = 592` (was `952`). |
| `src/ui/hud.js` | 198 | Hand anchor: `y = 672` (was `1032`). |
| `src/main.js` | 425 | `setViewportSize` setter — math auto-recalculates. |
| Combat projectiles, IsoWorld culling, tilemap culling — all work for any H. |

### Not touched (browser viewport, independent of LOGICAL_H)
- `tests/e2e/*.spec.mjs` Playwright `viewport: { width: 1280, height: 720 }`. Browser window size ≠ logical canvas size. The CSS scale adapts. No edit.
- `tests/iso-smoke.js` local `W = 1280, H = 720` — pure-math test with arbitrary viewport. No edit.
- `tests/catalog.html` screenshot captions "1280×720" — describe the Playwright browser viewport, not the logical canvas. No edit (verify with new screenshots after apply).

### Specs to MODIFY in the spec phase
| Domain | Requirement | Reason |
|---|---|---|
| `iso-tile-system` | TILE-001 scenarios (line 24, 134) | GIVEN viewport `1920×1080` → `1920×720`. Math works for any viewport; the number is just illustrative. |
| `iso-tile-system` | TILE-004 scenario (line 87) | Same. |
| `iso-tile-system` | TILE-001 requirement text (lines 18, 128) | "yielding ≥ 64 px on 1080p" — leave the math requirement but mention "on 720p" or "on the target viewport". TBD with the spec author. |
| `iso-camera-integration` | CAM-002 scenarios (line 38, 59) | GIVEN viewport `W=1920, H=1080` → `H=720`. Derived `viewOrigin = { 960, 540 }` → `{ 960, 360 }`. |

### No NEW spec required
The canvas-viewport semantics fold naturally into `iso-camera-integration` (CAM-002 already owns the world-container anchor math). A new `canvas-viewport` capability would be over-engineering for a single-constant change.

---

## Approaches

### Approach A — Minimal diff (recommended)
- Change `LOGICAL_H = 1080` → `720` in `src/main.js`.
- Update stale comments in main.js, hud.js, world.js, input.js, styles/main.css.
- Clean up the two magic-number fallbacks in `combat.js:143` and `test-api.js:103` to reference the new constants.
- Update `tests/e2e/projectile-direction.spec.mjs` for the new viewport.
- MODIFY the 3 spec scenarios in `iso-tile-system` and 2 in `iso-camera-integration`.

| Pros | Cons |
|---|---|
| Smallest blast radius (~15 lines touched across 8 files) | Requires editing `src/main.js` (a locked file) — user approval needed |
| Reuses the existing `applyCssScale` plumbing (zero risk of letterbox regressions) | Visual test level looks "wider/shorter" — may surprise the user |
| Follows the existing pattern (every consumer recomputes from the same constant) | Doesn't address the underlying TILE_SIZE coverage trade-off |
| Effort: **Low** | |

### Approach B — Introduce `CANVAS_SIZE` constant module
Create `src/canvas.js` exporting `LOGICAL_W`, `LOGICAL_H`, `TILE_SIZE` as a single source of truth. Update all consumers to import from there instead of having them in `main.js`.

| Pros | Cons |
|---|---|
| Single source of truth — future canvas changes are one file | Heavier refactor for a one-line value change |
| Eliminates the magic-number fallbacks (`combat.js:143`, `test-api.js:103`) | Requires editing more locked files (`combat.js`, `test-api.js`) |
| Effort: **Medium** | Sets a precedent that may or may not fit the project's tiny-no-build style |

### Approach C — Also reduce TILE_SIZE for visual coverage
Change `TILE_SIZE = 128` → `96` (or 112) in the same change to keep the visible iso corridor at ~8-9 tiles vertically.

| Pros | Cons |
|---|---|
| Maintains the look-and-feel of the test level | **Out of scope** per the launch prompt (Phase A is canvas only) |
| Smoother visual transition between phases | Tilemap sprites may need re-tiling; tiled assets are 64×64 px on disk, scaled — could re-introduce F2.5.5 tessellation bugs |
| Effort: **Medium** | Belongs in Phase B per the user's plan |

---

## Recommendation

**Approach A — minimal diff.** The change is literally one numeric constant; the entire codebase is already wired to react to `LOGICAL_H` automatically. Approaching it any other way would obscure the simplicity.

Three additional commitments:

1. **Clean up `combat.js:143` magic-number fallback** while we're here (it's a pre-existing drift unrelated to canvas size, but the file is already in scope).
2. **Clean up `test-api.js:103` magic-number fallback** (same drift class).
3. **Flag the `src/main.js` edit as the one required exception to the `rules.apply` lock.** The launch prompt already notes this; carry it forward to the proposal/spec/tasks phases so the user sees the explicit approval gate once, not four times.

### Open question to surface to the user (REQUIRED before proposal)

> **With `LOGICAL_H = 720` and `TILE_SIZE = 128` kept, the iso corridor shows ~5.6 tiles vertically (was ~8 at 1080p). The visible test-level will look "wider/shorter". Do you accept this for Phase A and defer any tile-size reduction to Phase B, OR do you want Phase A to also adjust TILE_SIZE (e.g., 128 → 96) to preserve vertical coverage?**

This must be resolved **before** `sdd-propose` runs, because the answer determines:
- Whether `TILE_SIZE` is in scope of the change (affects proposal, design, tasks)
- Whether `openspec/specs/iso-tile-system/spec.md` TILE-005 / TILE-002 scenarios need updating too
- The visual regression risk profile

---

## Risks

### R1 — Locked file exception (process risk)
**`src/main.js` is locked under `rules.apply`.** The change requires editing `LOGICAL_H` at line 57. The launch prompt acknowledges this; carry the explicit user approval forward. Mitigation: include the approval request verbatim in `proposal.md` and `tasks.md`; do not let it slip through silently.

### R2 — Visual coverage trade-off (UX risk)
With `LOGICAL_H = 720` and `TILE_SIZE = 128`, the iso corridor shows **~5.6 tiles vertically** (was ~8 at 1080p). The test level will look "wider/shorter" than the F3 screenshots. The hand+pen HUD strip at the bottom may visually compete with enemy spawns at the south edge. The user already saw this question framed in the launch prompt — see **Open question** above.

### R3 — Portrait mobile experience (UX risk)
`1920×720` is 8:3 (very wide). The mobile portrait-modal logic (`setupOrientationLock` in `main.js:435-460`) shows the "rotate phone" modal when `w < h AND min(w,h) < 360`. That gate is independent of logical canvas and unaffected. **However**, the scale factor on a portrait phone (`innerWidth < 360`) would now be `(360 / 1920) = 0.1875` instead of `(360 / 1080) = 0.333` — making the playable area even smaller. The modal still triggers and the user is asked to rotate, so this is acceptable.

### R4 — Spec/code drift across the F3 → F4a transition (process risk)
The orchestrator notes "F3 just archived" and the launch prompt lists 13 spec domains. Reality: only 4 specs exist in `openspec/specs/`. The other 9 (combat-core, enemy-archetypes, best-score, game-over-flow, game-test-api, hand-pen-sprite, main-menu, player-integrity, victory-flow) live under `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/` — they were applied but never promoted to `openspec/specs/`. This means:
- The two specs that DO exist and need MODIFIED are `iso-tile-system` and `iso-camera-integration`. Both have multiple `1920×1080` literals that need updating.
- The other 9 archived specs (combat-core's REQ-CMB-001 cooldown, etc.) do **not** reference 1080p — verified by grep. Safe to defer their promotion until later phases.

### R5 — Playwright viewport assumption (test risk)
The 3 e2e specs use `viewport: { width: 1280, height: 720 }` for the Playwright browser window. CSS `transform: scale()` adapts the logical buffer to this. Verified: `applyCssScale` uses `Math.min(vw / logicalW, vh / logicalH)` so the scale factor adapts automatically. **No change needed to e2e specs.**

But: the visible iso corridor at the test viewport will shrink vertically. The 12-enemy test fixture (rail `(0,0)→(18,18)` over 60s, TILE_SIZE=128, H=720) will display ~5.6 tiles of vertical rail — within the test's hit-detection and escape windows, but the visual regression screenshots should be reviewed. Verify with `tests/e2e/smoke.spec.mjs` re-run.

### R6 — `tests/e2e/projectile-direction.spec.mjs` worked-example numbers (test risk)
The test comment at line 19 walks through the old 1080p math (`tileWorldOrigin.y = round(1080*0.30) = 324`, etc.). The math in the test is invariant — the test asserts the projectile vector, not the literal numbers — but the comment block is now misleading. Update it; otherwise future maintainers will be confused.

### R7 — `styles/main.css:40` stale comment (cosmetic risk)
The CSS comment says "the wrapper inside is sized to 1920x1080 by JS". With LOGICAL_H=720, this becomes wrong. But `styles/main.css` is in the locked-files list. **Decision: leave it** — cosmetic, locked, low-value.

### R8 — `src/input.js:144` stale comment (cosmetic risk)
Same class. Locked file. **Decision: leave it** — same rationale.

### R9 — `src/test-api.js:103` magic-number drift (test infrastructure risk)
`const vc = ctx.viewportCenter ?? { x: 640, y: 360 }`. Pre-existing drift: y=360 was a 1280×720/2 half-height, NOT a LOGICAL_H/2. When LOGICAL_H=720, y=360 becomes accidentally correct (LOGICAL_H/2 = 360). When LOGICAL_H was 1080, y=360 was wrong (should have been 540). The main.js caller passes `viewportCenter: { x: LOGICAL_W/2, y: LOGICAL_H/2 }` (line 335), so the fallback is unreachable from production — but unit tests that construct `mountTestAPI({ ... })` without `viewportCenter` would get the wrong default. **Clean it up while we're here.**

### R10 — `src/combat.js:143` magic-number drift (code risk)
Same class as R9. The fallback `{ x: 1280, y: 720 }` was hardcoded to a 1280×720 browser viewport, never to LOGICAL_W/LOGICAL_H. The main.js caller passes the correct value, so production is unaffected. But unit tests that construct `new Combat({ ... })` without `viewportSize` get the wrong default. **Clean it up while we're here.**

### R11 — Pixel-art sprite readability at smaller H (visual quality risk)
At H=720, the same logical heart (96×96), hand (anchor + offset), and projectile (4×6) sprites occupy the same proportion of the vertical canvas (≈13% of H vs ≈9% of old H). The hand at y=672 is at 93% of viewport height. The bottom 30% of the canvas (the "HUD strip") is now smaller proportionally. **Verify by visual review** that the hearts don't overlap the hand and the hand doesn't crowd the south-edge enemies.

### R12 — `computeCullRange` and 400-tile cap invariant (performance risk)
The cull cap is `MAX_VISIBLE_TILES = 400` (raised from 100 in F3). At H=720 with TILE_SIZE=128, the visible window shrinks from ~23×23 to ~23×~13 (still ~300 max). Within budget. No performance regression.

### R13 — F2.5.1 archived test expectation (regression test risk)
`openspec/changes/archive/2026-09-06-fase-2-5-1-tile-regen-and-centering/design.md:33` documents the verified invariant: "at W=1920, H=1080, tileSize=128: cam (0,0) and cam (5,5) both project their respective iso point to (960, 540) ✓ viewport center". This is an **archived design doc** (audit trail, not test) — the math works for any H, the test in `tests/unit/escape-detection.spec.mjs` doesn't reference LOGICAL_H. No regression risk; just a stale footnote.

### R14 — Reviewer cognitive load (PR hygiene risk)
This is a ~15-line change across 8 files. Well under the 400-line PR budget — no chained-PR strategy needed. Single commit, single PR.

---

## Ready for Proposal

**Yes — pending resolution of the open question about TILE_SIZE.**

### Conditions before sdd-propose runs

1. **User must answer the TILE_SIZE coverage question** (see Recommendation → Open question). The answer determines whether Phase A is strictly canvas-only (Approach A) or also touches TILE_SIZE (Approach C).
2. **User must approve the `src/main.js` edit exception** to the `rules.apply` lock. Single line, but explicit approval is the policy.

### What sdd-propose should include

- **Scope**: single numeric constant change + stale-comment sweep + 2 magic-number drift cleanups + 2 spec MODIFIED deltas.
- **Approach A** as the recommendation (or Approach C if the TILE_SIZE question resolves that way).
- **Rollback plan**: revert `LOGICAL_H` and the 2 cleanups (combat.js, test-api.js). Spec MODIFIEDs can stay (they describe the new invariant; rolling them back is purely cosmetic).
- **Explicit "rules.apply exception"** callout for `src/main.js`.
- **Locked files NOT touched**: `rail-camera.js`, `input.js`, `player.js`, `index.html`, `styles/main.css` (only `styles/main.css:40` and `input.js:144` carry cosmetic 1080 references, deliberately skipped per Risks R7/R8).

### Artifacts this phase produces

| Artifact | Path | Status |
|---|---|---|
| `exploration.md` | `openspec/changes/fase-4a-canvas-720/exploration.md` | ✅ Written by this phase |

### Artifacts sdd-propose should produce next

| Artifact | Path |
|---|---|
| `proposal.md` | `openspec/changes/fase-4a-canvas-720/proposal.md` |

### Delta specs sdd-spec should produce (after proposal)

| Domain | Type | Requirement |
|---|---|---|
| `iso-tile-system` | MODIFIED | TILE-001 (scenarios `1920×1080` → `1920×720`; "1080p" wording) |
| `iso-tile-system` | MODIFIED | TILE-004 (scenario `1920×1080` → `1920×720`) |
| `iso-camera-integration` | MODIFIED | CAM-002 (scenarios `W=1920, H=1080` → `H=720`; `viewOrigin = { 960, 540 }` → `{ 960, 360 }`) |

No NEW spec required.