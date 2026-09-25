# Archive Report — Fase 6 Per-stage rosters + menú visuals

**Change**: 2026-09-25-fase-6-stages-menus
**Archived to**: `openspec/changes/archive/2026-09-25-fase-6-stages-menus/`
**Archive date**: 2026-09-25

## Final-State Authority

All facts in this report reflect the FINAL state at archive time (commits
`faba09b feat(stages+menu+pixi): Fase 6 cerrada` + `fe94948 chore(gitignore): exclude raw menu backgrounds`).
Intermediate snapshots from `apply-progress.md` and `verify-report.md` are
historical and do not override this report.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `stage-rosters` | Created | 5 stage rosters registry + bootTestLevel wire. 6 requirements, 11 scenarios. |
| `menu-visuals` | Created | 4 dedicated menu PNGs + CSS mapping. 4 requirements, 6 scenarios. |
| `pixi-offline` | Created | Local pixi.min.js bundle + CDN fallback. 3 requirements, 5 scenarios. |

Source: `openspec/changes/2026-09-25-fase-6-stages-menus/specs/{stage-rosters,menu-visuals,pixi-offline}/spec.md`
→ Merged into: `openspec/specs/{stage-rosters,menu-visuals,pixi-offline}/spec.md` (mechanical cp + diff -r readback empty).

## Archive Contents

- proposal.md ✅
- design.md ✅
- tasks.md ✅ (27/27 tasks complete)
- verify-report.md ✅
- apply-progress.md ✅
- specs/stage-rosters/spec.md ✅
- specs/menu-visuals/spec.md ✅
- specs/pixi-offline/spec.md ✅
- archive-report.md ✅ (this file)

## Mechanical Copy Verification

```
$ diff -r openspec/changes/2026-09-25-fase-6-stages-menus/specs/stage-rosters/spec.md <dest>
(empty)
$ diff -r openspec/changes/2026-09-25-fase-6-stages-menus/specs/menu-visuals/spec.md <dest>
(empty)
$ diff -r openspec/changes/2026-09-25-fase-6-stages-menus/specs/pixi-offline/spec.md <dest>
(empty)
$ diff -r <snapshot> openspec/changes/archive/2026-09-25-fase-6-stages-menus/
(empty)
```

## Source of Truth Updated

- `openspec/specs/stage-rosters/spec.md` — 5 stage rosters + selection wire
- `openspec/specs/menu-visuals/spec.md` — 4 PNGs + CSS mapping
- `openspec/specs/pixi-offline/spec.md` — local bundle + CDN fallback

## Task Completion

All 27 tasks marked complete in `tasks.md`. No stale checkboxes remain.

## Test Counts at Archive Time

- `tests/unit/levels-stage-rosters.spec.mjs`: 18/18 PASS
- `scripts/verify.sh`: 8/8 PASS
- Headless: 4 menu assets HTTP 200, PIXI.VERSION === '7.4.0' from local, 0 console errors

## SDD Cycle Complete

The change has been:
1. Planned (proposal.md)
2. Designed (design.md)
3. Specified (specs/{stage-rosters,menu-visuals,pixi-offline}/spec.md)
4. Implemented (commits faba09b + fe94948)
5. Verified (tests + headless)
6. Archived (this folder move)

Ready for the next change.
