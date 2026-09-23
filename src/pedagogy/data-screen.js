/**
 * src/pedagogy/data-screen.js
 *
 * Pre-stage data screen — Phase 1.5 (ROADMAP).
 *
 * Overlay that appears BEFORE each stage showing the conflict data
 * corresponding to that stage. The player reads the data + source and
 * then presses "Continuar" (or Esc/Space) to start playing.
 *
 * Pedagogy:
 *   - Before each stage, 5s of data + citation visible
 *   - Player arrives at gameplay with fresh pedagogical context
 *   - Cited source visible, reinforces A5 contract (pre-researched sources)
 *
 * Trigger: stage:aboutToStart { stageId } (emitted by main.js before
 * bootTestLevel). After Continuar, main.js starts the stage.
 */

import { STRINGS } from '../i18n/es.js?v=44'
import { __zr } from '../engine/dom-debug.js?v=44'

export class DataScreen {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root          existing <div id="data-screen"> element
   * @param {Function}    [opts.onContinue] callback() called when user clicks Continue or presses Esc/Space
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('DataScreen requires root element')
    this.root = opts.root
    this.onContinue = opts.onContinue ?? null
    this._stageId = null
    this._build()
  }

  /**
   * Show the data screen for the given stage.
   * @param {string} stageId
   */
  show(stageId) {
    const data = STRINGS.pedagogy.datos[stageId]
    if (!data) {
      __zr.warn(`[DataScreen] no dato for stageId=${stageId}`)
      this.hide()
      return
    }
    this._stageId = stageId
    this.root.innerHTML = `
      <div class="data-screen-card" role="dialog" aria-live="polite" aria-label="${escapeAttr(STRINGS.pedagogy.dataScreen.ariaLabel)}">
        <p class="data-screen-stage">${escapeHtml(this._stageLabel(stageId))}</p>
        <h2 class="data-screen-title">${escapeHtml(STRINGS.pedagogy.dataScreen.titulo)}</h2>
        <blockquote class="data-screen-dato">${escapeHtml(data.texto)}</blockquote>
        <p class="data-screen-fuente">
          ${escapeHtml(STRINGS.pedagogy.dataScreen.fuente)}:
          ${data.url && data.url.startsWith('#')
            ? `<span class="data-screen-hashtag">${escapeHtml(data.fuente)}</span>`
            : `<a class="data-screen-link" href="${escapeAttr(data.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.fuente)} \u2197</a>`
          }
        </p>
        <button type="button" class="data-screen-continue" data-role="continue">${escapeHtml(STRINGS.pedagogy.dataScreen.continuar)}</button>
        <p class="data-screen-footer">${escapeHtml(STRINGS.pedagogy.cards.footerFuentes)}</p>
      </div>
    `
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')

    // Wire listeners AFTER innerHTML
    this.root.querySelector('[data-role="continue"]').addEventListener('click', () => this._continue())
    // Esc/Space dismiss — listen on document
    this._onKeyDown = (e) => {
      if (this.isVisible && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        this._continue()
      }
    }
    document.addEventListener('keydown', this._onKeyDown)
  }

  hide() {
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this.root.innerHTML = ''
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown)
      this._onKeyDown = null
    }
    this._stageId = null
  }

  get isVisible() {
    return !this.root.classList.contains('hidden')
  }

  get stageId() {
    return this._stageId
  }

  destroy() {
    this.hide()
  }

  _continue() {
    const cb = this.onContinue
    const stageId = this._stageId
    this.hide()
    if (cb) cb(stageId)
  }

  _stageLabel(stageId) {
    const map = STRINGS.pedagogy.dataScreen.stageLabels
    return map[stageId] || stageId || '?'
  }

  _build() {
    this.root.setAttribute('aria-hidden', 'true')
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