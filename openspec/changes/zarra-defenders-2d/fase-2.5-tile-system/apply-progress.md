# Apply progress — F2.5 Isometric Tile System

> **Change**: `fase-2.5-tile-system` · **Project**: `zarra-defenders-2d`
> **Mode**: hybrid (OpenSpec + Engram) · **Delivery**: stacked-to-main, 3 PRs
> **Started**: 2026-09-05 · **Apply attempt**: sdd-apply-fase-2.5-initial

---

## PR #1 — F2.5.1 Pure modules · ✅ MERGED

| Field | Value |
|---|---|
| Branch | `feat/f2.5.1-iso-pure-modules` |
| Commit | `ab0a98e` — `feat(iso): add pure iso math, tilemap, and world modules` |
| Merge | `643300f` — `Merge PR #1: F2.5.1 — pure iso modules` (no-ff into `main`) |
| LOC | +478 (6 files) — within 560-budget for whole F2.5 |
| Tasks done | F2.5.1.1, F2.5.1.2, F2.5.1.3, F2.5.1.4 |
| Verification | Playwright headless on `tests/iso-smoke.html`: `window.__isoSmokeOK === true`, 0 failures, console.error=0, console.warning=0. Existing `index.html` regression check: console.error=0, console.warning=0. |
| Audit invariant | `git diff 581d291 -- src/{rail-camera,input,player}.js styles/main.css index.html` = empty lines. ✅ |
| Files | `src/iso/iso-math.js` (84 LOC), `src/iso/tilemap.js` (140 LOC), `src/iso/world.js` (111 LOC), `tests/iso-smoke.html` (40 LOC), `tests/iso-smoke.js` (103 LOC), `tests/out/iso-smoke-fase-2.5.1.png` (verification screenshot) |

### Notes
- All 8 module files compile via `node --check`.
- `sortableChildren === false` enforced on `world.container`, `_tileLayer`, and `_spriteLayer` (ADR #1).
- `STAGE_VARIANTS` table is the locked catalog from `proposal.md` + spec (ASSET-003 / ASSET-005); variant names MUST match the asset-pipeline output exactly.
- Tilemap hard-cap (`MAX_VISIBLE_TILES = 100`) with center-priority safety net — passes TILE-004 even for pathological configs.
- IsoWorld emits a `console.warn` when `getCameraX() + getCameraY()` regresses (CAM-001 invariant debug aid); non-blocking.

---

## PR #2 — F2.5.2 Asset generation (40 tiles) · 🔲 PENDING

| Field | Value |
|---|---|
| Branch | _not created yet_ |
| Tasks pending | F2.5.2.1 through F2.5.2.8 |
| LOC forecast | ~150 (generator) + 40 PNGs ≈ 3.2 MB |
| Blocker | USER GATE at F2.5.2.5 (stage 4 anti-glorification) + F2.5.2.8 (full visual review) |
| Risk | minimax generation cost + Playwright validation per batch |

---

## PR #3 — F2.5.3 Integration · 🔲 BLOCKED on PR #2

| Field | Value |
|---|---|
| Branch | _not created yet_ |
| Tasks pending | F2.5.3.1 through F2.5.3.4 |
| LOC forecast | ~30 modified (`src/main.js`) + 1 line cache-bust (`index.html` `?v=6` → `?v=7`) |
| Dependency | PR #2 merged (IsoWorld needs real textures) |
| Blocker | USER GATE at F2.5.3.4 (Diablo-2 look-and-feel) |

---

## Engram observations

| topic_key | status |
|---|---|
| `sdd/zarra-defenders-2d/fase-2.5-tile-system/apply-progress` | _saved after PR #1_ |

---

## Next action

Continue with PR #2 (asset pipeline + 40 minimax-generated tiles + postprocess_v4.py + user gate).