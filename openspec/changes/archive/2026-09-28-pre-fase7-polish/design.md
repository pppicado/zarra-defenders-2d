# Design: pre-fase7 polish

Architecture decisions for the 4 polish refinements captured in this change.
All 4 are already implemented on `main`; this document records the rationale
behind each design.

## R1 — Pause overlay orientation gate (F3.5.1bis)

### Decision: separate `auto` flag in `show()` instead of a separate module

**Options considered**:
1. New `AutoPauseOverlay` module that wraps `PauseOverlay`.
2. Add `{ auto: boolean }` parameter to `show()`, expose `setOrientation()`.
3. Detect "auto" via callback (`isAutoPauseRequested()` from main).

**Why option 2**: the existing `PauseOverlay` already does everything
(show/hide/focus/callbacks). The auto/manual distinction is a single bit of
state, not a different overlay. Adding `{ auto: true }` to `show()` keeps the
DOM structure, the event listeners, the a11y panel, and the focus management
in one place. It also lets the existing `Esc` and `menu:back` paths keep
working unchanged — they call `show()` without `auto`, so the gate stays off.

### Decision: `_focusPrimary()` falls back to `back` button

When the gate is active, focusing the disabled `continue` button would trap
keyboard / screen-reader users on a no-op. `_focusPrimary()` detects
`btn.disabled` and focuses `back` instead, which is always interactive.
This way, the user can always leave the overlay (via Tab → Enter on Back),
even while waiting for the device to rotate back to landscape.

### Decision: defense-in-depth in `_onContinue()`

`disabled` on a `<button>` blocks user clicks but NOT programmatic
`.click()` calls. To prevent tests or future automation from bypassing the
gate via `.click()`, `_onContinue()` checks `this._visible && this._autoPaused
&& !this._isLandscape` and returns early if gated. Both the DOM attribute
AND the JS check enforce the contract.

### Unified aspect-ratio predicate

`setupOrientationLock` was using `w > h` (CSS-derived) while
`syncOrientationAutoPause` was using `matchMedia('(orientation: portrait)')`.
These can disagree on square-ish devtools viewports (1000×1000 reports
`portrait: true` via matchMedia but `w > h` is false). Both now use `w > h`
via `window.innerWidth/Height` directly, eliminating the divergence.

## R2 — Overlay viewport-fit (F3.5.1ter)

### Decision: `clamp()` over media queries

`@media (max-width: 600px)` was the prior pattern for responsive sizing.
It works but creates a step function (fixed values below 600px, fixed above).
`clamp(min, fluid, max)` scales smoothly between extremes. The fluid term
(e.g. `3vw` for padding) makes the card scale with viewport width.

### Decision: `max-height: calc(100dvh - 32px)` as backstop

`clamp()` can only shrink content so far before text becomes unreadable.
The hard backstop `max-height: calc(100dvh - 32px)` (with `100vh` fallback
for browsers without `dvh`) guarantees the card never overflows the viewport,
even if the content would require more space. Combined with
`overflow: auto` on the card, the content becomes scrollable inside the
card instead of pushing it off-screen.

### `flex` properties on the card

The card lives inside `#game-overlay` (a flex container with `align-items:
center`). Without `flex: 0 1 auto; min-height: 0`, the card would refuse to
shrink below its content height. Setting these properties lets the flex
parent constrain the card to `max-height` while the card scrolls internally.

## R3 — Pedagogy card + modal compact footprint (F3.5.4)

### Decision: compact by default, expand on click

The card has too much content (title + description + dato + fuente + TTS +
footer) to fit in a 96px footprint. Two options:

1. **Compact only**: always show 96px, user must dismiss to read.
2. **Compact + expand**: show 96px, click to expand to full height, click
   again to collapse.

**Why option 2**: the card is the primary pedagogical vehicle. Hiding the
dato behind a dismissable tooltip would force the player to choose between
"playing the game" and "reading the data". Expanding on click lets the
player pause gameplay, read, and resume — which is what the click on the
body was already doing (pausing the game via `gameplay → paused` transition).

### Decision: ellipsis on the modal, full text on the card

The modal-intermedio has different UX requirements than the card:

- **Card**: per-enemy, one at a time. Player clicked it intentionally,
  expanded view is fine.
- **Modal**: every 5 hits, briefly on screen (auto-dismiss 5s), reinforcement
  only. Expanding it would interrupt gameplay for reinforcement data.

So the modal truncates with `text-overflow: ellipsis` (1 line) while the
card expands on click. Same compact footprint visually, different
interaction models.

### Decision: stack via event bus, not direct reference

When the card is visible, the modal needs to shift up so they don't
overlap. Two options:

1. Modal holds a reference to `pedagogyCards` and queries its visibility.
2. Modal subscribes to a `pedagogy:visibility` event from the bus.

**Why option 2**: zero coupling. The card doesn't know the modal exists;
the modal doesn't know the card exists. The event bus is the shared
vocabulary. Adding a third UI element that wants to react to card
visibility (e.g. a notification badge) just listens to the same event.

### Decision: boot-time DOM peek

The event subscription is set up at modal construction. But what if the
modal is constructed AFTER the card was already visible (e.g. test
scenarios, hot-reload)? It would miss the show event. To seed the state,
`ModalIntermedio` constructor peeks at `document.getElementById('pedagogy-card').classList.contains('hidden')`
and applies the stacked class immediately. Try/catch wraps the DOM access
in case the element doesn't exist (test stubs).

### Bug fix: listener leak on every `_render()`

The original `_render()` did:
```js
this.root.innerHTML = `...`  // replaces children, not listeners
this.root.addEventListener('click', handler)  // ADDS without removing
```

After 3 destroys (3 fires on different enemies), there were 3 click
listeners on `this.root`. Each click fired the handler 3 times, calling
`_toggleExpand()` 3 times — toggle returned to its starting value.

Fix: store the handler reference (`this._rootClickHandler`) and
`removeEventListener` before `addEventListener` on every `_render()`.

## R4 — Combat 1-shot-kill + hitbox=sprite + nearest-center (F6.1)

### Decision: hp:1 for all non-boss

The user explicitly asked "todos los enemigos excepto los jefes finales son
destruidos con un solo disparo". The interpretation was unambiguous: any
archetype except `boss` (final boss) → 1 hit.

The question was whether to preserve `multiplier` (and thus score hierarchy).
**Yes** — the visual hierarchy of `tank`/`mini-boss`/`boss` should still
translate to a higher score reward (15 / 20 / 30 pts vs 10 pts standard).
This rewards the player for taking down the bigger threats without making
the kill threshold artificially punitive.

### Decision: `hitInset = 0` over the 16/12/10/8 px system

The prior `hitInset` system shrank the hitbox to avoid transparent-padding
clicks. But the actual problem is that PIXI's `getBounds()` returns the
sprite's post-translate / post-scale / post-anchor AABB, which DOESN'T
include the transparent margin around the visible sprite. The original
inset was a band-aid for a problem that didn't exist once we understood
the math.

Setting `hitInset = 0` makes the hitbox equal the visible sprite bounds
exactly. Lo que ves es lo que golpeás. No more whiffing on the edges of a
moving tank because the next frame's AABB position no longer matches
where you clicked.

### Decision: nearest-center-to-click over depth-desc

When two sprites overlap visually (standard behind tank), the depth-sorted
choice is the *farther* one. From the player's perspective, the closer
sprite is the one they're aiming at, but it's *hidden* behind the farther
one — so the depth-sorted choice picks the *less visible* one.

The fix is to sort by squared distance from the AABB center to the click
point. This is the standard "what you clicked is what you hit" heuristic.
It matches the player's mental model: "I clicked on the tank, I hit the
tank."

**Tie-break chain** (when two AABBs are equidistant from the click point,
which is rare):
1. Nearest center wins (the heuristic above)
2. Depth-desc (preserves legacy rail-front bias for ties)
3. id-asc (stable sort)

## Architecture diagram

```
                event-bus
                    │
       pedagogy:visibility
                    │
        ┌───────────┴───────────┐
        │                       │
  ModalIntermedio         PedagogyCards
  (subscribes)            (emits on
                          show/expand/collapse)
        │                       │
   .stacked CSS           DOM footprint
   bottom: calc(           clamp(80px, 9vw, 110px)
     cardHeight+24px)        + .expanded variant
        │                       │
        └───── both anchored ───┘
              to bottom: 16px, right: 16px
              (stacked: modal above card)
```

```
            _resolveHitAtScreenPoint
                       │
                       ▼
        ┌────────────────────────────┐
        │  for each enemy in _live()  │
        │    if state==='alive':      │
        │      b = getScreenBounds()  │
        │      if click in b:         │
        │        add to candidates    │
        └────────────────────────────┘
                       │
                       ▼
        sort candidates by:
        1. dist²(AABB center, click) asc  ← nearest wins
        2. depth desc                       ← rail-front bias on ties
        3. id asc                           ← stable sort
                       │
                       ▼
                target = candidates[0]
                       │
                       ▼
           target.applyHit(1)  ← 1 damage
                       │
                       ▼
      ARCHETYPES[target.archetype].hp == 1?
                       │
                       ▼
              emit combat:hit (score × multiplier)
                       │
                       ▼
      if hp === 0:  markDestroyed or markDesactivated (lifecycle)
                   emit enemy:destroyed (F1.1 pedagogy card trigger)
```

## References

- `src/enemies.js` ARCHETYPES table (F6.1: hp/hitInset)
- `src/combat.js` `_resolveHitAtScreenPoint` (F6.1: nearest-center)
- `src/ui/pause.js` `_applyOrientationGate()` (F3.5.1bis)
- `src/pedagogy/cards.js` `_toggleExpand()`, listener cleanup (F3.5.4)
- `src/pedagogy/modal-intermedio.js` `pedagogy:visibility` subscribe + DOM peek (F3.5.4)
- `styles/main.css` clamp() patterns across the 4 refinements
