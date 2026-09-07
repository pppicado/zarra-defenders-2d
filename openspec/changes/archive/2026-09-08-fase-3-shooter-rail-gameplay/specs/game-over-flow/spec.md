# `game-over-flow` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: game-over-flow (NEW)

## Purpose

Define the contract for the game-over overlay shown when `player-integrity` reaches `0`. The overlay SHALL halt the rail camera, display final score and `Firmas recogidas`, and offer two buttons (`Reintentar test level`, `Volver al menú principal`). The trigger source is the `integrity:exhausted` event from `player-integrity`.

## Requirements

### REQ-GOV-001: Trigger and camera halt

The system SHALL subscribe to `integrity:exhausted`. On the first emission per run, the system SHALL halt the rail camera (call `RailCamera.setTime(RailCamera.getTime())` to freeze it; further real-time ticks SHALL NOT advance the camera), SHALL dim the world layer (CSS overlay with `opacity: 0.5` on `world`, or a solid color rect at the same z-index as overlays), and SHALL render the game-over overlay. Subsequent `integrity:exhausted` events in the same run SHALL be ignored (idempotent trigger).

#### Scenario: First integrity:exhausted triggers overlay

- GIVEN integrity just transitioned from `1` to `0`
- WHEN the system processes the event
- THEN `RailCamera.getTime()` returns the same value before and after the next frame (camera halted)
- AND the game-over overlay's `display` becomes the visible value.

#### Scenario: Second integrity:exhausted is idempotent

- GIVEN the game-over overlay is already visible
- WHEN a redundant event fires
- THEN no second overlay mount occurs
- AND the camera does not change state.

### REQ-GOV-002: Overlay content

The overlay SHALL be a centered modal: `480×320 px` on desktop (≥ 600 px viewport width), full-width with `16 px` margins on mobile. Content SHALL include:
- Title: `Stage failed` (or the equivalent Spanish string per project convention — locked at `Stage failed` for F3 unless the user requests Spanish; default follows the bilingual artifact rule in `openspec/config.yaml`).
- Final score: large numeric display.
- `Firmas recogidas: N` line, where `N` is the run's final count.
- Best score line (see `best-score` REQ-BSC-003): shows `Mejor: M firmas` if a stored best exists; if the current run beats the stored best, the badge `¡NUEVO RÉCORD!` appears next to the score.
- Two buttons: `Reintentar test level` (REQ-GOV-004), `Volver al menú principal` (REQ-GOV-005).

#### Scenario: Overlay renders with score and firmas

- GIVEN integrity = 0, score = 150, firmasRecogidas = 8
- WHEN the overlay mounts
- THEN the modal shows `Stage failed`
- AND a numeric display reads `150`
- AND a line reads `Firmas recogidas: 8`
- AND two buttons are visible.

#### Scenario: New-record badge appears

- GIVEN the stored best firmas = 5 and the current run has firmas = 8
- WHEN the overlay mounts
- THEN the badge `¡NUEVO RÉCORD!` is visible next to the score.

#### Scenario: Overlay full-width on small viewport

- GIVEN the viewport is `400 × 800`
- WHEN the overlay mounts
- THEN the modal is `368 × 320 px` (400 - 32 margins)
- AND the buttons fit inside the modal width.

### REQ-GOV-003: Best-score write on game over

The system SHALL NOT write the best-score entry on game over (per `proposal.md` §3 — best score is updated on victory only; F3 does not ship stage progression, so losing does not beat the best). If a stored best is present, the overlay SHALL display it read-only. If no stored best exists, the overlay SHALL display `Mejor: —` (em-dash).

#### Scenario: Game over does not write best

- GIVEN integrity = 0 and the current run has firmas = 12
- WHEN the overlay mounts
- THEN `localStorage.getItem("zarra2d:best:test_level")` is NOT modified
- AND the displayed `Mejor:` value is the previously stored best (or `—` if none).

#### Scenario: No stored best shows em-dash

- GIVEN `localStorage.getItem("zarra2d:best:test_level")` returns `null`
- WHEN the overlay mounts
- THEN the overlay shows `Mejor: —`.

### REQ-GOV-004: Reintentar test level

Activating `Reintentar test level` SHALL reset the run state without leaving the test-level scene:
- `integrity` → `{ current: 3, max: 3 }`.
- `score` → `0`.
- `firmasRecogidas` → `0`.
- All 12 enemies respawn at their test-fixture iso positions with full HP.
- `RailCamera.setTime(0)` is invoked.
- The projectile manager clears all in-flight papeletas.
- The overlay hides; the simulation resumes.

#### Scenario: Reintentar restores a clean run

- GIVEN the game-over overlay is visible (integrity = 0, score = 150, firmas = 8)
- WHEN the user activates `Reintentar test level`
- THEN integrity = 3, score = 0, firmas = 0
- AND `__gameTestAPI__.readEnemies()` returns 12 live enemies at the fixture positions (all `state === "alive"`).
- AND `RailCamera.getTime() === 0`.
- AND the overlay's `display` becomes `none`.

### REQ-GOV-005: Volver al menú principal

Activating `Volver al menú principal` SHALL hide the game-over overlay, return to the main menu (see `main-menu` REQ-MNU-007), and reset the simulation state to a pre-run baseline (the main menu owns the boot; the test-level scene is unmounted). The `Mejor:` value displayed in the main menu SHALL reflect the stored best score (read-only at this point).

#### Scenario: Volver returns to main menu

- GIVEN the game-over overlay is visible
- WHEN the user activates `Volver al menú principal`
- THEN the game-over overlay's `display` becomes `none`
- AND the main menu's `display` becomes visible
- AND focus is on `Iniciar test level`
- AND the test-level scene is unmounted (no enemies in `__gameTestAPI__.readEnemies()`).

### REQ-GOV-006: Overlay z-index and HUD interaction

The game-over overlay SHALL have a z-index strictly greater than the integrity HUD's z-index so that on overlap (e.g., narrow viewports), the overlay sits above the HUD. The HUD itself SHALL still render (not be hidden) behind the overlay — the dim effect is on the world layer, not the HUD. The HUD segments SHALL remain visually consistent with integrity = 0 (all gray) so the user sees the cause.

#### Scenario: Overlay sits above HUD

- GIVEN the overlay is visible at viewport `400 × 800`
- WHEN the overlay mounts
- THEN the overlay's z-index > HUD's z-index (CSS-defined order)
- AND the HUD is still in the DOM with all 3 segments dark gray.

## Out of scope

- Animated transition into the overlay (e.g., slow fade-in over 1 second) — out. The overlay snaps in immediately on `integrity:exhausted`.
- Retry-with-one-less-integrity (Permadeath toggle) — out.
- "Stage failed" copy variations per archetype that caused the loss — out. F3 always shows `Stage failed`.
- Per-archetype destruction animations on the overlay itself — out. The 200 ms tint flash (REQ-ENM-004) is the only destruction visual.