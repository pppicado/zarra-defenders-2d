#!/usr/bin/env python3
"""
v4: v3 (flood-fill + atenuacion global con cap) + CAZA ACTIVA de pixeles
en la familia purple/lilac/magenta (hue 240-340 en HSV + saturacion).

Mapeo: cualquier pixel que el v3 dejo opaco pero que tiene tono
purple/lilac (saturado, valor suficiente) se atenua agresivamente:
- saturacion >= 80% -> alpha = 0 (full removal)
- saturacion 25-80% -> alpha interpolado (lineal)

Trade-off aceptado: pixeles legitimos del sujeto que casualmente son
purple/lilac (ej: bolsa rosa, sello magenta) se veran atenuados.
El usuario pidio explicitamente "mas agresivo".
"""

import sys
import argparse
from pathlib import Path
from PIL import Image
from collections import deque

BG_SAMPLE_SIZE = 25
TOLERANCE = 55
EDGE_SOFTNESS = 25
OUTSIDE_TOLERANCE = 95
OUTSIDE_CAP = 0.75

# Purple family detection thresholds
PURPLE_HUE_MIN = 240   # azul puro
PURPLE_HUE_MAX = 340   # magenta
PURPLE_SAT_MIN = 0.20  # 20% saturation minima
PURPLE_VAL_MIN = 60    # no muy oscuro


def sample_bg_color(img, patch=BG_SAMPLE_SIZE):
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


def rgb_to_hue_sat(r, g, b):
    """Devuelve (hue 0-360, sat 0-1) o None si gris/negro."""
    rmax = max(r, g, b)
    rmin = min(r, g, b)
    if rmax == 0:
        return None
    delta = rmax - rmin
    sat = delta / rmax
    if delta == 0 or sat < 0.05:
        return None
    if rmax == r:
        hue = ((g - b) / delta) % 6 * 60
    elif rmax == g:
        hue = ((b - r) / delta + 2) * 60
    else:  # rmax == b
        hue = ((r - g) / delta + 4) * 60
    return hue, sat


def is_purple_family(r, g, b):
    """Pixel en la familia purple/lilac/magenta (hue 240-340)."""
    if max(r, g, b) < PURPLE_VAL_MIN:
        return False
    result = rgb_to_hue_sat(r, g, b)
    if result is None:
        return False
    hue, sat = result
    if sat < PURPLE_SAT_MIN:
        return False
    return PURPLE_HUE_MIN <= hue <= PURPLE_HUE_MAX


def flood_fill_bg_mask(img, bg, tolerance):
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


def v4_chroma_alpha(img,
                     tolerance=TOLERANCE,
                     edge=EDGE_SOFTNESS,
                     outside_tolerance=OUTSIDE_TOLERANCE,
                     outside_cap=OUTSIDE_CAP):
    rgba = img.convert("RGBA")
    bg = sample_bg_color(rgba)
    bg_mask = flood_fill_bg_mask(rgba, bg, tolerance)
    bg_r, bg_g, bg_b = bg
    w, h = rgba.size
    src = rgba.load()
    mask_px = bg_mask.load()

    # Pass 1: v3 logic (flood-fill + global attenuation)
    for x in range(w):
        for y in range(h):
            r, g, b, original_a = src[x, y]
            dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5

            if mask_px[x, y]:
                if dist < tolerance:
                    new_a = 0
                elif dist < tolerance + edge:
                    new_a = int(((dist - tolerance) / edge) * 255)
                else:
                    new_a = max(0, 255 - int(((dist - tolerance) / 40) * 255))
            else:
                if dist < tolerance:
                    new_a = int(255 * (1 - outside_cap))
                elif dist < outside_tolerance:
                    t = (dist - tolerance) / (outside_tolerance - tolerance)
                    alpha_reduction = outside_cap * (1 - t)
                    new_a = int(255 * (1 - alpha_reduction))
                else:
                    new_a = 255

            src[x, y] = (r, g, b, min(new_a, original_a))

    # Pass 2: PURPLE/LILAC FAMILY HUNT
    # Para pixeles que el v3 dejo opacos pero que estan en la familia purple
    for x in range(w):
        for y in range(h):
            r, g, b, current_a = src[x, y]
            if current_a < 200:
                continue  # ya atenuado por v3
            if not is_purple_family(r, g, b):
                continue

            # Calcular agresividad basada en saturacion
            result = rgb_to_hue_sat(r, g, b)
            hue, sat = result

            # sat 0.20 -> alpha 120 (53% transparente, atenuacion leve)
            # sat 0.50 -> alpha 40 (84% transparente)
            # sat 0.80+ -> alpha 0 (full removal)
            if sat >= 0.80:
                new_a = 0
            elif sat <= 0.20:
                new_a = 120
            else:
                # Interpolacion lineal entre 0.20 y 0.80
                t = (sat - 0.20) / 0.60  # 0..1
                new_a = int(120 * (1 - t))

            src[x, y] = (r, g, b, min(new_a, current_a))

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
        keyed = v4_chroma_alpha(img)

        data = list(keyed.getdata())
        total = len(data)
        transparent = sum(1 for r, g, b, a in data if a < 10)
        opaque = sum(1 for r, g, b, a in data if a > 200)
        partial = total - transparent - opaque

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
