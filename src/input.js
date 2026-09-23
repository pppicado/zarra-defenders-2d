/**
 * src/input.js
 *
 * Unified mouse + touch input for Zarra Defenders 2D.
 *
 * Why we unify: HID light guns behave like a mouse on PC, and touch
 * events on mobile expose practically the same API as the mouse
 * (with `touchstart`/`touchmove`/`touchend` instead of `mousedown`/...).
 * We use Pointer Events when available (chrome, firefox, modern safari)
 * and fall back to touch + mouse.
 *
 * Confirmed decision (2026-09-03):
 *   - Auto-fire on mobile: OFF (manual fire with explicit tap)
 *   - Tap vs drag: distance < threshold and duration < 300ms → tap (fire)
 *                       else → drag (just aim, don't fire)
 *   - Light gun = normal mouse (no special code)
 *
 * API exposed (to GameState from main.js):
 *   Input.on('move', callback(x, y))         -> every pointer movement
 *   Input.on('tap', callback(x, y))           -> tap detected (PC click or mobile tap)
 *   Input.on('pause', callback())              -> Escape or P key
 *   Input.getPointerX(), getPointerY()        -> current pointer position
 *   Input.isPointerInsideCanvas()              -> true if inside the canvas
 *   Input.setCanvas(canvasElement)            -> bind to canvas (call at start)
 */

const TAP_MAX_DISTANCE = 10         // px: distance between touchstart and touchend to consider it a tap
const TAP_MAX_DURATION_MS = 300     // ms: max duration to consider it a tap

import { __zr } from './engine/dom-debug.js?v=44'

export class Input {
  constructor() {
    this.canvas = null
    this.pointerX = 0
    this.pointerY = 0
    this.pointerInside = false

    // Para tap detection
    this.touchStartX = 0
    this.touchStartY = 0
    this.touchStartTime = 0

    // Listeners
    this.listeners = {
      move: [],
      tap: [],
      pause: []
    }

    // Bound handlers (para poder removerlos con removeEventListener)
    this._onPointerMove = this._handlePointerMove.bind(this)
    this._onPointerDown = this._handlePointerDown.bind(this)
    this._onPointerUp = this._handlePointerUp.bind(this)
    this._onPointerCancel = this._handlePointerCancel.bind(this)
    this._onKeyDown = this._handleKeyDown.bind(this)
  }

  /**
   * Vincula los event listeners al canvas del juego. Llamar una vez en bootstrap.
   * Acepta un solo canvas o un array de canvases (para multi-canvas: el listener
   * se registra en el primero que reciba eventos). F3.5: pasamos ambos canvases
   * (world + HUD) y los listeners viven en ambos.
   * @param {HTMLCanvasElement|HTMLCanvasElement[]} canvasOrCanvases
   */
  setCanvas(canvasOrCanvases) {
    if (this.canvas) {
      this._detach()
    }
    const arr = Array.isArray(canvasOrCanvases) ? canvasOrCanvases : [canvasOrCanvases]
    this.canvas = arr[0] || null
    this._canvases = arr
    this._attach()
  }

  // =================== Public API ===================

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback)
    } else {
      __zr.warn(`[Input] Unknown event: ${event}`)
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
    }
  }

  getPointerX() { return this.pointerX }
  getPointerY() { return this.pointerY }
  isPointerInsideCanvas() { return this.pointerInside }

  // ====== F3 additive method: setGate(predicate) ======

  /**
   * Install a gate predicate. When the predicate returns false, tap events
   * are silently dropped before reaching 'tap' listeners. Pointer move is
   * NEVER gated (the HUD hand sprite needs the position).
   *
   * Used by main.js to block gameplay taps while the main menu or any
   * overlay is visible.
   *
   * @param {(() => boolean) | null} predicate
   */
  setGate(predicate) {
    this._gate = predicate ?? null
  }

  /** @returns {boolean} current gate predicate (default = null, no gating) */
  getGate() { return this._gate ?? null }

  // =================== Internal: event wiring ===================

  _attach() {
    // F3.5: register listeners on a single element (the primary canvas) only,
    // to avoid double-firing when both world and HUD canvases overlap. The
    // primary canvas is the one on top (HUD). For multi-canvas apps, pass the
    // topmost canvas to setCanvas(); the click will register even though the
    // visual rendering comes from the world canvas underneath, because the HUD
    // canvas has backgroundAlpha: 0 and pointer-events: auto.
    if (!this.canvas) return
    this.canvas.addEventListener('pointermove', this._onPointerMove, { passive: true })
    this.canvas.addEventListener('pointerdown', this._onPointerDown)
    this.canvas.addEventListener('pointerup', this._onPointerUp)
    this.canvas.addEventListener('pointercancel', this._onPointerCancel)
    this.canvas.addEventListener('pointerleave', () => { this.pointerInside = false })
    window.addEventListener('keydown', this._onKeyDown)
  }

  _detach() {
    if (!this.canvas) return
    this.canvas.removeEventListener('pointermove', this._onPointerMove)
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    this.canvas.removeEventListener('pointerup', this._onPointerUp)
    this.canvas.removeEventListener('pointercancel', this._onPointerCancel)
    window.removeEventListener('keydown', this._onKeyDown)
  }

  // =================== Handlers ===================

  /**
   * Convert pointer event coordinates (viewport CSS px) into the canvas's
   * logical 1920x1080 space. Uses the cached __cssScale__ that main.js
   * applies on resize; falls back to no-op (raw clientX/Y) if missing.
   */
  _toLogical(clientX, clientY) {
    const cs = (typeof window !== 'undefined' && window.__cssScale__) || null
    if (!cs || !cs.scale) return { x: clientX, y: clientY }
    return {
      x: (clientX - cs.xOff) / cs.scale,
      y: (clientY - cs.yOff) / cs.scale,
    }
  }

  _handlePointerMove(e) {
    const { x, y } = this._toLogical(e.clientX, e.clientY)
    this.pointerX = x
    this.pointerY = y
    this.pointerInside = true
    this._emit('move', x, y)
  }

  _handlePointerDown(e) {
    if (e.pointerType === 'touch') {
      // On touch, save position and time to detect tap vs drag later
      const { x, y } = this._toLogical(e.clientX, e.clientY)
      this.touchStartX = x
      this.touchStartY = y
      this.touchStartTime = performance.now()
    } else {
      // Mouse / pen: tap = direct click (no distance, no duration relevant)
      const { x, y } = this._toLogical(e.clientX, e.clientY)
      this._emit('tap', x, y)
    }
  }

  _handlePointerUp(e) {
    if (e.pointerType === 'touch') {
      // Detect tap on touch: short distance + short time
      const { x: endX, y: endY } = this._toLogical(e.clientX, e.clientY)
      const dx = endX - this.touchStartX
      const dy = endY - this.touchStartY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const dur = performance.now() - this.touchStartTime

      if (dist <= TAP_MAX_DISTANCE && dur <= TAP_MAX_DURATION_MS) {
        this._emit('tap', endX, endY)
      }
      // If not satisfied, it was a drag; we do not emit tap (but the move was already emitted)
    }
    // For mouse/pen, the tap was already emitted on pointerdown
  }

  _handlePointerCancel() {
    // If the browser cancels the touch (e.g. scroll preempt), reset state
    this.touchStartTime = 0
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      this._emit('pause')
    }
  }

  _emit(event, ...args) {
    // F3 additive: gate blocks 'tap' events when predicate returns false.
    // 'move' and 'pause' are NEVER gated (hand sprite needs position; pause is global).
    if (event === 'tap' && this._gate && !this._gate()) return
    for (const cb of this.listeners[event]) {
      try {
        cb(...args)
      } catch (err) {
        __zr.error(`[Input] Error in '${event}' listener:`, err)
      }
    }
  }
}
