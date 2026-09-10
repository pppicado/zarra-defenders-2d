# Delta for `iso-tile-system`

**Change**: fase-4b-level-extension
**Capability**: iso-tile-system (no changes)

## MODIFIED Requirements

None. The cull math (`computeCullRange` closed-form formula, F3.5) is length-agnostic — extending the rail from depth 36 to 72 does not change `MAX_VISIBLE_TILES = 400` (worst-case visible count with 1-tile overshoot at `LOGICAL_H=720, TILE_SIZE=128` is ~192 tiles; cap 400 has headroom).

## ADDED Requirements

None.

## REMOVED Requirements

None.

## RENAMED Requirements

None.

---

# Delta for `iso-camera-integration`

**Change**: fase-4b-level-extension
**Capability**: iso-camera-integration (no changes)

## MODIFIED Requirements

None. The escape rule (CAM-004, Manhattan distance > 6) is invariant to rail length. The `e01` scenario in CAM-004 (depth 5, escape at `t ≈ 18.33s`) is identical at depth-72 rail because the rail-camera speed stays at 0.6 tile/s.

## ADDED Requirements

None.

## REMOVED Requirements

None.

## RENAMED Requirements

None.
