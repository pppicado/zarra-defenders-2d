/**
 * src/accessibility/tts.js
 *
 * TTSEngine — Text-to-Speech via the Web Speech API (window.speechSynthesis).
 * ROADMAP §5.1 — Phase 5 accessibility.
 *
 * Public API:
 *   isAvailable()       — true if speechSynthesis is supported in this browser
 *   listVoices()        — array of available voices (filtered to es-* first)
 *   setVoice(name)      — pick a voice by exact name; '' = browser default
 *   getVoice()
 *   setRate(0.5..2)     — speech rate multiplier (default 1.0)
 *   getRate()
 *   setEnabled(bool)    — when false, speak() is a no-op
 *   isEnabled()
 *   toggleEnabled()
 *   speak(text)         — speak the text (replaces current utterance)
 *   cancel()            — stop current speech
 *   load()              — restore config from localStorage
 *   save()              — persist config to localStorage
 *
 * Persisted shape (localStorage key 'zarra2d:settings:tts'):
 *   { enabled: bool, rate: number, voice: string }
 */
const STORAGE_KEY = 'zarra2d:settings:tts'

const DEFAULTS = {
  enabled: true,
  rate: 1.0,
  voice: '',
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'
}

function loadRaw() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_) {
    return null
  }
}

function saveRaw(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (_) {}
}

function pickSpanishVoice(voices) {
  if (!voices || voices.length === 0) return ''
  const esES = voices.find(v => v.lang === 'es-ES' || v.lang === 'es_ES')
  if (esES) return esES.name
  const es = voices.find(v => v.lang && v.lang.startsWith('es'))
  if (es) return es.name
  return ''
}

export class TTSEngine {
  constructor() {
    this._enabled = DEFAULTS.enabled
    this._rate = DEFAULTS.rate
    this._voice = DEFAULTS.voice
    this._voicesLoaded = false
    this._voices = []
  }

  isAvailable() {
    return isBrowser()
  }

  listVoices() {
    if (!isBrowser()) return []
    if (!this._voicesLoaded) {
      this._voices = window.speechSynthesis.getVoices() || []
      this._voicesLoaded = true
    }
    return this._voices
  }

  setVoice(name) {
    this._voice = name || ''
  }

  getVoice() {
    return this._voice
  }

  setRate(rate) {
    const r = Number(rate)
    if (Number.isNaN(r)) return
    this._rate = Math.max(0.5, Math.min(2, r))
  }

  getRate() {
    return this._rate
  }

  setEnabled(enabled) {
    this._enabled = !!enabled
  }

  isEnabled() {
    return this._enabled
  }

  toggleEnabled() {
    this._enabled = !this._enabled
    if (!this._enabled) this.cancel()
    return this._enabled
  }

  speak(text) {
    if (!isBrowser()) return false
    if (!this._enabled) return false
    if (!text || typeof text !== 'string') return false
    try {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'es-ES'
      utter.rate = this._rate
      utter.volume = 1.0
      const voices = this.listVoices()
      if (voices.length > 0) {
        let voice = null
        if (this._voice) {
          voice = voices.find(v => v.name === this._voice) || null
        }
        if (!voice) voice = voices.find(v => v.lang === 'es-ES') || null
        if (!voice) voice = voices.find(v => v.lang && v.lang.startsWith('es')) || null
        if (voice) utter.voice = voice
      }
      window.speechSynthesis.speak(utter)
      return true
    } catch (_) {
      return false
    }
  }

  cancel() {
    if (!isBrowser()) return
    try { window.speechSynthesis.cancel() } catch (_) {}
  }

  load() {
    const data = loadRaw()
    if (!data) return false
    if (typeof data.enabled === 'boolean') this._enabled = data.enabled
    if (typeof data.rate === 'number') this._rate = Math.max(0.5, Math.min(2, data.rate))
    if (typeof data.voice === 'string') this._voice = data.voice
    return true
  }

  save() {
    saveRaw({
      enabled: this._enabled,
      rate: this._rate,
      voice: this._voice,
    })
  }

  resetToDefaults() {
    this._enabled = DEFAULTS.enabled
    this._rate = DEFAULTS.rate
    this._voice = DEFAULTS.voice
  }

  static get DEFAULTS() { return { ...DEFAULTS } }
  static get STORAGE_KEY() { return STORAGE_KEY }
}

export const ttsEngine = new TTSEngine()
if (isBrowser()) ttsEngine.load()