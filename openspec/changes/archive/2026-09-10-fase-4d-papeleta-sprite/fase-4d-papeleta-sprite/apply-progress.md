# Apply Progress: F4d — Papeleta sprite + cooldown (Phase D)

**Change**: `fase-4d-papeleta-sprite`
**Branch**: `fase-4d-papeleta-sprite`
**Base**: `67aa162` (F4c merged to main)
**Mode**: Standard (no Strict TDD)
**Status**: 4/4 tasks complete. Ready for archive.

---

## Commits

| Hash | Subject |
|---|---|
| `cc05920` | feat(papeleta): sprite + cooldown 333→200ms |
| `e1ffe65` | test(papeleta): Playwright headless smoke for sprite + cooldown gate |

## Tasks

| Task | Files | Status | Acceptance |
|---|---|---|---|
| T1 — Asset generation | `tools/generate-papeleta-firmada.py` (new) + `assets/sprites/papeleta_firmada.png` (new) | ✅ | 20×24 RGBA PNG, 198 bytes, transparent background, cream + outline + signature line |
| T2 — Manifest update | `assets/sprites/manifest.json` | ✅ | New `papeleta_firmada` active entry with `real: true` and `note: F4d` |
| T3 — Combat source edit | `src/combat.js` | ✅ | `FIRE_COOLDOWN_MS` 333 → 200; Projectile uses `PIXI.Sprite(papeletaTex)` with `anchor.set(0.5, 0.5)`; Combat.constructor lazy-loads texture via `PIXI.Assets.load`; PIXI.Graphics procedural retained as fallback for first-frame races |
| T4 — Capture script | `tools/f4d-capture.mjs` (new) | ✅ | Boots `?test=1`, captures 3 PNGs (boot, single fire, 3-tap burst); asserts `consoleErrors: []`; runtime import confirms `FIRE_COOLDOWN_MS === 200` |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Asset generation | `python3 tools/generate-papeleta-firmada.py` → `Wrote assets/sprites/papeleta_firmada.png (20x24 RGBA)` |
| Runtime harness | `TEST_URL=http://localhost:8000/?test=1 node tools/f4d-capture.mjs` |
| Runtime harness result | **PASS** — `consoleErrors: []`, 3 PNG screenshots written, `FIRE_COOLDOWN_MS_runtime: 200` matches `FIRE_COOLDOWN_MS_expected: 200` |
| Rollback boundary | `git revert <merge>` restores F4c state. New files: `assets/sprites/papeleta_firmada.png`, `tools/generate-papeleta-firmada.py`, `tools/f4d-capture.mjs`, 3 PNGs — all removed by revert. |

## Files Changed (commit `cc05920` + `e1ffe65`)

| File | Action | Lines |
|---|---|---|
| `src/combat.js` | Modify | +30 −9 (cooldown, sprite, lazy-load, fallback) |
| `assets/sprites/manifest.json` | Modify | +5 −0 (new active entry) |
| `assets/sprites/papeleta_firmada.png` | Create | binary, 198 bytes |
| `tools/generate-papeleta-firmada.py` | Create | +35 |
| `tools/f4d-capture.mjs` | Create | +77 |
| `tests/playwright-screenshots/f4d-t{00,05,15}-*.png` | Create (Playwright output) | binary |

## Deviations from Design

None — this phase had no formal `design.md` (orchestrator skipped it; the change was scoped tightly: asset + manifest + 1 source file + capture script, all inlined into `apply-progress.md`).

## Issues Found

None. The PIXI.Graphics fallback ensures the first projectile (if fired before the async texture load completes) still renders correctly.

## Status

4/4 tasks complete. Ready for `sdd-archive`.
