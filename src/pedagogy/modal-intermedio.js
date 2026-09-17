/**
 * src/pedagogy/modal-intermedio.js
 *
 * Modal intermedio cada N enemigos destruidos — Fase 1.2 (ROADMAP).
 *
 * Mecanismo: cada vez que el jugador destruye N enemigos, aparece un overlay
 * breve (top-center) con un resumen acumulativo del impacto pedagógico:
 *
 *   "Llevas 5 firmas contra el proyecto TRECO. Cada papeleta se suma a la
 *    lucha vecinal del Valle de Ayora-Cofrentes."
 *
 * Comportamiento:
 *   - Trigger configurable (default cada 5 enemigos)
 *   - Auto-dismiss a `dismissMs` (default 5000 ms)
 *   - Click-to-dismiss
 *   - Z-index menor que la card (180 < card's 150 → modal ENCIMA de card? no, card 150 modal 140)
 *     Actually modal es full-width top-center, no compite visualmente
 *   - NO bloquea disparo (pointer-events: none en el overlay, solo el botón close)
 *   - Reset en cada nuevo stage (llamar `reset()` cuando cambia stage)
 *
 * Pedagogía:
 *   - Refuerza la metáfora "cada firma se suma" — refuerza que el acto suma.
 *   - Mensaje siempre genérico (no caricature, no llama a violencia).
 *   - Cita el número de firmas acumuladas para que el jugador sienta progreso.
 */

import { STRINGS } from '../i18n/es.js?v=44'

const DEFAULT_TRIGGER_EVERY = 5
const DEFAULT_DISMISS_MS = 5000

export class ModalIntermedio {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root         existing <div id="modal-intermedio"> element
   * @param {number}      [opts.triggerEvery=5]
   * @param {number}      [opts.dismissMs=5000]
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('ModalIntermedio requires root element')
    this.root = opts.root
    this.triggerEvery = opts.triggerEvery ?? DEFAULT_TRIGGER_EVERY
    this.dismissMs = opts.dismissMs ?? DEFAULT_DISMISS_MS

    /** @type {number} total enemies destroyed in current run */
    this._totalHits = 0
    /** @type {number} times the modal has been shown in this run */
    this._shownCount = 0
    /** @type {number|null} timeout id */
    this._dismissTimer = null

    this._build()
  }

  /**
   * Record a hit. Triggers the modal every `triggerEvery` hits.
   * Returns true if the modal was shown.
   * @param {Object} [hitDetail]  the combat:hit event payload (optional, for future use)
   * @returns {boolean}
   */
  recordHit(hitDetail) {
    this._totalHits++
    if (this._totalHits % this.triggerEvery === 0) {
      this._show(hitDetail)
      return true
    }
    return false
  }

  /** Reset counter to 0 (call when stage changes). */
  reset() {
    this._totalHits = 0
    this.hide()
  }

  /** Hide the modal immediately. */
  hide() {
    this._clearDismissTimer()
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this.root.innerHTML = ''
  }

  get isVisible() {
    return !this.root.classList.contains('hidden')
  }

  get totalHits() { return this._totalHits }
  get shownCount() { return this._shownCount }

  destroy() {
    this._clearDismissTimer()
    this.root.innerHTML = ''
  }

  // ============== Internal =================

  _build() {
    this.root.setAttribute('aria-hidden', 'true')
  }

  _show(hitDetail) {
    this._clearDismissTimer()
    this._shownCount++

    const firmas = this._totalHits
    const mensaje = STRINGS.pedagogy.modalIntermedio.mensaje(firmas, this._shownCount)
    const subtitulo = STRINGS.pedagogy.modalIntermedio.subtitulo

    this.root.innerHTML = `
      <div class="modal-intermedio-card" role="alertdialog" aria-live="polite">
        <button type="button" class="modal-intermedio-close" aria-label="Cerrar">\u2715</button>
        <p class="modal-intermedio-firmas">${escapeHtml(String(firmas))}</p>
        <p class="modal-intermedio-mensaje">${escapeHtml(mensaje)}</p>
        <p class="modal-intermedio-subtitulo">${escapeHtml(subtitulo)}</p>
      </div>
    `
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')

    // Wire listeners AFTER innerHTML so we attach to the freshly-created elements
    this.root.querySelector('.modal-intermedio-close').addEventListener('click', (e) => {
      e.stopPropagation()
      this.hide()
    })
    this.root.querySelector('.modal-intermedio-card').addEventListener('click', () => {
      this.hide()
    })

    this._dismissTimer = setTimeout(() => {
      this._dismissTimer = null
      this.hide()
    }, this.dismissMs)
  }

  _clearDismissTimer() {
    if (this._dismissTimer != null) {
      clearTimeout(this._dismissTimer)
      this._dismissTimer = null
    }
  }
}

/**
 * Pure function — compute the message for a given hit count.
 * Exported for unit testing.
 *
 * @param {number} firmas       total hits so far
 * @param {number} shownCount   which modal this is (1st, 2nd, ...)
 * @returns {string} message
 */
export function buildModalMessage(firmas, shownCount) {
  if (firmas <= 0) return ''
  if (firmas < 10) {
    return `${firmas} firmas recogidas contra el proyecto. Cada papeleta se suma a la lucha vecinal del Valle.`
  }
  if (firmas < 25) {
    return `${firmas} firmas sumadas. El Valle de Ayora-Cofrentes se planta ante TRECO.`
  }
  if (firmas < 50) {
    return `${firmas} firmas — un acto colectivo. La comarca recuerda: en 2002 ya pararon un vertedero igual.`
  }
  return `${firmas} firmas. La presión vecinal crece. Sigue sumando.`
}

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}