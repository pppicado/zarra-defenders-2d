# Zarra Defenders 2D

> **On-rails shooter pedagógico sobre el impacto del macrovertedero de TRECO en el Valle de Ayora-Cofrentes.**
>
> HTML + JS sin build step. Jugar con mouse (o pistola de luz HID) en PC, táctil en móvil.

![Status](https://img.shields.io/badge/status-planning-yellow)
![License](https://img.shields.io/badge/license-TBD-lightgrey)
![Tech](https://img.shields.io/badge/tech-HTML5%20%2B%20Canvas2D%20%2F%20Pixi-blue)

## ⚠️ Aviso Legal · Disclaimer

Este juego es una obra de **ficción con fines educativos y cívicos**.

- ✗ **NO promueve la violencia.** La mecánica de "disparar" es una **metáfora de la acción documental**: cada "firma" representa el apoyo vecinal a la defensa del territorio.
- ✓ Promueve la **lucha legal**: recogida de firmas, alegaciones administrativas, movilización ciudadana, documentación de impactos.
- **TRECO GESTIÓN DE RESIDUOS S.L.** es una empresa REAL. El nombre "TRECO", "TRECO GESTIÓN DE RESIDUOS S.L." y cualquier variación son **propiedad de sus respectivos titulares**. Este juego la menciona exclusivamente con fines de **crítica documentada y educación cívica**, en ejercicio del derecho a la libertad de expresión e información (Art. 20 CE), de forma nominativa (para identificar la entidad criticada), **sin endorsement, patrocinio ni asociación** con su titular.
- Los datos mostrados (volúmenes, daños, cuantías) provienen de **fuentes citadas en cada card pedagógica** del juego.
- Si TRECO o sus titulares consideran que el uso excede el ámbito de la crítica documentada, pueden solicitar la modificación de textos vía GitHub Issues. Se atenderá cualquier petición razonable.

Ver el disclaimer completo y la política de contenido en [`PLAN.md`](./PLAN.md#-disclaimer-y-política-de-contenido).

## Contexto

On-rails shooter pedagógico sobre el impacto del macrovertedero de Zarra (TRECO) en el Valle de Ayora-Cofrentes. HTML5 + JS sin build step, con sprites 2D isométricos estilo 16-bit pixel art.

**¿Por qué 2D?**
- Visualmente más vistoso y "retro" (estilo 16-bit pixel art)
- Funciona perfecto en móvil con touch
- Las pistolas de luz HID se reconocen como mouse → experiencia nativa en PC
- Menos exigente en hardware → más accesible

## Stack

- **HTML5 + JavaScript** vanilla, sin build step
- **Canvas2D** (o Pixi.js si necesitamos más rendimiento de sprites)
- **Sprites isométricos** pre-generados (21 assets ya disponibles en `assets/sprites/`)
- **Mouse / touch** unificados bajo un mismo `InputManager`

## Estructura

```
zarra-defenders-2d/
├── README.md           ← este archivo
├── PLAN.md             ← planificación detallada (mecánicas, fases, assets)
├── LICENSE             ← TBD
├── index.html          ← entry point
├── styles/
│   └── main.css        ← pixel-perfect, image-rendering: pixelated
├── src/
│   ├── main.js         ← bootstrap, game loop
│   ├── game.js         ← state machine: menu → playing → gameover
│   ├── rail-camera.js  ← cámara con path fijo por stage
│   ├── player.js       ← crosshair + disparo
│   ├── enemies.js      ← tipos + spawn + IA simple
│   ├── backgrounds.js  ← parallax scrolling de fondos
│   ├── input.js        ← mouse + touch unificados
│   ├── pedagogy.js     ← cards con datos reales + fuentes citadas
│   ├── ui.js           ← HUD, menús, botones
│   └── sfx.js          ← audio (opcional)
├── assets/
│   ├── sprites/        ← 21 sprites isométricos ya generados
│   ├── raw/            ← originales de minimax (referencia)
│   ├── backgrounds/    ← por generar (basados en fotos reales, estilo pixel art)
│   ├── ui/             ← crosshair, health, score icon
│   └── particles/      ← sprites de explosión
├── tools/
│   ├── postprocess_v4.py   ← pipeline alpha channel
│   └── make_gallery.py     ← genera preview HTML de assets
└── docs/
    └── pedagogy-data.json  ← datos pedagógicos con fuentes citadas
```

## Estado

🟡 **Planificación** — todavía no hay código de juego. Estamos validando el `PLAN.md` antes de empezar.

## Licencia

Pendiente de definir (probable CC BY-NC-SA 4.0 para assets, MIT para código).
