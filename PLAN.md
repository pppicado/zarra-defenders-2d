# PLAN: Zarra Defenders 2D

> **Documento de planificación previo al código.** Por favor revisar y modificar lo que sea necesario antes de empezar a implementar. Las decisiones marcadas con `[?]` son preguntas abiertas.

---

## 1. Resumen del juego

**Género:** On-rails shooter pedagógico (estilo *House of the Dead*, *Time Crisis*, *Virtua Cop*).

**Ambientación:** El jugador viaja por el Valle de Ayora-Cofrentes (Valencia) defendiendo el territorio del impacto del macrovertedero de residuos de Zarra (proyecto TRECO).

**Objetivo pedagógico:** Cada enemigo destruido revela una **card** con datos reales sobre el impacto ambiental/social de esa amenaza (vertedero, lixiviados, incineración, drones de fumigación, etc.) con fuentes citadas. Disparar accidentalmente a elementos del valle (árboles, casas, castillo) penaliza.

**Concepto clave — disparos como firmas:** Los **proyectiles NO son balas ni láseres**. Son **documentos con firmas**: papeletas de recogida de firmas, escritos de alegaciones, instancias administrativas — todo el aparato cívico-burocrático que el Valle de Ayora-Cofrentes ha usado históricamente para luchar contra TRECO. Cada disparo = una firma de un vecino que se suma a la lucha colectiva. HUD muestra **"Firmas recogidas: N"** en vez de "Balas: N". El jugador no "mata" al enemigo — **lo firma**, lo que es a la vez más coherente con el tono cívico y más potente simbólicamente.

**Sensación:** Arcade accesible, vista isométrica cuidada, pixel art vistoso, partidas cortas (5–10 min).

**Vista del jugador — primera persona:** El jugador ve **su propia mano sosteniendo un bolígrafo** (mano pixel art en primer plano, abajo o abajo-centro de la pantalla). Al disparar, **el bolígrafo firma sobre un papel** que sale volando de la mano como proyectil (= un documento firmado). Esta vista refuerza la metáfora cívica: estás literalmente firmando tu apoyo a la lucha vecinal, no "disparando balas". El crosshair aparece cuando el bolígrafo no está activo (menús, pausa).

---

## 2. Mecánicas

### 2.1. Rail shooter

- La cámara sigue un **path fijo predefinido** por cada stage.
- El jugador NO controla el movimiento — solo la **mira** y el **disparo**.
- El avance de la cámara puede ser **automático** (constante) o **por trigger** (avanza al disparar a X cantidad de enemigos).
- Triggers y timing definidos en cada stage.

### 2.2. Apuntado y disparo

- **Vista: primera persona con mano + bolígrafo** (confirmada por el usuario, 2026-09-03). El jugador ve su propia mano pixel art sosteniendo un bolígrafo, normalmente en la parte inferior-central de la pantalla. La mano sigue la posición del puntero (rotación ligera del boli hacia donde apunta).
- **Mira / crosshair:** cruz pixel art que sigue al puntero. Visible en zonas donde no hay mano activa (menús, transiciones), oculto durante gameplay (la mano es el indicador principal).
- **Disparo:** click (mouse) o tap (touch) → animación rápida de firma (el boli traza una línea zigzag en un papel) + lanzamiento del **documento firmado** como proyectil que vuela hacia donde apunta la mira.
- **Cadencia:** ~3 disparos/seg (cooldown configurable).
- **Visual del proyectil:** pequeña hoja de papel (pixel art) con un garabato de "firma" encima. Vuela recto con leve ondulación (paper flutter). Posibles variantes:
  - **Papeleta estándar** — folio blanco/crema con firma simple y un par de líneas simuladas
  - **Instancia con sello** — papel + sello rojo/lila esquinado (sello burocrático = "sello burocrático" enemigo, irónico pero visual)
  - `[?]` ¿Añadir una **super-firma** con sellos múltiples que hace daño en área (área de efecto) tras cargar?
- **Puntuación:**
  - Impactar enemigo → puntos + revela card pedagógica + incrementa contador "Firmas recogidas"
  - Fallar → -puntos pequeños (la firma se pierde sin ser entregada)
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

**Total:** 12 enemigos distintos + 1 boss = 13 tipos.

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
- El contador de **"Firmas recogidas"** del HUD se incrementa con cada hit, y se persiste en `localStorage` como "firma" del jugador al proyecto (juego de palabras intencionado).
- **Cartas pedagógicas: mostradas en DOS momentos** (confirmado por el usuario, 2026-09-03, opciones B + D combinadas):
  - **Modal intermedio cada X enemigos** (default: cada 5): sin interrumpir el flow, aparece un overlay breve (3-5 segundos) con resumen parcial: "Has destruido 5 lixiviados, contaminando un equivalente a 1000 L del río Cabriel". Se cierra automáticamente o con tap.
  - **Resumen completo al final del stage:** todas las cards acumuladas se muestran en secuencia navegable (estilo debrief), con opción de leer cada detalle + fuentes. Accesible después desde la Biblioteca pedagógica.
- **Idioma: solo español** (confirmado por el usuario, 2026-09-03). Strings centralizados en `src/i18n/es.js` como objeto JS plano para facilitar refactor a i18n completo más adelante si se necesita.

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

- **Auto-fire en móvil: OFF (confirmado por el usuario, 2026-09-03).** Disparo manual con tap explícito cada vez, mismo patrón que el click del PC. Más "shotter" tradicional, requiere precisión.
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

- **HTML5 + JavaScript vanilla (sin TypeScript, sin framework)** — cero dependencias de build.
- **Pixi.js** (vía CDN) — manejo de sprites, parallax, tweens, efectos de partículas. Mucho mejor que Canvas2D puro para 21+ sprites con transformaciones.
  - Confirmado por el usuario (2026-09-03): Pixi.js vía CDN. Alternativa Canvas2D descartada.
  - Carga: `<script src="https://cdn.pixijs.com/...">` (versión estable más reciente). Versión también bundleable si queremos offline total.
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
- **Móvil:** **forzar landscape con aviso en portrait** (confirmado por el usuario, 2026-09-03, opción A + C combinadas).
  - El juego SOLO funciona en horizontal en móvil.
  - Si el dispositivo está en portrait al arrancar o se rota a portrait durante el juego, se muestra un **modal fullscreen** con icono SVG de "girar dispositivo" + texto "Por favor, gira el móvil para jugar" + breve instrucción.
  - El modal desaparece automáticamente cuando `window.matchMedia('(orientation: landscape)').matches` devuelve `true`.
  - Implementación: `src/orientation-lock.js` escucha el evento `orientationchange` y `resize`, gestiona la visibilidad del modal.
  - En PC no aplica (el navegador no rota).
- `[?]` ¿Forzar landscape en móvil? ✅ Confirmado: SÍ, con modal de aviso.

### 5.6. Internacionalización (i18n)

Confirmado por el usuario (2026-09-03): **solo español al lanzamiento, pero con estructura preparada para añadir idiomas después** sin refactor.

**Estrategia técnica:**

- **Todas las strings del juego** centralizadas en `docs/i18n/es.json` (único idioma poblado al inicio).
- Estructura del JSON:
  ```json
  {
    "ui": {
      "menu": { "play": "Jugar", "library": "Biblioteca pedagógica", "credits": "Créditos" },
      "hud": { "firmas": "Firmas recogidas: {count}", "vidas": "Vidas: {n}" },
      "pause": { "title": "Pausa", "resume": "Continuar", "restart": "Reiniciar stage", "exit": "Salir al menú" },
      "gameover": { "title": "Game Over", "retry": "Reintentar", "menu": "Menú principal" },
      "victory": { "title": "¡Stage completado!", "next": "Siguiente stage", "library": "Ver biblioteca" }
    },
    "disclaimer": { "title": "Aviso Legal · Disclaimer", "..." },
    "stages": {
      "bosque": { "name": "Bosque mediterráneo", "intro": "..." },
      "pueblo": { "..." }
    },
    "pedagogy": {
      "card_template": "{titulo}\n{descripcion}\n\nFuente: {fuente}",
      "intermediate_modal_template": "Has destruido {n} {enemigo}. Total acumulado: {impacto}"
    }
  }
  ```
- **Carga en runtime:** `src/i18n.js` carga el JSON según `localStorage.getItem('lang')` o `navigator.language`. Default: `es`.
- **Pluggable para futuro:** añadir `docs/i18n/val.json` o `en.json` solo requiere crear el archivo y registrar el código de idioma. Sin tocar `src/i18n.js`.
- **Herramientas futuras:** cuando se quiera traducir, se puede usar minimax MCP `text_to_audio` con voz — NO, ese es solo TTS. Mejor usar un servicio externo o un voluntario local para el valencià.
- **Tests de i18n:** aserciones simples de que los textos cargan, los placeholders (`{count}`) se interpolan, y los strings críticos existen.

---

## 6. Inventario de assets

### 🎵 Audio (música + SFX)

> ⚠️ **Heads-up confirmado:** después de re-inspeccionar el código del MCP server en `/home/ubuntu/.cache/uv/archive-v0/UDD3X213sG2jBxL4/lib/python3.12/site-packages/minimax_mcp/server.py` y grep exhaustivo por `music|bgm|composition|song`, **minimax MCP NO tiene herramientas de generación musical ni de SFX**. Sus 8 tools son: `text_to_audio` (TTS con `speech-2.8-hd`), `list_voices`, `voice_clone`, `play_audio`, `generate_video`, `query_video_generation`, `text_to_image`, `voice_design`. **Cero música.**

#### Música de fondo — visión del proyecto

La música del juego debe **beberse de la tradición del Valle de Ayora-Cofrentes**. Las melodías locales (jotas con dulzaina, coplas) son parte del patrimonio cultural que el proyecto quiere defender.

**Fuentes de referencia identificadas:**
- **Fondo de Música Tradicional IMF-CSIC** — base de datos oficial del CSIC con cientos de grabaciones de campo en dominio público, incluyendo piezas específicamente de Cofrentes y la comarca:
  - `musicatradicional.imf.csic.es/es/location/9084` (Cofrentes — fichas locales)
  - `musicatradicional.imf.csic.es/es/piece/44523` — *Jota popular con dulzaina* (Cofrentes, 1980)
  - `musicatradicional.imf.csic.es/es/piece/25009` — *El baile de la dulzaina. Jota* (1910)
- Instrumentos típicos del Valle: **dulzaina** (dolçaina en valencià) + **tamboril** (tabalet)
- Géneros locales: **jota valenciana**, **coplas locales**, **danzas procesionales**
- Fiestas donde suena: Batalla del agua (Jarafuel), Día de los Locos (Jalance), Fiesta de la Maderada (Cofrentes), Primer Corte de la Miel (Ayora)

**Opciones para materializar la música** (marcadas con `[?]`):

| # | Opción | Cómo cumple la intención | Esfuerzo |
|---|---|---|---|
| **A** | **Web Audio API + patrones de jota generados algorítmicamente** | Generamos en runtime música que sigue las reglas de la jota (compás 3/4 o 6/8, escala frigia/aeolia, ornamentación típica de dulzaina). NO usa IA externa, pero el resultado es 100% procedural inspirado en las grabaciones del CSIC. | Código más extenso, sin coste externo |
| **B** | **Playwright + servicio externo** (Suno.com, Udio.com) | Usamos el MCP de playwright para abrir suno.com u otro servicio de generación musical con IA, le pasamos como input los URLs del CSIC, y descargamos los resultados al proyecto. | Requiere cuenta en el servicio, coste por generación |
| **C** | **Instalar un MCP de música** (si existe para Suno API, etc.) | Buscamos/instalamos un MCP que sí genere música. Algunas opciones potenciales: suno-mcp, mureka-mcp, etc. | Requiere investigación de qué MCPs existen y config de credenciales |
| **D** | **Grabaciones reales del CSIC en dominio público + composición IA externa** | Bajar las grabaciones reales del CSIC y usarlas como samples en bucle, o como input para que Suno/Udio genere variaciones estilísticas. | Mixto, depende del servicio externo |

**Recomendación por defecto (si me das luz verde sin más detalles):** opción **B** con Suno (o similar), usando como "estilo" del prompt los tags del CSIC + nuestros temas. Generamos 1 pista por stage + menú + game over + victoria = ~7-10 pistas.

**Opción B CONFIRMADA por el usuario** (2026-09-03). Plan de ejecución:

1. **Setup de credenciales** — el usuario provee una cuenta de Suno (o Udio, AIVA, etc.) con sus credenciales. Se configuran en `tools/suno-pipeline/.env` (no se commitea).
2. **Catálogo de prompts** — para cada pista (~10), definimos:
   - **Estilo musical** (descripción textual): "Spanish folk jota from Valencia, dulzaina and tambourine, retro pixel game soundtrack, upbeat but tense, 2 minutes loop"
   - **Tags** extraídos del CSIC: jota valenciana, dulzaina, tamboril, instrumental
   - **Mood** por stage (Bosque = contemplativo, Pueblo = tensión social, Río = melancólico, Vertedero = ominoso, Castillo = épico)
3. **Pipeline Playwright** — script `tools/suno-pipeline/generate.py`:
   - Login en Suno con credenciales del `.env`
   - Por cada pista: navega a la página de generación, pega el prompt, dispara la generación, espera el resultado, descarga el MP3
   - Guarda en `assets/audio/music/<stage|menu>.mp3`
   - Metadata JSON con: nombre, duración, BPM, key, fecha generación, URL original de Suno
4. **Validación humana** — el usuario escucha cada MP3 y aprueba/rechaza. Las rechazadas se regeneran con prompt ajustado.
5. **Integración en el juego** — `src/music.js` carga los MP3 desde `assets/audio/music/`, fade in/out entre stages, volumen por menú.
6. **Licencia de las pistas generadas** — Suno Pro permite uso comercial. Verificar términos actuales de Suno antes de publicar. Si el usuario tiene plan free, comprobar si permite uso en proyectos públicos.

**Riesgos y mitigaciones:**

| Riesgo | Mitigación |
|---|---|
| Suno cambia UI / rompe el scraper | Capturar screenshots del flujo, actualizar el script |
| Credenciales filtradas en commits | `.env` en `.gitignore`, `.env.example` con placeholders |
| Generación fuera de estilo jota | Iteración de prompts + revisión humana de cada MP3 |
| Coste elevado | Empezar con 3 pistas piloto, validar antes de generar las 10 |

#### Efectos de sonido (SFX) — **opción C confirmada: síntesis procedural con Web Audio API**

Generamos todos los SFX en runtime con osciladores y ruido filtrado. Cero dependencias externas. Parametrizable.

**Mapeo de sonidos a generar:**

| Evento | Cómo se sintetiza |
|---|---|
| Disparo de papeleta | Ruido blanco breve (50ms) + componente sinusoidal agudo en caída |
| Impacto en enemigo | Sine modulado en frecuencia descendente + ruido breve |
| Card pedagógica recogida | Tres sinusoides en arpegio ascendente (do-mi-sol) |
| Game over | Acorde disonante (segunda menor) en fade out |
| Victoria | Fragmento de jota (3-4 compases) en tono mayor |
| Click de menú | Sine breve (100Hz, 30ms) |
| Transición de stage | Crescendo instrumental corto |
| Error (disparar a aliado) | Tono descendente disonante |

**Implementación:** módulo `src/sfx.js` con función `sfx.play('shoot' | 'hit' | 'card' | ...)`. Cada sonido definido como `AudioNode` graph en código. Configurable via tabla de parámetros.

### 📜 Disclaimer y política de contenido

**Texto del disclaimer** (mostrar al inicio del juego + accesible desde menú "Acerca de"):

```
╔════════════════════════════════════════════════════════════╗
║              AVISO LEGAL · DISCLAIMER                       ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Este juego es una obra de ficción con fines EDUCATIVOS     ║
║  y CÍVICOS.                                                 ║
║                                                            ║
║  ─── SOBRE LA VIOLENCIA ───                                ║
║  ✗ NO promueve la violencia.                                ║
║  ✓ Promueve la lucha LEGAL: recogida de firmas,             ║
║    alegaciones administrativas, movilización ciudadana.     ║
║  La mecánica de "disparar" es una METÁFORA de la acción     ║
║  documental. Cada "firma" representa apoyo vecinal.         ║
║                                                            ║
║  ─── SOBRE TRECO ───                                       ║
║  TRECO GESTIÓN DE RESIDUOS S.L. es una empresa REAL.         ║
║  El nombre "TRECO", "TRECO GESTIÓN DE RESIDUOS S.L." y     ║
║  cualquier variación son PROPIEDAD de sus respectivos         ║
║  titulares.                                                 ║
║                                                            ║
║  Este juego menciona TRECO exclusivamente:                  ║
║  • Con fines de crítica documentada y educación cívica     ║
║  • En ejercicio del derecho a la libertad de expresión     ║
║    y de información (Art. 20 Constitución Española;         ║
║    Art. 11 Carta de Derechos Fundamentales UE)              ║
║  • De forma NOMINATIVA (para identificar la entidad          ║
║    criticada), NO como endorsement, patrocinio,             ║
║    patrocinio comercial, asociación o afiliación            ║
║  • Citando fuentes públicas verificables en cada card        ║
║    pedagógica del juego                                     ║
║                                                            ║
║  Este juego NO está autorizado, patrocinado,                 ║
║  respaldado ni asociado con TRECO GESTIÓN DE RESIDUOS S.L.   ║
║  ni con sus titulares. Las marcas, nombres comerciales y     ║
║  cualquier signo distintivo pertenecen a sus titulares       ║
║  y se usan aquí sin ánimo de infracción.                    ║
║                                                            ║
║  ─── SOBRE LOS DATOS ───                                  ║
║  Los volúmenes, daños, fechas y cuantías mostradas           ║
║  provienen de fuentes públicas citadas en cada card.        ║
║  El proyecto no representa a ninguna otra empresa o         ║
║  colectivo en particular.                                   ║
║                                                            ║
║  ─── MODIFICACIONES ───                                   ║
║  Si TRECO o sus titulares consideran que el uso del          ║
║  nombre excede el ámbito de la crítica documentada,         ║
║  pueden solicitar la modificación de los textos              ║
║  vía GitHub Issues. Se valorará y atenderá cualquier        ║
║  petición razonable.                                         ║
║                                                            ║
║  ─── RESPONSABILIDAD ───                                  ║
║  Este juego se distribuye con fines exclusivamente          ║
║  educativos y de crítica cívica documentada.                 ║
║  El autor no se responsabiliza del uso indebido del mismo.   ║
╚════════════════════════════════════════════════════════════╝
```

**Comportamiento en el juego:**
- Mostrar como modal al primer arranque (checkbox "No volver a mostrar")
- Accesible siempre desde menú principal → "Acerca de / Disclaimer"
- Versión corta en el README.md del repo
- Versión inline al final de cada card pedagógica larga

**Disclaimers por pantalla del juego:**
- Splash screen al cargar `index.html`
- Pie de página fijo en cada card pedagógica ("Datos basados en fuentes públicas. Ver refs.")
- Página "Créditos" en el menú principal con link al repositorio y a las fuentes

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
| Iconos UI | 4-5 | health, score, firmas, pausa |
| Sprites de explosión | 2-3 | partículas para hits |
| **Proyectil = documento firmado** | **1-3** | **papeleta estándar + variante con sello** (pipeline en tools/, mismo método que sprites) |
| **Mano + bolígrafo (primera persona)** | **1-2** | **vista confirmada en primera persona** — mano pixel art con boli, orientación dinámica según puntero. Animación de firma al disparar. |
| Datos pedagógicos + fuentes | 13 entradas | `docs/pedagogy-data.json` |
| Audio SFX (opcional) | 5-10 | disparo (papel volando), hit, victoria |

### `[?]` Decisiones pendientes

**Confirmadas en sesión 2026-09-03:**
- ✅ **Música:** opción B (Playwright + Suno externo). Pipeline definido en sección 6.Audio.
- ✅ **SFX:** opción C (síntesis procedural Web Audio API). Mapeo en sección 6.Audio.
- ✅ **TRECO:** **TRECO GESTIÓN DE RESIDUOS S.L.**, empresa real con nombre legal explícito. Marca y nombre propiedad de sus titulares. Disclaimer con texto legal completo (Art. 20 CE + Art. 11 CDFUE + uso nominativo + respeto a derechos de marca).
- ✅ **Vista del jugador:** primera persona con mano pixel art sosteniendo bolígrafo. El boli firma sobre un papel que sale volando como proyectil. Ver Sección 1 y 2.2.
- ✅ **Stack render:** Pixi.js vía CDN (confirmado por el usuario 2026-09-03). Manejo de sprites, parallax, tweens, partículas.
- ✅ **Auto-fire móvil:** OFF (disparo manual con tap). Confirmado 2026-09-03.
- ✅ **Cartas pedagógicas:** combinación B + D — modal intermedio cada 5 enemigos + resumen completo al final del stage. Confirmado 2026-09-03.
- ✅ **Traducción:** solo español al lanzamiento, estructura i18n-ready. Confirmado 2026-09-03.
- ✅ **Orientación móvil:** forzar landscape con modal de aviso en portrait. Confirmado 2026-09-03.

**Aún pendientes:**
1. ✅ **Stack render:** **Pixi.js vía CDN** (confirmado).
2. ✅ **Auto-fire en móvil:** **OFF** (disparo manual con tap).
3. ✅ **Cartas pedagógicas:** **modal intermedio cada 5 + resumen completo al final del stage**.
4. ✅ **Traducción:** **solo español al lanzamiento, i18n-ready**.
5. ✅ **Modo portrait móvil:** **forzar landscape con modal de aviso en portrait**.
6. **Light gun detection:** ¿detectar automáticamente (¿Gamepad API?) o asumir mouse?
7. **Continues / extra lives:** ¿hay o no?
8. **High score / leaderboard:** ¿local (localStorage) o global?
9. **Tamaño de canvas:** ¿fijo (1280x720) o responsive?
10. **Variantes de proyectil:** ¿solo papeleta estándar, o también la versión con sello (más daño), o una super-firma cargada con daño en área?
11. **Accesibilidad:** ¿modo alto contraste, subtítulos/text-to-speech en cards, prefers-reduced-motion?
12. **Variantes de proyectil** (subdecisión de 10) — desglosada si quieres tratar aparte

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
| Pixi.js no carga desde CDN | ~~Medio~~ descartado | Stack confirmado = Pixi.js. Si falla el CDN, fallback local (bundle del repo). |
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

- Pipeline alpha: `tools/postprocess_v4.py` (flood-fill + atenuación HSV purple)
- Foto del Castillo de Cofrentes ya descargada (referencia visual)
- Datos pedagógicos: investigación propia de fuentes primarias (periódicos, notas de ayuntamiento, informes técnicos). Pendiente consolidar en `docs/pedagogy-data.json`

---

**Por favor revisar y:**
- Marcar las decisiones pendientes `[?]` con tu preferencia
- Cambiar el orden / alcance de las fases si querés
- Sugerir stages adicionales o quitar alguno
- Plantear cualquier duda mecánica o visual que falte
