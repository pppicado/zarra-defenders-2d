# Proposal: F4a — Canvas resize to 1920×720 (Phase A)

**Change**: `fase-4a-canvas-720` · **Base**: main @ post-F3 archive · **Strategy**: single PR, no `size:exception` · **LOC target**: ≤ 25 lines across ≤ 5 files

---

## 1. Intent

F3 shipped the rail-shooter loop on a **1920×1080 logical canvas**. At `TILE_SIZE = 128` the iso corridor shows ~8 tiles vertically — narrow strip, ~33% empty sky. **Phase A** drops `LOGICAL_H` from `1080` to `720` (new ratio **8:3**) so the corridor sits in a tighter band and the HUD strip becomes proportionally larger. TILE_SIZE, hand size, sprite regen, and rail extension are deferred to Phases B–D.

Single source of truth: `LOGICAL_H = 1080` at `src/main.js:57`. Every downstream consumer (`computeWorldOrigin`, `IsoWorld.viewportHeight`, `Tilemap`, `HUD`, `Combat.viewportSize`) reads from this constant. Per `rules.apply`, `src/main.js` is **locked** — this proposal requests a **scoped single-file exception** for one numeric line + 8 comment sweeps.

---

## 2. Scope

### In scope (this PR)

| # | Edit | File | Lines |
|---|---|---|---|
| 1 | `LOGICAL_H = 1080` → `720` | `src/main.js:57` | 1 |
| 2 | Sweep 8 stale "1920x1080" comments | `src/main.js` (lines 45, 51, 61, 92, 132, 158, 173, 267) | 8 |
| 3 | Magic-number fallback → `LOGICAL_W`/`LOGICAL_H` (pre-existing drift, opportunistic) | `src/combat.js:143` | 2 |
| 4 | Magic-number fallback `{ x: 640, y: 360 }` → `{ x: LOGICAL_W/2, y: LOGICAL_H/2 }` | `src/test-api.js:103` | 2 |
| 5 | Worked-example comment + local `const LOGICAL_H = 1080` | `tests/e2e/projectile-direction.spec.mjs` (lines 19, 40) | 2 |

**Total: ~15 LOC across 5 files.** Well under the 400-LOC PR budget.

### Out of scope (deferred)

- `TILE_SIZE` adjustment — Phase B. With `TILE_SIZE = 128` kept, vertical coverage drops ~8 → ~5.6 tiles (user accepted 2026-09-10).
- Hand size +20% — Phase C. `hand_pen.png` regen — Phase D. Rail extension — Phase B.
- Cosmetic comments in locked files (`styles/main.css:40`, `src/input.js:144`, `src/iso/world.js:155`, `src/ui/hud.js:24-32`) — skipped to keep the exception tight.
- F3 archived specs — verified clean of `1080` (zero hits); no MODIFIED deltas needed in the archive.

---

## 3. Capabilities (contract with sdd-spec)

### New capabilities

**None.** Canvas-viewport semantics fold into existing `iso-camera-integration` CAM-002.

### Modified capabilities (verified by reading the specs)

- **`iso-tile-system`** (MODIFIED):
  - **TILE-001** — 2 stale literals (scenario lines 24, 134: `viewport 1920×1080`). Math is viewport-agnostic. Update → `1920×720`.
  - **TILE-004** — 1 stale literal (scenario line 87).
  - TILE-001 requirement text (lines 18, 128): "yielding ≥ 64 px on 1080p" → spec phase decides "on the target viewport (1920×720)" vs "on 720p". Math unchanged.

- **`iso-camera-integration`** (MODIFIED CAM-002):
  - 2 stale literals (scenario lines 38, 59: `W=1920, H=1080`). Derived `viewOrigin = { 960, 540 }` → `{ 960, 360 }`. Scenarios remain valid; only the example numbers update.

### NOT modified (verified)

`iso-asset-pipeline` and `iso-gallery` — each has 0 references to `1080` or `1920×1080`. Untouched.

---

## 4. Approach

**Approach A — minimal diff** (user-ratified):

1. Change `LOGICAL_H = 1080` → `720` at `src/main.js:57`. **The only line that drives the change.**
2. Sweep the 8 stale comments in `src/main.js`.
3. Clean up the 2 magic-number fallbacks (`combat.js`, `test-api.js`) — fixes a future bug class where unit tests without explicit args get stale defaults.
4. Update `tests/e2e/projectile-direction.spec.mjs` worked-example numbers and local `const LOGICAL_H`.
5. `sdd-spec` writes MODIFIED deltas for `iso-tile-system` (TILE-001, TILE-004) and `iso-camera-integration` (CAM-002).

The existing `applyCssScale([worldWrapper, hudWrapper], LOGICAL_W, LOGICAL_H)` already handles arbitrary `LOGICAL_H`. **No new module, no new file, no `CANVAS_SIZE` constant module.**

---

## 5. Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/main.js` | **Modified (locked — exception requested)** | `LOGICAL_H` + 8 comment sweeps. Only locked file touched. |
| `src/combat.js`, `src/test-api.js` | Modified | Magic-number fallbacks → `LOGICAL_W`/`LOGICAL_H`. |
| `tests/e2e/projectile-direction.spec.mjs` | Modified | Worked-example + local `LOGICAL_H`. |
| `src/iso/world.js`, `src/iso/iso-math.js`, `src/ui/hud.js`, `src/player.js`, `src/rail-camera.js`, `src/input.js` | **None** | Auto-recalc: `tileWorldOrigin.y = 216` (was 324); heart `y = 592`; hand `y = 672`; `_viewOrigin = {960, 360}`. |
| `index.html`, `styles/main.css`, `assets/`, `tests/catalog.html` | **None** | CSS `transform: scale()` adapts. Playwright browser viewport (1280×720) is independent of logical canvas. |
| `openspec/specs/iso-tile-system/spec.md` | MODIFIED | TILE-001 + TILE-004 scenarios. |
| `openspec/specs/iso-camera-integration/spec.md` | MODIFIED | CAM-002 scenarios. |

---

## 6. Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Scope of Phase A | `LOGICAL_H` only + 2 opportunistic cleanups + comments + 2 spec MODIFIED |
| 2 | Approach | A — minimal diff (no `CANVAS_SIZE` module, no `TILE_SIZE` change) |
| 3 | TILE_SIZE for Phase A | Keep `128`; accept ~5.6 vertical tiles (user 2026-09-10) |
| 4 | Magic-number cleanups | Include — pre-existing drift, opportunistic |
| 5 | Cosmetic comments in locked files | Skip — keep exception tight |
| 6 | New `canvas-viewport` capability? | No — folds into CAM-002 |
| 7 | Delivery strategy | Single PR, no `size:exception` |

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `src/main.js` is locked; needs user exception | Medium | Scoped single-file exception requested (§8). |
| Vertical coverage drops ~8 → ~5.6 tiles | Accepted | User 2026-09-10. Phase B revisits `TILE_SIZE`. |
| Spec/code drift after archive — MODIFIED misses a literal | Low | Post-archive: `grep -nE '\b1080\b' openspec/specs/iso-{tile-system,camera-integration}/spec.md` returns zero. |
| Mobile portrait modal still triggers | Low | `setupOrientationLock` gates on `w<h AND min(w,h)<360`, independent of `LOGICAL_H`. |
| Playwright e2e viewport misread as canvas change | Low | Browser viewport ≠ logical canvas. CSS scale adapts. Only `projectile-direction.spec.mjs` needs a local `LOGICAL_H`. |
| Cull cap (`MAX_VISIBLE_TILES = 400`) | Low | ~23×13 ≈ 300 worst case at H=720. Under cap. |

---

## 8. `rules.apply` Exception Request

`src/main.js` is locked. **Phase A requires:**

> **One-line edit at `src/main.js:57`** (`LOGICAL_H = 1080` → `720`) **plus 8 comment sweeps** at lines 45, 51, 61, 92, 132, 158, 173, 267. **Total in `main.js`: 9 lines.**

Scoped, single-file exception. **No other locked file touched** (`src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css` are NOT edited). If denied, the change is blocked — there is no alternative path.

---

## 9. Rollback Plan

1. **`git revert` the merge commit** — restores `LOGICAL_H = 1080`, the comment sweeps, and the 2 magic-number fallbacks.
2. The 2 cleanups revert to their drifted pre-F4a values (`{x:1280, y:720}`, `{x:640, y:360}`). No data loss.
3. **No new files** — Phase A adds zero modules and zero assets.
4. MODIFIED deltas live under `openspec/changes/fase-4a-canvas-720/specs/`. Archiving applies them; rollback means NOT archiving, so main stays at F3.
5. **Backwards compatibility** — F3 has no dependency on `LOGICAL_H = 720`. Reverting F4a leaves F3 untouched.
6. **Cost** — one `git revert`, zero `rm`, zero `mv`. Cleanest rollback in the project.

---

## 10. Success Criteria

- [ ] `LOGICAL_H = 720` at `src/main.js:57`; engine auto-recalculates anchors and frustum.
- [ ] `src/combat.js:143` and `src/test-api.js:103` reference `LOGICAL_W`/`LOGICAL_H`.
- [ ] `tests/e2e/projectile-direction.spec.mjs` line 19 comment + line 40 `LOGICAL_H = 720`.
- [ ] Post-archive: `grep -nE '\b1080\b' openspec/specs/iso-{tile-system,camera-integration}/spec.md` returns **zero** matches.
- [ ] Visual smoke under `?test=1`: test level boots, camera advances, hand/heart render in the lower band, no premature frustum despawn.
- [ ] Playwright `projectile-direction.spec.mjs` passes headless.
- [ ] `src/rail-camera.js`, `src/input.js`, `src/player.js`, `index.html`, `styles/main.css` **untouched**.
- [ ] Total diff ≤ 25 lines across ≤ 5 files. No `size:exception`.

---

## 11. Open Questions for sdd-spec

1. **Literal style for MODIFIED scenarios.** Concrete `1920×720` (matches F3 house style) vs generic "viewport width × height"? Proposal assumes concrete.
2. **TILE-001 wording** "≥ 64 px on 1080p" → "on the target viewport (1920×720)" or "on 720p"? Math requirement unchanged either way.
3. **Drag-along cosmetic comments.** Clean locked-file cosmetic comments at the cost of a broader exception? Recommendation: no, stay tight.

---

## 12. Next Phase

`sdd-spec` writes MODIFIED deltas under `openspec/changes/fase-4a-canvas-720/specs/`:

- `iso-tile-system/spec.md` — MODIFIED TILE-001, TILE-004.
- `iso-camera-integration/spec.md` — MODIFIED CAM-002.

No NEW spec. Then `sdd-design` (lightweight) → `sdd-tasks` (F4a.1 = constant + cleanup, F4a.2 = Playwright verify) → `sdd-apply` (orchestrator records `rules.apply` exception token before acquire) → `sdd-verify` → `sdd-archive`. Phases B/C/D are independent follow-on PRs.
