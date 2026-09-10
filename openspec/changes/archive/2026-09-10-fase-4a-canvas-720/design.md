# Design: F4a — Canvas resize to 1920×720 (Phase A)

> **Change**: `fase-4a-canvas-720` · **Base**: post-F3 archive · **Strategy**: single PR · **LOC**: ≤ 25 across ≤ 5 files
> **Source of truth**: `proposal.md` + 2 MODIFIED deltas (`iso-tile-system`, `iso-camera-integration`)

## Technical Approach

Drop `LOGICAL_H` from `1080` → `720` at `src/main.js:57`. Every consumer (`applyCssScale`, `PIXI.Application` size, `IsoWorld.viewportHeight`, `Tilemap`, `HUD` anchors, `Combat.viewportSize`) reads the same constant and auto-recalculates — no new module, no `CANVAS_SIZE` refactor. Sweep 8 stale "1920×1080" comments in `main.js`; clean two pre-existing magic-number fallbacks (`combat.js:143`, `test-api.js:103`). Update `projectile-direction.spec.mjs` worked-example + local `LOGICAL_H`. See `proposal.md` §4.

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| ADR-1 | Strategy | **Minimal-diff** (Approach A) | Plumbing already handles arbitrary H. (B) `CANVAS_SIZE` over-engineers; (C) folding TILE_SIZE violates the canvas-only boundary. |
| ADR-2 | TILE_SIZE | **Keep `128`** | Vertical coverage drops ~8 → ~5.6 tiles — user-accepted 2026-09-10. Belongs in Phase B with sprite regen. |
| ADR-3 | Locked-file exception | **9 lines in `src/main.js` only** (1 value + 8 comments) | No other path. Scoped to non-behavior edits — no chained unlock. |
| ADR-4 | Magic-number cleanup | **Include** `combat.js:143` + `test-api.js:103` | Pre-existing drift; unit-test construction without explicit args gets stale defaults. Locks `LOGICAL_W`/`LOGICAL_H` as source of truth. |
| ADR-5 | New spec capability | **None** — fold into CAM-002 | Math is viewport-agnostic; only example literals shift. |

## Data Flow

```
LOGICAL_H = 720  (src/main.js:57, single source of truth)
        │
        ├─→ applyCssScale([worldWrapper, hudWrapper], 1920, 720)
        │       └─→ CSS transform: scale(min(vw/1920, vh/720))   ← viewport-agnostic
        ├─→ new PIXI.Application({ width: 1920, height: 720 })   ×2 (world + hud)
        │
        ├─→ IsoWorld({ viewportHeight: 720 })
        │       ├─→ tileWorldOrigin = { x: 960, y: round(720*0.30) = 216 }   (was 324)
        │       └─→ _viewOrigin      = { x: 960, y: 720/2 = 360 }            (was 540)
        │
        ├─→ Tilemap('stage1-bosque', 1920, 720, { tileSize: 128 })
        │       └─→ recomputes cull range per frame
        ├─→ Combat({ viewportSize: { x: LOGICAL_W, y: LOGICAL_H } })   ← cleaned fallback
        │
        └─→ HUD({ viewportHeight: 720 })
                ├─→ heart y = 720 - 96 - 32 = 592                       (was 952)
                └─→ hand  y = 720 + (-48) = 672                         (was 1032)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/main.js` | Modify (locked — scoped exception) | **L57**: `LOGICAL_H = 1080` → `720`. **L45, L51, L61, L92, L132, L158, L173, L267**: 8 stale "1920×1080" comment sweeps. **Total in `main.js`: 9 lines.** |
| `src/combat.js` | Modify | **L143**: fallback `{ x: 1280, y: 720 }` → `{ x: LOGICAL_W, y: LOGICAL_H }`. |
| `src/test-api.js` | Modify | **L103**: fallback `{ x: 640, y: 360 }` → `{ x: LOGICAL_W / 2, y: LOGICAL_H / 2 }`. |
| `tests/e2e/projectile-direction.spec.mjs` | Modify | **L19** worked-example recompute (`324→216`, `1032→672`, `540→360`). **L40** local `LOGICAL_H = 1080` → `720`. |
| _(none new, none deleted)_ | — | — |

Cosmetic comments in `src/iso/world.js:155`, `src/ui/hud.js:24-32`, `src/input.js:144`, `styles/main.css:40` deliberately skipped — locked files; the exception stays tight.

## Interfaces / Contracts

**No new APIs, no signature changes.** The existing surface already accepts arbitrary H: `applyCssScale(W,H)`, `computeWorldOrigin(W,H)`, `IsoWorld({viewportHeight})`, `Tilemap(_,W,H)`, `HUD({viewportHeight})`, `Combat({viewportSize:{x,y}})` — all pass-through.

**Contract change (one sentence):** All viewport-derived state (`tileWorldOrigin.y`, `_viewOrigin.y`, heart/hand anchors, frustum bounds) is now computed against `LOGICAL_H = 720` instead of `1080`. Math is identical; only the input shifts.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Manual smoke | Boot under `?test=1`; test level renders, hand + hearts in lower band, no premature frustum despawn | Playwright headless screenshot + console-error capture (per `verification_path` in `openspec/config.yaml`) — `sdd-verify` phase |
| Unit (existing) | `tests/unit/*.spec.mjs` — invariant under viewport change | Re-run unchanged |
| E2E | `projectile-direction.spec.mjs` — local `LOGICAL_H = 720` keeps vector assertion valid | Re-run after L19/L40 edit |
| E2E | `smoke.spec.mjs`, `hit-detection.spec.mjs`, `tile-gallery.spec.mjs`, `catalog.spec.mjs` — Playwright browser viewport (1280×720) is independent of `LOGICAL_H`; CSS scale adapts | Re-run unchanged |
| Visual regression | F3 catalog screenshots describe the Playwright browser viewport, NOT the logical canvas — captions stay "1280×720" | Verify phase refreshes screenshots for new 1920×720 aspect |

## Threat Matrix

`N/A` — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Single numeric constant + comment sweep + 2 magic-number cleanups inside a vanilla HTML5 + Pixi.js app.

## Migration / Rollout

No migration required. No data, no persistent state, no schema, no `localStorage` keys, no asset paths. **`git revert` the merge commit restores F3 state in one step.**

## Open Questions

- **None blocking.** TILE_SIZE question resolved 2026-09-10.
- **Carry forward to `sdd-archive`:** archive must promote BOTH TILE-001 blocks (F2.5.2 baseline + F2.5.15 supersession) in `iso-tile-system/spec.md`, plus CAM-002 in `iso-camera-integration/spec.md`.
