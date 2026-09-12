# Archive Report: fase-5-enemy-movement-fix

**Change**: fase-5-enemy-movement-fix
**Archived on**: 2026-09-12
**Mode**: openspec
**Final state**: PASS — 8/8 E2E scenarios green, regression green, no CRITICAL/WARNING/SUGGESTION issues.

## Verdict

Archive closed cleanly. All artifacts present in
`openspec/changes/archive/2026-09-12-fase-5-enemy-movement-fix/`. Canonical spec
updated. Tasks checklist reconciled at archive time per the orchestrator's
explicit instruction and the exceptional mechanical reconciliation rule in the
Task Completion Gate.

## Source-of-Truth Update

Canonical `openspec/specs/combat-core/spec.md` was modified (delta merged):

| Requirement | Action | Notes |
|---|---|---|
| REQ-CMB-009 (Per-instance enemy movement config) | MODIFIED | Replaced "Defaults when omitted: speed:0, pattern:'static'" with explicit `resolveMovementConfig(spriteId, speed?, pattern?)` contract. Added `typeof speed === 'number' && Number.isFinite(speed)` and `typeof pattern === 'string'` checks plus nullish coalescing against `MOBILE_DEFAULT[spriteId]`. Enumerated `MOBILE_DEFAULT` table preserved. Hard rule for `STATIC_SPRITE_IDS` retained. Changelog note appended. |
| REQ-CMB-011 (Reintentar must reload test level) | ADDED | 3 scenarios: (1) Reintentar from game-over overlay reloads the level (`enemies._timeGatedSpawns.length > 0`, `cameraTime === 0`); (2) After Reintentar + 5s wait, time-gated spawns materialize as camera time advances; (3) Overlay emits single `bootTestLevel:request` event — no inline resets. |

## Source Changes

Files modified (all uncommitted at archive time; commit deferred to user):

| File | Action | LOC |
|---|---|---|
| `src/enemies.js` | Modified — `resolveMovementConfig` uses `typeof` + finite check + nullish coalescing; `Enemy` ctor drops `speed=0` / `movementPattern='static'` pre-defaults; JSDoc documents undefined-vs-explicit contract | +34 / −8 |
| `src/main.js` | Modified — added `busOn('bootTestLevel:request', …)` listener invoking `bootTestLevel` with full ctx | +8 / −0 |
| `src/ui/overlay.js` | Modified — `_onRetry` keeps only `hide()` + `gameState` + `emit('bootTestLevel:request', {})`; inline resets removed | +5 / −7 |
| `tests/e2e/enemy-movement.spec.mjs` | Modified — added `runR6_CamionTrecoDefaults`, `runR7_ExplicitStaticRespected`, `runR8_RetryReloadsLevel`; wired into runner | +112 / −3 |
| **Total** | | **+159 / −18 = 177 lines** |

400-line budget risk: **Low** (forecast). 177 actual lines — well within budget.

## Final State Evidence

| Source | Final-state claim | Proven by |
|---|---|---|
| `verify-report.md` | 8/8 E2E scenarios (R1–R8) green; regression spec green; visual verification PASS | Independent re-run would confirm; no contradicting evidence at archive time |
| `apply-progress.md` | 8/8 tasks complete (R1–R5 pre-existing + R6–R8 new, G1–G4 done, X1 done) | All TDD phases RED/GREEN/REFACTOR attested |
| `tasks.md` (reconciled at archive) | All 9 checklist items marked complete | Reconciliation reason recorded in tasks.md footer |
| Test count | 8/8 E2E scenarios + regression (hit-detection.spec.mjs) all passing | Final `node tests/e2e/enemy-movement.spec.mjs` → exit 0 |
| CRITICAL/WARNING/SUGGESTION | none / none / none | verify-report.md §Issues |
| Visual verification | 3 mobile enemies + 1 static enemy confirmed via `/tmp/opencode/verify-movement.png` (1280×720) | verify-report.md §Visual Verification |

## Stale-vs-Final Resolution

Per Final-State Authority, snapshot-derived claims from `apply-progress.md`
and `verify-report.md` describe the state at their persistence time. The
canonical answer for the change AT CLOSE is:

- **Tasks**: all complete (per `apply-progress.md` end-of-cycle TDD table; confirmed by tasks.md reconciliation at archive time)
- **Tests**: 8/8 green (per `verify-report.md` last re-run after X1 JSDoc refactor)
- **Critical issues**: none (per `verify-report.md` §Issues — no CRITICAL/WARNING/SUGGESTION entries)

No contradictions were found between snapshots and the orchestrator's
launch-prompt assertion that the implementation passed verification. The
launch prompt's final-state facts match the persisted verify-report.

## Mechanical Archive Readback

The archive move was performed by `mv` (per orchestrator instruction — source
folder was untracked, so `git mv` cannot stage it). After the move, the
mandatory `diff -r` readback was performed:

```
$ diff -r /tmp/sdd-readback.XXXXXX/source openspec/changes/archive/2026-09-12-fase-5-enemy-movement-fix
(empty)
exit: 0
PASS: archive bytes match pre-move snapshot byte-for-byte (empty diff)
```

The active `openspec/changes/` directory now contains only `archive/`. The
source folder `openspec/changes/fase-5-enemy-movement-fix/` no longer exists.

## Archive Contents

```
openspec/changes/archive/2026-09-12-fase-5-enemy-movement-fix/
├── proposal.md          (114 lines)
├── design.md             (71 lines)
├── tasks.md              (44 lines, all checkboxes complete after reconciliation)
├── apply-progress.md     (92 lines)
├── verify-report.md      (77 lines, verdict PASS)
└── specs/
    └── combat-core/
        └── spec.md       (152 lines)
```

## Spec Sync Delta (canonical spec changes)

`openspec/specs/combat-core/spec.md` grew from 472 → 523 lines (+51 net):

- REQ-CMB-009 body rewritten (~28 line delta: removed "Defaults when omitted"
  sentence; added resolver contract; preserved `MOBILE_DEFAULT` table; preserved
  hard-rule paragraph; appended changelog note).
- REQ-CMB-011 inserted after REQ-CMB-010 with 3 scenarios.

## Rollback Plan

Single `git revert <merge-commit>` on the future commit that lands this change
restores:

- `src/enemies.js` → pre-default `speed=0, movementPattern='static'` ctor (re-introduces the bug; mobile enemies stop moving)
- `src/main.js` → no `busOn('bootTestLevel:request')` listener
- `src/ui/overlay.js` → inline reset in `_onRetry` (re-introduces Reintentar bug; queue clears but level never reloads)
- `tests/e2e/enemy-movement.spec.mjs` → R6/R7/R8 removed; R1–R5 retained

Canonical `openspec/specs/combat-core/spec.md` revert restores REQ-CMB-009 to
its prior form (drops the resolver contract) and removes REQ-CMB-011.

Note: source files are currently UNCOMMITTED. The user/team must commit and
merge the change before revert is meaningful. The archive folder itself is
the audit trail and MUST NOT be modified after archive.

## Decisions / Tradeoffs

- **Stale-checkbox reconciliation at archive time**: `sdd-apply` left all
  checkboxes unchecked despite completing all work. Per the Task Completion
  Gate, archive would normally block on this. The orchestrator's launch
  prompt explicitly authorized reconciliation backed by `apply-progress.md`
  (8/8 complete) and `verify-report.md` (PASS). Reconciliation reason recorded
  in `tasks.md` footer.
- **`mv` instead of `git mv`**: source folder was untracked; `git mv` cannot
  stage an untracked path. Plain `mv` was the correct primitive.
- **REQ-CMB-009 partial rewrite**: the original requirement was MODIFIED in
  the delta spec with a substantial rewrite of the resolution logic. The
  canonical spec was updated to match — preserving the `MOBILE_DEFAULT` table
  and hard rule while replacing the missing resolver contract.

## Next Steps for the Team

1. Commit the four modified source files plus the archive folder under a
   single work-unit commit (per `work-unit-commits` skill — R6/R7/R8 + G1–G4 +
   X1 belong together; single PR was forecast).
2. Push the branch / open PR. The 400-line budget risk is Low — single PR is
   appropriate.
3. After merge, the next SDD cycle may proceed. No follow-up tasks were
   identified for this change.

## Artifacts

- Archive folder: `openspec/changes/archive/2026-09-12-fase-5-enemy-movement-fix/`
- Updated canonical spec: `openspec/specs/combat-core/spec.md`
- This report: `openspec/changes/archive/2026-09-12-fase-5-enemy-movement-fix/archive-report.md`
