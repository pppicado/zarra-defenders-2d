# Verify Report: F4c — Hand size +20% (Phase C)

**Change**: `fase-4c-hand-size`
**Branch**: `fase-4c-hand-size`
**Base**: `929d03a` (F4b merged to main)
**Mode**: Standard
**Verifier**: orchestrator (inline)

---

## Verdict

**`PASS`** — F4c is a single-line numeric edit with visual evidence. No spec regressions, no regressions in other modules.

---

## Completeness

| Artifact | Status |
|---|---|
| `apply-progress.md` | Present |
| Capture screenshot `tests/playwright-screenshots/f4c-t00-boot.png` | Present |
| (No `exploration.md`, `proposal.md`, `design.md`, `tasks.md`, `specs/`) | F4c was scoped to a single numeric edit + visual evidence; the orchestrator inlined the exploration/proposal into `apply-progress.md`. No specs affected (no main `hand-pen-sprite` spec exists; the F3-archived spec is unmodified). |

---

## Test Evidence

| Layer | Command | Exit | Result |
|---|---|---|---|
| Runtime harness | `TEST_URL=http://localhost:8000/?test=1 node tools/f4c-capture.mjs` | 0 | **PASS** — `consoleErrors: []`, `f4c-t00-boot.png` written |

**Math invariants** (derived, not runtime-tested):

- Hand center at `(960, 672)` (viewport center X, `LOGICAL_H + HAND_BOTTOM_OFFSET.y = 720 − 48 = 672`).
- Hand sprite is 64×64 PNG scaled to 1.2 → effective footprint 76.8×76.8.
- Anchor (0.5, 0.85) → wrist at center, pen tip at top.
  - Bottom of hand: `cy + 0.15 · 76.8 = 672 + 11.52 = 683.52` → inside viewport (≤ 720).
  - Top of hand: `cy − 0.85 · 76.8 = 672 − 65.28 = 606.72` → well within viewport.
  - Hand width: `0.5 · 76.8 = 38.4` left and right of center → hand spans `[921.6, 998.4]` horizontally.
- Hearts at bottom-left, `x ≤ 32 + 96 = 128` (margin + size) → no horizontal overlap with hand center at 960.
- `LOGICAL_H = 720` is unchanged from F4a — no viewport-derived recomputation needed for the scale edit.

---

## Spec Compliance

No main spec exists for `hand-pen-sprite` (the F3 spec lives at `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/hand-pen-sprite/spec.md` and was never promoted to main). F4c does NOT modify that archived spec because the F3 contract only specifies pointer-tracking + asset origin + scale — and the F4c edit is `scale 1.0 → 1.2`, a numerical refinement of an existing parameter, not a contract change.

If the project later promotes `hand-pen-sprite` to a main spec, it should include both the F3 baseline scale (1.0) and the F4c refinement (1.2) as separate scenarios or as a single scenario with a wider scale range.

---

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **`tools/f4c-capture.mjs`** mirrors `f4a-capture.mjs` and `f4b-capture.mjs`. Consolidation to a parameterized `tools/capture.mjs` is optional follow-up.

---

## Carry-forward to `sdd-archive`

1. **No spec merges needed.**
2. **Branch is ready for merge to `main`**: single commit `348c851` + this verify-report + 1 PNG + apply-progress.

---

## Cleanup

Local http.server on `:8000` still running from F4b verification. Can be killed via `pkill -f "http.server 8000"` when done.
