/**
 * tests/unit/escape-detection.spec.mjs
 *
 * Pin the iso-escape rule from CAM-004 (openspec/specs/iso-camera-integration/spec.md):
 *   isEscaped(enemy, cameraIso) === |ex - cx| + |ey - cy| > 6
 * Manhattan distance from enemy iso to camera iso > 6 tiles.
 *
 * Run with: node tests/unit/escape-detection.spec.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { isEscaped, Enemy } from '../../src/enemies.js?v=26'

const enemy = (isoX, isoY) => new Enemy({ archetype: 'standard', isoX, isoY })

test('CAM-004 — escape predicate is Manhattan > 6 (strict)', () => {
  // For enemy at iso (3, 2), camera (cx, cy) → Manhattan = |3-cx| + |2-cy|.
  //   cam (0, 0) → Manhattan 5     → NOT escaped
  //   cam (9, 2) → Manhattan 6     → NOT escaped (boundary, strict >)
  //   cam (5, 6) → Manhattan 6     → NOT escaped (boundary, strict >)
  //   cam (10, 2) → Manhattan 7    → escaped
  //   cam (5, 7) → Manhattan 7     → escaped
  assert.equal(isEscaped(enemy(3, 2), { isoX: 0,  isoY: 0 }), false, 'Manhattan 5 — not escaped')
  assert.equal(isEscaped(enemy(3, 2), { isoX: 9,  isoY: 2 }), false, 'Manhattan 6 — not escaped (strict >)')
  assert.equal(isEscaped(enemy(3, 2), { isoX: 5,  isoY: 6 }), false, 'Manhattan 6 — not escaped (strict >)')
  assert.equal(isEscaped(enemy(3, 2), { isoX: 10, isoY: 2 }), true,  'Manhattan 7 — escaped')
  assert.equal(isEscaped(enemy(3, 2), { isoX: 5,  isoY: 7 }), true,  'Manhattan 7 — escaped')
})

test('CAM-004 — perpendicular enemy does not escape when camera is right next to it', () => {
  // The bug that motivated switching from depth-based to Manhattan: an enemy
  // would flag as escaped at depth-based check even with a 4-tile buffer if the
  // camera was perpendicular and right next to it. Manhattan correctly keeps
  // it hittable.
  const e = enemy(3, 2)
  assert.equal(isEscaped(e, { isoX: 3.0, isoY: 2.0 }), false, 'camera on top of enemy — Manhattan 0')
  assert.equal(isEscaped(e, { isoX: 4.0, isoY: 2.0 }), false, 'camera one tile east — Manhattan 1')
  assert.equal(isEscaped(e, { isoX: 5.0, isoY: 2.0 }), false, 'camera two tiles east — Manhattan 2')
  assert.equal(isEscaped(e, { isoX: 4.0, isoY: 4.0 }), false, 'camera one east + two south — Manhattan 3')
  assert.equal(isEscaped(e, { isoX: 7.0, isoY: 4.0 }), false, 'camera four east + two south — Manhattan 6, still hittable')
  assert.equal(isEscaped(e, { isoX: 8.0, isoY: 4.0 }), true,  'camera five east + two south — Manhattan 7, escaped')
})

test('CAM-004 — rail-aligned enemy escapes only when camera is far past', () => {
  // For the test-level rail (0,0) -> (18,18) over 60s, the camera moves along
  // isoX=isoY. An enemy at (a, b) with camera at (X, X) (X > max(a,b)) has
  // Manhattan = 2X - a - b. Escape when 2X > a + b + 6.
  const e = enemy(3, 2)  // a+b = 5, escape when 2X > 11 -> X > 5.5
  assert.equal(isEscaped(e, { isoX: 5.0, isoY: 5.0 }), false, 'X=5, Manhattan=5 — not escaped')
  assert.equal(isEscaped(e, { isoX: 5.5, isoY: 5.5 }), false, 'X=5.5, Manhattan=6 — not escaped (boundary)')
  assert.equal(isEscaped(e, { isoX: 5.6, isoY: 5.6 }), true,  'X=5.6, Manhattan=6.2 — escaped')

  // e02 at (5,3): a+b=8, escape when 2X > 14 -> X > 7
  const e2 = enemy(5, 3)
  assert.equal(isEscaped(e2, { isoX: 7.0, isoY: 7.0 }), false, 'e02: X=7, Manhattan=6 — not escaped (boundary)')
  assert.equal(isEscaped(e2, { isoX: 7.1, isoY: 7.1 }), true,  'e02: X=7.1, Manhattan=6.2 — escaped')
})

test('CAM-004 — symmetric: enemy to the SW also escapes symmetrically', () => {
  // The rule must be direction-agnostic: an enemy placed off-rail in any
  // direction behaves the same.
  const e = enemy(0, 5) // same iso depth as e01, but off-rail to the SW
  // camera (5.5, 0.5) → Manhattan = 5.5 + 4.5 = 10 → escaped
  // camera (4.5, 1.5) → Manhattan = 4.5 + 3.5 = 8  → escaped
  // camera (4.4, 1.4) → Manhattan = 4.4 + 3.6 = 8.0 → escaped (boundary at 6)
  // camera (3.4, 1.4) → Manhattan = 3.4 + 3.6 = 7  → escaped
  // camera (3.0, 2.0) → Manhattan = 3.0 + 3.0 = 6  → NOT escaped (strict >)
  // camera (2.5, 2.5) → Manhattan = 2.5 + 2.5 = 5  → NOT escaped
  assert.equal(isEscaped(e, { isoX: 2.5, isoY: 2.5 }), false, 'Manhattan 5 — not escaped')
  assert.equal(isEscaped(e, { isoX: 3.0, isoY: 2.0 }), false, 'Manhattan 6 — not escaped (strict >)')
  assert.equal(isEscaped(e, { isoX: 3.4, isoY: 1.6 }), true,  'Manhattan 7 — escaped')
})

test('CAM-004 — accepts cameraIso as {x,y} fallback (legacy field names)', () => {
  // Earlier isoToScreen paths used {x,y} for camera coordinates; isEscaped
  // MUST keep accepting those so legacy callers don't crash.
  const e = enemy(0, 0)
  assert.equal(isEscaped(e, { x: 0, y: 0 }), false)
  assert.equal(isEscaped(e, { x: 5, y: 2 }), true, 'Manhattan 7 via {x,y} field names')
})

test('CAM-004 — missing enemy coords default to 0 (defensive)', () => {
  const e = { isoX: undefined, isoY: undefined, state: 'alive' }
  // Manhattan 0 from (0,0) -> not escaped regardless of camera position under 6
  assert.equal(isEscaped(e, { isoX: 0, isoY: 0 }), false)
  assert.equal(isEscaped(e, { isoX: 5, isoY: 2 }), true, 'Manhattan 7')
})