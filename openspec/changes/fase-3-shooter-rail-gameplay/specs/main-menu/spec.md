# `main-menu` Specification

**Change**: fase-3-shooter-rail-gameplay
**Capability**: main-menu (NEW)

## Purpose

Define the contract for the main-menu overlay shown as the first-paint screen in production (no `?test=1`). The menu SHALL offer three vertically-stacked buttons (`Iniciar test level`, `Acerca de`, `Disclaimer`), with full keyboard navigation and tap-friendly mobile targets. Activating `Iniciar test level` SHALL transition to the test-level boot. The menu SHALL also be reachable from the game-over and victory overlays via the `Volver al menú principal` button.

## Requirements

### REQ-MNU-001: Three-button layout

The system SHALL render a vertical stack of three buttons in the center of the viewport:

- Button 1: `Iniciar test level` — activates the test-level boot.
- Button 2: `Acerca de` — opens a modal describing the project's civic-pedagogical context (Valle de Ayora-Cofrentes, TRECO GESTIÓN DE RESIDUOS S.L., Zarra landfill opposition).
- Button 3: `Disclaimer` — opens a modal showing the legal disclaimer text.

Each button SHALL be `280 px` wide and `64 px` tall, with a `16 px` vertical gap between buttons. The stack SHALL be centered horizontally; vertically, the stack center SHALL sit at `60%` of viewport height (slightly below visual center to feel grounded). On viewports narrower than `600 px`, the buttons SHALL span `90%` of viewport width and remain `64 px` tall (touch targets large enough).

#### Scenario: Buttons render in expected layout

- GIVEN the main menu is the first-paint screen
- WHEN the menu renders on a `1920×1080` viewport
- THEN three buttons are visible
- AND button 1 is at the top of the stack, button 3 at the bottom
- AND each is `280 × 64 px`
- AND the gap between buttons is `16 px`.

#### Scenario: Buttons expand on mobile

- GIVEN the viewport is `400 × 800`
- WHEN the menu renders
- THEN each button is `360 px` wide (90% of 400)
- AND the height remains `64 px`.

### REQ-MNU-002: Default selection

On first paint and after returning from game-over / victory, the system SHALL focus `Iniciar test level`. The focus SHALL be visible (e.g., a brighter border or a colored halo around the focused button). Pressing `Enter` while focus is on a button SHALL activate it.

#### Scenario: Iniciar test level has focus on first paint

- GIVEN a fresh page load (no `?test=1`)
- WHEN the menu renders
- THEN the visual focus indicator is on `Iniciar test level`
- AND pressing `Enter` activates the test-level boot.

#### Scenario: Focus returns to Iniciar after returning from game over

- GIVEN the user is on the game-over overlay and clicks `Volver al menú principal`
- WHEN the main menu re-renders
- THEN focus is again on `Iniciar test level`.

### REQ-MNU-003: Keyboard navigation

The system SHALL support keyboard navigation in the main menu: `ArrowUp` / `ArrowDown` move focus between buttons (wrapping top-to-bottom and bottom-to-top); `Enter` activates the focused button; `Escape` is bound to `back` semantics — closes the open modal if `Acerca de` or `Disclaimer` is open, otherwise does nothing (no `back` from the top-level menu). In the modals, `Escape` closes the modal and returns focus to the button that opened it.

#### Scenario: ArrowDown moves focus

- GIVEN focus is on `Iniciar test level`
- WHEN the user presses `ArrowDown`
- THEN focus moves to `Acerca de`.

#### Scenario: Enter activates focused button

- GIVEN focus is on `Disclaimer`
- WHEN the user presses `Enter`
- THEN the Disclaimer modal opens.

#### Scenario: Escape closes modal and restores button focus

- GIVEN the Disclaimer modal is open and focus was on the `Disclaimer` button
- WHEN the user presses `Escape`
- THEN the modal closes
- AND focus returns to the `Disclaimer` button.

#### Scenario: Escape at top-level does nothing

- GIVEN no modal is open and focus is on `Iniciar test level`
- WHEN the user presses `Escape`
- THEN the menu does not change (no `back` from the top-level).

### REQ-MNU-004: Acerca de modal — civic context

The `Acerca de` modal SHALL display a static block of text describing the project's context. Required content (Spanish-language neutral/professional register; equivalent English may be added as a sibling paragraph if the user requests):

- The game's subject: civic opposition to the Zarra macro-landfill project (TRECO GESTIÓN DE RESIDUOS S.L.) in the Valle de Ayora-Cofrentes (Comunidad Valenciana, España).
- The player's role: signing administrative forms (`papeletas`) against the things destroying the valley — a fleet of trucks, a toxic-waste tanker, drones, billboards.
- The technology note: this is a pedagogical prototype; no real signatures are collected; the game does not represent a real legal filing.

The modal SHALL NOT contain the legal disclaimer text (that lives in the `Disclaimer` modal — REQ-MNU-005). The modal SHALL scroll if content exceeds viewport height on small screens.

#### Scenario: Acerca de shows civic context

- GIVEN focus is on `Acerca de`
- WHEN the user presses `Enter` (or taps)
- THEN a modal opens
- AND the modal body text mentions "Valle de Ayora-Cofrentes" (or the equivalent Spanish string)
- AND the modal does NOT contain the legal disclaimer paragraph.

#### Scenario: Acerca de scrolls on small viewport

- GIVEN the viewport is `400 × 600`
- WHEN the modal opens with long content
- THEN the modal body is scrollable
- AND the modal header (close button) remains pinned at the top.

### REQ-MNU-005: Disclaimer modal — legal text

The `Disclaimer` modal SHALL display the legal disclaimer text verbatim from `PLAN.md §16` (the project's canonical legal section). The text SHALL be wrapped in a scrollable container so it remains readable on any viewport. The modal SHALL NOT include the Acerca de civic-context paragraphs (separation of concerns).

#### Scenario: Disclaimer shows legal text from PLAN.md §16

- GIVEN focus is on `Disclaimer`
- WHEN the user activates it
- THEN the modal opens
- AND the modal body text contains every paragraph from `PLAN.md §16` (verified by string match)
- AND the modal body does NOT contain the Acerca de civic-context paragraph.

### REQ-MNU-006: Touch input on mobile

On touch-only devices, the buttons SHALL accept `tap` to activate (no hover state, no double-tap required). Tap targets SHALL be large enough: minimum `64 × 64 px` per button, with `16 px` gap (already locked in REQ-MNU-001). The focus indicator on mobile SHALL be persistent (not hover-dependent) — a colored halo around the focused button even without touch.

#### Scenario: Tap activates button

- GIVEN a touch device with the main menu visible
- WHEN the user taps `Iniciar test level`
- THEN the test-level boot activates (same observable result as keyboard Enter).

#### Scenario: No hover state required

- GIVEN a touch device
- WHEN the user holds a finger on a button without lifting
- THEN no hover state appears (the button does not need a `:hover` selector).

### REQ-MNU-007: Iniciar test level transition

Activating `Iniciar test level` (via Enter, tap, or programmatic dispatch) SHALL hide the main menu, mount the test-level scene (12-enemy fixture, rail camera, integrity HUD, hand sprite), and start the simulation at `t = 0`. The main menu SHALL remain in the DOM (hidden via CSS), so re-entering the menu via `Volver al menú principal` does not require a re-mount.

#### Scenario: Activating Iniciar starts the test level

- GIVEN the main menu is visible and `Iniciar test level` is focused
- WHEN the user presses Enter (or taps)
- THEN the main menu's `display` becomes `none`
- AND the test-level scene mounts (rail camera, tilemap, 12 enemies, hand sprite visible)
- AND `RailCamera.setTime(0)` is invoked (deterministic start).

#### Scenario: Returning to menu preserves main menu DOM

- GIVEN the test level was running and is now paused (game-over overlay shown)
- WHEN the user clicks `Volver al menú principal`
- THEN the main menu's `display` becomes the original `flex` (or block) value
- AND no remount flash occurs (the same DOM nodes are shown, not recreated).

## Out of scope

- Per-level selection (Bosque, Río, Vertedero, Castillo) — F7+. F3 menu only offers the test level.
- Settings (audio controls, language toggle, accessibility options) — F7+.
- Credits screen — F7+.
- Save-game / load-game — out of scope for the project entirely.
- Animated background or theme music on the menu — out.