/**
 * src/audio/music.js
 *
 * MusicEngine — procedural Valencian/Castilian jota with the Web Audio API
 * (ROADMAP §4.1 — Phase 4).
 *
 * Aesthetic inspiration: the 6 jotas/tonadas from the Diputacion de Valencia
 * sound archive (Wikimedia Commons, CC BY-SA 4.0) in `music_raw/`. The OGGs
 * are NOT decoded at runtime — the genre (3/4 time, ~130 BPM, dulzaina lead,
 * G major) is reinterpreted with synthesis: square+saw -> bandpass for
 * dulzaina, percussive triangle for bass, filtered noise for palillos
 * (castanets).
 *
 * Tempo per stage (faster in advanced stages):
 *   menu / data / final -> 0 (no music, 3D-project rule)
 *   stage1 -> 110 BPM
 *   stage2 -> 118 BPM
 *   stage3 -> 124 BPM
 *   stage4 -> 130 BPM
 *   stage5 -> 138 BPM
 *
 * Loop: 8 bars x 3/4 = 24 beats, ~11s at 130 BPM. Seamless: the last note of
 * bar 8 (G4) matches the first note of bar 1 (G4).
 *
 * API:
 *   start(stageId)   — start loop for the stage ('menu'|'final' -> silent)
 *   stop()           — fade out 0.4s + stop
 *   pause() / resume()
 *   setVolume(0..1)
 *   mute(bool) / toggleMute()
 *   isPlaying() -> bool
 */
import {
  ensureAudioContext,
  getMusicBus,
  getAudioContext,
  getMasterVolume,
  isMuted,
  onAudioUnlock,
} from './audio-context.js?v=44';

const TEMPO_BY_STAGE = {
  stage1: 110,
  stage2: 118,
  stage3: 124,
  stage4: 130,
  stage5: 138,
};

function tempoForStageId(stageId) {
  if (!stageId || typeof stageId !== 'string') return null;
  const m = stageId.match(/^stage(\d)/);
  if (!m) return null;
  return TEMPO_BY_STAGE['stage' + m[1]] ?? null;
}

const SILENT_STAGES = new Set(['menu', 'data', 'final', 'gameover']);

const NOTE = {
  G2: 98.00, D3: 146.83, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.00,
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26,
  Fs5: 739.99, G5: 783.99,
};

const LEAD_MELODY = [
  'G4','B4','D5', 'B4','A4','G4',
  'D5','E5','D5', 'B4','A4','G4',
  'G4','B4','D5', 'E5','D5','B4',
  'D5','B4','A4', 'G4','B4','G4',
];

const BASS_PATTERN = [
  'G2',null,'D3', 'G2',null,null,
  'G2',null,'D3', 'G2',null,null,
  'G2',null,'D3', 'G2',null,'D3',
  'G2',null,'D3', 'G2',null,null,
];

const PALILLO_BEATS = new Set([2, 5, 8, 11, 14, 17, 20, 23]);

const LOOKAHEAD_S = 0.25;
const SCHEDULE_INTERVAL_MS = 80;

export const _MUSIC_DEBUG = {
  TEMPO_BY_STAGE,
  SILENT_STAGES,
  LEAD_MELODY,
  BASS_PATTERN,
  PALILLO_BEATS,
  LOOKAHEAD_S,
  SCHEDULE_INTERVAL_MS,
  tempoForStageId,
};

export class MusicEngine {
  constructor() {
    this._stage = null;
    this._playing = false;
    this._nextNoteTime = 0;
    this._currentBeat = 0;
    this._timer = null;
    this._activeNodes = new Set();
    this._pendingStart = null;
    this._unsubUnlock = null;
  }

  start(stageId) {
    if (SILENT_STAGES.has(stageId)) {
      this.stop();
      return;
    }
    const tempo = tempoForStageId(stageId);
    if (!tempo) {
      this.stop();
      return;
    }
    if (this._playing && this._stage === stageId) return;
    this.stop();
    this._stage = stageId;
    this._tempo = tempo;
    this._beatDuration = 60 / tempo;
    this._pendingStart = stageId;
    const ctx = ensureAudioContext();
    if (!ctx) {
      // No AudioContext yet (no user gesture). Subscribe to unlock event so
      // we can start as soon as the user clicks anywhere.
      if (!this._unsubUnlock) {
        this._unsubUnlock = onAudioUnlock(() => this._flushPendingStart());
      }
      return;
    }
    this._flushPendingStart();
    this._flushPendingStart();
  }

  _flushPendingStart() {
    if (!this._pendingStart) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (this._unsubUnlock) { this._unsubUnlock(); this._unsubUnlock = null; }
    this._playing = true;
    this._currentBeat = 0;
    this._nextNoteTime = ctx.currentTime + 0.08;
    this._timer = setInterval(() => this._scheduleAhead(), SCHEDULE_INTERVAL_MS);
    this._scheduleAhead();
  }

  stop() {
    this._playing = false;
    this._pendingStart = null;
    if (this._unsubUnlock) { this._unsubUnlock(); this._unsubUnlock = null; }
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._stage = null;
    const ctx = getAudioContext();
    const bus = getMusicBus();
    if (!ctx || !bus) return;
    for (const node of this._activeNodes) {
      try {
        if (node.gain && node.stop) {
          node.gain.cancelScheduledValues(ctx.currentTime);
          node.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
          node.stop(ctx.currentTime + 0.5);
        } else if (node.stop) {
          node.stop(ctx.currentTime + 0.3);
        }
      } catch (_) {}
    }
    this._activeNodes.clear();
  }

  pause() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  resume() {
    if (!this._playing || this._timer) return;
    const ctx = getAudioContext();
    if (ctx) this._nextNoteTime = ctx.currentTime + 0.08;
    this._timer = setInterval(() => this._scheduleAhead(), SCHEDULE_INTERVAL_MS);
    this._scheduleAhead();
  }

  isPlaying() {
    return this._playing;
  }

  getStage() {
    return this._stage;
  }

  _scheduleAhead() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    while (this._nextNoteTime < horizon) {
      this._scheduleBeat(this._currentBeat, this._nextNoteTime);
      this._nextNoteTime += this._beatDuration;
      this._currentBeat = (this._currentBeat + 1) % LEAD_MELODY.length;
    }
  }

  _scheduleBeat(beatIdx, time) {
    const leadNote = LEAD_MELODY[beatIdx];
    if (leadNote) this._scheduleLead(leadNote, time);
    const bassNote = BASS_PATTERN[beatIdx];
    if (bassNote) this._scheduleBass(bassNote, time);
    if (PALILLO_BEATS.has(beatIdx)) this._schedulePalillo(time);
  }

  _scheduleLead(noteName, time) {
    const ctx = getAudioContext();
    const bus = getMusicBus();
    if (!ctx || !bus) return;
    const freq = NOTE[noteName];
    if (!freq) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'square';
    osc2.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.005;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 5;
    const env = ctx.createGain();
    const dur = this._beatDuration * 0.9;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.22, time + 0.008);
    env.gain.linearRampToValueAtTime(0.12, time + 0.08);
    env.gain.setValueAtTime(0.12, time + dur - 0.1);
    env.gain.linearRampToValueAtTime(0, time + dur);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(bus);
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.05);
    osc2.stop(time + dur + 0.05);
    this._activeNodes.add(env);
    osc1.onended = () => this._activeNodes.delete(env);
  }

  _scheduleBass(noteName, time) {
    const ctx = getAudioContext();
    const bus = getMusicBus();
    if (!ctx || !bus) return;
    const freq = NOTE[noteName];
    if (!freq) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const env = ctx.createGain();
    const dur = this._beatDuration * 1.2;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.28, time + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter);
    filter.connect(env);
    env.connect(bus);
    osc.start(time);
    osc.stop(time + dur + 0.05);
    this._activeNodes.add(env);
    osc.onended = () => this._activeNodes.delete(env);
  }

  _schedulePalillo(time) {
    const ctx = getAudioContext();
    const bus = getMusicBus();
    if (!ctx || !bus) return;
    const dur = 0.04;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.25, time + 0.001);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(bus);
    src.start(time);
    src.stop(time + dur + 0.02);
    this._activeNodes.add(env);
    src.onended = () => this._activeNodes.delete(env);
  }
}