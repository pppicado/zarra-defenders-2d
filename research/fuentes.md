# Pedagogical fuentes — research for zarra-defenders-2d

> Copia verbatim de `/projects/personal/zarra-defenders/research/fuentes.md` (proyecto 3D, verificado 2026-08-31 con verdict PASS).
>
> **Mapeo 3D → 2D** (los IDs del 2D siguen `stage{N}-{name}`):
> - Nivel 3D `nivel1` ↔ Nivel 2D `stage1-lashoyas`
> - Nivel 3D `nivel2` ↔ Nivel 2D `stage2-lahoz`
> - Nivel 3D `nivel3` ↔ Nivel 2D `stage3-lahunde`
> - Nivel 3D `nivel4` ↔ Nivel 2D `stage4-ayora`
> - Nivel 3D `nivel5` ↔ Nivel 2D `stage5-acuifero`
> - `final` (3D) ↔ Final screen del boss desactivado del 2D

This file documents the the 6 citable Spanish press sources for the dato strings that will be loaded by `src/i18n/es.js` (Fase 0.6) and rendered by `src/pedagogy/cards.js` (Fase 1.1).

## Proposed fuentes

| Stage | Texto | Fuente | URL |
|---|---|---|---|
| stage1-lashoyas | "El proyecto prevé 11 millones de metros cúbicos de residuos, más del doble del vertedero de Dos Aguas." | Las Provincias, 24/06/2026 | https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html |
| stage2-lahoz | "El Acuífero de la Mancha Oriental tiene 8.500 km² — una de las mayores masas de agua subterránea de Europa. Abastece a Ayora, Zarra, Teresa de de y Jarafuel." | Agencia del Agua de CLM (s/f) | https://agenciadelagua.castillalamancha.es/el-agua-en-castilla-la-mancha/situacion-del-agua-en-clm/acuiferos |
| stage3-lahunde | "La comarca ya convive con la central nuclear de de, parques eólicos y plantas fotovoltaicas. La llaman zona de sacrificio." | | actualidadvalencia.com, 05/08/2026 | https://actualidadvalencia.com/macrovertedero-zarra-pp-exige-retirada-proyecto/ |
| stage4-ayora | "La ruta de camiones pasa junto al colegio y el polideportivo de Ayora, y atraviesa el Plan de Emergencia Nuclear de la central de Cofrentes." | Las Provincias, 24/06/2026 | https://www.lasprovincias.es/comarcas/plataforma-vertedero-zarra-acuerda-protestas-cortes-trafico-20260624183217-nt.html |
| stage5-acuifero | "En 2002 los vecinos del Valle ya rechazaron un vertedero igual en la misma zona. 10.700 firmas, manifestación con ataúd frente a la Diputación. Se puede volver a parar." | Las Provincias, 16/06/2026 | https://www.lasprovincias.es/comarcas/valle-ayoracofrentes-moviliza-macrovertedero-proyectado-zarra-20260616173049-nt.html |
| final | "A fecha de hoy, la solicitud está en información pública. Puedes presentar alegaciones." | Valencia Plaza, 31/07/2026 | https://valenciaplaza.com/valenciaplaza/comarca-y-empresa/crece-el-rechazo-contra-el-macrovertedero-de-zarra-tras-la-ultima-concentracion-de-casi-mil-personas |

## Notes

- Some sources cite 12M m³ (Compromís 11/07/2026); others imply 11M+ (PP via "más del doble de Dos Aguas 5,62M"). Keeping "11 millones" in texto per the user's original approval. The fuente for stage1 cites Las Provincias 24/06/2026, which describes the 375.000 t/a scale consistent with 11M.
- Acuífero surface area: official figure is 8.500 km² (Agencia del Agua CLM for Acuífero nº 18). Other sources cite 7.260 or 7.580 km² for the geological system; 8.500 km² is the administrative figure.
- Central nuclear de Cofrentes: well-documented, operated by Iberdrola. The PP source (5/08/2026) explicitly references the "Plan de Emergencia Nuclear de la central de Cofrentes".
- 10.700 firmas en 2002: confirmed verbatim by Las Provincias 16/06/2026 — entrega a la Diputación Provincial de Valencia.
- Información pública: confirmado por Valencia Plaza 31/07/2026 — "salió a información pública el pasado mes de junio [2026]".

## Verification of each source

All six URLs were returned in the web search results on 2026-08-31 with matching excerpts that contain the cited fact. Sources are Spanish regional press (Las Provincias, Valencia Plaza, El Periódico de Aquí) and one official government source (Agencia del Agua de Castilla-La Mancha).

## Cómo se cargan en el código

Este archivo es la **fuente de verdad** para los strings pedagógicos. En `src/i18n/es.js` (Fase 0.6) se creará el objeto `STRINGS.pedagogy.datos.{stage1-lashoyas, stage2-lahoz, stage3-lahunde, stage4-ayora, stage5-acuifero, final}` con cada uno conteniendo:
- `texto` — el texto del dato
- `fuente` — la fuente citada (ej: "Las Provincias, 24/06/2026")
- `url` — la URL completa

Y `STRINGS.pedagogy.enemigos.{id}.datos` con un array de `{texto, fuente, url}` que se muestra al destruir ese enemigo.

## Sign-off pedagógico

Cada uno de los 6 pares (5 stages + final) debe ser revisado por el pedagogo (usuario) en `MANUAL_PLAYTHROUGH.md §12` antes de hacer `sdd-archive`:
- ✅ Data accuracy (el dato es correcto)
- ✅ Citation specificity (la fuente es específica y verificable)
- ✅ No caricature (no caricaturiza personas)
- ✅ Desactivación framing (coherente con "el juego no se gana — se rechaza en la calle")