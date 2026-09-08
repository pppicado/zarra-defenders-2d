/**
 * src/levels/test-level.js
 *
 * Deterministic 12-enemy test level (F3 — single PR with size:exception).
 *
 * Rail path: 0..60 s, camera goes iso (0,0) -> (18, 18).
 *   - Escape front edge = (camIsoX + camIsoY + 1), so enemies become escapeable
 *     when camera depth passes their depth.
 *   - Enemies are static in F3 (no enemy velocity); only the camera advances.
 *
 * Roster (locked, 12 enemies — see tasks.md note: the design roster in design.md §2.8
 *   has 12 entries, all 4 archetypes represented):
 *   - 8 standard (camion_treco, bolsa_plastico, bidon_lixiviado, tubo_lixiviado,
 *                 valla_publicitaria, camion_treco, topadora, trailer)
 *   - 2 tank (dron_fumigador, camion_cisterna_residuos [placeholder PNG])
 *   - 1 mini-boss (planta_treco)
 *   - 1 boss (sello_burocratico)
 *
 * Determinism: no Math.random anywhere in this file or the spawn consumption.
 */
import { ARCHETYPES } from '../enemies.js?v=17'

/** Spawn time relative to camera progress — when cameraIso depth >= this value, spawn. */
function _spawnTimeFromDepth(depth) {
  // rail path: 0..60 s, depth 0..36 (18 + 18). Map depth to time.
  // depth = 36 -> t = 60, depth = 0 -> t = 0.
  // F3.2: spawn each enemy when the camera is ~5 tiles short of their iso depth,
  // so the player has a ~5-tile window to hit them before the camera passes
  // and they fall out of the corridor. With a +4 buffer in escapeFrontDepth,
  // this gives the enemy roughly 9 tiles of visible+hittable time.
  const t = ((depth - 5) / 36) * 60
  return Math.max(0, t)
}

/** @returns {Array<Object>} test-level enemy definitions, sorted by spawnTime. */
function _buildEnemyDefs() {
  const items = [
    { id: 'e01', archetype: 'standard',    isoX:  3, isoY:  2, spriteId: 'enemies_camion_treco' },
    { id: 'e02', archetype: 'standard',    isoX:  5, isoY:  3, spriteId: 'enemies_bolsa_plastico' },
    { id: 'e03', archetype: 'standard',    isoX:  7, isoY:  4, spriteId: 'enemies_bidon_lixiviado' },
    { id: 'e04', archetype: 'standard',    isoX:  9, isoY:  5, spriteId: 'enemies_tubo_lixiviado' },
    { id: 'e05', archetype: 'tank',        isoX: 11, isoY:  6, spriteId: 'enemies_dron_fumigador' },
    { id: 'e06', archetype: 'standard',    isoX: 12, isoY:  7, spriteId: 'enemies_valla_publicitaria' },
    { id: 'e07', archetype: 'standard',    isoX: 13, isoY:  8, spriteId: 'enemies_camion_treco' },
    { id: 'e08', archetype: 'standard',    isoX: 14, isoY:  9, spriteId: 'enemies_topadora' },
    { id: 'e09', archetype: 'tank',        isoX: 15, isoY: 10, spriteId: 'enemies_camion_cisterna_residuos' },
    { id: 'e10', archetype: 'standard',    isoX: 16, isoY: 11, spriteId: 'enemies_trailer' },
    { id: 'e11', archetype: 'mini-boss',   isoX: 17, isoY: 12, spriteId: 'enemies_planta_treco' },
    { id: 'e12', archetype: 'boss',        isoX: 18, isoY: 13, spriteId: 'enemies_sello_burocratico' },
  ]
  return items.map(e => {
    const depth = e.isoX + e.isoY
    return { ...e, depth, spawnTimeSec: _spawnTimeFromDepth(depth) }
  }).sort((a, b) => a.spawnTimeSec - b.spawnTimeSec)
}

export const TEST_LEVEL = Object.freeze({
  railPath: Object.freeze([
    Object.freeze({ t: 0,  isoX: 0,  isoY: 0  }),
    Object.freeze({ t: 60, isoX: 18, isoY: 18 }),
  ]),
  railEndTime: 60,  // victory fires when camera.getTime() >= 60 AND all 12 enemies destroyed
  enemies: Object.freeze(_buildEnemyDefs()),
})

/** Build rail-camera waypoints (RailCamera expects {t, x, y} where x=isoX, y=isoY). */
export function testLevelWaypoints() {
  return TEST_LEVEL.railPath.map(wp => ({ t: wp.t, x: wp.isoX, y: wp.isoY }))
}

/** Total enemy count (for tests / HUD). */
export const TEST_LEVEL_ENEMY_COUNT = TEST_LEVEL.enemies.length

/** Convenience: assert the locked 12-enemy composition. */
export function assertTestLevel() {
  if (TEST_LEVEL.enemies.length !== 12) {
    throw new Error(`TEST_LEVEL must have 12 enemies, got ${TEST_LEVEL.enemies.length}`)
  }
  const counts = { standard: 0, tank: 0, 'mini-boss': 0, boss: 0 }
  for (const e of TEST_LEVEL.enemies) {
    if (!ARCHETYPES[e.archetype]) throw new Error(`unknown archetype in TEST_LEVEL: ${e.archetype}`)
    counts[e.archetype]++
  }
  if (counts.standard !== 8) throw new Error(`TEST_LEVEL: expected 8 standard, got ${counts.standard}`)
  if (counts.tank !== 2) throw new Error(`TEST_LEVEL: expected 2 tank, got ${counts.tank}`)
  if (counts['mini-boss'] !== 1) throw new Error(`TEST_LEVEL: expected 1 mini-boss, got ${counts['mini-boss']}`)
  if (counts.boss !== 1) throw new Error(`TEST_LEVEL: expected 1 boss, got ${counts.boss}`)
}
