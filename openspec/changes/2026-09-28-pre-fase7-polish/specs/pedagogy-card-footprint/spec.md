# Spec — Pedagogy Card Compact Footprint + Stacking

This delta spec captures the pedagogy card + modal-intermedio compact
footprint and stacking behavior as of F3.5.4 (2026-09-28).

## Purpose

Make the pedagogy card and the firmas modal-intermedio feel like a unified
pair of compact UI elements positioned to the right of the hand sprite, not
two unrelated overlays at different screen positions.

## Requirements

### Requirement: Card compact footprint

The `#pedagogy-card` MUST have a compact footprint matching the 3-hearts
visual height. Concretely:
- `width: clamp(220px, 30vw, 320px)`
- `height: clamp(80px, 9vw, 110px)`
- `padding: 8px 12px`
- Anchored `bottom: 16px; right: 16px`

#### Scenario: Card at 1280×720 viewport

`clamp(80, 103.68, 110)` = 103.68px height. Comparable to the 3-hearts
visual footprint. Player perceives them as a paired pair.

#### Scenario: Card at 320×568 viewport

`clamp(80, 28.8, 110)` = 80px height. Compact but readable.

### Requirement: Card collapses by default, expands on click

In the collapsed state, only the title (1 line) and description (1 line)
are visible. The dato, fuente, TTS button, and footer are hidden
(`visibility: hidden`, `height: 0`, `max-height: 0`).

When the player clicks anywhere on the card body (not the close button, not
the source link, not the TTS button), the card toggles to expanded state.

In the expanded state, the height becomes `auto`, `max-height: calc(100dvh - 48px)`,
and all content becomes visible. The cursor changes to `default` (not
`pointer`).

#### Scenario: Player taps the card

After tapping, the card expands. The game pauses (gameplay → paused state).
The TTS button is now visible and clickable.

#### Scenario: Player taps the card again

The card collapses. If the pause was initiated by the card click
(`_pausedByCard === true`), the game auto-resumes.

### Requirement: Modal stackes above card when both visible

When the modal-intermedio and the pedagogy card are both visible
simultaneously, the modal MUST apply a `.stacked` CSS class that shifts it
up by the card's height plus a gap:

```css
#modal-intermedio.stacked {
  bottom: calc(clamp(80px, 9vw, 110px) + 24px);
}
```

The 24px is the card's own `bottom: 16px` plus an 8px visual gap.

#### Scenario: Player kills 5 enemies and modal triggers

If the card from enemy #4 is still on screen when enemy #5 is killed and
the modal triggers (every 5 hits), the modal MUST stack above the card.
They MUST NOT overlap.

#### Scenario: Card dismissed before modal triggers

If the player dismisses the card before the modal triggers, the modal
MUST return to the standard `bottom: 16px` position. The `.stacked`
class is removed.

### Requirement: Stack state propagates via event bus

`ModalIntermedio` MUST subscribe to the `pedagogy:visibility` event from
the event bus. When the event fires with `visible: true`, the modal applies
the `.stacked` class. When `visible: false`, it removes it.

`PedagogyCards` MUST emit `pedagogy:visibility` whenever its visibility
state changes:
- `show()` → emit `{ visible: true, expanded: false }`
- `_toggleExpand()` → emit `{ visible: true, expanded: true/false }`
- `hide()` → emit `{ visible: false, expanded: false }`

#### Scenario: Modal instantiated after card already visible

If a `ModalIntermedio` instance is created AFTER a `PedagogyCards`
instance has already shown a card, the new modal MUST seed its stacked
state from the current DOM. Implementation: `_peekCardVisibleFromDom()`
checks `document.getElementById('pedagogy-card').classList.contains('hidden')`.

### Requirement: Modal-intermedio message truncates with ellipsis

The `#modal-intermedio .modal-intermedio-mensaje` MUST have:
- `white-space: nowrap`
- `overflow: hidden`
- `text-overflow: ellipsis`

Same for `.modal-intermedio-subtitulo`.

#### Scenario: Modal triggers with long message

When the triggered message is longer than the card width allows, the
excess text is truncated with an ellipsis. The full text is NOT
expandable (the modal is dismiss-only by design — the data is
reinforcement, not new info).

### Requirement: Card listener leak fix

`PedagogyCards._render()` MUST remove the previous click listener before
adding a new one. Implementation: store the handler reference in
`_rootClickHandler` and `removeEventListener` before each `addEventListener`.

#### Scenario: Player destroys 3 enemies in quick succession

Three card renders fire. Three click handlers are added to `this.root`.
Without the fix, each click on the card body fires all 3 handlers, calling
`_toggleExpand()` 3 times. The expansion toggles 3 times back to starting
state — the player perceives the click as a no-op.

With the fix, only the latest handler is bound. Each click fires once.

## Acceptance

- `tests/e2e/pedagogy-card-position.spec.mjs`: 29 asserts
  - Compact footprint height matches clamp range
  - Bottom-right anchor (right gap ≤ 32px, bottom gap ≤ 32px)
  - No overlap with hearts (bottom-left) — `card.right < hearts.x`
  - Expand on click (dato/fuente/TTS/footer visible)
  - Collapse on second click (auto-resume)
  - Stacking: modal above card with 8px gap when both visible
  - Modal returns to `bottom: 16px` when card hidden
- `tests/e2e/pedagogy-cards.spec.mjs`: still PASS (no regression on
  card content / source link / close button)
- `tests/e2e/modal-intermedio.spec.mjs`: still PASS (no regression on
  trigger / auto-dismiss / stacking)

## References

- `src/pedagogy/cards.js` — `_expanded` state, `_toggleExpand()`,
  `_render()` listener cleanup, `pedagogy:visibility` emit
- `src/pedagogy/modal-intermedio.js` — `pedagogy:visibility` subscribe,
  `_applyStackedClass()`, `_peekCardVisibleFromDom()`
- `styles/main.css` — `#pedagogy-card` clamp() footprint + `.expanded`
  variant, `#modal-intermedio.stacked`
- Commit `0dc4b05 feat(pedagogy): F3.5.4 compact card+modal at hand's right`
