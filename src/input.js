/**
 * src/input.js
 *
 * Input unificado de mouse + touch para Zarra Defenders 2D.
 *
 * Por qué unificamos: las pistolas de luz HID se comportan como mouse en PC,
 * y los touch events en móvil exponen prácticamente la misma API que el mouse
 * (con `touchstart`/`touchmove`/`touchend` en lugar de `mousedown`/...).
 * Usamos Pointer Events cuando están disponibles (chrome, firefox, safari modernos)
 * y caemos a touch + mouse como fallback.
 *
 * Decisión confirmada (2026-09-03):
 *   - Auto-fire en móvil: OFF (disparo manual con tap explícito)
 *   - Tap vs drag: distancia < umbral y duración < 300ms → tap (dispara)
 *                       si no → drag (solo apunta, no dispara)
 *   - Light gun = mouse normal (sin código especial)
 *
 * API expuesta (al GameState desde main.js):
 *   Input.on('move', callback(x, y))         -> cada movimiento de puntero
 *   Input.on('tap', callback(x, y))           -> tap detectado (PC click o mobile tap)
 *   Input.on('pause', callback())              -> tecla Escape o P
 *   Input.getPointerX(), getPointerY()        -> posición actual del puntero
 *   Input.isPointerInsideCanvas()              -> true si está dentro del canvas
 *   Input.setCanvas(canvasElement)            -> vincular al canvas (llamar al inicio)
 */

const TAP_MAX_DISTANCE = 10         // px: distancia entre touchstart y touchend para considerar tap
const TAP_MAX_DURATION_MS = 300     // ms: duración máxima para considerar tap

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
   * @param {HTMLCanvasElement} canvas
   */
  setCanvas(canvas) {
    if (this.canvas) {
      this._detach()
    }
    this.canvas = canvas
    this._attach()
  }

  // =================== Public API ===================

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback)
    } else {
      console.warn(`[Input] Evento desconocido: ${event}`)
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

  // =================== Internal: event wiring ===================

  _attach() {
    if (!this.canvas) return
    // Pointer Events (preferido: cubre mouse, touch y pen con una sola API)
    this.canvas.addEventListener('pointermove', this._onPointerMove, { passive: true })
    this.canvas.addEventListener('pointerdown', this._onPointerDown)
    this.canvas.addEventListener('pointerup', this._onPointerUp)
    this.canvas.addEventListener('pointercancel', this._onPointerCancel)
    // Pointer leave: cuando el puntero sale del canvas
    this.canvas.addEventListener('pointerleave', () => { this.pointerInside = false })
    // Teclado (pausa)
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

  _handlePointerMove(e) {
    // Convertir coordenadas del evento a coordenadas del canvas (relativas al canvas)
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    this.pointerX = x
    this.pointerY = y
    this.pointerInside = true
    this._emit('move', x, y)
  }

  _handlePointerDown(e) {
    if (e.pointerType === 'touch') {
      // En touch, guardamos posición y tiempo para detectar tap vs drag después
      const rect = this.canvas.getBoundingClientRect()
      this.touchStartX = e.clientX - rect.left
      this.touchStartY = e.clientY - rect.top
      this.touchStartTime = performance.now()
    } else {
      // Mouse / pen: tap = click directo (sin distancia, sin duración relevante)
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      this._emit('tap', x, y)
    }
  }

  _handlePointerUp(e) {
    if (e.pointerType === 'touch') {
      // Detectar tap en touch: poca distancia + poco tiempo
      const rect = this.canvas.getBoundingClientRect()
      const endX = e.clientX - rect.left
      const endY = e.clientY - rect.top
      const dx = endX - this.touchStartX
      const dy = endY - this.touchStartY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const dur = performance.now() - this.touchStartTime

      if (dist <= TAP_MAX_DISTANCE && dur <= TAP_MAX_DURATION_MS) {
        this._emit('tap', endX, endY)
      }
      // Si no se cumple, fue un drag, no emitimos tap (pero el move ya se emitió)
    }
    // Para mouse/pen, el tap ya se emitió en pointerdown
  }

  _handlePointerCancel() {
    // Si el navegador cancela el touch (ej. scroll抢占), resetear estado
    this.touchStartTime = 0
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      this._emit('pause')
    }
  }

  _emit(event, ...args) {
    for (const cb of this.listeners[event]) {
      try {
        cb(...args)
      } catch (err) {
        console.error(`[Input] Error en listener de '${event}':`, err)
      }
    }
  }
}
