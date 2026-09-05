# F2.5.1 Apply Progress

**Change**: `fase-2-5-1-tile-regen-and-centering` (F2.5.1)
**Project**: `zarra-defenders-2d`
**Branch**: `feat/fase-2-5-1-a-assets-manifest`
**Status**: F2.5.1.a COMPLETE — 9 commits, smoke-test PASSED, 7 tiles regenerated

---

## F2.5.1.a — Asset regeneration (this branch)

### Completed

| Task | Tile | Commit | Result |
|---|---|---|---|
| a.0 smoke-test | pino_underbrush_dark (temp path) | (none — no commit) | PASS: 128×64, corners α=0, center α=248 |
| a.1 | stage1-bosque/pino_underbrush_dark | d131d9a | 128×64, corners α=0, center α=255 |
| a.2 | stage3-rio/roca_chorrera_humeda | 8e91203 | 128×64, corners α=0, center α=255 (retry 1) |
| a.3 | stage4-vertedero/cement_pad_crack | 93682e2 | 128×64, corners α=0, center α=229 (retry 1, prompt shortened for stage4) |
| variants.json tightening | plastic_debris_mixed + weeds_through_pavement | 2d134a7 | +"ONLY concrete/grey-brown, no living plants at all" |
| a.4 | stage4-vertedero/plastic_debris_mixed | b330d2c | 128×64, corners α=0, center α=218, 0 green/blue pixels |
| a.5 | stage4-vertedero/weeds_through_pavement | ce247c1 | 128×64, corners α=0, center α=250, 0 green/blue pixels (retry 4) |
| a.6 | stage5-castillo/pino_penon_mediterraneo | 077a7b6 | 128×64, corners α=0, center α=238 (retry 3) |
| a.7 | stage5-castillo/sendero_subida_penon | 74f5349 | 128×64, corners α=0, center α=217 (first try) |
| a.8 | manifest reconcile + previousVariantId migration | ded6773 | totals 40+0=40 ✓; 7 active with regeneratedFrom.regeneratedAt ✓; 7 with previousVariantId ✓ |

### Strategy applied (per design.md §5)

- `aspect_ratio=1:1` for every minimax call
- Verbatim "flat magenta #FF00FF background" phrase in every prompt (root cause fix for F2.5 partial failure)
- Reused `PROMPT_TEMPLATE` from `tools/generate-iso-tiles.py`; condensed NOTES.md bullets for stage4 to stay under 1500-char minimax limit
- Per-tile commits, never batched
- `mark_regenerate` (active→discarded) → minimax → postprocess → validate → retry if center α < 200 → `mark_regenerated` (discarded→active)
- Evidence preserved at `assets/tiles/_discarded/_regen_attempt_2/{stage}_{variant}_v3.png` (F2.5.1 evidence, like `_regen_attempt_1/` was for F2.5)
- Smoke-test gate validated 1:1 + verbatim magenta phrase before committing to all 7

### Manifest invariants (ASSET-007) — VERIFIED

- `totals.active + totals.discarded === 40` ✓ (40 + 0)
- Exactly 7 active entries have `regeneratedFrom.regeneratedAt` ✓
- 7 active entries carry `regeneratedFrom.previousVariantId` (schema migration from originalDiscardedAt/Reason form) ✓

### Anti-glorification (ASSET-005 inherited) — VERIFIED for stage4 regens

- `plastic_debris_mixed`: 0 pure-green-vegetation pixels (#00FF00 count = 0), 0 pure-blue-sky pixels (#0000FF count = 0)
- `weeds_through_pavement`: same checks pass

### Deviations from design

- **Stage4 prompt condensation**: design used full NOTES.md bullet list (8 features). minimax rejects prompts > 1500 chars; condensed to LOCATION + 1-3 features for stage4 tiles. Verbatim magenta phrase preserved.
- **Tightening commit separate from a.4**: design suggested bundling into a.4. Chose separate commit (2d134a7) between a.3 and a.4 for cleaner review.
- **Retry pattern**: `mark_regenerate` is idempotent on already-discarded entries, so retried tiles only required deleting the bad crop and re-running postprocess. No script changes needed.

### Out-of-scope (NOT in this PR)

- `src/iso/world.js` centering fix (F2.5.1.b.1)
- `src/main.js` adjustment (F2.5.1.b.2 — likely no change needed)
- `tests/tile-gallery.html` rewrite (F2.5.1.b.3)
- F2.5.1.b.4 visual verification

---

## Pre-existing state (from earlier session)

The earlier apply-progress observation noted T0 was BLOCKED on origin/main out-of-sync. After PR #2 (`d267349 chore(specs): promote F2.5 tile-system specs to baseline`) merged cleanly, T0 is satisfied. This branch (`feat/fase-2-5-1-a-assets-manifest`) was created off `d267349` for the F2.5.1.a phase.