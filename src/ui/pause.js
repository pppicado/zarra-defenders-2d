/**
 * src/ui/pause.js
 *
 * Pause overlay (F3.1 — REQ-10) + accessibility settings panel (F5.1).
 *
 * Single DOM container #pause holds the modal with 4 buttons:
 *   - Continuar (primary): resume gameplay
 *   - Reiniciar stage:      restart the current stage via bootTestLevel:request
 *   - Salir al menu:        back to main menu via menu:back
 *   - Ajustes:              toggles the accessibility panel (TTS on/off + rate)
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
   * @param {Object}      [opts.tts]          TTSEngine instance (F5.1) — exposes toggle/rate UI when provided
   * @param {Object}      [opts.contrast]     ContrastEngine instance (F5.2) — high-contrast toggle when provided
   * @param {Object}      [opts.motion]       MotionEngine instance (F5.3) — reduced-motion override UI when provided
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('PauseOverlay requires root element')
    this.root = opts.root
    this.camera = opts.camera ?? null
    this.gameState = opts.gameState ?? { state: 'main-menu' }
    this.tts = opts.tts ?? null
    this.contrast = opts.contrast ?? null
    this.motion = opts.motion ?? null

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
    const accessibilityToggle = (this.tts || this.contrast || this.motion)
      ? `<button type="button" class="pause-btn pause-btn--settings" data-role="settings">Ajustes de accesibilidad</button>`
      : ''
    card.innerHTML = `
      <h2 class="pause-title">${P.titulo}</h2>
      <div class="pause-buttons">
        <button type="button" class="pause-btn pause-btn--primary" data-role="continue">${P.continuar}</button>
        <button type="button" class="pause-btn" data-role="restart">${P.reiniciarStage}</button>
        <button type="button" class="pause-btn" data-role="back">${P.salirMenu}</button>
        ${accessibilityToggle}
      </div>
      <div class="pause-a11y-panel hidden" data-role="a11y-panel" aria-hidden="true"></div>
    `
    this.root.appendChild(card)

    this.root.querySelector('[data-role="continue"]').addEventListener('click', () => this._onContinue())
    this.root.querySelector('[data-role="restart"]').addEventListener('click', () => this._onRestart())
    this.root.querySelector('[data-role="back"]').addEventListener('click', () => this._onBack())
    const settingsBtn = this.root.querySelector('[data-role="settings"]')
    if (settingsBtn) settingsBtn.addEventListener('click', () => this._toggleA11yPanel())
    if (this.tts || this.contrast || this.motion) this._buildA11yPanel()
  }

  _buildA11yPanel() {
    const panel = this.root.querySelector('[data-role="a11y-panel"]')
    if (!panel) return
    const ttsSection = this.tts ? this._ttsPanelHTML() : ''
    const contrastSection = this.contrast ? this._contrastPanelHTML() : ''
    const motionSection = this.motion ? this._motionPanelHTML() : ''
    panel.innerHTML = `
      <h3 class="pause-a11y-title">Accesibilidad</h3>
      ${ttsSection}
      ${contrastSection}
      ${motionSection}
    `
    if (this.tts) this._wireTtsPanel(panel)
    if (this.contrast) this._wireContrastPanel(panel)
    if (this.motion) this._wireMotionPanel(panel)
  }

  _motionPanelHTML() {
    const osPref = this.motion.prefersReducedMotion()
    const override = this.motion.isOverrideEnabled()
    const active = this.motion.isReducedMotionActive()
    const label = osPref
      ? 'Reducir movimiento (tu sistema lo solicita)'
      : 'Reducir movimiento'
    return `
      <label class="pause-a11y-row">
        <input type="checkbox" data-role="motion-toggle" ${active ? 'checked' : ''}>
        <span>${label}</span>
      </label>
      <p class="pause-a11y-note">Desactiva parallax, screen shake y sine flutter.${osPref ? ' (Tu OS reporta prefers-reduced-motion: reduce.)' : ''}</p>
    `
  }

  _wireMotionPanel(panel) {
    const toggle = panel.querySelector('[data-role="motion-toggle"]')
    if (!toggle) return
    toggle.addEventListener('change', (e) => {
      this.motion.setOverride(e.target.checked)
    })
  }

  _ttsPanelHTML() {
    const enabled = this.tts.isEnabled()
    const rate = this.tts.getRate()
    const ttsAvail = this.tts.isAvailable()
    return `
      ${!ttsAvail ? '<p class="pause-a11y-note">Tu navegador no soporta Text-to-Speech.</p>' : ''}
      <label class="pause-a11y-row">
        <input type="checkbox" data-role="tts-toggle" ${enabled ? 'checked' : ''} ${!ttsAvail ? 'disabled' : ''}>
        <span>Leer datos en voz alta (TTS)</span>
      </label>
      <label class="pause-a11y-row">
        <span>Velocidad:</span>
        <input type="range" data-role="tts-rate" min="0.5" max="2" step="0.1" value="${rate}" ${!ttsAvail || !enabled ? 'disabled' : ''}>
        <span class="pause-a11y-rate-val" data-role="tts-rate-val">${rate.toFixed(1)}x</span>
      </label>
      <button type="button" class="pause-btn pause-btn--test" data-role="tts-test" ${!ttsAvail || !enabled ? 'disabled' : ''}>Probar voz</button>
    `
  }

  _contrastPanelHTML() {
    const enabled = this.contrast.isEnabled()
    return `
      <label class="pause-a11y-row">
        <input type="checkbox" data-role="contrast-toggle" ${enabled ? 'checked' : ''}>
        <span>Modo alto contraste</span>
      </label>
    `
  }

  _wireTtsPanel(panel) {
    const toggle = panel.querySelector('[data-role="tts-toggle"]')
    if (!toggle) return
    toggle.addEventListener('change', (e) => {
      this.tts.setEnabled(e.target.checked)
      this.tts.save()
      const rateInput = panel.querySelector('[data-role="tts-rate"]')
      const testBtn = panel.querySelector('[data-role="tts-test"]')
      if (rateInput) rateInput.disabled = !e.target.checked
      if (testBtn) testBtn.disabled = !e.target.checked
    })
    const rate = panel.querySelector('[data-role="tts-rate"]')
    if (rate) {
      rate.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value)
        this.tts.setRate(v)
        panel.querySelector('[data-role="tts-rate-val"]').textContent = `${v.toFixed(1)}x`
        this.tts.save()
      })
    }
    const test = panel.querySelector('[data-role="tts-test"]')
    if (test) {
      test.addEventListener('click', () => {
        this.tts.speak('Hola. Esto es una prueba de la voz del juego Zarra Defenders.')
      })
    }
  }

  _wireContrastPanel(panel) {
    const toggle = panel.querySelector('[data-role="contrast-toggle"]')
    if (!toggle) return
    toggle.addEventListener('change', (e) => {
      this.contrast.setEnabled(e.target.checked)
      this.contrast.save()
    })
  }

  _toggleA11yPanel() {
    const panel = this.root.querySelector('[data-role="a11y-panel"]')
    if (!panel) return
    const hidden = panel.classList.toggle('hidden')
    panel.setAttribute('aria-hidden', hidden ? 'true' : 'false')
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
