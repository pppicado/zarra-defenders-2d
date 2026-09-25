# Tasks — Fase 4 Audio

## Implementation

- [x] Create `src/audio/audio-context.js` with AudioContext singleton + master gain
- [x] Add `onAudioUnlock(fn)` subscription pattern in audio-context.js
- [x] Create `src/audio/music.js` with MusicEngine class (start/stop/pause/resume/setVolume/mute)
- [x] Implement dulzaina voice (square + saw + bandpass) in music.js
- [x] Implement triangle bass voice in music.js
- [x] Implement palillos noise voice in music.js
- [x] Implement 24-beat melody in Sol mayor with seamless loop (G4 -> G4)
- [x] Implement per-stage tempo (110/118/124/130/138 BPM) via prefix-matching helper
- [x] Create `src/audio/sfx.js` with SFXEngine class and 8 effects (fire/hit/card/gameover/victory/click/transition/error)
- [x] Wire musicEngine.start(bg.stageId) in bootTestLevel
- [x] Wire busOn handlers for SFX triggers in main.js (combat:fire/hit, enemy:destroyed, menu:*, integrity:exhausted, stage:cleared, zarra:desactivacion)
- [x] Wire musicEngine.stop() on gameover/victory/menu:back
- [x] Wire musicEngine.pause()/resume() in pause overlay (gameState='paused' gating)
- [x] Add `[`/`]`/`M` shortcuts with #audio-toast feedback
- [x] Add `_unlockAudioIfNeeded()` called on first pointerdown/keydown
- [x] Add `<div id="audio-toast">` to index.html
- [x] Add `.audio-toast` CSS to styles/main.css (fade-in animation, hidden state)

## music_raw/ reference content

- [x] Download 6 OGG jotas/tonadas from Wikimedia Commons (Archivo sonoro Diputación de Valencia)
- [x] Verify CC BY-SA 4.0 license + attributions
- [x] Create `music_raw/catalog.html` with `<audio>` per piece + origin/license metadata
- [x] Reference the 6 OGGs as aesthetic inspiration in music.js JSDoc (no runtime decode)

## Tests

- [x] Unit test: 15 tests for MusicEngine (audio-music.spec.mjs)
- [x] Unit test: 15 tests for SFXEngine + audio-context helpers (audio-sfx.spec.mjs)
- [x] E2E test: 9 scenarios for audio flow in gameplay (audio-flow.spec.mjs)
- [x] Headless verification: 0 console errors in `?test=1` flow

## Documentation

- [x] Update MANUAL_PLAYTHROUGH §19 with audio verification steps
- [x] Update ROADMAP.md Fase 4 status to Cerrada
