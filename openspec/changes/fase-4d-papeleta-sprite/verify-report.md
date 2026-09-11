# Verify Report: F4d — Papeleta sprite + cooldown (Phase D)

**Change**: `fase-4d-papeleta-sprite`
**Branch**: `fase-4d-papeleta-sprite`
**Base**: `67aa162` (F4c merged to main)
**Mode**: Standard
**Verifier**: orchestrator (inline)

---

## Verdict

**`PASS`** — F4d asset, manifest, source edit, and cooldown change all verified end-to-end via Playwright headless smoke.

---

## Completeness

| Artifact | Status |
|---|---|
| Asset (`assets/sprites/papeleta_firmada.png`) | Present, 198 bytes, 20×24 RGBA |
| Manifest entry | Present (`papeleta_firmada`, real: true) |
| `src/combat.js` source edit | Present (cooldown 333→200, sprite integration, lazy-load, fallback) |
| `tools/generate-papeleta-firmada.py` (generator) | Present (reproducibility) |
| `tools/f4d-capture.mjs` (capture script) | Present |
| Apply-progress | Present |
| Capture screenshots (3) | Present (`f4d-t00-boot.png`, `f4d-t05-fire.png`, `f4d-t15-burst.png`) |

---

## Test Evidence

| Layer | Command | Exit | Result |
|---|---|---|---|
| Asset generation | `python3 tools/generate-papeleta-firmada.py` | 0 | **PASS** — `Wrote assets/sprites/papeleta_firmada.png (20x24 RGBA)` |
| Runtime harness | `TEST_URL=http://localhost:8000/?test=1 node tools/f4d-capture.mjs` | 0 | **PASS** — `consoleErrors: []`, 3 PNG screenshots written, `FIRE_COOLDOWN_MS_runtime: 200` matches `FIRE_COOLDOWN_MS_expected: 200` |
| Static acceptance grep | `grep -nE 'FIRE_COOLDOWN_MS = [0-9]+' src/combat.js` | 0 | `FIRE_COOLDOWN_MS = 200` (line 26) |
| Static acceptance grep | `grep -nE 'papeleta_firmada' assets/sprites/manifest.json` | 0 | `papeleta_firmada` entry present |
| Cooldown gate behavior | f4d-capture.mjs 3-tap burst at t=15s | — | Burst fires without gated drops (200ms gate allows ~5 shots/s, taps spaced ~200ms) |

---

## Spec Compliance

No main spec exists for `combat-core` or `hand-pen-sprite` in `openspec/specs/` (both live in the F3 archive at `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/specs/` and were never promoted to main).

The F3 archived `combat-core` spec describes the projectile as a `PIXI.Graphics` 4×6 cream rectangle; F4d changes the visual to a `PIXI.Sprite` (20×24 PNG) and bumps cooldown to 200ms. If/when `combat-core` is promoted to a main spec, the F4d update should be reflected as either a MODIFIED requirement or a separate "papeleta-sprite" capability.

No MODIFIED delta was written for this phase — the orchestrator inlined the rationale into `apply-progress.md`. If the project later wants strict spec-driven coverage, this should be backfilled.

---

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **`tools/f4d-capture.mjs`** mirrors `f4a-capture.mjs`, `f4b-capture.mjs`, and `f4c-capture.mjs`. Consider consolidating to a parameterized `tools/capture.mjs` (saves duplication across 4 files).

2. **The `combat-core` F3 spec** still describes the projectile as `PIXI.Graphics` 4×6 cream. If the project promotes that spec to main, it should be MODIFIED to reflect the F4d sprite.

3. **Cooldown tuning**: 200 ms (5 shots/s) may feel fast for some players. Future F4+ phases may want a tunable cooldown (e.g., difficulty setting) rather than a hard-coded constant.

---

## Carry-forward to `sdd-archive`

1. **No spec merges needed.**
2. **Branch is ready for merge to `main`**: 2 commits (`cc05920`, `e1ffe65`) + apply-progress + 3 PNGs.

---

## Cleanup

Local http.server on `:8000` still running from earlier phases. Can be killed via `pkill -f "http.server 8000"` when done.
