/**
 * src/pedagogy/final-screen.js
 *
 * Final screen with 4 links — Phase 1.7 (ROADMAP).
 *
 * Closes the pedagogical loop. When the final boss (planta_treco) is
 * deactivated (F1.6 A7 contract), this screen appears with:
 *
 *   - Title: "El Valle se planta"
 *   - Final conflict data (from STRINGS.pedagogy.datos.final)
 *   - 4 links to real civic resources:
 *       1. Neighborhood platform (nomacrovertederozarra.com)
 *       2. Allegations form
 *       3. Asociacion Naturalista de Ayora y la Valle
 *       4. Hashtag #NoAlMacrovertederoDeZarra (selectable text)
 *   - "Volver a jugar" button → main menu
 *
 * Trigger: zarra:desactivacion with spriteId='enemies_planta_treco'.
 *
 * A6 contract: URLs come from STRINGS, zero literals in code.
 *
 * Pedagogy: the game is not "won" — it's rejected on the streets and in
 * allegations. This screen is the loudspeaker, not the prize.
 */

import { STRINGS } from '../i18n/es.js?v=44'

const FINAL_BOSS_SPRITE_ID = 'enemies_planta_treco'

export class FinalScreen {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root          existing <div id="final-screen"> element
   * @param {Function}    [opts.onClose]    callback() called when user clicks 'Volver a jugar'
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('FinalScreen requires root element')
    this.root = opts.root
    this.onClose = opts.onClose ?? null
    this._build()
  }

  /**
   * Show the final screen. Reads dato + enlaces from STRINGS.pedagogy.final.
   */
  show() {
    const final = STRINGS.pedagogy.final
    if (!final || !final.enlaces) {
      __zr.warn('[FinalScreen] missing STRINGS.pedagogy.final data')
      return
    }
    const e = final.enlaces
    this.root.innerHTML = `
      <div class="final-screen-card" role="dialog" aria-live="polite" aria-label="${escapeHtml(final.titulo || 'Cierre pedag\u00f3gico')}">
        <h2 class="final-screen-title">${escapeHtml(final.titulo || 'El Valle se planta')}</h2>
        <p class="final-screen-dato">${escapeHtml(final.dato || '')}</p>
        <div class="final-screen-enlaces">
          ${this._renderEnlace(e.plataforma)}
          ${this._renderEnlace(e.alegaciones)}
          ${this._renderEnlace(e.asociacion)}
          ${this._renderEnlace(e.hashtag)}
        </div>
        <button type="button" class="final-screen-volver" data-role="volver">${escapeHtml(final.volverJugar || 'Volver a jugar')}</button>
      </div>
    `
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')

    this.root.querySelector('[data-role="volver"]').addEventListener('click', () => this._close())
  }

  hide() {
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this.root.innerHTML = ''
  }

  get isVisible() {
    return !this.root.classList.contains('hidden')
  }

  destroy() {
    this.hide()
  }

  _build() {
    this.root.setAttribute('aria-hidden', 'true')
  }

  /**
   * Render an enlace (link). If URL starts with #, render as selectable text
   * (hashtag). Otherwise render as <a target=_blank>.
   * @param {{label: string, url: string}} enlace
   */
  _renderEnlace(enlace) {
    if (!enlace || !enlace.url) return ''
    const isHash = enlace.url.startsWith('#')
    const inner = isHash
      ? `<span class="final-screen-hashtag">${escapeHtml(enlace.label)}</span>`
      : `<a class="final-screen-link" href="${escapeAttr(enlace.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(enlace.label)} \u2197</a>`
    return `<div class="final-screen-enlace">${inner}</div>`
  }

  _close() {
    const cb = this.onClose
    this.hide()
    if (cb) cb()
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

export { FINAL_BOSS_SPRITE_ID }