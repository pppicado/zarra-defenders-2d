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
import { emit } from '../event-bus.js?v=10'
import { on } from '../event-bus.js?v=10'

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

    this._modal = null     // 'gameover' | 'victory' | null
    this._unsubs = []

    this._build()
    this._attachListeners()
  }

  // ============== Public API =================

  showGameOver() {
    this._showModal('gameover', {
      title: 'Stage failed',
      titleClass: 'overlay-title--fail',
      verb: 'firmas perdidas',
    })
  }

  showVictory() {
    if (this.score && this.score.tryWriteBest) this.score.tryWriteBest()
    this._showModal('victory', {
      title: 'Stage cleared',
      titleClass: 'overlay-title--win',
      verb: 'firmas recogidas',
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
      <h2 class="overlay-title" data-role="title">Stage failed</h2>
      <p class="overlay-score-line" data-role="scoreLine">Puntuaci\u00f3n: 0</p>
      <p class="overlay-firmas-line" data-role="firmasLine">Firmas recogidas: 0</p>
      <p class="overlay-best-line" data-role="bestLine">Mejor: \u2014 firmas</p>
      <p class="overlay-newrecord hidden" data-role="newRecord">\u00a1NUEVO R\u00c9CORD!</p>
      <div class="overlay-buttons">
        <button type="button" class="overlay-btn overlay-btn--primary" data-role="retry">Reintentar test level</button>
        <button type="button" class="overlay-btn" data-role="back">Volver al men\u00fa principal</button>
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
    this.root.querySelector('[data-role="scoreLine"]').textContent = `Puntuaci\u00f3n: ${score.score}`
    this.root.querySelector('[data-role="firmasLine"]').textContent = `Firmas ${verb}: ${score.firmas}`

    const best = score.best ?? this.score?.loadBest?.() ?? null
    const bestLine = this.root.querySelector('[data-role="bestLine"]')
    bestLine.textContent = best ? `Mejor: ${best.firmas} firmas` : 'Mejor: \u2014 firmas'

    // New-record badge: only show if current run beats stored best (only meaningful for victory)
    const newRecordEl = this.root.querySelector('[data-role="newRecord"]')
    if (best && score.firmas > best.firmas) {
      newRecordEl.classList.remove('hidden')
    } else {
      newRecordEl.classList.add('hidden')
    }
  }

  _onRetry() {
    // Reset everything: integrity, score, combat, enemies, camera
    if (this.integrity?.reset) this.integrity.reset()
    if (this.score?.reset) this.score.reset()
    if (this.combat?.reset) this.combat.reset()
    if (this.enemies?.reset) this.enemies.reset()
    if (this.camera?.setTime) this.camera.setTime(0)
    if (this.camera?.unHalt) this.camera.unHalt()
    this.hide()
    this.gameState.state = 'gameplay'
  }

  _onBack() {
    if (this.camera?.unHalt) this.camera.unHalt()
    this.hide()
    emit('menu:back', {})
    this.gameState.state = 'main-menu'
  }

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
