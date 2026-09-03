#!/usr/bin/env python3
"""
v3: Combina flood-fill (zonas seguras, removal total) con atenuacion
global por similitud al bg (cap de transparencia para no comer sujeto).
Asi capturamos tambien las "islas" de color bg entre elementos del sujeto
que el flood-fill no alcanza.
"""

import sys
import argparse
from pathlib import Path
from PIL import Image
from collections import deque

BG_SAMPLE_SIZE = 25
TOLERANCE = 55            # dentro de flood-fill: full removal hasta esta distancia
EDGE_SOFTNESS = 25        # soft edge dentro de flood-fill
OUTSIDE_TOLERANCE = 95    # fuera de flood-fill: atenuar hasta esta distancia
OUTSIDE_CAP = 0.75        # cap de transparencia fuera del mask (75% max)


def sample_bg_color(img: Image.Image, patch: int = BG_SAMPLE_SIZE):
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
    w, h = img.size
    px = img.load()
    bg_r, bg_g, bg_b = bg
    visited = [[False] * h for _ in range(w)]
    mask = [[False] * h for _ in range(w)]
    queue = deque()

    for sx, sy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        r, g, b, _ = px[sx, sy]
        dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
        if dist < tolerance + EDGE_SOFTNESS:
            queue.append((sx, sy))
            visited[sx][sy] = True

    while queue:
        x, y = queue.popleft()
        r, g, b, _ = px[x, y]
        dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
        if dist < tolerance:
            mask[x][y] = True
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                    nr, ng, nb, _ = px[nx, ny]
                    ndist = ((nr - bg_r) ** 2 + (ng - bg_g) ** 2 + (nb - bg_b) ** 2) ** 0.5
                    if ndist < tolerance + EDGE_SOFTNESS:
                        visited[nx][ny] = True
                        queue.append((nx, ny))

    out = Image.new("L", (w, h), 0)
    out_px = out.load()
    for x in range(w):
        for y in range(h):
            if mask[x][y]:
                out_px[x, y] = 255
    return out


def adaptive_chroma_alpha_v3(img: Image.Image,
                              tolerance: int = TOLERANCE,
                              edge: int = EDGE_SOFTNESS,
                              outside_tolerance: int = OUTSIDE_TOLERANCE,
                              outside_cap: float = OUTSIDE_CAP):
    """
    Combina flood-fill (zonas seguras, full removal) con atenuacion
    global por similitud al bg (con cap de transparencia).
    """
    rgba = img.convert("RGBA")
    bg = sample_bg_color(rgba)
    bg_mask = flood_fill_bg_mask(rgba, bg, tolerance)

    bg_r, bg_g, bg_b = bg
    w, h = rgba.size
    src = rgba.load()
    mask_px = bg_mask.load()

    for x in range(w):
        for y in range(h):
            r, g, b, original_a = src[x, y]
            dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5

            if mask_px[x, y]:
                # Dentro del flood-fill mask: chroma key completo
                if dist < tolerance:
                    new_a = 0
                elif dist < tolerance + edge:
                    new_a = int(((dist - tolerance) / edge) * 255)
                else:
                    new_a = max(0, 255 - int(((dist - tolerance) / 40) * 255))
            else:
                # Fuera del mask: atenuacion global con cap
                if dist < tolerance:
                    new_a = int(255 * (1 - outside_cap))
                elif dist < outside_tolerance:
                    # Transicion lineal: a dist=tolerance -> 75% transparente,
                    # a dist=outside_tolerance -> opaco
                    t = (dist - tolerance) / (outside_tolerance - tolerance)
                    alpha_reduction = outside_cap * (1 - t)
                    new_a = int(255 * (1 - alpha_reduction))
                else:
                    new_a = 255  # claramente sujeto

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

    for src in files:
        img = Image.open(src)
        keyed = adaptive_chroma_alpha_v3(img)

        # Stats
        data = list(keyed.getdata())
        total = len(data)
        transparent = sum(1 for r, g, b, a in data if a < 10)
        opaque = sum(1 for r, g, b, a in data if a > 200)
        partial = total - transparent - opaque

        # Cuadrado + resize
        w, h = keyed.size
        side = max(w, h, args.size)
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        off = ((side - w) // 2, (side - h) // 2)
        canvas.paste(keyed, off, keyed)
        canvas = canvas.resize((args.size, args.size), Image.LANCZOS)

        dst = out_dir / (src.stem + ".png")
        canvas.save(dst, "PNG", optimize=True)
        print(f"OK  {src.name:<35} transparent={100*transparent/total:5.1f}%  opaque={100*opaque/total:5.1f}%  partial={100*partial/total:4.1f}%")


if __name__ == "__main__":
    main()
