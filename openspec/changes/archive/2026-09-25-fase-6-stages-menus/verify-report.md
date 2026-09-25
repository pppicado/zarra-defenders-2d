# Verify Report — Fase 6 Per-stage rosters + menú visuals

## Test Counts (final state at archive time)

**Unit tests**:
- `tests/unit/levels-stage-rosters.spec.mjs`: 18/18 PASS

**Acceptance gate**:
- `scripts/verify.sh`: 8/8 PASS

## Headless verifications

1. ✅ Each menu asset HTTP 200 (curl): menu-panorama-cofrentes 391KB,
   menu-mapa-cartografico 570KB, menu-vertedero-satirico 564KB,
   menu-rio-cabriel 523KB
2. ✅ PIXI.VERSION === '7.4.0' loaded from local vendor/pixi.min.js
3. ✅ 0 console errors in headless gameplay + audio flow

## Coverage of Acceptance Criteria (ROADMAP §6.1-6.3)

### §6.1 Per-stage enemy rosters
- ✅ Each of 5 stages has unique roster (test: "STAGE_ROSTERS: contains exactly 5 stages" PASS)
- ✅ Each stage has unique finalBossSpriteId (test: "rosters have distinct finalBossSpriteId" PASS)
- ✅ Each roster has 20+ enemies with at least 1 boss
- ✅ assertAllRostersStatic() validates REQ-CMB-009 (test: "assertAllRostersStatic() does not throw for current rosters" PASS)
- ✅ Wire in bootTestLevel: getRosterForStage(bg.stageId) when available

### §6.2 Backgrounds de menú
- ✅ 4 PNGs generated (panorama, mapa, vertedero, río)
- ✅ Each menu has its dedicated background
- ✅ Estilo coherente (NEAREST downsample to 640x360)

### §6.3 Pixi.js bundle offline fallback
- ✅ vendor/pixi.min.js (446KB) committed
- ✅ index.html uses local-first with CDN fallback
- ✅ PIXI.VERSION === '7.4.0' when loaded locally
- ✅ 0 console errors

## Risks

No CRITICAL issues. One non-blocking observation:

1. **Sprite coverage**: ROADMAP mentions sprites that don't exist yet
   (motosierra, plataforma_solar, humo toxico, drones de vigilancia,
   extractores). The roster structure allows future expansion without
   changes — when those sprites are added, the roster just references them.
   For this implementation, used only the 12 canonical spriteIds.

## Sign-off

Fase 6 fully verified. Ready for archive.
