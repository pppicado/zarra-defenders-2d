/**
 * src/ui/menu.js
 *
 * Main menu DOM overlay (BG-005 — fase-6 stage selector).
 *
 * Stage buttons (locked/unlocked based on localStorage clears):
 *   1. Bosque mediterráneo     (default unlocked)
 *   2. Pueblo de Cofrentes     (locked until stage 1 cleared)
 *   3. Río Cabriel             (locked until stage 2 cleared)
 *   4. Vertedero TRECO         (locked until stage 3 cleared)
 *   5. Castillo de Cofrentes   (locked until stage 4 cleared)
 *
 * Plus:
 *   - Acerca de                (scrollable inline modal)
 *   - Disclaimer               (scrollable inline modal)
 *
 * Keyboard:
 *   ArrowDown / ArrowUp   : cycle focus
 *   Enter                  : activate focused button
 *   Escape                 : close any open inline modal
 *
 * Touch: native button tap (default browser behavior).
 *
 * Emits:
 *   - menu:startStage  { stageId }
 *   - menu:aboutRequested
 *   - menu:disclaimerRequested
 */
import { emit } from '../event-bus.js?v=44'
import { __zr } from '../engine/dom-debug.js?v=44'
import { STRINGS } from '../i18n/es.js?v=44'

/** localStorage key for "stage N cleared" marker. */
export const STAGE_CLEAR_KEY = (stageId) => `zarra2d:stageClear:${stageId}`

/** Stage ordering — the first stage is unlocked by default. */
const STAGES = [
  { id: 'stage1-lashoyas',  label: '1 · Las Hoyas de Caballero (Zarra)' },
  { id: 'stage2-lahoz',     label: '2 · La Hoz del río Zarra' },
  { id: 'stage3-lahunde',   label: '3 · Sierra de La Hunde y Palomera (Ayora)' },
  { id: 'stage4-ayora',     label: '4 · Casco urbano de Ayora' },
  { id: 'stage5-acuifero',  label: '5 · El Acuífero (jefe final)' },
]

const ABOUT_TEXT = `
<h2>Acerca de</h2>
<p><strong>Zarra Defenders 2D</strong> — on-rails shooter pedag\u00f3gico sobre el proyecto de macrovertedero
TRECO GESTI\u00d3N DE RESIDUOS S.L. en el Valle de Ayora-Cofrentes (Valencia).</p>
<p>Este juego convierte la lucha vecinal contra el vertedero en una experiencia arcade:
firm\u00e1s papeletas de recogida en lugar de disparar balas. Cada firma es una firma real
contra la destrucci\u00f3n del territorio.</p>
<p>Inspirado en <em>House of the Dead</em>, <em>Time Crisis</em> y <em>Virtua Cop</em>.</p>
<p>Versi\u00f3n: F6 \u2014 scrolling pixel-art backgrounds (2026).</p>
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

/**
 * A stage is unlocked if its own clear key exists OR if the previous stage's
 * clear key exists (progressive unlock — clearing stage 3 unlocks stage 4).
 */
function _isStageUnlocked(stageIndex) {
  if (stageIndex === 0) return true  // stage 1 always unlocked
  const prevStageId = STAGES[stageIndex - 1].id
  try {
    return !!localStorage.getItem(STAGE_CLEAR_KEY(prevStageId))
  } catch {
    return false
  }
}

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
        bestEl.textContent = best ? STRINGS.menu.mejorFirmas(best.firmas) : STRINGS.menu.mejorVacio
      }
    }
    this._refreshLocks()
  }

  /** Re-read localStorage and update the lock icons on each button. */
  _refreshLocks() {
    // BG-005 dev shortcut: ?unlock=all pre-populates localStorage with all
    // 5 stage clears so the user can access every level without playing
    // through the previous one. Convenience for testing / demos.
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('unlock') === 'all') {
        for (const stage of STAGES) {
          if (!localStorage.getItem(STAGE_CLEAR_KEY(stage.id))) {
            localStorage.setItem(STAGE_CLEAR_KEY(stage.id), JSON.stringify({ firmas: 99 }))
          }
        }
      }
      if (params.get('unlock') === 'reset') {
        for (const stage of STAGES) {
          localStorage.removeItem(STAGE_CLEAR_KEY(stage.id))
        }
      }
    } catch (err) {
      __zr.warn('[menu] lock shortcut failed:', err?.message ?? err)
    }

    let stageIndex = 0
    for (let i = 0; i < this._buttonEls.length; i++) {
      const btn = this._buttonEls[i]
      if (btn.dataset.kind !== 'stage') continue   // modal buttons don't have lock state
      const unlocked = _isStageUnlocked(stageIndex)
      stageIndex++
      btn.dataset.locked = unlocked ? 'false' : 'true'
      btn.setAttribute('aria-disabled', unlocked ? 'false' : 'true')
      // Prepend/update lock icon
      let icon = btn.querySelector('.lock-icon')
      if (!unlocked && !icon) {
        icon = document.createElement('span')
        icon.className = 'lock-icon'
        icon.setAttribute('aria-hidden', 'true')
        icon.textContent = STRINGS.menu.lockIcon
        btn.prepend(icon)
      } else if (unlocked && icon) {
        icon.remove()
      }
    }
  }

  /** Show the menu (display:flex) + focus the default button (stage 1). */
  show() {
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')
    this._refreshLocks()
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
    title.textContent = STRINGS.app.nombre
    this.root.appendChild(title)

    const subtitle = document.createElement('p')
    subtitle.className = 'menu-subtitle'
    subtitle.textContent = STRINGS.app.tagline
    this.root.appendChild(subtitle)

    const nav = document.createElement('nav')
    nav.className = 'menu-nav'
    this.root.appendChild(nav)

    // Build one button per stage (defs array is stages + 2 modals)
    const DEFS = [
      ...STAGES.map((s, i) => ({
        kind: 'stage',
        index: i,
        id: s.id,
        label: s.label,
      })),
      { kind: 'modal', id: 'about',       label: STRINGS.menu.modalAcercaDe },
      { kind: 'modal', id: 'disclaimer',  label: STRINGS.menu.modalDisclaimer },
      { kind: 'biblioteca', id: 'biblioteca', label: STRINGS.menu.modalBiblioteca },
    ]
    for (let i = 0; i < DEFS.length; i++) {
      const def = DEFS[i]
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'menu-btn'
      btn.dataset.menuId = def.id
      btn.dataset.kind = def.kind
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
    best.textContent = STRINGS.menu.mejorVacio
    this.root.appendChild(best)

    // Modal containers (Acerca de / Disclaimer)
    const aboutModal = document.createElement('div')
    aboutModal.className = 'menu-modal hidden'
    aboutModal.dataset.modal = 'about'
    aboutModal.innerHTML = `
      <div class="menu-modal-card" role="dialog" aria-modal="true">
        <button type="button" class="menu-modal-close" aria-label={STRINGS.menu.cerrarAriaLabel}>{STRINGS.menu.cerrarModal}</button>
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
        <button type="button" class="menu-modal-close" aria-label={STRINGS.menu.cerrarAriaLabel}>{STRINGS.menu.cerrarModal}</button>
        <div class="menu-modal-body">${DISCLAIMER_TEXT}</div>
      </div>
    `
    this.root.appendChild(disclaimerModal)
    disclaimerModal.querySelector('.menu-modal-close').addEventListener('click', () => this._closeModal())

    // Keyboard nav is attached globally; only acts when menu is visible.
    window.addEventListener('keydown', this._onKeyDown)
  }

  _activate(i) {
    const btn = this._buttonEls[i]
    if (!btn) return
    const def = { kind: btn.dataset.kind, id: btn.dataset.menuId }
    if (def.kind === 'modal') {
      this._openModalInline(def.id)
      return
    }
    if (def.kind === 'biblioteca') {
      emit('menu:bibliotecaRequested', {})
      return
    }
    // Stage button — only fire if unlocked
    const stageIndex = STAGES.findIndex(s => s.id === def.id)
    if (stageIndex < 0) return
    if (!_isStageUnlocked(stageIndex)) return
    emit('menu:startStage', { stageId: def.id })
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
      e.preventDefault()
    }
  }
}