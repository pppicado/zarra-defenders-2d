# `victory-flow` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: victory-flow (NEW)

## Purpose

Define the contract for the victory overlay shown when all 12 test-level enemies are destroyed AND the rail camera reaches the end of the rail. The overlay SHALL mirror the game-over shape (REQ-GOV-002) with positive copy, SHALL write the best-score entry on mount (see `best-score`), and SHALL offer the same two buttons (`Reintentar test level`, `Volver al menú principal`).

## Requirements

### REQ-VIC-001: Trigger conditions

The victory overlay SHALL mount when BOTH of the following hold:
1. `__gameTestAPI__.readEnemies()` returns an empty active list (zero enemies with `state === "alive"` or `state === "destroyed"` waiting out their 200 ms — both conditions are acceptable; the moment the last `enemy:destroyed` event fires is the moment of truth).
2. `RailCamera.getTime()` >= `RAIL_END_TIME` (the end of the deterministic 60-second test rail).

The system SHALL evaluate these conditions on every tick after `combat-core` has processed the latest events. The victory overlay SHALL be the ONLY terminal overlay in the victory path — `integrity:exhausted` SHALL NOT fire in this path (see `player-integrity` REQ-INT-003).

#### Scenario: All enemies destroyed + camera at end triggers victory

- GIVEN integrity = 3, all 12 enemies are in `destroyed` state and the 200 ms window has elapsed, `RailCamera.getTime() === 60.0`
- WHEN the next tick processes
- THEN the victory overlay mounts
- AND `integrity:exhausted` does NOT fire.

#### Scenario: All enemies destroyed but camera mid-rail — victory does NOT mount

- GIVEN all enemies are destroyed but `RailCamera.getTime() === 30.0` (mid-rail)
- WHEN the next tick processes
- THEN the victory overlay does NOT mount
- AND the simulation continues (the user can still fire papeletas into the empty field; they are misses).

#### Scenario: Camera at end but some enemies alive — victory does NOT mount

- GIVEN `RailCamera.getTime() === 60.0` but 3 enemies remain alive
- WHEN the next tick processes
- THEN the victory overlay does NOT mount
- AND the simulation continues (the camera is halted at the rail end; the user must destroy the remaining 3).

### REQ-VIC-002: Overlay content

The overlay SHALL be the same modal shape as `game-over-flow` REQ-GOV-002 (`480×320 px` on desktop, full-width with margins on mobile), with the following content:
- Title: `Stage cleared` (positive copy; the rest of the layout mirrors game-over exactly).
- Final score: large numeric display.
- `Firmas recogidas: N` line.
- Best-score line with new-record badge `¡NUEVO RÉCORD!` if applicable (see REQ-VIC-003).
- Two buttons: `Reintentar test level`, `Volver al menú principal`.

#### Scenario: Victory modal renders

- GIVEN the victory trigger fires with score = 240, firmas = 12
- WHEN the overlay mounts
- THEN the title reads `Stage cleared`
- AND a numeric display reads `240`
- AND a line reads `Firmas recogidas: 12`.

### REQ-VIC-003: Best-score write on victory

The system SHALL write the current run's score and firmas to `localStorage` under key `zarra2d:best:test_level` (see `best-score` REQ-BSC-002) when the victory overlay mounts. The payload SHALL be `{ score, firmas, date }` where `date` is the ISO 8601 timestamp at the moment of writing. If `localStorage` is unavailable, the write is silently dropped (no crash, no retry, no UI error — per `best-score` REQ-BSC-004).

#### Scenario: Victory writes best score

- GIVEN the current run has score = 240, firmas = 12
- WHEN the victory overlay mounts
- THEN `localStorage.getItem("zarra2d:best:test_level")` returns a JSON string with `{ score: 240, firmas: 12, date: "<ISO>" }`.

#### Scenario: localStorage failure is silent

- GIVEN `localStorage.setItem` throws (e.g., quota exceeded or private mode)
- WHEN the victory overlay mounts
- THEN no exception propagates to the user
- AND no console error is logged (or, if logged, it is `console.warn` not `console.error`)
- AND the overlay still renders normally.

#### Scenario: New-record badge appears

- GIVEN the stored best has firmas = 5 and the current run has firmas = 12
- WHEN the overlay mounts
- THEN the badge `¡NUEVO RÉCORD!` is visible next to the score
- AND `localStorage` is updated to reflect the new best.

### REQ-VIC-004: Reintentar test level (mirror of game-over)

Activating `Reintentar test level` on the victory overlay SHALL behave identically to `game-over-flow` REQ-GOV-004: integrity = 3, score = 0, firmas = 0, all 12 enemies respawn at fixture positions, `RailCamera.setTime(0)`, projectiles cleared, overlay hides, simulation resumes.

#### Scenario: Reintentar from victory

- GIVEN the victory overlay is visible (integrity = 3, score = 240, firmas = 12)
- WHEN the user activates `Reintentar test level`
- THEN integrity = 3, score = 0, firmas = 0
- AND `__gameTestAPI__.readEnemies()` returns 12 live enemies
- AND `RailCamera.getTime() === 0`
- AND the overlay's `display` becomes `none`.

### REQ-VIC-005: Volver al menú principal (mirror of game-over)

Activating `Volver al menú principal` on the victory overlay SHALL behave identically to `game-over-flow` REQ-GOV-005: overlay hides, main menu shows, test-level scene unmounts, focus on `Iniciar test level`.

#### Scenario: Volver from victory

- GIVEN the victory overlay is visible
- WHEN the user activates `Volver al menú principal`
- THEN the main menu's display becomes visible with focus on `Iniciar test level`
- AND the test-level scene is unmounted.

### REQ-VIC-006: Camera state on victory

When the victory overlay mounts, the system SHALL halt the camera (same mechanism as `game-over-flow` REQ-GOV-001). The camera SHALL remain halted while the overlay is visible; the world layer SHALL be dimmed.

#### Scenario: Camera halts on victory

- GIVEN the victory trigger fires
- WHEN the overlay mounts
- THEN `RailCamera.getTime()` is frozen at its current value
- AND the world layer is dimmed (opacity ≤ 0.5).

## Out of scope

- Multi-stage progression (Stage 2, Stage 3, …) — F4+. F3 victory ends the test level.
- Bonus score for remaining integrity — out. F3 awards no bonus; score is purely hit-based.
- High-score leaderboard (global) — out. Best score is local to the browser via `localStorage`.
- Animated overlay transition (e.g., confetti, slow fade) — out.