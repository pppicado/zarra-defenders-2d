/**
 * src/audio/sfx.js
 *
 * SFXEngine — procedural sound effects for the game
 * (ROADMAP §4.2 — Phase 4).
 *
 * Each SFX is synthesized with the Web Audio API (oscillators + noise +
 * envelopes), no external samples. Shares the AudioContext and masterGain
 * with MusicEngine.
 *
 * Catalog:
 *   fire       — short noise burst + bright sine sweep (paper ballot fires)
 *   hit        — descending sine sweep + brief noise
 *   card       — ascending do-mi-sol arpeggio (pedagogy card appears)
 *   gameover   — dissonant chord (minor second) with fade out
 *   victory    — short jota fragment in major tonality
 *   click      — brief 100Hz sine 30ms (menu)
 *   transition — short instrumental crescendo
 *   error      — descending dissonant tone (ally fired upon)
 */
import { ensureAudioContext, getSfxBus } from './audio-context.js?v=44';

const NOTE = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, Db5: 554.37, D5: 587.33, E5: 659.26, Fs5: 739.99, G5: 783.99, A5: 880.00,
};

const SFX_DEFS = {
  fire: 'fire',
  hit: 'hit',
  card: 'card',
  gameover: 'gameover',
  victory: 'victory',
  click: 'click',
  transition: 'transition',
  error: 'error',
};

export class SFXEngine {
  constructor() {
    this._available = new Set(Object.keys(SFX_DEFS));
  }

  listAvailable() {
    return Array.from(this._available);
  }

  play(name) {
    if (!SFX_DEFS[name]) return false;
    const ctx = ensureAudioContext();
    if (!ctx) return false;
    try {
      switch (name) {
        case 'fire': this._fire(ctx); break;
        case 'hit': this._hit(ctx); break;
        case 'card': this._card(ctx); break;
        case 'gameover': this._gameover(ctx); break;
        case 'victory': this._victory(ctx); break;
        case 'click': this._click(ctx); break;
        case 'transition': this._transition(ctx); break;
        case 'error': this._error(ctx); break;
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  _bus() {
    return getSfxBus();
  }

  _envelope(node, t0, attack, peak, decay, sustainTime, release) {
    node.gain.setValueAtTime(0, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + attack);
    node.gain.linearRampToValueAtTime(peak * 0.6, t0 + attack + decay);
    node.gain.setValueAtTime(peak * 0.6, t0 + attack + decay + sustainTime);
    node.gain.linearRampToValueAtTime(0, t0 + attack + decay + sustainTime + release);
  }

  _noiseBuffer(ctx, duration) {
    const size = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  _fire(ctx) {
    const t = ctx.currentTime;
    const bus = this._bus();
    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(ctx, 0.08);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    const noiseGain = ctx.createGain();
    this._envelope(noiseGain, t, 0.002, 0.18, 0.04, 0.02, 0.02);
    noise.connect(noiseFilter).connect(noiseGain).connect(bus);
    noise.start(t);
    noise.stop(t + 0.12);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
    const oscGain = ctx.createGain();
    this._envelope(oscGain, t, 0.005, 0.22, 0.06, 0.01, 0.02);
    osc.connect(oscGain).connect(bus);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  _hit(ctx) {
    const t = ctx.currentTime;
    const bus = this._bus();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    const oscGain = ctx.createGain();
    this._envelope(oscGain, t, 0.005, 0.32, 0.1, 0.02, 0.04);
    osc.connect(oscGain).connect(bus);
    osc.start(t);
    osc.stop(t + 0.22);

    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(ctx, 0.06);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1500;
    const noiseGain = ctx.createGain();
    this._envelope(noiseGain, t, 0.001, 0.2, 0.04, 0, 0.01);
    noise.connect(noiseFilter).connect(noiseGain).connect(bus);
    noise.start(t);
    noise.stop(t + 0.1);
  }

  _card(ctx) {
    const t = ctx.currentTime;
    const bus = this._bus();
    const notes = [NOTE.C5, NOTE.E5, NOTE.G5];
    notes.forEach((freq, i) => {
      const start = t + i * 0.07;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      this._envelope(g, start, 0.005, 0.24, 0.04, 0.05, 0.04);
      osc.connect(g).connect(bus);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  _gameover(ctx) {
    const t = ctx.currentTime;
    const bus = this._bus();
    const notes = [NOTE.E4, NOTE.F4];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.05);
      g.gain.setValueAtTime(0.25, t + 1.0);
      g.gain.linearRampToValueAtTime(0, t + 1.6);
      osc.connect(g).connect(bus);
      osc.start(t);
      osc.stop(t + 1.7);
    });
  }

  _victory(ctx) {
    const t = ctx.currentTime;
    const bus = this._bus();
    const melody = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C5];
    melody.forEach((freq, i) => {
      const start = t + i * 0.15;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1500;
      filter.Q.value = 4;
      const g = ctx.createGain();
      this._envelope(g, start, 0.005, 0.22, 0.08, 0.05, 0.06);
      osc.connect(filter).connect(g).connect(bus);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  _click(ctx) {
    const t = ctx.currentTime;
    const bus = this._bus();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 100;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.005);
    g.gain.linearRampToValueAtTime(0, t + 0.03);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  _transition(ctx) {
    const t = ctx.currentTime;
    const bus = this._bus();
    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(ctx, 0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + 0.5);
    filter.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.3);
    g.gain.linearRampToValueAtTime(0, t + 0.55);
    noise.connect(filter).connect(g).connect(bus);
    noise.start(t);
    noise.stop(t + 0.6);
  }

  _error(ctx) {
    const t = ctx.currentTime;
    const bus = this._bus();
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, t);
    osc1.frequency.exponentialRampToValueAtTime(110, t + 0.25);
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(233, t);
    osc2.frequency.exponentialRampToValueAtTime(116, t + 0.25);
    const g = ctx.createGain();
    this._envelope(g, t, 0.005, 0.22, 0.1, 0.05, 0.08);
    osc1.connect(g);
    osc2.connect(g);
    g.connect(bus);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.32);
    osc2.stop(t + 0.32);
  }
}