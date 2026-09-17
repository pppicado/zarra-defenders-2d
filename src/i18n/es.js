/**
 * src/i18n/es.js
 *
 * STRINGS centralizado — A2 contract from 3D (zarra-defenders).
 *
 * **REGLA CONTRACTUAL (A2)**: ningún archivo bajo `src/` puede contener prosa
 * española libre fuera de este archivo. Todo texto user-facing vive aquí y se
 * referencia como `STRINGS.seccion.clave`. `verify.sh` (Fase 2) check #1
 * confirma que este contrato se cumple.
 *
 * **REGLA CONTRACTUAL (A6)**: ningún archivo bajo `src/` puede contener
 * literales `https://` fuera de este archivo. Todas las URLs de pedagogía
 * (4 enlaces finales + URLs de fuentes citadas) viven aquí.
 *
 * Estructura:
 *   STRINGS = {
 *     app:        nombre + tagline + versión
 *     orientation: modal "girar el móvil"
 *     fullscreen: aria-label del botón fullscreen
 *     menu:       main menu (título, subtítulo, stages, modales, mejor)
 *     overlay:    game-over + victory (title, score, firmas, mejor, new record, buttons)
 *     pedagogy:   datos pedagógicos por stage + final + enemigos
 *     disclaimer: texto legal completo (Art. 20 CE + Art. 11 CDFUE)
 *     about:      texto Acerca de
 *   }
 *
 * Las URLs de pedagogía (STRINGS.pedagogy.datos.*.url y STRINGS.pedagogy.final.enlaces.*)
 * son las 6 fuentes verificadas en `research/fuentes.md` (copiado del 3D).
 *
 * Los strings vienen del código actual:
 *   - ui/menu.js líneas 36-64, 103, 146, 180-185, 200-201, 222
 *   - ui/overlay.js líneas 59-72, 101-110, 138-143
 *   - index.html línea 32, 52
 */

export const STRINGS = {
  // ============================================================
  // Identidad de la app
  // ============================================================
  app: {
    nombre: 'Zarra Defenders 2D',
    tagline: 'Defensores del Valle de Ayora-Cofrentes',
    version: 'F6 — scrolling pixel-art backgrounds (2026)',
  },

  // ============================================================
  // Modal de orientación (portrait < 360 px side)
  // ============================================================
  orientation: {
    rotarMovil: 'Por favor, gira el móvil para jugar',
  },

  // ============================================================
  // Botón fullscreen
  // ============================================================
  fullscreen: {
    ariaLabel: 'Pantalla completa',
  },

  // ============================================================
  // Main menu (BG-005 — fase-6 stage selector)
  // ============================================================
  menu: {
    stages: [
      { id: 'stage1-lashoyas',  label: '1 · Las Hoyas de Caballero (Zarra)' },
      { id: 'stage2-lahoz',     label: '2 · La Hoz del río Zarra' },
      { id: 'stage3-lahunde',   label: '3 · Sierra de La Hunde y Palomera (Ayora)' },
      { id: 'stage4-ayora',     label: '4 · Casco urbano de Ayora' },
      { id: 'stage5-acuifero',  label: '5 · El Acuífero (jefe final)' },
    ],
    mejorFirmas: (firmas) => `Mejor: ${firmas} firmas`,
    mejorVacio: 'Mejor: — firmas',
    lockIcon: '\u{1F512} ', // 🔒
    cerrarModal: '\u2715',   // ✕
    cerrarAriaLabel: 'Cerrar',
    modalAcercaDe: 'Acerca de',
    modalDisclaimer: 'Disclaimer',
  },

  // ============================================================
  // Game-over + victory overlay (F3 game-over-flow + victory-flow)
  // ============================================================
  overlay: {
    gameOver: {
      titulo: 'Stage failed',
      tituloClass: 'overlay-title--fail',
      verb: 'firmas perdidas',
    },
    victory: {
      titulo: 'Stage cleared',
      tituloClass: 'overlay-title--win',
      verb: 'firmas recogidas',
    },
    scoreLine: (score) => `Puntuación: ${score}`,
    firmasLine: (verb, firmas) => `Firmas ${verb}: ${firmas}`,
    mejorLine: (firmas) => `Mejor: ${firmas} firmas`,
    mejorVacio: 'Mejor: — firmas',
    newRecord: '¡NUEVO RÉCORD!',
    retryTest: 'Reintentar test level',
    retry: 'Reintentar',
    back: 'Volver al menú principal',
  },

  // ============================================================
  // Pedagogy — los 6 datos por stage + final + enemigos
  // ============================================================
  pedagogy: {
    datos: {
      'stage1-lashoyas': {
        texto: 'El proyecto prevé 11 millones de metros cúbicos de residuos, más del doble del vertedero de Dos Aguas.',
        fuente: 'Las Provincias, 24/06/2026',
        url: 'https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html',
      },
      'stage2-lahoz': {
        texto: 'El Acuífero de la Mancha Oriental tiene 8.500 km² — una de las mayores masas de agua subterránea de Europa. Abastece a Ayora, Zarra, Teresa de Cofrentes y Jarafuel.',
        fuente: 'Agencia del Agua de Castilla-La Mancha (s/f)',
        url: 'https://agenciadelagua.castillalamancha.es/el-agua-en-castilla-la-mancha/situacion-del-agua-en-clm/acuiferos',
      },
      'stage3-lahunde': {
        texto: 'La comarca ya convive con la central nuclear de Cofrentes, parques eólicos y plantas fotovoltaicas. La llaman zona de sacrificio.',
        fuente: 'actualidadvalencia.com, 05/08/2026',
        url: 'https://actualidadvalencia.com/macrovertedero-zarra-pp-exige-retirada-proyecto/',
      },
      'stage4-ayora': {
        texto: 'La ruta de camiones pasa junto al colegio y el polideportivo de Ayora, y atraviesa el Plan de Emergencia Nuclear de la central de Cofrentes.',
        fuente: 'Las Provincias, 24/06/2026',
        url: 'https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html',
      },
      'stage5-acuifero': {
        texto: 'En 2002 los vecinos del Valle ya rechazaron un vertedero igual en la misma zona. 10.700 firmas, manifestación con ataúd frente a la Diputación. Se puede volver a parar.',
        fuente: 'Las Provincias, 16/06/2026',
        url: 'https://www.lasprovincias.es/comarcas/valle-ayoracofrentes-moviliza-macrovertedero-proyectado-zarra-20260616173049-nt.html',
      },
      final: {
        texto: 'A fecha de hoy, la solicitud está en información pública. Puedes presentar alegaciones.',
        fuente: 'Valencia Plaza, 31/07/2026',
        url: 'https://valenciaplaza.com/valenciaplaza/comarca-y-empresa/crece-el-rechazo-contra-el-macrovertedero-de-zarra-tras-la-ultima-concentracion-de-casi-mil-personas',
      },
    },
    // Por enemigo: array de cards (cada card = texto + fuente + url).
    // Las keys corresponden a `spriteId` en assets/sprites/manifest.json.
    // Llenaremos en Fase 1.1 cuando implementemos `src/pedagogy/cards.js`.
    enemigos: {
      camion_treco: [],
      bidon_lixiviado: [],
      bolsa_plastico: [],
      valla_publicitaria: [],
      dron_fumigador: [],
      camion_cisterna_residuos: [],
      tubo_lixiviado: [],
      sello_burocratico: [],
      topadora: [],
      incineradora: [],
      trailer: [],
      planta_treco: [],
    },
    // Final screen (Fase 1.7) — los 4 enlaces de cierre del loop pedagógico.
    // A6 contract: URLs centralizadas acá, cero literales en código.
    final: {
      titulo: 'El Valle se planta',
      dato: 'A fecha de hoy, la solicitud está en información pública. Puedes presentar alegaciones.',
      enlaces: {
        plataforma: {
          label: 'Plataforma vecinal',
          url: 'https://nomacrovertederozarra.com',
        },
        alegaciones: {
          label: 'Formulario de alegaciones',
          url: 'https://nomacrovertederozarra.com/alegaciones',
        },
        asociacion: {
          label: 'Asociación Naturalista de Ayora y la Valle',
          url: 'https://nomacrovertederozarra.com/asociacion',
        },
        hashtag: {
          label: '#NoAlMacrovertederoDeZarra',
          url: '#NoAlMacrovertederoDeZarra',
        },
      },
      volverJugar: 'Volver a jugar',
    },
  },

  // ============================================================
  // Disclaimer legal (Art. 20 CE + Art. 11 CDFUE)
  // ============================================================
  disclaimer: {
    full: `
<h2>Disclaimer</h2>
<p><strong>Este es un juego con intención política y pedagógica.</strong> Toda la información
presentada sobre el proyecto TRECO, sus impactos y los agentes involucrados está basada en
fuentes públicas y se ofrece como material educativo.</p>
<p>El juego no representa, endosa ni ataca a ninguna persona física. Los enemigos son
metáforas del impacto ambiental: topadoras, camiones, drones de fumigación, incineradoras,
vertederos. Las fuentes citadas se incluyen en las tarjetas pedagógicas (F6).</p>
<p>Zarra Defenders 2D es software libre. Código y assets disponibles en el repositorio del
proyecto.</p>
`,
    splashTitulo: 'Aviso legal',
    splashCheckbox: 'No volver a mostrar este aviso',
  },

  // ============================================================
  // About (modal en menú principal)
  // ============================================================
  about: {
    full: `
<h2>Acerca de</h2>
<p><strong>Zarra Defenders 2D</strong> — on-rails shooter pedagógico sobre el proyecto de macrovertedero
TRECO GESTIÓN DE RESIDUOS S.L. en el Valle de Ayora-Cofrentes (Valencia).</p>
<p>Este juego convierte la lucha vecinal contra el vertedero en una experiencia arcade:
firmás papeletas de recogida en lugar de disparar balas. Cada firma es una firma real
contra la destrucción del territorio.</p>
<p>Inspirado en <em>House of the Dead</em>, <em>Time Crisis</em> y <em>Virtua Cop</em>.</p>
<p>Versión: F6 — scrolling pixel-art backgrounds (2026).</p>
`,
  },
};