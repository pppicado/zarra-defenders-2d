# Spec — Audio Engine

This spec defines the audio behavior for Zarra Defenders 2D's gameplay loop
(music + SFX). Phase 4 implementation: 2026-09-24, archived as
`openspec/changes/archive/2026-09-25-fase-4-audio/`.

## Purpose

Provide sonic identity for the game aligned with the Valle de Ayora-Cofrentes
region (jota regional) plus clear, distinguishable sound effects for combat and
UI feedback, all rendered via the Web Audio API (no external samples).

## Requirements

### Requirement: Procedural Jota Music Engine

The game SHALL render background music using a procedurally synthesized jota
valenciana/castellana via the Web Audio API (no external samples).

#### Scenario: Music plays during gameplay

When a stage boots and the player engages with gameplay, the music engine
SHALL schedule notes for the active stage and play them through the master
gain bus.

#### Scenario: Music is silent during non-gameplay screens

The music engine SHALL NOT play when the game is in any of these states:
- main menu
- data screen (pre-stage)
- final screen
- gameover overlay

#### Scenario: Loop is seamless across iterations

When the music loop reaches the end of its 24-beat phrase, the next iteration
SHALD start from the same pitch class as the end (G4 → G4), making the loop
inaudible.

#### Scenario: Tempo varies per stage

The music engine SHALL use these tempos for the 5 stages:
- stage1-lashoyas: 110 BPM
- stage2-lahoz: 118 BPM
- stage3-lahunde: 124 BPM
- stage4-ayora: 130 BPM
- stage5-acuifero: 138 BPM

The faster-tempo-higher-stage progression mirrors the 3D-project pattern
where combat intensity rises with stage progression.

#### Scenario: AudioContext is deferred to first user gesture

The music engine SHALL NOT attempt to create an AudioContext until the first
user gesture (pointerdown or keydown) fires, in compliance with browser
autoplay policies. Pending start requests SHALL be queued and flushed on the
gesture event.

### Requirement: Three Synthesis Voices

The music engine SHALL synthesize 3 distinct voices for jota texture:

1. **Dulzaina lead**: square + saw oscillators (1.005 detune) through a
   bandpass filter (Q=5, center 1500Hz) with a per-note gain envelope.
2. **Triangle bass**: triangle oscillator through lowpass (800Hz) with a
   percussive exp-decay envelope. Alternates G2 / D3 on strong beats.
3. **Palillos (castanets)**: white noise through highpass (5000Hz) with a
   very brief envelope (1ms attack, 40ms decay). Fires on beats 2, 5, 8, 11,
   14, 17, 20, 23.

#### Scenario: Music uses only notes from Sol mayor scale

The melody SHALL use only notes from the G major scale
{G3, A3, B3, C4, D4, E4, F#4, G4, A4, B4, C5, D5, E5, F#5, G5}.

### Requirement: 8 SFX Categories

The SFX engine SHALL expose `play(name)` for exactly 8 named effects:

1. `fire` — short noise burst + bright sine sweep (paper ballot fires)
2. `hit` — descending sine sweep + brief noise
3. `card` — ascending do-mi-sol arpeggio (pedagogy card appears)
4. `gameover` — dissonant minor-second chord with fade out
5. `victory` — short jota fragment in major tonality
6. `click` — brief 100Hz sine 30ms (menu button)
7. `transition` — short instrumental crescendo
8. `error` — descending dissonant tone (ally fired upon)

#### Scenario: Each SFX has a distinct timbre

Each of the 8 SFX SHALL use a unique combination of oscillator types, envelope
shapes, and noise characteristics so they're distinguishable in gameplay.

#### Scenario: Unknown SFX name returns false

`play(invalid_name)` SHALL return false and SHALL NOT throw.

### Requirement: Volume + Mute UX

The game SHALL provide keyboard shortcuts for volume control:

- `M` — toggle master mute (preserves volume value, gates output to 0)
- `[` — decrease master volume by 0.1
- `]` — increase master volume by 0.1

#### Scenario: Volume feedback toast appears

When `[`, `]`, or `M` is pressed, the `#audio-toast` element SHALL display
`🔊 Vol N%` (or `🔇 Mute`) for 900ms, then auto-hide.

#### Scenario: Master volume affects both music and SFX

Setting master volume SHALL scale the music bus and the SFX bus equally.
The music bus and SFX bus are separate GainNodes that both feed into the master
gain.

### Requirement: Pause/Resume Integration

When the pause overlay is visible (gameState === 'paused'), the music engine
SHALL pause scheduling (timer cleared) but SHALL keep `_playing` true so
`resume()` can re-arm the timer.

#### Scenario: Resume continues from beat progress

When resuming, the music engine SHALL continue from where it was — not from
beat 0. This requires the `_nextNoteTime` and `_currentBeat` state to be
preserved across pause/resume.

### Requirement: Game Lifecycle Hooks

The music engine SHALL integrate with the event bus:

- `stage:cleared` — stop music + play victory SFX
- `integrity:exhausted` — stop music + play gameover SFX
- `combat:fire` — play fire SFX
- `combat:hit` — play hit SFX
- `enemy:destroyed` — play card SFX
- `stage:finaleStarted` — play transition SFX
- `zarra:desactivacion` — play error SFX
- `menu:bibliotecaRequested` / `menu:startStage` — play click SFX

## Out of Scope

- Suno Pro integration (ROADMAP §4.3, deferred)
- Decoding the music_raw/*.ogg reference recordings at runtime (the OGGs are
  aesthetic reference only)
- Recorded SFX samples (the plan is procedural-only)
