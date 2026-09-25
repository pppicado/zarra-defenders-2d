# Tasks — Fase 5 Accesibilidad + Sharing

## Implementation

### 5.1 TTS accesibilidad
- [x] Create `src/accessibility/tts.js` with TTSEngine (speak/cancel/rate/voice/enabled/load/save)
- [x] Persist to localStorage `zarra2d:settings:tts`
- [x] Add "🔊 Escuchar" button to pedagogy cards (`src/pedagogy/cards.js`)
- [x] Wire `tts: ttsEngine` option in PedagogyCards constructor
- [x] Add TTS toggle + rate slider + voice select + test button to pause menu panel

### 5.2 Alto contraste
- [x] Create `src/accessibility/contrast.js` with ContrastEngine (setEnabled/toggle/load/save)
- [x] Persist to localStorage `zarra2d:settings:contrast`
- [x] CSS `.contrast-high` class with WCAG AAA palette
- [x] Override CSS for: menu, pause, overlay, biblioteca, data-screen, final-screen, disclaimer
- [x] Add contrast toggle to pause menu panel

### 5.3 Reduced motion
- [x] Create `src/accessibility/reduced-motion.js` with MotionEngine
- [x] matchMedia('(prefers-reduced-motion: reduce)') detection
- [x] User override (null|true|false) via pause menu toggle
- [x] Persist to localStorage `zarra2d:settings:motion`
- [x] CSS `@media (prefers-reduced-motion: reduce)` + `.reduced-motion` class
- [x] Disable parallax, sine flutter, screen shake, animations when active
- [x] Sets `window.__zrReducedMotion` global for other modules
- [x] Add motion toggle to pause menu panel

### 5.4 Sharing
- [x] Create `src/sharing/share.js` with ShareEngine
- [x] buildShareText / buildShareUrl with `?ref=<base64>`
- [x] encodeRef/decodeRef roundtrip with `{firmas, score, stageId}`
- [x] openTwitter + openFacebook via window.open
- [x] copyToClipboard with navigator.clipboard + execCommand fallback
- [x] nativeShare via navigator.share when available
- [x] Add share block to victory overlay (4 buttons: Twitter / FB / Copiar / Native)
- [x] Add STRINGS.share to `src/i18n/es.js` (template, intent URLs, hint, copyOk/Fail, shareOk)
- [x] Wire `populateShare(scoreData, stageId)` in main.js on `stage:cleared`

### Pause menu integration
- [x] Add `tts` / `contrast` / `motion` opts to PauseOverlay constructor
- [x] Show "Ajustes de accesibilidad" button (4th) when any engine provided
- [x] Collapsible panel with per-engine rows + status messages
- [x] CSS for `.pause-a11y-panel`, `.pause-a11y-row`, etc.

## Tests

- [x] Unit test: 19 tests for TTSEngine (accessibility-tts.spec.mjs)
- [x] Unit test: 13 tests for ContrastEngine (accessibility-contrast.spec.mjs)
- [x] Unit test: 16 tests for MotionEngine (accessibility-motion.spec.mjs)
- [x] Unit test: 19 tests for ShareEngine (sharing-share.spec.mjs)
- [x] E2E smoke: pause menu shows settings panel, victory overlay shows share buttons
- [x] 0 console errors during full flow

## Documentation

- [x] Update MANUAL_PLAYTHROUGH §20 with a11y + sharing verification steps
- [x] Update ROADMAP.md Fase 5 status to Cerrada
