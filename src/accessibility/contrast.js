/**
 * src/accessibility/contrast.js
 *
 * ContrastEngine — high-contrast mode toggle for color-blind / low-vision users.
 * ROADMAP §5.2 — Phase 5 accessibility.
 *
 * Public API:
 *   isAvailable()   — true if document.documentElement exists
 *   isEnabled()     — true if contrast-high class is currently applied
 *   setEnabled(bool) — apply/remove the class + persist
 *   toggle()        — flip + persist
 *   load()          — restore from localStorage
 *   save()          — persist to localStorage
 *
 * Persisted shape (localStorage key 'zarra2d:settings:contrast'):
 *   { enabled: bool }
 */
const STORAGE_KEY = 'zarra2d:settings:contrast'
const CLASS_NAME = 'contrast-high'

function isBrowser() {
  return typeof window !== 'undefined' && !!window.document && !!window.document.documentElement
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

export class ContrastEngine {
  constructor() {
    this._enabled = false
    if (isBrowser()) {
      this._enabled = this._detectFromDOM()
      if (this._enabled) {
        document.documentElement.classList.add(CLASS_NAME)
      }
    }
  }

  isAvailable() {
    return isBrowser()
  }

  isEnabled() {
    return this._enabled
  }

  setEnabled(enabled) {
    this._enabled = !!enabled
    if (isBrowser()) {
      const root = document.documentElement
      if (this._enabled) root.classList.add(CLASS_NAME)
      else root.classList.remove(CLASS_NAME)
    }
  }

  toggle() {
    this.setEnabled(!this._enabled)
    this.save()
    return this._enabled
  }

  load() {
    if (!isBrowser()) return false
    const data = loadRaw()
    if (!data || typeof data.enabled !== 'boolean') return false
    this.setEnabled(data.enabled)
    return true
  }

  save() {
    if (!isBrowser()) return
    saveRaw({ enabled: this._enabled })
  }

  _detectFromDOM() {
    if (!isBrowser()) return false
    return document.documentElement.classList.contains(CLASS_NAME)
  }

  static get STORAGE_KEY() { return STORAGE_KEY }
  static get CLASS_NAME() { return CLASS_NAME }
}

export const contrastEngine = new ContrastEngine()
if (isBrowser()) {
  if (contrastEngine.isAvailable() && !contrastEngine._detectFromDOM()) {
    contrastEngine.load()
  }
}