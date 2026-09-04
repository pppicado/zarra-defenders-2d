/**
 * src/player.js
 *
 * Crosshair y lógica de apuntado del jugador para Zarra Defenders 2D.
 *
 * Vista confirmada (2026-09-03): PRIMERA PERSONA con mano + bolígrafo.
 *   - El jugador ve su propia mano pixel art sosteniendo un bolígrafo en la
 *     parte inferior-central de la pantalla (gestionado en Fase 3 con sprite
 *     de mano, hoy Fase 2 es solo el crosshair).
 *   - El crosshair es el indicador primario del apuntado. La mano aparece
 *     superpuesta cuando el boli está activo.
 *   - Tap en el sitio = "el boli firma un papel y lo lanza" = disparo (Fase 3).
 *
 * IMPORTANTE — Capas:
 *   El crosshair vive en la capa `hud` (NO en `world`). Esto significa que
 *   no se mueve con la cámara. Si estuviera en `world`, cuando la cámara
 *   rail se desplazara el crosshair derivaría con ella aunque el usuario no
 *   moviera el ratón. El crosshair debe estar siempre bajo el cursor del
 *   ratón en coordenadas de pantalla, no del mundo.
 *
 * En esta Fase 2 solo creamos el crosshair. La mano se añade en Fase 3
 * cuando ya tengamos el sprite de mano+boli (a generar con minimax).
 *
 * Estilo del crosshair:
 *   - Cruz pixel art de ~24x24 px, color contrastante (cyan o blanco)
 *   - Línea exterior negra de 1px para destacar contra cualquier fondo
 *   - Ocultar el cursor del sistema durante gameplay (`cursor: none`)
 */

const CROSSHAIR_SIZE = 24               // px en pantalla (no mundo)
const CROSSHAIR_COLOR = 0x00ffff        // cyan
const CROSSHAIR_OUTLINE = 0x000000      // negro

export class Player {
  /**
   * @param {PIXI.Application} app
   * @param {Input} input
   * @param {PIXI.Container} hud    Capa HUD (fija, no se mueve con la cámara)
   * @param {RailCamera} camera   Solo referencia; el crosshair no la usa para nada visual
   */
  constructor(app, input, hud, camera) {
    this.app = app
    this.input = input
    this.hud = hud
    this.camera = camera

    // Crear crosshair con Graphics (vector) — más rápido que sprite
    this.crosshair = this._buildCrosshair()
    this.hud.addChild(this.crosshair)

    // Suscribirse a eventos de input
    this._onMove = this._handleMove.bind(this)
    this._onTap = this._handleTap.bind(this)
    this._onPause = this._handlePause.bind(this)
    input.on('move', this._onMove)
    input.on('tap', this._onTap)
    input.on('pause', this._onPause)

    // Estado interno
    this._paused = false
    this._lastTapTime = 0
    this._tapCount = 0

    // Reservado para futuras animaciones
    app.ticker.add(() => this._update())
  }

  // =================== Public API ===================

  /**
   * @returns {boolean} true si el juego está pausado.
   */
  isPaused() { return this._paused }

  /**
   * @returns {{x: number, y: number}} posición del crosshair en coords de pantalla
   */
  getCrosshairScreenPos() {
    return { x: this.crosshair.x, y: this.crosshair.y }
  }

  // =================== Internal ===================

  _buildCrosshair() {
    const g = new PIXI.Graphics()
    const half = CROSSHAIR_SIZE / 2
    const gap = 4          // hueco central
    const thickness = 2     // grosor de las líneas

    // Dibujar cruz con outline (dos pasadas: outline primero, color encima)
    g.lineStyle({ width: thickness + 2, color: CROSSHAIR_OUTLINE, alpha: 1, cap: 'round' })
    // Línea horizontal
    g.moveTo(-half, 0).lineTo(-gap, 0)
    g.moveTo(gap, 0).lineTo(half, 0)
    // Línea vertical
    g.moveTo(0, -half).lineTo(0, -gap)
    g.moveTo(0, gap).lineTo(0, half)

    // Pasada de color
    g.lineStyle({ width: thickness, color: CROSSHAIR_COLOR, alpha: 1, cap: 'round' })
    g.moveTo(-half, 0).lineTo(-gap, 0)
    g.moveTo(gap, 0).lineTo(half, 0)
    g.moveTo(0, -half).lineTo(0, -gap)
    g.moveTo(0, gap).lineTo(0, half)

    g.x = 0
    g.y = 0
    return g
  }

  _handleMove(screenX, screenY) {
    // El crosshair está en la capa HUD, NO en el mundo.
    // Por tanto usamos coords de pantalla directamente, sin compensar la cámara.
    // Esto es lo correcto: el crosshair siempre debe estar BAJO el cursor del ratón,
    // independientemente de cómo se mueva la cámara rail.
    this.crosshair.x = screenX
    this.crosshair.y = screenY
  }

  _handleTap(screenX, screenY) {
    if (this._paused) return
    // En Fase 2 solo registramos el tap. En Fase 3 aquí se dispara el proyectil.
    this._lastTapTime = performance.now()
    this._tapCount++
    console.log(`[Player] Tap #${this._tapCount} at (${Math.round(screenX)}, ${Math.round(screenY)})`)
  }

  _handlePause() {
    this._paused = !this._paused
    console.log(`[Player] Pausa: ${this._paused}`)
    // En Fase 7: mostrar overlay de pausa
  }

  _update() {
    // Reservado para futuras animaciones del crosshair (hover, pulse, etc.)
  }
}
