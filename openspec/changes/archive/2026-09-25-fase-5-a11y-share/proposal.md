# Proposal — Fase 5 Accesibilidad + Sharing

## Intent

Make Zarra Defenders 2D inclusive for low-vision, hearing-impaired, and
motion-sensitive players via Web Speech API, high-contrast palette, and
prefers-reduced-motion respect; enable sharing via Twitter/Facebook/Clipboard/
navigator.share() with a `?ref=<base64>` payload. ROADMAP §5.1 (TTS), §5.2
(high-contrast), §5.3 (reduced motion), §5.4 (sharing). T-shirt: S+S+S+S.

## Scope

In scope:
- `src/accessibility/tts.js` — TTSEngine using `window.speechSynthesis`
  (es-ES voice fallback to es-*). Botón "🔊 Escuchar" en cada card pedagógica.
  Persiste en localStorage `zarra2d:settings:tts`.
- `src/accessibility/contrast.js` — ContrastEngine que aplica `.contrast-high`
  class al `<html>` cuando activa. Paleta dalton WCAG AAA (>7:1 contrast).
  Persiste en localStorage `zarra2d:settings:contrast`.
- `src/accessibility/reduced-motion.js` — MotionEngine que combina OS
  prefers-reduced-motion + override manual. Sets `window.__zrReducedMotion` global
  + `.reduced-motion` class. Persiste en localStorage `zarra2d:settings:motion`.
- `src/sharing/share.js` — ShareEngine con `buildShareText`, `buildShareUrl`,
  `encodeRef`/`decodeRef` (base64 JSON `{firmas, score, stageId}`),
  `openTwitter`, `openFacebook`, `copyToClipboard` (con fallback a
  `document.execCommand('copy')`), `nativeShare` (navigator.share).
- UI en pause menu: panel "Ajustes de accesibilidad" con 4 toggles
  (TTS on/off, TTS rate, alto contraste, reducir movimiento).
- UI en victory overlay: bloque "Comparte tu aportación" con 4 botones
  (Twitter / Facebook / Copiar / Compartir nativo).
- i18n: nuevos strings en `STRINGS.share` (template, intent URLs, hint, copyOk/Fail, shareOk).

Out of scope:
- Full screen reader support (only TTS for cards).
- Custom font sizing (browsers have zoom).
- Translating share template to other languages (es only for now).

## Approach

All 4 sub-phases share the same architectural pattern: a singleton engine
under `src/accessibility/` or `src/sharing/`, with localStorage persistence
under `zarra2d:settings:*` keys, exposed via `window.*Engine` and via opts
injection to the relevant UI components.

Pause menu shows an "Ajustes de accesibilidad" panel (4th button below the
3 action buttons). Victory overlay shows the share block (new DOM element
injected via `populateShare(scoreData, stageId)`).

URL ref encoding:
```
?ref=<base64(JSON.stringify({f:firmas, s:score, st:stageId}))>
```

This is NOT a security boundary — anyone can craft any URL. It's just for
casual sharing context.

## Acceptance

### 5.1 TTS
- ✅ TTSEngine with `speak(text)` working in Chromium
- ✅ Botón "🔊 Escuchar" en cada card pedagógica
- ✅ Voz es-ES con fallback a es-*
- ✅ Toggle on/off + rate 0.5x-2x + selector de voz en pause menu
- ✅ Persiste en localStorage

### 5.2 Alto contraste
- ✅ CSS class `contrast-high` aplica paleta dalton WCAG AAA
- ✅ Toggle en pause menu persiste en localStorage

### 5.3 Reduced motion
- ✅ CSS `@media (prefers-reduced-motion: reduce)` desactiva parallax
- ✅ Override manual via pause menu
- ✅ Window global `__zrReducedMotion` para otros módulos
- ✅ Persiste en localStorage

### 5.4 Sharing
- ✅ Link compartible `?ref=<base64>` con `{firmas, score, stageId}`
- ✅ Texto pre-formateado incluye nombre del stage
- ✅ 4 botones: Twitter, Facebook, Copiar al portapapeles, navigator.share()
- ✅ Sin tracking, sin backend

### Tests
- ✅ 67 tests unit nuevos (19 TTS + 13 contrast + 16 motion + 19 share)
- ✅ verify.sh 8/8 PASS
- ✅ 0 console errors en e2e smoke
