# Stage 4 — Vertedero de TRECO

**Location:** El macrovertedero de Zarra (real, proyecto de residuos). En el juego es operado por **TRECO GESTIÓN DE RESIDUOS S.L.** (empresa real según disclaimer).

**Contexto real (controversia documentada):**
- Macrovertedero de residuos en zona del Valle de Ayora
- Polémica vecinal histórica contra el proyecto
- Generación de lixiviados que contaminan subsuelo y río Cabriel
- Quema e incineración con emisión de humos
- Fumigación con drones en zonas agrícolas cercanas
- Tráfico pesado de camiones con residuos tóxicos

**Componentes típicos de un macrovertedero (research genérica):**
- **Montañas de basura**: capas acumuladas de residuos mezclados
- **Piscinas de lixiviados**: grandes estanques negros/marrones con líquido percolado
- **Chimenea de incineración**: torre alta con humo continuo
- **Carretera interior**: acceso de camiones pesados
- **Vallado perimetral**: vallas metálicas con señalización
- **Plantas industriales**: naves de procesamiento, planta de transferencia
- **Edificios administrativos**: oficinas, báscula de pesaje, parking de camiones
- **Maquinaria pesada**: excavadoras, compactadoras, cisternas

**Amenazas específicas para el juego (ya tenemos sprites):**
- `enemies_planta_treco` (boss) — el macrovertedero en sí mismo, con torres de basura
- `enemies_bidon_lixiviado` — bidones de residuos tóxicos
- `enemies_incineradora` — chimenea industrial con humo
- `enemies_bolsa_plastico` — bolsas volando con el viento
- `enemies_tubo_lixiviado` — tubos de salida de lixiviado

**Landmarks para el bg:**
- Silueta de montañas de basura al fondo
- Piscinas de lixiviados con líquido oscuro
- Maquinaria pesada (excavadoras, compactadoras) en la carretera interna
- Humo gris de la chimenea contra el cielo
- Vallado metálico oxidado en primer plano
- Carteles de "PELIGRO" y "PROHIBIDO EL PASO"

**Diseño de cámara path:** rail por la carretera interior del vertedero, pasando frente a las montañas de basura, las piscinas, cerca de la chimenea. El boss (planta_treco) aparece al final.

**Color palette distinta a otros stages:**
- Predominio gris-marrón (no verde como bosque ni azul como río)
- Cielo más sucio (gris-pollution)
- Contraste con texto rojo de señales de peligro

**Referencias fotográficas pendientes:**
- [ ] Vista general de un macrovertedero (aérea)
- [ ] Piscinas de lixiviados
- [ ] Chimenea industrial con humo
- [ ] Maquinaria pesada (excavadora con basura)
- [ ] Camiones entrando al vertedero

**Fuentes:**
- https://es.wikipedia.org/wiki/Cofrentes (mención al contexto del Valle)
- Controversia documentada en las fuentes del SDD previo (zarra-defenders 3D) — `.fuente` strings

**NOTA IMPORTANTE:** Este stage NO debe glorificar el vertedero. La estética debe ser opresiva, sucia, gris — para que el jugador SIENTA que está luchando contra algo malo, no jugando en un parque de atracciones.
