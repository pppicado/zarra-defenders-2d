# Isometric Capabilities: Spec Index

Baseline source of truth for the isometric stack. Future changes delta against these files;
the per-change history lives under `openspec/changes/archive/`.

| Spec file | Capability | Requirements | Last change |
|---|---|---|---|
| [iso-tile-system/spec.md](./iso-tile-system/spec.md) | Isometric tile grid, Z-order, viewport culling | TILE-001, TILE-002, TILE-003, TILE-004, TILE-005 | F4a (TILE-001×2, TILE-004 MODIFIED — viewport 1080→720, cull cap 100→400) |
| [iso-camera-integration/spec.md](./iso-camera-integration/spec.md) | Reinterpret `RailCamera` waypoints as iso coords; world transform; iso-plane escape detection | CAM-001, CAM-002, CAM-003, **CAM-004** | F4a (CAM-002 MODIFIED — viewport 1080→720) |
| [iso-asset-pipeline/spec.md](./iso-asset-pipeline/spec.md) | minimax MCP batch generation + chroma-key postprocess + NEAREST downsample + bootstrap loader | ASSET-001 … ASSET-010 | F2.5.2 (ASSET-001/002/007 MODIFIED, ASSET-009/010 ADDED) |
| [iso-gallery/spec.md](./iso-gallery/spec.md) | Dev-only asset review surface: tile/sprite cards, rotation toggle, mini-iso-demo | GAL-001, GAL-002, GAL-003 | F2.5.2 (ADDED) |
| [combat-core/spec.md](./combat-core/spec.md) | Rail-shooter combat loop: fire/cooldown, papeleta homing, screen-space shrunk AABB hit detection, HP/score resolution, ?test=1 determinism, hitInset, debug hitbox overlay | **REQ-CMB-001, REQ-CMB-002, REQ-CMB-003, REQ-CMB-004, REQ-CMB-005, REQ-CMB-006, REQ-CMB-007** | F5-hitbox-visualization (REQ-CMB-003 MODIFIED — add hitInset; REQ-CMB-006, REQ-CMB-007 ADDED) |

## Totals

- **28 requirements** total across 5 capabilities (combat-core contributes 7)
- Tile geometry is **square iso**: `tileHalfWidth = tileHalfHeight = tileSize / 2`, with the
  45° look produced by `_worldLayer.rotation = Math.PI / 4` at the container level (on-disk PNGs stay top-down)
- Tile set is **40 active** PNGs at 64×64 px (`manifest.totals.active === 40`)
- Iso-plane escape: `isEscaped(enemy, cameraIso) = (|ex - cx| + |ey - cy|) > 6` — Manhattan distance > 6 tiles
  (CAM-004). Direction-agnostic, conservative at the perimeter. Validated by `tests/unit/escape-detection.spec.mjs`
  and `tests/e2e/hit-detection.spec.mjs`.

## Known drift

- `ASSET-007` and `GAL-001` contain scenarios asserting `manifest.discarded.length === 40`.
  The shipped `manifest.json` has `discarded: []` (length 0) — the 40 F2.5.1 diamond tiles are
  archived filesystem-only under `assets/tiles/_discarded/diamond-r2/`. The load-bearing
  invariant `totals.active === 40` holds. Resolve on the next asset-pipeline change by either
  populating `discarded[]` or amending the scenario text.

## Cross-references

- Iso math formulas: `PLAN.md` §13 (referenced by TILE-001)
- Escape rule scenarios: `tests/unit/escape-detection.spec.mjs` (CAM-004)
- Style/verification rules: `openspec/config.yaml` (Given/When/Then + RFC 2119 keywords)
- Change history: `openspec/changes/archive/`
