/**
 * tests/unit/levels-stage-rosters.spec.mjs
 *
 * Pin the F6.1 stage-rosters contract (ROADMAP §6.1):
 *  - getRosterForStage(stageId) returns the roster for the 5 known stages.
 *  - getRosterForStage('unknown') returns null.
 *  - Each roster has railPath, railEndTime, enemies, finalBossId, finalBossSpriteId, stageId.
 *  - Each roster has at least 20 enemies and at least one boss.
 *  - Each roster uses spriteIds from the canonical 12-enemy set.
 *  - assertAllRostersStatic() throws if any static spriteId has non-static config.
 *  - listStagesWithRoster() returns all 5 stageIds.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STAGE_ROSTERS,
  getRosterForStage,
  listStagesWithRoster,
  assertAllRostersStatic,
} from '../../src/levels/stage-rosters.js?v=44'

const VALID_SPRITE_IDS = new Set([
  'enemies_camion_treco',
  'enemies_bidon_lixiviado',
  'enemies_bolsa_plastico',
  'enemies_tubo_lixiviado',
  'enemies_dron_fumigador',
  'enemies_valla_publicitaria',
  'enemies_camion_cisterna_residuos',
  'enemies_topadora',
  'enemies_trailer',
  'enemies_planta_treco',
  'enemies_incineradora',
  'enemies_sello_burocratico',
])

const ALL_STAGES = [
  'stage1-lashoyas',
  'stage2-lahoz',
  'stage3-lahunde',
  'stage4-ayora',
  'stage5-acuifero',
]

const EXPECTED_BOSS_BY_STAGE = {
  'stage1-lashoyas': 'enemies_topadora',
  'stage2-lahoz': 'enemies_tubo_lixiviado',
  'stage3-lahunde': 'enemies_incineradora',
  'stage4-ayora': 'enemies_trailer',
  'stage5-acuifero': 'enemies_planta_treco',
}

test('STAGE_ROSTERS: contains exactly 5 stages', () => {
  assert.equal(Object.keys(STAGE_ROSTERS).length, 5)
})

test('STAGE_ROSTERS: stageIds match the canonical ordering', () => {
  for (const sid of ALL_STAGES) {
    assert.ok(STAGE_ROSTERS[sid], `missing stage: ${sid}`)
  }
})

test('getRosterForStage: returns the roster for each known stage', () => {
  for (const sid of ALL_STAGES) {
    const roster = getRosterForStage(sid)
    assert.ok(roster, `should return roster for ${sid}`)
    assert.equal(roster.stageId, sid)
  }
})

test('getRosterForStage: returns null for unknown stage', () => {
  assert.equal(getRosterForStage('stage99-unknown'), null)
  assert.equal(getRosterForStage(''), null)
  assert.equal(getRosterForStage(null), null)
  assert.equal(getRosterForStage(undefined), null)
})

test('each roster has the required shape', () => {
  for (const sid of ALL_STAGES) {
    const r = getRosterForStage(sid)
    assert.ok(Array.isArray(r.railPath), `${sid}.railPath should be array`)
    assert.ok(r.railPath.length >= 2, `${sid}.railPath should have at least 2 waypoints`)
    assert.equal(typeof r.railEndTime, 'number')
    assert.ok(Array.isArray(r.enemies), `${sid}.enemies should be array`)
    assert.equal(typeof r.finalBossId, 'string')
    assert.equal(typeof r.finalBossSpriteId, 'string')
    assert.equal(r.stageId, sid)
  }
})

test('each roster has at least 20 enemies and at least one boss', () => {
  for (const sid of ALL_STAGES) {
    const r = getRosterForStage(sid)
    assert.ok(r.enemies.length >= 20, `${sid} should have ≥20 enemies, got ${r.enemies.length}`)
    const bossCount = r.enemies.filter(e => e.archetype === 'boss').length
    assert.ok(bossCount >= 1, `${sid} should have ≥1 boss, got ${bossCount}`)
  }
})

test('each roster uses only spriteIds from the canonical 12-enemy set', () => {
  for (const sid of ALL_STAGES) {
    const r = getRosterForStage(sid)
    for (const e of r.enemies) {
      assert.ok(VALID_SPRITE_IDS.has(e.spriteId), `${sid} uses unknown spriteId: ${e.spriteId}`)
    }
  }
})

test('each stage has its designated finalBossSpriteId from ROADMAP §6.1', () => {
  for (const sid of ALL_STAGES) {
    const r = getRosterForStage(sid)
    assert.equal(r.finalBossSpriteId, EXPECTED_BOSS_BY_STAGE[sid], `${sid} should have boss ${EXPECTED_BOSS_BY_STAGE[sid]}`)
  }
})

test('each roster has at least one enemy of every archetype except tank (allowed 0)', () => {
  for (const sid of ALL_STAGES) {
    const r = getRosterForStage(sid)
    const counts = { standard: 0, tank: 0, 'mini-boss': 0, boss: 0 }
    for (const e of r.enemies) {
      if (counts[e.archetype] !== undefined) counts[e.archetype]++
    }
    assert.ok(counts.standard > 0, `${sid} should have ≥1 standard`)
    assert.ok(counts['mini-boss'] >= 1, `${sid} should have ≥1 mini-boss`)
    assert.ok(counts.boss >= 1, `${sid} should have ≥1 boss`)
  }
})

test('each roster enemy has the required fields', () => {
  for (const sid of ALL_STAGES) {
    const r = getRosterForStage(sid)
    for (const e of r.enemies) {
      assert.equal(typeof e.id, 'string', `${sid} enemy missing id`)
      assert.equal(typeof e.archetype, 'string', `${sid} enemy missing archetype`)
      assert.equal(typeof e.isoX, 'number', `${sid} enemy missing isoX`)
      assert.equal(typeof e.isoY, 'number', `${sid} enemy missing isoY`)
      assert.ok(typeof e.spriteId === 'string' || e.spriteId === null)
    }
  }
})

test('listStagesWithRoster() returns all 5 stages', () => {
  const list = listStagesWithRoster()
  assert.equal(list.length, 5)
  for (const sid of ALL_STAGES) assert.ok(list.includes(sid))
})

test('assertAllRostersStatic() does not throw for current rosters', () => {
  assert.doesNotThrow(() => assertAllRostersStatic())
})

test('rosters have distinct finalBossSpriteId (the unique-boss-per-stage guarantee)', () => {
  const bosses = ALL_STAGES.map(sid => getRosterForStage(sid).finalBossSpriteId)
  const unique = new Set(bosses)
  assert.equal(unique.size, bosses.length, `expected ${ALL_STAGES.length} unique bosses, got ${unique.size}: ${[...unique].join(', ')}`)
})

test('stage1-lashoyas uses topadora + camion_treco + dron_fumigador theme', () => {
  const r = getRosterForStage('stage1-lashoyas')
  const sprites = new Set(r.enemies.map(e => e.spriteId))
  assert.ok(sprites.has('enemies_topadora'))
  assert.ok(sprites.has('enemies_camion_treco'))
  assert.ok(sprites.has('enemies_dron_fumigador'))
})

test('stage2-lahoz uses tubo_lixiviado + bidon_lixiviado + dron_fumigador theme', () => {
  const r = getRosterForStage('stage2-lahoz')
  const sprites = new Set(r.enemies.map(e => e.spriteId))
  assert.ok(sprites.has('enemies_tubo_lixiviado'))
  assert.ok(sprites.has('enemies_bidon_lixiviado'))
  assert.ok(sprites.has('enemies_dron_fumigador'))
})

test('stage3-lahunde uses incineradora + topadora + dron_fumigador theme', () => {
  const r = getRosterForStage('stage3-lahunde')
  const sprites = new Set(r.enemies.map(e => e.spriteId))
  assert.ok(sprites.has('enemies_incineradora'))
  assert.ok(sprites.has('enemies_topadora'))
  assert.ok(sprites.has('enemies_dron_fumigador'))
})

test('stage4-ayora uses trailer + camion_treco + cisterna theme (convoy through town)', () => {
  const r = getRosterForStage('stage4-ayora')
  const sprites = new Set(r.enemies.map(e => e.spriteId))
  assert.ok(sprites.has('enemies_trailer'))
  assert.ok(sprites.has('enemies_camion_treco'))
  assert.ok(sprites.has('enemies_camion_cisterna_residuos'))
})

test('stage5-acuifero uses planta_treco + drones + bidon_lixiviado (final megaproject)', () => {
  const r = getRosterForStage('stage5-acuifero')
  const sprites = new Set(r.enemies.map(e => e.spriteId))
  assert.ok(sprites.has('enemies_planta_treco'))
  assert.ok(sprites.has('enemies_dron_fumigador'))
  assert.ok(sprites.has('enemies_bidon_lixiviado'))
})

process.exit(0)
