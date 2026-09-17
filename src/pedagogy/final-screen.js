/**
 * src/pedagogy/final-screen.js
 *
 * Pantalla final con 4 enlaces — Fase 1.7 (ROADMAP).
 *
 * Cierre del loop pedagógico. Cuando el boss final (planta_treco) se
 * desactiva (F1.6 A7 contract), aparece esta pantalla con:
 *
 *   - Título: "El Valle se planta"
 *   - Dato final del conflicto (de STRINGS.pedagogy.datos.final)
 *   - 4 enlaces a recursos cívicos reales:
 *       1. Plataforma vecinal (nomacrovertederozarra.com)
 *       2. Formulario de alegaciones
 *       3. Asociación Naturalista de Ayora y la Valle
 *       4. Hashtag #NoAlMacrovertederoDeZarra (texto seleccionable)
 *   - Botón "Volver a jugar" → menú principal
 *
 * Trigger: zarra:desactivacion con spriteId='enemies_planta_treco'.
 *
 * A6 contract: las URLs vienen de STRINGS, cero literales en código.
 *
 * Pedagogía: el juego no se "gana" — se rechaza en la calle y en las
 * alegaciones. Esta pantalla es el altavoz, no el premio.
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