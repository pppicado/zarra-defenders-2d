# Spec — Pause Overlay Orientation Gate

This delta spec captures the behavior of the pause overlay's orientation gate
as of F3.5.1bis (2026-09-28). It augments the existing pause behavior defined
in `openspec/changes/archive/2026-09-08-fase-3-shooter-rail-gameplay/`.

## Purpose

Provide a clear UX signal when the game auto-pauses due to viewport rotation
(portrait), so the player doesn't resume into a viewport where the controls
are mis-calibrated.

## Requirements

### Requirement: PauseOverlay accepts an `auto` flag

`PauseOverlay.show(opts)` MUST accept an optional `opts.auto` boolean. When
`opts.auto === true`, the resulting pause state is marked as auto-pause
(internal field `_autoPaused = true`). When `opts.auto` is omitted or false,
the pause state is marked as manual.

#### Scenario: Esc triggers manual pause

When the user presses Esc during gameplay, the input handler calls
`pauseOverlay.show()` without arguments. The pause state MUST be marked
manual (`_autoPaused === false`).

#### Scenario: Portrait rotation triggers auto-pause

When `syncOrientationAutoPause` detects a portrait viewport during gameplay,
it calls `pauseOverlay.show({ auto: true })`. The pause state MUST be marked
auto (`_autoPaused === true`).

### Requirement: PauseOverlay tracks viewport orientation

`PauseOverlay.setOrientation(isLandscape)` MUST update an internal field
(`_isLandscape`). The method MUST be idempotent — calling it multiple times
with the same value MUST NOT cause side effects.

#### Scenario: Landscape viewport updates orientation

When the player rotates the device back to landscape, `setOrientation(true)`
MUST be called by main.js. The internal `_isLandscape` field MUST be `true`.

#### Scenario: Portrait viewport updates orientation

When the player rotates the device to portrait during gameplay,
`setOrientation(false)` MUST be called. The internal `_isLandscape` field
MUST be `false`.

### Requirement: Orientation gate is active during auto-pause in portrait

When the overlay is visible AND the pause was opened by auto-pause AND the
viewport is still portrait, the gate is active. In that state:

- The `<button data-role="continue">` MUST have `disabled = true`.
- The button MUST have `aria-disabled = "true"` for screen readers.
- A `<p data-role="pause-orient-hint">` element MUST be visible (its
  `hidden` class removed) with text from `STRINGS.pause.rotarMovil`.

#### Scenario: Cold-load in portrait

When the game loads with a portrait viewport (`syncOrientationAutoPause`
runs at bootstrap), the pause overlay opens with `{ auto: true }`, the
continue button is disabled, and the hint is visible.

#### Scenario: Player rotates back to landscape

When the viewport goes landscape, `setOrientation(true)` is called. The
gate becomes inactive: the continue button is enabled, the hint is hidden.
The pause overlay can now be dismissed by clicking continue (or by Esc).

#### Scenario: Player presses Esc during auto-pause in portrait

Esc opens a NEW pause state via `pauseOverlay.show()` without `auto`. The
previous auto-pause state is replaced. The new manual state has
`_autoPaused === false`, so the gate is NOT active — Esc during auto-pause
in portrait switches to manual mode, which allows resume.

(Note: this is intentional. The user's intent — "I want to read the pause
menu" — supersedes the orientation gate.)

### Requirement: Defense-in-depth on `_onContinue()`

`_onContinue()` MUST early-return without hiding the overlay when the
orientation gate is active. This guards against programmatic `.click()`
calls that bypass the DOM `disabled` attribute.

#### Scenario: Programmatic .click() while gated

If a test or external code calls `button.click()` on the continue button
while the gate is active, `_onContinue()` MUST early-return. The overlay
stays visible. The pause state persists. No `ui:overlayHidden` event is
emitted.

### Requirement: Focus management on gate active

When `_focusPrimary()` runs and the continue button is disabled, focus MUST
fall back to the `data-role="back"` button (which is always interactive).

#### Scenario: Tab into the overlay while gated

A keyboard / screen-reader user who tabs into the pause overlay while the
gate is active MUST land on the Back button (which always works) rather
than the disabled Continue button (which would trap them on a no-op).

### Requirement: Unified aspect-ratio predicate

`syncOrientationAutoPause` and `setupOrientationLock` MUST use the same
`w > h` aspect-ratio check (where `w = window.innerWidth`,
`h = window.innerHeight`). Neither should rely solely on
`matchMedia('(orientation: portrait)')`.

#### Scenario: Square viewport (e.g. devtools 1000x1000)

A 1000×1000 viewport MUST be classified as landscape (`w === h` → false,
but the predicate evaluates as `w > h` → false). On such a viewport, no
auto-pause SHOULD fire from `syncOrientationAutoPause`.

(Note: `matchMedia('(orientation: portrait)')` returns `true` on a square
viewport in some browsers. Using only that predicate would produce false
positives. The unified `w > h` check is more conservative.)

## i18n

### Requirement: Hint text in i18n/es.js

`pause.rotarMovil` in `src/i18n/es.js` MUST be `"Girá el móvil para
continuar"`. The hint element MUST read this string at boot via the
existing `i18n-bootstrap.js` pattern.

#### Scenario: Cold-load in Spanish locale

When the game boots with `lang="es-ES"` and a portrait viewport, the
hint element MUST contain `"Girá el móvil para continuar"`.

(Other locales are out of scope — the game ships Spanish-only at v1.)

## Acceptance

- `tests/e2e/orientation-autopause.spec.mjs` extended from 5 to 11 asserts.
- `bash scripts/verify.sh` C2 PASS (zero Spanish prose outside i18n).
- `bash scripts/verify.sh` C1 PASS (STRINGS reference includes
  `pause.rotarMovil`).

## References

- `src/ui/pause.js` `_applyOrientationGate()`, `_onContinue()`,
  `_focusPrimary()`, `show({ auto: true })`, `setOrientation()`.
- `src/main.js` `syncOrientationAutoPause()`.
- `src/i18n/es.js` `pause.rotarMovil`.
- `styles/main.css` `.pause-orient-hint`, `.pause-btn--primary:disabled`.
- Commits `e4c0c58 feat(orientation): F3.5.1bis pause card gate + unified predicate`.
