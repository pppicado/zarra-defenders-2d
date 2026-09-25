/**
 * src/ui/overlay.js
 *
 * Game-over + victory overlay (F3 game-over-flow + victory-flow spec).
 *
 * Single DOM container #game-overlay holds two modal variants: game-over and victory.
 * Both share the same skeleton (title + score + Firmas recogidas + Mejor + buttons).
 *
 * Triggers:
 *   - integrity:exhausted   -> showGameOver()
 *   - stage:cleared         -> showVictory()  (also triggers score.tryWriteBest)
 *
 * Buttons:
 *   - Reintentar test level : resets integrity/score/firmas/enemies/camera + hides overlay + resumes ticker
 *   - Volver al men\u00fa principal : emits menu:back + hides overlay
 *
 * World dim: when visible, world layer gets a CSS opacity 0.5 + canvas pointer-events: none.
 *
 * Idempotency: showGameOver / showVictory are safe to call multiple times.
 */
import { emit } from '../event-bus.js?v=44'
import { on } from '../event-bus.js?v=44'
import { STRINGS } from '../i18n/es.js?v=44'

export class Overlay {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root         existing <div id="game-overlay"> element
   * @param {Object} opts.integrity        Integrity instance
   * @param {Object} opts.score            Score instance
   * @param {Object} opts.camera           RailCamera instance (for halt/unHalt + setTime(0))
   * @param {Object} opts.combat           Combat instance (for reset)
   * @param {Object} opts.enemies          EnemyManager instance (for reset)
   * @param {Object} opts.gameState        mutable { state: 'main-menu'|'gameplay'|'overlay' }
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('Overlay requires root element')
    this.root = opts.root
    this.integrity = opts.integrity
    this.score = opts.score
    this.camera = opts.camera
    this.combat = opts.combat
    this.enemies = opts.enemies
    this.gameState = opts.gameState ?? { state: 'main-menu' }
    this.share = opts.share ?? null  // F5.4 ShareEngine instance (optional)
    // BG-009 — context-aware retry label: 'Reintentar test level' only in
    // ?test=1 dev mode; 'Reintentar' in production.
    this._isTestMode = opts.isTestMode ?? false

    this._modal = null     // 'gameover' | 'victory' | null
    this._unsubs = []

    this._build()
    this._attachListeners()
  }

  // ============== Public API =================

  showGameOver() {
    this._showModal('gameover', {
      title: STRINGS.overlay.gameOver.titulo,
      titleClass: STRINGS.overlay.gameOver.tituloClass,
      verb: STRINGS.overlay.gameOver.verb,
    })
  }

  showVictory() {
    if (this.score && this.score.tryWriteBest) this.score.tryWriteBest()
    this._showModal('victory', {
      title: STRINGS.overlay.victory.titulo,
      titleClass: STRINGS.overlay.victory.tituloClass,
      verb: STRINGS.overlay.victory.verb,
    })
  }

  hide() {
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this._modal = null
    emit('ui:overlayHidden', {})
  }

  get isVisible() {
    return !this.root.classList.contains('hidden')
  }

  destroy() {
    for (const u of this._unsubs) u()
    this._unsubs = []
  }

  // ============== Internal =================

  _build() {
    this.root.innerHTML = ''
    this.root.classList.add('overlay-root')

    const card = document.createElement('div')
    card.className = 'overlay-card'
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')
    card.innerHTML = `
      <h2 class="overlay-title" data-role="title">${STRINGS.overlay.gameOver.titulo}</h2>
      <p class="overlay-score-line" data-role="scoreLine">${STRINGS.overlay.scoreLine(0)}</p>
      <p class="overlay-firmas-line" data-role="firmasLine">${STRINGS.overlay.firmasLine(STRINGS.overlay.victory.verb, 0)}</p>
      <p class="overlay-best-line" data-role="bestLine">${STRINGS.overlay.mejorVacio}</p>
      <p class="overlay-newrecord hidden" data-role="newRecord">${STRINGS.overlay.newRecord}</p>
      <div class="overlay-share hidden" data-role="share-block">
        <p class="overlay-share-hint">${STRINGS.share?.hint ?? 'Comparte'}</p>
        <div class="overlay-share-buttons">
          <button type="button" class="overlay-share-btn" data-role="share-twitter" aria-label="Compartir en Twitter">𝕏 Twitter</button>
          <button type="button" class="overlay-share-btn" data-role="share-facebook" aria-label="Compartir en Facebook">Facebook</button>
          <button type="button" class="overlay-share-btn" data-role="share-clipboard" aria-label="Copiar al portapapeles">Copiar</button>
          <button type="button" class="overlay-share-btn hidden" data-role="share-native" aria-label="Compartir nativo del sistema">Compartir</button>
        </div>
        <p class="overlay-share-status hidden" data-role="share-status" aria-live="polite"></p>
      </div>
      <div class="overlay-buttons">
        <button type="button" class="overlay-btn overlay-btn--primary" data-role="retry">${this._isTestMode ? STRINGS.overlay.retryTest : STRINGS.overlay.retry}</button>
        <button type="button" class="overlay-btn" data-role="back">${STRINGS.overlay.back}</button>
      </div>
    `
    this.root.appendChild(card)

    this.root.querySelector('[data-role="retry"]').addEventListener('click', () => this._onRetry())
    this.root.querySelector('[data-role="back"]').addEventListener('click', () => this._onBack())
  }

  _showModal(kind, { title, titleClass, verb }) {
    if (this._modal === kind) return  // idempotent
    this._modal = kind
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')

    const card = this.root.querySelector('.overlay-card')
    card.dataset.kind = kind
    const titleEl = this.root.querySelector('[data-role="title"]')
    titleEl.textContent = title
    titleEl.classList.remove('overlay-title--fail', 'overlay-title--win')
    titleEl.classList.add(titleClass)

    this._refreshStats(verb)
    // Halt the camera and dim the world
    if (this.camera && this.camera.halt) this.camera.halt()
    emit('ui:overlayShown', {})
  }

  _refreshStats(verb) {
    const score = this.score?.read?.() ?? { score: 0, firmas: 0, best: null }
    this.root.querySelector('[data-role="scoreLine"]').textContent = STRINGS.overlay.scoreLine(score.score)
    this.root.querySelector('[data-role="firmasLine"]').textContent = STRINGS.overlay.firmasLine(verb, score.firmas)

    const best = score.best ?? this.score?.loadBest?.() ?? null
    const bestLine = this.root.querySelector('[data-role="bestLine"]')
    bestLine.textContent = best ? STRINGS.overlay.mejorLine(best.firmas) : STRINGS.overlay.mejorVacio

    // New-record badge: only show if current run beats stored best (only meaningful for victory)
    const newRecordEl = this.root.querySelector('[data-role="newRecord"]')
    if (best && score.firmas > best.firmas) {
      newRecordEl.classList.remove('hidden')
    } else {
      newRecordEl.classList.add('hidden')
    }
  }

  _onRetry() {
    // REQ-CMB-011: emit a single `bootTestLevel:request` event so the
    // overlay stays UI-only. main.js's listener performs the full state
    // reset + TEST_LEVEL reload — same path as menu:startRequested.
    // Do NOT call integrity/score/combat/enemies/camera here directly.
    emit('bootTestLevel:request', {})
    this.hide()
    this.gameState.state = 'gameplay'
  }

  _onBack() {
    if (this.camera?.unHalt) this.camera.unHalt()
    this.hide()
    emit('menu:back', {})
    this.gameState.state = 'main-menu'
  }

  // ============== F5.4 Sharing =================

  /**
   * Populate the share block in the victory overlay with computed text + url.
   * Called by main.js when 'stage:cleared' fires. No-op if share engine was not injected.
   */
  populateShare(scoreData, stageId) {
    if (!this.share) return
    const block = this.root.querySelector('[data-role="share-block"]')
    if (!block) return
    const enriched = { ...(scoreData || {}), stageId: stageId ?? '' }
    const shareUrl = this.share.buildShareUrl(enriched)
    const shareText = this.share.buildShareText(enriched, shareUrl)
    const showNative = this.share.hasNativeShare()
    block.classList.remove('hidden')
    const nativeBtn = this.root.querySelector('[data-role="share-native"]')
    if (nativeBtn) {
      if (showNative) nativeBtn.classList.remove('hidden')
      else nativeBtn.classList.add('hidden')
    }
    const tw = this.root.querySelector('[data-role="share-twitter"]')
    if (tw) tw.onclick = () => this.share.openTwitter(shareText, shareUrl)
    const fb = this.root.querySelector('[data-role="share-facebook"]')
    if (fb) fb.onclick = () => this.share.openFacebook(shareUrl)
    const clip = this.root.querySelector('[data-role="share-clipboard"]')
    if (clip) {
      clip.onclick = async () => {
        const ok = await this.share.copyToClipboard(shareText)
        this._showShareStatus(ok ? this._shareStatusOk() : this._shareStatusFail(), ok)
      }
    }
    if (nativeBtn && showNative) {
      nativeBtn.onclick = async () => {
        const ok = await this.share.nativeShare({
          title: this.share.getTitle(),
          text: shareText,
          url: shareUrl,
        })
        if (ok) this._showShareStatus(this._shareStatusNative(), true)
      }
    }
  }

  _showShareStatus(text, ok) {
    const el = this.root.querySelector('[data-role="share-status"]')
    if (!el) return
    el.textContent = text
    el.classList.remove('hidden')
    el.style.color = ok ? '#4ade80' : '#fca5a5'
    setTimeout(() => el.classList.add('hidden'), 2400)
  }

  _shareStatusOk() { return STRINGS.share?.copyOk ?? 'Copiado' }
  _shareStatusFail() { return STRINGS.share?.copyFail ?? 'No se pudo copiar' }
  _shareStatusNative() { return STRINGS.share?.shareOk ?? 'Compartido' }

  _attachListeners() {
    this._unsubs.push(on('integrity:exhausted', () => {
      // Halt camera + freeze integrity (only fires once)
      if (this.camera?.halt) this.camera.halt()
      if (this.integrity?.freeze) this.integrity.freeze()
      this.gameState.state = 'overlay'
      this.showGameOver()
    }))
    // victory is triggered externally via this.showVictory() (called by VictoryDetector)
  }
}
