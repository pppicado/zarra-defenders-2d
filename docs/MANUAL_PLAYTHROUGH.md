# MANUAL_PLAYTHROUGH — zarra-defenders-2d

> **Propósito**: Script de aceptación manual para `zarra-defenders-2d`.
> Adaptado del proyecto 3D (`/projects/personal/zarra-defenders/MANUAL_PLAYTHROUGH.md`)
> con foco en las features implementadas en el 2D y el **pedagogical sign-off §12**.
>
> El pedagogo (usuario) debe firmar cada uno de los 6 datos pedagógicos antes
> de hacer `sdd-archive`. Sin sign-off, no se puede cerrar Fase 7 (release).

---

## §0 Setup

```bash
cd /projects/personal/zarra-defenders-2d
bash start_server.sh  # o: python3 -m http.server 8000
# Abrir http://127.0.0.1:8000/ en Chrome, Firefox, Safari, Edge (últimas 2 versiones)
```

El juego requiere servidor HTTP — `file://` no permite Pointer Lock ni Pixi.js CDN.

---

## §1 Smoke (menú → stage select → primer wave)

| Check | Observación | Pass |
|---|---|---|
| Title screen "Zarra Defenders 2D" + tagline renderiza | Visible | [ ] |
| 5 stage buttons aparecen con labels correctos | Visible | [ ] |
| Stages 2-5 muestran candado 🔒 hasta completar stage previo | Visible | [ ] |
| Botones Acerca de / Disclaimer abren modales | Visible | [ ] |
| Click en stage 1 (Las Hoyas) → dato screen (Fase 1.5) → wave 1 arranca | Visible | [ ] |
| HUD muestra: 12/12 ammo, 3 hearts, 0 firmas, 80% volume (si audio) | Visible | [ ] |
| Crosshair sigue cursor; mano pixel art apunta hacia cursor | Visible | [ ] |

---

## §2 Combat feedback

| Check | Observación | Pass |
|---|---|---|
| Click izquierdo lanza papeleta firmada (sprite papeleta_firmada.png) | Visible | [ ] |
| Papeleta tiene sine flutter ±4 px durante vuelo | Visible | [ ] |
| Cooldown 200ms bloquea 4º shot inmediato | Audible/visual | [ ] |
| Hit detection: enemy sprite AABB screen-space | Visible | [ ] |
| Enemigo standard muere en 1 hit; tank en 3; mini-boss en 10; boss en 30 | Visible | [ ] |
| Score: `points = 10 × archetype_multiplier` (standard=10, tank=15, mini-boss=20, boss=30) | Visible | [ ] |
| "Firmas recogidas" counter +1 por hit | Visible | [ ] |
| Best firmas persiste en `localStorage` (`zarra2d:best:test_level`) | Visible | [ ] |

---

## §3 Power-ups pedagógicos (F1.1)

> **Decisión de diseño**: el 2D NO implementa drops de power-ups del 3D.
> Cada disparo ES la firma. La card pedagógica post-destroy es el equivalente.

| Check | Observación | Pass |
|---|---|---|
| Al destruir enemigo aparece #pedagogy-card top-right con slide-in | Visible | [ ] |
| Card muestra título del enemigo + descripción específica + dato del stage | Visible | [ ] |
| Link "Fuente: [Las Provincias] ↗" clickeable abre nueva pestaña con URL https:// | Funciona | [ ] |
| Card auto-dismiss a los 3s | Visible | [ ] |
| Click en card dismiss inmediato | Visible | [ ] |
| Click en link NO dismiss (se abre URL) | Visible | [ ] |
| `score.cardsShown[]` acumula cada card mostrada | Visible en debug | [ ] |
| Si llega otro hit, la card se REEMPLAZA (no stack) | Visible | [ ] |
| 12 enemigos × 6 stages con datos verificados (ver §12) | Visible | [ ] |

---

## §4 Modal intermedio cada 5 enemigos (Fase 1.2)

| Check | Observación | Pass |
|---|---|---|
| Cada 5 enemigos destruidos aparece overlay con resumen acumulativo | Visible | [ ] |
| Texto: "Has destruido 5 lixiviados, contaminando ~1000 L del río Cabriel" (ejemplo) | Visible | [ ] |
| No bloquea disparo (pass-through de clicks) | Visible | [ ] |
| Auto-dismiss a los 5s | Visible | [ ] |

---

## §5 Wave system (por stage)

> **Estado actual**: TEST_LEVEL único de 120 enemigos compartido por los 5 stages.
> Per-stage rosters se implementarán en Fase 6.

| Stage | Wave count | ~30s wave | 4s rest | 3-enemy cap | Boss wave | Pass |
|---|---|---|---|---|---|---|
| 1 — Hoyas | ~25 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 2 — Hoz | ~25 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 3 — Hunde | ~25 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 4 — Ayora | ~25 | [ ] | [ ] | [ ] | [ ] | [ ] |
| 5 — Acuífero | ~25 | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## §6 Boss system + desactivación uniforme (A7 contract — Fase 1.6)

| Boss | 2s entry | Invulnerable entry | Desaturación | NO explosión | Halt motion | Pass |
|---|---|---|---|---|---|---|
| topadora (nivel 1) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| tubo_lixiviado (nivel 2) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| incineradora (nivel 3) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| trailer (nivel 4) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| planta_treco (nivel 5) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

**A7 contract**: cada boss factory setea `userData.lifecycle='desactivacion'`. `enemies.js destroyEnemy()` aplica desaturación + halt motion + dispatch `zarra:desactivacion`. NO explosion, NO fire, NO debris, NO particles.

---

## §7 Pause menu (Fase 3.1 — pendiente)

| Check | Observación | Pass |
|---|---|---|
| ESC mid-wave → pause overlay aparece dentro de 1 frame | [ ] | [ ] |
| Overlay tiene exactamente 3 botones: Continuar / Reiniciar stage / Salir al menú | [ ] | [ ] |
| Continuar → pointer lock re-acquired, game resumes mid-wave | [ ] | [ ] |
| Reiniciar stage → stage restart con session score preservado | [ ] | [ ] |
| Salir al menú → vuelve a level select | [ ] | [ ] |
| Pause labels desde STRINGS.pausa.* (no hardcoded) | [ ] | [ ] |

> **Estado actual 2D**: Esc emite `menu:back` (BG-011) → vuelve a menú. NO hay pause overlay dedicado todavía (Fase 3.1).

---

## §8 Game over flow

| Check | Observación | Pass |
|---|---|---|
| Lose las 3 vidas → game-over overlay dentro de 1s, pointer lock released | Visible | [ ] |
| Overlay tiene exactamente 2 botones: Reintentar / Volver al menú | Visible | [ ] |
| Reintentar → stage restart con session score preservado | Funciona | [ ] |
| Volver al menú → vuelve a level select, score preservado en memoria | Funciona | [ ] |
| Page reload mid-run → session score es 0 (no persistence) | Funciona | [ ] |
| Private browsing → game carga idéntico (best score puede no persistir) | Funciona | [ ] |

---

## §9 Combo + scoring

> **Decisión de diseño**: el 2D NO implementa combo multiplier del 3D.
> Score base = `10 × archetype_multiplier`. Single hit-based, sin decay.

| Check | Observación | Pass |
|---|---|---|
| Base points desde `archetype_multiplier` (standard=1, tank=1.5, mini-boss=2, boss=3) | Visible | [ ] |
| `firmas` counter +1 por hit (narrativo: "firma real contra el proyecto") | Visible | [ ] |
| Best firmas persiste en `localStorage` (`zarra2d:best:test_level`) | Verificable | [ ] |
| `score.cardsShown[]` persiste el historial pedagógico del run | Verificable | [ ] |
| Level-complete summary muestra raw score + best | Visible | [ ] |
| Reiniciar nivel preserva session score en memoria | Funciona | [ ] |

---

## §10 Final screen (Fase 1.7 — pendiente)

| Check | Observación | Pass |
|---|---|---|
| Después de desactivar `planta_treco`, final screen aparece dentro de 2s | [ ] | [ ] |
| Final dato visible: "A fecha de hoy, la solicitud está en información pública" | [ ] | [ ] |
| 4 enlaces visibles desde `STRINGS.final.enlaces`: plataforma, alegaciones, asociación, hashtag | [ ] | [ ] |
| Plataforma URL = `https://nomacrovertederozarra.com` (A6 — STRINGS, no literal) | [ ] | [ ] |
| Hashtag = `#NoAlMacrovertederoDeZarra` (texto seleccionable) | [ ] | [ ] |
| Single "Volver a jugar" button → level select | [ ] | [ ] |
| No music durante final screen (regla 3D) | [ ] | [ ] |

---

## §11 Light gun / mobile (Fase 5+ — pendiente)

| Check | Observación | Pass |
|---|---|---|
| Light gun conectado antes de jugar: se reconoce como mouse USB estándar | [ ] | [ ] |
| Pointer lock + first-click atomic gesture (A3) succeeds | [ ] | [ ] |
| Mobile portrait con side < 360 px: modal "Gira el móvil" aparece | [ ] | [ ] |
| Tap detection (distancia < umbral + duración < 300 ms) → dispara | [ ] | [ ] |
| Auto-fire móvil: OFF (confirmado 2026-09-03) | [ ] | [ ] |

---

## §12 Pedagogical Sign-Off — CRÍTICO para archive

> **Cada uno de los 6 datos pedagógicos debe ser revisado y firmado por el
> pedagogo (usuario) antes de hacer `sdd-archive` (Fase 7).**

**A5 contract**: cada `.fuente` value populated verbatim desde `research/fuentes.md`
(6 fuentes verificadas). Sin TODO markers. Sin empty strings.

### §12.1 Stage 1 — Las Hoyas de Caballero (Zarra)

| Item | Value | Reviewed? | Pedagogo sign-off |
|---|---|---|---|
| `STRINGS.pedagogy.datos['stage1-lashoyas'].texto` | "El proyecto prevé 11 millones de metros cúbicos de residuos, más del doble del vertedero de Dos Aguas." | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage1-lashoyas'].fuente` | "Las Provincias, 24/06/2026" | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage1-lashoyas'].url` | https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html | [ ] | [ ] |
| **4 cards de enemigos en stage1** (camion_treco, bolsa_plastico, valla_publicitaria, topadora) | Pedagogía conecta con impacto real, no caricature | [ ] | [ ] |

### §12.2 Stage 2 — La Hoz del río Zarra

| Item | Value | Reviewed? | Pedagogo sign-off |
|---|---|---|---|
| `STRINGS.pedagogy.datos['stage2-lahoz'].texto` | "El Acuífero de la Mancha Oriental tiene 8.500 km² — una de las mayores masas de agua subterránea de Europa. Abastece a Ayora, Zarra, Teresa de Cofrentes y Jarafuel." | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage2-lahoz'].fuente` | "Agencia del Agua de Castilla-La Mancha (s/f)" | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage2-lahoz'].url` | https://agenciadelagua.castillalamancha.es/el-agua-en-castilla-la-mancha/situacion-del-agua-en-clm/acuiferos | [ ] | [ ] |
| **4 cards de enemigos en stage2** (bidon_lixiviado, tubo_lixiviado, camion_cisterna_residuos) | Pedagogía conecta con impacto real | [ ] | [ ] |

### §12.3 Stage 3 — Sierra de La Hunde y Palomera (Ayora)

| Item | Value | Reviewed? | Pedagogo sign-off |
|---|---|---|---|
| `STRINGS.pedagogy.datos['stage3-lahunde'].texto` | "La comarca ya convive con la central nuclear de Cofrentes, parques eólicos y plantas fotovoltaicas. La llaman zona de sacrificio." | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage3-lahunde'].fuente` | "actualidadvalencia.com, 05/08/2026" | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage3-lahunde'].url` | https://actualidadvalencia.com/macrovertedero-zarra-pp-exige-retirada-proyecto/ | [ ] | [ ] |
| **2 cards de enemigos en stage3** (dron_fumigador, incineradora) | Pedagogía conecta con impacto real | [ ] | [ ] |

### §12.4 Stage 4 — Casco urbano de Ayora

| Item | Value | Reviewed? | Pedagogo sign-off |
|---|---|---|---|
| `STRINGS.pedagogy.datos['stage4-ayora'].texto` | "La ruta de camiones pasa junto al colegio y el polideportivo de Ayora, y atraviesa el Plan de Emergencia Nuclear de la central de Cofrentes." | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage4-ayora'].fuente` | "Las Provincias, 24/06/2026" | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage4-ayora'].url` | https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html | [ ] | [ ] |
| **2 cards de enemigos en stage4** (trailer, sello_burocratico) | Pedagogía conecta con impacto real | [ ] | [ ] |

### §12.5 Stage 5 — El Acuífero (jefe final)

| Item | Value | Reviewed? | Pedagogo sign-off |
|---|---|---|---|
| `STRINGS.pedagogy.datos['stage5-acuifero'].texto` | "En 2002 los vecinos del Valle ya rechazaron un vertedero igual en la misma zona. 10.700 firmas, manifestación con ataúd frente a la Diputación. Se puede volver a parar." | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage5-acuifero'].fuente` | "Las Provincias, 16/06/2026" | [ ] | [ ] |
| `STRINGS.pedagogy.datos['stage5-acuifero'].url` | https://www.lasprovincias.es/comarcas/valle-ayoracofrentes-moviliza-macrovertedero-proyectado-zarra-20260616173049-nt.html | [ ] | [ ] |
| **1 card de enemigo en stage5** (planta_treco — BOSS, se desactiva, abre final screen) | Pedagogía conecta con impacto real | [ ] | [ ] |

### §12.6 Final screen (post-boss desactivación)

| Item | Value | Reviewed? | Pedagogo sign-off |
|---|---|---|---|
| `STRINGS.pedagogy.datos['final'].texto` | "A fecha de hoy, la solicitud está en información pública. Puedes presentar alegaciones." | [ ] | [ ] |
| `STRINGS.pedagogy.datos['final'].fuente` | "Valencia Plaza, 31/07/2026" | [ ] | [ ] |
| `STRINGS.pedagogy.datos['final'].url` | https://valenciaplaza.com/valenciaplaza/comarca-y-empresa/crece-el-rechazo-contra-el-macrovertedero-de-zarra-tras-la-ultima-concentracion-de-casi-mil-personas | [ ] | [ ] |
| 4 enlaces (plataforma, alegaciones, asociación, hashtag) | URLs verificadas, no caricature | [ ] | [ ] |
| **Desactivación framing** | El boss NO muere en explosión, se desactiva con desaturación + halt | [ ] | [ ] |

### §12.7 Tono general (criterio global)

| Criterio | Pass |
|---|---|
| Tono heroico-esperanzado, no catastrofista | [ ] |
| Adversario = máquina industrial impersonal, NO personas | [ ] |
| Sin caricatura de TRECO como villano humano; uso nominativo crítico documentado | [ ] |
| Patrimonio cultural (castillo, casas, encinas) NO aparece como daño | [ ] |
| "El juego es altavoz, no sustituto" — la victoria está en la calle | [ ] |

---

## §13 Asset budget

```bash
du -sh /projects/personal/zarra-defenders-2d/
```

| Resource | Budget | Actual | Pass |
|---|---|---|---|
| Runtime JS bundle (Pixi + código) | ≤ 1.5 MB | ? | [ ] |
| 5 backgrounds stage (sin iteraciones) | ≤ 1.5 MB | 1.35 MB | [ ] |
| 26 sprites activos | ≤ 6 MB | 5.7 MB | [ ] |
| **Total runtime** | ≤ 10 MB | ? | [ ] |

---

## §14 Structural readback (`scripts/verify.sh`)

> **Fase 2**: crear `scripts/verify.sh` con 8 checks adaptados al 2D.

```bash
bash /projects/personal/zarra-defenders-2d/scripts/verify.sh
```

Expected: 8 PASS / 0 FAIL.

| Check | Pass |
|---|---|
| 1. STRINGS usage (positive) | [ ] |
| 2. Spanish prose isolation (zero outside `src/i18n/es.js`) | [ ] |
| 3. Sprite catalog count == 17 (active) | [ ] |
| 4. Backgrounds 5/5 presentes | [ ] |
| 5. A5 — 6 `.fuente` populated + 0 TODO markers | [ ] |
| 6. A6 — zero `https://` literals outside `src/i18n/es.js` | [ ] |
| 7. A7 — `planta_treco` carries `lifecycle='desactivacion'` (Fase 1.6) | [ ] |
| 8. A8 — zero `console.*` outside `src/engine/dom-debug.js` | [ ] |

---

## §15 Console discipline (A8)

| Check | Pass |
|---|---|
| `grep -rn "console\." src/ | grep -v "engine/dom-debug.js"` returns 0 matches | [ ] |
| Production runtime: zero console output | [ ] |
| Dev mode (`?debug=1`): logs visibles vía `__zr` | [ ] |

---

## §16 i18n isolation (A2)

| Check | Pass |
|---|---|
| `grep -rE "[áéíóúñ¿¡]" src/ | grep -v "i18n/es.js"` → 0 user-facing strings | [ ] |
| All Spanish text references `STRINGS.*` from `src/i18n/es.js` | [ ] |

---

## §17 URLs isolation (A6)

| Check | Pass |
|---|---|
| `grep -rn "https://" src/ | grep -v "i18n/es.js"` → 0 (except CDN Pixi in index.html) | [ ] |
| All 6 pedagogical URLs come from `STRINGS.pedagogy.datos.*.url` | [ ] |
| All 4 final screen URLs come from `STRINGS.pedagogy.final.enlaces.*_url` | [ ] |

---

## §18 Local URLs for testing (verificadas por el dev)

> **Regla del usuario**: cualquier URL que el dev comparte acá debe haber sido
> probada con `curl` (HTTP status) **y** con Playwright headless (cero errores
> de consola + `window.__gameTestAPI__` montado) antes de ser entregada.
> Formato al usuario: una URL por línea, línea en blanco entre grupos.

### Cómo levantar el server local

```bash
cd /projects/personal/zarra-defenders-2d
bash start_server.sh         # python3 -m http.server 8000 en background
# Server corre en 0.0.0.0:8000 — accesible vía Tailscale en 100.116.137.66:8000
```

Verificación rápida:

```bash
curl -sI http://127.0.0.1:8000/ | head -1   # HTTP/1.0 200 OK
```

### URLs probadas (todas verificadas el 2026-09-17)

**Local (127.0.0.1) — todas devuelven HTTP 200 y arrancan sin errores**:

```
http://127.0.0.1:8000/
```

```
http://127.0.0.1:8000/?test=1&seed=42
```

```
http://127.0.0.1:8000/?test=1&seed=42&hitboxes=1
```

```
http://127.0.0.1:8000/?test=1&seed=42&debug=1
```

```
http://127.0.0.1:8000/?unlock=all
```

```
http://127.0.0.1:8000/?unlock=reset
```

```
http://127.0.0.1:8000/?test=1&seed=42&hitboxes=1&unlock=all
```

**Tailscale (100.116.137.66) — verificado que la interfaz tailscale0 tiene esa
IP y que responde HTTP 200 desde el server**:

```
http://100.116.137.66:8000/
```

```
http://100.116.137.66:8000/?test=1&seed=42&hitboxes=1&unlock=all
```

### Query params soportados

| Param | Efecto |
|---|---|
| `?test=1` | Salta el menú, auto-spawna 120 enemigos deterministas |
| `?seed=N` | Semilla mulberry32 para PRNG (default `0xC0FFEE`) |
| `?hitboxes=1` | Overlay debug con AABB de cada enemigo (cyan/yellow/magenta por arquetipo) |
| `?debug=1` | Activa `__zr.warn`/`__zr.error` → logs en consola |
| `?unlock=all` | Pre-popula `localStorage` con stage1..5 cleared |
| `?unlock=reset` | Limpia stage clears del localStorage |
| `?ref=<b64>` | (Fase 5 sharing) Link compartible con score base64 |

### Validación con Playwright

```javascript
// tests/url-smoke.mjs (one-off, no comiteado)
// Verifica que cada URL:
// 1. Carga sin pageerrors
// 2. Monta window.__gameTestAPI__ en <15s
// 3. Cero mensajes de error en consola
import { chromium } from 'playwright'
const URLS = [
  'http://127.0.0.1:8000/',
  'http://127.0.0.1:8000/?test=1&seed=42',
  'http://127.0.0.1:8000/?test=1&seed=42&hitboxes=1',
]
const browser = await chromium.launch({ headless: true })
for (const url of URLS) {
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await page.goto(url, { waitUntil: 'load', timeout: 10_000 })
  const apiOk = await page.evaluate(() => !!window.__gameTestAPI__)
  console.log(`API=${apiOk ? 'Y' : 'N'} errors=${errs.length}  ${url}`)
  await page.close()
}
await browser.close()
```

Última verificación: 2026-09-17 con Playwright headless.

---

## Summary

Cuando **todas las secciones** están marcadas (especialmente §12 Pedagogical Sign-Off
con 6+ datos firmados, §14 verify.sh con 8 PASS, §15/§16/§17 con contratos A2/A6/A8
cumplidos), el proyecto está listo para `sdd-archive` (Fase 7).

**Bloqueante pedagógico**: §12 sin firmar = NO se puede hacer release v1.0.0.

---

**Mantenedor**: usuario (pedagogo + dev)
**Próxima revisión**: tras Fase 1 completa (1.2–1.7)