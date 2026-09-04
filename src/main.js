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
  const world = new PIXI.Container()
  app.stage.addChild(world)

  // --- Background del mundo (color sólido placeholder) ---
  // En Fases futuras: imagen de bg pixel art generada con minimax
  const bg = new PIXI.Graphics()
  bg.beginFill(0x1a3a1a)            // verde oscuro bosque como placeholder
  bg.drawRect(0, 0, 2000, 720)
  bg.endFill()
  world.addChild(bg)

  // --- Carga de sprites ---
  const sprites = await loadSprites(app, DEMO_SPRITES)
  for (const sprite of sprites) {
    world.addChild(sprite)
  }

  // --- Cámara ---
  const camera = new RailCamera({
    waypoints: DEMO_PATH,
    loop: true
  })

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

    // Aplicar cámara al mundo (todos los sprites se mueven en sentido contrario)
    world.x = -camera.getCameraX()
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
