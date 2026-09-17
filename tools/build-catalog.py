#!/usr/bin/env python3
"""
build-catalog.py — scan assets/backgrounds/* and emit catalog-data.json for the
dynamic catalog.html. Run after every image generation so new variants show up.

Idempotent: only writes the JSON, does not modify images.

Discovery sources (in priority order):
  1. assets/backgrounds/stage{1..5}-{name}.png    — current definitive
  2. assets/backgrounds/v4-journey/*.jpeg          — current iteration variants (v#, far-v#)
  3. assets/backgrounds/v3-rpg-isometric/*.jpeg    — previous iteration history (v#)
  4. assets/backgrounds/v2-rpg/*.jpeg             — earlier iteration history (v#)

For each stage, identifies the "current pick" via the postprocess script's PICKS table.
Adds thematic metadata per stage (theme, key landmarks, journey description) hardcoded
here as the single source of truth.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BG_DIR = ROOT / "assets" / "backgrounds"
OUT = BG_DIR / "catalog-data.json"

# Current iteration round whose s{N}-v{M}.jpeg files populate the catalog
ACTIVE_ROUND = "v5-tiles"

STAGES = {
    1: {
        "name": "Las Hoyas de Caballero (Zarra)",
        "key": "stage1-lashoyas",
        "theme": "Encinas + almendros · suelo arcilloso-rojizo · atardecer manchego · TRECO amenazando",
        "plan_ref": "PLAN.md §2.4 · SDD zarra-defenders §3.1",
        "journey": "Camino rural entre encinas → campos de almendros → TRECO facility visible al fondo bajo cielo naranja",
        "landmarks": "Encinas dispersas · almendros en flor · suelo rojizo-arcilloso · atardecer manchego naranja · silueta de facility TRECO en lontananza",
        "iterations_note": "3D-aligned: paraje real del polígono 11 de Zarra donde TRECO proyecta el vertedero. Boss: topadora arrancando encinas.",
    },
    2: {
        "name": "La Hoz del río Zarra",
        "key": "stage2-lahoz",
        "theme": "Cañón estrecho · río turquesa · paredes rocosas · vegetación de ribera · tubería de lixiviados",
        "plan_ref": "PLAN.md §2.4 · SDD zarra-defenders §3.2",
        "journey": "Entrar al cañón → río abajo → puente de madera sprite → tubería escupiendo lixiviados al cauce",
        "landmarks": "Paredes de roca gris del cañón · río turquesa serpenteando · puente de madera sprite · tubería industrial sprite con lixiviados verde-oscuro",
        "iterations_note": "3D-aligned: Barranco del Agua (La Hoz), ruta de senderismo de 13 km por el río Zarra. Boss: tubería industrial gigante.",
    },
    3: {
        "name": "Sierra de La Hunde y Palomera (Ayora)",
        "key": "stage3-lahunde",
        "theme": "Pinar denso · pino carrasco · romero + aliaga como sotobosque · sol entre ramas",
        "plan_ref": "PLAN.md §2.4 · SDD zarra-defenders §3.3",
        "journey": "Trocha forestal que se interna en el pinar denso → zigzags entre pinos carrascos → continua hacia La Palomera",
        "landmarks": "Pino carrasco (Pinus halepensis) denso · romero plateado · aliagas grises · sol entre ramas · suelo de pinocha",
        "iterations_note": "3D-aligned: parajes naturales protegidos al norte de Ayora, 'un pulmón que hay que proteger'. Boss: incineradora industrial móvil.",
    },
    4: {
        "name": "Casco urbano de Ayora",
        "key": "stage4-ayora",
        "theme": "Calles estrechas · casas blancas encaladas · tejas árabes · balcón · plaza con fuente · sol de mediodía",
        "plan_ref": "PLAN.md §2.4 · SDD zarra-defenders §3.4",
        "journey": "Portal de acceso al pueblo → calles empedradas → plaza con fuente central → casas con balcones → colegio/polideportivo al fondo",
        "landmarks": "Casas blancas encaladas · tejas árabes · portal de piedra · plaza empedrada · fuente central · balcones · olivos",
        "iterations_note": "3D-aligned: casco urbano de Ayora, donde la ruta de camiones prevista pasaría junto al colegio y el polideportivo. Boss: trailer cargado de bidones.",
    },
    5: {
        "name": "El Acuífero de la Mancha Oriental (jefe final)",
        "key": "stage5-acuifero",
        "theme": "Cámara subterránea · estalactitas · ríos subterráneos azul brillante · planta TRECO escupiendo residuos · boss final",
        "plan_ref": "PLAN.md §2.4 · SDD zarra-defenders §3.5",
        "journey": "Entrada a la cámara subterránea → estalactitas sprite → ríos subterráneos azul brillantes → planta TRECO sprite vertiendo residuos al acuífero (jefe final)",
        "landmarks": "Piedra oscura húmeda · estalactitas sprite · río subterráneo azul brillante · planta TRECO sprite industrial · tubería sprite escupiendo residuos · NO superficie",
        "iterations_note": "3D-aligned: cámara simbólica del subsuelo del Valle, donde corre el Acuífero de la Mancha Oriental (8.500 km²). Boss final: planta de tratamiento TRECO. Derrotarla NO la cierra — abre pantalla final con dato + links.",
    },
}

# Current PICKS — strongest Diablo 2 tile-based variants per stage
# s1-tiles-v5 has the checkerboard tile grid (most literal Diablo 2 wilderness)
# s2-tiles-v6 has stone wall tile modules + cobblestone path tile + water tile (most tile-based canyon)
# s3-tiles-v6 has tile modules pinocha+grass + romero/aliaga as sprite-tiles (most tile-based forest)
# s4-tiles-v1 already tile-based (cobblestone plaza + house sprites)
# s5-tiles-v3 already tile-based (stone floor + TRECO boss)
PICKS = {
    1: ("s1-tiles-v5.jpeg",  "v5",  "v5-tiles"),
    2: ("s2-tiles-v6.jpeg",  "v6",  "v5-tiles"),
    3: ("s3-tiles-v6.jpeg",  "v6",  "v5-tiles"),
    4: ("s4-tiles-v1.jpeg",  "v1",  "v5-tiles"),
    5: ("s5-tiles-v3.jpeg",  "v3",  "v5-tiles"),
}

# Post-process config — MUST stay in sync with tools/postprocess-v4-journey.py
PALETTE_COLORS = 32
DOWNSAMPLE_FACTOR = 4
DOWNSAMPLE_OVERRIDES = {
    2: 2,   # stage2-lahoz needs 2× to preserve footbridge, leachate pipe, canyon walls
}

# Discard notes (visible in catalog, short reason per variant)
DISCARD_NOTES = {
    "v1-journey": {
        1: "camino recto sin zig-zag, falta clearing",
        2: "borders negros, sin troncos",
        3: "",   # PICK
        4: "menos zigzag, sin troncos",
    },
    "v2-journey": {
        1: "plaza única, no journey",
        2: "plaza con calle, mejor pero FAR gana",
        3: "plaza estática",
        4: "un solo punto",
        5: "calle con casas pero algo estática",
        6: "calles con cruces pero menos journey — ganada por FAR-v1",
        7: "plaza con fuentes",
        8: "calles con cruces pero menos journey",
        "far-1": "",   # PICK
        "far-2": "sin portal/entrada clara",
        "far-3": "sin portal visible",
        "far-4": "railroad distrae",
    },
    "v3-journey": {
        1: "",   # PICK
        2: "islas rompen linearidad del río",
        3: "limpio pero sin puente/waypoint",
        4: "puente vertical no encaja",
    },
    "v4-journey": {
        1: "",   # PICK
        2: "buen contenido pero railroad distrae",
        3: "gate/factory sin leachate claro",
        4: "railroad domina demasiado",
    },
    "v5-journey": {
        1: "camino vertical al borde, no ascent",
        2: "",   # PICK
        3: "vista lateral, no top-down journey",
        4: "sundial, camino en patio pero ascent débil",
    },
}


def find_variant_files(stage_num: int, suffix: str) -> list:
    """Find all s{N}-*-v{M}.jpeg for a given stage and round (e.g. s1-tiles-v1.jpeg)."""
    base = BG_DIR / ACTIVE_ROUND
    patterns = [
        f"s{stage_num}*-v*.jpeg",
    ]
    files = set()
    if not base.exists():
        return []
    for pattern in patterns:
        for f in sorted(base.glob(pattern)):
            files.add(f.name)
    return sorted(files)


def categorize_variant(filename: str) -> tuple:
    """Returns (stage_num, variant_label, full_filename, dir).
    Handles prefixes like v4-journey's 's{N}-v{M}' and v5-tiles' 's{N}-tiles-v{M}'."""
    if "-far-" in filename:
        stage_str, rest = filename.split("-far-")
        stage_num = int(stage_str[1:])
        n = rest.replace(".jpeg", "")
        label = f"far-v{n}"
        vkey = f"far-{n}"
    else:
        # Strip any prefix like "tiles-" between stage number and "v"
        # Examples: "s1-tiles-v3.jpeg" or "s3-v1.jpeg"
        after_s = filename[1:]   # remove leading 's'
        digits = ""
        for ch in after_s:
            if ch.isdigit():
                digits += ch
            else:
                break
        stage_num = int(digits)
        # Extract v{N} portion
        v_part = filename.split("-v")[-1].replace(".jpeg", "")
        label = f"v{v_part}"
        vkey = int(v_part)
    return (stage_num, label, vkey, filename, BG_DIR / ACTIVE_ROUND / filename)


def build() -> int:
    data = {
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "base_url": "/assets/backgrounds/",
        "stages": {},
    }

    for stage_num in [1, 2, 3, 4, 5]:
        meta = STAGES[stage_num]
        # Find all variants in ACTIVE_ROUND (current iteration dir)
        active_dir = BG_DIR / ACTIVE_ROUND
        variant_files = sorted(
            f.name for f in active_dir.glob(f"s{stage_num}*.jpeg")
            if not f.name.startswith("s2-v9")  # skip the failed far attempt artifacts
        )

        # Find previous iteration files (v3 isometric)
        v3_dir = BG_DIR / "v3-rpg-isometric"
        v3_files = sorted(f.name for f in v3_dir.glob(f"stage{stage_num}*.jpeg")) if v3_dir.exists() else []

        # Find v2-rpg files
        v2_dir = BG_DIR / "v2-rpg"
        v2_files = sorted(f.name for f in v2_dir.glob(f"stage{stage_num}-*.jpeg")) if v2_dir.exists() else []

        # Definitive file
        definitive_path = BG_DIR / f"{meta['key']}.png"
        definitive_size = None
        if definitive_path.exists():
            # Use Pillow to get size
            try:
                from PIL import Image
                with Image.open(definitive_path) as im:
                    definitive_size = list(im.size)
            except Exception:
                pass

        stage_data = {
            "num": stage_num,
            "name": meta["name"],
            "key": meta["key"],
            "theme": meta["theme"],
            "plan_ref": meta["plan_ref"],
            "journey": meta["journey"],
            "landmarks": meta["landmarks"],
            "definitive": {
                "path": f"{meta['key']}.png",
                "size": definitive_size,
            },
            "pick_variant": PICKS[stage_num][0],
            "pick_label": PICKS[stage_num][1],
            "variants": [],
            "previous_iterations": {
                "v3_rpg_isometric": v3_files,
                "v2_rpg": v2_files,
            },
        }
        if "iterations_note" in meta:
            stage_data["iterations_note"] = meta["iterations_note"]

        # Categorize each variant
        discard_map = DISCARD_NOTES.get(f"v{stage_num}-journey", {})
        active_dir = BG_DIR / ACTIVE_ROUND
        processed_dir = active_dir.parent / f"{ACTIVE_ROUND}-processed"
        for name in variant_files:
            sn, label, vkey, _, _ = categorize_variant(name)
            if sn != stage_num:
                continue
            is_pick = (name == PICKS[stage_num][0])
            reason = "" if is_pick else discard_map.get(vkey, "")

            # Find matching versioned processed file (pc{N}ds{K} pattern)
            base = name.replace(".jpeg", "")
            ds = DOWNSAMPLE_OVERRIDES.get(stage_num, DOWNSAMPLE_FACTOR)
            proc_name = f"{base}@pc{PALETTE_COLORS}ds{ds}.png"
            proc_path = f"{ACTIVE_ROUND}-processed/{proc_name}"
            if not (processed_dir / proc_name).exists():
                proc_path = None

            stage_data["variants"].append({
                "name": name,
                "label": label,
                "is_pick": is_pick,
                "discard_reason": reason,
                "raw_path": f"{ACTIVE_ROUND}/{name}",     # ORIGINAL minimax JPEG (preserved)
                "processed_path": proc_path,            # versioned post-processed PNG
                "palette": PALETTE_COLORS,
                "downsample": ds,
            })

        data["stages"][stage_num] = stage_data

    # Write
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    size = OUT.stat().st_size
    print(f"OK  {OUT}  ({size} bytes)")
    print(f"    {sum(len(s['variants']) for s in data['stages'].values())} variants across {len(data['stages'])} stages")
    return 0


if __name__ == "__main__":
    sys.exit(build())
