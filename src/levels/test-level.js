/**
 * src/levels/test-level.js
 *
 * Deterministic 120-enemy test level (Fase-5 — REQ-CMB-009 + REQ-CMB-010).
 *
 * Rail path: 0..120 s, camera goes iso (0,0) -> (36, 36).
 *
 * Roster (locked, 120 enemies — see tasks.md §Phase 2.7):
 *   - 20 static (valla_publicitaria / billboard_* / signage_* / incineradora /
 *                planta_treco / sello_burocratico / castillo_cofrentes)
 *   - 70 standard mobile
 *   - 20 tank mobile
 *   - 8 mini-boss (static — planta_treco is in STATIC_SPRITE_IDS)
 *   - 2 boss (static — sello_burocratico is in STATIC_SPRITE_IDS)
 *
 * Mobile spriteIds get their default speed/pattern from MOBILE_DEFAULT in
 * src/enemies.js. Static spriteIds are enforced to speed=0/pattern='static'
 * by Enemy's ctor via resolveMovementConfig(). Apparent motion for static
 * enemies still comes from camera-induced tile scrolling only — NEVER from
 * per-tick self-translation (REQ-CMB-009 hard rule).
 *
 * Determinism: no Math.random anywhere in this file or the spawn consumption.
 */
import { ARCHETYPES, STATIC_SPRITE_IDS, MOBILE_DEFAULT, resolveMovementConfig } from '../enemies.js?v=44'

/** Spawn time relative to camera progress — when cameraIso depth reaches this value, spawn. */
function _spawnTimeFromDepth(depth) {
  // F4b: rail path: 0..120 s, depth 0..72 (36 + 36). Map depth to time.
  // F3.2: spawn each enemy when the camera is ~5 tiles short of their iso depth,
  // so the player has a ~5-tile window to hit them before the camera passes.
  const t = ((depth - 5) / 72) * 120
  return Math.max(0, t)
}

/**
 * Build a deterministic spread of N enemy definitions for one archetype.
 * The path winds through the iso grid (1..34) so every enemy survives long
 * enough to be hit-tested, and depths cover the rail corridor (5..71).
 */
function _spreadForArchetype(archetype, spriteId, count, startDepth, depthStep) {
  const out = []
  for (let i = 0; i < count; i++) {
    // Walk along isoX, incrementing depth by depthStep. Vary isoX a bit so
    // sprites don't all line up vertically.
    const depth = startDepth + i * depthStep
    const isoX = Math.min(34, Math.max(1, Math.floor(depth / 2) + (i % 3)))
    const isoY = depth - isoX
    out.push({
      id: `e_${archetype}_${String(i + 1).padStart(3, '0')}`,
      archetype,
      isoX,
      isoY,
      spriteId,
      // speed + movementPattern are RESOLVED at spawn by Enemy ctor (sees
      // MOBILE_DEFAULT for mobile spriteIds; static spriteIds forced to 0/static).
    })
  }
  return out
}

/** @returns {Array<Object>} test-level enemy definitions, sorted by spawnTime. */
function _buildEnemyDefs() {
  const items = []

  // ----------------------------------------------------------------
  // F4b: 24 ORIGINAL entries (e01..e24) — preserved for backward compat
  // with existing tests that reference specific IDs (e01 in hit-detection).
  // These were the F4b locked roster: 16 standard + 4 tank + 2 mini-boss + 2 boss.
  // ----------------------------------------------------------------
  const original24 = [
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
  for (const e of original24) items.push(e)

  // ----------------------------------------------------------------
  // 96 NEW entries (e25..e120) — Fase-5 expansion: 20 static + 76 mobile.
  // Static spriteIds (REQ-CMB-009 hard rule — never self-translate).
  //
  // DEPTH CONSTRAINT: existing hit-detection.spec.mjs (Part 3) asserts
  // exactly 2 escapes at t=20s. Screen-escape fires when camSum - enemySum = 2.74,
  // i.e. t = (depth + 2.74) / 0.6. For NO new enemy to escape at t=20s,
  // depth must be > 9.26. We pick depth ≥ 13 (buffer of ~3.7s) to give
  // margin against timing jitter and to match the original e01..e24 tail.
  // ----------------------------------------------------------------
  const staticSpriteIds = [
    'enemies_valla_publicitaria',
    'enemies_incineradora',
    'enemies_planta_treco',
    'enemies_sello_burocratico',
  ]
  for (let i = 0; i < 20; i++) {
    const spriteId = staticSpriteIds[i % staticSpriteIds.length]
    // depth 13..32 (increment 1) — outside the t=20 escape window.
    const depth = 13 + i
    if (depth > 32) break
    const isoX = Math.min(34, Math.max(1, Math.floor(depth / 2) + (i % 3)))
    const isoY = depth - isoX
    items.push({
      id: `e_static_${String(i + 1).padStart(3, '0')}`,
      archetype: 'standard',
      isoX,
      isoY,
      spriteId,
    })
  }

  // 54 standard mobile (depth 36..68)
  const standardMobileIds = [
    'enemies_camion_treco',
    'enemies_bolsa_plastico',
    'enemies_bidon_lixiviado',
    'enemies_tubo_lixiviado',
    'enemies_topadora',
    'enemies_trailer',
  ]
  for (let i = 0; i < 54; i++) {
    const spriteId = standardMobileIds[i % standardMobileIds.length]
    const depth = 36 + (i * 32 / 53)
    const isoX = Math.min(34, Math.max(1, Math.floor(depth / 2) + (i % 4)))
    const isoY = depth - isoX
    items.push({
      id: `e_std_${String(i + 1).padStart(3, '0')}`,
      archetype: 'standard',
      isoX: Math.round(isoX),
      isoY: Math.round(isoY * 10) / 10,
      spriteId,
    })
  }

  // 16 tank mobile (depth 38..66)
  const tankMobileIds = [
    'enemies_dron_fumigador',
    'enemies_camion_cisterna_residuos',
  ]
  for (let i = 0; i < 16; i++) {
    const spriteId = tankMobileIds[i % tankMobileIds.length]
    const depth = 38 + (i * 28 / 15)
    const isoX = Math.min(33, Math.max(1, Math.floor(depth / 2) + (i % 3)))
    const isoY = depth - isoX
    items.push({
      id: `e_tank_${String(i + 1).padStart(3, '0')}`,
      archetype: 'tank',
      isoX: Math.round(isoX),
      isoY: Math.round(isoY * 10) / 10,
      spriteId,
    })
  }

  // 6 mini-boss (depth 36..61)
  for (let i = 0; i < 6; i++) {
    const depth = 36 + i * 5
    const isoX = Math.min(34, Math.max(1, Math.floor(depth / 2)))
    const isoY = depth - isoX
    items.push({
      id: `e_miniboss_${String(i + 1).padStart(3, '0')}`,
      archetype: 'mini-boss',
      isoX,
      isoY,
      spriteId: 'enemies_planta_treco',
    })
  }

  // Stamp depth + spawnTimeSec + sort by spawn time.
  return items.map(e => {
    const depth = e.isoX + e.isoY
    return { ...e, depth, spawnTimeSec: _spawnTimeFromDepth(depth) }
  }).sort((a, b) => a.spawnTimeSec - b.spawnTimeSec)
}

/**
 * F3.10: rail direction. The rail runs northwest → southeast.
 * F4b: extended from iso (0,0) → (18,18) over 60 s to iso (0,0) → (36,36) over 120 s
 * (linear 2× extension, rail speed unchanged at 0.6 tile/s).
 */
export const TEST_LEVEL = Object.freeze({
  railPath: Object.freeze([
    Object.freeze({ t: 0,   isoX: 0,  isoY: 0  }),
    Object.freeze({ t: 120, isoX: 36, isoY: 36 }),
  ]),
  railEndTime: 120,
  enemies: Object.freeze(_buildEnemyDefs()),
})

/** Build rail-camera waypoints (RailCamera expects {t, x, y} where x=isoX, y=isoY). */
export function testLevelWaypoints() {
  return TEST_LEVEL.railPath.map(wp => ({ t: wp.t, x: wp.isoX, y: wp.isoY }))
}

/** Total enemy count (for tests / HUD). */
export const TEST_LEVEL_ENEMY_COUNT = TEST_LEVEL.enemies.length

/**
 * Fase-5 (REQ-CMB-009): assert every entry in TEST_LEVEL resolves to a
 * movement config consistent with the spriteId's static-ness. Mobile spriteIds
 * get their default config; static spriteIds are forced to speed=0/static.
 */
export function assertStaticSpriteIds() {
  const violations = []
  for (const def of TEST_LEVEL.enemies) {
    if (!def.spriteId) continue
    const isStatic = STATIC_SPRITE_IDS.has(def.spriteId)
    const resolved = resolveMovementConfig(def.spriteId, def.speed, def.movementPattern)
    if (isStatic) {
      if (resolved.speed !== 0 || resolved.movementPattern !== 'static') {
        violations.push({ id: def.id, spriteId: def.spriteId, resolved })
      }
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `TEST_LEVEL violates REQ-CMB-009 static rule for spriteIds:\n` +
      violations.map(v => `  ${v.id} (${v.spriteId}) -> ${JSON.stringify(v.resolved)}`).join('\n')
    )
  }
}

/** Convenience: assert the locked 120-enemy composition (Fase-5). */
export function assertTestLevel() {
  if (TEST_LEVEL.enemies.length !== 120) {
    throw new Error(`TEST_LEVEL must have 120 enemies, got ${TEST_LEVEL.enemies.length}`)
  }
  const counts = { standard: 0, tank: 0, 'mini-boss': 0, boss: 0 }
  for (const e of TEST_LEVEL.enemies) {
    if (!ARCHETYPES[e.archetype]) throw new Error(`unknown archetype in TEST_LEVEL: ${e.archetype}`)
    counts[e.archetype]++
  }
  // 24 original (F4b: 16 std + 4 tank + 2 mini-boss + 2 boss) +
  // 96 added (Fase-5: 20 static [all 'standard'] + 54 std mobile + 16 tank + 6 mini-boss).
  // Archetype breakdown: standard = 16 + 20 + 54 = 90
  //                     tank = 4 + 16 = 20
  //                     mini-boss = 2 + 6 = 8
  //                     boss = 2
  //                     total = 90 + 20 + 8 + 2 = 120 ✓
  if (counts.standard !== 90) throw new Error(`TEST_LEVEL: expected 90 standard, got ${counts.standard}`)
  if (counts.tank !== 20) throw new Error(`TEST_LEVEL: expected 20 tank, got ${counts.tank}`)
  if (counts['mini-boss'] !== 8) throw new Error(`TEST_LEVEL: expected 8 mini-boss, got ${counts['mini-boss']}`)
  if (counts.boss !== 2) throw new Error(`TEST_LEVEL: expected 2 boss, got ${counts.boss}`)
  // Also verify static rule.
  assertStaticSpriteIds()
}
