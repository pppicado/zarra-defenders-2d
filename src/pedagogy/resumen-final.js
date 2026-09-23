/**
 * src/pedagogy/resumen-final.js
 *
 * Stage-end navigable summary — Phase 1.3 (ROADMAP).
 *
 * Mechanism: when the player completes a stage (trigger: stage:cleared),
 * a fullscreen overlay appears with all pedagogical cards the player saw
 * during the run. Each card shows:
 *
 *   - Enemy title
 *   - Specific description
 *   - Stage data + source link
 *
 * Navigation:
 *   - One card visible at a time
 *   - Prev / Next buttons + arrow keys (← →)
 *   - "X / N" indicator at the bottom
 *   - Click on a dot indicator to jump to that card
 *
 * Pedagogy: the summary acts as a "debrief" — the player reviews what
 * they learned before returning to the menu. CardsShown comes from
 * `score.cardsShown`.
 */
import { STRINGS } from '../i18n/es.js?v=44'

const DEFAULT_DISMISS_MS = 30000

export class ResumenFinal {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root          existing <div id="resumen-final"> element
   * @param {Function}    [opts.onClose]    callback() called when user closes the resumen
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('ResumenFinal requires root element')
    this.root = opts.root
    this.onClose = opts.onClose ?? null

    /** @type {Array} cardsShown from score */
    this._cards = []
    /** @type {number} current index (0-based) */
    this._currentIndex = 0

    this._build()
  }

  /**
   * Show the resumen with the given cards.
   * @param {Array} cardsShown  array of {titulo, descripcion, datoTexto, fuente, url, ...}
   */
  show(cardsShown) {
    this._cards = Array.isArray(cardsShown) ? cardsShown : []
    this._currentIndex = 0
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')
    this._render()
  }

  hide() {
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this.root.innerHTML = ''
    this._cards = []
    this._currentIndex = 0
  }

  get isVisible() {
    return !this.root.classList.contains('hidden')
  }

  get currentIndex() { return this._currentIndex }
  get totalCards() { return this._cards.length }

  destroy() {
    this.root.innerHTML = ''
  }

  // ============== Internal =================

  _build() {
    this.root.setAttribute('aria-hidden', 'true')
  }

  _render() {
    const R = STRINGS.pedagogy.resumenFinal
    if (!this._cards.length) {
      this.root.innerHTML = `
        <div class="resumen-card resumen-card--empty" role="dialog">
          <h3 class="resumen-empty-title">${escapeHtml(R.emptyTitle)}</h3>
          <p class="resumen-empty-msg">${escapeHtml(R.emptyMsg)}</p>
          <button type="button" class="resumen-btn-resumen resumen-btn-cerrar" data-role="cerrar">${escapeHtml(R.emptyCerrar)}</button>
        </div>
      `
      this.root.querySelector('[data-role="cerrar"]').addEventListener('click', () => this._close())
      return
    }

    const idx = this._currentIndex
    const card = this._cards[idx]
    const total = this._cards.length

    this.root.innerHTML = `
      <div class="resumen-card" role="dialog" aria-live="polite" aria-label="${escapeAttr(R.ariaLabel(idx + 1, total))}">
        <button type="button" class="resumen-btn-cerrar" data-role="cerrar" aria-label="${escapeAttr(R.cerrarAriaLabel)}">\u2715</button>
        <p class="resumen-counter">${idx + 1} / ${total}</p>
        <h3 class="resumen-card-title">${escapeHtml(card.titulo || '')}</h3>
        <p class="resumen-card-description">${escapeHtml(card.descripcion || '')}</p>
        <p class="resumen-card-dato">${escapeHtml(card.datoTexto || '')}</p>
        <p class="resumen-card-fuente">
          ${escapeHtml(STRINGS.pedagogy.dataScreen.fuente)}:
          ${card.url && card.url.startsWith('#')
            ? `<span class="resumen-card-hashtag">${escapeHtml(card.fuente || '')}</span>`
            : `<a class="resumen-card-link" href="${escapeAttr(card.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.fuente || '')} \u2197</a>`
          }
        </p>
        <div class="resumen-nav">
          <button type="button" class="resumen-btn-nav resumen-btn-prev" data-role="prev" ${idx === 0 ? 'disabled' : ''}>${escapeHtml(R.prev)}</button>
          <div class="resumen-dots">
            ${Array.from({ length: total }, (_, i) => `<button type="button" class="resumen-dot ${i === idx ? 'resumen-dot--active' : ''}" data-role="dot-${i}" aria-label="${escapeAttr(STRINGS.pedagogy.dataScreen.fuente)} ${i + 1}"></button>`).join('')}
          </div>
          <button type="button" class="resumen-btn-nav resumen-btn-next" data-role="next" ${idx === total - 1 ? 'disabled' : ''}>${escapeHtml(R.next)}</button>
        </div>
        <button type="button" class="resumen-btn-cerrar-bottom" data-role="cerrar-bottom">${escapeHtml(R.volverMenu)}</button>
      </div>
    `
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')

    // Wire listeners AFTER innerHTML
    this.root.querySelector('[data-role="cerrar"]').addEventListener('click', () => this._close())
    this.root.querySelector('[data-role="cerrar-bottom"]').addEventListener('click', () => this._close())
    const prevBtn = this.root.querySelector('[data-role="prev"]')
    const nextBtn = this.root.querySelector('[data-role="next"]')
    if (prevBtn) prevBtn.addEventListener('click', () => this._navigate(-1))
    if (nextBtn) nextBtn.addEventListener('click', () => this._navigate(+1))
    this.root.querySelectorAll('[data-role^="dot-"]').forEach((dot) => {
      const role = dot.getAttribute('data-role')
      const dotIdx = parseInt(role.replace('dot-', ''), 10)
      dot.addEventListener('click', () => this._goTo(dotIdx))
    })
  }

  _navigate(delta) {
    const next = this._currentIndex + delta
    if (next < 0 || next >= this._cards.length) return
    this._currentIndex = next
    this._render()
  }

  _goTo(idx) {
    if (idx < 0 || idx >= this._cards.length) return
    this._currentIndex = idx
    this._render()
  }

  _close() {
    this.hide()
    if (this.onClose) this.onClose()
  }
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

function escapeAttr(str) {
  return escapeHtml(str)
}