/**
 * src/pedagogy/modal-intermedio.js
 *
 * Intermediate modal every N enemies destroyed — Phase 1.2 (ROADMAP).
 *
 * Mechanism: every time the player destroys N enemies, a brief overlay
 * appears with a cumulative summary of pedagogical impact:
 *
 *   "You have 5 signatures against the TRECO project. Each slip adds up
 *    to the Valle de Ayora-Cofrentes' neighborhood fight."
 *
 * F3.5.4 (refinement over F1.2): the modal no longer appears top-center
 * as a large panel. It now sits bottom-right, paired with the
 * pedagogy-card and matched to the 3-hearts height. When the card is
 * also visible (which happens whenever the player just killed an enemy
 * and the modal fires on a hit boundary that coincides), the modal
 * STACKS above the card with an 8px gap. When the card is hidden, the
 * modal uses the card's footprint position.
 *
 * Behavior:
 *   - Configurable trigger (default every 5 enemies)
 *   - Auto-dismiss at `dismissMs` (default 5000 ms)
 *   - Click-to-dismiss
 *   - Z-index lower than the card (modal 140, card 150) so the card
 *     remains the primary focus when both are visible
 *   - Does NOT block firing (pointer-events: none on overlay, only the close button)
 *   - Reset on each new stage (call `reset()` when stage changes)
 *   - Listens to `pedagogy:visibility` from PedagogyCards to apply the
 *     `.stacked` modifier class (CSS does the actual positioning)
 *
 * Pedagogy:
 *   - Reinforces the "each signature adds up" metaphor — reinforces that the act sums up.
 *   - Message is always generic (no caricature, no call to violence).
 *   - Quotes the number of signatures accumulated so the player feels progress.
 */

import { STRINGS } from '../i18n/es.js?v=44'
import { on } from '../event-bus.js?v=44'

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
    // F3.5.4: track whether the pedagogy card is currently visible so the
    // modal can stack above it via the .stacked CSS class. Subscribed to
    // the `pedagogy:visibility` event so siblings stay loosely coupled.
    // We also peek at the DOM at boot — if the card was rendered BEFORE
    // this modal was constructed (test scenarios, late instantiation), we
    // still want to apply the stacked offset immediately.
    this._pedagogyCardVisible = this._peekCardVisibleFromDom()

    this._build()
    this._unsubs = []
    this._unsubs.push(on('pedagogy:visibility', ({ visible }) => {
      this._pedagogyCardVisible = !!visible
      this._applyStackedClass()
    }))
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
    this.root.classList.remove('stacked')  // F3.5.4: clear stacking state
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
    for (const u of this._unsubs) u()
    this._unsubs = []
  }

  // ============== F3.5.4 stacking ==============

  /**
   * Apply or remove the .stacked CSS class based on whether the pedagogy
   * card is currently visible. CSS uses .stacked to shift the modal up
   * by the card's height + 8px gap so the two never overlap.
   */
  _applyStackedClass() {
    if (!this.root) return
    this.root.classList.toggle('stacked', this._pedagogyCardVisible)
  }

  /**
   * Read the current pedagogy-card visibility from the DOM. Used at
   * construction time to seed the stacking state — without this, a
   * modal instantiated AFTER the card was already visible (e.g. in
   * tests that build ModalIntermedio after rendering a card) would
   * ignore the existing card and overlap it.
   */
  _peekCardVisibleFromDom() {
    try {
      const card = document.getElementById('pedagogy-card')
      return !!(card && !card.classList.contains('hidden'))
    } catch (_) {
      return false
    }
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
    // F3.5.4: stack above the pedagogy card if it's currently visible.
    // Called AFTER classList.remove('hidden') so the stacked transform
    // applies to the visible modal, not the hidden one.
    this._applyStackedClass()

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
 * Exported for unit testing. Delegates to STRINGS so the pedagogical
 * template is centralized (A2 contract).
 *
 * @param {number} firmas       total hits so far
 * @param {number} shownCount   which modal this is (1st, 2nd, ...)
 * @returns {string} message
 */
export function buildModalMessage(firmas, shownCount) {
  if (firmas <= 0) return ''
  return STRINGS.pedagogy.modalIntermedio.mensaje(firmas, shownCount ?? 1)
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