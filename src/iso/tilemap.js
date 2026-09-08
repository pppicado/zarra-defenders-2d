/**
 * src/iso/tilemap.js
 *
 * Tile + Tilemap (TILE-001..TILE-004).
 * - Tile extends PIXI.Sprite, anchor (0.5, 0.5), explicit zIndex.
 * - Tilemap = one stage folder; cullAndRender keeps ≤100 live tiles.
 * - sortableChildren = false on every container holding tiles (design ADR #1).
 */

import { isoToScreen, screenToIso, computeTileSize, computeWorldOrigin } from './iso-math.js?v=18'

// F2.5.4: bumped from 100 to 400 to support a 4x larger world (4 stages of
// viewport tiles visible at any time). The hard cap protects against an
// accidental `computeCullRange` regression that would otherwise try to mount
// thousands of tiles per frame.
const MAX_VISIBLE_TILES = 400
const CULL_OVERSHOOT = 1

// Z-offset bands (design.md §3).
export const Z_BANDS = Object.freeze({ terrain: 0, decoration: 500, pedestrian: 700, boss: 900 })

export function computeZIndex(gx, gy, offset = 0) {
  if (offset < 0) offset = 0
  if (offset > 999) offset = 999
  return (gx + gy) * 1000 + offset
}

/** Inverse-project the viewport corners, take bbox, ±overshoot tiles. */
export function computeCullRange(camIsoX, camIsoY, vw, vh, tileSize, origin, overshoot = CULL_OVERSHOOT) {
  const corners = [
    screenToIso(0, 0, tileSize, origin),
    screenToIso(vw, 0, tileSize, origin),
    screenToIso(0, vh, tileSize, origin),
    screenToIso(vw, vh, tileSize, origin),
  ]
  const xs = corners.map(c => c.isoX), ys = corners.map(c => c.isoY)
  return {
    gxMin: Math.floor(Math.min(...xs)) - overshoot,
    gxMax: Math.ceil(Math.max(...xs)) + overshoot,
    gyMin: Math.floor(Math.min(...ys)) - overshoot,
    gyMax: Math.ceil(Math.max(...ys)) + overshoot,
  }
}

/** Single iso tile sprite. */
export class Tile extends PIXI.Sprite {
  constructor(texture, gx, gy, tileSize, origin, offset = 0) {
    super(texture)
    this.gx = gx; this.gy = gy; this.tileSize = tileSize; this.tileWorldOrigin = origin
    this.anchor.set(0.5, 0.5)
    // F2.5.15: each tile is rotated 45° INDIVIDUALLY around its own center
    // so the on-disk square PNG renders as a diamond. The `_worldLayer`
    // itself does NOT rotate (see comment in world.js). Combined with the
    // classic iso formula and step = tileSize / √2 (set in iso-math.js),
    // adjacent diamonds tessellate perfectly: each tile shares exactly
    // one corner with each of its 6 iso neighbors.
    this.zIndex = computeZIndex(gx, gy, offset)
    const { sx, sy } = isoToScreen(gx, gy, tileSize, origin)
    this.position.set(sx, sy)
    this.rotation = Math.PI / 4  // 45° — diamond from square PNG
  }
  get key() { return `${this.gx},${this.gy}` }
}

/** Per-stage container. Lifecycle: new → load → cullAndRender → destroy. */
export class Tilemap {
  constructor(stageId, vw, vh, opts = {}) {
    this.stageId = stageId
    this.viewportWidth = vw
    this.viewportHeight = vh
    this.tileSize = opts.tileSize ?? computeTileSize(vw, vh)
    this.tileWorldOrigin = opts.tileWorldOrigin ?? computeWorldOrigin(vw, vh)
    this.textures = new Map()
    this.activeTiles = new Map()
    this._container = null
    this._destroyed = false
  }

  async load(textureResolver) {
    if (this._destroyed) throw new Error(`Tilemap(${this.stageId}) destroyed`)
    const variants = this.listVariants()
    await Promise.all(variants.map(async v => this.textures.set(v, await textureResolver(v))))
  }

  listVariants() { return STAGE_VARIANTS[this.stageId] ?? [] }
  getTexture(v) { return this.textures.get(v) ?? null }
  get loadedVariants() { return [...this.textures.keys()] }

  /**
   * Maintains activeTiles such that exactly the tiles in range are
   * present on container. HARD CAP ≤ MAX_VISIBLE_TILES — closest to
   * center wins if the window exceeds the cap (TILE-004).
   */
  cullAndRender(container, range, pickVariant) {
    if (this._destroyed) throw new Error(`Tilemap(${this.stageId}) destroyed`)
    if (!container) throw new Error('container required')
    this._container = container
    // F2.5.7: pass the available variant pool so pickVariant can map (gx,gy)
    // → variant without needing to re-enumerate the textures Map.
    const pool = [...this.textures.keys()]
    const desired = this._enumerateCapped(range)

    for (const [key, tile] of this.activeTiles) {
      if (!desired.has(key)) {
        container.removeChild(tile); tile.destroy(); this.activeTiles.delete(key)
      }
    }
    for (const [key, { gx, gy }] of desired) {
      if (this.activeTiles.has(key)) continue
      const variant = pickVariant(gx, gy, pool)
      const tex = this.textures.get(variant)
      if (!tex) continue
      const tile = new Tile(tex, gx, gy, this.tileSize, this.tileWorldOrigin)
      container.addChild(tile)
      this.activeTiles.set(key, tile)
    }
    return this.activeTiles.size
  }

  destroy() {
    if (this._destroyed) return
    this._destroyed = true
    if (this._container) for (const t of this.activeTiles.values()) { this._container.removeChild(t); t.destroy() }
    this.activeTiles.clear()
    this.textures.clear()
  }

  /** @private  Center-priority enumeration under the hard cap. */
  _enumerateCapped(range) {
    const { gxMin, gxMax, gyMin, gyMax } = range
    const cx = (gxMin + gxMax) / 2, cy = (gyMin + gyMax) / 2
    const out = new Map()
    const cands = []
    for (let gx = gxMin; gx <= gxMax; gx++)
      for (let gy = gyMin; gy <= gyMax; gy++)
        cands.push({ gx, gy, d: Math.abs(gx - cx) + Math.abs(gy - cy) })
    cands.sort((a, b) => a.d - b.d)
    const limit = Math.min(cands.length, MAX_VISIBLE_TILES)
    for (let i = 0; i < limit; i++) { const { gx, gy } = cands[i]; out.set(`${gx},${gy}`, { gx, gy }) }
    return out
  }
}

/**
 * Static catalog: variant names per stage. Names MUST match the
 * on-disk filenames in `assets/tiles/stage{N}-{name}/{variant}.png`
 * and the asset-pipeline output exactly.
 */
// F3.8: tiles upscaled 2x (64 → 128 px) so the rotated diamonds fully cover
// the iso cell when tileSize=128. Each variant gets a `_2x` suffix here;
// the loader looks up the PNG by the resolved URL in main.js.
export const STAGE_VARIANTS = Object.freeze({
  'stage1-bosque': ['pino_clear_grass_rojizo_2x','pino_underbrush_dark_2x','encina_redonda_sombra_2x','suelo_arcilloso_rojizo_2x','trocha_forestal_compactada_2x','matorral_coscoja_romero_2x','arroyo_barranco_edge_2x','hojarasca_pino_seca_2x'],
  'stage2-pueblo': ['cal_blanca_pared_2x','teja_arabe_roja_2x','adoquin_calle_empedrada_2x','asfalto_N330_circulado_2x','acera_baldosa_hidraulica_2x','sombra_calle_estrecha_2x','balcon_hierro_forjado_2x','porton_madera_pueblo_2x'],
  'stage3-rio': ['agua_cristalina_verde_azul_2x','cortado_vertical_karstico_2x','roca_chorrera_humeda_2x','sedimento_aluvial_rio_2x','chopo_ribera_densa_2x','canto_rodado_orilla_2x','musgo_humedo_roca_2x','ladera_matorral_seca_2x'],
  'stage4-vertedero': ['cement_pad_crack_2x','gravel_dust_industrial_2x','dirt_oily_contaminated_2x','plastic_debris_mixed_2x','container_lixiviado_stain_2x','metal_scrap_rust_2x','asphalt_cracked_heavy_truck_2x','weeds_through_pavement_2x'],
  'stage5-castillo': ['penon_basalto_volcanico_2x','cal_castillo_blanca_2x','torre_homenaje_reloj_2x','mamposteria_antigua_ocre_2x','patio_armas_adoquines_2x','sendero_subida_penon_2x','pino_penon_mediterraneo_2x','aljibe_boveda_subterraneo_2x'],
})