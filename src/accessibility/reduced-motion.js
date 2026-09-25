/**
 * src/accessibility/reduced-motion.js
 *
 * MotionEngine — respects prefers-reduced-motion media query and exposes a
 * global flag that the rest of the game can read to disable parallax,
 * screen shake, sine flutter, and other motion-heavy effects.
 * ROADMAP §5.3 — Phase 5 accessibility.
 *
 * Public API:
 *   isAvailable()         — true if window.matchMedia exists
 *   prefersReducedMotion()— true if OS reports prefers-reduced-motion: reduce
 *   isOverrideEnabled()   — true if user manually enabled reduced-motion in settings
 *   isReducedMotionActive()— combined: OS preference OR user override
 *   setOverride(bool)     — force on/off regardless of OS preference
 *   toggleOverride()      — flip + persist
 *   load() / save()       — localStorage 'zarra2d:settings:motion'
 *   onChange(handler)     — subscribe to OS preference changes (returns unsub)
 *
 * Global side-effect: sets window.__zrReducedMotion = boolean whenever the
 * effective state changes, so non-module code can react without imports.
 */
const STORAGE_KEY = 'zarra2d:settings:motion'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
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

export class MotionEngine {
  constructor() {
    this._override = null
    this._mq = null
    this._listeners = new Set()
    if (isBrowser()) {
      this._mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      this._mq.addEventListener('change', () => this._notify())
    }
    this._publishGlobal()
  }

  isAvailable() {
    return isBrowser()
  }

  prefersReducedMotion() {
    if (!this._mq) return false
    return this._mq.matches
  }

  isOverrideEnabled() {
    return this._override === true
  }

  isReducedMotionActive() {
    if (this._override === true) return true
    if (this._override === false) return false
    return this.prefersReducedMotion()
  }

  setOverride(value) {
    if (value === null) {
      this._override = null
    } else {
      this._override = !!value
    }
    this.save()
    this._notify()
    return this.isReducedMotionActive()
  }

  toggleOverride() {
    const currentlyActive = this.isReducedMotionActive()
    return this.setOverride(!currentlyActive)
  }

  load() {
    if (!isBrowser()) return false
    const data = loadRaw()
    if (!data || typeof data.override !== 'boolean' && data.override !== null) return false
    this._override = data.override === null ? null : !!data.override
    this._publishGlobal()
    return true
  }

  save() {
    if (!isBrowser()) return
    saveRaw({ override: this._override })
  }

  onChange(handler) {
    this._listeners.add(handler)
    return () => this._listeners.delete(handler)
  }

  _notify() {
    this._publishGlobal()
    for (const fn of this._listeners) {
      try { fn(this.isReducedMotionActive()) } catch (_) {}
    }
  }

  _publishGlobal() {
    if (!isBrowser()) return
    const active = this.isReducedMotionActive()
    if (window.__zrReducedMotion !== active) {
      window.__zrReducedMotion = active
      if (window.document && window.document.documentElement) {
        if (active) window.document.documentElement.classList.add('reduced-motion')
        else window.document.documentElement.classList.remove('reduced-motion')
      }
    }
  }

  static get STORAGE_KEY() { return STORAGE_KEY }

  _resetForTests() {
    this._override = null
    this._listeners = new Set()
    if (this._mq) {
      // Re-read current OS preference on next publishGlobal
    }
    if (isBrowser() && globalThis.window && globalThis.window.__zrReducedMotion !== undefined) {
      delete globalThis.window.__zrReducedMotion
    }
    if (isBrowser() && globalThis.document && globalThis.document.documentElement) {
      globalThis.document.documentElement.classList.remove('reduced-motion')
    }
  }
}

export const motionEngine = new MotionEngine()
if (isBrowser()) motionEngine.load()