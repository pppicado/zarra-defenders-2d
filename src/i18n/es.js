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
  // Errores de bootstrap (mostrados al usuario si algo crítico falla)
  // ============================================================
  error: {
    pixiNotLoaded: 'Pixi.js no cargó desde el CDN. Verificar conexión o tag <script>',
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
    modalBiblioteca: 'Biblioteca pedagógica',
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
    // Por enemigo: {stageId, titulo, descripcion}. La card se construye en
    // runtime: muestra el dato del stage + la descripción específica del
    // enemigo + el link a la fuente. Las keys corresponden a `spriteId`
    // en assets/sprites/manifest.json (prefijo `enemies_`).
    //
    // Pedagogía: cada descripción conecta el enemigo con su impacto real.
    // Las fuentes y URLs vienen de STRINGS.pedagogy.datos[stageId] (las 6
    // verificadas en research/fuentes.md).
    enemigos: {
      enemies_camion_treco: {
        stageId: 'stage1-lashoyas',
        titulo: 'Camión TRECO',
        descripcion: 'Has firmado contra la logística del proyecto. Cada camión pesado es +contaminación y +ruido para el Valle.',
      },
      enemies_bidon_lixiviado: {
        stageId: 'stage2-lahoz',
        titulo: 'Bidón de lixiviados',
        descripcion: 'Has firmado contra la contaminación tóxica del acuífero. Cada bidón filtrado envenena el agua por generaciones.',
      },
      enemies_bolsa_plastico: {
        stageId: 'stage1-lashoyas',
        titulo: 'Bolsa de plástico',
        descripcion: 'Has firmado contra la contaminación cotidiana. El plástico ya está en el Valle; el vertedero lo multiplicaría.',
      },
      enemies_tubo_lixiviado: {
        stageId: 'stage2-lahoz',
        titulo: 'Tubo de lixiviados',
        descripcion: 'Has firmado contra los vertidos clandestinos al río Cabriel. Cada tubo conecta el vertedero con el acuífero.',
      },
      enemies_valla_publicitaria: {
        stageId: 'stage1-lashoyas',
        titulo: 'Valla publicitaria',
        descripcion: 'Has firmado contra el lavado de imagen del proyecto. "Complejo Medioambiental" no es lo que parece.',
      },
      enemies_dron_fumigador: {
        stageId: 'stage3-lahunde',
        titulo: 'Dron fumigador',
        descripcion: 'Has firmado contra la fumigación industrial. La comarca ya es zona de sacrificio —no necesita más químicos.',
      },
      enemies_camion_cisterna_residuos: {
        stageId: 'stage2-lahoz',
        titulo: 'Camión cisterna de residuos',
        descripcion: 'Has firmado contra el transporte de residuos tóxicos por carreteras comarcales. Cada fuga contamina 1000 m³ de suelo.',
      },
      enemies_topadora: {
        stageId: 'stage1-lashoyas',
        titulo: 'Topadora',
        descripcion: 'Has firmado contra la destrucción de encinas. Las encinas del Valle tienen siglos; la topadora las arranca en minutos.',
      },
      enemies_incineradora: {
        stageId: 'stage3-lahunde',
        titulo: 'Incineradora móvil',
        descripcion: 'Has firmado contra la quema de residuos. La incineración libera dioxinas — la comarca ya convive con la nuclear.',
      },
      enemies_trailer: {
        stageId: 'stage4-ayora',
        titulo: 'Trailer',
        descripcion: 'Has firmado contra el paso de camiones junto al colegio y el polideportivo de Ayora. Los niños respiran ese aire.',
      },
      enemies_planta_treco: {
        stageId: 'stage5-acuifero',
        titulo: 'Planta TRECO',
        descripcion: 'Has firmado contra la planta de tratamiento. En 2002 los vecinos ya pararon un vertedero igual. Se puede volver a parar.',
      },
      enemies_sello_burocratico: {
        stageId: 'stage4-ayora',
        titulo: 'Sello burocrático',
        descripcion: 'Has firmado contra la burocracia que autoriza sin consulta vinculante. La administración también se firma.',
      },
    },
    // Data screen pre-nivel (Fase 1.5) — overlay con dato + citation antes de jugar.
    dataScreen: {
      titulo: 'Dato pedagógico',
      fuente: 'Fuente',
      continuar: 'Continuar',
      ariaLabel: 'Dato pedagógico del nivel',
      stageLabels: {
        'stage1-lashoyas': '1 · Las Hoyas de Caballero (Zarra)',
        'stage2-lahoz': '2 · La Hoz del río Zarra',
        'stage3-lahunde': '3 · Sierra de La Hunde y Palomera (Ayora)',
        'stage4-ayora': '4 · Casco urbano de Ayora',
        'stage5-acuifero': '5 · El Acuífero (jefe final)',
      },
    },

    // Modal intermedio cada 5 enemigos (Fase 1.2) — overlay breve con resumen
    // acumulativo del impacto pedagógico. Mensaje dinámico según # firmas.
    modalIntermedio: {
      subtitulo: 'Sigue sumando. Tu papeleta se suma a la lucha vecinal.',
      // El mensaje principal se construye dinámicamente según # firmas
      // (ver buildModalMessage en src/pedagogy/modal-intermedio.js).
      mensaje: (firmas, shownCount) => {
        if (firmas < 10) return `${firmas} firmas recogidas contra el proyecto. Cada papeleta se suma a la lucha vecinal del Valle.`
        if (firmas < 25) return `${firmas} firmas sumadas. El Valle de Ayora-Cofrentes se planta ante TRECO.`
        if (firmas < 50) return `${firmas} firmas — un acto colectivo. La comarca recuerda: en 2002 ya pararon un vertedero igual.`
        return `${firmas} firmas. La presión vecinal crece. Sigue sumando.`
      },
    },

    // Resumen final post-stage (Fase 1.3) — overlay navegable con las cards vistas.
    resumenFinal: {
      ariaLabel: (idx, total) => `Resumen pedagógico card ${idx} de ${total}`,
      cerrarAriaLabel: 'Cerrar resumen',
      prev: '\u2190 Anterior',
      next: 'Siguiente \u2192',
      volverMenu: 'Volver al menú',
      emptyTitle: 'Sin cards pedagógicas',
      emptyMsg: 'No has firmado contra ningún enemigo este run.',
      emptyCerrar: 'Volver',
    },

    // Cards in-game (Fase 1.1) — overlay flotante con dato + fuente citada.
    cards: {
      cerrarAriaLabel: 'Cerrar tarjeta',
    },

    // Biblioteca pedagógica (Fase 1.4) — grid de cards acumulado + detail view.
    biblioteca: {
      ariaLabel: 'Biblioteca pedagógica',
      detailAriaLabel: (idx, total) => `Biblioteca card ${idx} de ${total}`,
      title: 'Biblioteca pedagógica',
      empty: 'No hay cards para este filtro. Juega un stage para desbloquear contenido pedagógico.',
      back: '\u2190 Volver a la biblioteca',
      prev: '\u2190 Anterior',
      next: 'Siguiente \u2192',
      filtros: [
        { id: 'all',           label: 'Todas' },
        { id: 'stage1-lashoyas', label: '1. Las Hoyas' },
        { id: 'stage2-lahoz',    label: '2. La Hoz' },
        { id: 'stage3-lahunde',  label: '3. La Hunde' },
        { id: 'stage4-ayora',    label: '4. Ayora' },
        { id: 'stage5-acuifero', label: '5. Acuífero' },
      ],
      shortStageLabels: {
        'stage1-lashoyas': 'Las Hoyas',
        'stage2-lahoz': 'La Hoz',
        'stage3-lahunde': 'La Hunde',
        'stage4-ayora': 'Ayora',
        'stage5-acuifero': 'Acuífero',
      },
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