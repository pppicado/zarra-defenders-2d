# F2.5 — Isometric Tile System: Spec Index

This change establishes the initial baseline for three new capabilities. Future changes will delta against the archived baseline.

| Spec file | Capability | Requirements | Status |
|---|---|---|---|
| [iso-tile-system/spec.md](./iso-tile-system/spec.md) | Isometric tile grid, Z-order, viewport culling | TILE-001, TILE-002, TILE-003, TILE-004 | ADDED |
| [iso-camera-integration/spec.md](./iso-camera-integration/spec.md) | Reinterpret `RailCamera` waypoints as iso coords; world transform | CAM-001, CAM-002, CAM-003 | ADDED |
| [iso-asset-pipeline/spec.md](./iso-asset-pipeline/spec.md) | minimax MCP batch generation + chroma-key postprocess + bootstrap loader | ASSET-001, ASSET-002, ASSET-003, ASSET-004, ASSET-005 | ADDED |

## Totals

- **12 requirements** total
- **~30 Given/When/Then scenarios** across the three specs
- **Zero modifications** to existing camera, input, or player specs (F2.5 only adds new capabilities)

## Cross-references

- Locked decisions: see `proposal.md` §"Why" + §"Capabilities"
- Iso math formulas: `PLAN.md` §13 (referenced by TILE-001)
- Style/verification rules: `openspec/config.yaml` (Given/When/Then + RFC 2119 keywords)