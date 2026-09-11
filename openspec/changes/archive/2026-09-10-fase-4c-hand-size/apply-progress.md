# Apply Progress: F4c — Hand size +20% (Phase C)

**Change**: `fase-4c-hand-size`
**Branch**: `fase-4c-hand-size`
**Base**: `929d03a` (F4b merged to main)
**Mode**: Standard (no Strict TDD)
**Status**: 3/3 tasks complete (1 source + 1 capture + 1 verify). Ready for `sdd-archive`.

---

## Commits

| Hash | Subject |
|---|---|
| `348c851` | feat(hand): scale +20% (1.0 → 1.2) |

The single commit covers the source edit + capture script creation. The capture run + artifacts (this file + `verify-report.md` + screenshot) are committed in the next commit.

## Tasks

| Task | Files | Status | Acceptance |
|---|---|---|---|
| T1 — Source edit | `src/main.js:216` `handSprite.scale.set(1.0) → 1.2` | ✅ | `grep -nE 'handSprite\.scale\.set' src/main.js` shows `1.2` |
| T2 — Capture script | `tools/f4c-capture.mjs` (new) | ✅ | Boots `?test=1`, captures `f4c-t00-boot.png`, asserts `consoleErrors: []` |
| T3 — Visual verification | Playwright run | ✅ | zero `console.error`, screenshot saved |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused runtime harness | `TEST_URL=http://localhost:8000/?test=1 node tools/f4c-capture.mjs` |
| Runtime harness result | **PASS** — `consoleErrors: []`, 1 PNG screenshot written |
| Math check | `cy = 720 + (-48) = 672`; bottom of hand = `672 + 11.52 = 683.52` (inside viewport); pen tip = `672 - 65.28 = 606.72` (well within viewport); hearts at `x ≤ 128` — no overlap with hand center at `x = 960` |
| Rollback boundary | `git revert <merge>` restores F4b state. Single line edit; capture script is the only new file. |

## Files Changed (commit `348c851`)

| File | Action | Lines |
|---|---|---|
| `src/main.js` | Modify | +1 −1 (locked-file exception per F4a precedent) |
| `tools/f4c-capture.mjs` | Create | +44 |

## Deviations from Design

None. F4c has no `design.md` (the change was scoped to a single numeric edit + visual evidence capture; the exploration/proposal captured the approach inline).

## Issues Found

None. The hand renders at the new scale without overlapping the hearts or exiting the viewport.

## Status

3/3 tasks complete. Ready for `sdd-archive`.
