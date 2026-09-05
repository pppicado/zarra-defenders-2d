/**
 * src/main.js
 *
 * Entry point de Zarra Defenders 2D.
 *
 * Responsabilidades de Fase 1:
 *   1. Inicializar Pixi.js Application (DPR-aware, resolución retina/4K)
 *   2. Cargar sprites isométricos desde assets/sprites/
 *   3. Renderizar el Castillo de Cofrentes + 3 árboles en posiciones fijas del mundo
 *   4. Aplicar scroll de cámara (rail camera) sobre los sprites
 *   5. Loop de animación con requestAnimationFrame
 *   6. Activar modal de orientación portrait en móvil
 *
 * Pendiente para Fases futuras:
 *   - Input mouse/touch (Fase 2)
 *   - Disparo y colisiones (Fase 3)
 *   - Stage 1 jugable con enemigos (Fase 4)
 *   - Cards pedagógicas (Fase 5)
 *   - Stages 2-5 (Fase 6)
 *   - Menús (Fase 7)
 *   - Polish + QA móvil (Fase 8)
 */

import { RailCamera } from './rail-camera.js'
import { Input } from './input.js'
import { Player } from './player.js'
import { IsoWorld } from './iso/world.js'
import { Tilemap } from './iso/tilemap.js'

// ============================================================
// Configuración del stage demo (Fase 1: solo validación de cámara)
// ============================================================

/**
 * Path del rail cámara para el demo de Fase 1.
 * Mundo de 1920 px de ancho, cámara recorre de x=0 a x=1920 en 30s.
 * Después loop.
 */
const DEMO_PATH = [
  { t: 0,  x: 0,    y: 480 },
  { t: 30, x: 1920, y: 480 }
]

/**
 * F2.5: rail camera reinterpreta (x, y) como coordenadas iso (CAM-001).
 * Monotonic non-decreasing depth (gx + gy): 0 → 18 over 30s.
 */
const DEMO_PATH_ISO = [
  { t: 0,  x: 0, y: 0 },
  { t: 30, x: 9, y: 9 },
]

/**
 * Sprites del mundo demo (Fase 1):
 * - 1 castillo al fondo derecha (referencia visual principal)
 * - 3 pinos dispersos (mismo sprite, distintas posiciones)
 * Las posiciones x,y son en píxeles del mundo.
 */
const DEMO_SPRITES = [
  { id: 'trees_pino',              x: 200,  y: 400, scale: 1.0 },
  { id: 'trees_pino',              x: 600,  y: 400, scale: 0.9 },
  { id: 'trees_pino',              x: 1200, y: 400, scale: 1.1 },
  { id: 'buildings_castillo_cofrentes', x: 1500, y: 380, scale: 1.2 }
]

/**
 * F2.5: 4 sprites standing at iso corners over a 10×10 tile plane.
 * Each `{isoX, isoY}` is a tile coord; anchor (0.5, 1.0) places feet at the
 * projected screen position. Pinos at iso (1,1), (8,1), (1,8); castillo at (8,8).
 */
const DEMO_SPRITES_ISO = [
  { id: 'trees_pino',                  isoX: 1, isoY: 1, scale: 1.0 },
  { id: 'trees_pino',                  isoX: 8, isoY: 1, scale: 0.9 },
  { id: 'trees_pino',                  isoX: 1, isoY: 8, scale: 1.1 },
  { id: 'buildings_castillo_cofrentes', isoX: 8, isoY: 8, scale: 1.2 },
]

// ============================================================
// Bootstrap
// ============================================================

async function bootstrap() {
  // --- Verificación de Pixi.js ---
  if (typeof PIXI === 'undefined') {
    console.error('Pixi.js no cargó desde el CDN. Verificar conexión o tag <script>')
    return
  }

  // --- Orientación móvil: setup del modal ---
  setupOrientationLock()

  // --- Botón de pantalla completa ---
  setupFullscreenButton()

  // --- Crear aplicación Pixi (API v7: constructor sincrónico) ---
  const wrapper = document.getElementById('game-canvas-wrapper')
  const app = new PIXI.Application({
    background: 0x1a3a1a,        // verde oscuro bosque como placeholder
    antialias: false,             // pixel-perfect (sin AA)
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: wrapper
  })

  // Insertar el canvas en el wrapper (Pixi v7: usar app.view, no app.canvas)
  wrapper.appendChild(app.view)

  // --- Mundo (Container principal de Pixi) ---
  // Estructura de layers:
  //   app.stage
  //     ├── world (se mueve con la cámara — sprites isométricos, parallax)
  //     └── hud   (NO se mueve — crosshair, mano, proyectiles en coordenadas de pantalla)
  //     └── ui    (menús, modales — coordenadas de viewport)
  const world = new PIXI.Container()
  world.name = 'world'
  app.stage.addChild(world)
  const hud = new PIXI.Container()
  hud.name = 'hud'
  app.stage.addChild(hud)

  // --- F2.5: IsoWorld reemplaza el bg placeholder. Carga tilemap + monta en world. ---
  const isoWorld = new IsoWorld({
    viewportWidth: wrapper.clientWidth,
    viewportHeight: wrapper.clientHeight,
  })
  world.addChild(isoWorld.container)

  // Carga del tilemap activo (stage1-bosque = demo inicial; el resto se enchufa en F4+).
  const tilemap = new Tilemap('stage1-bosque', wrapper.clientWidth, wrapper.clientHeight)
  await tilemap.load(async (variant) => {
    const url = `assets/tiles/stage1-bosque/${variant}.png`
    const tex = await PIXI.Assets.load(url)
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
    return tex
  })
  isoWorld.registerTilemap(tilemap)
  isoWorld.setStage('stage1-bosque')

  // --- Carga de sprites isométricos ---
  const sprites = await loadSprites(app, DEMO_SPRITES_ISO)
  // IsoWorld.update() reposiciona los sprites cada frame; los agregamos a su spriteLayer.
  const verticalSprites = sprites.map((sprite, i) => ({
    gx: DEMO_SPRITES_ISO[i].isoX,
    gy: DEMO_SPRITES_ISO[i].isoY,
    sprite,
  }))
  for (const { sprite } of verticalSprites) {
    isoWorld.spriteLayer.addChild(sprite)
  }

  // --- Cámara ---
  const camera = new RailCamera({
    waypoints: DEMO_PATH_ISO,
    loop: true
  })

  // --- Input + Crosshair (Fase 2) ---
  const input = new Input()
  input.setCanvas(app.view)
  const player = new Player(app, input, hud, camera)

  // ============================================================
  // Game loop
  // ============================================================
  let lastTime = performance.now()
  app.ticker.add(() => {
    const now = performance.now()
    const dt = (now - lastTime) / 1000  // segundos
    lastTime = now

    // Update cámara
    camera.update(dt)

    // F2.5: IsoWorld aplica el transform de cámara al world container.
    // hud/ui siguen siendo siblings de world y NO se mueven (CAM-002).
    isoWorld.update(camera, verticalSprites)
  })

  console.log('[ZarraDefenders2D] Bootstrap OK. Cámara rail activa.')
}

/**
 * Carga una lista de sprites desde assets/sprites/.
 * @returns {Promise<PIXI.Sprite[]>}  Sprites posicionados y escalados.
 */
async function loadSprites(app, defs) {
  const promises = defs.map(async (def, i) => {
    try {
      // URL única por sprite (incluso si el archivo es el mismo) para evitar cache compartido
      const url = `assets/sprites/${def.id}.png#${i}`
      const texture = await PIXI.Assets.load(url)
      const sprite = new PIXI.Sprite(texture)
      sprite.anchor.set(0.5, 1.0)   // anclaje: centro horizontal, base vertical
      sprite.x = def.x
      sprite.y = def.y
      sprite.scale.set(def.scale)
      // Pixi v7: scaleMode en baseTexture, no en source
      texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
      return sprite
    } catch (e) {
      console.warn(`[ZarraDefenders2D] No se pudo cargar sprite ${def.id}:`, e)
      return null
    }
  })
  const results = await Promise.all(promises)
  return results.filter(Boolean)
}

/**
 * Modal de aviso de orientación en móvil.
 * - Detecta portrait con window.matchMedia
 * - Muestra modal cuando está en portrait, oculta cuando vuelve a landscape
 * - Solo aplica en dispositivos con capacidad de orientar (móviles, tablets)
 */
function setupOrientationLock() {
  const modal = document.getElementById('orientation-warning')
  if (!modal) return

  // matchMedia('(orientation: landscape)') = true si está en landscape
  // En desktop (no hay orientation), puede devolver true o false según el navegador
  const mq = window.matchMedia('(orientation: landscape)')

  function update() {
    if (mq.matches) {
      modal.classList.add('hidden')
    } else {
      modal.classList.remove('hidden')
    }
  }

  // Estado inicial
  update()

  // Listeners (compatibilidad cross-browser)
  if (mq.addEventListener) {
    mq.addEventListener('change', update)
  } else if (mq.addListener) {
    mq.addListener(update)
  }

  // Backup: también escuchar resize y orientationchange (algunos navegadores no disparan el matchMedia)
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
}

/**
 * Botón de pantalla completa.
 * - Aparece en la esquina inferior-derecha del viewport.
 * - Click alterna entre fullscreen y windowed.
 * - Se muestra siempre (incluso si no hay márgenes) para que el usuario
 *   pueda entrar/salir de fullscreen en cualquier momento. Visualmente
 *   queda "en el margen" si existe letterbox, encima del juego si no.
 * - Detecta cambios desde fuera (e.g., tecla F11) y actualiza el icono.
 */
function setupFullscreenButton() {
  const btn = document.getElementById('fullscreen-btn')
  if (!btn) return

  btn.classList.remove('hidden')

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement)
  }

  function updateIcon() {
    if (isFullscreen()) {
      btn.classList.add('is-fullscreen')
      btn.setAttribute('aria-label', 'Salir de pantalla completa')
      btn.title = 'Salir de pantalla completa (Esc)'
    } else {
      btn.classList.remove('is-fullscreen')
      btn.setAttribute('aria-label', 'Pantalla completa')
      btn.title = 'Pantalla completa'
    }
  }

  async function toggle() {
    try {
      if (isFullscreen()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen()
        }
      } else {
        // Pedimos fullscreen sobre el documento completo (no solo el canvas)
        // para que el letterbox del navegador no se vea
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen()
        }
      }
    } catch (err) {
      console.warn('[ZarraDefenders2D] No se pudo alternar fullscreen:', err)
    }
  }

  btn.addEventListener('click', toggle)
  // Actualizar icono cuando cambia el estado (F11, Esc, etc.)
  document.addEventListener('fullscreenchange', updateIcon)
  document.addEventListener('webkitfullscreenchange', updateIcon)

  // Estado inicial
  updateIcon()
}

// ============================================================
// Go
// ============================================================
bootstrap().catch(err => {
  console.error('[ZarraDefenders2D] Error fatal en bootstrap:', err)
})

// ============================================================
// Test API expuesta (Fase 1 todavía sin test level, pero dejamos el stub)
// ============================================================
window.__gameTestAPI__ = {
  getStatus: () => ({
    pixiLoaded: typeof PIXI !== 'undefined',
    pixiVersion: typeof PIXI !== 'undefined' ? PIXI.VERSION : null,
    stage: 'Fase 1 — Bootstrap + cámara'
  })
}
