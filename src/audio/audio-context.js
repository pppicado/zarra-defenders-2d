/**
 * src/audio/audio-context.js
 *
 * AudioContext singleton + master gain shared by MusicEngine and SFXEngine
 * (ROADMAP §4.1 + §4.2 — Phase 4).
 *
 * AudioContext is not created until the first user gesture (autoplay policy).
 * All engines must call ensureAudioContext() before playback. Listeners
 * registered via onAudioUnlock() fire when the context is first created —
 * this lets MusicEngine.start() defer its schedule until unlock.
 */
const STATE = {
  ctx: null,
  masterGain: null,
  musicBus: null,
  sfxBus: null,
  volume: 0.6,
  muted: false,
  unlockListeners: [],
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
}

export function isAudioAvailable() {
  return isBrowser();
}

export function ensureAudioContext() {
  if (!isBrowser()) return null;
  if (STATE.ctx) {
    if (STATE.ctx.state === 'suspended') {
      STATE.ctx.resume().catch(() => {});
    }
    return STATE.ctx;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    STATE.ctx = new Ctx();
    STATE.masterGain = STATE.ctx.createGain();
    STATE.masterGain.gain.value = STATE.muted ? 0 : STATE.volume;
    STATE.musicBus = STATE.ctx.createGain();
    STATE.sfxBus = STATE.ctx.createGain();
    STATE.musicBus.gain.value = 1;
    STATE.sfxBus.gain.value = 1;
    STATE.musicBus.connect(STATE.masterGain);
    STATE.sfxBus.connect(STATE.masterGain);
    STATE.masterGain.connect(STATE.ctx.destination);
    const listeners = STATE.unlockListeners.slice();
    STATE.unlockListeners = [];
    for (const fn of listeners) {
      try { fn(STATE.ctx) } catch (_) {}
    }
  } catch (_) {
    STATE.ctx = null;
  }
  return STATE.ctx;
}

export function onAudioUnlock(fn) {
  if (STATE.ctx) {
    try { fn(STATE.ctx) } catch (_) {}
    return () => {}
  }
  STATE.unlockListeners.push(fn);
  return () => {
    const i = STATE.unlockListeners.indexOf(fn);
    if (i >= 0) STATE.unlockListeners.splice(i, 1);
  };
}

export function getAudioContext() {
  return STATE.ctx;
}

export function getMusicBus() {
  return STATE.musicBus;
}

export function getSfxBus() {
  return STATE.sfxBus;
}

export function getMasterVolume() {
  return STATE.volume;
}

export function isMuted() {
  return STATE.muted;
}

export function setMasterVolume(v) {
  const clamped = Math.max(0, Math.min(1, v));
  STATE.volume = clamped;
  if (STATE.masterGain && STATE.ctx) {
    STATE.masterGain.gain.setTargetAtTime(
      STATE.muted ? 0 : clamped,
      STATE.ctx.currentTime,
      0.02
    );
  }
}

export function setMuted(muted) {
  STATE.muted = !!muted;
  if (STATE.masterGain && STATE.ctx) {
    STATE.masterGain.gain.setTargetAtTime(
      STATE.muted ? 0 : STATE.volume,
      STATE.ctx.currentTime,
      0.02
    );
  }
}

export function toggleMute() {
  setMuted(!STATE.muted);
  return STATE.muted;
}

export function suspendAudio() {
  if (STATE.ctx && STATE.ctx.state === 'running') {
    STATE.ctx.suspend().catch(() => {});
  }
}

export function resumeAudio() {
  if (STATE.ctx && STATE.ctx.state === 'suspended') {
    STATE.ctx.resume().catch(() => {});
  }
}

export function _resetForTests() {
  STATE.ctx = null;
  STATE.masterGain = null;
  STATE.musicBus = null;
  STATE.sfxBus = null;
  STATE.volume = 0.6;
  STATE.muted = false;
  STATE.unlockListeners = [];
}