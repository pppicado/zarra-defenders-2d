/**
 * src/pedagogy/cards.js
 *
 * Cards pedagógicas in-game — Fase 1.1 (ROADMAP).
 *
 * Cada vez que el jugador destruye un enemigo, aparece una card flotante con:
 *   - Título del enemigo (ej: "Bidón de lixiviados")
 *   - Descripción específica del enemigo (1 frase, conecta con impacto real)
 *   - Dato del conflicto del stage (de `STRINGS.pedagogy.datos[stageId]`)
 *   - Link clickeable a la fuente citada (target="_blank, rel=noopener")
 *   - Botón de cierre (✕)
 *
 * Comportamiento:
 *   - Una sola card visible a la vez (reemplaza la anterior si llega otra)
 *   - Auto-dismiss a `dismissMs` (default 3000)
 *   - Click en cualquier parte de la card dismiss inmediato
 *   - Click en link de fuente NO dismiss (se abre nueva pestaña)
 *   - `onCardShown({ enemyId, spriteId, stageId, titulo, fuente, url, timestamp })`
 *     callback que main.js usa para tracking de `cardsShown` en Score
 *
 * Pedagogía (Fase 1.1 MVP):
 *   - Cada enemigo tiene una descripción específica (no copy genérica)
 *   - Cada card cita una fuente real (research/fuentes.md) con link verificado
 *   - El dato del stage aparece debajo de la descripción
 *   - Pedagogical sign-off pendiente: revisar las 12 descripciones en MANUAL_PLAYTHROUGH §12
 */

import { STRINGS } from '../i18n/es.js?v=44'
import { __zr } from '../engine/dom-debug.js?v=44'

const DEFAULT_DISMISS_MS = 3000

export class PedagogyCards {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root       existing <div id="pedagogy-card"> element
   * @param {number}      [opts.dismissMs=3000]
   * @param {Function}    [opts.onCardShown]  callback({ enemyId, spriteId, stageId, titulo, fuente, url, timestamp })
   * @param {Function}    [opts.clock]        injected clock for tests (returns ms). Default: () => Date.now()
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('PedagogyCards requires root element')
    this.root = opts.root
    this.dismissMs = opts.dismissMs ?? DEFAULT_DISMISS_MS
    this.onCardShown = opts.onCardShown ?? null
    this._clock = opts.clock ?? (() => Date.now())

    /** @type {number|null} timeout id of pending auto-dismiss */
    this._dismissTimer = null
    /** @type {Object|null} current card payload (for tests) */
    this._current = null
    /** @type {number} counter for cards shown in session */
    this._shownCount = 0

    this._build()
  }

  /**
   * Show a card for the given enemy. If a card is already visible, replaces it.
   * @param {Object} enemy
   * @param {string} enemy.id          unique enemy instance id (e.g. "e01")
   * @param {string|null} enemy.spriteId   spriteId from manifest (e.g. "enemies_camion_treco") — may be null
   * @param {string} [enemy.archetype]
   */
  show(enemy) {
    const payload = buildCardPayload(enemy, this._clock, STRINGS)
    if (!payload) {
      __zr.warn('[PedagogyCards] show(): could not build payload (missing stage data?)')
      return
    }
    this._render(payload)
  }

  /** Hide the current card immediately. */
  hide() {
    this._clearDismissTimer()
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this.root.innerHTML = ''
    this._current = null
  }

  get isVisible() {
    return !this.root.classList.contains('hidden')
  }

  /** @returns {Object|null} current card payload (for tests) */
  get currentCard() {
    return this._current
  }

  /** @returns {number} total cards shown in this session */
  get shownCount() {
    return this._shownCount
  }

  /** Cleanup. */
  destroy() {
    this._clearDismissTimer()
    this.root.innerHTML = ''
  }

  // ============== Internal =================

  _build() {
    // Set initial aria state
    this.root.setAttribute('aria-hidden', 'true')
  }

  _render(payload) {
    // Cancel any pending auto-dismiss from the previous card
    this._clearDismissTimer()

    const url = payload.url
    const isHashLink = payload.isHashLink

    this.root.innerHTML = `
      <button type="button" class="pedagogy-card-close" aria-label="Cerrar tarjeta">\u2715</button>
      <h3 class="pedagogy-card-title" id="pedagogy-card-title">${escapeHtml(payload.titulo)}</h3>
      <p class="pedagogy-card-description">${escapeHtml(payload.descripcion)}</p>
      <p class="pedagogy-card-dato">${escapeHtml(payload.datoTexto)}</p>
      <p class="pedagogy-card-fuente">
        Fuente:
        ${isHashLink
          ? `<span class="pedagogy-card-hashtag">${escapeHtml(payload.fuente)}</span>`
          : `<a class="pedagogy-card-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.fuente)} \u2197</a>`
        }
      </p>
    `
    this.root.dataset.cardId = payload.cardId
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')

    // Wire close button + click-to-dismiss on the card itself
    this.root.querySelector('.pedagogy-card-close').addEventListener('click', (e) => {
      e.stopPropagation()
      this.hide()
    })
    // Click on card body (not on link or close button) dismisses
    this.root.addEventListener('click', (e) => {
      if (e.target.closest('.pedagogy-card-link')) return  // link opens, don't dismiss
      if (e.target.closest('.pedagogy-card-close')) return  // close button already handled
      this.hide()
    })

    // Track current payload for tests + callback
    this._current = payload
    this._shownCount++

    // Notify consumer (Score tracking via main.js)
    if (this.onCardShown) this.onCardShown(payload)

    // Auto-dismiss after dismissMs
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

// ============== HTML escape helpers ==============
// Inline so tests don't need to import additional modules.

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

/**
 * Pure function — builds the card payload for an enemy. Returns null if
 * the stage data is missing (corrupted data, should never happen in practice).
 * Testable without DOM.
 *
 * @param {{id: string, spriteId: string|null}} enemy
 * @param {() => number} clock
 * @param {Object} strings  STRINGS global (injectable for tests)
 * @returns {{
 *   cardId: string,
 *   enemyId: string,
 *   spriteId: string|null,
 *   stageId: string|null,
 *   titulo: string,
 *   descripcion: string,
 *   datoTexto: string,
 *   fuenteLabel: string,
 *   fuenteUrl: string,
 *   timestamp: number,
 *   isHashLink: boolean,
 * } | null}
 */
export function buildCardPayload(enemy, clock, strings) {
  if (!enemy || typeof enemy !== 'object') return null
  const spriteId = enemy.spriteId ?? null
  const enemyData = spriteId ? strings.pedagogy.enemigos[spriteId] : null
  const stageId = enemyData?.stageId ?? null
  const stageDato = stageId ? strings.pedagogy.datos[stageId] : null

  let titulo, descripcion, datoTexto, fuente, url

  if (enemyData && stageDato) {
    titulo = enemyData.titulo
    descripcion = enemyData.descripcion
    datoTexto = stageDato.texto
    fuente = stageDato.fuente
    url = stageDato.url
  } else {
    // Fallback for unknown spriteId — use stage 1 generic data
    const fallback = strings.pedagogy.datos['stage1-lashoyas']
    if (!fallback) return null
    titulo = 'Papeleta firmada'
    descripcion = 'Has firmado contra el impacto del proyecto en el Valle de Ayora-Cofrentes.'
    datoTexto = fallback.texto
    fuente = fallback.fuente
    url = fallback.url
  }

  const ts = clock()
  return {
    cardId: `card_${ts}_${Math.floor(Math.random() * 1e6)}`,
    enemyId: enemy.id ?? null,
    spriteId,
    stageId,
    titulo,
    descripcion,
    datoTexto,
    fuente,
    url,
    timestamp: ts,
    isHashLink: url.startsWith('#'),
  }
}