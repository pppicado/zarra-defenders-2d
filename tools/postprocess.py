#!/usr/bin/env python3
"""
Post-procesa sprites raw de minimax -> PNG RGBA con alpha.

v2: deteccion ADAPTATIVA del color de fondo desde las 4 esquinas
    (mediana, robusta a outliers). Tolerancia amplia (~60) para
    capturar fondos magenta-tinted que el modelo produce con
    variaciones tipo (244,16,155) en vez de (255,0,255) puro.

Estrategia adicional: flood-fill desde las esquinas para distinguir
fondo (conexo al borde) de sujeto. Asi, si el sujeto tiene tonos
magenta (ej: bolsa de plastico rosa), NO se lo come, siempre que
no este conectado a las esquinas por una region magenta.
"""

import sys
import argparse
from pathlib import Path
from PIL import Image
from collections import deque

BG_SAMPLE_SIZE = 25        # tamano del parche en cada esquina para muestrear bg
TOLERANCE = 55            # distancia euclidea RGB para considerar "fondo"
EDGE_SOFTNESS = 25        # ancho de la banda de transicion suave
MIN_SUBJECT_RATIO = 0.05  # un sprite con menos de 5% opaco probablemente fallo


def sample_bg_color(img: Image.Image, patch: int = BG_SAMPLE_SIZE):
    """Devuelve (r, g, b) mediana de los 4 parches de esquina."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    samples = []
    for cx, cy in [(0, 0), (w, 0), (0, h), (w, h)]:
        for dx in range(-patch // 2, patch // 2):
            for dy in range(-patch // 2, patch // 2):
                x = max(0, min(w - 1, cx + dx))
                y = max(0, min(h - 1, cy + dy))
                r, g, b, _ = rgba.getpixel((x, y))
                samples.append((r, g, b))
    rs = sorted(p[0] for p in samples)
    gs = sorted(p[1] for p in samples)
    bs = sorted(p[2] for p in samples)
    n = len(samples)
    return (rs[n // 2], gs[n // 2], bs[n // 2])


def flood_fill_bg_mask(img: Image.Image, bg, tolerance: int):
    """
    Devuelve una mascara booleana (PIL L mode) donde True = pixel
    conectado a una esquina Y con color cercano al bg (fondo real).
    Evita comer partes del sujeto que coincidan con el color bg.
    """
    w, h = img.size
    px = img.load()
    bg_r, bg_g, bg_b = bg
    visited = [[False] * h for _ in range(w)]
    mask = [[False] * h for _ in range(w)]
    queue = deque()

    # Empezar desde las 4 esquinas si son bg-like
    for sx, sy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        r, g, b, _ = px[sx, sy]
        dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
        if dist < tolerance + EDGE_SOFTNESS:
            queue.append((sx, sy))
            visited[sx][sy] = True

    # BFS
    while queue:
        x, y = queue.popleft()
        r, g, b, _ = px[x, y]
        dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
        if dist < tolerance:
            mask[x][y] = True  # fondo puro
            # Expansion solo si el vecino tambien es bg-like
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                    nr, ng, nb, _ = px[nx, ny]
                    ndist = ((nr - bg_r) ** 2 + (ng - bg_g) ** 2 + (nb - bg_b) ** 2) ** 0.5
                    if ndist < tolerance + EDGE_SOFTNESS:
                        visited[nx][ny] = True
                        queue.append((nx, ny))

    # Convertir a imagen L
    out = Image.new("L", (w, h), 0)
    out_px = out.load()
    for x in range(w):
        for y in range(h):
            if mask[x][y]:
                out_px[x, y] = 255
    return out


def adaptive_chroma_alpha(img: Image.Image, tolerance: int = TOLERANCE,
                          edge: int = EDGE_SOFTNESS):
    """
    Combina flood-fill (para no comer sujeto) con chroma adaptativo
    (para capturar las variaciones del bg que produce el modelo).
    """
    rgba = img.convert("RGBA")
    # 1) Detectar color de fondo dominante desde las esquinas
    bg = sample_bg_color(rgba)
    # 2) Mascara de pixeles REALMENTE fondo (conexos al borde)
    bg_mask = flood_fill_bg_mask(rgba, bg, tolerance)

    # 3) Chroma key + soft edge, pero SOLO dentro de la mascara
    bg_r, bg_g, bg_b = bg
    w, h = rgba.size
    src = rgba.load()
    mask_px = bg_mask.load()

    for x in range(w):
        for y in range(h):
            r, g, b, original_a = src[x, y]
            dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5

            if mask_px[x, y]:
                # Estamos en region fondo real
                if dist < tolerance:
                    new_a = 0
                elif dist < tolerance + edge:
                    new_a = int(((dist - tolerance) / edge) * 255)
                else:
                    # Vecino del fondo pero no tan cerca: blend
                    new_a = max(0, 255 - int(((dist - tolerance) / 40) * 255))
            else:
                # Sujeto: respetar alpha original (opaco)
                new_a = 255

            src[x, y] = (r, g, b, min(new_a, original_a))

    return rgba


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--size", type=int, default=512)
    args = ap.parse_args()

    raw_dir = Path(args.raw_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted([p for p in raw_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}])
    if not files:
        print(f"No hay imagenes en {raw_dir}", file=sys.stderr)
        sys.exit(1)

    report = []
    for src in files:
        img = Image.open(src)
        bg = sample_bg_color(img.convert("RGBA"))
        keyed = adaptive_chroma_alpha(img)

        # Stats: % pixeles transparentes (alpha < 10)
        data = list(keyed.getdata())
        total = len(data)
        transparent = sum(1 for r, g, b, a in data if a < 10)
        opaque = sum(1 for r, g, b, a in data if a > 245)
        ratio = transparent / total

        # Tamano final cuadrado + resize
        w, h = keyed.size
        side = max(w, h, args.size)
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        off = ((side - w) // 2, (side - h) // 2)
        canvas.paste(keyed, off, keyed)
        canvas = canvas.resize((args.size, args.size), Image.LANCZOS)

        dst = out_dir / (src.stem + ".png")
        canvas.save(dst, "PNG", optimize=True)
        flag = " OK " if ratio > 0.30 else "FAIL"  # deberia haber bastante transparente
        print(f"{flag} {src.name:<35} bg=({bg[0]:3d},{bg[1]:3d},{bg[2]:3d})  transparent={100*ratio:5.1f}%  opaque={100*opaque/total:5.1f}%")
        report.append((src.name, bg, ratio, flag.strip()))

    fails = [r for r in report if r[3] == "FAIL"]
    print(f"\nProcesados {len(files)} sprites. Fallos (< 30% transparente): {len(fails)}")
    for name, bg, ratio, _ in fails:
        print(f"  - {name}: bg={bg}, transparent={100*ratio:.1f}%")


if __name__ == "__main__":
    main()
