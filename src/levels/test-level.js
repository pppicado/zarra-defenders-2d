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
import { ARCHETYPES } from '../enemies.js?v=44'

/** Spawn time relative to camera progress — when cameraIso depth reaches this value, spawn. */
function _spawnTimeFromDepth(depth) {
  // F4b: rail path: 0..120 s, depth 0..72 (36 + 36). Map depth to time.
  // depth = 72 -> t = 120, depth = 0 -> t = 0.
  // F3.2: spawn each enemy when the camera is ~5 tiles short of their iso depth,
  // so the player has a ~5-tile window to hit them before the camera passes
  // and they fall out of the corridor. With a +4 buffer in escapeFrontDepth,
  // this gives the enemy roughly 9 tiles of visible+hittable time.
  const t = ((depth - 5) / 72) * 120
  return Math.max(0, t)
}

/** @returns {Array<Object>} test-level enemy definitions, sorted by spawnTime.
 *  F4b: 24 enemies (16 standard + 4 tank + 2 mini-boss + 2 boss), spanning depth 5..71.
 *  The existing 12 (e01..e12) cover depth 5..31; e13..e24 extend the corridor to depth 71. */
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
    // F4b: 12 additional enemies covering depth 19..71 (rotation of the 11 existing spriteIds)
    { id: 'e13', archetype: 'standard',    isoX: 17, isoY: 19, spriteId: 'enemies_bolsa_plastico' },
    { id: 'e14', archetype: 'standard',    isoX: 19, isoY: 21, spriteId: 'enemies_camion_treco' },
    { id: 'e15', archetype: 'standard',    isoX: 21, isoY: 23, spriteId: 'enemies_tubo_lixiviado' },
    { id: 'e16', archetype: 'standard',    isoX: 22, isoY: 25, spriteId: 'enemies_topadora' },
    { id: 'e17', archetype: 'tank',        isoX: 24, isoY: 26, spriteId: 'enemies_dron_fumigador' },
    { id: 'e18', archetype: 'standard',    isoX: 26, isoY: 28, spriteId: 'enemies_trailer' },
    { id: 'e19', archetype: 'standard',    isoX: 28, isoY: 30, spriteId: 'enemies_valla_publicitaria' },
    { id: 'e20', archetype: 'standard',    isoX: 30, isoY: 32, spriteId: 'enemies_bidon_lixiviado' },
    { id: 'e21', archetype: 'tank',        isoX: 32, isoY: 34, spriteId: 'enemies_camion_cisterna_residuos' },
    { id: 'e22', archetype: 'standard',    isoX: 34, isoY: 35, spriteId: 'enemies_incineradora' },
    { id: 'e23', archetype: 'mini-boss',   isoX: 35, isoY: 36, spriteId: 'enemies_planta_treco' },
    { id: 'e24', archetype: 'boss',        isoX: 36, isoY: 35, spriteId: 'enemies_sello_burocratico' },
  ]
  return items.map(e => {
    const depth = e.isoX + e.isoY
    return { ...e, depth, spawnTimeSec: _spawnTimeFromDepth(depth) }
  }).sort((a, b) => a.spawnTimeSec - b.spawnTimeSec)
}

/**
 * F3.10: rail direction. The rail runs northwest → southeast.
 * F4b: extended from iso (0,0) → (18,18) over 60 s to iso (0,0) → (36,36) over 120 s
 * (linear 2× extension, rail speed unchanged at 0.6 tile/s).
 * From the player's perspective the camera advances toward the southeast.
 * With the F3.11 isoToScreen Y-mirror, the world content scrolls DOWN past
 * the player (content approaches from the top, exits at the bottom) — the
 * natural "advancing" feel of an on-rails shooter. All real stages
 * (F4+) MUST reuse this rail convention AND the mirrored isoToScreen, so
 * every stage has the same scroll direction.
 */
export const TEST_LEVEL = Object.freeze({
  railPath: Object.freeze([
    Object.freeze({ t: 0,   isoX: 0,  isoY: 0  }),
    Object.freeze({ t: 120, isoX: 36, isoY: 36 }),
  ]),
  railEndTime: 120,  // victory fires when camera.getTime() >= 120 AND all 24 enemies destroyed
  enemies: Object.freeze(_buildEnemyDefs()),
})

/** Build rail-camera waypoints (RailCamera expects {t, x, y} where x=isoX, y=isoY). */
export function testLevelWaypoints() {
  return TEST_LEVEL.railPath.map(wp => ({ t: wp.t, x: wp.isoX, y: wp.isoY }))
}

/** Total enemy count (for tests / HUD). */
export const TEST_LEVEL_ENEMY_COUNT = TEST_LEVEL.enemies.length

/** Convenience: assert the locked 24-enemy composition (F4b: 2× extension). */
export function assertTestLevel() {
  if (TEST_LEVEL.enemies.length !== 24) {
    throw new Error(`TEST_LEVEL must have 24 enemies, got ${TEST_LEVEL.enemies.length}`)
  }
  const counts = { standard: 0, tank: 0, 'mini-boss': 0, boss: 0 }
  for (const e of TEST_LEVEL.enemies) {
    if (!ARCHETYPES[e.archetype]) throw new Error(`unknown archetype in TEST_LEVEL: ${e.archetype}`)
    counts[e.archetype]++
  }
  if (counts.standard !== 16) throw new Error(`TEST_LEVEL: expected 16 standard, got ${counts.standard}`)
  if (counts.tank !== 4) throw new Error(`TEST_LEVEL: expected 4 tank, got ${counts.tank}`)
  if (counts['mini-boss'] !== 2) throw new Error(`TEST_LEVEL: expected 2 mini-boss, got ${counts['mini-boss']}`)
  if (counts.boss !== 2) throw new Error(`TEST_LEVEL: expected 2 boss, got ${counts.boss}`)
}
