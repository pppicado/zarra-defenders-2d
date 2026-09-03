#!/usr/bin/env python3
"""
Genera la galeria HTML para los sprites 2D retro de zarra-defenders.

Lee /tmp/opencode/zarra-2d-sprites/sprites/*.png, agrupa por categoria
(trees, enemies, props, buildings) segun el prefijo del nombre, y produce
un index.html con grid responsive y fondo oscuro para apreciar el alpha.
"""

import os
from pathlib import Path
from collections import defaultdict

ROOT = Path("/tmp/opencode/zarra-2d-sprites")
SPRITES = ROOT / "sprites"
OUT = ROOT / "index.html"

# Orden y categorias (prefijo de archivo)
CATEGORIES = [
    ("trees",    "Trees (Arboles mediterraneos)"),
    ("enemies",  "Enemies (Amenazas del macrovertedero TRECO)"),
    ("props",    "Props (Elementos de escenario)"),
    ("buildings","Buildings (Edificios del valle)"),
]

LABELS = {
    "encina": "Encina (Quercus ilex)",
    "pino": "Pino carrasco",
    "almendro": "Almendro",
    "camion_treco": "Camion TRECO",
    "bidon_lixiviado": "Bidon de lixiviado",
    "bolsa_plastico": "Bolsa de plastico",
    "valla_publicitaria": "Valla publicitaria",
    "plataforma_solar": "Plataforma solar",
    "tubo_lixiviado": "Tubo de lixiviado",
    "dron_fumigador": "Dron fumigador",
    "sello_burocratico": "Sello burocratico",
    "topadora": "Topadora",
    "incineradora": "Incineradora",
    "trailer": "Trailer de obra",
    "planta_treco": "Planta TRECO (jefe)",
    "valla": "Valla metalica",
    "roca": "Roca",
    "cartel": "Cartel",
    "casa_ayora": "Casa de Ayora",
    "castillo_cofrentes": "Castillo de Cofrentes (con pueblo)",
    "torre_central": "Torre central",
}

def categorize(stem: str) -> str:
    for prefix, _ in CATEGORIES:
        if stem.startswith(prefix + "_") or stem == prefix:
            return prefix
    return "misc"


def collect():
    if not SPRITES.exists():
        return []
    out = []
    for f in sorted(SPRITES.glob("*.png")):
        cat = categorize(f.stem)
        label = LABELS.get(f.stem.replace(cat + "_", ""), f.stem)
        out.append((cat, label, f.name))
    return out


def html_for(items):
    by_cat = defaultdict(list)
    for cat, label, fname in items:
        by_cat[cat].append((label, fname))

    sections = []
    for prefix, title in CATEGORIES:
        cards = by_cat.get(prefix, [])
        if not cards:
            continue
        cards_html = "\n".join(
            f'        <figure class="card">'
            f'<div class="frame"><img src="sprites/{fname}" alt="{label}" loading="lazy"></div>'
            f'<figcaption>{label}</figcaption></figure>'
            for label, fname in cards
        )
        sections.append(
            f'  <section class="cat">\n'
            f'    <h2>{title}</h2>\n'
            f'    <div class="grid">\n{cards_html}\n    </div>\n'
            f'  </section>'
        )

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Zarra Defenders — Sprites 2D Retro</title>
<style>
  :root {{
    --bg: #0f1115;
    --bg-card: #1a1f29;
    --fg: #e8e8e8;
    --muted: #8a93a3;
    --accent: #f5a623;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--fg);
    padding: 24px;
  }}
  header {{ max-width: 1100px; margin: 0 auto 32px; }}
  header h1 {{ margin: 0 0 8px; font-size: 1.8rem; letter-spacing: 0.5px; }}
  header p {{ margin: 0; color: var(--muted); }}
  .cat {{ max-width: 1100px; margin: 0 auto 36px; }}
  .cat h2 {{
    margin: 0 0 16px;
    font-size: 1.15rem;
    color: var(--accent);
    border-bottom: 1px solid #2a313d;
    padding-bottom: 8px;
  }}
  .grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }}
  .card {{
    margin: 0;
    background: var(--bg-card);
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.15s ease;
  }}
  .card:hover {{ transform: translateY(-2px); }}
  .frame {{
    background-image:
      linear-gradient(45deg, #232a36 25%, transparent 25%),
      linear-gradient(-45deg, #232a36 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #232a36 75%),
      linear-gradient(-45deg, transparent 75%, #232a36 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    background-color: #2a313d;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }}
  .frame img {{
    max-width: 100%;
    max-height: 100%;
    image-rendering: pixelated;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
  }}
  figcaption {{
    padding: 8px 10px;
    font-size: 0.85rem;
    text-align: center;
    color: var(--fg);
  }}
  footer {{
    max-width: 1100px;
    margin: 48px auto 0;
    color: var(--muted);
    font-size: 0.8rem;
    text-align: center;
  }}
</style>
</head>
<body>
  <header>
    <h1>Zarra Defenders — Sprites 2D Retro</h1>
    <p>Assets pseudo-3D generados para variante 2D del juego. Canal alpha verificado. Estilo pixel art 16-bit, perspectiva 3/4 isometrica.</p>
  </header>

{chr(10).join(sections)}

  <footer>
    Generado con minimax MCP · {len(items)} sprites · {SPRITES}
  </footer>
</body>
</html>
"""


def main():
    items = collect()
    if not items:
        raise SystemExit(f"No hay sprites en {SPRITES}")
    OUT.write_text(html_for(items), encoding="utf-8")
    print(f"OK  {OUT}  ({len(items)} sprites)")


if __name__ == "__main__":
    main()
