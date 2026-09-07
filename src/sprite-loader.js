/**
 * src/sprite-loader.js
 *
 * Sprite manifest loader (F3 hand-pen-sprite spec + iso-asset-pipeline MODIFIED).
 *
 * Reads assets/sprites/manifest.json and returns a map:
 *   { <spriteId>: { path, archetype?, placeholder?, real? } }
 *
 * Production boot calls loadSpriteManifest() once at boot to know what to mount.
 */
import { BEST_KEY } from './score.js'

const MANIFEST_URL = 'assets/sprites/manifest.json'

/**
 * @returns {Promise<{active:Object, deprecated:Object}>}
 */
export async function loadSpriteManifest(url = MANIFEST_URL) {
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) {
    throw new Error(`loadSpriteManifest: failed to load ${url} (${res.status})`)
  }
  return await res.json()
}

/**
 * Preload all sprite textures referenced by the active manifest entries
 * using PIXI.Assets. Returns a Map<id, PIXI.Texture>.
 *
 * @param {{active:Object}} manifest
 * @param {string} [basePath]  prefix to prepend to each path (default '')
 */
export async function preloadManifestTextures(manifest, basePath = '') {
  const out = new Map()
  const entries = Object.entries(manifest.active ?? {})
  await Promise.all(entries.map(async ([id, def]) => {
    try {
      const url = `${basePath}${def.path}`
      const tex = await PIXI.Assets.load(url)
      tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
      out.set(id, tex)
    } catch (err) {
      console.warn(`[sprite-loader] failed to load ${id} (${def.path}):`, err?.message ?? err)
    }
  }))
  return out
}
