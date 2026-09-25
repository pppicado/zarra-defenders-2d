# Design — Fase 4 Audio

## Architecture

Three modules under `src/audio/`:

```
audio-context.js   — singleton + master gain + deferred-unlock subscription
music.js            — MusicEngine class with start/stop/pause/resume + tempo map
sfx.js              — SFXEngine class with play(name) dispatching to 8 effects
```

Plus wire in `src/main.js`:

```
busOn('combat:fire',         () => sfx.play('fire'))
busOn('combat:hit',          () => sfx.play('hit'))
busOn('enemy:destroyed',     () => sfx.play('card'))
busOn('menu:*',              () => sfx.play('click'))
busOn('stage:finaleStarted', () => sfx.play('transition'))
busOn('integrity:exhausted', () => { sfx.play('gameover'); music.stop() })
busOn('stage:cleared',       () => { sfx.play('victory'); music.stop() })
busOn('zarra:desactivacion', () => sfx.play('error'))
```

Plus per-stage music start in `bootTestLevel`:

```js
if (bg && bg.stageId) musicEngine.start(bg.stageId)
```

## Music synthesis details

**Voices**:
1. **Dulzaina (lead)**: 2 oscillators (square + saw at 1.005 detune) -> bandpass
   filter (Q=5, center 1500Hz) -> gain envelope (attack 8ms, decay 80ms, sustain
   0.12, release 100ms). Sol mayor scale.
2. **Bass (percusivo)**: triangle -> lowpass 800Hz -> gain envelope (attack 5ms,
   exp decay 200ms). Alterna G2 (98Hz) y D3 (146.83Hz) en tiempos fuertes.
3. **Palillos (castañuelas)**: white noise buffer -> highpass 5000Hz -> very brief
   gain envelope (1ms attack, 40ms exp decay). En beats 2, 5, 8, 11, 14, 17, 20, 23.

**Melody**: 24 beats (8 bars × 3/4), hardcoded en `LEAD_MELODY` (in G major).
First and last note are G4 to ensure seamless looping.

**Tempo per stage** (BPM):
- stage1-lashoyas: 110
- stage2-lahoz: 118
- stage3-lahunde: 124
- stage4-ayora: 130
- stage5-acuifero: 138

The lookup uses a prefix-matching helper `tempoForStageId(stageId)` because
`bg.stageId` returns the toponymic form (`stage1-lashoyas`) while the original
ROADMAP §4.1 spec used the short form (`stage1`).

**Loop scheduling**: `setInterval` every 80ms checks a 0.25s lookahead window and
schedules any beats that fall within. Standard Web Audio lookahead pattern.

## AudioContext deferral

`audio-context.js` exposes `onAudioUnlock(fn)` — listeners fire when the context
is first created. MusicEngine subscribes in `start()` so any `start()` call
before user gesture queues `_pendingStart`, and `_flushPendingStart()` runs
when the gesture fires.

```js
start(stageId) {
  // ... validations ...
  this._pendingStart = stageId
  const ctx = ensureAudioContext()
  if (!ctx) {
    if (!this._unsubUnlock) {
      this._unsubUnlock = onAudioUnlock(() => this._flushPendingStart())
    }
    return
  }
  this._flushPendingStart()
}
```

`main.js` adds two pointerdown/keydown handlers that call `_unlockAudioIfNeeded()`
to create the context lazily on first user gesture.

## SFX synthesis details

8 effects, each a small synthesis function:
- `fire`: 0.08s white noise (highpass 2kHz) + sine sweep 1200→400Hz (attack 5ms)
- `hit`: sine 420→80Hz (exp 180ms) + 0.06s noise (lowpass 1.5kHz)
- `card`: 3 triangle oscillators C5→E5→G5 (arpegio do-mi-sol) at 70ms intervals
- `gameover`: 2 sine oscillators E4 + F4 (segunda menor) with 1s sustain + 0.6s fade
- `victory`: 4 square oscillators C5-E5-G5-C5 through bandpass 1500Hz
- `click`: 30ms sine at 100Hz
- `transition`: 0.6s white noise through lowpass sweep 200→2200Hz (crescendo)
- `error`: 2 sawtooth 220→110Hz + 233→116Hz (disonant descent)

## Volume / mute UX

- `[` / `]` adjusts master volume ±0.1 (clamped [0, 1])
- `M` toggles mute (preserves volume value, just gates output to 0)
- `#audio-toast` shows `🔊 Vol N%` or `🔇 Mute` for 900ms on each change
