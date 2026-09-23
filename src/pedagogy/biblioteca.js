/**
 * src/pedagogy/biblioteca.js
 *
 * Pedagogical library — Phase 1.4 (ROADMAP).
 *
 * Fullscreen modal accessible from the main menu. Accumulates ALL
 * pedagogical cards the player has seen in previous runs (plus
 * the 12 from the initial catalog). Persistence in localStorage.
 *
 * Behavior:
 *   - "Biblioteca" button in the main menu
 *   - Modal with a cards grid (filterable by stage)
 *   - Clicking a card opens detail view (reuses ResumenFinal pattern)
 *   - Persistence: each stage:cleared copies cards to localStorage
 *   - Initial catalog cards (12) are always unlocked
 *
 * localStorage schema:
 *   key: 'zarra2d:biblioteca:unlocked'
 *   value: [{ cardId, enemyId, spriteId, stageId, titulo, descripcion,
 *            datoTexto, fuente, url, timestamp }, ...]
 */

import { STRINGS } from '../i18n/es.js?v=44'

const STORAGE_KEY = 'zarra2d:biblioteca:unlocked'

/**
 * Load unlocked cards from localStorage. Returns [] if missing or corrupt.
 */
export function loadBiblioteca(storage) {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!s) return []
  try {
    const raw = s.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

/**
 * Save cards to localStorage. Merges with existing (de-dup by cardId).
 */
export function saveBiblioteca(cards, storage) {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!s) return false
  try {
    const existing = loadBiblioteca(s)
    const byId = new Map()
    for (const c of existing) byId.set(c.cardId, c)
    for (const c of cards) byId.set(c.cardId, c)
    const merged = Array.from(byId.values())
    s.setItem(STORAGE_KEY, JSON.stringify(merged))
    return true
  } catch {
    return false
  }
}

/**
 * Build the initial biblioteca from the 12 catalog enemies (always unlocked).
 * These represent the educational baseline — even before playing, the player
 * can browse the catalog.
 */
export function buildInitialBiblioteca() {
  const cards = []
  for (const [spriteId, enemyData] of Object.entries(STRINGS.pedagogy.enemigos)) {
    const stageDato = STRINGS.pedagogy.datos[enemyData.stageId]
    if (!stageDato) continue
    cards.push({
      cardId: `catalog_${spriteId}`,
      enemyId: null,
      spriteId,
      stageId: enemyData.stageId,
      titulo: enemyData.titulo,
      descripcion: enemyData.descripcion,
      datoTexto: stageDato.texto,
      fuente: stageDato.fuente,
      url: stageDato.url,
      timestamp: 0,
      isInitial: true,
    })
  }
  return cards
}

/**
 * Filter biblioteca cards by stageId. Returns [] for unknown stage.
 */
export function filterByStage(cards, stageId) {
  if (!stageId || stageId === 'all') return cards.slice()
  return cards.filter(c => c.stageId === stageId)
}

export class Biblioteca {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.root        existing <div id="biblioteca"> element
   * @param {Object}      [opts.storage]   injectable storage for tests
   */
  constructor(opts) {
    if (!opts || !opts.root) throw new Error('Biblioteca requires root element')
    this.root = opts.root
    this._storage = opts.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
    this._stageFilter = 'all'  // 'all' | 'stage1-lashoyas' | 'stage2-lahoz' | ...
    this._allCards = []
    this._view = 'grid'        // 'grid' | 'detail'
    this._detailIndex = 0
    this._build()
  }

  /**
   * Show the biblioteca.
   */
  show() {
    this._allCards = this._loadAll()
    this._stageFilter = 'all'
    this._view = 'grid'
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')
    this._render()
  }

  hide() {
    this.root.classList.add('hidden')
    this.root.setAttribute('aria-hidden', 'true')
    this.root.innerHTML = ''
    this._view = 'grid'
  }

  get isVisible() {
    return !this.root.classList.contains('hidden')
  }

  /**
   * Record cards shown during a stage so they become persistent.
   * Call from main.js after stage:cleared.
   */
  recordCards(cardsShown) {
    if (!Array.isArray(cardsShown) || cardsShown.length === 0) return
    saveBiblioteca(cardsShown, this._storage)
  }

  destroy() {
    this.root.innerHTML = ''
  }

  // ============== Internal =================

  _build() {
    this.root.setAttribute('aria-hidden', 'true')
  }

  _loadAll() {
    const stored = loadBiblioteca(this._storage)
    const initial = buildInitialBiblioteca()
    // Merge by cardId — stored takes precedence (has timestamp)
    const byId = new Map()
    for (const c of initial) byId.set(c.cardId, c)
    for (const c of stored) byId.set(c.cardId, c)
    return Array.from(byId.values())
  }

  _render() {
    if (this._view === 'detail') {
      this._renderDetail()
    } else {
      this._renderGrid()
    }
  }

  _renderGrid() {
    const all = this._allCards
    const filtered = filterByStage(all, this._stageFilter)
    const B = STRINGS.pedagogy.biblioteca
    const stages = B.filtros

    this.root.innerHTML = `
      <div class="biblioteca-card" role="dialog" aria-label="${escapeAttr(B.ariaLabel)}">
        <button type="button" class="biblioteca-btn-cerrar" data-role="cerrar" aria-label="${escapeAttr(B.ariaLabel)}">\u2715</button>
        <h2 class="biblioteca-title">${escapeHtml(B.title)}</h2>
        <p class="biblioteca-counter">${filtered.length} de ${all.length} cards</p>
        <div class="biblioteca-filters">
          ${stages.map(s => `<button type="button" class="biblioteca-filter ${s.id === this._stageFilter ? 'biblioteca-filter--active' : ''}" data-role="filter-${s.id}">${escapeHtml(s.label)}</button>`).join('')}
        </div>
        <div class="biblioteca-grid">
          ${filtered.length === 0 ? `
            <p class="biblioteca-empty">${escapeHtml(B.empty)}</p>
          ` : filtered.map((c, i) => `
            <button type="button" class="biblioteca-grid-item" data-role="grid-item-${i}" data-card-id="${escapeAttr(c.cardId)}">
              <p class="biblioteca-grid-titulo">${escapeHtml(c.titulo || '')}</p>
              <p class="biblioteca-grid-stage">${escapeHtml(this._stageLabel(c.stageId))}</p>
            </button>
          `).join('')}
        </div>
        <p class="biblioteca-grid-footer">${escapeHtml(STRINGS.pedagogy.cards.footerFuentes)}</p>
      </div>
    `
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')

    // Wire listeners AFTER innerHTML
    this.root.querySelector('[data-role="cerrar"]').addEventListener('click', () => this.hide())
    this.root.querySelectorAll('[data-role^="filter-"]').forEach((btn) => {
      const role = btn.getAttribute('data-role')
      const stageId = role.replace('filter-', '')
      btn.addEventListener('click', () => {
        this._stageFilter = stageId
        this._render()
      })
    })
    this.root.querySelectorAll('[data-role^="grid-item-"]').forEach((btn) => {
      const role = btn.getAttribute('data-role')
      const idx = parseInt(role.replace('grid-item-', ''), 10)
      btn.addEventListener('click', () => {
        const filteredNow = filterByStage(this._allCards, this._stageFilter)
        const cardId = btn.getAttribute('data-card-id')
        const fullIdx = this._allCards.findIndex(c => c.cardId === cardId)
        if (fullIdx >= 0) {
          this._view = 'detail'
          this._detailIndex = fullIdx
          this._render()
        }
      })
    })
  }

  _renderDetail() {
    const card = this._allCards[this._detailIndex]
    if (!card) {
      this._view = 'grid'
      this._render()
      return
    }
    const idx = this._detailIndex
    const total = this._allCards.length
    const B = STRINGS.pedagogy.biblioteca

    this.root.innerHTML = `
      <div class="biblioteca-card" role="dialog" aria-live="polite" aria-label="${escapeAttr(B.detailAriaLabel(idx + 1, total))}">
        <button type="button" class="biblioteca-btn-cerrar" data-role="cerrar" aria-label="${escapeAttr(B.ariaLabel)}">\u2715</button>
        <button type="button" class="biblioteca-btn-back" data-role="back">${escapeHtml(B.back)}</button>
        <p class="biblioteca-counter">${idx + 1} / ${total}</p>
        <h3 class="biblioteca-detail-title">${escapeHtml(card.titulo || '')}</h3>
        <p class="biblioteca-detail-description">${escapeHtml(card.descripcion || '')}</p>
        <p class="biblioteca-detail-dato">${escapeHtml(card.datoTexto || '')}</p>
        <p class="biblioteca-detail-fuente">
          ${escapeHtml(STRINGS.pedagogy.dataScreen.fuente)}:
          ${card.url && card.url.startsWith('#')
            ? `<span class="biblioteca-detail-hashtag">${escapeHtml(card.fuente || '')}</span>`
            : `<a class="biblioteca-detail-link" href="${escapeAttr(card.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.fuente || '')} \u2197</a>`
          }
        </p>
        <div class="biblioteca-detail-nav">
          <button type="button" class="biblioteca-btn-nav" data-role="prev" ${idx === 0 ? 'disabled' : ''}>${escapeHtml(B.prev)}</button>
          <button type="button" class="biblioteca-btn-nav" data-role="next" ${idx === total - 1 ? 'disabled' : ''}>${escapeHtml(B.next)}</button>
        </div>
        <p class="biblioteca-detail-footer">${escapeHtml(STRINGS.pedagogy.cards.footerFuentes)}</p>
      </div>
    `
    this.root.classList.remove('hidden')
    this.root.setAttribute('aria-hidden', 'false')

    this.root.querySelector('[data-role="cerrar"]').addEventListener('click', () => this.hide())
    this.root.querySelector('[data-role="back"]').addEventListener('click', () => {
      this._view = 'grid'
      this._render()
    })
    const prev = this.root.querySelector('[data-role="prev"]')
    const next = this.root.querySelector('[data-role="next"]')
    if (prev) prev.addEventListener('click', () => { if (this._detailIndex > 0) { this._detailIndex--; this._render() } })
    if (next) next.addEventListener('click', () => { if (this._detailIndex < this._allCards.length - 1) { this._detailIndex++; this._render() } })
  }

  _stageLabel(stageId) {
    const map = STRINGS.pedagogy.biblioteca.shortStageLabels
    return map[stageId] || stageId || '?'
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