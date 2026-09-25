# Design — Fase 5 Accesibilidad + Sharing

## Architecture

Four singleton engines, three under `src/accessibility/` (a11y) and one under
`src/sharing/`:

```
accessibility/
├── tts.js              — TTSEngine (Web Speech API)
├── contrast.js         — ContrastEngine (.contrast-high class on <html>)
└── reduced-motion.js   — MotionEngine (window.__zrReducedMotion + .reduced-motion class)
sharing/
└── share.js            — ShareEngine (buildShareText/Url, Twitter/FB/clipboard/native)
```

Plus UI integration:
- `src/ui/pause.js` — new "Ajustes de accesibilidad" panel (4th button)
- `src/ui/overlay.js` — new share block in victory modal
- `src/pedagogy/cards.js` — "🔊 Escuchar" button per card
- `src/main.js` — wire pause menu + overlay with engines
- `src/i18n/es.js` — new STRINGS.share section
- `styles/main.css` — `.contrast-high`, `.reduced-motion`, `.overlay-share`

## TTSEngine design (5.1)

```js
class TTSEngine {
  isAvailable()            // window.speechSynthesis present
  listVoices()             // returns voices, picks es-ES first
  setVoice(name) / getVoice()
  setRate(0.5..2) / getRate()
  setEnabled(bool) / isEnabled() / toggleEnabled()
  speak(text)              // window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  cancel()                 // window.speechSynthesis.cancel()
  load() / save()          // localStorage 'zarra2d:settings:tts'
}
```

Speech parameters: `utter.lang = 'es-ES'`, `utter.rate = this._rate`. Voice
selection priority: configured voice → es-ES → es-* → browser default.

Persistence:
```js
{
  enabled: bool,
  rate: 0.5..2,
  voice: string  // voice.name
}
```

## ContrastEngine design (5.2)

```js
class ContrastEngine {
  isEnabled()              // documentElement.classList.contains('contrast-high')
  setEnabled(bool)         // adds/removes class
  toggle()                 // flip + persist
  load() / save()          // localStorage 'zarra2d:settings:contrast'
}
```

CSS palette (WCAG AAA >7:1 contrast):
```
--bg: #000000
--text: #ffffff
--text-muted: #e5e5e5
--accent: #ffd700
--accent-soft: #fff4b0
--green: #00ff7f
--red: #ff5252
--blue: #00d4ff
```

## MotionEngine design (5.3)

```js
class MotionEngine {
  prefersReducedMotion()   // matchMedia('(prefers-reduced-motion: reduce)').matches
  isOverrideEnabled()      // null|true|false
  isReducedMotionActive()  // override if set, else OS pref
  setOverride(bool|null)
  toggleOverride()
  load() / save()          // localStorage 'zarra2d:settings:motion'
  onChange(handler)
  _publishGlobal()         // sets window.__zrReducedMotion + .reduced-motion class
}
```

## ShareEngine design (5.4)

```js
class ShareEngine {
  buildShareText(scoreData, url)   // STRINGS.share.template with {firmas} and {url}
  buildShareUrl(scoreData)         // base + ?ref=base64
  parseRefFromUrl(search)          // inverse
  encodeRef(scoreData) / decodeRef(encoded)
  openTwitter(text, url)           // window.open to twitter intent
  openFacebook(url)                // window.open to facebook sharer
  copyToClipboard(text)            // navigator.clipboard.writeText with execCommand fallback
  nativeShare({title, text, url})  // navigator.share if available
}
```

Ref payload format (compact):
```js
{ f: firmas, s: score, st: stageId }
// base64(JSON.stringify(payload))
```

## Pause menu wire

`PauseOverlay` constructor accepts `opts.tts`, `opts.contrast`, `opts.motion`.
If any is provided, adds 4th button "Ajustes de accesibilidad" + collapsible
panel with toggle rows.

```js
const pauseOverlay = new PauseOverlay({
  root, camera, gameState,
  tts: ttsEngine,
  contrast: contrastEngine,
  motion: motionEngine,
})
```

## Victory overlay wire

`Overlay` constructor accepts `opts.share`. When `populateShare(scoreData, stageId)`
is called (from main.js on `stage:cleared`), it injects 4 buttons (Twitter / FB /
Copiar / Native) into a `.overlay-share` block, wires onclick handlers, and shows
a status message after each action.

```js
const overlay = new Overlay({
  root, integrity, score, camera, combat, enemies, gameState,
  share: shareEngine,
})
```
