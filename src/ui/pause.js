/**
 * src/ui/pause.js
 *
 * Pause overlay (F3.1 — REQ-10).
 *
 * Single DOM container #pause holds the modal with 3 buttons:
 *   - Continuar (primary): resume gameplay
 *   - Reiniciar stage:      restart the current stage via bootTestLevel:request
 *   - Salir al menu:        back to main menu via menu:back
 *
 * Trigger: 'pause' event from Input (Esc / P) during gameplay.
 *
 * State machine: shows on 'gameplay' -> 'paused'; hides back to 'gameplay'.
 * The input.setGate predicate is updated by main.js to also block during 'paused'.
 *
 * Idempotency: show()/hide() are safe to call multiple times.
 *
 * Camera: halted on show, unhalts on hide. bootTestLevel already calls
 * camera.unHalt(), so the Reiniciar-stage path is covered.
 */
import { emit } from '../event-bus.js?v=44'
import { STRINGS } from '../i18n/es.js?v=44'

export class PauseOverlay {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root           existing <div id="pause"> element
   * @param {Object}      [opts.camera]       RailCamera instance (for halt/unHalt)
   * @param {Object}      [opts.gameState]    mutable { state: 'main-menu'|'gameplay'|'overlay'|'paused' }
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('PauseOverlay requires root element')
    this.root = opts.root
    this.camera = opts.camera ?? null
    this.gameState = opts.gameState ?? { state: 'main-menu' }

    this._visible = false
    this._build()
  }

  // ============== Public API =================

  /**
   * Show the pause overlay. Halts the camera and flips the state machine.
   * Idempotent — calling show() when already visible is a no-op.
   */
  show() {
    if (this._visible) return
    this._visible = true
    if (this.camera && this.camera.halt) this.camera.halt()
    if (this.gameState) this.gameState.state = 'paused'

    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')
    emit('ui:overlayShown', {})
    this._focusPrimary()
  }

  /**
   * Hide the pause overlay. Unhalts the camera and restores gameplay state.
   * Idempotent — calling hide() when not visible is a no-op.
   */
  hide() {
    if (!this._visible) return
    this._visible = false
    if (this.camera && this.camera.unHalt) this.camera.unHalt()
    if (this.gameState) this.gameState.state = 'gameplay'

    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    emit('ui:overlayHidden', {})
  }

  get isVisible() {
    return this._visible
  }

  destroy() {
    this.root.innerHTML = ''
  }

  // ============== Internal =================

  _build() {
    const P = STRINGS.pause
    this.root.innerHTML = ''
    this.root.classList.add('pause-root')

    const card = document.createElement('div')
    card.className = 'pause-card'
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')
    card.setAttribute('aria-label', P.titulo)
    card.innerHTML = `
      <h2 class="pause-title">${P.titulo}</h2>
      <div class="pause-buttons">
        <button type="button" class="pause-btn pause-btn--primary" data-role="continue">${P.continuar}</button>
        <button type="button" class="pause-btn" data-role="restart">${P.reiniciarStage}</button>
        <button type="button" class="pause-btn" data-role="back">${P.salirMenu}</button>
      </div>
    `
    this.root.appendChild(card)

    this.root.querySelector('[data-role="continue"]').addEventListener('click', () => this._onContinue())
    this.root.querySelector('[data-role="restart"]').addEventListener('click', () => this._onRestart())
    this.root.querySelector('[data-role="back"]').addEventListener('click', () => this._onBack())
  }

  _focusPrimary() {
    const btn = this.root.querySelector('[data-role="continue"]')
    if (btn) btn.focus()
  }

  _onContinue() {
    this.hide()
  }

  _onRestart() {
    // REQ-CMB-011 pattern: emit an event; main.js handles the full reset +
    // TEST_LEVEL reload. Hide first so the boot completes against a clean
    // gameState ('gameplay', 'paused' state has been restored).
    this.hide()
    emit('bootTestLevel:request', {})
  }

  _onBack() {
    this.hide()
    emit('menu:back', {})
  }
}
