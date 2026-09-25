# Spec — Accessibility

This spec defines the accessibility behavior for Zarra Defenders 2D (TTS,
high-contrast, reduced-motion). Phase 5 implementation: 2026-09-24, archived as
`openspec/changes/archive/2026-09-25-fase-5-a11y-share/`.

## Purpose

Make the game inclusive for low-vision, hearing-impaired, and motion-sensitive
players while keeping the controls discoverable via the existing pause menu UI.

## Requirements

### Requirement: Text-to-Speech for Pedagogy Cards

The game SHALL expose a TTSEngine using the Web Speech API
(`window.speechSynthesis`).

#### Scenario: Card shows an "Escuchar" button

When a pedagogy card is rendered, an "🔊 Escuchar" button SHALL be visible.

#### Scenario: Clicking the button speaks the card text

Clicking the button SHALL invoke `ttsEngine.speak(title + '. ' + datoTexto)`
through the Web Speech API.

#### Scenario: Spanish voice preferred, fallback to default

`speak(text)` SHALL prefer `lang: 'es-ES'` voice. If unavailable, fall back to
any `es-*` voice. If no Spanish voice found, use the browser default.

#### Scenario: TTS settings persist

The TTS settings (enabled, rate 0.5-2, voice name) SHALL persist to
localStorage `zarra2d:settings:tts`.

#### Scenario: TTS can be disabled globally

When `enabled === false`, `speak(text)` SHALL be a no-op and return false.
The "Reducir movimiento" / "TTS" toggle in the pause menu controls this.

#### Scenario: TTS rate clamped to [0.5, 2.0]

`setRate(rate)` SHALL clamp out-of-range values. `setRate('not-a-number')`
SHALL be ignored.

### Requirement: High-Contrast Mode

The game SHALL provide a high-contrast palette for color-blind and low-vision
players.

#### Scenario: `.contrast-high` class on `<html>`

When the user enables high-contrast in the pause menu, the
`document.documentElement` SHALL have class `contrast-high`.

#### Scenario: WCAG AAA contrast (>7:1)

The contrast palette SHALL provide >7:1 luminance contrast between foreground
text and background surfaces.

#### Scenario: Settings persist

The high-contrast state SHALL persist to localStorage
`zarra2d:settings:contrast`.

### Requirement: Reduced-Motion Respect

The game SHALL respect the OS prefers-reduced-motion media query and allow
manual override.

#### Scenario: OS preference detection

When `matchMedia('(prefers-reduced-motion: reduce)').matches` is true, the
effective reduced-motion state SHALL be true (unless user override is set).

#### Scenario: Manual override

The pause menu SHALL offer a "Reducir movimiento" toggle. When set, it SHALL
override the OS preference. The override SHALL be one of: null (default),
true (force on), false (force off).

#### Scenario: `.reduced-motion` class and global flag

When reduced-motion is active, the game SHALL:
- Add `reduced-motion` class to `<html>`
- Set `window.__zrReducedMotion = true` for other modules to consume

#### Scenario: Disabled animations and parallax

The CSS SHALL disable CSS animations and transitions when `.reduced-motion`
class is on `<html>` (or when the media query matches without override).

#### Scenario: Settings persist

The override value SHALL persist to localStorage
`zarra2d:settings:motion`.

### Requirement: Accessibility Panel in Pause Menu

The pause menu SHALL offer a "Ajustes de accesibilidad" panel when any of the
3 accessibility engines (TTS, contrast, motion) is provided to the PauseOverlay
constructor.

#### Scenario: Panel contains per-engine controls

The panel SHALL contain, for each provided engine, a row with a label and a
toggle/control.

For TTS: enabled toggle, rate slider (0.5-2), voice selector (from available
voices), test button.
For contrast: enabled toggle.
For motion: enabled toggle (label reflects OS pref state when available).

#### Scenario: Each control persists immediately

Each control change SHALL call the engine's `save()` method immediately.

## Out of Scope

- Full screen-reader support (only TTS for cards)
- Custom font sizing
- i18n for accessibility labels
