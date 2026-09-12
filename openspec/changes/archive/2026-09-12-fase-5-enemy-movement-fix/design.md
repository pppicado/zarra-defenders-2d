# Design: fase-5-enemy-movement-fix

## Technical Approach

Fix two Fase-5 bugs: (1) `Enemy` constructor pre-defaults `speed=0`/`movementPattern='static'`, short-circuiting `resolveMovementConfig` before `MOBILE_DEFAULT` applies — every mobile spriteId spawns static; (2) `_onRetry` calls `enemies.reset()` inline but never reloads `TEST_LEVEL`. Fix: drop ctor pre-defaults, resolve via `undefined` vs `explicit` check, and convert retry into an event-driven `bootTestLevel` invocation. TDD strict — RED tests first, GREEN, then REFACTOR.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Differentiate omitted vs explicit | Strict `typeof === 'number' && Number.isFinite(speed)` on `resolveMovementConfig`; ctor passes params through with no defaults | (a) keep ctor defaults, ignore 0/static in resolver; (b) sentinel object | Ctor-side fix is one line, intent is local. Sentinel adds API surface. |
| Remove `speed=0`, `movementPattern='static'` defaults from `Enemy` ctor | Both params default to `undefined` | Override at resolver | Defaults short-circuit resolver before MOBILE_DEFAULT. Removing them is the smallest behavior change that makes MOBILE_DEFAULT win for omitted fields. |
| Retry reload mechanism | Overlay emits `bootTestLevel:request`; `main.js` bus listener invokes existing `bootTestLevel` | (a) overlay imports `bootTestLevel` directly; (b) shared `resetAll` helper | Bus event keeps overlay UI-only (REQ-CMB-011). `bootTestLevel` already does full reset + loadLevel + camera.setTime(0) — no duplication. |

## Data Flow

```
On Reintentar click:
  Overlay._onRetry()
    └─ emit('bootTestLevel:request', {})           // src/ui/overlay.js
         └─ busOn listener (main.js)
              └─ bootTestLevel({ combat, isoWorld, enemies, camera, score, integrity, hud, world, overlay })
                   ├─ enemies.reset() → loadLevel(TEST_LEVEL.enemies)
                   ├─ integrity.reset(), score.reset(), camera.setTime(0)
                   └─ gameState.state = 'gameplay'
  Overlay hides itself, sets gameState.
```

```
On Enemy construction:
  new Enemy({ archetype, isoX, isoY, spriteId, speed?, movementPattern? })
    └─ resolveMovementConfig(spriteId, speed?, movementPattern?)
         ├─ if spriteId ∈ STATIC_SPRITE_IDS → { speed: 0, movementPattern: 'static' }
         └─ else effSpeed   = userSpeed   ?? MOBILE_DEFAULT[sid]?.speed   ?? 0
            effPattern = userPattern ?? MOBILE_DEFAULT[sid]?.movementPattern ?? 'static'
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/enemies.js` | Modify | `resolveMovementConfig` uses `typeof`/finite check; `Enemy` ctor drops `speed=0`/`movementPattern='static'` defaults; add comment block |
| `src/main.js` | Modify | Add `busOn('bootTestLevel:request', …)` listener calling `bootTestLevel` with full ctx |
| `src/ui/overlay.js` | Modify | `_onRetry` keeps local UI reset (`hide()`, gameState) and emits `bootTestLevel:request` instead of inline reset |
| `tests/e2e/enemy-movement.spec.mjs` | Modify | Add R6 (mobile default), R7 (explicit override respected), R8 (retry reloads queue) |

## Interfaces / Contracts

```js
// Event: bootTestLevel:request — no payload; overlay → main
// Listener: async () => { await bootTestLevel({ combat, isoWorld, enemies, camera, score, integrity, hud, world, overlay }) }
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| E2E (Playwright) | Mobile default resolves; explicit override respected; retry reloads queue | Run `node tests/e2e/enemy-movement.spec.mjs` — RED first, then GREEN |
| Existing specs | R1–R5 stay green | Same runner, post-fix |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. Single `git revert <merge-commit>` restores all three files.

## Open Questions

None.
