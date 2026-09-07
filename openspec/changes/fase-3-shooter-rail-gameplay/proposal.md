# Proposal: F3 — Shooter Rail Gameplay

**Change**: `fase-3-shooter-rail-gameplay` (display name: F3)
**Project**: zarra-defenders-2d · **Base**: main @ d93ff08 (F2.5.5–F2.5.15 archived; F2.5.15 commit `c952ca3` is the live iso pivot)
**Mode**: hybrid · **Strategy**: single-pr with `size:exception` (user-approved 2026-09-07, see §13) · **LOC target**: ~1000 LOC · **Status**: ready for sdd-spec / sdd-design

---

## 1. Intent

F2.5 ships a deterministic isometric stage demo (tiles, vertical sprites, reverse-depth rendering, camera integration), but it is still not a game. The player can pan a camera and watch scenery; there is no enemy, no projectile, no integrity, no fire trigger, no test API. The product is still a renderer, not a shooter. **F3 turns the demo into the smallest possible rail shooter loop**: pointer → click → signed papeleta projectile → continuous iso-plane hit test → enemy HP → escape penalty → integrity segmentation. This is the smallest end-to-end combat slice that proves the loop and unblocks F4 (full Bosque stage) and F5 (enemy AI / waves).

The user pain is concrete: every visual polish and asset regeneration on top of F2.5 is wasted until the combat loop is observable. The current test level (`?test=1`) is a stub. `src/player.js` itself comments that firing belongs to F3. `PLAN.md §3` and `§11` already demand a deterministic combat test API; the spec/code drift between `tileSize/√2` (live code) and `tileSize/2` (specs, tests) is a blocker that F3 must resolve as part of its contract.

The business goal is civic-pedagogical: the game must let a player experience resistance to the Zarra macro-landfill by *signing administrative forms* at the things destroying the Valle de Ayora-Cofrentes — a fleet of trucks, a toxic-waste tanker, drones, billboards. Without F3 the project is a tech demo about a protest. With F3 it is a protest.

The prior state: F2.5.5–F2.5.15 archived 11 commits of iterative tessellation tuning and left a polished iso pivot. Five blockers documented by `sdd-explore` still block combat: (1) `IsoWorld.screenToIso()` ignores camera/container translation; (2) `camion_cisterna_residuos` sprite missing, `plataforma_solar` obsolete; (3) tile spec/code drift; (4) `?test=1` and `__gameTestAPI__` are stubs; (5) `dron_fumigador` archetype unassigned.

---

## 2. Scope

### In scope (F3 ships this single PR)

| # | Capability | Files (approx.) | Acceptance |
|---|---|---|---|
| 1 | Camera-aware screen → iso inverse | `src/iso/world.js`, `src/iso/iso-math.js` (new helper or fix), `src/main.js` | click at viewport coords returns correct world iso coord under any camera position; tests pin 3 sample clicks |
| 2 | Enemies manager + archetypes (HP table) | `src/enemies.js` (new), `assets/sprites/` catalog update, `assets/sprites/manifest.json` | 12-enemy test level loads with HP per archetype: standard=1, tank=3, mini-boss=10, boss=30 |
| 3 | Player fire: signed papeleta + cooldown, emitted from hand sprite | `src/player.js` (fire request only), `src/projectile.js` (new), `src/main.js` (hand + request wiring), `assets/sprites/hand_pen.png` (new, real asset, NOT placeholder) | hand sprite follows pointer (offset so the sprite sits beside the crosshair, not under it); click fires one papeleta from the hand's screen position at ≤ 3 shots/sec; out-of-cooldown click is silently dropped |
| 4 | Continuous iso-plane hit detection + reverse-depth selection | `src/hit-detection.js` (new) or merged in `src/combat.js` | one-tile footprint per enemy (configurable per archetype); reverse-depth candidates; ally hits and misses cost nothing |
| 5 | 3-segment integrity state + HUD | `src/integrity.js` (new), `index.html`, `styles/main.css` | each escape costs `-1 segment` (PLAN.md:43 mandate); integrity === 0 emits `stage:failed` event |
| 6 | Iso depth escape boundary | `src/main.js` (collision loop) | enemy escapes when its iso center passes the corridor front (one tile past active front edge), not by screen-Y |
| 7 | Deterministic `?test=1` test level + `__gameTestAPI__` | `tests/e2e/hit-detection.spec.mjs` (new), `src/main.js` test branch | `setTime(t)` / `spawnEnemy(id, isoX, isoY)` / `simulateTap(screenX, screenY)` / `readIntegrity()` API; 60 Hz fixed clock; no `Math.random` in combat |
| 8 | Minimal visual feedback (no new art) | `src/combat.js` or `src/main.js` | HP=0 enemy plays a brief tint flash before destroy; integrity segment change briefly highlights its bar; integrity === 0 shows `STAGE FAILED` overlay stub |
| 9 | Test fixture only (NOT the full Bosque stage) | `assets/levels/test-level.json` (new), `src/main.js` | 12 enemies in a deterministic 60-second corridor script; pink-magenta placeholder PNG for `camion_cisterna_residuos` (no AI regeneration); obsolete `plataforma_solar` marked deprecated but kept on disk |
| 10 | Hand + pen sprite (real asset, not placeholder) | `assets/sprites/hand_pen.png` (new, generated via `minimax_text_to_image` per `iso-asset-pipeline` ASSET-001/006), `assets/sprites/manifest.json` | one-shot minimax generation in this PR; sprite follows pointer with a small offset so it sits beside the crosshair; emits papeleta from hand's screen position; F3 ships a real sprite, not magenta |
| 11 | Main menu (entry screen) | `src/main.js` (boot branch), `index.html`, `styles/main.css` | first-paint screen shows three buttons: "Iniciar test level", "Acerca de", "Disclaimer"; default selection on load = "Iniciar test level"; full keyboard nav (Up/Down + Enter, Esc to back); tap-friendly on mobile (touch targets large enough); click "Iniciar test level" transitions to the test level |
| 12 | Game-over overlay + return-to-menu flow | `src/main.js`, `index.html`, `styles/main.css`, `src/integrity.js` | when integrity === 0 → camera halts, full overlay shows final score, "Firmas recogidas: N", buttons "Volver al menú principal" + "Reintentar test level"; "Volver" returns to main menu; "Reintentar" restarts the test level |
| 13 | Victory overlay (test level cleared) | `src/main.js`, `index.html`, `styles/main.css` | when all 12 enemies destroyed AND camera reaches end of rail → same UI shape as game-over with positive copy; "Firmas recogidas: N" + final score; "Volver al menú principal" + "Reintentar test level" |
| 14 | Best score persistence | `src/main.js`, `src/score.js` (new) | `localStorage` key `zarra2d:best:test_level` stores the best score across runs of the test level; read on main menu (optional display) and updated on game-over / victory; localStorage failures degrade silently |
| 15 | Spec/code drift cleanup (test only) | `tests/iso-smoke.js`, `openspec/specs/iso-tile-system/spec.md` MODIFIED TILE-001/002 | 400-tile cap (not 100); `tileSize/√2` (not `/2`); same commit as the spec MODIFIED, so apply + verify stay honest |

### Out of scope (deferred to F4+)

- Full Bosque stage authoring (spawn curves, narrative pedagogy cards, environmental storytelling) — **F4**.
- Enemy AI behavior trees / waves / formations — **F5**.
- Per-pixel alpha-mask picking — explicitly **OUT** per explore (Approach 1 is canonical).
- Real `camion_cisterna_residuos` art — **F4**. F3 uses a 64×64 magenta-chroma placeholder PNG (no AI generation in this PR).
- Ally character (`alcalde`, `vecino`) hit logic — ally HP is 1 like standard; full ally AI is **F5**.
- Pedagogy card system — **F6**.
- Full Bosque-level main menu (per-level selection, settings, audio controls, credits) — **F7+**. F3 main menu is the test-level entry only.
- Any modification to `src/main.js` bootstrap beyond what's needed to wire F3 modules and the test API; lock file under `openspec/config.yaml` `rules.apply` still applies for `rail-camera.js`, `input.js`, `player.js`, `index.html`, `styles/main.css` *only if* those edits are non-combat (this PR does edit `index.html` and `styles/main.css` for HUD — see §5).
- Removing `plataforma_solar` PNG from disk — kept for F4 asset-regen audit trail; manifest marks it `deprecated`.

---

## 3. Capabilities (contract with sdd-spec)

### New capabilities

- **`combat-core`**: deterministic rail-shooter loop. Covers the fire trigger, papeleta projectile (emitted from the hand sprite's screen position), continuous iso-plane hit detection with reverse-depth selection, and the projectile–enemy collision lifecycle. Exposes events: `hit`, `miss`, `enemy:escaped`, `enemy:destroyed`.
- **`enemy-archetypes`**: HP table and archetype metadata (`{standard: 1, tank: 3, mini-boss: 10, boss: 30}`), per-archetype footprint half-width/half-height (default 1 tile; tank and mini-boss configurable), and per-archetype visual flash duration. `dron_fumigador` is assigned `tank` (HP=3) — **locked by user decision 2026-09-07, no longer an open question**.
- **`player-integrity`**: 3-segment integrity state machine, escape-penalty rule, full game-over overlay (final score + "Firmas recogidas: N" + "Volver al menú principal" + "Reintentar test level") when integrity === 0. No "3 lives" UI literally — the segmented bar is the visual contract for state; the overlay is the user-facing terminal.
- **`game-test-api`**: `__gameTestAPI__` global exposing `setTime(t)`, `spawnEnemy(id, isoX, isoY)`, `simulateTap(screenX, screenY)`, `readIntegrity()`, `readEnemies()`, `readProjectiles()`. Activated by `?test=1` query parameter.
- **`main-menu`**: entry-screen overlay shown on first paint (and on "Volver al menú principal" from game-over / victory). Three buttons: "Iniciar test level" (default selected), "Acerca de", "Disclaimer". Full keyboard navigation (Up/Down + Enter, Esc to back). Tap-friendly on mobile (touch targets large enough). Triggers the test-level boot when "Iniciar test level" is activated.
- **`game-over-flow`**: shown when `player-integrity` reaches 0. Halts camera, displays final score + "Firmas recogidas: N", and offers "Volver al menú principal" (returns to `main-menu`) + "Reintentar test level" (resets state and re-runs the deterministic 12-enemy fixture). Same UI shape as victory overlay with negative copy.
- **`victory-flow`**: shown when all 12 enemies destroyed AND camera reaches the end of the rail. Same UI shape as game-over with positive copy. Both buttons behave identically to game-over.
- **`best-score`**: persists the best score for the test level under `localStorage` key `zarra2d:best:test_level`. Read on main menu (optional display) and updated on game-over / victory. `localStorage` access failures degrade silently (no crash, no retry loop).
- **`hand-pen-sprite`**: pointer-tracking hand sprite (`assets/sprites/hand_pen.png`). Generated once via `minimax_text_to_image` (per `iso-asset-pipeline` ASSET-001/006) and shipped in this PR. Renders at the cursor position with a small offset so it sits beside the crosshair, not under it. Its screen position is the papeleta spawn origin (replaces the previously planned fixed HUD origin).

### Modified capabilities

- **`iso-camera-integration`** (MODIFIED CAM-002): add a scenario requiring the camera-aware screen → iso inverse that subtracts `world.container.position` from screen-space input before delegating to `screenToIso`. Pin the existing TILE-001 round-trip with a camera-translated sample.
- **`iso-tile-system`** (MODIFIED TILE-001/002): reconcile the spec to F2.5.15 live code (`step = tileSize / √2`, per-tile rotation, unrotated container). MODIFIED TILE-004: cull cap `≤ 400` (was `≤ 100`). These are spec/code drift cleanup — no behavior change to engine, only to specs and `tests/iso-smoke.js`.
- **`iso-asset-pipeline`** (MODIFIED ASSET-004): `camion_cisterna_residuos` added to the test level catalog; `plataforma_solar` marked `deprecated` (PNG kept on disk); `dron_fumigador` assigned `tank` archetype (HP=3); `hand_pen` added to the asset catalog as a real sprite generated via `minimax_text_to_image` in this PR (one-shot, not a placeholder).

### Removed capabilities

None.

---

## 4. Approach

The recommended approach (from `sdd-explore`, Approach 1, ratified): **continuous iso-plane footprints + camera-aware inverse + reverse-depth selection**. Concretely:

1. **Camera-aware inverse.** Add a pure helper `worldToIso(sx, sy)` to `src/iso/world.js` that subtracts `this.container.position` from `(sx, sy)` before calling the existing `screenToIso`. The existing pure math stays untouched so TILE-001 round-trip still holds.
2. **Archetype data.** Single source of truth in `src/enemies.js`:
   ```js
   ARCHETYPES = {
     standard:    { hp: 1,  footprint: { hw: 0.5, hh: 0.5 } },
     tank:        { hp: 3,  footprint: { hw: 0.7, hh: 0.7 } },
     'mini-boss': { hp: 10, footprint: { hw: 0.8, hh: 0.8 } },
     boss:        { hp: 30, footprint: { hw: 1.0, hh: 1.0 } },
   };
   ```
3. **Hit resolution.** On tap: convert screen → world iso via `worldToIso`; collect all live enemies whose archetype footprint AABB contains the point; sort by `(gx + gy) * 1000 + spriteOffset` descending; first match takes the hit. Misses and ally hits are no-ops.
4. **Projectile + hand sprite.** A `PIXI.Sprite` of `assets/sprites/hand_pen.png` tracks the pointer with a small offset (so the sprite sits beside the crosshair, not under it). On tap, a short-lived `PIXI.Graphics` papeleta is emitted from the hand's screen position to the click point. ~100 ms visible, then despawn. Cooldown ≈ 333 ms (3 shots/sec). `hand_pen.png` is generated once via `minimax_text_to_image` and shipped with this PR.
5. **Escape rule.** Enemy escapes when its iso center crosses `corridorFrontDepth = camera.isoX + camera.isoY + 1` (one iso row past the active front edge defined by the rail path). At that moment `-1 integrity segment` and the enemy despawns. Screen-Y is **retired**.
6. **Test API.** `__gameTestAPI__` exposes a deterministic 60 Hz clock (`setTime` / `advance(dtMs)`), and pure read-only snapshots (`readIntegrity`, `readEnemies`, `readProjectiles`). `Math.random` is replaced by a seeded PRNG (`mulberry32`) injected at boot when `?test=1` is present, so production uses `Math.random` and tests use a fixed seed.

Per-pixel alpha-mask picking is **out** (Approach 2 rejected by explore: high cost, headless/GPU-dependent, unnecessary for 512px low-count assets).

---

## 5. Decisions made in this proposal

The user provided 8 decisions. Each is adopted here unless explicitly noted:

| # | Decision | Choice | Reason |
|---|---|---|---|
| 1 | F3 scope | **Primitives + test fixture + main menu + game-over + victory + best score + hand sprite** (no full Bosque) | Full Bosque belongs to F4; F3 must prove the loop end-to-end AND deliver a playable entry/exit flow. The menu/overlays share too much wiring with combat to split. |
| 2 | Papeleta spawn point | **Hand sprite that follows the pointer; papeleta emitted from hand's screen position** | Hand sprite is generated once via minimax and shipped in this PR; offset so sprite is visible beside the crosshair; matches the civic-pedagogical "signing forms" intent. |
| 3 | Escape boundary | **Iso depth** (one row past active front edge) | Screen-Y is legacy from pre-iso design; iso depth respects the F2.5.15 pivot and the locked "free-aim, deterministic" intent. |
| 4 | `dron_fumigador` archetype | **Tank** (HP=3) — **locked, not open** | "High-threat harass" maps to tank better than glass-cannon standard; PLAN.md does not pin it. **User locked this decision 2026-09-07; no longer an open question for spec.** |
| 5 | Game-over transition | **Full flow in F3** (main menu entry, game-over overlay, victory overlay, return-to-menu, retry) | F3 ships the full terminal flow; F7 only adds full Bosque-level menus, settings, audio, credits. |
| 6 | Tanker sprite | **Magenta-chroma placeholder PNG** (no AI regen) | Real `camion_cisterna_residuos` regen happens in F4 alongside the rest of Bosque sprites; F3 needs *something* to render. |
| 7 | Hand sprite | **Real asset, generated in this PR via `minimax_text_to_image`** | One-shot minimax generation per `iso-asset-pipeline` ASSET-001/006; sprite ships as `assets/sprites/hand_pen.png`; no magenta placeholder for the hand. |
| 8 | Delivery strategy | **Single PR with `size:exception`** (≈ 1000 LOC target) | Coupling between combat primitives, integrity events, overlays, and main menu is tight through the shared Pixi app instance and event bus; splitting would double CI time and integration risk. See §13. |

---

## 6. Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/iso/world.js` | Modified | Add `worldToIso(sx, sy)` helper; subtract `this.container.position` before delegating to `screenToIso`. |
| `src/iso/iso-math.js` | None | Pure math stays as F2.5.15. Drift is in specs/tests, not the function. |
| `src/enemies.js` | New | Archetype table + `Enemy` class + `EnemyManager` (spawn, update, escape detection, despawn). |
| `src/projectile.js` | New | Papeleta projectile (PIXI.Graphics line + lifecycle + cooldown gate). |
| `src/hit-detection.js` or `src/combat.js` | New | Continuous footprint hit-test with reverse-depth selection; resolves the single-hit-per-tap contract. |
| `src/integrity.js` | New | 3-segment state machine + event emitter + `STAGE FAILED` overlay trigger. |
| `src/player.js` | Modified | Add `requestFire(targetIsoX, targetIsoY)` method (no visual hand change in F3); respect locked rule "fire belongs to F3, hand/pen stays on `hud`". |
| `src/main.js` | Modified | Wire combat modules into the bootstrap; mount `?test=1` branch; mount `__gameTestAPI__`; feed 60 Hz clock; orchestrate update order: input → projectiles → hit-test → escape → integrity → render. |
| `src/rail-camera.js` | None | Locked by CAM-001; deterministic `setTime` is achieved by exposing `RailCamera.setTime(t)` if missing (verify spec — may already exist). |
| `src/input.js` | None | Tap events already emitted; combat layer consumes them. |
| `index.html` | Modified | Integrity HUD container + `STAGE FAILED` overlay div + `?test=1` boot branch. **NOTE**: edits `index.html` despite `rules.apply` lock — this proposal requests a scoped exception for HUD wiring. |
| `styles/main.css` | Modified | Segmented integrity bar styling, overlay z-index, test-mode badge. **NOTE**: same scoped-exception request as `index.html`. |
| `assets/sprites/manifest.json` | Modified | Add `camion_cisterna_residuos` entry with placeholder PNG path; mark `plataforma_solar` as `deprecated` (PNG kept on disk); assign `dron_fumigador` archetype `tank`. |
| `assets/sprites/camion_cisterna_residuos.png` | New (placeholder) | 64×64 magenta-chroma `#FF00FF` PNG (NOT AI-generated) with simple silhouette; replaces `plataforma_solar` in the test level. |
| `assets/sprites/hand_pen.png` | New (real asset, AI-generated) | Generated once via `minimax_text_to_image` per `iso-asset-pipeline` ASSET-001/006; pointer-tracking hand sprite; replaces the previously planned fixed HUD origin for papeleta spawn. |
| `src/score.js` | New | `localStorage` key `zarra2d:best:test_level`; reads/writes best score; silent fallback on `localStorage` errors; surfaced on main menu (optional) and updated on game-over / victory. |
| `src/main.js` | Modified | In addition to F3 wiring: mount main menu as the first-paint screen, mount game-over / victory overlays, wire best-score reads/writes, drive pointer → hand sprite → papeleta origin, branch boot order so the menu gates the test-level entry. |
| `index.html` | Modified | Integrity HUD container + `STAGE FAILED` overlay div + main menu container (`Iniciar test level` / `Acerca de` / `Disclaimer` buttons) + game-over overlay container + victory overlay container + `?test=1` boot branch. **NOTE**: edits `index.html` despite `rules.apply` lock — this proposal requests a scoped exception for HUD + menu + overlays wiring. |
| `styles/main.css` | Modified | Segmented integrity bar styling, overlay z-index, test-mode badge, main menu layout + keyboard focus state, game-over / victory overlay styles, touch-target sizing for mobile. **NOTE**: same scoped-exception request as `index.html`. |
| `tests/iso-smoke.js` | Modified | 400-tile cap (was 100); mock canvas respects `tileSize/√2`; same commit as the spec MODIFIED so verify stays honest. |
| `tests/e2e/hit-detection.spec.mjs` | New | Playwright headless: spawn 4 enemies, fire 4 taps, assert 4 destroyed and integrity === 3 segments; second test asserts escape drains integrity. |
| `openspec/specs/iso-tile-system/spec.md` | Modified | TILE-001/002 reconciled to F2.5.15; TILE-004 cap 400. |
| `openspec/specs/iso-camera-integration/spec.md` | Modified | CAM-002 adds the camera-aware screen→iso scenario. |
| `openspec/specs/iso-asset-pipeline/spec.md` | Modified | ASSET-004: catalog adds `camion_cisterna_residuos`, deprecates `plataforma_solar`. |
| `openspec/specs/{combat-core,enemy-archetypes,player-integrity,game-test-api}/spec.md` | New | Four new capabilities. |

`src/rail-camera.js` is verified untouched per CAM-001 (zero diff).

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `worldToIso` inverse introduces systematic hit-test offset when camera is mid-corridor | Medium | Pin 3 sample clicks in the new CAM-002 scenario; run `tests/e2e/hit-detection.spec.mjs` under Playwright headless before commit; visual smoke-test under dev server. |
| Spec/code drift fixes to `iso-tile-system` break the visual gallery mini-iso-demo | Low | The MODIFIED TILE-001/002 describe *existing* F2.5.15 behavior — no engine change; gallery already on F2.5.15 visuals. |
| F3 ≈ 1000 LOC exceeds the 400-LOC review budget, governed by §13 size exception | Medium | `size:exception` approved 2026-09-07 (see §13). Coupling between combat primitives, integrity, overlays, and main menu through the shared Pixi app + event bus makes a split uneconomic. Orchestrator records the `size:exception` token alongside the `sdd-attempt` acquire call before launching `sdd-apply`. |
| `?test=1` test branch deviates from production behavior because the seeded PRNG is used in production paths | Medium | Seed the PRNG only inside the test branch; production uses `Math.random`; tests assert exact HP transitions and exact integrity segment counts, not specific RNG values. |
| `dron_fumigador = tank` is wrong for the Bosque stage narrative | Low–Medium | **Locked by user 2026-09-07.** F3 uses tank (HP=3). F4 spec can revisit if narrative demands otherwise; no F3 cost to flip. |
| Placeholder magenta-chroma `camion_cisterna_residuos` slips into a production build by accident | Low | Manifest entry tagged `placeholder=true`; F4 regen workflow (ASSET-009) MUST refuse to ship while any `placeholder=true` entry exists in the test level. |
| `index.html` and `styles/main.css` are inside the `rules.apply` lock but F3 needs to edit them for HUD wiring | Medium | This proposal requests a **scoped exception** for §6 HUD changes only. Document in `apply-progress.md` that the lock holds for everything else. |
| `?test=1` 60 Hz fixed clock interacts poorly with `RailCamera` interpolation (which uses real time) | Medium | Spec the contract: when `?test=1` is active, `RailCamera` MUST honor `__gameTestAPI__.setTime(t)` and ignore `performance.now()`. Single small contract, easy to pin. |
| 12-enemy test fixture is too sparse to catch AI edge cases that F5 will need | Low | Out of scope — F3 is the smallest end-to-end loop, not the wave simulator. F5 owns AI coverage. |
| `minimax_text_to_image` for `hand_pen.png` returns an off-style or malformed sprite | Medium | Pin the prompt verbatim (chroma key + style refs) per ASSET-001/006; if the first generation is wrong, regenerate once; if still wrong, fall back to a hand-authored 64×64 magenta silhouette **and** flag the placeholder flag in the manifest — never block the PR on art quality, F4 polish owns the real art. |
| `localStorage` unavailable (private mode, disabled, quota) crashes the main menu | Low | `src/score.js` wraps every `localStorage` call in try/catch; failures degrade silently (best score is treated as 0, no UI error). |
| Main menu keyboard nav and pointer-driven hand sprite both compete for input | Low | Keyboard input is gated on the main-menu state only; once the test level is in flight, the keyboard handler releases the pointer-tracking hand; state machine pins this. |
| Game-over / victory overlay overlaps the integrity HUD on small screens | Low | Overlay z-index > HUD z-index; CSS media query shrinks HUD on viewports < 600 px to avoid visual collision. |

---

## 8. Rollback Plan

1. **Revert the merge commit** on `main` (single commit if single-PR strategy held). Restores `src/iso/world.js`, `src/main.js`, `src/player.js`, `index.html`, `styles/main.css`, and the four new modules to the F2.5.15 state.
2. **Module removal.** `src/enemies.js`, `src/projectile.js`, `src/combat.js` (or `src/hit-detection.js`), `src/integrity.js`, `src/score.js` are new files — delete after revert.
3. **Spec deltas.** The MODIFIED deltas to `iso-tile-system`, `iso-camera-integration`, `iso-asset-pipeline` live only inside the change folder under `specs/`. Archiving applies them; rollback means *not* archiving, so main specs stay untouched.
4. **Asset placeholder.** The magenta-chroma `camion_cisterna_residuos.png` is a new file. Delete after revert. `assets/sprites/manifest.json` reverts the catalog entry, the `plataforma_solar` deprecation flag, and the `hand_pen` entry.
5. **Real asset.** `assets/sprites/hand_pen.png` is a new file generated via `minimax_text_to_image` — delete after revert (no production dependency on it).
6. **Tests.** `tests/e2e/hit-detection.spec.mjs` is a new file — delete after revert. `tests/iso-smoke.js` MODIFIED comments revert naturally with the file revert.
7. **localStorage.** No migration needed; `zarra2d:best:test_level` is dropped along with the code that reads/writes it.
8. **Cost.** One `git revert` of the merge + 6 `rm` for new files + 1 `mv` if the manifest needs restoration. No data loss.
9. **Backwards compatibility.** F2.5.15 has no combat, no integrity, no test API, no menu. Reverting F3 leaves F2.5.15 untouched and complete. No downstream consumer to migrate.

---

## 9. Dependencies

- **minimax MCP** — used **once** in this PR to generate `assets/sprites/hand_pen.png` per `iso-asset-pipeline` ASSET-001/006 (verbatim prompt, 1:1 aspect, magenta chroma-key). `camion_cisterna_residuos` placeholder is hand-authored; F4 regen will resume minimax usage for the rest of the Bosque sprites.
- **Playwright** — headless for `tests/e2e/hit-detection.spec.mjs` and visual smoke; matches the project convention (`openspec/config.yaml` `verification_path`).
- **Python `http.server`** — local dev already bound to `0.0.0.0:8000` via `start_server.sh`. No infra change.
- **Pixi.js v7.4.0** — `Container.position`, `Sprite.rotation`, `Graphics` — all already in use. No version bump.
- **mulberry32** — 13-line seeded PRNG, inlined in `src/engram/random.js` (new, ~20 LOC) OR reused from `src/test-utils/rng.js` if it exists; spec phase should pin the exact module path.

---

## 10. Success Criteria

- [ ] Camera-aware `worldToIso` helper exists on `IsoWorld`; pin-tested in Playwright with 3 sample clicks at different camera positions; round-trip identity holds within ±0.001.
- [ ] 12 enemies load in `?test=1` with HP per archetype table (standard=1, tank=3, mini-boss=10, boss=30); `dron_fumigador` is `tank`.
- [ ] Click → papeleta → hit/destroy flow works end-to-end in the test fixture; reverse-depth selection picks the closest enemy when multiple are in the AABB.
- [ ] 3-segment integrity bar renders; enemy escape drains exactly 1 segment per escape; integrity === 0 triggers the full game-over overlay (final score + "Firmas recogidas: N" + "Volver al menú principal" + "Reintentar test level"); camera halts.
- [ ] Hand sprite `assets/sprites/hand_pen.png` follows the pointer with a visible offset beside the crosshair; papeleta is emitted from the hand's screen position, not a fixed HUD point.
- [ ] Main menu is the first-paint screen: three buttons ("Iniciar test level" default-selected, "Acerca de", "Disclaimer"); keyboard nav (Up/Down + Enter, Esc to back) works; touch targets are large enough for mobile tap.
- [ ] All 12 enemies destroyed AND camera reaches end of rail → victory overlay renders with positive copy, same button set as game-over.
- [ ] Best score persists under `localStorage` key `zarra2d:best:test_level`; updated on game-over and on victory; main menu (optionally) shows it; `localStorage` errors degrade silently.
- [ ] `?test=1` boots a deterministic 60 Hz clock; `Math.random` is not called in combat paths under `?test=1`; `__gameTestAPI__` exposes `setTime`, `spawnEnemy`, `simulateTap`, `readIntegrity`, `readEnemies`, `readProjectiles`.
- [ ] `tests/e2e/hit-detection.spec.mjs` passes headless; 4 enemies → 4 taps → 4 destroyed + integrity unchanged; second spec asserts 1 escape → integrity = 2 segments.
- [ ] Spec/code drift fixed: `openspec/specs/iso-tile-system/spec.md` MODIFIED TILE-001/002 match F2.5.15 live code; TILE-004 cap = 400; `tests/iso-smoke.js` references 400-tile cap and `tileSize/√2`.
- [ ] Single PR, ~1000 LOC forecast, `size:exception` user-approved 2026-09-07 (see §13); orchestrator records the token before launching `sdd-apply`.
- [ ] `src/rail-camera.js`, `src/input.js`, `src/main.js` bootstrap beyond F3 wiring + main menu + overlays, `assets/sprites/*` (other than the placeholder + `hand_pen`) untouched. Verified by `git diff --stat` on the locked paths.
- [ ] AI image generation used **once** for `hand_pen.png` via `minimax_text_to_image` per `iso-asset-pipeline` ASSET-001/006; `camion_cisterna_residuos` placeholder remains magenta; `tools/generate-iso-tiles.py` is NOT invoked.

---

## 11. Open questions for sdd-spec

These are decisions the proposal adopted a recommended default for. **Spec phase should challenge each one** before locking the delta. The previous version had six open questions; two are now resolved and are listed at the bottom for traceability.

1. **`worldToIso` API contract.** Does it live on `IsoWorld` instance, or as a free function in `src/iso/iso-math.js` taking `containerPosition` as a param? Proposal leans instance method; spec should pin.
2. **`RailCamera.setTime(t)` availability.** Explore assumes it may already exist or needs adding. Spec phase must verify and either document reuse or add it (small additive change to a locked file — needs explicit user approval per `rules.apply` lock on `rail-camera.js`).
3. **Segmentation rendering detail.** 3 segments horizontal, vertical, or radial? Proposal leaves "horizontal bar with 3 segments" as the visual contract; spec should pin styling.
4. **Main menu "Acerca de" / "Disclaimer" copy.** Static text vs modal with scrollable content? Spec should pin (proposal leans: simple inline div with the body text, no modal layer).
5. **Hand sprite offset from cursor.** How many px? Should the offset flip horizontally when the cursor is in the right half of the screen so the hand doesn't cover the crosshair? Spec should pin the offset constant and the flip rule.
6. **`__gameTestAPI__` coverage of the new flows.** Spec should decide whether `?test=1` bypasses the main menu (auto-start the test level) or still requires the menu boot. Proposal leans: auto-start in `?test=1` mode, main menu only in production.

### Resolved by user 2026-09-07 (no longer open)

- ~~**`dron_fumigador = tank` (HP=3).**~~ User locked tank; spec should not override without an explicit user note.
- ~~**`STAGE FAILED` overlay vs full game-over menu in F3.**~~ User moved full menu/overlays into F3; the question is moot.

---

## 12. Next phase

`sdd-spec` writes delta specs under `openspec/changes/fase-3-shooter-rail-gameplay/specs/`:

- `combat-core/spec.md` — NEW (fire → projectile → hit → destroy loop, reverse-depth selection, ally/miss no-op contract, hand sprite as papeleta origin)
- `enemy-archetypes/spec.md` — NEW (HP table, footprint config, per-archetype visual flash; `dron_fumigador = tank` locked)
- `player-integrity/spec.md` — NEW (3-segment state, escape penalty, full game-over overlay with final score + "Firmas recogidas" + return-to-menu + retry)
- `game-test-api/spec.md` — NEW (`__gameTestAPI__` surface, seeded PRNG contract, 60 Hz fixed clock; auto-skip main menu in `?test=1`)
- `main-menu/spec.md` — NEW (entry screen, three buttons, default selection, keyboard nav, mobile tap-friendly)
- `game-over-flow/spec.md` — NEW (camera halt, final score, "Firmas recogidas: N", return-to-menu + retry wiring)
- `victory-flow/spec.md` — NEW (trigger: 12 enemies destroyed + camera at rail end; same UI shape as game-over, positive copy)
- `best-score/spec.md` — NEW (`localStorage` key `zarra2d:best:test_level`, read/write contract, silent fallback)
- `hand-pen-sprite/spec.md` — NEW (pointer-tracking sprite, offset, minimax generation contract per ASSET-001/006, papeleta spawn origin)
- `iso-tile-system/spec.md` — MODIFIED TILE-001/002/004 (drift cleanup)
- `iso-camera-integration/spec.md` — MODIFIED CAM-002 (camera-aware inverse scenario)
- `iso-asset-pipeline/spec.md` — MODIFIED ASSET-004 (catalog: add `camion_cisterna_residuos`, add `hand_pen`, deprecate `plataforma_solar`; `dron_fumigador = tank`)

Then `sdd-design` → `sdd-tasks` (with explicit budget-risk forecast against the §13 size exception) → `sdd-apply` (orchestrator records `size:exception` token before acquire) → `sdd-verify` → `sdd-archive`.

---

## 13. Size exception

F3 is delivered as a single PR despite an estimated ~1000 LOC because:
- The hand sprite is one-shot asset generation shipped in this PR.
- Combat primitives, integrity, game-over, victory, and the main menu are tightly coupled
  through the Pixi app instance, the integrity event bus, and the localStorage schema.
- Splitting into two stacked PRs would add 2x CI time and 2x risk of partial integration
  while the pieces cannot be tested independently.

User ratified this exception 2026-09-07. The orchestrator records the size:exception token
alongside the sdd-attempt acquire call before launching sdd-apply.
