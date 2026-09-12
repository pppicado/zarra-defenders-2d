# Archive Report — fase-5-movement-calibration

## Change

**Name**: `fase-5-movement-calibration`
**Archived to**: `openspec/changes/archive/2026-09-12-fase-5-movement-calibration/`
**Date**: 2026-09-12
**Mode**: OpenSpec (filesystem artifacts; Engram optional)
**Review Gate**: absent — receipt-driven development not active for this candidate; proceed per ordinary repository policy.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `combat-core` | MODIFIED REQ-CMB-009 | Replaced linear iso-units/sec advance with oscillation around spawn iso. Speed semantics reinterpreted (Hz for sine/zigzag, rad/s for arc, ignored for linear/static). MOBILE_DEFAULT recalibrated to 0.0-1.2 Hz/rad/s. Updated scenarios: R3 isoX-locked, R9/R10 oscillation rate scenarios. |
| `combat-core` | ADDED REQ-CMB-012 | Test-mode auto-advance. The `if (!inTestMode)` guards in `src/main.js` were removed; both `camera.update(dt)` and `enemies.update(...)` now run unconditionally on the production ticker. 4 new scenarios: cameraTime > 0 after 1s wait, time-gated spawns materialize, e01 alive at 5s, lateral clamp amplitude-aware. |

### Source-of-Truth Update

`openspec/specs/combat-core/spec.md` was updated IN-PLACE (Mechanical Copy
Contract applies to moving the change folder, not editing the canonical
spec). The edit replaces the existing REQ-CMB-009 block entirely and inserts
REQ-CMB-012 after REQ-CMB-011.

## Archive Contents

- `proposal.md` ✅
- `specs/combat-core/spec.md` ✅ (delta for the change)
- `design.md` ✅
- `tasks.md` ✅ (7/7 tasks complete — RED R1-R4 + GREEN G1-G3)
- `verify-report.md` ✅ (12/12 scenarios PASS)

### Mechanical Copy Readback

```
$ diff -r "$SNAP/source" "openspec/changes/archive/2026-09-12-fase-5-movement-calibration"
(empty)
$ echo $?
0
```

The archived folder is byte-identical to the pre-move snapshot
(`diff -r` returned empty; exit code 0). The `archive-report.md` was
additively written into the archive folder and is NOT part of the
source/destination comparison (it does not exist in the snapshot).

## Final SDD Cycle Status

| Phase | Status |
|-------|--------|
| 1. SPEC | ✅ Delta written at `openspec/changes/.../specs/combat-core/spec.md` |
| 2. DESIGN | ✅ `design.md` (1 file) — pattern redefinition + test-mode auto-advance |
| 3. TASKS | ✅ TDD strict: RED R1-R4 + GREEN G1-G3 + REFACTOR X1 |
| 4. APPLY | ✅ RED (R3 delta=49.5, R9 vanished, R11 tAfter=0, R12 missing) → GREEN (12/12 pass) |
| 5. VERIFY | ✅ `verify-report.md` PASS — 12/12 scenarios + 7 hit-detection regression |
| 6. ARCHIVE | ✅ Mechanical move + `diff -r` byte-identity confirmed |

## Files Touched (Production)

| File | Action | Purpose |
|------|--------|---------|
| `src/enemies.js` | Modified | `Enemy.tick()` rewritten as oscillation; `MOBILE_DEFAULT` recalibrated; comment block above `Enemy` class documents pattern semantics |
| `src/main.js` | Modified | `if (!inTestMode)` guards removed on `camera.update(dt)` and `enemies.update(...)`; production ticker now drives both modes identically |
| `tests/e2e/enemy-movement.spec.mjs` | Modified | R3 assertions updated for oscillation model (isoX-locked); R6 speed expectation in oscillation Hz range; new R9-R12 scenarios for calibration |
| `openspec/specs/combat-core/spec.md` | Modified | REQ-CMB-009 MODIFIED + REQ-CMB-012 ADDED (canonical source of truth) |

## Commits

| Hash | Subject |
|------|---------|
| (1) | `fix(enemies): patterns oscillate around spawn iso (no linear advance outrunning camera)` |
| (2) | `archive(fase-5-movement-calibration): chronicle pattern recalibration SDD cycle` |

## Next Steps

- Future contributors who need to add a new movement pattern (e.g. `figure-eight`,
  `lissajous`) should follow the existing pattern: read `_spawnIsoX / _spawnIsoY`,
  apply deviation around those fixed points, never translate along the rail
  direction. The X1 comment block in `src/enemies.js` documents this explicitly
  with a "DON'T reintroduce linear advance" warning.
- Future contributors who need to extend `?test=1` behavior should keep using
  the production ticker; `__gameTestAPI__.tick(dt)` remains the deterministic
  override for tests that need frame-by-frame control.

## Risk Note

The arc pattern's `_arcCenter` capture reads from `_spawnIsoX` (captured at
construction) rather than from `isoX` at capture time. With the oscillation
model this is correct, since `_spawnIsoX` is the fixed reference. If a future
contributor reintroduces linear advance, arc drift would re-emerge. The X1
comment block explicitly calls this out.
