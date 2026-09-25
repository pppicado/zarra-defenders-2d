# Proposal — Fase 4 Audio (jota regional + SFX)

## Intent

Give Zarra Defenders 2D sonic identity aligned with the Valle de Ayora-Cofrentes
region: a procedurally synthesized jota valenciana/castellana for gameplay music
plus 8 distinct SFX (fire, hit, card, gameover, victory, click, transition, error).
ROADMAP §4.1 (music) + §4.2 (SFX). T-shirt: L (~400 LOC). Priority: Should.

## Scope

In scope:
- `src/audio/audio-context.js` — AudioContext singleton + master gain + onAudioUnlock
  (defer pattern for autoplay policy).
- `src/audio/music.js` — `MusicEngine` class synthesizing jota with Web Audio API.
  3 voices: dulzaina lead (square + saw + bandpass), triangle bass, noise palillos.
  Loop 24 beats seamless G4->G4. Per-stage tempo 110/118/124/130/138 BPM.
  Silent stages: menu / data / final / gameover (3D-project rule).
- `src/audio/sfx.js` — `SFXEngine` class with `play(name)` for 8 effects.
- `music_raw/` — 6 reference jotas/tonadas from Archivo sonoro Diputación de
  Valencia (Wikimedia Commons, CC BY-SA 4.0). Used as aesthetic reference, NOT
  decoded at runtime.
- Wire in `src/main.js` — events: combat:fire/hit, enemy:destroyed, menu:*,
  integrity:exhausted, stage:cleared, zarra:desactivacion. Shortcuts `[`/`]`/`M`.
  `#audio-toast` for volume feedback.
- Accessibility hooks: respects `__zrReducedMotion` global (mute sine flutter).

Out of scope:
- Suno Pro integration (ROADMAP §4.3, optional XL, deferred).
- Recorded SFX (the plan is procedural-only).

## Approach

All audio is procedural Web Audio API. No external samples. Music is composed
in Sol mayor (key signature for dulzaina), tempo-tied to stage progression.

The 6 reference OGGs in `music_raw/` provide genre parameters (3/4 time,
~130 BPM, instrumentation: dulzaina + guitar + castanets) but the actual
synthesized melody is composed in code rather than decoded from the recordings —
DSP analysis tools (ffmpeg/scipy/librosa) were not installed in this session.

AudioContext creation is deferred to the first user gesture (autoplay policy).
MusicEngine subscribes via `onAudioUnlock()` so any start() call before the
gesture waits until the gesture fires, then schedules the loop.

## Acceptance

- Music plays during gameplay, silent during menu/data/final/gameover
- 8 SFX trigger correctly with distinguishable timbres
- Master volume `[` / `]` adjusts ±10%; `M` toggles mute
- 30 unit tests PASS (15 music + 15 sfx)
- 9/9 e2e scenarios PASS
- verify.sh 8/8
- 0 console errors in headless gameplay

## Risks

- **Autoplay policy**: browser blocks AudioContext creation until user gesture.
  Mitigation: `onAudioUnlock` subscription pattern in audio-context.js.
- **Different browsers have different Speech/Voice lists**: TTS voice selection
  falls back es-ES → es-* → default. (Applies to F5.1, not F4.)
- **Tonal quality**: procedural synthesis may not sound "regional" enough to a
  Valencian ear. Mitigation: music_raw/ provides reference OGGs for future
  asset replacement.
