/**
 * src/levels/stage-rosters.js
 *
 * Per-stage enemy rosters (ROADMAP §6.1 — Fase 6).
 *
 * Each stage has a unique roster composition that reflects the geographical
 * and thematic nature of the location. The roster includes:
 *   - railPath (camera waypoints)
 *   - railEndTime
 *   - enemies (array of definitions compatible with EnemyManager.loadLevel)
 *   - finalBossId (id of the final boss entry)
 *   - finalBossSpriteId (used for stage-specific desactivacion logic)
 *   - postFinalWaveRoster (waves that spawn after the rail ends)
 *   - backgroundPath (the PNG asset for this stage)
 *
 * Themes (one per stage):
 *   stage1-lashoyas   Las Hoyas de Cabaneros - topadora + camion_treco + dron_fumigador
 *                      (the megaproject site: earthworks + heavy trucks)
 *   stage2-lahoz      La Hoz del Cabriel    — tubo_lixiviado + bidon + dron_fumigador
 *                      (lixiviados leaching into the river canyon)
 *   stage3-lahunde    La Hunde              — incineradora + motosierra + plataforma_solar
 *                      (industrial burning + clearcut + solar plant overlap)
 *   stage4-ayora      Ayora pueblo          — trailer + convoy de trailers + humo toxico
 *                      (trucks crossing the town on the way to the dump)
 *   stage5-acuifero   Acuifero Mancha Oriental — planta_treco + drones + extractores
 *                      (the final boss: the megaproject itself + surveillance + water extraction)
 *
 * All rosters share a common rail shape (linear iso path) so the rail camera +
 * enemies system stays unchanged. Differences live in which spriteIds each
 * stage uses and where they spawn along the rail.
 *
 * Sprite coverage note: not all spriteIds referenced in the ROADMAP exist yet
 * (motosierra, plataforma_solar, humo toxico, drones de vigilancia, extractores).
 * We use the 12 spriteIds that DO exist as a baseline — when new assets are
 * added later, the rosters can be expanded without structural changes.
 */
import { ARCHETYPES, resolveMovementConfig, STATIC_SPRITE_IDS } from '../enemies.js?v=44'

const RAIL_LENGTH_S = 120
const RAIL_DEPTH_MAX = 72

function _spawnTime(depth) {
  return Math.max(0, ((depth - 5) / RAIL_DEPTH_MAX) * RAIL_LENGTH_S)
}

function _enemy(archetype, isoX, isoY, spriteId, idSuffix, spawnTimeSec) {
  return { archetype, isoX, isoY, spriteId, id: idSuffix, spawnTimeSec }
}

/**
 * Spread N enemies along the rail for one spriteId + archetype combination.
 * Varies isoX/isoY so sprites don't all line up vertically.
 * Each enemy carries a `spawnTimeSec` (time-gated spawn) — derived from its
 * depth via the same formula test-level.js uses: ((depth - 5) / 72) * 120.
 * Without spawnTimeSec, every enemy would materialize at boot, the camera
 * hasn't advanced, and the iso Manhattan escape test would drain integrity to
 * 0 in one tick (regression fixed in F6.1).
 */
function _spread(archetype, spriteId, count, startDepth, depthStep, idPrefix) {
  const out = []
  for (let i = 0; i < count; i++) {
    const depth = startDepth + i * depthStep
    const isoX = Math.min(34, Math.max(1, Math.floor(depth / 2) + (i % 3)))
    const isoY = depth - isoX
    const spawnTimeSec = Math.max(0, ((depth - 5) / 72) * 120)
    out.push(_enemy(archetype, isoX, isoY, spriteId, `${idPrefix}_${i + 1}`, spawnTimeSec))
  }
  return out
}

/**
 * Each stage has ~24 enemies to keep boot time fast + tests deterministic.
 * Composition: 16 standard + 4 tank + 2 mini-boss + 2 boss (locked at 24 for
 * parity with the original TEST_LEVEL — see test-level.js for the rationale).
 */
function _buildRoster({
  stageId,
  finalBossSpriteId,
  mobile,
  miniBosses,
  boss,            // second boss (the test-level pattern: 2 bosses total)
  backgroundPath,
}) {
  const items = []
  // Mobile standard enemies — distributed across the rail
  for (const { spriteId, count, startDepth, step } of mobile) {
    items.push(..._spread('standard', spriteId, count, startDepth, step, `${stageId}_std_${spriteId}`))
  }
  // Tank enemies
  for (const { spriteId, count, startDepth, step } of (mobile.filter(m => m.tank) || [])) {
    items.push(..._spread('tank', spriteId, count, startDepth, step, `${stageId}_tank_${spriteId}`))
  }
  // Mini-bosses (static). spawnTimeSec = depth-derived so they materialize when
  // the camera reaches their depth — without it, undefined !== null evaluates to
  // false in loose-equality mode and the enemy materializes immediately at boot
  // (and escapes before the camera has advanced).
  for (const mb of miniBosses) {
    const mbDepth = mb.isoX + mb.isoY
    const mbSpawnTime = Math.max(0, ((mbDepth - 5) / 72) * 120)
    items.push(_enemy('mini-boss', mb.isoX, mb.isoY, mb.spriteId, mb.id, mbSpawnTime))
  }
  // Final boss (static) — sits at end of rail
  const bossEntry = boss
  const bossDepth = bossEntry.isoX + bossEntry.isoY
  const bossSpawnTime = Math.max(0, ((bossDepth - 5) / 72) * 120)
  items.push(_enemy('boss', bossEntry.isoX, bossEntry.isoY, bossEntry.spriteId, bossEntry.id, bossSpawnTime))
  // Optional secondary boss if defined
  if (bossEntry.secondary) {
    const secDepth = bossEntry.secondary.isoX + bossEntry.secondary.isoY
    const secSpawnTime = Math.max(0, ((secDepth - 5) / 72) * 120)
    items.push(_enemy('boss', bossEntry.secondary.isoX, bossEntry.secondary.isoY, bossEntry.secondary.spriteId, bossEntry.secondary.id, secSpawnTime))
  }
  return {
    railPath: [
      { t: 0, isoX: 0, isoY: 0 },
      { t: RAIL_LENGTH_S, isoX: 36, isoY: 36 },
    ],
    railEndTime: RAIL_LENGTH_S,
    enemies: items,
    finalBossId: bossEntry.id,
    finalBossSpriteId: finalBossSpriteId,
    backgroundPath,
    stageId,
  }
}

// ============================================================
// STAGE 1 - Las Hoyas de Cabaneros
// Earthworks + heavy truck convoy arriving at the dump site.
// Boss: topadora clearing forest + sello_burocratico approving permits.
// ============================================================
const stage1 = _buildRoster({
  stageId: 'stage1-lashoyas',
  finalBossSpriteId: 'enemies_topadora',
  backgroundPath: 'assets/backgrounds/stage1-lashoyas.png',
  mobile: [
    { spriteId: 'enemies_camion_treco', count: 6, startDepth: 6, step: 3 },       // heavy truck convoy
    { spriteId: 'enemies_bolsa_plastico', count: 4, startDepth: 8, step: 4 },     // bagged waste debris
    { spriteId: 'enemies_dron_fumigador', count: 4, startDepth: 12, step: 5 },   // surveillance drone
    { spriteId: 'enemies_topadora', count: 2, startDepth: 18, step: 8 },         // light earthworks
    { spriteId: 'enemies_valla_publicitaria', count: 2, startDepth: 24, step: 10 }, // propaganda billboards
  ],
  miniBosses: [
    { id: 'stage1_mb_1', isoX: 28, isoY: 30, spriteId: 'enemies_incineradora' },
    { id: 'stage1_mb_2', isoX: 32, isoY: 34, spriteId: 'enemies_planta_treco' },
  ],
  boss: {
    id: 'stage1_boss_1',
    isoX: 35, isoY: 36,
    spriteId: 'enemies_topadora',
    secondary: {
      id: 'stage1_boss_2',
      isoX: 36, isoY: 35,
      spriteId: 'enemies_sello_burocratico',
    },
  },
})

// ============================================================
// STAGE 2 — La Hoz del Cabriel
// Lixiviados (leachate) from the dump leaching into the Cabriel river canyon.
// Boss: tubo_lixiviado pipe + bidon_lixiviado containers.
// ============================================================
const stage2 = _buildRoster({
  stageId: 'stage2-lahoz',
  finalBossSpriteId: 'enemies_tubo_lixiviado',
  backgroundPath: 'assets/backgrounds/stage2-lahoz.png',
  mobile: [
    { spriteId: 'enemies_bidon_lixiviado', count: 5, startDepth: 6, step: 3 },
    { spriteId: 'enemies_bolsa_plastico', count: 3, startDepth: 10, step: 4 },
    { spriteId: 'enemies_tubo_lixiviado', count: 3, startDepth: 14, step: 5 },
    { spriteId: 'enemies_dron_fumigador', count: 3, startDepth: 20, step: 6 },
    { spriteId: 'enemies_camion_cisterna_residuos', count: 2, startDepth: 28, step: 10 },
  ],
  miniBosses: [
    { id: 'stage2_mb_1', isoX: 24, isoY: 28, spriteId: 'enemies_incineradora' },
    { id: 'stage2_mb_2', isoX: 30, isoY: 32, spriteId: 'enemies_planta_treco' },
  ],
  boss: {
    id: 'stage2_boss_1',
    isoX: 35, isoY: 36,
    spriteId: 'enemies_tubo_lixiviado',
    secondary: {
      id: 'stage2_boss_2',
      isoX: 36, isoY: 35,
      spriteId: 'enemies_camion_cisterna_residuos',
    },
  },
})

// ============================================================
// STAGE 3 — La Hunde
// Industrial burning, clearcut for solar plant overlap.
// Boss: incineradora + topadora hybrid (clearcutting for solar).
// ============================================================
const stage3 = _buildRoster({
  stageId: 'stage3-lahunde',
  finalBossSpriteId: 'enemies_incineradora',
  backgroundPath: 'assets/backgrounds/stage3-lahunde.png',
  mobile: [
    { spriteId: 'enemies_dron_fumigador', count: 5, startDepth: 6, step: 3 },
    { spriteId: 'enemies_topadora', count: 4, startDepth: 10, step: 4 },
    { spriteId: 'enemies_camion_treco', count: 3, startDepth: 16, step: 5 },
    { spriteId: 'enemies_valla_publicitaria', count: 2, startDepth: 22, step: 8 },
    { spriteId: 'enemies_bolsa_plastico', count: 2, startDepth: 28, step: 10 },
  ],
  miniBosses: [
    { id: 'stage3_mb_1', isoX: 26, isoY: 28, spriteId: 'enemies_planta_treco' },
    { id: 'stage3_mb_2', isoX: 32, isoY: 34, spriteId: 'enemies_camion_cisterna_residuos' },
  ],
  boss: {
    id: 'stage3_boss_1',
    isoX: 35, isoY: 36,
    spriteId: 'enemies_incineradora',
    secondary: {
      id: 'stage3_boss_2',
      isoX: 36, isoY: 35,
      spriteId: 'enemies_topadora',
    },
  },
})

// ============================================================
// STAGE 4 — Ayora pueblo
// Trucks crossing the town on their way to the dump.
// Boss: trailer convoy + cisterna spraying chemicals.
// ============================================================
const stage4 = _buildRoster({
  stageId: 'stage4-ayora',
  finalBossSpriteId: 'enemies_trailer',
  backgroundPath: 'assets/backgrounds/stage4-ayora.png',
  mobile: [
    { spriteId: 'enemies_trailer', count: 6, startDepth: 6, step: 3 },           // trailer convoy through town
    { spriteId: 'enemies_camion_treco', count: 4, startDepth: 10, step: 4 },
    { spriteId: 'enemies_camion_cisterna_residuos', count: 3, startDepth: 16, step: 5 },
    { spriteId: 'enemies_dron_fumigador', count: 3, startDepth: 22, step: 6 },
    { spriteId: 'enemies_valla_publicitaria', count: 2, startDepth: 28, step: 10 },
  ],
  miniBosses: [
    { id: 'stage4_mb_1', isoX: 28, isoY: 30, spriteId: 'enemies_planta_treco' },
    { id: 'stage4_mb_2', isoX: 32, isoY: 34, spriteId: 'enemies_incineradora' },
  ],
  boss: {
    id: 'stage4_boss_1',
    isoX: 35, isoY: 36,
    spriteId: 'enemies_trailer',
    secondary: {
      id: 'stage4_boss_2',
      isoX: 36, isoY: 35,
      spriteId: 'enemies_camion_cisterna_residuos',
    },
  },
})

// ============================================================
// STAGE 5 — Acuifero de la Mancha Oriental
// The megaproject itself + surveillance + water extraction.
// Boss: planta_treco (the megaproject) + sello_burocratico (final permit).
// ============================================================
const stage5 = _buildRoster({
  stageId: 'stage5-acuifero',
  finalBossSpriteId: 'enemies_planta_treco',
  backgroundPath: 'assets/backgrounds/stage5-acuifero.png',
  mobile: [
    { spriteId: 'enemies_dron_fumigador', count: 5, startDepth: 6, step: 3 },     // surveillance drones
    { spriteId: 'enemies_bidon_lixiviado', count: 3, startDepth: 10, step: 4 },  // groundwater contamination
    { spriteId: 'enemies_camion_cisterna_residuos', count: 3, startDepth: 16, step: 5 },
    { spriteId: 'enemies_topadora', count: 3, startDepth: 22, step: 6 },
    { spriteId: 'enemies_bolsa_plastico', count: 2, startDepth: 28, step: 10 },
  ],
  miniBosses: [
    { id: 'stage5_mb_1', isoX: 26, isoY: 28, spriteId: 'enemies_incineradora' },
    { id: 'stage5_mb_2', isoX: 32, isoY: 34, spriteId: 'enemies_camion_treco' },
  ],
  boss: {
    id: 'stage5_boss_1',
    isoX: 35, isoY: 36,
    spriteId: 'enemies_planta_treco',
    secondary: {
      id: 'stage5_boss_2',
      isoX: 36, isoY: 35,
      spriteId: 'enemies_sello_burocratico',
    },
  },
})

// ============================================================
// Roster registry
// ============================================================
export const STAGE_ROSTERS = Object.freeze({
  'stage1-lashoyas': stage1,
  'stage2-lahoz': stage2,
  'stage3-lahunde': stage3,
  'stage4-ayora': stage4,
  'stage5-acuifero': stage5,
})

/**
 * @param {string} stageId
 * @returns {Object|null} the roster for the stage, or null if unknown.
 */
export function getRosterForStage(stageId) {
  return STAGE_ROSTERS[stageId] ?? null
}

/**
 * Convenience: return all stageIds that have a roster defined.
 */
export function listStagesWithRoster() {
  return Object.keys(STAGE_ROSTERS)
}

/**
 * Validate every roster entry passes the static-sprite assertion (REQ-CMB-009).
 * Mirrors assertStaticSpriteIds in test-level.js.
 */
export function assertAllRostersStatic() {
  const violations = []
  for (const [stageId, roster] of Object.entries(STAGE_ROSTERS)) {
    for (const def of roster.enemies) {
      if (!def.spriteId) continue
      const isStatic = STATIC_SPRITE_IDS.has(def.spriteId)
      const resolved = resolveMovementConfig(def.spriteId, def.speed, def.movementPattern)
      if (isStatic && (resolved.speed !== 0 || resolved.movementPattern !== 'static')) {
        violations.push({ stageId, id: def.id, spriteId: def.spriteId, resolved })
      }
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `Stage rosters violate REQ-CMB-009 static rule:\n` +
      violations.map(v => `  ${v.stageId}/${v.id} (${v.spriteId}) -> ${JSON.stringify(v.resolved)}`).join('\n')
    )
  }
}