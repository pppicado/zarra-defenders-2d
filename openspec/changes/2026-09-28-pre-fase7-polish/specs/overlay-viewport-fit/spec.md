# Spec — Overlay Viewport-Fit

This delta spec captures the responsive sizing of the game-over / victory
overlay card as of F3.5.1ter (2026-09-28).

## Purpose

Ensure the overlay card fits in any viewport (down to iPhone SE 320×568)
regardless of whether the share block is visible (victory variant).

## Requirements

### Requirement: Card width is responsive

The `#game-overlay .overlay-card` MUST have `width` set with `clamp()` so
the card scales smoothly between a minimum readable size and a maximum
desktop size.

Current value: `width: clamp(220px, 30vw, 320px)`.

#### Scenario: Card at 320px viewport

On a 320×568 viewport, `clamp(220, 96, 320)` evaluates to `220px`. The card
sits at right: 16px with a 220px width, leaving 84px on the left.

#### Scenario: Card at 1280px viewport

On a 1280×720 viewport, `clamp(220, 384, 320)` evaluates to `320px`. The
card sits at right: 16px with 320px width.

### Requirement: Card padding scales with viewport

The card's `padding` MUST use `clamp()`. Current value:
`padding: clamp(16px, 3vw, 28px)`.

#### Scenario: Tight padding on small viewports

On 320px viewport: `clamp(16, 9.6, 28)` = 16px padding. Tighter for
limited horizontal real estate.

#### Scenario: Comfortable padding on large viewports

On 1280px viewport: `clamp(16, 38.4, 28)` = 28px padding. Comfortable
default.

### Requirement: Card height has a hard backstop

The card MUST have `max-height: calc(100dvh - 32px)` with `100vh` fallback
for browsers without `dvh` support. The card MUST also be `display: flex;
flex-direction: column` with `flex: 0 1 auto; min-height: 0` so the flex
parent can constrain the card's height.

#### Scenario: Tall content in small viewport

When the card content (title + score + firmas + best + share block + 2
buttons) would exceed 100dvh - 32px, the card's max-height kicks in and
the content scrolls internally. The card stays anchored to viewport bounds.

#### Scenario: Browsers without `dvh`

Older browsers without `dvh` use `100vh` (the older viewport-height unit
that doesn't account for mobile browser chrome). The card stays within
viewport bounds even if the content needs to scroll.

### Requirement: Inner elements use `clamp()` for responsive sizing

The card's title, paragraph text, gap, and buttons MUST all use `clamp()`
for font-size and gap. Current values:
- Title: `font-size: clamp(1.25rem, 4.5vw, 1.8rem)`
- Body text: `font-size: clamp(0.85rem, 2.2vw, 1rem)`
- Score line: same
- Buttons: `font-size: clamp(0.85rem, 2.2vw, 1rem)`,
  `padding: clamp(8px, 1.8vw, 14px) clamp(14px, 3vw, 20px)`,
  `min-height: clamp(36px, 5.5vw, 48px)`
- Gap between buttons: `clamp(8px, 1.5vw, 12px)`

#### Scenario: Buttons stay tappable on small viewports

At 320×568, buttons are `clamp(36, 17.6, 48)` = 36px tall. WCAG AAA requires
44×44px target size but 36px is the lowest practical for two buttons in
the available space. The buttons remain easily tappable on mobile.

#### Scenario: Text remains readable on large viewports

At 1280×720, body text is `clamp(0.85, 28.16, 1)` = 1rem (16px). Standard
desktop readability.

### Requirement: Card sits inside viewport bounds (vertical + horizontal)

The card's bounding box MUST satisfy:
- `cardRect.top >= 0 AND cardRect.bottom <= viewport.height`
- `cardRect.left >= 0 AND cardRect.right <= viewport.width`

For both the gameover and victory variants (which has the share block).

#### Scenario: Card fits at 320×568

The card and its two action buttons (Reintentar, Volver al menú) MUST all
be inside the 320×568 viewport. Verified by
`tests/e2e/overlay-fits-viewport.spec.mjs`.

#### Scenario: Card fits at 1280×720

Same requirement at desktop resolution. The card stays at right: 16px,
width 320px (clamped max). Bottom-aligned via `align-items: center` on
`#game-overlay`.

## Acceptance

- `tests/e2e/overlay-fits-viewport.spec.mjs`: 24 asserts covering 4
  viewports × 2 variants (gameover + victory+share).
- All 4 viewports tested: 320×568 (iPhone SE), 360×640 (small Android),
  480×900 (Pixel portrait), 1280×720 (desktop).
- Each viewport verifies:
  - `cardRect.top >= 0 AND cardRect.bottom <= viewport.height`
  - `cardRect.left >= 0 AND cardRect.right <= viewport.width`
  - `retry` button inside viewport (clickable)
  - `back` button inside viewport (clickable)

## References

- `styles/main.css` `#game-overlay .overlay-card` and inner elements
- `tests/e2e/overlay-fits-viewport.spec.mjs`
- Commits `e4c0c58 feat(orientation)` (CSS) and `79fe33f test(overlay)`
  (test coverage).
