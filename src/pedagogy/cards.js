/**
 * src/pedagogy/cards.js
 *
 * In-game pedagogical cards — Phase 1.1 (ROADMAP).
 *
 * Each time the player destroys an enemy, a card appears with the enemy's
 * pedagogical context. F3.5.2 changed the card's interaction model:
 *
 * OLD: large card top-right, auto-dismiss 3s, click-anywhere-to-dismiss.
 * NEW (F3.5.2): compact card bottom-right (paired with the 3 hearts),
 *      NO auto-dismiss. Click on the card pauses the game for focused
 *      reading; click outside the card closes it and resumes the game
 *      if it was paused by the card. Pressing Esc also closes the card.
 *
 * F3.5.4 (refinement over F3.5.2): the compact footprint matches the
 * 3-heart height (~96px CSS) and sits to the RIGHT of the hand sprite
 * (bottom-center → bottom-right). When collapsed, only the title + a
 * truncated description line are visible. Click expands the card to
 * show the full content (description + dato + fuente + TTS + footer).
 *
 * Each card shows:
 *   - Title of the enemy
 *   - Description (specific to the enemy)
 *   - Stage conflict data (from `STRINGS.pedagogy.datos[stageId]`)
 *   - Clickable source citation
 *   - Footer "Datos basados en fuentes publicas verificables"
 *
 * Behavior (F3.5.2 + F3.5.4):
 *   - Single card visible at a time (a new enemy replaces the prior)
 *   - NO auto-dismiss; card persists until dismissed by user
 *   - Click on card body (not link / not close button): toggle expanded;
 *     expanding pauses the game; collapsing resumes if we paused it
 *   - Click on card link: open in new tab (does NOT pause / close)
 *   - Click on close button: close + auto-resume
 *   - Click outside the card: close + auto-resume (if paused by card)
 *   - Esc when card visible: close + auto-resume
 *   - Emits `pedagogy:visibility` on show/hide/expand/collapse so
 *     siblings (modal-intermedio) can stack without coupling
 *
 * Pedagogy (Phase 1.1 MVP, preserved in F3.5.2 + F3.5.4):
 *   - Each enemy has a specific description (no generic copy)
 *   - Each card cites a real source with a verified link
 *   - Footer reminds the player that the data comes from public sources
 *
 * Pedagogical sign-off: review the 12 enemy descriptions in
 * MANUAL_PLAYTHROUGH §12 (still pending as of the original Fase 1).
 */
import { STRINGS } from '../i18n/es.js?v=44'
import { __zr } from '../engine/dom-debug.js?v=44'
import { emit } from '../event-bus.js?v=44'

export class PedagogyCards {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root       existing <div id="pedagogy-card"> element
   * @param {Object}      [opts.gameState] mutable { state: 'main-menu'|'gameplay'|'overlay'|'paused' }
   * @param {Object}      [opts.camera]   RailCamera (halt/unHalt for F3.5.2 pause integration)
   * @param {Function}    [opts.onCardShown] callback({...payload}) on every show()
   * @param {Function}    [opts.clock]    injected clock for tests (returns ms). Default: () => Date.now()
   * @param {Object}      [opts.tts]      TTSEngine instance (F5.1). When provided, card shows
   *                                       a "Escuchar" button that speaks the dato via Web Speech API.
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('PedagogyCards requires root element')
    this.root = opts.root
    this.gameState = opts.gameState ?? null
    this.camera = opts.camera ?? null
    this.onCardShown = opts.onCardShown ?? null
    this._clock = opts.clock ?? (() => Date.now())
    this._tts = opts.tts ?? null

    /** @type {Object|null} current card payload (for tests) */
    this._current = null
    /** @type {number} counter for cards shown in session */
    this._shownCount = 0
    /** @type {boolean} tracks if the current card pause was initiated by clicking it */
    this._pausedByCard = false
    /**
     * F7.4 — kills-by-spriteId counter (in-memory, per-run).
     * Shows the cumulative count of each enemy type destroyed in this run.
     * Reset on `bootTestLevel` (via `resetRunCounters`) so it doesn't leak
     * across runs. NOT persisted to localStorage (it's a "per-run" stat
     * like `firmas`).
     */
    this._killsBySpriteId = new Map()
    /** @type {Function|null} document-level click listener (outside-click detection) */
    this._outsideClickHandler = null
    /** @type {Function|null} window keydown listener (Esc to close) */
    this._escHandler = null
    /** @type {Function|null} root click listener (card-internal handler) — F3.5.4 fix
     *  for duplicate-listener leak: every _render() registers a fresh listener
     *  via addEventListener, so subsequent renders would stack. We store the
     *  current handler reference and removeEventListener before re-adding. */
    this._rootClickHandler = null
    // F3.5.4: compact footprint by default; click toggles expanded.
    this._expanded = false

    this._build()
  }

  /**
   * Show a card for the given enemy. If a card is already visible, replaces it.
   * @param {Object} enemy
   * @param {string} enemy.id            unique enemy instance id (e.g. "e01")
   * @param {string|null} enemy.spriteId spriteId from manifest (e.g. "enemies_camion_treco")
   * @param {string} [enemy.archetype]
   */
  show(enemy) {
    const payload = buildCardPayload(enemy, this._clock, STRINGS)
    if (!payload) {
      __zr.warn('[PedagogyCards] show(): could not build payload (missing stage data?)')
      return
    }
    // F7.4 — increment kills-by-spriteId counter BEFORE rendering so the
    // card shows the cumulative count including this kill.
    if (payload.spriteId) {
      const prev = this._killsBySpriteId.get(payload.spriteId) || 0
      this._killsBySpriteId.set(payload.spriteId, prev + 1)
    }
    payload.killsThisRun = payload.spriteId
      ? this._killsBySpriteId.get(payload.spriteId)
      : 0
    this._render(payload)
  }

  /**
   * F7.4 — Reset per-run counters (killsBySpriteId). Called from main.js
   * on `bootTestLevel` (new run / retry / re-stage) so the cumulative
   * count doesn't leak across runs. Counter is per-spriteId so the card
     * title can show "Camion TRECO (3)" when the player has destroyed
   * 3 of that type in this run.
   */
  resetRunCounters() {
    this._killsBySpriteId.clear()
  }

  /** Hide the current card immediately. */
  hide() {
    this._uninstallGlobalListeners()
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this.root.innerHTML = ''
    this._current = null
    this._expanded = false
    // F3.5.2: closing the card auto-resumes if we paused because of it
    if (this._pausedByCard) {
      this._resume()
    }
    // F3.5.4: notify siblings (e.g. modal-intermedio) that the card went away
    emit('pedagogy:visibility', { visible: false, expanded: false })
  }

  get isVisible() {
    return !this.root.classList.contains('hidden')
  }

  /** F3.5.4: whether the card is currently in expanded (full-content) view */
  get isExpanded() {
    return this._expanded
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
    this._uninstallGlobalListeners()
    if (this._rootClickHandler && this.root) {
      this.root.removeEventListener('click', this._rootClickHandler)
      this._rootClickHandler = null
    }
    this.root.innerHTML = ''
  }

  // ============== Internal =================

  _build() {
    this.root.setAttribute('aria-hidden', 'true')
    this.root.classList.add('hidden')
  }

  _render(payload) {
    const url = payload.url
    const isHashLink = payload.isHashLink
    // F3.5.4: every new card starts collapsed (compact footprint). The
    // user clicks to expand and read the full content; clicks again to
    // collapse and resume gameplay. Reset expansion state on every render
    // so the footprint never carries stale state across enemy kills.
    this._expanded = false

    // F7.4 — build the title with the cumulative count for this spriteId.
    // "Camion TRECO (3)" if the player has destroyed 3 of this type in this
    // run; plain "Camion TRECO" for the first kill (count = 1). The counter
    // is omitted from the title for the first kill to keep the canonical
    // name prominent — pedagogical rationale: the cumulative count is only
    // meaningful once the player has destroyed more than one.
    const kills = payload.killsThisRun ?? 1
    const titleText = kills > 1
      ? `${payload.titulo} (${kills})`
      : payload.titulo

    this.root.innerHTML = `
      <button type="button" class="pedagogy-card-close" aria-label="${escapeAttr(STRINGS.pedagogy.cards.cerrarAriaLabel)}">\u2715</button>
      <h3 class="pedagogy-card-title" id="pedagogy-card-title">${escapeHtml(titleText)}</h3>
      <p class="pedagogy-card-description">${escapeHtml(payload.descripcion)}</p>
      <p class="pedagogy-card-dato">${escapeHtml(payload.datoTexto)}</p>
      <p class="pedagogy-card-fuente">
        ${escapeHtml(STRINGS.pedagogy.dataScreen.fuente)}:
        ${isHashLink
          ? `<span class="pedagogy-card-hashtag">${escapeHtml(payload.fuente)}</span>`
          : `<a class="pedagogy-card-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.fuente)} \u2197</a>`
        }
      </p>
      <button type="button" class="pedagogy-card-tts" aria-label="Escuchar el dato" data-role="tts">\ud83d\udd0a Escuchar</button>
      <p class="pedagogy-card-footer">${escapeHtml(STRINGS.pedagogy.cards.footerFuentes)}</p>
    `
    this.root.dataset.cardId = payload.cardId
    this.root.classList.remove('hidden')
    this.root.classList.remove('expanded')
    this.root.setAttribute('aria-hidden', 'false')
    this.root.setAttribute('aria-expanded', 'false')

    // F3.5.2 + F3.5.4: 4 click targets inside the card
    //   - link: opens in new tab; do NOT pause / close
    //   - close button (✕): explicitly closes; resumes if we paused
    //   - body click: toggle expand/collapse; expanding pauses the game
    //   - tts button: speaks the dato via Web Speech API (F5.1)
    //
    // F3.5.4: remove the previous handler before adding a new one. Without
    // this, every _render() stacked a duplicate listener and a single
    // click fired _toggleExpand() N times (once per render), making the
    // pause/expand state toggle back to its starting value.
    if (this._rootClickHandler) {
      this.root.removeEventListener('click', this._rootClickHandler)
    }
    this._rootClickHandler = (e) => {
      if (e.target.closest('.pedagogy-card-link')) return
      if (e.target.closest('.pedagogy-card-close')) {
        this.hide()
        return
      }
      if (e.target.closest('[data-role="tts"]')) {
        e.stopPropagation()
        if (this._tts) {
          this._tts.cancel()
          this._tts.speak(`${payload.titulo}. ${payload.datoTexto}`)
        }
        return
      }
      // Body click — toggle expand + pause/resume
      e.stopPropagation()
      this._toggleExpand()
    }
    this.root.addEventListener('click', this._rootClickHandler)

    // Document-level outside-click detection. Bubble phase so it runs AFTER
    // the card-internal handler (whose e.stopPropagation prevents outside
    // dispatch when the body is clicked).
    this._outsideClickHandler = (e) => {
      if (!this.root.contains(e.target)) {
        this.hide()
      }
    }
    document.addEventListener('click', this._outsideClickHandler)

    // Esc closes the card when visible (without showing the pause overlay)
    this._escHandler = (e) => {
      if (e.key !== 'Escape') return
      if (!this.isVisible) return
      e.preventDefault()
      this.hide()
    }
    window.addEventListener('keydown', this._escHandler)

    this._current = payload
    this._shownCount++

    if (this.onCardShown) this.onCardShown(payload)
    // F3.5.4: notify siblings that the card is visible (collapsed)
    emit('pedagogy:visibility', { visible: true, expanded: false })
  }

  /**
   * F3.5.4 — toggle the card between compact (collapsed) and full
   * (expanded) views. Expanding pauses the game so the player can read;
   * collapsing resumes only if we were the one who paused it (preserves
   * the F3.5.2 invariant that the card doesn't clobber manual Esc pauses).
   */
  _toggleExpand() {
    if (!this.isVisible) return
    if (!this._expanded) {
      // Expanding — pause if currently playing
      this._expanded = true
      this.root.classList.add('expanded')
      this.root.setAttribute('aria-expanded', 'true')
      if (this.gameState && this.gameState.state === 'gameplay') {
        this._pause()
      }
      emit('pedagogy:visibility', { visible: true, expanded: true })
    } else {
      // Collapsing — auto-resume if we paused it
      this._expanded = false
      this.root.classList.remove('expanded')
      this.root.setAttribute('aria-expanded', 'false')
      if (this._pausedByCard) {
        this._resume()
      }
      emit('pedagogy:visibility', { visible: true, expanded: false })
    }
  }

  _uninstallGlobalListeners() {
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler)
      this._outsideClickHandler = null
    }
    if (this._escHandler) {
      window.removeEventListener('keydown', this._escHandler)
      this._escHandler = null
    }
  }

  _pause() {
    if (!this.gameState) return
    this.gameState.state = 'paused'
    if (this.camera?.halt) this.camera.halt()
    this._pausedByCard = true
  }

  _resume() {
    if (!this.gameState) return
    this.gameState.state = 'gameplay'
    if (this.camera?.unHalt) this.camera.unHalt()
    this._pausedByCard = false
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
    // F7.4 — populated by show() before _render() runs. Default 1 here for
    // direct callers of buildCardPayload (e.g. tests).
    killsThisRun: 1,
  }
}
