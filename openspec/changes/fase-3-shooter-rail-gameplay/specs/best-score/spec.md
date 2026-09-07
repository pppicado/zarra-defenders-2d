# `best-score` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: best-score (NEW)

## Purpose

Define the localStorage-backed best-score persistence contract for the test level. The system SHALL write the best score under `zarra2d:best:test_level` on victory only (never on game over — F3 does not ship stage progression), SHALL read it on test-level start to display in the main menu, and SHALL degrade silently if `localStorage` is unavailable or the stored value is corrupt.

## Requirements

### REQ-BSC-001: localStorage key and schema

The key SHALL be exactly `zarra2d:best:test_level` (lowercase, scoped, kebab-free, with colons as separators). The value SHALL be a JSON-encoded object with the shape `{ score: number, firmas: number, date: string /* ISO 8601 */ }`. Missing fields SHALL be treated as a parse failure (see REQ-BSC-004). The `date` field SHALL be an ISO 8601 timestamp captured at the moment of writing.

#### Scenario: Key is exactly the locked string

- GIVEN the main menu is visible
- WHEN a Playwright test reads `localStorage.key(0)` (or equivalent)
- THEN the value is `zarra2d:best:test_level`.

#### Scenario: Stored value matches schema

- GIVEN a victory with score = 240, firmas = 12, captured at `2026-09-07T13:30:00Z`
- WHEN the value is written
- THEN `localStorage.getItem("zarra2d:best:test_level")` returns a JSON string parseable as `{ score: 240, firmas: 12, date: "2026-09-07T13:30:00Z" }`.

### REQ-BSC-002: Write on victory only

The system SHALL write the best-score entry only when the victory overlay mounts (see `victory-flow` REQ-VIC-003). The system SHALL NOT write on game over (see `game-over-flow` REQ-GOV-003). On each write, the system SHALL compare the new run's `firmas` against the stored best: if `firmas > stored.firmas` (strictly greater), the entry is overwritten; otherwise, the entry is left unchanged. Tie-breaks use `firmas` first; if firmas tie, the higher `score` wins; if both tie, the entry is left unchanged.

#### Scenario: New best overwrites old

- GIVEN the stored best has firmas = 5, score = 100
- WHEN a victory with firmas = 12, score = 240 mounts
- THEN the stored entry becomes `{ score: 240, firmas: 12, date: "<new ISO>" }`.

#### Scenario: Lower firmas does not overwrite

- GIVEN the stored best has firmas = 10
- WHEN a victory with firmas = 8 mounts
- THEN the stored entry is unchanged
- AND the new victory's payload is dropped.

#### Scenario: Tie on firmas, higher score wins

- GIVEN the stored best has firmas = 8, score = 200
- WHEN a victory with firmas = 8, score = 180 mounts
- THEN the stored entry is unchanged (lower score on tie).

#### Scenario: Tie on both keeps original

- GIVEN the stored best has firmas = 10, score = 200, date = `2026-09-01T...`
- WHEN a victory with firmas = 10, score = 200 mounts
- THEN the stored entry's `date` is unchanged (no overwrite).

### REQ-BSC-003: Read on main menu

The system SHALL read `zarra2d:best:test_level` when the main menu mounts. If the entry exists and parses cleanly, the main menu SHALL display `Mejor: N firmas` (where `N = best.firmas`) below or beside the button stack — placement MAY be subtle; the load-bearing contract is that the value is visible. If the entry is missing, corrupt, or `localStorage` is unavailable, the display SHALL be `Mejor: —`.

#### Scenario: Main menu shows stored best

- GIVEN `localStorage.getItem("zarra2d:best:test_level")` returns `{ firmas: 8, ... }`
- WHEN the main menu mounts
- THEN the visible text contains `Mejor: 8 firmas`.

#### Scenario: No stored best shows em-dash

- GIVEN `localStorage.getItem(...)` returns `null`
- WHEN the main menu mounts
- THEN the visible text contains `Mejor: —`.

### REQ-BSC-004: Corruption and unavailability fallback

If the stored value fails to parse (invalid JSON, missing fields, wrong types), the system SHALL treat the entry as missing: fall back to `{ score: 0, firmas: 0, date: null }` and overwrite on the next victory. If `localStorage` access throws (private mode, quota exceeded, disabled), the system SHALL catch the error, treat the best as `0 / 0 / null`, and continue without logging a `console.error` (a `console.warn` is acceptable). The system SHALL NOT retry `localStorage` access in a loop — a single attempt per read/write is the contract.

#### Scenario: Corrupt JSON falls back

- GIVEN `localStorage.getItem("zarra2d:best:test_level")` returns `"{ broken json"`
- WHEN the main menu mounts
- THEN `Mejor: —` is displayed (treated as missing)
- AND the next victory overwrites the entry cleanly.

#### Scenario: Missing field falls back

- GIVEN the stored value is `{ "score": 100 }` (no `firmas`, no `date`)
- WHEN the main menu mounts
- THEN `Mejor: —` is displayed (treated as missing).

#### Scenario: localStorage throw is silent

- GIVEN `localStorage.getItem` throws `SecurityError` (private mode)
- WHEN the main menu mounts
- THEN no exception propagates
- AND `Mejor: —` is displayed
- AND no `console.error` fires (a `console.warn` is acceptable).

## Out of scope

- Per-stage best scores — out. F3 ships the test level only; per-Bosque-stage best is F4+.
- Cloud-backed high scores / leaderboards — out. Persistence is local to the browser.
- Migration across key schema changes — out. The key is locked for F3.
- Encryption or obfuscation of the stored value — out. The value is a public game stat.