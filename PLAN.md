# PLAN: Zarra Defenders 2D

> **Documento de planificación previo al código.** Por favor revisar y modificar lo que sea necesario antes de empezar a implementar. Las decisiones marcadas con `[?]` son preguntas abiertas.

---

## 1. Resumen del juego

**Género:** On-rails shooter pedagógico (estilo *House of the Dead*, *Time Crisis*, *Virtua Cop*).

**Ambientación:** El jugador viaja por el Valle de Ayora-Cofrentes (Valencia) defendiendo el territorio del impacto del macrovertedero de residuos de Zarra (proyecto TRECO). Es el mismo universo conceptual del proyecto hermano 3D (`pppicado/zarra-defenders`), pero con sprites 2D isométricos en lugar de modelos 3D.

**Objetivo pedagógico:** Cada enemigo destruido revela una **card** con datos reales sobre el impacto ambiental/social de esa amenaza (vertedero, lixiviados, incineración, drones de fumigación, etc.) con fuentes citadas. Disparar accidentalmente a elementos del valle (árboles, casas, castillo) penaliza.

**Sensación:** Arcade accesible, vista isométrica cuidada, pixel art vistoso, partidas cortas (5–10 min).

---

## 2. Mecánicas

### 2.1. Rail shooter

- La cámara sigue un **path fijo predefinido** por cada stage.
- El jugador NO controla el movimiento — solo la **mira** y el **disparo**.
- El avance de la cámara puede ser **automático** (constante) o **por trigger** (avanza al disparar a X cantidad de enemigos).
- Triggers y timing definidos en cada stage.

### 2.2. Apuntado y disparo

- **Mira / crosshair** que sigue al puntero (mouse en PC, dedo en móvil).
- **Disparo:** click (mouse) o tap (touch).
- **Cadencia:** ~3 disparos/seg (cooldown configurable).
- **Puntuación:**
  - Impactar enemigo → puntos + revela card pedagógica
  - Fallar → -puntos pequeños
  - Disparar a aliado (árbol, casa, castillo) → -vida + card explicando por qué ese elemento protege el valle
  - Enemigo llega al fondo del frame sin ser destruido → -vida

### 2.3. Sistema de vidas

- 3 vidas por stage.
- Perder todas = game over → menú → reiniciar stage.
- `[?]` ¿Puntos extra / continues después del primer game over?

### 2.4. Stages / niveles

Propuesta de 5 stages, cada uno en una zona del Valle:

| # | Stage | Ambientación | Enemigos principales | Sprite del bg |
|---|---|---|---|---|
| 1 | **Bosque mediterráneo** | Pinos, encinas, almendros | topadora cortando árboles, dron fumigador | bosque.png (generar) |
| 2 | **Pueblo de Cofrentes** | Casas blancas, castillo al fondo | camión TRECO, valla publicitaria | pueblo.png (generar) |
| 3 | **Río Cabriel** | Ribera, agua, rocas | tubos de lixiviado vertiendo, plataforma solar (irónica) | rio.png (generar) |
| 4 | **Vertedero TRECO** | Macrovertedero, montañas de basura | planta TRECO (boss), bidón lixiviado, incineradora, bolsa plástica | vertedero.png (generar) |
| 5 | **Castillo de Cofrentes** | El peñón con el castillo y el pueblo | sello burocrático (mini-boss), trailer de obra | castillo.png (generar — ya lo tenemos) |

**Total:** 12 enemigos distintos + 1 boss = 13 tipos. Coincide con el catálogo del proyecto 3D.

### 2.5. Pedagogía in-game

Cada enemigo / acierto dispara una **card flotante** con:

```
╔════════════════════════════════════════════╗
║  BIDÓN DE LIXIVIADO                       ║
║  ─────────────────────────────────────── ║
║  Cada bidón contiene ~200 L de líquido    ║
║  contaminante (metales pesados,           ║
║  hidrocarburos, amonio) que se filtra     ║
║  al subsuelo y al río Cabriel.            ║
║                                            ║
║  Fuente: Cofrentes, Memoria del             ║
║  castillo (2008), p.95                     ║
╚════════════════════════════════════════════╝
```

- Las cards se acumulan en una "biblioteca" accesible desde el menú.
- `[?]` ¿Cartas solo en éxito o también al final del stage (resumen)?
- `[?]` ¿Traducción multi-idioma? (mínimo: español, ideal: valencià + english)

---

## 3. Controles

### 3.1. PC / Desktop

| Acción | Input |
|---|---|
| Apuntar | Mouse move |
| Disparar | Click izquierdo |
| Pausa | `Esc` o `P` |
| Menú (en game over) | Click en botón |

**Light gun (pistolas de luz HID):** las pistolas de luz modernas se reconocen como mouse USB estándar. El juego **no requiere código especial** — funciona automáticamente. Sí hay que configurar el navegador para que el cursor esté oculto en fullscreen (CSS: `cursor: none` durante gameplay).

### 3.2. Móvil / Tablet

| Acción | Input |
|---|---|
| Apuntar | Drag del dedo (la mira sigue al dedo) |
| Disparar | Tap rápido (release sin drag > 5px) |
| Pausa | Tap en icono de pausa |
| Menú | Tap en botones |

- **Auto-fire opcional en móvil** `[?]`: ¿el jugador solo apunta y el disparo es automático? Más accesible pero menos "shotter".
- **Detección tap vs drag:** comparar posición inicial y final del touch; si distancia < umbral y duración < 300ms → tap (dispara); si no → drag (solo apunta).

### 3.3. Accesibilidad

- `[?]` ¿Modo alto contraste para daltonismo?
- `[?]` ¿Subtítulos / text-to-speech para las cards pedagógicas?
- `[?]` ¿Reducción de movimiento (prefers-reduced-motion)?

---

## 4. Estilo visual

### 4.1. Sprites in-game

- **Perspectiva isométrica 3/4** (ya tenemos los 21 sprites en `assets/sprites/`).
- **Fondo del stage:** generado a partir de **fotos reales** del Valle de Ayora, procesadas al mismo estilo 16-bit pixel art con chroma-key magenta (pipeline que ya tenemos en `tools/postprocess_v4.py`).
- **Render:** `image-rendering: pixelated` para conservar el look pixel art sin blur al escalar.

### 4.2. Menús

- **Estética:** misma que el juego, con fondos pixel art del Valle.
- **Pantallas:**
  1. **Menú principal** — Título grande "ZARRA DEFENDERS" + botones (Jugar, Biblioteca pedagógica, Créditos)
  2. **Selección de stage** — Vista cenital del Valle con los 5 puntos marcados
  3. **Pausa** — Overlay semitransparente con el bg del stage detrás
  4. **Game over** — Score final + "Reintentar" / "Menú"
  5. **Victoria de stage** — Score + cards pedagógicas recogidas + "Siguiente stage"
  6. **Biblioteca pedagógica** — Cards acumuladas, navegables
  7. **Créditos** — Fuentes citadas, agradecimientos

### 4.3. Fondos de menú a generar

| Pantalla | Foto real de referencia | Estado |
|---|---|---|
| Menú principal | Vista panorámica del Valle de Ayora desde el Castillo | `[ ] por generar` |
| Selección de stage | Mapa cartográfico del Valle | `[ ] por generar` |
| Game over | El vertedero TRECO (impacto visual) | `[ ] por generar` |
| Biblioteca | El río Cabriel (sensación de patrimonio) | `[ ] por generar` |

Pipeline de generación:
1. Buscar foto real (mismo método que el Castillo de Cofrentes: Wikipedia, geograph, etc.)
2. Prompt minimax: `"16-bit pixel art of <scene>, same retro style as sprites, isolated on magenta #FF00FF background"`
3. Procesar con `tools/postprocess_v4.py` para alpha
4. Integrar como background

---

## 5. Arquitectura técnica

### 5.1. Stack

- **HTML5 + JavaScript vanilla (sin TypeScript, sin framework)** — coherente con el proyecto 3D hermano.
- **Pixi.js** (vía CDN) — manejo de sprites, parallax, tweens, efectos de partículas. Mucho mejor que Canvas2D puro para 21+ sprites con transformaciones.
  - `[?]` Alternativa: Canvas2D nativo sin deps. Más ligero pero más código para tweens/parallax.
- **Sin build step.** Todo se sirve tal cual desde `index.html`. ES modules con `<script type="module">`.
- **Sin package.json ni node_modules.** Repo 100% estático + assets.

### 5.2. Estructura de archivos

```
index.html                  ← entry point, canvas + UI overlay
styles/main.css             ← pixel-perfect, fullscreen, responsive
src/main.js                 ← bootstrap, game loop (requestAnimationFrame)
src/game.js                 ← state machine (menu/playing/paused/gameover/victory)
src/rail-camera.js          ← path-based camera, scroll horizontal
src/player.js               ← crosshair + disparo (mouse/touch)
src/enemies.js              ← tipos + spawn + hit detection
src/backgrounds.js          ← parallax de fondos pixel art
src/input.js                ← mouse + touch unificados (pointer events)
src/pedagogy.js             ← cards con datos reales + fuentes
src/ui.js                   ← HUD, menús, botones
src/sfx.js                  ← Web Audio API para efectos (opcional)
assets/sprites/             ← 21 sprites ya generados
assets/backgrounds/         ← por generar (fotos reales → pixel art)
assets/ui/                  ← crosshair, health icon, score icon
assets/particles/           ← sprites de explosión
assets/audio/               ← efectos (opcional)
tools/postprocess_v4.py     ← pipeline alpha channel
tools/make_gallery.py       ← preview HTML de assets
docs/pedagogy-data.json     ← datos pedagógicos + fuentes
```

### 5.3. Loop principal

```js
// Pseudocódigo simplificado
const game = new GameState();
const camera = new RailCamera(currentStage.path);
const player = new Player(input);
const enemies = new EnemyManager(currentStage);

function frame(dt) {
  camera.advance(dt);           // mueve cámara por el path
  player.update(dt, input);     // actualiza posición crosshair
  enemies.update(dt, camera);   // spawn / mueve / hit detection
  checkCollisions();            // bala-enemigo, enemigo-player
  render(scene);
}

requestAnimationFrame(frame);
```

### 5.4. Estados del juego

```
[Menu]  ──Click "Jugar"──▶  [Stage Select]
                                 │
                                 ▼
                            [Playing] ◀─────┐
                          │       │        │
                          │       │        │ Pausa
                          │       │        │
                          │       ▼        │
                          │   [Paused] ────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        [Game Over]  [Victory]  [Stage Complete]
              │           │           │
              └─────┬─────┴───────────┘
                    ▼
                 [Menu]
```

### 5.5. Responsive

- **PC:** fullscreen fijo, canvas a 1280x720 o 1920x1080, escalado con letterbox.
- **Móvil:** canvas a pantalla completa, portrait o landscape según stage.
- `[?]` ¿Forzar landscape en móvil? (Mejor para rail shooter, pero pierde usuarios en portrait.)

---

## 6. Inventario de assets

### ✅ Ya tenemos (21 sprites)

- **Trees (3):** encina, pino, almendro
- **Enemies (12):** camion_treco, bidon_lixiviado, bolsa_plastico, valla_publicitaria, plataforma_solar, tubo_lixiviado, dron_fumigador, sello_burocratico, topadora, incineradora, trailer, planta_treco (boss)
- **Props (3):** valla, roca, cartel
- **Buildings (3):** casa_ayora, castillo_cofrentes (con pueblo), torre_central

### `[ ]` Por generar

| Asset | Cantidad | Notas |
|---|---|---|
| Backgrounds de menú | 4 | pixel art desde fotos reales (pipeline en `tools/postprocess_v4.py`) |
| Background de stage (parallax) | 5 | uno por stage, panorámico ancho |
| Crosshair | 1 | simple mira pixel art |
| Iconos UI | 4-5 | health, score, ammo, pausa |
| Sprites de explosión | 2-3 | partículas para hits |
| Bala / disparo | 1 | opcional, rayo visible |
| Jugador (mano/pistola) | 1 | `[?]` ¿primera persona (mano) o tercera (cuerpo)? |
| Datos pedagógicos + fuentes | 13 entradas | `docs/pedagogy-data.json` |
| Audio SFX (opcional) | 5-10 | disparo, hit, explosión, victoria |

### `[?]` Decisiones pendientes

1. **Vista del jugador:** ¿primera persona (solo manos/pistola) o tercera (cuerpo visible)?
2. **Auto-fire en móvil:** ¿on por defecto u opcional?
3. **Cartas pedagógicas:** ¿en éxito o resumen al final?
4. **Traducción:** ¿solo español o también valencià/english?
5. **Modo portrait móvil:** ¿forzar landscape?
6. **Light gun detection:** ¿detectar automáticamente (¿Gamepad API?) o asumir mouse?
7. **Continues / extra lives:** ¿hay o no?
8. **High score / leaderboard:** ¿local (localStorage) o global?
9. **Tamaño de canvas:** ¿fijo (1280x720) o responsive?

---

## 7. Fases de implementación

### Fase 1 — Bootstrap + cámara (1 sesión)

- `index.html` con canvas + estilos
- `src/main.js` con game loop
- `src/rail-camera.js` con un path de prueba (placeholder)
- Cargar y mostrar 1 sprite estático
- **Verificación:** ventana del navegador muestra un sprite que se mueve de derecha a izquierda con scroll.

### Fase 2 — Input + crosshair (0.5 sesión)

- `src/input.js` unificando mouse + touch
- `src/player.js` con crosshair que sigue al puntero
- Diferenciación tap/drag en móvil
- **Verificación:** crosshair se mueve con mouse y con dedo.

### Fase 3 — Disparo + colisiones (0.5 sesión)

- Click/tap dispara
- Hit detection con sprites de enemigos
- Feedback visual (flash, partículas)
- **Verificación:** puedo disparar a un sprite enemigo y "matarlo".

### Fase 4 — Primer stage jugable (1 sesión)

- Enemigos que aparecen en puntos del path
- 1 stage completo (Bosque) con 3 tipos de enemigo
- HUD: score, vidas, ammo
- **Verificación:** puedo jugar el Bosque de principio a fin.

### Fase 5 — Pedagogy cards (0.5 sesión)

- `src/pedagogy.js` + `docs/pedagogy-data.json`
- Card flotante al destruir enemigo
- **Verificación:** destruir enemigo muestra card con fuente citada.

### Fase 6 — Stages restantes + fondos (1 sesión)

- Stages 2-5 con sus fondos
- Parallax multi-layer
- **Verificación:** los 5 stages son jugables.

### Fase 7 — Menús pulidos (1 sesión)

- 7 pantallas de menú (menú principal, stage select, pausa, game over, victoria, biblioteca, créditos)
- Fondos pixel art de menú (4 a generar)
- Transiciones suaves
- **Verificación:** puedo navegar todos los menús.

### Fase 8 — Polish + mobile QA (1 sesión)

- Partículas de explosión
- Audio SFX (opcional)
- Touch QA en varios móviles
- Performance profiling
- **Verificación:** el juego se ve y se siente profesional.

**Total estimado:** 6–7 sesiones de trabajo (≈1 semana).

---

## 8. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pixi.js no carga desde CDN | Medio | Fallback a Canvas2D nativo |
| Performance con muchos sprites | Medio | Object pooling, sprite batching |
| Backgrounds de menú muy costosos (API calls) | Bajo | Cachear versiones ya generadas |
| Pedagogy data incorrecta / sin fuente | Alto | Revisión manual antes de publicar |
| Crosshair fuera de pantalla en móvil | Bajo | Clamp al viewport |
| Pistola de luz no detectada | Bajo | El juego funciona con mouse normal |

---

## 9. Próximos pasos concretos

Una vez aprobado este plan:

1. Crear issue / task list por fase
2. Empezar por **Fase 1: Bootstrap + cámara**
3. Iterar fase por fase con commit por fase
4. Tag de release v1.0 al completar Fase 8

---

## 10. Referencias

- Proyecto 3D hermano: [`pppicado/zarra-defenders`](https://github.com/pppicado/zarra-defenders)
- Sprite atlas del 3D: 12 enemigos + flora + props (origen del catálogo de sprites 2D)
- Pedagogy data: usar las `.fuente` strings del proyecto 3D (ya investigadas en SDD previo)
- Pipeline alpha: `tools/postprocess_v4.py` (flood-fill + atenuación HSV purple)
- Foto del Castillo de Cofrentes ya descargada (referencia visual)

---

**Por favor revisar y:**
- Marcar las decisiones pendientes `[?]` con tu preferencia
- Cambiar el orden / alcance de las fases si querés
- Sugerir stages adicionales o quitar alguno
- Plantear cualquier duda mecánica o visual que falte
