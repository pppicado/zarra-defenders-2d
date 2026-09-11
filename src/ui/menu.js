/**
 * src/ui/menu.js
 *
 * Main menu DOM overlay (F3 main-menu spec).
 *
 * Buttons (locked):
 *   1. Iniciar test level   (default focus)
 *   2. Acerca de             (scrollable inline modal)
 *   3. Disclaimer            (scrollable inline modal)
 *
 * Keyboard:
 *   ArrowDown / ArrowUp   : cycle focus
 *   Enter                  : activate focused button
 *   Escape                 : close any open inline modal (top-level focus stays)
 *
 * Touch: native button tap (default browser behavior).
 * Mobile: 64px-tall tap targets; container width 90% on <600 px viewports.
 *
 * Emits:
 *   - menu:startRequested
 *   - menu:aboutRequested
 *   - menu:disclaimerRequested
 */
import { emit } from '../event-bus.js?v=34'

const BUTTONS = [
  { id: 'start',     label: 'Iniciar test level',         emit: 'menu:startRequested' },
  { id: 'about',     label: 'Acerca de',                  emit: 'menu:aboutRequested' },
  { id: 'disclaimer', label: 'Disclaimer',                 emit: 'menu:disclaimerRequested' },
]

const ABOUT_TEXT = `
<h2>Acerca de</h2>
<p><strong>Zarra Defenders 2D</strong> — on-rails shooter pedag\u00f3gico sobre el proyecto de macrovertedero
TRECO GESTI\u00d3N DE RESIDUOS S.L. en el Valle de Ayora-Cofrentes (Valencia).</p>
<p>Este juego convierte la lucha vecinal contra el vertedero en una experiencia arcade:
firm\u00e1s papeletas de recogida en lugar de disparar balas. Cada firma es una firma real
contra la destrucci\u00f3n del territorio.</p>
<p>Inspirado en <em>House of the Dead</em>, <em>Time Crisis</em> y <em>Virtua Cop</em>.</p>
<p>Versi\u00f3n: F3 \u2014 shooter rail gameplay (2026).</p>
`

const DISCLAIMER_TEXT = `
<h2>Disclaimer</h2>
<p><strong>Este es un juego con intenci\u00f3n pol\u00edtica y pedag\u00f3gica.</strong> Toda la informaci\u00f3n
presentada sobre el proyecto TRECO, sus impactos y los agentes involucrados est\u00e1 basada en
fuentes p\u00fablicas y se ofrece como material educativo.</p>
<p>El juego no representa, endosa ni ataca a ninguna persona f\u00edsica. Los enemigos son
met\u00e1foras del impacto ambiental: topadoras, camiones, drones de fumigaci\u00f3n, incineradoras,
vertederos. Las fuentes citadas se incluyen en las tarjetas pedag\u00f3gicas (F6).</p>
<p>Zarra Defenders 2D es software libre. C\u00f3digo y assets disponibles en el repositorio del
proyecto.</p>
`

export class MainMenu {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root   existing <div id="main-menu"> element
   * @param {Object} [opts.score]     Score instance — read .loadBest() for "Mejor: N firmas"
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('MainMenu requires root element')
    this.root = opts.root
    this.score = opts.score ?? null
    this.focusIndex = 0
    this._buttonEls = []
    this._openModal = null

    this._onKeyDown = this._handleKeyDown.bind(this)
    this._build()
  }

  /** Populate "Mejor: N firmas" line from score.loadBest() if available. */
  mount() {
    if (this.score) {
      const best = this.score.loadBest?.()
      const bestEl = this.root.querySelector('[data-role="best"]')
      if (bestEl) {
        bestEl.textContent = best ? `Mejor: ${best.firmas} firmas` : 'Mejor: \u2014 firmas'
      }
    }
  }

  /** Show the menu (display:flex) + focus the default button (Iniciar). */
  show() {
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')
    this._setFocus(0)
  }

  /** Hide the menu (display:none) + close any open modal. */
  hide() {
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this._closeModal()
  }

  /** @returns {boolean} */
  get isVisible() { return !this.root.classList.contains('hidden') }

  // ============== Internal: DOM build =================

  _build() {
    this.root.innerHTML = ''
    this.root.classList.add('menu-root')

    const title = document.createElement('h1')
    title.className = 'menu-title'
    title.textContent = 'Zarra Defenders 2D'
    this.root.appendChild(title)

    const subtitle = document.createElement('p')
    subtitle.className = 'menu-subtitle'
    subtitle.textContent = 'Defensores del Valle de Ayora-Cofrentes'
    this.root.appendChild(subtitle)

    const nav = document.createElement('nav')
    nav.className = 'menu-nav'
    this.root.appendChild(nav)

    for (let i = 0; i < BUTTONS.length; i++) {
      const def = BUTTONS[i]
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'menu-btn'
      btn.dataset.menuId = def.id
      btn.textContent = def.label
      btn.setAttribute('aria-label', def.label)
      btn.addEventListener('click', () => {
        this._activate(i)
      })
      nav.appendChild(btn)
      this._buttonEls.push(btn)
    }

    const best = document.createElement('p')
    best.className = 'menu-best'
    best.dataset.role = 'best'
    best.textContent = 'Mejor: \u2014 firmas'
    this.root.appendChild(best)

    // Modal containers (Acerca de / Disclaimer)
    const aboutModal = document.createElement('div')
    aboutModal.className = 'menu-modal hidden'
    aboutModal.dataset.modal = 'about'
    aboutModal.innerHTML = `
      <div class="menu-modal-card" role="dialog" aria-modal="true">
        <button type="button" class="menu-modal-close" aria-label="Cerrar">\u2715</button>
        <div class="menu-modal-body">${ABOUT_TEXT}</div>
      </div>
    `
    this.root.appendChild(aboutModal)
    aboutModal.querySelector('.menu-modal-close').addEventListener('click', () => this._closeModal())

    const disclaimerModal = document.createElement('div')
    disclaimerModal.className = 'menu-modal hidden'
    disclaimerModal.dataset.modal = 'disclaimer'
    disclaimerModal.innerHTML = `
      <div class="menu-modal-card" role="dialog" aria-modal="true">
        <button type="button" class="menu-modal-close" aria-label="Cerrar">\u2715</button>
        <div class="menu-modal-body">${DISCLAIMER_TEXT}</div>
      </div>
    `
    this.root.appendChild(disclaimerModal)
    disclaimerModal.querySelector('.menu-modal-close').addEventListener('click', () => this._closeModal())

    // Keyboard nav is attached globally; only acts when menu is visible.
    window.addEventListener('keydown', this._onKeyDown)
  }

  _activate(i) {
    const def = BUTTONS[i]
    if (!def) return
    // modals toggle inline rather than emitting navigation
    if (def.id === 'about') {
      this._openModalInline('about')
      return
    }
    if (def.id === 'disclaimer') {
      this._openModalInline('disclaimer')
      return
    }
    emit(def.emit, {})
  }

  _openModalInline(which) {
    const modal = this.root.querySelector(`[data-modal="${which}"]`)
    if (!modal) return
    this._closeModal()
    modal.classList.remove('hidden')
    this._openModal = modal
    const closeBtn = modal.querySelector('.menu-modal-close')
    if (closeBtn) closeBtn.focus()
  }

  _closeModal() {
    if (this._openModal) this._openModal.classList.add('hidden')
    this._openModal = null
    if (this._buttonEls[this.focusIndex]) this._buttonEls[this.focusIndex].focus()
  }

  _setFocus(i) {
    if (i < 0) i = 0
    if (i >= this._buttonEls.length) i = this._buttonEls.length - 1
    this.focusIndex = i
    const el = this._buttonEls[i]
    if (el) el.focus()
  }

  _handleKeyDown(e) {
    if (!this.isVisible) return
    if (this._openModal) {
      if (e.key === 'Escape') {
        e.preventDefault()
        this._closeModal()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this._setFocus(this.focusIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this._setFocus(this.focusIndex - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this._activate(this.focusIndex)
    } else if (e.key === 'Escape') {
      // at top level, Esc does nothing (no parent to return to)
      e.preventDefault()
    }
  }
}
