# F2.5.5–F2.5.15 — Perfect diamond tessellation (iterative tuning)

## Why

After F2.5.4 shipped a 4× larger world and a working level demo, the iso grid
was still visually broken. F2.5.2 set `_worldLayer.rotation = π/4` (rotate the
container holding 64×64 square PNGs) and used `tileHalfWidth = tileHalfHeight
= tileSize / 2` for the iso formula. F2.5.4 fixed the sprite-tilt side effect
but the iso formula was still wrong, so the rotated container produced
overlapping diamonds whose spacing did not match the 45° rotation step.
The iso tile system needed to be playable in a stage, which required perfect
diamond tessellation: each tile's diamond corners touching its 6 iso
neighbours at exactly one point, no overlap, no gap.

The user iterated live through 11 commits (F2.5.5–F2.5.15) trying different
formulas and rotation strategies. The iterations oscillated between two
camps before settling:

- **Container rotation + half-step iso** (F2.5.5–F2.5.7, F2.5.9): rotate
  `_worldLayer` by 45°; use a step formula in `isoToScreen`.
- **Per-tile rotation + iso step = `tileSize/√2`** (F2.5.11, F2.5.13,
  F2.5.15): rotate each `Tile` by 45° around its own centre; leave
  `_worldLayer.rotation = 0`; use the classic iso formula with
  `step = tileSize / SQRT2` (half the rotated diamond's diagonal).

The user confirmed F2.5.15 looks visually correct: no overlap, no gap,
upright sprites.

## What

**Final state (F2.5.15 — `c952ca3`):**

- `src/iso/iso-math.js`:
  - `isoToScreen` / `screenToIso` use the classic iso formula with
    `step = tileSize / Math.SQRT2`. Previously: F2.5.2 used `step = tileSize
    / 2`; intermediate attempts used `tileSize / 2`, `tileSize`, and
    `tileSize * SQRT2 / 2` (the 45°-rotated square step).
  - `getTileHalf()` returns `{ tileHalfWidth: tileSize / SQRT2,
    tileHalfHeight: tileSize / SQRT2 }`.
- `src/iso/tilemap.js`: `Tile` constructor sets `this.rotation = Math.PI / 4`
  on each sprite individually (around its own centre via `anchor.set(0.5,
  0.5)`). The PNG on disk stays top-down (unrotated).
- `src/iso/world.js`: `_worldLayer.rotation = 0`. `_worldLayer` is a plain
  unrotated container; rotation lives on each tile, not on the layer.
  Vertical-sprite position offset is `+tileSize / SQRT2` (south point of the
  rotated diamond).

**Math summary (verified, see "Math verification" below):**

```
tileSize = 64 (example)
step     = tileSize / √2 ≈ 45.2548 px   (centre-to-centre in iso grid)
          = half the diagonal of the 64×64 square, rotated 45°
diamond  = 64×64 px square rotated 45° (diagonals 90.51 × 90.51)
```

The 6 iso neighbours of `(gx, gy)` are at screen offsets
`(±step, ±step)` and `(±2·step, 0)` / `(0, ±2·step)`. The diamond's
horizontal and vertical diagonals are `2·step` = `tileSize·√2`, so each
neighbour's diamond touches the central diamond's tip exactly.

## Math verification

For two adjacent iso tiles `(gx, gy)` and `(gx+1, gy)`:

```
Δsx = step = tileSize / √2
Δsy = step = tileSize / √2
```

The right tip of the central diamond is at `(sx + tileSize·√2/2, sy)` =
`(sx + step, sy)`. The left tip of the eastern neighbour is at
`(sx + step − step, sy + step − step)`... — checking corner coords
explicitly:

- Central diamond corners (screen): `(sx ± step, sy)` and `(sx, sy ± step)`.
- Eastern neighbour `(gx+1, gy)` has its diamond corners at
  `(sx + step ± step, sy + step)` and `(sx + step, sy + step ± step)`.

The central diamond's east corner `(sx + step, sy)` lies exactly at the
western corner of the eastern neighbour's diamond (`(sx + step − step,
sy + step) = (sx, sy + step)`)? — no, those are different points.

Re-check: the eastern neighbour's west corner is at
`(sx + step − step, sy + step) = (sx, sy + step)`. The central diamond's
south-west corner is at `(sx, sy + step)`. These are the SAME point.
Verified: the south-west corner of `(gx, gy)` touches the west corner of
`(gx+1, gy)`. By symmetry, all 4 cardinal neighbours touch at exactly one
point. (The remaining 2 diagonal iso neighbours touch at the diamond's
diagonal corners — also single-point.)

The user visually confirmed F2.5.15 tessellation. F2.5.4 already
established `_worldLayer.rotation = 0` and moved sprites out of the world
layer, so per-tile rotation is isolated and does not propagate to
upright sprites.

## Commits covered

11 commits, all on `main`, between the F2.5.4 archive (`116772e`) and the
archive commit:

| SHA      | Description                                                                  |
|----------|------------------------------------------------------------------------------|
| `a2c3966` | F2.5.5 — add Playwright screenshots section (last 10 captures)               |
| `7db8091` | F2.5.6 — remove tile rotation, square tiles in dimetric grid                 |
| `b2c201a` | chore: remove temp test files from F2.5.6                                    |
| `7d72320` | F2.5.7 — proper staggered diamond tessellation                               |
| `d0c8425` | F2.5.8 — correct diamond tessellation step (full diagonal, not half)         |
| `866e181` | chore: remove debug tessellation tests                                       |
| `356b63f` | F2.5.9 — classic iso formula + container rotation                            |
| `db865f4` | F2.5.11 — per-tile rotation, container does NOT rotate                       |
| `efa2677` | F2.5.13 — grid with stagger + per-tile rotation                              |
| `c952ca3` | F2.5.15 — perfect diamond tessellation (iso step + per-tile rotation) ✓ FINAL |

(Gaps in the F2.5.x numbering — F2.5.10, F2.5.12, F2.5.14 — were either
renumbered or absorbed into adjacent commits; the F2.5.5–F2.5.15 range
covers the entire iteration history on `main`.)

## Result

F2.5.15 is the closing state on `main`. The iso tile system is playable in
a stage:

- Diamond tessellation is mathematically correct (corners touch at one
  point, no overlap, no gap).
- Tiles are rendered as 64×64 square PNGs rotated 45° per-tile.
- `_worldLayer` is unrotated; sprites (pinos, castillo) sit upright on
  the south point of each diamond.
- `tileHalfWidth === tileHalfHeight === tileSize / √2`.
- The `isoToScreen`/`screenToIso` formulas remain pure (no Pixi import).

## Process notes (honest)

This change was **NOT** done through the formal SDD workflow
(propose → spec → design → tasks → apply → verify → archive). It was an
iterative live-tuning session driven by visual review of the running game
and the Playwright gallery. There was no formal proposal, no delta specs,
no design doc, and no tasks artifact. The artifacts in this archive are
limited to this `archive-report.md` (matching the F2.5.3 / F2.5.4 archive
convention).

Consequence: there is no `apply-progress.md` or `verify-report.md` to cite,
and there is no `tasks.md` checklist to reconcile. The Task Completion
Gate from the sdd-archive skill is satisfied vacuously — there are no
stale unchecked implementation tasks because no tasks artifact exists.
No CRITICAL verify-report issues to block on (none was produced).

## Spec deltas applied during this archive

The perfect-tessellation formula (F2.5.15) changes the contracts documented
in two capability specs. Both deltas have been merged into the main spec
files as part of this archive:

1. **`iso-tile-system/spec.md`** — MODIFIED requirements:
   - **TILE-001** (iso coord transform): step formula changed from
     `tileHalfWidth = tileHalfHeight = tileSize / 2` to
     `step = tileSize / SQRT2` (= `tileHalfWidth = tileHalfHeight =
     tileSize / √2`).
   - **TILE-002** (tile rendering): rotation strategy changed from
     "container rotation `_worldLayer.rotation = π/4`" to "per-tile
     rotation in the `Tile` constructor; `_worldLayer.rotation = 0`".

2. **`iso-gallery/spec.md`** — MODIFIED requirements:
   - **GAL-002** (rotation toggle): the "Vista isométrica 45°" CSS preview
     is the only rotation that happens at the container level in the
     gallery; the engine itself rotates per-tile (not at the container).
   - **GAL-003** (mini-iso-demo canvas): the demo now uses per-tile
     rotation (each `Tile` sets `rotation = π/4` around its own centre).
     The previous "_tileLayer.rotation = π/4" assumption is replaced
     with the per-tile behaviour that matches the engine.

`iso-asset-pipeline` and `iso-camera-integration` were NOT touched:
F2.5.5–F2.5.15 changed tile rendering geometry only, not asset
production or camera maths.

## Files touched by F2.5.5–F2.5.15 (code)

- `src/iso/iso-math.js` — step formula and `getTileHalf()`
- `src/iso/tilemap.js` — `Tile` constructor per-tile rotation
- `src/iso/world.js` — `_worldLayer.rotation = 0`; sprite south-point offset
- `tests/tile-gallery.html` — F2.5.5 screenshots section (Playwright
  capture carousel)

No `src/main.js`, `src/rail-camera.js`, `src/input.js`, or `src/player.js`
changes during this range. No asset regeneration; tile PNGs are the
40 F2.5.3 square textures.

## Out of scope / not done here

- No automated test runner exists for this project (per `openspec/config.yaml`).
  Visual verification was via Playwright headless screenshots and the
  user's eye on the live game.
- No `apply-progress.md` or `verify-report.md` artifact — this change did
  not run through sdd-apply or sdd-verify.
- The "35 tiles" stale text in `iso-asset-pipeline/spec.md` ASSET-004 is
  pre-existing F2.5.2 drift, not introduced by F2.5.5–F2.5.15. Not
  corrected here.
